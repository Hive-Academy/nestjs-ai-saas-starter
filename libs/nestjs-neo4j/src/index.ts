// =============================================================================
// CORE EXPORTS (Backward Compatible with  Features)
// =============================================================================

// Module
export * from './lib/neo4j.module';

// Services (now include all  features)
export * from './lib/services/neo4j.service';
export * from './lib/services/neo4j-connection.service';
export * from './lib/services/neo4j-health.service';

// Interfaces (includes  interfaces)
export type * from './lib/interfaces/neo4j-module-options.interface';
export type * from './lib/interfaces/neo4j-connection.interface';
export type * from './lib/interfaces/query-result.interface';

// Core Type Definitions
export type * from './lib/types/neo4j-types';

// Decorators
export * from './lib/decorators/inject-neo4j.decorator';
export * from './lib/decorators/transactional.decorator';
export * from './lib/decorators/neo4j-safe.decorator';
export * from './lib/decorators/validate-neo4j-params.decorator';

//  Decorator Framework
export * from './lib/decorators/cypher-query.decorator';
export * from './lib/decorators/repository.decorator';
export * from './lib/decorators/entity.decorator';
export type * from './lib/decorators/decorator-metadata.interface';

// Phase 7: Advanced Type Safety Decorators
export {
  TypedCypherQuery,
  type TypedCypherQueryConfig as TypedQueryConfig,
} from './lib/decorators/typed-cypher-query.decorator';

// Phase 5: Security & Validation Decorators
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

// Constraint System (Schema Management)
export * from './lib/constraints';
export * from './lib/constraints/constraint.service';

// Model Services Architecture
export {
  BaseModelService,
  type EntityMetadata,
  type ModelQueryOptions,
  type EntityHooks,
  type BaseEntity,
} from './lib/models/base-model.service';

export {
  Neo4jNodeModelService,
  type NodeEntity,
  type CreateRelationshipOptions,
  type RelationshipQueryOptions as NodeRelationshipQueryOptions,
  type TraversalOptions,
  type GraphPath,
  type NodeStatistics,
} from './lib/models/node-model.service';

export {
  Neo4jRelationshipModelService,
  type RelationshipEntity,
  type CreateRelationshipOptions as RelCreateOptions,
  type RelationshipQueryOptions as RelModelQueryOptions,
  type RelationshipPattern,
  type RelationshipAnalytics,
  type BidirectionalRelationship,
} from './lib/models/relationship-model.service';

// Multi-Tenancy Support
export * from './lib/multi-tenancy/multi-tenant.module';
export * from './lib/multi-tenancy/multi-tenant-neo4j.service';
export * from './lib/multi-tenancy/tenant-context.service';
export * from './lib/multi-tenancy/multi-tenant.decorators';

// Repository Framework
export * from './lib/repositories/base-repository';
export * from './lib/repositories/graph-repository';
export * from './lib/repositories/relationship-repository';

// Utils
export * from './lib/utils/query-builder';
export * from './lib/utils/parameter-serializer';

// Constants
export * from './lib/constants';

// Config Utilities
export {
  getNeo4jConfig,
  getNeo4jConfigWithDefaults,
  setNeo4jConfig,
  isNeo4jConfigured,
} from './lib/utils/neo4j-config.accessor';

// =============================================================================
// TYPE EXPORTS FOR  FEATURES
// =============================================================================

//  Query Types
export type {
  QueryOptions,
  QueryResult,
  QueryMetrics,
  ConnectionPoolMetrics,
  HealthIndicator,
  ComprehensiveMetrics,
} from './lib/interfaces/query-result.interface';

// Explicitly re-export transaction options to avoid conflicts
export type { TransactionOptions as BasicTransactionOptions } from './lib/interfaces/neo4j-connection.interface';
export type { TransactionOptions, ValidationOptions } from './lib/decorators/decorator-metadata.interface';

// =============================================================================
// CONVENIENCE RE-EXPORTS FOR COMMON USE CASES
// =============================================================================

//  Decorator Shortcuts
export {
  CypherQuery,
  Query,
  FindOne,
  FindMany,
  Create,
  Update,
  Delete,
} from './lib/decorators/cypher-query.decorator';

export {
  Neo4jRepository,
  Repository,
} from './lib/decorators/repository.decorator';

export {
  Neo4jEntity,
  Neo4jProperty,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
} from './lib/decorators/entity.decorator';

// Repository Shortcuts
export {
  BaseRepository,
  GraphRepository,
  RelationshipRepository,
} from './lib/repositories/index';

// =============================================================================
// TYPE DEFINITIONS FOR TYPE SAFETY
// =============================================================================

// Core Neo4j Types
export type {
  Neo4jPrimitive,
  Neo4jProperties,
  Neo4jQueryParams,
  Neo4jWhereClause,
  Neo4jSortOrder,
  Neo4jSortOrderArray,
  Neo4jRecordShape,
  Neo4jPropertyMap,
  Neo4jPartialPropertyMap,
  Neo4jQueryResult,
  Neo4jNodeIdentity,
  Neo4jRelationshipIdentity,
  Neo4jTransactionContext,
  Neo4jQueryOptions,
  Neo4jCreateData,
  Neo4jUpdateData,
  Neo4jCompatibleEntity,
  Neo4jPropertyConstraints,
  Neo4jBulkCreateData,
  Neo4jBulkUpdateData,
  Neo4jIndexDefinition,
  Neo4jConstraintDefinition,
  Neo4jOperationError,
} from './lib/types/neo4j-types';

// Type Guards
export {
  isNeo4jPrimitive,
  isNeo4jProperties,
  isNeo4jCompatibleEntity,
} from './lib/types/neo4j-types';
