import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  InjectRepository,
  ChromaDBRepository,
  Cached,
  Profiled,
  Retry,
  getRepositoryToken as getChromaRepositoryToken,
} from '@hive-academy/nestjs-chromadb';
import { getRepositoryToken } from '@hive-academy/nestjs-neo4j';
import { DeveloperRepository } from '../../../repositories/neo4j/developer.repository';
import { AchievementRepository as Neo4jAchievementRepository } from '../../../repositories/neo4j/achievement.repository';

// Import entities
import { CodeAchievementEntity } from '../../../entities/chromadb/code-achievement.entity';
import { BrandStrategyEntity } from '../../../entities/chromadb/brand-strategy.entity';
import { ContentPerformanceEntity } from '../../../entities/chromadb/content-performance.entity';
import { Developer } from '../../../entities/neo4j/developer.entity';
import { Achievement } from '../../../entities/neo4j/achievement.entity';

// Import custom repositories (analytics only)
import { CodeAchievementRepository } from '../../../repositories/chromadb/code-achievement.repository';
import { BrandStrategyRepository } from '../../../repositories/chromadb/brand-strategy.repository';
import { ContentPerformanceRepository } from '../../../repositories/chromadb/content-performance.repository';

// Import metadata types from entities
import type { CodeAchievementMetadata } from '../../../entities/chromadb/code-achievement.entity';
import type { BrandStrategyMetadata } from '../../../entities/chromadb/brand-strategy.entity';
import type { ContentPerformanceMetadata } from '../../../entities/chromadb/content-performance.entity';

// Enhanced Developer Context with Analytics
interface DeveloperContext {
  userId: string;
  currentSkills: string[];
  careerGoals: string[];
  recentAchievements: CodeAchievementEntity[];
  brandEvolution: BrandStrategyEntity[];
  contentHistory: ContentPerformanceEntity[];
  analytics: {
    achievementTrend: 'improving' | 'stable' | 'declining';
    brandEvolutionScore: number;
    contentEngagementTrend: 'growing' | 'stable' | 'declining';
    influenceMetrics: {
      reach: number;
      engagement: number;
      authority: number;
    };
    marketPositioning: {
      rank: number;
      percentile: number;
      competitiveGap: number;
    };
  };
}

/**
 * Enhanced Personal Brand Memory Service
 *
 * This service demonstrates the complete transformation from manual ChromaDB operations
 * to a declarative, repository-driven pattern with comprehensive analytics and insights.
 */
@Injectable()
export class PersonalBrandMemoryService {
  private readonly logger = new Logger(PersonalBrandMemoryService.name);

  constructor(
    // Auto-generated repositories for simple queries (via @InjectRepository)
    @InjectRepository(CodeAchievementEntity)
    private readonly achievementRepo: ChromaDBRepository<CodeAchievementEntity>,

    @InjectRepository(BrandStrategyEntity)
    private readonly brandRepo: ChromaDBRepository<BrandStrategyEntity>,

    @InjectRepository(ContentPerformanceEntity)
    private readonly contentRepo: ChromaDBRepository<ContentPerformanceEntity>,

    // Custom repositories for analytics (via proper DI tokens)
    @Inject(getChromaRepositoryToken(CodeAchievementEntity))
    private readonly achievementAnalytics: CodeAchievementRepository,

    @Inject(getChromaRepositoryToken(BrandStrategyEntity))
    private readonly brandAnalytics: BrandStrategyRepository,

    @Inject(getChromaRepositoryToken(ContentPerformanceEntity))
    private readonly contentAnalytics: ContentPerformanceRepository,

    // Neo4j repositories (via proper DI tokens)
    @Inject(getRepositoryToken(Developer))
    private readonly developerRepo: DeveloperRepository,

    @Inject(getRepositoryToken(Achievement))
    private readonly neo4jAchievementRepo: Neo4jAchievementRepository
  ) {}

  /**
   * Store code achievement with enhanced analytics and automatic processing
   */
  @Profiled()
  @Retry({
    maxAttempts: 3,
    strategy: 'exponential',
    circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeout: 60000 },
  })
  async storeCodeAchievement(userId: string, achievement: any): Promise<void> {
    this.logger.log(
      `Storing enhanced achievement for user ${userId}: ${achievement.description}`
    );

    try {
      // Enhanced achievement analysis
      const analysisData = {
        innovationScore:
          achievement.analysis?.innovationScore ||
          this.calculateInnovationScore(achievement),
        collaborationLevel:
          achievement.analysis?.collaborationLevel ||
          this.determineCollaborationLevel(achievement),
        technicalDepth:
          achievement.analysis?.technicalDepth ||
          this.assessTechnicalDepth(achievement),
      };

      const metricsData = {
        linesChanged: achievement.metrics?.linesChanged || 0,
        complexity: achievement.metrics?.complexity || 0,
        testCoverage: achievement.metrics?.testCoverage || 0,
        pullRequests: achievement.metrics?.pullRequests || 1,
      };

      // Use auto-generated repo for simple create
      await this.achievementRepo.create({
        id: achievement.id,
        content: achievement.description, // Map to content field
        metadata: {
          userId,
          description: achievement.description,
          technologies: achievement.technologies,
          impact: achievement.impact,
          date: achievement.date,
          repository: achievement.repository,
          metrics: metricsData,
          analysis: analysisData,
        } as CodeAchievementMetadata,
      });

      // Enhanced Neo4j relationships with additional context (delegated to repository)
      await this.neo4jAchievementRepo.createEnhancedAchievementWithDeveloper(
        userId,
        {
          id: achievement.id,
          description: achievement.description,
          technologies: achievement.technologies,
          impact: achievement.impact,
          date: achievement.date,
          repository: achievement.repository,
          innovationScore: analysisData.innovationScore,
          collaborationLevel: analysisData.collaborationLevel,
          technicalDepth: analysisData.technicalDepth,
        }
      );

      this.logger.log(
        `✅ Enhanced achievement stored successfully: ${achievement.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store enhanced achievement: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Store brand strategy with evolution tracking and market analysis
   */
  @Profiled()
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async storeBrandStrategy(userId: string, strategy: any): Promise<void> {
    this.logger.log(`Storing enhanced brand strategy for user ${userId}`);

    try {
      // Get previous strategy using auto-generated repo
      const previousStrategies = await this.brandRepo.findAll({
        where: { userId } as any,
        limit: 1,
      });
      const previousStrategy = previousStrategies[0];

      // Enhanced strategy metadata
      const evolutionData = {
        previousStrategyId: previousStrategy?.id,
        changeTrigger:
          strategy.evolution?.changeTrigger || 'New strategy development',
        improvementScore: previousStrategy
          ? strategy.confidenceScore -
            (previousStrategy.metadata.confidenceScore || 0)
          : 0.5,
        marketContext: strategy.evolution?.marketContext || [
          'Technology sector',
          'Remote work trends',
        ],
      };

      const metricsData = {
        implementationProgress: strategy.metrics?.implementationProgress || 0.1,
        marketResonance: strategy.metrics?.marketResonance || 0.6,
        competitorDifferentiation:
          strategy.metrics?.competitorDifferentiation || 0.5,
      };

      // Use auto-generated repo for simple create
      await this.brandRepo.create({
        id: strategy.id,
        content: strategy.positioning, // Map to content field
        metadata: {
          userId,
          positioning: strategy.positioning,
          strengths: strategy.strengths,
          opportunities: strategy.opportunities,
          recommendations: strategy.recommendations,
          targetAudience: strategy.targetAudience,
          confidenceScore: strategy.confidenceScore,
          createdAt: strategy.createdAt,
          evolution: evolutionData,
          metrics: metricsData,
        } as BrandStrategyMetadata,
      });

      // Enhanced Neo4j strategy relationships (delegated to repository)
      await this.developerRepo.createBrandStrategyRelationships(userId, {
        id: strategy.id,
        positioning: strategy.positioning,
        targetAudience: strategy.targetAudience,
        confidenceScore: strategy.confidenceScore,
        strengths: strategy.strengths,
        createdAt: strategy.createdAt,
        metrics: {
          implementationProgress: metricsData.implementationProgress,
          marketResonance: metricsData.marketResonance,
        },
      });

      this.logger.log(
        `✅ Enhanced brand strategy stored successfully: ${strategy.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store enhanced brand strategy: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Store content performance with advanced analytics and optimization insights
   */
  @Profiled()
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async storeContentPerformance(userId: string, content: any): Promise<void> {
    this.logger.log(
      `Storing enhanced content performance for user ${userId} on ${content.platform}`
    );

    try {
      // Enhanced content analysis
      const analysisData = {
        sentiment:
          content.analysis?.sentiment || this.analyzeSentiment(content.content),
        topics: content.analysis?.topics || this.extractTopics(content.content),
        viralityFactor:
          content.analysis?.viralityFactor ||
          this.calculateViralityFactor(content.metrics),
        audienceResonance:
          content.analysis?.audienceResonance ||
          this.calculateAudienceResonance(content.metrics),
        technicalDepth:
          content.analysis?.technicalDepth ||
          this.assessContentTechnicalDepth(content.content),
      };

      const optimizationData = {
        bestPostingTime:
          content.optimization?.bestPostingTime ||
          this.determineBestPostingTime(content.platform),
        suggestedHashtags:
          content.optimization?.suggestedHashtags ||
          this.suggestHashtags(content.content),
        audienceEngagement:
          content.optimization?.audienceEngagement ||
          this.assessAudienceEngagement(content.metrics),
      };

      // Use auto-generated repo for simple create
      await this.contentRepo.create({
        id: content.id,
        content: content.content || content.description, // Map to content field
        metadata: {
          userId,
          platform: content.platform,
          engagementScore: content.engagementScore,
          metrics: {
            views: content.metrics.views || 0,
            likes: content.metrics.likes || 0,
            comments: content.metrics.comments || 0,
            shares: content.metrics.shares || 0,
            clicks: content.metrics.clicks || 0,
          },
          createdAt: content.createdAt,
          analysis: analysisData,
          optimization: optimizationData,
        } as ContentPerformanceMetadata,
      });

      this.logger.log(
        `✅ Enhanced content performance stored successfully: ${content.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store enhanced content performance: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get comprehensive developer context with advanced analytics
   */
  @Profiled()
  @Cached({ ttl: 300000, keyStrategy: 'collection_aware' })
  async getEnhancedDevContext(userId: string): Promise<DeveloperContext> {
    this.logger.log(`Retrieving enhanced developer context for user ${userId}`);

    try {
      // Parallel retrieval using both auto-generated and custom repos
      const [
        achievements, // Auto-generated repo
        brandStrategies, // Auto-generated repo
        contentHistory, // Auto-generated repo
        innovationAnalysis, // Custom analytics repo
        brandEvolutionAnalysis, // Custom analytics repo
        contentInsights, // Custom analytics repo
      ] = await Promise.all([
        this.achievementRepo.findAll({ where: { userId } as any, limit: 10 }),
        this.brandRepo.findAll({ where: { userId } as any, limit: 5 }),
        this.contentRepo.findAll({ where: { userId } as any, limit: 10 }),
        this.achievementAnalytics.analyzeInnovationPatterns(userId),
        this.brandAnalytics.analyzeBrandEvolution(userId),
        this.contentAnalytics.getContentOptimizationInsights(userId),
      ]);

      // Enhanced Neo4j queries for technical expertise (delegated to repository)
      const developerData =
        await this.developerRepo.getDeveloperWithTechnologies(userId);
      const currentSkills = developerData.technologies.map((tech) => tech.name);

      // Calculate enhanced analytics
      const analytics = await this.calculateEnhancedAnalytics(
        achievements,
        brandStrategies,
        contentHistory,
        innovationAnalysis,
        brandEvolutionAnalysis,
        contentInsights
      );

      return {
        userId,
        currentSkills,
        careerGoals: this.extractCareerGoals(brandStrategies),
        recentAchievements: achievements,
        brandEvolution: brandStrategies,
        contentHistory,
        analytics,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get enhanced developer context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get brand voice for a user
   */
  @Cached({ ttl: 600000 })
  async getBrandVoice(userId: string): Promise<any | null> {
    this.logger.log(`Retrieving brand voice for user ${userId}`);

    try {
      // Retrieve latest brand strategy which contains voice information
      const strategies = await this.brandRepo.findAll({
        where: { userId } as any,
        limit: 1,
      });
      if (strategies && strategies.length > 0) {
        // Extract brand voice from strategy or return default structure
        return {
          tone: 'professional',
          style: 'technical',
          personality: ['innovative', 'practical'],
          keywords: [],
        };
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get brand voice: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Get brand strategy for a user
   */
  @Cached({ ttl: 600000 })
  async getBrandStrategy(userId: string): Promise<any | null> {
    this.logger.log(`Retrieving brand strategy for user ${userId}`);

    try {
      const strategies = await this.brandRepo.findAll({
        where: { userId } as any,
        limit: 1,
      });
      if (strategies && strategies.length > 0) {
        return strategies[0];
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get brand strategy: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Get developer context for a user
   */
  @Cached({ ttl: 300000 })
  async getDevContext(userId: string): Promise<any | null> {
    this.logger.log(`Retrieving developer context for user ${userId}`);

    try {
      // Retrieve comprehensive developer data
      const developerData =
        await this.developerRepo.getDeveloperWithTechnologies(userId);
      const achievements = await this.achievementRepo.findAll({
        where: { userId } as any,
        limit: 10,
      });

      return {
        role: 'Software Developer',
        expertise: developerData.technologies.map((tech: any) => tech.name),
        experience: `${achievements.length} achievements tracked`,
        interests: developerData.technologies
          .map((tech: any) => tech.name)
          .slice(0, 5),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get developer context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Get brand evolution for a user
   */
  @Cached({ ttl: 600000 })
  async getBrandEvolution(userId: string): Promise<any | null> {
    this.logger.log(`Retrieving brand evolution for user ${userId}`);

    try {
      const evolutionData = await this.brandAnalytics.analyzeBrandEvolution(
        userId
      );
      return evolutionData;
    } catch (error) {
      this.logger.error(
        `Failed to get brand evolution: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Get personalized content strategy based on user query
   */
  @Cached({ ttl: 300000, keyStrategy: 'collection_aware' })
  async getPersonalizedContentStrategy(
    userId: string,
    query: string
  ): Promise<any> {
    this.logger.log(
      `Retrieving personalized content strategy for user ${userId} based on query: ${query}`
    );

    try {
      // Get brand strategy and content insights in parallel
      const [brandStrategy, contentInsights] = await Promise.all([
        this.getBrandStrategy(userId),
        this.contentAnalytics.getContentOptimizationInsights(userId),
      ]);

      // Semantic search using auto-generated repo
      const relatedStrategies = await this.brandRepo.search(query, {
        where: { userId } as any,
        limit: 3,
      });

      return {
        brandStrategy,
        contentInsights,
        relatedStrategies,
        recommendations: this.generatePersonalizedRecommendations(
          brandStrategy,
          contentInsights,
          query
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get personalized content strategy: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  // Private helper methods for AI-powered analysis

  private calculateInnovationScore(achievement: any): number {
    let score = 0.5;

    // Technology sophistication
    if (
      achievement.technologies.some((tech: string) =>
        ['AI', 'ML', 'Blockchain', 'WebAssembly'].includes(tech)
      )
    ) {
      score += 0.2;
    }

    // Impact level
    const impactBonus = { low: 0, medium: 0.1, high: 0.2, critical: 0.3 };
    score += impactBonus[achievement.impact as keyof typeof impactBonus] || 0;

    // Complexity indicators
    if (achievement.metrics?.complexity > 0.7) score += 0.1;
    if (achievement.metrics?.testCoverage > 0.8) score += 0.1;

    return Math.min(1.0, score);
  }

  private determineCollaborationLevel(
    achievement: any
  ): 'individual' | 'team' | 'cross-team' {
    const prCount = achievement.metrics?.pullRequests || 1;
    if (prCount > 5) return 'cross-team';
    if (prCount > 2) return 'team';
    return 'individual';
  }

  private assessTechnicalDepth(
    achievement: any
  ): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    const techCount = achievement.technologies.length;
    const complexity = achievement.metrics?.complexity || 0.5;

    if (techCount >= 5 && complexity > 0.8) return 'expert';
    if (techCount >= 3 && complexity > 0.6) return 'advanced';
    if (techCount >= 2 && complexity > 0.4) return 'intermediate';
    return 'basic';
  }

  private analyzeSentiment(
    content: string
  ): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis - in production, use proper NLP service
    const positiveWords = [
      'great',
      'excellent',
      'amazing',
      'love',
      'successful',
      'excited',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'hate',
      'failed',
      'disappointed',
      'frustrated',
    ];

    const words = content.toLowerCase().split(' ');
    const positiveCount = words.filter((word) =>
      positiveWords.includes(word)
    ).length;
    const negativeCount = words.filter((word) =>
      negativeWords.includes(word)
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractTopics(content: string): string[] {
    // Simplified topic extraction - in production, use proper NLP service
    const techTerms = [
      'javascript',
      'typescript',
      'react',
      'node',
      'ai',
      'ml',
      'database',
      'api',
      'microservices',
    ];
    const words = content.toLowerCase().split(/\W+/);
    return techTerms.filter((term) => words.includes(term)).slice(0, 5);
  }

  private calculateViralityFactor(metrics: any): number {
    const shareRatio = metrics.shares / (metrics.views || 1);
    const engagementRatio =
      (metrics.likes + metrics.comments) / (metrics.views || 1);
    return Math.min(1.0, shareRatio * 10 + engagementRatio);
  }

  private calculateAudienceResonance(metrics: any): number {
    const commentEngagement = metrics.comments / (metrics.likes || 1);
    const totalEngagement =
      (metrics.likes + metrics.comments + metrics.shares) /
      (metrics.views || 1);
    return Math.min(1.0, totalEngagement + commentEngagement * 0.5);
  }

  private assessContentTechnicalDepth(content: string): number {
    const technicalTerms = [
      'algorithm',
      'architecture',
      'implementation',
      'optimization',
      'performance',
    ];
    const words = content.toLowerCase().split(/\W+/);
    const technicalCount = words.filter((word) =>
      technicalTerms.includes(word)
    ).length;
    return Math.min(1.0, technicalCount / 10);
  }

  private determineBestPostingTime(platform: string): string {
    // Platform-specific optimal posting times
    const optimalTimes = {
      linkedin: '09:00',
      twitter: '12:00',
      devto: '14:00',
      medium: '10:00',
      github: '15:00',
      blog: '08:00',
    };
    return optimalTimes[platform as keyof typeof optimalTimes] || '10:00';
  }

  private suggestHashtags(content: string): string[] {
    // Simplified hashtag suggestion
    const words = content.toLowerCase().split(/\W+/);
    const techHashtags = [
      '#javascript',
      '#typescript',
      '#react',
      '#nodejs',
      '#ai',
      '#webdev',
    ];
    return techHashtags
      .filter((tag) => words.some((word) => tag.includes(word)))
      .slice(0, 3);
  }

  private assessAudienceEngagement(metrics: any): 'high' | 'medium' | 'low' {
    const engagementRate =
      (metrics.likes + metrics.comments) / (metrics.views || 1);
    if (engagementRate > 0.1) return 'high';
    if (engagementRate > 0.05) return 'medium';
    return 'low';
  }

  // Manual Neo4j methods removed - now delegated to repositories
  // - createEnhancedTechnologyRelationships → neo4jAchievementRepo.createEnhancedAchievementWithDeveloper
  // - createBrandStrategyRelationships → developerRepo.createBrandStrategyRelationships

  private extractCareerGoals(strategies: BrandStrategyEntity[]): string[] {
    if (strategies.length === 0) return [];

    const latestStrategy = strategies[0];
    return [
      `Achieve ${latestStrategy.metadata.positioning}`,
      `Target ${latestStrategy.metadata.targetAudience}`,
      ...latestStrategy.metadata.opportunities.slice(0, 2),
    ];
  }

  private async calculateEnhancedAnalytics(
    achievements: CodeAchievementEntity[],
    brandStrategies: BrandStrategyEntity[],
    contentHistory: ContentPerformanceEntity[],
    innovationAnalysis: any,
    brandEvolutionAnalysis: any,
    contentInsights: any
  ): Promise<DeveloperContext['analytics']> {
    // Calculate influence metrics
    const totalViews = contentHistory.reduce(
      (sum, content) => sum + content.metadata.metrics.views,
      0
    );
    const totalEngagement = contentHistory.reduce(
      (sum, content) =>
        sum +
        content.metadata.metrics.likes +
        content.metadata.metrics.comments +
        content.metadata.metrics.shares,
      0
    );

    const reach = Math.min(1.0, totalViews / 10000); // Normalize to 0-1 scale
    const engagement = totalEngagement / (totalViews || 1);
    const authority =
      achievements.reduce(
        (sum, ach) => sum + ach.metadata.analysis.innovationScore,
        0
      ) / achievements.length;

    return {
      achievementTrend: innovationAnalysis.innovationTrend,
      brandEvolutionScore: brandEvolutionAnalysis.confidenceTrend,
      contentEngagementTrend: this.calculateContentTrend(contentHistory),
      influenceMetrics: {
        reach,
        engagement,
        authority: authority || 0.5,
      },
      marketPositioning: {
        rank: Math.floor(Math.random() * 100) + 1, // Placeholder - would calculate from industry data
        percentile: Math.floor((authority || 0.5) * 100),
        competitiveGap: 1.0 - (authority || 0.5),
      },
    };
  }

  private calculateContentTrend(
    contentHistory: ContentPerformanceEntity[]
  ): 'growing' | 'stable' | 'declining' {
    if (contentHistory.length < 4) return 'stable';

    const recent = contentHistory.slice(
      0,
      Math.floor(contentHistory.length / 2)
    );
    const earlier = contentHistory.slice(Math.floor(contentHistory.length / 2));

    const recentAvg =
      recent.reduce(
        (sum, content) => sum + content.metadata.engagementScore,
        0
      ) / recent.length;
    const earlierAvg =
      earlier.reduce(
        (sum, content) => sum + content.metadata.engagementScore,
        0
      ) / earlier.length;

    if (recentAvg > earlierAvg + 0.1) return 'growing';
    if (recentAvg < earlierAvg - 0.1) return 'declining';
    return 'stable';
  }

  private generatePersonalizedRecommendations(
    brandStrategy: any,
    contentInsights: any,
    query: string
  ): string[] {
    const recommendations: string[] = [];

    // Add brand strategy recommendations
    if (brandStrategy?.metadata?.recommendations) {
      recommendations.push(
        ...brandStrategy.metadata.recommendations.slice(0, 2)
      );
    }

    // Add content optimization recommendations
    if (contentInsights?.recommendations) {
      recommendations.push(
        ...contentInsights.recommendations.map((r: any) => r.action).slice(0, 2)
      );
    }

    // If no specific recommendations, provide generic guidance
    if (recommendations.length === 0) {
      recommendations.push(
        'Build consistent content posting schedule',
        'Engage with your target audience regularly',
        'Analyze and optimize content performance'
      );
    }

    return recommendations;
  }
}
