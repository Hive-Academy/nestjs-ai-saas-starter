import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  Profiled,
  Retry,
  Cached,
} from '@hive-academy/nestjs-chromadb';
import {
  CompetitorAnalysisEntity,
  CompetitorAnalysisMetadata,
} from '../../entities/chromadb/competitor-analysis.entity';

/**
 * Competitor Profile - Simplified input for analysis
 */
export interface CompetitorProfile {
  username: string;
  name: string;
  expertise: string[];
  followers: {
    github: number;
    twitter: number;
    linkedin: number;
  };
  repositories: {
    total: number;
    stars: number;
    forks: number;
  };
  contentActivity: {
    postsPerWeek: number;
    averageEngagement: number;
    viralPosts: number;
  };
}

/**
 * Competitive Analysis Result
 */
export interface CompetitiveAnalysis {
  competitor: CompetitorAnalysisEntity;
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  positioning: {
    category: 'direct' | 'indirect' | 'aspirational' | 'emerging';
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
    competitivenessScore: number;
    growthVelocity: number;
  };
  differentiationStrategy: {
    contentGaps: string[];
    audienceOpportunities: string[];
    formatOpportunities: string[];
    timingOpportunities: string[];
  };
  similarCompetitors: CompetitorAnalysisEntity[];
}

/**
 * Market Landscape Summary
 */
export interface MarketLandscape {
  totalCompetitors: number;
  leaders: CompetitorAnalysisEntity[];
  challengers: CompetitorAnalysisEntity[];
  emergingPlayers: CompetitorAnalysisEntity[];
  marketGaps: {
    underservedAudiences: string[];
    underutilizedFormats: string[];
    contentOpportunities: string[];
  };
  competitiveIntensity: 'low' | 'medium' | 'high' | 'very-high';
}

/**
 * Competitor Analysis Repository
 *
 * Provides comprehensive competitive intelligence analysis for developer profiles.
 * Enables market positioning, SWOT analysis, and differentiation strategies.
 *
 * @example
 * ```typescript
 * // Analyze a competitor
 * const analysis = await repo.analyzeCompetitor(competitorProfile);
 *
 * // Get market landscape
 * const landscape = await repo.getMarketLandscape('backend-development');
 *
 * // Find direct competitors
 * const directCompetitors = await repo.findByCategory('direct');
 * ```
 */
@Injectable()
export class CompetitorAnalysisRepository extends ChromaDBRepository<CompetitorAnalysisEntity> {
  constructor(chromaDB: ChromaDBService) {
    super(CompetitorAnalysisEntity, 'competitor-analysis', chromaDB);
  }

  /**
   * Analyze competitor profile and generate comprehensive intelligence
   *
   * @param profile - Competitor profile data
   * @returns Comprehensive competitive analysis with SWOT, positioning, and differentiation
   */
  @Profiled({ slowQueryThreshold: 300 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeCompetitor(
    profile: CompetitorProfile
  ): Promise<CompetitiveAnalysis> {
    // Calculate total followers
    const totalFollowers =
      profile.followers.github +
      profile.followers.twitter +
      profile.followers.linkedin;

    // Calculate average stars per repo
    const avgStars =
      profile.repositories.total > 0
        ? profile.repositories.stars / profile.repositories.total
        : 0;

    // Determine category based on metrics
    let category: 'direct' | 'indirect' | 'aspirational' | 'emerging' =
      'indirect';
    if (totalFollowers > 50000 && avgStars > 1000) {
      category = 'aspirational';
    } else if (totalFollowers > 10000 && avgStars > 100) {
      category = 'direct';
    } else if (profile.contentActivity.postsPerWeek > 5) {
      category = 'emerging';
    }

    // Determine market position
    let marketPosition: 'leader' | 'challenger' | 'follower' | 'niche' =
      'follower';
    if (totalFollowers > 100000) {
      marketPosition = 'leader';
    } else if (totalFollowers > 20000) {
      marketPosition = 'challenger';
    } else if (profile.expertise.length > 3) {
      marketPosition = 'niche';
    }

    // Calculate competitiveness score (0-100)
    const followerScore = Math.min((totalFollowers / 100000) * 40, 40);
    const repoScore = Math.min((profile.repositories.stars / 10000) * 30, 30);
    const engagementScore = Math.min(
      (profile.contentActivity.averageEngagement / 1000) * 30,
      30
    );
    const competitivenessScore = Math.round(
      followerScore + repoScore + engagementScore
    );

    // Calculate growth velocity (-100 to +100)
    const growthVelocity = Math.min(
      Math.max(profile.contentActivity.postsPerWeek * 10 - 50, -100),
      100
    );

    // SWOT Analysis
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    if (totalFollowers > 50000) {
      strengths.push('Large established audience');
    } else {
      weaknesses.push('Limited audience reach');
      opportunities.push('Audience growth potential');
    }

    if (avgStars > 1000) {
      strengths.push('High-quality open source contributions');
    } else {
      opportunities.push('Open source visibility improvement');
    }

    if (profile.contentActivity.viralPosts > 5) {
      strengths.push('Proven viral content creation ability');
      threats.push('High content quality bar set');
    }

    if (profile.contentActivity.postsPerWeek > 7) {
      strengths.push('Consistent content output');
      threats.push('Content saturation in niche');
    } else if (profile.contentActivity.postsPerWeek < 3) {
      weaknesses.push('Inconsistent posting schedule');
      opportunities.push('Content frequency gap');
    }

    if (profile.expertise.length > 5) {
      strengths.push('Diverse technical expertise');
    } else if (profile.expertise.length < 2) {
      weaknesses.push('Limited expertise breadth');
      opportunities.push('Expertise expansion');
    }

    // Differentiation strategy
    const contentGaps: string[] = [];
    const audienceOpportunities: string[] = [];
    const formatOpportunities: string[] = [];
    const timingOpportunities: string[] = [];

    if (profile.contentActivity.postsPerWeek < 5) {
      contentGaps.push('Increase posting frequency');
      timingOpportunities.push('Fill content calendar gaps');
    }

    if (avgStars < 500) {
      contentGaps.push('Create high-visibility open source projects');
      formatOpportunities.push('Tutorial-based content around projects');
    }

    if (totalFollowers < 10000) {
      audienceOpportunities.push('Target underserved developer segments');
      formatOpportunities.push('Interactive content for engagement');
    }

    if (profile.contentActivity.viralPosts < 2) {
      contentGaps.push('Experiment with controversial/trending topics');
      timingOpportunities.push('Capitalize on trending tech discussions');
    }

    // Create entity
    const entity = new CompetitorAnalysisEntity();
    entity.content = `${profile.name} - ${category} competitor in ${profile.expertise.join(', ')}`;
    entity.metadata = {
      competitorUsername: profile.username,
      name: profile.name,
      category,
      expertise: profile.expertise,
      careerLevel: this.inferCareerLevel(totalFollowers, avgStars),
      followers: {
        ...profile.followers,
        total: totalFollowers,
      },
      contentMetrics: {
        postsPerWeek: profile.contentActivity.postsPerWeek,
        averageEngagement: profile.contentActivity.averageEngagement,
        totalReach: totalFollowers * profile.contentActivity.averageEngagement,
        viralPosts: profile.contentActivity.viralPosts,
      },
      repositoryMetrics: {
        totalRepos: profile.repositories.total,
        totalStars: profile.repositories.stars,
        totalForks: profile.repositories.forks,
        averageStars: avgStars,
        trendingRepos: profile.contentActivity.viralPosts, // Approximation
      },
      engagementQuality: {
        commentRate: profile.contentActivity.averageEngagement * 0.3,
        shareRate: profile.contentActivity.averageEngagement * 0.2,
        discussionDepth: 3 + profile.contentActivity.averageEngagement * 0.01,
        communityInteraction: Math.min(
          (profile.contentActivity.averageEngagement / 100) * 100,
          100
        ),
      },
      contentStrategy: {
        primaryTopics: profile.expertise,
        postingFrequency: this.determinePostingFrequency(
          profile.contentActivity.postsPerWeek
        ),
        bestPerformingFormats: this.inferBestFormats(
          profile.contentActivity.viralPosts
        ),
        targetAudience: this.inferTargetAudience(profile.expertise),
      },
      strengths,
      weaknesses,
      opportunities,
      threats,
      competitivenessScore,
      marketPosition,
      growthVelocity,
      lastAnalyzed: new Date(),
    };

    // Save to database
    await this.create(entity);

    // Find similar competitors using semantic search
    const similarResults = await this.search({
      queryTexts: [entity.content],
      nResults: 5,
    });

    const similarCompetitors = similarResults.documents
      .filter((doc) => doc.id !== entity.id)
      .slice(0, 4);

    return {
      competitor: entity,
      swotAnalysis: {
        strengths,
        weaknesses,
        opportunities,
        threats,
      },
      positioning: {
        category,
        marketPosition,
        competitivenessScore,
        growthVelocity,
      },
      differentiationStrategy: {
        contentGaps,
        audienceOpportunities,
        formatOpportunities,
        timingOpportunities,
      },
      similarCompetitors,
    };
  }

  /**
   * Find competitors by category
   *
   * @param category - Competitor category
   * @returns List of competitors in the category
   */
  @Cached({
    ttl: 600000, // 10 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 150 })
  async findByCategory(
    category: 'direct' | 'indirect' | 'aspirational' | 'emerging'
  ): Promise<CompetitorAnalysisEntity[]> {
    return await this.findAll({
      where: { category } as CompetitorAnalysisMetadata,
      limit: 50,
    });
  }

  /**
   * Find competitors by market position
   *
   * @param position - Market position
   * @returns List of competitors in that position
   */
  @Cached({
    ttl: 600000, // 10 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 150 })
  async findByMarketPosition(
    position: 'leader' | 'challenger' | 'follower' | 'niche'
  ): Promise<CompetitorAnalysisEntity[]> {
    return await this.findAll({
      where: { marketPosition: position } as CompetitorAnalysisMetadata,
      limit: 50,
    });
  }

  /**
   * Get top competitors by competitiveness score
   *
   * @param limit - Maximum number of results
   * @returns Top competitors ranked by score
   */
  @Cached({
    ttl: 600000, // 10 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 200 })
  async getTopCompetitors(limit = 10): Promise<CompetitorAnalysisEntity[]> {
    const allCompetitors = await this.findAll({ limit: 100 });
    return allCompetitors
      .sort(
        (a, b) =>
          b.metadata.competitivenessScore - a.metadata.competitivenessScore
      )
      .slice(0, limit);
  }

  /**
   * Get market landscape analysis for a specific expertise area
   *
   * @param expertise - Expertise area to analyze
   * @returns Comprehensive market landscape
   */
  @Cached({
    ttl: 1800000, // 30 minutes (market landscape changes slowly)
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 300 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async getMarketLandscape(expertise: string): Promise<MarketLandscape> {
    // Get all competitors in this expertise area
    const allCompetitors = await this.search({
      queryTexts: [expertise],
      nResults: 100,
    });

    const competitors = allCompetitors.documents;

    // Segment by market position
    const leaders = competitors.filter(
      (c) => c.metadata.marketPosition === 'leader'
    );
    const challengers = competitors.filter(
      (c) => c.metadata.marketPosition === 'challenger'
    );
    const emergingPlayers = competitors.filter(
      (c) => c.metadata.category === 'emerging'
    );

    // Identify market gaps
    const allTopics = competitors.flatMap(
      (c) => c.metadata.contentStrategy.primaryTopics
    );
    const allFormats = competitors.flatMap(
      (c) => c.metadata.contentStrategy.bestPerformingFormats
    );
    const allAudiences = competitors.map(
      (c) => c.metadata.contentStrategy.targetAudience
    );

    // Calculate underserved areas (simplified - in production, use more sophisticated analysis)
    const underservedAudiences = [
      'Junior developers',
      'Career switchers',
      'Non-CS backgrounds',
    ].filter((audience) => !allAudiences.includes(audience));

    const underutilizedFormats = [
      'live-coding',
      'podcast',
      'newsletter',
      'video-series',
    ].filter((format) => !allFormats.includes(format));

    const contentOpportunities = [
      'System design tutorials',
      'Interview preparation',
      'Soft skills development',
      'Team leadership',
    ].filter((topic) => !allTopics.includes(topic));

    // Determine competitive intensity
    let competitiveIntensity: 'low' | 'medium' | 'high' | 'very-high' = 'low';
    if (leaders.length > 10) {
      competitiveIntensity = 'very-high';
    } else if (leaders.length > 5) {
      competitiveIntensity = 'high';
    } else if (challengers.length > 10) {
      competitiveIntensity = 'medium';
    }

    return {
      totalCompetitors: competitors.length,
      leaders,
      challengers,
      emergingPlayers,
      marketGaps: {
        underservedAudiences,
        underutilizedFormats,
        contentOpportunities,
      },
      competitiveIntensity,
    };
  }

  /**
   * Get fastest growing competitors
   *
   * @param limit - Maximum number of results
   * @returns Competitors with highest growth velocity
   */
  @Profiled({ slowQueryThreshold: 200 })
  async getFastestGrowingCompetitors(
    limit = 10
  ): Promise<CompetitorAnalysisEntity[]> {
    const allCompetitors = await this.findAll({ limit: 100 });
    return allCompetitors
      .sort((a, b) => b.metadata.growthVelocity - a.metadata.growthVelocity)
      .slice(0, limit);
  }

  /**
   * Infer career level from metrics
   */
  private inferCareerLevel(
    followers: number,
    avgStars: number
  ): 'junior' | 'mid' | 'senior' | 'lead' | 'principal' {
    if (followers > 50000 && avgStars > 1000) return 'principal';
    if (followers > 20000 && avgStars > 500) return 'lead';
    if (followers > 5000 && avgStars > 100) return 'senior';
    if (followers > 1000) return 'mid';
    return 'junior';
  }

  /**
   * Determine posting frequency description
   */
  private determinePostingFrequency(postsPerWeek: number): string {
    if (postsPerWeek >= 7) return 'daily';
    if (postsPerWeek >= 5) return '5-6x/week';
    if (postsPerWeek >= 3) return '3-4x/week';
    if (postsPerWeek >= 1) return 'weekly';
    return 'sporadic';
  }

  /**
   * Infer best performing formats from viral posts
   */
  private inferBestFormats(viralPosts: number): string[] {
    const formats: string[] = ['tutorial', 'case-study'];
    if (viralPosts > 5) {
      formats.push('opinion-piece', 'hot-take');
    }
    if (viralPosts > 10) {
      formats.push('thread', 'visual-explainer');
    }
    return formats;
  }

  /**
   * Infer target audience from expertise
   */
  private inferTargetAudience(expertise: string[]): string {
    if (expertise.includes('frontend') || expertise.includes('React')) {
      return 'Frontend developers';
    }
    if (expertise.includes('backend') || expertise.includes('Node.js')) {
      return 'Backend developers';
    }
    if (expertise.includes('DevOps') || expertise.includes('Cloud')) {
      return 'DevOps engineers';
    }
    return 'Full-stack developers';
  }
}
