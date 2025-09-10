import {
  ICheckpointAdapter,
  type BaseCheckpoint,
  type BaseCheckpointMetadata,
  type BaseCheckpointTuple,
  type CheckpointListOptions,
  type CheckpointCleanupOptions,
} from '@hive-academy/langgraph-core';
import type { CheckpointManagerService } from '../core/checkpoint-manager.service';

/**
 * Adapter implementation that wraps CheckpointManagerService
 * This bridges the gap between the shared interface and the actual service implementation
 */
export class CheckpointManagerAdapter extends ICheckpointAdapter {
  constructor(private readonly checkpointManager: CheckpointManagerService) {
    super();
  }

  async saveCheckpoint<T = unknown>(
    threadId: string,
    checkpoint: T,
    metadata?: BaseCheckpointMetadata,
    saverName?: string
  ): Promise<void> {
    // Convert minimal metadata to enhanced metadata
    const enhancedMetadata = metadata
      ? this.toEnhancedMetadata(metadata)
      : undefined;

    return this.checkpointManager.saveCheckpoint(
      threadId,
      checkpoint,
      enhancedMetadata,
      saverName
    );
  }

  async loadCheckpoint<T = unknown>(
    threadId: string,
    checkpointId?: string,
    saverName?: string
  ): Promise<BaseCheckpoint<T> | null> {
    const result = await this.checkpointManager.loadCheckpoint(
      threadId,
      checkpointId,
      saverName
    );

    if (!result) {
      return null;
    }

    // Convert enhanced checkpoint to base checkpoint
    return this.toBaseCheckpoint(result.checkpoint);
  }

  async listCheckpoints(
    threadId: string,
    options?: CheckpointListOptions,
    saverName?: string
  ): Promise<readonly BaseCheckpointTuple[]> {
    // Convert minimal options to enhanced options
    const enhancedOptions = options
      ? this.toEnhancedListOptions(options)
      : undefined;

    const checkpoints = await this.checkpointManager.listCheckpoints(
      threadId,
      enhancedOptions,
      saverName
    );

    // Convert enhanced tuples to base tuples
    return checkpoints.map(
      ([config, checkpoint, metadata]) =>
        [
          config,
          this.toBaseCheckpoint(checkpoint),
          this.toBaseMetadata(metadata),
        ] as BaseCheckpointTuple
    );
  }

  async cleanupCheckpoints(options: CheckpointCleanupOptions): Promise<number> {
    // Convert minimal cleanup options to enhanced options
    const enhancedOptions = this.toEnhancedCleanupOptions(options);

    return this.checkpointManager.cleanupCheckpoints(enhancedOptions);
  }

  async isHealthy(saverName?: string): Promise<boolean> {
    try {
      const health = await this.checkpointManager.getHealthStatus();

      if (saverName) {
        return health.savers?.[saverName]?.status === 'healthy';
      }

      return health.overall?.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert base metadata to enhanced metadata
   */
  private toEnhancedMetadata(metadata: BaseCheckpointMetadata): any {
    return {
      ...metadata,
      // Add any additional fields that the enhanced version needs
    };
  }

  /**
   * Convert enhanced checkpoint to base checkpoint
   */
  private toBaseCheckpoint<T>(enhancedCheckpoint: any): BaseCheckpoint<T> {
    return {
      id: enhancedCheckpoint.id,
      channel_values: enhancedCheckpoint.channel_values,
    };
  }

  /**
   * Convert enhanced metadata to base metadata
   */
  private toBaseMetadata(enhancedMetadata: any): BaseCheckpointMetadata {
    return {
      timestamp: enhancedMetadata.timestamp,
      source: enhancedMetadata.source,
      step: enhancedMetadata.step,
      parents: enhancedMetadata.parents,
      // Copy any additional fields
      ...Object.fromEntries(
        Object.entries(enhancedMetadata).filter(
          ([key]) => !['timestamp', 'source', 'step', 'parents'].includes(key)
        )
      ),
    };
  }

  /**
   * Convert base list options to enhanced list options
   */
  private toEnhancedListOptions(options: CheckpointListOptions): any {
    return {
      limit: options.limit,
      offset: options.offset,
      before: options.before,
      metadata: options.metadata,
      // Add any additional mapping needed
    };
  }

  /**
   * Convert base cleanup options to enhanced cleanup options
   */
  private toEnhancedCleanupOptions(options: CheckpointCleanupOptions): any {
    return {
      threadIds: options.threadIds,
      maxAge: options.maxAge,
      // Add any additional mapping needed
    };
  }
}
