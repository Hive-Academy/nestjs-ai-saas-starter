import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  Collection,
  CollectionMetadata,
  GetResult,
  Where,
  WhereDocument,
} from 'chromadb';
import { ChromaDBServiceInterface } from '../interfaces/chromadb-service.interface';
import type {
  BaseDocument,
  ChromaWireDocument,
  ChromaBulkOptions,
  ChromaCollectionInfo,
  ChromaSearchOptions,
  ChromaSearchResult,
  GetDocumentsOptions,
  toChromaWireDocuments,
  fromChromaWireDocuments,
} from '../types/core.interface';
import { ChromaCacheService } from './chroma-cache.service';
import { ChromaMetricsService } from './chroma-metrics.service';
import { ChromaDBConnectionService } from './core/chromadb-connection.service';
import { ChromaDBOperationsService } from './core/chromadb-operations.service';
import { ChromaDBValidationService } from './core/chromadb-validation.service';
import { EmbeddingService } from './embedding.service';

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  operationTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Operation metrics for performance tracking
 */
export interface OperationMetrics {
  operationName: string;
  executionTime: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
  timestamp: Date;
}

/**
 * ChromaDB Service - Main Facade
 *
 * Coordinates all ChromaDB operations through specialized services
 * Following Facade Pattern - provides unified interface to complex subsystem
 * Following Dependency Inversion Principle - depends on abstractions
 */
@Injectable()
export class ChromaDBService implements ChromaDBServiceInterface {
  private readonly logger = new Logger(ChromaDBService.name);
  private readonly config: PerformanceConfig;

  constructor(
    private readonly connectionService: ChromaDBConnectionService,
    private readonly operationsService: ChromaDBOperationsService,
    private readonly validationService: ChromaDBValidationService,
    @Optional() private readonly metricsService?: ChromaMetricsService,
    @Optional() private readonly cacheService?: ChromaCacheService,
    @Optional() private readonly embeddingService?: EmbeddingService
  ) {
    this.config = {
      enableMetrics: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      operationTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    };
  }

  /**
   * Execute operation with comprehensive monitoring, caching, and error handling
   */
  private async executeWithMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // Check cache first if enabled and key provided
      if (this.config.enableCaching && cacheKey && this.cacheService) {
        const cached = await this.cacheService.get<T>(cacheKey);
        if (cached !== null) {
          cacheHit = true;
          this.recordMetrics(operationName, Date.now() - startTime, true, undefined, true);
          return cached;
        }
      }

      // Execute operation
      const result = await operation();

      // Cache result if caching is enabled
      if (this.config.enableCaching && cacheKey && this.cacheService) {
        await this.cacheService.set(cacheKey, result, this.config.cacheTimeout);
      }

      this.recordMetrics(operationName, Date.now() - startTime, true, undefined, cacheHit);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordMetrics(operationName, executionTime, false, errorMessage, cacheHit);
      throw error;
    }
  }

  /**
   * Record operation metrics
   */
  private recordMetrics(
    operationName: string,
    executionTime: number,
    success: boolean,
    error?: string,
    cacheHit?: boolean
  ): void {
    if (!this.config.enableMetrics || !this.metricsService) {
      return;
    }

    const metrics: OperationMetrics = {
      operationName,
      executionTime,
      success,
      error,
      cacheHit,
      timestamp: new Date(),
    };

    this.metricsService.recordOperation(metrics);
  }

  /**
   * Generate cache key for operations
   */
  private generateCacheKey(operation: string, ...params: any[]): string {
    const key = `${operation}:${params.map(p => JSON.stringify(p)).join(':')}`;
    return key.length > 200 ? `${key.substring(0, 200)}:${this.hashCode(key)}` : key;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ========================================
  // Connection and Health Operations
  // ========================================

  /**
   * Get the ChromaDB client instance
   */
  public getClient() {
    return this.connectionService.getClient();
  }

  /**
   * Check if ChromaDB connection is healthy
   */
  public async isHealthy(): Promise<boolean> {
    return this.executeWithMonitoring(
      'isHealthy',
      async () => this.connectionService.isHealthy()
    );
  }

  /**
   * Get heartbeat from ChromaDB server
   */
  public async heartbeat(): Promise<number> {
    return this.executeWithMonitoring(
      'heartbeat',
      async () => {
        const client = this.connectionService.getClient();
        const start = Date.now();
        await client.heartbeat();
        return Date.now() - start;
      }
    );
  }

  /**
   * Get ChromaDB server version
   */
  public async version(): Promise<string> {
    return this.executeWithMonitoring(
      'version',
      async () => {
        const client = this.connectionService.getClient();
        return client.version();
      }
    );
  }

  // ========================================
  // Collection Management Operations
  // ========================================

  /**
   * Reset the entire ChromaDB instance (use with caution)
   */
  public async reset(): Promise<boolean> {
    // Clear cache on reset
    if (this.cacheService) {
      await this.cacheService.clear();
    }

    return this.executeWithMonitoring(
      'reset',
      async () => this.operationsService.reset()
    );
  }

  /**
   * List all collections with caching
   */
  public async listCollections(): Promise<ChromaCollectionInfo[]> {
    return this.executeWithMonitoring(
      'listCollections',
      async () => this.operationsService.listCollections(),
      'collections:list'
    );
  }

  /**
   * Create a new collection with performance monitoring
   */
  public async createCollection(
    name: string,
    metadata?: CollectionMetadata,
    embeddingFunction?: unknown,
    getOrCreate = true
  ): Promise<Collection> {
    // Validate collection name
    const validation = this.validationService.validateCollectionName(name);
    if (!validation.isValid) {
      throw new Error(`Invalid collection name: ${validation.errors.join(', ')}`);
    }

    // Invalidate collections cache
    if (this.cacheService) {
      await this.cacheService.delete('collections:list');
    }

    return this.executeWithMonitoring(
      'createCollection',
      async () => this.operationsService.createCollection(name, metadata, embeddingFunction, getOrCreate)
    );
  }

  /**
   * Get an existing collection with caching
   */
  public async getCollection(
    name: string,
    embeddingFunction?: unknown
  ): Promise<Collection> {
    const cacheKey = this.generateCacheKey('getCollection', name, embeddingFunction);

    return this.executeWithMonitoring(
      'getCollection',
      async () => this.operationsService.getCollection(name, embeddingFunction),
      cacheKey
    );
  }

  /**
   * Delete a collection with cache invalidation
   */
  public async deleteCollection(name: string): Promise<void> {
    // Invalidate related caches
    if (this.cacheService) {
      await this.cacheService.deletePattern(`*${name}*`);
      await this.cacheService.delete('collections:list');
    }

    return this.executeWithMonitoring(
      'deleteCollection',
      async () => this.operationsService.deleteCollection(name)
    );
  }

  /**
   * Check if collection exists
   */
  public async collectionExists(name: string): Promise<boolean> {
    const cacheKey = `exists:${name}`;

    return this.executeWithMonitoring(
      'collectionExists',
      async () => this.operationsService.collectionExists(name),
      cacheKey
    );
  }

  // ========================================
  // Document Operations
  // ========================================

  /**
   * Add documents to collection with validation and embedding
   */
  public async addDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Validate documents
    const validatedDocs = this.validationService.validateAndSanitize(documents);

    // Generate embeddings if embedding service is available and no embeddings provided
    const processedDocs = await this.processEmbeddings(validatedDocs, options);

    // Invalidate collection cache
    if (this.cacheService) {
      await this.cacheService.deletePattern(`*${collectionName}*`);
    }

    return this.executeWithMonitoring(
      'addDocuments',
      async () => this.operationsService.addDocuments(collectionName, processedDocs, options)
    );
  }

  /**
   * Update documents in collection
   */
  public async updateDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Validate documents
    const validatedDocs = this.validationService.validateAndSanitize(documents);

    // Generate embeddings if needed
    const processedDocs = await this.processEmbeddings(validatedDocs, options);

    // Invalidate collection cache
    if (this.cacheService) {
      await this.cacheService.deletePattern(`*${collectionName}*`);
    }

    return this.executeWithMonitoring(
      'updateDocuments',
      async () => this.operationsService.updateDocuments(collectionName, processedDocs, options)
    );
  }

  /**
   * Upsert documents in collection
   */
  public async upsertDocuments<T extends BaseDocument>(
    collectionName: string,
    documents: T[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Validate documents
    const validatedDocs = this.validationService.validateAndSanitize(documents);

    // Generate embeddings if needed
    const processedDocs = await this.processEmbeddings(validatedDocs, options);

    // Invalidate collection cache
    if (this.cacheService) {
      await this.cacheService.deletePattern(`*${collectionName}*`);
    }

    return this.executeWithMonitoring(
      'upsertDocuments',
      async () => this.operationsService.upsertDocuments(collectionName, processedDocs, options)
    );
  }

  /**
   * Delete documents from collection
   */
  public async deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<void> {
    // Invalidate collection cache
    if (this.cacheService) {
      await this.cacheService.deletePattern(`*${collectionName}*`);
    }

    return this.executeWithMonitoring(
      'deleteDocuments',
      async () => this.operationsService.deleteDocuments(collectionName, ids, where, whereDocument)
    );
  }

  /**
   * Get documents from collection
   */
  public async getDocuments(
    collectionName: string,
    options: GetDocumentsOptions = {}
  ): Promise<GetResult> {
    const cacheKey = this.generateCacheKey('getDocuments', collectionName, options);

    return this.executeWithMonitoring(
      'getDocuments',
      async () => this.operationsService.getDocuments(collectionName, options),
      cacheKey
    );
  }

  /**
   * Count documents in collection
   */
  public async countDocuments(collectionName: string): Promise<number> {
    const cacheKey = `count:${collectionName}`;

    return this.executeWithMonitoring(
      'countDocuments',
      async () => this.operationsService.countDocuments(collectionName),
      cacheKey
    );
  }

  /**
   * Peek documents from collection
   */
  public async peekDocuments(
    collectionName: string,
    limit = 10
  ): Promise<GetResult> {
    return this.executeWithMonitoring(
      'peekDocuments',
      async () => this.operationsService.peekDocuments(collectionName, limit)
    );
  }

  /**
   * Search documents in collection
   */
  public async searchDocuments(
    collectionName: string,
    queryTexts: string[],
    queryEmbeddings?: number[][],
    options: ChromaSearchOptions = {}
  ): Promise<ChromaSearchResult> {
    // Validate search options
    const validation = this.validationService.validateSearchOptions(options);
    if (!validation.isValid) {
      throw new Error(`Invalid search options: ${validation.errors.join(', ')}`);
    }

    // Generate embeddings for query texts if embedding service is available
    let processedQueryEmbeddings = queryEmbeddings;
    if (queryTexts.length > 0 && !queryEmbeddings && this.embeddingService) {
      try {
        processedQueryEmbeddings = await this.embeddingService.generateEmbeddings(queryTexts);
      } catch (error) {
        this.logger.warn(`Failed to generate query embeddings: ${error}`);
      }
    }

    const cacheKey = this.generateCacheKey('searchDocuments', collectionName, queryTexts, processedQueryEmbeddings, options);

    return this.executeWithMonitoring(
      'searchDocuments',
      async () => this.operationsService.searchDocuments(
        collectionName,
        queryTexts,
        processedQueryEmbeddings,
        options
      ),
      cacheKey
    );
  }

  /**
   * Get collection metadata
   */
  public async getCollectionMetadata(name: string): Promise<Record<string, any> | null> {
    const cacheKey = `metadata:${name}`;

    return this.executeWithMonitoring(
      'getCollectionMetadata',
      async () => this.operationsService.getCollectionMetadata(name),
      cacheKey
    );
  }

  /**
   * Update collection metadata
   */
  public async updateCollectionMetadata(
    name: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // Invalidate metadata cache
    if (this.cacheService) {
      await this.cacheService.delete(`metadata:${name}`);
    }

    return this.executeWithMonitoring(
      'updateCollectionMetadata',
      async () => this.operationsService.updateCollectionMetadata(name, metadata)
    );
  }

  /**
   * Similarity search with automatic embedding generation
   */
  public async similaritySearch(
    collectionName: string,
    query: string,
    options: { limit?: number; where?: Where; whereDocument?: WhereDocument } = {}
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

    const results = await this.searchDocuments(collectionName, [query], undefined, searchOptions);

    return {
      ids: results.ids[0] || [],
      documents: results.documents?.[0] || [],
      metadatas: results.metadatas?.[0] || [],
      distances: results.distances?.[0] || [],
    };
  }

  /**
   * Process embeddings for documents if embedding service is available
   */
  private async processEmbeddings(
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<ChromaDocument[]> {
    if (!this.embeddingService) {
      return documents;
    }

    const docsNeedingEmbeddings = documents.filter(
      doc => doc.document && !doc.embedding
    );

    if (docsNeedingEmbeddings.length === 0) {
      return documents;
    }

    try {
      const texts = docsNeedingEmbeddings.map(doc => doc.document!);
      const embeddings = await this.embeddingService.generateEmbeddings(texts);

      // Map embeddings back to documents
      let embeddingIndex = 0;
      return documents.map(doc => {
        if (doc.document && !doc.embedding) {
          return { ...doc, embedding: embeddings[embeddingIndex++] };
        }
        return doc;
      });
    } catch (error) {
      this.logger.warn(`Failed to generate embeddings: ${error}`);
      return documents;
    }
  }
}
