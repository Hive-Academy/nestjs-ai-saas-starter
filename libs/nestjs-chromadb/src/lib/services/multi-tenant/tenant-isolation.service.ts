/**
 * @fileoverview Tenant Isolation Service - Manages tenant isolation and collection namespacing
 */

import { Injectable, Logger } from '@nestjs/common';
import { TenantContext, TenantIsolationConfig } from './tenant-context.service';
import {
  logUnknownError,
  handleUnknownError,
  getErrorMessage,
} from '../../utils/error-handling.utils';

/**
 * Tenant collection result
 */
export interface TenantCollectionResult {
  readonly tenantCollection: string;
  readonly baseCollection: string;
  readonly tenantId: string;
  readonly namingStrategy: string;
  readonly prefix?: string;
}

/**
 * Tenant collection validation result
 */
export interface TenantCollectionValidation {
  readonly isValid: boolean;
  readonly expectedCollection: string;
  readonly actualCollection: string;
  readonly errors: string[];
}

/**
 * Service responsible for tenant isolation and collection management
 */
@Injectable()
export class TenantIsolationService {
  private readonly logger = new Logger(TenantIsolationService.name);

  /**
   * Generate tenant-aware collection name
   */
  generateTenantCollection(
    baseCollection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): TenantCollectionResult {
    try {
      let tenantCollection: string;

      switch (config.namingStrategy) {
        case 'prefix':
          tenantCollection = `tenant_${tenantId}_${baseCollection}`;
          break;

        case 'suffix':
          tenantCollection = `${baseCollection}_tenant_${tenantId}`;
          break;

        case 'separate':
          tenantCollection = `${tenantId}:${baseCollection}`;
          break;

        case 'custom':
          if (!config.customNaming) {
            throw new Error(
              'Custom naming function required for custom naming strategy'
            );
          }
          tenantCollection = config.customNaming(baseCollection, tenantId);
          break;

        default:
          throw new Error(`Unknown naming strategy: ${config.namingStrategy}`);
      }

      this.logger.debug(
        `Generated tenant collection: ${baseCollection} -> ${tenantCollection} (strategy: ${config.namingStrategy})`
      );

      return {
        tenantCollection,
        baseCollection,
        tenantId,
        namingStrategy: config.namingStrategy,
        prefix:
          config.namingStrategy === 'prefix'
            ? `tenant_${tenantId}_`
            : undefined,
      };
    } catch (error: unknown) {
      logUnknownError(
        this.logger,
        error,
        `Failed to generate tenant collection for ${baseCollection}`
      );
      throw handleUnknownError(
        error,
        `Generate tenant collection for ${baseCollection}`
      );
    }
  }

  /**
   * Validate tenant collection name format
   */
  validateTenantCollection(
    collection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): TenantCollectionValidation {
    try {
      const baseCollection = this.extractBaseCollection(
        collection,
        tenantId,
        config
      );
      const expectedResult = this.generateTenantCollection(
        baseCollection,
        tenantId,
        config
      );
      const expectedCollection = expectedResult.tenantCollection;

      const isValid = collection === expectedCollection;
      const errors: string[] = [];

      if (!isValid) {
        errors.push(
          `Collection name mismatch: expected ${expectedCollection}, got ${collection}`
        );
      }

      // Additional validation rules
      if (collection.length > 255) {
        errors.push('Collection name exceeds maximum length (255 characters)');
      }

      if (!/^[a-zA-Z0-9_:-]+$/.test(collection)) {
        errors.push('Collection name contains invalid characters');
      }

      return {
        isValid: isValid && errors.length === 0,
        expectedCollection,
        actualCollection: collection,
        errors,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      return {
        isValid: false,
        expectedCollection: '',
        actualCollection: collection,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Extract base collection name from tenant collection
   */
  extractBaseCollection(
    tenantCollection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): string {
    switch (config.namingStrategy) {
      case 'prefix': {
        const prefixPattern = `tenant_${tenantId}_`;
        if (tenantCollection.startsWith(prefixPattern)) {
          return tenantCollection.substring(prefixPattern.length);
        }
        return tenantCollection;
      }

      case 'suffix': {
        const suffixPattern = `_tenant_${tenantId}`;
        if (tenantCollection.endsWith(suffixPattern)) {
          return tenantCollection.substring(
            0,
            tenantCollection.length - suffixPattern.length
          );
        }
        return tenantCollection;
      }

      case 'separate': {
        const separatePattern = `${tenantId}:`;
        if (tenantCollection.startsWith(separatePattern)) {
          return tenantCollection.substring(separatePattern.length);
        }
        return tenantCollection;
      }

      case 'custom': {
        // For custom naming, we can't reliably extract without reverse function
        this.logger.warn(
          'Cannot extract base collection from custom naming strategy'
        );
        return tenantCollection;
      }

      default:
        return tenantCollection;
    }
  }

  /**
   * Check if collection belongs to tenant
   */
  isCollectionOwnedByTenant(
    collection: string,
    tenantId: string,
    config: TenantIsolationConfig
  ): boolean {
    switch (config.namingStrategy) {
      case 'prefix':
        return collection.startsWith(`tenant_${tenantId}_`);

      case 'suffix':
        return collection.endsWith(`_tenant_${tenantId}`);

      case 'separate':
        return collection.startsWith(`${tenantId}:`);

      case 'custom':
        if (!config.customNaming) {
          return false;
        }
        // For custom naming, we need to generate and compare
        try {
          const baseCollection = this.extractBaseCollection(
            collection,
            tenantId,
            config
          );
          const expectedCollection = config.customNaming(
            baseCollection,
            tenantId
          );
          return collection === expectedCollection;
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Get all possible tenant collections for a base collection
   */
  generateAllTenantCollections(
    baseCollection: string,
    tenantIds: string[],
    config: TenantIsolationConfig
  ): TenantCollectionResult[] {
    return tenantIds.map((tenantId) =>
      this.generateTenantCollection(baseCollection, tenantId, config)
    );
  }

  /**
   * Filter collections by tenant ownership
   */
  filterCollectionsByTenant(
    collections: string[],
    tenantId: string,
    config: TenantIsolationConfig
  ): string[] {
    return collections.filter((collection) =>
      this.isCollectionOwnedByTenant(collection, tenantId, config)
    );
  }

  /**
   * Extract tenant ID from collection name
   */
  extractTenantIdFromCollection(
    collection: string,
    config: TenantIsolationConfig
  ): string | null {
    switch (config.namingStrategy) {
      case 'prefix': {
        const match = collection.match(/^tenant_([^_]+)_/);
        return match?.[1] || null;
      }

      case 'suffix': {
        const match = collection.match(/_tenant_([^_]+)$/);
        return match?.[1] || null;
      }

      case 'separate': {
        const match = collection.match(/^([^:]+):/);
        return match?.[1] || null;
      }

      case 'custom':
        this.logger.warn(
          'Cannot extract tenant ID from custom naming strategy'
        );
        return null;

      default:
        return null;
    }
  }

  /**
   * Validate tenant access to collection
   */
  validateTenantAccess(
    collection: string,
    tenantContext: TenantContext,
    config: TenantIsolationConfig,
    allowCrossTenant = false
  ): void {
    // Skip validation for cross-tenant operations if allowed
    if (
      allowCrossTenant &&
      tenantContext.permissions?.includes('cross-tenant-access')
    ) {
      return;
    }

    const extractedTenantId = this.extractTenantIdFromCollection(
      collection,
      config
    );

    // If we can't extract tenant ID, assume it's a base collection that needs transformation
    if (!extractedTenantId) {
      throw new Error(
        `Invalid collection access: Collection '${collection}' is not tenant-aware. ` +
          `Expected format for tenant '${tenantContext.tenantId}' with strategy '${config.namingStrategy}'`
      );
    }

    // Check if the extracted tenant ID matches the current tenant
    if (extractedTenantId !== tenantContext.tenantId) {
      throw new Error(
        `Tenant access denied: Collection '${collection}' belongs to tenant '${extractedTenantId}', ` +
          `but current tenant is '${tenantContext.tenantId}'`
      );
    }
  }

  /**
   * Get collection statistics for tenant
   */
  getCollectionStatsForTenant(
    allCollections: string[],
    tenantId: string,
    config: TenantIsolationConfig
  ): {
    totalCollections: number;
    tenantCollections: string[];
    baseCollections: string[];
  } {
    const tenantCollections = this.filterCollectionsByTenant(
      allCollections,
      tenantId,
      config
    );
    const baseCollections = tenantCollections.map((collection) =>
      this.extractBaseCollection(collection, tenantId, config)
    );

    return {
      totalCollections: tenantCollections.length,
      tenantCollections,
      baseCollections,
    };
  }
}
