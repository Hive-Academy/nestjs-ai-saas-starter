import { Injectable, Logger, Inject } from '@nestjs/common';
import { IVectorService } from '../interfaces/vector-service.interface';
import type {
  MemoryEntry,
  MemoryMetadata,
  MemoryConfig,
} from '../interfaces/memory.interface';
import { MEMORY_CONFIG } from '../constants/memory.constants';
import { wrapMemoryError } from '../errors/memory.errors';
import { randomUUID } from 'crypto';

/**
 * Memory storage service using adapter pattern for vector database integration
 *
 * Handles:
 * - Vector storage and retrieval through adapter abstraction
 * - Semantic similarity search via IVectorService
 * - Memory entry persistence with configurable backends
 * - Embedding generation through adapter delegation
 * - 100% backward compatibility maintained
 */
@Injectable()
export class MemoryStorageService {
  private readonly logger = new Logger(MemoryStorageService.name);

  constructor(
    private readonly vectorService: IVectorService,
    @Inject(MEMORY_CONFIG) private readonly config: MemoryConfig
  ) {}

  /**
   * Store a single memory entry
   */
  async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    try {
      const id = randomUUID();
      const now = new Date();

      const entry: MemoryEntry = {
        id,
        threadId,
        content,
        metadata: {
          type: 'conversation',
          importance: 0.5,
          persistent: false,
          ...metadata,
          userId: userId || undefined,
        },
        createdAt: now,
        accessCount: 0,
      };

      // Store in vector database via adapter with automatic embedding generation
      await this.vectorService.store(
        this.config.collection || 'memory_store',
        {
          id,
          document: content,
          metadata: {
            threadId,
            type: entry.metadata.type,
            importance: entry.metadata.importance || null,
            persistent: entry.metadata.persistent || null,
            userId: userId || null,
            createdAt: now.toISOString(),
            accessCount: 0,
            source: entry.metadata.source || null,
            tags: entry.metadata.tags || null,
          },
        }
      );

      this.logger.debug(`Stored memory ${id} for thread ${threadId}`);
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
      const now = new Date();
      const memoryEntries: MemoryEntry[] = entries.map((entry, index) => ({
        id: randomUUID(),
        threadId,
        content: entry.content,
        metadata: {
          type: 'conversation',
          importance: 0.5,
          persistent: false,
          ...entry.metadata,
          userId: userId || undefined,
        },
        createdAt: new Date(now.getTime() + index), // Slight offset for ordering
        accessCount: 0,
      }));

      // Batch store in vector database via adapter
      const vectorDocuments = memoryEntries.map((entry) => ({
        id: entry.id,
        document: entry.content,
        metadata: {
          threadId,
          type: entry.metadata.type,
          importance: entry.metadata.importance || null,
          persistent: entry.metadata.persistent || null,
          userId: userId || undefined,
          createdAt: entry.createdAt.toISOString(),
          accessCount: 0,
          source: entry.metadata.source || null,
          tags: entry.metadata.tags || null,
        },
      }));

      await this.vectorService.storeBatch(
        this.config.collection || 'memory_store',
        vectorDocuments
      );

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
   * Retrieve memories by thread ID
   */
  async retrieve(
    threadId: string,
    limit = 100
  ): Promise<readonly MemoryEntry[]> {
    try {
      const results = await this.vectorService.getDocuments(
        this.config.collection || 'memory_store',
        {
          where: { threadId },
          limit,
          includeMetadata: true,
          includeDocuments: true,
        }
      );

      const memories: MemoryEntry[] =
        results.documents?.map((doc, index) => {
          const metadata = results.metadatas?.[index] || {};
          return {
            id: results.ids[index],
            threadId: metadata.threadId as string,
            content: doc || '',
            metadata: {
              type: (metadata.type as MemoryMetadata['type']) || 'conversation',
              importance: (metadata.importance as number) || undefined,
              persistent: (metadata.persistent as boolean) || undefined,
              userId: (metadata.userId as string) || undefined,
              source: (metadata.source as string) || undefined,
              tags: (metadata.tags as string) || undefined,
            },
            createdAt: new Date(metadata.createdAt as string),
            lastAccessedAt: metadata.lastAccessedAt
              ? new Date(metadata.lastAccessedAt as string)
              : undefined,
            accessCount: (metadata.accessCount as number) || 0,
          };
        }) || [];

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
   * Search for similar memories using semantic search
   */
  async searchSimilar(
    query: string,
    filter: Record<string, unknown> = {},
    limit = 10
  ): Promise<readonly MemoryEntry[]> {
    try {
      const results = await this.vectorService.search(
        this.config.collection || 'memory_store',
        {
          queryText: query,
          filter,
          limit,
        }
      );

      if (!results || results.length === 0) return [];

      const memories: MemoryEntry[] = results.map((result) => {
        const metadata = result.metadata || {};

        return {
          id: result.id,
          threadId: metadata.threadId as string,
          content: result.document || '',
          metadata: {
            type: (metadata.type as MemoryMetadata['type']) || 'conversation',
            importance: (metadata.importance as number) || undefined,
            persistent: (metadata.persistent as boolean) || undefined,
            userId: (metadata.userId as string) || undefined,
            source: (metadata.source as string) || undefined,
            tags: (metadata.tags as string) || undefined,
          },
          createdAt: new Date(metadata.createdAt as string),
          lastAccessedAt: metadata.lastAccessedAt
            ? new Date(metadata.lastAccessedAt as string)
            : undefined,
          accessCount: (metadata.accessCount as number) || 0,
          relevanceScore: result.relevanceScore || 0, // Use adapter's relevance score
        };
      });

      this.logger.debug(`Found ${memories.length} similar memories for query`);
      return memories;
    } catch (error) {
      this.logger.error(`Failed to search memories`, error);
      throw wrapMemoryError('searchSimilar', error);
    }
  }

  /**
   * Delete memories by IDs
   */
  async deleteByIds(memoryIds: readonly string[]): Promise<number> {
    if (memoryIds.length === 0) return 0;

    try {
      await this.vectorService.delete(
        this.config.collection || 'memory_store',
        memoryIds
      );

      this.logger.debug(`Deleted ${memoryIds.length} memories`);
      return memoryIds.length;
    } catch (error) {
      this.logger.error(`Failed to delete memories`, error);
      throw wrapMemoryError('deleteByIds', error);
    }
  }

  /**
   * Clear all memories for a thread
   */
  async clearThread(threadId: string): Promise<void> {
    try {
      await this.vectorService.deleteByFilter(
        this.config.collection || 'memory_store',
        { threadId }
      );

      this.logger.debug(`Cleared all memories for thread ${threadId}`);
    } catch (error) {
      this.logger.error(`Failed to clear thread ${threadId}`, error);
      throw wrapMemoryError('clearThread', error);
    }
  }

  /**
   * Get memory count for a thread
   */
  async getThreadCount(threadId: string): Promise<number> {
    try {
      const results = await this.vectorService.getDocuments(
        this.config.collection || 'memory_store',
        {
          where: { threadId },
          limit: 1000, // Get more to count accurately
          includeDocuments: false,
          includeMetadata: false,
        }
      );

      return results.ids.length;
    } catch (error) {
      this.logger.error(`Failed to get count for thread ${threadId}`, error);
      return 0;
    }
  }
}
