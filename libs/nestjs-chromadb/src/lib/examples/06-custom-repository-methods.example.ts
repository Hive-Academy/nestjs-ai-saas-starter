/**
 * @fileoverview Custom Repository Methods Example
 *
 * Demonstrates:
 * - Extending BaseChromaRepository with business logic
 * - Combining base methods for complex workflows
 * - Transaction-like operations and data consistency
 * - Cache invalidation patterns
 * - Custom aggregations and analytics
 * - Domain-specific repository patterns
 * - Performance optimization techniques
 *
 * Key Concepts:
 * - Repository pattern extension
 * - Business logic encapsulation
 * - Method composition and reuse
 * - Error handling strategies
 * - Performance monitoring
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';

import {
  BaseChromaRepository,
  BaseDocument,
  ChromaDBModule,
  ChromaEntity,
  ChromaId,
  ChromaProp,
  ChromaRepository,
  CreatedAt,
  UpdatedAt,
} from '../../index';
// ============================================================================
// 1. DOMAIN ENTITIES FOR CUSTOM REPOSITORY EXAMPLES
// ============================================================================

@ChromaEntity({
  collection: 'blog_posts',
  description: 'Blog post content management',
  autoEmbed: true,
  embeddingFields: ['content', 'title', 'excerpt'],
  autoTimestamp: true,
})
export class BlogPostEntity
  implements
    BaseDocument<{
      title: string;
      excerpt: string;
      author: string;
      category: string;
      tags: string[];
      status: 'draft' | 'published' | 'archived';
      publishedAt?: string;
      viewCount: number;
      likeCount: number;
      commentCount: number;
      readingTime: number;
      featured: boolean;
      seoMetadata: {
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
      };
    }>
{
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  @ChromaProp()
  title!: string;

  @ChromaProp()
  excerpt!: string;

  metadata!: {
    title: string;
    excerpt: string;
    author: string;
    category: string;
    tags: string[];
    status: 'draft' | 'published' | 'archived';
    publishedAt?: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    readingTime: number;
    featured: boolean;
    seoMetadata: {
      metaTitle: string;
      metaDescription: string;
      keywords: string[];
    };
  };

  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}

@ChromaEntity({
  collection: 'analytics_events',
  description: 'User analytics and behavior tracking',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
})
export class AnalyticsEventEntity
  implements
    BaseDocument<{
      userId: string;
      sessionId: string;
      eventType: string;
      eventData: Record<string, any>;
      timestamp: string;
      userAgent: string;
      ipAddress: string;
      referrer?: string;
      page: string;
      duration?: number;
    }>
{
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  metadata!: {
    userId: string;
    sessionId: string;
    eventType: string;
    eventData: Record<string, any>;
    timestamp: string;
    userAgent: string;
    ipAddress: string;
    referrer?: string;
    page: string;
    duration?: number;
  };

  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}

// ============================================================================
// 2. CUSTOM REPOSITORY IMPLEMENTATIONS
// ============================================================================

/**
 * Blog post repository with advanced content management features
 */
@Injectable()
@ChromaRepository<BlogPostEntity>({
  collection: 'blog_posts',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
})
export class BlogPostRepository extends BaseChromaRepository<BlogPostEntity> {
  constructor() {
    super();
  }

  // ============================================================================
  // CONTENT MANAGEMENT METHODS
  // ============================================================================

  /**
   * Publishes a draft post with validation and SEO optimization
   */
  async publishPost(postId: string): Promise<BlogPostEntity | null> {
    const post = await this.findById(postId);
    if (!post) {
      throw new Error(`Post with ID ${postId} not found`);
    }

    if (post.metadata.status !== 'draft') {
      throw new Error(
        `Post must be in draft status to publish. Current status: ${post.metadata.status}`
      );
    }

    // Validate required fields for publishing
    this.validatePostForPublication(post);

    // Update post status and set publish date
    const publishedPost = await this.update(postId, {
      metadata: {
        ...post.metadata,
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
    });

    // Invalidate related caches
    await this.invalidateContentCaches();

    return publishedPost;
  }

  /**
   * Creates a content series by linking related posts
   */
  async createContentSeries(seriesData: {
    title: string;
    description: string;
    posts: Array<Omit<BlogPostEntity, 'id'>>;
  }): Promise<BlogPostEntity[]> {
    const createdPosts: BlogPostEntity[] = [];

    try {
      // Create all posts in the series
      for (const [index, postData] of seriesData.posts.entries()) {
        // Add series metadata to each post
        const enhancedPost = {
          ...postData,
          metadata: {
            ...postData.metadata,
            tags: [
              ...postData.metadata.tags,
              `series:${seriesData.title}`,
              `part:${index + 1}`,
            ],
            seoMetadata: {
              ...postData.metadata.seoMetadata,
              keywords: [
                ...postData.metadata.seoMetadata.keywords,
                seriesData.title,
                `part ${index + 1}`,
              ],
            },
          },
        };

        const created = await this.create(enhancedPost);
        createdPosts.push(created);
      }

      return createdPosts;
    } catch (error) {
      // Rollback: delete any created posts if series creation fails
      if (createdPosts.length > 0) {
        const postIds = createdPosts.map((post) => post.id);
        await this.deleteMany(postIds);
      }
      throw error;
    }
  }

  /**
   * Increments view count with analytics tracking
   */
  async incrementViewCount(postId: string, userId?: string): Promise<void> {
    const post = await this.findById(postId);
    if (!post) return;

    // Only count views for published posts
    if (post.metadata.status !== 'published') return;

    const newViewCount = post.metadata.viewCount + 1;

    await this.update(postId, {
      metadata: {
        ...post.metadata,
        viewCount: newViewCount,
      },
    });

    // Track analytics event if user ID provided
    if (userId) {
      await this.trackUserEngagement(postId, userId, 'view');
    }
  }

  /**
   * Manages post engagement (likes, comments) with real-time updates
   */
  async updateEngagement(
    postId: string,
    engagement: {
      likesDelta?: number;
      commentsDelta?: number;
    },
    userId?: string
  ): Promise<BlogPostEntity | null> {
    const post = await this.findById(postId);
    if (!post) return null;

    const updatedMetadata = { ...post.metadata };

    if (engagement.likesDelta) {
      updatedMetadata.likeCount = Math.max(
        0,
        updatedMetadata.likeCount + engagement.likesDelta
      );
    }

    if (engagement.commentsDelta) {
      updatedMetadata.commentCount = Math.max(
        0,
        updatedMetadata.commentCount + engagement.commentsDelta
      );
    }

    const updated = await this.update(postId, {
      metadata: updatedMetadata,
    });

    // Track engagement event
    if (userId) {
      const eventType = engagement.likesDelta ? 'like' : 'comment';
      await this.trackUserEngagement(postId, userId, eventType);
    }

    return updated;
  }

  // ============================================================================
  // CONTENT DISCOVERY METHODS
  // ============================================================================

  /**
   * Finds related posts using content similarity and metadata
   */
  async findRelatedPosts(
    postId: string,
    options: {
      maxResults?: number;
      sameAuthor?: boolean;
      sameCategory?: boolean;
      excludeTags?: string[];
    } = {}
  ): Promise<BlogPostEntity[]> {
    const sourcePost = await this.findById(postId);
    if (!sourcePost) return [];

    // Build semantic query from post content
    const semanticQuery = `${sourcePost.metadata.title} ${sourcePost.metadata.excerpt}`;

    // Build filters
    const where: any = {
      status: 'published',
      id: { $nin: [postId] }, // Exclude source post
    };

    if (options.sameAuthor) {
      where.author = sourcePost.metadata.author;
    }

    if (options.sameCategory) {
      where.category = sourcePost.metadata.category;
    }

    if (options.excludeTags && options.excludeTags.length > 0) {
      where.tags = { $nin: options.excludeTags };
    }

    // Use semantic search with metadata filters
    const results = await this.search(semanticQuery, {
      where,
      limit: options.maxResults || 5,
    });

    return results;
  }

  /**
   * Gets trending posts based on engagement metrics
   */
  async getTrendingPosts(
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit = 10
  ): Promise<BlogPostEntity[]> {
    // Calculate date threshold
    const now = new Date();
    const threshold = new Date();

    switch (timeframe) {
      case 'day':
        threshold.setDate(now.getDate() - 1);
        break;
      case 'week':
        threshold.setDate(now.getDate() - 7);
        break;
      case 'month':
        threshold.setDate(now.getDate() - 30);
        break;
    }

    // Find published posts within timeframe
    const recentPosts = await this.findAll({
      where: {
        status: 'published',
        publishedAt: { $gte: threshold.toISOString() },
      },
      limit: limit * 3, // Get more to rank them
    });

    // Calculate engagement score and sort
    const rankedPosts = recentPosts
      .map((post) => ({
        post,
        score: this.calculateEngagementScore(post),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.post);

    return rankedPosts;
  }

  /**
   * Advanced content search with SEO and relevance scoring
   */
  async searchContent(
    query: string,
    options: {
      category?: string;
      author?: string;
      tags?: string[];
      status?: string;
      featured?: boolean;
      limit?: number;
      includeScores?: boolean;
    } = {}
  ): Promise<Array<{ post: BlogPostEntity; score?: number }>> {
    // Build where clause
    const where: any = {};

    if (options.category) where.category = options.category;
    if (options.author) where.author = options.author;
    if (options.status) where.status = options.status;
    if (options.featured !== undefined) where.featured = options.featured;
    if (options.tags && options.tags.length > 0) {
      where.tags = { $in: options.tags };
    }

    // Perform semantic search
    const searchResults = options.includeScores
      ? await this.searchWithScores(query, {
          where,
          limit: options.limit || 20,
        })
      : await this.search(query, { where, limit: options.limit || 20 });

    if (options.includeScores && Array.isArray(searchResults)) {
      const resultsWithScores = searchResults as Array<{
        document: BlogPostEntity;
        score: number;
      }>;
      return resultsWithScores.map((r) => ({
        post: r.document,
        score: r.score,
      }));
    } else {
      return (searchResults as BlogPostEntity[]).map((post) => ({ post }));
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING METHODS
  // ============================================================================

  /**
   * Generates content performance analytics
   */
  async getContentAnalytics(
    timeframe: { start: string; end: string },
    author?: string
  ): Promise<{
    totalPosts: number;
    publishedPosts: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    averageEngagement: number;
    topPosts: Array<{ post: BlogPostEntity; score: number }>;
    categoryBreakdown: Record<string, number>;
    tagPopularity: Record<string, number>;
  }> {
    // Build filter
    const where: any = {
      createdAt: { $gte: timeframe.start, $lte: timeframe.end },
    };

    if (author) {
      where.author = author;
    }

    // Get all posts in timeframe
    const posts = await this.findAll({ where });

    // Calculate metrics
    const publishedPosts = posts.filter(
      (p) => p.metadata.status === 'published'
    );
    const totalViews = posts.reduce((sum, p) => sum + p.metadata.viewCount, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.metadata.likeCount, 0);
    const totalComments = posts.reduce(
      (sum, p) => sum + p.metadata.commentCount,
      0
    );
    const averageEngagement =
      publishedPosts.length > 0
        ? (totalLikes + totalComments) / publishedPosts.length
        : 0;

    // Top performing posts
    const topPosts = publishedPosts
      .map((post) => ({
        post,
        score: this.calculateEngagementScore(post),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    posts.forEach((post) => {
      categoryBreakdown[post.metadata.category] =
        (categoryBreakdown[post.metadata.category] || 0) + 1;
    });

    // Tag popularity
    const tagPopularity: Record<string, number> = {};
    posts.forEach((post) => {
      post.metadata.tags.forEach((tag) => {
        tagPopularity[tag] = (tagPopularity[tag] || 0) + 1;
      });
    });

    return {
      totalPosts: posts.length,
      publishedPosts: publishedPosts.length,
      totalViews,
      totalLikes,
      totalComments,
      averageEngagement,
      topPosts,
      categoryBreakdown,
      tagPopularity,
    };
  }

  /**
   * Bulk content operations with validation
   */
  async bulkUpdateStatus(
    postIds: string[],
    newStatus: 'draft' | 'published' | 'archived',
    publishDate?: string
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const postId of postIds) {
      try {
        const post = await this.findById(postId);
        if (!post) {
          failed.push({ id: postId, error: 'Post not found' });
          continue;
        }

        // Validate transition
        if (newStatus === 'published' && post.metadata.status !== 'draft') {
          failed.push({ id: postId, error: 'Can only publish draft posts' });
          continue;
        }

        if (newStatus === 'published') {
          this.validatePostForPublication(post);
        }

        // Update post
        const updateData: any = {
          metadata: {
            ...post.metadata,
            status: newStatus,
          },
        };

        if (newStatus === 'published' && publishDate) {
          updateData.metadata.publishedAt = publishDate;
        }

        await this.update(postId, updateData);
        successful.push(postId);
      } catch (error) {
        failed.push({
          id: postId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Invalidate caches if any posts were updated
    if (successful.length > 0) {
      await this.invalidateContentCaches();
    }

    return { successful, failed };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private validatePostForPublication(post: BlogPostEntity): void {
    const metadata = post.metadata;

    if (!metadata.title || metadata.title.trim().length === 0) {
      throw new Error('Post title is required for publication');
    }

    if (!metadata.excerpt || metadata.excerpt.trim().length === 0) {
      throw new Error('Post excerpt is required for publication');
    }

    if (!post.content || post.content.trim().length === 0) {
      throw new Error('Post content is required for publication');
    }

    if (!metadata.category || metadata.category.trim().length === 0) {
      throw new Error('Post category is required for publication');
    }

    if (!metadata.author || metadata.author.trim().length === 0) {
      throw new Error('Post author is required for publication');
    }

    // SEO validation
    if (
      !metadata.seoMetadata.metaTitle ||
      metadata.seoMetadata.metaTitle.length === 0
    ) {
      throw new Error('SEO meta title is required for publication');
    }

    if (
      !metadata.seoMetadata.metaDescription ||
      metadata.seoMetadata.metaDescription.length === 0
    ) {
      throw new Error('SEO meta description is required for publication');
    }
  }

  private calculateEngagementScore(post: BlogPostEntity): number {
    const views = post.metadata.viewCount || 0;
    const likes = post.metadata.likeCount || 0;
    const comments = post.metadata.commentCount || 0;

    // Weighted engagement score
    return views * 0.1 + likes * 2 + comments * 3;
  }

  private async trackUserEngagement(
    postId: string,
    userId: string,
    eventType: string
  ): Promise<void> {
    // This would integrate with the analytics repository
    // For demo purposes, we'll just log it
    console.log(`Tracking: User ${userId} ${eventType} on post ${postId}`);
  }

  private async invalidateContentCaches(): Promise<void> {
    // This would integrate with your caching system
    // For demo purposes, we'll just log it
    console.log('Invalidating content caches...');
  }
}

/**
 * Analytics repository with aggregation and reporting capabilities
 */
@Injectable()
@ChromaRepository<AnalyticsEventEntity>({
  collection: 'analytics_events',
  autoEmbed: true,
  enableCaching: false, // Analytics data should be fresh
})
export class AnalyticsRepository extends BaseChromaRepository<AnalyticsEventEntity> {
  constructor() {
    super();
  }

  /**
   * Tracks user behavior events with session management
   */
  async trackEvent(eventData: {
    userId: string;
    sessionId: string;
    eventType: string;
    eventData: Record<string, any>;
    userAgent: string;
    ipAddress: string;
    referrer?: string;
    page: string;
    duration?: number;
  }): Promise<AnalyticsEventEntity> {
    const event: Omit<AnalyticsEventEntity, 'id'> = {
      content: `${eventData.eventType} event on ${eventData.page} by user ${eventData.userId}`,
      metadata: {
        ...eventData,
        timestamp: new Date().toISOString(),
      },
    };

    return this.create(event);
  }

  /**
   * Generates user behavior insights
   */
  async getUserBehaviorInsights(
    userId: string,
    timeframe: { start: string; end: string }
  ): Promise<{
    totalEvents: number;
    sessionCount: number;
    averageSessionDuration: number;
    topPages: Array<{ page: string; visits: number }>;
    eventTypeBreakdown: Record<string, number>;
    deviceInfo: { userAgents: string[]; uniqueDevices: number };
  }> {
    const events = await this.findAll({
      where: {
        userId,
        timestamp: { $gte: timeframe.start, $lte: timeframe.end },
      },
    });

    // Calculate metrics
    const sessionIds = new Set(events.map((e) => e.metadata.sessionId));
    const sessionCount = sessionIds.size;

    // Calculate average session duration
    const sessionDurations = new Map<string, number>();
    events.forEach((event) => {
      if (event.metadata.duration) {
        const sessionId = event.metadata.sessionId;
        sessionDurations.set(
          sessionId,
          Math.max(
            sessionDurations.get(sessionId) || 0,
            event.metadata.duration
          )
        );
      }
    });

    const averageSessionDuration =
      sessionDurations.size > 0
        ? Array.from(sessionDurations.values()).reduce((a, b) => a + b, 0) /
          sessionDurations.size
        : 0;

    // Top pages
    const pageVisits = new Map<string, number>();
    events.forEach((event) => {
      const page = event.metadata.page;
      pageVisits.set(page, (pageVisits.get(page) || 0) + 1);
    });

    const topPages = Array.from(pageVisits.entries())
      .map(([page, visits]) => ({ page, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    // Event type breakdown
    const eventTypeBreakdown: Record<string, number> = {};
    events.forEach((event) => {
      const eventType = event.metadata.eventType;
      eventTypeBreakdown[eventType] = (eventTypeBreakdown[eventType] || 0) + 1;
    });

    // Device info
    const userAgents = [...new Set(events.map((e) => e.metadata.userAgent))];

    return {
      totalEvents: events.length,
      sessionCount,
      averageSessionDuration,
      topPages,
      eventTypeBreakdown,
      deviceInfo: {
        userAgents,
        uniqueDevices: userAgents.length,
      },
    };
  }

  /**
   * Real-time analytics aggregation
   */
  async getRealtimeAnalytics(
    timeWindow = 60 // minutes
  ): Promise<{
    activeUsers: number;
    activeSessions: number;
    topPages: Array<{ page: string; activeUsers: number }>;
    eventVolume: Array<{ minute: string; count: number }>;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow * 60 * 1000);

    const recentEvents = await this.findAll({
      where: {
        timestamp: { $gte: windowStart.toISOString() },
      },
    });

    // Active users and sessions
    const activeUsers = new Set(recentEvents.map((e) => e.metadata.userId))
      .size;
    const activeSessions = new Set(
      recentEvents.map((e) => e.metadata.sessionId)
    ).size;

    // Top pages by active users
    const pageUsers = new Map<string, Set<string>>();
    recentEvents.forEach((event) => {
      const page = event.metadata.page;
      if (!pageUsers.has(page)) {
        pageUsers.set(page, new Set());
      }
      pageUsers.get(page)!.add(event.metadata.userId);
    });

    const topPages = Array.from(pageUsers.entries())
      .map(([page, users]) => ({ page, activeUsers: users.size }))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10);

    // Event volume by minute
    const eventsByMinute = new Map<string, number>();
    recentEvents.forEach((event) => {
      const minute = new Date(event.metadata.timestamp);
      minute.setSeconds(0, 0);
      const minuteKey = minute.toISOString();
      eventsByMinute.set(minuteKey, (eventsByMinute.get(minuteKey) || 0) + 1);
    });

    const eventVolume = Array.from(eventsByMinute.entries())
      .map(([minute, count]) => ({ minute, count }))
      .sort((a, b) => a.minute.localeCompare(b.minute));

    return {
      activeUsers,
      activeSessions,
      topPages,
      eventVolume,
    };
  }
}

// ============================================================================
// 3. DEMONSTRATION SERVICE
// ============================================================================

@Injectable()
export class CustomRepositoryMethodsDemoService implements OnModuleInit {
  constructor(
    private readonly blogRepo: BlogPostRepository,
    private readonly analyticsRepo: AnalyticsRepository
  ) {}

  async onModuleInit() {
    console.log('\n🎯 Custom Repository Methods Demo\n');
    await this.setupTestData();
    await this.demonstrateContentManagement();
    await this.demonstrateContentDiscovery();
    await this.demonstrateAnalytics();
    await this.demonstrateBulkOperations();
    await this.cleanup();
  }

  private async setupTestData(): Promise<void> {
    console.log('📚 Setting up blog and analytics test data...');

    const posts: Array<Omit<BlogPostEntity, 'id'>> = [
      {
        title: 'Getting Started with Vector Databases',
        excerpt:
          'Learn the fundamentals of vector databases and their applications in AI',
        content:
          'Vector databases are revolutionizing how we store and search through high-dimensional data...',
        metadata: {
          title: 'Getting Started with Vector Databases',
          excerpt:
            'Learn the fundamentals of vector databases and their applications in AI',
          author: 'John Tech',
          category: 'Technology',
          tags: ['vector-database', 'ai', 'machine-learning'],
          status: 'published',
          publishedAt: '2024-01-15T10:00:00Z',
          viewCount: 1250,
          likeCount: 89,
          commentCount: 23,
          readingTime: 8,
          featured: true,
          seoMetadata: {
            metaTitle: 'Vector Databases Guide - Learn AI Data Storage',
            metaDescription:
              'Complete guide to vector databases for AI applications',
            keywords: [
              'vector database',
              'ai',
              'machine learning',
              'embeddings',
            ],
          },
        },
      },
      {
        title: 'Building Scalable APIs with NestJS',
        excerpt:
          'Best practices for creating enterprise-grade APIs using NestJS framework',
        content:
          'NestJS provides a robust foundation for building scalable server-side applications...',
        metadata: {
          title: 'Building Scalable APIs with NestJS',
          excerpt:
            'Best practices for creating enterprise-grade APIs using NestJS framework',
          author: 'Sarah Backend',
          category: 'Development',
          tags: ['nestjs', 'api', 'typescript', 'backend'],
          status: 'published',
          publishedAt: '2024-01-20T14:30:00Z',
          viewCount: 945,
          likeCount: 67,
          commentCount: 18,
          readingTime: 12,
          featured: false,
          seoMetadata: {
            metaTitle: 'NestJS API Development - Best Practices Guide',
            metaDescription:
              'Learn to build scalable APIs with NestJS framework',
            keywords: ['nestjs', 'api', 'typescript', 'backend development'],
          },
        },
      },
    ];

    await this.blogRepo.createMany(posts);
    console.log(`  ✅ Created ${posts.length} blog posts\n`);
  }

  private async demonstrateContentManagement(): Promise<void> {
    console.log('📝 Content Management Demo:');

    try {
      // Create a draft post
      const draftPost = await this.blogRepo.create({
        content: 'In this comprehensive guide, we explore advanced patterns...',
        metadata: {
          title: 'Advanced ChromaDB Patterns',
          excerpt: 'Deep dive into advanced ChromaDB usage patterns',
          author: 'Expert Dev',
          category: 'Technology',
          tags: ['chromadb', 'advanced', 'patterns'],
          status: 'draft',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          readingTime: 15,
          featured: false,
          seoMetadata: {
            metaTitle: 'Advanced ChromaDB Patterns - Expert Guide',
            metaDescription: 'Master advanced ChromaDB patterns and techniques',
            keywords: ['chromadb', 'advanced', 'patterns', 'expert'],
          },
        },
      });

      console.log(`  📄 Created draft post: "${draftPost.metadata.title}"`);

      // Publish the draft
      const publishedPost = await this.blogRepo.publishPost(draftPost.id);
      console.log(`  📢 Published post: "${publishedPost?.metadata.title}"`);
      console.log(`  📅 Published at: ${publishedPost?.metadata.publishedAt}`);

      // Simulate engagement
      await this.blogRepo.incrementViewCount(publishedPost!.id, 'user-123');
      await this.blogRepo.updateEngagement(
        publishedPost!.id,
        { likesDelta: 1 },
        'user-456'
      );
      console.log('  👍 Updated engagement metrics');
    } catch (error: any) {
      console.error('  ❌ Error in content management:', error.message);
    }

    console.log('');
  }

  private async demonstrateContentDiscovery(): Promise<void> {
    console.log('🔍 Content Discovery Demo:');

    try {
      const allPosts = await this.blogRepo.findAll({ limit: 10 });

      if (allPosts.length > 0) {
        const firstPost = allPosts[0];

        // Find related posts
        const relatedPosts = await this.blogRepo.findRelatedPosts(
          firstPost.id,
          {
            maxResults: 3,
            sameCategory: true,
          }
        );
        console.log(
          `  🔗 Found ${relatedPosts.length} related posts to "${firstPost.metadata.title}"`
        );

        // Get trending posts
        const trendingPosts = await this.blogRepo.getTrendingPosts('week', 5);
        console.log(
          `  📈 Found ${trendingPosts.length} trending posts this week`
        );

        // Search content
        const searchResults = await this.blogRepo.searchContent(
          'vector database AI',
          {
            category: 'Technology',
            status: 'published',
            includeScores: true,
          }
        );
        console.log(`  🔍 Search found ${searchResults.length} relevant posts`);

        searchResults.forEach((result, index) => {
          console.log(
            `    ${index + 1}. "${result.post.metadata.title}" ${
              result.score ? `(${result.score.toFixed(3)})` : ''
            }`
          );
        });
      }
    } catch (error: any) {
      console.error('  ❌ Error in content discovery:', error.message);
    }

    console.log('');
  }

  private async demonstrateAnalytics(): Promise<void> {
    console.log('📊 Analytics Demo:');

    try {
      // Generate analytics report
      const analytics = await this.blogRepo.getContentAnalytics({
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z',
      });

      console.log('  📈 Content Analytics Report:');
      console.log(`    📚 Total posts: ${analytics.totalPosts}`);
      console.log(`    ✅ Published posts: ${analytics.publishedPosts}`);
      console.log(`    👀 Total views: ${analytics.totalViews}`);
      console.log(`    👍 Total likes: ${analytics.totalLikes}`);
      console.log(`    💬 Total comments: ${analytics.totalComments}`);
      console.log(
        `    📊 Average engagement: ${analytics.averageEngagement.toFixed(2)}`
      );

      console.log('    🏆 Top performing posts:');
      analytics.topPosts.slice(0, 3).forEach((item, index) => {
        console.log(
          `      ${index + 1}. "${
            item.post.metadata.title
          }" (score: ${item.score.toFixed(1)})`
        );
      });

      console.log('    📂 Category breakdown:');
      Object.entries(analytics.categoryBreakdown).forEach(
        ([category, count]) => {
          console.log(`      ${category}: ${count} posts`);
        }
      );

      // Track some analytics events
      await this.analyticsRepo.trackEvent({
        userId: 'user-123',
        sessionId: 'session-abc',
        eventType: 'page_view',
        eventData: { postId: 'post-1' },
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        page: '/blog/vector-databases',
      });

      console.log('  📊 Tracked analytics event');
    } catch (error: any) {
      console.error('  ❌ Error in analytics demo:', error.message);
    }

    console.log('');
  }

  private async demonstrateBulkOperations(): Promise<void> {
    console.log('📦 Bulk Operations Demo:');

    try {
      // Get some posts to work with
      const posts = await this.blogRepo.findAll({ limit: 5 });
      const draftPosts = posts.filter((p) => p.metadata.status === 'draft');

      if (draftPosts.length > 0) {
        const postIds = draftPosts.map((p) => p.id);

        // Bulk publish posts
        const bulkResult = await this.blogRepo.bulkUpdateStatus(
          postIds,
          'published'
        );

        console.log(`  📢 Bulk publish results:`);
        console.log(`    ✅ Successful: ${bulkResult.successful.length} posts`);
        console.log(`    ❌ Failed: ${bulkResult.failed.length} posts`);

        bulkResult.failed.forEach((failure) => {
          console.log(`      ${failure.id}: ${failure.error}`);
        });
      } else {
        console.log('  📝 No draft posts available for bulk operations');
      }
    } catch (error: any) {
      console.error('  ❌ Error in bulk operations:', error.message);
    }

    console.log('');
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      await this.blogRepo.clear();
      await this.analyticsRepo.clear();
      console.log('  ✅ Cleared all test data');
    } catch (error: any) {
      console.error('  ❌ Error during cleanup:', error.message);
    }

    console.log('');
  }
}

// ============================================================================
// 4. MODULE DEFINITION
// ============================================================================

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false,
    }),
  ],
  providers: [
    BlogPostRepository,
    AnalyticsRepository,
    CustomRepositoryMethodsDemoService,
  ],
  exports: [BlogPostRepository, AnalyticsRepository],
})
export class CustomRepositoryMethodsExampleModule {}

/**
 * Custom Repository Methods Best Practices:
 *
 * 1. **Business Logic Encapsulation**: Keep domain logic in repositories
 * 2. **Method Composition**: Combine base methods for complex operations
 * 3. **Error Handling**: Provide meaningful error messages and rollback
 * 4. **Performance**: Use bulk operations and caching strategically
 * 5. **Validation**: Validate business rules before data operations
 * 6. **Analytics**: Track important business events automatically
 * 7. **Consistency**: Maintain data integrity across operations
 * 8. **Testing**: Write comprehensive tests for custom methods
 */
