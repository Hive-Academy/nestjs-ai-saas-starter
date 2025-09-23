/**
 * @fileoverview Multi-Tenant Services - Advanced Multi-Tenancy Management
 *
 * This module provides comprehensive multi-tenancy services for ChromaDB operations,
 * including tenant registry, security policies, and resource management.
 */

import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ChromaDBService } from '../../services/chromadb.service';
import { ChromaCacheService } from '../../services/chroma-cache.service';
import { BaseDocument } from '../../types/document-types.interface';
import { CollectionName } from '../../types/collection-names.type';
import {
  TenantContext,
  TenantIsolationConfig,
  TenantCollectionManager,
} from './tenant-aware.decorator';

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
  
  /** Security policies */
  securityPolicies?: TenantSecurityPolicy[];
  
  /** Tenant lifecycle hooks */
  lifecycleHooks?: {
    onTenantCreate?: (tenant: TenantRegistration) => Promise<void>;
    onTenantUpdate?: (tenant: TenantRegistration) => Promise<void>;
    onTenantDelete?: (tenantId: string) => Promise<void>;
  };
}

/**
 * Tenant registration information
 */
export interface TenantRegistration {
  /** Unique tenant identifier */
  tenantId: string;
  
  /** Tenant display name */
  name: string;
  
  /** Organization identifier */
  organizationId?: string;
  
  /** Tenant status */
  status: 'active' | 'suspended' | 'deleted';
  
  /** Subscription tier */
  tier: 'free' | 'pro' | 'enterprise';
  
  /** Resource limits for this tenant */
  resourceLimits: TenantResourceLimits;
  
  /** Security policies for this tenant */
  securityPolicies: string[];
  
  /** Tenant metadata */
  metadata: Record<string, unknown>;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last updated timestamp */
  updatedAt: Date;
  
  /** Collections owned by this tenant */
  collections: string[];
  
  /** Data residency requirements */
  dataResidency?: {
    region: string;
    compliance: string[];
  };
}

/**
 * Tenant resource limits
 */
export interface TenantResourceLimits {
  /** Maximum number of collections */
  maxCollections: number;
  
  /** Maximum documents per collection */
  maxDocumentsPerCollection: number;
  
  /** Maximum total documents across all collections */
  maxTotalDocuments: number;
  
  /** Maximum storage size in bytes */
  maxStorageBytes: number;
  
  /** Maximum API requests per minute */
  maxRequestsPerMinute: number;
  
  /** Maximum concurrent operations */
  maxConcurrentOperations: number;
  
  /** Maximum embedding operations per day */
  maxEmbeddingOperationsPerDay: number;
  
  /** Custom limits */
  customLimits?: Record<string, number>;
}

/**
 * Tenant security policy
 */
export interface TenantSecurityPolicy {
  /** Policy identifier */
  policyId: string;
  
  /** Policy name */
  name: string;
  
  /** Policy type */
  type: 'access_control' | 'data_retention' | 'encryption' | 'audit' | 'compliance';
  
  /** Policy configuration */
  config: Record<string, unknown>;
  
  /** Applicable tenant tiers */
  applicableTiers: Array<'free' | 'pro' | 'enterprise'>;
  
  /** Required compliance standards */
  compliance?: string[];
}

/**
 * Tenant operation metrics
 */
export interface TenantOperationMetrics {
  tenantId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalOperations: number;
    totalDocuments: number;
    totalCollections: number;
    storageUsed: number;
    embeddingOperations: number;
    avgOperationTime: number;
    errorRate: number;
  };
}

/**
 * Multi-tenant ChromaDB service with tenant isolation and management
 */
@Injectable()
export class MultiTenantChromaService implements OnModuleInit {
  private readonly logger = new Logger(MultiTenantChromaService.name);
  private readonly tenantCaches = new Map<string, ChromaCacheService>();

  constructor(
    private readonly chromaService: ChromaDBService,
    private readonly tenantRegistry: TenantRegistryService,
    private readonly tenantSecurity: TenantSecurityService,
    @Inject('MULTI_TENANT_CONFIG') private readonly config: MultiTenantConfig
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Multi-Tenant ChromaDB Service');
    
    if (this.config.enableRegistry) {
      await this.tenantRegistry.initialize();
    }
    
    if (this.config.enableTenantCaching) {
      await this.initializeTenantCaches();
    }
  }

  /**
   * Execute tenant-aware operation with full isolation
   */
  async executeForTenant<T>(
    tenantContext: TenantContext,
    operation: (service: ChromaDBService, collection: string) => Promise<T>,
    baseCollection: string,
    options?: { skipValidation?: boolean; allowCrossTenant?: boolean }
  ): Promise<T> {
    try {
      // Validate tenant access
      if (!options?.skipValidation) {
        await this.validateTenantAccess(tenantContext);
      }

      // Get tenant-specific collection name
      const tenantCollection = TenantCollectionManager.generateTenantCollection(
        baseCollection,
        tenantContext.tenantId,
        this.config.isolation
      );

      // Check resource limits
      await this.checkResourceLimits(tenantContext.tenantId);

      // Apply security policies
      await this.tenantSecurity.validateOperation(tenantContext, 'read', baseCollection);

      // Execute operation with tenant-specific service
      const tenantService = await this.getTenantService(tenantContext.tenantId);
      const result = await operation(tenantService, tenantCollection);

      // Record operation metrics
      await this.recordOperationMetrics(tenantContext.tenantId, 'success');

      return result;

    } catch (error) {
      await this.recordOperationMetrics(tenantContext.tenantId, 'error');
      this.logger.error(
        `Tenant operation failed for ${tenantContext.tenantId}: ${error.message}`,
        error.stack
      );
      throw error;
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
    options?: { maxResults?: number; aggregateResults?: boolean }
  ): Promise<Array<{ tenantId: string; results: unknown[] }>> {
    // Validate admin permissions
    await this.tenantSecurity.validateCrossTenantAccess(adminContext);

    const results: Array<{ tenantId: string; results: unknown[] }> = [];
    const maxResults = options?.maxResults || 10;

    for (const tenantId of tenantIds.slice(0, maxResults)) {
      try {
        const tenantCollection = TenantCollectionManager.generateTenantCollection(
          baseCollection,
          tenantId,
          this.config.isolation
        );

        const tenantResults = await this.chromaService.searchDocuments(
          tenantCollection,
          [query],
          undefined,
          { nResults: 10 }
        );

        results.push({
          tenantId,
          results: tenantResults.documents[0] || [],
        });

      } catch (error) {
        this.logger.warn(`Failed to search tenant ${tenantId}: ${error.message}`);
        // Continue with other tenants
      }
    }

    return results;
  }

  /**
   * Create tenant-specific collection
   */
  async createTenantCollection(
    tenantContext: TenantContext,
    baseCollection: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.validateTenantAccess(tenantContext);
    await this.checkResourceLimits(tenantContext.tenantId);

    const tenantCollection = TenantCollectionManager.generateTenantCollection(
      baseCollection,
      tenantContext.tenantId,
      this.config.isolation
    );

    const enrichedMetadata = {
      ...metadata,
      tenantId: tenantContext.tenantId,
      baseCollection,
      createdAt: new Date().toISOString(),
      tenantTier: tenantContext.tier,
    };

    await this.chromaService.createCollection(tenantCollection, enrichedMetadata);

    // Update tenant registry
    if (this.config.enableRegistry) {
      await this.tenantRegistry.addCollectionToTenant(tenantContext.tenantId, tenantCollection);
    }
  }

  /**
   * Delete tenant and all associated data
   */
  async deleteTenant(adminContext: TenantContext, tenantId: string): Promise<void> {
    await this.tenantSecurity.validateCrossTenantAccess(adminContext);

    try {
      // Get all tenant collections
      const tenant = await this.tenantRegistry.getTenant(tenantId);
      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      // Delete all tenant collections
      for (const collection of tenant.collections) {
        try {
          await this.chromaService.deleteCollection(collection);
        } catch (error) {
          this.logger.warn(`Failed to delete collection ${collection}: ${error.message}`);
        }
      }

      // Clear tenant cache
      if (this.tenantCaches.has(tenantId)) {
        this.tenantCaches.delete(tenantId);
      }

      // Remove from registry
      await this.tenantRegistry.deleteTenant(tenantId);

      // Execute lifecycle hook
      if (this.config.lifecycleHooks?.onTenantDelete) {
        await this.config.lifecycleHooks.onTenantDelete(tenantId);
      }

      this.logger.log(`Successfully deleted tenant ${tenantId} and all associated data`);

    } catch (error) {
      this.logger.error(`Failed to delete tenant ${tenantId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tenant operation metrics
   */
  async getTenantMetrics(
    tenantId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<TenantOperationMetrics> {
    const tenant = await this.tenantRegistry.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // This would typically query a metrics database
    // For now, return mock metrics
    return {
      tenantId,
      timeRange,
      metrics: {
        totalOperations: 0,
        totalDocuments: 0,
        totalCollections: tenant.collections.length,
        storageUsed: 0,
        embeddingOperations: 0,
        avgOperationTime: 0,
        errorRate: 0,
      },
    };
  }

  private async initializeTenantCaches(): Promise<void> {
    // Initialize tenant-specific caches if needed
    this.logger.debug('Initializing tenant-specific caches');
  }

  private async getTenantService(tenantId: string): Promise<ChromaDBService> {
    // For now, return the base service
    // In a more advanced implementation, this could return tenant-specific service instances
    return this.chromaService;
  }

  private async validateTenantAccess(tenantContext: TenantContext): Promise<void> {
    if (!this.config.enableRegistry) {
      return; // Skip validation if registry is disabled
    }

    const tenant = await this.tenantRegistry.getTenant(tenantContext.tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantContext.tenantId} not found`);
    }

    if (tenant.status !== 'active') {
      throw new Error(`Tenant ${tenantContext.tenantId} is not active (status: ${tenant.status})`);
    }
  }

  private async checkResourceLimits(tenantId: string): Promise<void> {
    if (!this.config.enableResourceLimits) {
      return;
    }

    const tenant = await this.tenantRegistry.getTenant(tenantId);
    if (!tenant) {
      return; // Skip if tenant not found in registry
    }

    // Check collection limits
    if (tenant.collections.length >= tenant.resourceLimits.maxCollections) {
      throw new Error(`Tenant ${tenantId} has reached maximum collection limit`);
    }

    // Additional resource limit checks would go here
  }

  private async recordOperationMetrics(tenantId: string, result: 'success' | 'error'): Promise<void> {
    // Record operation metrics for monitoring and billing
    // This would typically update a metrics database
    this.logger.debug(`Recording operation metric for tenant ${tenantId}: ${result}`);
  }
}

/**
 * Tenant registry service for managing tenant registration and metadata
 */
@Injectable()
export class TenantRegistryService {
  private readonly logger = new Logger(TenantRegistryService.name);
  private readonly tenants = new Map<string, TenantRegistration>();

  async initialize(): Promise<void> {
    this.logger.log('Initializing Tenant Registry Service');
    // Load existing tenants from persistent storage
    await this.loadTenants();
  }

  /**
   * Register a new tenant
   */
  async registerTenant(registration: Omit<TenantRegistration, 'createdAt' | 'updatedAt' | 'collections'>): Promise<TenantRegistration> {
    const tenant: TenantRegistration = {
      ...registration,
      collections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenant.tenantId, tenant);
    await this.persistTenant(tenant);

    this.logger.log(`Registered new tenant: ${tenant.tenantId}`);
    return tenant;
  }

  /**
   * Get tenant information
   */
  async getTenant(tenantId: string): Promise<TenantRegistration | null> {
    return this.tenants.get(tenantId) || null;
  }

  /**
   * Update tenant information
   */
  async updateTenant(tenantId: string, updates: Partial<TenantRegistration>): Promise<TenantRegistration> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updatedTenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);
    await this.persistTenant(updatedTenant);

    this.logger.log(`Updated tenant: ${tenantId}`);
    return updatedTenant;
  }

  /**
   * Delete tenant from registry
   */
  async deleteTenant(tenantId: string): Promise<void> {
    if (!this.tenants.has(tenantId)) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    this.tenants.delete(tenantId);
    await this.removeTenantFromStorage(tenantId);

    this.logger.log(`Deleted tenant from registry: ${tenantId}`);
  }

  /**
   * Add collection to tenant
   */
  async addCollectionToTenant(tenantId: string, collection: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    if (!tenant.collections.includes(collection)) {
      tenant.collections.push(collection);
      tenant.updatedAt = new Date();
      await this.persistTenant(tenant);
    }
  }

  /**
   * Remove collection from tenant
   */
  async removeCollectionFromTenant(tenantId: string, collection: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return; // Tenant not found, nothing to remove
    }

    const index = tenant.collections.indexOf(collection);
    if (index !== -1) {
      tenant.collections.splice(index, 1);
      tenant.updatedAt = new Date();
      await this.persistTenant(tenant);
    }
  }

  /**
   * List all tenants
   */
  async listTenants(filter?: { status?: string; tier?: string }): Promise<TenantRegistration[]> {
    let tenants = Array.from(this.tenants.values());

    if (filter?.status) {
      tenants = tenants.filter(tenant => tenant.status === filter.status);
    }

    if (filter?.tier) {
      tenants = tenants.filter(tenant => tenant.tier === filter.tier);
    }

    return tenants;
  }

  private async loadTenants(): Promise<void> {
    // In a real implementation, this would load from a database
    // For now, we'll start with an empty registry
    this.logger.debug('Loading tenants from persistent storage');
  }

  private async persistTenant(tenant: TenantRegistration): Promise<void> {
    // In a real implementation, this would save to a database
    this.logger.debug(`Persisting tenant: ${tenant.tenantId}`);
  }

  private async removeTenantFromStorage(tenantId: string): Promise<void> {
    // In a real implementation, this would remove from a database
    this.logger.debug(`Removing tenant from storage: ${tenantId}`);
  }
}

/**
 * Tenant security service for managing security policies and access control
 */
@Injectable()
export class TenantSecurityService {
  private readonly logger = new Logger(TenantSecurityService.name);
  private readonly securityPolicies = new Map<string, TenantSecurityPolicy>();

  /**
   * Validate operation against tenant security policies
   */
  async validateOperation(
    tenantContext: TenantContext,
    operation: 'read' | 'write' | 'delete' | 'admin',
    resource: string
  ): Promise<void> {
    // Basic validation - can be extended with sophisticated policy engine
    if (!tenantContext.tenantId) {
      throw new Error('Invalid tenant context');
    }

    // Check operation permissions based on tenant tier
    if (operation === 'admin' && tenantContext.tier !== 'enterprise') {
      throw new Error('Admin operations require enterprise tier');
    }

    this.logger.debug(`Validated ${operation} operation for tenant ${tenantContext.tenantId}`);
  }

  /**
   * Validate cross-tenant access permissions
   */
  async validateCrossTenantAccess(context: TenantContext): Promise<void> {
    if (!context.permissions?.includes('cross-tenant-access')) {
      throw new Error('Cross-tenant access denied: insufficient permissions');
    }

    if (context.tier !== 'enterprise') {
      throw new Error('Cross-tenant access requires enterprise tier');
    }

    this.logger.debug(`Validated cross-tenant access for ${context.tenantId}`);
  }

  /**
   * Add security policy
   */
  async addSecurityPolicy(policy: TenantSecurityPolicy): Promise<void> {
    this.securityPolicies.set(policy.policyId, policy);
    this.logger.log(`Added security policy: ${policy.policyId}`);
  }

  /**
   * Apply security policies to tenant
   */
  async applySecurityPolicies(tenantId: string, policyIds: string[]): Promise<void> {
    for (const policyId of policyIds) {
      const policy = this.securityPolicies.get(policyId);
      if (!policy) {
        this.logger.warn(`Security policy not found: ${policyId}`);
        continue;
      }

      // Apply policy logic based on policy type
      await this.applySecurityPolicy(tenantId, policy);
    }
  }

  private async applySecurityPolicy(tenantId: string, policy: TenantSecurityPolicy): Promise<void> {
    this.logger.debug(`Applying security policy ${policy.policyId} to tenant ${tenantId}`);
    
    switch (policy.type) {
      case 'access_control':
        // Implement access control policy
        break;
      case 'data_retention':
        // Implement data retention policy
        break;
      case 'encryption':
        // Implement encryption policy
        break;
      case 'audit':
        // Implement audit policy
        break;
      case 'compliance':
        // Implement compliance policy
        break;
      default:
        this.logger.warn(`Unknown policy type: ${policy.type}`);
    }
  }
}