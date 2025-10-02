import { Injectable } from '@nestjs/common';
import {
  Repository,
  InjectNeogma,
  NeogmaService,
  Safe,
  BaseRepositoryService,
} from '@hive-academy/nestjs-neo4j';
import { Achievement } from '../../entities/neo4j/achievement.entity';

/**
 * Achievement Repository
 *
 * For: personal-brand-memory.service.ts (1,271 lines)
 *
 * Provides type-safe operations for achievement tracking including
 * innovation analysis, technology usage patterns, and personal brand insights
 * using modern @Repository pattern.
 */
@Repository(() => Achievement)
@Injectable()
export class AchievementRepository extends BaseRepositoryService<Achievement> {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {
    super();
  }

  // ============================================================================
  // AUTO-GENERATED CRUD METHODS (from @Repository decorator)
  // ============================================================================
  // - findById(id: string): Promise<Achievement | null>
  // - findAll(options?: FindOptions<Achievement>): Promise<Achievement[]>
  // - create(data: Partial<Achievement>): Promise<Achievement>
  // - update(id: string, updates: Partial<Achievement>): Promise<Achievement | null>
  // - delete(id: string): Promise<boolean>
  // - count(where?: Partial<Achievement>): Promise<number>
  // - exists(id: string): Promise<boolean>

  // ============================================================================
  // ACHIEVEMENT MANAGEMENT
  // ============================================================================

  /**
   * Create achievement with technology relationships
   * Core method for recording developer accomplishments
   */
  @Safe()
  async createAchievementWithRelationships(
    achievement: Omit<Achievement, 'id' | 'createdAt'>
  ): Promise<Achievement> {
    try {
      // Generate achievement ID
      const achievementId = this.generateId();
      const achievementData: Partial<Achievement> = {
        ...achievement,
        id: achievementId,
        createdAt: new Date(),
      };

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      // Add parameters using BindParam
      const idParam = bindParam.add(achievementData.id);
      const userIdParam = bindParam.add(achievementData.userId);
      const descriptionParam = bindParam.add(achievementData.description);
      const technologiesParam = bindParam.add(
        JSON.stringify(achievementData.technologies || [])
      );
      const impactParam = bindParam.add(achievementData.impact);
      const dateParam = bindParam.add(achievementData.date!.toISOString());
      const repositoryParam = bindParam.add(achievementData.repository || '');
      const metricsParam = bindParam.add(
        JSON.stringify(achievementData.metrics || {})
      );
      const analysisParam = bindParam.add(
        JSON.stringify(achievementData.analysis || {})
      );
      const createdAtParam = bindParam.add(
        achievementData.createdAt!.toISOString()
      );

      // Create achievement node
      queryBuilder
        .create(
          `(a:Achievement {
          id: $${idParam},
          userId: $${userIdParam},
          description: $${descriptionParam},
          technologies: $${technologiesParam},
          impact: $${impactParam},
          date: date($${dateParam}),
          repository: $${repositoryParam},
          metrics: $${metricsParam},
          analysis: $${analysisParam},
          createdAt: datetime($${createdAtParam})
        })`
        )
        .return('a');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);

      // Create technology relationships
      await this.createTechnologyRelationships(achievementData as Achievement);

      return achievementData as Achievement;
    } catch (error) {
      throw new Error(
        `Failed to create achievement with relationships: ${error}`
      );
    }
  }

  /**
   * Get achievements by user with advanced filtering
   * Core method for personal brand analysis
   */
  @Safe()
  async getAchievementsByUser(
    userId: string,
    options?: {
      limit?: number;
      minImpact?: Achievement['impact'];
      technologies?: string[];
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<Achievement[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const userIdParam = bindParam.add(userId);

      queryBuilder.match('(a:Achievement)').where(`a.userId = $${userIdParam}`);

      // Add impact filter
      if (options?.minImpact) {
        const impactOrder = ['low', 'medium', 'high', 'critical'];
        const minIndex = impactOrder.indexOf(options.minImpact);
        const validImpacts = impactOrder.slice(minIndex);
        const validImpactsParam = bindParam.add(validImpacts);
        queryBuilder.where(
          `a.userId = $${userIdParam} AND a.impact IN $${validImpactsParam}`
        );
      }

      // Add date range filter
      if (options?.dateRange) {
        const startDateParam = bindParam.add(
          options.dateRange.start.toISOString()
        );
        const endDateParam = bindParam.add(options.dateRange.end.toISOString());
        if (options?.minImpact) {
          // If we already have impact filter, add to existing where
          const impactOrder = ['low', 'medium', 'high', 'critical'];
          const minIndex = impactOrder.indexOf(options.minImpact);
          const validImpacts = impactOrder.slice(minIndex);
          const validImpactsParam = bindParam.add(validImpacts);
          queryBuilder.where(
            `a.userId = $${userIdParam} AND a.impact IN $${validImpactsParam} AND a.date >= date($${startDateParam}) AND a.date <= date($${endDateParam})`
          );
        } else {
          queryBuilder.where(
            `a.userId = $${userIdParam} AND a.date >= date($${startDateParam}) AND a.date <= date($${endDateParam})`
          );
        }
      }

      const limitParam = bindParam.add(options?.limit || 10);

      queryBuilder.return('a').orderBy('a.date DESC').limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      let achievements = result.records.map((record) =>
        this.mapNodeToAchievement(record.get('a').properties)
      );

      // Filter by technologies if specified (done in application layer for complex JSON filtering)
      if (options?.technologies?.length) {
        achievements = achievements.filter((achievement) =>
          achievement.technologies.some((tech) =>
            options.technologies!.some((filterTech) =>
              tech.toLowerCase().includes(filterTech.toLowerCase())
            )
          )
        );
      }

      return achievements;
    } catch (error) {
      throw new Error(`Failed to get achievements by user: ${error}`);
    }
  }

  /**
   * Find achievements by technology
   * Used for technology trend analysis
   */
  @Safe()
  async findByTechnology(
    technology: string,
    limit = 20
  ): Promise<Achievement[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const technologyParam = bindParam.add(technology);
      const limitParam = bindParam.add(limit);

      queryBuilder
        .match('(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)')
        .where(`toLower(t.name) CONTAINS toLower($${technologyParam})`)
        .return('a')
        .orderBy('a.date DESC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) =>
        this.mapNodeToAchievement(record.get('a').properties)
      );
    } catch (error) {
      throw new Error(`Failed to find achievements by technology: ${error}`);
    }
  }

  /**
   * Analyze innovation patterns for a user
   * Core method for personal brand insights
   */
  @Safe()
  async analyzeInnovationPatterns(userId: string): Promise<{
    innovationTrend: 'increasing' | 'stable' | 'decreasing';
    averageInnovationScore: number;
    topInnovativeAchievements: Achievement[];
    recommendedFocusAreas: string[];
    impactDistribution: Record<string, number>;
    collaborationLevel: 'individual' | 'team' | 'cross-team';
  }> {
    try {
      const achievements = await this.getAchievementsByUser(userId, {
        limit: 50,
      });

      if (achievements.length === 0) {
        return {
          innovationTrend: 'stable',
          averageInnovationScore: 0,
          topInnovativeAchievements: [],
          recommendedFocusAreas: [],
          impactDistribution: {},
          collaborationLevel: 'individual',
        };
      }

      const innovationScores = achievements.map(
        (a) => a.analysis.innovationScore
      );
      const averageInnovationScore =
        innovationScores.reduce((sum, score) => sum + score, 0) /
        innovationScores.length;

      // Calculate trend (compare recent vs earlier achievements)
      const recentScores = achievements
        .slice(0, Math.min(10, Math.floor(achievements.length / 2)))
        .map((a) => a.analysis.innovationScore);
      const earlierScores = achievements
        .slice(-Math.min(10, Math.floor(achievements.length / 2)))
        .map((a) => a.analysis.innovationScore);

      const recentAvg =
        recentScores.reduce((sum, score) => sum + score, 0) /
        recentScores.length;
      const earlierAvg =
        earlierScores.reduce((sum, score) => sum + score, 0) /
        earlierScores.length;

      let innovationTrend: 'increasing' | 'stable' | 'decreasing';
      if (recentAvg > earlierAvg + 0.1) innovationTrend = 'increasing';
      else if (recentAvg < earlierAvg - 0.1) innovationTrend = 'decreasing';
      else innovationTrend = 'stable';

      // Top innovative achievements
      const topInnovativeAchievements = achievements
        .sort((a, b) => b.analysis.innovationScore - a.analysis.innovationScore)
        .slice(0, 5);

      // Technology frequency analysis
      const technologyFrequency = new Map<string, number>();
      achievements.forEach((achievement) => {
        achievement.technologies.forEach((tech) => {
          technologyFrequency.set(
            tech,
            (technologyFrequency.get(tech) || 0) + 1
          );
        });
      });

      const recommendedFocusAreas = Array.from(technologyFrequency.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tech]) => tech);

      // Impact distribution
      const impactDistribution: Record<string, number> = {};
      achievements.forEach((achievement) => {
        impactDistribution[achievement.impact] =
          (impactDistribution[achievement.impact] || 0) + 1;
      });

      // Collaboration level analysis
      const collaborationLevels = achievements.map(
        (a) => a.analysis.collaborationLevel
      );
      const crossTeamCount = collaborationLevels.filter(
        (level) => level === 'cross-team'
      ).length;
      const teamCount = collaborationLevels.filter(
        (level) => level === 'team'
      ).length;

      let collaborationLevel: 'individual' | 'team' | 'cross-team';
      if (crossTeamCount > achievements.length * 0.3)
        collaborationLevel = 'cross-team';
      else if (teamCount > achievements.length * 0.5)
        collaborationLevel = 'team';
      else collaborationLevel = 'individual';

      return {
        innovationTrend,
        averageInnovationScore,
        topInnovativeAchievements,
        recommendedFocusAreas,
        impactDistribution,
        collaborationLevel,
      };
    } catch (error) {
      throw new Error(`Failed to analyze innovation patterns: ${error}`);
    }
  }

  /**
   * Get technology usage statistics across achievements
   * Used for technology trend analysis and recommendations
   */
  @Safe()
  async getTechnologyStats(userId?: string): Promise<{
    topTechnologies: { name: string; usage: number; avgImpact: number }[];
    emergingTechnologies: {
      name: string;
      recentUsage: number;
      growth: number;
    }[];
    technologyDistribution: Record<string, number>;
  }> {
    try {
      const topBuilder = this.neogma.createQueryBuilder();
      const topBindParam = topBuilder.getBindParam();

      topBuilder.match('(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)');

      if (userId) {
        const userIdParam = topBindParam.add(userId);
        topBuilder.where(`a.userId = $${userIdParam}`);
      }

      const limitParam = topBindParam.add(20);

      // Get top technologies by usage and impact
      topBuilder
        .return(
          `
          t.name as technology,
          COUNT(a) as usage,
          AVG(CASE WHEN a.impact = 'low' THEN 1
                  WHEN a.impact = 'medium' THEN 2
                  WHEN a.impact = 'high' THEN 3
                  WHEN a.impact = 'critical' THEN 4
                  ELSE 1 END) as avgImpact
        `
        )
        .orderBy('usage DESC, avgImpact DESC')
        .limit(`$${limitParam}`);

      const topCypher = topBuilder.getStatement();
      const topParams = topBindParam.get();
      const topResult = await this.neogma.run(topCypher, topParams);
      const topTechnologies = topResult.records.map((record) => ({
        name: record.get('technology'),
        usage: Number(record.get('usage')) || 0,
        avgImpact: Number(record.get('avgImpact')) || 1,
      }));

      // Get emerging technologies (last 6 months)
      const emergingBuilder = this.neogma.createQueryBuilder();
      const emergingBindParam = emergingBuilder.getBindParam();

      const monthsParam = emergingBindParam.add(6);
      const emergingLimitParam = emergingBindParam.add(10);

      emergingBuilder
        .match('(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)')
        .where(`a.date >= date() - duration({months: $${monthsParam}})`)
        .return(
          `
          t.name as technology,
          COUNT(a) as recentUsage
        `
        )
        .orderBy('recentUsage DESC')
        .limit(`$${emergingLimitParam}`);

      const emergingCypher = emergingBuilder.getStatement();
      const emergingParams = emergingBindParam.get();
      const emergingResult = await this.neogma.run(
        emergingCypher,
        emergingParams
      );
      const emergingTechnologies = emergingResult.records.map((record) => ({
        name: record.get('technology'),
        recentUsage: Number(record.get('recentUsage')) || 0,
        growth: 1.0, // Would need historical comparison for actual growth calculation
      }));

      // Technology distribution
      const technologyDistribution: Record<string, number> = {};
      topTechnologies.forEach((tech) => {
        technologyDistribution[tech.name] = tech.usage;
      });

      return {
        topTechnologies,
        emergingTechnologies,
        technologyDistribution,
      };
    } catch (error) {
      throw new Error(`Failed to get technology stats: ${error}`);
    }
  }

  /**
   * Get high-impact achievements across the platform
   * Used for inspiration and best practice identification
   */
  @Safe()
  async getHighImpactAchievements(
    impact: 'high' | 'critical' = 'high',
    limit = 20
  ): Promise<Achievement[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const impactLevelsParam = bindParam.add(
        impact === 'critical' ? ['critical'] : ['high', 'critical']
      );
      const limitParam = bindParam.add(limit);

      queryBuilder
        .match('(a:Achievement)')
        .where(`a.impact IN $${impactLevelsParam}`)
        .return('a')
        .orderBy('a.date DESC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) =>
        this.mapNodeToAchievement(record.get('a').properties)
      );
    } catch (error) {
      throw new Error(`Failed to get high impact achievements: ${error}`);
    }
  }

  /**
   * Get recent achievements for activity feed
   * Used for dashboard and activity tracking
   */
  @Safe()
  async getRecentAchievements(days = 30, limit = 50): Promise<Achievement[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const daysParam = bindParam.add(days);
      const limitParam = bindParam.add(limit);

      queryBuilder
        .match('(a:Achievement)')
        .where(`a.date >= date() - duration({days: $${daysParam}})`)
        .return('a')
        .orderBy('a.date DESC, a.createdAt DESC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) =>
        this.mapNodeToAchievement(record.get('a').properties)
      );
    } catch (error) {
      throw new Error(`Failed to get recent achievements: ${error}`);
    }
  }

  /**
   * Create enhanced achievement with developer relationship
   * Migrated from personal-brand-memory.service.ts (lines 1113-1152)
   * Creates achievement + Developer ACHIEVED relationship + technology relationships
   */
  @Safe()
  async createEnhancedAchievementWithDeveloper(
    userId: string,
    achievementData: {
      id: string;
      description: string;
      technologies: string[];
      impact: string;
      date: string;
      repository: string;
      innovationScore?: number;
      collaborationLevel?: string;
      technicalDepth?: string;
    }
  ): Promise<void> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const userIdParam = bindParam.add(userId);
      const achievementIdParam = bindParam.add(achievementData.id);
      const descriptionParam = bindParam.add(achievementData.description);
      const impactParam = bindParam.add(achievementData.impact);
      const innovationScoreParam = bindParam.add(
        achievementData.innovationScore || 0.7
      );
      const collaborationLevelParam = bindParam.add(
        achievementData.collaborationLevel || 'individual'
      );
      const technicalDepthParam = bindParam.add(
        achievementData.technicalDepth || 'intermediate'
      );
      const dateParam = bindParam.add(achievementData.date);
      const repositoryParam = bindParam.add(achievementData.repository);
      const technologiesParam = bindParam.add(achievementData.technologies);

      queryBuilder
        .merge('(u:Developer {id: $' + userIdParam + '})')
        .create(
          `(a:Achievement {
          id: $${achievementIdParam},
          description: $${descriptionParam},
          impact: $${impactParam},
          innovationScore: $${innovationScoreParam},
          collaborationLevel: $${collaborationLevelParam},
          technicalDepth: $${technicalDepthParam},
          date: $${dateParam},
          repository: $${repositoryParam}
        })`
        )
        .create('(u)-[:ACHIEVED]->(a)')
        .with('u, a')
        .unwind(`$${technologiesParam} as tech`)
        .merge('(t:Technology {name: tech})')
        .create(
          `(a)-[:USES_TECHNOLOGY {proficiency: $${technicalDepthParam}}]->(t)`
        )
        .merge(
          `(u)-[:EXPERIENCED_WITH {level: $${collaborationLevelParam}}]->(t)`
        )
        .return('count(t) as technologiesLinked');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(
        `Failed to create enhanced achievement with developer: ${error}`
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Create technology relationships for an achievement
   * Migrated from personal-brand-memory.service.ts logic
   */
  private async createTechnologyRelationships(
    achievement: Achievement
  ): Promise<void> {
    if (!achievement.technologies.length) return;

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const achievementIdParam = bindParam.add(achievement.id);
      const userIdParam = bindParam.add(achievement.userId);
      const technologiesParam = bindParam.add(achievement.technologies);
      const categoryParam = bindParam.add('General');
      const technicalDepthParam = bindParam.add(
        achievement.analysis.technicalDepth
      );
      const collaborationLevelParam = bindParam.add(
        achievement.analysis.collaborationLevel
      );

      queryBuilder
        .match('(a:Achievement), (u:Developer)')
        .where(`a.id = $${achievementIdParam} AND u.id = $${userIdParam}`)
        .unwind(`$${technologiesParam} AS tech`)
        .merge('(t:Technology {name: tech})')
        .set(
          `t.category = COALESCE(t.category, $${categoryParam}), t.createdAt = COALESCE(t.createdAt, datetime())`
        )
        .create(
          `(a)-[:USES_TECHNOLOGY {proficiency: $${technicalDepthParam}}]->(t)`
        )
        .merge(
          `(u)-[:EXPERIENCED_WITH {level: $${collaborationLevelParam}}]->(t)`
        )
        .return('count(t) as createdCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(`Failed to create technology relationships: ${error}`);
    }
  }

  private mapNodeToAchievement(props: any): Achievement {
    return {
      id: props.id,
      userId: props.userId,
      description: props.description,
      technologies: props.technologies ? JSON.parse(props.technologies) : [],
      impact: props.impact,
      date: new Date(props.date),
      repository: props.repository || '',
      metrics: props.metrics
        ? JSON.parse(props.metrics)
        : {
            linesChanged: 0,
            complexity: 0,
            testCoverage: 0,
            pullRequests: 0,
          },
      analysis: props.analysis
        ? JSON.parse(props.analysis)
        : {
            innovationScore: 0,
            collaborationLevel: 'individual',
            technicalDepth: 'basic',
          },
      createdAt: new Date(props.createdAt),
      developer: null, // Will be populated by relationships if needed
    };
  }

  private generateId(): string {
    return `ach_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
