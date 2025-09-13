import { Injectable, Logger } from '@nestjs/common';
import type {
  ShowcaseMetrics,
  ShowcaseSystemStatus,
} from '../types/showcase.types';

/**
 * 📊 SHOWCASE METRICS SERVICE - Advanced Performance Analytics
 *
 * This service demonstrates sophisticated metrics collection, performance monitoring,
 * and analytics capabilities for the showcase platform.
 */
@Injectable()
export class ShowcaseMetricsService {
  private readonly logger = new Logger(ShowcaseMetricsService.name);
  private executionMetrics = new Map<string, any>();
  private systemMetrics!: ShowcaseSystemStatus;

  constructor() {
    this.initializeSystemMetrics();
  }

  /**
   * 🚀 START EXECUTION TRACKING
   */
  async startExecution(params: {
    workflowName: string;
    pattern: string;
    demonstrationMode: string;
  }): Promise<string> {
    const executionId = `${params.workflowName}-${Date.now()}`;

    this.logger.log(
      `📊 Starting metrics collection for execution: ${executionId}`
    );

    const initialMetrics = {
      executionId,
      workflowName: params.workflowName,
      pattern: params.pattern,
      demonstrationMode: params.demonstrationMode,
      startTime: Date.now(),
      status: 'running',

      performance: {
        executionTime: 0,
        agentSwitches: 0,
        toolInvocations: 0,
        memoryAccesses: 0,
        averageResponseTime: 0,
        peakMemoryUsage: 0,
        concurrentAgents: 1,
        successRate: 0,
        errorRate: 0,
        approvalRate: 0,
        tokensStreamed: 0,
        streamingLatency: 0,
        connectionStability: 1.0,
      },

      qualityMetrics: {
        overallScore: 0,
        contentQuality: 0,
        technicalAccuracy: 0,
        completeness: 0,
        usability: 0,
        enterpriseReadiness: 0,
      },

      timestamps: {
        started: new Date().toISOString(),
        checkpoints: [] as string[],
      },
    };

    this.executionMetrics.set(executionId, initialMetrics);
    return executionId;
  }

  /**
   * 🏁 STOP EXECUTION TRACKING
   */
  async stopExecution(
    executionId: string,
    finalMetrics: ShowcaseMetrics
  ): Promise<void> {
    const metrics = this.executionMetrics.get(executionId);

    if (!metrics) {
      this.logger.warn(`⚠️  No metrics found for execution: ${executionId}`);
      return;
    }

    const completedMetrics = {
      ...metrics,
      status: 'completed',
      endTime: Date.now(),
      duration: Date.now() - metrics.startTime,
      performance: finalMetrics,

      finalAnalysis: {
        executionEfficiency: this.calculateExecutionEfficiency(
          metrics,
          finalMetrics
        ),
        performanceScore: this.calculatePerformanceScore(finalMetrics),
        qualityScore: this.calculateQualityScore(finalMetrics),
        scalabilityRating: this.calculateScalabilityRating(
          metrics.pattern,
          finalMetrics.concurrentAgents
        ),
      },

      timestamps: {
        ...metrics.timestamps,
        completed: new Date().toISOString(),
      },
    };

    this.executionMetrics.set(executionId, completedMetrics);
    this.logger.log(
      `✅ Metrics collection completed for execution: ${executionId}`
    );
  }

  /**
   * 📈 GET EXECUTION METRICS
   */
  async getExecutionMetrics(executionId: string): Promise<any | null> {
    return this.executionMetrics.get(executionId) || null;
  }

  /**
   * 📊 GET SYSTEM METRICS
   */
  async getSystemMetrics(): Promise<ShowcaseSystemStatus> {
    // Update real-time metrics
    this.updateSystemMetrics();
    return this.systemMetrics;
  }

  /**
   * 📋 GET ALL EXECUTIONS SUMMARY
   */
  async getAllExecutionsSummary(): Promise<any[]> {
    return Array.from(this.executionMetrics.values()).map((metrics) => ({
      executionId: metrics.executionId,
      workflowName: metrics.workflowName,
      pattern: metrics.pattern,
      demonstrationMode: metrics.demonstrationMode,
      status: metrics.status,
      duration: metrics.duration,
      performanceScore: metrics.finalAnalysis?.performanceScore || 0,
      qualityScore: metrics.finalAnalysis?.qualityScore || 0,
      startedAt: metrics.timestamps.started,
      completedAt: metrics.timestamps.completed,
    }));
  }

  /**
   * 🔍 ADVANCED ANALYTICS
   */
  async getAdvancedAnalytics(): Promise<any> {
    const allMetrics = Array.from(this.executionMetrics.values());

    if (allMetrics.length === 0) {
      return {
        totalExecutions: 0,
        averagePerformance: 0,
        topPatterns: [],
        insights: [
          'No executions yet - run some showcase workflows to see analytics!',
        ],
      };
    }

    const completedMetrics = allMetrics.filter((m) => m.status === 'completed');

    return {
      totalExecutions: allMetrics.length,
      completedExecutions: completedMetrics.length,

      averageMetrics: {
        executionTime: this.calculateAverage(completedMetrics, 'duration'),
        performanceScore: this.calculateAverage(
          completedMetrics,
          (m) => m.finalAnalysis?.performanceScore || 0
        ),
        qualityScore: this.calculateAverage(
          completedMetrics,
          (m) => m.finalAnalysis?.qualityScore || 0
        ),
        scalabilityRating: this.calculateAverage(
          completedMetrics,
          (m) => m.finalAnalysis?.scalabilityRating || 0
        ),
      },

      patternAnalysis: this.analyzePatternPerformance(completedMetrics),

      demonstrationModeAnalysis:
        this.analyzeDemonstrationModes(completedMetrics),

      performanceInsights: this.generatePerformanceInsights(completedMetrics),

      recommendations: this.generateRecommendations(completedMetrics),
    };
  }

  /**
   * Private Helper Methods
   */

  private initializeSystemMetrics(): void {
    this.systemMetrics = {
      status: 'healthy',
      uptime: Date.now(),

      agents: {
        'demo-showcase': 'idle',
        'advanced-showcase': 'idle',
        'specialist-showcase': 'idle',
        'streaming-showcase': 'idle',
        'hitl-showcase': 'idle',
      },

      workflows: {
        'supervisor-showcase': 'idle',
        'swarm-showcase': 'idle',
        'hierarchical-showcase': 'idle',
      },

      services: {
        'coordinator-service': 'healthy',
        'streaming-service': 'healthy',
        'metrics-service': 'healthy',
      },

      memoryUsage: 45.5,
      cpuUsage: 12.3,
      activeConnections: 8,

      currentThroughput: 23.7,
      avgLatency: 156,
      errorRate: 0.2,
    };
  }

  private updateSystemMetrics(): void {
    // Simulate real-time metric updates
    const variance = () => (Math.random() - 0.5) * 10; // ±5 unit variance

    this.systemMetrics.memoryUsage = Math.max(
      20,
      Math.min(90, 45.5 + variance())
    );
    this.systemMetrics.cpuUsage = Math.max(5, Math.min(80, 12.3 + variance()));
    this.systemMetrics.activeConnections = Math.max(
      1,
      Math.min(500, 8 + Math.floor(variance()))
    );
    this.systemMetrics.currentThroughput = Math.max(
      10,
      Math.min(100, 23.7 + variance())
    );
    this.systemMetrics.avgLatency = Math.max(
      50,
      Math.min(1000, 156 + variance() * 10)
    );
    this.systemMetrics.errorRate = Math.max(
      0,
      Math.min(5, 0.2 + Math.random() * 0.5)
    );

    // Update based on active executions
    const runningExecutions = Array.from(this.executionMetrics.values()).filter(
      (m) => m.status === 'running'
    ).length;

    if (runningExecutions > 0) {
      this.systemMetrics.status = 'healthy';
      Object.keys(this.systemMetrics.agents).forEach((agent) => {
        this.systemMetrics.agents[agent] =
          Math.random() > 0.7 ? 'busy' : 'active';
      });
    } else {
      Object.keys(this.systemMetrics.agents).forEach((agent) => {
        this.systemMetrics.agents[agent] = 'idle';
      });
    }
  }

  private calculateExecutionEfficiency(
    metrics: any,
    finalMetrics: ShowcaseMetrics
  ): number {
    const idealTime = 10000; // 10 seconds ideal
    const actualTime = finalMetrics.totalDuration;
    const efficiency = Math.max(0.1, Math.min(1.0, idealTime / actualTime));
    return Math.round(efficiency * 100) / 100;
  }

  private calculatePerformanceScore(metrics: ShowcaseMetrics): number {
    const factors = [
      metrics.successRate * 0.3,
      (1 - metrics.errorRate) * 0.2,
      Math.min(1, 1000 / (metrics.averageResponseTime || 1000)) * 0.2,
      metrics.connectionStability * 0.15,
      Math.min(1, (metrics.tokensStreamed || 100) / 1000) * 0.15,
    ];

    return Math.round(factors.reduce((sum, f) => sum + f, 0) * 100) / 100;
  }

  private calculateQualityScore(metrics: ShowcaseMetrics): number {
    // Quality based on comprehensive metrics
    const baseQuality = 0.85;
    const performanceBonus = (metrics.successRate || 0.8) * 0.1;
    const streamingBonus = Math.min(
      0.05,
      (metrics.tokensStreamed || 100) / 2000
    );

    return (
      Math.round((baseQuality + performanceBonus + streamingBonus) * 100) / 100
    );
  }

  private calculateScalabilityRating(
    pattern: string,
    concurrentAgents: number
  ): number {
    const patternScalability = {
      supervisor: 0.7,
      swarm: 0.9,
      hierarchical: 0.8,
      pipeline: 0.6,
      parallel: 0.95,
    };

    const baseRating =
      patternScalability[pattern as keyof typeof patternScalability] || 0.7;
    const agentPenalty = Math.max(0, (concurrentAgents - 3) * 0.05);

    return Math.round(Math.max(0.1, baseRating - agentPenalty) * 100) / 100;
  }

  private calculateAverage(
    metrics: any[],
    accessor: string | ((item: any) => number)
  ): number {
    if (metrics.length === 0) return 0;

    const values = metrics
      .map((m) => (typeof accessor === 'string' ? m[accessor] : accessor(m)))
      .filter((v) => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return 0;

    return (
      Math.round(
        (values.reduce((sum, v) => sum + v, 0) / values.length) * 100
      ) / 100
    );
  }

  private analyzePatternPerformance(metrics: any[]): any {
    const patternGroups = metrics.reduce((groups, m) => {
      if (!groups[m.pattern]) groups[m.pattern] = [];
      groups[m.pattern].push(m);
      return groups;
    }, {} as Record<string, any[]>);

    return Object.entries(patternGroups).map(([pattern, patternMetrics]) => ({
      pattern,
      executionCount: (patternMetrics as any[]).length,
      averagePerformance: this.calculateAverage(
        patternMetrics as any[],
        (m: any) => m.finalAnalysis?.performanceScore || 0
      ),
      averageQuality: this.calculateAverage(
        patternMetrics as any[],
        (m: any) => m.finalAnalysis?.qualityScore || 0
      ),
      averageDuration: this.calculateAverage(
        patternMetrics as any[],
        'duration'
      ),
      recommendation: this.getPatternRecommendation(
        pattern,
        (patternMetrics as any[]).length
      ),
    }));
  }

  private analyzeDemonstrationModes(metrics: any[]): any {
    const modeGroups = metrics.reduce((groups, m) => {
      if (!groups[m.demonstrationMode]) groups[m.demonstrationMode] = [];
      groups[m.demonstrationMode].push(m);
      return groups;
    }, {} as Record<string, any[]>);

    return Object.entries(modeGroups).map(([mode, modeMetrics]) => ({
      mode,
      executionCount: (modeMetrics as any[]).length,
      averagePerformance: this.calculateAverage(
        modeMetrics as any[],
        (m: any) => m.finalAnalysis?.performanceScore || 0
      ),
      preferredPatterns: this.getPreferredPatterns(modeMetrics as any[]),
    }));
  }

  private generatePerformanceInsights(metrics: any[]): string[] {
    const insights = [];

    if (metrics.length === 0) {
      return ['No completed executions to analyze'];
    }

    const avgPerformance = this.calculateAverage(
      metrics,
      (m) => m.finalAnalysis?.performanceScore || 0
    );
    const avgQuality = this.calculateAverage(
      metrics,
      (m) => m.finalAnalysis?.qualityScore || 0
    );

    if (avgPerformance > 0.8) {
      insights.push(
        `🚀 Excellent average performance score: ${avgPerformance}`
      );
    } else if (avgPerformance > 0.6) {
      insights.push(
        `📈 Good performance with room for optimization: ${avgPerformance}`
      );
    } else {
      insights.push(`⚠️ Performance needs attention: ${avgPerformance}`);
    }

    if (avgQuality > 0.9) {
      insights.push(`🏆 Outstanding quality scores across executions`);
    }

    const patterns = [...new Set(metrics.map((m) => m.pattern))];
    if (patterns.length > 1) {
      insights.push(
        `🎯 ${patterns.length} different patterns tested - great coverage!`
      );
    }

    return insights;
  }

  private generateRecommendations(metrics: any[]): string[] {
    const recommendations = [];

    if (metrics.length < 5) {
      recommendations.push(
        'Run more showcase executions to get better analytics insights'
      );
    }

    const patternCounts = metrics.reduce((counts, m) => {
      counts[m.pattern] = (counts[m.pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostUsedPattern = Object.entries(patternCounts).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]?.[0];

    if (mostUsedPattern === 'supervisor') {
      recommendations.push(
        'Try swarm or hierarchical patterns for different coordination approaches'
      );
    } else if (mostUsedPattern === 'swarm') {
      recommendations.push(
        'Explore supervisor pattern for simpler hierarchical coordination'
      );
    }

    const avgDuration = this.calculateAverage(metrics, 'duration');
    if (avgDuration > 30000) {
      recommendations.push(
        'Consider optimizing workflow steps to reduce execution time'
      );
    }

    recommendations.push(
      'Explore different demonstration modes (basic, advanced, enterprise) for comprehensive testing'
    );

    return recommendations;
  }

  private getPatternRecommendation(pattern: string, count: number): string {
    if (count === 1) {
      return 'Consider running multiple executions for better pattern analysis';
    }

    const recommendations = {
      supervisor: 'Great for hierarchical workflows with clear delegation',
      swarm: 'Excellent for distributed problem-solving scenarios',
      hierarchical: 'Perfect for complex multi-level coordination',
      pipeline: 'Ideal for sequential data processing workflows',
    };

    return (
      recommendations[pattern as keyof typeof recommendations] ||
      'Solid choice for general coordination'
    );
  }

  private getPreferredPatterns(modeMetrics: any[]): string[] {
    const patternCounts = modeMetrics.reduce((counts, m) => {
      counts[m.pattern] = (counts[m.pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(patternCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 2)
      .map(([pattern]) => pattern);
  }
}
