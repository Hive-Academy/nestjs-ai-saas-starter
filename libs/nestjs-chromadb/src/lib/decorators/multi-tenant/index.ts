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

export type {
  TenantAwareOptions,
  TenantOperationResult,
} from './tenant-aware.decorator';

// Services (from services/multi-tenant/)
export type {
  TenantContext,
  TenantIsolationConfig,
  TenantExtractionResult,
} from '../../services/multi-tenant/tenant-context.service';

export { TenantContextService } from '../../services/multi-tenant/tenant-context.service';

export type {
  TenantCollectionResult,
  TenantCollectionValidation,
} from '../../services/multi-tenant/tenant-isolation.service';

export { TenantIsolationService } from '../../services/multi-tenant/tenant-isolation.service';

export type {
  TenantResourceLimits,
  TenantSecurityPolicy,
  TenantRegistration,
  ValidationResult,
  OperationValidationContext,
} from '../../services/multi-tenant/tenant-validation.service';

export { TenantValidationService } from '../../services/multi-tenant/tenant-validation.service';

export type {
  MultiTenantConfig,
  TenantOperationOptions,
  TenantOperationResult as ServiceTenantOperationResult,
  CrossTenantSearchResult,
} from '../../services/multi-tenant/multi-tenant.service';

export { MultiTenantService } from '../../services/multi-tenant/multi-tenant.service';

// Decorator utilities
export {
  TenantExtractor,
  TenantExtractionError,
  HeaderExtractionStrategy,
  QueryExtractionStrategy,
  JWTExtractionStrategy,
  ContextExtractionStrategy,
  CustomExtractionStrategy,
} from './tenant-extraction';

export type {
  TenantExtractionResult as DecoratorExtractionResult,
  TenantExtractionStrategy,
} from './tenant-extraction';

export {
  TenantValidator,
  TenantValidationError,
  TenantIdFormatRule,
  TenantTierRule,
  TenantPermissionsRule,
  TenantMetadataRule,
  ConfigurationValidationRule,
} from './tenant-validation';

export type {
  TenantValidationRule,
  ValidationRuleResult,
  CrossTenantValidationContext,
} from './tenant-validation';

export {
  TenantArgumentTransformer,
  TenantTransformationError,
  CollectionNameTransformer,
  OptionsObjectTransformer,
  DocumentArrayTransformer,
  QueryParametersTransformer,
} from './tenant-transformation';

export type {
  ArgumentTransformationResult,
  TransformationResult,
  ArgumentTransformer,
} from './tenant-transformation';

// Type guards and utilities
export {
  isTenantContext,
  isCompleteTenantContext,
  isTenantIsolationConfig,
  isValidTenantId,
  isValidCollectionName,
  isTenantCollection,
  hasTenantMetadata,
  isDocumentOwnedByTenant,
  hasRequiredPermissions,
  isAdminTenant,
  canPerformCrossTenantOperations,
  isDocumentArray,
  isTenantOperationOptions,
  isTenantError,
  TenantTypeAssertions,
  TenantTypeUtils,
} from './tenant-type-guards';

// Re-export commonly used constants
export {
  TENANT_STRATEGIES,
  DEFAULT_TENANT_CONFIG,
  TENANT_SECURITY_LEVELS,
} from './tenant-constants';

// Usage examples - concrete implementation classes
export {
  UserManagementService,
  DocumentManagementService,
  AdminService,
  UserRepository,
  UserController,
  BASIC_TENANT_CONFIG,
  ENTERPRISE_TENANT_CONFIG,
  CUSTOM_TENANT_CONFIG,
} from './examples/multi-tenant-usage-example';

// Type exports for examples
export type {
  UserDocument,
  DocumentMetadata,
} from './examples/multi-tenant-usage-example';
