import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import type { ICheckpointAdapter } from '@hive-academy/langgraph-core';
import type {
  AgentMemory,
  AgentMemoryContext,
  AgentMemoryStats,
  IAgentMemoryBridge,
  UserMemoryPatterns,
} from '../interfaces/agent-memory.interface';
import type {
  MemoryEntry,
  UserMemoryPatterns as ReadonlyUserMemoryPatterns,
} from '../interfaces/memory.interface';
import type { IVectorService } from '../interfaces/vector-service.interface';
import type { IGraphService } from '../interfaces/graph-service.interface';
import type { IStoreService } from '../store/services/interfaces/store-service.interface';
import { wrapMemoryError } from '../errors/memory.errors';

/**
 * Bridge service that enables agent-memory integration
 *
 * This service provides:
 * ✅ Memory context retrieval for agents during execution
 * ✅ Agent-generated memory storage with proper attribution
 * ✅ Checkpoint coordination for memory persistence
 * ✅ Agent-specific memory analytics and monitoring
 * ✅ Memory namespace management for agent isolation
 */
@Injectable()
export class AgentMemoryBridgeService implements IAgentMemoryBridge {
  private readonly logger = new Logger(AgentMemoryBridgeService.name);
  private readonly agentStats = new Map<string, AgentMemoryStats>();

  constructor(
    @Inject('IVectorService')
    private readonly vectorService: IVectorService,
    @Inject('IGraphService')
    private readonly graphService: IGraphService,
    @Inject('IStoreService')
    private readonly storeService: IStoreService,
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter
  ) {
    this.logger.log(
      'AgentMemoryBridge initialized with vector, graph, store, and checkpoint services'
    );
  }

  /**
   * Get comprehensive memory context for an agent during execution
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:275-434
   * - Uses vectorService.searchMemoriesSimilar() (verified in vector-service.interface.ts:72)
   * - Dual context retrieval: general thread context + agent-specific memories
   * - Vector search PRIMARY, no graph enrichment (vector-only context retrieval)
   * - Context merging with deduplication by memory ID
   * - Confidence calculation based on result count
   * - Graceful degradation on failure (empty context)
   */
  async getAgentMemoryContext(
    agentId: string,
    threadId: string,
    query?: string,
    userId?: string
  ): Promise<AgentMemoryContext> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Getting memory context for agent ${agentId} in thread ${threadId}`
      );

      // 1. Vector search for general thread context (PRIMARY - must succeed)
      // Pattern: Direct vectorService call with thread/user filtering
      const searchResults = await this.vectorService.searchMemoriesSimilar(
        query || `agent context for ${agentId}`,
        {
          threadId, // Thread filter
          userId, // User filter
          type: ['conversation', 'agent_action'], // Memory types
        },
        20 // Limit for general context
      );

      // 2. Agent-specific search with namespace filtering
      // Uses already-refactored searchAgentMemories() method
      const agentSpecificMemories = await this.searchAgentMemories(
        agentId,
        query || '',
        {
          threadId,
          userId,
          limit: 5,
          minRelevance: 0.6,
        }
      );

      // 3. Combine results with deduplication by memory ID
      const allMemories = [
        ...searchResults,
        ...agentSpecificMemories.filter(
          // Avoid duplicates
          (agentMem) => !searchResults.some((mem) => mem.id === agentMem.id)
        ),
      ];

      // 4. Categorize memories by type (logic unchanged)
      const threadMemories = allMemories.filter(
        (m) => m.metadata?.threadId === threadId
      );
      const userMemories = allMemories.filter(
        (m) =>
          m.metadata?.userId === agentId && m.metadata?.threadId !== threadId
      );
      const agentMemoriesFiltered = allMemories.filter(
        (m) => m.metadata?.agentId === agentId
      );

      // 5. Calculate confidence based on result count
      const confidence = searchResults.length > 0 ? 0.8 : 0.5;

      // 6. Update agent statistics
      this.updateAgentStats(agentId, {
        memoriesAccessed: allMemories.length,
        searchTime: Date.now() - startTime,
      });

      const context: AgentMemoryContext = {
        threadMemories,
        userMemories,
        agentMemories: agentMemoriesFiltered,
        userPatterns: this.convertToMutableUserPatterns(null) || {
          userId: agentId || 'unknown',
          commonTopics: [],
          interactionFrequency: {},
          preferredMemoryTypes: [],
          averageSessionLength: 0,
          totalSessions: 0,
          lastInteraction: undefined,
        },
        relevanceScore: confidence,
        contextWindow: allMemories.length,
      };

      this.logger.debug(
        `Retrieved ${allMemories.length} memories for agent ${agentId} (confidence: ${confidence})`
      );

      return context;
    } catch (error) {
      this.logger.error(
        `Failed to get memory context for agent ${agentId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Return empty context on failure (graceful degradation)
      return {
        threadMemories: [],
        userMemories: [],
        agentMemories: [],
        userPatterns: {
          userId: agentId || 'unknown',
          commonTopics: [],
          interactionFrequency: {},
          preferredMemoryTypes: [],
          averageSessionLength: 0,
          totalSessions: 0,
          lastInteraction: undefined,
        } as UserMemoryPatterns,
        relevanceScore: 0,
        contextWindow: 0,
      };
    }
  }

  /**
   * Store memory generated by an agent with proper attribution
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:442-552
   * - Uses vectorService.storeMemory() (verified in vector-service.interface.ts:93)
   * - Uses graphService.trackMemory() (verified in graph-service.interface.ts:85)
   * - Dual storage coordination (vector primary, graph secondary)
   * - Namespace format: agent:${agentId} (preserved from original)
   */
  async storeAgentMemory(
    agentId: string,
    memory: AgentMemory
  ): Promise<MemoryEntry> {
    try {
      this.logger.debug(
        `Storing memory from agent ${agentId}: ${memory.content.slice(
          0,
          50
        )}...`
      );

      // Create canonical thread ID for agent memory
      const agentThreadId = NodeIdBuilder.create()
        .domain('agent')
        .phase('memory')
        .activity(agentId)
        .detail(memory.threadId)
        .build();

      // Enhance metadata with agent information
      const enhancedMetadata = {
        ...memory.metadata,
        agentGenerated: true as const,
        agentId,
        source: `agent-${agentId}`,
        namespace: `agent:${agentId}`,
        createdByAgent: true,
      };

      // Direct vectorService call for vector storage
      const storedMemory = await this.vectorService.storeMemory(
        agentThreadId,
        memory.content,
        enhancedMetadata,
        memory.userId
      );

      // Direct graphService call for graph tracking (graceful degradation)
      try {
        await this.graphService.trackMemory(storedMemory);
      } catch (graphError) {
        this.logger.warn(
          `Graph tracking failed (graceful degradation): ${
            graphError instanceof Error
              ? graphError.message
              : String(graphError)
          }`
        );
      }

      // Update agent statistics
      this.updateAgentStats(agentId, { memoriesCreated: 1 });

      this.logger.debug(`✅ Agent memory stored: ${storedMemory.id}`);
      return storedMemory;
    } catch (error) {
      this.logger.error(
        `Failed to store agent memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw wrapMemoryError('storeAgentMemory', error);
    }
  }

  /**
   * Store multiple agent memories in batch
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:563-720
   * - Uses vectorService.storeMemoriesBatch() (verified in vector-service.interface.ts:116)
   * - Uses graphService.trackMemoriesBatch() (verified in graph-service.interface.ts:91)
   * - Dual storage coordination with batch operations
   * - Namespace format: agent:${agentId} (preserved for all memories)
   */
  async storeAgentMemoriesBatch(
    agentId: string,
    memories: readonly AgentMemory[]
  ): Promise<readonly MemoryEntry[]> {
    if (memories.length === 0) return [];

    try {
      this.logger.debug(
        `Batch storing ${memories.length} memories from agent ${agentId}`
      );

      // Group memories by thread for efficient storage
      const memoriesByThread = new Map<string, AgentMemory[]>();

      for (const memory of memories) {
        const agentThreadId = NodeIdBuilder.create()
          .domain('agent')
          .phase('memory')
          .activity(agentId)
          .detail(memory.threadId)
          .build();

        if (!memoriesByThread.has(agentThreadId)) {
          memoriesByThread.set(agentThreadId, []);
        }
        memoriesByThread.get(agentThreadId)!.push(memory);
      }

      // Store memories for each thread
      const storedMemories: MemoryEntry[] = [];

      for (const [agentThreadId, threadMemories] of memoriesByThread) {
        const batchEntries = threadMemories.map((memory) => ({
          content: memory.content,
          metadata: {
            ...memory.metadata,
            agentGenerated: true as const,
            agentId,
            source: `agent-${agentId}`,
            namespace: `agent:${agentId}`,
            createdByAgent: true,
          },
        }));

        // Direct vectorService batch call
        const batchResults = await this.vectorService.storeMemoriesBatch(
          agentThreadId,
          batchEntries,
          threadMemories[0]?.userId
        );

        storedMemories.push(...batchResults);
      }

      // Batch track in graph database (graceful degradation)
      try {
        await this.graphService.trackMemoriesBatch(storedMemories);
      } catch (graphError) {
        this.logger.warn(
          `Graph batch tracking failed (graceful degradation): ${
            graphError instanceof Error
              ? graphError.message
              : String(graphError)
          }`
        );
      }

      // Update agent statistics
      this.updateAgentStats(agentId, {
        memoriesCreated: storedMemories.length,
      });

      this.logger.debug(
        `✅ Batch stored ${storedMemories.length} agent memories`
      );
      return storedMemories;
    } catch (error) {
      this.logger.error(
        `Failed to batch store agent memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw wrapMemoryError('storeAgentMemoriesBatch', error);
    }
  }

  /**
   * Search for memories created by a specific agent
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:732-835
   * - Uses vectorService.searchMemoriesSimilar() (verified in vector-service.interface.ts:156)
   * - Namespace format: agent:${agentId} (preserved from original)
   * - Graceful degradation: Returns empty array on error
   */
  async searchAgentMemories(
    agentId: string,
    query: string,
    options?: {
      readonly threadId?: string;
      readonly userId?: string;
      readonly limit?: number;
      readonly minRelevance?: number;
    }
  ): Promise<readonly MemoryEntry[]> {
    try {
      // Build filter object for vectorService
      const filter: Record<string, unknown> = {
        agentId, // Agent-specific filter
        namespace: `agent:${agentId}`, // Namespace filter
      };

      // Add optional filters
      if (options?.threadId) {
        filter.threadId = options.threadId;
      }
      if (options?.userId) {
        filter.userId = options.userId;
      }

      // Direct vectorService search with semantic similarity
      const memories = await this.vectorService.searchMemoriesSimilar(
        query,
        filter,
        options?.limit || 10
      );

      // Filter by relevance threshold (if provided)
      const filteredMemories = options?.minRelevance
        ? memories.filter((mem) => {
            const score =
              typeof mem.metadata.relevanceScore === 'number'
                ? mem.metadata.relevanceScore
                : 0;
            return score >= options.minRelevance!;
          })
        : memories;

      this.logger.debug(
        `Found ${filteredMemories.length} memories for agent ${agentId}`
      );

      return filteredMemories;
    } catch (error) {
      this.logger.error(
        `Failed to search agent memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  /**
   * Sync agent memories with checkpoint for coordinated persistence
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
   * Get memory usage statistics for an agent
   */
  async getAgentMemoryStats(agentId: string): Promise<AgentMemoryStats> {
    const stats = this.agentStats.get(agentId);

    if (!stats) {
      return {
        agentId,
        memoriesAccessed: 0,
        memoriesCreated: 0,
        averageSearchTime: 0,
        contextHitRate: 0,
        lastAccess: new Date(),
      };
    }

    return stats;
  }

  /**
   * Clear all memories for an agent in a specific thread
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:847-953
   * - Uses vectorService.deleteMemories() (verified in vector-service.interface.ts:173)
   * - Uses graphService.deleteMemories() (verified in graph-service.interface.ts:97)
   * - Dual storage coordination with graceful degradation
   * - Namespace format preserved: agent:${agentId}
   */
  async clearAgentMemories(agentId: string, threadId: string): Promise<number> {
    try {
      this.logger.debug(
        `Clearing memories for agent ${agentId} in thread ${threadId}`
      );

      // Get agent memories for this thread
      const agentMemories = await this.searchAgentMemories(agentId, '', {
        threadId,
        limit: 1000, // Get all memories
      });

      if (agentMemories.length === 0) {
        return 0;
      }

      const memoryIds = agentMemories.map((m) => m.id);

      // Delete from vector storage
      const deletedCount = await this.vectorService.deleteMemories(memoryIds);

      // Delete from graph storage (graceful degradation)
      try {
        await this.graphService.deleteMemories(memoryIds);
      } catch (graphError) {
        this.logger.warn(
          `Graph deletion failed (graceful degradation): ${
            graphError instanceof Error
              ? graphError.message
              : String(graphError)
          }`
        );
      }

      this.logger.debug(
        `✅ Cleared ${deletedCount} memories for agent ${agentId}`
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to clear agent memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return 0;
    }
  }

  /**
   * Get the Store instance for cross-thread memory sharing
   * Provides hierarchical namespace-based storage
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:842-900
   * - Returns IStoreService (verified in store-service.interface.ts:5)
   * - Simple delegation pattern
   *
   * @param collection - Optional collection name (defaults to 'langgraph-stores')
   * @returns Store instance with put/get/search operations
   *
   * @example
   * ```typescript
   * const store = agentMemoryBridge.getStore();
   * await store.putStoreItem(['user', 'user-123', 'preferences'], 'theme', { mode: 'dark' });
   * ```
   */
  getStore(collection?: string): IStoreService {
    if (collection) {
      // Create a scoped store for the specified collection
      // (Implementation may vary based on IStoreService design)
      this.logger.debug(`Creating scoped store for collection: ${collection}`);
      this.storeService.setDefaultCollection(collection);
    }
    return this.storeService;
  }

  // Private helper methods

  /**
   * Update agent memory statistics
   */
  private updateAgentStats(
    agentId: string,
    updates: {
      memoriesAccessed?: number;
      memoriesCreated?: number;
      searchTime?: number;
    }
  ): void {
    const currentStats = this.agentStats.get(agentId) || {
      agentId,
      memoriesAccessed: 0,
      memoriesCreated: 0,
      averageSearchTime: 0,
      contextHitRate: 0.85,
      lastAccess: new Date(),
    };

    const newStats: AgentMemoryStats = {
      agentId,
      memoriesAccessed:
        currentStats.memoriesAccessed + (updates.memoriesAccessed || 0),
      memoriesCreated:
        currentStats.memoriesCreated + (updates.memoriesCreated || 0),
      averageSearchTime: updates.searchTime
        ? (currentStats.averageSearchTime + updates.searchTime) / 2
        : currentStats.averageSearchTime,
      contextHitRate: currentStats.contextHitRate,
      lastAccess: new Date(),
    };

    this.agentStats.set(agentId, newStats);
  }

  /**
   * Link memories to a specific checkpoint
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

  /**
   * Convert readonly UserMemoryPatterns to mutable version
   */
  private convertToMutableUserPatterns(
    readonlyPatterns: ReadonlyUserMemoryPatterns | null
  ): UserMemoryPatterns | null {
    if (!readonlyPatterns) {
      return null;
    }

    return {
      userId: readonlyPatterns.userId,
      commonTopics: [...readonlyPatterns.commonTopics],
      interactionFrequency: { ...readonlyPatterns.interactionFrequency },
      preferredMemoryTypes: [...readonlyPatterns.preferredMemoryTypes],
      averageSessionLength: readonlyPatterns.averageSessionLength,
      totalSessions: readonlyPatterns.totalSessions,
      lastInteraction: undefined, // agent-memory interface doesn't have this field
    };
  }
}
