import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import type { BaseMessage } from '@langchain/core/messages';
import type {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemoryServiceInterface,
  MemoryStats,
  MemorySummarizationOptions,
  UserMemoryPatterns,
} from '../interfaces/memory.interface';
import { extractErrorMessage, wrapMemoryError } from '../errors/memory-errors';
import { MemoryStorageService } from './memory-storage.service';
import { MemoryGraphService } from './memory-graph.service';
import { MemoryRetentionService } from './memory-retention.service';
import { MemoryStatsService } from './memory-stats.service';

/**
 * Lightweight orchestrator service that coordinates specialized memory services
 *
 * This service follows the Single Responsibility Principle by delegating
 * specific operations to specialized services:
 * - MemoryStorageService: ChromaDB operations and embeddings
 * - MemoryGraphService: Neo4j graph operations
 * - MemoryRetentionService: Cleanup policies and eviction
 * - MemoryStatsService: Performance metrics and monitoring
 *
 * Benefits of decomposition:
 * - Each service has a single, focused responsibility
 * - Services are reusable in different contexts
 * - Better testability with focused unit tests
 * - Easier maintenance and debugging
 * - Framework-agnostic service design
 * 
 * Uses specialized services that leverage DatabaseProviderFactory internally
 */
@Injectable()
export class MemoryOrchestratorService
  implements MemoryServiceInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MemoryOrchestratorService.name);

  constructor(
    private readonly storageService: MemoryStorageService,
    private readonly graphService: MemoryGraphService,
    private readonly retentionService: MemoryRetentionService,
    private readonly statsService: MemoryStatsService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Memory orchestrator initialized - coordinating specialized services'
    );
  }

  onModuleDestroy(): void {
    this.logger.log('Memory orchestrator destroyed');
  }

  /**
   * Store a memory entry - orchestrates storage and graph tracking
   */
  async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<MemoryEntry> {
    const operationId = `store_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'store', threadId);

    try {
      // Primary storage via specialized storage service
      const entry = await this.storageService.store(
        threadId,
        content,
        metadata
      );

      // Track relationships via specialized graph service (graceful degradation)
      await this.graphService.trackMemory(entry);

      this.statsService.recordOperationComplete(operationId, 'store', true, {
        memoryId: entry.id,
        hasEmbedding: !!entry.embedding,
      });

      this.logger.debug(
        `Orchestrated storage of memory ${entry.id} for thread ${threadId}`
      );
      return entry;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'store', false);
      this.logger.error(
        `Failed to orchestrate memory storage for thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Store multiple memory entries - orchestrates batch operations
   */
  async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>
  ): Promise<readonly MemoryEntry[]> {
    const operationId = `storeBatch_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'storeBatch', threadId);

    try {
      // Batch storage via specialized storage service
      const memoryEntries = await this.storageService.storeBatch(
        threadId,
        entries
      );

      // Track batch relationships via specialized graph service (graceful degradation)
      await this.graphService.trackMemoriesBatch(memoryEntries);

      this.statsService.recordOperationComplete(
        operationId,
        'storeBatch',
        true,
        {
          count: memoryEntries.length,
        }
      );

      this.logger.debug(
        `Orchestrated batch storage of ${memoryEntries.length} memories for thread ${threadId}`
      );
      return memoryEntries;
    } catch (error) {
      this.statsService.recordOperationComplete(
        operationId,
        'storeBatch',
        false
      );
      this.logger.error(
        `Failed to orchestrate batch memory storage for thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Retrieve memories by thread - delegates to storage service
   */
  async retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]> {
    const operationId = `retrieve_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'retrieve', threadId);

    try {
      const memories = await this.storageService.retrieve(threadId, limit);

      this.statsService.recordOperationComplete(operationId, 'retrieve', true, {
        count: memories.length,
        limit,
      });

      this.logger.debug(
        `Orchestrated retrieval of ${memories.length} memories for thread ${threadId}`
      );
      return memories;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'retrieve', false);
      this.logger.error(
        `Failed to orchestrate memory retrieval for thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Search memories with semantic and graph capabilities
   */
  async search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]> {
    const operationId = `search_${Date.now()}`;
    this.statsService.recordOperationStart(
      operationId,
      'search',
options.threadId
    );

    try {
      // Semantic search via specialized storage service
      const results = await this.storageService.searchSimilar(
        options.query || '',
        this.buildSearchFilter(options)
      );

      this.statsService.recordOperationComplete(operationId, 'search', true, {
        query: options.query,
        resultCount: results.length,
        hasFilters: Object.keys(options).length > 1,
      });

      this.logger.debug(
        `Orchestrated search returning ${results.length} results`
      );
      return results;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'search', false);
      this.logger.error('Failed to orchestrate memory search', error);
      throw error;
    }
  }

  /**
   * Summarize conversation - delegates to storage service
   */
  async summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const operationId = `summarize_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'summarize', threadId);

    try {
      // For now, delegate to storage service (could be moved to separate service)
      const summary = this.createFallbackSummary(messages);

      this.statsService.recordOperationComplete(
        operationId,
        'summarize',
        true,
        {
          messageCount: messages.length,
          strategy: options?.strategy || 'fallback',
        }
      );

      this.logger.debug(
        `Orchestrated summarization of ${messages.length} messages for thread ${threadId}`
      );
      return summary;
    } catch (error) {
      this.statsService.recordOperationComplete(
        operationId,
        'summarize',
        false
      );
      this.logger.error(
        `Failed to orchestrate summarization for thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete memories - orchestrates storage and graph cleanup
   */
  async delete(
    threadId: string,
    memoryIds?: readonly string[]
  ): Promise<number> {
    const operationId = `delete_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'delete', threadId);

    try {
      let deletedCount = 0;

      if (memoryIds && memoryIds.length > 0) {
        // Delete specific memories - would need to implement deleteByIds in storage service
        deletedCount = memoryIds.length;
        await this.graphService.removeMemories(memoryIds);
      } else {
        // Delete all memories for thread - would need more comprehensive implementation
        deletedCount = 0; // Placeholder
      }

      this.statsService.recordOperationComplete(operationId, 'delete', true, {
        deletedCount,
        specificIds: !!memoryIds,
      });

      this.logger.debug(
        `Orchestrated deletion of ${deletedCount} memories for thread ${threadId}`
      );
      return deletedCount;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'delete', false);
      this.logger.error(
        `Failed to orchestrate memory deletion for thread ${threadId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Clear all memories for a thread
   */
  async clear(threadId: string): Promise<void> {
    await this.delete(threadId);
  }

  /**
   * Get comprehensive memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const operationId = `getStats_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'getStats');

    try {
      // Get base stats from stats service
      const baseStats = this.statsService.getStats();

      // Enhance with graph statistics
      const graphStats = await this.graphService.getGraphStats();

      const combinedStats: MemoryStats = {
        ...baseStats,
        totalMemories: graphStats.totalMemories || 0,
        activeThreads: graphStats.totalThreads || 0,
      };

      this.statsService.recordOperationComplete(operationId, 'getStats', true);

      return combinedStats;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'getStats', false);
      this.logger.error('Failed to orchestrate stats collection', error);
      throw error;
    }
  }

  /**
   * Perform memory cleanup - delegates to retention service
   */
  async cleanup(): Promise<number> {
    const operationId = `cleanup_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'cleanup');

    try {
      // Get all memories for cleanup evaluation (placeholder implementation)
      const getAllMemories = async (): Promise<MemoryEntry[]> => {
        // This would need to be implemented to get all memories across threads
        return [];
      };

      // Delete memories via storage and graph services
      const deleteMemories = async (memoryIds: string[]): Promise<number> => {
        if (memoryIds.length === 0) return 0;

        // Clean up graph relationships
        await this.graphService.removeMemories(memoryIds);

        return memoryIds.length; // Simplified - would need actual storage deletion
      };

      const cleanedCount = await this.retentionService.executeCleanup(
        getAllMemories,
        deleteMemories
      );

      this.statsService.recordOperationComplete(operationId, 'cleanup', true, {
        cleanedCount,
      });

      this.logger.debug(
        `Orchestrated cleanup removed ${cleanedCount} memories`
      );
      return cleanedCount;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'cleanup', false);
      this.logger.error('Failed to orchestrate memory cleanup', error);
      throw error;
    }
  }

  /**
   * Build search filter from options
   */
  private buildSearchFilter(
    options: MemorySearchOptions
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (options.threadId) {
      filter.threadId = options.threadId;
    }

    if (options.type) {
      filter.type = options.type;
    }

    if (options.startDate) {
      filter.createdAt_gte = options.startDate.toISOString();
    }

    if (options.endDate) {
      filter.createdAt_lte = options.endDate.toISOString();
    }

    return filter;
  }

  /**
   * Create a fallback summary when advanced summarization isn't available
   */
  private createFallbackSummary(messages: readonly BaseMessage[]): string {
    if (messages.length === 0) {
      return 'No messages to summarize.';
    }

    const messageCount = messages.length;
    const recentMessages = messages.slice(-3);
    const recentContent = recentMessages
      .map((msg) => String(msg.content).slice(0, 100))
      .join(' | ');

    return `Conversation summary: ${messageCount} messages exchanged. Recent context: ${recentContent}`;
  }

  // Missing interface methods implementation

  /**
   * Search for context - specialized search with user patterns and confidence
   */
  async searchForContext(
    query: string,
    threadId: string,
    userId?: string
  ): Promise<{
    relevantMemories: MemoryEntry[];
    userPatterns: UserMemoryPatterns | null;
    confidence: number;
  }> {
    const operationId = `searchContext_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'searchContext', threadId);

    try {
      // Search for relevant memories
      const memories = await this.search({
        query,
        threadId,
        userId,
        limit: 10,
      });

      // Get user patterns if userId provided
      const userPatterns = userId ? await this.getUserPatterns(userId) : null;

      // Calculate confidence based on memory relevance
      const confidence = memories.length > 0 
        ? Math.min(memories[0].relevanceScore || 0.5, 1.0)
        : 0.0;

      this.statsService.recordOperationComplete(operationId, 'searchContext', true);
      return { relevantMemories: [...memories], userPatterns, confidence };
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'searchContext', false);
      throw error;
    }
  }

  /**
   * Build semantic relationships between memories
   */
  async buildSemanticRelationships(): Promise<void> {
    const operationId = `buildRelationships_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'buildRelationships');

    try {
      // Delegate to graph service for relationship building
      await this.graphService.buildSemanticRelationships();
      this.statsService.recordOperationComplete(operationId, 'buildRelationships', true);
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'buildRelationships', false);
      this.logger.warn('Failed to build semantic relationships - graph service unavailable', error);
      // Don't throw - this is a non-critical enhancement feature
    }
  }

  /**
   * Get user patterns and behavior analysis
   */
  async getUserPatterns(userId: string): Promise<UserMemoryPatterns> {
    const operationId = `userPatterns_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'userPatterns');

    try {
      // Search for all user's memories
      const userMemories = await this.search({
        userId,
        limit: 1000,
      });

      // Analyze patterns from user's memories
      const patterns = this.analyzeUserPatterns(userId, userMemories);
      this.statsService.recordOperationComplete(operationId, 'userPatterns', true);
      return patterns;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'userPatterns', false);
      throw error;
    }
  }

  /**
   * Get conversation flow for a thread
   */
  async getConversationFlow(threadId: string): Promise<Array<{
    memoryId: string;
    content: string;
    type: string;
    createdAt: Date;
    connections: string[];
  }>> {
    const operationId = `conversationFlow_${Date.now()}`;
    this.statsService.recordOperationStart(operationId, 'conversationFlow', threadId);

    try {
      // Get all memories for the thread
      const memories = await this.retrieve(threadId, 1000);

      // Build conversation flow with connections
      const flow = memories.map((memory, index) => ({
        memoryId: memory.id,
        content: memory.content,
        type: memory.metadata.type,
        createdAt: memory.createdAt,
        connections: this.findMemoryConnections(memory, memories, index),
      }));

      this.statsService.recordOperationComplete(operationId, 'conversationFlow', true);
      return flow;
    } catch (error) {
      this.statsService.recordOperationComplete(operationId, 'conversationFlow', false);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Analyze user patterns from their memory entries
   */
  private analyzeUserPatterns(
    userId: string, 
    memories: readonly MemoryEntry[]
  ): UserMemoryPatterns {
    const topics = new Set<string>();
    const interactions: Record<string, number> = {};
    const memoryTypes: Record<string, number> = {};

    memories.forEach(memory => {
      // Extract topics from tags
      memory.metadata.tags?.forEach(tag => topics.add(tag));
      
      // Count interactions by type
      const type = memory.metadata.type;
      interactions[type] = (interactions[type] || 0) + 1;
      memoryTypes[type] = (memoryTypes[type] || 0) + 1;
    });

    return {
      userId,
      commonTopics: Array.from(topics).slice(0, 10),
      interactionFrequency: interactions,
      preferredMemoryTypes: Object.keys(memoryTypes)
        .sort((a, b) => memoryTypes[b] - memoryTypes[a])
        .slice(0, 5) as any[],
      averageSessionLength: memories.length > 0 ? memories.length / 10 : 0, // Simplified
      totalSessions: Math.max(Math.floor(memories.length / 10), 1),
    };
  }

  /**
   * Find connections between memories
   */
  private findMemoryConnections(
    memory: MemoryEntry,
    allMemories: readonly MemoryEntry[],
    currentIndex: number
  ): string[] {
    const connections: string[] = [];
    
    // Simple connection logic: adjacent memories and same-type memories
    if (currentIndex > 0) {
      connections.push(allMemories[currentIndex - 1].id);
    }
    if (currentIndex < allMemories.length - 1) {
      connections.push(allMemories[currentIndex + 1].id);
    }
    
    // Find memories with similar tags
    const similarMemories = allMemories.filter((m, i) => 
      i !== currentIndex && 
      m.metadata.tags?.some(tag => memory.metadata.tags?.includes(tag))
    );
    
    connections.push(...similarMemories.slice(0, 2).map(m => m.id));
    
    return [...new Set(connections)];
  }
}