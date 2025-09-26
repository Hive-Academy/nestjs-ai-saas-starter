/**
 * @fileoverview Database Constraints Examples
 *
 * This file demonstrates comprehensive usage patterns for Neo4j database constraint decorators:
 * - @Index for performance optimization and query acceleration
 * - @NotNull for data integrity and required field enforcement
 * - @NodeKey for compound uniqueness and entity identity
 * - @Unique for single and composite unique constraints
 *
 * Real-world scenarios covered:
 * - E-commerce product catalog with optimized searching
 * - User account management with data integrity
 * - Financial transaction processing with strict constraints
 * - Multi-tenant SaaS with isolation guarantees
 * - Content management with referential integrity
 */

import { Injectable } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProp,
  ClassIndex,
  PropIndex,
  NotNull,
  NodeKey,
  Unique,
  Id,
  CreatedAt,
  UpdatedAt
} from '../../../index';

// =============================================================================
// E-COMMERCE PRODUCT CATALOG WITH OPTIMIZED CONSTRAINTS
// =============================================================================

/**
 * Product entity with comprehensive constraint optimization
 * Demonstrates performance-focused indexing and data integrity
 */
@Neo4jEntity('Product')
@NodeKey(['sku']) // SKU must be globally unique per product
@NodeKey(['brandId', 'model']) // Brand + Model combination must be unique
@ClassIndex(['category', 'subCategory'], { name: 'product_category_idx', composite: true })
@ClassIndex(['price'], { name: 'product_price_idx', type: 'RANGE' })
@ClassIndex(['name'], { name: 'product_name_search_idx', type: 'TEXT' })
@ClassIndex(['tags'], { name: 'product_tags_idx', type: 'TEXT' })
@ClassIndex(['createdAt'], { name: 'product_creation_date_idx', type: 'RANGE' })
@Unique(['barcode'], { allowNull: true }) // Barcode unique when present
export class ProductEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Product name is required' })
  @PropIndex({ name: 'individual_product_name_idx' })
  name: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'SKU is required and must be unique' })
  sku: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Product must belong to a category' })
  category: string;

  @Neo4jProp()
  subCategory?: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Price is required' })
  price: number;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Brand ID is required' })
  brandId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Model is required' })
  model: string;

  @Neo4jProp()
  barcode?: string; // Optional but unique when present

  @Neo4jProp()
  description?: string;

  @Neo4jProp()
  tags?: string[];

  @Neo4jProp()
  @NotNull({ errorMessage: 'Product status is required', defaultValue: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

  @Neo4jProp()
  @NotNull({ errorMessage: 'Inventory count is required', defaultValue: 0 })
  inventory: number;

  @CreatedAt()
  @PropIndex({ name: 'product_created_at_idx' })
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

/**
 * Brand entity with strict identity constraints
 */
@Neo4jEntity('Brand')
@NodeKey(['name']) // Brand name must be globally unique
@ClassIndex(['country'], { name: 'brand_country_idx' })
@ClassIndex(['industry'], { name: 'brand_industry_idx' })
export class BrandEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Brand name is required and must be unique' })
  name: string;

  @Neo4jProp()
  country?: string;

  @Neo4jProp()
  industry?: string;

  @Neo4jProp()
  @NotNull({ defaultValue: true })
  active: boolean;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

/**
 * Category entity with hierarchical constraints
 */
@Neo4jEntity('Category')
@NodeKey(['slug']) // URL-friendly unique identifier
@ClassIndex(['parentId'], { name: 'category_parent_idx' })
@ClassIndex(['level'], { name: 'category_level_idx' })
@Unique(['name', 'parentId'], {
  name: 'category_name_parent_unique',
  description: 'Category name must be unique within parent'
})
export class CategoryEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Category name is required' })
  name: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Category slug is required' })
  slug: string;

  @Neo4jProp()
  description?: string;

  @Neo4jProp()
  parentId?: string;

  @Neo4jProp()
  @NotNull({ defaultValue: 1 })
  level: number;

  @Neo4jProp()
  @NotNull({ defaultValue: 0 })
  sortOrder: number;

  @Neo4jProp()
  @NotNull({ defaultValue: true })
  active: boolean;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// USER ACCOUNT MANAGEMENT WITH DATA INTEGRITY
// =============================================================================

/**
 * User entity with comprehensive identity and security constraints
 */
@Neo4jEntity('User')
@NodeKey(['email']) // Email must be globally unique
@ClassIndex(['lastName', 'firstName'], { name: 'user_name_idx', composite: true })
@ClassIndex(['status'], { name: 'user_status_idx' })
@ClassIndex(['lastLoginAt'], { name: 'user_last_login_idx', type: 'RANGE' })
@ClassIndex(['registrationSource'], { name: 'user_registration_source_idx' })
@Unique(['phone'], {
  allowNull: true,
  name: 'user_phone_unique',
  description: 'Phone number must be unique when provided'
})
@Unique(['username'], {
  allowNull: true,
  name: 'user_username_unique',
  description: 'Username must be unique when provided'
})
export class UserEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Email is required and must be unique' })
  email: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'First name is required' })
  firstName: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Last name is required' })
  lastName: string;

  @Neo4jProp()
  username?: string; // Optional but unique when present

  @Neo4jProp()
  @NotNull({ errorMessage: 'Password hash is required' })
  passwordHash: string;

  @Neo4jProp()
  phone?: string; // Optional but unique when present

  @Neo4jProp()
  @NotNull({ defaultValue: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

  @Neo4jProp()
  @NotNull({ defaultValue: false })
  emailVerified: boolean;

  @Neo4jProp()
  @NotNull({ defaultValue: false })
  phoneVerified: boolean;

  @Neo4jProp()
  registrationSource?: 'WEB' | 'MOBILE' | 'API' | 'SOCIAL';

  @Neo4jProp()
  lastLoginAt?: Date;

  @CreatedAt()
  @PropIndex({ name: 'user_created_at_idx' })
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

/**
 * User profile with extended data constraints
 */
@Neo4jEntity('UserProfile')
@NodeKey(['userId']) // One profile per user
@ClassIndex(['timezone'], { name: 'profile_timezone_idx' })
@ClassIndex(['language'], { name: 'profile_language_idx' })
export class UserProfileEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'User ID is required' })
  userId: string;

  @Neo4jProp()
  displayName?: string;

  @Neo4jProp()
  bio?: string;

  @Neo4jProp()
  avatarUrl?: string;

  @Neo4jProp()
  timezone?: string;

  @Neo4jProp()
  language?: string;

  @Neo4jProp()
  preferences?: Record<string, any>;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// FINANCIAL TRANSACTION PROCESSING WITH STRICT CONSTRAINTS
// =============================================================================

/**
 * Financial account with strict identity constraints
 */
@Neo4jEntity('Account')
@NodeKey(['accountNumber']) // Account number must be globally unique
@ClassIndex(['customerId'], { name: 'account_customer_idx' })
@ClassIndex(['type'], { name: 'account_type_idx' })
@ClassIndex(['status'], { name: 'account_status_idx' })
@ClassIndex(['currency'], { name: 'account_currency_idx' })
@ClassIndex(['balance'], { name: 'account_balance_idx', type: 'RANGE' })
export class AccountEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Account number is required and must be unique' })
  accountNumber: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Customer ID is required' })
  customerId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Account type is required' })
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT';

  @Neo4jProp()
  @NotNull({ errorMessage: 'Currency is required', defaultValue: 'USD' })
  currency: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Balance is required', defaultValue: 0 })
  balance: number;

  @Neo4jProp()
  @NotNull({ defaultValue: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'CLOSED';

  @Neo4jProp()
  @NotNull({ defaultValue: false })
  isPrimary: boolean;

  @CreatedAt()
  @PropIndex({ name: 'account_created_at_idx' })
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

/**
 * Financial transaction with comprehensive audit constraints
 */
@Neo4jEntity('Transaction')
@NodeKey(['transactionId']) // Transaction ID must be globally unique
@ClassIndex(['fromAccountId'], { name: 'transaction_from_account_idx' })
@ClassIndex(['toAccountId'], { name: 'transaction_to_account_idx' })
@ClassIndex(['type'], { name: 'transaction_type_idx' })
@ClassIndex(['status'], { name: 'transaction_status_idx' })
@ClassIndex(['amount'], { name: 'transaction_amount_idx', type: 'RANGE' })
@ClassIndex(['timestamp'], { name: 'transaction_timestamp_idx', type: 'RANGE' })
@ClassIndex(['reference'], { name: 'transaction_reference_idx' })
export class TransactionEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Transaction ID is required and must be unique' })
  transactionId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'From account ID is required' })
  fromAccountId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'To account ID is required' })
  toAccountId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Transaction type is required' })
  type: 'TRANSFER' | 'PAYMENT' | 'DEPOSIT' | 'WITHDRAWAL' | 'FEE';

  @Neo4jProp()
  @NotNull({ errorMessage: 'Amount is required' })
  amount: number;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Currency is required' })
  currency: string;

  @Neo4jProp()
  reference?: string;

  @Neo4jProp()
  description?: string;

  @Neo4jProp()
  @NotNull({ defaultValue: 'PENDING' })
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  @Neo4jProp()
  @NotNull({ errorMessage: 'Timestamp is required' })
  timestamp: Date;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// MULTI-TENANT SAAS WITH ISOLATION GUARANTEES
// =============================================================================

/**
 * Tenant entity with strict isolation constraints
 */
@Neo4jEntity('Tenant')
@NodeKey(['slug']) // Tenant slug must be globally unique (for subdomains)
@ClassIndex(['plan'], { name: 'tenant_plan_idx' })
@ClassIndex(['status'], { name: 'tenant_status_idx' })
@ClassIndex(['region'], { name: 'tenant_region_idx' })
@Unique(['domain'], {
  allowNull: true,
  name: 'tenant_domain_unique',
  description: 'Custom domain must be unique when provided'
})
export class TenantEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Tenant name is required' })
  name: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Tenant slug is required and must be unique' })
  slug: string;

  @Neo4jProp()
  domain?: string; // Custom domain - optional but unique when present

  @Neo4jProp()
  @NotNull({ errorMessage: 'Plan is required' })
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

  @Neo4jProp()
  @NotNull({ defaultValue: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @Neo4jProp()
  region?: string;

  @Neo4jProp()
  settings?: Record<string, any>;

  @CreatedAt()
  @PropIndex({ name: 'tenant_created_at_idx' })
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

/**
 * Tenant user with compound identity constraints
 */
@Neo4jEntity('TenantUser')
@NodeKey(['tenantId', 'email']) // Email must be unique within tenant
@ClassIndex(['tenantId'], { name: 'tenant_user_tenant_idx' })
@ClassIndex(['role'], { name: 'tenant_user_role_idx' })
@ClassIndex(['status'], { name: 'tenant_user_status_idx' })
@Unique(['tenantId', 'username'], {
  allowNull: true,
  name: 'tenant_user_username_unique',
  description: 'Username must be unique within tenant when provided'
})
export class TenantUserEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Tenant ID is required' })
  tenantId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Email is required' })
  email: string;

  @Neo4jProp()
  username?: string; // Optional but unique within tenant when present

  @Neo4jProp()
  @NotNull({ errorMessage: 'First name is required' })
  firstName: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Last name is required' })
  lastName: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Role is required', defaultValue: 'USER' })
  role: 'OWNER' | 'ADMIN' | 'USER' | 'VIEWER';

  @Neo4jProp()
  @NotNull({ defaultValue: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';

  @CreatedAt()
  @PropIndex({ name: 'tenant_user_created_at_idx' })
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// CONTENT MANAGEMENT WITH REFERENTIAL INTEGRITY
// =============================================================================

/**
 * Content entity with versioning and hierarchy constraints
 */
@Neo4jEntity('Content')
@NodeKey(['slug', 'tenantId']) // Slug must be unique within tenant
@ClassIndex(['type'], { name: 'content_type_idx' })
@ClassIndex(['status'], { name: 'content_status_idx' })
@ClassIndex(['authorId'], { name: 'content_author_idx' })
@ClassIndex(['publishedAt'], { name: 'content_published_at_idx', type: 'RANGE' })
@ClassIndex(['tags'], { name: 'content_tags_idx', type: 'TEXT' })
@Unique(['canonicalUrl'], {
  allowNull: true,
  name: 'content_canonical_url_unique',
  description: 'Canonical URL must be unique when provided'
})
export class ContentEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Tenant ID is required' })
  tenantId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Title is required' })
  title: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Slug is required' })
  slug: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Content type is required' })
  type: 'POST' | 'PAGE' | 'ARTICLE' | 'DOCUMENT';

  @Neo4jProp()
  @NotNull({ defaultValue: 'DRAFT' })
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';

  @Neo4jProp()
  @NotNull({ errorMessage: 'Author ID is required' })
  authorId: string;

  @Neo4jProp()
  content?: string;

  @Neo4jProp()
  excerpt?: string;

  @Neo4jProp()
  canonicalUrl?: string; // Optional but unique when present

  @Neo4jProp()
  tags?: string[];

  @Neo4jProp()
  metadata?: Record<string, any>;

  @Neo4jProp()
  publishedAt?: Date;

  @CreatedAt()
  @PropIndex({ name: 'content_created_at_idx' })
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

/**
 * Content version with revision tracking constraints
 */
@Neo4jEntity('ContentVersion')
@NodeKey(['contentId', 'version']) // Version must be unique per content
@ClassIndex(['contentId'], { name: 'content_version_content_idx' })
@ClassIndex(['createdBy'], { name: 'content_version_created_by_idx' })
@ClassIndex(['createdAt'], { name: 'content_version_created_at_idx', type: 'RANGE' })
export class ContentVersionEntity {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Content ID is required' })
  contentId: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Version number is required' })
  version: number;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Title is required' })
  title: string;

  @Neo4jProp()
  content?: string;

  @Neo4jProp()
  @NotNull({ errorMessage: 'Created by user ID is required' })
  createdBy: string;

  @Neo4jProp()
  changeNote?: string;

  @Neo4jProp()
  @NotNull({ defaultValue: false })
  isActive: boolean;

  @CreatedAt()
  createdAt: Date;
}

/**
 * Service demonstrating constraint usage in practice
 */
@Injectable()
export class ConstraintDemonstrationService {
  /**
   * Example method showing how constraints work in practice
   */
  async demonstrateConstraints(): Promise<void> {
    console.log(`
      Constraint System Demonstration:

      1. NodeKey Constraints:
         - ProductEntity: SKU must be globally unique
         - ProductEntity: Brand + Model combination must be unique
         - UserEntity: Email must be globally unique
         - TenantUserEntity: Email must be unique within tenant

      2. Unique Constraints:
         - ProductEntity: Barcode unique when present (allows null)
         - UserEntity: Phone unique when provided (allows null)
         - TenantEntity: Custom domain unique when provided

      3. Index Constraints:
         - Performance: Price ranges, dates, categories
         - Search: Product names, tags, content
         - Relationships: Foreign keys, lookups

      4. NotNull Constraints:
         - Required fields: Names, IDs, critical data
         - Business rules: Status fields, required relationships
         - Data integrity: Audit trails, timestamps

      5. Composite Constraints:
         - Category name unique within parent
         - Content slug unique within tenant
         - Version numbers unique per content

      These constraints provide:
      ✓ Data integrity and consistency
      ✓ Performance optimization through indexing
      ✓ Business rule enforcement
      ✓ Multi-tenant isolation
      ✓ Referential integrity
    `);
  }
}


/**
 * Database Constraints Best Practices Summary:
 *
 * 1. **NodeKey Usage**:
 *    - Use for business-critical unique identifiers
 *    - Support compound keys for complex uniqueness
 *    - Perfect for tenant isolation and scoped uniqueness
 *
 * 2. **Index Strategy**:
 *    - Index frequently queried fields
 *    - Use composite indexes for multi-field queries
 *    - Choose appropriate index types (RANGE, TEXT, etc.)
 *    - Consider query patterns when designing indexes
 *
 * 3. **Unique Constraints**:
 *    - Use for optional but unique fields
 *    - Consider null handling carefully
 *    - Document business rules clearly
 *
 * 4. **NotNull Enforcement**:
 *    - Required for critical business data
 *    - Provide meaningful error messages
 *    - Consider default values when appropriate
 *
 * 5. **Performance Considerations**:
 *    - Balance constraint overhead with benefits
 *    - Monitor constraint validation performance
 *    - Use constraints to guide query optimization
 *
 * 6. **Multi-tenant Design**:
 *    - Scope uniqueness within tenants when appropriate
 *    - Use compound keys for tenant isolation
 *    - Consider global vs tenant-scoped constraints carefully
 */
