import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import type { MultiAgentResult } from '../interfaces/multi-agent.interface';

/**
 * Background Memory Service - Non-blocking memory writes
 *
 * TASK_2025_029 Phase 1: Make POST-execution memory async
 *
 * Purpose:
 * - Queue memory writes for background processing
 * - Prevent blocking workflow responses
 * - Batch writes for efficiency
 * - Graceful degradation on failures
 *
 * Pattern: Fire-and-forget with configurable batching
 *
 * Performance Impact:
 * - Before: 7.5s blocking time per workflow (5 writes × 1.5s avg)
 * - After: <10ms queue time, instant workflow response
 */

interface MemoryWriteTask {
  readonly type: 'conversation' | 'coordination_event' | 'performance';
  readonly priority: 'low' | 'medium' | 'high';
  readonly data: any;
  readonly timestamp: number;
}

@Injectable()
export class BackgroundMemoryService implements OnModuleDestroy {
  private readonly logger = new Logger(BackgroundMemoryService.name);

  private writeQueue: MemoryWriteTask[] = [];
  private processing = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  // Configuration
  private readonly MAX_BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 1000;

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter: IMemoryAdapter | null
  ) {
    if (this.memoryAdapter) {
      this.startBackgroundFlush();
      this.logger.log(
        'BackgroundMemoryService initialized with automatic flushing'
      );
    } else {
      this.logger.warn(
        'BackgroundMemoryService initialized without memory adapter - writes will be no-op'
      );
    }
  }

  /**
   * Start automatic background flush
   */
  private startBackgroundFlush(): void {
    this.flushInterval = setInterval(async () => {
      if (!this.processing && this.writeQueue.length > 0) {
        await this.processQueue();
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Queue conversation memory write (POST-execution)
   */
  async queueConversationWrite(
    threadId: string,
    humanMessage: string,
    aiMessage: string,
    metadata: Record<string, unknown>,
    priority: 'low' | 'medium' | 'high' = 'low'
  ): Promise<void> {
    if (!this.memoryAdapter || this.isShuttingDown) {
      return;
    }

    const task: MemoryWriteTask = {
      type: 'conversation',
      priority,
      data: { threadId, humanMessage, aiMessage, metadata },
      timestamp: Date.now(),
    };

    this.enqueueTask(task);
  }

  /**
   * Queue coordination event write (background learning)
   */
  async queueCoordinationEvent(
    networkId: string,
    executionId: string,
    result: MultiAgentResult,
    metadata: Record<string, unknown>,
    priority: 'low' | 'medium' | 'high' = 'low'
  ): Promise<void> {
    if (!this.memoryAdapter || this.isShuttingDown) {
      return;
    }

    const task: MemoryWriteTask = {
      type: 'coordination_event',
      priority,
      data: { networkId, executionId, result, metadata },
      timestamp: Date.now(),
    };

    this.enqueueTask(task);
  }

  /**
   * Queue agent performance data write
   */
  async queuePerformanceData(
    agentId: string,
    performanceData: Record<string, unknown>,
    priority: 'low' | 'medium' | 'high' = 'low'
  ): Promise<void> {
    if (!this.memoryAdapter || this.isShuttingDown) {
      return;
    }

    const task: MemoryWriteTask = {
      type: 'performance',
      priority,
      data: { agentId, performanceData },
      timestamp: Date.now(),
    };

    this.enqueueTask(task);
  }

  /**
   * Enqueue task with overflow protection
   */
  private enqueueTask(task: MemoryWriteTask): void {
    if (this.writeQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn(
        `Memory write queue full (${this.MAX_QUEUE_SIZE}), dropping oldest low-priority task`
      );
      // Drop oldest low-priority task
      const lowPriorityIndex = this.writeQueue.findIndex(
        (t) => t.priority === 'low'
      );
      if (lowPriorityIndex >= 0) {
        this.writeQueue.splice(lowPriorityIndex, 1);
      } else {
        // Queue full with medium/high priority - drop oldest
        this.writeQueue.shift();
      }
    }

    this.writeQueue.push(task);

    this.logger.debug(
      `Queued ${task.type} memory write (priority: ${task.priority}, queue: ${this.writeQueue.length})`
    );

    // Trigger immediate flush if high priority or batch size reached
    if (
      task.priority === 'high' ||
      this.writeQueue.length >= this.MAX_BATCH_SIZE
    ) {
      this.processQueue().catch((error) =>
        this.logger.warn(`Background queue processing failed: ${error}`)
      );
    }
  }

  /**
   * Process queued memory writes in batch
   */
  private async processQueue(): Promise<void> {
    if (
      this.processing ||
      this.writeQueue.length === 0 ||
      !this.memoryAdapter
    ) {
      return;
    }

    this.processing = true;

    try {
      // Sort by priority (high → medium → low)
      const sortedQueue = [...this.writeQueue].sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });

      // Take batch
      const batch = sortedQueue.slice(0, this.MAX_BATCH_SIZE);
      const batchCount = batch.length;

      this.logger.debug(`Processing ${batchCount} memory writes`);

      const startTime = Date.now();

      // Process batch with error handling per task
      const results = await Promise.allSettled(
        batch.map((task) => this.processTask(task))
      );

      const successCount = results.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failureCount = results.filter(
        (r) => r.status === 'rejected'
      ).length;

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Batch processed: ${successCount} succeeded, ${failureCount} failed (${processingTime}ms)`
      );

      // Remove processed tasks from queue
      this.writeQueue = this.writeQueue.filter((task) => !batch.includes(task));

      // Log failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Failed to write ${batch[index].type} memory: ${result.reason}`
          );
        }
      });
    } catch (error) {
      this.logger.error(`Background memory processing failed: ${error}`);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process individual memory write task
   */
  private async processTask(task: MemoryWriteTask): Promise<void> {
    if (!this.memoryAdapter) {
      throw new Error('Memory adapter not available');
    }

    switch (task.type) {
      case 'conversation':
        await this.memoryAdapter.storeConversationTurn(
          task.data.threadId,
          task.data.humanMessage,
          task.data.aiMessage,
          task.data.metadata
        );
        break;

      case 'coordination_event':
        await this.memoryAdapter.store(
          `agents.coordination.events.${task.data.networkId}`,
          JSON.stringify({
            networkId: task.data.networkId,
            executionId: task.data.executionId,
            result: task.data.result,
            ...task.data.metadata,
          }),
          {
            type: 'coordination_event',
            source: 'background_memory',
            networkId: task.data.networkId,
            executionId: task.data.executionId,
            ...task.data.metadata,
          }
        );
        break;

      case 'performance':
        await this.memoryAdapter.store(
          `agents.coordination.performance.${task.data.agentId}`,
          JSON.stringify(task.data.performanceData),
          {
            type: 'agent_performance',
            source: 'background_memory',
            agentId: task.data.agentId,
            ...task.data.performanceData,
          }
        );
        break;

      default: {
        const exhaustiveCheck: never = task.type;
        throw new Error(`Unknown task type: ${exhaustiveCheck}`);
      }
    }
  }

  /**
   * Flush all queued writes (blocking) - use for shutdown
   */
  async flush(): Promise<void> {
    if (this.writeQueue.length === 0) {
      return;
    }

    this.logger.log(
      `Flushing ${this.writeQueue.length} queued memory writes...`
    );

    while (this.writeQueue.length > 0) {
      await this.processQueue();
    }

    this.logger.log('All memory writes flushed');
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueSize: number;
    processing: boolean;
    oldestTaskAge: number | null;
  } {
    const oldestTask = this.writeQueue[0];

    return {
      queueSize: this.writeQueue.length,
      processing: this.processing,
      oldestTaskAge: oldestTask ? Date.now() - oldestTask.timestamp : null,
    };
  }

  /**
   * Graceful shutdown - flush all pending writes
   */
  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    // Stop background flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining writes
    if (this.writeQueue.length > 0) {
      this.logger.log('Graceful shutdown: flushing pending memory writes...');
      await this.flush();
    }

    this.logger.log('BackgroundMemoryService destroyed');
  }
}
