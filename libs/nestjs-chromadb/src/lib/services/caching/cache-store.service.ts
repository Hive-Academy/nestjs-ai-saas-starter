import { Injectable, Logger } from '@nestjs/common';
import type {
  CacheEntry,
  CacheConfig,
  MutableCacheStats,
} from './cache-interfaces';

/**
 * Central cache storage service
 * Owns the cache Map, configuration, and statistics
 * Eliminates the need for DI of primitive types
 */
@Injectable()
export class CacheStore {
  private readonly logger = new Logger(CacheStore.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly stats: MutableCacheStats = { hits: 0, misses: 0 };
  private readonly config: Required<CacheConfig> = {
    maxSize: 1000,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    defaultTtl: 300000, // 5 minutes
    cleanupInterval: 60000, // 1 minute
    enableLRU: true,
    enableStatistics: true,
  };

  constructor() {
    this.logger.debug('CacheStore initialized');
  }

  /**
   * Get the cache Map instance
   */
  getCache(): Map<string, CacheEntry> {
    return this.cache;
  }

  /**
   * Get the cache statistics object
   */
  getStats(): MutableCacheStats {
    return this.stats;
  }

  /**
   * Get the cache configuration
   */
  getConfig(): Required<CacheConfig> {
    return this.config;
  }

  /**
   * Update cache configuration (optional, if needed)
   */
  updateConfig(updates: Partial<CacheConfig>): void {
    Object.assign(this.config, updates);
    this.logger.debug('Cache configuration updated', updates);
  }
}
