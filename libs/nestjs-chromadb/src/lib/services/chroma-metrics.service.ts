import { Injectable, Logger } from '@nestjs/common';

/**
 * Operation metrics for performance tracking
 */
export interface OperationMetrics {
  operationName: string;
  executionTime: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
  timestamp: Date;
}

/**
 * Aggregated metrics for performance analysis
 */
export interface AggregatedMetrics {
  operationName: string;
  totalOperations: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  cacheHitRate: number;
  lastOperation: Date;
  operationsPerMinute: number;
}

/**
 * Performance summary across all operations
 */
export interface PerformanceSummary {
  totalOperations: number;
  overallSuccessRate: number;
  overallCacheHitRate: number;
  averageExecutionTime: number;
  operationsPerMinute: number;
  topPerformingOperations: string[];
  slowestOperations: string[];
  mostErrorProneOperations: string[];
  timeWindow: string;
}

/**
 * Service for collecting and analyzing ChromaDB operation metrics
 */
@Injectable()
export class ChromaMetricsService {
  private readonly logger = new Logger(ChromaMetricsService.name);
  private readonly metrics: OperationMetrics[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k operations
  private readonly aggregationCache = new Map<string, AggregatedMetrics>();
  private lastAggregation = 0;
  private readonly aggregationInterval = 60000; // Re-aggregate every minute

  /**
   * Record a new operation metric
   */
  recordOperation(metric: OperationMetrics): void {
    // Add to metrics array
    this.metrics.push(metric);

    // Trim if exceeding max size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }

    // Log slow operations
    if (metric.executionTime > 5000) {
      // 5 seconds
      this.logger.warn(
        `Slow operation detected: ${metric.operationName} took ${metric.executionTime}ms`
      );
    }

    // Log errors
    if (!metric.success && metric.error) {
      this.logger.error(
        `Operation failed: ${metric.operationName} - ${metric.error}`
      );
    }

    // Clear aggregation cache to force recalculation
    if (Date.now() - this.lastAggregation > this.aggregationInterval) {
      this.aggregationCache.clear();
      this.lastAggregation = Date.now();
    }
  }

  /**
   * Get all raw metrics
   */
  getMetrics(): OperationMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operationName: string): OperationMetrics[] {
    return this.metrics.filter((m) => m.operationName === operationName);
  }

  /**
   * Get aggregated metrics for all operations
   */
  getAggregatedMetrics(): AggregatedMetrics[] {
    const operationNames = [
      ...new Set(this.metrics.map((m) => m.operationName)),
    ];

    return operationNames.map((operationName) => {
      // Check cache first
      if (this.aggregationCache.has(operationName)) {
        return this.aggregationCache.get(operationName)!;
      }

      const operationMetrics = this.getMetricsForOperation(operationName);
      const aggregated = this.calculateAggregatedMetrics(
        operationName,
        operationMetrics
      );

      // Cache the result
      this.aggregationCache.set(operationName, aggregated);

      return aggregated;
    });
  }

  /**
   * Get aggregated metrics for a specific operation
   */
  getAggregatedMetricsForOperation(
    operationName: string
  ): AggregatedMetrics | null {
    // Check cache first
    if (this.aggregationCache.has(operationName)) {
      return this.aggregationCache.get(operationName)!;
    }

    const operationMetrics = this.getMetricsForOperation(operationName);

    if (operationMetrics.length === 0) {
      return null;
    }

    const aggregated = this.calculateAggregatedMetrics(
      operationName,
      operationMetrics
    );

    // Cache the result
    this.aggregationCache.set(operationName, aggregated);

    return aggregated;
  }

  /**
   * Get performance summary across all operations
   */
  getPerformanceSummary(timeWindowMinutes = 60): PerformanceSummary {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        overallSuccessRate: 0,
        overallCacheHitRate: 0,
        averageExecutionTime: 0,
        operationsPerMinute: 0,
        topPerformingOperations: [],
        slowestOperations: [],
        mostErrorProneOperations: [],
        timeWindow: `${timeWindowMinutes} minutes`,
      };
    }

    const successCount = recentMetrics.filter((m) => m.success).length;
    const cacheHits = recentMetrics.filter((m) => m.cacheHit).length;
    const totalExecutionTime = recentMetrics.reduce(
      (sum, m) => sum + m.executionTime,
      0
    );

    // Calculate operations per minute
    const timeSpanMinutes = Math.max(
      1,
      (Date.now() - recentMetrics[0].timestamp.getTime()) / 60000
    );
    const operationsPerMinute = recentMetrics.length / timeSpanMinutes;

    // Get aggregated metrics for ranking
    const aggregatedMetrics = this.getAggregatedMetrics().filter((am) =>
      recentMetrics.some((rm) => rm.operationName === am.operationName)
    );

    // Sort operations by performance criteria
    const topPerforming = aggregatedMetrics
      .sort((a, b) => a.averageExecutionTime - b.averageExecutionTime)
      .slice(0, 5)
      .map((am) => am.operationName);

    const slowest = aggregatedMetrics
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
      .slice(0, 5)
      .map((am) => am.operationName);

    const mostErrorProne = aggregatedMetrics
      .filter((am) => am.errorCount > 0)
      .sort(
        (a, b) =>
          b.errorCount / b.totalOperations - a.errorCount / a.totalOperations
      )
      .slice(0, 5)
      .map((am) => am.operationName);

    return {
      totalOperations: recentMetrics.length,
      overallSuccessRate: successCount / recentMetrics.length,
      overallCacheHitRate: cacheHits / recentMetrics.length,
      averageExecutionTime: totalExecutionTime / recentMetrics.length,
      operationsPerMinute,
      topPerformingOperations: topPerforming,
      slowestOperations: slowest,
      mostErrorProneOperations: mostErrorProne,
      timeWindow: `${timeWindowMinutes} minutes`,
    };
  }

  /**
   * Get metrics within a time range
   */
  getMetricsInTimeRange(startTime: Date, endTime: Date): OperationMetrics[] {
    return this.metrics.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.length = 0;
    this.aggregationCache.clear();
    this.logger.debug('All metrics cleared');
  }

  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  /**
   * Check if an operation is performing poorly
   */
  isOperationUnderperforming(operationName: string): boolean {
    const aggregated = this.getAggregatedMetricsForOperation(operationName);

    if (!aggregated || aggregated.totalOperations < 10) {
      return false; // Need sufficient data
    }

    // Define underperformance criteria
    const highErrorRate =
      aggregated.errorCount / aggregated.totalOperations > 0.1; // >10% error rate
    const slowExecution = aggregated.averageExecutionTime > 10000; // >10 seconds average
    const lowCacheHitRate =
      aggregated.cacheHitRate < 0.1 && aggregated.totalOperations > 50; // <10% cache hit with enough operations

    return highErrorRate || slowExecution || lowCacheHitRate;
  }

  /**
   * Get health check status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    summary: PerformanceSummary;
  } {
    const summary = this.getPerformanceSummary(15); // Last 15 minutes
    const issues: string[] = [];

    // Check overall health indicators
    if (summary.overallSuccessRate < 0.95) {
      // <95% success rate
      issues.push(
        `Low success rate: ${(summary.overallSuccessRate * 100).toFixed(1)}%`
      );
    }

    if (summary.averageExecutionTime > 5000) {
      // >5 seconds average
      issues.push(
        `High average execution time: ${summary.averageExecutionTime.toFixed(
          0
        )}ms`
      );
    }

    if (summary.totalOperations === 0) {
      issues.push('No operations recorded in the last 15 minutes');
    }

    // Check individual operations
    const underperformingOps = this.getAggregatedMetrics()
      .filter((am) => this.isOperationUnderperforming(am.operationName))
      .map((am) => am.operationName);

    if (underperformingOps.length > 0) {
      issues.push(
        `Underperforming operations: ${underperformingOps.join(', ')}`
      );
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2 && summary.overallSuccessRate > 0.9) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, issues, summary };
  }

  /**
   * Calculate aggregated metrics for an operation
   */
  private calculateAggregatedMetrics(
    operationName: string,
    operationMetrics: OperationMetrics[]
  ): AggregatedMetrics {
    if (operationMetrics.length === 0) {
      return {
        operationName,
        totalOperations: 0,
        successCount: 0,
        errorCount: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        cacheHitRate: 0,
        lastOperation: new Date(0),
        operationsPerMinute: 0,
      };
    }

    const successCount = operationMetrics.filter((m) => m.success).length;
    const errorCount = operationMetrics.length - successCount;
    const cacheHits = operationMetrics.filter((m) => m.cacheHit).length;

    const executionTimes = operationMetrics.map((m) => m.executionTime);
    const totalExecutionTime = executionTimes.reduce(
      (sum, time) => sum + time,
      0
    );
    const averageExecutionTime = totalExecutionTime / operationMetrics.length;
    const minExecutionTime = Math.min(...executionTimes);
    const maxExecutionTime = Math.max(...executionTimes);

    const cacheHitRate = cacheHits / operationMetrics.length;
    const lastOperation = new Date(
      Math.max(...operationMetrics.map((m) => m.timestamp.getTime()))
    );

    // Calculate operations per minute based on time span
    const timeSpan =
      lastOperation.getTime() - operationMetrics[0].timestamp.getTime();
    const timeSpanMinutes = Math.max(1, timeSpan / 60000);
    const operationsPerMinute = operationMetrics.length / timeSpanMinutes;

    return {
      operationName,
      totalOperations: operationMetrics.length,
      successCount,
      errorCount,
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      cacheHitRate,
      lastOperation,
      operationsPerMinute,
    };
  }
}
