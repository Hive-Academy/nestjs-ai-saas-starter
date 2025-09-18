import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';

// Personal Brand Memory Interfaces
interface CodeAchievement {
  id: string;
  description: string;
  technologies: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  date: string;
  repository: string;
  userId: string;
}

interface BrandStrategy {
  id: string;
  positioning: string;
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
  targetAudience: string;
  confidenceScore: number;
  createdAt: string;
}

interface ContentPerformance {
  id: string;
  platform: 'linkedin' | 'devto' | 'twitter' | 'medium';
  content: string;
  engagementScore: number;
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  createdAt: string;
  userId: string;
}

interface DeveloperContext {
  userId: string;
  currentSkills: string[];
  careerGoals: string[];
  recentAchievements: CodeAchievement[];
  brandEvolution: BrandStrategy[];
  contentHistory: ContentPerformance[];
}

/**
 * 🧠 PERSONAL BRAND MEMORY SERVICE
 *
 * Extends MemoryFacadeService pattern for personal branding intelligence:
 * ✅ ChromaDB for semantic analysis of code contributions and content
 * ✅ Neo4j for technology relationships and career progression mapping
 * ✅ Hybrid search combining vector similarity with graph traversal
 * ✅ Brand evolution tracking and personalized strategy development
 * ✅ Content performance analysis for optimization insights
 */
@Injectable()
export class PersonalBrandMemoryService {
  private readonly logger = new Logger(PersonalBrandMemoryService.name);

  // Memory collections for personal branding
  private readonly collections = {
    developerWork: 'dev-achievements', // ChromaDB: Code analysis, projects
    contentPerformance: 'content-metrics', // ChromaDB: Engagement data
    brandEvolution: 'brand-history', // ChromaDB: Brand strategy evolution
    technicalGraph: 'tech-relationships', // Neo4j: Tech stack, project relations
  };

  constructor(
    private readonly chromaDB: ChromaDBService,
    private readonly neo4j: Neo4jService
  ) {}

  /**
   * Store developer achievement with semantic embedding and graph relationships
   */
  async storeCodeAchievement(
    userId: string,
    achievement: CodeAchievement
  ): Promise<void> {
    this.logger.log(
      `Storing achievement for user ${userId}: ${achievement.description}`
    );

    try {
      // Store in ChromaDB for semantic search
      await this.chromaDB.addDocuments(this.collections.developerWork, [
        {
          id: achievement.id,
          document: `${
            achievement.description
          } | Technologies: ${achievement.technologies.join(', ')} | Impact: ${
            achievement.impact
          }`,
          metadata: {
            userId,
            type: 'achievement',
            technologies: achievement.technologies.join(', '),
            impact: achievement.impact,
            date: achievement.date,
            repository: achievement.repository,
          },
        },
      ]);

      // Store relationships in Neo4j
      await this.neo4j.run(
        `
        MERGE (u:Developer {id: $userId})
        CREATE (a:Achievement {
          id: $achievementId,
          description: $description,
          impact: $impact,
          date: $date,
          repository: $repository
        })
        CREATE (u)-[:ACHIEVED]->(a)

        // Create technology relationships
        WITH u, a
        UNWIND $technologies as tech
        MERGE (t:Technology {name: tech})
        CREATE (a)-[:USES_TECHNOLOGY]->(t)
        CREATE (u)-[:EXPERIENCED_WITH]->(t)
        `,
        {
          userId,
          achievementId: achievement.id,
          description: achievement.description,
          impact: achievement.impact,
          date: achievement.date,
          repository: achievement.repository,
          technologies: achievement.technologies,
        }
      );

      this.logger.log(`✅ Achievement stored successfully: ${achievement.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to store achievement: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Store brand strategy evolution in memory system
   */
  async storeBrandStrategy(
    userId: string,
    strategy: BrandStrategy
  ): Promise<void> {
    this.logger.log(`Storing brand strategy for user ${userId}`);

    try {
      // Store in ChromaDB for semantic analysis
      await this.chromaDB.addDocuments(this.collections.brandEvolution, [
        {
          id: strategy.id,
          document: `Brand positioning: ${
            strategy.positioning
          } | Strengths: ${strategy.strengths.join(
            ', '
          )} | Recommendations: ${strategy.recommendations.join(', ')}`,
          metadata: {
            userId,
            type: 'brand_strategy',
            positioning: strategy.positioning,
            confidenceScore: strategy.confidenceScore,
            targetAudience: strategy.targetAudience,
            createdAt: strategy.createdAt,
          },
        },
      ]);

      // Store strategy evolution in Neo4j
      await this.neo4j.run(
        `
        MERGE (u:Developer {id: $userId})
        CREATE (s:BrandStrategy {
          id: $strategyId,
          positioning: $positioning,
          targetAudience: $targetAudience,
          confidenceScore: $confidenceScore,
          createdAt: $createdAt
        })
        CREATE (u)-[:HAS_STRATEGY]->(s)

        // Connect strengths and opportunities
        WITH u, s
        UNWIND $strengths as strength
        MERGE (st:Strength {name: strength})
        CREATE (s)-[:LEVERAGES]->(st)
        `,
        {
          userId,
          strategyId: strategy.id,
          positioning: strategy.positioning,
          targetAudience: strategy.targetAudience,
          confidenceScore: strategy.confidenceScore,
          createdAt: strategy.createdAt,
          strengths: strategy.strengths,
        }
      );

      this.logger.log(`✅ Brand strategy stored successfully: ${strategy.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to store brand strategy: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Store content performance metrics for optimization
   */
  async storeContentPerformance(
    userId: string,
    content: ContentPerformance
  ): Promise<void> {
    this.logger.log(
      `Storing content performance for user ${userId} on ${content.platform}`
    );

    try {
      // Store in ChromaDB for semantic analysis
      await this.chromaDB.addDocuments(this.collections.contentPerformance, [
        {
          id: content.id,
          document: content.content,
          metadata: {
            userId,
            platform: content.platform,
            engagementScore: content.engagementScore,
            views: content.metrics.views || 0,
            likes: content.metrics.likes || 0,
            comments: content.metrics.comments || 0,
            shares: content.metrics.shares || 0,
            createdAt: content.createdAt,
          },
        },
      ]);

      this.logger.log(
        `✅ Content performance stored successfully: ${content.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store content performance: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get comprehensive developer context for personalized strategy
   */
  async getDevContext(userId: string): Promise<DeveloperContext> {
    this.logger.log(`Retrieving developer context for user ${userId}`);

    try {
      // Get recent achievements
      const achievementResults = await this.chromaDB.similaritySearch(
        this.collections.developerWork,
        'recent achievements and technical contributions',
        {
          limit: 10,
          filter: { userId },
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      // Get brand evolution history
      const brandResults = await this.chromaDB.similaritySearch(
        this.collections.brandEvolution,
        'brand strategy and positioning',
        {
          limit: 5,
          filter: { userId },
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      // Get content performance
      const contentResults = await this.chromaDB.similaritySearch(
        this.collections.contentPerformance,
        'content engagement and performance',
        {
          limit: 10,
          filter: { userId },
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      // Get technical relationships from Neo4j
      const techResult = await this.neo4j.run(
        `
        MATCH (u:Developer {id: $userId})-[:EXPERIENCED_WITH]->(t:Technology)
        RETURN t.name as technology,
               COUNT{(u)-[:ACHIEVED]->(:Achievement)-[:USES_TECHNOLOGY]->(t)} as experience_level
        ORDER BY experience_level DESC
        LIMIT 10
        `,
        { userId }
      );

      const currentSkills =
        techResult.records?.map((record) =>
          (record as any).get('technology')
        ) || [];

      return {
        userId,
        currentSkills,
        careerGoals: [], // Could be extracted from brand strategies
        recentAchievements: this.parseAchievements(
          this.transformChromaResults(achievementResults)
        ),
        brandEvolution: this.parseBrandStrategies(
          this.transformChromaResults(brandResults)
        ),
        contentHistory: this.parseContentPerformance(
          this.transformChromaResults(contentResults)
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get developer context: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Get personalized content strategy based on performance and brand evolution
   */
  async getPersonalizedContentStrategy(
    userId: string,
    context: string
  ): Promise<any> {
    this.logger.log(`Generating personalized content strategy for ${userId}`);

    try {
      // Semantic search for similar successful content
      const semanticResults = await this.chromaDB.similaritySearch(
        this.collections.contentPerformance,
        context,
        {
          limit: 5,
          filter: { userId },
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      // Get technology relationships and expertise from Neo4j
      const relationshipResult = await this.neo4j.run(
        `
        MATCH (u:Developer {id: $userId})-[:ACHIEVED]->(a:Achievement)-[:USES_TECHNOLOGY]->(tech:Technology)
        RETURN tech.name, COUNT(a) as frequency, AVG(toFloat(a.impact)) as avg_impact
        ORDER BY frequency DESC, avg_impact DESC
        LIMIT 5
        `,
        { userId }
      );

      // Get recent brand positioning
      const brandResult = await this.neo4j.run(
        `
        MATCH (u:Developer {id: $userId})-[:HAS_STRATEGY]->(s:BrandStrategy)
        RETURN s.positioning, s.targetAudience, s.confidenceScore
        ORDER BY s.createdAt DESC
        LIMIT 1
        `,
        { userId }
      );

      return this.combineContentStrategy(
        this.transformChromaResults(semanticResults),
        relationshipResult,
        brandResult
      );
    } catch (error) {
      this.logger.error(
        `Failed to get personalized content strategy: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Get brand voice and style based on content history
   */
  async getBrandVoice(userId: string): Promise<any> {
    this.logger.log(`Analyzing brand voice for user ${userId}`);

    try {
      // Get high-performing content for voice analysis
      const highPerformingContent = await this.chromaDB.similaritySearch(
        this.collections.contentPerformance,
        'successful engaging content',
        {
          limit: 10,
          filter: { userId },
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      // Analyze patterns in successful content
      const voiceAnalysis = this.analyzeBrandVoice(
        this.transformChromaResults(highPerformingContent)
      );

      return voiceAnalysis;
    } catch (error) {
      this.logger.error(
        `Failed to analyze brand voice: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { tone: 'professional', style: 'informative' };
    }
  }

  /**
   * Get brand evolution tracking
   */
  async getBrandEvolution(userId: string): Promise<any> {
    this.logger.log(`Tracking brand evolution for user ${userId}`);

    try {
      const evolutionResult = await this.neo4j.run(
        `
        MATCH (u:Developer {id: $userId})-[:HAS_STRATEGY]->(s:BrandStrategy)
        RETURN s.positioning, s.confidenceScore, s.createdAt
        ORDER BY s.createdAt ASC
        `,
        { userId }
      );

      return {
        trajectory:
          evolutionResult.records?.map((record) => ({
            positioning: (record as any).get('positioning'),
            confidence: (record as any).get('confidenceScore'),
            date: (record as any).get('createdAt'),
          })) || [],
        currentTrend: this.calculateBrandTrend(evolutionResult.records || []),
      };
    } catch (error) {
      this.logger.error(
        `Failed to track brand evolution: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { trajectory: [], currentTrend: 'stable' };
    }
  }

  // Private helper methods

  /**
   * Transform ChromaDB results into the format expected by parse methods
   */
  private transformChromaResults(chromaResults: {
    ids: string[];
    documents: Array<string | null>;
    metadatas: Array<Record<string, unknown> | null>;
    distances: number[];
  }): any[] {
    const results: any[] = [];

    if (chromaResults.ids && Array.isArray(chromaResults.ids)) {
      for (let i = 0; i < chromaResults.ids.length; i++) {
        results.push({
          id: chromaResults.ids[i],
          document: chromaResults.documents?.[i] || '',
          metadata: chromaResults.metadatas?.[i] || {},
          distance: chromaResults.distances?.[i] || 0,
        });
      }
    }

    return results;
  }

  private parseAchievements(results: any[]): CodeAchievement[] {
    return results.map((result) => ({
      id: result.id,
      description: result.metadata.description || 'Achievement',
      technologies: result.metadata.technologies || [],
      impact: result.metadata.impact || 'medium',
      date: result.metadata.date || new Date().toISOString(),
      repository: result.metadata.repository || 'unknown',
      userId: result.metadata.userId,
    }));
  }

  private parseBrandStrategies(results: any[]): BrandStrategy[] {
    return results.map((result) => ({
      id: result.id,
      positioning: result.metadata.positioning || 'Professional developer',
      strengths: [],
      opportunities: [],
      recommendations: [],
      targetAudience: result.metadata.targetAudience || 'Tech professionals',
      confidenceScore: result.metadata.confidenceScore || 0.7,
      createdAt: result.metadata.createdAt || new Date().toISOString(),
    }));
  }

  private parseContentPerformance(results: any[]): ContentPerformance[] {
    return results.map((result) => ({
      id: result.id,
      platform: result.metadata.platform || 'linkedin',
      content: result.document || '',
      engagementScore: result.metadata.engagementScore || 0,
      metrics: {
        views: result.metadata.views,
        likes: result.metadata.likes,
        comments: result.metadata.comments,
        shares: result.metadata.shares,
      },
      createdAt: result.metadata.createdAt || new Date().toISOString(),
      userId: result.metadata.userId,
    }));
  }

  private combineContentStrategy(
    semantic: any[],
    relationshipResult: any,
    brandResult: any
  ): any {
    return {
      recommendedTopics: semantic.slice(0, 3).map((s) => s.metadata?.platform),
      technicalFocus:
        relationshipResult.records
          ?.slice(0, 3)
          .map((r: { get: (arg0: string) => any }) => r.get('tech.name')) || [],
      brandAlignment:
        brandResult.records?.[0]?.get('s.positioning') ||
        'Professional developer',
      confidence: 0.85,
    };
  }

  private analyzeBrandVoice(content: any[]): any {
    // Analyze content patterns for voice characteristics
    const hasPersonalStories = content.some(
      (c) =>
        c.document?.toLowerCase().includes('i') ||
        c.document?.toLowerCase().includes('my')
    );

    const hasTechnicalDepth = content.some(
      (c) =>
        c.document?.toLowerCase().includes('code') ||
        c.document?.toLowerCase().includes('implementation')
    );

    return {
      tone: hasPersonalStories ? 'personal' : 'professional',
      style: hasTechnicalDepth ? 'technical-expert' : 'accessible',
      engagementLevel: content.length > 5 ? 'active' : 'moderate',
      confidenceScore: 0.8,
    };
  }

  private calculateBrandTrend(records: any[]): string {
    if (records.length < 2) return 'stable';

    const latest = records[records.length - 1];
    const previous = records[records.length - 2];

    const latestScore = latest.get('confidenceScore');
    const previousScore = previous.get('confidenceScore');

    if (latestScore > previousScore + 0.1) return 'improving';
    if (latestScore < previousScore - 0.1) return 'declining';
    return 'stable';
  }
}
