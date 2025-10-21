import { Injectable, Logger } from '@nestjs/common';

/**
 * Workflow Metrics Service
 * Handles execution time tracking and performance metrics for workflows
 * Extracted from WorkflowExecutionService to follow SRP
 */
@Injectable()
export class WorkflowMetricsService {
  private readonly logger = new Logger(WorkflowMetricsService.name);

  // Execution time tracking
  private readonly executionTimes = new Map<string, number[]>();
  private readonly workflowMetrics = new Map<
    string,
    {
      totalExecutions: number;
      totalTime: number;
      averageTime: number;
      minTime: number;
      maxTime: number;
      successCount: number;
      failureCount: number;
    }
  >();

  constructor() {
    this.logger.debug('WorkflowMetricsService initialized');
  }

  /**
   * Record execution time for a workflow
   */
  recordExecutionTime(
    workflowId: string,
    executionTime: number,
    success: boolean
  ): void {
    // Record individual execution time
    const times = this.executionTimes.get(workflowId) || [];
    times.push(executionTime);

    // Keep only last 1000 execution times to prevent memory leaks
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }
    this.executionTimes.set(workflowId, times);

    // Update workflow metrics
    const metrics = this.workflowMetrics.get(workflowId) || {
      totalExecutions: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      successCount: 0,
      failureCount: 0,
    };

    metrics.totalExecutions++;
    metrics.totalTime += executionTime;
    metrics.averageTime = metrics.totalTime / metrics.totalExecutions;
    metrics.minTime = Math.min(metrics.minTime, executionTime);
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    this.workflowMetrics.set(workflowId, metrics);

    this.logger.debug(
      `Recorded execution time for workflow ${workflowId}: ${executionTime}ms (avg: ${metrics.averageTime.toFixed(
        2
      )}ms)`
    );
  }

  /**
   * Get overall execution statistics
   */
  getOverallExecutionStats(): {
    totalExecutions: number;
    averageExecutionTime: number;
    totalWorkflows: number;
  } {
    let totalTime = 0;
    let totalExecutions = 0;

    for (const [, metrics] of this.workflowMetrics) {
      totalTime += metrics.totalTime;
      totalExecutions += metrics.totalExecutions;
    }

    return {
      totalExecutions,
      averageExecutionTime:
        totalExecutions > 0 ? totalTime / totalExecutions : 0,
      totalWorkflows: this.workflowMetrics.size,
    };
  }

  /**
   * Get detailed execution metrics for a specific workflow
   */
  getWorkflowExecutionMetrics(workflowId: string): {
    totalExecutions: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
    recentExecutionTimes: number[];
    percentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  } | null {
    const metrics = this.workflowMetrics.get(workflowId);
    const times = this.executionTimes.get(workflowId);

    if (!metrics || !times || times.length === 0) {
      return null;
    }

    // Calculate percentiles
    const sortedTimes = [...times].sort((a, b) => a - b);
    const percentiles = {
      p50: this.calculatePercentile(sortedTimes, 50),
      p90: this.calculatePercentile(sortedTimes, 90),
      p95: this.calculatePercentile(sortedTimes, 95),
      p99: this.calculatePercentile(sortedTimes, 99),
    };

    return {
      totalExecutions: metrics.totalExecutions,
      averageTime: metrics.averageTime,
      minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
      maxTime: metrics.maxTime,
      successRate:
        metrics.totalExecutions > 0
          ? metrics.successCount / metrics.totalExecutions
          : 0,
      recentExecutionTimes: times.slice(-10), // Last 10 execution times
      percentiles,
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number
  ): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get system-wide execution metrics
   */
  getSystemExecutionMetrics(): {
    totalWorkflows: number;
    totalExecutions: number;
    averageExecutionTime: number;
    totalSuccessfulExecutions: number;
    totalFailedExecutions: number;
    systemSuccessRate: number;
    workflowMetrics: Record<
      string,
      {
        executions: number;
        averageTime: number;
        successRate: number;
      }
    >;
  } {
    let totalExecutions = 0;
    let totalTime = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    const workflowMetrics: Record<
      string,
      {
        executions: number;
        averageTime: number;
        successRate: number;
      }
    > = {};

    for (const [workflowId, metrics] of this.workflowMetrics) {
      totalExecutions += metrics.totalExecutions;
      totalTime += metrics.totalTime;
      totalSuccessful += metrics.successCount;
      totalFailed += metrics.failureCount;

      workflowMetrics[workflowId] = {
        executions: metrics.totalExecutions,
        averageTime: metrics.averageTime,
        successRate:
          metrics.totalExecutions > 0
            ? metrics.successCount / metrics.totalExecutions
            : 0,
      };
    }

    return {
      totalWorkflows: this.workflowMetrics.size,
      totalExecutions,
      averageExecutionTime:
        totalExecutions > 0 ? totalTime / totalExecutions : 0,
      totalSuccessfulExecutions: totalSuccessful,
      totalFailedExecutions: totalFailed,
      systemSuccessRate:
        totalExecutions > 0 ? totalSuccessful / totalExecutions : 0,
      workflowMetrics,
    };
  }

  /**
   * Get metrics for multiple workflows
   */
  getWorkflowMetricsBatch(workflowIds: string[]): Record<
    string,
    {
      totalExecutions: number;
      averageTime: number;
      successRate: number;
    }
  > {
    const result: Record<
      string,
      {
        totalExecutions: number;
        averageTime: number;
        successRate: number;
      }
    > = {};

    for (const workflowId of workflowIds) {
      const metrics = this.workflowMetrics.get(workflowId);
      if (metrics) {
        result[workflowId] = {
          totalExecutions: metrics.totalExecutions,
          averageTime: metrics.averageTime,
          successRate:
            metrics.totalExecutions > 0
              ? metrics.successCount / metrics.totalExecutions
              : 0,
        };
      }
    }

    return result;
  }

  /**
   * Clear execution metrics for a specific workflow
   */
  clearWorkflowMetrics(workflowId: string): void {
    this.executionTimes.delete(workflowId);
    this.workflowMetrics.delete(workflowId);
    this.logger.debug(`Cleared execution metrics for workflow ${workflowId}`);
  }

  /**
   * Clear all execution metrics
   */
  clearAllMetrics(): void {
    this.executionTimes.clear();
    this.workflowMetrics.clear();
    this.logger.debug('All workflow execution metrics cleared');
  }

  /**
   * Get top performing workflows
   */
  getTopPerformingWorkflows(limit = 10): Array<{
    workflowId: string;
    averageTime: number;
    totalExecutions: number;
    successRate: number;
  }> {
    const allMetrics = Array.from(this.workflowMetrics.entries());

    return allMetrics
      .map(([workflowId, metrics]) => ({
        workflowId,
        averageTime: metrics.averageTime,
        totalExecutions: metrics.totalExecutions,
        successRate:
          metrics.totalExecutions > 0
            ? metrics.successCount / metrics.totalExecutions
            : 0,
      }))
      .sort((a, b) => {
        // Sort by success rate first, then by average time (lower is better)
        if (a.successRate !== b.successRate) {
          return b.successRate - a.successRate;
        }
        return a.averageTime - b.averageTime;
      })
      .slice(0, limit);
  }

  /**
   * Get performance trends for a workflow
   */
  getWorkflowPerformanceTrend(
    workflowId: string,
    windowSize = 50
  ): {
    averageTime: number;
    trend: 'improving' | 'degrading' | 'stable';
    recentAverage: number;
    historicalAverage: number;
  } | null {
    const times = this.executionTimes.get(workflowId);
    if (!times || times.length < windowSize * 2) {
      return null;
    }

    const recent = times.slice(-windowSize);
    const historical = times.slice(-windowSize * 2, -windowSize);

    const recentAverage =
      recent.reduce((sum, time) => sum + time, 0) / recent.length;
    const historicalAverage =
      historical.reduce((sum, time) => sum + time, 0) / historical.length;

    const improvement = (historicalAverage - recentAverage) / historicalAverage;

    let trend: 'improving' | 'degrading' | 'stable';
    if (improvement > 0.05) {
      // More than 5% improvement
      trend = 'improving';
    } else if (improvement < -0.05) {
      // More than 5% degradation
      trend = 'degrading';
    } else {
      trend = 'stable';
    }

    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      trend,
      recentAverage,
      historicalAverage,
    };
  }
}
