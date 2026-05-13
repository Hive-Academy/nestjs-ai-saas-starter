import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  Profiled,
  Retry,
  Cached,
} from '@hive-academy/nestjs-chromadb';
import { TechTrendEntity } from '../../entities/chromadb/tech-trend.entity';

/**
 * TrendAnalysis - Comprehensive technology trend analysis results
 */
export interface TrendAnalysis {
  trending: TechTrendEntity[]; // growthRate > 20
  emerging: TechTrendEntity[]; // demandScore > 80 && popularity < 50
  declining: TechTrendEntity[]; // growthRate < -10
  recommendations: string[]; // Top 5 technologies to learn
}

/**
 * TechTrendsRepository - Analytics-focused repository for technology trends
 *
 * Purpose: Analyze technology market trends and generate learning recommendations
 * Use Cases:
 * - Identify trending technologies for content focus
 * - Discover emerging technologies before they peak
 * - Analyze technology growth trajectories
 * - Generate personalized learning recommendations
 * - Track market demand for specific technologies
 */
@Injectable()
export class TechTrendsRepository extends ChromaDBRepository<TechTrendEntity> {
  constructor(
    chromaDB: ChromaDBService,
    collectionRegistry: CollectionRegistryService
  ) {
    super(TechTrendEntity, 'tech-trends', chromaDB, collectionRegistry);
  }

  /**
   * Analyze emerging technologies and generate recommendations
   *
   * @param technologies - Technologies to analyze (empty array = analyze all)
   * @returns Comprehensive trend analysis with recommendations
   */
  @Cached({
    ttl: 3600000, // 1 hour (tech trends change slowly)
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 200 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeEmergingTechnologies(
    technologies: string[]
  ): Promise<TrendAnalysis> {
    // 1. Get all tech trends (or filtered by technologies array)
    const allTrends = await this.findAll({ limit: 1000 });

    // 2. Filter to requested technologies if specified
    const relevantTrends =
      technologies.length > 0
        ? allTrends.filter((trend) =>
            technologies.some(
              (tech) =>
                trend.metadata.technology.toLowerCase() === tech.toLowerCase()
            )
          )
        : allTrends;

    // 3. Classify technologies by trend patterns
    const trending = relevantTrends.filter(
      (trend) => trend.metadata.growthRate > 20
    );

    const emerging = relevantTrends.filter(
      (trend) =>
        trend.metadata.demandScore > 80 && trend.metadata.popularity < 50
    );

    const declining = relevantTrends.filter(
      (trend) => trend.metadata.growthRate < -10
    );

    // 4. Generate learning recommendations
    const recommendations = this.generateRecommendations(
      trending,
      emerging,
      relevantTrends
    );

    return {
      trending: trending.sort(
        (a, b) => b.metadata.growthRate - a.metadata.growthRate
      ),
      emerging: emerging.sort(
        (a, b) => b.metadata.demandScore - a.metadata.demandScore
      ),
      declining: declining.sort(
        (a, b) => a.metadata.growthRate - b.metadata.growthRate
      ),
      recommendations,
    };
  }

  /**
   * Find technologies by minimum popularity score
   *
   * @param minScore - Minimum popularity score (0-100)
   * @returns Array of popular technologies
   */
  @Profiled({ slowQueryThreshold: 100 })
  async findByPopularity(minScore = 70): Promise<TechTrendEntity[]> {
    const allTrends = await this.findAll({ limit: 1000 });

    return allTrends
      .filter((trend) => trend.metadata.popularity >= minScore)
      .sort((a, b) => b.metadata.popularity - a.metadata.popularity);
  }

  /**
   * Find technologies by category
   *
   * @param category - Technology category (frontend, backend, devops, ai, database)
   * @returns Array of technologies in the category
   */
  @Profiled({ slowQueryThreshold: 100 })
  async findByCategory(category: string): Promise<TechTrendEntity[]> {
    // Use semantic search for fuzzy category matching
    const categoryQuery = `${category} technologies and tools`;
    const results = await this.search(categoryQuery, { limit: 100 });

    // Filter by exact category match in metadata
    return results.filter(
      (trend) =>
        trend.metadata.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Find technologies with strong growth rates
   *
   * @param minGrowthRate - Minimum growth rate percentage (default 20%)
   * @returns Array of growing technologies
   */
  @Profiled({ slowQueryThreshold: 100 })
  async findGrowingTechnologies(
    minGrowthRate = 20
  ): Promise<TechTrendEntity[]> {
    const allTrends = await this.findAll({ limit: 1000 });

    return allTrends
      .filter((trend) => trend.metadata.growthRate >= minGrowthRate)
      .sort((a, b) => b.metadata.growthRate - a.metadata.growthRate);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate technology learning recommendations based on trends
   */
  private generateRecommendations(
    trending: TechTrendEntity[],
    emerging: TechTrendEntity[],
    allTrends: TechTrendEntity[]
  ): string[] {
    const recommendations: string[] = [];

    // 1. Recommend top 2 trending technologies with high demand
    const trendingWithDemand = trending
      .filter((t) => t.metadata.demandScore > 70)
      .slice(0, 2);

    trendingWithDemand.forEach((tech) => {
      recommendations.push(
        `${tech.metadata.technology} - High growth (${
          tech.metadata.growthRate
        }%) with strong demand (${
          tech.metadata.demandScore
        }/100). Related skills: ${tech.metadata.relatedSkills
          .slice(0, 3)
          .join(', ')}`
      );
    });

    // 2. Recommend top 2 emerging technologies (early adopter advantage)
    const topEmerging = emerging.slice(0, 2);
    topEmerging.forEach((tech) => {
      recommendations.push(
        `${tech.metadata.technology} - Emerging technology with high demand (${
          tech.metadata.demandScore
        }/100). Early adoption advantage in ${tech.metadata.industryAdoption
          .slice(0, 2)
          .join(', ')}`
      );
    });

    // 3. Recommend complementary skills from related technologies
    if (recommendations.length < 5) {
      const relatedSkillsMap = new Map<string, number>();

      allTrends.forEach((trend) => {
        trend.metadata.relatedSkills.forEach((skill) => {
          relatedSkillsMap.set(
            skill,
            (relatedSkillsMap.get(skill) || 0) + trend.metadata.popularity
          );
        });
      });

      const topRelatedSkills = Array.from(relatedSkillsMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5 - recommendations.length)
        .map(([skill]) => skill);

      topRelatedSkills.forEach((skill) => {
        recommendations.push(
          `${skill} - Frequently paired with high-demand technologies. Enhances technology stack versatility`
        );
      });
    }

    return recommendations.slice(0, 5);
  }
}
