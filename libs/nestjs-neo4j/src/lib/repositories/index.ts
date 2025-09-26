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
export {
  GraphRepository,
  type GraphTraversalOptions,
  type ShortestPathOptions,
  type ClusteringOptions,
  type GraphPattern,
} from './graph-repository';
export {
  RelationshipRepository,
  type RelationshipQueryOptions,
  type CreateRelationshipData,
  type RelationshipResult,
  type BatchRelationshipOperation,
} from './relationship-repository';


// Repository decorators
export * from './repository.decorator';
