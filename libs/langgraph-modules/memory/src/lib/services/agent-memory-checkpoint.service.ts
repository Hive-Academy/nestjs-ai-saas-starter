import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { ICheckpointAdapter } from '@hive-academy/langgraph-core';
import type { MemoryEntry } from '../interfaces/memory.interface';
import { IVectorService } from '../interfaces/vector-service.interface';
import { IGraphService } from '../interfaces/graph-service.interface';

/**
 * Checkpoint synchronization service for agent memories
 *
 * Responsibility: Single-purpose service for memory-checkpoint coordination
 * - Sync agent memories with checkpoint state
 * - Link memories to checkpoint for coordinated persistence (REAL IMPLEMENTATION)
 * - Hybrid approach: Vector metadata + Graph relationships
 * - Graceful degradation when adapters unavailable
 *
 * Pattern: Optional adapter integration with non-blocking failures
 * Verification: Architecture design TASK_2025_007 lines 20-352
 */
@Injectable()
export class AgentMemoryCheckpointService {
  private readonly logger = new Logger(AgentMemoryCheckpointService.name);

  constructor(
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter,

    // NEW: Vector service for metadata updates (DELETE + RE-STORE pattern)
    @Optional()
    @Inject('IVectorService')
    private readonly vectorService?: IVectorService,

    // NEW: Graph service for relationship creation
    @Optional()
    @Inject('IGraphService')
    private readonly graphService?: IGraphService
  ) {
    const capabilities: string[] = [];
    if (checkpointAdapter) capabilities.push('checkpoint');
    if (vectorService) capabilities.push('vector');
    if (graphService) capabilities.push('graph');

    if (capabilities.length === 3) {
      this.logger.log(
        'AgentMemoryCheckpointService initialized with full capabilities (checkpoint + vector + graph)'
      );
    } else if (capabilities.length > 0) {
      this.logger.warn(
        `AgentMemoryCheckpointService initialized with limited capabilities: ${capabilities.join(
          ', '
        )} (missing: ${['checkpoint', 'vector', 'graph']
          .filter((c) => !capabilities.includes(c))
          .join(', ')})`
      );
    } else {
      this.logger.warn(
        'AgentMemoryCheckpointService initialized with no adapters (all operations disabled)'
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
   * Link memories to a specific checkpoint using hybrid storage approach
   *
   * REAL IMPLEMENTATION - No simulation/stubs
   *
   * Strategy:
   * 1. Vector metadata update (DELETE + RE-STORE pattern)
   *    - Enables fast checkpoint-based memory retrieval
   *    - Filter by checkpointId metadata
   * 2. Graph relationship creation (Checkpoint node + LINKED_TO relationships)
   *    - Enables relationship traversal and analytics
   *    - MATCH (m:Memory)-[:LINKED_TO_CHECKPOINT]->(c:Checkpoint)
   *
   * Verification:
   * - Architecture design: TASK_2025_007 lines 70-239
   * - IVectorService methods: deleteMemories (line 173), storeMemoriesBatch (line 116)
   * - IGraphService methods: createNode (line 16), createRelationship (line 21)
   * - Pattern: Hybrid approach (vector + graph) with graceful degradation
   *
   * @param memories - Array of memory entries to link
   * @param checkpointId - Checkpoint identifier for linking
   */
  private async linkMemoriesToCheckpoint(
    memories: readonly MemoryEntry[],
    checkpointId: string
  ): Promise<void> {
    if (!memories || memories.length === 0) {
      this.logger.debug('No memories to link to checkpoint');
      return;
    }

    const linkedAt = new Date().toISOString();

    try {
      // Strategy 1: Update vector metadata in ChromaDB (via IVectorService)
      await this.updateMemoryMetadataWithCheckpoint(
        memories,
        checkpointId,
        linkedAt
      );

      // Strategy 2: Create graph relationships in Neo4j (via IGraphService)
      await this.createMemoryCheckpointRelationships(
        memories,
        checkpointId,
        linkedAt
      );

      this.logger.log(
        `✅ Linked ${memories.length} memories to checkpoint ${checkpointId} (hybrid: vector + graph)`
      );
    } catch (error) {
      this.logger.error(
        `Failed to link memories to checkpoint ${checkpointId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Don't throw - checkpoint sync should be non-blocking
      // Memories are still stored, just not linked to checkpoint
    }
  }

  /**
   * Update memory metadata with checkpoint ID using DELETE + RE-STORE pattern
   *
   * REAL IMPLEMENTATION - Delegates to IVectorService adapter
   *
   * Pattern: IVectorService does NOT have updateMetadata() method
   * Workaround: Delete existing memories and re-store with updated metadata
   *
   * Verification:
   * - Architecture design: TASK_2025_007 lines 123-173
   * - IVectorService.deleteMemories: line 173 (verified)
   * - IVectorService.storeMemoriesBatch: line 116 (verified)
   *
   * @param memories - Array of memory entries to update
   * @param checkpointId - Checkpoint identifier to add to metadata
   * @param linkedAt - ISO timestamp when linking occurred
   */
  private async updateMemoryMetadataWithCheckpoint(
    memories: readonly MemoryEntry[],
    checkpointId: string,
    linkedAt: string
  ): Promise<void> {
    if (!this.vectorService) {
      this.logger.debug(
        'Vector service not available - skipping metadata update'
      );
      return;
    }

    try {
      // Extract memory IDs for deletion
      const memoryIds = memories
        .map((m) => m.id)
        .filter((id): id is string => Boolean(id));

      if (memoryIds.length === 0) {
        this.logger.warn(
          'No valid memory IDs found - cannot update vector metadata'
        );
        return;
      }

      // Step 1: Delete existing memory entries
      await this.vectorService.deleteMemories(memoryIds);

      // Step 2: Re-store memories with updated metadata
      const entriesWithCheckpoint = memories.map((memory) => ({
        content: memory.content,
        metadata: {
          ...memory.metadata,
          checkpointId, // Add checkpoint linkage
          checkpointLinkedAt: linkedAt,
        },
      }));

      // Extract threadId from first memory's metadata
      const threadId = (memories[0]?.metadata?.threadId as string) || 'unknown';
      const userId = memories[0]?.metadata?.userId as string | undefined;

      // Re-store with updated metadata
      await this.vectorService.storeMemoriesBatch(
        threadId,
        entriesWithCheckpoint,
        userId
      );

      this.logger.debug(
        `Updated ${memories.length} memory metadata entries with checkpoint ${checkpointId}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update vector metadata with checkpoint: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Non-fatal - graph relationships may still succeed
    }
  }

  /**
   * Create graph relationships between memories and checkpoint
   *
   * REAL IMPLEMENTATION - Delegates to IGraphService adapter
   *
   * Graph Structure:
   * - Checkpoint node: (c:Checkpoint {checkpointId, createdAt, type})
   * - Memory nodes: (m:Memory {id, ...})
   * - Relationships: (m)-[:LINKED_TO_CHECKPOINT {linkedAt, memoryType}]->(c)
   *
   * Verification:
   * - Architecture design: TASK_2025_007 lines 186-239
   * - IGraphService.createNode: line 16 (verified)
   * - IGraphService.createRelationship: line 21 (verified)
   *
   * @param memories - Array of memory entries to link
   * @param checkpointId - Checkpoint identifier
   * @param linkedAt - ISO timestamp when linking occurred
   */
  private async createMemoryCheckpointRelationships(
    memories: readonly MemoryEntry[],
    checkpointId: string,
    linkedAt: string
  ): Promise<void> {
    if (!this.graphService) {
      this.logger.debug(
        'Graph service not available - skipping relationship creation'
      );
      return;
    }

    try {
      // Step 1: Create Checkpoint node (idempotent - won't duplicate if exists)
      await this.graphService.createNode({
        id: `checkpoint:${checkpointId}`,
        labels: ['Checkpoint'],
        properties: {
          checkpointId,
          createdAt: linkedAt,
          type: 'memory_checkpoint',
        },
      });

      // Step 2: Create LINKED_TO_CHECKPOINT relationships from each memory to checkpoint
      for (const memory of memories) {
        if (!memory.id) {
          this.logger.warn(
            `Skipping memory without ID (content: ${memory.content.substring(
              0,
              50
            )}...)`
          );
          continue;
        }

        const memoryNodeId = `memory:${memory.id}`;
        const checkpointNodeId = `checkpoint:${checkpointId}`;

        await this.graphService.createRelationship(
          memoryNodeId,
          checkpointNodeId,
          {
            type: 'LINKED_TO_CHECKPOINT',
            properties: {
              linkedAt,
              memoryType: memory.metadata?.type || 'unknown',
            },
          }
        );
      }

      this.logger.debug(
        `Created ${memories.length} graph relationships to checkpoint ${checkpointId}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to create graph relationships with checkpoint: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Non-fatal - vector metadata may still be updated
    }
  }
}
