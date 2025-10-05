import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  Profiled,
  Retry,
} from '@hive-academy/nestjs-chromadb';
import { BrandStrategyEntity } from '../../entities/chromadb/brand-strategy.entity';

/**
 * BrandStrategyRepository - Analytics-focused repository
 *
 * NOTE: Simple queries (findByUserId, search) use auto-generated repo.
 * This custom repo only contains complex analytics methods.
 */
@Injectable()
export class BrandStrategyRepository extends ChromaDBRepository<BrandStrategyEntity> {
  constructor(chromaDB: ChromaDBService) {
    super(BrandStrategyEntity, 'brand-evolution', chromaDB);
  }

  /**
   * Analyze brand evolution trajectory and predict next evolution
   * Complex analytics with prediction logic
   */
  @Profiled({ slowQueryThreshold: 200 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeBrandEvolution(userId: string): Promise<{
    evolutionTrajectory: 'improving' | 'stable' | 'declining';
    confidenceTrend: number;
    strategicMilestones: BrandStrategyEntity[];
    nextEvolutionPrediction: {
      suggestedFocusAreas: string[];
      confidenceImprovement: number;
      timelineEstimate: string;
    };
  }> {
    const strategies = await this.findAll({
      where: { userId } as any,
      limit: 10,
    });

    if (strategies.length < 2) {
      return {
        evolutionTrajectory: 'stable',
        confidenceTrend: strategies[0]?.metadata.confidenceScore || 0.5,
        strategicMilestones: strategies,
        nextEvolutionPrediction: {
          suggestedFocusAreas: ['Build initial brand foundation'],
          confidenceImprovement: 0.2,
          timelineEstimate: '3 months',
        },
      };
    }

    // Analyze confidence score progression
    const confidenceScores = strategies.map((s) => s.metadata.confidenceScore);
    const recentAvg =
      confidenceScores.slice(0, 3).reduce((sum, score) => sum + score, 0) /
      Math.min(3, confidenceScores.length);
    const earlierAvg =
      confidenceScores.slice(-3).reduce((sum, score) => sum + score, 0) /
      Math.min(3, confidenceScores.length);

    let evolutionTrajectory: 'improving' | 'stable' | 'declining';
    if (recentAvg > earlierAvg + 0.1) evolutionTrajectory = 'improving';
    else if (recentAvg < earlierAvg - 0.1) evolutionTrajectory = 'declining';
    else evolutionTrajectory = 'stable';

    // Identify strategic milestones (significant improvements)
    const strategicMilestones = strategies.filter(
      (strategy) =>
        strategy.metadata.evolution.improvementScore > 0.2 ||
        strategy.metadata.confidenceScore > 0.8
    );

    // Predict next evolution opportunities
    const latestStrategy = strategies[0];
    const suggestedFocusAreas = this.identifyGrowthOpportunities(
      latestStrategy,
      strategies
    );

    return {
      evolutionTrajectory,
      confidenceTrend: recentAvg - earlierAvg,
      strategicMilestones,
      nextEvolutionPrediction: {
        suggestedFocusAreas,
        confidenceImprovement: Math.min(
          0.3,
          1.0 - latestStrategy.metadata.confidenceScore
        ),
        timelineEstimate:
          evolutionTrajectory === 'improving' ? '2 months' : '4 months',
      },
    };
  }

  /**
   * Private helper for analyzeBrandEvolution
   */
  private identifyGrowthOpportunities(
    latestStrategy: BrandStrategyEntity,
    allStrategies: BrandStrategyEntity[]
  ): string[] {
    const focusAreas: string[] = [];

    if (latestStrategy.metadata.confidenceScore < 0.7) {
      focusAreas.push('Strengthen core brand messaging');
    }

    if (latestStrategy.metadata.evolution.marketContext.length < 3) {
      focusAreas.push('Expand market awareness and positioning');
    }

    if (latestStrategy.metadata.metrics.implementationProgress < 0.6) {
      focusAreas.push('Accelerate strategy implementation');
    }

    if (latestStrategy.metadata.metrics.competitorDifferentiation < 0.7) {
      focusAreas.push('Develop unique value proposition');
    }

    return focusAreas.length > 0
      ? focusAreas
      : ['Continue current strategy refinement'];
  }
}
