/**
 * @fileoverview Typed Query Builder Examples
 * 
 * Demonstrates entity-specific query building with TypeScript type inference
 * and validation. Shows compile-time safety for property access and
 * integration with entity decorators.
 */

import { Injectable } from '@nestjs/common';
import { TypedQueryBuilder, Neo4jQueryBuilder } from '../../query-builder/neo4j-query-builder';
import { Neo4jEntity } from '../../decorators/entity.decorator';
import type { Neo4jCompatibleEntity } from '../../types/neo4j-types';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { User } from '../shared/entities/basic/user.entity';

/**
 * Additional entity type for profile examples
 * 
 * Note: Using proper decorated entity class for User from shared entities.
 * The User class includes proper Date types and JsonProperty decorators for complex objects.
 */
export class UserProfile {
  id?: string;
  userId: string;
  displayName: string;
  bio?: string;
  website?: string;
  location?: string;
  birthDate?: Date;
  avatar?: string;
  socialMedia: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  privacy: {
    profileVisible: boolean;
    contactVisible: boolean;
  };
  updatedAt?: Date;
}

@Neo4jEntity('Company')
export class Company {
  id?: string;
  name: string;
  industry: string;
  foundedYear: number;
  employees: number;
  headquarters: string;
  website: string;
  description: string;
  isPublic: boolean;
  revenue?: number;
  tags: string[];
  createdAt?: Date;
}

/**
 * Typed Query Builder Service
 * 
 * Demonstrates entity-specific query building with full type safety:
 * - TypedQueryBuilder class usage
 * - Compile-time property validation
 * - Type inference for results
 * - Integration with entity definitions
 */
@Injectable()
export class TypedQueryBuilderService {
  constructor(
    private readonly queryBuilder: Neo4jQueryBuilder,
    private readonly userQueryBuilder: TypedQueryBuilder<User>,
    private readonly profileQueryBuilder: TypedQueryBuilder<UserProfile>,
    private readonly companyQueryBuilder: TypedQueryBuilder<Company>
  ) {}

  // ============================================================================
  // 1. TYPED QUERY BUILDER FUNDAMENTALS
  // ============================================================================

  /**
   * Basic typed entity querying
   * Shows TypedQueryBuilder.matchEntity() method
   */
  @CypherQuery({ cache: '5m', description: 'Find users with typed builder' })
  async findUsersTyped() {
    return this.userQueryBuilder
      .matchEntity('u', { isActive: true })
      .orderBy('u.firstName', 'ASC')
      .return('u')
      .build();
  }

  /**
   * Type-safe property access with IntelliSense
   * Demonstrates compile-time property validation
   */
  @CypherQuery({ cache: '10m', description: 'Find user by email with type safety' })
  async findUserByEmailTyped(email: string) {
    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.email', '=', email)              // ✅ Type-safe property access
      .and('u.isActive', '=', true)              // ✅ Boolean type validation
      .return('u')
      .build();
  }

  /**
   * Complex property filtering with nested objects
   * Shows handling of nested property types
   */
  @CypherQuery({ cache: '5m', description: 'Filter users by preferences' })
  async findUsersByPreferences(theme: 'light' | 'dark', notifications: boolean) {
    return this.userQueryBuilder
      .matchEntity('u', { isActive: true })
      .whereRaw('u.preferences.theme = $theme AND u.preferences.notifications = $notifications', {
        theme,
        notifications
      })
      .orderBy('u.firstName', 'ASC')
      .return('u')
      .build();
  }

  // ============================================================================
  // 2. ENTITY CREATION WITH TYPE SAFETY
  // ============================================================================

  /**
   * Type-safe entity creation
   * Demonstrates TypedQueryBuilder.createEntity() method
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Create user with type safety' })
  async createUserTyped(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const userId = `user_${Date.now()}`;
    const timestamp = new Date();

    return this.userQueryBuilder
      .createEntity('u', {
        ...userData,
        id: userId,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .return('u')
      .build();
  }

  /**
   * Bulk entity creation with validation
   * Shows batch creation with type constraints
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Bulk create users' })
  async bulkCreateUsers(users: Array<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>) {
    const timestamp = new Date().toISOString();
    
    const usersWithIds = users.map((user, index) => ({
      ...user,
      id: `user_${Date.now()}_${index}`,
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    return this.queryBuilder
      .raw('UNWIND $users as userData')
      .raw('CREATE (u:User)')
      .set('u = userData')
      .return('u')
      .build();
  }

  // ============================================================================
  // 3. MULTI-ENTITY TYPE-SAFE QUERIES
  // ============================================================================

  /**
   * Join queries with multiple typed entities
   * Demonstrates cross-entity type safety
   */
  @CypherQuery({ cache: '5m', description: 'Users with profiles typed' })
  async getUsersWithProfilesTyped() {
    // Note: Using generic builder for multi-entity queries
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .optionalMatch('(u)-[:HAS_PROFILE]->(p:UserProfile)')
      .return(`
        u {
          .id,
          .email,
          .firstName,
          .lastName,
          .role
        } as user,
        p {
          .displayName,
          .bio,
          .website,
          .location
        } as profile
      `)
      .orderBy('u.firstName', 'ASC')
      .build();
  }

  /**
   * Complex relationship queries with type validation
   * Shows company-employee relationships with type safety
   */
  @CypherQuery({ cache: '10m', description: 'Company employees with types' })
  async getCompanyEmployeesTyped(companyId: string) {
    return this.queryBuilder
      .match('c', () => Company)
      .where('c.id', '=', companyId)
      .relationship('c', 'EMPLOYS', 'OUT', 'u', () => User)
      .and('u.isActive', '=', true)
      .return(`
        c {
          .id,
          .name,
          .industry,
          .employees as employeeCount
        } as company,
        COLLECT(
          u {
            .id,
            .firstName,
            .lastName,
            .email,
            .role
          }
        ) as employees
      `)
      .build();
  }

  // ============================================================================
  // 4. ADVANCED TYPE-SAFE FILTERING
  // ============================================================================

  /**
   * Complex filtering with type constraints
   * Demonstrates advanced WHERE conditions with type safety
   */
  @CypherQuery({ cache: '5m', description: 'Advanced user filtering' })
  async advancedUserFiltering(filters: {
    roles?: User['role'][];
    isActive?: boolean;
    lastLoginAfter?: string;
    emailVerified?: boolean;
    minEmployees?: number; // For company filtering
  }) {
    let builder = this.userQueryBuilder.matchEntity('u');

    // Apply filters conditionally with type safety
    if (filters.roles && filters.roles.length > 0) {
      builder = builder.whereRaw('u.role IN $roles', { roles: filters.roles });
    }

    if (filters.isActive !== undefined) {
      builder = builder.and('u.isActive', '=', filters.isActive);
    }

    if (filters.lastLoginAfter) {
      builder = builder.and('u.lastLoginAt', '>=', filters.lastLoginAfter);
    }

    if (filters.emailVerified !== undefined) {
      builder = builder.whereRaw('u.metadata.emailVerified = $emailVerified', {
        emailVerified: filters.emailVerified
      });
    }

    return builder
      .orderByMultiple([
        { property: 'u.role', direction: 'ASC' },
        { property: 'u.firstName', direction: 'ASC' }
      ])
      .return('u')
      .build();
  }

  /**
   * Type-safe aggregation queries
   * Shows COUNT, AVG, SUM operations with proper types
   */
  @CypherQuery({ cache: '10m', description: 'User statistics with types' })
  async getUserStatistics() {
    return this.userQueryBuilder
      .matchEntity('u')
      .return(`
        COUNT(u) as totalUsers,
        COUNT(CASE WHEN u.isActive THEN 1 END) as activeUsers,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN u.role = 'moderator' THEN 1 END) as moderators,
        COUNT(CASE WHEN u.metadata.emailVerified THEN 1 END) as emailVerifiedUsers,
        AVG(CASE WHEN u.lastLoginAt IS NOT NULL 
            THEN duration.between(datetime(u.createdAt), datetime(u.lastLoginAt)).days 
            ELSE NULL END) as avgDaysToFirstLogin
      `)
      .build();
  }

  // ============================================================================
  // 5. TYPE-SAFE SEARCH AND INDEXING
  // ============================================================================

  /**
   * Full-text search with type safety
   * Demonstrates search across multiple fields with proper typing
   */
  @CypherQuery({ cache: '2m', description: 'Full-text user search' })
  async searchUsersFullText(searchTerm: string, limit = 20) {
    return this.userQueryBuilder
      .matchEntity('u', { isActive: true })
      .whereRaw(`
        u.firstName CONTAINS $searchTerm OR 
        u.lastName CONTAINS $searchTerm OR 
        u.email CONTAINS $searchTerm
      `, { searchTerm: searchTerm.toLowerCase() })
      .return(`
        u,
        (CASE 
          WHEN u.firstName CONTAINS $searchTerm THEN 3
          WHEN u.lastName CONTAINS $searchTerm THEN 2
          WHEN u.email CONTAINS $searchTerm THEN 1
          ELSE 0
        END) as relevanceScore
      `, { searchTerm: searchTerm.toLowerCase() })
      .raw('ORDER BY relevanceScore DESC, u.firstName ASC')
      .limit(limit)
      .build();
  }

  /**
   * Faceted search with type constraints
   * Shows category-based filtering with type safety
   */
  @CypherQuery({ cache: '5m', description: 'Faceted company search' })
  async searchCompaniesFaceted(criteria: {
    industry?: string;
    minEmployees?: number;
    maxEmployees?: number;
    foundedAfter?: number;
    isPublic?: boolean;
    tags?: string[];
  }) {
    let builder = this.companyQueryBuilder.matchEntity('c');

    if (criteria.industry) {
      builder = builder.where('c.industry', '=', criteria.industry);
    }

    if (criteria.minEmployees !== undefined) {
      builder = builder.and('c.employees', '>=', criteria.minEmployees);
    }

    if (criteria.maxEmployees !== undefined) {
      builder = builder.and('c.employees', '<=', criteria.maxEmployees);
    }

    if (criteria.foundedAfter) {
      builder = builder.and('c.foundedYear', '>=', criteria.foundedAfter);
    }

    if (criteria.isPublic !== undefined) {
      builder = builder.and('c.isPublic', '=', criteria.isPublic);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      builder = builder.whereRaw('ANY(tag IN $tags WHERE tag IN c.tags)', {
        tags: criteria.tags
      });
    }

    return builder
      .orderByMultiple([
        { property: 'c.employees', direction: 'DESC' },
        { property: 'c.name', direction: 'ASC' }
      ])
      .return('c')
      .build();
  }

  // ============================================================================
  // 6. TYPE-SAFE UPDATE OPERATIONS
  // ============================================================================

  /**
   * Type-safe property updates
   * Demonstrates SET operations with type validation
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Update user properties' })
  async updateUserPropertiesTyped(
    userId: string, 
    updates: Partial<Pick<User, 'firstName' | 'lastName' | 'preferences' | 'lastLoginAt'>>
  ) {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.id', '=', userId)
      .set(updateData)
      .return('u')
      .build();
  }

  /**
   * Conditional updates with type safety
   * Shows complex SET operations based on conditions
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Conditional user updates' })
  async conditionalUserUpdate(userId: string, loginTime: string) {
    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.id', '=', userId)
      .raw(`
        SET u.lastLoginAt = $loginTime,
            u.updatedAt = $timestamp,
            u.metadata.loginCount = COALESCE(u.metadata.loginCount, 0) + 1
      `, {
        loginTime,
        timestamp: new Date().toISOString()
      })
      .return('u')
      .build();
  }

  // ============================================================================
  // 7. TYPE-SAFE ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Complex analytics with type safety
   * Demonstrates advanced aggregations and calculations
   */
  @CypherQuery({ cache: '15m', description: 'User analytics dashboard' })
  async getUserAnalytics(dateRange: { start: string; end: string }) {
    return this.userQueryBuilder
      .matchEntity('u')
      .whereRaw('u.createdAt >= $startDate AND u.createdAt <= $endDate', {
        startDate: dateRange.start,
        endDate: dateRange.end
      })
      .return(`
        COUNT(u) as totalUsers,
        COUNT(CASE WHEN u.isActive THEN 1 END) as activeUsers,
        
        // Role distribution
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as adminCount,
        COUNT(CASE WHEN u.role = 'moderator' THEN 1 END) as moderatorCount,
        COUNT(CASE WHEN u.role = 'user' THEN 1 END) as userCount,
        
        // Verification stats
        COUNT(CASE WHEN u.metadata.emailVerified THEN 1 END) as emailVerifiedCount,
        COUNT(CASE WHEN u.metadata.phoneVerified THEN 1 END) as phoneVerifiedCount,
        
        // Activity metrics
        COUNT(CASE WHEN u.lastLoginAt IS NOT NULL THEN 1 END) as usersWithLogin,
        
        // Preference distribution
        COUNT(CASE WHEN u.preferences.theme = 'dark' THEN 1 END) as darkThemeUsers,
        COUNT(CASE WHEN u.preferences.notifications THEN 1 END) as notificationUsers
      `)
      .build();
  }

  /**
   * Cohort analysis with type safety
   * Shows time-based grouping and analysis
   */
  @CypherQuery({ cache: '30m', description: 'User cohort analysis' })
  async getUserCohorts() {
    return this.userQueryBuilder
      .matchEntity('u')
      .return(`
        substring(u.createdAt, 0, 7) as cohortMonth,
        COUNT(u) as totalUsers,
        COUNT(CASE WHEN u.isActive THEN 1 END) as activeUsers,
        ROUND(
          toFloat(COUNT(CASE WHEN u.isActive THEN 1 END)) / 
          toFloat(COUNT(u)) * 100, 
          2
        ) as retentionRate,
        
        // Role breakdown per cohort
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN u.role = 'moderator' THEN 1 END) as moderators,
        COUNT(CASE WHEN u.role = 'user' THEN 1 END) as regularUsers
      `)
      .raw('ORDER BY cohortMonth DESC')
      .build();
  }
}

/**
 * Type Safety Validation Examples
 * 
 * These examples demonstrate compile-time type checking
 * and show both correct and incorrect usage patterns.
 */
export class TypeSafetyValidationExamples {
  constructor(private readonly userBuilder: TypedQueryBuilder<User>) {}

  /**
   * Correct type-safe usage examples
   * These compile successfully with full type checking
   */
  correctUsageExamples() {
    // ✅ Valid property access
    const query1 = this.userBuilder
      .matchEntity('u')
      .where('u.email', '=', 'test@example.com')
      .and('u.isActive', '=', true)
      .and('u.role', '=', 'admin')
      .return('u')
      .build();

    // ✅ Valid nested property access via raw query
    const query2 = this.userBuilder
      .matchEntity('u')
      .whereRaw('u.preferences.theme = $theme', { theme: 'dark' })
      .return('u')
      .build();

    // ✅ Valid aggregation with proper types
    const query3 = this.userBuilder
      .matchEntity('u')
      .return('COUNT(u) as userCount, u.role as role')
      .build();

    return { query1, query2, query3 };
  }

  /**
   * Type validation demonstrations
   * These would cause TypeScript compilation errors if uncommented
   */
  typeValidationDemonstrations() {
    // ❌ These would cause compilation errors:
    
    // Invalid property names
    // this.userBuilder.where('u.invalidProperty', '=', 'value');
    
    // Invalid property types
    // this.userBuilder.where('u.isActive', '=', 'not-a-boolean');
    
    // Invalid role values
    // this.userBuilder.where('u.role', '=', 'invalid-role');
    
    // Invalid comparison operators for boolean
    // this.userBuilder.where('u.isActive', '>', true);
    
    return 'All type validation examples are commented out to prevent compilation errors';
  }

  /**
   * IntelliSense and autocompletion examples
   * Shows how IDE support works with typed builders
   */
  intelliSenseExamples() {
    return this.userBuilder
      .matchEntity('u')
      // IDE will show: id, email, firstName, lastName, role, isActive, etc.
      .where('u.', '=', '')  // Autocomplete available here
      // IDE will show: 'admin' | 'user' | 'moderator'
      .and('u.role', '=', '')  // Type-constrained values
      .return('u')
      .build();
  }
}

/**
 * Performance Optimization with Types
 * 
 * Shows how type safety enables better query optimization
 * and performance monitoring.
 */
export class TypedPerformanceExamples {
  constructor(
    private readonly userBuilder: TypedQueryBuilder<User>,
    private readonly queryBuilder: Neo4jQueryBuilder
  ) {}

  /**
   * Index-aware querying with type safety
   * Demonstrates queries optimized for known indexes
   */
  @CypherQuery({ cache: '10m', description: 'Index-optimized user lookup' })
  async indexOptimizedUserLookup(email: string) {
    // Assumes index on User.email
    return this.userBuilder
      .matchEntity('u', { email })  // Direct property match uses index
      .return('u')
      .build();
  }

  /**
   * Projection with type safety
   * Shows how to select only needed properties
   */
  @CypherQuery({ cache: '5m', description: 'Optimized user projection' })
  async optimizedUserProjection() {
    return this.userBuilder
      .matchEntity('u', { isActive: true })
      .return(`
        u.id as id,
        u.email as email,
        u.firstName as firstName,
        u.lastName as lastName,
        u.role as role
      `)  // Only return needed properties
      .orderBy('u.firstName', 'ASC')
      .build();
  }

  /**
   * Batch processing with type constraints
   * Shows efficient bulk operations with type safety
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Batch user processing' })
  async batchProcessUsers(userIds: string[], updates: Partial<User>) {
    return this.queryBuilder
      .raw('UNWIND $userIds as userId')
      .match('u', () => User)
      .where('u.id', '=', 'userId')
      .set(updates)
      .return('u.id as id, u.updatedAt as updatedAt')
      .build();
  }
}