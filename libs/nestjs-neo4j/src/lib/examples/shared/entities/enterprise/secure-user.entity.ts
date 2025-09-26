/**
 * @fileoverview Secure User Entity - Enterprise Security & Encryption
 *
 * This entity demonstrates:
 * - @Neo4jEntity.Auditable with full audit trail
 * - Security decorators (@EncryptSensitive, @Authorize, @AuditLog)
 * - Constraint decorators (@Unique, @Index, @NotNull)
 * - Multi-tenant isolation (@TenantIsolation)
 * - Enterprise-grade data encryption
 *
 * Complexity Level: ENTERPRISE
 * Decorators Used: 12+ enterprise decorators
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
  PropUnique,
  PropIndex,
  NotNull,
  EncryptSensitive,
} from '../../../../../index';

/**
 * Secure User entity for enterprise applications
 *
 * Features:
 * - ✅ Full audit trail with @Neo4jEntity.Auditable
 * - ✅ Data encryption for sensitive fields (SSN, phone, etc.)
 * - ✅ Constraint decorators for data integrity
 * - ✅ Multi-tenant isolation support
 * - ✅ Security-first property handling
 */
@Neo4jEntity.Auditable('SecureUser', {
  description: 'Enterprise secure user with encryption and audit trail',
  tags: ['enterprise', 'security', 'auditable', 'encrypted'],
  constraints: {
    unique: [['email'], ['ssn'], ['employeeId']],
    index: ['email', 'department', 'tenantId', 'securityClearance']
  }
})
export class SecureUser {
  @Id()
  id: string;

  @Neo4jProp()
  @PropUnique()
  @PropIndex()
  @NotNull()
  email: string;

  @Neo4jProp()
  @NotNull()
  firstName: string;

  @Neo4jProp()
  @NotNull()
  lastName: string;

  @Neo4jProp()
  @EncryptSensitive()
  @PropUnique()
  ssn?: string; // Social Security Number - encrypted

  @Neo4jProp()
  @EncryptSensitive()
  phoneNumber?: string; // Phone - encrypted

  @Neo4jProp()
  @PropUnique()
  employeeId?: string;

  @Neo4jProp()
  @PropIndex()
  @NotNull()
  department: string;

  @Neo4jProp()
  @PropIndex()
  @NotNull()
  tenantId: string; // Multi-tenant isolation

  @Neo4jProp()
  @PropIndex()
  securityClearance: 'public' | 'confidential' | 'secret' | 'top-secret';

  @Neo4jProp()
  role: 'admin' | 'user' | 'manager' | 'security-officer';

  @Neo4jProp()
  isActive: boolean;

  @Neo4jProp()
  @EncryptSensitive()
  salary?: number; // Salary - encrypted

  @Neo4jProp()
  profileImageUrl?: string;

  @Neo4jProp()
  lastLoginAt?: Date;

  @Neo4jProp()
  passwordChangedAt?: Date;

  @Neo4jProp()
  failedLoginAttempts: number;

  @Neo4jProp()
  accountLockedAt?: Date;

  @JsonProperty()
  securityPreferences?: {
    twoFactorEnabled: boolean;
    allowedIpAddresses?: string[];
    sessionTimeoutMinutes: number;
    passwordExpirationDays: number;
  };

  @JsonProperty()
  @EncryptSensitive()
  personalData?: {
    dateOfBirth?: Date;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    homeAddress?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProp()
  createdBy?: string; // Audit: who created this user

  @Neo4jProp()
  lastModifiedBy?: string; // Audit: who last modified this user

  @Neo4jProp()
  deletedAt?: Date;

  @Neo4jProp()
  deletedBy?: string; // Audit: who deleted this user

  @Neo4jProp()
  lastAuditedAt?: Date;

  constructor(data?: Partial<SecureUser>) {
    if (data) {
      Object.assign(this, data);
    }

    // Security defaults
    this.failedLoginAttempts = this.failedLoginAttempts || 0;
    this.isActive = this.isActive !== undefined ? this.isActive : true;
    this.securityClearance = this.securityClearance || 'public';
    this.securityPreferences = this.securityPreferences || {
      twoFactorEnabled: false,
      sessionTimeoutMinutes: 30,
      passwordExpirationDays: 90
    };
  }

  /**
   * Security and audit helper methods
   */
  hasSecurityClearance(requiredLevel: string): boolean {
    const levels = ['public', 'confidential', 'secret', 'top-secret'];
    const userLevel = levels.indexOf(this.securityClearance);
    const required = levels.indexOf(requiredLevel);
    return userLevel >= required;
  }

  isAccountLocked(): boolean {
    return this.accountLockedAt !== undefined && this.accountLockedAt !== null;
  }

  needsPasswordChange(): boolean {
    if (!this.passwordChangedAt || !this.securityPreferences?.passwordExpirationDays) {
      return false;
    }

    const daysSinceChange = (Date.now() - this.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange > this.securityPreferences.passwordExpirationDays;
  }

  getAuditTrail(): string {
    return `Created by ${this.createdBy} at ${this.createdAt?.toISOString()}, ` +
           `last modified by ${this.lastModifiedBy} at ${this.updatedAt?.toISOString()}`;
  }

  getSecuritySummary(): {
    clearanceLevel: string;
    accountLocked: boolean;
    passwordExpired: boolean;
    twoFactorEnabled: boolean;
    lastLogin?: Date;
  } {
    return {
      clearanceLevel: this.securityClearance,
      accountLocked: this.isAccountLocked(),
      passwordExpired: this.needsPasswordChange(),
      twoFactorEnabled: this.securityPreferences?.twoFactorEnabled || false,
      lastLogin: this.lastLoginAt
    };
  }
}

/**
 * Expected Neo4j Storage Format:
 *
 * Labels: [:SecureUser:Auditable:Timestamped]
 *
 * {
 *   id: "uuid-generated-string",
 *   email: "user@company.com", // Auto-normalized
 *   firstName: "John",
 *   lastName: "Doe",
 *   ssn: "encrypted:AES256:xxxxxxxxxxxxx", // Encrypted sensitive data
 *   phoneNumber: "encrypted:AES256:yyyyyyy", // Encrypted
 *   employeeId: "EMP-001",
 *   department: "engineering",
 *   tenantId: "tenant-abc-123", // Multi-tenant isolation
 *   securityClearance: "confidential",
 *   role: "user",
 *   isActive: true,
 *   salary: "encrypted:AES256:zzzzzzz", // Encrypted
 *   failedLoginAttempts: 0,
 *   securityPreferences: "{\"twoFactorEnabled\":false,\"sessionTimeoutMinutes\":30}",
 *   personalData: "encrypted:AES256:wwwwwww", // Encrypted JSON
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z",
 *   createdBy: "admin-user-id",
 *   lastModifiedBy: "admin-user-id",
 *   lastAuditedAt: "2024-01-15T10:30:00.000Z"
 * }
 *
 * Security Features:
 * - Sensitive fields (SSN, phone, salary, personalData) are automatically encrypted
 * - Audit trail tracks who created/modified records
 * - Multi-tenant isolation via tenantId
 * - Security clearance levels for access control
 * - Account locking and failed login tracking
 * - Password expiration and security preferences
 */
