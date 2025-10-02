/**
 * Caching services implementing Interface Segregation Principle
 *
 * This module provides a clean separation of cache responsibilities:
 * - Cache operations (get, set, delete, clear)
 * - Statistics tracking and health monitoring
 * - Cleanup and eviction strategies
 * - Vector-specific operations
 * - Utility services for common operations
 */

// Main coordinating service (Facade pattern)
export { ChromaCacheService } from './chroma-cache.service';

// Segregated service interfaces (ISP)
export type {
  ICacheOperations,
  ICacheStatistics,
  ICacheCleanup,
  IVectorCacheOperations,
  ICacheKeyGenerator,
  ITtlCalculator,
} from './cache-interfaces';

// Specialized service implementations
export { CacheOperationsService } from './cache-operations.service';
export { CacheStatisticsService } from './cache-statistics.service';
export { CacheCleanupService } from './cache-cleanup.service';
export { VectorCacheService } from './vector-cache.service';

// Utility services
export {
  CacheKeyGeneratorService,
  TtlCalculatorService,
  SizeEstimatorService,
} from './cache-utilities.service';

// Type definitions
export type {
  CacheStatistics,
  VectorStatistics,
  HealthStatus,
  CacheEntry,
  CacheConfig,
  MutableCacheStats,
} from './cache-interfaces';
