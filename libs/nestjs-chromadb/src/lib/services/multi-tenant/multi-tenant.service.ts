/**
 * @fileoverview Multi-Tenant Service - Main coordinator for all multi-tenancy operations
 */

import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ChromaDBService } from '../chromadb.service';
import {
  TenantContextService,
  TenantContext,
  TenantIsolationConfig,
} from './tenant-context.service';
import {
  TenantIsolationService,
  TenantCollectionResult,
} from './tenant-isolation.service';
import {
  TenantValidationService,
  TenantRegistration,
  TenantResourceLimits,
} from './tenant-validation.service';
import {
  logUnknownError,
  handleUnknownError,
  getErrorMessage,
} from '../../utils/errors/error-handling.utils';

/**
 * Multi-tenant configuration interface
 */
export interface MultiTenantConfig {
  /** Global tenant isolation strategy */
  isolation: TenantIsolationConfig;

  /** Enable tenant registry */
  enableRegistry?: boolean;

  /** Enable resource limits per tenant */
  enableResourceLimits?: boolean;

  /** Enable tenant-specific caching */
  enableTenantCaching?: boolean;

  /** Enable cross-tenant administrative operations */
  enableCrossTenantAdmin?: boolean;

  /** Default resource limits */
  defaultResourceLimits?: TenantResourceLimits;

  /** Security policies to apply */
  securityPolicies?: any[];

  /** Tenant lifecycle hooks */
  lifecycleHooks?: {
    onTenantCreate?: (tenant: TenantRegistration) => Promise<void>;
    onTenantUpdate?: (tenant: TenantRegistration) => Promise<void>;
    onTenantDelete?: (tenantId: string) => Promise<void>;
  };
}

/**
 * Tenant operation options
 */
export interface TenantOperationOptions {
  /** Skip tenant validation for this operation */
  skipValidation?: boolean;

  /** Allow cross-tenant access for this operation */
  allowCrossTenant?: boolean;

  /** Custom tenant metadata for this operation */
  tenantMetadata?: Record<string, unknown>;

  /** Override default isolation config */
  isolationOverride?: Partial<TenantIsolationConfig>;
}

/**
 * Tenant operation result
 */
export interface TenantOperationResult<T = unknown> {
  readonly result: T;
  readonly tenantId: string;
  readonly operationId: string;
  readonly timestamp: Date;
  readonly collection: string;
  readonly metrics: {
    readonly duration: number;
    readonly itemCount?: number;
    readonly operationType: string;
  };
}

/**
 * Cross-tenant search result
 */
export interface CrossTenantSearchResult {
  readonly tenantId: string;
  readonly results: unknown[];
  readonly errors?: string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Main multi-tenant service that coordinates all tenant operations
 */
@Injectable()
export class MultiTenantService implements OnModuleInit {
  private readonly logger = new Logger(MultiTenantService.name);

  constructor(
    private readonly chromaService: ChromaDBService,
    private readonly _tenantContextService: TenantContextService,
    private readonly tenantIsolationService: TenantIsolationService,
    private readonly tenantValidationService: TenantValidationService,
    @Inject('MULTI_TENANT_CONFIG') private readonly config: MultiTenantConfig
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Multi-Tenant ChromaDB Service');

    if (this.config.enableRegistry) {
      this.logger.log('Multi-tenant registry enabled');
    }

    if (this.config.enableResourceLimits) {
      this.logger.log('Resource limits enabled');
    }

    if (this.config.enableTenantCaching) {
      this.logger.log('Tenant-specific caching enabled');
    }
  }

  /**
   * Execute tenant-aware operation with full isolation and validation
   */
  async executeForTenant<T>(
    tenantContext: TenantContext,
    operation: (service: ChromaDBService, collection: string) => Promise<T>,
    baseCollection: string,
    options: TenantOperationOptions = {}
  ): Promise<TenantOperationResult<T>> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      // Use override config if provided, otherwise use global config
      const isolationConfig = options.isolationOverride
        ? { ...this.config.isolation, ...options.isolationOverride }
        : this.config.isolation;

      // Validate tenant access if not skipped
      if (!options.skipValidation) {
        const validation =
          await this.tenantValidationService.validateTenantAccess(
            tenantContext,
            {
              operation: 'read', // Default operation type
              resource: baseCollection,
            }
          );

        if (!validation.isValid) {
          throw new Error(
            `Tenant validation failed: ${validation.errors.join(', ')}`
          );
        }
      }

      // Generate tenant-specific collection name
      const collectionResult =
        this.tenantIsolationService.generateTenantCollection(
          baseCollection,
          tenantContext.tenantId,
          isolationConfig
        );

      // Check resource limits if enabled
      if (this.config.enableResourceLimits && !options.skipValidation) {
        await this.checkResourceLimits(tenantContext.tenantId, baseCollection);
      }

      // Execute operation with tenant-specific collection
      const result = await operation(
        this.chromaService,
        collectionResult.tenantCollection
      );
      const duration = Date.now() - startTime;

      // Log successful operation
      this.logger.debug(
        `Tenant operation completed: ${operationId} for tenant ${tenantContext.tenantId} in ${duration}ms`
      );

      return {
        result,
        tenantId: tenantContext.tenantId,
        operationId,
        timestamp: new Date(),
        collection: collectionResult.tenantCollection,
        metrics: {
          duration,
          itemCount: Array.isArray(result) ? result.length : 1,
          operationType: operation.name || 'unknown',
        },
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      logUnknownError(
        this.logger,
        error,
        `Tenant operation failed: ${operationId} for tenant ${tenantContext.tenantId} after ${duration}ms`
      );
      throw handleUnknownError(error, `Tenant operation ${operationId}`);
    }
  }

  /**
   * Search across multiple tenant collections (admin operation)
   */
  async searchAcrossTenants(
    adminContext: TenantContext,
    query: string,
    baseCollection: string,
    tenantIds: string[],
    options: { maxResults?: number; aggregateResults?: boolean } = {}
  ): Promise<CrossTenantSearchResult[]> {
    // Validate cross-tenant access
    const crossTenantValidation =
      await this.tenantValidationService.validateCrossTenantAccess(
        adminContext,
        tenantIds
      );

    if (!crossTenantValidation.isValid) {
      throw new Error(
        `Cross-tenant access denied: ${crossTenantValidation.errors.join(', ')}`
      );
    }

    const results: CrossTenantSearchResult[] = [];
    const maxResults = options.maxResults || 10;

    // Process tenants in parallel with concurrency limit
    const concurrencyLimit = 5;
    const tenantBatches = this.chunkArray(
      tenantIds.slice(0, maxResults),
      concurrencyLimit
    );

    for (const batch of tenantBatches) {
      const batchPromises = batch.map(async (tenantId) => {
        try {
          const collectionResult =
            this.tenantIsolationService.generateTenantCollection(
              baseCollection,
              tenantId,
              this.config.isolation
            );

          const searchResults = await this.chromaService.searchDocuments(
            collectionResult.tenantCollection,
            [query],
            undefined,
            { nResults: 10 }
          );

          return {
            tenantId,
            results: searchResults.documents[0] || [],
            metadata: {
              collection: collectionResult.tenantCollection,
              searchedAt: new Date().toISOString(),
            },
          };
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          this.logger.warn(
            `Failed to search tenant ${tenantId}: ${errorMessage}`
          );
          return {
            tenantId,
            results: [],
            errors: [errorMessage],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    this.logger.log(
      `Cross-tenant search completed for ${tenantIds.length} tenants, found ${results.length} results`
    );

    return results;
  }

  /**
   * Create tenant-specific collection
   */
  async createTenantCollection(
    tenantContext: TenantContext,
    baseCollection: string,
    metadata: Record<string, unknown> = {},
    options: TenantOperationOptions = {}
  ): Promise<TenantCollectionResult> {
    // Validate tenant access
    if (!options.skipValidation) {
      const validation =
        await this.tenantValidationService.validateTenantAccess(tenantContext, {
          operation: 'write',
          resource: baseCollection,
        });

      if (!validation.isValid) {
        throw new Error(
          `Tenant validation failed: ${validation.errors.join(', ')}`
        );
      }
    }

    // Check resource limits
    if (this.config.enableResourceLimits) {
      await this.checkResourceLimits(tenantContext.tenantId, baseCollection);
    }

    // Generate tenant collection
    const collectionResult =
      this.tenantIsolationService.generateTenantCollection(
        baseCollection,
        tenantContext.tenantId,
        this.config.isolation
      );

    // Enrich metadata with tenant information
    const enrichedMetadata = {
      ...metadata,
      tenantId: tenantContext.tenantId,
      baseCollection,
      createdAt: new Date().toISOString(),
      tenantTier: tenantContext.tier,
      organizationId: tenantContext.organizationId,
    };

    // Create the collection
    await this.chromaService.createCollection(
      collectionResult.tenantCollection,
      enrichedMetadata
    );

    this.logger.log(
      `Created tenant collection: ${collectionResult.tenantCollection} for tenant ${tenantContext.tenantId}`
    );

    return collectionResult;
  }

  /**
   * Delete tenant and all associated data
   */
  async deleteTenant(
    adminContext: TenantContext,
    tenantId: string,
    options: { force?: boolean } = {}
  ): Promise<void> {
    // Validate cross-tenant access
    const validation =
      await this.tenantValidationService.validateCrossTenantAccess(
        adminContext,
        [tenantId]
      );

    if (!validation.isValid) {
      throw new Error(`Cannot delete tenant: ${validation.errors.join(', ')}`);
    }

    try {
      // Get all collections for the tenant
      const allCollections = await this.chromaService.listCollections();
      const tenantCollections =
        this.tenantIsolationService.filterCollectionsByTenant(
          allCollections,
          tenantId,
          this.config.isolation
        );

      this.logger.log(
        `Found ${tenantCollections.length} collections for tenant ${tenantId}`
      );

      // Delete all tenant collections
      const deletionResults = await Promise.allSettled(
        tenantCollections.map(async (collection) => {
          try {
            await this.chromaService.deleteCollection(collection);
            this.logger.debug(`Deleted collection: ${collection}`);
          } catch (error: unknown) {
            const errorMessage = getErrorMessage(error);
            this.logger.warn(
              `Failed to delete collection ${collection}: ${errorMessage}`
            );
            if (!options.force) {
              throw handleUnknownError(
                error,
                `Delete collection ${collection}`
              );
            }
          }
        })
      );

      // Check for failed deletions
      const failures = deletionResults.filter((r) => r.status === 'rejected');
      if (failures.length > 0 && !options.force) {
        throw new Error(`Failed to delete ${failures.length} collections`);
      }

      // Unregister tenant from validation service
      this.tenantValidationService.unregisterTenant(tenantId);

      // Execute lifecycle hook
      if (this.config.lifecycleHooks?.onTenantDelete) {
        await this.config.lifecycleHooks.onTenantDelete(tenantId);
      }

      this.logger.log(
        `Successfully deleted tenant ${tenantId} and all associated data`
      );
    } catch (error: unknown) {
      logUnknownError(
        this.logger,
        error,
        `Failed to delete tenant ${tenantId}`
      );
      throw handleUnknownError(error, `Delete tenant ${tenantId}`);
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStatistics(tenantId: string): Promise<{
    tenantId: string;
    totalCollections: number;
    collections: string[];
    baseCollections: string[];
    lastActivity?: Date;
  }> {
    try {
      const allCollections = await this.chromaService.listCollections();
      const stats = this.tenantIsolationService.getCollectionStatsForTenant(
        allCollections,
        tenantId,
        this.config.isolation
      );

      return {
        tenantId,
        totalCollections: stats.totalCollections,
        collections: stats.tenantCollections,
        baseCollections: stats.baseCollections,
        lastActivity: new Date(), // Would come from activity tracking
      };
    } catch (error: unknown) {
      logUnknownError(
        this.logger,
        error,
        `Failed to get tenant statistics for ${tenantId}`
      );
      throw handleUnknownError(error, `Get tenant statistics for ${tenantId}`);
    }
  }

  /**
   * Validate tenant collection access
   */
  validateCollectionAccess(
    collection: string,
    tenantContext: TenantContext,
    allowCrossTenant = false
  ): void {
    this.tenantIsolationService.validateTenantAccess(
      collection,
      tenantContext,
      this.config.isolation,
      allowCrossTenant
    );
  }

  private async checkResourceLimits(
    tenantId: string,
    baseCollection: string
  ): Promise<void> {
    // Get current usage (would typically query from metrics service)
    const currentUsage = {
      collections: 0, // Would be actual count
      documents: 0, // Would be actual count
      storageBytes: 0, // Would be actual usage
    };

    const validation = await this.tenantValidationService.checkResourceLimits(
      tenantId,
      'collection',
      currentUsage
    );

    if (!validation.isValid) {
      throw new Error(
        `Resource limit exceeded: ${validation.errors.join(', ')}`
      );
    }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
