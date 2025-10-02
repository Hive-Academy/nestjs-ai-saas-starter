/**
 * @fileoverview Multi-Tenant Services - Export Module
 */

export { TenantContextService } from './tenant-context.service';
export type {
  TenantContext,
  TenantIsolationConfig,
  TenantExtractionResult,
} from './tenant-context.service';

export { TenantIsolationService } from './tenant-isolation.service';
export type {
  TenantCollectionResult,
  TenantCollectionValidation,
} from './tenant-isolation.service';

export { TenantValidationService } from './tenant-validation.service';
export type {
  TenantResourceLimits,
  TenantSecurityPolicy,
  TenantRegistration,
  OperationValidationContext,
} from './tenant-validation.service';

export { MultiTenantService } from './multi-tenant.service';
export type {
  MultiTenantConfig,
  TenantOperationOptions,
  TenantOperationResult,
  CrossTenantSearchResult,
} from './multi-tenant.service';
