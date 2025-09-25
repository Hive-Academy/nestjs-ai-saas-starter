/**
 * @fileoverview Tenant Type Guards - Type-safe utilities for tenant operations
 */

import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';
import type { BaseDocument } from '../../types/core.interface';
import {
  isValidCollectionName,
  isDocumentArray,
} from '../../types/core.interface';

// Re-export for use in other modules
export {
  isValidCollectionName,
  isDocumentArray,
} from '../../types/core.interface';

/**
 * Type guard for checking if value is a valid tenant context
 */
export function isTenantContext(value: unknown): value is TenantContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).tenantId === 'string' &&
    (value as any).tenantId.length > 0
  );
}

/**
 * Type guard for checking if tenant context has required fields
 */
export function isCompleteTenantContext(
  value: unknown
): value is Required<TenantContext> {
  if (!isTenantContext(value)) {
    return false;
  }

  return !!(
    value.tenantId &&
    value.organizationId &&
    value.userId &&
    value.permissions &&
    value.tier &&
    value.region
  );
}

/**
 * Type guard for checking if value is a valid tenant isolation config
 */
export function isTenantIsolationConfig(
  value: unknown
): value is TenantIsolationConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as any;

  return (
    typeof config.namingStrategy === 'string' &&
    ['prefix', 'suffix', 'separate', 'custom'].includes(
      config.namingStrategy
    ) &&
    typeof config.tenantExtraction === 'string' &&
    ['header', 'query', 'jwt', 'context', 'custom'].includes(
      config.tenantExtraction
    )
  );
}

/**
 * Type guard for checking if string is a valid tenant ID
 */
export function isValidTenantId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 64 &&
    /^[a-zA-Z0-9_-]+$/.test(value) &&
    !value.startsWith('-') &&
    !value.endsWith('-')
  );
}

/**
 * Type guard for checking if collection belongs to a specific tenant
 */
export function isTenantCollection(
  collection: string,
  tenantId: string,
  config: TenantIsolationConfig
): boolean {
  if (!isValidCollectionName(collection) || !isValidTenantId(tenantId)) {
    return false;
  }

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
      // For custom naming, we'd need to implement reverse logic
      // This is a simplified check
      return collection.includes(tenantId);

    default:
      return false;
  }
}

/**
 * Type guard for checking if document has tenant metadata
 */
export function hasTenantMetadata(
  document: unknown
): document is BaseDocument & {
  metadata: { tenantId: string; [key: string]: unknown };
} {
  if (typeof document !== 'object' || document === null) {
    return false;
  }

  const doc = document as any;
  return (
    typeof doc.metadata === 'object' &&
    doc.metadata !== null &&
    typeof doc.metadata.tenantId === 'string' &&
    doc.metadata.tenantId.length > 0
  );
}

/**
 * Type guard for checking if document belongs to specific tenant
 */
export function isDocumentOwnedByTenant(
  document: unknown,
  tenantId: string
): document is BaseDocument & {
  metadata: { tenantId: string; [key: string]: unknown };
} {
  return hasTenantMetadata(document) && document.metadata.tenantId === tenantId;
}

/**
 * Type guard for checking if user has required permissions
 */
export function hasRequiredPermissions(
  context: TenantContext,
  requiredPermissions: string[]
): boolean {
  if (!context.permissions || !Array.isArray(context.permissions)) {
    return false;
  }

  return requiredPermissions.every((permission) =>
    context.permissions!.includes(permission)
  );
}

/**
 * Type guard for checking if tenant has admin permissions
 */
export function isAdminTenant(context: TenantContext): boolean {
  return (
    hasRequiredPermissions(context, ['admin']) || context.tier === 'enterprise'
  );
}

/**
 * Type guard for checking if tenant can perform cross-tenant operations
 */
export function canPerformCrossTenantOperations(
  context: TenantContext
): boolean {
  return (
    context.tier === 'enterprise' &&
    hasRequiredPermissions(context, ['cross-tenant-access'])
  );
}

/**
 * Type guard for checking if value is tenant operation options
 */
export function isTenantOperationOptions(value: unknown): value is {
  skipValidation?: boolean;
  allowCrossTenant?: boolean;
  tenantMetadata?: Record<string, unknown>;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const options = value as any;
  return (
    (options.skipValidation === undefined ||
      typeof options.skipValidation === 'boolean') &&
    (options.allowCrossTenant === undefined ||
      typeof options.allowCrossTenant === 'boolean') &&
    (options.tenantMetadata === undefined ||
      typeof options.tenantMetadata === 'object')
  );
}

/**
 * Type guard for checking if error is a tenant-related error
 */
export function isTenantError(error: unknown): error is Error & {
  tenantId?: string;
  operationType?: string;
} {
  return (
    error instanceof Error &&
    (error.message.includes('tenant') ||
      error.message.includes('Tenant') ||
      error.name.includes('Tenant'))
  );
}

/**
 * Type assertion utilities with proper error messages
 */
export class TenantTypeAssertions {
  /**
   * Assert that value is a valid tenant context
   */
  static assertTenantContext(
    value: unknown,
    errorMessage?: string
  ): asserts value is TenantContext {
    if (!isTenantContext(value)) {
      throw new TypeError(errorMessage || 'Expected valid tenant context');
    }
  }

  /**
   * Assert that value is a valid tenant ID
   */
  static assertValidTenantId(
    value: unknown,
    errorMessage?: string
  ): asserts value is string {
    if (!isValidTenantId(value)) {
      throw new TypeError(errorMessage || 'Expected valid tenant ID');
    }
  }

  /**
   * Assert that value is a valid collection name
   */
  static assertValidCollectionName(
    value: unknown,
    errorMessage?: string
  ): asserts value is string {
    if (!isValidCollectionName(value)) {
      throw new TypeError(errorMessage || 'Expected valid collection name');
    }
  }

  /**
   * Assert that document belongs to tenant
   */
  static assertDocumentOwnership(
    document: unknown,
    tenantId: string,
    errorMessage?: string
  ): asserts document is BaseDocument & { metadata: { tenantId: string } } {
    if (!isDocumentOwnedByTenant(document, tenantId)) {
      throw new Error(
        errorMessage || `Document does not belong to tenant ${tenantId}`
      );
    }
  }

  /**
   * Assert that tenant has required permissions
   */
  static assertTenantPermissions(
    context: TenantContext,
    requiredPermissions: string[],
    errorMessage?: string
  ): void {
    if (!hasRequiredPermissions(context, requiredPermissions)) {
      throw new Error(
        errorMessage ||
          `Tenant ${
            context.tenantId
          } lacks required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }

  /**
   * Assert that tenant can perform cross-tenant operations
   */
  static assertCrossTenantAccess(
    context: TenantContext,
    errorMessage?: string
  ): void {
    if (!canPerformCrossTenantOperations(context)) {
      throw new Error(
        errorMessage ||
          `Tenant ${context.tenantId} cannot perform cross-tenant operations`
      );
    }
  }
}

/**
 * Utility functions for working with tenant types safely
 */
export class TenantTypeUtils {
  /**
   * Safely extract tenant ID from unknown value
   */
  static extractTenantId(value: unknown): string | null {
    if (isTenantContext(value)) {
      return value.tenantId;
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as any;
      if (typeof obj.tenantId === 'string') {
        return obj.tenantId;
      }
    }

    if (typeof value === 'string' && isValidTenantId(value)) {
      return value;
    }

    return null;
  }

  /**
   * Safely extract collection name from arguments
   */
  static extractCollectionName(args: unknown[]): string | null {
    for (const arg of args) {
      if (isValidCollectionName(arg)) {
        return arg;
      }
    }
    return null;
  }

  /**
   * Safely extract documents from arguments
   */
  static extractDocuments(args: unknown[]): BaseDocument[] | null {
    for (const arg of args) {
      if (isDocumentArray(arg)) {
        return arg;
      }
    }
    return null;
  }

  /**
   * Create a type-safe tenant context from partial data
   */
  static createTenantContext(data: {
    tenantId: string;
    organizationId?: string;
    userId?: string;
    permissions?: string[];
    metadata?: Record<string, unknown>;
    tier?: 'free' | 'pro' | 'enterprise';
    region?: string;
  }): TenantContext {
    TenantTypeAssertions.assertValidTenantId(data.tenantId);

    return {
      tenantId: data.tenantId,
      organizationId: data.organizationId,
      userId: data.userId,
      permissions: data.permissions,
      metadata: data.metadata,
      tier: data.tier,
      region: data.region,
    };
  }

  /**
   * Validate and normalize tenant isolation config
   */
  static normalizeIsolationConfig(config: unknown): TenantIsolationConfig {
    if (!isTenantIsolationConfig(config)) {
      throw new TypeError('Invalid tenant isolation configuration');
    }

    return {
      namingStrategy: config.namingStrategy,
      customNaming: config.customNaming,
      tenantExtraction: config.tenantExtraction,
      customExtraction: config.customExtraction,
      strictValidation: config.strictValidation ?? true,
      enableTenantCaching: config.enableTenantCaching ?? false,
      cacheTtl: config.cacheTtl ?? 300000,
      enableAuditLog: config.enableAuditLog ?? true,
      defaultTenant: config.defaultTenant,
      allowCrossTenant: config.allowCrossTenant ?? false,
    };
  }

  /**
   * Check if two tenant contexts are for the same tenant
   */
  static isSameTenant(
    context1: TenantContext,
    context2: TenantContext
  ): boolean {
    return context1.tenantId === context2.tenantId;
  }

  /**
   * Check if tenant context is complete for enterprise operations
   */
  static isEnterpriseReady(context: TenantContext): boolean {
    return (
      context.tier === 'enterprise' &&
      !!context.organizationId &&
      !!context.userId &&
      Array.isArray(context.permissions) &&
      context.permissions.length > 0
    );
  }
}
