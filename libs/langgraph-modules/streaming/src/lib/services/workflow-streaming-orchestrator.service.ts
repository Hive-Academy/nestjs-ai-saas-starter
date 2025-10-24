import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Workflow execution information returned to consumers
 */
export interface WorkflowExecutionInfo {
  executionId: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled';
  websocketUrl: string;
  subscriptionInfo: {
    event: string;
    payload: { executionId: string };
  };
  message: string;
}

/**
 * Execution status information
 */
export interface ExecutionStatus {
  executionId: string;
  active: boolean;
  connectedClients: number;
  startTime?: Date;
  lastActivity?: Date;
}

/**
 * Options for starting a workflow with streaming
 */
export interface StartWorkflowOptions<T> {
  workflow: {
    executeWithStreaming: (input: any) => AsyncGenerator<any>;
  };
  input: T;
  executionId: string;
}

/**
 * WorkflowStreamingOrchestrator - High-Level Facade for Workflow Streaming
 *
 * This service encapsulates the common pattern of:
 * 1. Starting a workflow execution in the background
 * 2. Automatically consuming the streaming events
 * 3. Broadcasting events to WebSocket clients via EventEmitter2
 * 4. Managing execution lifecycle
 *
 * Benefits for Consumer Applications:
 * - No manual async generator iteration
 * - No manual event consumption (events auto-broadcast)
 * - Simple one-method API for "start workflow + stream"
 * - Automatic error handling and cleanup
 * - Execution status tracking
 *
 * Usage Example:
 * ```typescript
 * @Controller('workflow')
 * export class WorkflowController {
 *   constructor(
 *     private readonly myWorkflow: MyWorkflow,
 *     private readonly orchestrator: WorkflowStreamingOrchestrator
 *   ) {}
 *
 *   @Post('execute')
 *   async execute(@Body() dto: ExecuteDto) {
 *     const executionId = `exec-${Date.now()}`;
 *
 *     // One-liner to start workflow + streaming
 *     return this.orchestrator.startWorkflowWithStreaming({
 *       workflow: this.myWorkflow,
 *       input: { userId: dto.userId, data: dto.data },
 *       executionId,
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class WorkflowStreamingOrchestrator {
  private readonly logger = new Logger(WorkflowStreamingOrchestrator.name);
  private readonly activeExecutions = new Map<
    string,
    {
      startTime: Date;
      lastActivity: Date;
      status: 'running' | 'completed' | 'failed' | 'cancelled';
    }
  >();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Start a workflow with automatic WebSocket streaming
   *
   * This method:
   * 1. Starts the workflow execution in the background (non-blocking)
   * 2. Automatically consumes the streaming events
   * 3. Events are auto-broadcast via EventEmitter2 to WebSocket clients
   * 4. Returns immediately with executionId and WebSocket connection info
   *
   * @param options - Workflow, input data, and executionId
   * @returns WorkflowExecutionInfo with connection details
   */
  async startWorkflowWithStreaming<T>(
    options: StartWorkflowOptions<T>
  ): Promise<WorkflowExecutionInfo> {
    const { workflow, input, executionId } = options;

    this.logger.log(`🚀 Starting workflow with streaming: ${executionId}`);

    // Track execution
    this.activeExecutions.set(executionId, {
      startTime: new Date(),
      lastActivity: new Date(),
      status: 'running',
    });

    // Start workflow in background (non-blocking)
    this.consumeWorkflowStream(workflow, input, executionId);

    // Return connection info immediately
    return {
      executionId,
      status: 'started',
      message:
        'Workflow started successfully. Connect to WebSocket to receive real-time updates.',
      websocketUrl: 'ws://localhost:8080/streaming',
      subscriptionInfo: {
        event: 'subscribe_execution',
        payload: { executionId },
      },
    };
  }

  /**
   * Get execution status for a workflow
   *
   * @param executionId - Execution ID to check
   * @returns ExecutionStatus with current state
   */
  getExecutionStatus(executionId: string): ExecutionStatus | null {
    const execution = this.activeExecutions.get(executionId);

    if (!execution) {
      return null;
    }

    return {
      executionId,
      active: execution.status === 'running',
      connectedClients: 0, // Will be populated by WebSocketBridge
      startTime: execution.startTime,
      lastActivity: execution.lastActivity,
    };
  }

  /**
   * Get all active executions
   *
   * @returns Array of execution IDs that are currently running
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.entries())
      .filter(([, exec]) => exec.status === 'running')
      .map(([id]) => id);
  }

  /**
   * Cancel a running workflow execution
   *
   * Emits a cancellation event that workflow implementations can listen to
   *
   * @param executionId - Execution ID to cancel
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);

    if (!execution) {
      this.logger.warn(`Cannot cancel - execution not found: ${executionId}`);
      return;
    }

    if (execution.status !== 'running') {
      this.logger.warn(
        `Cannot cancel - execution not running: ${executionId} (status: ${execution.status})`
      );
      return;
    }

    this.logger.log(`🛑 Cancelling workflow execution: ${executionId}`);

    // Update status
    execution.status = 'cancelled';
    execution.lastActivity = new Date();

    // Emit cancellation event
    this.eventEmitter.emit('workflow.execution.cancel', {
      executionId,
      timestamp: new Date(),
    });

    // Emit to WebSocket clients
    this.eventEmitter.emit(`workflow.stream.${executionId}`, {
      type: 'cancelled',
      executionId,
      message: 'Workflow execution cancelled',
      timestamp: new Date(),
    });

    this.logger.log(`✅ Workflow cancelled: ${executionId}`);
  }

  /**
   * Clean up completed or failed executions
   * Call this periodically to prevent memory leaks
   *
   * @param olderThanMinutes - Remove executions older than this (default: 60)
   */
  cleanupCompletedExecutions(olderThanMinutes = 60): void {
    const now = Date.now();
    const threshold = olderThanMinutes * 60 * 1000;
    let cleaned = 0;

    for (const [executionId, execution] of this.activeExecutions.entries()) {
      if (execution.status !== 'running') {
        const age = now - execution.lastActivity.getTime();
        if (age > threshold) {
          this.activeExecutions.delete(executionId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      this.logger.log(`🧹 Cleaned up ${cleaned} completed executions`);
    }
  }

  /**
   * Internal: Consume workflow stream and handle lifecycle
   *
   * This method runs in the background and:
   * 1. Iterates through the async generator from executeWithStreaming()
   * 2. Events are automatically propagated via EventEmitter2
   * 3. WebSocketBridgeService listens via @OnEvent decorators
   * 4. StreamingWebSocketService broadcasts to connected clients
   *
   * @param workflow - Workflow instance with executeWithStreaming method
   * @param input - Input data for workflow
   * @param executionId - Unique execution ID
   */
  private async consumeWorkflowStream(
    workflow: any,
    input: any,
    executionId: string
  ): Promise<void> {
    const execution = this.activeExecutions.get(executionId);

    try {
      // Get the streaming iterator from workflow
      const stream = workflow.executeWithStreaming({
        ...input,
        executionId,
      });

      // Consume the stream - events are automatically broadcast via EventEmitter2
      // We just need to iterate to keep the stream alive
      for await (const event of stream) {
        // Update last activity
        if (execution) {
          execution.lastActivity = new Date();
        }

        // Events are automatically emitted by WorkflowStreamService via:
        // - workflow.stream.${executionId}
        // - workflow.token.${executionId}
        // - workflow.progress.${executionId}
        // - workflow.milestone.${executionId}
        //
        // WebSocketBridgeService listens via @OnEvent decorators
        // StreamingWebSocketService broadcasts to subscribed clients
        //
        // No manual event emission needed here!

        this.logger.debug(
          `Event processed for ${executionId}: ${event?.type || 'unknown'}`
        );
      }

      // Mark as completed
      if (execution) {
        execution.status = 'completed';
        execution.lastActivity = new Date();
      }

      this.logger.log(`✅ Workflow completed: ${executionId}`);

      // Emit completion event
      this.emitCompletion(executionId);
    } catch (error) {
      // Mark as failed
      if (execution) {
        execution.status = 'failed';
        execution.lastActivity = new Date();
      }

      this.logger.error(
        `❌ Workflow failed: ${executionId}`,
        error instanceof Error ? error.stack : error
      );

      // Emit error event
      this.emitError(executionId, error);
    }
  }

  /**
   * Emit workflow completion event
   */
  private emitCompletion(executionId: string): void {
    this.eventEmitter.emit('workflow.execution.complete', {
      executionId,
      timestamp: new Date(),
    });

    // Also emit to execution-specific stream
    this.eventEmitter.emit(`workflow.stream.${executionId}`, {
      type: 'completed',
      executionId,
      message: 'Workflow execution completed successfully',
      timestamp: new Date(),
    });
  }

  /**
   * Emit workflow error event
   */
  private emitError(executionId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.eventEmitter.emit('workflow.execution.error', {
      executionId,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date(),
    });

    // Also emit to execution-specific stream
    this.eventEmitter.emit(`workflow.stream.${executionId}`, {
      type: 'error',
      executionId,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date(),
    });
  }
}
