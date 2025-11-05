import {
  AuditLog,
  GraphPatternService,
  Neo4jCrudService,
  Neo4jRepositoryBase,
  NeogmaService,
  ParameterBindingUtility,
  RateLimit,
  RelationshipBulkOperationsService,
  Safe,
  Transactional,
  ValidateInput,
} from '@hive-academy/nestjs-neo4j';
import { Inject, Injectable } from '@nestjs/common';
import { Achievement } from '../../entities/neo4j/achievement.entity';

/**
 * Achievement Repository
 *
 * For: personal-brand-memory.service.ts (1,271 lines)
 *
 * Extends Neo4jRepository<Achievement> for automatic CRUD operations.
 * Provides type-safe operations for achievement tracking including
 * innovation analysis, technology usage patterns, and personal brand insights.
 *
 * CRUD methods (inherited from Neo4jRepository<Achievement>):
 * - findById, findAll, findOne, create, update, delete, count, exists, save
 *
 * 🎯 SPECIALIZED SERVICES AVAILABLE (from @hive-academy/nestjs-neo4j):
 *
 * For complex operations, consider using these instead of custom queries:
 *
 * - **GraphPatternService**: Complex multi-node pattern matching
 *   Example: Achievement → Technology → Developer networks
 *
 * - **GraphTraversalService**: Path finding and traversal
 *   Example: Technology diffusion paths through achievements
 *
 * - **GraphMetricsService**: Analytics and community detection
 *   Example: Identifying trending technologies, innovation clusters
 *
 * - **RelationshipCoreRepository**: Relationship CRUD
 *   Example: Managing USES_TECHNOLOGY, ACHIEVED relationships
 *
 * - **RelationshipBulkOperationsService**: Batch relationship operations
 *   Example: Batch linking technologies to achievements
 *
 * 📖 See: libs/nestjs-neo4j/CLAUDE.md for complete API documentation
 */
@Injectable()
export class AchievementRepository extends Neo4jRepositoryBase<Achievement> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private readonly graphPattern: GraphPatternService<Achievement>,
    @Inject('USES_TECHNOLOGY_BULK_SERVICE')
    private readonly techBulk: RelationshipBulkOperationsService
  ) {
    super(Achievement, 'Achievement', neogma, crud);
  }

  // 💡 TIP: For new complex graph operations, check if specialized services
  // already provide the functionality before writing custom Cypher queries

  // ============================================================================
  // ACHIEVEMENT MANAGEMENT
  // ============================================================================

  /**
   * Create achievement with technology relationships
   * Core method for recording developer accomplishments
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'standard', enabled: true, logSuccess: false })
  @Transactional()
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

      const baseQuery = `
        CREATE (a:Achievement {
          id: $id,
          userId: $userId,
          description: $description,
          technologies: $technologies,
          impact: $impact,
          date: date($date),
          repository: $repository,
          metrics: $metrics,
          analysis: $analysis,
          createdAt: datetime($createdAt)
        })
        RETURN a
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        id: achievementData.id,
        userId: achievementData.userId,
        description: achievementData.description,
        technologies: JSON.stringify(achievementData.technologies || []),
        impact: achievementData.impact,
        date: achievementData.date!.toISOString(),
        repository: achievementData.repository || '',
        metrics: JSON.stringify(achievementData.metrics || {}),
        analysis: JSON.stringify(achievementData.analysis || {}),
        createdAt: achievementData.createdAt!.toISOString(),
      });

      await this.neogma.run(query, params);

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
      // Build WHERE conditions dynamically
      const whereClauses = ['a.userId = $userId'];
      const queryParams: Record<string, any> = { userId };

      // Add impact filter
      if (options?.minImpact) {
        const impactOrder = ['low', 'medium', 'high', 'critical'];
        const minIndex = impactOrder.indexOf(options.minImpact);
        const validImpacts = impactOrder.slice(minIndex);
        whereClauses.push('a.impact IN $validImpacts');
        queryParams.validImpacts = validImpacts;
      }

      // Add date range filter
      if (options?.dateRange) {
        whereClauses.push('a.date >= date($startDate)');
        whereClauses.push('a.date <= date($endDate)');
        queryParams.startDate = options.dateRange.start.toISOString();
        queryParams.endDate = options.dateRange.end.toISOString();
      }

      queryParams.limit = options?.limit || 10;

      const baseQuery = `
        MATCH (a:Achievement)
        WHERE ${whereClauses.join(' AND ')}
        RETURN a
        ORDER BY a.date DESC
        LIMIT $limit
      `;

      const { query, params } = ParameterBindingUtility.autoBind(
        baseQuery,
        queryParams
      );

      const result = await this.neogma.run(query, params);

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
      const baseQuery = `
        MATCH (a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)
        WHERE toLower(t.name) CONTAINS toLower($technology)
        RETURN a
        ORDER BY a.date DESC
        LIMIT $limit
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        technology,
        limit,
      });

      const result = await this.neogma.run(query, params);

      return result.records.map((record) =>
        this.mapNodeToAchievement(record.get('a').properties)
      );
    } catch (error) {
      throw new Error(`Failed to find achievements by technology: ${error}`);
    }
  }

  /**
   * Analyze innovation patterns for a user
   *
   * ✅ USES GraphPatternService: getTechnologyStats() for technology analysis
   * ✅ REAL CALCULATIONS: All trends and distributions calculated from actual data
   */
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
  @Safe()
  async analyzeInnovationPatterns(userId: string): Promise<{
    innovationTrend: 'increasing' | 'stable' | 'decreasing';
    averageInnovationScore: number;
    topInnovativeAchievements: Achievement[];
    recommendedFocusAreas: string[];
    impactDistribution: Record<string, number>;
    collaborationLevel: 'individual' | 'team' | 'cross-team';
  }> {
    const achievements = await this.getAchievementsByUser(userId, {
      limit: 50,
    });
    if (!achievements.length) {
      return {
        innovationTrend: 'stable',
        averageInnovationScore: 0,
        topInnovativeAchievements: [],
        recommendedFocusAreas: [],
        impactDistribution: {},
        collaborationLevel: 'individual',
      };
    }

    const scores = achievements.map((a) => a.analysis.innovationScore);
    const averageInnovationScore =
      scores.reduce((s, v) => s + v, 0) / scores.length;
    const halfLen = Math.min(10, Math.floor(scores.length / 2));
    const recentAvg =
      scores.slice(0, halfLen).reduce((s, v) => s + v, 0) / halfLen;
    const earlierAvg =
      scores.slice(-halfLen).reduce((s, v) => s + v, 0) / halfLen;
    const innovationTrend =
      recentAvg > earlierAvg + 0.1
        ? 'increasing'
        : recentAvg < earlierAvg - 0.1
        ? 'decreasing'
        : 'stable';

    const topInnovativeAchievements = achievements
      .sort((a, b) => b.analysis.innovationScore - a.analysis.innovationScore)
      .slice(0, 5);
    const techStats = await this.getTechnologyStats(userId);
    const recommendedFocusAreas = techStats.topTechnologies
      .slice(0, 5)
      .map((t) => t.name);
    const impactDistribution: Record<string, number> = {};
    achievements.forEach((a) => {
      impactDistribution[a.impact] = (impactDistribution[a.impact] || 0) + 1;
    });

    const collab = achievements.map((a) => a.analysis.collaborationLevel);
    const crossTeam = collab.filter((l) => l === 'cross-team').length;
    const team = collab.filter((l) => l === 'team').length;
    const collaborationLevel =
      crossTeam > achievements.length * 0.3
        ? 'cross-team'
        : team > achievements.length * 0.5
        ? 'team'
        : 'individual';

    return {
      innovationTrend,
      averageInnovationScore,
      topInnovativeAchievements,
      recommendedFocusAreas,
      impactDistribution,
      collaborationLevel,
    };
  }

  /**
   * Get technology usage statistics across achievements
   *
   * ✅ USES GraphPatternService: executeCustomPattern() for technology analysis
   * ✅ REAL CALCULATIONS: Growth trends calculated from historical vs recent usage
   */
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
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
    const topPattern = await this.graphPattern.executeCustomPattern(
      {
        match: [
          userId
            ? `(a:Achievement {userId: $userId})-[:USES_TECHNOLOGY]->(t:Technology)`
            : `(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)`,
        ],
        return: [
          `t.name as technology`,
          `COUNT(a) as usage`,
          `AVG(CASE WHEN a.impact = 'low' THEN 1 WHEN a.impact = 'medium' THEN 2 WHEN a.impact = 'high' THEN 3 WHEN a.impact = 'critical' THEN 4 ELSE 1 END) as avgImpact`,
        ],
        orderBy: ['usage DESC', 'avgImpact DESC'],
        limit: 20,
      },
      userId ? { userId } : undefined
    );

    // Get recent usage (last 6 months)
    const emergingPattern = await this.graphPattern.executeCustomPattern({
      match: [`(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)`],
      where: [`a.date >= date() - duration({months: 6})`],
      return: [`t.name as technology`, `COUNT(a) as recentUsage`],
      orderBy: ['recentUsage DESC'],
      limit: 10,
    });

    // ✅ REAL IMPLEMENTATION: Calculate growth by comparing historical vs recent usage
    const historicalPattern = await this.graphPattern.executeCustomPattern({
      match: [`(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)`],
      where: [
        `a.date < date() - duration({months: 6})`,
        `a.date >= date() - duration({months: 12})`,
      ],
      return: [`t.name as technology`, `COUNT(a) as historicalUsage`],
    });

    // Build historical lookup map
    const historicalMap = new Map<string, number>();
    historicalPattern.forEach((r) => {
      historicalMap.set(r.technology as string, Number(r.historicalUsage) || 0);
    });

    const topTechnologies = topPattern.map((r) => ({
      name: r.technology as string,
      usage: Number(r.usage) || 0,
      avgImpact: Number(r.avgImpact) || 1,
    }));

    // ✅ Calculate real growth rates
    const emergingTechnologies = emergingPattern.map((r) => {
      const name = r.technology as string;
      const recentUsage = Number(r.recentUsage) || 0;
      const historicalUsage = historicalMap.get(name) || 0;

      // Growth rate: (recent - historical) / historical, defaulting to 1.0 if no history
      let growth = 1.0;
      if (historicalUsage > 0) {
        growth = recentUsage / historicalUsage;
      } else if (recentUsage > 0) {
        // New technology with no historical data = high growth
        growth = 2.0;
      }

      return { name, recentUsage, growth };
    });

    const technologyDistribution: Record<string, number> = {};
    topTechnologies.forEach((t) => {
      technologyDistribution[t.name] = t.usage;
    });

    return { topTechnologies, emergingTechnologies, technologyDistribution };
  }

  /**
   * Create enhanced achievement with developer relationship
   * Migrated from personal-brand-memory.service.ts (lines 1113-1152)
   * Creates achievement + Developer ACHIEVED relationship + technology relationships
   */
  @ValidateInput()
  @AuditLog({ enabled: true, logLevel: 'standard', logSuccess: false })
  @Transactional()
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
      const baseQuery = `
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
        RETURN count(t) as technologiesLinked
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        userId,
        achievementId: achievementData.id,
        description: achievementData.description,
        impact: achievementData.impact,
        innovationScore: achievementData.innovationScore || 0.7,
        collaborationLevel: achievementData.collaborationLevel || 'individual',
        technicalDepth: achievementData.technicalDepth || 'intermediate',
        date: achievementData.date,
        repository: achievementData.repository,
        technologies: achievementData.technologies,
      });

      await this.neogma.run(query, params);
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
   * REFACTORED: Uses RelationshipBulkOperationsService (Phase 3)
   */
  private async createTechnologyRelationships(
    achievement: Achievement
  ): Promise<void> {
    if (!achievement.technologies.length) return;

    try {
      // Use RelationshipBulkOperationsService for batch USES_TECHNOLOGY relationships
      await this.techBulk.batchMergeWithNodeCreation(
        achievement.technologies.map((tech) => ({
          sourceId: achievement.id,
          targetKey: tech,
          type: 'USES_TECHNOLOGY' as const,
          targetLabel: 'Technology',
          targetProperties: { category: 'General' },
          relationshipProperties: {
            proficiency: achievement.analysis.technicalDepth,
          },
        })),
        { targetLabel: 'Technology' }
      );
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
