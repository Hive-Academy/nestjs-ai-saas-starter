import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import {
  ChromaClient,
  Collection,
  WhereDocument,
  Where,
  GetResult,
  EmbeddingFunction,
  Metadata,
} from 'chromadb';
import { ChromaMetricsService } from './chroma-metrics.service';
import { ChromaCacheService } from './chroma-cache.service';
import { EmbeddingService } from './embedding.service';
import {
  ChromaDBServiceInterface,
  ChromaDocument,
  ChromaSearchResult,
  ChromaCollectionInfo,
  ChromaSearchOptions,
  ChromaBulkOptions,
  GetDocumentsOptions,
  ChromaMetadata,
} from '../interfaces/chromadb-service.interface';
import {
  ChromaDBError,
  ChromaDBConnectionError,
  ChromaDBValidationError,
  ChromaDBTimeoutError,
} from '../errors/chromadb.errors';
import { CHROMADB_CLIENT } from '../constants';

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number; // milliseconds
  operationTimeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
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
 *  ChromaDB service with performance monitoring, intelligent caching,
 * and  error handling. Maintains 100% backward compatibility.
 */
@Injectable()
export class ChromaDBService implements ChromaDBServiceInterface {
  private readonly logger = new Logger(ChromaDBService.name);
  private readonly config: Required<PerformanceConfig>;
  private operationIdCounter = 0;

  constructor(
    @Inject(CHROMADB_CLIENT) private readonly client: ChromaClient,
    private readonly embeddingService: EmbeddingService,
    @Optional() private readonly metricsService?: ChromaMetricsService,
    @Optional() private readonly cacheService?: ChromaCacheService,
    config: PerformanceConfig = {}
  ) {
    this.config = {
      enableMetrics: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      operationTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      ...config,
    };

    this.logger.log('ChromaDBService initialized with performance monitoring');
  }

  /**
   * Execute operation with performance monitoring and error handling
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

      // Execute operation with timeout and retry logic
      const result = await this.executeWithRetry(operation);

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

      // Transform and re-throw with  context
      throw this.enhanceError(error, operationName, { executionTime, cacheHit });
    }
  }

  /**
   * Execute operation with retry logic and timeout
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Add timeout wrapper
        return await this.withTimeout(operation(), this.config.operationTimeout);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry validation errors
        if (error instanceof ChromaDBValidationError) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        this.logger.warn(`Retry attempt ${attempt} for operation after error: ${lastError.message}`);
      }
    }

    throw lastError!;
  }

  /**
   * Add timeout to promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ChromaDBTimeoutError(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
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
   * Enhance error with additional context
   */
  private enhanceError(error: unknown, operation: string, context: Record<string, unknown>): Error {
    if (error instanceof ChromaDBError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('timeout')) {
      return new ChromaDBTimeoutError(`${operation} timed out`, { context });
    }

    if (message.includes('connection') || message.includes('network')) {
      return new ChromaDBConnectionError(`${operation} connection failed: ${message}`, { context });
    }

    return new ChromaDBError(`${operation} failed: ${message}`, { context });
  }

  /**
   * Generate cache key for operation
   */
  private generateCacheKey(operation: string, ...params: unknown[]): string {
    const paramHash = this.hashParams(params);
    return `chroma:${operation}:${paramHash}`;
  }

  /**
   * Simple hash function for parameters
   */
  private hashParams(params: unknown[]): string {
    return Buffer.from(JSON.stringify(params)).toString('base64').substring(0, 16);
  }

  // =====================================================================
  // ChromaDBServiceInterface Implementation -  with Monitoring
  // =====================================================================

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${++this.operationIdCounter}`;
  }

  /**
   * Get the ChromaDB client instance
   */
  public getClient(): ChromaClient {
    return this.client;
  }

  /**
   * Check if connection to ChromaDB is healthy with performance monitoring
   */
  public async isHealthy(): Promise<boolean> {
    return this.executeWithMonitoring(
      'isHealthy',
      async () => {
        try {
          await this.client.heartbeat();
          return true;
        } catch (error) {
          this.logger.error('Health check failed', error);
          return false;
        }
      },
      'health:status'
    );
  }

  /**
   * Get heartbeat from ChromaDB server with monitoring
   */
  public async heartbeat(): Promise<number> {
    return this.executeWithMonitoring(
      'heartbeat',
      async () => {
        const result = await this.client.heartbeat();
        return result['nanosecond heartbeat'] || 0;
      },
      'health:heartbeat'
    );
  }

  /**
   * Get ChromaDB server version with caching
   */
  public async version(): Promise<string> {
    return this.executeWithMonitoring(
      'version',
      async () => {
        const result = await this.client.version();
        return result;
      },
      'server:version'
    );
  }

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
      async () => {
        await this.client.reset();
        return true;
      }
    );
  }

  /**
   * List all collections with caching
   */
  public async listCollections(): Promise<ChromaCollectionInfo[]> {
    return this.executeWithMonitoring(
      'listCollections',
      async () => {
        const collections = await this.client.listCollections();
        return collections.map(collection => ({
          name: collection.name,
          metadata: collection.metadata,
        }));
      },
      'collections:list'
    );
  }

  /**
   * Create a new collection with performance monitoring
   */
  public async createCollection(
    name: string,
    metadata?: Record<string, unknown>,
    embeddingFunction?: unknown,
    getOrCreate: boolean = true
  ): Promise<Collection> {
    // Invalidate collections cache
    if (this.cacheService) {
      await this.cacheService.delete('collections:list');
    }

    return this.executeWithMonitoring(
      'createCollection',
      async () => {
        if (getOrCreate) {
          return await this.client.getOrCreateCollection({
            name,
            metadata,
            embeddingFunction: embeddingFunction as EmbeddingFunction,
          });
        } else {
          return await this.client.createCollection({
            name,
            metadata,
            embeddingFunction: embeddingFunction as EmbeddingFunction,
          });
        }
      }
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
      async () => {
        return await this.client.getCollection({
          name,
          embeddingFunction: embeddingFunction as EmbeddingFunction,
        });
      },
      cacheKey
    );
  }

  /**
   * Delete a collection with cache invalidation
   */
  public async deleteCollection(name: string): Promise<void> {
    // Invalidate related caches
    if (this.cacheService) {
      await Promise.all([
        this.cacheService.delete('collections:list'),
        this.cacheService.delete(this.generateCacheKey('getCollection', name)),
        this.cacheService.delete(this.generateCacheKey('collectionExists', name)),
        this.cacheService.invalidateCollection(name),
      ]);
    }

    return this.executeWithMonitoring(
      'deleteCollection',
      () => this.baseService.deleteCollection(name)
    );
  }

  /**
   * Check if a collection exists with caching
   */
  public async collectionExists(name: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey('collectionExists', name);

    return this.executeWithMonitoring(
      'collectionExists',
      () => this.baseService.collectionExists(name),
      cacheKey
    );
  }

  /**
   * Add documents to a collection with performance monitoring
   */
  public async addDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    // Invalidate collection-related caches
    if (this.cacheService) {
      await this.invalidateCollectionCaches(collectionName);
    }

    return this.executeWithMonitoring(
      'addDocuments',
      () => this.baseService.addDocuments(collectionName, documents, options)
    );
  }

  /**
   * Update documents in a collection with cache invalidation
   */
  public async updateDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    if (this.cacheService) {
      await this.invalidateCollectionCaches(collectionName);
    }

    return this.executeWithMonitoring(
      'updateDocuments',
      () => this.baseService.updateDocuments(collectionName, documents, options)
    );
  }

  /**
   * Upsert documents in a collection with cache invalidation
   */
  public async upsertDocuments(
    collectionName: string,
    documents: ChromaDocument[],
    options?: ChromaBulkOptions
  ): Promise<void> {
    if (this.cacheService) {
      await this.invalidateCollectionCaches(collectionName);
    }

    return this.executeWithMonitoring(
      'upsertDocuments',
      () => this.baseService.upsertDocuments(collectionName, documents, options)
    );
  }

  /**
   * Get documents from a collection with intelligent caching
   */
  public async getDocuments(
    collectionName: string,
    options?: GetDocumentsOptions
  ): Promise<GetResult<ChromaMetadata>> {
    // Only cache if options are suitable for caching (no dynamic filters)
    const cacheKey = this.shouldCache(options)
      ? this.generateCacheKey('getDocuments', collectionName, options)
      : undefined;

    return this.executeWithMonitoring(
      'getDocuments',
      () => this.baseService.getDocuments(collectionName, options),
      cacheKey
    );
  }

  /**
   * Delete documents from a collection with cache invalidation
   */
  public async deleteDocuments(
    collectionName: string,
    ids?: string[],
    where?: Where,
    whereDocument?: WhereDocument
  ): Promise<void> {
    if (this.cacheService) {
      await this.invalidateCollectionCaches(collectionName);
    }

    return this.executeWithMonitoring(
      'deleteDocuments',
      () => this.baseService.deleteDocuments(collectionName, ids, where, whereDocument)
    );
  }

  /**
   * Search for similar documents with intelligent caching
   */
  public async searchDocuments(
    collectionName: string,
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions
  ): Promise<ChromaSearchResult> {
    // Cache search results for repeated queries
    const cacheKey = this.shouldCacheSearch(queryTexts, queryEmbeddings, options)
      ? this.generateCacheKey('searchDocuments', collectionName, queryTexts, queryEmbeddings, options)
      : undefined;

    return this.executeWithMonitoring(
      'searchDocuments',
      () => this.baseService.searchDocuments(collectionName, queryTexts, queryEmbeddings, options),
      cacheKey
    );
  }

  /**
   * Similarity search with automatic embedding generation and caching
   */
  async similaritySearch(
    collectionName: string,
    query: string | number[],
    options?: Omit<
      ChromaSearchOptions,
      | 'includeMetadata'
      | 'includeDocuments'
      | 'includeDistances'
      | 'includeEmbeddings'
    > & {
      limit?: number;
      filter?: Where;
      includeMetadata?: boolean;
      includeDocuments?: boolean;
      includeDistances?: boolean;
    }
  ): Promise<{
    ids: string[];
    documents: Array<string | null>;
    metadatas: Array<Record<string, unknown> | null>;
    distances: number[];
  }> {
    const cacheKey = typeof query === 'string'
      ? this.generateCacheKey('similaritySearch', collectionName, query, options)
      : undefined;

    return this.executeWithMonitoring(
      'similaritySearch',
      () => this.baseService.similaritySearch(collectionName, query, options),
      cacheKey
    );
  }

  /**
   * Count documents in a collection with caching
   */
  public async countDocuments(collectionName: string): Promise<number> {
    const cacheKey = this.generateCacheKey('countDocuments', collectionName);

    return this.executeWithMonitoring(
      'countDocuments',
      () => this.baseService.countDocuments(collectionName),
      cacheKey
    );
  }

  /**
   * Peek at documents in a collection with caching
   */
  public async peekDocuments(
    collectionName: string,
    limit = 10
  ): Promise<GetResult<ChromaMetadata>> {
    const cacheKey = this.generateCacheKey('peekDocuments', collectionName, limit);

    return this.executeWithMonitoring(
      'peekDocuments',
      () => this.baseService.peekDocuments(collectionName, limit),
      cacheKey
    );
  }

  /**
   * Get collection metadata with caching
   */
  public async getCollectionMetadata(
    collectionName: string
  ): Promise<ChromaMetadata | null> {
    const cacheKey = this.generateCacheKey('getCollectionMetadata', collectionName);

    return this.executeWithMonitoring(
      'getCollectionMetadata',
      () => this.baseService.getCollectionMetadata(collectionName),
      cacheKey
    );
  }

  /**
   * Update collection metadata with cache invalidation
   */
  public async updateCollectionMetadata(
    collectionName: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.delete(this.generateCacheKey('getCollectionMetadata', collectionName));
    }

    return this.executeWithMonitoring(
      'updateCollectionMetadata',
      () => this.baseService.updateCollectionMetadata(collectionName, metadata)
    );
  }

  // =====================================================================
  //  Service Methods
  // =====================================================================

  /**
   * Get performance metrics for operations
   */
  public getPerformanceMetrics(): OperationMetrics[] {
    if (!this.metricsService) {
      return [];
    }
    return this.metricsService.getMetrics();
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    if (this.metricsService) {
      this.metricsService.clearMetrics();
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): { hits: number; misses: number; size: number } {
    if (!this.cacheService) {
      return { hits: 0, misses: 0, size: 0 };
    }
    return this.cacheService.getStatistics();
  }

  /**
   * Clear all caches
   */
  public async clearCache(): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.clear();
    }
  }

  /**
   * Warm up cache for collection
   */
  public async warmUpCache(collectionName: string): Promise<void> {
    try {
      // Pre-load commonly accessed data
      await Promise.all([
        this.collectionExists(collectionName),
        this.countDocuments(collectionName),
        this.getCollectionMetadata(collectionName),
      ]);

      this.logger.debug(`Cache warmed up for collection: ${collectionName}`);
    } catch (error) {
      this.logger.warn(`Failed to warm up cache for collection ${collectionName}:`, error);
    }
  }

  // =====================================================================
  // Private Helper Methods
  // =====================================================================

  /**
   * Invalidate all caches related to a collection
   */
  private async invalidateCollectionCaches(collectionName: string): Promise<void> {
    if (!this.cacheService) {
      return;
    }

    const keysToInvalidate = [
      this.generateCacheKey('countDocuments', collectionName),
      this.generateCacheKey('getCollectionMetadata', collectionName),
      this.generateCacheKey('peekDocuments', collectionName),
      // Add pattern-based cache invalidation for search results
    ];

    await Promise.all(
      keysToInvalidate.map(key => this.cacheService!.delete(key))
    );
  }

  /**
   * Determine if operation should be cached
   */
  private shouldCache(options?: GetDocumentsOptions): boolean {
    if (!this.config.enableCaching) {
      return false;
    }

    // Don't cache if there are dynamic filters that might change frequently
    return !options?.where && !options?.whereDocument && !options?.ids;
  }

  /**
   * Determine if search should be cached
   */
  private shouldCacheSearch(
    queryTexts?: string[],
    queryEmbeddings?: number[][],
    options?: ChromaSearchOptions
  ): boolean {
    if (!this.config.enableCaching) {
      return false;
    }

    // Only cache text-based searches (embeddings might be dynamic)
    return !!queryTexts && !queryEmbeddings && !options?.where && !options?.whereDocument;
  }
}
