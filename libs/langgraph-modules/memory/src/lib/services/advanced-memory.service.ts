import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySummarizationOptions,
  MemoryConfig,
  MemoryStats,
  MemoryServiceInterface,
  MemoryEntrySchema,
  MemorySearchOptionsSchema,
} from '../interfaces/memory.interface';

/**
 * Advanced memory management service with semantic search and summarization
 */
@Injectable()
export class AdvancedMemoryService implements MemoryServiceInterface, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdvancedMemoryService.name);
  private readonly memories = new Map<string, MemoryEntry[]>();
  private readonly embeddings = new Map<string, readonly number[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly searchMetrics = {
    count: 0,
    totalTime: 0,
  };
  private readonly summarizationMetrics = {
    count: 0,
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
    this.startCleanupScheduler();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Initialize memory service
   */
  private async initialize(): Promise<void> {
    const config = this.configService.get<MemoryConfig>('memory');
    
    if (config?.enableSemanticSearch) {
      this.logger.log('Semantic search enabled for memory service');
    }
    
    if (config?.enableAutoSummarization) {
      this.logger.log('Auto-summarization enabled for memory service');
    }
    
    this.logger.log('Advanced memory service initialized');
  }

  /**
   * Store a memory entry
   */
  async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: uuidv4(),
      threadId,
      content,
      metadata: {
        type: metadata?.type ?? 'conversation',
        source: metadata?.source,
        tags: metadata?.tags,
        importance: metadata?.importance ?? 0.5,
        persistent: metadata?.persistent ?? false,
        ...metadata,
      },
      createdAt: new Date(),
      accessCount: 0,
    };

    // Generate embedding if semantic search is enabled
    if (this.isSemanticSearchEnabled()) {
      entry.embedding = await this.generateEmbedding(content);
      this.embeddings.set(entry.id, entry.embedding);
    }

    // Validate entry
    const validation = MemoryEntrySchema.safeParse(entry);
    if (!validation.success) {
      throw new Error(`Invalid memory entry: ${validation.error.message}`);
    }

    // Store in memory
    const threadMemories = this.memories.get(threadId) ?? [];
    threadMemories.push(entry);
    this.memories.set(threadId, threadMemories);

    // Check if summarization is needed
    await this.checkAndSummarize(threadId);

    this.logger.debug(`Stored memory ${entry.id} for thread ${threadId}`);
    return entry;
  }

  /**
   * Store multiple memory entries
   */
  async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>
  ): Promise<readonly MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    
    for (const entry of entries) {
      const stored = await this.store(threadId, entry.content, entry.metadata);
      results.push(stored);
    }
    
    return results;
  }

  /**
   * Retrieve memories by thread
   */
  async retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]> {
    const memories = this.memories.get(threadId) ?? [];
    
    // Update access counts
    const now = new Date();
    memories.forEach(memory => {
      memory.accessCount++;
      memory.lastAccessedAt = now;
    });
    
    // Sort by creation date (most recent first)
    const sorted = [...memories].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Search memories semantically
   */
  async search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]> {
    const startTime = Date.now();
    
    // Validate options
    const validation = MemorySearchOptionsSchema.safeParse(options);
    if (!validation.success) {
      throw new Error(`Invalid search options: ${validation.error.message}`);
    }
    
    let results: MemoryEntry[] = [];
    
    // Get all memories from specified threads or all threads
    const threadIds = options.threadIds ?? Array.from(this.memories.keys());
    
    for (const threadId of threadIds) {
      const memories = this.memories.get(threadId) ?? [];
      results.push(...memories);
    }
    
    // Filter by type
    if (options.types && options.types.length > 0) {
      results = results.filter(m => 
        options.types!.includes(m.metadata.type)
      );
    }
    
    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(m => 
        m.metadata.tags?.some(tag => options.tags!.includes(tag))
      );
    }
    
    // Filter by date range
    if (options.dateRange) {
      const { from, to } = options.dateRange;
      results = results.filter(m => {
        const date = m.createdAt.getTime();
        return (!from || date >= from.getTime()) && 
               (!to || date <= to.getTime());
      });
    }
    
    // Semantic search if query provided and embeddings available
    if (options.query && this.isSemanticSearchEnabled()) {
      const queryEmbedding = await this.generateEmbedding(options.query);
      results = results.map(memory => {
        if (memory.embedding) {
          const score = this.cosineSimilarity(queryEmbedding, memory.embedding);
          return { ...memory, relevanceScore: score };
        }
        return memory;
      }).filter(m => 
        !options.minRelevance || 
        (m.relevanceScore && m.relevanceScore >= options.minRelevance)
      );
    }
    
    // Sort results
    const sortBy = options.sortBy ?? 'relevance';
    const sortOrder = options.sortOrder ?? 'desc';
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = (a.relevanceScore ?? 0) - (b.relevanceScore ?? 0);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'accessCount':
          comparison = a.accessCount - b.accessCount;
          break;
        case 'importance':
          comparison = (a.metadata.importance ?? 0) - (b.metadata.importance ?? 0);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    // Remove embeddings if not requested
    if (!options.includeEmbeddings) {
      results = results.map(({ embedding, ...rest }) => rest as MemoryEntry);
    }
    
    // Update metrics
    const duration = Date.now() - startTime;
    this.searchMetrics.count++;
    this.searchMetrics.totalTime += duration;
    
    this.logger.debug(`Memory search completed in ${duration}ms, found ${results.length} results`);
    return results;
  }

  /**
   * Summarize conversation history
   */
  async summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const strategy = options?.strategy ?? 'progressive';
    const maxMessages = options?.maxMessages ?? 50;
    const preserveImportant = options?.preserveImportant ?? true;
    
    this.logger.debug(`Summarizing ${messages.length} messages for thread ${threadId} using ${strategy} strategy`);
    
    // Filter messages to summarize
    let messagesToSummarize = [...messages];
    
    if (preserveImportant) {
      // Keep system messages and important user messages
      messagesToSummarize = messagesToSummarize.filter(
        msg => !(msg instanceof SystemMessage)
      );
    }
    
    // Create summary based on strategy
    let summary = '';
    
    switch (strategy) {
      case 'progressive':
        summary = await this.progressiveSummarization(messagesToSummarize, maxMessages);
        break;
      case 'batch':
        summary = await this.batchSummarization(messagesToSummarize);
        break;
      case 'sliding-window':
        summary = await this.slidingWindowSummarization(messagesToSummarize, maxMessages);
        break;
      default:
        summary = await this.progressiveSummarization(messagesToSummarize, maxMessages);
    }
    
    // Store summary as a memory entry
    await this.store(threadId, summary, {
      type: 'summary',
      source: 'auto-summarization',
      importance: 0.8,
      persistent: true,
    });
    
    // Update metrics
    this.summarizationMetrics.count++;
    
    this.logger.debug(`Created summary for thread ${threadId}: ${summary.substring(0, 100)}...`);
    return summary;
  }

  /**
   * Delete memories
   */
  async delete(threadId: string, memoryIds?: readonly string[]): Promise<number> {
    const memories = this.memories.get(threadId);
    if (!memories) return 0;
    
    let deleted = 0;
    
    if (memoryIds) {
      const idsSet = new Set(memoryIds);
      const filtered = memories.filter(m => {
        if (idsSet.has(m.id)) {
          this.embeddings.delete(m.id);
          deleted++;
          return false;
        }
        return true;
      });
      this.memories.set(threadId, filtered);
    } else {
      deleted = memories.length;
      memories.forEach(m => this.embeddings.delete(m.id));
      this.memories.delete(threadId);
    }
    
    this.logger.debug(`Deleted ${deleted} memories from thread ${threadId}`);
    return deleted;
  }

  /**
   * Clear all memories for a thread
   */
  async clear(threadId: string): Promise<void> {
    await this.delete(threadId);
    this.logger.debug(`Cleared all memories for thread ${threadId}`);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    let totalMemories = 0;
    let totalSize = 0;
    
    for (const memories of this.memories.values()) {
      totalMemories += memories.length;
      for (const memory of memories) {
        totalSize += JSON.stringify(memory).length;
      }
    }
    
    return {
      totalMemories,
      activeThreads: this.memories.size,
      averageMemorySize: totalMemories > 0 ? totalSize / totalMemories : 0,
      totalStorageUsed: totalSize,
      searchCount: this.searchMetrics.count,
      averageSearchTime: this.searchMetrics.count > 0 
        ? this.searchMetrics.totalTime / this.searchMetrics.count 
        : 0,
      summarizationCount: this.summarizationMetrics.count,
      cacheHitRate: 0, // Not implemented in this version
    };
  }

  /**
   * Perform cleanup based on retention policy
   */
  async cleanup(): Promise<number> {
    const config = this.configService.get<MemoryConfig>('memory');
    const retention = config?.retention;
    
    if (!retention) return 0;
    
    let totalDeleted = 0;
    const now = Date.now();
    
    for (const [threadId, memories] of this.memories.entries()) {
      let filtered = [...memories];
      
      // Apply max age
      if (retention.maxAge) {
        const cutoff = now - retention.maxAge;
        filtered = filtered.filter(m => 
          m.metadata.persistent || m.createdAt.getTime() > cutoff
        );
      }
      
      // Apply max per thread
      if (retention.maxPerThread && filtered.length > retention.maxPerThread) {
        // Sort by importance and keep top N
        filtered.sort((a, b) => 
          (b.metadata.importance ?? 0) - (a.metadata.importance ?? 0)
        );
        filtered = filtered.slice(0, retention.maxPerThread);
      }
      
      const deleted = memories.length - filtered.length;
      if (deleted > 0) {
        totalDeleted += deleted;
        this.memories.set(threadId, filtered);
        this.logger.debug(`Cleaned up ${deleted} memories from thread ${threadId}`);
      }
    }
    
    this.logger.log(`Cleanup completed: ${totalDeleted} memories removed`);
    return totalDeleted;
  }

  /**
   * Check if semantic search is enabled
   */
  private isSemanticSearchEnabled(): boolean {
    return this.configService.get<boolean>('memory.enableSemanticSearch', false);
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<readonly number[]> {
    // This is a placeholder - in production, use actual embedding service
    // For now, return a random vector for demonstration
    const dimension = this.configService.get<number>('memory.embedding.dimension', 384);
    return Array.from({ length: dimension }, () => Math.random());
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check and perform auto-summarization if needed
   */
  private async checkAndSummarize(threadId: string): Promise<void> {
    if (!this.configService.get<boolean>('memory.enableAutoSummarization', false)) {
      return;
    }
    
    const memories = this.memories.get(threadId) ?? [];
    const maxMessages = this.configService.get<number>('memory.summarization.maxMessages', 50);
    
    if (memories.length > maxMessages) {
      const messages = memories
        .filter(m => m.metadata.type === 'conversation')
        .map(m => new HumanMessage(m.content));
      
      await this.summarize(threadId, messages);
    }
  }

  /**
   * Progressive summarization strategy
   */
  private async progressiveSummarization(
    messages: BaseMessage[],
    maxMessages: number
  ): Promise<string> {
    if (messages.length <= maxMessages) {
      return this.createSimpleSummary(messages);
    }
    
    const chunks = [];
    for (let i = 0; i < messages.length; i += maxMessages) {
      const chunk = messages.slice(i, i + maxMessages);
      chunks.push(await this.createSimpleSummary(chunk));
    }
    
    return chunks.join('\n\n');
  }

  /**
   * Batch summarization strategy
   */
  private async batchSummarization(messages: BaseMessage[]): Promise<string> {
    return this.createSimpleSummary(messages);
  }

  /**
   * Sliding window summarization strategy
   */
  private async slidingWindowSummarization(
    messages: BaseMessage[],
    windowSize: number
  ): Promise<string> {
    if (messages.length <= windowSize) {
      return this.createSimpleSummary(messages);
    }
    
    // Keep recent messages and summarize older ones
    const recentMessages = messages.slice(-windowSize);
    const olderMessages = messages.slice(0, -windowSize);
    
    const olderSummary = await this.createSimpleSummary(olderMessages);
    const recentSummary = await this.createSimpleSummary(recentMessages);
    
    return `Previous context: ${olderSummary}\n\nRecent conversation: ${recentSummary}`;
  }

  /**
   * Create a simple summary from messages
   */
  private createSimpleSummary(messages: BaseMessage[]): string {
    // This is a placeholder - in production, use LLM for actual summarization
    const messageTexts = messages.map(msg => {
      if (msg instanceof HumanMessage) return `User: ${msg.content}`;
      if (msg instanceof AIMessage) return `Assistant: ${msg.content}`;
      return msg.content.toString();
    });
    
    return `Summary of ${messages.length} messages:\n${messageTexts.slice(0, 3).join('\n')}...`;
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    const interval = this.configService.get<number>(
      'memory.retention.cleanupInterval',
      3600000 // 1 hour default
    );
    
    if (interval > 0) {
      this.cleanupInterval = setInterval(async () => {
        try {
          await this.cleanup();
        } catch (error) {
          this.logger.error('Memory cleanup failed:', error);
        }
      }, interval);
      
      this.logger.log(`Memory cleanup scheduler started (interval: ${interval}ms)`);
    }
  }
}