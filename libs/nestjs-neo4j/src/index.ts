// =============================================================================
// CORE EXPORTS
// =============================================================================

// Module
export { Neo4jModule } from './lib/neo4j.module';

// ==================== MODERN SERVICES (PRIMARY) ====================
// Use these services for all new development

export { NeogmaService } from './lib/services/neogma.service';
export { NeogmaMetricsService } from './lib/services/neogma-metrics.service';
export { NeogmaConnectionService } from './lib/services/neogma-connection.service';

// ==================== MODERN QUERY BUILDER SERVICES ====================
// Type-safe QueryBuilder services for modern Neo4j operations

export { NeogmaQueryBuilderService } from './lib/query-builder/neogma-query-builder.service';
export { NeogmaQueryRunnerService } from './lib/query-builder/neogma-query-runner.service';
export { NeogmaModelFactoryService } from './lib/query-builder/neogma-model-factory.service';

// ==================== SERVICE CONSOLIDATION COMPLETE ====================
// Single authoritative service implementation per TASK_2025_013 Requirement 5

// ==================== MODERN NEOGMA INTEGRATION ====================
// Modern decorators and utilities for Neogma integration

export { InjectNeogma } from './lib/neogma/neogma.decorators';
export type * from './lib/neogma/neogma.interfaces';
export * from './lib/neogma/neogma.constants';

// Interfaces - Re-enabled to restore type safety
export type {
  Neo4jModuleOptions,
  Neo4jModuleAsyncOptions,
  Neo4jConfig,
  Neo4jModuleOptionsFactory,
} from './lib/interfaces/neo4j-module-options.interface';
export type * from './lib/interfaces/neo4j-connection.interface';
export type {
  QueryResult,
  QueryOptions,
  QueryMetrics,
  QueryProfile,
  QueryPlanStep,
  QueryNotification,
  BaseQueryResult,
  BulkOperation,
  BulkResult,
  HealthIndicator,
  ConnectionPoolMetrics,
  ComprehensiveMetrics,
} from './lib/interfaces/query-result.interface';

// Core Type Definitions
export type * from './lib/types/neo4j-types';
export { Neo4jBaseEntity } from './lib/types/neo4j-types';
export type * from './lib/types/neogma-types';
// BaseEntity deleted - use Neogma's NeogmaModel instead

// Safety & Validation Decorators (PRIMARY)
export {
  Safe,
  type SafeConfig,
  type SafeContext,
  type SafeValidationError,
} from './lib/decorators/safe.decorator';

// Core Decorators
export {
  InjectNeo4j,
  InjectNeo4jSession,
  InjectNeo4jDriver,
  InjectNeo4jConnection,
} from './lib/decorators/inject-neo4j.decorator';
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
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
} from './lib/decorators/entity.decorator';
export type {
  RepositoryConfig,
  DECORATOR_METADATA_KEYS,
} from './lib/interfaces/decorator-metadata.interface';

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
  ClassUnique,
  PropUnique,
  UniqueConstraints,
  Validate,
  Unique,
} from './lib/constraints';

// Multi-Tenancy Support
export {
  MultiTenantNeo4jModule,
  MultiTenantConfigurations,
} from './lib/multi-tenancy/multi-tenant.module';
export { MultiTenantNeo4jService } from './lib/multi-tenancy/multi-tenant-neo4j.service';
export { TenantContextService } from './lib/multi-tenancy/tenant-context.service';
export * from './lib/multi-tenancy/multi-tenant.decorators';

// ❌ REMOVED: GraphRepository - Use specialized services instead:
// - GraphTraversalService for path finding and traversal
// - GraphMetricsService for centrality and statistics
// - GraphPatternService for complex pattern matching

// Modern Graph Services (Specialized graph operations)
export { BaseGraphService } from './lib/repositories/graph/base-graph.service';
export { GraphTraversalService } from './lib/repositories/graph/graph-traversal.service';
export { GraphMetricsService } from './lib/repositories/graph/graph-metrics.service';
export { GraphPatternService } from './lib/repositories/graph/graph-pattern.service';

// Graph Service Types (distributed across services)
export type {
  NeighborResult,
  PathResult,
  GraphQueryOptions,
  GraphTraversalOptions,
  GraphPattern,
} from './lib/repositories/graph/base-graph.service';

export type { PathFindingOptions } from './lib/repositories/graph/graph-traversal.service';

export type {
  CentralityMetric,
  ConnectedComponent,
  GraphStatistics,
  CentralityResult,
  CommunityDetectionOptions,
} from './lib/repositories/graph/graph-metrics.service';

export type {
  SubgraphOptions,
  SubgraphResult,
  GraphCycle,
  GraphQueryPattern,
} from './lib/repositories/graph/graph-pattern.service';

// Modern Relationship Services (Post-Split Architecture)
export {
  BaseRelationshipService,
  type RelationshipQueryOptions,
  type CreateRelationshipData,
  type RelationshipResult,
  type BatchRelationshipOperation,
  type BatchRelationshipMergeOperation,
  type BatchRelationshipNodeMergeOperation,
  type RepositoryQueryOptions,
} from './lib/repositories/relationship/base-relationship.service';
export { RelationshipCoreRepository } from './lib/repositories/relationship/relationship-core.repository';
export { RelationshipBulkOperationsService } from './lib/repositories/relationship/relationship-bulk.service';

// ❌ REMOVED: RelationshipRepository - Use RelationshipCoreRepository instead

// Utils
export * from './lib/utils/parameter-serializer';

// Query Builder types are now exported above in the main Neogma integration section

// Constants
export * from './lib/constants/constants';

// Config Utilities
export {
  getNeo4jConfig,
  getNeo4jConfigWithDefaults,
  setNeo4jConfig,
  isNeo4jConfigured,
} from './lib/utils/neo4j-config.accessor';

// Neo4j CRUD Service (Composition Pattern for Repositories)
export {
  Neo4jCrudService,
  type FindOptions,
} from './lib/services/neo4j-crud.service';

// =============================================================================
// TYPEORM-STYLE REPOSITORY PATTERN (v2.0.0+)
// =============================================================================

/**
 * TypeORM-Style Auto-Generated Repositories
 *
 * These exports enable zero-boilerplate repository injection following
 * the same pattern as TypeORM/Mongoose:
 *
 * @example
 * ```typescript
 * // Simple CRUD (auto-generated repository)
 * @Module({
 *   imports: [Neo4jModule.forFeature([User, Post])]
 * })
 * export class UserModule {}
 *
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepository<User>
 *   ) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findById(id);  // Works immediately
 *   }
 * }
 *
 * // Custom repository (extends base class)
 * @Injectable()
 * export class UserRepository extends Neo4jRepository<User> {
 *   constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
 *     super(User, 'User', neogma, crud);
 *   }
 *
 *   async findByEmail(email: string) {
 *     const qb = this.createQueryBuilder();
 *     // ... custom query
 *   }
 * }
 * ```
 */

// Base Repository Class
export { Neo4jRepository as Neo4jRepositoryBase } from './lib/repositories/neo4j-repository';

// Injection Decorators
export {
  InjectRepository,
  getRepositoryToken,
  getEntityLabel,
} from './lib/decorators/inject-repository.decorator';

// =============================================================================
// EXAMPLES AND DOCUMENTATION
// =============================================================================

// // Query Builder Examples
// export type * from './lib/examples';
// export {
//   QUERY_BUILDER_EXAMPLES,
//   EXAMPLE_CATEGORIES,
//   type QueryBuilderExampleType,
//   type ExampleCategoryType,
// } from './lib/examples';
