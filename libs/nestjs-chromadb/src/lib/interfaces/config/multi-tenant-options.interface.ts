/**
 * Multi-tenancy focused interface following Interface Segregation Principle
 * Handles only multi-tenant configuration and security
 */

/**
 * Multi-tenant configuration
 */
export interface MultiTenantConfig {
  /**
   * Enable multi-tenancy support (default: false)
   */
  enabled?: boolean;

  /**
   * Default tenant isolation strategy
   */
  defaultStrategy?: 'prefix' | 'suffix' | 'separate' | 'metadata';

  /**
   * Tenant field separator for prefix/suffix strategies
   */
  separator?: string;

  /**
   * Security level for tenant isolation
   */
  security?: 'strict' | 'loose' | 'custom';

  /**
   * Default tenant configuration
   */
  defaults?: {
    tenant?: string;
    database?: string;
    collection?: string;
  };

  /**
   * Cross-tenant operations configuration
   */
  crossTenant?: {
    enabled?: boolean;
    requireAuth?: boolean;
    auditLog?: boolean;
    rateLimiting?: {
      requests?: number;
      window?: number;
    };
  };
}

/**
 * Decorator configuration for ChromaDB operations
 */
export interface DecoratorConfig {
  /**
   * Enable decorator functionality (default: false)
   */
  enabled?: boolean;

  /**
   * Auto-generate repository methods (default: true when enabled)
   */
  autoGenerate?: boolean;

  /**
   * Enable runtime type validation (default: true when enabled)
   */
  typeValidation?: boolean;

  /**
   * Enable automatic metadata generation (default: true when enabled)
   */
  autoMetadata?: boolean;
}

/**
 * Multi-tenancy focused interface - clients needing only multi-tenant features
 */
export interface ChromaDBMultiTenantOptions {
  /**
   * Multi-tenant support configuration
   */
  multiTenant?: MultiTenantConfig;

  /**
   * Decorator-driven development configuration
   */
  decorators?: DecoratorConfig;
}
