/**
 * @fileoverview Vector Query Core Implementation - Main decorator logic
 */

import { Logger } from '@nestjs/common';
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
import {
  type VectorQueryConfig,
  type VectorQueryParams,
  type TypedVectorSearchResult,
  VectorQueryError,
} from './vector-query-types';

/**
 * @VectorQuery Decorator - Core Vector Search with Auto-Embedding
 *
 * This decorator eliminates manual service injection and error handling for vector
 * operations by providing declarative vector search with automatic embedding generation.
 *
 * @example
 * ```typescript
 * @VectorQuery({
 *   collection: 'documents',
 *   autoEmbed: true,
 *   defaultLimit: 10,
 *   includeMetadata: true
 * })
 * async searchDocuments(params: VectorQueryParams): Promise<TypedVectorSearchResult<Document>> {
 *   // Implementation handled by decorator
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

    // Store original method for fallback
    const originalMethod = descriptor.value;
    const logger = new Logger(
      `VectorQuery:${target.constructor.name}.${String(propertyKey)}`
    );

    // Replace method with vector query implementation
    descriptor.value = async function (
      this: any,
      ...args: any[]
    ): Promise<TypedVectorSearchResult<TDocument>> {
      const queryParams = (args[0] as VectorQueryParams) || {};

      try {
        // Get ChromaDB service
        const chromaService = getChromaService(this, config.serviceKey);

        // Validate parameters if enabled
        if (config.validateParams) {
          validateQueryParameters(queryParams, config);
        }

        // Prepare search options
        const searchOptions = prepareSearchOptions(queryParams, config);

        // Execute vector search
        const startTime = Date.now();
        let result: ChromaSearchResult;

        if (Array.isArray(queryParams.queries)) {
          if (typeof queryParams.queries[0] === 'string' && config.autoEmbed) {
            // Auto-embed text queries
            result = await chromaService.searchDocuments(
              config.collection,
              queryParams.queries as string[],
              undefined,
              searchOptions
            );
          } else if (Array.isArray(queryParams.queries[0])) {
            // Use provided embedding vectors
            result = await chromaService.searchDocuments(
              config.collection,
              [],
              queryParams.queries as number[][],
              searchOptions
            );
          } else {
            throw new VectorQueryError(
              'Invalid query format: queries must be string[] for text or number[][] for embeddings',
              'query_validation',
              config.collection
            );
          }
        } else {
          throw new VectorQueryError(
            'queries parameter is required',
            'missing_parameter',
            config.collection
          );
        }

        const queryTime = Date.now() - startTime;

        // Create typed result
        const typedResult = createTypedResult<TDocument>(
          result,
          queryTime,
          config
        );

        // Apply result transformer if provided
        if (config.resultTransformer) {
          return config.resultTransformer(
            result
          ) as TypedVectorSearchResult<TDocument>;
        }

        // Log successful query if enabled
        if (config.enableLogging) {
          logger.log(
            `Vector query completed in ${queryTime}ms for collection ${config.collection}`
          );
        }

        return typedResult;
      } catch (error) {
        return handleVectorQueryError(
          error,
          config,
          originalMethod,
          args,
          this,
          logger
        );
      }
    };

    return descriptor;
  };
}

/**
 * Get ChromaDB service from the class instance
 */
function getChromaService(instance: any, serviceKey?: string): ChromaDBService {
  const key = serviceKey || 'chromaService';
  const service = instance[key];

  if (!service) {
    throw new VectorQueryError(
      `ChromaDB service not found on instance. Expected property: ${key}`,
      'service_injection',
      'unknown'
    );
  }

  if (typeof service.searchDocuments !== 'function') {
    throw new VectorQueryError(
      'Invalid ChromaDB service: missing searchDocuments method',
      'invalid_service',
      'unknown'
    );
  }

  return service;
}

/**
 * Validate query parameters
 */
function validateQueryParameters(
  params: VectorQueryParams,
  config: VectorQueryConfig
): void {
  if (
    !params.queries ||
    !Array.isArray(params.queries) ||
    params.queries.length === 0
  ) {
    throw new VectorQueryError(
      'queries parameter is required and must be a non-empty array',
      'validation',
      config.collection
    );
  }

  if (params.nResults && (params.nResults < 1 || params.nResults > 1000)) {
    throw new VectorQueryError(
      'nResults must be between 1 and 1000',
      'validation',
      config.collection
    );
  }

  // Validate query type consistency
  const firstQueryType = typeof params.queries[0];
  if (firstQueryType === 'string' && !config.autoEmbed) {
    throw new VectorQueryError(
      'Text queries require autoEmbed to be enabled',
      'validation',
      config.collection
    );
  }

  if (Array.isArray(params.queries[0]) && config.autoEmbed) {
    throw new VectorQueryError(
      'Embedding vectors should not be used with autoEmbed enabled',
      'validation',
      config.collection
    );
  }
}

/**
 * Prepare ChromaDB search options
 */
function prepareSearchOptions(
  params: VectorQueryParams,
  config: VectorQueryConfig
): ChromaSearchOptions {
  const options: ChromaSearchOptions = {
    nResults: params.nResults || config.defaultLimit || 10,
    where: params.where || config.defaultFilters,
    whereDocument: params.whereDocument,
  };

  // Set include options - create mutable version to avoid readonly issues
  const mutableOptions = { ...options } as {
    -readonly [K in keyof ChromaSearchOptions]: ChromaSearchOptions[K];
  };

  if (params.include) {
    mutableOptions.includeMetadata = params.include.includes('metadatas');
    mutableOptions.includeDocuments = params.include.includes('documents');
    mutableOptions.includeDistances = params.include.includes('distances');
    mutableOptions.includeEmbeddings = params.include.includes('embeddings');
  } else {
    // Use config defaults
    mutableOptions.includeMetadata = config.includeMetadata ?? true;
    mutableOptions.includeDocuments = config.includeDocuments ?? true;
    mutableOptions.includeDistances = config.includeDistances ?? true;
    mutableOptions.includeEmbeddings = config.includeEmbeddings ?? false;
  }

  return mutableOptions;
}

/**
 * Create a typed result object with utility methods
 */
function createTypedResult<TDocument extends BaseDocument>(
  result: ChromaSearchResult,
  queryTime: number,
  config: VectorQueryConfig
): TypedVectorSearchResult<TDocument> {
  const typedResult: TypedVectorSearchResult<TDocument> = {
    results: result,
    metadata: {
      queryTime,
      collection: config.collection,
      totalResults: result.ids[0]?.length || 0,
      fromCache: false, // TODO: Implement cache detection
    },

    toDocuments(): TDocument[] {
      const documents: TDocument[] = [];
      const ids = result.ids[0] || [];
      const docs = result.documents[0] || [];
      const metadatas = result.metadatas[0] || [];

      for (let i = 0; i < ids.length; i++) {
        if (docs[i] && metadatas[i]) {
          documents.push({
            id: ids[i],
            content: docs[i] as string,
            metadata: metadatas[i],
          } as TDocument);
        }
      }

      return documents;
    },

    withScores(): Array<{ document: TDocument; score: number }> {
      const documents = this.toDocuments();
      const distances = result.distances?.[0] || [];

      return documents.map((doc, index) => ({
        document: doc,
        score: distances[index] ? 1 - distances[index] : 0, // Convert distance to similarity score
      }));
    },
  };

  return typedResult;
}

/**
 * Handle vector query errors with fallback to original method
 */
async function handleVectorQueryError(
  error: unknown,
  config: VectorQueryConfig,
  originalMethod: (...args: any[]) => any,
  args: any[],
  instance: any,
  logger: Logger
): Promise<any> {
  const vectorError =
    error instanceof VectorQueryError
      ? error
      : new VectorQueryError(
          error instanceof Error ? error.message : String(error),
          'unknown',
          config.collection,
          error instanceof Error ? error : undefined
        );

  if (config.enableLogging) {
    logger.error(
      `Vector query failed: ${vectorError.message}`,
      vectorError.stack
    );
  }

  // Try fallback to original method if it exists and is callable
  if (originalMethod && typeof originalMethod === 'function') {
    try {
      return await originalMethod.apply(instance, args);
    } catch (fallbackError) {
      if (config.enableLogging) {
        logger.error('Original method fallback also failed', fallbackError);
      }
      // Re-throw the original vector query error, not the fallback error
      throw vectorError;
    }
  }

  throw vectorError;
}
