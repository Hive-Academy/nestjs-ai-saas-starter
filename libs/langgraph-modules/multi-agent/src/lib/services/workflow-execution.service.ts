import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowResult,
  WorkflowConfig,
} from '../interfaces/multi-agent.interface';
import { WorkflowRegistryService } from './workflow-registry.service';
import { WorkflowCheckpointService } from './workflow-checkpoint.service';
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowCanonicalIdService } from './workflow-canonical-id.service';

/**
 * Workflow Execution Service
 * Handles workflow lifecycle, execution, and state management
 */
@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  // Execution time tracking
  private readonly executionTimes = new Map<string, number[]>();
  private readonly workflowMetrics = new Map<
    string,
    {
      totalExecutions: number;
      totalTime: number;
      averageTime: number;
      minTime: number;
      maxTime: number;
      successCount: number;
      failureCount: number;
    }
  >();

  constructor(
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly checkpointService: WorkflowCheckpointService,
    private readonly instanceService: WorkflowInstanceService,
    private readonly canonicalIdService: WorkflowCanonicalIdService
  ) {
    this.logger.debug('WorkflowExecutionService initialized');
    if (this.checkpointService.isCheckpointingAvailable()) {
      this.logger.log(
        'Checkpoint service available - automatic checkpointing enabled'
      );
    } else {
      this.logger.debug(
        'No checkpoint adapter - running without checkpointing'
      );
    }
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

      // Generate canonical instance ID
      const instanceId = this.canonicalIdService.generateInstanceId(
        workflowId,
        input
      );

      // Create workflow instance
      const instance = await this.instanceService.createInstance(
        workflowId,
        instanceId,
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
      this.instanceService.updateInstanceStatus(
        instance.instanceId,
        WorkflowStatus.RUNNING
      );

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

      // Track execution time metrics
      this.recordExecutionTime(
        instance.workflowId,
        endTime - startTime,
        result.success
      );

      // Update instance status with result
      const finalStatus = result.success
        ? WorkflowStatus.COMPLETED
        : WorkflowStatus.FAILED;
      this.instanceService.updateInstanceStatus(
        instance.instanceId,
        finalStatus,
        finalResult
      );

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

      // Track execution time metrics for failed execution
      this.recordExecutionTime(instance.workflowId, endTime - startTime, false);

      // Update instance status with error result
      this.instanceService.updateInstanceStatus(
        instance.instanceId,
        WorkflowStatus.FAILED,
        errorResult
      );

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

  // createWorkflowInstance method REMOVED - delegated to WorkflowInstanceService

  /**
   * Get active workflow instances
   */
  getActiveInstances(): WorkflowInstance[] {
    return this.instanceService.getActiveInstances();
  }

  /**
   * Get workflow instance by ID
   */
  getInstance(instanceId: string): WorkflowInstance | null {
    return this.instanceService.getInstance(instanceId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    return this.instanceService.cancelWorkflow(instanceId);
  }

  /**
   * Get execution history for a workflow
   */
  getWorkflowExecutionHistory(workflowId: string): WorkflowInstance[] {
    return this.instanceService.getWorkflowHistory(workflowId);
  }

  /**
   * Record execution time for a workflow
   */
  private recordExecutionTime(
    workflowId: string,
    executionTime: number,
    success: boolean
  ): void {
    // Record individual execution time
    const times = this.executionTimes.get(workflowId) || [];
    times.push(executionTime);

    // Keep only last 1000 execution times to prevent memory leaks
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }
    this.executionTimes.set(workflowId, times);

    // Update workflow metrics
    const metrics = this.workflowMetrics.get(workflowId) || {
      totalExecutions: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      successCount: 0,
      failureCount: 0,
    };

    metrics.totalExecutions++;
    metrics.totalTime += executionTime;
    metrics.averageTime = metrics.totalTime / metrics.totalExecutions;
    metrics.minTime = Math.min(metrics.minTime, executionTime);
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    this.workflowMetrics.set(workflowId, metrics);

    this.logger.debug(
      `Recorded execution time for workflow ${workflowId}: ${executionTime}ms (avg: ${metrics.averageTime.toFixed(
        2
      )}ms)`
    );
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
    const stats = this.instanceService.getStatistics();

    // Calculate overall average execution time across all workflows
    let totalTime = 0;
    let totalExecutions = 0;

    for (const [, metrics] of this.workflowMetrics) {
      totalTime += metrics.totalTime;
      totalExecutions += metrics.totalExecutions;
    }

    const averageExecutionTime =
      totalExecutions > 0 ? totalTime / totalExecutions : 0;

    return {
      activeInstances: stats.activeCount,
      totalExecutions: stats.totalExecutions,
      successRate:
        stats.totalExecutions > 0
          ? stats.byStatus[WorkflowStatus.COMPLETED] / stats.totalExecutions
          : 0,
      averageExecutionTime,
    };
  }

  /**
   * Move instance to history and clean up - REMOVED, delegated to WorkflowInstanceService
   */

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

    const listener5 = this.eventEmitter.on(
      'workflow.node.executed',
      (event) => {
        if (event.instanceId === instanceId) {
          callback({
            type: 'node_executed',
            data: event,
            timestamp: Date.now(),
          });
        }
      }
    );
    if (typeof listener5 === 'function') {
      unsubscribeFunctions.push(listener5);
    }

    return {
      unsubscribe: () => {
        unsubscribeFunctions.forEach((unsub) => {
          if (typeof unsub === 'function') {
            unsub();
          }
        });
      },
    };
  }

  /**
   * Get detailed execution metrics for a specific workflow
   */
  getWorkflowExecutionMetrics(workflowId: string): {
    totalExecutions: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
    recentExecutionTimes: number[];
    percentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  } | null {
    const metrics = this.workflowMetrics.get(workflowId);
    const times = this.executionTimes.get(workflowId);

    if (!metrics || !times || times.length === 0) {
      return null;
    }

    // Calculate percentiles
    const sortedTimes = [...times].sort((a, b) => a - b);
    const percentiles = {
      p50: this.calculatePercentile(sortedTimes, 50),
      p90: this.calculatePercentile(sortedTimes, 90),
      p95: this.calculatePercentile(sortedTimes, 95),
      p99: this.calculatePercentile(sortedTimes, 99),
    };

    return {
      totalExecutions: metrics.totalExecutions,
      averageTime: metrics.averageTime,
      minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
      maxTime: metrics.maxTime,
      successRate:
        metrics.totalExecutions > 0
          ? metrics.successCount / metrics.totalExecutions
          : 0,
      recentExecutionTimes: times.slice(-10), // Last 10 execution times
      percentiles,
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number
  ): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get system-wide execution metrics
   */
  getSystemExecutionMetrics(): {
    totalWorkflows: number;
    totalExecutions: number;
    averageExecutionTime: number;
    totalSuccessfulExecutions: number;
    totalFailedExecutions: number;
    systemSuccessRate: number;
    workflowMetrics: Record<
      string,
      {
        executions: number;
        averageTime: number;
        successRate: number;
      }
    >;
  } {
    let totalExecutions = 0;
    let totalTime = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    const workflowMetrics: Record<
      string,
      {
        executions: number;
        averageTime: number;
        successRate: number;
      }
    > = {};

    for (const [workflowId, metrics] of this.workflowMetrics) {
      totalExecutions += metrics.totalExecutions;
      totalTime += metrics.totalTime;
      totalSuccessful += metrics.successCount;
      totalFailed += metrics.failureCount;

      workflowMetrics[workflowId] = {
        executions: metrics.totalExecutions,
        averageTime: metrics.averageTime,
        successRate:
          metrics.totalExecutions > 0
            ? metrics.successCount / metrics.totalExecutions
            : 0,
      };
    }

    return {
      totalWorkflows: this.workflowMetrics.size,
      totalExecutions,
      averageExecutionTime:
        totalExecutions > 0 ? totalTime / totalExecutions : 0,
      totalSuccessfulExecutions: totalSuccessful,
      totalFailedExecutions: totalFailed,
      systemSuccessRate:
        totalExecutions > 0 ? totalSuccessful / totalExecutions : 0,
      workflowMetrics,
    };
  }

  /**
   * Clear execution metrics for a specific workflow
   */
  clearWorkflowMetrics(workflowId: string): void {
    this.executionTimes.delete(workflowId);
    this.workflowMetrics.delete(workflowId);
    this.logger.debug(`Cleared execution metrics for workflow ${workflowId}`);
  }

  /**
   * Clear all instances (useful for testing)
   */
  clear(): void {
    this.instanceService.clear();
    this.executionTimes.clear();
    this.workflowMetrics.clear();
    this.logger.debug('All workflow instances and execution metrics cleared');
  }

  // ==================== CANONICAL ID GENERATION (NODE_ID_STANDARD) ====================

  // Canonical ID generation methods REMOVED - delegated to WorkflowCanonicalIdService

  // ==================== CHECKPOINT DELEGATION METHODS ====================

  /**
   * Resume workflow execution from checkpoint
   * Delegates to WorkflowCheckpointService
   */
  async resumeFromCheckpoint(
    threadId: string,
    checkpointId?: string
  ): Promise<WorkflowResult> {
    const result = await this.checkpointService.resumeFromCheckpoint(
      threadId,
      checkpointId
    );

    // If successful, tracking is handled by the WorkflowInstanceService automatically
    // No additional tracking needed here since the checkpoint service handles workflow completion

    return result;
  }

  /**
   * Get workflow history from checkpoints
   * Delegates to WorkflowCheckpointService
   */
  async getWorkflowCheckpointHistory(threadId: string): Promise<any[]> {
    // Get checkpoint history
    const checkpointHistory = await this.checkpointService.getWorkflowHistory(
      threadId
    );

    // Also check in-memory history if available
    const memoryHistory = this.instanceService.getWorkflowHistory(threadId);

    if (memoryHistory.length > 0) {
      const memoryEntries = memoryHistory.map((instance) => ({
        threadId: instance.instanceId,
        checkpointId: `memory-${instance.instanceId}-${Date.now()}`,
        timestamp: instance.updatedAt,
        workflowId: instance.workflowId,
        status: instance.status,
        state: {
          messages: 0,
          metadata: instance.result?.metadata || {},
        },
        metrics: {
          executionTime: instance.result?.metadata?.duration || null,
          confidence: null,
          errorCount: instance.result?.error ? 1 : 0,
        },
        context: {
          isMemoryOnly: true,
          isError: instance.status === WorkflowStatus.FAILED,
          errorMessage: instance.result?.error?.message || null,
        },
      }));

      // Merge and deduplicate
      const allHistory = [...checkpointHistory, ...memoryEntries];
      const uniqueHistory = Array.from(
        new Map(
          allHistory.map((h) => [`${h.threadId}-${h.timestamp}`, h])
        ).values()
      );

      return uniqueHistory;
    }

    return checkpointHistory;
  }

  // saveCheckpoint method REMOVED - delegated to WorkflowCheckpointService
}
