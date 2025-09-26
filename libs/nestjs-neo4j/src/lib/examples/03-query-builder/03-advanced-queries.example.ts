/**
 * @fileoverview Advanced Query Patterns Examples
 * 
 * Demonstrates complex graph operations including joins, relationships,
 * aggregations, analytics, graph traversals, path finding, and
 * performance optimization patterns using the Neo4j Query Builder.
 */

import { Injectable } from '@nestjs/common';
import { Neo4jQueryBuilder, createQueryBuilder } from '../../query-builder/neo4j-query-builder';
import { Neo4jEntity } from '../../decorators/entity.decorator';
import type { Neo4jCompatibleEntity } from '../../types/neo4j-types';
import { CypherQuery } from '../../decorators/cypher-query.decorator';
import { User } from '../shared/entities/basic/user.entity';
import { Post } from '../shared/entities/intermediate/post.entity';

/**
 * Advanced Query Patterns using Decorated Entity Classes
 * 
 * Uses shared decorated entity classes for type safety:
 * - User: From shared/entities/basic/user.entity.ts (proper Date types, JsonProperty for complex objects)
 * - Post: From shared/entities/intermediate/post.entity.ts (proper tags array handling, social features)
 * 
 * These entities provide proper TypeScript types and Neo4j serialization
 */

/**
 * Additional entity types for advanced examples
 */
@Neo4jEntity('Category')
export class Category {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  parentCategoryId?: string;
  displayOrder: number;
  color: string;
  icon?: string;
}

interface Company extends Neo4jCompatibleEntity {
  id?: string;
  name: string;
  industry: string;
  foundedYear: number;
  employees: number;
  headquarters: string;
  revenue?: number;
  isPublic: boolean;
  stockSymbol?: string;
  parentCompanyId?: string;
}

/**
 * Advanced Query Patterns Service
 * 
 * Demonstrates sophisticated graph operations including:
 * - Complex JOIN patterns
 * - Multi-level relationships
 * - Graph traversals and path finding
 * - Advanced aggregations and analytics
 * - Performance optimization strategies
 */
@Injectable()
export class AdvancedQueryService {
  constructor(private readonly queryBuilder: Neo4jQueryBuilder) {}

  // ============================================================================
  // 1. COMPLEX JOIN PATTERNS
  // ============================================================================

  /**
   * Multi-entity joins with aggregations
   * Demonstrates complex relationship traversal with data aggregation
   */
  @CypherQuery({ cache: '10m', description: 'Users with post statistics' })
  async getUsersWithPostStatistics() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .optionalMatch('(u)-[:AUTHORED]->(p:Post {published: true})')
      .optionalMatch('(p)-[:IN_CATEGORY]->(c:Category {isActive: true})')
      .with(`
        u,
        COLLECT(DISTINCT p) as posts,
        COLLECT(DISTINCT c) as categories
      `)
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .email,
          .reputation,
          .skills
        } as user,
        SIZE(posts) as totalPosts,
        SUM(p.viewCount for p in posts) as totalViews,
        SUM(p.likeCount for p in posts) as totalLikes,
        SIZE(categories) as categoriesWrittenIn,
        COLLECT(DISTINCT c.name for c in categories) as categoryNames
      `)
      .orderBy('totalViews', 'DESC')
      .limit(50)
      .build();
  }

  /**
   * Hierarchical data traversal
   * Shows category tree traversal with depth control
   */
  @CypherQuery({ cache: '15m', description: 'Category hierarchy with post counts' })
  async getCategoryHierarchyWithCounts() {
    return this.queryBuilder
      .match('root', () => Category)
      .where('root.parentCategoryId', '=', null)
      .and('root.isActive', '=', true)
      .optionalMatch('(root)<-[:CHILD_OF*1..3]-(child:Category {isActive: true})')
      .optionalMatch('(child)-[:CONTAINS]->(p:Post {published: true})')
      .with(`
        root,
        COLLECT(DISTINCT child) as descendants,
        COLLECT(DISTINCT p) as posts
      `)
      .return(`
        root {
          .id,
          .name,
          .description,
          .displayOrder,
          .color,
          .icon
        } as category,
        SIZE(descendants) as subcategoryCount,
        SIZE(posts) as totalPosts,
        [d in descendants | d {
          .id,
          .name,
          .parentCategoryId
        }] as subcategories
      `)
      .orderBy('root.displayOrder', 'ASC')
      .build();
  }

  /**
   * Complex relationship patterns
   * Demonstrates multiple relationship types in single query
   */
  @CypherQuery({ cache: '5m', description: 'User network analysis' })
  async analyzeUserNetwork(userId: string) {
    return this.queryBuilder
      .match('u', () => User)
      .where('u.id', '=', userId)
      
      // Direct followers
      .optionalMatch('(u)<-[:FOLLOWS]-(follower:User {isActive: true})')
      
      // People user follows
      .optionalMatch('(u)-[:FOLLOWS]->(following:User {isActive: true})')
      
      // Mutual connections
      .optionalMatch('(u)<-[:FOLLOWS]-(mutual:User)-[:FOLLOWS]->(u)')
      
      // Colleagues (same company)
      .optionalMatch('(u)-[:WORKS_AT]->(company:Company)<-[:WORKS_AT]-(colleague:User)')
      .where('colleague.id', '<>', userId)
      
      // Content interactions
      .optionalMatch('(u)-[:AUTHORED]->(post:Post)<-[:LIKED|:COMMENTED]-(interactor:User)')
      
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .reputation,
          .skills
        } as user,
        
        COUNT(DISTINCT follower) as followerCount,
        COUNT(DISTINCT following) as followingCount,
        COUNT(DISTINCT mutual) as mutualFollowsCount,
        COUNT(DISTINCT colleague) as colleagueCount,
        COUNT(DISTINCT interactor) as contentInteractionCount,
        
        COLLECT(DISTINCT follower {.id, .firstName, .lastName}) as recentFollowers,
        COLLECT(DISTINCT colleague {.id, .firstName, .lastName}) as colleagues
      `)
      .build();
  }

  // ============================================================================
  // 2. GRAPH TRAVERSALS AND PATH FINDING
  // ============================================================================

  /**
   * Shortest path between users
   * Demonstrates path finding algorithms
   */
  @CypherQuery({ cache: '10m', description: 'Find connection path between users' })
  async findConnectionPath(fromUserId: string, toUserId: string, maxDepth = 6) {
    return this.queryBuilder
      .match('from', () => User)
      .where('from.id', '=', fromUserId)
      .match('to', () => User)
      .where('to.id', '=', toUserId)
      .raw(`
        MATCH path = shortestPath((from)-[:FOLLOWS|:WORKS_AT|:COLLABORATED_WITH*1..${maxDepth}]-(to))
      `)
      .return(`
        path,
        LENGTH(path) as pathLength,
        NODES(path) as connectionNodes,
        RELATIONSHIPS(path) as connectionTypes,
        [n in NODES(path) | 
          CASE 
            WHEN 'User' in LABELS(n) THEN n {.id, .firstName, .lastName, .role}
            WHEN 'Company' in LABELS(n) THEN n {.id, .name, .industry}
            ELSE n
          END
        ] as pathDetails
      `)
      .orderBy('pathLength', 'ASC')
      .limit(5)
      .build();
  }

  /**
   * Influence network analysis
   * Shows multi-hop relationship analysis with weighted connections
   */
  @CypherQuery({ cache: '15m', description: 'Analyze user influence network' })
  async analyzeInfluenceNetwork(userId: string, depth = 3) {
    return this.queryBuilder
      .match('center', () => User)
      .where('center.id', '=', userId)
      .raw(`
        CALL apoc.path.subgraphAll(center, {
          relationshipFilter: "FOLLOWS>|COLLABORATED_WITH",
          minLevel: 1,
          maxLevel: ${depth}
        }) YIELD nodes, relationships
      `)
      .with('center, nodes, relationships')
      .raw(`
        UNWIND nodes as node
        WITH center, node, relationships,
             SIZE([r in relationships WHERE startNode(r) = node]) as outDegree,
             SIZE([r in relationships WHERE endNode(r) = node]) as inDegree
        WHERE 'User' in LABELS(node) AND node <> center
      `)
      .return(`
        node {
          .id,
          .firstName,
          .lastName,
          .reputation,
          .skills
        } as connectedUser,
        outDegree,
        inDegree,
        (outDegree + inDegree) as totalConnections,
        
        // Calculate influence score
        ROUND(
          (toFloat(inDegree) * 0.7 + toFloat(outDegree) * 0.3) * 
          (node.reputation / 1000.0), 
          2
        ) as influenceScore
      `)
      .raw('ORDER BY influenceScore DESC, totalConnections DESC')
      .limit(20)
      .build();
  }

  /**
   * Community detection
   * Demonstrates clustering and community analysis
   */
  @CypherQuery({ cache: '30m', description: 'Detect user communities by skills and interactions' })
  async detectUserCommunities(minCommunitySize = 5) {
    return this.queryBuilder
      .match('u1', () => User, { isActive: true })
      .match('u2', () => User, { isActive: true })
      .whereRaw(`
        u1 <> u2 AND (
          // Shared skills
          SIZE([skill IN u1.skills WHERE skill IN u2.skills]) >= 2 OR
          // Direct collaboration
          EXISTS((u1)-[:COLLABORATED_WITH]-(u2)) OR
          // Mutual follows with content interaction
          (EXISTS((u1)-[:FOLLOWS]->(u2)) AND EXISTS((u1)<-[:FOLLOWS]-(u2))) OR
          // Same location and overlapping skills
          (u1.location.city = u2.location.city AND 
           SIZE([skill IN u1.skills WHERE skill IN u2.skills]) >= 1)
        )
      `)
      .with(`
        u1, u2,
        CASE
          WHEN SIZE([skill IN u1.skills WHERE skill IN u2.skills]) >= 3 THEN 3
          WHEN EXISTS((u1)-[:COLLABORATED_WITH]-(u2)) THEN 3
          WHEN EXISTS((u1)-[:FOLLOWS]->(u2)) AND EXISTS((u1)<-[:FOLLOWS]-(u2)) THEN 2
          ELSE 1
        END as connectionStrength
      `)
      .raw(`
        // Create temporary relationship for community detection
        MERGE (u1)-[r:TEMP_CONNECTED]-(u2)
        SET r.strength = connectionStrength
      `)
      .with('COUNT(*) as relationshipsCreated')
      .raw(`
        // Use graph algorithms for community detection
        CALL gds.louvain.stream('userGraph') 
        YIELD nodeId, communityId
        RETURN communityId, COUNT(nodeId) as communitySize, COLLECT(nodeId) as members
        HAVING communitySize >= ${minCommunitySize}
        ORDER BY communitySize DESC
      `)
      .build();
  }

  // ============================================================================
  // 3. ADVANCED AGGREGATIONS AND ANALYTICS
  // ============================================================================

  /**
   * Time-series analysis
   * Demonstrates temporal data analysis with aggregations
   */
  @CypherQuery({ cache: '20m', description: 'Content creation trends analysis' })
  async analyzeContentTrends(months = 12) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffIso = cutoffDate.toISOString();

    return this.queryBuilder
      .match('p', () => Post, { published: true })
      .where('p.publishedAt', '>=', cutoffIso)
      .match('(p)<-[:AUTHORED]-(author:User {isActive: true})')
      .optionalMatch('(p)-[:IN_CATEGORY]->(category:Category)')
      .with(`
        p, author, category,
        substring(p.publishedAt, 0, 7) as month,
        substring(p.publishedAt, 0, 10) as day
      `)
      .return(`
        month,
        COUNT(p) as postsCount,
        COUNT(DISTINCT author) as uniqueAuthors,
        COUNT(DISTINCT category) as categoriesUsed,
        AVG(p.viewCount) as avgViews,
        AVG(p.likeCount) as avgLikes,
        AVG(p.commentCount) as avgComments,
        
        // Top performing content metrics
        MAX(p.viewCount) as maxViews,
        MAX(p.likeCount) as maxLikes,
        
        // Category distribution
        COLLECT(DISTINCT category.name) as activeCategories,
        
        // Author performance
        [author in COLLECT(DISTINCT author) | author {
          .id, .firstName, .lastName,
          postsThisMonth: SIZE([post in COLLECT(p) WHERE post.authorId = author.id])
        }][0..5] as topAuthorsThisMonth
      `)
      .orderBy('month', 'DESC')
      .build();
  }

  /**
   * Complex statistical analysis
   * Shows advanced mathematical operations and statistical functions
   */
  @CypherQuery({ cache: '15m', description: 'User engagement statistics' })
  async calculateEngagementStatistics() {
    return this.queryBuilder
      .match('u', () => User, { isActive: true })
      .optionalMatch('(u)-[:AUTHORED]->(p:Post {published: true})')
      .with(`
        u,
        COLLECT(p) as posts,
        SIZE([post in COLLECT(p) WHERE post.likeCount > 0]) as postsWithLikes,
        COALESCE(SUM(p.viewCount), 0) as totalViews,
        COALESCE(SUM(p.likeCount), 0) as totalLikes,
        COALESCE(SUM(p.commentCount), 0) as totalComments
      `)
      .return(`
        // User classification
        CASE
          WHEN SIZE(posts) = 0 THEN 'inactive'
          WHEN SIZE(posts) <= 5 THEN 'casual'
          WHEN SIZE(posts) <= 20 THEN 'regular'
          ELSE 'power_user'
        END as userType,
        
        COUNT(u) as userCount,
        
        // Engagement metrics
        AVG(SIZE(posts)) as avgPostsPerUser,
        AVG(totalViews) as avgViewsPerUser,
        AVG(totalLikes) as avgLikesPerUser,
        AVG(totalComments) as avgCommentsPerUser,
        
        // Performance ratios
        AVG(CASE 
          WHEN SIZE(posts) > 0 
          THEN toFloat(totalLikes) / toFloat(totalViews) 
          ELSE 0 
        END) as avgLikeToViewRatio,
        
        AVG(CASE 
          WHEN SIZE(posts) > 0 
          THEN toFloat(totalComments) / toFloat(totalViews)
          ELSE 0 
        END) as avgCommentToViewRatio,
        
        // Quality indicators
        AVG(CASE 
          WHEN SIZE(posts) > 0 
          THEN toFloat(postsWithLikes) / toFloat(SIZE(posts))
          ELSE 0 
        END) as avgEngagementRate,
        
        // Distribution metrics
        PERCENTILE_CONT(u.reputation, 0.5) as medianReputation,
        PERCENTILE_CONT(u.reputation, 0.9) as p90Reputation,
        STDEV(u.reputation) as reputationStdDev
      `)
      .raw('ORDER BY userType')
      .build();
  }

  /**
   * Cohort retention analysis
   * Demonstrates advanced time-based user analysis
   */
  @CypherQuery({ cache: '30m', description: 'User cohort retention analysis' })
  async analyzeCohortRetention() {
    return this.queryBuilder
      .match('u', () => User)
      .with(`
        u,
        substring(u.joinedAt, 0, 7) as joinCohort,
        CASE 
          WHEN u.lastActiveAt IS NULL THEN 0
          WHEN duration.between(datetime(u.joinedAt), datetime(u.lastActiveAt)).months >= 1 THEN 1
          ELSE 0
        END as month1Retention,
        CASE 
          WHEN u.lastActiveAt IS NULL THEN 0
          WHEN duration.between(datetime(u.joinedAt), datetime(u.lastActiveAt)).months >= 3 THEN 1
          ELSE 0
        END as month3Retention,
        CASE 
          WHEN u.lastActiveAt IS NULL THEN 0
          WHEN duration.between(datetime(u.joinedAt), datetime(u.lastActiveAt)).months >= 6 THEN 1
          ELSE 0
        END as month6Retention,
        CASE 
          WHEN u.lastActiveAt IS NULL THEN 0
          WHEN duration.between(datetime(u.joinedAt), datetime(u.lastActiveAt)).months >= 12 THEN 1
          ELSE 0
        END as month12Retention
      `)
      .return(`
        joinCohort,
        COUNT(u) as cohortSize,
        
        // Retention rates
        SUM(month1Retention) as month1RetainedUsers,
        SUM(month3Retention) as month3RetainedUsers, 
        SUM(month6Retention) as month6RetainedUsers,
        SUM(month12Retention) as month12RetainedUsers,
        
        // Retention percentages
        ROUND(toFloat(SUM(month1Retention)) / toFloat(COUNT(u)) * 100, 2) as month1RetentionRate,
        ROUND(toFloat(SUM(month3Retention)) / toFloat(COUNT(u)) * 100, 2) as month3RetentionRate,
        ROUND(toFloat(SUM(month6Retention)) / toFloat(COUNT(u)) * 100, 2) as month6RetentionRate,
        ROUND(toFloat(SUM(month12Retention)) / toFloat(COUNT(u)) * 100, 2) as month12RetentionRate,
        
        // Quality metrics per cohort
        AVG(u.reputation) as avgCohortReputation,
        COUNT(DISTINCT u.skills) as uniqueSkillsInCohort
      `)
      .raw('HAVING COUNT(u) >= 10')  // Only cohorts with sufficient size
      .orderBy('joinCohort', 'DESC')
      .build();
  }

  // ============================================================================
  // 4. PERFORMANCE OPTIMIZATION PATTERNS
  // ============================================================================

  /**
   * Index-optimized complex query
   * Demonstrates query patterns that leverage database indexes
   */
  @CypherQuery({ cache: '10m', description: 'Index-optimized user search' })
  async optimizedUserSearch(criteria: {
    skills?: string[];
    location?: { city?: string; country?: string };
    reputation?: { min?: number; max?: number };
    joinedAfter?: string;
  }) {
    let builder = this.queryBuilder;

    // Start with most selective filter (assumes index on email/id)
    if (criteria.skills && criteria.skills.length > 0) {
      // Use index on skills if available
      builder = builder
        .raw('CALL db.index.fulltext.queryNodes("userSkillsIndex", $skillQuery) YIELD node as u', {
          skillQuery: criteria.skills.join(' OR ')
        });
    } else {
      builder = builder.match('u', () => User, { isActive: true });
    }

    // Apply other filters efficiently
    if (criteria.location?.city) {
      builder = builder.where('u.location.city', '=', criteria.location.city);
    }

    if (criteria.location?.country) {
      builder = builder.and('u.location.country', '=', criteria.location.country);
    }

    if (criteria.reputation?.min !== undefined) {
      builder = builder.and('u.reputation', '>=', criteria.reputation.min);
    }

    if (criteria.reputation?.max !== undefined) {
      builder = builder.and('u.reputation', '<=', criteria.reputation.max);
    }

    if (criteria.joinedAfter) {
      builder = builder.and('u.joinedAt', '>=', criteria.joinedAfter);
    }

    return builder
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .skills,
          .reputation,
          .location
        } as user
      `)
      .orderBy('u.reputation', 'DESC')
      .limit(50)
      .build();
  }

  /**
   * Batch processing optimization
   * Shows efficient bulk operations with proper batching
   */
  @CypherQuery({ mode: 'WRITE', cache: false, description: 'Optimized bulk user updates' })
  async optimizedBulkUpdate(
    updates: Array<{ userId: string; reputation: number; lastActiveAt: string }>
  ) {
    const batchSize = 100;
    
    return this.queryBuilder
      .raw('UNWIND $updates as update')
      .raw('CALL {')
      .raw('  WITH update')
      .match('u', () => User)
      .where('u.id', '=', 'update.userId')
      .set({
        'u.reputation': 'update.reputation',
        'u.lastActiveAt': 'update.lastActiveAt',
        'u.updatedAt': new Date().toISOString()
      })
      .return('u.id as updatedUserId')
      .raw('} IN TRANSACTIONS OF $batchSize ROWS', { batchSize })
      .return('COUNT(*) as totalUpdated')
      .build();
  }

  /**
   * Memory-efficient large dataset processing
   * Demonstrates streaming and pagination for large results
   */
  @CypherQuery({ cache: '5m', description: 'Memory-efficient large dataset query' })
  async efficientLargeDatasetQuery(
    offset = 0, 
    limit = 1000,
    filters?: { isActive?: boolean; hasSkills?: boolean }
  ) {
    let builder = this.queryBuilder
      .match('u', () => User);

    if (filters?.isActive !== undefined) {
      builder = builder.where('u.isActive', '=', filters.isActive);
    }

    if (filters?.hasSkills) {
      builder = builder.whereRaw('SIZE(u.skills) > 0');
    }

    return builder
      .with('u')
      .orderBy('u.id', 'ASC')  // Consistent ordering for pagination
      .skip(offset)
      .limit(limit)
      .optionalMatch('(u)-[:AUTHORED]->(p:Post {published: true})')
      .return(`
        u {
          .id,
          .firstName,
          .lastName,
          .reputation,
          .skills
        } as user,
        COUNT(p) as postCount
      `)
      .build();
  }

  // ============================================================================
  // 5. GRAPH ALGORITHMS INTEGRATION
  // ============================================================================

  /**
   * PageRank algorithm for user influence
   * Demonstrates graph algorithms integration
   */
  @CypherQuery({ cache: '60m', description: 'Calculate user influence using PageRank' })
  async calculateUserInfluencePageRank() {
    return this.queryBuilder
      .raw(`
        // Create graph projection
        CALL gds.graph.project(
          'userInfluenceGraph',
          'User',
          'FOLLOWS|COLLABORATED_WITH',
          { nodeProperties: ['reputation', 'isActive'] }
        )
      `)
      .raw(`
        // Run PageRank algorithm
        CALL gds.pageRank.stream('userInfluenceGraph', {
          maxIterations: 20,
          dampingFactor: 0.85,
          sourceNodes: [user IN gds.util.asNode() WHERE user.isActive = true]
        })
        YIELD nodeId, score
      `)
      .return(`
        gds.util.asNode(nodeId) {
          .id,
          .firstName,
          .lastName,
          .reputation,
          .skills
        } as user,
        ROUND(score * 1000, 3) as influenceScore
      `)
      .raw('ORDER BY influenceScore DESC')
      .limit(100)
      .raw(`
        // Clean up graph projection
        CALL gds.graph.drop('userInfluenceGraph')
      `)
      .build();
  }

  /**
   * Community detection using Louvain algorithm
   * Shows advanced graph clustering
   */
  @CypherQuery({ cache: '45m', description: 'Detect communities using Louvain algorithm' })
  async detectCommunitiesLouvain() {
    return this.queryBuilder
      .raw(`
        // Project graph for community detection
        CALL gds.graph.project(
          'communityGraph',
          'User',
          {
            FOLLOWS: { orientation: 'UNDIRECTED' },
            COLLABORATED_WITH: { orientation: 'UNDIRECTED' }
          },
          { nodeProperties: ['reputation', 'skills'] }
        )
      `)
      .raw(`
        // Run Louvain community detection
        CALL gds.louvain.stream('communityGraph', {
          maxLevels: 10,
          maxIterations: 10,
          tolerance: 0.0001,
          includeIntermediateCommunities: false
        })
        YIELD nodeId, communityId
      `)
      .with('nodeId, communityId')
      .match('(user:User)')
      .whereRaw('id(user) = nodeId')
      .return(`
        communityId,
        COUNT(user) as communitySize,
        AVG(user.reputation) as avgReputation,
        COLLECT(user.skills) as allSkills,
        COLLECT(user {.id, .firstName, .lastName, .reputation})[0..10] as sampleMembers,
        
        // Community characteristics
        SIZE(REDUCE(s = [], skill IN COLLECT(user.skills) | s + skill)) as totalSkills,
        SIZE(apoc.coll.toSet(REDUCE(s = [], skill IN COLLECT(user.skills) | s + skill))) as uniqueSkills
      `)
      .raw('HAVING communitySize >= 3')
      .orderBy('communitySize', 'DESC')
      .raw(`
        // Clean up graph projection
        CALL gds.graph.drop('communityGraph')
      `)
      .build();
  }
}

/**
 * Advanced Query Performance Examples
 * 
 * Demonstrates query optimization techniques and performance monitoring
 * for complex graph operations.
 */
export class AdvancedPerformanceExamples {
  constructor(private readonly queryBuilder: Neo4jQueryBuilder) {}

  /**
   * Query profiling and optimization
   * Shows how to profile and optimize complex queries
   */
  async profileComplexQuery(userId: string) {
    // Use EXPLAIN/PROFILE for query analysis
    const explainQuery = this.queryBuilder
      .raw('EXPLAIN')
      .match('u', () => User)
      .where('u.id', '=', userId)
      .optionalMatch('(u)-[:FOLLOWS*1..3]->(connected:User)')
      .return('u, COUNT(connected) as connectionDepth')
      .build();

    const profileQuery = this.queryBuilder
      .raw('PROFILE')
      .match('u', () => User)
      .where('u.id', '=', userId)
      .optionalMatch('(u)-[:FOLLOWS*1..3]->(connected:User)')
      .return('u, COUNT(connected) as connectionDepth')
      .build();

    return { explainQuery, profileQuery };
  }

  /**
   * Index recommendation query
   * Demonstrates how to identify missing indexes
   */
  @CypherQuery({ cache: '30m', description: 'Analyze query patterns for index recommendations' })
  async analyzeIndexNeeds() {
    return this.queryBuilder
      .raw(`
        // Analyze frequently accessed properties
        CALL db.schema.nodeTypeProperties() YIELD nodeType, propertyName, propertyTypes
        WHERE nodeType IN ['User', 'Post', 'Category', 'Company']
        RETURN 
          nodeType,
          propertyName,
          propertyTypes,
          // Estimate selectivity (would need actual data analysis)
          'high' as estimatedSelectivity
        ORDER BY nodeType, propertyName
      `)
      .build();
  }

  /**
   * Memory usage optimization
   * Shows techniques for reducing memory consumption
   */
  @CypherQuery({ cache: '10m', description: 'Memory-optimized relationship analysis' })
  async memoryOptimizedRelationshipAnalysis(userIds: string[]) {
    return this.queryBuilder
      .raw('UNWIND $userIds as userId', { userIds })
      .raw('CALL {')
      .raw('  WITH userId')
      .match('u', () => User)
      .where('u.id', '=', 'userId')
      .optionalMatch('(u)-[:FOLLOWS]->(following:User)')
      .with('u, COUNT(following) as followingCount')
      .return('u.id as userId, followingCount')
      .raw('} IN TRANSACTIONS')  // Process in transactions to manage memory
      .return('userId, followingCount')
      .build();
  }
}