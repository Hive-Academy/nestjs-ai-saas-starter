import { Injectable, Inject } from '@nestjs/common';
import { getRepositoryToken as getChromaRepositoryToken } from '@hive-academy/nestjs-chromadb';
import { BrandMentionRepository } from '../repositories/chromadb/brand-mention.repository';
import { BrandMentionEntity } from '../entities/chromadb/brand-mention.entity';

/**
 * Alert types for brand monitoring
 */
export interface Alert {
  type: 'high-activity' | 'negative-sentiment' | 'viral-potential';
  message: string;
}

/**
 * Trending topic data
 */
export interface TrendingTopic {
  topic: string;
  count: number;
  trending: boolean; // True if count > 5 in last 7 days
}

/**
 * Comprehensive brand analytics
 */
export interface BrandAnalytics {
  totalMentions: number;
  sentimentScore: number; // 0-1 (percentage positive)
  reachScore: number; // Total reach across all mentions
  engagementRate: number; // Total engagement / total reach
  topInfluencers: Array<{
    id: string;
    platform: string;
    influencerScore: number;
  }>;
  trendingTopics: string[];
  alerts: Alert[];
}

/**
 * Performance metrics for monitoring service
 */
export interface PerformanceMetrics {
  queryCount: number;
  averageQueryTime: number;
  cacheHitRate: number;
  totalMentionsProcessed: number;
  lastUpdateTimestamp: string;
}

/**
 * BrandMonitoringService - Real-time brand monitoring and analytics
 *
 * Purpose: Monitor brand mentions across social platforms with sentiment analysis
 * Features:
 * - Real-time mention tracking
 * - Sentiment analysis
 * - Influencer identification
 * - Trending topic detection
 * - Automated alert generation
 */
@Injectable()
export class BrandMonitoringService {
  private queryCount = 0;
  private totalQueryTime = 0;
  private cacheHits = 0;
  private cacheRequests = 0;
  private totalMentionsProcessed = 0;

  constructor(
    @Inject(getChromaRepositoryToken(BrandMentionEntity))
    private readonly brandMentionRepository: BrandMentionRepository
  ) {}

  /**
   * Monitor brand mentions and generate comprehensive analytics
   *
   * @param userId - User ID to monitor mentions for
   * @returns Comprehensive brand analytics with alerts
   */
  async monitorBrandMentions(userId: string): Promise<BrandAnalytics> {
    const startTime = Date.now();

    try {
      // Fetch recent mentions (last 24 hours)
      const recentMentions =
        await this.brandMentionRepository.getRecentMentions(userId, 24);

      this.totalMentionsProcessed += recentMentions.length;

      // Calculate sentiment score (percentage positive)
      const sentimentScore = this.calculateSentimentScore(recentMentions);

      // Calculate total reach
      const reachScore = recentMentions.reduce(
        (sum, mention) => sum + mention.metadata.reach,
        0
      );

      // Calculate engagement rate
      const totalEngagement = recentMentions.reduce(
        (sum, mention) => sum + mention.metadata.engagement,
        0
      );
      const engagementRate = reachScore > 0 ? totalEngagement / reachScore : 0;

      // Get top influencers
      const topInfluencers =
        await this.brandMentionRepository.getTopInfluencers(userId, 10);

      // Get trending topics
      const trendingTopicsData = await this.getTrendingTopics(userId);
      const trendingTopics = trendingTopicsData
        .filter((topic) => topic.trending)
        .map((topic) => topic.topic);

      // Generate alerts
      const alerts = this.generateAlerts(
        recentMentions,
        sentimentScore,
        reachScore
      );

      return {
        totalMentions: recentMentions.length,
        sentimentScore,
        reachScore,
        engagementRate,
        topInfluencers,
        trendingTopics,
        alerts,
      };
    } finally {
      // Track performance metrics
      this.queryCount++;
      this.totalQueryTime += Date.now() - startTime;
    }
  }

  /**
   * Get trending topics with trend detection
   *
   * @param userId - User ID to analyze topics for
   * @returns Array of trending topics with counts
   */
  async getTrendingTopics(userId: string): Promise<TrendingTopic[]> {
    const startTime = Date.now();

    try {
      // Get topics from last 7 days
      const topicCounts = await this.brandMentionRepository.getTrendingTopics(
        userId,
        168 // 7 days
      );

      // Convert to array and determine trending status
      const topics: TrendingTopic[] = [];
      topicCounts.forEach((count, topic) => {
        topics.push({
          topic,
          count,
          trending: count > 5, // Trending if more than 5 mentions in 7 days
        });
      });

      // Sort by count descending
      return topics.sort((a, b) => b.count - a.count);
    } finally {
      this.queryCount++;
      this.totalQueryTime += Date.now() - startTime;
    }
  }

  /**
   * Get performance metrics for the monitoring service
   *
   * @returns Performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return {
      queryCount: this.queryCount,
      averageQueryTime:
        this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      cacheHitRate:
        this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0,
      totalMentionsProcessed: this.totalMentionsProcessed,
      lastUpdateTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Get mentions by sentiment
   *
   * @param userId - User ID to filter mentions
   * @param sentiment - Sentiment type
   * @returns Array of mentions with specified sentiment
   */
  async getMentionsBySentiment(
    userId: string,
    sentiment: 'positive' | 'neutral' | 'negative'
  ): Promise<BrandMentionEntity[]> {
    return this.brandMentionRepository.getMentionsBySentiment(
      userId,
      sentiment
    );
  }

  /**
   * Get high-impact mentions
   *
   * @param userId - User ID to filter mentions
   * @param minReach - Minimum reach threshold
   * @returns Array of high-impact mentions
   */
  async getHighImpactMentions(
    userId: string,
    minReach = 1000
  ): Promise<BrandMentionEntity[]> {
    return this.brandMentionRepository.getHighImpactMentions(userId, minReach);
  }

  /**
   * Get mentions by platform
   *
   * @param userId - User ID to filter mentions
   * @param platform - Social platform name
   * @returns Array of mentions from specified platform
   */
  async getMentionsByPlatform(
    userId: string,
    platform: 'twitter' | 'linkedin' | 'reddit' | 'dev.to' | 'medium'
  ): Promise<BrandMentionEntity[]> {
    return this.brandMentionRepository.getMentionsByPlatform(userId, platform);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Calculate sentiment score (percentage positive)
   *
   * @param mentions - Array of brand mentions
   * @returns Sentiment score (0-1)
   */
  private calculateSentimentScore(mentions: BrandMentionEntity[]): number {
    if (mentions.length === 0) return 0;

    const positiveMentions = mentions.filter(
      (m) => m.metadata.sentiment === 'positive'
    ).length;

    return positiveMentions / mentions.length;
  }

  /**
   * Generate alerts based on mention patterns
   *
   * @param mentions - Recent brand mentions
   * @param sentimentScore - Overall sentiment score
   * @param reachScore - Total reach
   * @returns Array of alerts
   */
  private generateAlerts(
    mentions: BrandMentionEntity[],
    sentimentScore: number,
    reachScore: number
  ): Alert[] {
    const alerts: Alert[] = [];

    // High activity alert: > 50 mentions in 24 hours
    if (mentions.length > 50) {
      alerts.push({
        type: 'high-activity',
        message: `High activity detected: ${mentions.length} mentions in the last 24 hours`,
      });
    }

    // Negative sentiment alert: > 30% negative mentions
    const negativeMentions = mentions.filter(
      (m) => m.metadata.sentiment === 'negative'
    ).length;
    const negativePercentage =
      mentions.length > 0 ? negativeMentions / mentions.length : 0;

    if (negativePercentage > 0.3) {
      alerts.push({
        type: 'negative-sentiment',
        message: `Negative sentiment spike: ${(
          negativePercentage * 100
        ).toFixed(1)}% of mentions are negative`,
      });
    }

    // Viral potential alert: Single mention with reach > 10,000
    const viralMentions = mentions.filter((m) => m.metadata.reach > 10000);
    if (viralMentions.length > 0) {
      const maxReach = Math.max(...viralMentions.map((m) => m.metadata.reach));
      alerts.push({
        type: 'viral-potential',
        message: `Viral potential detected: Mention with ${maxReach.toLocaleString()} reach`,
      });
    }

    return alerts;
  }

  /**
   * Reset performance metrics (for testing/debugging)
   */
  resetMetrics(): void {
    this.queryCount = 0;
    this.totalQueryTime = 0;
    this.cacheHits = 0;
    this.cacheRequests = 0;
    this.totalMentionsProcessed = 0;
  }
}
