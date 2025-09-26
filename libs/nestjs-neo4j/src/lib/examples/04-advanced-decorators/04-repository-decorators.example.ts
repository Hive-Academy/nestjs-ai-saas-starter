/**
 * @fileoverview Advanced Repository Decorator Examples
 *
 * This file demonstrates comprehensive usage patterns for @Repository and @Neo4jRepository decorators including:
 * - Auto-generated repository methods with customization
 * - Custom repository patterns and specialized operations
 * - Repository composition and service layer integration
 * - Performance optimization and caching strategies
 * - Multi-tenant repository patterns
 *
 * Real-world scenarios covered:
 * - E-commerce product management with complex relationships
 * - User account management with role-based access
 * - Content management with versioning
 * - Analytics and reporting repositories
 * - Multi-tenant SaaS data access patterns
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Repository,
  Neo4jRepository,
  Safe,
  Transactional,
  CypherQuery,
  InjectNeo4j,
  Neo4jService,
  type FindAllOptions,
  type QueryResult
} from '../../../index';
import type { User, Product, Order, Review, Category, Brand } from '../02-entities-and-relationships/types';

/**
 * Basic Product Repository with auto-generated CRUD methods
 * Demonstrates simple repository pattern with @Repository decorator
 */
@Repository(() => Product)
export class BasicProductRepository {
  // Auto-generated methods available:
  // - findById(id: string): Promise<Product | null>
  // - findAll(options?: FindAllOptions): Promise<Product[]>
  // - create(data: Partial<Product>): Promise<Product>
  // - update(id: string, updates: Partial<Product>): Promise<Product>
  // - delete(id: string): Promise<boolean>
  // - count(where?: Record<string, any>): Promise<number>
  // - exists(id: string): Promise<boolean>

  private readonly logger = new Logger(BasicProductRepository.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Custom method extending auto-generated functionality
   * Find products by category with relationship data
   */
  @Safe()
  async findByCategory(categoryId: number, includeInactive = false): Promise<Product[]> {
    this.logger.log(`Finding products in category ${categoryId}, includeInactive: ${includeInactive}`);

    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (c:Category {id: $categoryId})
        MATCH (p:Product)-[:BELONGS_TO]->(c)
        WHERE $includeInactive = true OR p.active = true

        OPTIONAL MATCH (p)<-[:REVIEWS]-(r:Review)

        RETURN p {
          .*,
          category: c.name,
          averageRating: avg(r.rating),
          reviewCount: count(r)
        } as product
        ORDER BY p.name ASC
      `, { categoryId, includeInactive });

      return result.records.map(record => record.get('product'));
    });
  }

  /**
   * Find products with advanced filtering
   * Combines auto-generated methods with custom logic
   */
  @Safe({
    rules: { maxDepth: 4, preventInjection: true }
  })
  async findWithFilters(filters: {
    category?: string;
    brand?: string;
    priceRange?: { min: number; max: number };
    inStock?: boolean;
    rating?: number;
    tags?: string[];
  }): Promise<Product[]> {
    // Use auto-generated findAll as base, then enhance
    let baseProducts = await this.findAll();

    // Apply custom filtering logic
    if (filters.priceRange) {
      baseProducts = baseProducts.filter(p =>
        p.price >= filters.priceRange!.min && p.price <= filters.priceRange!.max
      );
    }

    if (filters.inStock) {
      baseProducts = baseProducts.filter(p => p.inventory > 0);
    }

    // For complex filters, use custom Cypher
    if (filters.rating || filters.tags?.length) {
      return this.findWithComplexFilters(filters);
    }

    return baseProducts;
  }

  private async findWithComplexFilters(filters: any): Promise<Product[]> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (p:Product {active: true})

        // Rating filter
        ${filters.rating ? `
          OPTIONAL MATCH (p)<-[:REVIEWS]-(r:Review)
          WITH p, avg(r.rating) as avgRating
          WHERE avgRating >= $rating
        ` : ''}

        // Tags filter
        ${filters.tags?.length ? `
          WHERE ALL(tag IN $tags WHERE EXISTS((p)-[:TAGGED_WITH]->(:Tag {name: tag})))
        ` : ''}

        RETURN p as product
        ORDER BY p.createdAt DESC
      `, filters);

      return result.records.map(record => record.get('product'));
    });
  }
}

/**
 * Advanced User Repository with comprehensive customization
 * Demonstrates @Neo4jRepository with full configuration
 */
@Neo4jRepository({
  entityType: () => User,
  label: 'User',
  autoGenerate: true,
  description: 'Advanced user management repository with role-based access',
  tags: ['user', 'authentication', 'authorization'],
  defaultOptions: {
    cache: { enabled: true, ttl: 300000 }, // 5 minute cache
    retry: { enabled: true, attempts: 2 }
  }
})
export class AdvancedUserRepository {
  private readonly logger = new Logger(AdvancedUserRepository.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  // =============================================================================
  // ROLE-BASED ACCESS PATTERNS
  // =============================================================================

  /**
   * Find users by role with detailed information
   * Demonstrates repository method with relationship traversal
   */
  @Safe()
  @CypherQuery({
    cache: '10m',
    description: 'Find users by role with comprehensive profile data'
  })
  async findByRole(role: string): Promise<QueryResult> {
    return {
      query: `
        MATCH (u:User)-[:HAS_ROLE]->(r:Role {name: $role})
        WHERE u.active = true

        OPTIONAL MATCH (u)-[:BELONGS_TO]->(org:Organization)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(perm:Permission)
        OPTIONAL MATCH (u)-[:PLACED]->(order:Order)
        WHERE order.createdAt >= datetime() - duration({months: 6})

        RETURN u {
          .*,
          role: r.name,
          organization: org.name,
          permissions: collect(DISTINCT perm.name),
          recentOrderCount: count(DISTINCT order),
          profileCompleteness: (
            CASE WHEN u.email IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN u.phone IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN u.address IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN u.avatar IS NOT NULL THEN 1 ELSE 0 END
          ) * 25
        } as user
        ORDER BY u.createdAt DESC
      `,
      params: { role },
      description: `Users with role: ${role}`
    };
  }

  /**
   * Create user with role assignment and validation
   * Combines auto-generated create with business logic
   */
  @Safe({
    strict: true,
    rules: {
      preventInjection: true,
      maxDepth: 3
    }
  })
  @Transactional()
  async createUserWithRole(userData: {
    email: string;
    name: string;
    password: string;
    role: string;
    organizationId?: number;
    permissions?: string[];
    profile?: {
      bio?: string;
      avatar?: string;
      timezone?: string;
    };
  }): Promise<{
    user: User;
    roleAssigned: boolean;
    permissionsGranted: string[];
  }> {
    this.logger.log(`Creating user with role ${userData.role}: ${userData.email}`);

    // Validate role exists
    const roleExists = await this.validateRole(userData.role);
    if (!roleExists) {
      throw new BadRequestException(`Role '${userData.role}' does not exist`);
    }

    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        // Create user with basic info
        CREATE (u:User {
          id: randomUUID(),
          email: $email,
          name: $name,
          passwordHash: $password, // In reality, this should be hashed
          active: true,
          emailVerified: false,
          createdAt: datetime(),
          updatedAt: datetime(),
          profile: coalesce($profile, {})
        })

        // Assign role
        MATCH (r:Role {name: $role})
        CREATE (u)-[:HAS_ROLE {assignedAt: datetime()}]->(r)

        // Assign to organization if provided
        WITH u, r
        WHERE $organizationId IS NOT NULL
        MATCH (org:Organization {id: $organizationId})
        CREATE (u)-[:BELONGS_TO {joinedAt: datetime()}]->(org)

        // Assign permissions
        WITH u, r
        WHERE $permissions IS NOT NULL
        UNWIND $permissions as permName
        MATCH (p:Permission {name: permName})
        CREATE (u)-[:HAS_PERMISSION {grantedAt: datetime()}]->(p)

        // Get default role permissions
        OPTIONAL MATCH (r)-[:INCLUDES]->(defaultPerm:Permission)
        CREATE (u)-[:HAS_PERMISSION {
          grantedAt: datetime(),
          source: 'ROLE_DEFAULT'
        }]->(defaultPerm)

        // Return comprehensive user data
        MATCH (u)-[:HAS_ROLE]->(assignedRole:Role)
        OPTIONAL MATCH (u)-[:HAS_PERMISSION]->(userPerm:Permission)

        RETURN u {
          .*,
          role: assignedRole.name,
          permissions: collect(DISTINCT userPerm.name)
        } as user
      `, userData);

      const user = result.records[0].get('user');

      return {
        user,
        roleAssigned: true,
        permissionsGranted: user.permissions
      };
    });
  }

  /**
   * Update user profile with validation and audit trail
   * Extends auto-generated update method with business logic
   */
  @Safe()
  @Transactional()
  async updateProfile(userId: string, updates: {
    name?: string;
    email?: string;
    profile?: Record<string, any>;
    preferences?: Record<string, any>;
  }, updatedBy?: string): Promise<{
    user: User;
    changes: string[];
    auditLogId: string;
  }> {
    // First check if user exists using auto-generated method
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const changes: string[] = [];
    Object.keys(updates).forEach(key => {
      if (updates[key] !== existingUser[key]) {
        changes.push(key);
      }
    });

    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId})

        // Update fields
        SET u.name = coalesce($name, u.name),
            u.email = coalesce($email, u.email),
            u.profile = coalesce($profile, u.profile),
            u.preferences = coalesce($preferences, u.preferences),
            u.updatedAt = datetime()

        // Create audit log
        CREATE (audit:AuditLog {
          id: randomUUID(),
          entityType: 'User',
          entityId: u.id,
          action: 'UPDATE_PROFILE',
          changes: $changes,
          updatedBy: coalesce($updatedBy, 'SYSTEM'),
          timestamp: datetime(),
          previousData: {
            name: u.name,
            email: u.email,
            profile: u.profile
          }
        })

        CREATE (u)-[:HAS_AUDIT_LOG]->(audit)

        RETURN u as user, audit.id as auditLogId
      `, { userId, ...updates, changes, updatedBy });

      const record = result.records[0];
      return {
        user: record.get('user'),
        changes,
        auditLogId: record.get('auditLogId')
      };
    });
  }

  // =============================================================================
  // ADVANCED QUERY PATTERNS
  // =============================================================================

  /**
   * Find users with complex relationship patterns
   * Demonstrates advanced repository query capabilities
   */
  @Safe()
  async findUsersWithActivityPattern(pattern: {
    minOrders?: number;
    minReviews?: number;
    recentActivityDays?: number;
    excludeRoles?: string[];
  }): Promise<User[]> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (u:User {active: true})

        // Activity filters
        OPTIONAL MATCH (u)-[:PLACED]->(order:Order)
        ${pattern.recentActivityDays ? `
          WHERE order.createdAt >= datetime() - duration({days: $recentActivityDays})
        ` : ''}

        OPTIONAL MATCH (u)-[:WROTE]->(review:Review)
        ${pattern.recentActivityDays ? `
          WHERE review.createdAt >= datetime() - duration({days: $recentActivityDays})
        ` : ''}

        // Role exclusions
        ${pattern.excludeRoles?.length ? `
          WHERE NOT EXISTS((u)-[:HAS_ROLE]->(:Role {name: $excludeRole}))
        ` : ''}

        WITH u, count(DISTINCT order) as orderCount, count(DISTINCT review) as reviewCount
        WHERE ($minOrders IS NULL OR orderCount >= $minOrders)
          AND ($minReviews IS NULL OR reviewCount >= $minReviews)

        // Get user with activity metrics
        OPTIONAL MATCH (u)-[:HAS_ROLE]->(role:Role)

        RETURN u {
          .*,
          role: role.name,
          activityScore: (orderCount * 2) + reviewCount,
          orderCount: orderCount,
          reviewCount: reviewCount
        } as user
        ORDER BY orderCount + reviewCount DESC
      `, pattern);

      return result.records.map(record => record.get('user'));
    });
  }

  /**
   * Bulk user operations with validation
   * Demonstrates repository batch processing
   */
  @Safe({
    rules: {
      maxArrayLength: 1000,
      maxDepth: 3
    }
  })
  @Transactional()
  async bulkUpdateUsers(updates: Array<{
    userId: string;
    updates: Record<string, any>;
  }>): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: any[];
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const updateItem of updates) {
      try {
        results.processed++;

        // Use auto-generated update method
        const updated = await this.update(updateItem.userId, updateItem.updates);
        if (updated) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            userId: updateItem.userId,
            error: 'User not found'
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: updateItem.userId,
          error: error.message
        });
      }
    }

    return results;
  }

  private async validateRole(roleName: string): Promise<boolean> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (r:Role {name: $roleName, active: true})
        RETURN count(r) > 0 as exists
      `, { roleName });

      return result.records[0].get('exists');
    });
  }
}

/**
 * Content Repository with versioning support
 * Demonstrates specialized repository patterns
 */
@Neo4jRepository({
  entityType: () => Object, // Generic content entity
  label: 'Content',
  description: 'Content management repository with versioning',
  defaultOptions: {
    cache: { enabled: false }, // No caching for content operations
  }
})
export class ContentRepository {
  private readonly logger = new Logger(ContentRepository.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Create content with automatic versioning
   */
  @Safe()
  @Transactional()
  async createContent(contentData: {
    title: string;
    body: string;
    type: 'ARTICLE' | 'PAGE' | 'POST';
    authorId: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<{
    contentId: string;
    versionId: string;
    status: string;
  }> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        // Create main content node
        CREATE (c:Content {
          id: randomUUID(),
          title: $title,
          type: $type,
          status: 'DRAFT',
          createdAt: datetime(),
          updatedAt: datetime(),
          currentVersion: 1
        })

        // Create initial version
        CREATE (v:ContentVersion {
          id: randomUUID(),
          version: 1,
          title: $title,
          body: $body,
          metadata: coalesce($metadata, {}),
          createdAt: datetime(),
          isActive: true
        })

        // Link version to content
        CREATE (c)-[:HAS_VERSION]->(v)
        CREATE (c)-[:CURRENT_VERSION]->(v)

        // Link to author
        MATCH (author:User {id: $authorId})
        CREATE (c)-[:AUTHORED_BY]->(author)
        CREATE (v)-[:CREATED_BY]->(author)

        // Add tags if provided
        WITH c, v
        WHERE $tags IS NOT NULL
        UNWIND $tags as tagName
        MERGE (t:Tag {name: tagName})
        CREATE (c)-[:TAGGED_WITH]->(t)

        RETURN c.id as contentId, v.id as versionId, c.status as status
      `, contentData);

      const record = result.records[0];
      return {
        contentId: record.get('contentId'),
        versionId: record.get('versionId'),
        status: record.get('status')
      };
    });
  }

  /**
   * Update content with versioning
   */
  @Safe()
  @Transactional()
  async updateContent(contentId: string, updates: {
    title?: string;
    body?: string;
    metadata?: Record<string, any>;
  }, userId: string): Promise<{
    newVersionId: string;
    versionNumber: number;
  }> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (c:Content {id: $contentId})
        MATCH (c)-[:CURRENT_VERSION]->(currentVersion:ContentVersion)

        // Create new version
        CREATE (newVersion:ContentVersion {
          id: randomUUID(),
          version: currentVersion.version + 1,
          title: coalesce($title, currentVersion.title),
          body: coalesce($body, currentVersion.body),
          metadata: coalesce($metadata, currentVersion.metadata),
          createdAt: datetime(),
          isActive: true
        })

        // Update relationships
        SET currentVersion.isActive = false,
            c.currentVersion = newVersion.version,
            c.updatedAt = datetime()

        CREATE (c)-[:HAS_VERSION]->(newVersion)

        // Remove current version link and create new one
        MATCH (c)-[oldCurrent:CURRENT_VERSION]->()
        DELETE oldCurrent
        CREATE (c)-[:CURRENT_VERSION]->(newVersion)

        // Link to editor
        MATCH (editor:User {id: $userId})
        CREATE (newVersion)-[:CREATED_BY]->(editor)

        RETURN newVersion.id as versionId, newVersion.version as versionNumber
      `, { contentId, ...updates, userId });

      const record = result.records[0];
      return {
        newVersionId: record.get('versionId'),
        versionNumber: record.get('versionNumber')
      };
    });
  }

  /**
   * Get content with version history
   */
  @Safe()
  async getContentWithHistory(contentId: string): Promise<{
    content: any;
    currentVersion: any;
    versionHistory: any[];
  }> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (c:Content {id: $contentId})
        MATCH (c)-[:CURRENT_VERSION]->(current:ContentVersion)
        MATCH (c)-[:HAS_VERSION]->(version:ContentVersion)
        OPTIONAL MATCH (c)-[:AUTHORED_BY]->(author:User)
        OPTIONAL MATCH (version)-[:CREATED_BY]->(editor:User)

        WITH c, current, author,
             collect({
               id: version.id,
               version: version.version,
               title: version.title,
               createdAt: version.createdAt,
               isActive: version.isActive,
               editor: editor.name
             }) as versions

        RETURN c {
          .*,
          author: author.name
        } as content,
        current {
          .*
        } as currentVersion,
        versions as versionHistory
      `, { contentId });

      if (result.records.length === 0) {
        throw new NotFoundException(`Content with ID ${contentId} not found`);
      }

      const record = result.records[0];
      return {
        content: record.get('content'),
        currentVersion: record.get('currentVersion'),
        versionHistory: record.get('versionHistory')
      };
    });
  }
}

/**
 * Analytics Repository for reporting and metrics
 * Demonstrates specialized repository for read-only operations
 */
@Neo4jRepository({
  entityType: () => Object,
  label: 'Analytics',
  description: 'Analytics and reporting repository',
  autoGenerate: false, // No auto-generated methods needed
  defaultOptions: {
    cache: { enabled: true, ttl: 600000 }, // 10 minute cache for analytics
    accessMode: 'READ'
  }
})
export class AnalyticsRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Get user engagement metrics
   */
  @CypherQuery({
    cache: '15m',
    description: 'User engagement analytics'
  })
  async getUserEngagementMetrics(): Promise<QueryResult> {
    return {
      query: `
        MATCH (u:User {active: true})

        OPTIONAL MATCH (u)-[:PLACED]->(order:Order)
        WHERE order.createdAt >= datetime() - duration({days: 30})

        OPTIONAL MATCH (u)-[:WROTE]->(review:Review)
        WHERE review.createdAt >= datetime() - duration({days: 30})

        OPTIONAL MATCH (u)-[:VIEWED]->(view:ProductView)
        WHERE view.timestamp >= datetime() - duration({days: 30})

        WITH u,
             count(DISTINCT order) as recentOrders,
             count(DISTINCT review) as recentReviews,
             count(DISTINCT view) as recentViews,
             (count(DISTINCT order) * 3 + count(DISTINCT review) * 2 + count(DISTINCT view)) as engagementScore

        RETURN {
          totalUsers: count(u),
          activeUsers: size([user IN collect(u) WHERE user.lastLoginAt >= datetime() - duration({days: 7})]),
          engagementMetrics: {
            averageOrders: round(avg(recentOrders) * 100) / 100,
            averageReviews: round(avg(recentReviews) * 100) / 100,
            averageViews: round(avg(recentViews) * 100) / 100,
            averageEngagementScore: round(avg(engagementScore) * 100) / 100
          },
          segmentation: [
            {
              segment: 'HIGHLY_ENGAGED',
              count: size([score IN collect(engagementScore) WHERE score >= 20])
            },
            {
              segment: 'MODERATELY_ENGAGED',
              count: size([score IN collect(engagementScore) WHERE score >= 5 AND score < 20])
            },
            {
              segment: 'LOW_ENGAGEMENT',
              count: size([score IN collect(engagementScore) WHERE score < 5])
            }
          ],
          generatedAt: datetime()
        } as metrics
      `,
      params: {},
      description: 'Comprehensive user engagement analytics for the last 30 days'
    };
  }

  /**
   * Get product performance metrics
   */
  @CypherQuery({
    cache: '30m',
    description: 'Product performance analytics'
  })
  async getProductPerformanceMetrics(): Promise<QueryResult> {
    return {
      query: `
        MATCH (p:Product {active: true})

        OPTIONAL MATCH (p)<-[:FOR_PRODUCT]-(oi:OrderItem)-[:CONTAINED_IN]->(o:Order)
        WHERE o.createdAt >= datetime() - duration({days: 30})

        OPTIONAL MATCH (p)<-[:REVIEWS]-(r:Review)
        WHERE r.createdAt >= datetime() - duration({days: 30})

        OPTIONAL MATCH (p)<-[:TAGGED_WITH]-(t:Tag)

        WITH p,
             count(DISTINCT oi) as salesCount,
             sum(oi.quantity) as unitsSold,
             sum(oi.totalPrice) as revenue,
             avg(r.rating) as averageRating,
             count(DISTINCT r) as reviewCount,
             collect(DISTINCT t.name) as tags

        RETURN {
          totalProducts: count(p),
          salesMetrics: {
            totalSales: sum(salesCount),
            totalUnits: sum(unitsSold),
            totalRevenue: round(sum(revenue) * 100) / 100,
            averageOrderValue: round((sum(revenue) / sum(salesCount)) * 100) / 100
          },
          topPerformers: [
            product IN collect({
              id: p.id,
              name: p.name,
              sales: salesCount,
              revenue: revenue,
              rating: round(coalesce(averageRating, 0) * 10) / 10,
              reviewCount: reviewCount
            }) WHERE product.sales > 0
          ][0..10],
          categoryAnalysis: collect({
            category: p.category,
            productCount: count(p),
            avgRating: round(avg(averageRating) * 10) / 10,
            totalRevenue: round(sum(revenue) * 100) / 100
          }),
          generatedAt: datetime()
        } as metrics
      `,
      params: {},
      description: 'Product performance metrics for the last 30 days'
    };
  }
}

/**
 * Multi-tenant Repository demonstrating tenant isolation
 */
@Injectable()
export class MultiTenantRepository {
  private readonly logger = new Logger(MultiTenantRepository.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Create tenant-scoped entity
   */
  @Safe({
    rules: { preventInjection: true }
  })
  @Transactional()
  async createTenantEntity(
    tenantId: string,
    entityType: string,
    entityData: Record<string, any>
  ): Promise<any> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (t:Tenant {id: $tenantId, active: true})

        CREATE (e:${entityType} $entityData)
        SET e.id = randomUUID(),
            e.tenantId = t.id,
            e.createdAt = datetime()

        CREATE (t)-[:OWNS]->(e)

        RETURN e
      `, { tenantId, entityData });

      return result.records[0].get('e');
    });
  }

  /**
   * Find entities within tenant boundary
   */
  @Safe()
  async findTenantEntities(
    tenantId: string,
    entityType: string,
    filters?: Record<string, any>
  ): Promise<any[]> {
    return this.neo4j.read(async (session) => {
      let whereClause = '';
      const params = { tenantId };

      if (filters) {
        const conditions = Object.entries(filters).map(([key, value]) => {
          params[key] = value;
          return `e.${key} = $${key}`;
        });
        whereClause = `AND ${conditions.join(' AND ')}`;
      }

      const result = await session.run(`
        MATCH (t:Tenant {id: $tenantId})-[:OWNS]->(e:${entityType})
        WHERE true ${whereClause}
        RETURN e
        ORDER BY e.createdAt DESC
      `, params);

      return result.records.map(record => record.get('e'));
    });
  }
}

// Export all repositories for use in other modules
export {
  BasicProductRepository,
  AdvancedUserRepository,
  ContentRepository,
  AnalyticsRepository,
  MultiTenantRepository
};

/**
 * Repository Pattern Best Practices Summary:
 *
 * 1. **Auto-Generated Methods**:
 *    - Use @Repository for simple CRUD operations
 *    - Extend auto-generated methods with custom business logic
 *    - Override auto-generated methods when needed
 *
 * 2. **Configuration Strategy**:
 *    - Set appropriate caching policies per repository
 *    - Configure default options for consistent behavior
 *    - Use descriptive names and tags for documentation
 *
 * 3. **Custom Methods**:
 *    - Implement business-specific query methods
 *    - Use @Safe decorator for parameter validation
 *    - Combine auto-generated and custom methods effectively
 *
 * 4. **Transaction Management**:
 *    - Use @Transactional for multi-step operations
 *    - Handle rollbacks gracefully
 *    - Validate data before transactions
 *
 * 5. **Performance Optimization**:
 *    - Set appropriate cache TTLs
 *    - Use read/write access modes correctly
 *    - Implement efficient batch operations
 *
 * 6. **Multi-tenancy**:
 *    - Always scope queries to tenant boundaries
 *    - Validate tenant access before operations
 *    - Use consistent tenant isolation patterns
 */
