import {
  ICheckpointAdapter,
  type BaseCheckpoint,
  type BaseCheckpointMetadata,
  type BaseCheckpointTuple,
  type CheckpointListOptions,
  type CheckpointCleanupOptions,
} from '@hive-academy/langgraph-core';
import type { CheckpointManagerService } from '../core/checkpoint-manager.service';
import type { ILangGraphCheckpointSaver } from '../interfaces/langgraph-checkpoint.interface';

/**
 * Simplified adapter that bridges CheckpointManagerService to ICheckpointAdapter interface
 * Uses LangGraph types directly - no complex type conversions
 */
export class CheckpointManagerAdapter extends ICheckpointAdapter {
  constructor(private readonly checkpointManager: CheckpointManagerService) {
    super();
  }

  /**
   * CRITICAL: Get native LangGraph saver for use with graph.compile({ checkpointer })
   * This is the most important method for consumers
   */
  getLangGraphSaver(saverName?: string): ILangGraphCheckpointSaver | null {
    return this.checkpointManager.getLangGraphSaver(saverName);
  }

  /**
   * List checkpoints - direct delegation to manager
   */
  async listCheckpoints(
    threadId: string,
    options?: CheckpointListOptions,
    saverName?: string
  ): Promise<readonly BaseCheckpointTuple[]> {
    const checkpoints = await this.checkpointManager.listCheckpoints(
      threadId,
      options,
      saverName
    );

    // Use LangGraph types directly - minimal conversion to base types
    return checkpoints.map((tuple) => {
      const config = tuple.config;
      const checkpoint = tuple.checkpoint;
      const metadata = tuple.metadata;

      return [
        config,
        {
          id: checkpoint.id,
          channel_values: checkpoint.channel_values,
        } as BaseCheckpoint,
        {
          timestamp: checkpoint.ts || '',
          source: (metadata?.source || 'loop') as
            | 'input'
            | 'loop'
            | 'update'
            | 'fork',
          step: metadata?.step || 0,
          parents: metadata?.parents || {},
        } as BaseCheckpointMetadata,
      ] as BaseCheckpointTuple;
    });
  }

  /**
   * Load checkpoint - direct delegation to manager
   */
  async loadCheckpoint<T = unknown>(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<BaseCheckpoint<T> | null> {
    const checkpoint = await this.checkpointManager.loadCheckpoint(
      threadId,
      checkpointId,
      saverName
    );

    if (!checkpoint) {
      return null;
    }

    // Minimal conversion to BaseCheckpoint
    return {
      id: checkpoint.id,
      channel_values: checkpoint.channel_values as T,
    };
  }

  /**
   * Cleanup checkpoints - direct delegation to manager
   */
  async cleanupCheckpoints(options: CheckpointCleanupOptions): Promise<number> {
    return this.checkpointManager.cleanupCheckpoints(options);
  }

  /**
   * Health check - simplified to just verify saver exists
   */
  async isHealthy(saverName?: string): Promise<boolean> {
    return this.checkpointManager.getLangGraphSaver(saverName) !== null;
  }

  /**
   * Not implemented - manual checkpoint saves removed in TASK_2025_032
   * LangGraph handles all checkpoint creation automatically
   */
  async saveCheckpoint<T = unknown>(
    threadId: string,
    checkpoint: T,
    metadata?: BaseCheckpointMetadata,
    saverName?: string
  ): Promise<void> {
    throw new Error(
      'Manual checkpoint saves not supported - LangGraph creates checkpoints automatically when using compile({ checkpointer })'
    );
  }

  /**
   * Not implemented - no consumers use this method
   */
  async deleteCheckpoint(
    threadId: string,
    checkpointId: string,
    saverName?: string
  ): Promise<boolean> {
    throw new Error(
      'Individual checkpoint deletion not implemented - use cleanupCheckpoints() for maintenance'
    );
  }
}
