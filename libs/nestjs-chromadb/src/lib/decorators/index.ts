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

export {
  VectorQuery,
  VectorQueryBuilder,
  VectorQueryError,
  createVectorQueryBuilder,
} from './core/vector-query.decorator';
export type {
  VectorQueryConfig,
  VectorQueryParams,
  TypedVectorSearchResult,
} from './core/vector-query.decorator';

// NEW: Fixed Repository Implementation (replaces broken core version)
export {
  ChromaRepository,
  createRepository,
  isChromaRepository,
  isChromaDBService,
  BaseChromaRepository,
  isBaseChromaRepository,
  repositoryValidator,
  repositoryErrorHandler,
  repositoryTypeSafety,
} from './repository';

export type {
  ChromaRepositoryConfig,
  RepositoryOperationOptions,
  RepositorySearchOptions,
  RepositoryOperationResult,
  RepositorySearchResultWithScore,
  ChromaRepositoryInterface,
  RepositoryConstructor,
  RepositoryInstance,
  RepositoryFactory,
  ExtractDocumentType,
  ExtractMetadataType,
  CreateDocumentInput,
  SearchResultWithScore,
} from './repository';

// Re-export commonly needed types from other modules
export type { BaseDocument } from '../types/core.interface';
export type {
  ChromaWireDocument,
  ChromaSearchOptions,
  ChromaBulkOptions,
} from '../types/core.interface';

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

export {
  DecoratorMetadataRegistry,
  DecoratorCompositionValidator,
  DecoratorMetadataBuilder,
  DecoratorExecutionPipeline,
  getAppliedDecorators,
  hasDecorator,
  validateDecoratorComposition,
} from './core/decorator-metadata';
export type {
  DecoratorMetadata,
  CompositionValidationResult,
  DecoratorExecutionContext,
} from './core/decorator-metadata';

// =====================================================================
// Performance Decorators
// =====================================================================

export {
  Cached,
  InvalidateCache,
  getCacheStatistics,
  clearMethodCache,
} from './performance/cached.decorator';
export type {
  CachedConfig,
  CacheStatistics,
} from './performance/cached.decorator';

export {
  Profiled,
  getPerformanceStatistics,
  getExecutionTimes,
  clearPerformanceStatistics,
  GlobalPerformanceMonitor,
} from './performance/profiled.decorator';
export type {
  ProfiledConfig,
  PerformanceMetrics,
  PerformanceStatistics,
} from './performance/profiled.decorator';

export {
  Retry,
  RetryPresets,
  getRetryStatistics,
  resetRetryStatistics,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './performance/retry.decorator';
export type {
  RetryConfig,
  RetryStatistics,
} from './performance/retry.decorator';

// =====================================================================
// Multi-Tenant Decorators - Enterprise Multi-Tenancy Support
// =====================================================================

export {
  TenantAware,
  CrossTenant,
  TenantAwareRepository,
} from './multi-tenant/tenant-aware.decorator';
export type {
  TenantContext,
  TenantIsolationConfig,
  TenantAwareOptions,
  TenantOperationResult,
} from './multi-tenant/tenant-aware.decorator';

// Multi-tenant services
export { MultiTenantService } from '../services/multi-tenant/multi-tenant.service';
export { TenantContextService } from '../services/multi-tenant/tenant-context.service';
export { TenantIsolationService } from '../services/multi-tenant/tenant-isolation.service';
export { TenantValidationService } from '../services/multi-tenant/tenant-validation.service';
export type {
  MultiTenantConfig,
  TenantOperationOptions,
  CrossTenantSearchResult,
} from '../services/multi-tenant/multi-tenant.service';
export type { TenantExtractionResult } from '../services/multi-tenant/tenant-context.service';
export type {
  TenantCollectionResult,
  TenantCollectionValidation,
} from '../services/multi-tenant/tenant-isolation.service';
export type {
  TenantResourceLimits,
  TenantSecurityPolicy,
  TenantRegistration,
  ValidationResult,
} from '../services/multi-tenant/tenant-validation.service';
export {
  TENANT_CONSTANTS,
  DEFAULT_TENANT_CONFIG,
  TENANT_SECURITY_LEVELS,
} from './multi-tenant/tenant-constants';

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

export {
  DECORATOR_USAGE_EXAMPLES,
  DECORATOR_BEST_PRACTICES,
} from './utils/decorator-examples';

// =====================================================================
// Legacy Decorators (for backward compatibility)
// =====================================================================

export { EmbedMarker } from './embed.decorator';
export type { EmbedOptions } from './embed.decorator';
export { InjectChromaDB } from './inject-chromadb.decorator';
export { InjectCollection } from './inject-collection.decorator';
