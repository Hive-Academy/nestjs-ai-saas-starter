/**
 * Main module options interface - composition of focused interfaces
 * Following Interface Segregation Principle by combining specialized contracts
 */

import type {
  ModuleMetadata,
  Type,
  Provider,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';

import type { ChromaDBConnectionOptions } from './connection-options.interface';
import type { ChromaDBEmbeddingOptions } from './embedding-options.interface';
import type { ChromaDBPerformanceOptions } from './performance-options.interface';
import type { ChromaDBMultiTenantOptions } from './multi-tenant-options.interface';

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
  ChromaDBConnectionOptions,
  ChromaDBEmbeddingOptions,
  ChromaDBPerformanceOptions,
  ChromaDBMultiTenantOptions,
} from './connection-options.interface';
export type {
  EmbeddingConfig,
  EmbeddingProviderType,
  OpenAIEmbeddingConfig,
  HuggingFaceEmbeddingConfig,
  CohereEmbeddingConfig,
  CustomEmbeddingConfig,
  InputValidationConfig,
} from './embedding-options.interface';
export type {
  PerformanceConfig,
  CachingConfig,
  ProfilingConfig,
  RetryConfig,
  TextProcessingConfig,
} from './performance-options.interface';
export type {
  MultiTenantConfig,
  DecoratorConfig,
} from './multi-tenant-options.interface';
export type {
  ChromaDBClientOptions,
  HttpClientOptions,
  CollectionConfig,
} from './connection-options.interface';
