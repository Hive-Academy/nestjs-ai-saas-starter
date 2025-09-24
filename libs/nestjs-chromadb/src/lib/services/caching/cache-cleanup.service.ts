import { Injectable, Logger } from '@nestjs/common';
import { ICacheCleanup, CacheEntry, CacheConfig } from './cache-interfaces';
import {
  CacheKeyGeneratorService,
  TtlCalculatorService,
} from './cache-utilities.service';

/**
 * Cache cleanup and eviction service - handles cache maintenance operations
 * Follows Single Responsibility Principle
 */
@Injectable()
export class CacheCleanupService implements ICacheCleanup {
  private readonly logger = new Logger(CacheCleanupService.name);

  constructor(
    private readonly cache: Map<string, CacheEntry>,
    private readonly config: Required<CacheConfig>,
    private readonly keyGenerator: CacheKeyGeneratorService,
    private readonly ttlCalculator: TtlCalculatorService
  ) {}

  /**
   * Delete entries matching a pattern
   */
  async deletePattern(pattern: string | RegExp): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.debug(
        `Deleted ${keysToDelete.length} cache entries matching pattern: ${pattern}`
      );
    }

    return keysToDelete.length;
  }

  /**
   * Remove expired entries from cache
   */
  async evictExpired(): Promise<number> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.ttlCalculator.isExpired(entry.expiresAt)) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      expiredKeys.forEach((key) => this.cache.delete(key));
      this.logger.debug(
        `Cleaned up ${expiredKeys.length} expired cache entries`
      );
    }

    return expiredKeys.length;
  }

  /**
   * Invalidate all cache entries for a specific collection
   */
  async invalidateCollection(collectionName: string): Promise<number> {
    const pattern = this.keyGenerator.generateCollectionKey(collectionName);
    return await this.deletePattern(pattern);
  }

  /**
   * Invalidate cache entries by operation type
   */
  async invalidateByOperation(operation: string): Promise<number> {
    const pattern = this.keyGenerator.generateOperationKey(operation);
    return await this.deletePattern(pattern);
  }

  /**
   * Evict least recently used entries
   */
  async evictLeastRecentlyUsed(count: number): Promise<number> {
    if (!this.config.enableLRU || count <= 0) {
      return 0;
    }

    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    entries.forEach(([key]) => {
      this.cache.delete(key);
    });

    if (entries.length > 0) {
      this.logger.debug(`Evicted ${entries.length} LRU cache entries`);
    }

    return entries.length;
  }

  /**
   * Evict entries by size to free up specified amount of memory
   */
  async evictBySize(targetSize: number): Promise<number> {
    let evictedSize = 0;
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    ); // LRU order

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      evictedSize += entry.size;

      if (evictedSize >= targetSize) {
        break;
      }
    }

    if (evictedSize > 0) {
      this.logger.debug(
        `Evicted ${(evictedSize / 1024 / 1024).toFixed(1)}MB from cache`
      );
    }

    return evictedSize;
  }

  /**
   * Smart cache eviction for vector operations
   * Prioritizes keeping vector searches and embeddings
   */
  async evictSmartVector(targetSize: number): Promise<number> {
    const entries = Array.from(this.cache.entries());

    // Separate vector and non-vector entries
    const vectorEntries: Array<[string, CacheEntry]> = [];
    const nonVectorEntries: Array<[string, CacheEntry]> = [];

    entries.forEach(([key, entry]) => {
      if (
        key.startsWith('chroma:vectorSearch:') ||
        key.startsWith('chroma:embedding:')
      ) {
        vectorEntries.push([key, entry]);
      } else {
        nonVectorEntries.push([key, entry]);
      }
    });

    // Sort non-vector entries by LRU
    nonVectorEntries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Sort vector entries by access count and recency (keep frequently used)
    vectorEntries.sort(([, a], [, b]) => {
      const scoreA = a.accessCount + (Date.now() - a.lastAccessed) / 1000000;
      const scoreB = b.accessCount + (Date.now() - b.lastAccessed) / 1000000;
      return scoreA - scoreB;
    });

    let evictedSize = 0;

    // First evict non-vector entries
    for (const [key, entry] of nonVectorEntries) {
      this.cache.delete(key);
      evictedSize += entry.size;

      if (evictedSize >= targetSize) {
        break;
      }
    }

    // If still need to evict, remove least valuable vector entries
    if (evictedSize < targetSize) {
      for (const [key, entry] of vectorEntries) {
        this.cache.delete(key);
        evictedSize += entry.size;

        if (evictedSize >= targetSize) {
          break;
        }
      }
    }

    if (evictedSize > 0) {
      this.logger.debug(
        `Smart vector eviction: ${(evictedSize / 1024 / 1024).toFixed(
          1
        )}MB removed`
      );
    }

    return evictedSize;
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
    const sizeBefore = this.cache.size;
    const memoryBefore = this.getTotalSizeBytes();

    // Remove expired entries
    const expiredRemoved = await this.evictExpired();

    // Check if additional eviction is needed
    const currentSize = this.getTotalSizeBytes();
    if (currentSize > this.config.maxSizeBytes * 0.8) {
      const targetEviction = currentSize - this.config.maxSizeBytes * 0.7;
      await this.evictSmartVector(targetEviction);
    }

    const sizeAfter = this.cache.size;
    const memoryAfter = this.getTotalSizeBytes();
    const memoryFreed = memoryBefore - memoryAfter;

    this.logger.debug(
      `Maintenance completed: removed ${expiredRemoved} expired entries, freed ${(
        memoryFreed /
        1024 /
        1024
      ).toFixed(1)}MB`
    );

    return {
      expiredRemoved,
      sizeBefore,
      sizeAfter,
      memoryFreed,
    };
  }

  /**
   * Force eviction if necessary based on new entry size
   */
  async evictIfNecessary(newEntrySize: number): Promise<void> {
    // Check entry count limit
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLeastRecentlyUsed(1);
    }

    // Check size limit
    const currentSize = this.getTotalSizeBytes();
    if (currentSize + newEntrySize > this.config.maxSizeBytes) {
      const targetSize = this.config.maxSizeBytes * 0.8; // Evict to 80% capacity
      const sizeToEvict = currentSize + newEntrySize - targetSize;
      await this.evictSmartVector(sizeToEvict);
    }
  }

  // =====================================================================
  // Private Methods
  // =====================================================================

  /**
   * Get total size of all cache entries in bytes
   */
  private getTotalSizeBytes(): number {
    return Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );
  }
}
