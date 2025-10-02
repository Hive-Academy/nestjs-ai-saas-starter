/**
 * @fileoverview ChromaDB Service Facade
 *
 * Streamlined facade orchestrating specialized services
 * Reduced from 597 LOC to ~200 LOC by delegating to focused service classes
 */

import { Injectable } from '@nestjs/common';
import type { Where, WhereDocument, GetResult, Collection } from 'chromadb';
import { ChromaDBServiceInterface } from '../interfaces/chromadb-service.interface';
import type {
  BaseDocument,
  ChromaWireDocument,
  ChromaBulkOptions,
  ChromaSearchOptions,
  ChromaSearchResult,
  ChromaCollectionInfo,
  GetDocumentsOptions,
} from '../types/core.interface';

// Core specialized services
import { ChromaDBConnectionService } from './core/chromadb-connection.service';
import { ChromaDBOperationsService } from './core/chromadb-operations.service';
import { ChromaDBValidationService } from './core/chromadb-validation.service';

// Facade specialized services
import { ChromaDBPerformanceService } from './facade/chromadb-performance.service';
import { ChromaDBEmbeddingProcessorService } from './facade/chromadb-embedding-processor.service';

/**
 * ChromaDB Service Facade
 *
 * Orchestrates specialized services with performance monitoring and embedding processing
 * Following Facade Pattern and Composition over Inheritance
 */
@Injectable()
export class ChromaDBService implements ChromaDBServiceInterface {
  constructor(
    private readonly connectionService: ChromaDBConnectionService,
    private readonly operationsService: ChromaDBOperationsService,
    private readonly validationService: ChromaDBValidationService,
    private readonly performanceService: ChromaDBPerformanceService,
    private readonly embeddingProcessor: ChromaDBEmbeddingProcessorService
  ) {}

  // =====================================================================
  // Client and Health Operations
  // =====================================================================

  getClient() {
    return this.connectionService.getClient();
  }

  async isHealthy(): Promise<boolean> {
    return this.performanceService.executeWithMonitoring(
      'isHealthy',
      async () => this.connectionService.isHealthy()
    );
  }

  async heartbeat(): Promise<number> {
    return this.performanceService.executeWithMonitoring(
      'heartbeat',
      async () => {
        const start = Date.now();
        await this.connectionService.isHealthy();
        return Date.now() - start;
      }
    );
  }

  async version(): Promise<string> {
    return this.performanceService.executeWithMonitoring(
      'version',
      async () => {
        const client = this.connectionService.getClient();
        return client.version();
      }
    );
  }

  async reset(): Promise<boolean> {
    return this.performanceService.executeWithMonitoring('reset', async () => {
      const client = this.connectionService.getClient();
      await client.reset();
      return true;
    });
  }

  // =====================================================================
  // Collection Management Operations
  // =====================================================================

  async createCollection(
    name: string,
    metadata?: Record<string, any>,
    embeddingFunction?: unknown,
    getOrCreate?: boolean
  ): Promise<Collection> {
    return this.performanceService.executeWithMonitoring(
      'createCollection',
      async () => {
        const collection = await this.operationsService.createCollection(
          name,
          metadata,
          embeddingFunction,
          getOrCreate
        );
        return collection;
      }
    );
  }

  async getCollection(
    name: string,
    embeddingFunction?: unknown
  ): Promise<Collection> {
    return this.performanceService.executeWithMonitoring(
      'getCollection',
      async () => this.operationsService.getCollection(name, embeddingFunction)
    );
  }

  async deleteCollection(name: string): Promise<void> {
    // Clear cache when deleting collection
    await this.performanceService.clearCache(`*:${name}:*`);

    return this.performanceService.executeWithMonitoring(
      'deleteCollection',
      async () => this.operationsService.deleteCollection(name)
    );
  }

  async listCollections(): Promise<ChromaCollectionInfo[]> {
    const cacheKey =
      this.performanceService.generateCacheKey('listCollections');

    return this.performanceService.executeWithMonitoring(
      'listCollections',
      async () => {
        const collections = await this.operationsService.listCollections();
        return collections; // operationsService should already return ChromaCollectionInfo[]
      },
      cacheKey
    );
  }

  async collectionExists(name: string): Promise<boolean> {
    const cacheKey = this.performanceService.generateCacheKey(
      'collectionExists',
      name
    );

    return this.performanceService.executeWithMonitoring(
      'collectionExists',
      async () => this.operationsService.collectionExists(name),
      cacheKey
    );
  }

  async countDocuments(collectionName: string): Promise<number> {
    const cacheKey = this.performanceService.generateCacheKey(
      'countDocuments',
      collectionName
    );

    return this.performanceService.executeWithMonitoring(
      'countDocuments',
      async () => this.operationsService.countDocuments(collectionName),
      cacheKey
    );
  }

  // =====================================================================
  // Document Operations with Embedding Processing
  // =====================================================================

  async addDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Convert BaseDocument to ChromaWireDocument format
    const wireDocuments: ChromaWireDocument[] = documents.map((doc) => ({
      id: doc.id,
      document: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding ? [...doc.embedding] : undefined,
    }));

    // Process embeddings if needed
    const processedDocuments =
      await this.embeddingProcessor.processDocumentEmbeddings(
        wireDocuments,
        options
      );

    // Clear relevant caches
    await this.performanceService.clearCache(`*:${collectionName}:*`);

    return this.performanceService.executeWithMonitoring(
      'addDocuments',
      async () =>
        this.operationsService.addDocuments(
          collectionName,
          processedDocuments,
          options
        )
    );
  }

  async updateDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Convert BaseDocument to ChromaWireDocument format
    const wireDocuments: ChromaWireDocument[] = documents.map((doc) => ({
      id: doc.id,
      document: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding ? [...doc.embedding] : undefined,
    }));

    // Process embeddings if needed
    const processedDocuments =
      await this.embeddingProcessor.processDocumentEmbeddings(
        wireDocuments,
        options
      );

    // Clear relevant caches
    await this.performanceService.clearCache(`*:${collectionName}:*`);

    return this.performanceService.executeWithMonitoring(
      'updateDocuments',
      async () =>
        this.operationsService.updateDocuments(
          collectionName,
          processedDocuments,
          options
        )
    );
  }

  async upsertDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Convert BaseDocument to ChromaWireDocument format
    const wireDocuments: ChromaWireDocument[] = documents.map((doc) => ({
      id: doc.id,
      document: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding ? [...doc.embedding] : undefined,
    }));

    // Process embeddings if needed
    const processedDocuments =
      await this.embeddingProcessor.processDocumentEmbeddings(
        wireDocuments,
        options
      );

    // Clear relevant caches
    await this.performanceService.clearCache(`*:${collectionName}:*`);

    return this.performanceService.executeWithMonitoring(
      'upsertDocuments',
      async () =>
        this.operationsService.upsertDocuments(
          collectionName,
          processedDocuments,
          options
        )
    );
  }

  async getDocuments(
    collectionName: string,
    options: GetDocumentsOptions = {}
  ): Promise<GetResult> {
    const cacheKey = this.performanceService.generateCacheKey(
      'getDocuments',
      collectionName,
      options
    );

    return this.performanceService.executeWithMonitoring(
      'getDocuments',
      async () => this.operationsService.getDocuments(collectionName, options),
      cacheKey
    );
  }

  async deleteDocuments(
    collectionName: string,
    ids: string[],
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<void> {
    // Clear relevant caches
    await this.performanceService.clearCache(`*:${collectionName}:*`);

    return this.performanceService.executeWithMonitoring(
      'deleteDocuments',
      async () =>
        this.operationsService.deleteDocuments(
          collectionName,
          ids,
          where,
          whereDocument
        )
    );
  }

  // =====================================================================
  // Search Operations with Embedding Processing
  // =====================================================================

  async searchDocuments(
    collectionName: string,
    queryTexts: string[],
    queryEmbeddings?: number[][],
    options: ChromaSearchOptions = {}
  ): Promise<ChromaSearchResult> {
    // Validate search options
    const validation = this.validationService.validateSearchOptions(options);
    if (!validation.isValid) {
      throw new Error(
        `Invalid search options: ${validation.errors.join(', ')}`
      );
    }

    // Process query embeddings if needed
    const processedQueryEmbeddings =
      await this.embeddingProcessor.processQueryEmbeddings(
        queryTexts,
        queryEmbeddings
      );

    const cacheKey = this.performanceService.generateCacheKey(
      'searchDocuments',
      collectionName,
      queryTexts,
      processedQueryEmbeddings,
      options
    );

    return this.performanceService.executeWithMonitoring(
      'searchDocuments',
      async () =>
        this.operationsService.searchDocuments(
          collectionName,
          queryTexts,
          processedQueryEmbeddings,
          options
        ),
      cacheKey
    );
  }

  async similaritySearch(
    collectionName: string,
    query: string,
    options: {
      limit?: number;
      where?: Where;
      whereDocument?: WhereDocument;
    } = {}
  ): Promise<{
    ids: string[];
    documents: (string | null)[];
    metadatas: (Record<string, unknown> | null)[];
    distances: number[];
  }> {
    const searchOptions: ChromaSearchOptions = {
      nResults: options.limit || 10,
      where: options.where,
      whereDocument: options.whereDocument,
      includeDistances: true,
    };

    const results = await this.searchDocuments(
      collectionName,
      [query],
      undefined,
      searchOptions
    );

    return {
      ids: results.ids[0] || [],
      documents: results.documents?.[0] || [],
      metadatas: results.metadatas?.[0] || [],
      distances: (results.distances?.[0] || []).filter(
        (d): d is number => d !== null
      ),
    };
  }

  // =====================================================================
  // Utility Operations
  // =====================================================================

  async peekDocuments(collectionName: string, limit = 10): Promise<GetResult> {
    return this.performanceService.executeWithMonitoring(
      'peekDocuments',
      async () => this.operationsService.peekDocuments(collectionName, limit)
    );
  }

  async getCollectionMetadata(
    name: string
  ): Promise<Record<string, any> | null> {
    const cacheKey = this.performanceService.generateCacheKey('metadata', name);

    return this.performanceService.executeWithMonitoring(
      'getCollectionMetadata',
      async () => this.operationsService.getCollectionMetadata(name),
      cacheKey
    );
  }

  async updateCollectionMetadata(
    name: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // Clear metadata cache
    await this.performanceService.clearCache(`metadata:${name}`);

    return this.performanceService.executeWithMonitoring(
      'updateCollectionMetadata',
      async () =>
        this.operationsService.updateCollectionMetadata(name, metadata)
    );
  }

  // =====================================================================
  // Performance and Diagnostics
  // =====================================================================

  async getPerformanceStats(): Promise<{
    cacheStats: any;
    embeddingServiceInfo: any;
    connectionHealth: boolean;
  }> {
    const [cacheStats, embeddingServiceInfo, connectionHealth] =
      await Promise.all([
        this.performanceService.getCacheStats(),
        this.embeddingProcessor.getEmbeddingServiceInfo(),
        this.connectionService.isHealthy(),
      ]);

    return {
      cacheStats,
      embeddingServiceInfo,
      connectionHealth,
    };
  }

  async clearAllCaches(): Promise<void> {
    await this.performanceService.clearCache();
  }

  async clearCollectionCache(collectionName: string): Promise<void> {
    await this.performanceService.clearCache(`*:${collectionName}:*`);
  }
}
