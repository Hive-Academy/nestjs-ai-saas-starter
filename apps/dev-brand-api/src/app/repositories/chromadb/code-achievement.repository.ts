import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  Profiled,
} from '@hive-academy/nestjs-chromadb';
import { CodeAchievementEntity } from '../../entities/chromadb/code-achievement.entity';

/**
 * CodeAchievementRepository - Analytics-focused repository
 *
 * NOTE: Simple queries (findByUserId, search) use auto-generated repo.
 * This custom repo only contains complex analytics methods.
 */
@Injectable()
export class CodeAchievementRepository extends ChromaDBRepository<CodeAchievementEntity> {
  constructor(
    chromaDB: ChromaDBService,
    collectionRegistry: CollectionRegistryService
  ) {
    super(
      CodeAchievementEntity,
      'dev-achievements',
      chromaDB,
      collectionRegistry
    );
  }

  /**
   * Analyze innovation patterns across user achievements
   * Complex analytics method with trend calculation
   */
  @Profiled({ slowQueryThreshold: 200 })
  async analyzeInnovationPatterns(userId: string): Promise<{
    innovationTrend: 'increasing' | 'stable' | 'decreasing';
    averageInnovationScore: number;
    topInnovativeAchievements: CodeAchievementEntity[];
    recommendedFocusAreas: string[];
  }> {
    const achievements = await this.findAll({
      where: { userId } as any,
      limit: 20,
    });

    const innovationScores = achievements.map(
      (a) => a.metadata.analysis.innovationScore
    );
    const averageInnovationScore =
      innovationScores.reduce((sum, score) => sum + score, 0) /
      innovationScores.length;

    // Calculate trend over time
    const recentScores = achievements
      .slice(0, 5)
      .map((a) => a.metadata.analysis.innovationScore);
    const earlierScores = achievements
      .slice(-5)
      .map((a) => a.metadata.analysis.innovationScore);
    const recentAvg =
      recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const earlierAvg =
      earlierScores.reduce((sum, score) => sum + score, 0) /
      earlierScores.length;

    let innovationTrend: 'increasing' | 'stable' | 'decreasing';
    if (recentAvg > earlierAvg + 0.1) innovationTrend = 'increasing';
    else if (recentAvg < earlierAvg - 0.1) innovationTrend = 'decreasing';
    else innovationTrend = 'stable';

    const topInnovativeAchievements = achievements
      .sort(
        (a, b) =>
          b.metadata.analysis.innovationScore -
          a.metadata.analysis.innovationScore
      )
      .slice(0, 3);

    // Analyze technology patterns for recommendations
    const technologyFrequency = new Map<string, number>();
    achievements.forEach((achievement) => {
      achievement.metadata.technologies.forEach((tech) => {
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
