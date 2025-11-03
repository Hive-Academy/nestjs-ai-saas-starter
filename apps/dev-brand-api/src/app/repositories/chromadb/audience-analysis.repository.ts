import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  Profiled,
  Retry,
} from '@hive-academy/nestjs-chromadb';
import { AudienceAnalysisEntity } from '../../entities/chromadb/audience-analysis.entity';

/**
 * AudienceInsights - Comprehensive audience analysis results
 */
export interface AudienceInsights {
  demographics: {
    primaryRole: string;
    industrySegments: string[];
    seniorityDistribution: Record<string, number>;
  };
  contentPreferences: string[];
  engagementPatterns: {
    bestPostingTimes: string[];
    preferredFormats: string[];
    topicInterests: string[];
  };
  platformRecommendations: string[];
}

/**
 * AudienceRepository - Analytics-focused repository for audience analysis
 *
 * Purpose: Analyze developer audiences and optimize content strategy
 * Use Cases:
 * - Identify target audience demographics and preferences
 * - Analyze content engagement patterns by platform
 * - Generate personalized content recommendations
 * - Optimize posting schedules for maximum engagement
 * - Track audience evolution over time
 */
@Injectable()
export class AudienceRepository extends ChromaDBRepository<AudienceAnalysisEntity> {
  constructor(
    chromaDB: ChromaDBService,
    collectionRegistry: CollectionRegistryService
  ) {
    super(
      AudienceAnalysisEntity,
      'audience-analysis',
      chromaDB,
      collectionRegistry
    );
  }

  /**
   * Analyze target audience and generate insights
   *
   * @param targetRole - Developer role to analyze (e.g., 'Frontend Dev', 'Backend Dev')
   * @returns Comprehensive audience insights with recommendations
   */
  @Profiled({ slowQueryThreshold: 200 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeTargetAudience(targetRole: string): Promise<AudienceInsights> {
    // 1. Search for similar audiences using semantic search
    const audienceProfiles = await this.search(
      `${targetRole} developer audience`,
      { limit: 50 }
    );

    // 2. Filter to exact role matches for higher accuracy
    const exactMatches = audienceProfiles.filter(
      (profile) =>
        profile.metadata.targetRole.toLowerCase() === targetRole.toLowerCase()
    );

    // Use exact matches if available, otherwise use semantic results
    const relevantProfiles =
      exactMatches.length > 0 ? exactMatches : audienceProfiles;

    // 3. Aggregate demographics
    const demographics = this.aggregateDemographics(relevantProfiles);

    // 4. Analyze content preferences
    const contentPreferences = this.analyzeContentPreferences(relevantProfiles);

    // 5. Extract engagement patterns
    const engagementPatterns = this.extractEngagementPatterns(relevantProfiles);

    // 6. Generate platform recommendations
    const platformRecommendations =
      this.generatePlatformRecommendations(relevantProfiles);

    return {
      demographics,
      contentPreferences,
      engagementPatterns,
      platformRecommendations,
    };
  }

  /**
   * Find audiences by preferred platform
   *
   * @param platform - Platform name (e.g., 'LinkedIn', 'Dev.to', 'Medium')
   * @returns Array of audience profiles using the platform
   */
  @Profiled({ slowQueryThreshold: 100 })
  async findByPlatform(platform: string): Promise<AudienceAnalysisEntity[]> {
    const allAudiences = await this.findAll({ limit: 1000 });

    return allAudiences.filter((audience) =>
      audience.metadata.platforms.some(
        (p) => p.toLowerCase() === platform.toLowerCase()
      )
    );
  }

  /**
   * Find audiences by seniority level
   *
   * @param level - Seniority level (e.g., 'Junior', 'Mid', 'Senior', 'Lead')
   * @returns Array of audience profiles at the seniority level
   */
  @Profiled({ slowQueryThreshold: 100 })
  async findBySeniorityLevel(level: string): Promise<AudienceAnalysisEntity[]> {
    const allAudiences = await this.findAll({ limit: 1000 });

    return allAudiences.filter(
      (audience) =>
        audience.metadata.seniorityLevel.toLowerCase() === level.toLowerCase()
    );
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Aggregate demographic data from audience profiles
   */
  private aggregateDemographics(
    profiles: AudienceAnalysisEntity[]
  ): AudienceInsights['demographics'] {
    if (profiles.length === 0) {
      return {
        primaryRole: 'Unknown',
        industrySegments: [],
        seniorityDistribution: {},
      };
    }

    // Extract primary role (most common)
    const roleCounts = new Map<string, number>();
    profiles.forEach((profile) => {
      const role = profile.metadata.targetRole;
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });

    const primaryRole = Array.from(roleCounts.entries()).sort(
      ([, a], [, b]) => b - a
    )[0][0];

    // Extract unique industry segments
    const industrySet = new Set<string>();
    profiles.forEach((profile) => {
      industrySet.add(profile.metadata.industrySegment);
    });

    const industrySegments = Array.from(industrySet);

    // Calculate seniority distribution
    const seniorityDistribution: Record<string, number> = {};
    profiles.forEach((profile) => {
      const level = profile.metadata.seniorityLevel;
      seniorityDistribution[level] = (seniorityDistribution[level] || 0) + 1;
    });

    // Normalize to percentages
    const total = profiles.length;
    Object.keys(seniorityDistribution).forEach((level) => {
      seniorityDistribution[level] =
        Math.round((seniorityDistribution[level] / total) * 100 * 10) / 10;
    });

    return {
      primaryRole,
      industrySegments,
      seniorityDistribution,
    };
  }

  /**
   * Analyze and rank content preferences
   */
  private analyzeContentPreferences(
    profiles: AudienceAnalysisEntity[]
  ): string[] {
    const preferenceCounts = new Map<string, number>();

    profiles.forEach((profile) => {
      profile.metadata.contentPreferences.forEach((pref) => {
        preferenceCounts.set(pref, (preferenceCounts.get(pref) || 0) + 1);
      });
    });

    return Array.from(preferenceCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pref]) => pref);
  }

  /**
   * Extract and aggregate engagement patterns
   */
  private extractEngagementPatterns(
    profiles: AudienceAnalysisEntity[]
  ): AudienceInsights['engagementPatterns'] {
    const postingTimeCounts = new Map<string, number>();
    const formatCounts = new Map<string, number>();
    const topicCounts = new Map<string, number>();

    profiles.forEach((profile) => {
      // Aggregate posting times
      profile.metadata.engagementPatterns.bestPostingTimes.forEach((time) => {
        postingTimeCounts.set(time, (postingTimeCounts.get(time) || 0) + 1);
      });

      // Aggregate preferred formats
      profile.metadata.engagementPatterns.preferredFormats.forEach((format) => {
        formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
      });

      // Aggregate topic interests
      profile.metadata.engagementPatterns.topicInterests.forEach((topic) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    return {
      bestPostingTimes: Array.from(postingTimeCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([time]) => time),
      preferredFormats: Array.from(formatCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([format]) => format),
      topicInterests: Array.from(topicCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic]) => topic),
    };
  }

  /**
   * Generate platform recommendations based on audience data
   */
  private generatePlatformRecommendations(
    profiles: AudienceAnalysisEntity[]
  ): string[] {
    const platformCounts = new Map<string, number>();
    const platformScores = new Map<string, number>();

    profiles.forEach((profile) => {
      profile.metadata.platforms.forEach((platform) => {
        platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);

        // Calculate score based on platform usage and content preferences
        const contentPreferenceScore =
          profile.metadata.contentPreferences.length;
        const interestScore =
          profile.metadata.engagementPatterns.topicInterests.length;

        const score = contentPreferenceScore + interestScore;
        platformScores.set(
          platform,
          (platformScores.get(platform) || 0) + score
        );
      });
    });

    // Generate recommendations with reasoning
    return Array.from(platformScores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([platform, score]) => {
        const usageCount = platformCounts.get(platform) || 0;
        const usagePercentage = Math.round(
          (usageCount / profiles.length) * 100
        );

        return `${platform} - ${usagePercentage}% audience reach with engagement score ${score}`;
      });
  }
}
