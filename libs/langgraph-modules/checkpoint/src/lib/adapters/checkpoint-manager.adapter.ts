import {
  ICheckpointAdapter,
  type BaseCheckpoint,
  type BaseCheckpointMetadata,
  type BaseCheckpointTuple,
  type CheckpointListOptions,
  type CheckpointCleanupOptions,
} from '@hive-academy/langgraph-core';
import type { CheckpointManagerService } from '../core/checkpoint-manager.service';
import type {
  EnhancedCheckpointMetadata,
  EnhancedCheckpoint,
  ListCheckpointsOptions,
  CheckpointCleanupOptions as EnhancedCheckpointCleanupOptions,
} from '../interfaces/checkpoint.interface';
import type { ILangGraphCheckpointSaver } from '../interfaces/langgraph-checkpoint.interface';

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
    return this.toBaseCheckpoint<T>(result as EnhancedCheckpoint<T>);
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

  async deleteCheckpoint(
    threadId: string,
    checkpointId: string,
    saverName?: string
  ): Promise<boolean> {
    // Use the CheckpointManagerService deleteCheckpoint method (will add it)
    return this.checkpointManager.deleteCheckpoint(
      threadId,
      checkpointId,
      saverName
    );
  }

  async cleanupCheckpoints(options: CheckpointCleanupOptions): Promise<number> {
    // Convert minimal cleanup options to enhanced options
    const enhancedOptions = this.toEnhancedCleanupOptions(options);

    return this.checkpointManager.cleanupCheckpoints(enhancedOptions);
  }

  async isHealthy(saverName?: string): Promise<boolean> {
    try {
      if (saverName) {
        // Check health for a specific saver
        const healthStatus = await this.checkpointManager.getHealthStatus(
          saverName
        );
        return healthStatus?.status === 'healthy';
      }

      // Check overall health using the synchronous summary method
      const healthSummary = this.checkpointManager.getHealthSummary();
      const overall = healthSummary.overall;
      return overall && 'healthy' in overall ? overall.healthy : false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get the actual LangGraph saver for use with CompiledStateGraph
   * TASK_2025_029: Multi-agent needs the actual BaseCheckpointSaver, not ICheckpointAdapter
   *
   * This method provides access to the underlying LangGraph checkpoint saver
   * (SqliteSaver, MemorySaver, etc.) that can be passed directly to
   * graph.compile({ checkpointer })
   *
   * @param saverName - Optional specific saver name, defaults to default saver
   * @returns ILangGraphCheckpointSaver | null - Properly typed LangGraph checkpoint saver
   */
  getLangGraphSaver(saverName?: string): ILangGraphCheckpointSaver | null {
    return this.checkpointManager.getLangGraphSaver(saverName);
  }

  /**
   * Convert base metadata to enhanced metadata
   */
  private toEnhancedMetadata(
    metadata: BaseCheckpointMetadata
  ): EnhancedCheckpointMetadata {
    return {
      ...metadata,
      parents: metadata.parents
        ? Object.fromEntries(
            Object.entries(metadata.parents).map(([k, v]) => [k, String(v)])
          )
        : {},
      // Add any additional fields that the enhanced version needs
    };
  }

  /**
   * Convert enhanced checkpoint to base checkpoint
   */
  private toBaseCheckpoint<T>(
    enhancedCheckpoint: EnhancedCheckpoint<T>
  ): BaseCheckpoint<T> {
    return {
      id: enhancedCheckpoint.id,
      channel_values: enhancedCheckpoint.channel_values,
    };
  }

  /**
   * Convert enhanced metadata to base metadata
   */
  private toBaseMetadata(
    enhancedMetadata: EnhancedCheckpointMetadata
  ): BaseCheckpointMetadata {
    return {
      timestamp: enhancedMetadata.timestamp || '',
      source: enhancedMetadata.source,
      step: enhancedMetadata.step,
      parents: enhancedMetadata.parents || {},
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
  private toEnhancedListOptions(
    options: CheckpointListOptions
  ): ListCheckpointsOptions {
    return {
      limit: options.limit,
      offset: options.offset,
      // Add any additional mapping needed
    };
  }

  /**
   * Convert base cleanup options to enhanced cleanup options
   */
  private toEnhancedCleanupOptions(
    options: CheckpointCleanupOptions
  ): EnhancedCheckpointCleanupOptions {
    return {
      maxAge: options.maxAge,
      // Add any additional mapping needed
    };
  }
}
