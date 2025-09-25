/**
 * @fileoverview @Cached Decorator - Intelligent Vector-Aware Caching
 *
 * This decorator provides intelligent caching with collection-aware invalidation
 * specifically designed for vector database operations.
 */

import { Logger } from '@nestjs/common';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from '../core/decorator-metadata';
import type { CachedConfig, CacheStatistics } from './cached-types';
import {
  getCacheService,
  generateCacheKey,
  generateCacheKeyPattern,
  shouldCacheResult,
  handleBackgroundRefresh,
} from './cached-utils';

// Re-export types for backward compatibility
export type { CachedConfig, CacheStatistics } from './cached-types';

// Re-export utilities
export {
  InvalidateCache,
  getCacheStatistics,
  clearMethodCache,
} from './cached-stats';

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
        await cacheService.deletePattern(pattern);

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
