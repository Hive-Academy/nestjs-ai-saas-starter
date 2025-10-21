import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type {
  ICacheOperations,
  ICacheStatistics,
  ICacheCleanup,
  IVectorCacheOperations,
  CacheConfig,
  CacheStatistics,
  VectorStatistics,
  HealthStatus,
  CacheEntry,
} from './cache-interfaces';
import { CacheOperationsService } from './cache-operations.service';
import { CacheStatisticsService } from './cache-statistics.service';
import { CacheCleanupService } from './cache-cleanup.service';
import { VectorCacheService } from './vector-cache.service';
import { CacheStore } from './cache-store.service';
import { SizeEstimatorService } from './cache-utilities.service';

/**
 * Main ChromaDB Cache Service - Facade coordinating all cache operations
 * Implements the Facade pattern to provide a unified interface
 * Follows Single Responsibility Principle by delegating to specialized services
 */
@Injectable()
export class ChromaCacheService
  implements
    ICacheOperations,
    ICacheStatistics,
    ICacheCleanup,
    IVectorCacheOperations,
    OnModuleDestroy
{
  private readonly logger = new Logger(ChromaCacheService.name);
  private readonly cache: Map<string, CacheEntry>;
  private readonly config: Required<CacheConfig>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly cacheStore: CacheStore,
    private readonly cacheOps: CacheOperationsService,
    private readonly cacheStats: CacheStatisticsService,
    private readonly cacheCleanup: CacheCleanupService,
    private readonly vectorCache: VectorCacheService,
    private readonly sizeEstimator: SizeEstimatorService
  ) {
    // Get shared infrastructure from CacheStore
    this.cache = this.cacheStore.getCache();
    this.config = this.cacheStore.getConfig();

    this.startCleanupTimer();
    this.logger.log('ChromaCacheService initialized with segregated services');
  }

  // =====================================================================
  // ICacheOperations Interface
  // =====================================================================

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await this.cacheOps.get<T>(key);

    // Update shared statistics
    if (result !== null) {
      this.cacheStats.incrementHits();
    } else {
      this.cacheStats.incrementMisses();
    }

    return result;
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    // Check if eviction is needed before setting
    const newEntrySize = this.sizeEstimator.estimateSize(value);

    if (this.needsEviction(newEntrySize)) {
      await this.cacheCleanup.evictIfNecessary(newEntrySize);
    }

    await this.cacheOps.set(key, value, ttl);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return await this.cacheOps.delete(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cacheOps.has(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.cacheOps.clear();
    // Statistics are reset in cacheOps.clear()
  }

  /**
   * Refresh TTL for a key
   */
  async refreshTtl(key: string, ttl?: number): Promise<boolean> {
    return await this.cacheOps.refreshTtl(key, ttl);
  }

  // =====================================================================
  // ICacheStatistics Interface
  // =====================================================================

  /**
   * Increment cache hits (delegated to statistics service)
   */
  incrementHits(): void {
    this.cacheStats.incrementHits();
  }

  /**
   * Increment cache misses (delegated to statistics service)
   */
  incrementMisses(): void {
    this.cacheStats.incrementMisses();
  }

  /**
   * Get cache statistics
   */
  getStatistics(): Readonly<CacheStatistics> {
    return this.cacheStats.getStatistics();
  }

  /**
   * Get vector-specific statistics
   */
  getVectorStatistics(): Readonly<VectorStatistics> {
    return this.cacheStats.getVectorStatistics();
  }

  /**
   * Get cache health status
   */
  getHealthStatus(): HealthStatus {
    return this.cacheStats.getHealthStatus();
  }

  // =====================================================================
  // ICacheCleanup Interface
  // =====================================================================

  /**
   * Delete entries matching a pattern
   */
  async deletePattern(pattern: string | RegExp): Promise<number> {
    return await this.cacheCleanup.deletePattern(pattern);
  }

  /**
   * Remove expired entries from cache
   */
  async evictExpired(): Promise<number> {
    return await this.cacheCleanup.evictExpired();
  }

  /**
   * Invalidate all cache entries for a specific collection
   */
  async invalidateCollection(collectionName: string): Promise<number> {
    return await this.cacheCleanup.invalidateCollection(collectionName);
  }

  /**
   * Invalidate cache entries by operation type
   */
  async invalidateByOperation(operation: string): Promise<number> {
    return await this.cacheCleanup.invalidateByOperation(operation);
  }

  // =====================================================================
  // IVectorCacheOperations Interface
  // =====================================================================

  /**
   * Cache vector search results
   */
  async cacheVectorSearch(
    collectionName: string,
    queryHash: string,
    results: any,
    ttl?: number
  ): Promise<void> {
    return await this.vectorCache.cacheVectorSearch(
      collectionName,
      queryHash,
      results,
      ttl
    );
  }

  /**
   * Get cached vector search results
   */
  async getCachedVectorSearch(
    collectionName: string,
    queryHash: string
  ): Promise<any | null> {
    return await this.vectorCache.getCachedVectorSearch(
      collectionName,
      queryHash
    );
  }

  /**
   * Cache embedding results
   */
  async cacheEmbedding(
    text: string,
    embedding: number[],
    ttl?: number
  ): Promise<void> {
    return await this.vectorCache.cacheEmbedding(text, embedding, ttl);
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(text: string): Promise<number[] | null> {
    return await this.vectorCache.getCachedEmbedding(text);
  }

  /**
   * Batch cache embeddings
   */
  async cacheEmbeddingBatch(
    textEmbeddingPairs: Array<{ text: string; embedding: number[] }>,
    ttl?: number
  ): Promise<void> {
    return await this.vectorCache.cacheEmbeddingBatch(textEmbeddingPairs, ttl);
  }

  /**
   * Preload commonly used embeddings
   */
  async preloadEmbeddings(
    texts: string[],
    embeddingGenerator: (texts: string[]) => Promise<number[][]>
  ): Promise<void> {
    return await this.vectorCache.preloadEmbeddings(texts, embeddingGenerator);
  }

  // =====================================================================
  // Additional Public Methods
  // =====================================================================

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return this.cacheOps.getKeys();
  }

  /**
   * Get cache entries (for debugging)
   */
  getEntries(): { key: string; entry: CacheEntry }[] {
    return this.cacheOps.getEntries();
  }

  /**
   * Perform comprehensive cache maintenance
   */
  async performMaintenance(): Promise<{
    expiredRemoved: number;
    sizeBefore: number;
    sizeAfter: number;
    memoryFreed: number;
  }> {
    return await this.cacheCleanup.performMaintenance();
  }

  /**
   * Lifecycle hook - cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    this.logger.log('ChromaCacheService destroyed');
  }

  // =====================================================================
  // Private Methods
  // =====================================================================

  /**
   * Start the cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cacheCleanup.evictExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Check if eviction is needed
   */
  private needsEviction(newEntrySize: number): boolean {
    // Check entry count limit
    if (this.cache.size >= this.config.maxSize) {
      return true;
    }

    // Check size limit
    const currentSize = this.cacheOps.getTotalSizeBytes();
    return currentSize + newEntrySize > this.config.maxSizeBytes;
  }
}
