import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@hive-academy/nestjs-chromadb';
import {
  CompetitorAnalysisRepository,
  CompetitorProfile,
  CompetitiveAnalysis,
  MarketLandscape,
} from '../repositories/chromadb/competitor-analysis.repository';
import {
  DeveloperProfileRepository,
  CodingAnalysis,
} from '../repositories/chromadb/developer-profile.repository';
import { CompetitorAnalysisEntity } from '../entities/chromadb/competitor-analysis.entity';
import { DeveloperProfileEntity } from '../entities/chromadb/developer-profile.entity';

/**
 * Competitive Positioning Report
 */
export interface CompetitivePositioningReport {
  userProfile: {
    username: string;
    competitivenessScore: number;
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
    strengths: string[];
    weaknesses: string[];
  };
  directCompetitors: CompetitorAnalysisEntity[];
  aspirationalCompetitors: CompetitorAnalysisEntity[];
  emergingThreats: CompetitorAnalysisEntity[];
  marketGaps: {
    underservedAudiences: string[];
    underutilizedFormats: string[];
    contentOpportunities: string[];
  };
  recommendations: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  competitiveAdvantages: string[];
  vulnerabilities: string[];
}

/**
 * Differentiation Strategy
 */
export interface DifferentiationStrategy {
  primaryDifferentiators: string[];
  contentStrategy: {
    uniqueAngles: string[];
    formatInnovations: string[];
    audienceNiches: string[];
  };
  positioningStatement: string;
  competitiveMonat: {
    competitors: string[];
    metrics: string[];
    alertThresholds: {
      followerGrowth: number;
      engagementRate: number;
      contentFrequency: number;
    };
  };
  actionPlan: {
    immediate: string[];
    quarterly: string[];
    annual: string[];
  };
}

/**
 * Competitive Intelligence Service
 *
 * Orchestrates competitive analysis and market positioning strategies.
 * Combines competitor analysis with user profiles to generate actionable insights.
 *
 * @example
 * ```typescript
 * // Get competitive positioning
 * const report = await service.getCompetitivePositioning('user123');
 *
 * // Generate differentiation strategy
 * const strategy = await service.generateDifferentiationStrategy('user123');
 *
 * // Benchmark against competitors
 * const benchmark = await service.benchmarkAgainstCompetitors('user123', ['competitor1', 'competitor2']);
 * ```
 */
@Injectable()
export class CompetitiveIntelligenceService {
  constructor(
    @InjectRepository(CompetitorAnalysisEntity)
    private readonly competitorRepo: CompetitorAnalysisRepository,
    @InjectRepository(DeveloperProfileEntity)
    private readonly developerRepo: DeveloperProfileRepository
  ) {}

  /**
   * Get comprehensive competitive positioning report for a user
   *
   * @param userId - User identifier
   * @returns Comprehensive competitive positioning analysis
   */
  async getCompetitivePositioning(
    userId: string
  ): Promise<CompetitivePositioningReport> {
    // Get user's developer profile
    const userProfiles = await this.developerRepo.findAll({
      where: { githubUsername: userId } as any,
      limit: 1,
    });

    if (userProfiles.length === 0) {
      throw new Error(`Developer profile not found for user: ${userId}`);
    }

    const userProfile = userProfiles[0];

    // Get competitors by category
    const [directCompetitors, aspirationalCompetitors, emergingThreats] =
      await Promise.all([
        this.competitorRepo.findByCategory('direct'),
        this.competitorRepo.findByCategory('aspirational'),
        this.competitorRepo.findByCategory('emerging'),
      ]);

    // Get market landscape for user's primary expertise
    const primaryExpertise = userProfile.metadata.expertise[0] || 'development';
    const landscape = await this.competitorRepo.getMarketLandscape(
      primaryExpertise
    );

    // Calculate user's competitive score (simplified)
    const userCompetitivenessScore = this.calculateCompetitivenessScore(
      userProfile.metadata
    );

    // Determine user's market position
    const userMarketPosition = this.determineMarketPosition(
      userCompetitivenessScore
    );

    // Identify user's strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsWeaknesses(
      userProfile.metadata
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      userProfile.metadata,
      directCompetitors,
      landscape
    );

    // Identify competitive advantages
    const competitiveAdvantages = this.identifyCompetitiveAdvantages(
      userProfile.metadata,
      directCompetitors
    );

    // Identify vulnerabilities
    const vulnerabilities = this.identifyVulnerabilities(
      userProfile.metadata,
      directCompetitors
    );

    return {
      userProfile: {
        username: userProfile.metadata.githubUsername,
        competitivenessScore: userCompetitivenessScore,
        marketPosition: userMarketPosition,
        strengths,
        weaknesses,
      },
      directCompetitors: directCompetitors.slice(0, 10),
      aspirationalCompetitors: aspirationalCompetitors.slice(0, 5),
      emergingThreats: emergingThreats.slice(0, 5),
      marketGaps: landscape.marketGaps,
      recommendations,
      competitiveAdvantages,
      vulnerabilities,
    };
  }

  /**
   * Generate differentiation strategy for a user
   *
   * @param userId - User identifier
   * @returns Comprehensive differentiation strategy
   */
  async generateDifferentiationStrategy(
    userId: string
  ): Promise<DifferentiationStrategy> {
    // Get competitive positioning first
    const positioning = await this.getCompetitivePositioning(userId);

    // Get user profile
    const userProfiles = await this.developerRepo.findAll({
      where: { githubUsername: userId } as any,
      limit: 1,
    });
    const userProfile = userProfiles[0];

    // Identify primary differentiators
    const primaryDifferentiators = positioning.competitiveAdvantages.slice(
      0,
      3
    );

    // Generate content strategy
    const uniqueAngles = this.generateUniqueAngles(
      userProfile.metadata,
      positioning.directCompetitors
    );
    const formatInnovations = this.suggestFormatInnovations(
      positioning.marketGaps.underutilizedFormats
    );
    const audienceNiches = positioning.marketGaps.underservedAudiences.slice(
      0,
      3
    );

    // Create positioning statement
    const positioningStatement = this.createPositioningStatement(
      userProfile.metadata,
      primaryDifferentiators
    );

    // Set up competitive monitoring
    const competitorUsernames = positioning.directCompetitors
      .slice(0, 5)
      .map((c) => c.metadata.competitorUsername);

    // Generate action plan
    const actionPlan = {
      immediate: positioning.recommendations.shortTerm.slice(0, 3),
      quarterly: positioning.recommendations.mediumTerm.slice(0, 3),
      annual: positioning.recommendations.longTerm.slice(0, 2),
    };

    return {
      primaryDifferentiators,
      contentStrategy: {
        uniqueAngles,
        formatInnovations,
        audienceNiches,
      },
      positioningStatement,
      competitiveMonat: {
        competitors: competitorUsernames,
        metrics: [
          'follower_count',
          'engagement_rate',
          'content_frequency',
          'viral_posts',
        ],
        alertThresholds: {
          followerGrowth: 1000, // Alert if competitor gains >1000 followers/week
          engagementRate: 5.0, // Alert if engagement rate >5%
          contentFrequency: 10, // Alert if posting >10x/week
        },
      },
      actionPlan,
    };
  }

  /**
   * Benchmark user against specific competitors
   *
   * @param userId - User identifier
   * @param competitorIds - Competitor usernames to benchmark against
   * @returns Comparative benchmark analysis
   */
  async benchmarkAgainstCompetitors(
    userId: string,
    competitorIds: string[]
  ): Promise<{
    user: any;
    competitors: CompetitorAnalysisEntity[];
    comparison: {
      metric: string;
      userValue: number;
      avgCompetitorValue: number;
      percentile: number;
      gap: number;
    }[];
  }> {
    // Get user profile
    const userProfiles = await this.developerRepo.findAll({
      where: { githubUsername: userId } as any,
      limit: 1,
    });
    const userProfile = userProfiles[0];

    // Get competitor profiles
    const competitorPromises = competitorIds.map((id) =>
      this.competitorRepo.findAll({
        where: { competitorUsername: id } as any,
        limit: 1,
      })
    );
    const competitorResults = await Promise.all(competitorPromises);
    const competitors = competitorResults
      .filter((r) => r.length > 0)
      .map((r) => r[0]);

    // Calculate comparative metrics
    const comparison = this.calculateComparativeMetrics(
      userProfile.metadata,
      competitors
    );

    return {
      user: {
        username: userProfile.metadata.githubUsername,
        name: userProfile.metadata.name,
        expertise: userProfile.metadata.expertise,
      },
      competitors,
      comparison,
    };
  }

  /**
   * Calculate competitiveness score from profile metadata
   */
  private calculateCompetitivenessScore(metadata: any): number {
    // Simplified scoring algorithm (0-100)
    let score = 0;

    // Contribution score (0-40 points)
    score += Math.min(metadata.contributionScore || 0, 40);

    // Repository metrics (0-30 points)
    const repoScore = Math.min(
      ((metadata.repositories?.stars || 0) / 1000) * 30,
      30
    );
    score += repoScore;

    // Experience level (0-20 points)
    const experienceLevels = {
      junior: 5,
      mid: 10,
      senior: 15,
      lead: 18,
      principal: 20,
    };
    score += experienceLevels[metadata.experience] || 5;

    // Technical breadth/depth (0-10 points)
    score += Math.min(
      (metadata.analysis?.technicalBreadth || 0) +
        (metadata.analysis?.technicalDepth || 0),
      10
    );

    return Math.round(score);
  }

  /**
   * Determine market position from competitiveness score
   */
  private determineMarketPosition(
    score: number
  ): 'leader' | 'challenger' | 'follower' | 'niche' {
    if (score >= 80) return 'leader';
    if (score >= 60) return 'challenger';
    if (score >= 40) return 'follower';
    return 'niche';
  }

  /**
   * Identify strengths and weaknesses from profile
   */
  private identifyStrengthsWeaknesses(metadata: any): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze various aspects
    if ((metadata.repositories?.stars || 0) > 1000) {
      strengths.push('Strong open source presence');
    } else {
      weaknesses.push('Limited open source visibility');
    }

    if ((metadata.expertise?.length || 0) > 3) {
      strengths.push('Diverse technical expertise');
    } else {
      weaknesses.push('Narrow expertise breadth');
    }

    if ((metadata.contributionScore || 0) > 70) {
      strengths.push('High contribution activity');
    } else {
      weaknesses.push('Low contribution activity');
    }

    if ((metadata.analysis?.technicalDepth || 0) > 7) {
      strengths.push('Deep technical specialization');
    }

    return { strengths, weaknesses };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    userMetadata: any,
    competitors: CompetitorAnalysisEntity[],
    landscape: MarketLandscape
  ): {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  } {
    const shortTerm: string[] = [];
    const mediumTerm: string[] = [];
    const longTerm: string[] = [];

    // Short-term (1-3 months)
    if ((userMetadata.activity?.commits || 0) < 50) {
      shortTerm.push('Increase GitHub activity with consistent contributions');
    }
    if (landscape.marketGaps.contentOpportunities.length > 0) {
      shortTerm.push(
        `Create content on: ${landscape.marketGaps.contentOpportunities[0]}`
      );
    }
    shortTerm.push('Engage with community through comments and discussions');

    // Medium-term (3-6 months)
    if ((userMetadata.repositories?.stars || 0) < 100) {
      mediumTerm.push('Launch a high-visibility open source project');
    }
    if (landscape.marketGaps.underutilizedFormats.length > 0) {
      mediumTerm.push(
        `Experiment with ${landscape.marketGaps.underutilizedFormats[0]} format`
      );
    }
    mediumTerm.push('Build strategic partnerships with complementary creators');

    // Long-term (6-12 months)
    if ((userMetadata.expertise?.length || 0) < 3) {
      longTerm.push('Expand expertise into adjacent technology domains');
    }
    longTerm.push('Establish thought leadership in niche specialization');

    return { shortTerm, mediumTerm, longTerm };
  }

  /**
   * Identify competitive advantages
   */
  private identifyCompetitiveAdvantages(
    userMetadata: any,
    competitors: CompetitorAnalysisEntity[]
  ): string[] {
    const advantages: string[] = [];

    const avgCompetitorStars =
      competitors.reduce(
        (sum, c) => sum + c.metadata.repositoryMetrics.totalStars,
        0
      ) / (competitors.length || 1);

    if ((userMetadata.repositories?.stars || 0) > avgCompetitorStars) {
      advantages.push('Above-average repository popularity');
    }

    if ((userMetadata.expertise?.length || 0) > 3) {
      advantages.push('Broad technical versatility');
    }

    if ((userMetadata.analysis?.technicalDepth || 0) > 8) {
      advantages.push('Deep domain expertise');
    }

    return advantages;
  }

  /**
   * Identify vulnerabilities
   */
  private identifyVulnerabilities(
    userMetadata: any,
    competitors: CompetitorAnalysisEntity[]
  ): string[] {
    const vulnerabilities: string[] = [];

    const maxCompetitorFollowers = Math.max(
      ...competitors.map((c) => c.metadata.followers.total)
    );

    if ((userMetadata.contributionScore || 0) < 30) {
      vulnerabilities.push('Low contribution activity compared to competitors');
    }

    if (competitors.some((c) => c.metadata.growthVelocity > 50)) {
      vulnerabilities.push('Competitors with significantly faster growth');
    }

    return vulnerabilities;
  }

  /**
   * Generate unique content angles
   */
  private generateUniqueAngles(
    userMetadata: any,
    competitors: CompetitorAnalysisEntity[]
  ): string[] {
    const angles: string[] = [];

    // Find gaps in competitor content
    const competitorTopics = new Set(
      competitors.flatMap((c) => c.metadata.contentStrategy.primaryTopics)
    );

    const userExpertise = userMetadata.expertise || [];
    userExpertise.forEach((topic: string) => {
      if (!competitorTopics.has(topic)) {
        angles.push(`Focus on underrepresented ${topic} content`);
      }
    });

    // Add general differentiation angles
    angles.push('Behind-the-scenes development process');
    angles.push('Beginner-friendly deep dives');
    angles.push('Real-world problem-solving stories');

    return angles.slice(0, 5);
  }

  /**
   * Suggest format innovations
   */
  private suggestFormatInnovations(underutilizedFormats: string[]): string[] {
    const innovations: string[] = [];

    underutilizedFormats.forEach((format) => {
      switch (format) {
        case 'live-coding':
          innovations.push('Weekly live coding sessions with Q&A');
          break;
        case 'podcast':
          innovations.push('Technical interview podcast series');
          break;
        case 'newsletter':
          innovations.push('Curated weekly tech insights newsletter');
          break;
        case 'video-series':
          innovations.push('Multi-part tutorial video series');
          break;
        default:
          innovations.push(`Experiment with ${format} format`);
      }
    });

    return innovations.slice(0, 3);
  }

  /**
   * Create positioning statement
   */
  private createPositioningStatement(
    userMetadata: any,
    differentiators: string[]
  ): string {
    const name = userMetadata.name || 'Developer';
    const expertise = userMetadata.expertise?.[0] || 'software development';
    const uniqueValue = differentiators[0] || 'practical insights';

    return `${name} is a ${expertise} expert who helps developers grow through ${uniqueValue}, combining technical depth with accessible teaching.`;
  }

  /**
   * Calculate comparative metrics
   */
  private calculateComparativeMetrics(
    userMetadata: any,
    competitors: CompetitorAnalysisEntity[]
  ): {
    metric: string;
    userValue: number;
    avgCompetitorValue: number;
    percentile: number;
    gap: number;
  }[] {
    const metrics: any[] = [];

    // Follower count
    const userFollowers = 0; // Would need to be tracked in developer profile
    const avgCompetitorFollowers =
      competitors.reduce((sum, c) => sum + c.metadata.followers.total, 0) /
      (competitors.length || 1);
    metrics.push({
      metric: 'Total Followers',
      userValue: userFollowers,
      avgCompetitorValue: Math.round(avgCompetitorFollowers),
      percentile: this.calculatePercentile(
        userFollowers,
        competitors.map((c) => c.metadata.followers.total)
      ),
      gap: userFollowers - avgCompetitorFollowers,
    });

    // Repository stars
    const userStars = userMetadata.repositories?.stars || 0;
    const avgCompetitorStars =
      competitors.reduce(
        (sum, c) => sum + c.metadata.repositoryMetrics.totalStars,
        0
      ) / (competitors.length || 1);
    metrics.push({
      metric: 'Repository Stars',
      userValue: userStars,
      avgCompetitorValue: Math.round(avgCompetitorStars),
      percentile: this.calculatePercentile(
        userStars,
        competitors.map((c) => c.metadata.repositoryMetrics.totalStars)
      ),
      gap: userStars - avgCompetitorStars,
    });

    // Competitiveness score
    const userScore = this.calculateCompetitivenessScore(userMetadata);
    const avgCompetitorScore =
      competitors.reduce(
        (sum, c) => sum + c.metadata.competitivenessScore,
        0
      ) / (competitors.length || 1);
    metrics.push({
      metric: 'Competitiveness Score',
      userValue: userScore,
      avgCompetitorValue: Math.round(avgCompetitorScore),
      percentile: this.calculatePercentile(
        userScore,
        competitors.map((c) => c.metadata.competitivenessScore)
      ),
      gap: userScore - avgCompetitorScore,
    });

    return metrics;
  }

  /**
   * Calculate percentile ranking
   */
  private calculatePercentile(value: number, distribution: number[]): number {
    const sorted = [...distribution, value].sort((a, b) => a - b);
    const index = sorted.indexOf(value);
    return Math.round((index / sorted.length) * 100);
  }
}
