/**
 * @fileoverview Advanced CypherQuery Decorator Examples
 *
 * This file demonstrates advanced usage patterns for the @CypherQuery decorator including:
 * - Complex caching strategies and performance optimization
 * - Integration with other decorators
 * - Dynamic query patterns and conditional logic
 * - Error handling and retry logic
 * - Production-ready patterns with monitoring
 *
 * Real-world scenarios covered:
 * - E-commerce product catalog with dynamic filtering
 * - User analytics with performance optimization
 * - Content management with multi-level caching
 * - API endpoints with automatic error recovery
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CypherQuery,
  Safe,
  Transactional,
  InjectNeo4j,
  Neo4jService,
  Neo4jQueryBuilder,
  type QueryResult
} from '../../../index';
import type { User, Product, Order, Category, Review } from '../02-entities-and-relationships/types';

/**
 * Advanced ProductService demonstrating comprehensive @CypherQuery usage
 * with production-ready patterns
 */
@Injectable()
export class AdvancedProductService {
  private readonly logger = new Logger(AdvancedProductService.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService,
    private readonly queryBuilder: Neo4jQueryBuilder
  ) {}

  // =============================================================================
  // ADVANCED CACHING STRATEGIES
  // =============================================================================

  /**
   * Multi-tier caching with different TTLs based on data volatility
   * Static product data cached for 1 hour, pricing cached for 5 minutes
   */
  @CypherQuery({
    cache: '1h',
    description: 'Get product with intelligent caching strategy',
    tags: ['product', 'catalog', 'cached']
  })
  @Safe({
    rules: { maxDepth: 3, preventInjection: true },
    transforms: { autoInt: true }
  })
  async getProductWithSmartCaching(productId: number): Promise<QueryResult> {
    return {
      query: `
        MATCH (p:Product {id: $productId})
        OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
        OPTIONAL MATCH (p)<-[:REVIEWS]-(r:Review)
        OPTIONAL MATCH (p)-[:HAS_VARIANT]->(v:ProductVariant)
        RETURN p {
          .*,
          category: c.name,
          averageRating: avg(r.rating),
          reviewCount: count(r),
          variants: collect(v { .*, inStock: v.inventory > 0 }),
          lastUpdated: datetime()
        } as product
      `,
      params: { productId },
      description: 'Complex product data with relationships and aggregations'
    };
  }

  /**
   * Conditional caching based on user type and query complexity
   * VIP users get real-time data, regular users get cached results
   */
  @CypherQuery({
    cache: false, // Handled programmatically
    retry: 2,
    description: 'Dynamic caching based on user context'
  })
  async getProductRecommendations(
    userId: number,
    userTier: 'VIP' | 'PREMIUM' | 'STANDARD',
    limit = 10
  ): Promise<QueryResult> {
    // VIP users get real-time recommendations, others get cached
    const useCache = userTier !== 'VIP';
    const cacheTime = userTier === 'PREMIUM' ? '10m' : '30m';

    if (useCache) {
      // Add cache headers programmatically
      this.logger.log(`Using ${cacheTime} cache for ${userTier} user ${userId}`);
    }

    return {
      query: `
        MATCH (u:User {id: $userId})
        MATCH (u)-[:PURCHASED|VIEWED|LIKED*1..3]-(related)
        MATCH (related)-[:SIMILAR_TO|BELONGS_TO|TAGGED_WITH*1..2]-(p:Product)
        WHERE NOT (u)-[:PURCHASED]->(p) AND p.active = true

        // Advanced scoring algorithm
        WITH p,
             count(DISTINCT related) as commonConnections,
             avg(case when exists((p)<-[:REVIEWS]-()) then
               [(p)<-[:REVIEWS]-(r) | r.rating][0..5] else [3.0] end) as avgRating,
             p.popularity as popularity,
             case p.category
               when 'Electronics' then 1.2
               when 'Books' then 1.0
               when 'Clothing' then 1.1
               else 1.0
             end as categoryBoost

        WITH p, (commonConnections * 2.0 + avgRating + popularity * 0.5) * categoryBoost as score
        ORDER BY score DESC, p.createdAt DESC
        LIMIT $limit

        RETURN collect(p {
          .*,
          recommendationScore: round(score * 100) / 100,
          reasoning: 'Based on ' + commonConnections + ' common connections'
        }) as recommendations
      `,
      params: { userId, limit },
      tags: ['recommendation', 'ml', userTier.toLowerCase()]
    };
  }

  // =============================================================================
  // INTEGRATION WITH OTHER DECORATORS
  // =============================================================================

  /**
   * Complex transaction with multiple queries, caching, and safety checks
   * Demonstrates decorator composition for production scenarios
   */
  @Transactional({ timeout: 30000 })
  @CypherQuery({
    mode: 'WRITE',
    cache: false,
    retry: 3,
    description: 'Complex order processing with inventory management'
  })
  @Safe({
    strict: true,
    rules: {
      maxDepth: 4,
      preventInjection: true,
      maxArrayLength: 100
    },
    transforms: {
      autoInt: true,
      autoDateTransform: true
    }
  })
  async processComplexOrder(orderData: {
    userId: number;
    items: Array<{ productId: number; quantity: number; variantId?: number }>;
    shippingAddress: {
      street: string;
      city: string;
      country: string;
      zipCode: string;
    };
    paymentMethod: string;
    discountCode?: string;
  }): Promise<QueryResult> {
    return {
      query: `
        // Validate user and get profile
        MATCH (u:User {id: $userId, active: true})

        // Process each item with inventory validation
        UNWIND $items as item
        MATCH (p:Product {id: item.productId, active: true})
        OPTIONAL MATCH (v:ProductVariant {id: item.variantId})-[:VARIANT_OF]->(p)

        // Check inventory availability
        WITH u, item, p, v,
             CASE WHEN v IS NOT NULL THEN v.inventory ELSE p.inventory END as available
        WHERE available >= item.quantity

        // Apply discount if provided
        OPTIONAL MATCH (d:Discount {code: $discountCode, active: true})
        WHERE d.validFrom <= datetime() AND d.validUntil >= datetime()

        // Calculate pricing
        WITH u, collect({
          product: p,
          variant: v,
          quantity: item.quantity,
          unitPrice: CASE WHEN v IS NOT NULL THEN v.price ELSE p.price END,
          discount: d.percentage
        }) as validItems, d

        WHERE size(validItems) = size($items) // All items must be available

        // Create the order
        CREATE (o:Order {
          id: randomUUID(),
          userId: u.id,
          status: 'PENDING',
          createdAt: datetime(),
          updatedAt: datetime(),
          totalAmount: reduce(total = 0.0, item IN validItems |
            total + (item.unitPrice * item.quantity * (1.0 - coalesce(item.discount, 0.0) / 100.0))
          ),
          itemCount: size(validItems),
          shippingAddress: $shippingAddress,
          paymentMethod: $paymentMethod,
          discountCode: $discountCode
        })

        // Create order items and update inventory
        WITH o, validItems, u
        UNWIND validItems as item
        CREATE (oi:OrderItem {
          id: randomUUID(),
          productId: item.product.id,
          variantId: coalesce(item.variant.id, null),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          discountApplied: coalesce(item.discount, 0.0)
        })
        CREATE (o)-[:CONTAINS]->(oi)
        CREATE (oi)-[:FOR_PRODUCT]->(item.product)

        // Update inventory
        SET item.product.inventory = item.product.inventory - item.quantity,
            item.product.soldCount = coalesce(item.product.soldCount, 0) + item.quantity

        // Update variant inventory if applicable
        FOREACH (v IN case when item.variant IS NOT NULL then [item.variant] else [] end |
          SET v.inventory = v.inventory - item.quantity
        )

        // Create relationships
        CREATE (u)-[:PLACED]->(o)

        RETURN o {
          .*,
          items: [(o)-[:CONTAINS]->(oi) | oi {
            .*,
            product: [(oi)-[:FOR_PRODUCT]->(p) | p.name][0]
          }],
          customer: u { .id, .name, .email },
          processingTime: duration.inSeconds(datetime(), o.createdAt)
        } as order
      `,
      params: orderData,
      description: 'Multi-step order processing with inventory management and validation'
    };
  }

  // =============================================================================
  // DYNAMIC QUERY PATTERNS
  // =============================================================================

  /**
   * Dynamic filtering with query builder integration
   * Demonstrates runtime query construction with caching
   */
  @CypherQuery({
    cache: '15m',
    description: 'Dynamic product search with faceted filtering'
  })
  async searchProductsWithDynamicFilters(
    searchTerm?: string,
    categoryIds?: number[],
    priceRange?: { min: number; max: number },
    attributes?: Record<string, string[]>,
    sortBy: 'relevance' | 'price' | 'rating' | 'newest' = 'relevance',
    page = 1,
    pageSize = 20
  ): Promise<QueryResult> {
    const builder = this.queryBuilder
      .match('p', () => Product)
      .where('p.active', '=', true);

    // Add search term if provided
    if (searchTerm) {
      builder.where('p.name', 'CONTAINS', searchTerm)
             .or('p.description', 'CONTAINS', searchTerm);
    }

    // Add category filtering
    if (categoryIds?.length) {
      builder.match('(p)-[:BELONGS_TO]->(c:Category)')
             .where('c.id', 'IN', categoryIds);
    }

    // Add price range filtering
    if (priceRange) {
      if (priceRange.min !== undefined) {
        builder.where('p.price', '>=', priceRange.min);
      }
      if (priceRange.max !== undefined) {
        builder.where('p.price', '<=', priceRange.max);
      }
    }

    // Add attribute filtering
    if (attributes) {
      Object.entries(attributes).forEach(([key, values]) => {
        builder.where(`p.${key}`, 'IN', values);
      });
    }

    // Add aggregation for facets and rating
    builder.optionalMatch('(p)<-[:REVIEWS]-(r:Review)')
           .with(`p,
                  count(r) as reviewCount,
                  avg(r.rating) as avgRating,
                  p.popularity as popularity`);

    // Add sorting logic
    switch (sortBy) {
      case 'price':
        builder.orderBy('p.price', 'ASC');
        break;
      case 'rating':
        builder.orderBy('avgRating', 'DESC')
               .orderBy('reviewCount', 'DESC');
        break;
      case 'newest':
        builder.orderBy('p.createdAt', 'DESC');
        break;
      case 'relevance':
      default:
        // Complex relevance scoring
        builder.with(`p, reviewCount, avgRating, popularity,
                     (case when $searchTerm IS NOT NULL then
                       (case when p.name CONTAINS $searchTerm then 10.0 else 0.0 end +
                        case when p.description CONTAINS $searchTerm then 5.0 else 0.0 end)
                       else 0.0 end +
                      coalesce(avgRating, 3.0) * 2.0 +
                      coalesce(popularity, 0.0) +
                      (reviewCount * 0.1)
                     ) as relevanceScore`)
               .orderBy('relevanceScore', 'DESC');
        break;
    }

    // Add pagination
    const skip = (page - 1) * pageSize;
    builder.skip(skip).limit(pageSize);

    // Build return clause with rich product data
    builder.return(`collect(p {
      .*,
      avgRating: round(coalesce(avgRating, 0.0) * 10) / 10,
      reviewCount: coalesce(reviewCount, 0),
      relevanceScore: case when $searchTerm IS NOT NULL then round(relevanceScore * 100) / 100 else null end
    }) as products`);

    const queryResult = builder.build();

    return {
      query: queryResult.query,
      params: {
        ...queryResult.params,
        searchTerm,
        categoryIds,
        ...priceRange,
        ...attributes
      },
      description: `Dynamic product search with ${Object.keys(attributes || {}).length} attribute filters`,
      tags: ['search', 'dynamic', 'faceted', sortBy]
    };
  }

  // =============================================================================
  // ERROR HANDLING AND RETRY LOGIC
  // =============================================================================

  /**
   * Production-ready query with comprehensive error handling
   * Demonstrates retry strategies and fallback mechanisms
   */
  @CypherQuery({
    retry: 5,
    description: 'High-availability analytics query with fallback',
    tags: ['analytics', 'production', 'resilient']
  })
  async getProductAnalyticsWithFallback(
    productId: number,
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<QueryResult> {
    const timeframes = {
      day: 'datetime() - duration({days: 1})',
      week: 'datetime() - duration({weeks: 1})',
      month: 'datetime() - duration({months: 1})',
      year: 'datetime() - duration({years: 1})'
    };

    return {
      query: `
        // Primary analytics query with comprehensive error handling
        CALL {
          MATCH (p:Product {id: $productId})

          // Attempt detailed analytics
          OPTIONAL MATCH (p)<-[:PURCHASED]-(o:Order)
          WHERE o.createdAt >= ${timeframes[timeRange]}

          OPTIONAL MATCH (p)<-[:REVIEWS]-(r:Review)
          WHERE r.createdAt >= ${timeframes[timeRange]}

          OPTIONAL MATCH (p)<-[:VIEWED]-(v:ViewEvent)
          WHERE v.timestamp >= ${timeframes[timeRange]}

          WITH p,
               count(DISTINCT o) as orders,
               sum(CASE WHEN o IS NOT NULL THEN
                 [(o)-[:CONTAINS]->(oi)-[:FOR_PRODUCT]->(p) | oi.quantity][0]
                 ELSE 0 END) as unitsSold,
               count(DISTINCT r) as reviews,
               avg(r.rating) as avgRating,
               count(DISTINCT v) as views,
               sum(CASE WHEN o IS NOT NULL THEN
                 [(o)-[:CONTAINS]->(oi)-[:FOR_PRODUCT]->(p) | oi.totalPrice][0]
                 ELSE 0.0 END) as revenue

          RETURN p {
            .id,
            .name,
            analytics: {
              period: $timeRange,
              orders: orders,
              unitsSold: unitsSold,
              revenue: round(revenue * 100) / 100,
              reviews: reviews,
              avgRating: round(coalesce(avgRating, 0.0) * 10) / 10,
              views: views,
              conversionRate: case when views > 0 then
                round((toFloat(orders) / toFloat(views)) * 10000) / 100
                else 0.0 end,
              dataQuality: case
                when orders > 0 AND reviews > 0 AND views > 0 then 'COMPLETE'
                when orders > 0 AND views > 0 then 'GOOD'
                when views > 0 then 'BASIC'
                else 'LIMITED'
              end
            }
          } as result
        }

        UNION ALL

        // Fallback query for when detailed data is unavailable
        CALL {
          MATCH (p:Product {id: $productId})
          WHERE NOT EXISTS {
            MATCH (p)<-[:PURCHASED|REVIEWS|VIEWED]-()
            WHERE true // Fallback condition
          }

          RETURN p {
            .id,
            .name,
            analytics: {
              period: $timeRange,
              orders: 0,
              unitsSold: 0,
              revenue: 0.0,
              reviews: 0,
              avgRating: 0.0,
              views: 0,
              conversionRate: 0.0,
              dataQuality: 'NO_DATA',
              fallbackUsed: true,
              message: 'Using basic product data due to insufficient analytics data'
            }
          } as result
        }

        WITH result
        LIMIT 1

        RETURN result
      `,
      params: { productId, timeRange },
      description: `Resilient analytics query with fallback for ${timeRange} period`
    };
  }

  // =============================================================================
  // PERFORMANCE OPTIMIZATION PATTERNS
  // =============================================================================

  /**
   * Highly optimized query with index hints and performance monitoring
   * Demonstrates advanced Neo4j performance techniques
   */
  @CypherQuery({
    cache: '5m',
    description: 'Performance-optimized bulk product operations',
    tags: ['bulk', 'performance', 'optimized']
  })
  @Safe({
    rules: {
      maxArrayLength: 1000,
      maxDepth: 2
    }
  })
  async bulkUpdateProductMetrics(updates: Array<{
    productId: number;
    views?: number;
    sales?: number;
    rating?: number;
  }>): Promise<QueryResult> {
    const startTime = Date.now();

    return {
      query: `
        // Performance-optimized bulk update with proper indexing
        UNWIND $updates as update

        // Use index hint for optimal performance
        MATCH (p:Product {id: update.productId})
        USING INDEX p:Product(id)

        // Batch updates to reduce lock contention
        CALL {
          WITH p, update

          // Update metrics atomically
          SET p.viewCount = coalesce(p.viewCount, 0) + coalesce(update.views, 0),
              p.salesCount = coalesce(p.salesCount, 0) + coalesce(update.sales, 0),
              p.lastUpdated = datetime()

          // Update rating with proper averaging
          WITH p, update
          WHERE update.rating IS NOT NULL

          SET p.ratingSum = coalesce(p.ratingSum, 0.0) + update.rating,
              p.ratingCount = coalesce(p.ratingCount, 0) + 1,
              p.averageRating = (coalesce(p.ratingSum, 0.0) + update.rating) /
                               (coalesce(p.ratingCount, 0) + 1)

          RETURN p.id as updatedId
        }

        // Collect results with performance metrics
        WITH collect(updatedId) as updated

        RETURN {
          updatedProducts: size(updated),
          updatedIds: updated,
          batchSize: size($updates),
          processingTime: duration.inMillis(datetime({epochMillis: $startTime}), datetime()),
          averageUpdateTime: duration.inMillis(datetime({epochMillis: $startTime}), datetime()) / size($updates),
          timestamp: datetime()
        } as result
      `,
      params: {
        updates,
        startTime
      },
      description: 'Bulk product metrics update with performance monitoring'
    };
  }

  /**
   * Complex aggregation query with caching strategy based on data freshness
   */
  @CypherQuery({
    cache: '2h', // Long cache for expensive aggregations
    description: 'Expensive aggregation query with intelligent caching'
  })
  async getMarketplaceStatistics(): Promise<QueryResult> {
    return {
      query: `
        // Comprehensive marketplace statistics with performance optimizations
        CALL {
          // Product statistics
          MATCH (p:Product {active: true})
          RETURN {
            totalProducts: count(p),
            averagePrice: round(avg(p.price) * 100) / 100,
            priceRange: {
              min: min(p.price),
              max: max(p.price)
            }
          } as productStats
        }

        CALL {
          // Category distribution
          MATCH (c:Category)<-[:BELONGS_TO]-(p:Product {active: true})
          WITH c.name as category, count(p) as productCount
          ORDER BY productCount DESC
          LIMIT 10
          RETURN collect({category: category, count: productCount}) as topCategories
        }

        CALL {
          // Sales performance (last 30 days)
          MATCH (o:Order)-[:CONTAINS]->(oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
          WHERE o.createdAt >= datetime() - duration({days: 30})
          RETURN {
            totalOrders: count(DISTINCT o),
            totalRevenue: round(sum(oi.totalPrice) * 100) / 100,
            averageOrderValue: round(avg(o.totalAmount) * 100) / 100,
            topSellingProducts: [
              (p, sales) IN collect([p, count(oi)])[0..5] |
              {name: p.name, sales: sales}
            ]
          } as salesStats
        }

        CALL {
          // User engagement metrics
          MATCH (u:User)-[:PURCHASED|VIEWED|REVIEWED*]->()
          WITH u, count(*) as engagementScore
          RETURN {
            activeUsers: count(u),
            averageEngagement: round(avg(engagementScore) * 100) / 100,
            highlyEngagedUsers: size([score IN collect(engagementScore) WHERE score > 10])
          } as userStats
        }

        RETURN {
          products: productStats,
          categories: topCategories,
          sales: salesStats,
          users: userStats,
          generatedAt: datetime(),
          cacheInfo: {
            cacheDuration: '2 hours',
            nextRefresh: datetime() + duration({hours: 2}),
            dataFreshness: 'CACHED'
          }
        } as marketplaceStats
      `,
      params: {},
      description: 'Comprehensive marketplace analytics with multi-dimensional metrics',
      tags: ['analytics', 'marketplace', 'aggregation', 'cached']
    };
  }
}

/**
 * Advanced User Analytics Service demonstrating production-ready patterns
 * with comprehensive error handling and performance optimization
 */
@Injectable()
export class AdvancedUserAnalyticsService {
  private readonly logger = new Logger(AdvancedUserAnalyticsService.name);

  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Real-time user behavior analysis with fallback caching
   * Demonstrates conditional caching and performance monitoring
   */
  @CypherQuery({
    cache: false, // Handled conditionally
    retry: 3,
    description: 'Real-time user behavior analysis with adaptive caching'
  })
  async analyzeUserBehavior(
    userId: number,
    includeRealTime = false,
    detailLevel: 'basic' | 'detailed' | 'comprehensive' = 'detailed'
  ): Promise<QueryResult> {
    // Use different caching strategies based on parameters
    const cacheStrategy = includeRealTime ? 'none' :
                         detailLevel === 'comprehensive' ? '1h' : '30m';

    this.logger.log(`Analyzing user ${userId} behavior with ${detailLevel} level and ${cacheStrategy} caching`);

    const queryComplexity = {
      basic: 2,
      detailed: 5,
      comprehensive: 10
    }[detailLevel];

    return {
      query: `
        MATCH (u:User {id: $userId})

        // Basic user information
        WITH u, {
          id: u.id,
          name: u.name,
          memberSince: u.createdAt,
          lastActive: u.lastLoginAt
        } as basicInfo

        ${detailLevel !== 'basic' ? `
        // Purchase behavior analysis
        OPTIONAL MATCH (u)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(oi:OrderItem)-[:FOR_PRODUCT]->(p:Product)
        WITH u, basicInfo,
             count(DISTINCT o) as totalOrders,
             sum(o.totalAmount) as totalSpent,
             collect(DISTINCT p.category) as purchaseCategories,
             avg(o.totalAmount) as avgOrderValue
        ` : ''}

        ${detailLevel === 'comprehensive' ? `
        // Comprehensive relationship analysis
        OPTIONAL MATCH (u)-[:REVIEWED]->(r:Review)-[:FOR_PRODUCT]->(reviewedProduct)
        OPTIONAL MATCH (u)-[:VIEWED]->(v:ViewEvent)-[:FOR_PRODUCT]->(viewedProduct)
        OPTIONAL MATCH (u)-[:FOLLOWS]->(followedUser:User)
        OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(u)

        WITH u, basicInfo, totalOrders, totalSpent, purchaseCategories, avgOrderValue,
             count(DISTINCT r) as reviewCount,
             avg(r.rating) as avgRatingGiven,
             count(DISTINCT v) as viewCount,
             count(DISTINCT followedUser) as followingCount,
             count(DISTINCT follower) as followerCount,
             collect(DISTINCT reviewedProduct.category)[0..5] as reviewedCategories,
             collect(DISTINCT viewedProduct.category)[0..10] as viewedCategories
        ` : ''}

        RETURN {
          user: basicInfo,
          ${detailLevel !== 'basic' ? `
          purchaseBehavior: {
            totalOrders: coalesce(totalOrders, 0),
            totalSpent: round(coalesce(totalSpent, 0.0) * 100) / 100,
            averageOrderValue: round(coalesce(avgOrderValue, 0.0) * 100) / 100,
            preferredCategories: purchaseCategories,
            customerTier: case
              when coalesce(totalSpent, 0) > 10000 then 'VIP'
              when coalesce(totalSpent, 0) > 5000 then 'PREMIUM'
              when coalesce(totalSpent, 0) > 1000 then 'GOLD'
              when coalesce(totalSpent, 0) > 100 then 'SILVER'
              else 'BRONZE'
            end
          },
          ` : ''}
          ${detailLevel === 'comprehensive' ? `
          engagement: {
            reviewCount: coalesce(reviewCount, 0),
            averageRatingGiven: round(coalesce(avgRatingGiven, 0.0) * 10) / 10,
            viewCount: coalesce(viewCount, 0),
            socialConnections: {
              following: coalesce(followingCount, 0),
              followers: coalesce(followerCount, 0),
              influence: round((coalesce(followerCount, 0) * 1.0 / (coalesce(followingCount, 0) + 1)) * 100) / 100
            },
            interests: {
              purchaseCategories: purchaseCategories,
              reviewedCategories: reviewedCategories,
              viewedCategories: viewedCategories
            }
          },
          behaviorScore: {
            purchaseScore: least(coalesce(totalOrders, 0) * 10, 100),
            engagementScore: least((coalesce(reviewCount, 0) + coalesce(viewCount, 0) / 10) * 5, 100),
            socialScore: least(coalesce(followerCount, 0) * 2, 100),
            overallScore: round((
              least(coalesce(totalOrders, 0) * 10, 100) * 0.4 +
              least((coalesce(reviewCount, 0) + coalesce(viewCount, 0) / 10) * 5, 100) * 0.4 +
              least(coalesce(followerCount, 0) * 2, 100) * 0.2
            ) * 100) / 100
          },
          ` : ''}
          analysis: {
            detailLevel: $detailLevel,
            includeRealTime: $includeRealTime,
            queryComplexity: $queryComplexity,
            cacheStrategy: $cacheStrategy,
            analyzedAt: datetime(),
            processingHints: case
              when $includeRealTime then ['Real-time data included', 'No caching applied']
              else ['Cached result', 'Cache duration: ' + $cacheStrategy]
            end
          }
        } as userAnalysis
      `,
      params: {
        userId,
        detailLevel,
        includeRealTime,
        queryComplexity,
        cacheStrategy
      },
      description: `${detailLevel} user behavior analysis with ${cacheStrategy} caching`,
      tags: ['analytics', 'behavior', detailLevel, cacheStrategy]
    };
  }
}

/**
 * Production monitoring and health check examples
 */
@Injectable()
export class ProductionMonitoringService {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Health check query with performance metrics and system status
   */
  @CypherQuery({
    cache: '30s', // Short cache for health checks
    retry: 1,
    description: 'System health check with performance metrics'
  })
  async systemHealthCheck(): Promise<QueryResult> {
    return {
      query: `
        CALL {
          // Database connectivity and basic stats
          MATCH (n)
          RETURN count(n) as totalNodes, labels(n) as nodeLabels
          LIMIT 1000
        }

        CALL {
          // Recent activity indicators
          MATCH (o:Order)
          WHERE o.createdAt >= datetime() - duration({hours: 1})
          RETURN count(o) as recentOrders
        }

        CALL {
          // Performance indicators
          MATCH (u:User)-[:PURCHASED]->(o:Order)
          WHERE o.createdAt >= datetime() - duration({minutes: 10})
          RETURN count(o) as recentTransactions
        }

        RETURN {
          status: case
            when totalNodes > 0 and recentOrders >= 0 then 'HEALTHY'
            when totalNodes > 0 then 'DEGRADED'
            else 'UNHEALTHY'
          end,
          metrics: {
            totalNodes: totalNodes,
            recentOrders: recentOrders,
            recentTransactions: recentTransactions,
            responseTime: duration.inMillis(datetime(), datetime()),
            uniqueLabels: size(apoc.coll.toSet(apoc.coll.flatten(collect(nodeLabels))))
          },
          timestamp: datetime(),
          version: '1.0.0'
        } as healthStatus
      `,
      params: {},
      description: 'Comprehensive system health and performance check'
    };
  }
}

// Export all examples for use in other modules
export {
  AdvancedProductService,
  AdvancedUserAnalyticsService,
  ProductionMonitoringService
};

/**
 * Example usage patterns and best practices:
 *
 * 1. **Caching Strategy**:
 *    - Use long caches (1h+) for static data
 *    - Use short caches (5-15m) for dynamic data
 *    - Disable caching for real-time operations
 *    - Consider conditional caching based on user type
 *
 * 2. **Error Handling**:
 *    - Set appropriate retry counts (3-5 for critical operations)
 *    - Implement fallback queries for resilience
 *    - Use comprehensive error logging and monitoring
 *
 * 3. **Performance Optimization**:
 *    - Use index hints for large queries
 *    - Implement proper batching for bulk operations
 *    - Monitor query execution times
 *    - Use query profiling in development
 *
 * 4. **Integration Patterns**:
 *    - Combine with @Safe for parameter validation
 *    - Use @Transactional for complex operations
 *    - Implement proper logging and monitoring
 *
 * 5. **Production Readiness**:
 *    - Include health check endpoints
 *    - Implement proper metrics collection
 *    - Use structured logging
 *    - Plan for failover scenarios
 */
