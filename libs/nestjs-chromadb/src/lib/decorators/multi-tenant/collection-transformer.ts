/**
 * @fileoverview Collection Name Transformer
 * Extracted from tenant-transformation.ts for better architecture compliance
 */

import { Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import { TenantIsolationService } from '../../services/multi-tenant/tenant-isolation.service';
import type {
  ArgumentTransformer,
  ArgumentTransformationResult,
} from './transformation-types';

/**
 * Collection name transformer
 */
export class CollectionNameTransformer implements ArgumentTransformer {
  readonly name = 'collection-name';
  readonly priority = 100;
  private readonly logger = new Logger(CollectionNameTransformer.name);
  private readonly isolationService = new TenantIsolationService();

  canTransform(value: unknown, index: number): boolean {
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
        transformationType: this.name,
        metadata: {
          originalCollection: collectionName,
          tenantPrefix: result.prefix,
          namespacingStrategy: config.namespacingStrategy,
        },
      };
    } catch (error) {
      this.logger.error(
        `Collection transformation failed for ${collectionName}:`,
        error
      );

      // Return original value if transformation fails
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
   * Determine if a string value is likely a collection name
   */
  private isCollectionName(value: string): boolean {
    // Collection names are typically:
    // - Non-empty strings
    // - Not URLs or file paths
    // - Don't contain complex query parameters
    // - Reasonable length (not enormous JSON strings)

    if (!value || value.length === 0) {
      return false;
    }

    if (value.length > 100) {
      return false;
    }

    // Skip URLs
    if (value.includes('://') || value.startsWith('/')) {
      return false;
    }

    // Skip JSON-like strings
    if (value.includes('{') || value.includes('[')) {
      return false;
    }

    // Skip query parameters
    if (value.includes('&') || value.includes('=')) {
      return false;
    }

    return true;
  }
}
