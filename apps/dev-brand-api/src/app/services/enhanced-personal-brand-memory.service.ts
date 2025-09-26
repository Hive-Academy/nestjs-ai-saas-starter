import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import { 
  ChromaRepository, 
  VectorQuery, 
  TenantAware, 
  Performance,
  BaseDocument,
  Cached,
  Profiled,
  Retry
} from '@hive-academy/nestjs-chromadb';

// Enhanced Type System for Personal Brand Memory
interface CodeAchievementDocument extends BaseDocument<{
  userId: string;
  description: string;
  technologies: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  date: string;
  repository: string;
  metrics: {
    linesChanged: number;
    complexity: number;
    testCoverage: number;
    pullRequests: number;
  };
  analysis: {
    innovationScore: number;
    collaborationLevel: 'individual' | 'team' | 'cross-team';
    technicalDepth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  };
}> {}

interface BrandStrategyDocument extends BaseDocument<{
  userId: string;
  positioning: string;
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
  targetAudience: string;
  confidenceScore: number;
  createdAt: string;
  evolution: {
    previousStrategyId?: string;
    changeTrigger: string;
    improvementScore: number;
    marketContext: string[];
  };
  metrics: {
    implementationProgress: number;
    marketResonance: number;
    competitorDifferentiation: number;
  };
}> {}

interface ContentPerformanceDocument extends BaseDocument<{
  userId: string;
  platform: 'linkedin' | 'devto' | 'twitter' | 'medium' | 'github' | 'blog';
  engagementScore: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks?: number;
  };
  createdAt: string;
  analysis: {
    sentiment: 'positive' | 'neutral' | 'negative';
    topics: string[];
    viralityFactor: number;
    audienceResonance: number;
    technicalDepth: number;
  };
  optimization: {
    bestPostingTime: string;
    suggestedHashtags: string[];
    audienceEngagement: 'high' | 'medium' | 'low';
  };
}> {}

// Enhanced Developer Context with Analytics
interface DeveloperContext {
  userId: string;
  currentSkills: string[];
  careerGoals: string[];
  recentAchievements: CodeAchievementDocument[];
  brandEvolution: BrandStrategyDocument[];
  contentHistory: ContentPerformanceDocument[];
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

// Specialized Repository Classes

/**
 * Code Achievement Repository - Manages developer accomplishments and technical contributions
 */
@ChromaRepository<CodeAchievementDocument>({
  collection: 'dev-achievements',
  idField: 'id',
  documentField: 'document', 
  metadataFields: [
    'userId', 'description', 'technologies', 'impact', 'date', 'repository',
    'metrics', 'analysis'
  ],
  autoEmbed: true,
  enableValidation: true,
  autoTimestamp: true,
})
@TenantAware({
  strategy: 'prefix',
  field: 'userId',
  separator: '_',
  enableAuditLog: true,
  strictValidation: true,
})
@Injectable()
export class CodeAchievementRepository {
  
  @VectorQuery<CodeAchievementDocument>({
    collection: 'dev-achievements',
    queryType: 'similarity',
    caching: { ttl: 300000, strategy: 'query' },
    includeMetadata: true,
    includeDistances: true,
  })
  @Profiled({ slowQueryThreshold: 100, includeParameters: false })
  async findByUserId(userId: string, options?: { 
    limit?: number; 
    minImpact?: CodeAchievementDocument['impact'];
    technologies?: string[];
  }): Promise<CodeAchievementDocument[]> {
    const filter: any = { userId };
    
    if (options?.minImpact) {
      const impactOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = impactOrder.indexOf(options.minImpact);
      filter.impact = { $in: impactOrder.slice(minIndex) };
    }
    
    if (options?.technologies?.length) {
      filter.technologies = { $in: options.technologies };
    }

    return await this.findAll({ 
      filter, 
      limit: options?.limit || 10,
      sort: { date: -1, 'analysis.innovationScore': -1 },
    });
  }

  @VectorQuery<CodeAchievementDocument>({
    collection: 'dev-achievements',
    queryType: 'semantic',
    caching: { ttl: 600000, strategy: 'result' },
  })
  @Cached({ ttl: 600000, keyStrategy: 'semantic_achievements' })
  async findSimilarAchievements(
    achievementDescription: string, 
    userId: string,
    options?: { limit?: number; minSimilarity?: number }
  ): Promise<CodeAchievementDocument[]> {
    return await this.search(achievementDescription, {
      filter: { userId },
      limit: options?.limit || 5,
      minScore: options?.minSimilarity || 0.7,
    });
  }

  @Performance.Monitor('achievement-innovation-analysis')
  async analyzeInnovationPatterns(userId: string): Promise<{
    innovationTrend: 'increasing' | 'stable' | 'decreasing';
    averageInnovationScore: number;
    topInnovativeAchievements: CodeAchievementDocument[];
    recommendedFocusAreas: string[];
  }> {
    const achievements = await this.findByUserId(userId, { limit: 20 });
    
    const innovationScores = achievements.map(a => a.analysis.innovationScore);
    const averageInnovationScore = innovationScores.reduce((sum, score) => sum + score, 0) / innovationScores.length;
    
    // Calculate trend over time
    const recentScores = achievements.slice(0, 5).map(a => a.analysis.innovationScore);
    const earlierScores = achievements.slice(-5).map(a => a.analysis.innovationScore);
    const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const earlierAvg = earlierScores.reduce((sum, score) => sum + score, 0) / earlierScores.length;
    
    let innovationTrend: 'increasing' | 'stable' | 'decreasing';
    if (recentAvg > earlierAvg + 0.1) innovationTrend = 'increasing';
    else if (recentAvg < earlierAvg - 0.1) innovationTrend = 'decreasing';
    else innovationTrend = 'stable';

    const topInnovativeAchievements = achievements
      .sort((a, b) => b.analysis.innovationScore - a.analysis.innovationScore)
      .slice(0, 3);

    // Analyze technology patterns for recommendations
    const technologyFrequency = new Map<string, number>();
    achievements.forEach(achievement => {
      achievement.technologies.forEach(tech => {
        technologyFrequency.set(tech, (technologyFrequency.get(tech) || 0) + 1);
      });
    });

    const recommendedFocusAreas = Array.from(technologyFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tech]) => tech);

    return {
      innovationTrend,
      averageInnovationScore,
      topInnovativeAchievements,
      recommendedFocusAreas,
    };
  }
}

/**
 * Brand Strategy Repository - Manages brand positioning and evolution tracking
 */
@ChromaRepository<BrandStrategyDocument>({
  collection: 'brand-evolution',
  idField: 'id',
  documentField: 'document',
  metadataFields: [
    'userId', 'positioning', 'strengths', 'opportunities', 'recommendations',
    'targetAudience', 'confidenceScore', 'createdAt', 'evolution', 'metrics'
  ],
  autoEmbed: true,
  enableValidation: true,
  autoTimestamp: true,
})
@TenantAware({
  strategy: 'prefix',
  field: 'userId',
  separator: '_',
  enableAuditLog: true,
})
@Injectable()
export class BrandStrategyRepository {
  
  @VectorQuery<BrandStrategyDocument>({
    collection: 'brand-evolution',
    queryType: 'similarity',
    caching: { ttl: 600000, strategy: 'query' },
  })
  @Cached({ ttl: 600000, keyStrategy: 'brand_evolution' })
  async findByUserId(userId: string, options?: { limit?: number }): Promise<BrandStrategyDocument[]> {
    return await this.findAll({ 
      filter: { userId }, 
      limit: options?.limit || 5,
      sort: { createdAt: -1, confidenceScore: -1 },
    });
  }

  @Performance.Monitor('brand-evolution-analysis')
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeBrandEvolution(userId: string): Promise<{
    evolutionTrajectory: 'improving' | 'stable' | 'declining';
    confidenceTrend: number;
    strategicMilestones: BrandStrategyDocument[];
    nextEvolutionPrediction: {
      suggestedFocusAreas: string[];
      confidenceImprovement: number;
      timelineEstimate: string;
    };
  }> {
    const strategies = await this.findByUserId(userId, { limit: 10 });
    
    if (strategies.length < 2) {
      return {
        evolutionTrajectory: 'stable',
        confidenceTrend: strategies[0]?.confidenceScore || 0.5,
        strategicMilestones: strategies,
        nextEvolutionPrediction: {
          suggestedFocusAreas: ['Build initial brand foundation'],
          confidenceImprovement: 0.2,
          timelineEstimate: '3 months',
        },
      };
    }

    // Analyze confidence score progression
    const confidenceScores = strategies.map(s => s.confidenceScore);
    const recentAvg = confidenceScores.slice(0, 3).reduce((sum, score) => sum + score, 0) / Math.min(3, confidenceScores.length);
    const earlierAvg = confidenceScores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, confidenceScores.length);
    
    let evolutionTrajectory: 'improving' | 'stable' | 'declining';
    if (recentAvg > earlierAvg + 0.1) evolutionTrajectory = 'improving';
    else if (recentAvg < earlierAvg - 0.1) evolutionTrajectory = 'declining';
    else evolutionTrajectory = 'stable';

    // Identify strategic milestones (significant improvements)
    const strategicMilestones = strategies.filter(strategy => 
      strategy.evolution.improvementScore > 0.2 || strategy.confidenceScore > 0.8
    );

    // Predict next evolution opportunities
    const latestStrategy = strategies[0];
    const suggestedFocusAreas = this.identifyGrowthOpportunities(latestStrategy, strategies);

    return {
      evolutionTrajectory,
      confidenceTrend: recentAvg - earlierAvg,
      strategicMilestones,
      nextEvolutionPrediction: {
        suggestedFocusAreas,
        confidenceImprovement: Math.min(0.3, 1.0 - latestStrategy.confidenceScore),
        timelineEstimate: evolutionTrajectory === 'improving' ? '2 months' : '4 months',
      },
    };
  }

  private identifyGrowthOpportunities(
    latestStrategy: BrandStrategyDocument, 
    allStrategies: BrandStrategyDocument[]
  ): string[] {
    const focusAreas: string[] = [];
    
    // Analyze confidence gaps
    if (latestStrategy.confidenceScore < 0.7) {
      focusAreas.push('Strengthen core brand messaging');
    }
    
    // Analyze market context gaps
    if (latestStrategy.evolution.marketContext.length < 3) {
      focusAreas.push('Expand market awareness and positioning');
    }
    
    // Analyze implementation progress
    if (latestStrategy.metrics.implementationProgress < 0.6) {
      focusAreas.push('Accelerate strategy implementation');
    }

    // Analyze competitive differentiation
    if (latestStrategy.metrics.competitorDifferentiation < 0.7) {
      focusAreas.push('Develop unique value proposition');
    }

    return focusAreas.length > 0 ? focusAreas : ['Continue current strategy refinement'];
  }
}

/**
 * Content Performance Repository - Manages social media and content analytics
 */
@ChromaRepository<ContentPerformanceDocument>({
  collection: 'content-metrics',
  idField: 'id',
  documentField: 'document',
  metadataFields: [
    'userId', 'platform', 'engagementScore', 'metrics', 'createdAt',
    'analysis', 'optimization'
  ],
  autoEmbed: true,
  enableValidation: true,
})
@TenantAware({
  strategy: 'prefix',
  field: 'userId',
  separator: '_',
})
@Injectable()
export class ContentPerformanceRepository {
  
  @VectorQuery<ContentPerformanceDocument>({
    collection: 'content-metrics',
    queryType: 'similarity',
    caching: { ttl: 300000, strategy: 'query' },
  })
  async findByUserId(userId: string, options?: { 
    limit?: number; 
    platform?: string;
    minEngagement?: number;
  }): Promise<ContentPerformanceDocument[]> {
    const filter: any = { userId };
    
    if (options?.platform) {
      filter.platform = options.platform;
    }
    
    if (options?.minEngagement) {
      filter.engagementScore = { $gte: options.minEngagement };
    }

    return await this.findAll({ 
      filter, 
      limit: options?.limit || 10,
      sort: { createdAt: -1, engagementScore: -1 },
    });
  }

  @VectorQuery<ContentPerformanceDocument>({
    collection: 'content-metrics',
    queryType: 'similarity',
    caching: { ttl: 300000, strategy: 'result' },
  })
  @Profiled({ slowQueryThreshold: 150 })
  async findHighPerformingContent(
    userId: string, 
    minEngagement = 0.7
  ): Promise<ContentPerformanceDocument[]> {
    return await this.findAll({
      filter: { 
        userId, 
        engagementScore: { $gte: minEngagement },
      },
      limit: 10,
      sort: { engagementScore: -1, 'metrics.views': -1 },
    });
  }

  @Performance.Monitor('content-optimization-analysis')
  @Cached({ ttl: 1800000, key: 'content_insights_${userId}' })
  async getContentOptimizationInsights(userId: string): Promise<{
    bestPerformingPlatforms: Array<{ platform: string; avgEngagement: number }>;
    optimalPostingTimes: Array<{ time: string; engagementBoost: number }>;
    topPerformingTopics: Array<{ topic: string; averageEngagement: number }>;
    contentGaps: string[];
    recommendations: Array<{ action: string; expectedImprovement: number }>;
  }> {
    const content = await this.findByUserId(userId, { limit: 50 });
    
    if (content.length === 0) {
      return {
        bestPerformingPlatforms: [],
        optimalPostingTimes: [],
        topPerformingTopics: [],
        contentGaps: ['No content history available'],
        recommendations: [{ action: 'Start creating and tracking content performance', expectedImprovement: 0.5 }],
      };
    }

    // Analyze platform performance
    const platformStats = new Map<string, { total: number; totalEngagement: number }>();
    content.forEach(item => {
      const current = platformStats.get(item.platform) || { total: 0, totalEngagement: 0 };
      platformStats.set(item.platform, {
        total: current.total + 1,
        totalEngagement: current.totalEngagement + item.engagementScore,
      });
    });

    const bestPerformingPlatforms = Array.from(platformStats.entries())
      .map(([platform, stats]) => ({
        platform,
        avgEngagement: stats.totalEngagement / stats.total,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Analyze posting times
    const timeStats = new Map<string, { count: number; totalEngagement: number }>();
    content.forEach(item => {
      const postingTime = item.optimization.bestPostingTime;
      const current = timeStats.get(postingTime) || { count: 0, totalEngagement: 0 };
      timeStats.set(postingTime, {
        count: current.count + 1,
        totalEngagement: current.totalEngagement + item.engagementScore,
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
    const topicStats = new Map<string, { count: number; totalEngagement: number }>();
    content.forEach(item => {
      item.analysis.topics.forEach(topic => {
        const current = topicStats.get(topic) || { count: 0, totalEngagement: 0 };
        topicStats.set(topic, {
          count: current.count + 1,
          totalEngagement: current.totalEngagement + item.engagementScore,
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
    const avgEngagement = content.reduce((sum, item) => sum + item.engagementScore, 0) / content.length;
    
    if (avgEngagement < 0.5) contentGaps.push('Overall engagement below average');
    if (bestPerformingPlatforms.length < 2) contentGaps.push('Limited platform diversification');
    if (topPerformingTopics.length < 3) contentGaps.push('Narrow topic coverage');

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

  private generateContentRecommendations(
    platforms: Array<{ platform: string; avgEngagement: number }>,
    topics: Array<{ topic: string; averageEngagement: number }>,
    avgEngagement: number
  ): Array<{ action: string; expectedImprovement: number }> {
    const recommendations: Array<{ action: string; expectedImprovement: number }> = [];

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
        action: 'Improve content quality and relevance to increase overall engagement',
        expectedImprovement: 0.4,
      });
    }

    return recommendations;
  }
}

/**
 * Enhanced Personal Brand Memory Service
 * 
 * This service demonstrates the complete transformation from manual ChromaDB operations
 * to a declarative, repository-driven pattern with comprehensive analytics and insights.
 */
@Injectable()
export class EnhancedPersonalBrandMemoryService {
  private readonly logger = new Logger(EnhancedPersonalBrandMemoryService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly achievementRepo: CodeAchievementRepository,
    private readonly brandRepo: BrandStrategyRepository,
    private readonly contentRepo: ContentPerformanceRepository
  ) {}

  /**
   * Store code achievement with enhanced analytics and automatic processing
   */
  @Performance.Monitor('store-code-achievement')
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async storeCodeAchievement(userId: string, achievement: any): Promise<void> {
    this.logger.log(`Storing enhanced achievement for user ${userId}: ${achievement.description}`);

    try {
      // Enhanced achievement document with AI-powered analysis
      const enhancedAchievement: Partial<CodeAchievementDocument> = {
        id: achievement.id,
        document: `${achievement.description} | Technologies: ${achievement.technologies.join(', ')} | Impact: ${achievement.impact} | Innovation Score: ${achievement.analysis?.innovationScore || 0.7}`,
        userId,
        description: achievement.description,
        technologies: achievement.technologies,
        impact: achievement.impact,
        date: achievement.date,
        repository: achievement.repository,
        metrics: {
          linesChanged: achievement.metrics?.linesChanged || 0,
          complexity: achievement.metrics?.complexity || 0,
          testCoverage: achievement.metrics?.testCoverage || 0,
          pullRequests: achievement.metrics?.pullRequests || 1,
        },
        analysis: {
          innovationScore: achievement.analysis?.innovationScore || this.calculateInnovationScore(achievement),
          collaborationLevel: achievement.analysis?.collaborationLevel || this.determineCollaborationLevel(achievement),
          technicalDepth: achievement.analysis?.technicalDepth || this.assessTechnicalDepth(achievement),
        },
      };

      // Store using repository with automatic validation, embedding, and caching
      await this.achievementRepo.create(enhancedAchievement as CodeAchievementDocument);

      // Enhanced Neo4j relationships with additional context
      await this.createEnhancedTechnologyRelationships(userId, enhancedAchievement);

      this.logger.log(`✅ Enhanced achievement stored successfully: ${achievement.id}`);
    } catch (error) {
      this.logger.error(`Failed to store enhanced achievement: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Store brand strategy with evolution tracking and market analysis
   */
  @Performance.Monitor('store-brand-strategy')
  async storeBrandStrategy(userId: string, strategy: any): Promise<void> {
    this.logger.log(`Storing enhanced brand strategy for user ${userId}`);

    try {
      // Get previous strategy for evolution analysis
      const previousStrategies = await this.brandRepo.findByUserId(userId, { limit: 1 });
      const previousStrategy = previousStrategies[0];

      // Enhanced strategy document with evolution tracking
      const enhancedStrategy: Partial<BrandStrategyDocument> = {
        id: strategy.id,
        document: `Brand positioning: ${strategy.positioning} | Strengths: ${strategy.strengths.join(', ')} | Target: ${strategy.targetAudience} | Confidence: ${strategy.confidenceScore}`,
        userId,
        positioning: strategy.positioning,
        strengths: strategy.strengths,
        opportunities: strategy.opportunities,
        recommendations: strategy.recommendations,
        targetAudience: strategy.targetAudience,
        confidenceScore: strategy.confidenceScore,
        createdAt: strategy.createdAt,
        evolution: {
          previousStrategyId: previousStrategy?.id,
          changeTrigger: strategy.evolution?.changeTrigger || 'New strategy development',
          improvementScore: previousStrategy 
            ? strategy.confidenceScore - previousStrategy.confidenceScore
            : 0.5,
          marketContext: strategy.evolution?.marketContext || ['Technology sector', 'Remote work trends'],
        },
        metrics: {
          implementationProgress: strategy.metrics?.implementationProgress || 0.1,
          marketResonance: strategy.metrics?.marketResonance || 0.6,
          competitorDifferentiation: strategy.metrics?.competitorDifferentiation || 0.5,
        },
      };

      // Store using repository
      await this.brandRepo.create(enhancedStrategy as BrandStrategyDocument);

      // Enhanced Neo4j strategy relationships
      await this.createBrandStrategyRelationships(userId, enhancedStrategy);

      this.logger.log(`✅ Enhanced brand strategy stored successfully: ${strategy.id}`);
    } catch (error) {
      this.logger.error(`Failed to store enhanced brand strategy: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Store content performance with advanced analytics and optimization insights
   */
  @Performance.Monitor('store-content-performance')
  async storeContentPerformance(userId: string, content: any): Promise<void> {
    this.logger.log(`Storing enhanced content performance for user ${userId} on ${content.platform}`);

    try {
      // Enhanced content document with AI-powered analysis
      const enhancedContent: Partial<ContentPerformanceDocument> = {
        id: content.id,
        document: content.content,
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
        analysis: {
          sentiment: content.analysis?.sentiment || this.analyzeSentiment(content.content),
          topics: content.analysis?.topics || this.extractTopics(content.content),
          viralityFactor: content.analysis?.viralityFactor || this.calculateViralityFactor(content.metrics),
          audienceResonance: content.analysis?.audienceResonance || this.calculateAudienceResonance(content.metrics),
          technicalDepth: content.analysis?.technicalDepth || this.assessContentTechnicalDepth(content.content),
        },
        optimization: {
          bestPostingTime: content.optimization?.bestPostingTime || this.determineBestPostingTime(content.platform),
          suggestedHashtags: content.optimization?.suggestedHashtags || this.suggestHashtags(content.content),
          audienceEngagement: content.optimization?.audienceEngagement || this.assessAudienceEngagement(content.metrics),
        },
      };

      // Store using repository
      await this.contentRepo.create(enhancedContent as ContentPerformanceDocument);

      this.logger.log(`✅ Enhanced content performance stored successfully: ${content.id}`);
    } catch (error) {
      this.logger.error(`Failed to store enhanced content performance: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get comprehensive developer context with advanced analytics
   */
  @Performance.Monitor('get-enhanced-dev-context')
  @Cached({ ttl: 1800000, key: 'enhanced_dev_context_${userId}' })
  async getEnhancedDevContext(userId: string): Promise<DeveloperContext> {
    this.logger.log(`Retrieving enhanced developer context for user ${userId}`);

    try {
      // Parallel retrieval using repositories with built-in caching
      const [achievements, brandStrategies, contentHistory, innovationAnalysis, brandEvolutionAnalysis, contentInsights] = await Promise.all([
        this.achievementRepo.findByUserId(userId, { limit: 10 }),
        this.brandRepo.findByUserId(userId, { limit: 5 }),
        this.contentRepo.findByUserId(userId, { limit: 10 }),
        this.achievementRepo.analyzeInnovationPatterns(userId),
        this.brandRepo.analyzeBrandEvolution(userId),
        this.contentRepo.getContentOptimizationInsights(userId),
      ]);

      // Enhanced Neo4j queries for technical expertise
      const techResult = await this.neo4j.run(
        `
        MATCH (u:Developer {id: $userId})-[:EXPERIENCED_WITH]->(t:Technology)
        RETURN t.name as technology,
               COUNT{(u)-[:ACHIEVED]->(:Achievement)-[:USES_TECHNOLOGY]->(t)} as experience_level,
               AVG(toFloat(a.impact)) as avg_impact
        ORDER BY experience_level DESC, avg_impact DESC
        LIMIT 15
        `,
        { userId }
      );

      const currentSkills = techResult.records?.map((record) => (record as any).get('technology')) || [];

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
      this.logger.error(`Failed to get enhanced developer context: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Private helper methods for AI-powered analysis

  private calculateInnovationScore(achievement: any): number {
    let score = 0.5;
    
    // Technology sophistication
    if (achievement.technologies.some((tech: string) => ['AI', 'ML', 'Blockchain', 'WebAssembly'].includes(tech))) {
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

  private determineCollaborationLevel(achievement: any): 'individual' | 'team' | 'cross-team' {
    const prCount = achievement.metrics?.pullRequests || 1;
    if (prCount > 5) return 'cross-team';
    if (prCount > 2) return 'team';
    return 'individual';
  }

  private assessTechnicalDepth(achievement: any): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    const techCount = achievement.technologies.length;
    const complexity = achievement.metrics?.complexity || 0.5;
    
    if (techCount >= 5 && complexity > 0.8) return 'expert';
    if (techCount >= 3 && complexity > 0.6) return 'advanced';
    if (techCount >= 2 && complexity > 0.4) return 'intermediate';
    return 'basic';
  }

  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis - in production, use proper NLP service
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'successful', 'excited'];
    const negativeWords = ['bad', 'terrible', 'hate', 'failed', 'disappointed', 'frustrated'];
    
    const words = content.toLowerCase().split(' ');
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractTopics(content: string): string[] {
    // Simplified topic extraction - in production, use proper NLP service
    const techTerms = ['javascript', 'typescript', 'react', 'node', 'ai', 'ml', 'database', 'api', 'microservices'];
    const words = content.toLowerCase().split(/\W+/);
    return techTerms.filter(term => words.includes(term)).slice(0, 5);
  }

  private calculateViralityFactor(metrics: any): number {
    const shareRatio = metrics.shares / (metrics.views || 1);
    const engagementRatio = (metrics.likes + metrics.comments) / (metrics.views || 1);
    return Math.min(1.0, shareRatio * 10 + engagementRatio);
  }

  private calculateAudienceResonance(metrics: any): number {
    const commentEngagement = metrics.comments / (metrics.likes || 1);
    const totalEngagement = (metrics.likes + metrics.comments + metrics.shares) / (metrics.views || 1);
    return Math.min(1.0, totalEngagement + commentEngagement * 0.5);
  }

  private assessContentTechnicalDepth(content: string): number {
    const technicalTerms = ['algorithm', 'architecture', 'implementation', 'optimization', 'performance'];
    const words = content.toLowerCase().split(/\W+/);
    const technicalCount = words.filter(word => technicalTerms.includes(word)).length;
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
    const techHashtags = ['#javascript', '#typescript', '#react', '#nodejs', '#ai', '#webdev'];
    return techHashtags.filter(tag => words.some(word => tag.includes(word))).slice(0, 3);
  }

  private assessAudienceEngagement(metrics: any): 'high' | 'medium' | 'low' {
    const engagementRate = (metrics.likes + metrics.comments) / (metrics.views || 1);
    if (engagementRate > 0.1) return 'high';
    if (engagementRate > 0.05) return 'medium';
    return 'low';
  }

  private async createEnhancedTechnologyRelationships(userId: string, achievement: any): Promise<void> {
    await this.neo4j.run(
      `
      MERGE (u:Developer {id: $userId})
      CREATE (a:Achievement {
        id: $achievementId,
        description: $description,
        impact: $impact,
        innovationScore: $innovationScore,
        collaborationLevel: $collaborationLevel,
        technicalDepth: $technicalDepth,
        date: $date,
        repository: $repository
      })
      CREATE (u)-[:ACHIEVED]->(a)

      WITH u, a
      UNWIND $technologies as tech
      MERGE (t:Technology {name: tech})
      CREATE (a)-[:USES_TECHNOLOGY {proficiency: $technicalDepth}]->(t)
      MERGE (u)-[:EXPERIENCED_WITH {level: $collaborationLevel}]->(t)
      `,
      {
        userId,
        achievementId: achievement.id,
        description: achievement.description,
        impact: achievement.impact,
        innovationScore: achievement.analysis?.innovationScore || 0.7,
        collaborationLevel: achievement.analysis?.collaborationLevel || 'individual',
        technicalDepth: achievement.analysis?.technicalDepth || 'intermediate',
        date: achievement.date,
        repository: achievement.repository,
        technologies: achievement.technologies,
      }
    );
  }

  private async createBrandStrategyRelationships(userId: string, strategy: any): Promise<void> {
    await this.neo4j.run(
      `
      MERGE (u:Developer {id: $userId})
      CREATE (s:BrandStrategy {
        id: $strategyId,
        positioning: $positioning,
        targetAudience: $targetAudience,
        confidenceScore: $confidenceScore,
        implementationProgress: $implementationProgress,
        marketResonance: $marketResonance,
        createdAt: $createdAt
      })
      CREATE (u)-[:HAS_STRATEGY]->(s)

      WITH u, s
      UNWIND $strengths as strength
      MERGE (st:Strength {name: strength})
      CREATE (s)-[:LEVERAGES]->(st)
      CREATE (u)-[:POSSESSES]->(st)
      `,
      {
        userId,
        strategyId: strategy.id,
        positioning: strategy.positioning,
        targetAudience: strategy.targetAudience,
        confidenceScore: strategy.confidenceScore,
        implementationProgress: strategy.metrics?.implementationProgress || 0.1,
        marketResonance: strategy.metrics?.marketResonance || 0.6,
        createdAt: strategy.createdAt,
        strengths: strategy.strengths,
      }
    );
  }

  private extractCareerGoals(strategies: BrandStrategyDocument[]): string[] {
    if (strategies.length === 0) return [];
    
    const latestStrategy = strategies[0];
    return [
      `Achieve ${latestStrategy.positioning}`,
      `Target ${latestStrategy.targetAudience}`,
      ...latestStrategy.opportunities.slice(0, 2),
    ];
  }

  private async calculateEnhancedAnalytics(
    achievements: CodeAchievementDocument[],
    brandStrategies: BrandStrategyDocument[],
    contentHistory: ContentPerformanceDocument[],
    innovationAnalysis: any,
    brandEvolutionAnalysis: any,
    contentInsights: any
  ): Promise<DeveloperContext['analytics']> {
    // Calculate influence metrics
    const totalViews = contentHistory.reduce((sum, content) => sum + content.metrics.views, 0);
    const totalEngagement = contentHistory.reduce((sum, content) => 
      sum + content.metrics.likes + content.metrics.comments + content.metrics.shares, 0
    );
    
    const reach = Math.min(1.0, totalViews / 10000); // Normalize to 0-1 scale
    const engagement = totalEngagement / (totalViews || 1);
    const authority = achievements.reduce((sum, ach) => sum + ach.analysis.innovationScore, 0) / achievements.length;

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

  private calculateContentTrend(contentHistory: ContentPerformanceDocument[]): 'growing' | 'stable' | 'declining' {
    if (contentHistory.length < 4) return 'stable';
    
    const recent = contentHistory.slice(0, Math.floor(contentHistory.length / 2));
    const earlier = contentHistory.slice(Math.floor(contentHistory.length / 2));
    
    const recentAvg = recent.reduce((sum, content) => sum + content.engagementScore, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, content) => sum + content.engagementScore, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.1) return 'growing';
    if (recentAvg < earlierAvg - 0.1) return 'declining';
    return 'stable';
  }
}