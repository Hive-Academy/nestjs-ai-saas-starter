/**
 * @fileoverview Decorator Presets - Pre-configured combinations for common use cases
 *
 * This module provides pre-configured decorator combinations optimized for
 * different scenarios like development, production, performance, and reliability.
 */

import type { VectorQueryConfig } from '../core/vector-query.decorator';
import type { ChromaRepositoryConfig } from '../core/chroma-repository.decorator';
import type { CachedConfig } from '../performance/cached.decorator';
import type { ProfiledConfig } from '../performance/profiled.decorator';
import type { RetryConfig } from '../performance/retry.decorator';
import type { TenantIsolationConfig } from '../multi-tenant/tenant-aware.decorator';
import type { MultiTenantConfig } from '../multi-tenant/multi-tenant-services';

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

  // Multi-tenancy features
  tenantAware?: TenantIsolationConfig;
  multiTenant?: MultiTenantConfig;
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
  if (configs.caching?.collectionAware && configs.retry?.circuitBreaker?.enabled) {
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
  if (configs.vectorQuery?.autoEmbed && configs.caching?.collectionAware) {
    suggestions.push(
      'Consider using collection-aware caching strategy for auto-embedded queries'
    );
  }

  if (configs.repository?.enableBatch && !configs.retry) {
    suggestions.push(
      'Consider adding retry decorator for batch operations to handle partial failures'
    );
  }

  if (configs.profiling?.slowQueryThreshold && !configs.profiling.samplingRate) {
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
): Partial<CompleteDecoratorConfig> {
  return {
    vectorQuery: {
      collection: 'default', // Provide required collection property
      autoEmbed: true,
      defaultLimit: 10,
      includeMetadata: true,
      includeDocuments: true,
      includeDistances: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      validateParams: true,
      errorHandling: 'throw' as const,
      ...baseConfig.vectorQuery,
    },

    repository: {
      collection: 'default', // Provide required collection property
      autoEmbed: true,
      enableCaching: true,
      enableBatch: true,
      defaultBatchSize: 100,
      enableValidation: true,
      autoTimestamp: true,
      autoGenerateIds: true,
      enableSoftDelete: false,
      errorHandling: 'throw' as const,
      ...baseConfig.repository,
    },

    caching: {
      ttl: 300000, // 5 minutes
      keyStrategy: 'collection_aware' as const,
      collectionAware: true,
      invalidateOnMutation: true,
      cacheOnlySuccess: true,
      enableStats: true,
      refreshStrategy: 'background' as const,
      refreshThreshold: 0.8,
      ...baseConfig.caching,
    },

    profiling: {
      slowQueryThreshold: 100, // 100ms
      logLevel: 'slow' as const,
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
      strategy: 'exponential' as const,
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
      keyStrategy: 'collection_aware' as const,
      refreshStrategy: 'background' as const,
      refreshThreshold: 0.7,
    },
    profiling: {
      samplingRate: 0.1, // 10% sampling
      enablePercentiles: true,
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      strategy: 'exponential' as const,
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
      logLevel: 'all' as const,
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
      logLevel: 'all' as const,
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
      logLevel: 'slow' as const,
      slowQueryThreshold: 200,
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      strategy: 'exponential' as const,
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
        enabled: true,
        failureThreshold: 10,
        resetTimeout: 60000,
      },
    },
    caching: {
      ttl: 900000, // 15 minutes
      refreshStrategy: 'background' as const,
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
): Partial<CompleteDecoratorConfig> {
  const preset = DecoratorPresets[presetName];

  return {
    vectorQuery: preset.vectorQuery && overrides.vectorQuery
      ? { ...preset.vectorQuery, ...overrides.vectorQuery }
      : preset.vectorQuery || overrides.vectorQuery,
    repository: preset.repository && overrides.repository
      ? { ...preset.repository, ...overrides.repository }
      : preset.repository || overrides.repository,
    caching: preset.caching && overrides.caching
      ? { ...preset.caching, ...overrides.caching }
      : preset.caching || overrides.caching,
    profiling: preset.profiling && overrides.profiling
      ? { ...preset.profiling, ...overrides.profiling }
      : preset.profiling || overrides.profiling,
    retry: preset.retry && overrides.retry
      ? { ...preset.retry, ...overrides.retry }
      : preset.retry || overrides.retry,
  };
}
