/**
 * Neo4j Decorators - Enhanced Existing Decorators with Smart Defaults
 *
 * This module provides enhanced versions of existing Neo4j decorators with smart defaults
 * and better ergonomics while maintaining full backward compatibility.
 *
 * ## Enhanced Core Decorators
 * - @Neo4jEntity: Entity mapping with string shorthand and namespace helpers
 *   - NEW: @Neo4jEntity('User') string shorthand
 *   - NEW: @Neo4jEntity.Timestamped('User') helper methods
 *   - ENHANCED: Smart defaults for ID strategy and property
 * - @Neo4jProp: Property mapping with intelligent auto-detection
 *   - ENHANCED: Auto-detects timestamps (*At fields)
 *   - ENHANCED: Auto-detects emails, URLs, JSON fields
 *   - ENHANCED: Smart ID generation with crypto.randomUUID fallback
 *   - ENHANCED: Boolean and Number field transformation
 * - @Neo4jRelationship: Relationship mapping (unchanged)
 * - @Id, @CreatedAt, @UpdatedAt, @JsonProperty: Convenience decorators (unchanged)
 *
 * ## Query Decorators
 * - @CypherQuery: Type-safe Cypher query execution with simplified configuration
 * - @FindOne, @FindMany, @Create, @Update, @Delete: Semantic CRUD decorators
 *
 * ## Repository & Utility Decorators
 * - @Neo4jRepository: Repository pattern with auto-generated CRUD methods
 * - @Transactional: Transaction management
 * - @InjectNeo4j: Dependency injection
 * - @Safe: Unified validation and transformation
 *
 * ## Constraint Decorators (Re-exported from constraints module)
 * - @NotNull, @Required, @NotEmpty, @Unique, @PropIndex, @ClassIndex, @NodeKey, @Validate
 *
 * ## Key Features
 * - **BACKWARD COMPATIBLE**: All existing code continues to work unchanged
 * - **SMART DEFAULTS**: Automatic detection of common patterns
 * - **STRING SHORTHANDS**: Simpler syntax for common cases
 * - **NAMESPACE HELPERS**: Predefined configurations for common entity types
 * - **ZERO NEW DECORATORS**: Only enhanced existing ones
 * - **TYPE SAFETY**: Complete TypeScript support with proper inference
 * - **PRODUCTION READY**: Comprehensive error handling and validation
 */

// Metadata interfaces and types
export * from '../interfaces/decorator-metadata.interface';

// ENHANCED: Entity mapping decorators (existing decorators with smart defaults)
export * from './entity.decorator';

// Safety and validation decorators
export * from './safe.decorator';

// Query decorators (enhanced existing @CypherQuery)
export * from './cypher-query.decorator';

// Utility decorators
export * from './inject-neo4j.decorator';
export * from './transactional.decorator';

// Constraint decorators (re-exported for convenience)
export * from '../constraints';
