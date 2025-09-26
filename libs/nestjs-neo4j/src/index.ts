// =============================================================================
// CORE EXPORTS
// =============================================================================

// Module
export { Neo4jModule } from './lib/neo4j.module';

// Services
export { Neo4jService } from './lib/services/neo4j.service';
export { Neo4jConnectionService } from './lib/services/neo4j-connection.service';
export { Neo4jHealthService } from './lib/services/neo4j-health.service';

// Interfaces
export type { Neo4jModuleOptions } from './lib/interfaces/neo4j-module-options.interface';
export type * from './lib/interfaces/neo4j-connection.interface';
export type { QueryResult, QueryOptions, QueryMetrics } from './lib/interfaces/query-result.interface';

// Core Type Definitions
export type * from './lib/types/neo4j-types';
export type { BaseEntity } from './lib/types/neo4j-types';

// Safety & Validation Decorators (PRIMARY)
export {
  Safe,
  type SafeConfig,
  type SafeContext,
  type SafeValidationError,
} from './lib/decorators/safe.decorator';

// Core Decorators
export { InjectNeo4j, InjectNeo4jSession, InjectNeo4jDriver, InjectNeo4jConnection } from './lib/decorators/inject-neo4j.decorator';
export { Transactional } from './lib/decorators/transactional.decorator';

// Legacy Decorators (DEPRECATED - use @Safe() instead)
export {
  Neo4jSafe,
  type Neo4jSafeOptions,
} from './lib/decorators/safe.decorator';

// Decorator Framework
export {
  CypherQuery,
  type CypherQueryConfig,
} from './lib/decorators/cypher-query.decorator';
export {
  Repository,
  Neo4jRepository,
} from './lib/repositories/repository.decorator';
export {
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
} from './lib/decorators/entity.decorator';
export type * from './lib/interfaces/decorator-metadata.interface';

// Security & Validation Decorators
export {
  Authorize,
  ValidateInput,
  AuditLog,
  RateLimit,
  EncryptSensitive,
  type AuthorizeConfig as SecurityAuthorizeConfig,
  type ValidateInputConfig as SecurityValidateInputConfig,
  type AuditLogConfig as SecurityAuditLogConfig,
  type RateLimitConfig as SecurityRateLimitConfig,
  type EncryptSensitiveConfig as SecurityEncryptSensitiveConfig,
} from './lib/decorators/security.decorators';

// Constraint System
export {
  ConstraintService,
  ClassIndex,
  PropIndex,
  Indexes,
  TextIndex,
  RangeIndex,
  PointIndex,
  LookupIndex,
  NotNull,
  NodeKey,
  Unique,
  ClassUnique,
  PropUnique,
  UniqueConstraints,
  Validate,
} from './lib/constraints';

// Multi-Tenancy Support
export { MultiTenantNeo4jModule } from './lib/multi-tenancy/multi-tenant.module';
export { MultiTenantNeo4jService } from './lib/multi-tenancy/multi-tenant-neo4j.service';
export { TenantContextService } from './lib/multi-tenancy/tenant-context.service';
export * from './lib/multi-tenancy/multi-tenant.decorators';

// Repository Framework (Specialized repositories only)
export {
  GraphRepository,
  type GraphTraversalOptions,
  type ShortestPathOptions,
  type ClusteringOptions,
  type GraphPattern,
} from './lib/repositories/graph-repository';
export {
  RelationshipRepository,
  type RelationshipQueryOptions,
  type CreateRelationshipData,
  type RelationshipResult,
  type BatchRelationshipOperation,
} from './lib/repositories/relationship-repository';

// Utils
export * from './lib/utils/query-builder';
export * from './lib/utils/parameter-serializer';

// Type-Safe Query Builder
export {
  Neo4jQueryBuilder,
  TypedQueryBuilder,
  createQueryBuilder,
} from './lib/query-builder/neo4j-query-builder';

// Constants
export * from './lib/constants';

// Config Utilities
export {
  getNeo4jConfig,
  getNeo4jConfigWithDefaults,
  setNeo4jConfig,
  isNeo4jConfigured,
} from './lib/utils/neo4j-config.accessor';

// Entity CRUD operations are now internal to @Repository decorator
// Use @Repository or @Neo4jRepository decorator for CRUD operations
// The FindOptions type is still exported for repository method signatures
export { type FindOptions } from './lib/repositories/crud-operations';

// Base Repository Interface for TypeScript support
export {
  type IBaseRepository,
  BaseRepositoryService,
} from './lib/repositories/base-repository.interface';

// =============================================================================
// EXAMPLES AND DOCUMENTATION
// =============================================================================

// Query Builder Examples
export type * from './lib/examples';
export {
  QUERY_BUILDER_EXAMPLES,
  EXAMPLE_CATEGORIES,
  type QueryBuilderExampleType,
  type ExampleCategoryType,
} from './lib/examples';
