/**
 * @fileoverview Constraints and Schema Management Examples Index
 *
 * This module exports comprehensive examples demonstrating advanced constraint
 * and schema management patterns for Neo4j in production environments.
 */

// Database Constraints Examples
export * from './01-database-constraints.example';

// Custom Validation Examples
export * from './02-custom-validation.example';

// Constraint Service Examples
export * from './03-constraint-service.example';

// Production Schema Management Examples
export * from './04-schema-management.example';

/**
 * Example categories for constraint and schema management
 */
export const CONSTRAINT_EXAMPLE_CATEGORIES = {
  DATABASE_CONSTRAINTS: '01-database-constraints',
  CUSTOM_VALIDATION: '02-custom-validation',
  CONSTRAINT_SERVICE: '03-constraint-service',
  SCHEMA_MANAGEMENT: '04-schema-management'
} as const;

/**
 * Quick reference for constraint decorator usage patterns
 */
export const CONSTRAINT_USAGE_PATTERNS = {
  // Index patterns for performance
  SINGLE_PROPERTY_INDEX: '@PropIndex({ name: "idx_property" })',
  COMPOSITE_INDEX: '@ClassIndex(["prop1", "prop2"], { name: "idx_composite" })',
  TEXT_SEARCH_INDEX: '@ClassIndex(["title", "content"], { type: "TEXT" })',
  RANGE_INDEX: '@ClassIndex(["price"], { type: "RANGE" })',

  // Unique constraints
  SIMPLE_UNIQUE: '@Unique(["email"])',
  COMPOSITE_UNIQUE: '@Unique(["tenantId", "username"])',
  UNIQUE_WITH_NULL: '@Unique(["phone"], { allowNull: true })',

  // Node key constraints
  SIMPLE_NODE_KEY: '@NodeKey(["id"])',
  COMPOSITE_NODE_KEY: '@NodeKey(["tenantId", "slug"])',

  // Not null constraints
  REQUIRED_FIELD: '@NotNull({ errorMessage: "Field is required" })',
  WITH_DEFAULT: '@NotNull({ defaultValue: "default" })',

  // Custom validation
  EMAIL_VALIDATION: '@Email({ required: true })',
  RANGE_VALIDATION: '@Range({ min: 0, max: 100 })',
  LENGTH_VALIDATION: '@Length({ min: 5, max: 50 })',
  PATTERN_VALIDATION: '@Pattern(/^[A-Z0-9]+$/)',
  CUSTOM_VALIDATION: '@Custom({ validator: (value) => value.length > 0, message: "Custom rule" })'
} as const;

/**
 * Production deployment checklist for constraints
 */
export const PRODUCTION_CHECKLIST = [
  'Schema version control implemented',
  'Constraint migration strategy defined',
  'Performance benchmarks established',
  'Backup and rollback procedures tested',
  'Monitoring and alerting configured',
  'Compliance requirements verified',
  'Zero-downtime deployment strategy ready',
  'Automated testing pipeline active'
] as const;

/**
 * Common constraint patterns by use case
 */
export const CONSTRAINT_PATTERNS_BY_USE_CASE = {
  E_COMMERCE: [
    'Product SKU uniqueness',
    'Price range validation',
    'Category hierarchy constraints',
    'Inventory non-negative constraints'
  ],

  USER_MANAGEMENT: [
    'Email uniqueness',
    'Username format validation',
    'Password complexity requirements',
    'Profile completeness rules'
  ],

  FINANCIAL: [
    'Account number uniqueness',
    'IBAN format validation',
    'Balance range constraints',
    'Transaction reference validation'
  ],

  CONTENT_MANAGEMENT: [
    'Slug uniqueness per tenant',
    'Content moderation rules',
    'Title length constraints',
    'Tag format validation'
  ],

  MULTI_TENANT: [
    'Tenant isolation constraints',
    'Resource scoping rules',
    'Cross-tenant access prevention',
    'Tenant-specific validation'
  ]
} as const;

/**
 * Performance optimization guidelines
 */
export const PERFORMANCE_GUIDELINES = {
  INDEXING: [
    'Create indexes for frequently queried properties',
    'Use composite indexes for multi-property queries',
    'Choose appropriate index types (RANGE, TEXT)',
    'Monitor index usage and effectiveness'
  ],

  VALIDATION: [
    'Keep custom validators lightweight',
    'Use sync validation when possible',
    'Cache validation results appropriately',
    'Batch validate multiple entities'
  ],

  CONSTRAINTS: [
    'Apply constraints during low-traffic periods',
    'Test constraint performance impact',
    'Use appropriate conflict resolution strategies',
    'Monitor constraint creation success rates'
  ],

  SCHEMA_MANAGEMENT: [
    'Use blue-green deployments for major changes',
    'Apply backward-compatible changes first',
    'Maintain schema version compatibility',
    'Test rollback procedures regularly'
  ]
} as const;
