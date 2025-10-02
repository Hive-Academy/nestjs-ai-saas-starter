/**
 * @fileoverview Cache Types and Interfaces
 * Extracted from cached.decorator.ts for better architecture compliance
 */

/**
 * Configuration for @Cached decorator
 */
export interface CachedConfig extends Record<string, unknown> {
  /** Cache timeout in milliseconds */
  readonly ttl?: number;

  /** Cache key strategy */
  readonly keyStrategy?: 'auto' | 'manual' | 'method_name' | 'collection_aware';

  /** Custom cache key generator */
  readonly keyGenerator?: (...args: any[]) => string;

  /** Cache collection-aware operations */
  readonly collectionAware?: boolean;

  /** Invalidate cache on mutation operations */
  readonly invalidateOnMutation?: boolean;

  /** Cache only successful results */
  readonly cacheOnlySuccess?: boolean;

  /** Compress cached data */
  readonly compress?: boolean;

  /** Cache namespace for isolation */
  readonly namespace?: string;

  /** Maximum cache size for this method */
  readonly maxSize?: number;

  /** Enable cache statistics */
  readonly enableStats?: boolean;

  /** Cache refresh strategy */
  readonly refreshStrategy?: 'none' | 'background' | 'on_access';

  /** Refresh threshold (when to trigger background refresh) */
  readonly refreshThreshold?: number; // 0-1, percentage of TTL
}

/**
 * Cache statistics interface
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  lastAccess: Date;
}
