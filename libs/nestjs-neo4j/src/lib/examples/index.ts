/**
 * @fileoverview Neo4j Examples Index
 * 
 * Comprehensive collection of Neo4j library examples organized by category.
 * Each category demonstrates specific aspects of the Neo4j integration.
 */

// Query Builder Examples
export * from './03-query-builder';

// Constraints and Schema Management Examples
export * from './09-constraints-and-schema';

// Re-export specific example categories for direct access
export { QUERY_BUILDER_EXAMPLES } from './03-query-builder';
export { 
  CONSTRAINT_EXAMPLE_CATEGORIES,
  CONSTRAINT_USAGE_PATTERNS,
  PRODUCTION_CHECKLIST,
  CONSTRAINT_PATTERNS_BY_USE_CASE,
  PERFORMANCE_GUIDELINES
} from './09-constraints-and-schema';

/**
 * Neo4j Library Examples Overview
 * 
 * This module provides extensive examples for the @hive-academy/nestjs-neo4j library,
 * organized into focused categories:
 * 
 * ## Available Example Categories
 * 
 * ### 03-query-builder/
 * Advanced query construction patterns using the fluent Query Builder API:
 * - Basic query patterns and type safety
 * - Typed query building with compile-time validation
 * - Advanced graph operations and analytics
 * - Dynamic query construction based on runtime conditions
 * - Integration with @CypherQuery decorators
 * - Production-grade business logic and performance patterns
 * 
 * ### 09-constraints-and-schema/
 * Comprehensive constraint and schema management examples:
 * - Database constraints (@Index, @NotNull, @NodeKey, @Unique)
 * - Custom validation patterns with @Validate decorator
 * - Constraint service usage and programmatic management
 * - Production schema management and versioning strategies
 * 
 * ## Getting Started
 * 
 * Each example category contains detailed implementations with:
 * - Comprehensive code examples
 * - Type-safe patterns and best practices
 * - Integration with NestJS decorators and services
 * - Real-world business scenarios
 * - Performance optimization techniques
 * - Error handling and validation patterns
 * 
 * ## Usage Patterns
 * 
 * ### Query Builder Examples
 * ```typescript
 * import {
 *   BasicQueryBuilderService,
 *   TypedQueryBuilderService,
 *   DynamicQueryService,
 *   ProductionQueryService
 * } from '@hive-academy/nestjs-neo4j/examples';
 * 
 * @Module({
 *   providers: [
 *     BasicQueryBuilderService,
 *     TypedQueryBuilderService,
 *     DynamicQueryService,
 *     ProductionQueryService
 *   ]
 * })
 * export class ExamplesModule {}
 * ```
 * 
 * ### Direct Service Usage
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly queryBuilder: Neo4jQueryBuilder,
 *     private readonly basicExamples: BasicQueryBuilderService
 *   ) {}
 *   
 *   async findUsers() {
 *     // Use example patterns
 *     return await this.basicExamples.findActiveUsers();
 *   }
 *   
 *   async customQuery() {
 *     // Build your own queries using patterns from examples
 *     return this.queryBuilder
 *       .match('u', () => User, { isActive: true })
 *       .orderBy('u.firstName', 'ASC')
 *       .return('u')
 *       .build();
 *   }
 * }
 * ```
 * 
 * ## Learning Path
 * 
 * 1. **Start with Basic Examples**: Learn fundamental query construction
 * 2. **Explore Typed Patterns**: Understand type-safe query building
 * 3. **Study Advanced Operations**: Master complex graph operations
 * 4. **Implement Dynamic Queries**: Build flexible search interfaces
 * 5. **Integrate with Decorators**: Combine with NestJS patterns
 * 6. **Apply Production Patterns**: Implement enterprise-grade solutions
 * 
 * Each category builds upon the previous, providing a comprehensive
 * learning experience for Neo4j development with NestJS.
 */

export const EXAMPLE_CATEGORIES = {
  queryBuilder: '03-query-builder',
  constraintsAndSchema: '09-constraints-and-schema'
} as const;

export type ExampleCategoryType = keyof typeof EXAMPLE_CATEGORIES;