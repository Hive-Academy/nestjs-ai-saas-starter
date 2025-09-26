/**
 * @fileoverview Basic Query Builder Examples
 *
 * Demonstrates fundamental query construction patterns using the Neo4j Query Builder.
 * Covers MATCH, WHERE, RETURN operations, parameter handling, and basic type safety.
 */

import { Injectable } from '@nestjs/common';
import { Neo4jQueryBuilder, createQueryBuilder } from '../../query-builder/neo4j-query-builder';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { User } from '../shared/entities/basic/user.entity';
import { Post } from '../shared/entities/intermediate/post.entity';

/**
 * Basic Query Builder Service
 *
 * Demonstrates fundamental query building patterns including:
 * - Simple MATCH operations with decorated entity classes
 * - WHERE clause construction with type safety
 * - Parameter handling and injection safety
 * - Basic filtering and sorting with proper Date types
 * 
 * Uses shared decorated entity classes instead of interfaces:
 * - User: From shared/entities/basic/user.entity.ts (proper Date types)
 * - Post: From shared/entities/intermediate/post.entity.ts (JsonProperty for complex objects)
 */
@Injectable()
export class BasicQueryBuilderService {
  constructor(private readonly queryBuilder: Neo4jQueryBuilder) {}

  // ============================================================================
  // 1. BASIC MATCH OPERATIONS
  // ============================================================================

  /**
   * Simple entity matching with type safety
   * Demonstrates basic MATCH and RETURN operations
   */
  @CypherQuery({ cache: '5m', description: 'Find all active users' })
  async findActiveUsers() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .return('u')
      .build();
  }

  /**
   * Find entities by specific property
   * Shows parameter injection and type-safe property access
   */
  @CypherQuery({ cache: '10m', description: 'Find user by email' })
  async findUserByEmail(email: string) {
    return this.queryBuilder
      .match<User>('u', () => User)
      .where('u.email', '=', email)
      .return('u')
      .build();
  }

  /**
   * Multiple property matching
   * Demonstrates compound WHERE conditions
   */
  @CypherQuery({ cache: '5m', description: 'Find users by role and status' })
  async findUsersByRoleAndStatus(role: User['role'], isActive: boolean) {
    return this.queryBuilder
      .match<User>('u', () => User)
      .where('u.role', '=', role)
      .and('u.isActive', '=', isActive)
      .return('u')
      .build();
  }

  // ============================================================================
  // 2. WHERE CLAUSE PATTERNS
  // ============================================================================

  /**
   * String matching operations
   * Shows different string comparison operators
   */
  @CypherQuery({ cache: '3m', description: 'Search users by name pattern' })
  async searchUsersByName(searchTerm: string) {
    return this.queryBuilder
      .match('u', () => User)
      .where('u.firstName', 'CONTAINS', searchTerm)
      .or('u.lastName', 'CONTAINS', searchTerm)
      .and('u.isActive', '=', true)
      .return('u')
      .build();
  }

  /**
   * Numeric comparisons
   * Demonstrates range queries and numeric operators
   */
  @CypherQuery({ cache: '5m', description: 'Find posts by title length' })
  async findPostsByTitleLength(minLength: number, maxLength: number) {
    return this.queryBuilder
      .match('p', () => Post)
      .whereRaw('size(p.title) >= $minLength AND size(p.title) <= $maxLength', {
        minLength,
        maxLength
      })
      .and('p.published', '=', true)
      .return('p')
      .build();
  }

  /**
   * Date-based filtering
   * Shows date comparison operations
   */
  @CypherQuery({ cache: '5m', description: 'Find recent posts' })
  async findRecentPosts(daysBack = 7) {
    const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000)).toISOString();

    return this.queryBuilder
      .match('p', () => Post)
      .where('p.createdAt', '>=', cutoffDate)
      .and('p.published', '=', true)
      .orderBy('p.createdAt', 'DESC')
      .return('p')
      .build();
  }

  // ============================================================================
  // 3. SORTING AND PAGINATION
  // ============================================================================

  /**
   * Basic sorting operations
   * Demonstrates ORDER BY with type safety
   */
  @CypherQuery({ cache: '5m', description: 'List users sorted by name' })
  async listUsersSortedByName() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .orderByMultiple([
        { property: 'u.firstName', direction: 'ASC' },
        { property: 'u.lastName', direction: 'ASC' }
      ])
      .return('u')
      .build();
  }

  /**
   * Paginated results
   * Shows SKIP and LIMIT for pagination
   */
  @CypherQuery({ cache: '2m', description: 'Get paginated user list' })
  async getPaginatedUsers(page = 1, pageSize = 10) {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .orderBy('u.createdAt', 'DESC')
      .paginate(page, pageSize)
      .return('u')
      .build();
  }

  /**
   * Count operations for pagination
   * Demonstrates COUNT function usage
   */
  @CypherQuery({ cache: '5m', description: 'Count total active users' })
  async countActiveUsers() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .return('COUNT(u) as totalUsers')
      .build();
  }

  // ============================================================================
  // 4. PARAMETER HANDLING AND SAFETY
  // ============================================================================

  /**
   * Safe parameter injection
   * Shows how the query builder prevents injection attacks
   */
  @CypherQuery({ safe: true, description: 'Search with safe parameter handling' })
  async safeSearch(searchTerms: string[]) {
    const builder = this.queryBuilder
      .match('u', () => User)
      .where('u.isActive', '=', true);

    // Build dynamic OR conditions safely
    searchTerms.forEach((term, index) => {
      if (index === 0) {
        builder.and('u.firstName', 'CONTAINS', term);
      } else {
        builder.or('u.firstName', 'CONTAINS', term);
      }
    });

    return builder
      .orderBy('u.firstName', 'ASC')
      .limit(20)
      .return('u')
      .build();
  }

  /**
   * Complex parameter patterns
   * Demonstrates handling of complex data structures
   */
  @CypherQuery({ cache: false, description: 'Filter posts by tags' })
  async findPostsByTags(tags: string[], matchAll = false) {
    if (matchAll) {
      // All tags must be present
      return this.queryBuilder
        .match('p', () => Post)
        .whereRaw('ALL(tag IN $tags WHERE tag IN p.tags)', { tags })
        .and('p.published', '=', true)
        .return('p')
        .build();
    } else {
      // Any tag matches
      return this.queryBuilder
        .match('p', () => Post)
        .whereRaw('ANY(tag IN $tags WHERE tag IN p.tags)', { tags })
        .and('p.published', '=', true)
        .return('p')
        .build();
    }
  }

  // ============================================================================
  // 5. RETURN PATTERNS
  // ============================================================================

  /**
   * Multiple return values
   * Shows returning multiple entities and computed values
   */
  @CypherQuery({ cache: '5m', description: 'Get user with post count' })
  async getUsersWithPostCounts() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .optionalMatch('(u)-[:AUTHORED]->(p:Post {published: true})')
      .return('u, COUNT(p) as postCount')
      .orderBy('postCount', 'DESC')
      .build();
  }

  /**
   * Distinct results
   * Demonstrates RETURN DISTINCT usage
   */
  @CypherQuery({ cache: '10m', description: 'Get distinct user roles' })
  async getDistinctUserRoles() {
    return this.queryBuilder
      .match('u', () => User)
      .returnDistinct('u.role')
      .orderBy('u.role', 'ASC')
      .build();
  }

  /**
   * Conditional returns with computed fields
   * Shows complex return expressions
   */
  @CypherQuery({ cache: '3m', description: 'Get users with computed fields' })
  async getUsersWithComputedFields() {
    return this.queryBuilder
      .match('u', () => User)
      .return(`
        u.id as id,
        u.email as email,
        u.firstName + ' ' + u.lastName as fullName,
        u.role as role,
        u.isActive as isActive,
        CASE u.role
          WHEN 'admin' THEN true
          ELSE false
        END as isAdmin
      `)
      .orderBy('u.firstName', 'ASC')
      .build();
  }

  // ============================================================================
  // 6. QUERY BUILDER UTILITY METHODS
  // ============================================================================

  /**
   * Query builder cloning
   * Shows how to reuse query patterns
   */
  @CypherQuery({ cache: '5m', description: 'Reusable query patterns' })
  async demonstrateQueryCloning(includeInactive = false) {
    // Base query for active users
    const baseQuery = this.queryBuilder
      .match('u', () => User)
      .where('u.isActive', '=', true);

    if (includeInactive) {
      // Clone and modify for different conditions
      const modifiedQuery = baseQuery.clone()
        .reset()
        .match('u', () => User)
        .orderBy('u.createdAt', 'DESC');

      return modifiedQuery.return('u').build();
    }

    return baseQuery
      .orderBy('u.firstName', 'ASC')
      .return('u')
      .build();
  }

  /**
   * Raw Cypher integration
   * Shows how to mix query builder with raw Cypher when needed
   */
  @CypherQuery({ cache: '5m', description: 'Mixed query builder and raw Cypher' })
  async complexAnalyticsQuery() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .raw('OPTIONAL MATCH (u)-[:AUTHORED]->(p:Post)')
      .raw('WHERE p.published = true OR p IS NULL')
      .with('u, COLLECT(p) as posts')
      .return(`
        u.id as userId,
        u.firstName + ' ' + u.lastName as userName,
        u.role as userRole,
        SIZE(posts) as totalPosts,
        SIZE([p IN posts WHERE p.createdAt >= $recentCutoff]) as recentPosts
      `, {
        recentCutoff: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .orderBy('totalPosts', 'DESC')
      .build();
  }

  // ============================================================================
  // 7. DEBUGGING AND DEVELOPMENT HELPERS
  // ============================================================================

  /**
   * Query inspection and debugging
   * Shows how to inspect built queries during development
   */
  async inspectQuery(userId: string) {
    const query = this.queryBuilder
      .match('u', () => User)
      .where('u.id', '=', userId)
      .return('u')
      .build();

    // Log the built query for debugging
    console.log('Generated Query:', query.query);
    console.log('Parameters:', query.params);

    return query;
  }

  /**
   * Query string representation
   * Demonstrates toString() method for development
   */
  getQueryString(email: string): string {
    const builder = this.queryBuilder
      .match('u', () => User)
      .where('u.email', '=', email)
      .return('u');

    // Get query string without building (useful for debugging)
    return builder.toString();
  }

  // ============================================================================
  // 8. FACTORY FUNCTION EXAMPLES
  // ============================================================================

  /**
   * Using createQueryBuilder factory function
   * Alternative to injected query builder
   */
  @CypherQuery({ cache: '5m', description: 'Factory function example' })
  async factoryFunctionExample() {
    // Create a new builder instance
    const builder = createQueryBuilder<User>();

    return builder
      .match('u', () => User)
      .where('u.isActive', '=', true)
      .orderBy('u.createdAt', 'DESC')
      .limit(10)
      .return('u')
      .build();
  }
}

/**
 * Example Usage Patterns
 *
 * This section demonstrates how to use the BasicQueryBuilderService
 * in different contexts within a NestJS application.
 */
export class QueryBuilderUsageExamples {
  constructor(private readonly queryService: BasicQueryBuilderService) {}

  /**
   * Basic usage in a controller
   */
  async getUsersByRole(role: User['role']) {
    const result = await this.queryService.findUsersByRoleAndStatus(role, true);
    return result;
  }

  /**
   * Pagination example
   */
  async getUserPage(page: number, limit: number) {
    const [users, total] = await Promise.all([
      this.queryService.getPaginatedUsers(page, limit),
      this.queryService.countActiveUsers()
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total: (total as any)[0]?.totalUsers || 0,
        hasMore: page * limit < ((total as any)[0]?.totalUsers || 0)
      }
    };
  }

  /**
   * Search functionality
   */
  async searchUsers(searchTerm: string) {
    if (searchTerm.length < 2) {
      throw new Error('Search term must be at least 2 characters');
    }

    return await this.queryService.searchUsersByName(searchTerm);
  }
}

/**
 * Type Safety Demonstrations
 *
 * These examples show how TypeScript provides compile-time safety
 * when using the query builder.
 */
export class TypeSafetyExamples {
  constructor(private readonly queryBuilder: Neo4jQueryBuilder) {}

  /**
   * Compile-time type checking for properties
   */
  goodExample() {
    return this.queryBuilder
      .match('u', () => User)
      .where('u.email', '=', 'test@example.com')      // ✅ Valid property
      .and('u.isActive', '=', true)                   // ✅ Valid property and type
      .orderBy('u.firstName', 'ASC')                  // ✅ Valid property
      .return('u')
      .build();
  }

  /**
   * Examples that would cause TypeScript compilation errors
   * (These are commented out to prevent actual compilation errors)
   */
  badExamples() {
    return this.queryBuilder
      .match('u', () => User)
      // .where('u.invalidProperty', '=', 'test')     // ❌ Property doesn't exist
      // .and('u.isActive', '=', 'not-boolean')      // ❌ Wrong type
      // .orderBy('u.nonExistentField', 'ASC')       // ❌ Invalid property
      .return('u')
      .build();
  }
}
