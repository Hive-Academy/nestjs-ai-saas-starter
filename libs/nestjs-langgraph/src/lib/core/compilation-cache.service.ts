import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';
import { Inject, Optional } from '@nestjs/common';
import { LANGGRAPH_MODULE_OPTIONS } from '../constants';

export interface CacheEntry<T = any> {
  /**
   * Cached value
   */
  value: T;

  /**
   * Cache key
   */
  key: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last accessed timestamp
   */
  lastAccessedAt: Date;

  /**
   * Access count
   */
  accessCount: number;

  /**
   * TTL in milliseconds
   */
  ttl?: number;

  /**
   * Expiry timestamp
   */
  expiresAt?: Date;

  /**
   * Cache metadata
   */
  metadata?: Record<string, any>;
}

export interface CacheStats {
  /**
   * Total number of cached items
   */
  size: number;

  /**
   * Total cache hits
   */
  hits: number;

  /**
   * Total cache misses
   */
  misses: number;

  /**
   * Cache hit rate
   */
  hitRate: number;

  /**
   * Total memory used (approximate)
   */
  memoryUsed: number;

  /**
   * Oldest entry timestamp
   */
  oldestEntry?: Date;

  /**
   * Newest entry timestamp
   */
  newestEntry?: Date;
}

@Injectable()
export class CompilationCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CompilationCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(
    @Optional()
    @Inject(LANGGRAPH_MODULE_OPTIONS)
    private readonly options?: LangGraphModuleOptions
  ) {
    this.maxSize = options?.workflows?.maxCached || 100;
    this.defaultTTL = options?.workflows?.cacheTTL || 3600000; // 1 hour

    // Start cleanup interval
    this.startCleanupInterval();
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get a cached item
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    // Update access stats
    entry.lastAccessedAt = new Date();
    entry.accessCount++;
    this.stats.hits++;

    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.value as T;
  }

  /**
   * Set a cached item
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const effectiveTTL = ttl || this.defaultTTL;
    const now = new Date();

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      ttl: effectiveTTL,
      expiresAt: new Date(now.getTime() + effectiveTTL),
      metadata,
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached item with key: ${key}`);
  }

  /**
   * Delete a cached item
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Deleted cache entry: ${key}`);
    }
    return deleted;
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    const {size} = this.cache;
    this.cache.clear();
    this.logger.debug(`Cleared ${size} cache entries`);
  }

  /**
   * Get or set a cached item
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(
        `Invalidated ${keysToDelete.length} cache entries matching pattern`
      );
    }

    return keysToDelete.length;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    let memoryUsed = 0;

    for (const entry of this.cache.values()) {
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }

      // Approximate memory usage (very rough estimate)
      memoryUsed += JSON.stringify(entry).length;
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      memoryUsed,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Warm up cache with precompiled workflows
   */
  async warmUp(
    items: Array<{
      key: string;
      factory: () => Promise<any> | any;
      ttl?: number;
    }>
  ): Promise<void> {
    this.logger.log(`Warming up cache with ${items.length} items`);

    const promises = items.map(async (item) => {
      try {
        const value = await item.factory();
        await this.set(item.key, value, item.ttl);
      } catch (error) {
        this.logger.error(
          `Failed to warm up cache for key ${item.key}:`,
          error
        );
      }
    });

    await Promise.all(promises);
    this.logger.log('Cache warm-up completed');
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries sorted by access time
   */
  getEntriesByAccessTime(limit = 10): CacheEntry[] {
    const entries = Array.from(this.cache.values());
    entries.sort(
      (a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime()
    );
    return entries.slice(0, limit);
  }

  /**
   * Get cache entries sorted by access count
   */
  getEntriesByAccessCount(limit = 10): CacheEntry[] {
    const entries = Array.from(this.cache.values());
    entries.sort((a, b) => b.accessCount - a.accessCount);
    return entries.slice(0, limit);
  }

  /**
   * Private: Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.expiresAt) {
      return false;
    }
    return new Date() > entry.expiresAt;
  }

  /**
   * Private: Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.logger.debug(`Evicted LRU cache entry: ${lruKey}`);
    }
  }

  /**
   * Private: Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Private: Cleanup expired entries
   */
  private cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(
        `Cleaned up ${keysToDelete.length} expired cache entries`
      );
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
    };
    this.logger.debug('Reset cache statistics');
  }

  /**
   * Export cache for persistence
   */
  export(): Array<{ key: string; entry: CacheEntry }> {
    const entries: Array<{ key: string; entry: CacheEntry }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        entries.push({ key, entry });
      }
    }

    return entries;
  }

  /**
   * Import cache from persistence
   */
  import(entries: Array<{ key: string; entry: CacheEntry }>): void {
    for (const { key, entry } of entries) {
      if (!this.isExpired(entry)) {
        this.cache.set(key, entry);
      }
    }

    this.logger.debug(`Imported ${entries.length} cache entries`);
  }
}
