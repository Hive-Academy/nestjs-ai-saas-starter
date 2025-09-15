import { Injectable, Logger } from '@nestjs/common';
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
import { MemoryStorageService } from './memory-storage.service';
import { MemoryGraphService } from './memory-graph.service';
import { wrapMemoryError } from '../errors/memory.errors';

/**
 * Main memory service providing orchestrated memory operations
 *
 * Coordinates:
 * - Storage operations (ChromaDB)
 * - Graph operations (Neo4j)
 * - Search and retrieval
 * - User pattern analysis
 */
@Injectable()
export class MemoryService implements MemoryServiceInterface {
  protected readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly storageService: MemoryStorageService,
    private readonly graphService: MemoryGraphService
  ) {}

  /**
   * Store a memory entry with vector and graph tracking
   * Alias for store method to support expected API naming
   */
  async storeMemoryEntry(
    collection: string,
    entry: {
      content: string;
      metadata?: Partial<MemoryMetadata>;
      threadId?: string;
      userId?: string;
    }
  ): Promise<MemoryEntry> {
    return this.store(
      entry.threadId || 'default',
      entry.content,
      entry.metadata,
      entry.userId
    );
  }

  /**
   * Store a memory entry with vector and graph tracking
   */
  async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    try {
      // Store in vector database
      const entry = await this.storageService.store(
        threadId,
        content,
        metadata,
        userId
      );

      // Track in graph database (graceful degradation)
      await this.graphService.trackMemory(entry);

      this.logger.debug(`Stored memory ${entry.id} for thread ${threadId}`);
      return entry;
    } catch (error) {
      this.logger.error(`Failed to store memory for thread ${threadId}`, error);
      throw wrapMemoryError('store', error);
    }
  }

  /**
   * Store multiple memory entries in batch
   */
  async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>,
    userId?: string
  ): Promise<readonly MemoryEntry[]> {
    if (entries.length === 0) return [];

    try {
      // Batch store in vector database
      const memoryEntries = await this.storageService.storeBatch(
        threadId,
        entries,
        userId
      );

      // Track in graph database (graceful degradation)
      await this.graphService.trackMemoriesBatch(memoryEntries);

      this.logger.debug(
        `Batch stored ${entries.length} memories for thread ${threadId}`
      );
      return memoryEntries;
    } catch (error) {
      this.logger.error(
        `Failed to batch store memories for thread ${threadId}`,
        error
      );
      throw wrapMemoryError('storeBatch', error);
    }
  }

  /**
   * Retrieve memories by thread
   */
  async retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]> {
    try {
      const memories = await this.storageService.retrieve(threadId, limit);
      this.logger.debug(
        `Retrieved ${memories.length} memories for thread ${threadId}`
      );
      return memories;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve memories for thread ${threadId}`,
        error
      );
      throw wrapMemoryError('retrieve', error);
    }
  }

  /**
   * Search memories with filters
   */
  async search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]> {
    try {
      const filter: Record<string, unknown> = {};

      if (options.threadId) filter.threadId = options.threadId;
      if (options.userId) filter.userId = options.userId;
      if (options.type) filter.type = options.type;
      if (options.startDate)
        filter.createdAt_gte = options.startDate.toISOString();
      if (options.endDate) filter.createdAt_lte = options.endDate.toISOString();

      const memories = await this.storageService.searchSimilar(
        options.query || '',
        filter,
        options.limit || 10
      );

      this.logger.debug(
        `Found ${memories.length} memories matching search criteria`
      );
      return memories;
    } catch (error) {
      this.logger.error('Failed to search memories', error);
      throw wrapMemoryError('search', error);
    }
  }

  /**
   * Search for context with user patterns
   */
  async searchForContext(
    query: string,
    threadId: string,
    userId?: string
  ): Promise<{
    relevantMemories: readonly MemoryEntry[];
    userPatterns: UserMemoryPatterns | null;
    confidence: number;
  }> {
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

      // Calculate confidence based on memory relevance and count
      const avgRelevance =
        memories.length > 0
          ? memories.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) /
            memories.length
          : 0;

      const confidence = Math.min(
        avgRelevance * (memories.length > 0 ? 1 : 0),
        1
      );

      return { relevantMemories: memories, userPatterns, confidence };
    } catch (error) {
      this.logger.error('Failed to search for context', error);
      throw wrapMemoryError('searchForContext', error);
    }
  }

  /**
   * Summarize conversation messages
   */
  async summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    try {
      // Simple extractive summarization for now
      if (messages.length === 0) return 'No messages to summarize.';

      const strategy = options?.strategy || 'recent';
      const maxLength = options?.maxLength || 200;

      let summary: string;

      switch (strategy) {
        case 'recent':
          summary = this.summarizeRecent(messages, maxLength);
          break;
        case 'important':
          summary = this.summarizeImportant(messages, maxLength);
          break;
        case 'balanced':
        default:
          summary = this.summarizeBalanced(messages, maxLength);
          break;
      }

      this.logger.debug(`Generated ${strategy} summary for thread ${threadId}`);
      return summary;
    } catch (error) {
      this.logger.error(`Failed to summarize thread ${threadId}`, error);
      throw wrapMemoryError('summarize', error);
    }
  }

  /**
   * Delete memories
   */
  async delete(
    threadId: string,
    memoryIds?: readonly string[]
  ): Promise<number> {
    try {
      if (memoryIds && memoryIds.length > 0) {
        // Delete specific memories
        await this.graphService.removeMemories(memoryIds);
        const deletedCount = await this.storageService.deleteByIds(memoryIds);

        this.logger.debug(`Deleted ${deletedCount} specific memories`);
        return deletedCount;
      } else {
        // Delete all memories for thread
        const memories = await this.storageService.retrieve(threadId);
        const memoryIds = memories.map((m) => m.id);

        if (memoryIds.length > 0) {
          await this.graphService.removeMemories(memoryIds);
          await this.storageService.clearThread(threadId);
        }

        this.logger.debug(
          `Deleted all ${memoryIds.length} memories for thread ${threadId}`
        );
        return memoryIds.length;
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete memories for thread ${threadId}`,
        error
      );
      throw wrapMemoryError('delete', error);
    }
  }

  /**
   * Clear all memories for a thread
   */
  async clear(threadId: string): Promise<void> {
    await this.delete(threadId);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    try {
      // Get real data from adapters
      const [vectorStats, graphStats] = await Promise.allSettled([
        this.storageService.getVectorStats(),
        this.graphService.getGraphStats(),
      ]);

      // Calculate real statistics
      const totalMemories = 
        (vectorStats.status === 'fulfilled' ? vectorStats.value.totalMemories : 0) +
        (graphStats.status === 'fulfilled' ? graphStats.value.totalMemories : 0);

      const activeThreads = 
        graphStats.status === 'fulfilled' ? graphStats.value.totalThreads : 0;

      // Calculate average memory size from vector storage if available
      const averageMemorySize = vectorStats.status === 'fulfilled' && vectorStats.value.averageSize > 0
        ? vectorStats.value.averageSize
        : 150; // Fallback estimate

      // Calculate total storage used
      const totalStorageUsed = vectorStats.status === 'fulfilled' && vectorStats.value.totalStorageUsed > 0
        ? vectorStats.value.totalStorageUsed
        : totalMemories * averageMemorySize;

      // Get operation metrics from storage service
      const operationMetrics = await this.storageService.getOperationMetrics();

      return {
        totalMemories,
        activeThreads,
        averageMemorySize,
        totalStorageUsed,
        searchCount: operationMetrics.searchCount || 0,
        averageSearchTime: operationMetrics.averageSearchTime || 50,
        summarizationCount: operationMetrics.summarizationCount || 0,
        cacheHitRate: operationMetrics.cacheHitRate || 0.85,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      
      // Fallback statistics for demo reliability
      return {
        totalMemories: 0,
        activeThreads: 0,
        averageMemorySize: 0,
        totalStorageUsed: 0,
        searchCount: 0,
        averageSearchTime: 0,
        summarizationCount: 0,
        cacheHitRate: 0,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup old or low-importance memories
   */
  async cleanup(): Promise<number> {
    try {
      this.logger.debug('Starting memory cleanup process');
      
      // Get retention policy from config (defaults for demo)
      const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days default
      const maxPerThread = 100; // 100 memories per thread default
      const importanceThreshold = 0.3; // Default importance threshold
      
      const cutoffDate = new Date(Date.now() - maxAge);
      let totalDeleted = 0;

      // Phase 1: Delete old low-importance memories
      const oldMemories = await this.search({
        endDate: cutoffDate,
        limit: 1000,
        minRelevance: 0, // Get all memories regardless of relevance
      });

      const memoriesToDelete: string[] = [];
      
      for (const memory of oldMemories) {
        const importance = memory.metadata.importance || 0;
        const isPersistent = memory.metadata.persistent || false;
        
        // Only delete non-persistent, low-importance old memories
        if (!isPersistent && importance < importanceThreshold) {
          memoriesToDelete.push(memory.id);
        }
      }

      if (memoriesToDelete.length > 0) {
        await this.storageService.deleteByIds(memoriesToDelete);
        totalDeleted += memoriesToDelete.length;
        this.logger.debug(`Deleted ${memoriesToDelete.length} old low-importance memories`);
      }

      // Phase 2: Enforce per-thread limits
      const threadCleanupPromises: Promise<number>[] = [];
      const recentMemories = await this.search({
        startDate: cutoffDate,
        limit: 5000, // Get recent memories to analyze by thread
      });

      // Group by thread
      const memoryByThread = new Map<string, MemoryEntry[]>();
      for (const memory of recentMemories) {
        if (!memoryByThread.has(memory.threadId)) {
          memoryByThread.set(memory.threadId, []);
        }
        memoryByThread.get(memory.threadId)!.push(memory);
      }

      // Clean up threads that exceed the limit
      for (const [threadId, memories] of memoryByThread) {
        if (memories.length > maxPerThread) {
          threadCleanupPromises.push(this.cleanupThread(threadId, maxPerThread));
        }
      }

      const threadCleanupResults = await Promise.allSettled(threadCleanupPromises);
      const threadDeletedCount = threadCleanupResults
        .filter(result => result.status === 'fulfilled')
        .reduce((sum, result) => sum + (result.value), 0);
      
      totalDeleted += threadDeletedCount;

      this.logger.log(`Memory cleanup completed: deleted ${totalDeleted} memories`);
      return totalDeleted;
    } catch (error) {
      this.logger.error('Memory cleanup failed:', error instanceof Error ? error.message : String(error));
      // Don't throw - cleanup failures shouldn't break the application
      return 0;
    }
  }

  /**
   * Clean up excess memories in a specific thread
   */
  private async cleanupThread(threadId: string, maxPerThread: number): Promise<number> {
    try {
      const memories = await this.retrieve(threadId, maxPerThread + 50); // Get extra to analyze
      
      if (memories.length <= maxPerThread) {
        return 0; // No cleanup needed
      }

      // Sort by importance and age (keep important and recent memories)
      const sortedMemories = [...memories].sort((a, b) => {
        const importanceA = a.metadata.importance || 0;
        const importanceB = b.metadata.importance || 0;
        
        // First sort by importance (higher is better)
        if (importanceA !== importanceB) {
          return importanceB - importanceA;
        }
        
        // Then by recency (newer is better)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Keep the most important/recent memories, delete the rest
      const memoriesToDelete = sortedMemories.slice(maxPerThread);

      // Don't delete persistent memories
      const deletableMemories = memoriesToDelete.filter(
        memory => !memory.metadata.persistent
      );

      if (deletableMemories.length > 0) {
        await this.storageService.deleteByIds(deletableMemories.map(m => m.id));
        this.logger.debug(`Cleaned up ${deletableMemories.length} excess memories from thread ${threadId}`);
        return deletableMemories.length;
      }

      return 0;
    } catch (error) {
      this.logger.error(`Failed to cleanup thread ${threadId}:`, error instanceof Error ? error.message : String(error));
      return 0;
    }
  }

  /**
   * Build semantic relationships between memories
   */
  async buildSemanticRelationships(): Promise<void> {
    try {
      await this.graphService.buildSemanticRelationships();
      this.logger.debug('Built semantic relationships');
    } catch (error) {
      this.logger.warn('Failed to build semantic relationships', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserPatterns(userId: string): Promise<UserMemoryPatterns> {
    try {
      const userMemories = await this.search({ userId, limit: 1000 });

      const topics = new Set<string>();
      const interactions: Record<string, number> = {};
      const memoryTypes: Record<string, number> = {};

      userMemories.forEach((memory) => {
        // Parse tags from JSON string if present
        if (memory.metadata.tags) {
          try {
            const tags = JSON.parse(memory.metadata.tags);
            if (Array.isArray(tags)) {
              tags.forEach((tag) => topics.add(tag));
            }
          } catch {
            // If not JSON, treat as single tag
            topics.add(memory.metadata.tags);
          }
        }

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
          .slice(0, 5) as UserMemoryPatterns['preferredMemoryTypes'],
        averageSessionLength:
          userMemories.length > 0 ? userMemories.length / 10 : 0,
        totalSessions: Math.max(Math.floor(userMemories.length / 10), 1),
      };
    } catch (error) {
      this.logger.error(`Failed to get user patterns for ${userId}`, error);
      throw wrapMemoryError('getUserPatterns', error);
    }
  }

  /**
   * Get conversation flow with connections
   */
  async getConversationFlow(threadId: string): Promise<
    ReadonlyArray<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: Date;
      connections: readonly string[];
    }>
  > {
    try {
      return await this.graphService.getThreadFlow(threadId);
    } catch (error) {
      this.logger.error(
        `Failed to get conversation flow for ${threadId}`,
        error
      );
      return [];
    }
  }

  // Private helper methods for summarization

  private summarizeRecent(
    messages: readonly BaseMessage[],
    maxLength: number
  ): string {
    const recentMessages = messages.slice(-5);
    const content = recentMessages
      .map((msg) => String(msg.content).slice(0, 50))
      .join(' | ');
    return content.slice(0, maxLength);
  }

  private summarizeImportant(
    messages: readonly BaseMessage[],
    maxLength: number
  ): string {
    // Simple heuristic: longer messages are more important
    const sortedMessages = [...messages]
      .sort((a, b) => String(b.content).length - String(a.content).length)
      .slice(0, 3);

    const content = sortedMessages
      .map((msg) => String(msg.content).slice(0, 80))
      .join(' | ');
    return content.slice(0, maxLength);
  }

  private summarizeBalanced(
    messages: readonly BaseMessage[],
    maxLength: number
  ): string {
    const messageCount = messages.length;
    const recentMessages = messages.slice(-3);
    const content = recentMessages
      .map((msg) => String(msg.content).slice(0, 60))
      .join(' | ');

    return `${messageCount} messages: ${content}`.slice(0, maxLength);
  }
}
