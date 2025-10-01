/**
 * @fileoverview Tenant Transformation Utilities - Transform method arguments for tenant isolation
 */

import { Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import { getErrorMessage } from '../../utils/errors/error-handling.utils';

// Re-export types and classes
export type {
  ArgumentTransformer,
  ArgumentTransformationResult,
  TransformationResult,
} from './transformation-types';
export { TenantTransformationError } from './transformation-types';

// Re-export transformers
export { CollectionNameTransformer } from './collection-transformer';
export { OptionsObjectTransformer } from './options-transformer';
export { DocumentArrayTransformer } from './document-transformer';

// Import transformer classes for use in main class
import type {
  ArgumentTransformer,
  ArgumentTransformationResult,
  TransformationResult,
} from './transformation-types';
import { CollectionNameTransformer } from './collection-transformer';
import { OptionsObjectTransformer } from './options-transformer';
import { DocumentArrayTransformer } from './document-transformer';

/**
 * Query parameters transformer for tenant filtering
 */
export class QueryParametersTransformer implements ArgumentTransformer {
  readonly name = 'query-parameters';
  readonly priority = 70;
  private readonly logger = new Logger(QueryParametersTransformer.name);

  canTransform(value: unknown, index: number): boolean {
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
      this.logger.error(`Query parameter transformation failed:`, errorMessage);

      return {
        originalValue: value,
        transformedValue: value,
        wasTransformed: false,
        transformationType: this.name,
        metadata: {
          error: errorMessage,
        },
      };
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
                `Transformer ${
                  transformer.name
                } failed for argument ${i}: ${getErrorMessage(error)}`,
                error instanceof Error ? error.stack : undefined
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
        `Failed to transform arguments for tenant ${
          tenantContext.tenantId
        }: ${getErrorMessage(error)}`,
        error instanceof Error ? error.stack : undefined
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
