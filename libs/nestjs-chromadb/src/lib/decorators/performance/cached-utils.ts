/**
 * @fileoverview Cache Utilities
 * Extracted from cached.decorator.ts for better architecture compliance
 */

import { getErrorMessage } from '../../utils/errors/error-handling.utils';
import type { ChromaCacheService } from '../../services/caching/chroma-cache.service';
import type { CachedConfig } from './cached-types';

/**
 * Get cache service from class instance
 */
export function getCacheService(instance: any): ChromaCacheService {
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
export function generateCacheKey(
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
export function generateCacheKeyPattern(
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
export function extractCollectionName(args: any[]): string {
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
export function hashArgs(args: any[]): string {
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
export function shouldCacheResult(result: any, config: CachedConfig): boolean {
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
export async function handleBackgroundRefresh(
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
    // Background refresh needed - simplified without metadata dependency
    const totalTtl = config.ttl || 300000;
    const refreshPoint = totalTtl * config.refreshThreshold;

    // Trigger background refresh if threshold is configured
    if (refreshPoint > 0) {
      setImmediate(async () => {
        try {
          const newResult = await originalMethod.apply({}, args);
          await cacheService.set(cacheKey, newResult, config.ttl || 300000);
        } catch (error) {
          // Silent failure for background refresh
          console.warn(
            'Background cache refresh failed:',
            getErrorMessage(error)
          );
        }
      });
    }
  } catch (error) {
    // Silent failure for background refresh check
  }
}

/**
 * Default in-memory cache service fallback
 */
export function getDefaultCacheService(): ChromaCacheService {
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

    async deletePattern(pattern: string | RegExp): Promise<number> {
      const regex =
        pattern instanceof RegExp
          ? pattern
          : new RegExp(pattern.replace(/\*/g, '.*'));
      let deletedCount = 0;
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
          deletedCount++;
        }
      }
      return deletedCount;
    },

    async clear(): Promise<void> {
      cache.clear();
    },

    getStatistics() {
      return {
        hits: 0,
        misses: 0,
        size: cache.size,
      };
    },
  } as unknown as ChromaCacheService;
}
