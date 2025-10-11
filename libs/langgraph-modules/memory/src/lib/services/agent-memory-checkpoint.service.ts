import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { ICheckpointAdapter } from '@hive-academy/langgraph-core';
import type { MemoryEntry } from '../interfaces/memory.interface';

/**
 * Checkpoint synchronization service for agent memories
 *
 * Responsibility: Single-purpose service for memory-checkpoint coordination
 * - Sync agent memories with checkpoint state
 * - Link memories to checkpoint for coordinated persistence
 * - Graceful degradation when checkpoint adapter unavailable
 *
 * Pattern: Optional ICheckpointAdapter integration with non-blocking failures
 * Verification: Extracted from AgentMemoryBridgeService lines 428-492, 920-929
 */
@Injectable()
export class AgentMemoryCheckpointService {
  private readonly logger = new Logger(AgentMemoryCheckpointService.name);

  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {
    if (checkpointAdapter) {
      this.logger.log(
        'AgentMemoryCheckpointService initialized with checkpoint adapter'
      );
    } else {
      this.logger.log(
        'AgentMemoryCheckpointService initialized without checkpoint adapter (sync disabled)'
      );
    }
  }

  /**
   * Sync agent memories with checkpoint for coordinated persistence
   *
   * Verification:
   * - Pattern source: AgentMemoryBridgeService lines 428-492
   * - Uses checkpointAdapter.loadCheckpoint() (ICheckpointAdapter interface)
   * - Uses checkpointAdapter.saveCheckpoint() (ICheckpointAdapter interface)
   * - Graceful degradation: No-op when checkpoint adapter unavailable
   * - Non-blocking: Failures logged but don't break agent execution
   *
   * @param threadId - Thread identifier for checkpoint lookup
   * @param checkpointId - Checkpoint identifier for sync
   * @param agentMemories - Optional agent memories to link to checkpoint
   */
  async syncWithCheckpoint(
    threadId: string,
    checkpointId: string,
    agentMemories?: readonly MemoryEntry[]
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      this.logger.debug(
        'No checkpoint adapter available - skipping memory sync'
      );
      return;
    }

    try {
      this.logger.debug(
        `Syncing memories with checkpoint ${checkpointId} for thread ${threadId}`
      );

      // Get checkpoint metadata
      const checkpoint = await this.checkpointAdapter.loadCheckpoint(
        threadId,
        checkpointId
      );

      if (!checkpoint) {
        this.logger.warn(
          `Checkpoint ${checkpointId} not found for thread ${threadId}`
        );
        return;
      }

      // Create memory-checkpoint link metadata
      const syncMetadata = {
        checkpointId,
        threadId,
        syncedAt: new Date().toISOString(),
        memoryCount: agentMemories?.length || 0,
      };

      // Store sync information in checkpoint metadata
      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        checkpoint.channel_values,
        {
          timestamp: new Date().toISOString(),
          source: 'update' as const,
          step: 0,
          parents: {},
          memorySync: syncMetadata,
        }
      );

      // If agent memories provided, ensure they're linked to this checkpoint
      if (agentMemories && agentMemories.length > 0) {
        await this.linkMemoriesToCheckpoint(agentMemories, checkpointId);
      }

      this.logger.debug(`✅ Memory-checkpoint sync completed for ${threadId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync memories with checkpoint: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Don't throw - sync failures shouldn't break agent execution
    }
  }

  /**
   * Link memories to a specific checkpoint
   *
   * Verification:
   * - Pattern source: AgentMemoryBridgeService lines 920-929
   * - Creates association between memories and checkpoint
   * - Implementation note: Currently logs association (placeholder for full implementation)
   *
   * @param memories - Array of memory entries to link
   * @param checkpointId - Checkpoint identifier for linking
   */
  private async linkMemoriesToCheckpoint(
    memories: readonly MemoryEntry[],
    checkpointId: string
  ): Promise<void> {
    // This could be implemented by updating memory metadata
    // or creating separate relationship tracking
    this.logger.debug(
      `Linking ${memories.length} memories to checkpoint ${checkpointId}`
    );

    // For now, we log the association
    // In a full implementation, this could update memory metadata
    // or create a separate relationship table/collection
  }
}
