import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChromaDBService,
  EmbeddingService,
} from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import type {
  BaseMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import type { GetResult, Where } from 'chromadb';
import type {
  ChromaMetadata,
  ChromaSearchResult,
} from '@hive-academy/nestjs-chromadb';
import type {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemoryServiceInterface,
  MemoryStats,
  MemorySummarizationOptions,
} from '../interfaces/memory.interface';
import type { ChromaWhereClause } from '../interfaces/memory.interface';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryStorageError,
  MemoryRelationshipError,
  MemoryEmbeddingError,
  MemoryTimeoutError,
  wrapMemoryError,
} from '../errors/memory-errors';
import { Session } from 'neo4j-driver';

/**
 * Core memory service with proper type safety and SOLID principles
 * This replaces the monolithic advanced-memory.service.ts
 */
@Injectable()
export class MemoryCoreService
  implements MemoryServiceInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MemoryCoreService.name);
  private readonly collectionName = 'memory-entries';
  private readonly memories = new Map<string, MemoryEntry[]>();
  private readonly embeddings = new Map<string, readonly number[]>();
  private readonly searchStats = {
    searchCount: 0,
    totalSearchTime: 0,
    summarizationCount: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly chromaDBService: ChromaDBService,
    private readonly neo4jService: Neo4jService,
    private readonly embeddingService: EmbeddingService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.initialize();
    this.startCleanupScheduler();
  }

  public onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Initialize memory service
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure ChromaDB collection exists
      await this.chromaDBService.createCollection(this.collectionName);
      this.logger.log('Memory service initialized with ChromaDB collection');

      // Initialize Neo4j constraints and indexes for memory graph
      await this.initializeNeo4jSchema();
      this.logger.log('Memory service initialized with Neo4j graph schema');
    } catch (error) {
      this.logger.error('Failed to initialize memory service', error);
      throw error;
    }
  }

  /**
   * Initialize Neo4j schema for memory storage
   */
  private async initializeNeo4jSchema(): Promise<void> {
    try {
      await this.neo4jService.write(async (session) => {
        // Create constraints for unique memory IDs
        await session.run(`
          CREATE CONSTRAINT memory_id_unique IF NOT EXISTS
          FOR (m:Memory) REQUIRE m.id IS UNIQUE
        `);

        // Create constraint for unique thread IDs
        await session.run(`
          CREATE CONSTRAINT thread_id_unique IF NOT EXISTS
          FOR (t:Thread) REQUIRE t.id IS UNIQUE
        `);

        // Create indexes for efficient querying
        await session.run(`
          CREATE INDEX memory_thread_idx IF NOT EXISTS
          FOR (m:Memory) ON (m.threadId)
        `);

        await session.run(`
          CREATE INDEX memory_type_idx IF NOT EXISTS
          FOR (m:Memory) ON (m.type)
        `);

        await session.run(`
          CREATE INDEX memory_created_idx IF NOT EXISTS
          FOR (m:Memory) ON (m.createdAt)
        `);

        await session.run(`
          CREATE INDEX memory_importance_idx IF NOT EXISTS
          FOR (m:Memory) ON (m.importance)
        `);
      });
    } catch (error) {
      this.logger.warn(
        'Failed to initialize Neo4j schema (may already exist)',
        error
      );
      // Don't throw - schema initialization failures shouldn't prevent service startup
    }
  }

  private parseAdditionalMetadata(value: unknown): Record<string, unknown> {
    if (typeof value !== 'string') {
      return {};
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  /**
   * Store a memory entry
   */
  public async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<MemoryEntry> {
    try {
      const entry: MemoryEntry = {
        id: uuidv4(),
        threadId,
        content,
        metadata: {
          type: 'conversation',
          source: 'user',
          tags: [],
          importance: 0.5,
          persistent: false,
          ...metadata,
        },
        createdAt: new Date(),
        accessCount: 0,
      };

      // Generate embedding using EmbeddingService with retry
      if (this.isSemanticSearchEnabled()) {
        try {
          const embeddings = await this.executeEmbeddingOperation(
            async () => this.embeddingService.embed([content]),
            'generateEmbedding'
          );
          entry.embedding = embeddings[0];
        } catch (error) {
          this.logger.warn(
            'Failed to generate embedding, storing without semantic search capability',
            error
          );
          // Continue without embedding - the memory will still be stored
        }
      }

      // Store in ChromaDB with timeout and fallback
      await this.executeChromaDBOperation(
        async () =>
          this.chromaDBService.addDocuments(this.collectionName, [
            {
              id: entry.id,
              document: content,
              metadata: {
                threadId: entry.threadId,
                type: entry.metadata.type,
                source: entry.metadata.source ?? null,
                tags: entry.metadata.tags?.join(',') ?? '',
                importance: entry.metadata.importance ?? 0.5,
                persistent: entry.metadata.persistent ?? false,
                createdAt: entry.createdAt.toISOString(),
                accessCount: entry.accessCount,
                lastAccessedAt: entry.lastAccessedAt?.toISOString() ?? null,
                // Store additional metadata as JSON string
                additionalMetadata: JSON.stringify(
                  Object.fromEntries(
                    Object.entries(entry.metadata).filter(
                      ([key]) =>
                        ![
                          'type',
                          'source',
                          'tags',
                          'importance',
                          'persistent',
                        ].includes(key)
                    )
                  )
                ),
              },
              embedding: entry.embedding,
            },
          ]),
        'addDocument',
        threadId
      );

      // Store in Neo4j for relationship tracking (graceful degradation)
      await this.executeNeo4jOperation(
        async () => this.storeMemoryInNeo4j(entry),
        'storeMemoryInNeo4j',
        threadId
      );

      // Check if auto-summarization is needed
      await this.checkAndSummarize(threadId);

      this.logger.debug(
        `Stored memory entry ${entry.id} for thread ${threadId}`
      );
      return entry;
    } catch (error) {
      this.logger.error(
        `Failed to store memory entry for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentStorage(
        'store',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Store multiple memory entries
   */

  public async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>
  ): Promise<readonly MemoryEntry[]> {
    try {
      const memoryEntries: MemoryEntry[] = [];
      const documents: Array<{
        id: string;
        document: string;
        metadata: Record<string, string | number | boolean | null>;
        embedding?: readonly number[];
      }> = [];

      // Prepare all entries
      for (const entryData of entries) {
        const entry: MemoryEntry = {
          id: uuidv4(),
          threadId,
          content: entryData.content,
          metadata: {
            type: 'conversation',
            source: 'user',
            tags: [],
            importance: 0.5,
            persistent: false,
            ...entryData.metadata,
          },
          createdAt: new Date(),
          accessCount: 0,
        };

        memoryEntries.push(entry);

        // Prepare document for ChromaDB
        documents.push({
          id: entry.id,
          document: entry.content,
          metadata: {
            threadId: entry.threadId,
            type: entry.metadata.type,
            source: entry.metadata.source ?? null,
            tags: entry.metadata.tags?.join(',') ?? '',
            importance: entry.metadata.importance ?? 0.5,
            persistent: entry.metadata.persistent ?? false,
            createdAt: entry.createdAt.toISOString(),
            accessCount: entry.accessCount,
            lastAccessedAt: entry.lastAccessedAt?.toISOString() ?? null,
            additionalMetadata: JSON.stringify(
              Object.fromEntries(
                Object.entries(entry.metadata).filter(
                  ([key]) =>
                    ![
                      'type',
                      'source',
                      'tags',
                      'importance',
                      'persistent',
                    ].includes(key)
                )
              )
            ),
          },
        });
      }

      // Generate embeddings for all entries if semantic search is enabled
      if (this.isSemanticSearchEnabled()) {
        const contents = memoryEntries.map((entry) => entry.content);
        const embeddings = await this.embeddingService.embed(contents);

        for (let i = 0; i < memoryEntries.length; i++) {
          memoryEntries[i].embedding = embeddings[i];
          documents[i].embedding = embeddings[i];
        }
      }

      // Store all documents in ChromaDB
      await this.chromaDBService.addDocuments(this.collectionName, documents);

      // Store all memories in Neo4j for relationship tracking
      await this.storeMemoriesInNeo4j(memoryEntries);

      // Check if auto-summarization is needed
      await this.checkAndSummarize(threadId);

      this.logger.debug(
        `Stored ${memoryEntries.length} memory entries for thread ${threadId}`
      );
      return memoryEntries;
    } catch (error) {
      this.logger.error(
        `Failed to store batch memory entries for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentStorage(
        'storeBatch',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Retrieve memories by thread
   */
  public async retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]> {
    try {
      const results = await this.executeChromaDBOperation(
        async () =>
          this.chromaDBService.getDocuments(this.collectionName, {
            where: { threadId },
            limit: limit ?? 1000, // Default reasonable limit
            includeMetadata: true,
            includeDocuments: true,
            includeEmbeddings: true,
          }),
        'getDocuments',
        threadId
      );

      const memories = this.convertFromGetResults(results);

      // Sort by creation date (newest first)
      const sortedMemories = memories.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      // Update access count for retrieved memories
      const updatePromises = sortedMemories.map(async (memory) => {
        const updatedAccessCount = memory.accessCount + 1;
        const lastAccessedAt = new Date();

        await this.chromaDBService.updateDocuments(this.collectionName, [
          {
            id: memory.id,
            metadata: {
              ...this.convertMemoryToChromaMetadata(memory),
              accessCount: updatedAccessCount,
              lastAccessedAt: lastAccessedAt.toISOString(),
            },
          },
        ]);

        memory.accessCount = updatedAccessCount;
        memory.lastAccessedAt = lastAccessedAt;
      });

      await Promise.all(updatePromises);

      return sortedMemories;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve memories for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentRetrieval(
        'retrieve',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Search memories semantically
   */

  public async search(
    options: MemorySearchOptions
  ): Promise<readonly MemoryEntry[]> {
    try {
      const startTime = Date.now();

      // Build where clause for filtering
      const where: ChromaWhereClause = {};

      if (options.threadIds && options.threadIds.length > 0) {
        where.threadId =
          options.threadIds.length === 1
            ? options.threadIds[0]
            : { $in: [...options.threadIds] };
      }

      if (options.types && options.types.length > 0) {
        where.type =
          options.types.length === 1
            ? options.types[0]
            : { $in: [...options.types] };
      }

      // Handle date range filtering
      if (options.dateRange) {
        if (options.dateRange.from) {
          where.createdAt = { $gte: options.dateRange.from.toISOString() };
        }
        if (options.dateRange.to) {
          where.createdAt = {
            ...where.createdAt,
            $lte: options.dateRange.to.toISOString(),
          };
        }
      }

      let results: MemoryEntry[];

      // Perform semantic search if query is provided
      if (options.query && this.isSemanticSearchEnabled()) {
        try {
          const queryEmbeddings = await this.executeEmbeddingOperation(
            async () => this.embeddingService.embed([options.query!]),
            'generateQueryEmbedding'
          );
          const queryEmbedding = queryEmbeddings[0];

          const searchResults: ChromaSearchResult =
            await this.executeChromaDBOperation(
              async () =>
                this.chromaDBService.searchDocuments(
                  this.collectionName,
                  undefined,
                  [queryEmbedding],
                  {
                    nResults: options.limit ?? 10,
                    // Cast to Where (validated downstream)
                    where:
                      Object.keys(where).length > 0
                        ? (where as unknown as Where)
                        : undefined,
                    includeMetadata: true,
                    includeDocuments: true,
                    includeDistances: true,
                    includeEmbeddings: options.includeEmbeddings ?? false,
                  }
                ),
              'searchDocuments',
              options.threadIds?.[0],
              // Fallback to regular filtering if semantic search fails
              async () => {
                this.logger.warn(
                  'Semantic search failed, falling back to regular filtering'
                );
                const getResults = await this.chromaDBService.getDocuments(
                  this.collectionName,
                  {
                    where:
                      Object.keys(where).length > 0
                        ? (where as unknown as Where)
                        : undefined,
                    limit: options.limit ?? 1000,
                    includeMetadata: true,
                    includeDocuments: true,
                    includeEmbeddings: options.includeEmbeddings ?? false,
                  }
                );
                return this.convertFromGetResults(getResults);
              }
            );

          if (Array.isArray(searchResults)) {
            results = searchResults;
          } else {
            results = this.convertFromQueryResults(searchResults);
          }

          // Filter by minimum relevance if specified
          if (typeof options.minRelevance === 'number') {
            const min = options.minRelevance;
            results = results.filter(
              (memory) => (memory.relevanceScore ?? 0) >= min
            );
          }
        } catch (error) {
          this.logger.warn(
            'Semantic search failed completely, falling back to regular filtering',
            error
          );
          // Fallback to regular filtering
          const getResults = await this.executeChromaDBOperation(
            async () =>
              this.chromaDBService.getDocuments(this.collectionName, {
                where:
                  Object.keys(where).length > 0
                    ? (where as unknown as Where)
                    : undefined,
                limit: options.limit ?? 1000,
                includeMetadata: true,
                includeDocuments: true,
                includeEmbeddings: options.includeEmbeddings ?? false,
              }),
            'getDocuments',
            options.threadIds?.[0]
          );
          results = this.convertFromGetResults(getResults);
        }
      } else {
        // Regular filtering without semantic search
        const getResults = await this.executeChromaDBOperation(
          async () =>
            this.chromaDBService.getDocuments(this.collectionName, {
              where:
                Object.keys(where).length > 0
                  ? (where as unknown as Where)
                  : undefined,
              limit: options.limit ?? 1000,
              includeMetadata: true,
              includeDocuments: true,
              includeEmbeddings: options.includeEmbeddings ?? false,
            }),
          'getDocuments',
          options.threadIds?.[0]
        );

        results = this.convertFromGetResults(getResults);
      }

      // Filter by tags (post-processing since ChromaDB doesn't support complex tag queries)
      if (options.tags && options.tags.length > 0) {
        results = results.filter((memory) =>
          memory.metadata.tags?.some((tag) => options.tags?.includes(tag))
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
            comparison =
              (a.metadata.importance ?? 0) - (b.metadata.importance ?? 0);
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply final limit if not already applied
      if (options.limit && options.limit > 0 && !options.query) {
        results = results.slice(0, options.limit);
      }

      // Update search stats
      this.searchStats.searchCount++;
      this.searchStats.totalSearchTime += Date.now() - startTime;

      return results;
    } catch (error) {
      this.logger.error('Failed to search memories', error);
      const query = options.query ?? 'no query';
      throw MemoryStorageError.searchOperation(
        'search',
        query,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Summarize conversation history
   */
  public async summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    const strategy = options?.strategy ?? 'progressive';
    const maxMessages = options?.maxMessages ?? 50;

    this.searchStats.summarizationCount++;

    switch (strategy) {
      case 'batch':
        return Promise.resolve(this.batchSummarization(messages));
      case 'sliding-window':
        return Promise.resolve(
          this.slidingWindowSummarization(messages, maxMessages)
        );
      case 'progressive':
      default:
        return Promise.resolve(
          this.progressiveSummarization(messages, maxMessages)
        );
    }
  }

  /**
   * Delete memories
   */
  public async delete(
    threadId: string,
    memoryIds?: readonly string[]
  ): Promise<number> {
    try {
      let deletedCount = 0;

      if (memoryIds && memoryIds.length > 0) {
        // Delete specific memories from both ChromaDB and Neo4j
        await this.chromaDBService.deleteDocuments(this.collectionName, [
          ...memoryIds,
        ]);
        await this.deleteMemoriesFromNeo4j([...memoryIds]);
        deletedCount = memoryIds.length;
      } else {
        // Delete all memories for thread - first get them to count
        const results = await this.chromaDBService.getDocuments(
          this.collectionName,
          {
            where: { threadId },
            includeMetadata: false,
            includeDocuments: false,
          }
        );

        if (results.ids && results.ids.length > 0) {
          const idsField = (results as GetResult<ChromaMetadata>).ids;
          const idsToDelete: string[] = Array.isArray(idsField[0])
            ? (idsField[0] as string[])
            : (idsField as unknown as string[]);

          // Delete from both ChromaDB and Neo4j
          await this.chromaDBService.deleteDocuments(
            this.collectionName,
            idsToDelete
          );
          await this.deleteMemoriesFromNeo4j(idsToDelete);
          deletedCount = idsToDelete.length;
        }
      }

      this.logger.debug(
        `Deleted ${deletedCount} memories for thread ${threadId}`
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete memories for thread ${threadId}`,
        error
      );
      throw MemoryStorageError.documentStorage(
        'delete',
        threadId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Clear all memories for a thread
   */
  public async clear(threadId: string): Promise<void> {
    await this.delete(threadId);
  }

  /**
   * Get memory statistics
   */
  public async getStats(): Promise<MemoryStats> {
    try {
      // Get total document count from ChromaDB (typed)
      const totalMemories = await this.chromaDBService.countDocuments(
        this.collectionName
      );

      // Get unique thread count by querying all documents
      const allResults = await this.chromaDBService.getDocuments(
        this.collectionName,
        {
          includeMetadata: true,
          includeDocuments: false,
          limit: totalMemories, // Get all to count unique threads
        }
      );

      const uniqueThreads = new Set<string>();
      if (allResults.metadatas) {
        const metadatas = Array.isArray(allResults.metadatas[0])
          ? allResults.metadatas[0]
          : allResults.metadatas;
        for (const metadata of metadatas as ReadonlyArray<ChromaMetadata | null>) {
          const threadIdMeta = metadata?.threadId;
          if (typeof threadIdMeta === 'string' && threadIdMeta.length > 0) {
            uniqueThreads.add(threadIdMeta);
          }
        }
      }

      const activeThreads = uniqueThreads.size;

      // Estimate average memory size (rough calculation)
      const averageMemorySize = totalMemories > 0 ? 1024 : 0; // Rough estimate in bytes
      const totalStorageUsed = totalMemories * averageMemorySize;

      const averageSearchTime =
        this.searchStats.searchCount > 0
          ? this.searchStats.totalSearchTime / this.searchStats.searchCount
          : 0;

      const stats: MemoryStats = {
        totalMemories,
        activeThreads,
        averageMemorySize,
        totalStorageUsed,
        searchCount: this.searchStats.searchCount,
        averageSearchTime,
        summarizationCount: this.searchStats.summarizationCount,
        cacheHitRate: 0, // Not implemented yet
      };

      return stats;
    } catch (error) {
      this.logger.error('Failed to get memory statistics', error);
      throw MemoryStorageError.documentRetrieval(
        'getStats',
        'all',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Perform cleanup based on retention policy
   */
  public async cleanup(): Promise<number> {
    const maxAge = this.configService.get<number>('memory.retention.maxAge');
    const maxPerThread = this.configService.get<number>(
      'memory.retention.maxPerThread'
    );
    const maxTotal = this.configService.get<number>(
      'memory.retention.maxTotal'
    );
    const evictionStrategy = this.configService.get<string>(
      'memory.retention.evictionStrategy',
      'lru'
    );

    let cleanedCount = 0;

    cleanedCount += this.cleanupByAge(maxAge ?? 0);
    cleanedCount += this.cleanupPerThread(maxPerThread ?? 0, evictionStrategy);
    cleanedCount += this.cleanupTotal(maxTotal ?? 0, evictionStrategy);

    return Promise.resolve(cleanedCount);
  }

  // Extracted smaller helpers to satisfy lint rules
  private cleanupByAge(maxAge: number): number {
    if (!maxAge) {
      return 0;
    }
    let cleaned = 0;
    const cutoffTime = Date.now() - maxAge;
    for (const [threadId, memories] of this.memories.entries()) {
      const filtered: MemoryEntry[] = [];
      for (const memory of memories) {
        const shouldDelete = memory.createdAt.getTime() < cutoffTime;
        if (shouldDelete) {
          this.embeddings.delete(memory.id);
          cleaned++;
        } else {
          filtered.push(memory);
        }
      }
      this.memories.set(threadId, filtered);
    }
    return cleaned;
  }

  private cleanupPerThread(
    maxPerThread: number,
    evictionStrategy: string
  ): number {
    if (!maxPerThread) {
      return 0;
    }
    let cleaned = 0;
    for (const [threadId, memories] of this.memories.entries()) {
      if (memories.length > maxPerThread) {
        const sortedMemories = this.sortMemoriesForEviction(
          memories,
          evictionStrategy
        );
        const toDelete = sortedMemories.slice(maxPerThread);
        const toKeep = sortedMemories.slice(0, maxPerThread);
        for (const memory of toDelete) {
          this.embeddings.delete(memory.id);
          cleaned++;
        }
        this.memories.set(threadId, toKeep);
      }
    }
    return cleaned;
  }

  private cleanupTotal(maxTotal: number, evictionStrategy: string): number {
    if (!maxTotal) {
      return 0;
    }
    let cleaned = 0;
    const allMemories = Array.from(this.memories.values()).flat();
    if (allMemories.length <= maxTotal) {
      return 0;
    }
    const sortedMemories = this.sortMemoriesForEviction(
      allMemories,
      evictionStrategy
    );
    const toDelete = sortedMemories.slice(maxTotal);
    const toDeleteByThread = new Map<string, Set<string>>();
    for (const memory of toDelete) {
      let set = toDeleteByThread.get(memory.threadId);
      if (!set) {
        set = new Set<string>();
        toDeleteByThread.set(memory.threadId, set);
      }
      set.add(memory.id);
    }
    for (const [threadId, memoryIds] of toDeleteByThread.entries()) {
      const threadMemories = this.memories.get(threadId) ?? [];
      const filtered: MemoryEntry[] = [];
      for (const memory of threadMemories) {
        if (memoryIds.has(memory.id)) {
          this.embeddings.delete(memory.id);
          cleaned++;
        } else {
          filtered.push(memory);
        }
      }
      this.memories.set(threadId, filtered);
    }
    return cleaned;
  }

  /**
   * Convert ChromaDB GetResult to MemoryEntry array
   */
  private convertFromGetResults(
    results: GetResult<ChromaMetadata>
  ): MemoryEntry[] {
    const memories: MemoryEntry[] = [];

    const ids = (results.ids ?? []) as readonly string[];
    const documents = (results.documents ?? []) as ReadonlyArray<string | null>;
    const metadatas = (results.metadatas ??
      []) as ReadonlyArray<ChromaMetadata | null>;
    const embeddings = (results.embeddings ?? []) as ReadonlyArray<
      readonly number[] | null
    >;

    for (let i = 0; i < ids.length; i++) {
      const metadataRaw = metadatas[i] ?? null;
      const metadata =
        metadataRaw && typeof metadataRaw === 'object'
          ? metadataRaw
          : ({} as ChromaMetadata);
      const additionalMetadata = this.parseAdditionalMetadata(
        (metadata as Record<string, unknown>).additionalMetadata
      );

      const memory: MemoryEntry = {
        id: ids[i],
        threadId: String(metadata.threadId ?? ''),
        content: documents[i] ?? '',
        embedding: embeddings[i] ?? undefined,
        metadata: {
          type: (metadata.type as MemoryMetadata['type']) ?? 'conversation',
          source: (metadata.source as string | null) ?? undefined,
          tags:
            typeof metadata.tags === 'string'
              ? metadata.tags.split(',').filter(Boolean)
              : undefined,
          importance: (metadata.importance as number | null) ?? undefined,
          persistent: (metadata.persistent as boolean | null) ?? undefined,
          ...additionalMetadata,
        },
        createdAt: new Date(
          String(metadata.createdAt ?? new Date().toISOString())
        ),
        lastAccessedAt: metadata.lastAccessedAt
          ? new Date(String(metadata.lastAccessedAt))
          : undefined,
        accessCount: (metadata.accessCount as number | null) ?? 0,
      };

      memories.push(memory);
    }

    return memories;
  }

  /**
   * Convert ChromaDB QueryResult to MemoryEntry array
   */
  private convertFromQueryResults(results: ChromaSearchResult): MemoryEntry[] {
    const ids = results.ids?.[0] ?? [];
    const documents = results.documents?.[0] ?? [];
    const metadatas = (results.metadatas?.[0] ??
      []) as ReadonlyArray<ChromaMetadata | null>;
    const embeddings = results.embeddings?.[0] ?? [];
    const distances = results.distances?.[0] ?? [];

    const toEntry = (i: number): MemoryEntry => {
      const metadataRaw = metadatas[i] ?? null;
      const metadata =
        metadataRaw && typeof metadataRaw === 'object'
          ? metadataRaw
          : ({} as ChromaMetadata);
      const additionalMetadata = this.parseAdditionalMetadata(
        (metadata as Record<string, unknown>).additionalMetadata
      );
      return {
        id: ids[i] ?? '',
        threadId: String(metadata.threadId ?? ''),
        content: documents[i] ?? '',
        embedding: embeddings[i] ?? undefined,
        metadata: {
          type: (metadata.type as MemoryMetadata['type']) ?? 'conversation',
          source: (metadata.source as string | null) ?? undefined,
          tags:
            typeof metadata.tags === 'string'
              ? metadata.tags.split(',').filter(Boolean)
              : undefined,
          importance: (metadata.importance as number | null) ?? undefined,
          persistent: (metadata.persistent as boolean | null) ?? undefined,
          ...additionalMetadata,
        },
        createdAt: new Date(
          String(metadata.createdAt ?? new Date().toISOString())
        ),
        lastAccessedAt: metadata.lastAccessedAt
          ? new Date(String(metadata.lastAccessedAt))
          : undefined,
        accessCount: (metadata.accessCount as number | null) ?? 0,
        relevanceScore:
          distances[i] !== undefined ? 1 - Number(distances[i]) : undefined,
      };
    };

    return ids.map((_, i) => toEntry(i));
  }

  /**
   * Convert MemoryEntry to ChromaDB metadata format
   */
  private convertMemoryToChromaMetadata(
    memory: MemoryEntry
  ): Record<string, string | number | boolean | null> {
    return {
      threadId: memory.threadId,
      type: memory.metadata.type,
      source: memory.metadata.source ?? null,
      tags: memory.metadata.tags?.join(',') ?? '',
      importance: memory.metadata.importance ?? 0.5,
      persistent: memory.metadata.persistent ?? false,
      createdAt: memory.createdAt.toISOString(),
      accessCount: memory.accessCount,
      lastAccessedAt: memory.lastAccessedAt?.toISOString() ?? null,
      additionalMetadata: JSON.stringify(
        Object.fromEntries(
          Object.entries(memory.metadata).filter(
            ([key]) =>
              !['type', 'source', 'tags', 'importance', 'persistent'].includes(
                key
              )
          )
        )
      ),
    };
  }

  /**
   * Store memory entry in Neo4j for relationship tracking
   */
  private async storeMemoryInNeo4j(entry: MemoryEntry): Promise<void> {
    try {
      await this.neo4jService.write(async (session) => {
        // Create or update the memory node
        await session.run(
          `
          MERGE (m:Memory {id: $memoryId})
          SET m.threadId = $threadId,
              m.content = $content,
              m.type = $type,
              m.source = $source,
              m.importance = $importance,
              m.persistent = $persistent,
              m.createdAt = datetime($createdAt),
              m.accessCount = $accessCount,
              m.tags = $tags
        `,
          {
            memoryId: entry.id,
            threadId: entry.threadId,
            content: entry.content,
            type: entry.metadata.type,
            source: entry.metadata.source ?? null,
            importance: entry.metadata.importance ?? 0.5,
            persistent: entry.metadata.persistent ?? false,
            createdAt: entry.createdAt.toISOString(),
            accessCount: entry.accessCount,
            tags: entry.metadata.tags ?? [],
          }
        );

        // Create or update the thread node and relationship
        await session.run(
          `
          MERGE (t:Thread {id: $threadId})
          SET t.lastActiveAt = datetime($lastActiveAt)
        `,
          {
            threadId: entry.threadId,
            lastActiveAt: new Date().toISOString(),
          }
        );

        await session.run(
          `
          MATCH (t:Thread {id: $threadId})
          MATCH (m:Memory {id: $memoryId})
          MERGE (t)-[:HAS_MEMORY {createdAt: datetime($createdAt)}]->(m)
        `,
          {
            threadId: entry.threadId,
            memoryId: entry.id,
            createdAt: entry.createdAt.toISOString(),
          }
        );

        // Create type-specific relationships and labels
        await this.createTypeSpecificRelationships(session, entry);
      });
    } catch (error) {
      const neo4jError = MemoryRelationshipError.graphStorage(
        'storeMemoryInNeo4j',
        entry.threadId,
        entry.id,
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(
        `Failed to store memory ${entry.id} in Neo4j`,
        neo4jError.toJSON()
      );
      // Don't throw - Neo4j failures shouldn't prevent ChromaDB storage
    }
  }

  /**
   * Create type-specific relationships and labels in Neo4j
   */
  private async createTypeSpecificRelationships(
    session: any,
    entry: MemoryEntry
  ): Promise<void> {
    switch (entry.metadata.type) {
      case 'summary':
        // Add Summary label and create relationships to summarized memories
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          SET m:Summary
        `,
          { memoryId: entry.id }
        );

        // Link to memories from the same thread that were created before this summary
        await session.run(
          `
          MATCH (summary:Memory {id: $memoryId})
          MATCH (source:Memory {threadId: $threadId})
          WHERE source.createdAt < summary.createdAt
            AND source.type <> 'summary'
            AND NOT (summary)-[:SUMMARIZES]->(source)
          MERGE (summary)-[:SUMMARIZES]->(source)
        `,
          {
            memoryId: entry.id,
            threadId: entry.threadId,
          }
        );
        break;

      case 'fact':
        // Add Fact label for easier querying
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          SET m:Fact
        `,
          { memoryId: entry.id }
        );
        break;

      case 'context':
        // Add Context label for easier querying
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          SET m:Context
        `,
          { memoryId: entry.id }
        );
        break;

      case 'preference':
        // Create preference relationship to thread
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          MATCH (t:Thread {id: $threadId})
          MERGE (t)-[:HAS_PREFERENCE]->(m)
        `,
          {
            memoryId: entry.id,
            threadId: entry.threadId,
          }
        );
        break;

      case 'conversation': {
        throw new Error('Not implemented yet: "conversation" case');
      }
      case 'custom': {
        throw new Error('Not implemented yet: "custom" case');
      }
      default:
        // For conversation and custom types, create temporal relationships
        await this.createTemporalRelationships(session, entry);
        break;
    }
  }

  /**
   * Create temporal relationships between memories in the same thread
   */
  private async createTemporalRelationships(
    session: Session,
    entry: MemoryEntry
  ): Promise<void> {
    // Link to the previous memory in the same thread
    await session.run(
      `
      MATCH (current:Memory {id: $memoryId})
      MATCH (previous:Memory {threadId: $threadId})
      WHERE previous.createdAt < current.createdAt
        AND NOT (previous)-[:FOLLOWED_BY]->()
      WITH previous
      ORDER BY previous.createdAt DESC
      LIMIT 1
      MERGE (previous)-[:FOLLOWED_BY]->(current)
    `,
      {
        memoryId: entry.id,
        threadId: entry.threadId,
      }
    );
  }

  /**
   * Store multiple memory entries in Neo4j
   */
  private async storeMemoriesInNeo4j(entries: MemoryEntry[]): Promise<void> {
    try {
      await this.neo4jService.write(async (session) => {
        for (const entry of entries) {
          // Create memory node
          await session.run(
            `
            MERGE (m:Memory {id: $memoryId})
            SET m.threadId = $threadId,
                m.content = $content,
                m.type = $type,
                m.source = $source,
                m.importance = $importance,
                m.persistent = $persistent,
                m.createdAt = datetime($createdAt),
                m.accessCount = $accessCount,
                m.tags = $tags
          `,
            {
              memoryId: entry.id,
              threadId: entry.threadId,
              content: entry.content,
              type: entry.metadata.type,
              source: entry.metadata.source ?? null,
              importance: entry.metadata.importance ?? 0.5,
              persistent: entry.metadata.persistent ?? false,
              createdAt: entry.createdAt.toISOString(),
              accessCount: entry.accessCount,
              tags: entry.metadata.tags ?? [],
            }
          );

          // Create thread relationship
          await session.run(
            `
            MERGE (t:Thread {id: $threadId})
            SET t.lastActiveAt = datetime($lastActiveAt)
          `,
            {
              threadId: entry.threadId,
              lastActiveAt: new Date().toISOString(),
            }
          );

          await session.run(
            `
            MATCH (t:Thread {id: $threadId})
            MATCH (m:Memory {id: $memoryId})
            MERGE (t)-[:HAS_MEMORY {createdAt: datetime($createdAt)}]->(m)
          `,
            {
              threadId: entry.threadId,
              memoryId: entry.id,
              createdAt: entry.createdAt.toISOString(),
            }
          );

          // Create type-specific relationships
          await this.createTypeSpecificRelationships(session, entry);
        }
      });
    } catch (error) {
      const neo4jError = MemoryRelationshipError.graphStorage(
        'storeMemoriesInNeo4j',
        entries[0]?.threadId ?? 'unknown',
        'batch',
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(
        'Failed to store batch memories in Neo4j',
        neo4jError.toJSON()
      );
      // Don't throw - Neo4j failures shouldn't prevent ChromaDB storage
    }
  }

  /**
   * Delete memories from Neo4j
   */
  private async deleteMemoriesFromNeo4j(memoryIds: string[]): Promise<void> {
    try {
      await this.neo4jService.write(async (session) => {
        // Delete memory nodes and their relationships
        await session.run(
          `
          UNWIND $ids as memoryId
          MATCH (m:Memory {id: memoryId})
          DETACH DELETE m
        `,
          { ids: memoryIds }
        );

        // Clean up orphaned threads (threads with no memories)
        await session.run(`
          MATCH (t:Thread)
          WHERE NOT (t)-[:HAS_MEMORY]->()
          DELETE t
        `);
      });
    } catch (error) {
      const neo4jError = MemoryRelationshipError.relationshipQuery(
        'deleteMemoriesFromNeo4j',
        'unknown',
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(
        'Failed to delete memories from Neo4j',
        neo4jError.toJSON()
      );
      // Don't throw - Neo4j failures shouldn't prevent ChromaDB deletion
    }
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    service: 'chromadb' | 'neo4j' | 'embedding',
    threadId?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          MemoryTimeoutError.operationTimeout(
            operationName,
            service,
            timeoutMs,
            threadId
          )
        );
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute ChromaDB operation with fallback
   */
  private async executeChromaDBOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    threadId?: string,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const timeout = this.configService.get<number>(
      'memory.timeout.chromadb',
      30000
    );

    try {
      return await this.withTimeout(
        operation,
        timeout,
        operationName,
        'chromadb',
        threadId
      );
    } catch (error) {
      this.logger.error(`ChromaDB operation ${operationName} failed`, error);

      if (fallback) {
        this.logger.warn(`Attempting fallback for ${operationName}`);
        try {
          return await fallback();
        } catch (fallbackError) {
          this.logger.error(
            `Fallback for ${operationName} also failed`,
            fallbackError
          );
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Execute Neo4j operation with graceful degradation
   */
  private async executeNeo4jOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    threadId?: string,
    defaultValue?: T
  ): Promise<T | undefined> {
    const timeout = this.configService.get<number>(
      'memory.timeout.neo4j',
      15000
    );

    try {
      return await this.withTimeout(
        operation,
        timeout,
        operationName,
        'neo4j',
        threadId
      );
    } catch (error) {
      const neo4jError = wrapMemoryError(error, operationName, 'neo4j', {
        threadId,
      });
      this.logger.error(
        `Neo4j operation ${operationName} failed, continuing without graph features`,
        neo4jError.toJSON()
      );

      return defaultValue;
    }
  }

  /**
   * Execute embedding operation with retry
   */
  private async executeEmbeddingOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = 3
  ): Promise<T> {
    const timeout = this.configService.get<number>(
      'memory.timeout.embedding',
      20000
    );
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.withTimeout(
          operation,
          timeout,
          operationName,
          'embedding'
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          this.logger.warn(
            `Embedding operation ${operationName} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms`,
            lastError
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw MemoryEmbeddingError.embeddingGeneration(
      operationName,
      1,
      lastError!
    );
  }

  /**
   * Check if semantic search is enabled
   */
  private isSemanticSearchEnabled(): boolean {
    return this.configService.get<boolean>(
      'memory.enableSemanticSearch',
      false
    );
  }

  // Removed legacy vector helpers; real embeddings come from EmbeddingService

  /**
   * Check and perform auto-summarization if needed
   */
  private async checkAndSummarize(threadId: string): Promise<void> {
    const enableAutoSummarization = this.configService.get<boolean>(
      'memory.enableAutoSummarization',
      false
    );
    if (!enableAutoSummarization) {
      return;
    }

    const threadMemories = this.memories.get(threadId) ?? [];
    const maxMessages = this.configService.get<number>(
      'memory.summarization.maxMessages',
      100
    );

    if (threadMemories.length > maxMessages) {
      // Convert memories to messages for summarization
      const messages: BaseMessage[] = threadMemories.map((memory) => ({
        content: memory.content,
        additional_kwargs: {},
        response_metadata: {},
      })) as BaseMessage[];

      const summary = await this.summarize(threadId, messages);

      // Store summary as a new memory entry
      await this.store(threadId, summary, {
        type: 'summary',
        source: 'system',
        importance: 0.9,
        persistent: true,
      });
    }
  }

  /**
   * Progressive summarization strategy
   */
  private progressiveSummarization(
    messages: readonly BaseMessage[],
    maxMessages: number
  ): string {
    if (messages.length <= maxMessages) {
      return this.createSimpleSummary(messages);
    }

    const chunks: string[] = [];
    for (let i = 0; i < messages.length; i += maxMessages) {
      const chunk = messages.slice(i, i + maxMessages);
      chunks.push(this.createSimpleSummary(chunk));
    }

    return chunks.join('\n\n');
  }

  /**
   * Batch summarization strategy
   */
  private batchSummarization(messages: readonly BaseMessage[]): string {
    return this.createSimpleSummary(messages);
  }

  /**
   * Sliding window summarization strategy
   */
  private slidingWindowSummarization(
    messages: readonly BaseMessage[],
    windowSize: number
  ): string {
    if (messages.length <= windowSize) {
      return this.createSimpleSummary(messages);
    }

    const recentMessages = messages.slice(-windowSize);
    const olderMessages = messages.slice(0, -windowSize);

    return `Previous: ${this.createSimpleSummary(
      olderMessages
    )}\nRecent: ${this.createSimpleSummary(recentMessages)}`;
  }

  /**
   * Create an intelligent summary from messages
   */
  private createSimpleSummary(messages: readonly BaseMessage[]): string {
    if (messages.length === 0) {
      return 'No messages to summarize.';
    }

    // Extract key information from messages
    const messageTexts = messages.map((msg) => {
      let label = '';
      if (this.isHumanMessage(msg)) {
        label = 'User: ';
      } else if (this.isAIMessage(msg)) {
        label = 'Assistant: ';
      }
      return `${label}${String(msg.content as unknown as string)}`;
    });

    // Analyze message patterns and content
    const userMessages = messages.filter((msg) => this.isHumanMessage(msg));
    const aiMessages = messages.filter((msg) => this.isAIMessage(msg));

    // Extract key topics and themes
    const allText = messageTexts.join(' ').toLowerCase();
    const words = allText.split(/\s+/).filter((word) => word.length > 3);
    const wordFreq = new Map<string, number>();

    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    });

    // Get most frequent meaningful words
    const keyTopics = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Create structured summary
    const summary = [
      `Conversation Summary (${messages.length} messages):`,
      `- ${userMessages.length} user messages, ${aiMessages.length} assistant responses`,
      keyTopics.length > 0 ? `- Key topics: ${keyTopics.join(', ')}` : '',
      `- Recent context: ${messageTexts.slice(-2).join(' | ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    return summary;
  }

  /**
   * Sort memories for eviction based on strategy
   */
  private sortMemoriesForEviction(
    memories: MemoryEntry[],
    strategy: string
  ): MemoryEntry[] {
    const sorted = [...memories];

    switch (strategy) {
      case 'lru': // Least Recently Used
        return sorted.sort((a, b) => {
          const aTime = a.lastAccessedAt?.getTime() ?? a.createdAt.getTime();
          const bTime = b.lastAccessedAt?.getTime() ?? b.createdAt.getTime();
          return aTime - bTime;
        });
      case 'lfu': // Least Frequently Used
        return sorted.sort((a, b) => a.accessCount - b.accessCount);
      case 'fifo': // First In, First Out
        return sorted.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
      case 'importance': // Lowest importance first
        return sorted.sort(
          (a, b) => (a.metadata.importance ?? 0) - (b.metadata.importance ?? 0)
        );
      default:
        return sorted;
    }
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

      this.logger.log(
        `Memory cleanup scheduler started (interval: ${interval}ms)`
      );
    }
  }

  /**
   * Type guard for HumanMessage
   */
  private isHumanMessage(msg: BaseMessage): msg is HumanMessage {
    return msg.constructor.name === 'HumanMessage';
  }

  /**
   * Type guard for AIMessage
   */
  private isAIMessage(msg: BaseMessage): msg is AIMessage {
    return msg.constructor.name === 'AIMessage';
  }
}
