import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@hive-academy/nestjs-chromadb';
import {
  TechTrendsRepository,
  TrendAnalysis,
} from '../repositories/chromadb/tech-trends.repository';
import {
  AudienceRepository,
  AudienceInsights,
} from '../repositories/chromadb/audience-analysis.repository';
import { TechTrendEntity } from '../entities/chromadb/tech-trend.entity';
import { AudienceAnalysisEntity } from '../entities/chromadb/audience-analysis.entity';

/**
 * CareerGoals - User's career objectives and preferences
 */
export interface CareerGoals {
  technologies: string[]; // Technologies to focus on
  targetRole: string; // Desired role
  industry: string; // Target industry
  platforms: string[]; // Preferred platforms
}

/**
 * ContentStrategy - Comprehensive content strategy with calendar and recommendations
 */
export interface ContentStrategy {
  calendar: ContentCalendar;
  platformOptimization: PlatformStrategy;
  engagementPredictions: EngagementPrediction[];
  contentIdeas: ContentIdea[];
}

/**
 * ContentCalendar - 30-day content calendar with daily recommendations
 */
export interface ContentCalendar {
  days: Array<{
    date: string;
    platform: string;
    contentType: string; // 'tutorial', 'thought-leadership', 'case-study'
    topic: string;
    estimatedEngagement: number;
  }>;
}

/**
 * PlatformStrategy - Platform-specific optimization strategies
 */
export interface PlatformStrategy {
  linkedin: { frequency: string; contentTypes: string[]; topics: string[] };
  devto: { frequency: string; contentTypes: string[]; topics: string[] };
  medium: { frequency: string; contentTypes: string[]; topics: string[] };
}

/**
 * EngagementPrediction - Predicted engagement for content topics
 */
export interface EngagementPrediction {
  platform: string;
  topic: string;
  predictedScore: number; // 0-100
  confidence: number; // 0-1
}

/**
 * ContentIdea - Generated content idea with engagement estimate
 */
export interface ContentIdea {
  title: string;
  type: string;
  platform: string;
  topics: string[];
  estimatedEngagement: number;
}

/**
 * ContentStrategyEngine - Coordinates tech trends and audience analysis
 *
 * Purpose: Generate personalized content strategies by combining technology
 * trends with audience insights for maximum engagement and career growth
 *
 * Use Cases:
 * - Generate 30-day content calendars aligned with career goals
 * - Optimize content distribution across platforms
 * - Predict engagement for content ideas
 * - Generate personalized content recommendations
 * - Track and adapt strategy based on trend evolution
 */
@Injectable()
export class ContentStrategyEngine {
  constructor(
    @InjectRepository(TechTrendEntity)
    private readonly techTrendsRepo: TechTrendsRepository,
    @InjectRepository(AudienceAnalysisEntity)
    private readonly audienceRepo: AudienceRepository
  ) {}

  /**
   * Generate comprehensive personalized content strategy
   *
   * @param userId - User identifier
   * @param goals - User's career goals and preferences
   * @returns Complete content strategy with calendar and recommendations
   */
  async generatePersonalizedStrategy(
    userId: string,
    goals: CareerGoals
  ): Promise<ContentStrategy> {
    // 1. Parallel analysis across repositories for performance
    const [techTrends, audienceAnalysis] = await Promise.all([
      this.techTrendsRepo.analyzeEmergingTechnologies(goals.technologies),
      this.audienceRepo.analyzeTargetAudience(goals.targetRole),
    ]);

    // 2. Generate content calendar
    const calendar = await this.generate30DayCalendar(
      userId,
      goals,
      techTrends,
      audienceAnalysis
    );

    // 3. Create platform-specific optimization strategies
    const platformOptimization = this.generatePlatformStrategy(
      audienceAnalysis,
      techTrends
    );

    // 4. Generate engagement predictions
    const engagementPredictions = this.generateEngagementPredictions(
      techTrends,
      audienceAnalysis,
      goals.platforms
    );

    // 5. Create content ideas
    const contentIdeas = this.generateContentIdeas(
      techTrends,
      audienceAnalysis,
      goals
    );

    return {
      calendar,
      platformOptimization,
      engagementPredictions,
      contentIdeas,
    };
  }

  /**
   * Generate 30-day content calendar
   *
   * @param userId - User identifier
   * @param goals - User's career goals
   * @param techTrends - Technology trend analysis
   * @param audienceAnalysis - Audience insights
   * @returns 30-day content calendar with daily recommendations
   */
  async generate30DayCalendar(
    userId: string,
    goals: CareerGoals,
    techTrends?: TrendAnalysis,
    audienceAnalysis?: AudienceInsights
  ): Promise<ContentCalendar> {
    // Fetch analyses if not provided
    if (!techTrends) {
      techTrends = await this.techTrendsRepo.analyzeEmergingTechnologies(
        goals.technologies
      );
    }
    if (!audienceAnalysis) {
      audienceAnalysis = await this.audienceRepo.analyzeTargetAudience(
        goals.targetRole
      );
    }

    const days: ContentCalendar['days'] = [];
    const platforms = goals.platforms.length > 0 ? goals.platforms : ['LinkedIn', 'Dev.to'];

    // Extract top topics from tech trends and audience interests
    const topTechnologies = [
      ...techTrends.trending.slice(0, 5),
      ...techTrends.emerging.slice(0, 3),
    ];
    const topicInterests = audienceAnalysis.engagementPatterns.topicInterests;

    // Generate 30 days of content
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // Rotate through platforms
      const platform = platforms[day % platforms.length];

      // Select content type based on day and platform
      const contentType = this.selectContentType(day, platform, audienceAnalysis);

      // Select topic from trending technologies or audience interests
      const topicIndex = day % (topTechnologies.length + topicInterests.length);
      const topic =
        topicIndex < topTechnologies.length
          ? topTechnologies[topicIndex].metadata.technology
          : topicInterests[topicIndex - topTechnologies.length];

      // Estimate engagement based on platform, content type, and topic
      const estimatedEngagement = this.estimateEngagement(
        platform,
        contentType,
        topic,
        techTrends,
        audienceAnalysis
      );

      days.push({
        date: dateStr,
        platform,
        contentType,
        topic,
        estimatedEngagement,
      });
    }

    return { days };
  }

  /**
   * Predict engagement for a specific content idea
   *
   * @param contentIdea - Content topic/title
   * @param platform - Target platform
   * @returns Engagement prediction with confidence score
   */
  async predictEngagement(
    contentIdea: string,
    platform: string
  ): Promise<EngagementPrediction> {
    // Analyze content topic against tech trends
    const searchResults = await this.techTrendsRepo.search(contentIdea, {
      limit: 10,
    });

    // Calculate engagement score based on trending topics
    let predictedScore = 50; // Base score
    let confidence = 0.5; // Base confidence

    if (searchResults.length > 0) {
      const topMatch = searchResults[0];

      // Increase score based on popularity and growth
      predictedScore += topMatch.metadata.popularity * 0.3;
      predictedScore += topMatch.metadata.growthRate * 0.2;
      predictedScore += topMatch.metadata.demandScore * 0.2;

      // Increase confidence based on match quality
      confidence = Math.min(0.95, 0.5 + searchResults.length * 0.05);
    }

    // Platform-specific adjustments
    const platformMultipliers: Record<string, number> = {
      LinkedIn: 1.2,
      'Dev.to': 1.1,
      Medium: 1.0,
      Twitter: 0.9,
    };

    predictedScore *= platformMultipliers[platform] || 1.0;
    predictedScore = Math.min(100, Math.round(predictedScore));

    return {
      platform,
      topic: contentIdea,
      predictedScore,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate platform-specific optimization strategies
   */
  private generatePlatformStrategy(
    audienceAnalysis: AudienceInsights,
    techTrends: TrendAnalysis
  ): PlatformStrategy {
    const preferredFormats = audienceAnalysis.engagementPatterns.preferredFormats;
    const topicInterests = audienceAnalysis.engagementPatterns.topicInterests;
    const trendingTopics = techTrends.trending
      .slice(0, 5)
      .map((t) => t.metadata.technology);

    return {
      linkedin: {
        frequency: '3-4 times per week',
        contentTypes: preferredFormats.includes('article')
          ? ['thought-leadership', 'case-study', 'career-advice']
          : ['quick-tip', 'announcement', 'poll'],
        topics: [...topicInterests.slice(0, 3), ...trendingTopics.slice(0, 2)],
      },
      devto: {
        frequency: '2-3 times per week',
        contentTypes: ['tutorial', 'deep-dive', 'project-showcase'],
        topics: trendingTopics,
      },
      medium: {
        frequency: '1-2 times per week',
        contentTypes: ['long-form', 'case-study', 'technical-deep-dive'],
        topics: [...trendingTopics.slice(0, 3), 'career development'],
      },
    };
  }

  /**
   * Generate engagement predictions for multiple topics and platforms
   */
  private generateEngagementPredictions(
    techTrends: TrendAnalysis,
    audienceAnalysis: AudienceInsights,
    platforms: string[]
  ): EngagementPrediction[] {
    const predictions: EngagementPrediction[] = [];
    const topics = [
      ...techTrends.trending.slice(0, 3).map((t) => t.metadata.technology),
      ...audienceAnalysis.engagementPatterns.topicInterests.slice(0, 5),
    ];

    const platformList = platforms.length > 0 ? platforms : ['LinkedIn', 'Dev.to', 'Medium'];

    platformList.forEach((platform) => {
      topics.forEach((topic) => {
        // Find matching tech trend
        const matchingTrend = techTrends.trending.find(
          (t) => t.metadata.technology === topic
        );

        const baseScore = matchingTrend
          ? (matchingTrend.metadata.popularity +
              matchingTrend.metadata.demandScore) /
            2
          : 60;

        const platformMultipliers: Record<string, number> = {
          LinkedIn: 1.15,
          'Dev.to': 1.1,
          Medium: 1.0,
          Twitter: 0.95,
        };

        const predictedScore = Math.min(
          100,
          Math.round(baseScore * (platformMultipliers[platform] || 1.0))
        );

        const confidence = matchingTrend ? 0.85 : 0.65;

        predictions.push({
          platform,
          topic,
          predictedScore,
          confidence,
        });
      });
    });

    return predictions.sort((a, b) => b.predictedScore - a.predictedScore);
  }

  /**
   * Generate content ideas based on trends and audience insights
   */
  private generateContentIdeas(
    techTrends: TrendAnalysis,
    audienceAnalysis: AudienceInsights,
    goals: CareerGoals
  ): ContentIdea[] {
    const ideas: ContentIdea[] = [];

    // 1. Generate ideas from trending technologies
    techTrends.trending.slice(0, 3).forEach((tech) => {
      ideas.push({
        title: `Getting Started with ${tech.metadata.technology}: A Practical Guide`,
        type: 'tutorial',
        platform: 'Dev.to',
        topics: [tech.metadata.technology, ...tech.metadata.relatedSkills.slice(0, 2)],
        estimatedEngagement: Math.round(
          tech.metadata.popularity * 0.8 + tech.metadata.growthRate * 0.2
        ),
      });
    });

    // 2. Generate ideas from emerging technologies
    techTrends.emerging.slice(0, 2).forEach((tech) => {
      ideas.push({
        title: `Why ${tech.metadata.technology} is the Next Big Thing in ${tech.metadata.category}`,
        type: 'thought-leadership',
        platform: 'LinkedIn',
        topics: [tech.metadata.technology, tech.metadata.category],
        estimatedEngagement: Math.round(tech.metadata.demandScore * 0.9),
      });
    });

    // 3. Generate ideas from audience topic interests
    audienceAnalysis.engagementPatterns.topicInterests
      .slice(0, 3)
      .forEach((topic) => {
        ideas.push({
          title: `How I Mastered ${topic}: Lessons from the Trenches`,
          type: 'case-study',
          platform: 'Medium',
          topics: [topic, 'career development'],
          estimatedEngagement: 75,
        });
      });

    // 4. Generate career-focused content
    ideas.push({
      title: `Transitioning to ${goals.targetRole}: A Strategic Roadmap`,
      type: 'career-advice',
      platform: 'LinkedIn',
      topics: [goals.targetRole, 'career development', 'tech skills'],
      estimatedEngagement: 80,
    });

    return ideas.sort((a, b) => b.estimatedEngagement - a.estimatedEngagement);
  }

  /**
   * Select appropriate content type based on day, platform, and audience
   */
  private selectContentType(
    day: number,
    platform: string,
    audienceAnalysis: AudienceInsights
  ): string {
    const dayOfWeek = day % 7;

    // Platform-specific content type preferences
    const platformTypes: Record<string, string[]> = {
      LinkedIn: ['thought-leadership', 'career-advice', 'case-study', 'quick-tip'],
      'Dev.to': ['tutorial', 'deep-dive', 'project-showcase', 'code-review'],
      Medium: ['long-form', 'case-study', 'technical-deep-dive', 'opinion'],
      Twitter: ['quick-tip', 'thread', 'announcement', 'poll'],
    };

    const availableTypes = platformTypes[platform] || ['article'];

    // Select based on day of week pattern
    // Monday/Wednesday/Friday: Educational content
    // Tuesday/Thursday: Thought leadership
    // Weekend: Lighter content
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return availableTypes[availableTypes.length - 1]; // Lighter content
    } else if (dayOfWeek % 2 === 0) {
      return availableTypes[0]; // Primary content type
    } else {
      return availableTypes[1] || availableTypes[0]; // Secondary type
    }
  }

  /**
   * Estimate engagement score for content
   */
  private estimateEngagement(
    platform: string,
    contentType: string,
    topic: string,
    techTrends: TrendAnalysis,
    audienceAnalysis: AudienceInsights
  ): number {
    let score = 50; // Base score

    // Find matching tech trend
    const matchingTrend = techTrends.trending.find(
      (t) => t.metadata.technology === topic
    );

    if (matchingTrend) {
      score += matchingTrend.metadata.popularity * 0.3;
      score += matchingTrend.metadata.growthRate * 0.2;
    }

    // Check if topic matches audience interests
    if (audienceAnalysis.engagementPatterns.topicInterests.includes(topic)) {
      score += 15;
    }

    // Platform multipliers
    const platformMultipliers: Record<string, number> = {
      LinkedIn: 1.2,
      'Dev.to': 1.1,
      Medium: 1.0,
      Twitter: 0.9,
    };

    score *= platformMultipliers[platform] || 1.0;

    // Content type multipliers
    const contentTypeMultipliers: Record<string, number> = {
      tutorial: 1.3,
      'deep-dive': 1.2,
      'thought-leadership': 1.15,
      'case-study': 1.1,
      'quick-tip': 0.95,
    };

    score *= contentTypeMultipliers[contentType] || 1.0;

    return Math.min(100, Math.round(score));
  }
}
