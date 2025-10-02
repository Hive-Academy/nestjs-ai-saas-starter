/**
 * Neo4j Specialized Repository Framework
 *
 * This module provides specialized repository implementations for advanced graph operations.
 * For basic CRUD operations, use the @Repository decorator or entity CRUD decorators instead.
 *
 * Graph Repository:
 * - Graph traversals and path finding
 * - Relationship management
 * - Pattern matching
 * - Graph algorithms integration
 * - Centrality calculations
 * - Community detection
 *
 * Relationship Repository:
 * - CRUD operations for relationships
 * - Batch relationship operations
 * - Relationship traversal and queries
 * - Type-safe relationship handling
 * - Source and target node management
 *
 * For Basic CRUD Operations:
 * - Use @FindOne, @FindMany, @CreateEntity, @UpdateEntity, @DeleteEntity decorators
 * - Or use @Repository decorator for auto-generated repositories
 *
 * Features:
 * - Full TypeScript type safety
 * - Automatic query optimization
 * - Connection pool management
 * - Transaction support
 * - Caching integration
 * - Metrics collection
 */

// BaseRepository removed - use @Repository decorator instead
export { GraphRepository } from './graph-repository';

// Re-export graph types from graph-repository
export type {
  GraphTraversalOptions,
  GraphPattern,
  NeighborResult,
  PathResult,
  CentralityMetric,
  ConnectedComponent,
  GraphStatistics,
  CentralityResult,
  CommunityDetectionOptions,
  PathFindingOptions,
  GraphQueryPattern,
  SubgraphOptions,
  SubgraphResult,
  GraphCycle,
} from './graph-repository';

// Modern Graph Services (Post-Split Architecture)
export { BaseGraphService } from './graph/base-graph.service';
export { GraphTraversalService } from './graph/graph-traversal.service';
export { GraphMetricsService } from './graph/graph-metrics.service';
export { GraphPatternService } from './graph/graph-pattern.service';
export {
  RelationshipRepository,
  type RelationshipQueryOptions,
  type CreateRelationshipData,
  type RelationshipResult,
  type BatchRelationshipOperation,
} from './relationship/relationship-repository';

// Repository decorators
export * from './repository.decorator';
