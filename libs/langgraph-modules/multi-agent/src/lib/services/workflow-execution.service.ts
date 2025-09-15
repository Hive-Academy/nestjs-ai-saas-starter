import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowResult,
  WorkflowContext,
  WorkflowConfig,
  AgentDefinition,
} from '../interfaces/multi-agent.interface';
import { WorkflowRegistryService } from './workflow-registry.service';
import { MultiAgentCoordinatorService } from './multi-agent-coordinator.service';
import { AgentRegistryService } from './agent-registry.service';

/**
 * Workflow Execution Service
 * Handles workflow lifecycle, execution, and state management
 */
@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);
  private readonly activeInstances = new Map<string, WorkflowInstance>();
  private readonly executionHistory = new Map<string, WorkflowInstance[]>();

  constructor(
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.debug('WorkflowExecutionService initialized');
  }

  /**
   * Execute a workflow by ID with given input
   */
  async executeWorkflow(
    workflowId: string,
    input: any,
    config?: Partial<WorkflowConfig>
  ): Promise<WorkflowResult> {
    try {
      // Get workflow definition
      const workflow = this.workflowRegistry.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow '${workflowId}' not found`);
      }

      // Create workflow instance
      const instance = await this.createWorkflowInstance(
        workflow,
        input,
        config
      );

      this.logger.log(
        `Starting workflow execution: ${workflowId} (instance: ${instance.instanceId})`
      );

      // Execute the workflow
      const result = await this.executeWorkflowInstance(instance);

      this.logger.log(
        `Workflow execution completed: ${workflowId} (${
          result.success ? 'success' : 'failed'
        })`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Workflow execution failed for '${workflowId}':`,
        error
      );

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'EXECUTION_FAILED',
          details: error,
        },
        metadata: {
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          instanceId: 'failed-before-creation',
        },
      };
    }
  }

  /**
   * Execute a workflow instance
   */
  private async executeWorkflowInstance(
    instance: WorkflowInstance
  ): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      // Update instance status
      instance.status = WorkflowStatus.RUNNING;
      instance.updatedAt = new Date();
      this.activeInstances.set(instance.instanceId, instance);

      // Emit workflow started event
      this.eventEmitter.emit('workflow.started', {
        instanceId: instance.instanceId,
        workflowId: instance.workflowId,
        input: instance.input,
      });

      // Get workflow definition
      const workflow = this.workflowRegistry.getWorkflow(instance.workflowId);
      if (!workflow) {
        throw new Error(
          `Workflow definition '${instance.workflowId}' not found`
        );
      }

      // Setup timeout if configured
      const timeout = instance.context.config.timeout || 300000; // 5 minutes default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Workflow execution timeout')),
          timeout
        );
      });

      // Execute workflow with timeout
      const executionPromise = this.executeWithRetry(workflow, instance);
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Update instance with result
      const endTime = Date.now();
      const finalResult: WorkflowResult = {
        ...result,
        metadata: {
          ...result.metadata,
          startTime,
          endTime,
          duration: endTime - startTime,
          instanceId: instance.instanceId,
        },
      };

      instance.result = finalResult;
      instance.status = result.success
        ? WorkflowStatus.COMPLETED
        : WorkflowStatus.FAILED;
      instance.updatedAt = new Date();

      // Emit workflow completed event
      this.eventEmitter.emit('workflow.completed', {
        instanceId: instance.instanceId,
        workflowId: instance.workflowId,
        result: finalResult,
      });

      // Move to history
      this.moveToHistory(instance);

      return finalResult;
    } catch (error) {
      // Handle execution error
      const endTime = Date.now();
      const errorResult: WorkflowResult = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'EXECUTION_ERROR',
          details: error,
        },
        metadata: {
          startTime,
          endTime,
          duration: endTime - startTime,
          instanceId: instance.instanceId,
        },
      };

      instance.result = errorResult;
      instance.status = WorkflowStatus.FAILED;
      instance.updatedAt = new Date();

      // Emit workflow failed event
      this.eventEmitter.emit('workflow.failed', {
        instanceId: instance.instanceId,
        workflowId: instance.workflowId,
        error: errorResult.error,
      });

      // Move to history
      this.moveToHistory(instance);

      return errorResult;
    }
  }

  /**
   * Execute workflow with retry logic
   */
  private async executeWithRetry(
    workflow: WorkflowDefinition,
    instance: WorkflowInstance
  ): Promise<WorkflowResult> {
    const retryConfig = instance.context.config.retry;
    let lastError: Error | null = null;

    const maxAttempts = retryConfig?.enabled ? retryConfig.maxAttempts : 1;
    const backoffMs = retryConfig?.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Executing workflow ${workflow.id} - attempt ${attempt}/${maxAttempts}`
        );

        // Execute workflow
        const result = await workflow.execute(instance.input, instance.context);

        // Validate result
        this.validateWorkflowResult(result);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `Workflow execution attempt ${attempt}/${maxAttempts} failed:`,
          lastError.message
        );

        // If not the last attempt and retry is enabled, wait and retry
        if (attempt < maxAttempts && retryConfig?.enabled) {
          await this.sleep(backoffMs * attempt); // Exponential backoff
          continue;
        }

        // Last attempt failed or retry disabled
        break;
      }
    }

    // All attempts failed
    throw lastError || new Error('Unknown execution error');
  }

  /**
   * Create a new workflow instance
   */
  private async createWorkflowInstance(
    workflow: WorkflowDefinition,
    input: any,
    configOverride?: Partial<WorkflowConfig>
  ): Promise<WorkflowInstance> {
    const instanceId = uuidv4();

    // Merge configuration
    const config: WorkflowConfig = {
      timeout: 300000, // 5 minutes default
      checkpointing: false,
      streaming: false,
      retry: {
        enabled: false,
        maxAttempts: 1,
        backoffMs: 1000,
      },
      ...workflow.config,
      ...configOverride,
    };

    // Validate required agents are available
    if (workflow.requiredAgents) {
      const missingAgents = workflow.requiredAgents.filter(
        (agentId) => !this.agentRegistry.hasAgent(agentId)
      );

      if (missingAgents.length > 0) {
        throw new Error(
          `Required agents not available: ${missingAgents.join(', ')}`
        );
      }
    }

    // Build agents map
    const agents = new Map<string, AgentDefinition>();
    if (workflow.requiredAgents) {
      for (const agentId of workflow.requiredAgents) {
        const agent = this.agentRegistry.getAgent(agentId);
        if (agent) {
          agents.set(agentId, agent);
        }
      }
    }

    // Create execution context
    const context: WorkflowContext = {
      instanceId,
      agents,
      tools: [], // TODO: Get tools from registry when available
      config,
      logger: this.logger,
      coordinator: this.coordinator,
    };

    // Create workflow instance
    const instance: WorkflowInstance = {
      instanceId,
      workflowId: workflow.id,
      status: WorkflowStatus.PENDING,
      input,
      createdAt: new Date(),
      updatedAt: new Date(),
      context,
    };

    // Validate input against schema if provided
    if (workflow.inputSchema) {
      try {
        // Basic validation - could be enhanced with proper schema validation
        if (typeof workflow.inputSchema.validate === 'function') {
          workflow.inputSchema.validate(input);
        }
      } catch (error) {
        throw new Error(`Input validation failed: ${error}`);
      }
    }

    this.logger.debug(
      `Created workflow instance ${instanceId} for workflow ${workflow.id}`
    );

    return instance;
  }

  /**
   * Get active workflow instances
   */
  getActiveInstances(): WorkflowInstance[] {
    return Array.from(this.activeInstances.values());
  }

  /**
   * Get workflow instance by ID
   */
  getInstance(instanceId: string): WorkflowInstance | null {
    return this.activeInstances.get(instanceId) || null;
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      return false;
    }

    instance.status = WorkflowStatus.CANCELLED;
    instance.updatedAt = new Date();

    this.eventEmitter.emit('workflow.cancelled', {
      instanceId,
      workflowId: instance.workflowId,
    });

    this.moveToHistory(instance);

    this.logger.log(`Workflow instance ${instanceId} cancelled`);
    return true;
  }

  /**
   * Get execution history for a workflow
   */
  getWorkflowHistory(workflowId: string): WorkflowInstance[] {
    return this.executionHistory.get(workflowId) || [];
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    activeInstances: number;
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
  } {
    const allHistory = Array.from(this.executionHistory.values()).flat();
    const completedExecutions = allHistory.filter(
      (instance) =>
        instance.status === WorkflowStatus.COMPLETED ||
        instance.status === WorkflowStatus.FAILED
    );

    const successfulExecutions = completedExecutions.filter(
      (instance) => instance.status === WorkflowStatus.COMPLETED
    );

    const totalExecutionTime = completedExecutions
      .filter((instance) => instance.result?.metadata?.duration)
      .reduce(
        (sum, instance) => sum + (instance.result?.metadata?.duration || 0),
        0
      );

    return {
      activeInstances: this.activeInstances.size,
      totalExecutions: allHistory.length,
      successRate:
        completedExecutions.length > 0
          ? successfulExecutions.length / completedExecutions.length
          : 0,
      averageExecutionTime:
        completedExecutions.length > 0
          ? totalExecutionTime / completedExecutions.length
          : 0,
    };
  }

  /**
   * Move instance to history and clean up
   */
  private moveToHistory(instance: WorkflowInstance): void {
    // Remove from active instances
    this.activeInstances.delete(instance.instanceId);

    // Add to history
    const history = this.executionHistory.get(instance.workflowId) || [];
    history.push(instance);

    // Keep only last 100 executions per workflow
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.executionHistory.set(instance.workflowId, history);
  }

  /**
   * Validate workflow result structure
   */
  private validateWorkflowResult(result: WorkflowResult): void {
    if (typeof result !== 'object' || result === null) {
      throw new Error('Workflow result must be an object');
    }

    if (typeof result.success !== 'boolean') {
      throw new Error('Workflow result must have a boolean success field');
    }

    if (!result.metadata || typeof result.metadata !== 'object') {
      throw new Error('Workflow result must have a metadata object');
    }

    // Additional validation can be added here
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Subscribe to workflow events for real-time monitoring
   */
  subscribeToWorkflowEvents(
    instanceId: string,
    callback: (event: {
      type: 'workflow_started' | 'workflow_progress' | 'workflow_completed' | 'workflow_failed' | 'node_executed';
      data: any;
      timestamp: number;
    }) => void
  ): { unsubscribe: () => void } {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    // Create event listeners for this instance
    const unsubscribeFunctions: Array<() => void> = [];

    // Add listeners and collect unsubscribe functions
    const listener1 = this.eventEmitter.on('workflow.started', (event) => {
      if (event.instanceId === instanceId) {
        callback({
          type: 'workflow_started',
          data: event,
          timestamp: Date.now(),
        });
      }
    });
    if (typeof listener1 === 'function') {
      unsubscribeFunctions.push(listener1);
    }

    const listener2 = this.eventEmitter.on('workflow.progress', (event) => {
      if (event.instanceId === instanceId) {
        callback({
          type: 'workflow_progress',
          data: event,
          timestamp: Date.now(),
        });
      }
    });
    if (typeof listener2 === 'function') {
      unsubscribeFunctions.push(listener2);
    }

    const listener3 = this.eventEmitter.on('workflow.completed', (event) => {
      if (event.instanceId === instanceId) {
        callback({
          type: 'workflow_completed',
          data: event,
          timestamp: Date.now(),
        });
      }
    });
    if (typeof listener3 === 'function') {
      unsubscribeFunctions.push(listener3);
    }

    const listener4 = this.eventEmitter.on('workflow.failed', (event) => {
      if (event.instanceId === instanceId) {
        callback({
          type: 'workflow_failed',
          data: event,
          timestamp: Date.now(),
        });
      }
    });
    if (typeof listener4 === 'function') {
      unsubscribeFunctions.push(listener4);
    }

    const listener5 = this.eventEmitter.on('workflow.node.executed', (event) => {
      if (event.instanceId === instanceId) {
        callback({
          type: 'node_executed',
          data: event,
          timestamp: Date.now(),
        });
      }
    });
    if (typeof listener5 === 'function') {
      unsubscribeFunctions.push(listener5);
    }

    return {
      unsubscribe: () => {
        unsubscribeFunctions.forEach(unsub => {
          if (typeof unsub === 'function') {
            unsub();
          }
        });
      },
    };
  }

  /**
   * Clear all instances (useful for testing)
   */
  clear(): void {
    this.activeInstances.clear();
    this.executionHistory.clear();
    this.logger.debug('All workflow instances cleared');
  }
}
