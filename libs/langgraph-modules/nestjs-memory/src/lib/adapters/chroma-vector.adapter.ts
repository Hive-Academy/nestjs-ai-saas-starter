import { Injectable, Logger, Inject } from '@nestjs/common';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import {
  IVectorService,
  VectorStoreData,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStats,
  VectorGetOptions,
  VectorGetResult,
  VectorOperationError,
  InvalidCollectionError,
  InvalidInputError,
} from '../interfaces/vector-service.interface';
import { MEMORY_CONFIG } from '../constants/memory.constants';
import type { MemoryConfig } from '../interfaces/memory.interface';

/**
 * ChromaDB implementation of vector service adapter
 *
 * Provides a standardized interface over ChromaDBService while maintaining
 * 100% functional parity with existing MemoryStorageService operations.
 * Implements efficient delegation pattern with error standardization.
 */
@Injectable()
export class ChromaVectorAdapter extends IVectorService {
  private readonly logger = new Logger(ChromaVectorAdapter.name);

  constructor(
    private readonly chromaDB: ChromaDBService,
    @Inject(MEMORY_CONFIG) private readonly config: MemoryConfig
  ) {
    super();
    this.logger.debug('ChromaVectorAdapter initialized');
  }

  /**
   * Store a single document in ChromaDB
   */
  async store(collection: string, data: VectorStoreData): Promise<string> {
    this.validateCollection(collection);
    this.validateStoreData(data);

    try {
      const id = data.id || this.generateId();
      
      await this.chromaDB.addDocuments(collection, [
        {
          id,
          document: data.document,
          metadata: data.metadata || {},
          embedding: data.embedding as number[] | undefined,
        },
      ]);

      this.logger.debug(`Stored document ${id} in collection ${collection}`);
      return id;
    } catch (error) {
      this.logger.error(
        `Failed to store document in collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to store document',
        'store',
        { collection, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Store multiple documents in batch
   */
  async storeBatch(
    collection: string,
    data: readonly VectorStoreData[]
  ): Promise<readonly string[]> {
    this.validateCollection(collection);

    if (data.length === 0) {
      return [];
    }

    // Validate all data first
    data.forEach((item, index) => {
      try {
        this.validateStoreData(item);
      } catch (error) {
        throw new InvalidInputError(
          `Invalid data at index ${index}: ${(error as Error).message}`
        );
      }
    });

    try {
      const documentsWithIds = data.map((item) => ({
        id: item.id || this.generateId(),
        document: item.document,
        metadata: item.metadata || {},
        embedding: item.embedding as number[] | undefined,
      }));

      await this.chromaDB.addDocuments(collection, documentsWithIds);

      const ids = documentsWithIds.map((doc) => doc.id);
      this.logger.debug(
        `Batch stored ${ids.length} documents in collection ${collection}`
      );
      
      return ids;
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
   * Search for similar documents using vector similarity
   */
  async search(
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
      const queryTexts = query.queryText ? [query.queryText] : undefined;
      const queryEmbeddings = query.queryEmbedding
        ? [query.queryEmbedding as number[]]
        : undefined;

      const results = await this.chromaDB.searchDocuments(
        collection,
        queryTexts,
        queryEmbeddings,
        {
          nResults: query.limit || 10,
          where: query.filter as any,
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      if (!results.documents?.[0]) {
        return [];
      }

      const searchResults: VectorSearchResult[] = results.documents[0].map(
        (doc, index) => {
          const metadata = results.metadatas?.[0]?.[index] || {};
          const distance = results.distances?.[0]?.[index] || 1;
          const relevanceScore = Math.max(0, 1 - distance);

          // Filter by minimum score if specified
          if (query.minScore && relevanceScore < query.minScore) {
            return null;
          }

          return {
            id: results.ids[0][index],
            document: doc || '',
            metadata,
            distance,
            relevanceScore,
          };
        }
      ).filter((result): result is VectorSearchResult => result !== null);

      this.logger.debug(
        `Found ${searchResults.length} similar documents in collection ${collection}`
      );
      
      return searchResults;
    } catch (error) {
      this.logger.error(
        `Failed to search documents in collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to search documents',
        'search',
        { collection, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Delete documents by IDs
   */
  async delete(collection: string, ids: readonly string[]): Promise<void> {
    this.validateCollection(collection);
    this.validateIds(ids);

    try {
      await this.chromaDB.deleteDocuments(collection, [...ids]);
      
      this.logger.debug(
        `Deleted ${ids.length} documents from collection ${collection}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete documents from collection ${collection}`,
        error
      );
      throw new VectorOperationError(
        'Failed to delete documents',
        'delete',
        { collection, ids: [...ids], error: this.serializeError(error) }
      );
    }
  }

  /**
   * Delete documents by filter criteria
   */
  async deleteByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    this.validateCollection(collection);

    if (!filter || Object.keys(filter).length === 0) {
      throw new InvalidInputError('Filter criteria are required for deletion');
    }

    try {
      // ChromaDB requires IDs for deletion, so we first query for matching documents
      const matchingDocs = await this.chromaDB.getDocuments(collection, {
        where: filter as any,
        includeDocuments: false,
        includeMetadata: false,
      });

      if (matchingDocs.ids.length === 0) {
        return 0;
      }

      await this.chromaDB.deleteDocuments(collection, matchingDocs.ids);
      
      this.logger.debug(
        `Deleted ${matchingDocs.ids.length} documents by filter from collection ${collection}`
      );
      
      return matchingDocs.ids.length;
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
   * Get collection statistics
   */
  async getStats(collection: string): Promise<VectorStats> {
    this.validateCollection(collection);

    try {
      // Get basic count by retrieving all documents with minimal data
      const result = await this.chromaDB.getDocuments(collection, {
        limit: 1,
        includeDocuments: false,
        includeMetadata: false,
      });

      // For now, we can only get document count. Other stats would need ChromaDB API extensions
      const documentCount = result.ids.length;

      return {
        documentCount,
        collectionSize: 0, // Not available from ChromaDB API
        lastUpdated: new Date(),
        dimensions: undefined, // Would need to inspect embeddings
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
   * Get documents with optional filtering
   */
  async getDocuments(
    collection: string,
    options: VectorGetOptions = {}
  ): Promise<VectorGetResult> {
    this.validateCollection(collection);

    try {
      const result = await this.chromaDB.getDocuments(collection, {
        ids: options.ids as string[] | undefined,
        where: options.where as any,
        limit: options.limit,
        offset: options.offset,
        includeDocuments: options.includeDocuments ?? true,
        includeMetadata: options.includeMetadata ?? true,
        // ChromaDB doesn't support includeEmbeddings in getDocuments
      });

      this.logger.debug(
        `Retrieved ${result.ids.length} documents from collection ${collection}`
      );

      return {
        ids: result.ids,
        documents: options.includeDocuments !== false ? result.documents : undefined,
        metadatas: options.includeMetadata !== false ? result.metadatas : undefined,
        embeddings: undefined, // Not supported by ChromaDB getDocuments
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
   * Generate a unique ID for documents
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}