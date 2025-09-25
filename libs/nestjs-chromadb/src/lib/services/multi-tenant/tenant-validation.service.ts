/**
 * @fileoverview Tenant Validation Service - Handles resource limits, security policies, and access control
 */

import { Injectable, Logger } from '@nestjs/common';
import { TenantContext } from './tenant-context.service';
import {
  logUnknownError,
  getErrorMessage,
} from '../../utils/error-handling.utils';
import type { ValidationResult } from '../../types/core.interface';

// Re-export ValidationResult for use in other modules
export type { ValidationResult } from '../../types/core.interface';

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
  type:
    | 'access_control'
    | 'data_retention'
    | 'encryption'
    | 'audit'
    | 'compliance';

  /** Policy configuration */
  config: Record<string, unknown>;

  /** Applicable tenant tiers */
  applicableTiers: Array<'free' | 'pro' | 'enterprise'>;

  /** Required compliance standards */
  compliance?: string[];
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
 * Operation validation context
 */
export interface OperationValidationContext {
  readonly operation: 'read' | 'write' | 'delete' | 'admin';
  readonly resource: string;
  readonly itemCount?: number;
  readonly dataSize?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Service responsible for tenant validation, resource limits, and security policies
 */
@Injectable()
export class TenantValidationService {
  private readonly logger = new Logger(TenantValidationService.name);
  private readonly securityPolicies = new Map<string, TenantSecurityPolicy>();
  private readonly tenantRegistry = new Map<string, TenantRegistration>();

  /**
   * Validate tenant access and permissions
   */
  async validateTenantAccess(
    tenantContext: TenantContext,
    validationContext: OperationValidationContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic tenant context validation
      const contextValidation = this.validateTenantContext(tenantContext);
      errors.push(...contextValidation.errors);
      warnings.push(...contextValidation.warnings);

      // Get tenant registration
      const tenant = this.tenantRegistry.get(tenantContext.tenantId);
      if (!tenant) {
        errors.push(`Tenant ${tenantContext.tenantId} not found in registry`);
        return { isValid: false, errors, warnings };
      }

      // Validate tenant status
      const statusValidation = this.validateTenantStatus(tenant);
      errors.push(...statusValidation.errors);
      warnings.push(...statusValidation.warnings);

      // Validate resource limits
      const resourceValidation = await this.validateResourceLimits(
        tenant,
        validationContext
      );
      errors.push(...resourceValidation.errors);
      warnings.push(...resourceValidation.warnings);

      // Validate security policies
      const securityValidation = await this.validateSecurityPolicies(
        tenant,
        tenantContext,
        validationContext
      );
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Validate operation permissions
      const permissionValidation = this.validateOperationPermissions(
        tenantContext,
        validationContext
      );
      errors.push(...permissionValidation.errors);
      warnings.push(...permissionValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        details: {
          tenantId: tenantContext.tenantId,
          operation: validationContext.operation,
          resource: validationContext.resource,
          validatedAt: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      logUnknownError(
        this.logger,
        error,
        `Validation failed for tenant ${tenantContext.tenantId}`
      );
      const errorMessage = getErrorMessage(error);
      return {
        isValid: false,
        errors: [`Validation error: ${errorMessage}`],
        warnings,
      };
    }
  }

  /**
   * Validate cross-tenant access permissions
   */
  async validateCrossTenantAccess(
    tenantContext: TenantContext,
    targetTenantIds: string[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if user has cross-tenant permissions
    if (!tenantContext.permissions?.includes('cross-tenant-access')) {
      errors.push('Cross-tenant access denied: insufficient permissions');
    }

    // Check tenant tier requirements
    if (tenantContext.tier !== 'enterprise') {
      errors.push('Cross-tenant access requires enterprise tier');
    }

    // Validate target tenants exist and are accessible
    for (const targetTenantId of targetTenantIds) {
      const targetTenant = this.tenantRegistry.get(targetTenantId);
      if (!targetTenant) {
        warnings.push(`Target tenant ${targetTenantId} not found`);
        continue;
      }

      if (targetTenant.status !== 'active') {
        warnings.push(
          `Target tenant ${targetTenantId} is not active (status: ${targetTenant.status})`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        requestingTenant: tenantContext.tenantId,
        targetTenants: targetTenantIds,
        validatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Check resource limits for tenant
   */
  async checkResourceLimits(
    tenantId: string,
    operation: 'collection' | 'document' | 'storage' | 'request' | 'embedding',
    currentUsage?: Record<string, number>
  ): Promise<ValidationResult> {
    const tenant = this.tenantRegistry.get(tenantId);
    if (!tenant) {
      return {
        isValid: false,
        errors: [`Tenant ${tenantId} not found`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const limits = tenant.resourceLimits;

    // Check specific operation limits
    switch (operation) {
      case 'collection':
        if (
          currentUsage?.collections &&
          currentUsage.collections >= limits.maxCollections
        ) {
          errors.push(
            `Collection limit exceeded: ${currentUsage.collections}/${limits.maxCollections}`
          );
        }
        break;

      case 'document':
        if (
          currentUsage?.documents &&
          currentUsage.documents >= limits.maxTotalDocuments
        ) {
          errors.push(
            `Document limit exceeded: ${currentUsage.documents}/${limits.maxTotalDocuments}`
          );
        }
        break;

      case 'storage':
        if (
          currentUsage?.storageBytes &&
          currentUsage.storageBytes >= limits.maxStorageBytes
        ) {
          errors.push(
            `Storage limit exceeded: ${currentUsage.storageBytes}/${limits.maxStorageBytes} bytes`
          );
        }
        break;

      case 'request':
        if (
          currentUsage?.requestsPerMinute &&
          currentUsage.requestsPerMinute >= limits.maxRequestsPerMinute
        ) {
          errors.push(
            `Request rate limit exceeded: ${currentUsage.requestsPerMinute}/${limits.maxRequestsPerMinute} per minute`
          );
        }
        break;

      case 'embedding':
        if (
          currentUsage?.embeddingOperationsPerDay &&
          currentUsage.embeddingOperationsPerDay >=
            limits.maxEmbeddingOperationsPerDay
        ) {
          errors.push(
            `Embedding limit exceeded: ${currentUsage.embeddingOperationsPerDay}/${limits.maxEmbeddingOperationsPerDay} per day`
          );
        }
        break;
    }

    // Add warnings when approaching limits (80% threshold)
    if (currentUsage) {
      this.addUsageWarnings(limits, currentUsage, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        tenantId,
        operation,
        limits,
        currentUsage,
      },
    };
  }

  /**
   * Register tenant in validation service
   */
  registerTenant(tenant: TenantRegistration): void {
    this.tenantRegistry.set(tenant.tenantId, tenant);
    this.logger.log(`Registered tenant for validation: ${tenant.tenantId}`);
  }

  /**
   * Remove tenant from validation service
   */
  unregisterTenant(tenantId: string): void {
    this.tenantRegistry.delete(tenantId);
    this.logger.log(`Unregistered tenant from validation: ${tenantId}`);
  }

  /**
   * Add security policy
   */
  addSecurityPolicy(policy: TenantSecurityPolicy): void {
    this.securityPolicies.set(policy.policyId, policy);
    this.logger.log(`Added security policy: ${policy.policyId}`);
  }

  private validateTenantContext(context: TenantContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context.tenantId) {
      errors.push('Tenant ID is required');
    }

    if (context.tenantId && context.tenantId.length < 3) {
      errors.push('Tenant ID must be at least 3 characters long');
    }

    if (context.tenantId && !/^[a-zA-Z0-9_-]+$/.test(context.tenantId)) {
      errors.push('Tenant ID contains invalid characters');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateTenantStatus(tenant: TenantRegistration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (tenant.status !== 'active') {
      errors.push(`Tenant is not active (status: ${tenant.status})`);
    }

    // Check for expiring subscriptions or other warnings
    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - tenant.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate > 90) {
      warnings.push('Tenant has not been updated in over 90 days');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private async validateResourceLimits(
    tenant: TenantRegistration,
    context: OperationValidationContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Implement resource limit checks based on operation
    // This would typically involve querying current usage from a metrics service

    return { isValid: errors.length === 0, errors, warnings };
  }

  private async validateSecurityPolicies(
    tenant: TenantRegistration,
    tenantContext: TenantContext,
    operationContext: OperationValidationContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check each security policy applied to the tenant
    for (const policyId of tenant.securityPolicies) {
      const policy = this.securityPolicies.get(policyId);
      if (!policy) {
        warnings.push(`Security policy not found: ${policyId}`);
        continue;
      }

      // Validate policy based on type
      const policyValidation = this.validateSecurityPolicy(
        policy,
        tenantContext,
        operationContext
      );
      errors.push(...policyValidation.errors);
      warnings.push(...policyValidation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateSecurityPolicy(
    policy: TenantSecurityPolicy,
    tenantContext: TenantContext,
    operationContext: OperationValidationContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic policy validation
    if (!policy.applicableTiers.includes(tenantContext.tier || 'free')) {
      errors.push(
        `Security policy ${policy.policyId} not applicable to tier ${tenantContext.tier}`
      );
    }

    // Policy-specific validation logic would go here
    switch (policy.type) {
      case 'access_control':
        // Implement access control validation
        break;
      case 'data_retention':
        // Implement data retention validation
        break;
      case 'encryption':
        // Implement encryption validation
        break;
      case 'audit':
        // Implement audit validation
        break;
      case 'compliance':
        // Implement compliance validation
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateOperationPermissions(
    tenantContext: TenantContext,
    operationContext: OperationValidationContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check operation-specific permissions
    switch (operationContext.operation) {
      case 'admin':
        if (tenantContext.tier !== 'enterprise') {
          errors.push('Admin operations require enterprise tier');
        }
        if (!tenantContext.permissions?.includes('admin')) {
          errors.push('Admin permission required');
        }
        break;

      case 'delete':
        if (!tenantContext.permissions?.includes('delete')) {
          errors.push('Delete permission required');
        }
        break;

      case 'write':
        if (!tenantContext.permissions?.includes('write')) {
          errors.push('Write permission required');
        }
        break;

      case 'read':
        // Read is typically allowed for all authenticated users
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private addUsageWarnings(
    limits: TenantResourceLimits,
    usage: Record<string, number>,
    warnings: string[]
  ): void {
    const warningThreshold = 0.8; // 80% of limit

    if (
      usage.collections &&
      usage.collections >= limits.maxCollections * warningThreshold
    ) {
      warnings.push(
        `Approaching collection limit: ${usage.collections}/${limits.maxCollections}`
      );
    }

    if (
      usage.documents &&
      usage.documents >= limits.maxTotalDocuments * warningThreshold
    ) {
      warnings.push(
        `Approaching document limit: ${usage.documents}/${limits.maxTotalDocuments}`
      );
    }

    if (
      usage.storageBytes &&
      usage.storageBytes >= limits.maxStorageBytes * warningThreshold
    ) {
      warnings.push(
        `Approaching storage limit: ${usage.storageBytes}/${limits.maxStorageBytes} bytes`
      );
    }
  }
}
