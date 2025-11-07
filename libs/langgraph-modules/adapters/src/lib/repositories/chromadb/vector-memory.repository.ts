import { Injectable, Logger } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  toChromaWhere,
  type AppFilter,
} from '@hive-academy/nestjs-chromadb';
import { VectorMemoryEntity } from '../../entities/chromadb/vector-memory.entity';
import {
  MemoryEntry,
  MemoryMetadata,
  VectorOperationError,
} from '@hive-academy/langgraph-memory';

/**
 * VectorMemoryRepository - ChromaDB Repository for Vector Memories
 *
 * Purpose: Type-safe repository for AI agent memory storage and retrieval
 * Pattern: TypeORM-Style Repository with explicit constructor-based DI
 *
 * Features:
 * - Extends ChromaDBRepository<T> for automatic CRUD operations
 * - Explicit 3-parameter constructor (entity, collection, chromaDB)
 * - NO decorator magic - clear dependency injection
 * - Full type safety with VectorMemoryEntity
 *
 * Inherited CRUD Methods (from ChromaDBRepository):
 * - create(document): Create single document
 * - createMany(documents): Batch create
 * - findById(id): Find by ID
 * - findByIds(ids): Find multiple by IDs
 * - findAll(options): Find with filtering
 * - search(query, options): Semantic search
 * - searchWithScores(query, options): Search with similarity scores
 * - searchSimilar(embedding, options): Search by embedding vector
 * - update(id, data): Update document
 * - updateMany(updates): Batch update
 * - upsert(document): Create or update
 * - upsertMany(documents): Batch upsert
 * - delete(id): Delete by ID
 * - deleteMany(ids): Batch delete
 * - deleteByFilter(where, whereDocument): Delete by filter
 * - count(where, whereDocument): Count documents
 * - exists(id): Check existence
 * - peek(limit): Get first N documents
 * - clear(): Clear all documents
 * - getCollectionInfo(): Get collection metadata
 *
 * Custom Business Methods:
 * - findByAgent(): Get memories for specific agent
 * - findByThread(): Get memories for conversation thread
 * - searchMemories(): Semantic search with agent filter
 * - findHighImportance(): Get high-priority memories
 * - findByUser(): Get memories by user across all agents
 * - findByClassification(): Get memories by classification type
 */
@Injectable()
export class VectorMemoryRepository extends ChromaDBRepository<VectorMemoryEntity> {
  private readonly repositoryLogger = new Logger(VectorMemoryRepository.name);

  /**
   * Explicit constructor with proper DI and auto-initialization
   *
   * @param chromaDB - ChromaDBService injected by NestJS
   * @param collectionRegistry - CollectionRegistryService for automatic collection initialization
   */
  constructor(
    chromaDB: ChromaDBService,
    collectionRegistry: CollectionRegistryService
  ) {
    super(VectorMemoryEntity, 'vector-memories', chromaDB, collectionRegistry);
    // ✅ Collection 'vector-memories' will be automatically initialized in background
  }

  // ==================== CUSTOM BUSINESS METHODS ====================

  /**
   * Find all memories for a specific agent
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param agentId - Agent ID
   * @param limit - Maximum number of memories to return
   * @returns Array of vector memories for the agent
   */
  async findByAgent(
    agentId: string,
    limit = 50
  ): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: { agentId } as any,
      limit,
    });
  }

  /**
   * Find all memories for a conversation thread
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param threadId - Thread/conversation ID
   * @returns Array of vector memories for the thread
   */
  async findByThread(threadId: string): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: { threadId } as any,
      limit: 1000,
    });
  }

  /**
   * Semantic search for memories with agent filtering
   * Uses ChromaDB server-side filtering during search for optimal performance
   *
   * @param query - Search query text
   * @param agentId - Agent ID to filter by
   * @param limit - Maximum number of results
   * @returns Array of semantically similar memories
   */
  async searchMemories(
    query: string,
    agentId: string,
    limit = 10
  ): Promise<VectorMemoryEntity[]> {
    return await this.search(query, {
      where: { agentId } as any,
      limit,
    });
  }

  /**
   * Find high-importance memories for an agent
   * Uses ChromaDB server-side filtering with comparison operators
   *
   * @param agentId - Agent ID
   * @param minImportance - Minimum importance threshold (0.0 - 1.0)
   * @returns Array of high-importance memories
   */
  async findHighImportance(
    agentId: string,
    minImportance = 0.7
  ): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: {
        agentId,
        importance: { $gte: minImportance },
      } as any,
      limit: 200,
    });
  }

  /**
   * Find memories by user across all agents
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param userId - User ID
   * @param limit - Maximum number of memories to return
   * @returns Array of vector memories for the user
   */
  async findByUser(userId: string, limit = 100): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: { userId } as any,
      limit,
    });
  }

  /**
   * Find memories by classification type
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param classification - Memory classification (error, success, conversation, general)
   * @param agentId - Optional agent ID filter
   * @returns Array of vector memories matching classification
   */
  async findByClassification(
    classification: string,
    agentId?: string
  ): Promise<VectorMemoryEntity[]> {
    const where: any = { classification };
    if (agentId) {
      where.agentId = agentId;
    }

    return await this.findAll({
      where,
      limit: 1000,
    });
  }

  // ==================== MEMORY BUSINESS LOGIC METHODS ====================

  /**
   * Store a single memory entry (business logic from ChromaVectorAdapter)
   */
  async storeMemory(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    try {
      const id = this.generateId();
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
        } as MemoryMetadata,
        createdAt: now,
        accessCount: 0,
      };

      // Store in vector database via repository (collection 'vector-memories' bound at instantiation)
      await this.create({
        id,
        content,
        embedding: undefined, // Repository auto-generates embedding
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
        } as any,
      });

      this.repositoryLogger.debug(`Stored memory ${id} for thread ${threadId}`);
      return entry;
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to store memory for thread ${threadId}`,
        error
      );
      throw new VectorOperationError(
        `Failed to store memory for thread ${threadId}`,
        'storeMemory',
        {
          threadId,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Store multiple memory entries in batch (business logic from ChromaVectorAdapter)
   */
  async storeMemoriesBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>,
    userId?: string
  ): Promise<MemoryEntry[]> {
    if (entries.length === 0) return [];

    try {
      const now = new Date();
      const memoryEntries: MemoryEntry[] = entries.map((entry, index) => ({
        id: this.generateId(),
        threadId,
        content: entry.content,
        metadata: {
          type: 'conversation',
          importance: 0.5,
          persistent: false,
          ...entry.metadata,
          userId: userId || undefined,
        } as MemoryMetadata,
        createdAt: new Date(now.getTime() + index), // Slight offset for ordering
        accessCount: 0,
      }));

      // Batch store in vector database
      const vectorDocuments = memoryEntries.map((entry) => ({
        id: entry.id,
        content: entry.content,
        embedding: undefined, // Repository auto-generates embeddings
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
        } as any,
      }));

      await this.createMany(vectorDocuments);

      this.repositoryLogger.debug(
        `Batch stored ${entries.length} memories for thread ${threadId}`
      );
      return memoryEntries;
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to batch store memories for thread ${threadId}`,
        error
      );
      throw new VectorOperationError(
        `Failed to batch store memories for thread ${threadId}`,
        'storeMemoriesBatch',
        {
          threadId,
          count: entries.length,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Retrieve memories by thread ID (business logic from ChromaVectorAdapter)
   */
  async retrieveByThread(
    threadId: string,
    limit = 100
  ): Promise<MemoryEntry[]> {
    try {
      const entities = await this.findAll({
        where: { threadId } as any,
        limit,
      });

      const memories: MemoryEntry[] = entities.map((entity) => ({
        id: entity.id,
        threadId: (entity.metadata.threadId as string) || threadId,
        content: entity.content,
        metadata: {
          type:
            (entity.metadata.type as MemoryMetadata['type']) || 'conversation',
          importance: (entity.metadata.importance as number) || undefined,
          persistent: (entity.metadata.persistent as boolean) || undefined,
          userId: (entity.metadata.userId as string) || undefined,
          source: (entity.metadata.source as string) || undefined,
          tags: (entity.metadata.tags as string) || undefined,
        } as MemoryMetadata,
        createdAt: new Date(
          (entity.metadata.createdAt as string) || Date.now()
        ),
        lastAccessedAt: entity.metadata.lastAccessedAt
          ? new Date(entity.metadata.lastAccessedAt as string)
          : undefined,
        accessCount: (entity.metadata.accessCount as number) || 0,
      }));

      this.repositoryLogger.debug(
        `Retrieved ${memories.length} memories for thread ${threadId}`
      );
      return memories;
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to retrieve memories for thread ${threadId}`,
        error
      );
      throw new VectorOperationError(
        `Failed to retrieve memories for thread ${threadId}`,
        'retrieveByThread',
        {
          threadId,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Search for similar memories using semantic search (business logic from ChromaVectorAdapter)
   *
   * CRITICAL FIX: Transform application filters to ChromaDB-compliant where clauses
   * Problem: ChromaDB requires explicit $and/$or operators for multiple conditions
   * Solution: Use toChromaWhere() utility to ensure compile-time + runtime safety
   */
  async searchMemoriesSimilar(
    query: string,
    filter: Record<string, unknown> = {},
    limit = 10
  ): Promise<MemoryEntry[]> {
    try {
      // ✅ FIX: Transform filter to ChromaDB-compliant where clause
      // Before: { threadId: "abc", userId: "xyz", type: ["a", "b"] } ❌ INVALID (3 operators)
      // After:  { $and: [{ threadId: "abc" }, { userId: "xyz" }, { type: { $in: ["a", "b"] } }] } ✅ VALID
      const where = toChromaWhere(filter as AppFilter);

      const results = await this.searchWithScores(query, {
        where,
        limit,
      });

      if (!results || results.length === 0) return [];

      const memories: MemoryEntry[] = results.map((result) => {
        const entity = result.document;
        const metadata = entity.metadata || {};

        return {
          id: entity.id,
          threadId: (metadata.threadId as string) || 'unknown',
          content: entity.content || '',
          metadata: {
            type: (metadata.type as MemoryMetadata['type']) || 'conversation',
            importance: (metadata.importance as number) || undefined,
            persistent: (metadata.persistent as boolean) || undefined,
            userId: (metadata.userId as string) || undefined,
            source: (metadata.source as string) || undefined,
            tags: (metadata.tags as string) || undefined,
          } as MemoryMetadata,
          createdAt: new Date((metadata.createdAt as string) || Date.now()),
          lastAccessedAt: metadata.lastAccessedAt
            ? new Date(metadata.lastAccessedAt as string)
            : undefined,
          accessCount: (metadata.accessCount as number) || 0,
          relevanceScore: result.score || 0,
        };
      });

      this.repositoryLogger.debug(
        `Found ${memories.length} similar memories for query`
      );
      return memories;
    } catch (error) {
      this.repositoryLogger.error(`Failed to search memories`, error);
      throw new VectorOperationError(
        `Failed to search memories`,
        'searchMemoriesSimilar',
        {
          query,
          filter,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Delete memories by IDs (business logic from ChromaVectorAdapter)
   */
  async deleteMemories(memoryIds: readonly string[]): Promise<number> {
    if (memoryIds.length === 0) return 0;

    try {
      await this.deleteMany([...memoryIds]);

      this.repositoryLogger.debug(`Deleted ${memoryIds.length} memories`);
      return memoryIds.length;
    } catch (error) {
      this.repositoryLogger.error(`Failed to delete memories`, error);
      throw new VectorOperationError(
        `Failed to delete memories`,
        'deleteMemories',
        {
          count: memoryIds.length,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Clear all memories for a thread (business logic from ChromaVectorAdapter)
   */
  async clearThread(threadId: string): Promise<void> {
    try {
      await this.deleteByFilter({ threadId } as any);

      this.repositoryLogger.debug(
        `Cleared all memories for thread ${threadId}`
      );
    } catch (error) {
      this.repositoryLogger.error(`Failed to clear thread ${threadId}`, error);
      throw new VectorOperationError(
        `Failed to clear thread ${threadId}`,
        'clearThread',
        {
          threadId,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Get memory count for a thread (business logic from ChromaVectorAdapter)
   */
  async getThreadCount(threadId: string): Promise<number> {
    try {
      const count = await this.count({ threadId } as any);

      return count;
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to get count for thread ${threadId}`,
        error
      );
      return 0;
    }
  }

  /**
   * Get vector storage statistics (business logic from ChromaVectorAdapter)
   */
  async getVectorStats(): Promise<{
    totalMemories: number;
    averageSize: number;
    totalStorageUsed: number;
  }> {
    try {
      const totalMemories = await this.count();

      // Get a sample of documents to calculate average size
      const sampleResults = await this.findAll({
        limit: 100,
      });

      let averageSize = 150; // Default fallback
      if (sampleResults && sampleResults.length > 0) {
        const totalSize = sampleResults
          .filter((entity) => entity.content !== null)
          .reduce((sum, entity) => sum + (entity.content?.length || 0), 0);
        averageSize = Math.round(totalSize / sampleResults.length);
      }

      const collectionInfo = await this.getCollectionInfo();

      return {
        totalMemories,
        averageSize,
        totalStorageUsed:
          (collectionInfo.metadata?.size as number) ||
          totalMemories * averageSize,
      };
    } catch (error) {
      this.repositoryLogger.error('Failed to get vector stats', error);
      return {
        totalMemories: 0,
        averageSize: 0,
        totalStorageUsed: 0,
      };
    }
  }

  /**
   * Get operation metrics (business logic from ChromaVectorAdapter)
   */
  async getOperationMetrics(): Promise<{
    searchCount: number;
    averageSearchTime: number;
    summarizationCount: number;
    cacheHitRate: number;
  }> {
    try {
      const totalMemories = await this.count();

      // Estimate operations based on document count
      const estimatedSearchCount = Math.floor(totalMemories * 0.1); // 10% search ratio
      const largeCollectionThreshold = 1000;
      const averageSearchTime =
        totalMemories > largeCollectionThreshold ? 75 : 45; // Slower with more docs
      const cacheHitRate = totalMemories > 100 ? 0.85 : 0.95; // Better cache for smaller collections

      return {
        searchCount: estimatedSearchCount,
        averageSearchTime,
        summarizationCount: Math.floor(totalMemories * 0.05), // 5% summarization ratio
        cacheHitRate,
      };
    } catch (error) {
      this.repositoryLogger.error('Failed to get operation metrics', error);
      return {
        searchCount: 0,
        averageSearchTime: 50,
        summarizationCount: 0,
        cacheHitRate: 0.85,
      };
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Serialize error for logging and context
   */
  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return { error: String(error) };
  }

  // Note: generateId() method inherited from ChromaDBRepository base class
  // Uses crypto.randomUUID() with fallback to UUID v4 implementation
}
