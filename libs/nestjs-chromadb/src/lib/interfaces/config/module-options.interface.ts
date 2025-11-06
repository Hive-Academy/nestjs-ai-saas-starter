/**
 * Main module options interface - composition of focused interfaces
 * Following Interface Segregation Principle by combining specialized contracts
 */

import type {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
  Provider,
  Type,
} from '@nestjs/common';

import type { ChromaDBConnectionOptions } from './connection-options.interface';
import type { ChromaDBEmbeddingOptions } from './embedding-options.interface';
import type { ChromaDBMultiTenantOptions } from './multi-tenant-options.interface';
import type { ChromaDBPerformanceOptions } from './performance-options.interface';
import type { CollectionStrategyOptions } from './collection-strategy-options.interface';

/**
 * Complete ChromaDB module configuration options
 * Composed from focused interface contracts following ISP
 */
export interface ChromaDBModuleOptions
  extends ChromaDBConnectionOptions,
    ChromaDBEmbeddingOptions,
    ChromaDBPerformanceOptions,
    ChromaDBMultiTenantOptions {
  /**
   * Global HTTP client configuration
   */
  http?: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    retryBackoffFactor?: number;
  };

  maxConcurrentOperations?: number;

  /**
   * Collection initialization strategy configuration
   *
   * Controls when and how ChromaDB collections are initialized during application lifecycle.
   * Allows fine-tuning of startup performance and resource allocation.
   *
   * @default { mode: 'eager', enableBatching: false, waitForConnection: true, maxParallelInit: 5 }
   *
   * @example
   * ```typescript
   * // Production-optimized (recommended)
   * collectionStrategy: {
   *   mode: 'lazy',              // Defer initialization (-150ms startup time)
   *   enableBatching: true,       // Batch operations for efficiency
   *   waitForConnection: true,    // Prevent retry waste
   *   maxParallelInit: 3,         // Conservative concurrency
   * }
   * ```
   *
   * @see CollectionStrategyOptions for detailed configuration options
   * @see PRODUCTION_COLLECTION_STRATEGY for production preset
   * @see DEVELOPMENT_COLLECTION_STRATEGY for development preset
   */
  collectionStrategy?: CollectionStrategyOptions;
}

/**
 * Factory interface for creating ChromaDB module options
 */
export interface ChromaDBOptionsFactory {
  createChromaDBOptions: () =>
    | Promise<ChromaDBModuleOptions>
    | ChromaDBModuleOptions;
}

/**
 * Asynchronous configuration options for ChromaDB module
 */
export interface ChromaDBModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ChromaDBOptionsFactory>;
  useClass?: Type<ChromaDBOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ChromaDBModuleOptions> | ChromaDBModuleOptions;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  extraProviders?: Provider[];
}

// Re-export all focused interfaces for backward compatibility at module level
export type {
  ChromaDBClientOptions,
  ChromaDBConnectionOptions,
  CollectionConfig,
  HttpClientOptions,
} from './connection-options.interface';
export type {
  ChromaDBEmbeddingOptions,
  CohereEmbeddingConfig,
  CustomEmbeddingConfig,
  EmbeddingConfig,
  EmbeddingProviderType,
  HuggingFaceEmbeddingConfig,
  InputValidationConfig,
  OpenAIEmbeddingConfig,
} from './embedding-options.interface';
export type {
  ChromaDBMultiTenantOptions,
  DecoratorConfig,
  MultiTenantConfig,
} from './multi-tenant-options.interface';
export type {
  CachingConfig,
  ChromaDBPerformanceOptions,
  PerformanceConfig,
  ProfilingConfig,
  RetryConfig,
  TextProcessingConfig,
} from './performance-options.interface';
export type {
  CollectionInitMode,
  CollectionStrategyOptions,
} from './collection-strategy-options.interface';
export {
  DEFAULT_COLLECTION_STRATEGY,
  PRODUCTION_COLLECTION_STRATEGY,
  DEVELOPMENT_COLLECTION_STRATEGY,
  HIGHPERF_COLLECTION_STRATEGY,
} from './collection-strategy-options.interface';
