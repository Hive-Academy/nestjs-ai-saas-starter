/**
 * @fileoverview @Cached Decorator - Intelligent Vector-Aware Caching
 *
 * This decorator provides intelligent caching with collection-aware invalidation
 * specifically designed for vector database operations.
 */

import { Logger } from '@nestjs/common';
import type { ChromaCacheService } from '../../services/caching/chroma-cache.service';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../core/decorator-metadata';

/**
 * Configuration for @Cached decorator
 */
export interface CachedConfig {
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

/**
 * @Cached decorator for intelligent caching with collection-aware invalidation
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class DocumentService {
 *   @Cached({
 *     ttl: 300000, // 5 minutes
 *     collectionAware: true,
 *     invalidateOnMutation: true,
 *     keyStrategy: 'collection_aware',
 *     namespace: 'documents',
 *   })
 *   async getDocuments(collectionName: string, limit: number): Promise<Document[]> {
 *     // This will be cached with collection-aware key
 *     return this.chromaService.getDocuments(collectionName, { limit });
 *   }
 *
 *   @Cached({
 *     ttl: 60000, // 1 minute
 *     keyGenerator: (query, collection, options) => `search:${collection}:${query}:${JSON.stringify(options)}`,
 *     refreshStrategy: 'background',
 *     refreshThreshold: 0.8,
 *   })
 *   async searchDocuments(query: string, collection: string, options: any): Promise<SearchResult[]> {
 *     // Custom cache key with background refresh
 *     return this.chromaService.searchDocuments(collection, [query], undefined, options);
 *   }
 * }
 * ```
 */
export function Cached(config: CachedConfig = {}): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createPerformanceMetadata(
      'Cached',
      'method',
      [], // No dependencies
      config
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    // Store original method
    const originalMethod = descriptor.value;
    const logger = new Logger(`Cached:${target.constructor.name}`);

    // Cache statistics
    const statistics: CacheStatistics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      lastAccess: new Date(),
    };

    // Replace method with cached implementation
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      statistics.totalRequests++;
      statistics.lastAccess = new Date();

      try {
        // Get cache service
        const cacheService = getCacheService(this);

        // Generate cache key
        const cacheKey = generateCacheKey(
          config,
          target.constructor.name,
          String(propertyKey),
          args
        );

        // Try to get from cache
        const cached = await cacheService.get(cacheKey);

        if (cached !== null) {
          // Cache hit
          statistics.hits++;
          updateStatistics();

          if (config.enableStats) {
            logger.debug(`Cache hit for key: ${cacheKey}`);
          }

          // Check if background refresh is needed
          if (config.refreshStrategy === 'background') {
            await handleBackgroundRefresh(
              cacheService,
              cacheKey,
              originalMethod,
              args,
              config
            );
          }

          return cached;
        }

        // Cache miss - execute original method
        statistics.misses++;

        if (config.enableStats) {
          logger.debug(`Cache miss for key: ${cacheKey}`);
        }

        const result = await originalMethod.apply(this, args);

        // Cache result if successful or if configured to cache all results
        if (shouldCacheResult(result, config)) {
          const ttl = config.ttl || 300000; // Default 5 minutes
          await cacheService.set(cacheKey, result, ttl);

          if (config.enableStats) {
            logger.debug(`Cached result for key: ${cacheKey}, TTL: ${ttl}ms`);
          }
        }

        updateStatistics();
        return result;
      } catch (error) {
        updateStatistics();
        throw error;
      }

      function updateStatistics(): void {
        const responseTime = Date.now() - startTime;
        statistics.hitRate = statistics.hits / statistics.totalRequests;
        statistics.averageResponseTime =
          (statistics.averageResponseTime * (statistics.totalRequests - 1) +
            responseTime) /
          statistics.totalRequests;
      }
    };

    // Add cache management methods to the instance
    Object.defineProperty(target, `${String(propertyKey)}_cacheStats`, {
      value: () => ({ ...statistics }),
      writable: false,
      enumerable: false,
    });

    Object.defineProperty(target, `${String(propertyKey)}_clearCache`, {
      value: async function () {
        const cacheService = getCacheService(this);
        const pattern = generateCacheKeyPattern(
          config,
          target.constructor.name,
          String(propertyKey)
        );
        await cacheService.deleteByPattern(pattern);

        if (config.enableStats) {
          logger.debug(`Cleared cache for pattern: ${pattern}`);
        }
      },
      writable: false,
      enumerable: false,
    });

    return descriptor;
  };
}

/**
 * Get cache service from class instance
 */
function getCacheService(instance: any): ChromaCacheService {
  // Try to find cache service in instance
  if (instance.cacheService) {
    return instance.cacheService;
  }

  if (instance.chromaCacheService) {
    return instance.chromaCacheService;
  }

  // Look for any service with cache methods
  for (const key of Object.keys(instance)) {
    const service = instance[key];
    if (
      service &&
      typeof service.get === 'function' &&
      typeof service.set === 'function'
    ) {
      return service;
    }
  }

  // Fallback to in-memory cache
  return getDefaultCacheService();
}

/**
 * Generate cache key based on configuration
 */
function generateCacheKey(
  config: CachedConfig,
  className: string,
  methodName: string,
  args: any[]
): string {
  const namespace = config.namespace || 'chroma';

  if (config.keyGenerator) {
    const customKey = config.keyGenerator(...args);
    return `${namespace}:${className}:${methodName}:${customKey}`;
  }

  switch (config.keyStrategy) {
    case 'manual': {
      // Use first argument as key
      return `${namespace}:${className}:${methodName}:${args[0] || 'default'}`;
    }
    case 'method_name': {
      // Use only method name
      return `${namespace}:${className}:${methodName}`;
    }
    case 'collection_aware': {
      // Special handling for collection-based operations
      const collectionName = extractCollectionName(args);
      const argsHash = hashArgs(args.slice(1)); // Skip collection name
      return `${namespace}:${className}:${methodName}:${collectionName}:${argsHash}`;
    }
    case 'auto':
    default: {
      // Hash all arguments
      const argsKey = hashArgs(args);
      return `${namespace}:${className}:${methodName}:${argsKey}`;
    }
  }
}

/**
 * Generate cache key pattern for bulk operations
 */
function generateCacheKeyPattern(
  config: CachedConfig,
  className: string,
  methodName: string
): string {
  const namespace = config.namespace || 'chroma';
  return `${namespace}:${className}:${methodName}:*`;
}

/**
 * Extract collection name from arguments
 */
function extractCollectionName(args: any[]): string {
  // Common patterns for collection name in arguments
  if (args.length > 0) {
    const first = args[0];

    // Direct string collection name
    if (typeof first === 'string') {
      return first;
    }

    // Object with collection property
    if (first && typeof first === 'object' && first.collection) {
      return first.collection;
    }

    // Object with collectionName property
    if (first && typeof first === 'object' && first.collectionName) {
      return first.collectionName;
    }
  }

  return 'unknown';
}

/**
 * Simple hash function for arguments
 */
function hashArgs(args: any[]): string {
  try {
    const str = JSON.stringify(args, (key, value) => {
      // Handle functions and circular references
      if (typeof value === 'function') {
        return value.toString();
      }
      return value;
    });

    return Buffer.from(str).toString('base64').substring(0, 16);
  } catch (error) {
    // Fallback for circular references
    return Buffer.from(String(args.length)).toString('base64');
  }
}

/**
 * Determine if result should be cached
 */
function shouldCacheResult(result: any, config: CachedConfig): boolean {
  if (config.cacheOnlySuccess === false) {
    return true; // Cache all results
  }

  // Don't cache null, undefined, or empty results by default
  if (result === null || result === undefined) {
    return false;
  }

  // Don't cache empty arrays or objects
  if (Array.isArray(result) && result.length === 0) {
    return false;
  }

  if (typeof result === 'object' && Object.keys(result).length === 0) {
    return false;
  }

  return true;
}

/**
 * Handle background refresh for cache entries
 */
async function handleBackgroundRefresh(
  cacheService: ChromaCacheService,
  cacheKey: string,
  originalMethod: (...args: any[]) => any,
  args: any[],
  config: CachedConfig
): Promise<void> {
  if (!config.refreshThreshold) {
    return;
  }

  try {
    // Get cache metadata to check TTL
    const metadata = await cacheService.getMetadata(cacheKey);

    if (metadata && metadata.ttl) {
      const timeLeft = metadata.ttl - (Date.now() - metadata.created);
      const totalTtl = config.ttl || 300000;
      const refreshPoint = totalTtl * config.refreshThreshold;

      if (timeLeft <= refreshPoint) {
        // Background refresh needed
        setImmediate(async () => {
          try {
            const newResult = await originalMethod.apply(this, args);
            await cacheService.set(cacheKey, newResult, config.ttl || 300000);
          } catch (error) {
            // Silent failure for background refresh
            console.warn('Background cache refresh failed:', error.message);
          }
        });
      }
    }
  } catch (error) {
    // Silent failure for background refresh check
  }
}

/**
 * Default in-memory cache service fallback
 */
function getDefaultCacheService(): ChromaCacheService {
  const cache = new Map<string, { value: any; expires: number }>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = cache.get(key);
      if (!entry) {
        return null;
      }

      if (Date.now() > entry.expires) {
        cache.delete(key);
        return null;
      }

      return entry.value;
    },

    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      cache.set(key, {
        value,
        expires: Date.now() + ttl,
      });
    },

    async delete(key: string): Promise<void> {
      cache.delete(key);
    },

    async deleteByPattern(pattern: string): Promise<void> {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
        }
      }
    },

    async clear(): Promise<void> {
      cache.clear();
    },

    async getMetadata(
      key: string
    ): Promise<{ created: number; ttl: number } | null> {
      const entry = cache.get(key);
      if (!entry) {
        return null;
      }

      return {
        created: entry.expires - 300000, // Estimate creation time
        ttl: entry.expires - Date.now(),
      };
    },

    getStatistics() {
      return {
        hits: 0,
        misses: 0,
        size: cache.size,
      };
    },
  } as ChromaCacheService;
}

/**
 * Cache invalidation decorator for mutation operations
 */
export function InvalidateCache(
  pattern?: string | ((args: any[]) => string)
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      try {
        const cacheService = getCacheService(this);

        let invalidationPattern: string;

        if (typeof pattern === 'function') {
          invalidationPattern = pattern(args);
        } else if (pattern) {
          invalidationPattern = pattern;
        } else {
          // Default pattern based on collection name
          const collectionName = extractCollectionName(args);
          invalidationPattern = `chroma:*:*:${collectionName}:*`;
        }

        await cacheService.deleteByPattern(invalidationPattern);
      } catch (error) {
        // Don't fail the operation if cache invalidation fails
        console.warn('Cache invalidation failed:', error.message);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Utility function to get cache statistics for a cached method
 */
export function getCacheStatistics(
  instance: any,
  methodName: string
): CacheStatistics | null {
  const statsMethod = instance[`${methodName}_cacheStats`];
  return statsMethod ? statsMethod() : null;
}

/**
 * Utility function to clear cache for a specific cached method
 */
export async function clearMethodCache(
  instance: any,
  methodName: string
): Promise<void> {
  const clearMethod = instance[`${methodName}_clearCache`];
  if (clearMethod) {
    await clearMethod();
  }
}

/**
 * Example usage:
 *
 * @example Collection-aware caching
 * ```typescript
 * @Injectable()
 * export class DocumentService {
 *   @Cached({
 *     ttl: 300000, // 5 minutes
 *     collectionAware: true,
 *     keyStrategy: 'collection_aware',
 *     namespace: 'documents',
 *     enableStats: true,
 *   })
 *   async getDocuments(collection: string, options: any) {
 *     return this.chromaService.getDocuments(collection, options);
 *   }
 *
 *   @InvalidateCache((args) => `chroma:*:*:${args[0]}:*`)
 *   async addDocument(collection: string, document: any) {
 *     await this.chromaService.addDocuments(collection, [document]);
 *   }
 *
 *   async getStats() {
 *     return getCacheStatistics(this, 'getDocuments');
 *   }
 *
 *   async clearCache() {
 *     await clearMethodCache(this, 'getDocuments');
 *   }
 * }
 * ```
 */
