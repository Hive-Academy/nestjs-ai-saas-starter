import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  Profiled,
  Cached,
} from '@hive-academy/nestjs-chromadb';
import { ContentPerformanceEntity } from '../../entities/chromadb/content-performance.entity';

/**
 * ContentPerformanceRepository - Analytics-focused repository
 *
 * NOTE: Simple queries (findByUserId, findHighPerformingContent) use auto-generated repo.
 * This custom repo only contains complex analytics methods.
 */
@Injectable()
export class ContentPerformanceRepository extends ChromaDBRepository<ContentPerformanceEntity> {
  constructor(chromaDB: ChromaDBService) {
    super(ContentPerformanceEntity, 'content-metrics', chromaDB);
  }

  /**
   * Get comprehensive content optimization insights
   * Complex analytics with platform, timing, and topic analysis
   */
  @Profiled({ slowQueryThreshold: 200 })
  @Cached({ ttl: 1800000 })
  async getContentOptimizationInsights(userId: string): Promise<{
    bestPerformingPlatforms: Array<{ platform: string; avgEngagement: number }>;
    optimalPostingTimes: Array<{ time: string; engagementBoost: number }>;
    topPerformingTopics: Array<{ topic: string; averageEngagement: number }>;
    contentGaps: string[];
    recommendations: Array<{ action: string; expectedImprovement: number }>;
  }> {
    const content = await this.findAll({
      where: { userId } as any,
      limit: 50,
    });

    if (content.length === 0) {
      return {
        bestPerformingPlatforms: [],
        optimalPostingTimes: [],
        topPerformingTopics: [],
        contentGaps: ['No content history available'],
        recommendations: [
          {
            action: 'Start creating and tracking content performance',
            expectedImprovement: 0.5,
          },
        ],
      };
    }

    // Analyze platform performance
    const platformStats = new Map<
      string,
      { total: number; totalEngagement: number }
    >();
    content.forEach((item) => {
      const current = platformStats.get(item.metadata.platform) || {
        total: 0,
        totalEngagement: 0,
      };
      platformStats.set(item.metadata.platform, {
        total: current.total + 1,
        totalEngagement:
          current.totalEngagement + item.metadata.engagementScore,
      });
    });

    const bestPerformingPlatforms = Array.from(platformStats.entries())
      .map(([platform, stats]) => ({
        platform,
        avgEngagement: stats.totalEngagement / stats.total,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Analyze posting times
    const timeStats = new Map<
      string,
      { count: number; totalEngagement: number }
    >();
    content.forEach((item) => {
      const postingTime = item.metadata.optimization.bestPostingTime;
      const current = timeStats.get(postingTime) || {
        count: 0,
        totalEngagement: 0,
      };
      timeStats.set(postingTime, {
        count: current.count + 1,
        totalEngagement:
          current.totalEngagement + item.metadata.engagementScore,
      });
    });

    const optimalPostingTimes = Array.from(timeStats.entries())
      .map(([time, stats]) => ({
        time,
        engagementBoost: stats.totalEngagement / stats.count,
      }))
      .sort((a, b) => b.engagementBoost - a.engagementBoost)
      .slice(0, 3);

    // Analyze topics
    const topicStats = new Map<
      string,
      { count: number; totalEngagement: number }
    >();
    content.forEach((item) => {
      item.metadata.analysis.topics.forEach((topic) => {
        const current = topicStats.get(topic) || {
          count: 0,
          totalEngagement: 0,
        };
        topicStats.set(topic, {
          count: current.count + 1,
          totalEngagement:
            current.totalEngagement + item.metadata.engagementScore,
        });
      });
    });

    const topPerformingTopics = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        averageEngagement: stats.totalEngagement / stats.count,
      }))
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, 5);

    // Identify content gaps
    const contentGaps: string[] = [];
    const avgEngagement =
      content.reduce((sum, item) => sum + item.metadata.engagementScore, 0) /
      content.length;

    if (avgEngagement < 0.5)
      contentGaps.push('Overall engagement below average');
    if (bestPerformingPlatforms.length < 2)
      contentGaps.push('Limited platform diversification');
    if (topPerformingTopics.length < 3)
      contentGaps.push('Narrow topic coverage');

    // Generate recommendations
    const recommendations = this.generateContentRecommendations(
      bestPerformingPlatforms,
      topPerformingTopics,
      avgEngagement
    );

    return {
      bestPerformingPlatforms,
      optimalPostingTimes,
      topPerformingTopics,
      contentGaps,
      recommendations,
    };
  }

  /**
   * Private helper for getContentOptimizationInsights
   */
  private generateContentRecommendations(
    platforms: Array<{ platform: string; avgEngagement: number }>,
    topics: Array<{ topic: string; averageEngagement: number }>,
    avgEngagement: number
  ): Array<{ action: string; expectedImprovement: number }> {
    const recommendations: Array<{
      action: string;
      expectedImprovement: number;
    }> = [];

    if (platforms.length > 0) {
      const topPlatform = platforms[0];
      if (topPlatform.avgEngagement > avgEngagement + 0.2) {
        recommendations.push({
          action: `Focus more content on ${topPlatform.platform} - your best performing platform`,
          expectedImprovement: 0.3,
        });
      }
    }

    if (topics.length > 0) {
      const topTopic = topics[0];
      recommendations.push({
        action: `Create more content about ${topTopic.topic} - your top engaging topic`,
        expectedImprovement: 0.25,
      });
    }

    if (avgEngagement < 0.5) {
      recommendations.push({
        action:
          'Improve content quality and relevance to increase overall engagement',
        expectedImprovement: 0.4,
      });
    }

    return recommendations;
  }
}
