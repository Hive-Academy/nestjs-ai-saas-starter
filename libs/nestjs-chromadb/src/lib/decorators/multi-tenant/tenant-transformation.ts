/**
 * @fileoverview Tenant Transformation Utilities - Transform method arguments for tenant isolation
 */

import { Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import { TenantIsolationService } from '../../services/multi-tenant/tenant-isolation.service';

/**
 * Transformation error with context
 */
export class TenantTransformationError extends Error {
  constructor(
    message: string,
    public readonly argumentIndex: number,
    public readonly argumentValue: unknown,
    public readonly tenantId?: string
  ) {
    super(message);
    this.name = 'TenantTransformationError';
  }
}

/**
 * Transformation result for a single argument
 */
export interface ArgumentTransformationResult {
  readonly originalValue: unknown;
  readonly transformedValue: unknown;
  readonly wasTransformed: boolean;
  readonly transformationType: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Complete transformation result
 */
export interface TransformationResult {
  readonly originalArgs: unknown[];
  readonly transformedArgs: unknown[];
  readonly transformations: ArgumentTransformationResult[];
  readonly collectionsTransformed: string[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Argument transformer interface
 */
export interface ArgumentTransformer {
  readonly name: string;
  readonly priority: number;
  canTransform(value: unknown, index: number): boolean;
  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult;
}

/**
 * Collection name transformer
 */
export class CollectionNameTransformer implements ArgumentTransformer {
  readonly name = 'collection-name';
  readonly priority = 100;
  private readonly logger = new Logger(CollectionNameTransformer.name);
  private readonly isolationService = new TenantIsolationService();

  canTransform(value: unknown): boolean {
    return typeof value === 'string' && this.isCollectionName(value);
  }

  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult {
    const collectionName = String(value);

    try {
      // Generate tenant-aware collection name
      const result = this.isolationService.generateTenantCollection(
        collectionName,
        tenantContext.tenantId,
        config
      );

      this.logger.debug(
        `Transformed collection: ${collectionName} -> ${result.tenantCollection} for tenant ${tenantContext.tenantId}`
      );

      return {
        originalValue: value,
        transformedValue: result.tenantCollection,
        wasTransformed: true,
        transformationType: 'collection-name',
        metadata: {
          baseCollection: result.baseCollection,
          tenantId: result.tenantId,
          namingStrategy: result.namingStrategy,
          argumentIndex: index,
        },
      };
    } catch (error) {
      throw new TenantTransformationError(
        `Failed to transform collection name: ${error.message}`,
        index,
        value,
        tenantContext.tenantId
      );
    }
  }

  private isCollectionName(value: string): boolean {
    // Collection name heuristics
    return (
      value.length > 0 &&
      value.length < 200 &&
      !value.includes(' ') &&
      !value.includes('\n') &&
      !value.includes('\t') &&
      !/^https?:\/\//.test(value) && // Not a URL
      !value.includes('@') && // Not an email
      !/^\d+$/.test(value) && // Not just numbers
      /^[a-zA-Z0-9_-]+$/.test(value) // Valid collection characters
    );
  }
}

/**
 * Options object transformer (for nested collection references)
 */
export class OptionsObjectTransformer implements ArgumentTransformer {
  readonly name = 'options-object';
  readonly priority = 80;
  private readonly logger = new Logger(OptionsObjectTransformer.name);
  private readonly isolationService = new TenantIsolationService();

  canTransform(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      this.hasCollectionReferences(value as Record<string, unknown>)
    );
  }

  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult {
    const options = value as Record<string, unknown>;
    const transformedOptions = { ...options };
    const transformedCollections: string[] = [];

    try {
      // Transform known collection reference fields
      const collectionFields = [
        'collection',
        'collectionName',
        'fromCollection',
        'toCollection',
      ];

      for (const field of collectionFields) {
        if (typeof options[field] === 'string') {
          const result = this.isolationService.generateTenantCollection(
            String(options[field]),
            tenantContext.tenantId,
            config
          );

          transformedOptions[field] = result.tenantCollection;
          transformedCollections.push(result.tenantCollection);
        }
      }

      // Transform array of collection names
      if (Array.isArray(options.collections)) {
        transformedOptions.collections = options.collections.map((col) => {
          if (typeof col === 'string') {
            const result = this.isolationService.generateTenantCollection(
              col,
              tenantContext.tenantId,
              config
            );
            transformedCollections.push(result.tenantCollection);
            return result.tenantCollection;
          }
          return col;
        });
      }

      const wasTransformed = transformedCollections.length > 0;

      if (wasTransformed) {
        this.logger.debug(
          `Transformed options object with ${transformedCollections.length} collection references for tenant ${tenantContext.tenantId}`
        );
      }

      return {
        originalValue: value,
        transformedValue: transformedOptions,
        wasTransformed,
        transformationType: 'options-object',
        metadata: {
          transformedCollections,
          fieldsTransformed: Object.keys(transformedOptions).filter(
            (key) => options[key] !== transformedOptions[key]
          ),
          argumentIndex: index,
        },
      };
    } catch (error) {
      throw new TenantTransformationError(
        `Failed to transform options object: ${error.message}`,
        index,
        value,
        tenantContext.tenantId
      );
    }
  }

  private hasCollectionReferences(options: Record<string, unknown>): boolean {
    const collectionFields = [
      'collection',
      'collectionName',
      'fromCollection',
      'toCollection',
      'collections',
    ];

    return collectionFields.some((field) => {
      const value = options[field];
      return typeof value === 'string' || Array.isArray(value);
    });
  }
}

/**
 * Document array transformer (adds tenant metadata)
 */
export class DocumentArrayTransformer implements ArgumentTransformer {
  readonly name = 'document-array';
  readonly priority = 60;
  private readonly logger = new Logger(DocumentArrayTransformer.name);

  canTransform(value: unknown): boolean {
    return Array.isArray(value) && this.isDocumentArray(value);
  }

  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult {
    const documents = value as Array<Record<string, unknown>>;

    try {
      const transformedDocuments = documents.map((doc) => ({
        ...doc,
        metadata: {
          ...((doc.metadata as Record<string, unknown>) || {}),
          tenantId: tenantContext.tenantId,
          organizationId: tenantContext.organizationId,
          transformedAt: new Date().toISOString(),
        },
      }));

      this.logger.debug(
        `Enriched ${documents.length} documents with tenant metadata for tenant ${tenantContext.tenantId}`
      );

      return {
        originalValue: value,
        transformedValue: transformedDocuments,
        wasTransformed: true,
        transformationType: 'document-array',
        metadata: {
          documentCount: documents.length,
          tenantId: tenantContext.tenantId,
          argumentIndex: index,
        },
      };
    } catch (error) {
      throw new TenantTransformationError(
        `Failed to transform document array: ${error.message}`,
        index,
        value,
        tenantContext.tenantId
      );
    }
  }

  private isDocumentArray(value: unknown[]): boolean {
    // Check if array contains document-like objects
    return (
      value.length > 0 &&
      value.every(
        (item) =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
      )
    );
  }
}

/**
 * Query parameters transformer
 */
export class QueryParametersTransformer implements ArgumentTransformer {
  readonly name = 'query-parameters';
  readonly priority = 70;
  private readonly logger = new Logger(QueryParametersTransformer.name);

  canTransform(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      this.hasQueryParameters(value as Record<string, unknown>)
    );
  }

  transform(
    value: unknown,
    index: number,
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): ArgumentTransformationResult {
    const params = value as Record<string, unknown>;
    const transformedParams = { ...params };

    try {
      // Add tenant context to where clauses
      if (
        transformedParams.where &&
        typeof transformedParams.where === 'object'
      ) {
        transformedParams.where = {
          ...(transformedParams.where as Record<string, unknown>),
          tenantId: tenantContext.tenantId,
        };
      } else {
        transformedParams.where = { tenantId: tenantContext.tenantId };
      }

      // Add tenant filters to metadata filters
      if (transformedParams.metadataFilters) {
        if (Array.isArray(transformedParams.metadataFilters)) {
          transformedParams.metadataFilters.push({
            field: 'tenantId',
            operator: 'eq',
            value: tenantContext.tenantId,
          });
        } else if (typeof transformedParams.metadataFilters === 'object') {
          (
            transformedParams.metadataFilters as Record<string, unknown>
          ).tenantId = tenantContext.tenantId;
        }
      }

      this.logger.debug(
        `Added tenant filters to query parameters for tenant ${tenantContext.tenantId}`
      );

      return {
        originalValue: value,
        transformedValue: transformedParams,
        wasTransformed: true,
        transformationType: 'query-parameters',
        metadata: {
          tenantId: tenantContext.tenantId,
          filtersAdded: ['tenantId'],
          argumentIndex: index,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new TenantTransformationError(
        `Failed to transform query parameters: ${errorMessage}`,
        index,
        value,
        tenantContext.tenantId
      );
    }
  }

  private hasQueryParameters(value: Record<string, unknown>): boolean {
    const queryFields = [
      'where',
      'filter',
      'metadataFilters',
      'include',
      'limit',
      'offset',
    ];
    return queryFields.some((field) => field in value);
  }
}

/**
 * Main argument transformer that manages all transformation strategies
 */
export class TenantArgumentTransformer {
  private readonly logger = new Logger(TenantArgumentTransformer.name);
  private readonly transformers = new Map<string, ArgumentTransformer>();

  constructor() {
    // Register default transformers
    this.registerTransformer(new CollectionNameTransformer());
    this.registerTransformer(new OptionsObjectTransformer());
    this.registerTransformer(new DocumentArrayTransformer());
    this.registerTransformer(new QueryParametersTransformer());
  }

  /**
   * Register a custom transformer
   */
  registerTransformer(transformer: ArgumentTransformer): void {
    this.transformers.set(transformer.name, transformer);
    this.logger.debug(`Registered argument transformer: ${transformer.name}`);
  }

  /**
   * Transform method arguments for tenant isolation
   */
  transformArguments(
    args: unknown[],
    tenantContext: TenantContext,
    config: TenantIsolationConfig,
    options: {
      skipTransformers?: string[];
      enabledTransformers?: string[];
    } = {}
  ): TransformationResult {
    const transformations: ArgumentTransformationResult[] = [];
    const transformedArgs: unknown[] = [];
    const collectionsTransformed: string[] = [];

    // Get active transformers
    const activeTransformers = this.getActiveTransformers(options);

    try {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        let transformed = false;
        let transformationResult: ArgumentTransformationResult | undefined;

        // Try each transformer in priority order
        for (const transformer of activeTransformers) {
          if (transformer.canTransform(arg, i)) {
            try {
              transformationResult = transformer.transform(
                arg,
                i,
                tenantContext,
                config
              );

              if (transformationResult.wasTransformed) {
                transformed = true;
                transformations.push(transformationResult);

                // Track transformed collections
                if (
                  transformer.name === 'collection-name' &&
                  typeof transformationResult.transformedValue === 'string'
                ) {
                  collectionsTransformed.push(
                    transformationResult.transformedValue
                  );
                }

                break; // Use first successful transformer
              }
            } catch (error) {
              this.logger.error(
                `Transformer ${transformer.name} failed for argument ${i}: ${error.message}`,
                error.stack
              );
              throw error;
            }
          }
        }

        // Use transformed value or original
        if (transformed && transformationResult) {
          transformedArgs.push(transformationResult.transformedValue);
        } else {
          transformedArgs.push(arg);
          transformations.push({
            originalValue: arg,
            transformedValue: arg,
            wasTransformed: false,
            transformationType: 'none',
          });
        }
      }

      const totalTransformations = transformations.filter(
        (t) => t.wasTransformed
      ).length;

      if (totalTransformations > 0) {
        this.logger.debug(
          `Transformed ${totalTransformations}/${args.length} arguments for tenant ${tenantContext.tenantId}`
        );
      }

      return {
        originalArgs: args,
        transformedArgs,
        transformations,
        collectionsTransformed,
        metadata: {
          tenantId: tenantContext.tenantId,
          totalArguments: args.length,
          totalTransformations,
          transformersUsed: [
            ...new Set(
              transformations
                .filter((t) => t.wasTransformed)
                .map((t) => t.transformationType)
            ),
          ],
          transformedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to transform arguments for tenant ${tenantContext.tenantId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Extract collection names from arguments (for audit purposes)
   */
  extractCollectionNames(args: unknown[]): string[] {
    const collections: string[] = [];
    const collectionTransformer = new CollectionNameTransformer();

    for (let i = 0; i < args.length; i++) {
      if (collectionTransformer.canTransform(args[i], i)) {
        collections.push(String(args[i]));
      }
    }

    return collections;
  }

  private getActiveTransformers(options: {
    skipTransformers?: string[];
    enabledTransformers?: string[];
  }): ArgumentTransformer[] {
    let transformers = Array.from(this.transformers.values());

    // Filter by enabled transformers if specified
    if (options.enabledTransformers) {
      transformers = transformers.filter((t) =>
        options.enabledTransformers!.includes(t.name)
      );
    }

    // Remove skipped transformers
    if (options.skipTransformers) {
      transformers = transformers.filter(
        (t) => !options.skipTransformers!.includes(t.name)
      );
    }

    // Sort by priority (higher priority first)
    return transformers.sort((a, b) => b.priority - a.priority);
  }
}
