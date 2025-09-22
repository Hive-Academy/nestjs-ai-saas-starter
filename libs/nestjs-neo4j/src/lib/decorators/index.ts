/**
 *  Neo4j Decorators
 *
 * This module provides a comprehensive decorator ecosystem for Neo4j integration:
 *
 * Query Decorators:
 * - @CypherQuery: Type-safe Cypher query execution with caching and retry
 * - @Query: Simplified query decorator
 * - @FindOne, @FindMany, @Create, @Update, @Delete: Semantic CRUD decorators
 *
 * Repository Decorators:
 * - @Neo4jRepository: Repository pattern with auto-generated CRUD methods
 * - @Repository: Simplified repository decorator
 *
 * Entity Decorators:
 * - @Neo4jEntity: Entity mapping with flexible configuration
 * - @Neo4jProperty: Property mapping with transformation support
 * - @Neo4jRelationship: Relationship mapping with type safety
 * - @Id, @CreatedAt, @UpdatedAt, @JsonProperty: Convenience property decorators
 *
 * Features:
 * - Full TypeScript type safety
 * - Automatic parameter validation
 * - Query caching and retry mechanisms
 * - Performance profiling and metrics
 * - Transaction support
 * - Error handling and recovery
 */

// Metadata interfaces and types
export * from './decorator-metadata.interface';

// Query decorators
export * from './cypher-query.decorator';

// Repository decorators
export * from './repository.decorator';

// Entity mapping decorators
export * from './entity.decorator';
