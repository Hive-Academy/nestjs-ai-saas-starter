import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  NeogmaService,
  Neo4jCrudService,
  Safe,
  Transactional,
  Authorize,
  ValidateInput,
  AuditLog,
  GraphMetricsService,
  GraphPatternService,
  RelationshipBulkOperationsService,
  RateLimit,
} from '@hive-academy/nestjs-neo4j';
import { Developer } from '../../entities/neo4j/developer.entity';

/**
 * Developer Repository
 *
 * For: personal-brand-memory.service.ts (1,271 lines)
 *
 * Extends Neo4jRepository<Developer> for automatic CRUD operations.
 * Provides type-safe operations for developer profile management including
 * analytics tracking, skill development, and personal brand insights.
 *
 * CRUD methods (inherited from Neo4jRepository<Developer>):
 * - findById, findAll, findOne, create, update, delete, count, exists, save
 *
 * 🎯 SPECIALIZED SERVICES AVAILABLE (from @hive-academy/nestjs-neo4j):
 *
 * For complex operations, consider using these instead of custom queries:
 *
 * - **GraphPatternService**: Complex multi-node pattern matching, subgraph extraction
 *   Example: Finding developer skill networks, technology adoption patterns
 *
 * - **GraphTraversalService**: Path finding, neighbor discovery, graph traversal
 *   Example: Finding mentorship chains, collaboration networks
 *
 * - **GraphMetricsService**: Centrality calculations, community detection, analytics
 *   Example: Identifying key influencers, skill communities
 *
 * - **RelationshipCoreRepository**: Relationship CRUD operations
 *   Example: Managing EXPERIENCED_WITH, ACHIEVED, HAS_STRENGTH relationships
 *
 * - **RelationshipBulkOperationsService**: Batch relationship operations
 *   Example: Batch adding technologies, achievements
 *
 * 📖 See: libs/nestjs-neo4j/CLAUDE.md for complete API documentation
 */
@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  private readonly logger = new Logger(DeveloperRepository.name);

  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private readonly graphMetrics: GraphMetricsService,
    private readonly graphPattern: GraphPatternService,
    @Inject('EXPERIENCED_WITH_BULK_SERVICE')
    private readonly experiencedWithBulk: RelationshipBulkOperationsService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  // 💡 TIP: For new complex graph operations, check if specialized services
  // already provide the functionality before writing custom Cypher queries

  // ============================================================================
  // DEVELOPER PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Find developer by email address (unique identifier)
   * Commonly used method from personal-brand-memory.service.ts
   */
  @Safe()
  async findByEmail(email: string): Promise<Developer | null> {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const emailParam = bindParam.add(email.toLowerCase().trim());

      queryBuilder
        .match('(d:Developer)')
        .where(`d.email = $${emailParam}`)
        .return('d');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      return this.mapNodeToDeveloper(result.records[0].get('d').properties);
    } catch (error) {
      throw new Error(`Failed to find developer by email: ${error}`);
    }
  }

  /**
   * Get developer with their technologies and experience levels
   * Core method for personal brand analysis
   * REFACTORED: Using GraphPatternService for multi-hop pattern matching
   */
  @Safe()
  async getDeveloperWithTechnologies(userId: string): Promise<{
    developer: Developer;
    technologies: {
      name: string;
      experienceLevel: number;
      avgImpact: number;
    }[];
  }> {
    try {
      const developer = await this.findById(userId);
      if (!developer) {
        throw new Error(`Developer not found: ${userId}`);
      }

      // Use GraphPatternService for complex Developer → Achievement → Technology pattern
      const pattern = {
        match: [
          '(u:Developer)-[:EXPERIENCED_WITH]->(t:Technology)',
          '(u)-[:ACHIEVED]->(a:Achievement)-[:USES_TECHNOLOGY]->(t)',
        ],
        where: [`u.id = $userId`],
        return: [
          `t.name as technology`,
          `COUNT{(u)-[:ACHIEVED]->(:Achievement)-[:USES_TECHNOLOGY]->(t)} as experienceLevel`,
          `AVG(CASE WHEN a.impact = 'low' THEN 1 WHEN a.impact = 'medium' THEN 2 WHEN a.impact = 'high' THEN 3 WHEN a.impact = 'critical' THEN 4 ELSE 1 END) as avgImpact`,
        ],
        orderBy: ['experienceLevel DESC', 'avgImpact DESC'],
        limit: 15,
      };

      const result = await this.graphPattern.executeCustomPattern(pattern, {
        userId,
      });

      const technologies = result.map((record) => ({
        name: record.technology as string,
        experienceLevel:
          typeof record.experienceLevel === 'object'
            ? (record.experienceLevel as any).low || 0
            : Number(record.experienceLevel) || 0,
        avgImpact: Number(record.avgImpact) || 1,
      }));

      return { developer, technologies };
    } catch (error) {
      throw new Error(`Failed to get developer with technologies: ${error}`);
    }
  }

  /**
   * Update developer analytics data
   * Used for tracking personal brand evolution
   */
  @Authorize({ roles: ['admin', 'user'] })
  @ValidateInput()
  @AuditLog({ enabled: true, logLevel: 'standard', logSuccess: false })
  @Safe()
  async updateDeveloperAnalytics(
    userId: string,
    analytics: Developer['analytics']
  ): Promise<void> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const userIdParam = bindParam.add(userId);
      const analyticsParam = bindParam.add(JSON.stringify(analytics));

      queryBuilder
        .match('(d:Developer)')
        .where(`d.id = $${userIdParam}`)
        .set(`d.analytics = $${analyticsParam}`)
        .set('d.updatedAt = datetime()')
        .return('d.id as id');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(`Failed to update developer analytics: ${error}`);
    }
  }

  /**
   * Get developer with achievements for comprehensive analysis
   * Core method for personal brand insights
   */
  @Safe()
  async getDeveloperWithAchievements(userId: string): Promise<{
    developer: Developer;
    achievements: Array<{
      id: string;
      description: string;
      technologies: string[];
      impact: string;
      date: Date;
      innovationScore: number;
    }>;
  }> {
    try {
      const developer = await this.findById(userId);
      if (!developer) {
        throw new Error(`Developer not found: ${userId}`);
      }

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const userIdParam = bindParam.add(userId);
      const limitParam = bindParam.add(20);

      queryBuilder
        .match('(u:Developer)-[:ACHIEVED]->(a:Achievement)')
        .where(`u.id = $${userIdParam}`)
        .return(
          `
          a.id as id,
          a.description as description,
          a.technologies as technologies,
          a.impact as impact,
          a.date as date,
          a.analysis.innovationScore as innovationScore
        `
        )
        .orderBy('a.date DESC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const achievements = result.records.map((record) => ({
        id: record.get('id'),
        description: record.get('description'),
        technologies: record.get('technologies') || [],
        impact: record.get('impact'),
        date: new Date(record.get('date')),
        innovationScore: Number(record.get('innovationScore')) || 0,
      }));

      return { developer, achievements };
    } catch (error) {
      throw new Error(`Failed to get developer with achievements: ${error}`);
    }
  }

  /**
   * Get developer insights for personal brand analysis
   * Comprehensive analytics method
   *
   * ✅ USES GraphMetricsService: calculateDegreeCentrality() for brandEvolutionScore
   * ✅ USES GraphPatternService: executeCustomPattern() for skill growth, strengths, achievements
   * ✅ REAL CALCULATIONS: impactTrend, collaborationLevel calculated from actual data
   */
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' }) // Rate limit to prevent abuse
  @Safe()
  async getDeveloperInsights(userId: string): Promise<{
    skillGrowth: { technology: string; growth: number }[];
    impactTrend: 'improving' | 'stable' | 'declining';
    brandEvolutionScore: number;
    topStrengths: { name: string; category: string; confidenceLevel: number }[];
    recentAchievements: number;
    collaborationLevel: 'individual' | 'team' | 'cross-team';
  }> {
    try {
      // Use GraphPatternService for skill growth pattern
      const skillPattern = {
        match: [
          '(u:Developer)-[:ACHIEVED]->(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)',
        ],
        where: [
          `u.id = $userId`,
          `duration.between(date(a.date), date()).days <= 365`,
        ],
        return: [
          't.name as technology',
          'COUNT(a) as recentUsage',
          'AVG(a.analysis.innovationScore) as avgInnovation',
        ],
        orderBy: ['recentUsage DESC'],
        limit: 10,
      };

      const skillResult = await this.graphPattern.executeCustomPattern(
        skillPattern,
        { userId }
      );
      const skillGrowth = skillResult.map((r) => ({
        technology: r.technology as string,
        growth: Number(r.avgInnovation) || 0,
      }));

      // Use GraphPatternService for strength patterns
      const strengthPattern = {
        match: ['(u:Developer)-[:HAS_STRENGTH]->(s:Strength)'],
        where: [`u.id = $userId`],
        return: [
          's.name as name',
          's.category as category',
          's.confidenceLevel as confidenceLevel',
        ],
        orderBy: ['s.confidenceLevel DESC'],
        limit: 5,
      };

      const strengthResult = await this.graphPattern.executeCustomPattern(
        strengthPattern,
        { userId }
      );
      const topStrengths = strengthResult.map((r) => ({
        name: r.name as string,
        category: r.category as string,
        confidenceLevel: Number(r.confidenceLevel) || 0,
      }));

      // Use GraphMetricsService for recent achievements count
      const recentPattern = {
        match: ['(u:Developer)-[:ACHIEVED]->(a:Achievement)'],
        where: [
          `u.id = $userId`,
          `duration.between(date(a.date), date()).days <= 90`,
        ],
        return: ['COUNT(a) as recentCount'],
      };

      const recentResult = await this.graphPattern.executeCustomPattern(
        recentPattern,
        { userId }
      );
      const recentAchievements =
        Number(
          typeof recentResult[0]?.recentCount === 'object'
            ? (recentResult[0].recentCount as any).low || 0
            : recentResult[0]?.recentCount
        ) || 0;

      // ✅ REAL IMPLEMENTATION: Calculate impact trend from actual achievement data
      const impactPattern = {
        match: ['(u:Developer)-[:ACHIEVED]->(a:Achievement)'],
        where: [`u.id = $userId`],
        return: [
          'a.date as date',
          'a.impact as impact',
          'a.analysis.collaborationLevel as collaborationLevel',
        ],
        orderBy: ['a.date DESC'],
        limit: 50,
      };

      const impactResult = await this.graphPattern.executeCustomPattern(
        impactPattern,
        { userId }
      );

      // Calculate impact trend by comparing recent vs older achievements
      const impactScoreMap = { low: 1, medium: 2, high: 3, critical: 4 };
      const achievements = impactResult.map((r) => ({
        date: new Date(r.date as string),
        impact: r.impact as string,
        collaborationLevel: r.collaborationLevel as string,
      }));

      let impactTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (achievements.length >= 6) {
        const halfPoint = Math.floor(achievements.length / 2);
        const recentAchievements = achievements.slice(0, halfPoint);
        const olderAchievements = achievements.slice(halfPoint);

        const recentAvg =
          recentAchievements.reduce(
            (sum, a) =>
              sum +
              (impactScoreMap[a.impact as keyof typeof impactScoreMap] || 1),
            0
          ) / recentAchievements.length;

        const olderAvg =
          olderAchievements.reduce(
            (sum, a) =>
              sum +
              (impactScoreMap[a.impact as keyof typeof impactScoreMap] || 1),
            0
          ) / olderAchievements.length;

        if (recentAvg > olderAvg + 0.3) {
          impactTrend = 'improving';
        } else if (recentAvg < olderAvg - 0.3) {
          impactTrend = 'declining';
        }
      }

      // ✅ REAL IMPLEMENTATION: Calculate brand evolution using GraphMetricsService
      // Use degree centrality as a proxy for developer influence/connectivity
      const brandEvolutionScore = await this.calculateBrandInfluence(userId);

      // ✅ REAL IMPLEMENTATION: Calculate collaboration level from actual data
      let collaborationLevel: 'individual' | 'team' | 'cross-team' =
        'individual';
      if (achievements.length > 0) {
        const collabCounts = achievements.reduce((acc, a) => {
          const level = a.collaborationLevel || 'individual';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const total = achievements.length;
        const crossTeamPercent = (collabCounts['cross-team'] || 0) / total;
        const teamPercent = (collabCounts['team'] || 0) / total;

        if (crossTeamPercent > 0.3) {
          collaborationLevel = 'cross-team';
        } else if (teamPercent > 0.4) {
          collaborationLevel = 'team';
        }
      }

      return {
        skillGrowth,
        impactTrend,
        brandEvolutionScore,
        topStrengths,
        recentAchievements,
        collaborationLevel,
      };
    } catch (error) {
      throw new Error(`Failed to get developer insights: ${error}`);
    }
  }

  /**
   * Calculate brand influence score using graph centrality
   * Uses GraphMetricsService to measure developer's connectivity/influence
   * @private
   */
  private async calculateBrandInfluence(userId: string): Promise<number> {
    try {
      // Use degree centrality as a measure of influence
      // (How many connections does this developer have?)
      const centrality = await this.graphMetrics.calculateDegreeCentrality(
        userId,
        {
          relationshipTypes: ['ACHIEVED', 'EXPERIENCED_WITH', 'HAS_STRENGTH'],
          direction: 'BOTH',
        }
      );

      // Normalize to 0-1 range (assuming max ~100 connections for active developers)
      // This is a heuristic - adjust based on your domain
      const normalized = Math.min(centrality / 100, 1);

      // Scale to 0-1 with slight boost for baseline engagement
      return Math.max(0.1, normalized);
    } catch (error) {
      this.logger.warn(
        `Failed to calculate brand influence for ${userId}: ${error}`
      );
      // Fallback to minimal score if calculation fails
      return 0.1;
    }
  }

  /**
   * Find developers by skill or technology
   * Used for team composition and expertise discovery
   *
   * ✅ USES GraphPatternService: Pattern matching for Developer → Technology relationships
   * (GraphTraversalService not appropriate here - this is pattern matching, not traversal)
   */
  @Safe()
  async findDevelopersBySkill(
    technology: string,
    minExperience = 0
  ): Promise<
    {
      developer: Developer;
      experienceLevel: number;
      avgImpact: number;
    }[]
  > {
    try {
      // Use GraphPatternService for complex traversal with experience calculation
      const pattern = {
        match: [
          '(d:Developer)-[:EXPERIENCED_WITH]->(t:Technology)',
          '(d)-[:ACHIEVED]->(a:Achievement)-[:USES_TECHNOLOGY]->(t)',
        ],
        where: [`toLower(t.name) CONTAINS toLower($technology)`],
        with: [
          'd',
          `COUNT{(d)-[:ACHIEVED]->(:Achievement)-[:USES_TECHNOLOGY]->(t)} as experienceLevel`,
          `AVG(CASE WHEN a.impact = 'low' THEN 1 WHEN a.impact = 'medium' THEN 2 WHEN a.impact = 'high' THEN 3 WHEN a.impact = 'critical' THEN 4 ELSE 1 END) as avgImpact`,
        ],
        return: ['d', 'experienceLevel', 'avgImpact'],
        orderBy: ['experienceLevel DESC', 'avgImpact DESC'],
        limit: 20,
      };

      // Add experience filter if minExperience > 0
      if (minExperience > 0) {
        pattern.where.push(`experienceLevel >= ${minExperience}`);
      }

      const result = await this.graphPattern.executeCustomPattern(pattern, {
        technology,
      });

      return result.map((record) => ({
        developer: this.mapNodeToDeveloper(
          (record.d as any).properties || record.d
        ),
        experienceLevel:
          typeof record.experienceLevel === 'object'
            ? (record.experienceLevel as any).low || 0
            : Number(record.experienceLevel) || 0,
        avgImpact: Number(record.avgImpact) || 1,
      }));
    } catch (error) {
      throw new Error(`Failed to find developers by skill: ${error}`);
    }
  }

  /**
   * Get active developers with recent activity
   * Used for team management and engagement tracking
   */
  @Safe()
  async getActiveDevelopers(daysActive = 30): Promise<Developer[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const isActiveParam = bindParam.add(true);
      const daysActiveParam = bindParam.add(daysActive);

      queryBuilder
        .match('(d:Developer)')
        .where(`d.isActive = $${isActiveParam}`)
        .match('(d)-[:ACHIEVED]->(a:Achievement)')
        .with('d, MAX(a.date) as lastActivity')
        .where(
          `lastActivity IS NULL OR duration.between(date(lastActivity), date()).days <= $${daysActiveParam}`
        )
        .return('d')
        .orderBy('d.updatedAt DESC');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) =>
        this.mapNodeToDeveloper(record.get('d').properties)
      );
    } catch (error) {
      throw new Error(`Failed to get active developers: ${error}`);
    }
  }

  /**
   * Create developer with initial relationships
   * Used when onboarding new developers
   */
  @Authorize({ roles: ['admin'] })
  @ValidateInput()
  @AuditLog({ enabled: true, logLevel: 'standard', logSuccess: false })
  @Transactional()
  @Safe()
  async createDeveloperWithProfile(
    developerData: Omit<Developer, 'id' | 'joinedAt' | 'updatedAt'>,
    initialTechnologies: string[] = []
  ): Promise<Developer> {
    try {
      // Create the developer first
      const developerId = this.generateId();
      const developer: Partial<Developer> = {
        ...developerData,
        id: developerId,
        joinedAt: new Date(),
        updatedAt: new Date(),
      };

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(developer.id);
      const emailParam = bindParam.add(developer.email);
      const nameParam = bindParam.add(developer.name);
      const currentSkillsParam = bindParam.add(
        JSON.stringify(developer.currentSkills || [])
      );
      const careerGoalsParam = bindParam.add(
        JSON.stringify(developer.careerGoals || [])
      );
      const analyticsParam = bindParam.add(
        JSON.stringify(developer.analytics || {})
      );
      const isActiveParam = bindParam.add(developer.isActive ?? true);
      const joinedAtParam = bindParam.add(developer.joinedAt!.toISOString());
      const updatedAtParam = bindParam.add(developer.updatedAt!.toISOString());

      queryBuilder
        .create(
          `(d:Developer {
          id: $${idParam},
          email: $${emailParam},
          name: $${nameParam},
          currentSkills: $${currentSkillsParam},
          careerGoals: $${careerGoalsParam},
          analytics: $${analyticsParam},
          isActive: $${isActiveParam},
          joinedAt: datetime($${joinedAtParam}),
          updatedAt: datetime($${updatedAtParam})
        })`
        )
        .return('d');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);

      // Create initial technology relationships
      if (initialTechnologies.length > 0) {
        await this.addTechnologies(developerId, initialTechnologies);
      }

      return developer as Developer;
    } catch (error) {
      throw new Error(`Failed to create developer with profile: ${error}`);
    }
  }

  /**
   * Add technologies to developer profile
   * Helper method for skill management
   * REFACTORED: Using RelationshipBulkOperationsService for batch creation
   */
  @Safe()
  async addTechnologies(
    developerId: string,
    technologies: string[]
  ): Promise<void> {
    if (technologies.length === 0) return;

    try {
      // Use RelationshipBulkOperationsService with node creation for EXPERIENCED_WITH relationships
      const operations = technologies.map((tech) => ({
        sourceId: developerId,
        targetKey: tech,
        type: 'EXPERIENCED_WITH' as const,
        targetLabel: 'Technology',
        targetProperties: { category: 'General' },
        relationshipProperties: { level: 'beginner', addedAt: new Date() },
      }));

      await this.experiencedWithBulk.batchMergeWithNodeCreation(operations, {
        targetLabel: 'Technology',
      });
    } catch (error) {
      throw new Error(`Failed to add technologies to developer: ${error}`);
    }
  }

  /**
   * Create brand strategy relationships in Neo4j
   * Migrated from personal-brand-memory.service.ts (lines 1154-1190)
   */
  @ValidateInput()
  @AuditLog({ enabled: true, logLevel: 'standard', logSuccess: false })
  @Transactional()
  @Safe()
  async createBrandStrategyRelationships(
    userId: string,
    strategy: {
      id: string;
      positioning: string;
      targetAudience: string;
      confidenceScore: number;
      strengths: string[];
      createdAt: string;
      metrics?: {
        implementationProgress?: number;
        marketResonance?: number;
      };
    }
  ): Promise<void> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const userIdParam = bindParam.add(userId);
      const strategyIdParam = bindParam.add(strategy.id);
      const positioningParam = bindParam.add(strategy.positioning);
      const targetAudienceParam = bindParam.add(strategy.targetAudience);
      const confidenceScoreParam = bindParam.add(strategy.confidenceScore);
      const implementationProgressParam = bindParam.add(
        strategy.metrics?.implementationProgress || 0.1
      );
      const marketResonanceParam = bindParam.add(
        strategy.metrics?.marketResonance || 0.6
      );
      const createdAtParam = bindParam.add(strategy.createdAt);
      const strengthsParam = bindParam.add(strategy.strengths);

      queryBuilder
        .merge('(u:Developer {id: $' + userIdParam + '})')
        .create(
          `(s:BrandStrategy {
          id: $${strategyIdParam},
          positioning: $${positioningParam},
          targetAudience: $${targetAudienceParam},
          confidenceScore: $${confidenceScoreParam},
          implementationProgress: $${implementationProgressParam},
          marketResonance: $${marketResonanceParam},
          createdAt: $${createdAtParam}
        })`
        )
        .create('(u)-[:HAS_STRATEGY]->(s)')
        .with('u, s')
        .unwind(`$${strengthsParam} as strength`)
        .merge('(st:Strength {name: strength})')
        .create('(s)-[:LEVERAGES]->(st)')
        .create('(u)-[:POSSESSES]->(st)')
        .return('count(st) as strengthsCreated');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(
        `Failed to create brand strategy relationships: ${error}`
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapNodeToDeveloper(props: any): Developer {
    return {
      id: props.id,
      email: props.email,
      name: props.name,
      currentSkills: props.currentSkills ? JSON.parse(props.currentSkills) : [],
      careerGoals: props.careerGoals ? JSON.parse(props.careerGoals) : [],
      analytics: props.analytics
        ? JSON.parse(props.analytics)
        : {
            achievementTrend: 'stable',
            brandEvolutionScore: 0,
            contentEngagementTrend: 'stable',
            influenceMetrics: { reach: 0, engagement: 0, authority: 0 },
          },
      isActive: props.isActive ?? true,
      joinedAt: new Date(props.joinedAt),
      updatedAt: new Date(props.updatedAt),
    };
  }

  private generateId(): string {
    return `dev_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
