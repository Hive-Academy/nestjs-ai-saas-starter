/**
 * @fileoverview ChromaDB Decorator Ecosystem - Public API Exports
 *
 * This module exports all decorators and utilities for the ChromaDB decorator ecosystem,
 * providing declarative, type-safe vector database operations with performance monitoring,
 * intelligent caching, and resilient error handling.
 */

// =====================================================================
// Core Decorators - Primary Vector Operations
// =====================================================================

export { VectorQuery, VectorQueryBuilder, VectorQueryError, createVectorQueryBuilder } from './core/vector-query.decorator';
export type { VectorQueryConfig, VectorQueryParams, TypedVectorSearchResult } from './core/vector-query.decorator';

export { ChromaRepository, createRepository } from './core/chroma-repository.decorator';
export type { ChromaRepositoryConfig, RepositoryOperationOptions, RepositorySearchOptions, RepositoryOperationResult } from './core/chroma-repository.decorator';

// Base Repository Interface and Types
export { BaseChromaRepository, isBaseChromaRepository } from './repository/base-repository.interface';
export type {
  CreateDocumentInput,
  SearchResultWithScore,
  RepositoryConstructor
} from './repository/base-repository.interface';

// Re-export commonly needed types from other modules
export type { BaseDocument } from '../types/document-types.interface';
export type { ChromaDocument, ChromaMetadata } from '../interfaces/chromadb-service.interface';

// Type Guards and Validation Utilities
export {
  isValidBaseDocument,
  isValidChromaDBService,
  isValidChromaResult,
  isValidChromaMetadata,
  validateRepositoryOperationOptions,
  assertValidDocument,
  assertValidChromaDBService,
  assertValidChromaResult,
  TypeSafeConverter,
  TypeSafeMethod,
} from './core/repository-type-guards';
export type { RepositoryOperationValidationResult } from './core/repository-type-guards';

// =====================================================================
// Decorator Metadata System
// =====================================================================

export { DecoratorMetadataRegistry, DecoratorCompositionValidator, DecoratorMetadataBuilder, DecoratorExecutionPipeline, getAppliedDecorators, hasDecorator, validateDecoratorComposition } from './core/decorator-metadata';
export type { DecoratorMetadata, CompositionValidationResult, DecoratorExecutionContext } from './core/decorator-metadata';

// =====================================================================
// Performance Decorators
// =====================================================================

export { Cached, InvalidateCache, getCacheStatistics, clearMethodCache } from './performance/cached.decorator';
export type { CachedConfig, CacheStatistics } from './performance/cached.decorator';

export {
  Profiled,
  getPerformanceStatistics,
  getExecutionTimes,
  clearPerformanceStatistics,
  GlobalPerformanceMonitor,
} from './performance/profiled.decorator';
export type { ProfiledConfig, PerformanceMetrics, PerformanceStatistics } from './performance/profiled.decorator';

export {
  Retry,
  RetryPresets,
  getRetryStatistics,
  resetRetryStatistics,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './performance/retry.decorator';
export type { RetryConfig, RetryStatistics } from './performance/retry.decorator';

// =====================================================================
// Multi-Tenant Decorators - Enterprise Multi-Tenancy Support
// =====================================================================

export { TenantAware, CrossTenant, TenantAwareRepository } from './multi-tenant/tenant-aware.decorator';
export { TenantCollectionManager, TenantContextExtractor } from './multi-tenant/tenant-aware.decorator';
export { MultiTenantChromaService, TenantRegistryService, TenantSecurityService } from './multi-tenant/multi-tenant-services';
export type { TenantContext, TenantIsolationConfig, TenantAwareOptions, TenantOperationResult } from './multi-tenant/tenant-aware.decorator';
export type { MultiTenantConfig, TenantRegistration, TenantSecurityPolicy, TenantResourceLimits } from './multi-tenant/multi-tenant-services';
export { TENANT_CONSTANTS, DEFAULT_TENANT_CONFIG, TENANT_SECURITY_LEVELS } from './multi-tenant/tenant-constants';

// =====================================================================
// Utility Functions and Presets
// =====================================================================

export type {
  CompleteDecoratorConfig,
  DecoratorCombinationResult,
} from './utils/decorator-presets';

export {
  validateDecoratorCombination,
  createOptimizedDecoratorConfig,
  DecoratorPresets,
  applyDecoratorPreset,
} from './utils/decorator-presets';

export { DECORATOR_USAGE_EXAMPLES, DECORATOR_BEST_PRACTICES } from './utils/decorator-examples';

// =====================================================================
// Legacy Decorators (for backward compatibility)
// =====================================================================

export { EmbedMarker } from './embed.decorator';
export type { EmbedOptions } from './embed.decorator';
export { InjectChromaDB } from './inject-chromadb.decorator';
export { InjectCollection } from './inject-collection.decorator';
