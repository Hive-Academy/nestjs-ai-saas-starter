/**
 * @fileoverview Tenant Constants - Multi-Tenancy Configuration Constants
 *
 * This module provides predefined constants and configurations for multi-tenant operations,
 * including naming strategies, security levels, and default configurations.
 */

import type {
  TenantIsolationConfig,
} from './tenant-aware.decorator';
import type {
  MultiTenantConfig,
  TenantResourceLimits,
  TenantSecurityPolicy,
} from './multi-tenant-services';

/**
 * Predefined tenant naming strategies
 */
export const TENANT_STRATEGIES = {
  PREFIX: 'prefix' as const,
  SUFFIX: 'suffix' as const,
  SEPARATE: 'separate' as const,
  CUSTOM: 'custom' as const,
} as const;

/**
 * Tenant extraction strategies
 */
export const TENANT_EXTRACTION_STRATEGIES = {
  HEADER: 'header' as const,
  QUERY: 'query' as const,
  JWT: 'jwt' as const,
  CONTEXT: 'context' as const,
  CUSTOM: 'custom' as const,
} as const;

/**
 * Tenant security levels
 */
export const TENANT_SECURITY_LEVELS = {
  BASIC: {
    level: 'basic',
    description: 'Basic tenant isolation with collection prefixing',
    features: ['collection_isolation', 'basic_validation'],
    requiredTier: 'free',
  },
  STANDARD: {
    level: 'standard',
    description: 'Standard security with resource limits and audit logging',
    features: ['collection_isolation', 'resource_limits', 'audit_logging', 'encryption_at_rest'],
    requiredTier: 'pro',
  },
  ENTERPRISE: {
    level: 'enterprise',
    description: 'Enterprise-grade security with full compliance features',
    features: [
      'collection_isolation',
      'resource_limits',
      'audit_logging',
      'encryption_at_rest',
      'encryption_in_transit',
      'cross_tenant_admin',
      'data_residency',
      'compliance_reporting',
    ],
    requiredTier: 'enterprise',
  },
} as const;

/**
 * Default tenant resource limits by tier
 */
export const DEFAULT_RESOURCE_LIMITS = {
  free: {
    maxCollections: 5,
    maxDocumentsPerCollection: 1000,
    maxTotalDocuments: 5000,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    maxRequestsPerMinute: 100,
    maxConcurrentOperations: 5,
    maxEmbeddingOperationsPerDay: 1000,
  } as TenantResourceLimits,

  pro: {
    maxCollections: 50,
    maxDocumentsPerCollection: 10000,
    maxTotalDocuments: 100000,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    maxRequestsPerMinute: 1000,
    maxConcurrentOperations: 20,
    maxEmbeddingOperationsPerDay: 50000,
  } as TenantResourceLimits,

  enterprise: {
    maxCollections: 1000,
    maxDocumentsPerCollection: 1000000,
    maxTotalDocuments: 10000000,
    maxStorageBytes: 1024 * 1024 * 1024 * 1024, // 1TB
    maxRequestsPerMinute: 10000,
    maxConcurrentOperations: 100,
    maxEmbeddingOperationsPerDay: 1000000,
  } as TenantResourceLimits,
} as const;

/**
 * Predefined security policies
 */
export const PREDEFINED_SECURITY_POLICIES: Record<string, TenantSecurityPolicy> = {
  GDPR_COMPLIANCE: {
    policyId: 'gdpr-compliance',
    name: 'GDPR Compliance Policy',
    type: 'compliance',
    config: {
      dataRetentionDays: 2555, // 7 years
      rightToForgetting: true,
      dataPortability: true,
      consentRequired: true,
      dataMinimization: true,
    },
    applicableTiers: ['pro', 'enterprise'],
    compliance: ['GDPR', 'EU'],
  },

  HIPAA_COMPLIANCE: {
    policyId: 'hipaa-compliance',
    name: 'HIPAA Compliance Policy',
    type: 'compliance',
    config: {
      encryptionRequired: true,
      auditLogging: true,
      accessControls: true,
      dataRetentionDays: 2555, // 7 years
      breachNotification: true,
    },
    applicableTiers: ['enterprise'],
    compliance: ['HIPAA', 'US'],
  },

  SOC2_COMPLIANCE: {
    policyId: 'soc2-compliance',
    name: 'SOC 2 Compliance Policy',
    type: 'compliance',
    config: {
      securityMonitoring: true,
      accessControls: true,
      changeManagement: true,
      incidentResponse: true,
      vendorManagement: true,
    },
    applicableTiers: ['pro', 'enterprise'],
    compliance: ['SOC2', 'US'],
  },

  DATA_ENCRYPTION: {
    policyId: 'data-encryption',
    name: 'Data Encryption Policy',
    type: 'encryption',
    config: {
      encryptionAtRest: true,
      encryptionInTransit: true,
      keyRotation: true,
      keyRotationDays: 90,
      encryptionAlgorithm: 'AES-256',
    },
    applicableTiers: ['pro', 'enterprise'],
  },

  ACCESS_CONTROL: {
    policyId: 'access-control',
    name: 'Access Control Policy',
    type: 'access_control',
    config: {
      multiFactorAuth: true,
      sessionTimeout: 3600, // 1 hour
      maxFailedAttempts: 5,
      passwordComplexity: true,
      roleBasedAccess: true,
    },
    applicableTiers: ['pro', 'enterprise'],
  },

  AUDIT_LOGGING: {
    policyId: 'audit-logging',
    name: 'Comprehensive Audit Logging',
    type: 'audit',
    config: {
      logAllOperations: true,
      logRetentionDays: 365,
      realTimeMonitoring: true,
      alerting: true,
      exportFormats: ['json', 'csv', 'syslog'],
    },
    applicableTiers: ['pro', 'enterprise'],
  },

  DATA_RETENTION: {
    policyId: 'data-retention',
    name: 'Data Retention Policy',
    type: 'data_retention',
    config: {
      defaultRetentionDays: 2555, // 7 years
      autoDelete: true,
      retentionSchedule: 'monthly',
      backupBeforeDelete: true,
      complianceExports: true,
    },
    applicableTiers: ['free', 'pro', 'enterprise'],
  },
} as const;

/**
 * Default tenant isolation configurations
 */
export const DEFAULT_ISOLATION_CONFIGS: Record<string, TenantIsolationConfig> = {
  BASIC: {
    namingStrategy: 'prefix',
    tenantExtraction: 'header',
    strictValidation: false,
    enableTenantCaching: false,
    enableAuditLog: false,
    defaultTenant: 'default',
    allowCrossTenant: false,
  },

  STANDARD: {
    namingStrategy: 'separate',
    tenantExtraction: 'jwt',
    strictValidation: true,
    enableTenantCaching: true,
    cacheTtl: 300000, // 5 minutes
    enableAuditLog: true,
    allowCrossTenant: false,
  },

  ENTERPRISE: {
    namingStrategy: 'separate',
    tenantExtraction: 'jwt',
    strictValidation: true,
    enableTenantCaching: true,
    cacheTtl: 600000, // 10 minutes
    enableAuditLog: true,
    allowCrossTenant: true,
  },
} as const;

/**
 * Default multi-tenant configuration
 */
export const DEFAULT_TENANT_CONFIG: MultiTenantConfig = {
  isolation: DEFAULT_ISOLATION_CONFIGS.STANDARD,
  enableRegistry: true,
  enableResourceLimits: true,
  enableTenantCaching: true,
  enableCrossTenantAdmin: false,
  defaultResourceLimits: DEFAULT_RESOURCE_LIMITS.pro,
  securityPolicies: [
    PREDEFINED_SECURITY_POLICIES.DATA_ENCRYPTION,
    PREDEFINED_SECURITY_POLICIES.ACCESS_CONTROL,
    PREDEFINED_SECURITY_POLICIES.AUDIT_LOGGING,
  ],
};

/**
 * Tenant operation types for audit logging
 */
export const TENANT_OPERATION_TYPES = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  SEARCH: 'search',
  BULK_CREATE: 'bulk_create',
  BULK_UPDATE: 'bulk_update',
  BULK_DELETE: 'bulk_delete',
  COLLECTION_CREATE: 'collection_create',
  COLLECTION_DELETE: 'collection_delete',
  CROSS_TENANT_READ: 'cross_tenant_read',
  ADMIN_OPERATION: 'admin_operation',
} as const;

/**
 * Tenant status types
 */
export const TENANT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
  PENDING: 'pending',
  TRIAL: 'trial',
} as const;

/**
 * Tenant subscription tiers
 */
export const TENANT_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

/**
 * Common tenant metadata fields
 */
export const TENANT_METADATA_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  TENANT_ID: 'tenantId',
  ORGANIZATION_ID: 'organizationId',
  USER_ID: 'userId',
  OPERATION_ID: 'operationId',
  TIER: 'tier',
  REGION: 'region',
  COMPLIANCE: 'compliance',
} as const;

/**
 * Default cache TTL values (in milliseconds)
 */
export const DEFAULT_CACHE_TTL = {
  TENANT_CONTEXT: 300000, // 5 minutes
  TENANT_PERMISSIONS: 600000, // 10 minutes
  TENANT_POLICIES: 1800000, // 30 minutes
  RESOURCE_LIMITS: 900000, // 15 minutes
  COLLECTION_METADATA: 3600000, // 1 hour
} as const;

/**
 * Validation patterns for tenant identifiers
 */
export const TENANT_VALIDATION_PATTERNS = {
  TENANT_ID: /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,62}[a-zA-Z0-9]$/, // 4-64 chars, alphanumeric with hyphens/underscores
  ORGANIZATION_ID: /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,62}[a-zA-Z0-9]$/, // Same as tenant ID
  COLLECTION_NAME: /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/, // 1-64 chars, start with letter
} as const;

/**
 * Error codes for tenant operations
 */
export const TENANT_ERROR_CODES = {
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_DELETED: 'TENANT_DELETED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
  INVALID_TENANT_ID: 'INVALID_TENANT_ID',
  CROSS_TENANT_ACCESS_DENIED: 'CROSS_TENANT_ACCESS_DENIED',
  SECURITY_POLICY_VIOLATION: 'SECURITY_POLICY_VIOLATION',
  COLLECTION_LIMIT_EXCEEDED: 'COLLECTION_LIMIT_EXCEEDED',
  DOCUMENT_LIMIT_EXCEEDED: 'DOCUMENT_LIMIT_EXCEEDED',
  STORAGE_LIMIT_EXCEEDED: 'STORAGE_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * HTTP headers for tenant context
 */
export const TENANT_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  ORGANIZATION_ID: 'x-organization-id',
  USER_ID: 'x-user-id',
  TENANT_TIER: 'x-tenant-tier',
  OPERATION_ID: 'x-operation-id',
} as const;

/**
 * Export all constants as a single object for convenience
 */
export const TENANT_CONSTANTS = {
  STRATEGIES: TENANT_STRATEGIES,
  EXTRACTION_STRATEGIES: TENANT_EXTRACTION_STRATEGIES,
  SECURITY_LEVELS: TENANT_SECURITY_LEVELS,
  RESOURCE_LIMITS: DEFAULT_RESOURCE_LIMITS,
  SECURITY_POLICIES: PREDEFINED_SECURITY_POLICIES,
  ISOLATION_CONFIGS: DEFAULT_ISOLATION_CONFIGS,
  DEFAULT_CONFIG: DEFAULT_TENANT_CONFIG,
  OPERATION_TYPES: TENANT_OPERATION_TYPES,
  STATUS: TENANT_STATUS,
  TIERS: TENANT_TIERS,
  METADATA_FIELDS: TENANT_METADATA_FIELDS,
  CACHE_TTL: DEFAULT_CACHE_TTL,
  VALIDATION_PATTERNS: TENANT_VALIDATION_PATTERNS,
  ERROR_CODES: TENANT_ERROR_CODES,
  HEADERS: TENANT_HEADERS,
} as const;