/**
 * @fileoverview Multi-Tenant Decorators - Export Module
 *
 * This module provides comprehensive multi-tenancy support for ChromaDB operations,
 * enabling secure tenant isolation and cross-tenant administrative operations.
 */

// Core tenant-aware decorators
export {
  TenantAware,
  CrossTenant,
  TenantAwareRepository,
} from './tenant-aware.decorator';

// Tenant management utilities
export {
  TenantCollectionManager,
  TenantContextExtractor,
} from './tenant-aware.decorator';

// Multi-tenant specific services
export {
  MultiTenantChromaService,
  TenantRegistryService,
  TenantSecurityService,
} from './multi-tenant-services';

// Type definitions
export type {
  TenantContext,
  TenantIsolationConfig,
  TenantAwareOptions,
  TenantOperationResult,
} from './tenant-aware.decorator';

export type {
  MultiTenantConfig,
  TenantRegistration,
  TenantSecurityPolicy,
  TenantResourceLimits,
} from './multi-tenant-services';

// Re-export commonly used constants
export {
  TENANT_STRATEGIES,
  DEFAULT_TENANT_CONFIG,
  TENANT_SECURITY_LEVELS,
} from './tenant-constants';