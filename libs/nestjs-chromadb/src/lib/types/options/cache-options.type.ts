/**
 * Cache-focused options types following Interface Segregation Principle
 * Handles caching strategies, TTL, and cache invalidation
 */

/**
 * Caching configuration for decorators and operations
 */
export interface CacheOptions {
  readonly enabled?: boolean;
  readonly defaultTtl?: number;
  readonly strategy?: 'memory' | 'redis' | 'custom';
  readonly keyPrefix?: string;
}

/**
 * Cache key generation options
 */
export interface CacheKeyOptions {
  readonly prefix?: string;
  readonly suffix?: string;
  readonly includeTimestamp?: boolean;
  readonly hashLongKeys?: boolean;
  readonly maxKeyLength?: number;
}

/**
 * Cache invalidation options
 */
export interface CacheInvalidationOptions {
  readonly pattern?: string;
  readonly tags?: readonly string[];
  readonly cascade?: boolean;
  readonly async?: boolean;
}

/**
 * Memory cache specific options
 */
export interface MemoryCacheOptions extends CacheOptions {
  readonly maxItems?: number;
  readonly evictionPolicy?: 'lru' | 'lfu' | 'fifo';
  readonly cleanupInterval?: number;
}

/**
 * Redis cache specific options
 */
export interface RedisCacheOptions extends CacheOptions {
  readonly connectionString?: string;
  readonly keyspace?: string;
  readonly serializer?: 'json' | 'msgpack' | 'custom';
  readonly compression?: boolean;
}
