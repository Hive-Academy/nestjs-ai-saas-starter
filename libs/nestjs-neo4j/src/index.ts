// =============================================================================
// CORE EXPORTS (Backward Compatible with Enhanced Features)
// =============================================================================

// Module
export * from './lib/neo4j.module';

// Services (now include all enhanced features)
export * from './lib/services/neo4j.service';
export * from './lib/services/neo4j-connection.service';
export * from './lib/services/neo4j-health.service';

// Interfaces (includes enhanced interfaces)
export type * from './lib/interfaces/neo4j-module-options.interface';
export type * from './lib/interfaces/neo4j-connection.interface';
export type * from './lib/interfaces/query-result.interface';

// Decorators
export * from './lib/decorators/inject-neo4j.decorator';
export * from './lib/decorators/transactional.decorator';
export * from './lib/decorators/neo4j-safe.decorator';
export * from './lib/decorators/validate-neo4j-params.decorator';

// Enhanced Decorator Framework
export * from './lib/decorators/enhanced/cypher-query.decorator';
export * from './lib/decorators/enhanced/repository.decorator';
export * from './lib/decorators/enhanced/entity.decorator';
export type * from './lib/decorators/enhanced/decorator-metadata.interface';

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
// TYPE EXPORTS FOR ENHANCED FEATURES
// =============================================================================

// Enhanced Query Types
export type {
  EnhancedQueryOptions,
  EnhancedQueryResult,
  QueryMetrics,
  ConnectionPoolMetrics,
  EnhancedHealthIndicator,
  ComprehensiveMetrics,
} from './lib/interfaces/query-result.interface';

// Explicitly re-export transaction options to avoid conflicts
export type { TransactionOptions as BasicTransactionOptions } from './lib/interfaces/neo4j-connection.interface';
export type { EnhancedTransactionOptions } from './lib/decorators/enhanced/decorator-metadata.interface';

// =============================================================================
// CONVENIENCE RE-EXPORTS FOR COMMON USE CASES
// =============================================================================

// Enhanced Decorator Shortcuts
export {
  CypherQuery,
  Query,
  FindOne,
  FindMany,
  Create,
  Update,
  Delete,
} from './lib/decorators/enhanced/cypher-query.decorator';

export {
  Neo4jRepository,
  Repository,
} from './lib/decorators/enhanced/repository.decorator';

export {
  Neo4jEntity,
  Neo4jProperty,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
} from './lib/decorators/enhanced/entity.decorator';

// Repository Shortcuts
export {
  BaseRepository,
  GraphRepository,
  RelationshipRepository,
} from './lib/repositories/index';
