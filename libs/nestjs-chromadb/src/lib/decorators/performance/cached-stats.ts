/**
 * @fileoverview Cache Statistics and Management
 * Extracted from cached.decorator.ts for better architecture compliance
 */

import { getErrorMessage } from '../../utils/errors/error-handling.utils';
import { getCacheService, extractCollectionName } from './cached-utils';
import type { CacheStatistics } from './cached-types';

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

        await cacheService.deletePattern(invalidationPattern);
      } catch (error) {
        // Don't fail the operation if cache invalidation fails
        console.warn('Cache invalidation failed:', getErrorMessage(error));
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
