import { Injectable, Inject, Logger } from '@nestjs/common';
import { ChromaClient, Collection, WhereDocument, Where, QueryResult, GetResult } from 'chromadb';
import { CHROMADB_CLIENT, DEFAULT_BATCH_SIZE } from '../constants';
import {
  IChromaDBService,
  ChromaDocument,
  ChromaSearchResult,
  ChromaCollectionInfo,
  ChromaSearchOptions,
  ChromaBulkOptions,
} from '../interfaces/chromadb-service.interface';
import { CollectionService } from './collection.service';
import { EmbeddingService } from './embedding.service';
import { ChromaAdminService } from './chroma-admin.service';
import { sanitizeMetadata } from '../utils/metadata.utils';

/**
 * Main ChromaDB service that orchestrates collection, embedding, and admin services
 * Provides a unified interface for ChromaDB operations
 */
@Injectable()
export class ChromaDBService implements IChromaDBService {
  private readonly logger = new Logger(ChromaDBService.name);

  constructor(
    @Inject(CHROMADB_CLIENT)
    private readonly client: ChromaClient,
    private readonly collectionService: CollectionService,
    private readonly embeddingService: EmbeddingService,
    private readonly adminService: ChromaAdminService,
  ) {}

  /**
   * Get the ChromaDB client instance
   */
  getClient(): ChromaClient {
    return this.client;
  }

  /**
   * Check if connection to ChromaDB is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.adminService.isHealthy();
  }

  /**
   * Get heartbeat from ChromaDB server
   */
  async heartbeat(): Promise<number> {
    return this.adminService.heartbeat();
  }

  /**
   * Get ChromaDB server version
   */
  async version(): Promise<string> {
    return this.adminService.getVersion();
  }

  /**
   * Reset the entire ChromaDB instance (use with caution)
   */
  async reset(): Promise<boolean> {
    return this.adminService.reset();
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<ChromaCollectionInfo[]> {
    return this.collectionService.listCollections();
  }

  /**
   * Create a new collection
   */
  async createCollection(
    name: string,
    metadata?: Record<string, any>,
    embeddingFunction?: any,
    getOrCreate?: boolean,
  ): Promise<Collection> {
    return this.collectionService.createCollection(name, {
      metadata: metadata ? sanitizeMetadata(metadata) : undefined,
      embeddingFunction,
      getOrCreate,
    });
  }

  /**
   * Get an existing collection
   */
  async getCollection(
    name: string,
    embeddingFunction?: any,
  ): Promise<Collection> {
    return this.collectionService.getCollection(name, embeddingFunction);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    return this.collectionService.deleteCollection(name);
  }

  /**
   * Check if a collection exists
   */
  async collectionExists(name: string): Promise<boolean> {
    return this.collectionService.collectionExists(name);
  }

  /**
   * Add documents to a collection with automatic embedding generation
   */
  async addDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ): Promise<void> {
    const processedDocuments = await this.processDocumentsForEmbedding(documents);
    const collection = await this.getCollection(collectionName);
    
    const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
    for (let i = 0; i < processedDocuments.length; i += batchSize) {
      const batch = processedDocuments.slice(i, i + batchSize);
      
      await collection.add({
        ids: batch.map(doc => doc.id),
        documents: batch.map(doc => doc.document).filter((doc): doc is string => !!doc),
        metadatas: batch.map(doc => doc.metadata ? sanitizeMetadata(doc.metadata) : undefined).filter(Boolean) as any,
        embeddings: batch.map(doc => doc.embedding).filter((emb): emb is number[] => !!emb),
      });
    }
  }

  /**
   * Update documents in a collection
   */
  async updateDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ): Promise<void> {
    const processedDocuments = await this.processDocumentsForEmbedding(documents);
    const collection = await this.getCollection(collectionName);
    
    const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
    for (let i = 0; i < processedDocuments.length; i += batchSize) {
      const batch = processedDocuments.slice(i, i + batchSize);
      
      await collection.update({
        ids: batch.map(doc => doc.id),
        documents: batch.map(doc => doc.document).filter((doc): doc is string => !!doc),
        metadatas: batch.map(doc => doc.metadata ? sanitizeMetadata(doc.metadata) : undefined).filter(Boolean) as any,
        embeddings: batch.map(doc => doc.embedding).filter((emb): emb is number[] => !!emb),
      });
    }
  }

  /**
   * Upsert documents in a collection
   */
  async upsertDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions,
  ): Promise<void> {
    const processedDocuments = await this.processDocumentsForEmbedding(documents);
    const collection = await this.getCollection(collectionName);
    
    const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
    for (let i = 0; i < processedDocuments.length; i += batchSize) {
      const batch = processedDocuments.slice(i, i + batchSize);
      
      await collection.upsert({
        ids: batch.map(doc => doc.id),
        documents: batch.map(doc => doc.document).filter((doc): doc is string => !!doc),
        metadatas: batch.map(doc => doc.metadata ? sanitizeMetadata(doc.metadata) : undefined).filter(Boolean) as any,
        embeddings: batch.map(doc => doc.embedding).filter((emb): emb is number[] => !!emb),
      });
    }
  }

  /**
   * Get documents from a collection
   */
  async getDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    limit?: number,
    offset?: number,
    whereDocument?: WhereDocument,
    include?: string[],
  ): Promise<GetResult<Record<string, any>>> {
    const collection = await this.getCollection(collectionName);
    
    return collection.get({
      ids,
      where,
      limit,
      offset,
      whereDocument,
      include: include as any,
    });
  }

  /**
   * Delete documents from a collection
   */
  async deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument,
  ): Promise<void> {
    const collection = await this.getCollection(collectionName);
    
    await collection.delete({
      ids,
      where,
      whereDocument,
    });
  }

  /**
   * Search for similar documents
   */
  async searchDocuments(
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions,
  ): Promise<ChromaSearchResult> {
    const collection = await this.getCollection(collectionName);
    
    // Generate embeddings for query texts if needed and embedding service is available
    let processedQueryEmbeddings = queryEmbeddings;
    if (queryTexts && !queryEmbeddings && this.embeddingService.isConfigured()) {
      processedQueryEmbeddings = await this.embeddingService.embed(queryTexts);
    }
    
    return collection.query({
      queryTexts,
      queryEmbeddings: processedQueryEmbeddings,
      nResults: options?.nResults || 10,
      where: options?.where,
      whereDocument: options?.whereDocument,
      include: [
        ...(options?.includeMetadata ? ['metadatas'] : []),
        ...(options?.includeDocuments ? ['documents'] : []),
        ...(options?.includeDistances ? ['distances'] : []),
        ...(options?.includeEmbeddings ? ['embeddings'] : []),
      ] as any,
    });
  }

  /**
   * Similarity search with automatic embedding generation
   */
  async similaritySearch(
    collectionName: string,
    query: string | number[],
    options?: Omit<ChromaSearchOptions, 'includeMetadata' | 'includeDocuments' | 'includeDistances' | 'includeEmbeddings'> & {
      limit?: number;
      filter?: Where;
      includeMetadata?: boolean;
      includeDocuments?: boolean;
      includeDistances?: boolean;
    }
  ): Promise<{
    ids: string[];
    documents: (string | null)[];
    metadatas: (Record<string, any> | null)[];
    distances: number[];
  }> {
    let queryEmbedding: number[];
    
    if (typeof query === 'string') {
      if (!this.embeddingService.isConfigured()) {
        throw new Error('Embedding service not configured for text queries');
      }
      queryEmbedding = await this.embeddingService.embedSingle(query);
    } else {
      queryEmbedding = query;
    }

    const result = await this.searchDocuments(
      collectionName,
      undefined,
      [queryEmbedding],
      {
        nResults: options?.limit || 10,
        where: options?.filter,
        whereDocument: options?.whereDocument,
        includeMetadata: options?.includeMetadata ?? true,
        includeDocuments: options?.includeDocuments ?? true,
        includeDistances: options?.includeDistances ?? true,
      }
    );

    return {
      ids: result.ids[0] || [],
      documents: result.documents?.[0] || [],
      metadatas: result.metadatas?.[0] || [],
      distances: (result.distances?.[0] || []).filter((d): d is number => d !== null),
    };
  }

  /**
   * Count documents in a collection
   */
  async countDocuments(collectionName: string): Promise<number> {
    return this.collectionService.getCollectionCount(collectionName);
  }

  /**
   * Peek at documents in a collection
   */
  async peekDocuments(
    collectionName: string,
    limit = 10,
  ): Promise<GetResult<Record<string, any>>> {
    const collection = await this.getCollection(collectionName);
    return collection.peek({ limit });
  }

  /**
   * Get collection metadata
   */
  async getCollectionMetadata(collectionName: string): Promise<Record<string, any> | null> {
    try {
      const collection = await this.getCollection(collectionName);
      return collection.metadata || null;
    } catch {
      return null;
    }
  }

  /**
   * Update collection metadata
   */
  async updateCollectionMetadata(
    collectionName: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    return this.collectionService.modifyCollection(collectionName, sanitizeMetadata(metadata));
  }

  /**
   * Process documents to add embeddings if needed
   */
  private async processDocumentsForEmbedding(documents: ChromaDocument[]): Promise<ChromaDocument[]> {
    if (!this.embeddingService.isConfigured()) {
      return documents;
    }

    const documentsNeedingEmbeddings = documents.filter(doc => !doc.embedding && doc.document);
    
    if (documentsNeedingEmbeddings.length === 0) {
      return documents;
    }

    const textsToEmbed = documentsNeedingEmbeddings.map(doc => doc.document!);
    const embeddings = await this.embeddingService.embed(textsToEmbed);

    let embeddingIndex = 0;
    return documents.map(doc => {
      if (!doc.embedding && doc.document) {
        return { ...doc, embedding: embeddings[embeddingIndex++] };
      }
      return doc;
    });
  }
}