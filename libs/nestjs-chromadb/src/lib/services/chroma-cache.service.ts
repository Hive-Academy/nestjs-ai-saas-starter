import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  size: number;
  totalSizeBytes: number;
  entries: number;
  hitRate: number;
  averageAccessCount: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxSize?: number; // Maximum number of entries
  maxSizeBytes?: number; // Maximum size in bytes
  defaultTtl?: number; // Default TTL in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
  enableLRU?: boolean; // Enable LRU eviction
  enableStatistics?: boolean; // Enable hit/miss tracking
}

/**
 * Intelligent in-memory cache service for ChromaDB operations
 * Features:
 * - TTL (Time To Live) support
 * - LRU (Least Recently Used) eviction
 * - Size-based eviction
 * - Statistics tracking
 * - Pattern-based cache invalidation
 */
@Injectable()
export class ChromaCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ChromaCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly config: Required<CacheConfig>;
  private readonly stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupTimer?: NodeJS.Timer;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: 1000,
      maxSizeBytes: 100 * 1024 * 1024, // 100MB
      defaultTtl: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableLRU: true,
      enableStatistics: true,
      ...config,
    };

    this.startCleanupTimer();
    this.logger.log('ChromaCacheService initialized');
  }

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
    if (Date.now() > entry.expiresAt) {
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
    const size = this.estimateSize(value);

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

    // Evict entries if necessary
    await this.evictIfNecessary(size);

    this.cache.set(key, entry);
    this.logger.debug(`Cache set for key: ${key} (expires in ${ttl ?? this.config.defaultTtl}ms)`);
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
    if (Date.now() > entry.expiresAt) {
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
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    if (!this.config.enableStatistics) {
      return {
        hits: 0,
        misses: 0,
        size: this.cache.size,
        totalSizeBytes: this.getTotalSizeBytes(),
        entries: this.cache.size,
        hitRate: 0,
        averageAccessCount: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }

    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate = totalOperations > 0 ? this.stats.hits / totalOperations : 0;

    const entries = Array.from(this.cache.values());
    const totalAccessCount = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const averageAccessCount = entries.length > 0 ? totalAccessCount / entries.length : 0;

    const creationTimes = entries.map(entry => entry.createdAt);
    const oldestEntry = creationTimes.length > 0 ? Math.min(...creationTimes) : 0;
    const newestEntry = creationTimes.length > 0 ? Math.max(...creationTimes) : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      totalSizeBytes: this.getTotalSizeBytes(),
      entries: this.cache.size,
      hitRate,
      averageAccessCount,
      oldestEntry,
      newestEntry,
    };
  }

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

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug(`Deleted ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    }
    
    return keysToDelete.length;
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
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
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
   * Get cache health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    statistics: CacheStatistics;
  } {
    const stats = this.getStatistics();
    const issues: string[] = [];

    // Check cache utilization
    if (stats.entries >= this.config.maxSize * 0.9) {
      issues.push(`Cache near capacity: ${stats.entries}/${this.config.maxSize} entries`);
    }

    if (stats.totalSizeBytes >= this.config.maxSizeBytes * 0.9) {
      issues.push(`Cache memory near limit: ${(stats.totalSizeBytes / 1024 / 1024).toFixed(1)}MB/${(this.config.maxSizeBytes / 1024 / 1024).toFixed(1)}MB`);
    }

    // Check hit rate
    if (stats.hitRate < 0.5 && this.stats.hits + this.stats.misses > 100) {
      issues.push(`Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, issues, statistics: stats };
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
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      expiredKeys.forEach(key => this.cache.delete(key));
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Evict entries if cache is at capacity
   */
  private async evictIfNecessary(newEntrySize: number): Promise<void> {
    // Check entry count limit
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLeastRecentlyUsed(1);
    }

    // Check size limit
    const currentSize = this.getTotalSizeBytes();
    if (currentSize + newEntrySize > this.config.maxSizeBytes) {
      const targetSize = this.config.maxSizeBytes * 0.8; // Evict to 80% capacity
      const sizeToEvict = currentSize + newEntrySize - targetSize;
      await this.evictBySize(sizeToEvict);
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLeastRecentlyUsed(count: number): Promise<void> {
    if (!this.config.enableLRU || count <= 0) {
      return;
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
  }

  /**
   * Evict entries by size
   */
  private async evictBySize(targetSize: number): Promise<void> {
    let evictedSize = 0;
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed); // LRU order

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      evictedSize += entry.size;
      
      if (evictedSize >= targetSize) {
        break;
      }
    }

    if (evictedSize > 0) {
      this.logger.debug(`Evicted ${(evictedSize / 1024 / 1024).toFixed(1)}MB from cache`);
    }
  }

  /**
   * Get total size of all cache entries in bytes
   */
  private getTotalSizeBytes(): number {
    return Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateSize(value: unknown): number {
    if (value === null || value === undefined) {
      return 8; // Basic overhead
    }

    try {
      // For simple types
      if (typeof value === 'string') {
        return value.length * 2; // UTF-16 encoding
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return 8;
      }

      // For complex objects, use JSON serialization as estimate
      const json = JSON.stringify(value);
      return json.length * 2 + 64; // Add overhead for object structure
    } catch {
      // Fallback for non-serializable objects
      return 1024; // 1KB estimate
    }
  }
}