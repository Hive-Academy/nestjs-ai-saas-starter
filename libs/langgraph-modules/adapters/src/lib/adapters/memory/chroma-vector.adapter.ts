import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IVectorService,
  VectorStoreData,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStats,
  VectorGetOptions,
  VectorGetResult,
  VectorOperationError,
  InvalidInputError,
  AgentState,
  AgentMemoryContext,
  MemoryEntry,
  MemoryMetadata,
} from '@hive-academy/langgraph-memory';
import { ChromaLangGraphStore } from '@hive-academy/langgraph-memory';
import {
  getRepositoryToken as getChromaRepositoryToken,
  Where,
} from '@hive-academy/nestjs-chromadb';
import {
  VectorMemoryEntity,
  VectorMemoryMetadata,
} from '../../entities/chromadb/vector-memory.entity';
import { VectorMemoryRepository } from '../../repositories/chromadb/vector-memory.repository';
import { LangGraphStoreEntity } from '../../entities/chromadb/langgraph-store.entity';
import { LangGraphStoreRepository } from '../../repositories/chromadb/langgraph-store.repository';

/**
 * Application-specific ChromaDB adapter for the Memory module.
 *
 * ARCHITECTURE: TypeORM-Style Repository Pattern (CLEAN - matches Neo4j pattern)
 * -------------------------------------------------------------------------------
 * This adapter uses TWO repositories for collection separation:
 * - VectorMemoryRepository → 'vector-memories' collection (Memory operations)
 * - LangGraphStoreRepository → 'langgraph-stores' collection (Store operations)
 *
 * Pattern Benefits:
 * - Uses @Inject(getChromaRepositoryToken(Entity)) for clean DI
 * - Entity-based registration ensures proper collection initialization
 * - Automatic embedding function injection via entity decorator
 * - Type-safe operations with distinct entity types
 * - Inherits 15+ CRUD methods from ChromaDBRepository<T>
 * - NO low-level ChromaDBService exposure (kept inside library)
 * - Collection separation prevents data mixing
 *
 * Repository Routing:
 * - Memory operations → vectorMemoryRepo → 'vector-memories'
 * - Store operations → langGraphStoreRepo → 'langgraph-stores'
 */
@Injectable()
export class ChromaVectorAdapter extends IVectorService {
  private readonly logger = new Logger(ChromaVectorAdapter.name);

  private collectionsInitialized = false;

  constructor(
    @Inject(getChromaRepositoryToken(VectorMemoryEntity))
    private readonly vectorMemoryRepo: VectorMemoryRepository,

    @Inject(getChromaRepositoryToken(LangGraphStoreEntity))
    private readonly langGraphStoreRepo: LangGraphStoreRepository
  ) {
    super();
    this.logger.debug(
      'ChromaVectorAdapter initialized with VectorMemoryRepository + LangGraphStoreRepository (dual-collection pattern)'
    );

    // Proactively initialize collections on startup (async fire-and-forget)
    this.initializeCollections().catch((err) => {
      this.logger.error(
        'Failed to initialize ChromaDB collections on startup',
        err
      );
    });
  }

  /**
   * Proactively initialize collections on startup
   * Prevents first-write collection creation delay
   */
  private async initializeCollections(): Promise<void> {
    try {
      await this.ensureCollectionsInitialized();
      this.logger.log(
        '✅ ChromaDB collections pre-created and ready for operations'
      );
    } catch (error) {
      this.logger.warn(
        'Collection initialization failed - will retry on first operation:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Ensure ChromaDB collections are initialized
   * This prevents "resource not found" errors on first query
   *
   * Called automatically on first operation (lazy initialization)
   */
  private async ensureCollectionsInitialized(): Promise<void> {
    if (this.collectionsInitialized) {
      return;
    }

    try {
      // Repositories handle collection creation automatically via entity decorators
      // This is a verification step to ensure collections are accessible
      await Promise.all([
        this.vectorMemoryRepo.getCollectionInfo(),
        this.langGraphStoreRepo.getCollectionInfo(),
      ]);

      this.collectionsInitialized = true;
      this.logger.log(
        'ChromaDB collections verified: vector-memories, langgraph-stores'
      );
    } catch (error) {
      this.logger.warn(
        'Failed to verify ChromaDB collections - they will be created on first write:',
        error instanceof Error ? error.message : String(error)
      );
      // Mark as initialized anyway - repositories will create on first write
      this.collectionsInitialized = true;
    }
  }

  /**
   * Store a single document using VectorMemoryRepository
   * Collection is bound to 'vector-memories' via entity decorator
   */
  override async store(
    collection: string, // Ignored - using repository's bound collection
    data: VectorStoreData
  ): Promise<string> {
    // Ensure collections exist before write operation (prevents first-write timeout)
    await this.ensureCollectionsInitialized();

    try {
      const defaultState: AgentState = {
        messages: [],
        threadId: 'unknown',
        userId: 'system',
        current: 'default',
      };

      const metadataOrState = data.metadata
        ? (data.metadata as unknown as AgentState)
        : defaultState;

      const metadata: VectorMemoryMetadata = {
        agentId: (data.metadata?.agentId as string) || 'default',
        threadId: (data.metadata?.threadId as string) || 'unknown',
        userId: (data.metadata?.userId as string) || 'system',
        importance: this.calculateImportance(data.document, metadataOrState),
        classification: this.classifyMemory(data.document, metadataOrState),
        timestamp: new Date().toISOString(),
        ...data.metadata,
      };

      // Use repository (collection bound at instantiation)
      const entity = await this.vectorMemoryRepo.create({
        id: data.id,
        content: data.document,
        embedding: data.embedding ? [...data.embedding] : undefined,
        metadata,
      });

      this.logger.debug(
        `Stored document ${entity.id} via VectorMemoryRepository`
      );
      return entity.id;
    } catch (error) {
      this.logger.error(
        `Failed to store document via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError('Failed to store document', 'store', {
        collection: 'vector-memories',
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Store multiple documents in batch using VectorMemoryRepository.createMany
   */
  override async storeBatch(
    collection: string, // Ignored - using repository's bound collection
    data: readonly VectorStoreData[]
  ): Promise<readonly string[]> {
    if (data.length === 0) {
      return [];
    }

    // Ensure collections exist before batch write operation (prevents first-write timeout)
    await this.ensureCollectionsInitialized();

    try {
      const defaultState: AgentState = {
        messages: [],
        threadId: 'unknown',
        userId: 'system',
        current: 'default',
      };

      const documents = data.map((item) => {
        const metadataOrState = item.metadata
          ? (item.metadata as unknown as AgentState)
          : defaultState;

        return {
          id: item.id, // Repository generates ID if not provided (crypto.randomUUID)
          content: item.document,
          embedding: item.embedding ? [...item.embedding] : undefined,
          metadata: {
            agentId: (item.metadata?.agentId as string) || 'default',
            threadId: (item.metadata?.threadId as string) || 'unknown',
            userId: (item.metadata?.userId as string) || 'system',
            importance: this.calculateImportance(
              item.document,
              metadataOrState
            ),
            classification: this.classifyMemory(item.document, metadataOrState),
            timestamp: new Date().toISOString(),
            ...item.metadata,
          } as VectorMemoryMetadata,
        };
      });

      // Use repository.createMany instead of chromaDB.addDocuments
      const result = await this.vectorMemoryRepo.createMany(documents);

      this.logger.debug(
        `Batch stored ${result.successCount} documents via VectorMemoryRepository`
      );

      return result.success.map((doc) => doc.id);
    } catch (error) {
      this.logger.error(
        `Failed to batch store documents via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError(
        'Failed to batch store documents',
        'storeBatch',
        {
          collection: 'vector-memories',
          count: data.length,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Search for similar documents using VectorMemoryRepository
   */
  override async search(
    collection: string, // Ignored - using repository's bound collection
    query: VectorSearchQuery
  ): Promise<readonly VectorSearchResult[]> {
    // ✅ FIXED: Ensure collections exist before query
    await this.ensureCollectionsInitialized();

    if (!query.queryText && !query.queryEmbedding) {
      throw new InvalidInputError(
        'Either queryText or queryEmbedding must be provided'
      );
    }

    try {
      // Text-based search
      if (query.queryText) {
        const entities = await this.vectorMemoryRepo.searchWithScores(
          query.queryText,
          {
            limit: query.limit || 10,
            where: query.filter as Where,
          }
        );

        const searchResults: VectorSearchResult[] = entities
          .filter((result) => {
            // Apply minScore filter if provided
            return !query.minScore || result.score >= query.minScore;
          })
          .map((result) => ({
            id: result.document.id,
            document: result.document.content,
            metadata: result.document.metadata as Record<string, unknown>,
            distance: result.distance || 0,
            relevanceScore: result.score,
          }));

        this.logger.debug(
          `Found ${searchResults.length} similar documents via VectorMemoryRepository (text search)`
        );

        return searchResults;
      }

      // Embedding-based search
      if (query.queryEmbedding) {
        const entities = await this.vectorMemoryRepo.searchSimilar(
          query.queryEmbedding as number[],
          {
            limit: query.limit || 10,
            where: query.filter as Where,
          }
        );

        const searchResults: VectorSearchResult[] = entities
          .filter((entity) => {
            // Apply minScore filter if provided (use distance for embedding search)
            if (query.minScore && entity.embedding) {
              const distance = this.calculateDistance(
                query.queryEmbedding!,
                entity.embedding
              );
              return distance <= query.minScore;
            }
            return true;
          })
          .map((entity) => {
            const distance = entity.embedding
              ? this.calculateDistance(query.queryEmbedding!, entity.embedding)
              : 0;

            return {
              id: entity.id,
              document: entity.content,
              metadata: entity.metadata as Record<string, unknown>,
              distance,
              relevanceScore: 1 - distance,
            };
          });

        this.logger.debug(
          `Found ${searchResults.length} similar documents via VectorMemoryRepository (embedding search)`
        );

        return searchResults;
      }

      return [];
    } catch (error) {
      this.logger.error(
        `Failed to search documents via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError('Failed to search documents', 'search', {
        collection: 'vector-memories',
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Delete documents by IDs using VectorMemoryRepository
   */
  override async delete(
    collection: string, // Ignored - using repository's bound collection
    ids: readonly string[]
  ): Promise<void> {
    this.validateIds(ids);

    try {
      await this.vectorMemoryRepo.deleteMany([...ids]);

      this.logger.debug(
        `Deleted ${ids.length} documents via VectorMemoryRepository`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete documents via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError('Failed to delete documents', 'delete', {
        collection: 'vector-memories',
        ids: [...ids],
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Delete documents by filter criteria using VectorMemoryRepository
   */
  override async deleteByFilter(
    collection: string, // Ignored - using repository's bound collection
    filter: Record<string, unknown>
  ): Promise<number> {
    if (!filter || Object.keys(filter).length === 0) {
      throw new InvalidInputError('Filter criteria are required for deletion');
    }

    try {
      // Get count before deletion
      const countBefore = await this.vectorMemoryRepo.count(filter as Where);

      // Delete using filter
      const result = await this.vectorMemoryRepo.deleteByFilter(
        filter as Where
      );

      const deletedCount = result.successCount || 0;

      this.logger.debug(
        `Deleted ${deletedCount} from ${countBefore} documents by filter via VectorMemoryRepository`
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete documents by filter via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError(
        'Failed to delete documents by filter',
        'deleteByFilter',
        {
          collection: 'vector-memories',
          filter,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Get collection statistics using VectorMemoryRepository
   */
  override async getStats(collection: string): Promise<VectorStats> {
    try {
      const count = await this.vectorMemoryRepo.count();
      const collectionInfo = await this.vectorMemoryRepo.getCollectionInfo();

      return {
        documentCount: count,
        collectionSize: 0, // Not directly available from ChromaDB
        lastUpdated: new Date(),
        dimensions: collectionInfo.metadata?.dimensions as number | undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stats via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError(
        'Failed to get collection statistics',
        'getStats',
        {
          collection: 'vector-memories',
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Get documents with optional filtering using VectorMemoryRepository
   */
  override async getDocuments(
    collection: string, // Ignored - using repository's bound collection
    options: VectorGetOptions = {}
  ): Promise<VectorGetResult> {
    try {
      let entities: VectorMemoryEntity[];

      // Get by IDs if provided
      if (options.ids && options.ids.length > 0) {
        entities = await this.vectorMemoryRepo.findByIds([...options.ids]);
      }
      // Get by filter if provided
      else if (options.where) {
        entities = await this.vectorMemoryRepo.findAll({
          where: options.where as Where,
          limit: options.limit,
        });
      }
      // Get all with pagination
      else {
        entities = await this.vectorMemoryRepo.findAll({
          limit: options.limit,
        });
      }

      // Apply offset if provided (client-side pagination)
      if (options.offset) {
        entities = entities.slice(options.offset);
      }

      this.logger.debug(
        `Retrieved ${entities.length} documents via VectorMemoryRepository`
      );

      return {
        ids: entities.map((e) => e.id),
        documents:
          options.includeDocuments !== false
            ? entities.map((e) => e.content)
            : undefined,
        metadatas:
          options.includeMetadata !== false
            ? entities.map((e) => e.metadata as Record<string, unknown>)
            : undefined,
        embeddings: options.includeEmbeddings
          ? entities.map((e) => (e.embedding ? [...e.embedding] : []))
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get documents via VectorMemoryRepository`,
        error
      );
      throw new VectorOperationError(
        'Failed to get documents',
        'getDocuments',
        {
          collection: 'vector-memories',
          options,
          error: this.serializeError(error),
        }
      );
    }
  }

  /**
   * Validate collection name (kept for interface compatibility, but collection is bound)
   */
  protected override validateCollection(collection: string): void {
    if (!collection || collection.trim().length === 0) {
      throw new InvalidInputError('Collection name is required');
    }
  }

  /**
   * Validate document IDs
   */
  protected override validateIds(ids: readonly string[]): void {
    if (ids.length === 0) {
      throw new InvalidInputError('At least one ID must be provided');
    }
  }

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

  /**
   * Calculate Euclidean distance between two vectors
   */
  private calculateDistance(
    embedding1: readonly number[],
    embedding2: readonly number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      return 1.0; // Maximum distance if dimensions don't match
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  // ============================================================================
  // Agent-Specific Business Logic
  // ============================================================================

  /**
   * Store agent memory with state-aware metadata
   */
  async storeAgentMemory(
    collection: string, // Ignored - using repository's bound collection
    agentId: string,
    state: AgentState,
    memory: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const importance = this.calculateImportance(memory, state);
    const classification = this.classifyMemory(memory, state);

    const agentMetadata = {
      agentId,
      threadId: state.threadId,
      userId: state.userId,
      importance,
      classification,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    return await this.store(collection, {
      document: memory,
      metadata: agentMetadata,
    });
  }

  /**
   * Multi-faceted agent memory search (thread, user, agent context)
   */
  async searchAgentMemories(
    collection: string, // Ignored - using repository's bound collection
    query: string,
    state: AgentState,
    limit = 10
  ): Promise<AgentMemoryContext> {
    // Parallel queries for performance
    const [threadResults, userResults, agentResults] = await Promise.all([
      this.search(collection, {
        queryText: query,
        filter: { threadId: state.threadId },
        limit: Math.floor(limit / 3),
      }),
      this.search(collection, {
        queryText: query,
        filter: { userId: state.userId },
        limit: Math.floor(limit / 3),
      }),
      state.current
        ? this.search(collection, {
            queryText: query,
            filter: { agentId: state.current },
            limit: Math.floor(limit / 3),
          })
        : [],
    ]);

    const threadMemories = this.transformToMemoryEntries(threadResults);
    const userMemories = this.transformToMemoryEntries(userResults);
    const agentMemories = this.transformToMemoryEntries(agentResults);

    return {
      threadMemories,
      userMemories,
      agentMemories,
      userPatterns: await this.extractUserPatterns(userMemories),
      relevanceScore: this.calculateRelevanceScore(
        threadResults,
        userResults,
        agentResults
      ),
      contextWindow: limit,
    };
  }

  /**
   * Get LangGraph Store interface for this adapter
   */
  getLangGraphStore(collection = 'langgraph_store'): ChromaLangGraphStore {
    return new ChromaLangGraphStore(this, collection);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private classifyMemory(memory: string, state: AgentState): string {
    if (memory.includes('error') || memory.includes('failed')) return 'error';
    if (memory.includes('success') || memory.includes('completed'))
      return 'success';
    if (state.messages && state.messages.length > 0) return 'conversation';
    return 'general';
  }

  private calculateImportance(memory: string, state: AgentState): number {
    let score = 0.5; // Base importance

    // Boost for errors/successes
    if (memory.includes('error')) score += 0.3;
    if (memory.includes('success')) score += 0.2;

    // Boost for longer memories (more content)
    if (memory.length > 200) score += 0.1;

    // Boost for recent interactions
    if (state.messages && state.messages.length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  private calculateRelevanceScore(
    threadResults: readonly VectorSearchResult[],
    userResults: readonly VectorSearchResult[],
    agentResults: readonly VectorSearchResult[]
  ): number {
    const threadScore = threadResults.length > 0 ? 0.4 : 0;
    const userScore = userResults.length > 0 ? 0.3 : 0;
    const agentScore = agentResults.length > 0 ? 0.3 : 0;

    return threadScore + userScore + agentScore;
  }

  private transformToMemoryEntries(
    results: readonly VectorSearchResult[]
  ): MemoryEntry[] {
    return results.map((result) => ({
      id: result.id,
      threadId: (result.metadata?.threadId as string) || 'unknown',
      content: result.document,
      metadata: {
        type: (result.metadata?.type as any) || 'conversation',
        source: result.metadata?.source as string,
        tags: result.metadata?.tags as string,
        importance: (result.metadata?.importance as number) || 0.5,
        persistent: result.metadata?.persistent as boolean,
        userId: result.metadata?.userId as string,
        timestamp: result.metadata?.timestamp as string,
        ...result.metadata,
      },
      createdAt: new Date((result.metadata?.timestamp as string) || Date.now()),
      lastAccessedAt: new Date(),
      accessCount: (result.metadata?.accessCount as number) || 1,
      relevanceScore: result.relevanceScore,
    }));
  }

  private async extractUserPatterns(userMemories: MemoryEntry[]): Promise<any> {
    // Analyze user memories for patterns
    const patterns = {
      commonTopics: [],
      interactionFrequency: userMemories.length,
      averageImportance:
        userMemories.reduce(
          (sum, m) => sum + ((m.metadata.importance as number) || 0.5),
          0
        ) / userMemories.length || 0,
    };

    return patterns;
  }

  // Note: generateId() is now handled by VectorMemoryRepository
  // Repository uses crypto.randomUUID() with fallback (inherited from ChromaDBRepository)

  // ============================================================================
  // Memory Business Logic Methods - Pure Delegation to Repository
  // ============================================================================

  /**
   * Store a single memory entry - delegates to repository
   */
  async storeMemory(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    return await this.vectorMemoryRepo.storeMemory(
      threadId,
      content,
      metadata,
      userId
    );
  }

  /**
   * Store multiple memory entries in batch - delegates to repository
   */
  async storeMemoriesBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>,
    userId?: string
  ): Promise<MemoryEntry[]> {
    return await this.vectorMemoryRepo.storeMemoriesBatch(
      threadId,
      entries,
      userId
    );
  }

  /**
   * Retrieve memories by thread ID - delegates to repository
   */
  async retrieveByThread(
    threadId: string,
    limit = 100
  ): Promise<MemoryEntry[]> {
    return await this.vectorMemoryRepo.retrieveByThread(threadId, limit);
  }

  /**
   * Search for similar memories using semantic search - delegates to repository
   */
  async searchMemoriesSimilar(
    query: string,
    filter: Record<string, unknown> = {},
    limit = 10
  ): Promise<MemoryEntry[]> {
    return await this.vectorMemoryRepo.searchMemoriesSimilar(
      query,
      filter,
      limit
    );
  }

  /**
   * Delete memories by IDs - delegates to repository
   */
  async deleteMemories(memoryIds: readonly string[]): Promise<number> {
    return await this.vectorMemoryRepo.deleteMemories(memoryIds);
  }

  /**
   * Clear all memories for a thread - delegates to repository
   */
  async clearThread(threadId: string): Promise<void> {
    return await this.vectorMemoryRepo.clearThread(threadId);
  }

  /**
   * Get memory count for a thread - delegates to repository
   */
  async getThreadCount(threadId: string): Promise<number> {
    return await this.vectorMemoryRepo.getThreadCount(threadId);
  }

  /**
   * Get vector storage statistics - delegates to repository
   */
  async getVectorStats(): Promise<{
    totalMemories: number;
    averageSize: number;
    totalStorageUsed: number;
  }> {
    return await this.vectorMemoryRepo.getVectorStats();
  }

  /**
   * Get operation metrics - delegates to repository
   */
  async getOperationMetrics(): Promise<{
    searchCount: number;
    averageSearchTime: number;
    summarizationCount: number;
    cacheHitRate: number;
  }> {
    return await this.vectorMemoryRepo.getOperationMetrics();
  }

  /**
   * Build vector-based semantic relationships between memories
   *
   * Uses vector similarity search to find related memories and returns
   * pairs with their similarity scores. These can then be used by the
   * graph service to create actual relationship edges.
   */
  async buildVectorBasedRelationships(
    maxRelationships: number,
    similarityThreshold: number,
    countLimit: number
  ): Promise<
    ReadonlyArray<{
      fromMemoryId: string;
      toMemoryId: string;
      similarityScore: number;
    }>
  > {
    try {
      // Get all memories (limited by countLimit)
      const allMemories = await this.vectorMemoryRepo.findAll({
        limit: countLimit,
      });

      if (allMemories.length === 0) {
        this.logger.debug('No memories found for relationship building');
        return [];
      }

      this.logger.debug(
        `Building vector-based relationships for ${allMemories.length} memories ` +
          `(max: ${maxRelationships} per memory, threshold: ${similarityThreshold})`
      );

      const relationships: Array<{
        fromMemoryId: string;
        toMemoryId: string;
        similarityScore: number;
      }> = [];

      // For each memory, find similar memories
      for (const memory of allMemories) {
        if (!memory.embedding || memory.embedding.length === 0) {
          continue; // Skip memories without embeddings
        }

        // Search for similar memories using embedding
        const similarMemories = await this.search('vector-memories', {
          queryEmbedding: memory.embedding,
          limit: maxRelationships + 1, // +1 to exclude self
          minScore: similarityThreshold,
        });

        // Create relationship pairs (exclude self-reference)
        for (const similar of similarMemories) {
          if (similar.id !== memory.id && similar.relevanceScore) {
            relationships.push({
              fromMemoryId: memory.id,
              toMemoryId: similar.id,
              similarityScore: similar.relevanceScore,
            });
          }
        }
      }

      this.logger.debug(
        `Built ${relationships.length} vector-based relationships`
      );

      return relationships;
    } catch (error) {
      this.logger.error('Failed to build vector-based relationships', error);
      throw new VectorOperationError(
        'Failed to build vector-based relationships',
        'buildVectorBasedRelationships',
        {
          maxRelationships,
          similarityThreshold,
          countLimit,
          error: this.serializeError(error),
        }
      );
    }
  }

  // ============================================================================
  // Store-Specific Business Methods (Pure Delegation to Repository)
  // ============================================================================
  // Pattern matches Memory delegation (lines 687-789)
  // All Store operations delegate to langGraphStoreRepo

  /**
   * Store an item in LangGraph Store - delegates to repository
   */
  async putStoreItem(
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    return await this.langGraphStoreRepo.putItem(namespace, key, value);
  }

  /**
   * Retrieve a store item - delegates to repository
   */
  async getStoreItem(
    namespace: string[],
    key: string
  ): Promise<Record<string, unknown> | null> {
    return await this.langGraphStoreRepo.getItem(namespace, key);
  }

  /**
   * Search store items - delegates to repository
   */
  async searchStoreItems(
    namespacePrefix: string[],
    query: string,
    limit?: number,
    filter?: Record<string, unknown>
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
      score: number;
    }>
  > {
    return await this.langGraphStoreRepo.searchItems(
      namespacePrefix,
      query,
      limit,
      filter
    );
  }

  /**
   * List store items - delegates to repository
   */
  async listStoreItems(
    namespacePrefix: string[],
    limit?: number,
    offset?: number
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
    }>
  > {
    return await this.langGraphStoreRepo.listItems(
      namespacePrefix,
      limit,
      offset
    );
  }

  /**
   * Delete a store item - delegates to repository
   */
  async deleteStoreItem(namespace: string[], key: string): Promise<void> {
    return await this.langGraphStoreRepo.deleteItem(namespace, key);
  }

  /**
   * Delete entire namespace - delegates to repository
   */
  async deleteStoreNamespace(namespacePrefix: string[]): Promise<void> {
    return await this.langGraphStoreRepo.deleteNamespace(namespacePrefix);
  }

  /**
   * Get namespace statistics - delegates to repository
   */
  async getStoreNamespaceStats(
    namespacePrefix: string[]
  ): Promise<{ itemCount: number; namespaces: string[][] }> {
    return await this.langGraphStoreRepo.getNamespaceStats(namespacePrefix);
  }
}
