import { Injectable, Logger } from '@nestjs/common';
import type {
  ICacheOperations,
  CacheEntry,
  CacheConfig,
  MutableCacheStats,
} from './cache-interfaces';
import {
  TtlCalculatorService,
  SizeEstimatorService,
} from './cache-utilities.service';

/**
 * Core cache operations service - handles basic cache CRUD operations
 * Follows Single Responsibility Principle
 */
@Injectable()
export class CacheOperationsService implements ICacheOperations {
  private readonly logger = new Logger(CacheOperationsService.name);

  constructor(
    private readonly cache: Map<string, CacheEntry>,
    private readonly config: Required<CacheConfig>,
    private readonly stats: MutableCacheStats,
    private readonly ttlCalculator: TtlCalculatorService,
    private readonly sizeEstimator: SizeEstimatorService
  ) {}

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStatistics) {
        this.stats.misses++;
      }
      return null;
    }

    // Check if expired
    if (this.ttlCalculator.isExpired(entry.expiresAt)) {
      this.cache.delete(key);
      if (this.config.enableStatistics) {
        this.stats.misses++;
      }
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    if (this.config.enableStatistics) {
      this.stats.hits++;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.value as T;
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.config.defaultTtl);
    const size = this.sizeEstimator.estimateSize(value);

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      size,
    };

    // Check size constraints before adding
    if (size > this.config.maxSizeBytes) {
      this.logger.warn(`Value too large for cache: ${key} (${size} bytes)`);
      return;
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Check if eviction is needed (delegate to cleanup service later)
    if (this.needsEviction(size)) {
      await this.requestEviction(size);
    }

    this.cache.set(key, entry);
    this.logger.debug(
      `Cache set for key: ${key} (expires in ${
        ttl ?? this.config.defaultTtl
      }ms)`
    );
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted for key: ${key}`);
    }
    return deleted;
  }

  /**
   * Check if key exists in cache (without updating access stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.ttlCalculator.isExpired(entry.expiresAt)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.debug('Cache cleared');
  }

  /**
   * Refresh TTL for a key
   */
  async refreshTtl(key: string, ttl?: number): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + (ttl ?? this.config.defaultTtl);
    this.logger.debug(`TTL refreshed for key: ${key}`);
    return true;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries (for debugging)
   */
  getEntries(): { key: string; entry: CacheEntry }[] {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
    }));
  }

  /**
   * Get total size of all cache entries in bytes
   */
  getTotalSizeBytes(): number {
    return Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );
  }

  // =====================================================================
  // Private Methods
  // =====================================================================

  /**
   * Check if eviction is needed
   */
  private needsEviction(newEntrySize: number): boolean {
    // Check entry count limit
    if (this.cache.size >= this.config.maxSize) {
      return true;
    }

    // Check size limit
    const currentSize = this.getTotalSizeBytes();
    return currentSize + newEntrySize > this.config.maxSizeBytes;
  }

  /**
   * Request eviction from cleanup service (placeholder for coordination)
   * This will be coordinated through the main cache service
   */
  private async requestEviction(newEntrySize: number): Promise<void> {
    // This is a placeholder - actual eviction will be handled by cleanup service
    // through coordination in the main cache service
    this.logger.debug(`Eviction requested for ${newEntrySize} bytes`);
  }
}
