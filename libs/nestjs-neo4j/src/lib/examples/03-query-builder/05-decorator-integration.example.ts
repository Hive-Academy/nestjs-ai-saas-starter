/**
 * @fileoverview Query Builder with Decorator Integration Examples
 * 
 * Demonstrates seamless integration between the Neo4j Query Builder and
 * the @CypherQuery decorator, Entity CRUD decorators, repository patterns,
 * and service layer best practices.
 */

import { Injectable } from '@nestjs/common';
import { Neo4jQueryBuilder, TypedQueryBuilder, createQueryBuilder } from '../../query-builder/neo4j-query-builder';
import { UserProfile } from './02-typed-query-builder.example';
import type { Neo4jCompatibleEntity } from '../../types/neo4j-types';
import { CypherQuery, QueryResult } from '../../decorators/cypher-query.decorator';
import { User } from '../shared/entities/basic/user.entity';
import { Post } from '../shared/entities/intermediate/post.entity';

/**
 * Query Builder with Decorator Integration using Shared Entity Classes
 * 
 * Demonstrates proper integration of decorated entity classes with Query Builder.
 * The shared entities already include proper decorator usage:
 * - User: JsonProperty for preferences, proper Date types
 * - Post: JsonProperty for tags/metadata, social engagement features
 * 
 * Additional types for advanced examples
 */

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
  privacy: 'public' | 'friends' | 'private';
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

interface ExperienceLevel {
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience: number;
  certifications: string[];
}

interface Post extends Neo4jCompatibleEntity {
  id?: string;
  title: string;
  content: string;
  summary?: string;
  published: boolean;
  authorId: string;
  categoryId: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  metadata: PostMetadata;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PostMetadata {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  estimatedReadTime: number;
  featured: boolean;
  editorsPick: boolean;
  lastModifiedBy: string;
}

/**
 * Query Builder with Decorator Integration Service
 * 
 * Demonstrates best practices for combining query builder with decorators:
 * - @CypherQuery decorator with builder patterns
 * - Type-safe query construction
 * - Error handling and validation
 * - Caching strategies
 * - Transaction management
 */
@Injectable()
export class QueryBuilderDecoratorService {
  constructor(
    private readonly queryBuilder: Neo4jQueryBuilder,
    private readonly userQueryBuilder: TypedQueryBuilder<User>,
    private readonly postQueryBuilder: TypedQueryBuilder<Post>
  ) {}

  // ============================================================================
  // 1. BASIC DECORATOR WITH QUERY BUILDER INTEGRATION
  // ============================================================================

  /**
   * Simple query using builder with @CypherQuery decorator
   * Demonstrates the fundamental integration pattern
   */
  @CypherQuery({ 
    cache: '10m', 
    description: 'Find active users using query builder',
    tags: ['user', 'search', 'active']
  })
  async findActiveUsers(): Promise<QueryResult> {
    return this.userQueryBuilder
      .matchEntity('u', { isActive: true })
      .orderBy('u.firstName', 'ASC')
      .return('u')
      .build();
  }

  /**
   * Parameterized query with validation
   * Shows parameter injection with decorator validation
   */
  @CypherQuery({ 
    cache: '5m', 
    safe: true,
    description: 'Find user by email with validation',
    tags: ['user', 'lookup', 'email']
  })
  async findUserByEmail(email: string): Promise<QueryResult> {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }

    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.email', '=', email.toLowerCase())
      .and('u.isActive', '=', true)
      .return('u')
      .build();
  }

  /**
   * Complex query with multiple conditions
   * Demonstrates advanced filtering with decorators
   */
  @CypherQuery({ 
    cache: '15m',
    description: 'Search users by multiple criteria',
    tags: ['user', 'search', 'advanced']
  })
  async searchUsersByCriteria(criteria: {
    roles?: User['role'][];
    minReputation?: number;
    skills?: string[];
    isActive?: boolean;
  }): Promise<QueryResult> {
    let builder = this.userQueryBuilder.matchEntity('u');

    if (criteria.isActive !== undefined) {
      builder = builder.where('u.isActive', '=', criteria.isActive);
    }

    if (criteria.roles && criteria.roles.length > 0) {
      builder = builder.whereRaw('u.role IN $roles', { roles: criteria.roles });
    }

    if (criteria.minReputation !== undefined) {
      builder = builder.and('u.reputation', '>=', criteria.minReputation);
    }

    if (criteria.skills && criteria.skills.length > 0) {
      builder = builder
        .optionalMatch('(u)-[:HAS_PROFILE]->(p:UserProfile)')
        .whereRaw('ANY(skill IN $skills WHERE skill IN p.skills)', { 
          skills: criteria.skills 
        });
    }

    return builder
      .return(`
        u {
          .id,
          .email,
          .firstName,
          .lastName,
          .role,
          .reputation,
          .isActive
        } as user
      `)
      .orderByMultiple([
        { property: 'u.reputation', direction: 'DESC' },
        { property: 'u.firstName', direction: 'ASC' }
      ])
      .limit(50)
      .build();
  }

  // ============================================================================
  // 2. CRUD OPERATIONS WITH DECORATORS
  // ============================================================================

  /**
   * Create user with relationship setup
   * Shows WRITE operations with complex entity creation
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    retry: 3,
    description: 'Create user with profile and preferences',
    tags: ['user', 'create', 'profile']
  })
  async createUserWithProfile(userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: User['role'];
    profileData?: Partial<UserProfile>;
    preferences?: Partial<UserPreferences>;
  }): Promise<QueryResult> {
    const userId = `user_${Date.now()}`;
    const profileId = `profile_${Date.now()}`;
    const timestamp = new Date().toISOString();

    return this.queryBuilder
      // Create user node
      .create('(u:User)', {
        id: userId,
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true,
        reputation: 0,
        joinedAt: timestamp,
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
          privacy: 'public',
          emailFrequency: 'daily',
          ...userData.preferences
        }
      })
      
      // Create profile if provided
      .raw(userData.profileData ? `
        CREATE (p:UserProfile {
          id: $profileId,
          userId: $userId,
          displayName: $displayName,
          bio: $bio,
          website: $website,
          isPublic: $isPublic,
          skills: $skills
        })
        CREATE (u)-[:HAS_PROFILE]->(p)
      ` : '', {
        profileId,
        userId,
        displayName: userData.profileData?.displayName || 
          `${userData.firstName} ${userData.lastName}`,
        bio: userData.profileData?.bio || '',
        website: userData.profileData?.website || '',
        isPublic: userData.profileData?.isPublic ?? true,
        skills: userData.profileData?.skills || []
      })
      
      .return(`
        u {
          .id,
          .email,
          .firstName,
          .lastName,
          .role,
          .isActive,
          .reputation,
          .preferences,
          .joinedAt
        } as user
        ${userData.profileData ? ', p as profile' : ''}
      `)
      .build();
  }

  /**
   * Update user with optimistic locking
   * Demonstrates safe update operations with decorators
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    safe: true,
    description: 'Update user with version control',
    tags: ['user', 'update', 'versioning']
  })
  async updateUserSafely(
    userId: string, 
    updates: Partial<User>,
    expectedVersion?: number
  ): Promise<QueryResult> {
    let builder = this.userQueryBuilder
      .matchEntity('u')
      .where('u.id', '=', userId);

    // Add version check if provided
    if (expectedVersion !== undefined) {
      builder = builder.and('u.version', '=', expectedVersion);
    }

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      version: expectedVersion ? expectedVersion + 1 : undefined
    };

    return builder
      .set(updateData)
      .return(`
        u {
          .id,
          .email,
          .firstName,
          .lastName,
          .role,
          .isActive,
          .reputation,
          .version,
          .updatedAt
        } as updatedUser
      `)
      .build();
  }

  /**
   * Soft delete with audit trail
   * Shows soft deletion patterns with decorators
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    description: 'Soft delete user with audit',
    tags: ['user', 'delete', 'audit']
  })
  async softDeleteUser(userId: string, deletedBy: string, reason?: string): Promise<QueryResult> {
    const timestamp = new Date().toISOString();

    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.id', '=', userId)
      .and('u.isActive', '=', true)
      .set({
        'u.isActive': false,
        'u.deletedAt': timestamp,
        'u.deletedBy': deletedBy,
        'u.deletionReason': reason || 'User requested deletion',
        'u.updatedAt': timestamp
      })
      .return(`
        u {
          .id,
          .email,
          .firstName,
          .lastName,
          .isActive,
          .deletedAt,
          .deletedBy,
          .deletionReason
        } as deletedUser
      `)
      .build();
  }

  // ============================================================================
  // 3. RELATIONSHIP MANAGEMENT WITH DECORATORS
  // ============================================================================

  /**
   * Create user follow relationship
   * Demonstrates relationship creation with validation
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    safe: true,
    description: 'Create follow relationship between users',
    tags: ['relationship', 'follow', 'social']
  })
  async createFollowRelationship(followerId: string, followeeId: string): Promise<QueryResult> {
    if (followerId === followeeId) {
      throw new Error('Users cannot follow themselves');
    }

    return this.queryBuilder
      .match('follower', () => User)
      .where('follower.id', '=', followerId)
      .and('follower.isActive', '=', true)
      .match('followee', () => User)
      .where('followee.id', '=', followeeId)
      .and('followee.isActive', '=', true)
      
      // Check if relationship already exists
      .whereRaw('NOT EXISTS((follower)-[:FOLLOWS]->(followee))')
      
      // Create the relationship
      .create('(follower)-[:FOLLOWS {createdAt: $timestamp}]->(followee)', {
        timestamp: new Date().toISOString()
      })
      
      .return(`
        follower {.id, .firstName, .lastName} as follower,
        followee {.id, .firstName, .lastName} as followee,
        'created' as action
      `)
      .build();
  }

  /**
   * Get user network with relationship details
   * Shows complex relationship traversal with decorators
   */
  @CypherQuery({ 
    cache: '10m',
    description: 'Get user social network details',
    tags: ['relationship', 'network', 'social']
  })
  async getUserNetwork(userId: string, depth = 2): Promise<QueryResult> {
    return this.queryBuilder
      .match('center', () => User)
      .where('center.id', '=', userId)
      
      // Direct follows (outgoing)
      .optionalMatch('(center)-[:FOLLOWS]->(directFollowing:User {isActive: true})')
      
      // Direct followers (incoming)
      .optionalMatch('(center)<-[:FOLLOWS]-(directFollower:User {isActive: true})')
      
      // Mutual follows
      .optionalMatch('(center)<-[:FOLLOWS]-(mutual:User)-[:FOLLOWS]->(center)')
      .where('mutual.isActive', '=', true)
      
      // Second-degree connections if depth > 1
      .raw(depth > 1 ? `
        OPTIONAL MATCH (center)-[:FOLLOWS*2]-(secondDegree:User {isActive: true})
        WHERE secondDegree <> center 
          AND NOT EXISTS((center)-[:FOLLOWS]-(secondDegree))
      ` : '')
      
      .return(`
        center {
          .id,
          .firstName,
          .lastName,
          .reputation
        } as user,
        
        COUNT(DISTINCT directFollowing) as followingCount,
        COUNT(DISTINCT directFollower) as followerCount,
        COUNT(DISTINCT mutual) as mutualFollowCount,
        
        COLLECT(DISTINCT directFollowing {
          .id, .firstName, .lastName, .reputation
        })[0..10] as recentFollowing,
        
        COLLECT(DISTINCT directFollower {
          .id, .firstName, .lastName, .reputation
        })[0..10] as recentFollowers,
        
        COLLECT(DISTINCT mutual {
          .id, .firstName, .lastName, .reputation
        }) as mutualConnections
        
        ${depth > 1 ? ', COLLECT(DISTINCT secondDegree {.id, .firstName, .lastName})[0..5] as suggestedConnections' : ''}
      `)
      .build();
  }

  // ============================================================================
  // 4. TRANSACTION PATTERNS WITH DECORATORS
  // ============================================================================

  /**
   * Atomic post creation with multiple entities
   * Shows transaction handling with decorators
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    retry: 3,
    description: 'Create post with category and tag relationships atomically',
    tags: ['post', 'create', 'transaction']
  })
  async createPostWithRelationships(postData: {
    title: string;
    content: string;
    summary?: string;
    authorId: string;
    categoryId: string;
    tags: string[];
    difficulty: Post['difficulty'];
    published?: boolean;
  }): Promise<QueryResult> {
    const postId = `post_${Date.now()}`;
    const timestamp = new Date().toISOString();

    return this.queryBuilder
      // Verify author exists and is active
      .match('author', () => User)
      .where('author.id', '=', postData.authorId)
      .and('author.isActive', '=', true)
      
      // Verify category exists and is active
      .match('category:Category')
      .where('category.id', '=', postData.categoryId)
      .and('category.isActive', '=', true)
      
      // Create the post
      .create('(p:Post)', {
        id: postId,
        title: postData.title,
        content: postData.content,
        summary: postData.summary || postData.content.substring(0, 200) + '...',
        published: postData.published ?? false,
        authorId: postData.authorId,
        categoryId: postData.categoryId,
        tags: postData.tags,
        difficulty: postData.difficulty,
        metadata: {
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          estimatedReadTime: Math.ceil(postData.content.length / 200), // ~200 WPM
          featured: false,
          editorsPick: false,
          lastModifiedBy: postData.authorId
        },
        createdAt: timestamp,
        publishedAt: postData.published ? timestamp : null
      })
      
      // Create relationships
      .create('(author)-[:AUTHORED]->(p)')
      .create('(p)-[:IN_CATEGORY]->(category)')
      
      // Create tag relationships (create tags if they don't exist)
      .raw(`
        UNWIND $tags as tagName
        MERGE (tag:Tag {name: tagName})
        ON CREATE SET tag.id = 'tag_' + timestamp(), tag.createdAt = $timestamp
        CREATE (p)-[:HAS_TAG]->(tag)
      `, { tags: postData.tags, timestamp })
      
      .return(`
        p {
          .id,
          .title,
          .content,
          .summary,
          .published,
          .tags,
          .difficulty,
          .metadata,
          .createdAt,
          .publishedAt
        } as post,
        author {.id, .firstName, .lastName} as author,
        category {.id, .name} as category
      `)
      .build();
  }

  // ============================================================================
  // 5. CACHING STRATEGIES WITH DECORATORS
  // ============================================================================

  /**
   * Hierarchical caching with query builder
   * Demonstrates smart caching strategies
   */
  @CypherQuery({ 
    cache: '30m',
    description: 'Get user dashboard data with hierarchical caching',
    tags: ['user', 'dashboard', 'cache']
  })
  async getUserDashboard(userId: string): Promise<QueryResult> {
    return this.queryBuilder
      .match('u', () => User)
      .where('u.id', '=', userId)
      .and('u.isActive', '=', true)
      
      // User's recent posts
      .optionalMatch('(u)-[:AUTHORED]->(recentPosts:Post {published: true})')
      .whereRaw('recentPosts.publishedAt >= $cutoffDate', {
        cutoffDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      
      // User's network activity
      .optionalMatch('(u)-[:FOLLOWS]->(following:User)-[:AUTHORED]->(followingPosts:Post {published: true})')
      .whereRaw('followingPosts.publishedAt >= $activityCutoff', {
        activityCutoff: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      
      // User's engagement metrics
      .optionalMatch('(u)-[:AUTHORED]->(authoredPosts:Post)')
      
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .email,
          .reputation,
          .preferences
        } as user,
        
        // Recent activity
        COLLECT(DISTINCT recentPosts {
          .id, .title, .publishedAt, .metadata
        })[0..5] as recentPosts,
        
        // Network feed
        COLLECT(DISTINCT {
          post: followingPosts {.id, .title, .publishedAt},
          author: following {.id, .firstName, .lastName}
        })[0..10] as networkFeed,
        
        // Engagement summary
        COUNT(DISTINCT authoredPosts) as totalPosts,
        SUM(authoredPosts.metadata.viewCount) as totalViews,
        SUM(authoredPosts.metadata.likeCount) as totalLikes,
        
        // Quick stats
        SIZE((u)-[:FOLLOWS]->()) as followingCount,
        SIZE((u)<-[:FOLLOWS]-()) as followerCount
      `)
      .build();
  }

  /**
   * Cache invalidation patterns
   * Shows selective cache clearing with decorators
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    description: 'Update user reputation and invalidate related cache',
    tags: ['user', 'reputation', 'cache-invalidation']
  })
  async updateUserReputation(
    userId: string, 
    reputationChange: number,
    reason: string
  ): Promise<QueryResult> {
    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.id', '=', userId)
      .set({
        'u.reputation': 'u.reputation + $change',
        'u.lastReputationChange': new Date().toISOString(),
        'u.lastReputationReason': reason,
        'u.updatedAt': new Date().toISOString()
      })
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .reputation,
          .lastReputationChange,
          .lastReputationReason
        } as updatedUser
      `)
      .build();
  }

  // ============================================================================
  // 6. ERROR HANDLING AND VALIDATION PATTERNS
  // ============================================================================

  /**
   * Comprehensive validation with detailed error messages
   * Shows error handling best practices with decorators
   */
  @CypherQuery({ 
    safe: true,
    cache: '5m',
    description: 'Find user with comprehensive validation',
    tags: ['user', 'validation', 'error-handling']
  })
  async findUserWithValidation(criteria: {
    id?: string;
    email?: string;
    includeInactive?: boolean;
  }): Promise<QueryResult> {
    // Input validation
    if (!criteria.id && !criteria.email) {
      throw new Error('Either id or email must be provided');
    }

    if (criteria.email && !this.isValidEmail(criteria.email)) {
      throw new Error('Invalid email format provided');
    }

    let builder = this.userQueryBuilder.matchEntity('u');

    if (criteria.id) {
      builder = builder.where('u.id', '=', criteria.id);
    } else if (criteria.email) {
      builder = builder.where('u.email', '=', criteria.email.toLowerCase());
    }

    if (!criteria.includeInactive) {
      builder = builder.and('u.isActive', '=', true);
    }

    return builder
      .return(`
        CASE 
          WHEN u IS NULL THEN null
          ELSE u {
            .id,
            .email,
            .firstName,
            .lastName,
            .role,
            .isActive,
            .reputation
          }
        END as user
      `)
      .build();
  }

  /**
   * Batch operation with partial failure handling
   * Demonstrates resilient batch processing
   */
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,
    retry: 2,
    description: 'Batch update users with error resilience',
    tags: ['user', 'batch', 'error-resilience']
  })
  async batchUpdateUsers(updates: Array<{
    userId: string;
    reputation?: number;
    isActive?: boolean;
    lastActiveAt?: string;
  }>): Promise<QueryResult> {
    return this.queryBuilder
      .raw('UNWIND $updates as update')
      .raw(`
        CALL {
          WITH update
          MATCH (u:User {id: update.userId})
          SET u.reputation = COALESCE(update.reputation, u.reputation),
              u.isActive = COALESCE(update.isActive, u.isActive),
              u.lastActiveAt = COALESCE(update.lastActiveAt, u.lastActiveAt),
              u.updatedAt = $timestamp
          RETURN u.id as updatedId, 'success' as status
        }
        IN TRANSACTIONS OF 10 ROWS
        ON ERROR CONTINUE
      `, {
        updates,
        timestamp: new Date().toISOString()
      })
      .return('updatedId, status, COUNT(*) as processedCount')
      .build();
  }

  // ============================================================================
  // 7. PRIVATE HELPER METHODS
  // ============================================================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Repository Pattern Integration Examples
 * 
 * Shows how to combine query builder with repository patterns
 * for clean architecture implementations.
 */
@Injectable()
export class UserRepository {
  constructor(
    private readonly queryBuilder: Neo4jQueryBuilder,
    private readonly userQueryBuilder: TypedQueryBuilder<User>
  ) {}

  /**
   * Repository method using decorator and builder
   */
  @CypherQuery({ cache: '5m', description: 'Repository: find user by ID' })
  async findById(id: string): Promise<QueryResult> {
    return this.userQueryBuilder
      .matchEntity('u')
      .where('u.id', '=', id)
      .and('u.isActive', '=', true)
      .return('u')
      .build();
  }

  /**
   * Repository method for complex queries
   */
  @CypherQuery({ cache: '10m', description: 'Repository: find users by criteria' })
  async findByCriteria(criteria: Partial<User>): Promise<QueryResult> {
    let builder = this.userQueryBuilder.matchEntity('u');

    // Dynamically apply criteria
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        builder = builder.and(`u.${key}` as any, '=', value);
      }
    });

    return builder
      .orderBy('u.reputation', 'DESC')
      .limit(100)
      .return('u')
      .build();
  }
}

/**
 * Service Layer Best Practices
 * 
 * Demonstrates how to structure services that use both
 * repositories and direct query builder access.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly queryBuilderService: QueryBuilderDecoratorService
  ) {}

  /**
   * Service method combining repository and complex queries
   */
  async getUserProfile(userId: string) {
    // Use repository for basic lookup
    const user = await this.userRepository.findById(userId);
    
    // Use complex service for detailed data
    const dashboard = await this.queryBuilderService.getUserDashboard(userId);
    const network = await this.queryBuilderService.getUserNetwork(userId);

    return {
      user,
      dashboard,
      network
    };
  }

  /**
   * Service method with business logic validation
   */
  async updateUserWithBusinessRules(
    userId: string,
    updates: Partial<User>,
    requestingUserId: string
  ) {
    // Business rule validation
    if (updates.role && updates.role === 'admin') {
      const requestingUser = await this.userRepository.findById(requestingUserId);
      const userRole = (requestingUser as any)?.[0]?.role;
      
      if (userRole !== 'admin') {
        throw new Error('Only admins can promote users to admin role');
      }
    }

    // Apply update through service
    return await this.queryBuilderService.updateUserSafely(userId, updates);
  }
}