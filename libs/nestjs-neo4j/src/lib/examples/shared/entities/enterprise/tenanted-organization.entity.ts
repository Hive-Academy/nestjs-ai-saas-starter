/**
 * @fileoverview Tenanted Organization Entity - Multi-Tenant Architecture
 *
 * This entity demonstrates:
 * - @Neo4jEntity.Tenanted with multi-tenant isolation
 * - Advanced relationship mapping with other entities
 * - Complex constraint configurations
 * - Enterprise organization hierarchy
 * - Tenant-aware security and data isolation
 *
 * Complexity Level: ENTERPRISE
 * Decorators Used: 15+ multi-tenancy and relationship decorators
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
  PropUnique,
  PropIndex,
  NotNull,
  Validate,
} from '../../../../../index';

/**
 * Tenanted Organization entity for SaaS multi-tenant architecture
 *
 * Features:
 * - ✅ Multi-tenant isolation and data segregation
 * - ✅ Hierarchical organization structure
 * - ✅ Complex relationship mapping
 * - ✅ Tenant-aware constraints and validation
 * - ✅ Enterprise subscription and billing integration
 */
@Neo4jEntity.Tenanted('TenantedOrganization', {
  description: 'Multi-tenant organization with hierarchical structure',
  tags: ['enterprise', 'multi-tenant', 'organization', 'saas'],
  constraints: {
    unique: [['subdomain'], ['taxId'], ['billingAccountId']],
    index: ['name', 'status', 'subscriptionTier', 'industry', 'parentOrganizationId'],
    key: [['tenantId']] // Tenant isolation key
  }
})
export class TenantedOrganization {
  @Id()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  name: string;

  @Neo4jProp()
  @PropUnique()
  @NotNull()
  @Validate({
    validation: {
      custom: {
        validator: (subdomain: string) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain),
        message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      }
    }
  })
  subdomain: string; // Used for tenant routing (e.g., acme.saasapp.com)

  @Neo4jProp()
  @NotNull()
  tenantId: string; // Primary tenant identifier

  @Neo4jProp()
  description?: string;

  @Neo4jProp()
  @PropIndex()
  @NotNull()
  status: 'active' | 'suspended' | 'trial' | 'cancelled' | 'pending';

  @Neo4jProp()
  @PropIndex()
  subscriptionTier: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

  @Neo4jProp()
  @PropIndex()
  industry?: string;

  @Neo4jProp()
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (count: number) => count > 0,
        message: 'Employee count must be greater than 0'
      }
    }
  })
  employeeCount?: number;

  @Neo4jProp()
  foundedYear?: number;

  @Neo4jProp()
  isPublic?: boolean;

  @Neo4jProp()
  revenue?: number;

  @Neo4jProp()
  @PropUnique()
  taxId?: string; // Tax identification number

  @Neo4jProp()
  @PropUnique()
  billingAccountId?: string; // External billing system reference

  @JsonProperty()
  contactInfo?: {
    email: string;
    phone?: string;
    website?: string;
    socialMedia?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
  };

  @JsonProperty()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    timezone?: string;
  };

  @JsonProperty()
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    vatNumber?: string;
  };

  @JsonProperty()
  subscriptionDetails?: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate?: Date;
    trialEndsAt?: Date;
    cancelledAt?: Date;
    features: string[];
    limits: {
      users: number;
      storage: number; // in GB
      apiCalls: number;
      projects?: number;
    };
  };

  @JsonProperty()
  tenantConfiguration?: {
    allowedDomains?: string[]; // Email domains allowed for this tenant
    ssoEnabled?: boolean;
    ssoProvider?: string;
    customBranding?: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      customDomain?: string;
    };
    securitySettings?: {
      enforceSSO?: boolean;
      requireMFA?: boolean;
      passwordPolicy?: {
        minLength: number;
        requireNumbers: boolean;
        requireSymbols: boolean;
        requireUppercase: boolean;
      };
      sessionTimeout?: number; // in minutes
      ipWhitelist?: string[];
    };
    featureFlags?: Record<string, boolean>;
  };

  @Neo4jProp()
  logoUrl?: string;

  @Neo4jProp()
  isActive: boolean;

  @Neo4jProp()
  onboardingCompleted: boolean;

  @Neo4jProp()
  lastActivityAt?: Date;

  @Neo4jProp()
  trialStartedAt?: Date;

  @Neo4jProp()
  trialEndedAt?: Date;

  @Neo4jProp()
  subscriptionStartedAt?: Date;

  @Neo4jProp()
  subscriptionCancelledAt?: Date;

  @Neo4jProp()
  dataRetentionDays?: number;

  @Neo4jProp()
  backupFrequency?: 'daily' | 'weekly' | 'monthly';

  @Neo4jProp()
  lastBackupAt?: Date;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProp()
  createdBy?: string; // User who created this organization

  @Neo4jProp()
  lastModifiedBy?: string;

  @Neo4jProp()
  deletedAt?: Date;

  @Neo4jProp()
  deletedBy?: string;

  // Hierarchical organization structure
  @Neo4jProp()
  @PropIndex()
  parentOrganizationId?: string; // For organization hierarchies

  @Neo4jRelationship({
    type: 'PARENT_OF',
    direction: 'OUT',
    target: () => TenantedOrganization,
    isArray: true,
    optional: true
  })
  childOrganizations?: TenantedOrganization[];

  @Neo4jRelationship({
    type: 'CHILD_OF',
    direction: 'OUT',
    target: () => TenantedOrganization,
    optional: true
  })
  parentOrganization?: TenantedOrganization;

  // Relationships to users and other entities
  @Neo4jRelationship({
    type: 'EMPLOYS',
    direction: 'OUT',
    target: () => Object, // SecureUser in real implementation
    isArray: true
  })
  employees?: any[];

  @Neo4jRelationship({
    type: 'HAS_ADMIN',
    direction: 'OUT',
    target: () => Object, // SecureUser in real implementation
    isArray: true
  })
  administrators?: any[];

  @Neo4jRelationship({
    type: 'OWNS',
    direction: 'OUT',
    target: () => Object, // AuditableProduct in real implementation
    isArray: true
  })
  products?: any[];

  @Neo4jRelationship({
    type: 'HAS_SUBSCRIPTION',
    direction: 'OUT',
    target: () => Object, // Subscription in real implementation
    optional: true
  })
  subscription?: any;

  constructor(data?: Partial<TenantedOrganization>) {
    if (data) {
      Object.assign(this, data);
    }

    // Tenant defaults
    this.isActive = this.isActive !== undefined ? this.isActive : true;
    this.onboardingCompleted = this.onboardingCompleted !== undefined ? this.onboardingCompleted : false;
    this.status = this.status || 'trial';
    this.subscriptionTier = this.subscriptionTier || 'free';
    this.dataRetentionDays = this.dataRetentionDays || 30;
    this.backupFrequency = this.backupFrequency || 'daily';

    // Generate tenant ID if not provided
    if (!this.tenantId && this.subdomain) {
      this.tenantId = `tenant_${this.subdomain}_${Date.now()}`;
    }
  }

  /**
   * Multi-tenant business logic methods
   */
  isTrialActive(): boolean {
    if (!this.trialStartedAt || this.subscriptionStartedAt) return false;
    if (this.trialEndedAt) return false;

    const trialDays = this.subscriptionDetails?.limits ?
      (this.subscriptionDetails.trialEndsAt ?
        Math.ceil((this.subscriptionDetails.trialEndsAt.getTime() - this.trialStartedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 14)
      : 14;

    const daysSinceTrial = Math.ceil((Date.now() - this.trialStartedAt.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceTrial < trialDays;
  }

  hasFeature(featureName: string): boolean {
    // Check feature flags first
    if (this.tenantConfiguration?.featureFlags?.[featureName] !== undefined) {
      return this.tenantConfiguration.featureFlags[featureName];
    }

    // Check subscription features
    if (this.subscriptionDetails?.features?.includes(featureName)) {
      return true;
    }

    // Default tier-based features
    const tierFeatures = {
      free: ['basic_analytics', 'email_support'],
      starter: ['basic_analytics', 'email_support', 'api_access', 'custom_branding'],
      professional: ['advanced_analytics', 'priority_support', 'api_access', 'custom_branding', 'sso'],
      enterprise: ['advanced_analytics', 'premium_support', 'api_access', 'custom_branding', 'sso', 'audit_logs', 'advanced_security'],
      custom: [] // Custom plans define their own features
    };

    return tierFeatures[this.subscriptionTier]?.includes(featureName) || false;
  }

  isWithinLimits(resource: 'users' | 'storage' | 'apiCalls' | 'projects', currentUsage: number): boolean {
    const limits = this.subscriptionDetails?.limits;
    if (!limits || !limits[resource]) return true;

    return currentUsage < limits[resource];
  }

  canAddUser(): boolean {
    const currentUsers = this.employees?.length || 0;
    return this.isWithinLimits('users', currentUsers);
  }

  getRemainingTrialDays(): number {
    if (!this.isTrialActive()) return 0;

    const trialEnd = this.subscriptionDetails?.trialEndsAt ||
      new Date(this.trialStartedAt!.getTime() + (14 * 24 * 60 * 60 * 1000));

    return Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  getTenantUrl(): string {
    const customDomain = this.tenantConfiguration?.customBranding?.customDomain;
    return customDomain || `https://${this.subdomain}.saasapp.com`;
  }

  needsBilling(): boolean {
    if (this.status === 'trial' && !this.isTrialActive()) return true;
    if (this.subscriptionTier === 'free') return false;

    const nextBilling = this.subscriptionDetails?.nextBillingDate;
    if (!nextBilling) return true;

    return nextBilling <= new Date();
  }

  isHierarchyRoot(): boolean {
    return !this.parentOrganizationId;
  }

  getAllChildTenantIds(): string[] {
    // In real implementation, this would traverse the hierarchy
    // For now, return just this tenant's ID
    return [this.tenantId];
  }

  getTenantConfiguration(): Record<string, any> {
    return {
      tenantId: this.tenantId,
      subdomain: this.subdomain,
      subscriptionTier: this.subscriptionTier,
      status: this.status,
      features: this.subscriptionDetails?.features || [],
      limits: this.subscriptionDetails?.limits || {},
      securitySettings: this.tenantConfiguration?.securitySettings || {},
      customBranding: this.tenantConfiguration?.customBranding || {}
    };
  }
}

/**
 * Expected Neo4j Storage Format:
 *
 * Labels: [:TenantedOrganization:Tenanted]
 *
 * Constraints:
 * - UNIQUE: subdomain, taxId, billingAccountId
 * - INDEX: name, status, subscriptionTier, industry, parentOrganizationId
 * - NODE KEY: tenantId
 *
 * {
 *   id: "uuid-generated-string",
 *   name: "Acme Corporation",
 *   subdomain: "acme",
 *   tenantId: "tenant_acme_1641024000000",
 *   status: "active",
 *   subscriptionTier: "enterprise",
 *   industry: "technology",
 *   size: "large",
 *   employeeCount: 500,
 *   taxId: "12-3456789",
 *   billingAccountId: "stripe_cus_abc123",
 *   contactInfo: "{\"email\":\"contact@acme.com\",\"phone\":\"+1234567890\",\"website\":\"https://acme.com\"}",
 *   address: "{\"street\":\"123 Main St\",\"city\":\"San Francisco\",\"state\":\"CA\",\"zipCode\":\"94105\",\"country\":\"USA\",\"timezone\":\"America/Los_Angeles\"}",
 *   subscriptionDetails: "{\"planId\":\"enterprise-yearly\",\"billingCycle\":\"yearly\",\"features\":[\"advanced_analytics\",\"premium_support\",\"sso\",\"audit_logs\"],\"limits\":{\"users\":1000,\"storage\":1000,\"apiCalls\":1000000}}",
 *   tenantConfiguration: "{\"ssoEnabled\":true,\"customBranding\":{\"logoUrl\":\"https://acme.com/logo.png\",\"primaryColor\":\"#0066cc\"},\"securitySettings\":{\"requireMFA\":true,\"sessionTimeout\":480}}",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z",
 *   subscriptionStartedAt: "2024-01-01T00:00:00.000Z"
 * }
 *
 * Multi-Tenant Features:
 * - Complete tenant isolation via tenantId
 * - Hierarchical organization support
 * - Subscription and billing integration
 * - Feature flagging per tenant
 * - Security configuration per tenant
 * - Custom branding and domain support
 * - Resource usage limits and tracking
 */
