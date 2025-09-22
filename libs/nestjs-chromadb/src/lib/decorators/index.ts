/**
 * @fileoverview ChromaDB Decorator Ecosystem - Complete Export Index
 * 
 * This module exports all decorators and utilities for the ChromaDB decorator ecosystem,
 * providing declarative, type-safe vector database operations with performance monitoring,
 * intelligent caching, and resilient error handling.
 */

// =====================================================================
// Core Decorators - Primary Vector Operations
// =====================================================================

export {
  VectorQuery,
  VectorQueryConfig,
  VectorQueryParams,
  TypedVectorSearchResult,
  VectorQueryBuilder,
  VectorQueryError,
  createVectorQueryBuilder,
} from './core/vector-query.decorator';

export {
  ChromaRepository,
  ChromaRepositoryConfig,
  RepositoryOperationOptions,
  RepositorySearchOptions,
  RepositoryOperationResult,
  createRepository,
} from './core/chroma-repository.decorator';

// =====================================================================
// Decorator Metadata System
// =====================================================================

export {
  DecoratorMetadata,
  CompositionValidationResult,
  DecoratorMetadataRegistry,
  DecoratorCompositionValidator,
  DecoratorMetadataBuilder,
  DecoratorExecutionContext,
  DecoratorExecutionPipeline,
  getAppliedDecorators,
  hasDecorator,
  validateDecoratorComposition,
} from './core/decorator-metadata';

// =====================================================================
// Performance Decorators
// =====================================================================

export {
  Cached,
  CachedConfig,
  CacheStatistics,
  InvalidateCache,
  getCacheStatistics,
  clearMethodCache,
} from './performance/cached.decorator';

export {
  Profiled,
  ProfiledConfig,
  PerformanceMetrics,
  PerformanceStatistics,
  getPerformanceStatistics,
  getExecutionTimes,
  clearPerformanceStatistics,
  GlobalPerformanceMonitor,
} from './performance/profiled.decorator';

export {
  Retry,
  RetryConfig,
  RetryStatistics,
  RetryPresets,
  getRetryStatistics,
  resetRetryStatistics,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './performance/retry.decorator';

// =====================================================================
// Legacy Decorators (for backward compatibility)
// =====================================================================

export { Embed } from './embed.decorator';
export { InjectChromaDB } from './inject-chromadb.decorator';
export { InjectCollection } from './inject-collection.decorator';

// =====================================================================
// Type Definitions and Interfaces
// =====================================================================

/**
 * Complete decorator configuration type for advanced usage
 */
export interface CompleteDecoratorConfig {
  // Core functionality
  vectorQuery?: VectorQueryConfig;
  repository?: ChromaRepositoryConfig;
  
  // Performance features
  caching?: CachedConfig;
  profiling?: ProfiledConfig;
  retry?: RetryConfig;
}

/**
 * Decorator combination validation result
 */
export interface DecoratorCombinationResult {
  readonly valid: boolean;
  readonly conflicts: string[];
  readonly warnings: string[];
  readonly suggestions: string[];
}

// =====================================================================
// Utility Functions
// =====================================================================

/**
 * Validate a combination of decorator configurations
 */
export function validateDecoratorCombination(
  configs: CompleteDecoratorConfig
): DecoratorCombinationResult {
  const conflicts: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for conflicting configurations
  if (configs.caching?.enableCaching && configs.retry?.circuitBreaker?.enabled) {
    warnings.push(
      'Circuit breaker and caching enabled together may lead to inconsistent behavior during failures'
    );
  }
  
  if (configs.profiling?.samplingRate && configs.profiling.samplingRate < 1 && configs.retry?.maxAttempts && configs.retry.maxAttempts > 1) {
    warnings.push(
      'Profiling with sampling may not capture all retry attempts accurately'
    );
  }
  
  // Performance suggestions
  if (configs.vectorQuery?.autoEmbed && configs.caching?.enableCaching) {
    suggestions.push(
      'Consider using collection-aware caching strategy for auto-embedded queries'
    );
  }
  
  if (configs.repository?.enableBatch && !configs.retry) {
    suggestions.push(
      'Consider adding retry decorator for batch operations to handle partial failures'
    );
  }
  
  if (configs.profiling?.enabled && !configs.profiling.samplingRate) {
    suggestions.push(
      'Consider using sampling for high-frequency operations to reduce overhead'
    );
  }
  
  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings,
    suggestions,
  };
}

/**
 * Create a comprehensive decorator configuration with best practices
 */
export function createOptimizedDecoratorConfig(
  baseConfig: Partial<CompleteDecoratorConfig> = {}
): CompleteDecoratorConfig {
  return {
    vectorQuery: {
      autoEmbed: true,
      defaultLimit: 10,
      includeMetadata: true,
      includeDocuments: true,
      includeDistances: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      validateParams: true,
      errorHandling: 'throw',
      ...baseConfig.vectorQuery,
    },
    
    repository: {
      autoEmbed: true,
      enableCaching: true,
      enableBatch: true,
      defaultBatchSize: 100,
      enableValidation: true,
      autoTimestamp: true,
      autoGenerateIds: true,
      enableSoftDelete: false,
      errorHandling: 'throw',
      ...baseConfig.repository,
    },
    
    caching: {
      ttl: 300000, // 5 minutes
      keyStrategy: 'collection_aware',
      collectionAware: true,
      invalidateOnMutation: true,
      cacheOnlySuccess: true,
      enableStats: true,
      refreshStrategy: 'background',
      refreshThreshold: 0.8,
      ...baseConfig.caching,
    },
    
    profiling: {
      enabled: true,
      slowQueryThreshold: 100, // 100ms
      logLevel: 'slow',
      includeParameters: false,
      includeResults: false,
      maxParameterLength: 1000,
      includeMemoryMetrics: false,
      enablePercentiles: true,
      samplingRate: 1.0,
      ...baseConfig.profiling,
    },
    
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      strategy: 'exponential',
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        /timeout/i,
        /connection/i,
        /network/i,
      ],
      circuitBreaker: {
        enabled: false,
        failureThreshold: 5,
        resetTimeout: 60000,
      },
      logRetries: true,
      ...baseConfig.retry,
    },
  };
}

/**
 * Decorator combination presets for common use cases
 */
export const DecoratorPresets = {
  /**
   * High-performance vector search with caching and monitoring
   */
  performanceOptimized: createOptimizedDecoratorConfig({
    caching: {
      ttl: 600000, // 10 minutes
      keyStrategy: 'collection_aware',
      refreshStrategy: 'background',
      refreshThreshold: 0.7,
    },
    profiling: {
      samplingRate: 0.1, // 10% sampling
      enablePercentiles: true,
    },
    retry: {
      ...RetryPresets.vectorSearch,
    },
  }),
  
  /**
   * Reliable operations with comprehensive error handling
   */
  reliabilityFocused: createOptimizedDecoratorConfig({
    retry: {
      maxAttempts: 5,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        resetTimeout: 30000,
      },
    },
    profiling: {
      logLevel: 'all',
      includeStackTrace: true,
    },
    caching: {
      cacheOnlySuccess: true,
      invalidateOnMutation: true,
    },
  }),
  
  /**
   * Development-friendly configuration with detailed logging
   */
  development: createOptimizedDecoratorConfig({
    profiling: {
      logLevel: 'all',
      includeParameters: true,
      includeResults: true,
      includeMemoryMetrics: true,
    },
    retry: {
      maxAttempts: 2,
      logRetries: true,
    },
    caching: {
      enableStats: true,
      ttl: 60000, // 1 minute for dev
    },
  }),
  
  /**
   * Production-ready configuration with balanced performance and reliability
   */
  production: createOptimizedDecoratorConfig({
    profiling: {
      samplingRate: 0.05, // 5% sampling
      logLevel: 'slow',
      slowQueryThreshold: 200,
    },
    retry: {
      ...RetryPresets.vectorSearch,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 10,
        resetTimeout: 60000,
      },
    },
    caching: {
      ttl: 900000, // 15 minutes
      refreshStrategy: 'background',
      refreshThreshold: 0.8,
    },
  }),
} as const;

/**
 * Utility to apply a preset configuration to a class or method
 */
export function applyDecoratorPreset(
  presetName: keyof typeof DecoratorPresets,
  overrides: Partial<CompleteDecoratorConfig> = {}
): CompleteDecoratorConfig {
  const preset = DecoratorPresets[presetName];
  
  return {
    vectorQuery: { ...preset.vectorQuery, ...overrides.vectorQuery },
    repository: { ...preset.repository, ...overrides.repository },
    caching: { ...preset.caching, ...overrides.caching },
    profiling: { ...preset.profiling, ...overrides.profiling },
    retry: { ...preset.retry, ...overrides.retry },
  };
}

/**
 * Example usage patterns:
 * 
 * @example Using individual decorators
 * ```typescript
 * @Injectable()
 * export class DocumentSearchService {
 *   @VectorQuery({
 *     collection: 'documents',
 *     autoEmbed: true,
 *     defaultLimit: 10,
 *   })
 *   @Cached({
 *     ttl: 300000,
 *     keyStrategy: 'collection_aware',
 *   })
 *   @Profiled({
 *     slowQueryThreshold: 100,
 *     logLevel: 'slow',
 *   })
 *   @Retry(RetryPresets.vectorSearch)
 *   async searchDocuments(params: VectorQueryParams) {
 *     // All functionality handled by decorators
 *   }
 * }
 * ```
 * 
 * @example Using repository pattern
 * ```typescript
 * @Injectable()
 * @ChromaRepository({
 *   collection: 'users',
 *   autoEmbed: true,
 *   enableCaching: true,
 *   enableValidation: true,
 * })
 * export class UserRepository implements ChromaRepository<UserDocument> {
 *   // All CRUD methods auto-generated
 *   
 *   @VectorQuery({
 *     collection: 'users',
 *     autoEmbed: true,
 *   })
 *   @Cached({ ttl: 600000 })
 *   async findSimilarUsers(params: VectorQueryParams) {
 *     // Custom search method with decorators
 *   }
 * }
 * ```
 * 
 * @example Using presets
 * ```typescript
 * const config = applyDecoratorPreset('production', {
 *   vectorQuery: { defaultLimit: 20 },
 *   caching: { ttl: 1800000 }, // 30 minutes
 * });
 * 
 * // Apply config to your decorators...
 * ```
 */