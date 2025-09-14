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

/**
 * Workflow Manager Service
 * Main facade for workflow operations, providing unified access to
 * workflow registration, execution, and lifecycle management
 */
@Injectable()
export class WorkflowManagerService {
  private readonly logger = new Logger(WorkflowManagerService.name);

  constructor(
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly workflowExecution: WorkflowExecutionService
  ) {
    this.logger.debug('WorkflowManagerService initialized');
  }

  // ==================== WORKFLOW REGISTRATION ====================

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    return this.workflowRegistry.registerWorkflow(workflow);
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
        this.workflowRegistry.registerWorkflowProvider(provider);
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
      `Workflow provider registration completed: ${registered} successful, ${failed} failed`
    );

    if (registered > 0) {
      const workflows = this.getAllWorkflows();
      this.logger.log(
        `Total workflows available: ${workflows.length} (${workflows
          .map((w) => w.id)
          .join(', ')})`
      );
    }
  }

  /**
   * Get workflow definition by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | null {
    return this.workflowRegistry.getWorkflow(workflowId);
  }

  /**
   * Get all registered workflows
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return this.workflowRegistry.getAllWorkflows();
  }

  /**
   * Check if workflow exists
   */
  hasWorkflow(workflowId: string): boolean {
    return this.workflowRegistry.hasWorkflow(workflowId);
  }

  /**
   * Get workflows by filter criteria
   */
  getWorkflowsByFilter(filter: {
    requiredAgents?: string[];
    metadata?: Record<string, unknown>;
  }): WorkflowDefinition[] {
    return this.workflowRegistry.getWorkflowsByFilter(filter);
  }

  // ==================== WORKFLOW EXECUTION ====================

  /**
   * Execute a workflow by ID
   */
  async executeWorkflow(
    workflowId: string,
    input: any,
    config?: Partial<WorkflowConfig>
  ): Promise<WorkflowResult> {
    this.logger.log(`Executing workflow: ${workflowId}`);

    try {
      const result = await this.workflowExecution.executeWorkflow(
        workflowId,
        input,
        config
      );

      this.logger.log(
        `Workflow execution completed: ${workflowId} (${
          result.success ? 'success' : 'failed'
        })`
      );

      return result;
    } catch (error) {
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
    // Enable streaming in config
    const streamingConfig: Partial<WorkflowConfig> = {
      ...config,
      streaming: true,
    };

    // TODO: Implement actual streaming support
    // For now, execute normally and provide basic callbacks
    if (streamCallback) {
      streamCallback({
        type: 'progress',
        data: { status: 'starting', workflowId, input },
      });
    }

    try {
      const result = await this.executeWorkflow(
        workflowId,
        input,
        streamingConfig
      );

      if (streamCallback) {
        streamCallback({
          type: 'complete',
          data: result,
        });
      }

      return result;
    } catch (error) {
      if (streamCallback) {
        streamCallback({
          type: 'error',
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      throw error;
    }
  }

  // ==================== WORKFLOW INSTANCE MANAGEMENT ====================

  /**
   * Get active workflow instances
   */
  getActiveInstances(): WorkflowInstance[] {
    return this.workflowExecution.getActiveInstances();
  }

  /**
   * Get workflow instance by ID
   */
  getInstance(instanceId: string): WorkflowInstance | null {
    return this.workflowExecution.getInstance(instanceId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    this.logger.log(`Cancelling workflow instance: ${instanceId}`);
    return this.workflowExecution.cancelWorkflow(instanceId);
  }

  /**
   * Get execution history for a workflow
   */
  getWorkflowHistory(workflowId: string): WorkflowInstance[] {
    return this.workflowExecution.getWorkflowHistory(workflowId);
  }

  /**
   * Pause workflow execution (if supported)
   */
  async pauseWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.getInstance(instanceId);
    if (!instance || instance.status !== WorkflowStatus.RUNNING) {
      return false;
    }

    // For now, we don't support pausing - would require more complex state management
    this.logger.warn(
      `Pause requested for workflow ${instanceId} but not currently supported`
    );
    return false;
  }

  /**
   * Resume workflow execution (if supported)
   */
  async resumeWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.getInstance(instanceId);
    if (!instance || instance.status !== WorkflowStatus.PAUSED) {
      return false;
    }

    // For now, we don't support resuming - would require more complex state management
    this.logger.warn(
      `Resume requested for workflow ${instanceId} but not currently supported`
    );
    return false;
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
  } {
    return {
      registry: this.workflowRegistry.getWorkflowStats(),
      execution: this.workflowExecution.getExecutionStats(),
    };
  }

  /**
   * Get detailed workflow information
   */
  getWorkflowInfo(workflowId: string): {
    definition: WorkflowDefinition | null;
    activeInstances: WorkflowInstance[];
    history: WorkflowInstance[];
    stats: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageExecutionTime: number;
    };
  } | null {
    const definition = this.getWorkflow(workflowId);
    if (!definition) {
      return null;
    }

    const activeInstances = this.getActiveInstances().filter(
      (instance) => instance.workflowId === workflowId
    );

    const history = this.getWorkflowHistory(workflowId);

    const totalExecutions = history.length;
    const successfulExecutions = history.filter(
      (instance) => instance.status === WorkflowStatus.COMPLETED
    ).length;
    const failedExecutions = history.filter(
      (instance) => instance.status === WorkflowStatus.FAILED
    ).length;

    const completedWithDuration = history.filter(
      (instance) => instance.result?.metadata?.duration
    );
    const averageExecutionTime =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce(
            (sum, instance) => sum + (instance.result?.metadata?.duration || 0),
            0
          ) / completedWithDuration.length
        : 0;

    return {
      definition,
      activeInstances,
      history: history.slice(-10), // Last 10 executions
      stats: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
      },
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
      totalWorkflows: number;
      activeInstances: number;
    };
  }> {
    try {
      const stats = this.getWorkflowStats();
      const registryHealthy = stats.registry.totalWorkflows >= 0;
      const executionHealthy = stats.execution.activeInstances >= 0;

      const overall = registryHealthy && executionHealthy;

      return {
        status: overall ? 'healthy' : 'unhealthy',
        details: {
          registry: registryHealthy,
          execution: executionHealthy,
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
          totalWorkflows: 0,
          activeInstances: 0,
        },
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate workflow definition
   */
  validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // This will throw if invalid, caught below
      this.workflowRegistry.registerWorkflow({
        ...workflow,
        id: `__validation_${workflow.id}`, // Use temp ID to avoid conflicts
      });

      // Clean up validation workflow
      this.workflowRegistry.unregisterWorkflow(`__validation_${workflow.id}`);

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
    this.workflowRegistry.clear();
    this.workflowExecution.clear();
    this.logger.debug('All workflows and instances cleared');
  }
}
