/**
 * @fileoverview Options Object Transformer
 * Extracted from tenant-transformation.ts for better architecture compliance
 */

import { Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import type {
  ArgumentTransformer,
  ArgumentTransformationResult,
} from './transformation-types';

/**
 * Options object transformer for tenant-aware filtering
 */
export class OptionsObjectTransformer implements ArgumentTransformer {
  readonly name = 'options-object';
  readonly priority = 50;
  private readonly logger = new Logger(OptionsObjectTransformer.name);

  canTransform(value: unknown, index: number): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      this.hasOptionsStructure(value)
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
    let wasTransformed = false;
    const metadata: Record<string, unknown> = {};

    try {
      // Transform where clauses to include tenant filtering
      if (options.where && typeof options.where === 'object') {
        const tenantFilter = this.createTenantFilter(tenantContext, config);
        transformedOptions.where = this.mergeWhereClause(
          options.where as Record<string, unknown>,
          tenantFilter
        );
        wasTransformed = true;
        metadata.whereClauseTransformed = true;
      }

      // Transform whereDocument clauses
      if (options.whereDocument && typeof options.whereDocument === 'object') {
        const tenantDocumentFilter = this.createTenantDocumentFilter(
          tenantContext,
          config
        );
        transformedOptions.whereDocument = this.mergeWhereClause(
          options.whereDocument as Record<string, unknown>,
          tenantDocumentFilter
        );
        wasTransformed = true;
        metadata.whereDocumentTransformed = true;
      }

      // Apply tenant-specific limits if configured
      if (config.maxItemsPerQuery && typeof options.nResults === 'number') {
        const newLimit = Math.min(options.nResults, config.maxItemsPerQuery);
        if (newLimit !== options.nResults) {
          transformedOptions.nResults = newLimit;
          wasTransformed = true;
          metadata.limitAdjusted = true;
          metadata.originalLimit = options.nResults;
          metadata.adjustedLimit = newLimit;
        }
      }

      if (wasTransformed) {
        this.logger.debug(
          `Transformed options object for tenant ${tenantContext.tenantId}`,
          { metadata }
        );
      }

      return {
        originalValue: value,
        transformedValue: transformedOptions,
        wasTransformed,
        transformationType: this.name,
        metadata,
      };
    } catch (error) {
      this.logger.error(
        `Options transformation failed for tenant ${tenantContext.tenantId}:`,
        error
      );

      return {
        originalValue: value,
        transformedValue: value,
        wasTransformed: false,
        transformationType: this.name,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check if object has options-like structure
   */
  private hasOptionsStructure(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const obj = value as Record<string, unknown>;

    // Common ChromaDB options properties
    const optionsKeys = [
      'where',
      'whereDocument',
      'nResults',
      'include',
      'offset',
      'limit',
    ];

    return optionsKeys.some((key) => key in obj);
  }

  /**
   * Create tenant filter for metadata where clause
   */
  private createTenantFilter(
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): Record<string, unknown> {
    const tenantField = config.metadataFields?.tenantId || 'tenantId';

    return {
      [tenantField]: tenantContext.tenantId,
    };
  }

  /**
   * Create tenant filter for document where clause
   */
  private createTenantDocumentFilter(
    tenantContext: TenantContext,
    config: TenantIsolationConfig
  ): Record<string, unknown> {
    // For document filtering, we might use different strategies
    if (config.documentFiltering === 'content_prefix') {
      return {
        $contains: `[TENANT:${tenantContext.tenantId}]`,
      };
    }

    if (config.documentFiltering === 'metadata_reference') {
      const tenantField = config.metadataFields?.tenantId || 'tenantId';
      return {
        $contains: `"${tenantField}":"${tenantContext.tenantId}"`,
      };
    }

    // Default: no document filtering
    return {};
  }

  /**
   * Merge where clauses intelligently
   */
  private mergeWhereClause(
    existingWhere: Record<string, unknown>,
    tenantFilter: Record<string, unknown>
  ): Record<string, unknown> {
    // If existing where clause is empty, use tenant filter
    if (!existingWhere || Object.keys(existingWhere).length === 0) {
      return tenantFilter;
    }

    // If tenant filter is empty, use existing
    if (!tenantFilter || Object.keys(tenantFilter).length === 0) {
      return existingWhere;
    }

    // If existing clause has $and, add tenant filter to it
    if (existingWhere.$and && Array.isArray(existingWhere.$and)) {
      return {
        ...existingWhere,
        $and: [...existingWhere.$and, tenantFilter],
      };
    }

    // If existing clause has $or, wrap both in $and
    if (existingWhere.$or) {
      return {
        $and: [existingWhere, tenantFilter],
      };
    }

    // Merge simple objects
    const tenantKeys = Object.keys(tenantFilter);
    const existingKeys = Object.keys(existingWhere);
    const conflictingKeys = tenantKeys.filter((key) =>
      existingKeys.includes(key)
    );

    if (conflictingKeys.length > 0) {
      // Create $and to avoid conflicts
      return {
        $and: [existingWhere, tenantFilter],
      };
    } else {
      // Simple merge
      return {
        ...existingWhere,
        ...tenantFilter,
      };
    }
  }
}
