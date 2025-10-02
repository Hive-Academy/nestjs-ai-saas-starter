import { Injectable, Logger } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowProvider,
  WorkflowInstance,
  WorkflowResult,
  WorkflowConfig,
  WorkflowStatus,
} from '../interfaces/multi-agent.interface';
import { WorkflowRegistryService } from './workflow-registry.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { WorkflowStreamingService } from './workflow-streaming.service';
import { WorkflowMetricsService } from './workflow-metrics.service';
import { StreamEventType } from '@hive-academy/langgraph-core';

/**
 * Workflow Manager Service
 * Clean facade for workflow operations following SRP
 * Delegates specialized responsibilities to dedicated services
 */
@Injectable()
export class WorkflowManagerService {
  private readonly logger = new Logger(WorkflowManagerService.name);

  constructor(
    private readonly registry: WorkflowRegistryService,
    private readonly execution: WorkflowExecutionService,
    private readonly streaming: WorkflowStreamingService,
    private readonly metrics: WorkflowMetricsService
  ) {
    this.logger.debug(
      'WorkflowManagerService initialized with specialized services'
    );
  }

  // ==================== WORKFLOW REGISTRATION (Delegates to Registry) ====================

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    return this.registry.registerWorkflow(workflow);
  }

  /**
   * Register workflow providers from module configuration
   */
  registerWorkflowProviders(providers: WorkflowProvider[]): void {
    this.logger.log(`Registering ${providers.length} workflow providers`);

    let registered = 0;
    let failed = 0;

    for (const provider of providers) {
      try {
        this.registry.registerWorkflowProvider(provider);
        registered++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to register workflow provider ${provider.name}:`,
          error
        );
      }
    }

    this.logger.log(
      `Registration completed: ${registered} successful, ${failed} failed`
    );
  }

  /**
   * Get workflow definition by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | null {
    return this.registry.getWorkflow(workflowId);
  }

  /**
   * Get all registered workflows
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return this.registry.getAllWorkflows();
  }

  /**
   * Check if workflow exists
   */
  hasWorkflow(workflowId: string): boolean {
    return this.registry.hasWorkflow(workflowId);
  }

  /**
   * Get workflows by filter
   */
  getWorkflowsByFilter(filter: {
    requiredAgents?: string[];
    metadata?: Record<string, unknown>;
  }): WorkflowDefinition[] {
    return this.registry.getWorkflowsByFilter(filter);
  }

  // ==================== WORKFLOW EXECUTION (Delegates to Execution) ====================

  /**
   * Execute a workflow by ID
   */
  async executeWorkflow(
    workflowId: string,
    input: any,
    config?: Partial<WorkflowConfig>
  ): Promise<WorkflowResult> {
    this.logger.log(`Executing workflow: ${workflowId}`);

    const startTime = Date.now();

    try {
      const result = await this.execution.executeWorkflow(
        workflowId,
        input,
        config
      );

      // Record metrics
      this.metrics.recordExecutionTime(
        workflowId,
        Date.now() - startTime,
        result.success
      );

      this.logger.log(
        `Workflow completed: ${workflowId} (${
          result.success ? 'success' : 'failed'
        })`
      );

      return result;
    } catch (error) {
      // Record failed metrics
      this.metrics.recordExecutionTime(
        workflowId,
        Date.now() - startTime,
        false
      );

      this.logger.error(`Workflow execution error for '${workflowId}':`, error);
      throw error;
    }
  }

  /**
   * Execute workflow with streaming support
   */
  async executeWorkflowWithStreaming(
    workflowId: string,
    input: any,
    streamCallback?: (event: {
      type: 'progress' | 'data' | 'error' | 'complete';
      data: any;
    }) => void,
    config?: Partial<WorkflowConfig>
  ): Promise<WorkflowResult> {
    if (!this.streaming.isStreamingAvailable()) {
      this.logger.warn(
        'Streaming not available, falling back to regular execution'
      );
      return this.executeWorkflow(workflowId, input, config);
    }

    const streamingConfig: Partial<WorkflowConfig> = {
      ...config,
      streaming: true,
    };

    const { executionId, nodeId } =
      await this.streaming.initializeWorkflowStream(
        workflowId,
        input,
        streamingConfig
      );

    await this.streaming.sendProgressEvent(
      executionId,
      nodeId,
      {
        status: 'starting',
        workflowId,
        progress: 0,
      },
      streamCallback
    );

    const startTime = Date.now();

    try {
      const result = await this.streaming.executeWithProgressTracking(
        executionId,
        nodeId,
        workflowId,
        () =>
          this.execution.executeWorkflow(workflowId, input, streamingConfig),
        streamCallback
      );

      await this.streaming.sendCompletionEvent(
        executionId,
        nodeId,
        workflowId,
        result,
        streamCallback
      );

      // Record metrics
      this.metrics.recordExecutionTime(
        workflowId,
        Date.now() - startTime,
        result.success
      );

      return result;
    } catch (error) {
      await this.streaming.sendErrorEvent(
        executionId,
        nodeId,
        workflowId,
        error instanceof Error ? error : new Error(String(error)),
        streamCallback
      );

      // Record failed metrics
      this.metrics.recordExecutionTime(
        workflowId,
        Date.now() - startTime,
        false
      );

      throw error;
    }
  }

  // ==================== WORKFLOW INSTANCES (Delegates to Execution) ====================

  /**
   * Get active workflow instances
   */
  getActiveInstances(): WorkflowInstance[] {
    return this.execution.getActiveInstances();
  }

  /**
   * Get workflow instance by ID
   */
  getInstance(instanceId: string): WorkflowInstance | null {
    return this.execution.getInstance(instanceId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    this.logger.log(`Cancelling workflow instance: ${instanceId}`);
    return this.execution.cancelWorkflow(instanceId);
  }

  /**
   * Get execution history for a workflow
   */
  getWorkflowExecutionHistory(workflowId: string): WorkflowInstance[] {
    return this.execution.getWorkflowExecutionHistory(workflowId);
  }

  // ==================== CHECKPOINT MANAGEMENT (Delegates to Execution) ====================

  /**
   * Resume workflow from checkpoint
   */
  async resumeFromCheckpoint(
    threadId: string,
    checkpointId?: string
  ): Promise<WorkflowResult> {
    this.logger.log(
      `Resuming workflow from checkpoint - thread: ${threadId}, checkpoint: ${
        checkpointId || 'latest'
      }`
    );
    return this.execution.resumeFromCheckpoint(threadId, checkpointId);
  }

  /**
   * Get workflow checkpoint history
   */
  async getWorkflowCheckpointHistory(threadId: string): Promise<any[]> {
    return this.execution.getWorkflowCheckpointHistory(threadId);
  }

  // ==================== WORKFLOW PAUSING/RESUMING (Delegates to Execution) ====================

  /**
   * Pause workflow execution (if supported)
   */
  async pauseWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.getInstance(instanceId);
    if (!instance || instance.status !== WorkflowStatus.RUNNING) {
      return false;
    }

    this.logger.warn(
      `Pause requested for workflow ${instanceId} but not currently supported`
    );
    return false;
  }

  /**
   * Resume workflow execution
   */
  async resumeWorkflow(
    instanceId: string,
    userInput?: string
  ): Promise<boolean> {
    const instance = this.getInstance(instanceId);
    if (!instance || instance.status !== WorkflowStatus.PAUSED) {
      this.logger.warn(`Cannot resume workflow ${instanceId}: invalid state`);
      return false;
    }

    // Implementation would go here if pause/resume is supported
    return false;
  }

  /**
   * Add user input to workflow
   */
  async addUserInput(
    instanceId: string,
    userInput: string,
    continueExecution = true,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      this.logger.warn(`Instance ${instanceId} not found for user input`);
      return false;
    }

    // Update instance state with user input
    if (!instance.currentState) {
      instance.currentState = {};
    }

    instance.currentState = {
      ...instance.currentState,
      userInput,
      userInputTimestamp: new Date(),
      userInputMetadata: metadata,
      waitingForInput: false,
      inputReceived: true,
    };

    this.logger.log(`Added user input to workflow ${instanceId}`);

    if (continueExecution && instance.status === WorkflowStatus.PAUSED) {
      return this.resumeWorkflow(instanceId, userInput);
    }

    return true;
  }

  /**
   * Check if workflow is waiting for user input
   */
  isWaitingForUserInput(instanceId: string): boolean {
    const instance = this.getInstance(instanceId);
    return (
      instance?.currentState?.waitingForInput === true ||
      instance?.status === WorkflowStatus.PAUSED
    );
  }

  // ==================== MONITORING & STATISTICS ====================

  /**
   * Get workflow system statistics
   */
  getWorkflowStats(): {
    registry: {
      totalWorkflows: number;
      workflowsByStatus: Record<string, number>;
      providerTypes: string[];
    };
    execution: {
      activeInstances: number;
      totalExecutions: number;
      successRate: number;
      averageExecutionTime: number;
    };
    metrics: {
      totalWorkflows: number;
      totalExecutions: number;
      averageExecutionTime: number;
    };
  } {
    const executionStats = this.execution.getExecutionStats();
    const metricsStats = this.metrics.getOverallExecutionStats();

    return {
      registry: this.registry.getWorkflowStats(),
      execution: executionStats,
      metrics: metricsStats,
    };
  }

  /**
   * Get detailed workflow information
   */
  getWorkflowInfo(workflowId: string): {
    definition: WorkflowDefinition | null;
    activeInstances: WorkflowInstance[];
    history: WorkflowInstance[];
    metrics: any;
  } | null {
    const definition = this.getWorkflow(workflowId);
    if (!definition) {
      return null;
    }

    const activeInstances = this.getActiveInstances().filter(
      (instance) => instance.workflowId === workflowId
    );

    const history = this.getWorkflowExecutionHistory(workflowId);
    const metrics = this.metrics.getWorkflowExecutionMetrics(workflowId);

    return {
      definition,
      activeInstances,
      history: history.slice(-10), // Last 10 executions
      metrics,
    };
  }

  /**
   * Health check for workflow system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      registry: boolean;
      execution: boolean;
      streaming: boolean;
      metrics: boolean;
      totalWorkflows: number;
      activeInstances: number;
    };
  }> {
    try {
      const stats = this.getWorkflowStats();
      const registryHealthy = stats.registry.totalWorkflows >= 0;
      const executionHealthy = stats.execution.activeInstances >= 0;
      const streamingHealthy = this.streaming.isStreamingAvailable();
      const metricsHealthy = stats.metrics.totalWorkflows >= 0;

      const overall = registryHealthy && executionHealthy;

      return {
        status: overall ? 'healthy' : 'unhealthy',
        details: {
          registry: registryHealthy,
          execution: executionHealthy,
          streaming: streamingHealthy,
          metrics: metricsHealthy,
          totalWorkflows: stats.registry.totalWorkflows,
          activeInstances: stats.execution.activeInstances,
        },
      };
    } catch (error) {
      this.logger.error('Workflow system health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          registry: false,
          execution: false,
          streaming: false,
          metrics: false,
          totalWorkflows: 0,
          activeInstances: 0,
        },
      };
    }
  }

  /**
   * Subscribe to workflow events
   */
  subscribeToWorkflowEvents(
    instanceId: string,
    callback: (event: {
      type:
        | 'workflow_started'
        | 'workflow_progress'
        | 'workflow_completed'
        | 'workflow_failed'
        | 'node_executed';
      data: any;
      timestamp: number;
    }) => void
  ): { unsubscribe: () => void } {
    return this.execution.subscribeToWorkflowEvents(instanceId, callback);
  }

  /**
   * Stream workflow execution in real-time
   */
  async streamWorkflowExecution(
    workflowId: string,
    input: any,
    config?: Partial<WorkflowConfig>
  ): Promise<{
    result: Promise<WorkflowResult>;
    stream: AsyncIterable<{
      type: StreamEventType;
      data: any;
      timestamp: Date;
    }>;
    cancel: () => void;
  }> {
    if (!this.streaming.isStreamingAvailable()) {
      throw new Error('Streaming service not available');
    }

    const { streamGenerator, addEvent, cancel } =
      await this.streaming.createWorkflowStream(workflowId, input, config);

    const resultPromise = this.executeWorkflowWithStreaming(
      workflowId,
      input,
      (event) => addEvent(event),
      { ...config, streaming: true }
    );

    return {
      result: resultPromise,
      stream: streamGenerator,
      cancel,
    };
  }

  /**
   * Get registered agents from the registry
   */
  getRegisteredAgents(): Array<any> {
    return this.registry.getRegisteredAgents();
  }

  /**
   * Validate workflow definition
   */
  validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Temporarily register to validate
      this.registry.registerWorkflow({
        ...workflow,
        id: `__validation_${workflow.id}_${Date.now()}`,
      });

      // Clean up validation workflow
      this.registry.unregisterWorkflow(
        `__validation_${workflow.id}_${Date.now()}`
      );

      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { valid: false, errors };
    }
  }

  /**
   * Clear all workflows and instances (useful for testing)
   */
  clear(): void {
    this.registry.clear();
    this.execution.clear();
    this.metrics.clearAllMetrics();
    this.logger.debug('All workflows, instances, and metrics cleared');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    topPerforming: any[];
    systemMetrics: any;
    trends: Record<string, any>;
  } {
    const topPerforming = this.metrics.getTopPerformingWorkflows();
    const systemMetrics = this.metrics.getSystemExecutionMetrics();

    // Get trends for top workflows
    const trends: Record<string, any> = {};
    for (const workflow of topPerforming.slice(0, 5)) {
      const trend = this.metrics.getWorkflowPerformanceTrend(
        workflow.workflowId
      );
      if (trend) {
        trends[workflow.workflowId] = trend;
      }
    }

    return {
      topPerforming,
      systemMetrics,
      trends,
    };
  }
}
