import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Where } from 'chromadb';
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
} from '@hive-academy/langgraph-memory';

/**
 * Application-specific ChromaDB adapter for the Memory module.
 *
 * This adapter properly uses the existing ChromaDBService from
 * @hive-academy/nestjs-chromadb instead of creating its own connection.
 * This maintains proper separation of concerns and reuses existing
 * database management infrastructure.
 */
@Injectable()
export class ChromaVectorAdapter extends IVectorService {
  private readonly logger = new Logger(ChromaVectorAdapter.name);

  constructor(private readonly chromaDBService: ChromaDBService) {
    super();
    this.logger.debug('ChromaVectorAdapter initialized with ChromaDBService');
  }

  /**
   * Store a single document using ChromaDBService
   */
  async store(collection: string, data: VectorStoreData): Promise<string> {
    this.validateCollection(collection);
    this.validateStoreData(data);

    try {
      const id = data.id || this.generateId();

      // Use the ChromaDBService to add documents
      await this.chromaDBService.addDocuments(collection, [
        {
          id,
          document: data.document,
          metadata: this.sanitizeMetadata(data.metadata || {}),
          embedding: data.embedding,
        },
      ]);

      this.logger.debug(`Stored document ${id} in collection ${collection}`);
      return id;
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
      const documents = data.map((item) => ({
        id: item.id || this.generateId(),
        document: item.document,
        metadata: this.sanitizeMetadata(item.metadata || {}),
        embedding: item.embedding,
      }));

      // Use ChromaDBService for batch storage
      await this.chromaDBService.addDocuments(collection, documents);

      const ids = documents.map((doc) => doc.id);

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
   * Search for similar documents using ChromaDBService
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
      // Use ChromaDBService's searchDocuments method
      const results = await this.chromaDBService.searchDocuments(
        collection,
        query.queryText ? [query.queryText] : undefined,
        query.queryEmbedding ? [Array.from(query.queryEmbedding)] : undefined,
        {
          nResults: query.limit || 10,
          where: this.convertToWhereClause(query.filter),
        }
      );

      // Map ChromaDB results to our interface
      const searchResults: VectorSearchResult[] = [];

      if (results.ids && results.ids.length > 0) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances?.[0]?.[i] || 1;
          const relevanceScore = Math.max(0, 1 - distance);

          // Filter by minimum score if specified
          if (query.minScore && relevanceScore < query.minScore) {
            continue;
          }

          searchResults.push({
            id: results.ids[0][i],
            document: results.documents?.[0]?.[i] || '',
            metadata: results.metadatas?.[0]?.[i] || {},
            distance,
            relevanceScore,
          });
        }
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
  async delete(collection: string, ids: readonly string[]): Promise<void> {
    this.validateCollection(collection);
    this.validateIds(ids);

    try {
      await this.chromaDBService.deleteDocuments(collection, [...ids]);

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
  async deleteByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    this.validateCollection(collection);

    if (!filter || Object.keys(filter).length === 0) {
      throw new InvalidInputError('Filter criteria are required for deletion');
    }

    try {
      // First get matching documents
      const matchingDocs = await this.chromaDBService.getDocuments(collection, {
        where: this.convertToWhereClause(filter),
      });

      if (matchingDocs.ids.length === 0) {
        return 0;
      }

      // Then delete them
      await this.chromaDBService.deleteDocuments(collection, matchingDocs.ids);

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
   * Get collection statistics using ChromaDBService
   */
  async getStats(collection: string): Promise<VectorStats> {
    this.validateCollection(collection);

    try {
      // Use ChromaDBService to get collection info and count
      const collection_obj = await this.chromaDBService.getCollection(collection);
      const documentCount = await this.chromaDBService.countDocuments(collection);
      
      return {
        documentCount,
        collectionSize: 0, // Not directly available from ChromaDB
        lastUpdated: new Date(),
        dimensions: collection_obj.metadata?.dimensions as number | undefined,
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
  async getDocuments(
    collection: string,
    options: VectorGetOptions = {}
  ): Promise<VectorGetResult> {
    this.validateCollection(collection);

    try {
      const result = await this.chromaDBService.getDocuments(collection, {
        ids: options.ids ? [...options.ids] : undefined,
        where: this.convertToWhereClause(options.where),
        limit: options.limit,
        offset: options.offset,
        includeDocuments: options.includeDocuments !== false,
        includeMetadata: options.includeMetadata !== false,
        includeEmbeddings: options.includeEmbeddings === true,
      });

      this.logger.debug(
        `Retrieved ${result.ids.length} documents from collection ${collection}`
      );

      return {
        ids: result.ids,
        documents:
          options.includeDocuments !== false ? result.documents : undefined,
        metadatas:
          options.includeMetadata !== false ? result.metadatas : undefined,
        embeddings: options.includeEmbeddings ? result.embeddings : undefined,
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
   * Convert generic filter to ChromaDB Where clause with type safety
   */
  private convertToWhereClause(filter?: Record<string, unknown>): Where | undefined {
    if (!filter || Object.keys(filter).length === 0) {
      return undefined;
    }

    // For now, return the filter as-is since ChromaDB's Where type
    // accepts Record<string, unknown> structure. In production,
    // you might want to add more sophisticated validation here.
    return filter as Where;
  }

  /**
   * Generate a unique ID for documents
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize metadata to match ChromaMetadata constraints
   */
  private sanitizeMetadata(
    metadata: Record<string, unknown>
  ): Record<string, string | number | boolean | null> {
    const sanitized: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        sanitized[key] = value;
      } else if (value !== undefined) {
        // Convert other types to string
        sanitized[key] = String(value);
      }
    }

    return sanitized;
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
