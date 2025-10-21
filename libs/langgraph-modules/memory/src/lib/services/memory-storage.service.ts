import { Inject, Injectable } from '@nestjs/common';
import type {
  MemoryEntry,
  MemoryMetadata,
} from '../interfaces/memory.interface';
import { IVectorService } from '../interfaces/vector-service.interface';

/**
 * Memory storage service - pure delegation to application adapters
 *
 * Architecture:
 * - Library service delegates to IVectorService adapter (provided by application)
 * - Application adapter (ChromaVectorAdapter) contains all business logic:
 *   - UUID generation
 *   - MemoryEntry creation
 *   - Metadata handling
 *   - Collection name management (via repository)
 *   - Error handling
 *
 * This service is a thin facade for consistent API surface across the memory module.
 */
@Injectable()
export class MemoryStorageService {
  constructor(
    @Inject('IVectorService')
    private readonly vectorService: IVectorService
  ) {}

  /**
   * Store a single memory entry
   * Delegates to application adapter for business logic
   */
  async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    return await this.vectorService.storeMemory(
      threadId,
      content,
      metadata,
      userId
    );
  }

  /**
   * Store multiple memory entries in batch
   * Delegates to application adapter for batch processing
   */
  async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>,
    userId?: string
  ): Promise<readonly MemoryEntry[]> {
    return await this.vectorService.storeMemoriesBatch(
      threadId,
      entries as MemoryEntry[],
      userId
    );
  }

  /**
   * Retrieve memories by thread ID
   * Delegates to application adapter for retrieval logic
   */
  async retrieve(
    threadId: string,
    limit = 100
  ): Promise<readonly MemoryEntry[]> {
    return await this.vectorService.retrieveByThread(threadId, limit);
  }

  /**
   * Search for similar memories using semantic search
   * Delegates to application adapter for search logic
   */
  async searchSimilar(
    query: string,
    filter: Record<string, unknown> = {},
    limit = 10
  ): Promise<readonly MemoryEntry[]> {
    return await this.vectorService.searchMemoriesSimilar(query, filter, limit);
  }

  /**
   * Delete memories by IDs
   * Delegates to application adapter for deletion logic
   */
  async deleteByIds(memoryIds: readonly string[]): Promise<number> {
    return await this.vectorService.deleteMemories(memoryIds);
  }

  /**
   * Clear all memories for a thread
   * Delegates to application adapter for thread cleanup
   */
  async clearThread(threadId: string): Promise<void> {
    return await this.vectorService.clearThread(threadId);
  }

  /**
   * Get memory count for a thread
   * Delegates to application adapter for count logic
   */
  async getThreadCount(threadId: string): Promise<number> {
    return await this.vectorService.getThreadCount(threadId);
  }

  /**
   * Get vector storage statistics
   * Delegates to application adapter for statistics calculation
   */
  async getVectorStats(): Promise<{
    totalMemories: number;
    averageSize: number;
    totalStorageUsed: number;
  }> {
    return await this.vectorService.getVectorStats();
  }

  /**
   * Get operation metrics
   * Delegates to application adapter for metrics calculation
   */
  async getOperationMetrics(): Promise<{
    searchCount: number;
    averageSearchTime: number;
    summarizationCount: number;
    cacheHitRate: number;
  }> {
    return await this.vectorService.getOperationMetrics();
  }
}
