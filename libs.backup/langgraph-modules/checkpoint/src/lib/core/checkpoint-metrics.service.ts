import { Injectable } from '@nestjs/common';
import {
  ICheckpointMetricsService,
  BaseCheckpointService,
} from '../interfaces/checkpoint-services.interface';

interface OperationMetrics {
  totalTime: number;
  count: number;
  successCount: number;
  errorCount: number;
  lastOperation?: Date;
  minTime?: number;
  maxTime?: number;
}

interface SaverMetrics {
  save: OperationMetrics;
  load: OperationMetrics;
}

/**
 * Metrics collection service for checkpoint operations
 * Tracks performance, success rates, and provides insights
 */
@Injectable()
export class CheckpointMetricsService
  extends BaseCheckpointService
  implements ICheckpointMetricsService
{
  private readonly metrics = new Map<string, SaverMetrics>();
  private readonly operationHistory: Array<{
    timestamp: Date;
    saverName: string;
    operation: 'save' | 'load';
    duration: number;
    success: boolean;
  }> = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    super(CheckpointMetricsService.name);
  }

  /**
   * Record save operation metrics
   */
  recordSaveMetrics(
    saverName: string,
    duration: number,
    success: boolean
  ): void {
    this.ensureSaverMetrics(saverName);
    const metrics = this.metrics.get(saverName)!;

    this.updateOperationMetrics(metrics.save, duration, success);
    this.addToHistory(saverName, 'save', duration, success);

    this.logger.debug(
      `Recorded save metrics for ${saverName}: ${duration}ms (${
        success ? 'success' : 'error'
      })`
    );
  }

  /**
   * Record load operation metrics
   */
  recordLoadMetrics(
    saverName: string,
    duration: number,
    success: boolean
  ): void {
    this.ensureSaverMetrics(saverName);
    const metrics = this.metrics.get(saverName)!;

    this.updateOperationMetrics(metrics.load, duration, success);
    this.addToHistory(saverName, 'load', duration, success);

    this.logger.debug(
      `Recorded load metrics for ${saverName}: ${duration}ms (${
        success ? 'success' : 'error'
      })`
    );
  }

  /**
   * Get metrics for a specific saver
   */
  getMetrics(saverName: string): {
    save: {
      totalTime: number;
      count: number;
      successCount: number;
      errorCount: number;
    };
    load: {
      totalTime: number;
      count: number;
      successCount: number;
      errorCount: number;
    };
  } {
    const metrics = this.metrics.get(saverName);

    if (!metrics) {
      return {
        save: { totalTime: 0, count: 0, successCount: 0, errorCount: 0 },
        load: { totalTime: 0, count: 0, successCount: 0, errorCount: 0 },
      };
    }

    return {
      save: {
        totalTime: metrics.save.totalTime,
        count: metrics.save.count,
        successCount: metrics.save.successCount,
        errorCount: metrics.save.errorCount,
      },
      load: {
        totalTime: metrics.load.totalTime,
        count: metrics.load.count,
        successCount: metrics.load.successCount,
        errorCount: metrics.load.errorCount,
      },
    };
  }

  /**
   * Get aggregated metrics across all savers
   */
  getAggregatedMetrics(): {
    totalOperations: number;
    averageSaveTime: number;
    averageLoadTime: number;
    errorRate: number;
    saverMetrics: Record<string, any>;
  } {
    let totalOperations = 0;
    let totalSaveTime = 0;
    let totalLoadTime = 0;
    let totalSaveCount = 0;
    let totalLoadCount = 0;
    let totalErrors = 0;

    const saverMetrics: Record<string, any> = {};

    for (const [saverName, metrics] of this.metrics) {
      const saveMetrics = metrics.save;
      const loadMetrics = metrics.load;

      totalOperations += saveMetrics.count + loadMetrics.count;
      totalSaveTime += saveMetrics.totalTime;
      totalLoadTime += loadMetrics.totalTime;
      totalSaveCount += saveMetrics.count;
      totalLoadCount += loadMetrics.count;
      totalErrors += saveMetrics.errorCount + loadMetrics.errorCount;

      saverMetrics[saverName] = {
        totalOperations: saveMetrics.count + loadMetrics.count,
        averageSaveTime:
          saveMetrics.count > 0 ? saveMetrics.totalTime / saveMetrics.count : 0,
        averageLoadTime:
          loadMetrics.count > 0 ? loadMetrics.totalTime / loadMetrics.count : 0,
        errorRate: this.calculateErrorRate(
          saveMetrics.count + loadMetrics.count,
          saveMetrics.errorCount + loadMetrics.errorCount
        ),
        lastActivity: this.getLastActivity(saverName),
      };
    }

    return {
      totalOperations,
      averageSaveTime: totalSaveCount > 0 ? totalSaveTime / totalSaveCount : 0,
      averageLoadTime: totalLoadCount > 0 ? totalLoadTime / totalLoadCount : 0,
      errorRate: this.calculateErrorRate(totalOperations, totalErrors),
      saverMetrics,
    };
  }

  /**
   * Reset metrics for a specific saver or all savers
   */
  resetMetrics(saverName?: string): void {
    if (saverName) {
      this.metrics.delete(saverName);
      this.logger.log(`Reset metrics for saver: ${saverName}`);
    } else {
      this.metrics.clear();
      this.operationHistory.splice(0, this.operationHistory.length);
      this.logger.log('Reset all metrics');
    }
  }

  /**
   * Get performance insights and recommendations
   */
  getPerformanceInsights(): {
    slowestSavers: Array<{ name: string; averageTime: number }>;
    errorProneSavers: Array<{ name: string; errorRate: number }>;
    recommendations: string[];
  } {
    const aggregated = this.getAggregatedMetrics();
    const slowestSavers: Array<{ name: string; averageTime: number }> = [];
    const errorProneSavers: Array<{ name: string; errorRate: number }> = [];
    const recommendations: string[] = [];

    // Analyze each saver
    for (const [saverName, metrics] of Object.entries(
      aggregated.saverMetrics
    )) {
      const avgTime = (metrics.averageSaveTime + metrics.averageLoadTime) / 2;
      const { errorRate } = metrics;

      if (avgTime > 1000) {
        // Slower than 1 second average
        slowestSavers.push({ name: saverName, averageTime: avgTime });
      }

      if (errorRate > 0.05) {
        // More than 5% error rate
        errorProneSavers.push({ name: saverName, errorRate });
      }
    }

    // Sort by performance issues
    slowestSavers.sort((a, b) => b.averageTime - a.averageTime);
    errorProneSavers.sort((a, b) => b.errorRate - a.errorRate);

    // Generate recommendations
    if (slowestSavers.length > 0) {
      recommendations.push(
        `Consider optimizing ${slowestSavers[0].name} saver (avg: ${Math.round(
          slowestSavers[0].averageTime
        )}ms)`
      );
    }

    if (errorProneSavers.length > 0) {
      recommendations.push(
        `Check ${errorProneSavers[0].name} saver reliability (${Math.round(
          errorProneSavers[0].errorRate * 100
        )}% error rate)`
      );
    }

    if (aggregated.totalOperations === 0) {
      recommendations.push('No checkpoint operations recorded yet');
    } else if (aggregated.errorRate > 0.1) {
      recommendations.push(
        'High overall error rate detected - check system health'
      );
    }

    // Performance-based recommendations
    const overallAvgTime =
      (aggregated.averageSaveTime + aggregated.averageLoadTime) / 2;
    if (overallAvgTime > 500) {
      recommendations.push(
        'Consider using faster storage backends or optimize existing ones'
      );
    }

    if (this.getRecentOperations(300000).length > 100) {
      // More than 100 ops in 5 minutes
      recommendations.push(
        'High checkpoint frequency detected - consider checkpoint optimization'
      );
    }

    return {
      slowestSavers,
      errorProneSavers,
      recommendations,
    };
  }

  /**
   * Get detailed metrics report
   */
  getDetailedReport(): {
    summary: ReturnType<CheckpointMetricsService['getAggregatedMetrics']>;
    insights: ReturnType<CheckpointMetricsService['getPerformanceInsights']>;
    history: {
      recentOperations: Array<{
        timestamp: Date;
        saverName: string;
        operation: 'save' | 'load';
        duration: number;
        success: boolean;
      }>;
      operationTrends: {
        hourly: Record<string, number>;
        daily: Record<string, number>;
      };
    };
    saverDetails: Record<
      string,
      {
        metrics: ReturnType<CheckpointMetricsService['getMetrics']>;
        performance: {
          minSaveTime: number;
          maxSaveTime: number;
          minLoadTime: number;
          maxLoadTime: number;
          uptimePercentage: number;
        };
      }
    >;
  } {
    const summary = this.getAggregatedMetrics();
    const insights = this.getPerformanceInsights();

    const saverDetails: Record<string, any> = {};
    for (const saverName of this.metrics.keys()) {
      const metrics = this.getMetrics(saverName);
      const saverMetrics = this.metrics.get(saverName)!;

      saverDetails[saverName] = {
        metrics,
        performance: {
          minSaveTime: saverMetrics.save.minTime || 0,
          maxSaveTime: saverMetrics.save.maxTime || 0,
          minLoadTime: saverMetrics.load.minTime || 0,
          maxLoadTime: saverMetrics.load.maxTime || 0,
          uptimePercentage: this.calculateUptimePercentage(saverName),
        },
      };
    }

    return {
      summary,
      insights,
      history: {
        recentOperations: this.getRecentOperations(3600000), // Last hour
        operationTrends: this.getOperationTrends(),
      },
      saverDetails,
    };
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetrics(): {
    timestamp: Date;
    metrics: Record<string, SaverMetrics>;
    history: Array<{
      timestamp: Date;
      saverName: string;
      operation: 'save' | 'load';
      duration: number;
      success: boolean;
    }>;
    summary: ReturnType<CheckpointMetricsService['getAggregatedMetrics']>;
  } {
    return {
      timestamp: new Date(),
      metrics: Object.fromEntries(this.metrics) as Record<string, SaverMetrics>,
      history: [...this.operationHistory],
      summary: this.getAggregatedMetrics(),
    };
  }

  /**
   * Import metrics data
   */
  importMetrics(data: {
    metrics: Record<string, SaverMetrics>;
    history: Array<{
      timestamp: Date;
      saverName: string;
      operation: 'save' | 'load';
      duration: number;
      success: boolean;
    }>;
  }): void {
    this.metrics.clear();
    this.operationHistory.splice(0, this.operationHistory.length);

    for (const [saverName, metrics] of Object.entries(data.metrics)) {
      this.metrics.set(saverName, metrics);
    }

    this.operationHistory.push(...data.history);

    this.logger.log('Imported metrics data successfully');
  }

  /**
   * Ensure saver metrics exist
   */
  private ensureSaverMetrics(saverName: string): void {
    if (!this.metrics.has(saverName)) {
      this.metrics.set(saverName, {
        save: this.createEmptyOperationMetrics(),
        load: this.createEmptyOperationMetrics(),
      });
    }
  }

  /**
   * Create empty operation metrics
   */
  private createEmptyOperationMetrics(): OperationMetrics {
    return {
      totalTime: 0,
      count: 0,
      successCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Update operation metrics
   */
  private updateOperationMetrics(
    metrics: OperationMetrics,
    duration: number,
    success: boolean
  ): void {
    metrics.totalTime += duration;
    metrics.count += 1;
    metrics.lastOperation = new Date();

    if (success) {
      metrics.successCount += 1;
    } else {
      metrics.errorCount += 1;
    }

    // Update min/max times
    if (metrics.minTime === undefined || duration < metrics.minTime) {
      metrics.minTime = duration;
    }
    if (metrics.maxTime === undefined || duration > metrics.maxTime) {
      metrics.maxTime = duration;
    }
  }

  /**
   * Add operation to history
   */
  private addToHistory(
    saverName: string,
    operation: 'save' | 'load',
    duration: number,
    success: boolean
  ): void {
    this.operationHistory.push({
      timestamp: new Date(),
      saverName,
      operation,
      duration,
      success,
    });

    // Trim history if it gets too large
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.splice(
        0,
        this.operationHistory.length - this.maxHistorySize
      );
    }
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(
    totalOperations: number,
    errorCount: number
  ): number {
    return totalOperations > 0 ? errorCount / totalOperations : 0;
  }

  /**
   * Get last activity for a saver
   */
  private getLastActivity(saverName: string): Date | null {
    const saverMetrics = this.metrics.get(saverName);
    if (!saverMetrics) {
      return null;
    }

    const lastSave = saverMetrics.save.lastOperation;
    const lastLoad = saverMetrics.load.lastOperation;

    if (!lastSave && !lastLoad) {
      return null;
    }
    if (!lastSave) {
      return lastLoad!;
    }
    if (!lastLoad) {
      return lastSave;
    }

    return lastSave > lastLoad ? lastSave : lastLoad;
  }

  /**
   * Get recent operations within timeframe
   */
  private getRecentOperations(
    timeframeMs: number
  ): typeof this.operationHistory {
    const cutoff = new Date(Date.now() - timeframeMs);
    return this.operationHistory.filter((op) => op.timestamp >= cutoff);
  }

  /**
   * Get operation trends
   */
  private getOperationTrends(): {
    hourly: Record<string, number>;
    daily: Record<string, number>;
  } {
    const hourly: Record<string, number> = {};
    const daily: Record<string, number> = {};

    for (const operation of this.operationHistory) {
      const hour = operation.timestamp.toISOString().slice(0, 13);
      const day = operation.timestamp.toISOString().slice(0, 10);

      hourly[hour] = (hourly[hour] || 0) + 1;
      daily[day] = (daily[day] || 0) + 1;
    }

    return { hourly, daily };
  }

  /**
   * Calculate uptime percentage for a saver
   */
  private calculateUptimePercentage(saverName: string): number {
    const recent = this.getRecentOperations(3600000); // Last hour
    const saverOps = recent.filter((op) => op.saverName === saverName);

    if (saverOps.length === 0) {
      return 100;
    } // No operations, assume healthy

    const successfulOps = saverOps.filter((op) => op.success).length;
    return (successfulOps / saverOps.length) * 100;
  }
}
