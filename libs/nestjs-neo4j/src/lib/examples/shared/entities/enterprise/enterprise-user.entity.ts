/**
 * @fileoverview Enterprise User Entity - Full Feature Showcase
 *
 * This entity demonstrates:
 * - Complete security decorator stack
 * - Multi-tenancy support with automatic isolation
 * - Audit logging for compliance
 * - Data encryption for sensitive fields
 * - Rate limiting for API protection
 * - Complex constraint combinations
 * - Production-ready patterns
 *
 * Complexity Level: ENTERPRISE
 * Decorators Used: 15+ decorators (full feature stack)
 *
 * Use Cases: Healthcare, Finance, Government, Enterprise SaaS
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  Unique,
  PropIndex,
  NotNull,
  Validate,
  Authorize,
  ValidateInput,
  AuditLog,
  RateLimit,
  EncryptSensitive,
  JsonProperty
} from '../../../../../index';

// Forward declare related entities
declare class Organization {
  id: string;
  name: string;
}

declare class Permission {
  id: string;
  name: string;
  resource: string;
}

declare class AuditEvent {
  id: string;
  action: string;
  timestamp: Date;
}

/**
 * Enterprise-grade User entity with complete security and compliance features
 *
 * Features:
 * - ✅ Multi-tenant isolation with automatic tenant filtering
 * - ✅ Role-based access control with fine-grained permissions
 * - ✅ Comprehensive audit logging for compliance (SOX, HIPAA, GDPR)
 * - ✅ Field-level data encryption for PII/PHI
 * - ✅ Rate limiting for API protection
 * - ✅ Complex constraint combinations for data integrity
 * - ✅ Input validation and sanitization against injections
 * - ✅ Automatic security policy enforcement
 */
@Neo4jEntity.Auditable('EnterpriseUser', {
  description: 'Enterprise user with complete security and compliance features',
  tags: ['enterprise', 'security', 'compliance', 'multi-tenant'],
  constraints: {
    unique: [['email', 'organizationId'], ['employeeId', 'organizationId']], // Tenant-isolated uniqueness
    index: ['email', 'employeeId', 'organizationId', 'department', 'securityLevel'] // Performance + security
  }
})
@Unique(['email', 'organizationId']) // Email unique per organization (multi-tenant)
@Unique(['employeeId', 'organizationId']) // Employee ID unique per organization
export class EnterpriseUser {
  @Id()
  id: string;

  // === MULTI-TENANCY ===
  @Neo4jProp()
  @NotNull({
    errorMessage: 'Organization ID is required for multi-tenancy',
    treatEmptyAsNull: true
  })
  @PropIndex({
    name: 'enterprise_user_org_idx',
    type: 'BTREE'
  })
  organizationId: string; // Tenant isolation field

  // === BASIC IDENTITY (WITH SECURITY) ===
  @Neo4jProp()
  @NotNull({
    errorMessage: 'Email is required',
    treatEmptyAsNull: true
  })
  @PropIndex()
  @Validate({
    validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    message: 'Must be a valid email address'
  })
  email: string; // Auto-normalized by smart detection

  @Neo4jProp()
  @NotNull({ errorMessage: 'First name is required' })
  @ValidateInput({
    sanitization: {
      stripHtml: true,
      maxStringLength: 100,
      escapeSpecialChars: true
    }
  })
  firstName: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Last name is required' })
  @ValidateInput({
    sanitization: {
      stripHtml: true,
      maxStringLength: 100,
      escapeSpecialChars: true
    }
  })
  lastName: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    validator: (id: string) => /^[A-Z]{2,4}\d{4,8}$/.test(id),
    message: 'Employee ID must follow format: 2-4 letters followed by 4-8 digits'
  })
  employeeId: string; // Company-specific employee identifier

  // === ENCRYPTED SENSITIVE DATA ===
  @Neo4jProp()
  @EncryptSensitive({
    encryptFields: ['ssn'],
    algorithm: 'aes-256-gcm',
    auditEncryption: true
  })
  @Validate({
    validator: (ssn?: string) => !ssn || /^\d{3}-\d{2}-\d{4}$/.test(ssn),
    message: 'SSN must follow format: XXX-XX-XXXX'
  })
  ssn?: string; // Social Security Number (encrypted)

  @Neo4jProp()
  @EncryptSensitive({
    encryptFields: ['phone'],
    algorithm: 'aes-256-gcm'
  })
  @Validate({
    validator: (phone?: string) => !phone || /^\+?[\d\s\-\(\)]{10,15}$/.test(phone),
    message: 'Phone number must be 10-15 digits with optional formatting'
  })
  phone?: string; // Phone number (encrypted)

  @JsonProperty()
  @EncryptSensitive({
    encryptFields: ['emergencyContact'],
    algorithm: 'aes-256-gcm'
  })
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }; // Emergency contact (encrypted JSON)

  // === ROLE-BASED ACCESS CONTROL ===
  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    validator: (role: string) => ['super_admin', 'admin', 'manager', 'user', 'readonly'].includes(role),
    message: 'Role must be one of: super_admin, admin, manager, user, readonly'
  })
  role: 'super_admin' | 'admin' | 'manager' | 'user' | 'readonly';

  @Neo4jProp()
  @PropIndex()
  @Validate({
    validator: (level: number) => level >= 1 && level <= 10,
    message: 'Security level must be between 1 (lowest) and 10 (highest)'
  })
  securityLevel: number; // 1-10 security clearance level

  @JsonProperty()
  customPermissions?: string[]; // Additional permissions beyond role

  // === ORGANIZATIONAL DATA ===
  @Neo4jProp()
  @NotNull()
  @PropIndex()
  department: string;

  @Neo4jProp()
  @PropIndex()
  jobTitle: string;

  @Neo4jProp()
  managerId?: string; // Reference to manager's ID

  @Neo4jProp()
  @Validate({
    validator: (salary?: number) => !salary || (salary >= 0 && salary <= 10000000),
    message: 'Salary must be between 0 and 10 million'
  })
  salary?: number;

  @Neo4jProp()
  @Validate({
    validator: (date?: Date) => !date || date <= new Date(),
    message: 'Hire date cannot be in the future'
  })
  hireDate?: Date;

  // === STATUS AND COMPLIANCE ===
  @Neo4jProp()
  @PropIndex()
  @Validate({
    validator: (status: string) => ['active', 'inactive', 'suspended', 'terminated'].includes(status),
    message: 'Status must be one of: active, inactive, suspended, terminated'
  })
  status: 'active' | 'inactive' | 'suspended' | 'terminated';

  @Neo4jProp()
  lastLoginAt?: Date;

  @Neo4jProp()
  passwordChangedAt?: Date;

  @Neo4jProp()
  @Validate({
    validator: (attempts?: number) => !attempts || attempts >= 0,
    message: 'Failed login attempts cannot be negative'
  })
  failedLoginAttempts?: number;

  @Neo4jProp()
  accountLockedUntil?: Date;

  @JsonProperty()
  complianceFlags?: {
    gdprConsent?: boolean;
    gdprConsentDate?: string;
    hipaaTraining?: boolean;
    hipaaTrainingDate?: string;
    backgroundCheckComplete?: boolean;
    backgroundCheckDate?: string;
  };

  // === RELATIONSHIPS (SECURITY-AWARE) ===
  @Neo4jRelationship({
    type: 'BELONGS_TO',
    direction: 'OUT',
    target: () => Organization,
    description: 'User belongs to organization (tenant isolation)'
  })
  organization?: Organization;

  @Neo4jRelationship({
    type: 'HAS_PERMISSION',
    direction: 'OUT',
    target: () => Permission,
    isArray: true,
    description: 'User permissions for RBAC'
  })
  permissions?: Permission[];

  @Neo4jRelationship({
    type: 'MANAGES',
    direction: 'OUT',
    target: () => EnterpriseUser,
    isArray: true,
    description: 'Users this user manages'
  })
  directReports?: EnterpriseUser[];

  @Neo4jRelationship({
    type: 'MANAGES',
    direction: 'IN',
    target: () => EnterpriseUser,
    description: 'User who manages this user'
  })
  manager?: EnterpriseUser;

  @Neo4jRelationship({
    type: 'AUDIT_EVENT',
    direction: 'OUT',
    target: () => AuditEvent,
    isArray: true,
    description: 'Audit trail for user actions'
  })
  auditTrail?: AuditEvent[];

  // === AUDIT TIMESTAMPS ===
  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProp()
  createdBy?: string; // User ID who created this record

  @Neo4jProp()
  lastModifiedBy?: string; // User ID who last modified this record

  constructor(data?: Partial<EnterpriseUser>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  // === BUSINESS LOGIC WITH SECURITY ===

  @Authorize({
    roles: ['admin', 'manager'],
    permissions: ['user:read'],
    tenantIsolation: {
      enabled: true,
      tenantProperty: 'organizationId',
      autoInject: true
    }
  })
  @AuditLog({
    enabled: true,
    logLevel: 'standard',
    includeSensitiveData: false
  })
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  @Authorize({
    roles: ['admin', 'manager'],
    permissions: ['user:read:sensitive']
  })
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    customFields: { action: 'view_sensitive_data' }
  })
  getSensitiveInfo(): { ssn?: string; phone?: string } {
    // This would decrypt the fields automatically
    return {
      ssn: this.ssn,
      phone: this.phone
    };
  }

  @Authorize({
    roles: ['super_admin', 'admin'],
    permissions: ['user:write']
  })
  @ValidateInput({
    schema: {
      validatePropertyTypes: true
    },
    sanitization: {
      stripHtml: true,
      escapeSpecialChars: true
    }
  })
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    customFields: { action: 'update_security_level' }
  })
  updateSecurityLevel(newLevel: number): void {
    if (newLevel < 1 || newLevel > 10) {
      throw new Error('Security level must be between 1 and 10');
    }
    this.securityLevel = newLevel;
  }

  @RateLimit({
    requests: 10,
    window: '1m',
    keyGenerator: {
      includeUserId: true,
      includeTenantId: true
    }
  })
  @AuditLog({
    enabled: true,
    logLevel: 'minimal',
    customFields: { action: 'login_attempt' }
  })
  recordLoginAttempt(success: boolean): void {
    this.lastLoginAt = new Date();

    if (success) {
      this.failedLoginAttempts = 0;
      this.accountLockedUntil = undefined;
    } else {
      this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (this.failedLoginAttempts >= 5) {
        this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
    }
  }

  isAccountLocked(): boolean {
    return !!(this.accountLockedUntil && this.accountLockedUntil > new Date());
  }

  hasPermission(permission: string): boolean {
    return this.customPermissions?.includes(permission) || false;
  }

  hasMinimumSecurityLevel(requiredLevel: number): boolean {
    return this.securityLevel >= requiredLevel;
  }
}

/**
 * Service Usage with Enterprise Security:
 *
 * @Injectable()
 * @Repository(() => EnterpriseUser)
 * export class EnterpriseUserService extends BaseRepositoryService<EnterpriseUser> {
 *
 *   @Authorize({
 *     roles: ['admin'],
 *     tenantIsolation: { enabled: true, tenantProperty: 'organizationId' }
 *   })
 *   @AuditLog({ enabled: true, logLevel: 'detailed' })
 *   @RateLimit({ requests: 100, window: '1h' })
 *   async createUser(userData: CreateEnterpriseUserDto): Promise<EnterpriseUser> {
 *     // All security, validation, encryption, and auditing applied automatically
 *     // Tenant isolation enforced automatically
 *     // Constraints validated automatically
 *     // Sensitive fields encrypted automatically
 *     return this.create(userData);
 *   }
 *
 *   @Authorize({
 *     roles: ['admin', 'manager'],
 *     resourceAccess: {
 *       resourceType: 'user',
 *       actions: ['read'],
 *       ownershipCheck: {
 *         ownerProperty: 'managerId',
 *         allowOwnerAccess: true
 *       }
 *     }
 *   })
 *   async getUsersInDepartment(department: string): Promise<EnterpriseUser[]> {
 *     // Tenant isolation applied automatically
 *     // Only returns users from current user's organization
 *     return this.findAll({
 *       where: { department, status: 'active' }
 *     });
 *   }
 * }
 */

/**
 * Generated Security Features:
 *
 * 1. Database Constraints:
 *    - UNIQUE (email, organizationId) - Multi-tenant email uniqueness
 *    - UNIQUE (employeeId, organizationId) - Multi-tenant employee ID uniqueness
 *    - INDEXES on organizationId, email, department, securityLevel
 *
 * 2. Automatic Tenant Isolation:
 *    - All queries automatically filtered by organizationId
 *    - Prevents cross-tenant data access
 *
 * 3. Field-Level Encryption:
 *    - SSN, phone, emergencyContact encrypted with AES-256-GCM
 *    - Automatic encryption/decryption on read/write
 *
 * 4. Comprehensive Audit Trail:
 *    - All CRUD operations logged with user context
 *    - Sensitive data access tracked
 *    - Compliance reporting ready
 *
 * 5. Rate Limiting:
 *    - Method-level rate limiting per user per tenant
 *    - Configurable windows and limits
 *
 * 6. Input Validation:
 *    - XSS prevention with HTML stripping
 *    - SQL/Cypher injection detection
 *    - Business rule validation
 */
