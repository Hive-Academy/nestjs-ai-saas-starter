/**
 * @fileoverview @VectorQuery Decorator - Core Vector Search with Auto-Embedding
 *
 * This decorator eliminates manual service injection and error handling for vector
 * operations by providing declarative vector search with automatic embedding generation.
 */

import { Logger } from '@nestjs/common';
import type { Where, WhereDocument } from 'chromadb';
import {
  DecoratorMetadataRegistry,
  DecoratorMetadataBuilder,
} from './decorator-metadata';
import type { ChromaDBService } from '../../services/chromadb.service';
import type {
  ChromaSearchResult,
  ChromaSearchOptions,
  BaseDocument,
} from '../../types/core.interface';

/**
 * Configuration for @VectorQuery decorator
 */
export interface VectorQueryConfig {
  /** Collection name to search in */
  readonly collection: string;

  /** Automatically generate embeddings for text queries */
  readonly autoEmbed?: boolean;

  /** Default number of results to return */
  readonly defaultLimit?: number;

  /** Default similarity threshold (0-1) */
  readonly similarityThreshold?: number;

  /** Default filters to apply */
  readonly defaultFilters?: Where;

  /** Cache results for repeated queries */
  readonly enableCaching?: boolean;

  /** Cache timeout in milliseconds */
  readonly cacheTimeout?: number;

  /** Include metadata in results */
  readonly includeMetadata?: boolean;

  /** Include documents in results */
  readonly includeDocuments?: boolean;

  /** Include distances in results */
  readonly includeDistances?: boolean;

  /** Include embeddings in results */
  readonly includeEmbeddings?: boolean;

  /** Transform results before returning */
  readonly resultTransformer?: (result: ChromaSearchResult) => any;

  /** Validate query parameters */
  readonly validateParams?: boolean;

  /** Error handling strategy */
  readonly errorHandling?: 'throw' | 'return_empty' | 'return_null';
}

/**
 * Vector query parameters interface
 */
export interface VectorQueryParams {
  /** Text query (will be auto-embedded if autoEmbed is true) */
  query?: string;

  /** Pre-computed embedding vector */
  embedding?: number[];

  /** Number of results to return */
  limit?: number;

  /** Similarity threshold filter */
  threshold?: number;

  /** Metadata filters */
  filters?: Where;

  /** Document filters */
  documentFilters?: WhereDocument;

  /** Override result options */
  includeMetadata?: boolean;
  includeDocuments?: boolean;
  includeDistances?: boolean;
  includeEmbeddings?: boolean;
}

/**
 *  vector search result with type safety
 */
export interface TypedVectorSearchResult<
  TDocument extends BaseDocument = BaseDocument
> {
  ids: string[];
  documents: Array<TDocument | null>;
  metadatas: Array<TDocument['metadata'] | null>;
  distances: number[];
  embeddings?: number[][];
  queryTime: number;
  cacheHit: boolean;
}

/**
 * @VectorQuery decorator for declarative vector search operations
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SearchService {
 *   @VectorQuery({
 *     collection: 'documents',
 *     autoEmbed: true,
 *     defaultLimit: 10,
 *     includeMetadata: true,
 *     includeDocuments: true,
 *     includeDistances: true,
 *   })
 *   async findSimilarDocuments(params: VectorQueryParams): Promise<TypedVectorSearchResult> {
 *     // Method body is replaced by decorator implementation
 *     // Return type is automatically inferred
 *   }
 *
 *   @VectorQuery({
 *     collection: 'user-memories',
 *     autoEmbed: true,
 *     defaultLimit: 5,
 *     similarityThreshold: 0.8,
 *     resultTransformer: (result) => result.documents.filter(doc => doc !== null),
 *   })
 *   async searchMemories(params: VectorQueryParams): Promise<string[]> {
 *     // Transformed result type
 *   }
 * }
 * ```
 */
export function VectorQuery<TDocument extends BaseDocument = BaseDocument>(
  config: VectorQueryConfig
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'VectorQuery',
      'method',
      config as unknown as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(target, propertyKey, metadata);

    // Store original method
    const originalMethod = descriptor.value;

    // Replace method with  implementation
    descriptor.value = async function (
      this: any,
      ...args: any[]
    ): Promise<any> {
      const queryParams = (args[0] as VectorQueryParams) || {};

      try {
        // Get ChromaDB  service
        const chromaService = getChromaService(this);

        // Validate parameters if enabled
        if (config.validateParams) {
          validateQueryParameters(queryParams, config);
        }

        // Prepare search options
        const searchOptions = prepareSearchOptions(queryParams, config);

        // Execute vector search
        const startTime = Date.now();
        let result: ChromaSearchResult;

        if (queryParams.query && config.autoEmbed) {
          // Auto-embed text query
          result = await chromaService.searchDocuments(
            config.collection,
            [queryParams.query],
            undefined,
            searchOptions
          );
        } else if (queryParams.embedding) {
          // Use provided embedding
          result = await chromaService.searchDocuments(
            config.collection,
            [],
            [queryParams.embedding],
            searchOptions
          );
        } else {
          throw new VectorQueryError(
            'Either query text (with autoEmbed) or embedding vector must be provided'
          );
        }

        const queryTime = Date.now() - startTime;

        // Transform result
        const returnedResult: TypedVectorSearchResult<TDocument> = {
          ids: result.ids[0] || [],
          documents: (result.documents[0] as Array<TDocument | null>) || [],
          metadatas:
            (result.metadatas[0] as Array<TDocument['metadata'] | null>) || [],
          distances: (result.distances?.[0] || []).filter(
            (d): d is number => d !== null
          ),
          embeddings: (result.embeddings?.[0] || []).filter(
            (e): e is number[] => e !== null
          ),
          queryTime,
          cacheHit: false, // TODO: Implement cache hit detection
        };

        // Apply result transformer if provided
        if (config.resultTransformer) {
          return config.resultTransformer(result);
        }

        return returnedResult;
      } catch (error) {
        return handleVectorQueryError(error, config, originalMethod, args);
      }
    };

    return descriptor;
  };
}

/**
 * Get ChromaDB service from the class instance
 */
function getChromaService(instance: any): ChromaDBService {
  // Try to get injected service
  if (instance.chromaService) {
    return instance.chromaService;
  }

  if (instance.chromaDBService) {
    return instance.chromaDBService;
  }

  // Check for any ChromaDB service in the instance
  for (const key of Object.keys(instance)) {
    const service = instance[key];
    if (service && typeof service.searchDocuments === 'function') {
      return service;
    }
  }

  throw new VectorQueryError(
    'ChromaDBService not found. Please inject ChromaDBService into your class.'
  );
}

/**
 * Validate query parameters
 */
function validateQueryParameters(
  params: VectorQueryParams,
  config: VectorQueryConfig
): void {
  if (!params.query && !params.embedding) {
    throw new VectorQueryError(
      'Either query text or embedding vector must be provided'
    );
  }

  if (params.query && params.embedding) {
    throw new VectorQueryError(
      'Cannot provide both query text and embedding vector'
    );
  }

  if (
    params.embedding &&
    (!Array.isArray(params.embedding) || params.embedding.length === 0)
  ) {
    throw new VectorQueryError(
      'Embedding vector must be a non-empty array of numbers'
    );
  }

  if (params.limit && (params.limit < 1 || params.limit > 1000)) {
    throw new VectorQueryError('Limit must be between 1 and 1000');
  }

  if (params.threshold && (params.threshold < 0 || params.threshold > 1)) {
    throw new VectorQueryError('Similarity threshold must be between 0 and 1');
  }
}

/**
 * Prepare search options from parameters and config
 */
function prepareSearchOptions(
  params: VectorQueryParams,
  config: VectorQueryConfig
): ChromaSearchOptions {
  const limit = params.limit ?? config.defaultLimit ?? 10;
  const threshold = params.threshold ?? config.similarityThreshold;

  const options: ChromaSearchOptions = {
    nResults: limit,
    where: mergeFilters(config.defaultFilters, params.filters),
    whereDocument: params.documentFilters,
    includeMetadata: params.includeMetadata ?? config.includeMetadata ?? true,
    includeDocuments:
      params.includeDocuments ?? config.includeDocuments ?? true,
    includeDistances:
      params.includeDistances ?? config.includeDistances ?? true,
    includeEmbeddings:
      params.includeEmbeddings ?? config.includeEmbeddings ?? false,
  };

  // Apply similarity threshold if provided
  if (threshold !== undefined) {
    // Add distance filter based on threshold
    // This is implementation-specific to ChromaDB distance calculation
    const distanceThreshold = 1 - threshold; // Convert similarity to distance
    const updatedWhere = options.where
      ? {
          $and: [options.where, { distance: { $lte: distanceThreshold } }],
        }
      : { distance: { $lte: distanceThreshold } };

    // Create new options object to avoid readonly property assignment
    return {
      ...options,
      where: updatedWhere,
    };
  }

  return options;
}

/**
 * Merge multiple filter objects
 */
function mergeFilters(
  defaultFilters?: Where,
  paramFilters?: Where
): Where | undefined {
  if (!defaultFilters && !paramFilters) {
    return undefined;
  }

  if (defaultFilters && !paramFilters) {
    return defaultFilters;
  }

  if (!defaultFilters && paramFilters) {
    return paramFilters;
  }

  // Merge both filters with AND logic
  return {
    $and: [defaultFilters!, paramFilters!],
  };
}

/**
 * Handle errors based on configuration
 */
async function handleVectorQueryError(
  error: any,
  config: VectorQueryConfig,
  originalMethod: (...args: any[]) => any,
  args: any[]
): Promise<any> {
  const logger = new Logger('VectorQuery');

  logger.error(`Vector query failed: ${error.message}`, error.stack);

  switch (config.errorHandling) {
    case 'return_empty':
      return {
        ids: [],
        documents: [],
        metadatas: [],
        distances: [],
        queryTime: 0,
        cacheHit: false,
      };

    case 'return_null':
      return null;

    case 'throw':
    default:
      // Try to call original method as fallback
      if (originalMethod && typeof originalMethod === 'function') {
        try {
          return await originalMethod.apply(this, args);
        } catch (fallbackError: unknown) {
          // If fallback also fails, throw  error
          const fallbackMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);
          throw new VectorQueryError(
            `Vector query failed: ${error.message}. Fallback also failed: ${fallbackMessage}`,
            { originalError: error, fallbackError }
          );
        }
      }

      throw error;
  }
}

/**
 * Custom error class for vector query operations
 */
export class VectorQueryError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorQueryError';
  }
}

/**
 * Type-safe vector query parameter builder
 */
export class VectorQueryBuilder<TDocument extends BaseDocument = BaseDocument> {
  private params: VectorQueryParams = {};

  /**
   * Set text query for auto-embedding
   */
  query(text: string): this {
    this.params.query = text;
    return this;
  }

  /**
   * Set pre-computed embedding vector
   */
  embedding(vector: number[]): this {
    this.params.embedding = vector;
    return this;
  }

  /**
   * Set result limit
   */
  limit(count: number): this {
    this.params.limit = count;
    return this;
  }

  /**
   * Set similarity threshold
   */
  threshold(value: number): this {
    this.params.threshold = value;
    return this;
  }

  /**
   * Add metadata filter
   */
  where(field: keyof TDocument['metadata'], value: any): this {
    if (!this.params.filters) {
      this.params.filters = {} as Where;
    }
    (this.params.filters as any)[field as string] = value;
    return this;
  }

  /**
   * Add metadata filter with operator
   */
  whereIn(field: keyof TDocument['metadata'], values: any[]): this {
    if (!this.params.filters) {
      this.params.filters = {} as Where;
    }
    (this.params.filters as any)[field as string] = { $in: values };
    return this;
  }

  /**
   * Add document content filter
   */
  whereDocument(filter: WhereDocument): this {
    this.params.documentFilters = filter;
    return this;
  }

  /**
   * Include metadata in results
   */
  includeMetadata(include = true): this {
    this.params.includeMetadata = include;
    return this;
  }

  /**
   * Include documents in results
   */
  includeDocuments(include = true): this {
    this.params.includeDocuments = include;
    return this;
  }

  /**
   * Include distances in results
   */
  includeDistances(include = true): this {
    this.params.includeDistances = include;
    return this;
  }

  /**
   * Include embeddings in results
   */
  includeEmbeddings(include = true): this {
    this.params.includeEmbeddings = include;
    return this;
  }

  /**
   * Build final query parameters
   */
  build(): VectorQueryParams {
    return { ...this.params };
  }
}

/**
 * Utility function to create a vector query builder
 */
export function createVectorQueryBuilder<
  TDocument extends BaseDocument = BaseDocument
>(): VectorQueryBuilder<TDocument> {
  return new VectorQueryBuilder<TDocument>();
}

/**
 * Example usage patterns:
 *
 * @example Basic usage
 * ```typescript
 * @Injectable()
 * export class DocumentSearchService {
 *   @VectorQuery({
 *     collection: 'documents',
 *     autoEmbed: true,
 *     defaultLimit: 10,
 *   })
 *   async searchDocuments(params: VectorQueryParams) {
 *     // Implementation handled by decorator
 *   }
 *
 *   async findSimilar(query: string) {
 *     return this.searchDocuments({ query, limit: 5 });
 *   }
 * }
 * ```
 *
 * @example With query builder
 * ```typescript
 * async findUserMemories(userId: string, query: string) {
 *   const params = createVectorQueryBuilder()
 *     .query(query)
 *     .limit(10)
 *     .where('userId', userId)
 *     .threshold(0.8)
 *     .includeMetadata()
 *     .includeDocuments()
 *     .build();
 *
 *   return this.searchMemories(params);
 * }
 * ```
 */
