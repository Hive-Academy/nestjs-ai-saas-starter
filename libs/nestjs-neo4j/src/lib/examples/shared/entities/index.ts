/**
 * @fileoverview Shared Enterprise Entity Classes
 *
 * This module provides properly decorated entity classes that showcase
 * the full decorator ecosystem of @hive-academy/nestjs-neo4j.
 *
 * These entities replace basic TypeScript interfaces and demonstrate:
 * - Proper decorator usage patterns
 * - Type safety with Date objects (not strings)
 * - Enterprise security and validation
 * - Constraint and index management
 * - Multi-tenancy patterns
 * - Audit trail integration
 *
 * Usage:
 * Import these entities in your examples instead of basic interfaces.
 * They work seamlessly with @Repository decorators and provide
 * rich functionality out of the box.
 */

// Basic Entity Classes (Progressive Complexity)
export { User } from './basic/user.entity';
export { Product } from './basic/product.entity';
export { Order } from './basic/order.entity';

// Intermediate Entity Classes (Relationships + Constraints)
export { Company } from './intermediate/company.entity';
export { Post } from './intermediate/post.entity';
export { Comment } from './intermediate/comment.entity';

// Enterprise Entity Classes (Security + Multi-tenancy + Full Feature Showcase)
export { SecureUser } from './enterprise/secure-user.entity';
export { AuditableProduct } from './enterprise/auditable-product.entity';
export { TenantedOrganization } from './enterprise/tenanted-organization.entity';

// Note: Additional enterprise entities (FinancialAccount, HealthcareRecord) can be added here

// Utility Types
export type { CreateUserDto } from './dto/create-user.dto';
export type { UpdateUserDto } from './dto/update-user.dto';
export type { CreateProductDto } from './dto/create-product.dto';
export type { UpdateProductDto } from './dto/update-product.dto';
export type { CreateOrderDto } from './dto/create-order.dto';
export type { UpdateOrderDto } from './dto/update-order.dto';

/**
 * Entity Complexity Levels:
 *
 * BASIC: Core decorators only
 * - @Neo4jEntity with string shorthand
 * - @Neo4jProp with smart defaults
 * - @Id, @CreatedAt, @UpdatedAt
 *
 * INTERMEDIATE: + Constraints and Relationships
 * - @Unique, @Index constraints
 * - @Neo4jRelationship mappings
 * - Custom validation
 *
 * ADVANCED: + Security and Multi-tenancy
 * - @Authorize role-based access
 * - @ValidateInput sanitization
 * - @AuditLog compliance logging
 *
 * ENTERPRISE: + Full Feature Stack
 * - @EncryptSensitive data protection
 * - @RateLimit API protection
 * - Complex constraint combinations
 * - Production-ready patterns
 */
