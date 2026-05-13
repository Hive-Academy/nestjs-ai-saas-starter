import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  Profiled,
  Retry,
} from '@hive-academy/nestjs-chromadb';
import { BrandMentionEntity } from '../../entities/chromadb/brand-mention.entity';

/**
 * BrandMentionRepository - Analytics-focused repository for brand mentions
 *
 * NOTE: Simple queries (findById, search) use auto-generated repo.
 * This custom repo contains complex brand monitoring and analytics.
 */
@Injectable()
export class BrandMentionRepository extends ChromaDBRepository<BrandMentionEntity> {
  constructor(
    chromaDB: ChromaDBService,
    collectionRegistry: CollectionRegistryService
  ) {
    super(BrandMentionEntity, 'brand-mentions', chromaDB, collectionRegistry);
  }

  /**
   * Get recent brand mentions within specified hours
   *
   * @param userId - User ID to filter mentions
   * @param hours - Number of hours to look back (default: 24)
   * @returns Array of recent brand mentions
   */
  @Profiled({ slowQueryThreshold: 100 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getRecentMentions(
    userId: string,
    hours = 24
  ): Promise<BrandMentionEntity[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);
    const cutoffTimestamp = cutoffDate.toISOString();

    try {
      // Use server-side filtering with ChromaDB where clause
      const results = await this.findAll({
        where: {
          userId,
        } as any,
        limit: 1000,
      });

      // Client-side filtering for timestamp (ChromaDB metadata filtering limitation)
      return results.filter((mention) => {
        const createdAt = mention.createdAt || mention.metadata.createdAt;
        return createdAt && createdAt >= cutoffTimestamp;
      });
    } catch (error) {
      throw new Error(
        `Failed to fetch recent mentions for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get brand mentions filtered by sentiment
   *
   * @param userId - User ID to filter mentions
   * @param sentiment - Sentiment type ('positive', 'neutral', 'negative')
   * @returns Array of brand mentions with specified sentiment
   */
  @Profiled({ slowQueryThreshold: 100 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getMentionsBySentiment(
    userId: string,
    sentiment: 'positive' | 'neutral' | 'negative'
  ): Promise<BrandMentionEntity[]> {
    try {
      // Use server-side filtering with ChromaDB where clause
      return await this.findAll({
        where: {
          userId,
          sentiment,
        } as any,
        limit: 1000,
      });
    } catch (error) {
      throw new Error(
        `Failed to fetch ${sentiment} mentions for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get high-impact brand mentions based on reach threshold
   *
   * @param userId - User ID to filter mentions
   * @param minReach - Minimum reach threshold (default: 1000)
   * @returns Array of high-impact brand mentions
   */
  @Profiled({ slowQueryThreshold: 100 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getHighImpactMentions(
    userId: string,
    minReach = 1000
  ): Promise<BrandMentionEntity[]> {
    try {
      // Fetch all mentions for user
      const allMentions = await this.findAll({
        where: { userId } as any,
        limit: 1000,
      });

      // Client-side filtering for reach threshold (ChromaDB numeric comparison limitation)
      return allMentions
        .filter((mention) => mention.metadata.reach >= minReach)
        .sort((a, b) => b.metadata.reach - a.metadata.reach);
    } catch (error) {
      throw new Error(
        `Failed to fetch high-impact mentions for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get mentions by platform
   *
   * @param userId - User ID to filter mentions
   * @param platform - Social platform name
   * @returns Array of brand mentions from specified platform
   */
  @Profiled({ slowQueryThreshold: 100 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getMentionsByPlatform(
    userId: string,
    platform: 'twitter' | 'linkedin' | 'reddit' | 'dev.to' | 'medium'
  ): Promise<BrandMentionEntity[]> {
    try {
      return await this.findAll({
        where: {
          userId,
          platform,
        } as any,
        limit: 1000,
      });
    } catch (error) {
      throw new Error(
        `Failed to fetch ${platform} mentions for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get trending topics from recent mentions
   *
   * @param userId - User ID to filter mentions
   * @param hours - Number of hours to look back (default: 24)
   * @returns Map of topics to mention counts
   */
  @Profiled({ slowQueryThreshold: 150 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getTrendingTopics(
    userId: string,
    hours = 24
  ): Promise<Map<string, number>> {
    try {
      const recentMentions = await this.getRecentMentions(userId, hours);
      const topicCounts = new Map<string, number>();

      // Aggregate topic counts
      recentMentions.forEach((mention) => {
        mention.metadata.topics.forEach((topic) => {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        });
      });

      return topicCounts;
    } catch (error) {
      throw new Error(
        `Failed to fetch trending topics for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get top influencers who mentioned the brand
   *
   * @param userId - User ID to filter mentions
   * @param limit - Maximum number of influencers to return (default: 10)
   * @returns Array of top influencers with their scores
   */
  @Profiled({ slowQueryThreshold: 150 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getTopInfluencers(
    userId: string,
    limit = 10
  ): Promise<Array<{ id: string; platform: string; influencerScore: number }>> {
    try {
      const allMentions = await this.findAll({
        where: { userId } as any,
        limit: 1000,
      });

      // Sort by influencer score and return top N
      return allMentions
        .map((mention) => ({
          id: mention.id,
          platform: mention.metadata.platform,
          influencerScore: mention.metadata.influencerScore,
        }))
        .sort((a, b) => b.influencerScore - a.influencerScore)
        .slice(0, limit);
    } catch (error) {
      throw new Error(
        `Failed to fetch top influencers for user ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
