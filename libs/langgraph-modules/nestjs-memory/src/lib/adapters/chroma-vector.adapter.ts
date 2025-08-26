import { Injectable, Logger, Inject } from '@nestjs/common';
import { ChromaApi, Collection } from 'chromadb';
// NOTE: Direct ChromaDB API import instead of NestJS service for self-contained adapter
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
 * Self-contained ChromaDB implementation of vector service adapter
 *
 * This adapter manages its own ChromaDB connection and does not depend on
 * the NestJS ChromaDBModule, making it truly self-contained and following
 * proper adapter pattern principles.
 */
@Injectable()
export class ChromaVectorAdapter extends IVectorService {
  private readonly logger = new Logger(ChromaVectorAdapter.name);
  private chromaClient: ChromaApi | null = null;
  private readonly collections = new Map<string, Collection>();

  constructor(
    @Inject(MEMORY_CONFIG) private readonly config: MemoryConfig
  ) {
    super();
    this.logger.debug('ChromaVectorAdapter initialized as self-contained');
  }

  /**
   * Initialize ChromaDB client connection
   */
  private async getChromaClient(): Promise<ChromaApi> {
    if (!this.chromaClient) {
      const { ChromaApi } = await import('chromadb');
      const host = process.env.CHROMADB_HOST || 'localhost';
      const port = parseInt(process.env.CHROMADB_PORT || '8000');
      
      this.chromaClient = new ChromaApi({
        path: `http://${host}:${port}`,
      });
      
      this.logger.debug(`Connected to ChromaDB at http://${host}:${port}`);
    }
    return this.chromaClient;
  }

  /**
   * Get or create collection
   */
  private async getCollection(name: string): Promise<Collection> {
    if (!this.collections.has(name)) {
      const client = await this.getChromaClient();
      try {
        const collection = await client.getOrCreateCollection({ name });
        this.collections.set(name, collection);
        this.logger.debug(`Collection '${name}' ready`);
      } catch (error) {
        this.logger.error(`Failed to get/create collection '${name}'`, error);
        throw error;
      }
    }
    return this.collections.get(name)!;
  }

  /**
   * Store a single document in ChromaDB
   */
  async store(collection: string, data: VectorStoreData): Promise<string> {
    this.validateCollection(collection);
    this.validateStoreData(data);

    try {
      const id = data.id || this.generateId();
      const col = await this.getCollection(collection);
      
      await col.add({
        ids: [id],
        documents: [data.document],
        metadatas: [data.metadata || {}],
        embeddings: data.embedding ? [data.embedding as number[]] : undefined,
      });

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
      const col = await this.getCollection(collection);
      const ids = data.map((item) => item.id || this.generateId());
      const documents = data.map((item) => item.document);
      const metadatas = data.map((item) => item.metadata || {});
      const embeddings = data.some(item => item.embedding) 
        ? data.map((item) => item.embedding as number[] || null)
        : undefined;

      await col.add({
        ids,
        documents,
        metadatas,
        embeddings: embeddings?.filter((e): e is number[] => e !== null),
      });

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
      const col = await this.getCollection(collection);
      
      const results = await col.query({
        queryTexts: query.queryText ? [query.queryText] : undefined,
        queryEmbeddings: query.queryEmbedding 
          ? [query.queryEmbedding as number[]] 
          : undefined,
        nResults: query.limit || 10,
        where: query.filter as any,
        include: ['documents', 'metadatas', 'distances'],
      });

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
      const col = await this.getCollection(collection);
      await col.delete({ ids: [...ids] });
      
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
      const col = await this.getCollection(collection);
      
      // ChromaDB requires IDs for deletion, so we first query for matching documents
      const matchingDocs = await col.get({
        where: filter as any,
        include: ['documents'], // Get minimal data
      });

      if (matchingDocs.ids.length === 0) {
        return 0;
      }

      await col.delete({ ids: matchingDocs.ids });
      
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
      const col = await this.getCollection(collection);
      
      // Get collection count
      const count = await col.count();

      return {
        documentCount: count,
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
      const col = await this.getCollection(collection);
      
      const include = [];
      if (options.includeDocuments !== false) include.push('documents');
      if (options.includeMetadata !== false) include.push('metadatas');
      if (options.includeEmbeddings) include.push('embeddings');
      
      const result = await col.get({
        ids: options.ids as string[] | undefined,
        where: options.where as any,
        limit: options.limit,
        offset: options.offset,
        include: include as any,
      });

      this.logger.debug(
        `Retrieved ${result.ids.length} documents from collection ${collection}`
      );

      return {
        ids: result.ids,
        documents: options.includeDocuments !== false ? result.documents : undefined,
        metadatas: options.includeMetadata !== false ? result.metadatas : undefined,
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