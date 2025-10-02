/**
 * Tenant-focused options types following Interface Segregation Principle
 * Handles multi-tenancy configuration, isolation, and security
 */

/**
 * Tenant isolation strategy options
 */
export interface TenantIsolationOptions {
  readonly strategy?: 'prefix' | 'suffix' | 'separate' | 'metadata';
  readonly separator?: string;
  readonly security?: 'strict' | 'loose' | 'custom';
}

/**
 * Cross-tenant operation options
 */
export interface CrossTenantOptions {
  readonly enabled?: boolean;
  readonly requireAuth?: boolean;
  readonly auditLog?: boolean;
  readonly rateLimiting?: {
    readonly requests?: number;
    readonly window?: number;
  };
}

/**
 * Tenant defaults configuration
 */
export interface TenantDefaultsOptions {
  readonly tenant?: string;
  readonly database?: string;
  readonly collection?: string;
}

/**
 * Multi-tenant security options
 */
export interface MultiTenantSecurityOptions {
  readonly enableTenantValidation?: boolean;
  readonly requireTenantHeader?: boolean;
  readonly tenantHeaderName?: string;
  readonly allowedTenants?: readonly string[];
  readonly forbiddenTenants?: readonly string[];
}

/**
 * Tenant context options for operations
 */
export interface TenantContextOptions {
  readonly tenantId?: string;
  readonly isolationLevel?: 'strict' | 'moderate' | 'loose';
  readonly inheritFromParent?: boolean;
  readonly overrideDefaults?: boolean;
}
