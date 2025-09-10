import { Logger } from '@nestjs/common';
import type {
  ICheckpointAdapter,
  CheckpointIntegrationConfig,
  BaseCheckpointMetadata,
  BaseCheckpoint,
} from '../interfaces/checkpoint-adapter.interface';

/**
 * Helper class for integrating checkpoint functionality into consumer libraries
 * Provides common patterns and utilities for checkpoint operations
 */
export class CheckpointIntegrationHelper {
  private readonly logger = new Logger(CheckpointIntegrationHelper.name);

  constructor(
    private readonly checkpointAdapter: ICheckpointAdapter | null,
    private readonly config: CheckpointIntegrationConfig
  ) {}

  /**
   * Check if checkpointing is enabled and available
   */
  get isEnabled(): boolean {
    return this.config.enabled && this.checkpointAdapter !== null;
  }

  /**
   * Safely save a checkpoint with error handling and retries
   */
  async saveCheckpointSafely<T = unknown>(
    threadId: string,
    checkpoint: T,
    metadata?: Partial<BaseCheckpointMetadata>
  ): Promise<boolean> {
    if (!this.isEnabled) {
      return true; // Successfully "saved" (no-op)
    }

    const retries = this.config.errorHandling?.maxRetries ?? 3;
    const shouldLog = this.config.errorHandling?.logErrors ?? true;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.checkpointAdapter!.saveCheckpoint(
          threadId,
          checkpoint,
          this.enhanceMetadata(metadata),
          this.config.defaultSaver
        );

        if (attempt > 1 && shouldLog) {
          this.logger.log(
            `Checkpoint saved successfully on attempt ${attempt} for thread ${threadId}`
          );
        }

        return true;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const shouldContinue =
          this.config.errorHandling?.continueOnCheckpointFailure ?? true;

        if (shouldLog) {
          const logLevel = isLastAttempt && !shouldContinue ? 'error' : 'warn';
          this.logger[logLevel](
            `Checkpoint save failed (attempt ${attempt}/${retries}) for thread ${threadId}:`,
            error
          );
        }

        if (isLastAttempt) {
          if (shouldContinue) {
            return false; // Failed but continue execution
          } else {
            throw error; // Rethrow if we shouldn't continue
          }
        }

        // Wait before retry (exponential backoff)
        await this.delay(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
      }
    }

    return false;
  }

  /**
   * Safely load a checkpoint with error handling
   */
  async loadCheckpointSafely<T = unknown>(
    threadId: string,
    checkpointId?: string
  ): Promise<BaseCheckpoint<T> | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      return await this.checkpointAdapter!.loadCheckpoint<T>(
        threadId,
        checkpointId,
        this.config.defaultSaver
      );
    } catch (error) {
      if (this.config.errorHandling?.logErrors ?? true) {
        this.logger.warn(
          `Failed to load checkpoint for thread ${threadId}:`,
          error
        );
      }

      if (this.config.errorHandling?.continueOnCheckpointFailure ?? true) {
        return null; // Return null to continue without checkpoint
      } else {
        throw error;
      }
    }
  }

  /**
   * Automatically checkpoint at specified intervals
   */
  async autoCheckpointIfEnabled<T = unknown>(
    threadId: string,
    checkpoint: T,
    eventType: 'task' | 'node' | 'error' | 'decision' | 'custom',
    metadata?: Partial<BaseCheckpointMetadata>
  ): Promise<boolean> {
    if (!this.shouldAutoCheckpoint(eventType)) {
      return true;
    }

    return this.saveCheckpointSafely(threadId, checkpoint, {
      ...metadata,
      autoCheckpoint: true,
      checkpointTrigger: eventType,
    });
  }

  /**
   * Clean up old checkpoints with safety checks
   */
  async cleanupCheckpointsSafely(threadIds?: string[]): Promise<number> {
    if (!this.isEnabled) {
      return 0;
    }

    try {
      return await this.checkpointAdapter!.cleanupCheckpoints({
        threadIds,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days default
      });
    } catch (error) {
      if (this.config.errorHandling?.logErrors ?? true) {
        this.logger.warn('Failed to cleanup checkpoints:', error);
      }
      return 0;
    }
  }

  /**
   * Check if the checkpoint system is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isEnabled) {
      return true; // Disabled = healthy
    }

    try {
      return await this.checkpointAdapter!.isHealthy(this.config.defaultSaver);
    } catch (error) {
      this.logger.warn('Health check failed for checkpoint adapter:', error);
      return false;
    }
  }

  /**
   * Get checkpoint statistics for monitoring
   */
  async getCheckpointStats(threadId: string): Promise<{
    totalCheckpoints: number;
    oldestCheckpoint?: Date;
    newestCheckpoint?: Date;
  }> {
    if (!this.isEnabled) {
      return { totalCheckpoints: 0 };
    }

    try {
      const checkpoints = await this.checkpointAdapter!.listCheckpoints(
        threadId,
        {
          limit: 1000, // Get all for stats
        }
      );

      if (checkpoints.length === 0) {
        return { totalCheckpoints: 0 };
      }

      const timestamps = checkpoints
        .map(([, , metadata]) => metadata.timestamp)
        .filter(Boolean)
        .map((ts) => new Date(ts))
        .sort((a, b) => a.getTime() - b.getTime());

      return {
        totalCheckpoints: checkpoints.length,
        oldestCheckpoint: timestamps[0],
        newestCheckpoint: timestamps[timestamps.length - 1],
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get checkpoint stats for thread ${threadId}:`,
        error
      );
      return { totalCheckpoints: 0 };
    }
  }

  /**
   * Create a checkpoint-aware execution wrapper
   */
  async withCheckpoint<T, R>(
    threadId: string,
    operation: () => Promise<R>,
    options: {
      beforeState?: T;
      afterState?: (result: R) => T;
      metadata?: Partial<BaseCheckpointMetadata>;
      saveAfter?: boolean;
    }
  ): Promise<R> {
    // Save checkpoint before operation if requested
    if (options.beforeState && this.isEnabled) {
      await this.saveCheckpointSafely(threadId, options.beforeState, {
        ...options.metadata,
        stepName: 'pre-operation',
      });
    }

    try {
      const result = await operation();

      // Save checkpoint after operation if requested
      if (options.saveAfter !== false && options.afterState && this.isEnabled) {
        const afterState = options.afterState(result);
        await this.saveCheckpointSafely(threadId, afterState, {
          ...options.metadata,
          stepName: 'post-operation',
        });
      }

      return result;
    } catch (error) {
      // Save error checkpoint
      if (this.isEnabled) {
        const errorInfo =
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
              }
            : {
                message: String(error),
                stack: undefined,
                code: undefined,
              };

        await this.saveCheckpointSafely(
          threadId,
          { error: errorInfo.message },
          {
            ...options.metadata,
            stepName: 'error',
            nodeType: 'error',
            error: errorInfo,
          }
        );
      }
      throw error;
    }
  }

  /**
   * Enhanced metadata with default values
   */
  private enhanceMetadata(
    metadata?: Partial<BaseCheckpointMetadata>
  ): BaseCheckpointMetadata {
    return {
      timestamp: new Date().toISOString(),
      source: 'input' as const,
      step: 0,
      parents: {},
      ...metadata,
    };
  }

  /**
   * Check if auto-checkpointing should occur for the given event type
   */
  private shouldAutoCheckpoint(eventType: string): boolean {
    if (!this.config.autoCheckpoint?.enabled) {
      return false;
    }

    const allowedEvents = this.config.autoCheckpoint.after ?? [];
    return allowedEvents.includes(eventType as any);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create checkpoint integration helper
 */
export function createCheckpointIntegration(
  checkpointAdapter: ICheckpointAdapter | null,
  config: CheckpointIntegrationConfig
): CheckpointIntegrationHelper {
  return new CheckpointIntegrationHelper(checkpointAdapter, config);
}
