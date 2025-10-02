import { Injectable, Logger } from '@nestjs/common';
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
} from '@hive-academy/langgraph-memory';
import { ChromaLangGraphStore } from '@hive-academy/langgraph-memory';
import {
  ChromaDBService,
  BaseDocument,
  ChromaSearchOptions,
  Where,
  GetDocumentsOptions,
} from '@hive-academy/nestjs-chromadb';
import type { VectorMemoryMetadata } from '../../entities/chromadb/vector-memory.entity';

/**
 * Application-specific ChromaDB adapter for the Memory module.
 *
 * ARCHITECTURE: Multi-Collection Support
 * --------------------------------------
 * This adapter uses ChromaDBService directly (not repository pattern) because:
 * - IVectorService requires multi-collection support (collection as method parameter)
 * - ChromaRepository binds to a SINGLE collection via decorator
 * - Repository methods don't support dynamic collection parameter
 * - ChromaDBService provides native multi-collection operations
 *
 * Benefits of ChromaDBService:
 * - Full multi-collection support
 * - Auto-embedding generation
 * - Performance monitoring
 * - Caching and optimization
 * - Type-safe operations
 */
@Injectable()
export class ChromaVectorAdapter extends IVectorService {
  private readonly logger = new Logger(ChromaVectorAdapter.name);

  constructor(private readonly chromaDB: ChromaDBService) {
    super();
    this.logger.debug('ChromaVectorAdapter initialized with ChromaDBService');
  }

  /**
   * Store a single document using ChromaDBService
   */
  override async store(
    collection: string,
    data: VectorStoreData
  ): Promise<string> {
    this.validateCollection(collection);

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

      const document: BaseDocument<VectorMemoryMetadata> = {
        id: data.id || this.generateId(),
        content: data.document,
        embedding: data.embedding ? [...data.embedding] : undefined,
        metadata: {
          agentId: (data.metadata?.agentId as string) || 'default',
          threadId: (data.metadata?.threadId as string) || 'unknown',
          userId: (data.metadata?.userId as string) || 'system',
          importance: this.calculateImportance(data.document, metadataOrState),
          classification: this.classifyMemory(data.document, metadataOrState),
          timestamp: new Date().toISOString(),
          ...data.metadata,
        } as VectorMemoryMetadata,
      };

      await this.chromaDB.addDocuments(collection, [document]);

      this.logger.debug(
        `Stored document ${document.id} in collection ${collection}`
      );
      return document.id;
    } catch (error) {
      this.logger.error(
        `Failed to store document in collection ${collection}`,
        error
      );
      throw new VectorOperationError('Failed to store document', 'store', {
        collection,
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Store multiple documents in batch using ChromaDBService
   */
  override async storeBatch(
    collection: string,
    data: readonly VectorStoreData[]
  ): Promise<readonly string[]> {
    this.validateCollection(collection);

    if (data.length === 0) {
      return [];
    }

    try {
      const defaultState: AgentState = {
        messages: [],
        threadId: 'unknown',
        userId: 'system',
        current: 'default',
      };

      const documents: BaseDocument<VectorMemoryMetadata>[] = data.map(
        (item) => {
          const metadataOrState = item.metadata
            ? (item.metadata as unknown as AgentState)
            : defaultState;

          return {
            id: item.id || this.generateId(),
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
              classification: this.classifyMemory(
                item.document,
                metadataOrState
              ),
              timestamp: new Date().toISOString(),
              ...item.metadata,
            } as VectorMemoryMetadata,
          };
        }
      );

      await this.chromaDB.addDocuments(collection, documents);

      this.logger.debug(
        `Batch stored ${documents.length} documents in collection ${collection}`
      );

      return documents.map((doc) => doc.id);
    } catch (error) {
      this.logger.error(
        `Failed to batch store documents in collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to batch store documents',
        'storeBatch',
        { collection, count: data.length, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Search for similar documents using ChromaDBService
   */
  override async search(
    collection: string,
    query: VectorSearchQuery
  ): Promise<readonly VectorSearchResult[]> {
    this.validateCollection(collection);

    if (!query.queryText && !query.queryEmbedding) {
      throw new InvalidInputError(
        'Either queryText or queryEmbedding must be provided'
      );
    }

    try {
      const searchOptions: ChromaSearchOptions = {
        nResults: query.limit || 10,
        where: query.filter as Where,
        includeMetadata: true,
        includeDocuments: true,
        includeDistances: true,
      };

      const queryEmbeddings = query.queryEmbedding
        ? [[...query.queryEmbedding]]
        : undefined;

      const result = await this.chromaDB.searchDocuments(
        collection,
        query.queryText ? [query.queryText] : [],
        queryEmbeddings,
        searchOptions
      );

      const searchResults: VectorSearchResult[] = [];
      const ids = result.ids[0] || [];
      const documents = result.documents?.[0] || [];
      const metadatas = result.metadatas?.[0] || [];
      const distances = result.distances?.[0] || [];

      for (let i = 0; i < ids.length; i++) {
        const distance = distances[i] || 0;
        // Apply minScore filter if provided (distance threshold)
        if (query.minScore && distance > query.minScore) {
          continue;
        }

        searchResults.push({
          id: ids[i],
          document: (documents[i] as string) || '',
          metadata: (metadatas[i] as Record<string, unknown>) || {},
          distance: distance,
          relevanceScore: 1 - distance, // Convert distance to similarity score
        });
      }

      this.logger.debug(
        `Found ${searchResults.length} similar documents in collection ${collection}`
      );

      return searchResults;
    } catch (error) {
      this.logger.error(
        `Failed to search documents in collection ${collection}`,
        error
      );
      throw new VectorOperationError('Failed to search documents', 'search', {
        collection,
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Delete documents by IDs using ChromaDBService
   */
  override async delete(
    collection: string,
    ids: readonly string[]
  ): Promise<void> {
    this.validateCollection(collection);
    this.validateIds(ids);

    try {
      await this.chromaDB.deleteDocuments(collection, [...ids], undefined);

      this.logger.debug(
        `Deleted ${ids.length} documents from collection ${collection}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete documents from collection ${collection}`,
        error
      );
      throw new VectorOperationError('Failed to delete documents', 'delete', {
        collection,
        ids: [...ids],
        error: this.serializeError(error),
      });
    }
  }

  /**
   * Delete documents by filter criteria using ChromaDBService
   */
  override async deleteByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    this.validateCollection(collection);

    if (!filter || Object.keys(filter).length === 0) {
      throw new InvalidInputError('Filter criteria are required for deletion');
    }

    try {
      // Get count before deletion
      const countBefore = await this.chromaDB.countDocuments(collection);

      // Delete using filter
      await this.chromaDB.deleteDocuments(
        collection,
        [],
        filter as Where,
        undefined
      );

      // Get count after deletion
      const countAfter = await this.chromaDB.countDocuments(collection);
      const deletedCount = countBefore - countAfter;

      this.logger.debug(
        `Deleted ${deletedCount} documents by filter from collection ${collection}`
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete documents by filter from collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to delete documents by filter',
        'deleteByFilter',
        { collection, filter, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get collection statistics using ChromaDBService
   */
  override async getStats(collection: string): Promise<VectorStats> {
    this.validateCollection(collection);

    try {
      const count = await this.chromaDB.countDocuments(collection);
      const metadata = await this.chromaDB.getCollectionMetadata(collection);

      return {
        documentCount: count,
        collectionSize: 0, // Not directly available from ChromaDB
        lastUpdated: new Date(),
        dimensions: metadata?.dimensions as number | undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stats for collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to get collection statistics',
        'getStats',
        { collection, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get documents with optional filtering using ChromaDBService
   */
  override async getDocuments(
    collection: string,
    options: VectorGetOptions = {}
  ): Promise<VectorGetResult> {
    this.validateCollection(collection);

    try {
      const getOptions: GetDocumentsOptions = {
        ids: options.ids ? [...options.ids] : undefined,
        where: options.where as Where,
        limit: options.limit,
        offset: options.offset,
        includeMetadata: options.includeMetadata,
        includeDocuments: options.includeDocuments,
      };

      const result = await this.chromaDB.getDocuments(collection, getOptions);

      this.logger.debug(
        `Retrieved ${result.ids.length} documents from collection ${collection}`
      );

      return {
        ids: result.ids,
        documents:
          options.includeDocuments !== false
            ? (result.documents as (string | null)[])
            : undefined,
        metadatas:
          options.includeMetadata !== false
            ? (result.metadatas as (Record<string, unknown> | null)[])
            : undefined,
        embeddings: options.includeEmbeddings
          ? (result.embeddings as number[][])
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get documents from collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to get documents',
        'getDocuments',
        { collection, options, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Validate collection name
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

  // Agent state-aware memory storage (business logic)
  async storeAgentMemory(
    collection: string,
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

  // NEW: Multi-faceted agent memory search
  async searchAgentMemories(
    collection: string,
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

  // NEW: LangGraph Store interface provider
  getLangGraphStore(collection = 'langgraph_store'): ChromaLangGraphStore {
    return new ChromaLangGraphStore(this, collection);
  }

  // Private helper methods
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

  /**
   * Generate a unique ID for documents
   */
  private generateId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
