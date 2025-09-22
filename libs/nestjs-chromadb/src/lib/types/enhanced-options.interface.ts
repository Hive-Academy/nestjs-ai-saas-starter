/**
 * @fileoverview  Operation Options and Interfaces
 *
 * This module provides generic interfaces for  ChromaDB operations
 * WITHOUT coupling to specific business logic. These interfaces enable
 * type-safe decorator-driven development.
 */

import type { BaseDocument, CollectionDocumentMap } from './document-types.interface';
import type { CollectionRegistry } from './collection-names.type';

/**
 * Generic vector operation configuration
 */
export interface VectorOperationConfig<TResult = unknown> {
  readonly operationName: string;
  readonly collection: string;
  readonly parameters?: Record<string, unknown>;
  readonly options?: VectorOperationOptions;
}

/**
 *  vector operation options
 */
export interface VectorOptions {
  readonly caching?: {
    readonly enabled: boolean;
    readonly key: string;
    readonly ttl?: number;
  };
  readonly profiling?: {
    readonly enabled: boolean;
    readonly threshold?: number;
    readonly includeDetails?: boolean;
  };
  readonly retry?: {
    readonly enabled: boolean;
    readonly attempts?: number;
    readonly delay?: number;
    readonly backoff?: 'linear' | 'exponential';
  };
  readonly validation?: {
    readonly enabled: boolean;
    readonly schema?: ValidationSchema;
    readonly strict?: boolean;
  };
  readonly metrics?: {
    readonly enabled: boolean;
    readonly prefix?: string;
    readonly tags?: Record<string, string>;
  };
}

/**
 *  vector operation result
 */
export interface BaseVectorResult<T = unknown> {
  readonly data: T;
  readonly metadata: {
    readonly operationId: string;
    readonly executionTime: number;
    readonly cacheHit?: boolean;
    readonly retryCount?: number;
    readonly validationResult?: ValidationResult;
    readonly timestamp: Date;
  };
  readonly performance?: {
    readonly embeddingTime?: number;
    readonly searchTime?: number;
    readonly postProcessingTime?: number;
    readonly totalTime: number;
  };
}

/**
 * Vector query configuration for decorators
 */
export interface VectorQueryConfig<TResult, TParams = Record<string, unknown>> {
  readonly collection: string | ((params: TParams) => string);
  readonly embedding?: 'auto' | 'manual' | EmbeddingConfig;
  readonly similarity?: 'cosine' | 'euclidean' | 'dot_product';
  readonly filters?: (params: TParams) => VectorFilters;
  readonly postProcess?: (results: RawVectorResult[]) => TResult[];
  readonly returnType?: () => TResult;
  readonly validation?: ValidationSchema<TParams>;
  readonly caching?: CachingConfig;
  readonly profiling?: ProfilingConfig;
  readonly retry?: RetryConfig;
  readonly metrics?: MetricsConfig;
}

/**
 * Generic vector query interface
 */
export interface VectorQuery<TDocument extends BaseDocument = BaseDocument> {
  readonly queryText?: string;
  readonly queryEmbedding?: readonly number[];
  readonly filters?: VectorFilters;
  readonly limit?: number;
  readonly offset?: number;
  readonly threshold?: number;
  readonly includeMetadata?: boolean;
  readonly includeDocuments?: boolean;
  readonly includeDistances?: boolean;
  readonly includeEmbeddings?: boolean;
}

/**
 * Vector query result interface
 */
export interface VectorResult<TDocument extends BaseDocument = BaseDocument> {
  readonly documents: TDocument[];
  readonly distances?: readonly number[];
  readonly similarities?: readonly number[];
  readonly metadata: {
    readonly totalResults: number;
    readonly executionTime: number;
    readonly model?: string;
    readonly collection: string;
  };
}

/**
 * Generic vector filters
 */
export interface VectorFilters {
  readonly [key: string]:
    | string
    | number
    | boolean
    | { readonly $eq?: unknown }
    | { readonly $ne?: unknown }
    | { readonly $in?: readonly unknown[] }
    | { readonly $nin?: readonly unknown[] }
    | { readonly $gt?: number }
    | { readonly $gte?: number }
    | { readonly $lt?: number }
    | { readonly $lte?: number }
    | { readonly $contains?: string }
    | { readonly $not_contains?: string }
    | { readonly $and?: readonly VectorFilters[] }
    | { readonly $or?: readonly VectorFilters[] };
}

/**
 * Raw vector result from ChromaDB
 */
export interface RawVectorResult {
  readonly id: string;
  readonly document?: string;
  readonly metadata?: Record<string, unknown>;
  readonly embedding?: readonly number[];
  readonly distance?: number;
  readonly similarity?: number;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  readonly provider: 'openai' | 'huggingface' | 'cohere' | 'custom';
  readonly model: string;
  readonly dimensions?: number;
  readonly apiKey?: string;
  readonly endpoint?: string;
  readonly batchSize?: number;
  readonly timeout?: number;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  readonly enabled?: boolean;
  readonly ttl?: number;
  readonly keyGenerator?: (args: unknown[], metadata: Record<string, unknown>) => string;
  readonly invalidateOn?: readonly string[];
  readonly storage?: 'memory' | 'redis' | 'custom';
  readonly compression?: boolean;
  readonly keyPrefix?: string;
}

/**
 * Profiling configuration
 */
export interface ProfilingConfig {
  readonly enabled?: boolean;
  readonly threshold?: number;
  readonly includeEmbeddingTime?: boolean;
  readonly includeSearchTime?: boolean;
  readonly includePostProcessingTime?: boolean;
  readonly logSlowQueries?: boolean;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
  readonly detailedMetrics?: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly enabled?: boolean;
  readonly attempts?: number;
  readonly delay?: number;
  readonly backoff?: 'linear' | 'exponential';
  readonly jitter?: boolean;
  readonly retryOn?: readonly (new (...args: any[]) => Error)[];
  readonly maxDelay?: number;
  readonly onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  readonly enabled?: boolean;
  readonly prefix?: string;
  readonly tags?: Record<string, string>;
  readonly customDimensions?: Record<string, (args: unknown[]) => string | number>;
  readonly histogram?: {
    readonly buckets?: readonly number[];
  };
  readonly counter?: boolean;
  readonly gauge?: boolean;
  readonly summary?: boolean;
}

/**
 * Validation schema interface
 */
export interface ValidationSchema<T = unknown> {
  readonly type?: 'object' | 'array' | 'string' | 'number' | 'boolean';
  readonly required?: readonly (keyof T)[];
  readonly optional?: readonly (keyof T)[];
  readonly properties?: {
    readonly [K in keyof T]?: {
      readonly type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
      readonly required?: boolean;
      readonly pattern?: RegExp;
      readonly min?: number;
      readonly max?: number;
      readonly minLength?: number;
      readonly maxLength?: number;
      readonly enum?: readonly unknown[];
      readonly custom?: (value: T[K]) => boolean | string;
    };
  };
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings?: readonly string[];
  readonly fieldErrors?: Record<string, readonly string[]>;
}

/**
 * Repository configuration interface
 */
export interface RepositoryConfig<TDocument extends BaseDocument = BaseDocument> {
  readonly collection: string;
  readonly documentType: () => TDocument;
  readonly caching?: CachingConfig;
  readonly metrics?: MetricsConfig;
  readonly validation?: ValidationSchema<TDocument>;
  readonly security?: SecurityConfig;
  readonly tenancy?: TenancyConfig;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  readonly accessControl?: boolean;
  readonly permissions?: readonly string[];
  readonly encryption?: {
    readonly enabled: boolean;
    readonly fields?: readonly string[];
    readonly algorithm?: string;
  };
  readonly auditLogging?: boolean;
  readonly rateLimiting?: {
    readonly enabled: boolean;
    readonly windowMs?: number;
    readonly max?: number;
  };
}

/**
 * Tenancy configuration
 */
export interface TenancyConfig {
  readonly enabled?: boolean;
  readonly strategy?: 'prefix' | 'database' | 'metadata';
  readonly tenantField?: string;
  readonly isolation?: 'strict' | 'loose';
  readonly validation?: boolean;
}

/**
 * Vector operation options for base ChromaDB operations
 */
export interface VectorOperationOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly validateInput?: boolean;
  readonly includeMetrics?: boolean;
  readonly cacheResults?: boolean;
}

/**
 * Type-safe collection service interface
 */
export interface TypedCollectionService<
  TCollectionMap extends CollectionDocumentMap = CollectionDocumentMap,
  TCollection extends keyof TCollectionMap = keyof TCollectionMap
> {
  get<T extends TCollection>(name: T): TypedCollection<TCollectionMap[T]>;

  query<T extends TCollection>(
    name: T,
    query: VectorQuery<TCollectionMap[T]>
  ): Promise<VectorResult<TCollectionMap[T]>>;

  store<T extends TCollection>(
    name: T,
    documents: TCollectionMap[T][]
  ): Promise<string[]>;

  update<T extends TCollection>(
    name: T,
    id: string,
    updates: Partial<TCollectionMap[T]>
  ): Promise<void>;

  delete<T extends TCollection>(
    name: T,
    id: string
  ): Promise<boolean>;
}

/**
 * Typed collection interface
 */
export interface TypedCollection<TDocument extends BaseDocument = BaseDocument> {
  readonly name: string;
  readonly documentType: () => TDocument;
  readonly config?: CollectionRegistry[string];

  query(query: VectorQuery<TDocument>): Promise<VectorResult<TDocument>>;
  get(id: string): Promise<TDocument | null>;
  add(documents: TDocument[]): Promise<string[]>;
  update(id: string, updates: Partial<TDocument>): Promise<void>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  exists(): Promise<boolean>;
}

/**
 *  query builder interface
 */
export interface QueryBuilder<TDocument extends BaseDocument = BaseDocument> {
  collection(name: string): this;
  similarity(metric: 'cosine' | 'euclidean' | 'dot_product'): this;
  filters(conditions: VectorFilters): this;
  limit(count: number): this;
  offset(count: number): this;
  threshold(value: number): this;
  include(...fields: readonly (keyof VectorQuery)[]): this;
  cache(config: CachingConfig): this;
  profile(config: ProfilingConfig): this;
  retry(config: RetryConfig): this;
  metrics(config: MetricsConfig): this;
  validate(schema: ValidationSchema): this;
  build(): VectorQuery<TDocument>;
  execute(): Promise<VectorResult<TDocument>>;
}

/**
 * Decorator metadata interface
 */
export interface DecoratorMetadata {
  readonly type: 'vector_query' | 'repository' | 'cached' | 'profiled' | 'retry' | 'metrics' | 'validate';
  readonly config: Record<string, unknown>;
  readonly target: string;
  readonly propertyKey: string | symbol;
  readonly descriptor?: PropertyDescriptor;
}

/**
 * Operation context interface
 */
export interface OperationContext {
  readonly operationId: string;
  readonly operationName: string;
  readonly collection: string;
  readonly user?: {
    readonly id: string;
    readonly roles: readonly string[];
    readonly permissions: readonly string[];
  };
  readonly tenant?: {
    readonly id: string;
    readonly config: Record<string, unknown>;
  };
  readonly request?: {
    readonly id: string;
    readonly ip: string;
    readonly userAgent: string;
  };
  readonly timestamp: Date;
}

/**
 * Generic similarity search configuration
 */
export interface SimilaritySearchConfig<TDocument extends BaseDocument = BaseDocument> {
  readonly embedding?: 'auto' | 'manual';
  readonly threshold?: number;
  readonly limit?: number;
  readonly reranking?: 'none' | 'cross-encoder' | 'custom';
  readonly diversityBoost?: number;
  readonly includeMetadata?: boolean;
  readonly includeDistances?: boolean;
}

/**
 * Batch operation configuration
 */
export interface BatchOperationConfig {
  readonly batchSize?: number;
  readonly maxConcurrency?: number;
  readonly progressCallback?: (completed: number, total: number) => void;
  readonly errorStrategy?: 'fail_fast' | 'continue' | 'retry';
  readonly retryConfig?: RetryConfig;
}

/**
 * Generic batch operation result
 */
export interface BatchOperationResult {
  readonly totalProcessed: number;
  readonly successful: number;
  readonly failed: number;
  readonly errors: readonly {
    readonly index: number;
    readonly error: string;
    readonly item?: unknown;
  }[];
  readonly duration: number;
  readonly batchResults: readonly {
    readonly batchIndex: number;
    readonly processed: number;
    readonly success: boolean;
    readonly duration: number;
  }[];
}

/**
 * Performance monitoring interface
 */
export interface PerformanceMonitor {
  startOperation(operationId: string, operationName: string): PerformanceContext;
  endOperation(context: PerformanceContext): PerformanceResult;
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  getMetrics(timeRange?: string): readonly PerformanceMetric[];
}

/**
 * Performance context interface
 */
export interface PerformanceContext {
  readonly operationId: string;
  readonly operationName: string;
  readonly startTime: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Performance result interface
 */
export interface PerformanceResult {
  readonly operationId: string;
  readonly operationName: string;
  readonly duration: number;
  readonly success: boolean;
  readonly error?: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly timestamp: Date;
  readonly tags?: Record<string, string>;
  readonly type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

/**
 * Example usage patterns for consumer applications:
 *
 * // 1. Define collection and document types
 * type MyCollectionName = 'users' | 'products';
 *
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 *   preferences: string[];
 * }> {}
 *
 * interface MyCollectionMap extends CollectionDocumentMap {
 *   'users': UserDocument;
 *   'products': ProductDocument;
 * }
 *
 * // 2. Use with  operations
 * const queryConfig: VectorQueryConfig<UserDocument[], { searchTerm: string }> = {
 *   collection: 'users',
 *   embedding: 'auto',
 *   similarity: 'cosine',
 *   filters: (params) => ({ active: true }),
 *   caching: { enabled: true, ttl: 300000 },
 *   profiling: { enabled: true, threshold: 1000 },
 *   returnType: () => ({} as UserDocument),
 * };
 *
 * // 3. Type-safe query building
 * const query = new QueryBuilder<UserDocument>()
 *   .collection('users')
 *   .similarity('cosine')
 *   .filters({ active: true })
 *   .limit(10)
 *   .cache({ enabled: true, ttl: 300000 })
 *   .build();
 */
