import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  MemoryStats,
  MemoryOperationMetrics,
  MemoryUsageMetrics,
} from '../interfaces/memory.interface';

/**
 * Specialized service for memory performance metrics and monitoring
 *
 * Responsibilities:
 * - Performance metrics collection (latency, throughput, errors)
 * - Usage statistics tracking (storage, retrieval patterns)
 * - Health monitoring (service availability, resource usage)
 * - Reporting and alerting for operational insights
 * - Cache performance analytics
 *
 * This service is framework-agnostic and can be reused in any application
 * requiring memory performance monitoring and analytics.
 * 
 * No database dependencies - purely in-memory statistics tracking
 */
@Injectable()
export class MemoryStatsService {
  private readonly logger = new Logger(MemoryStatsService.name);

  private operationMetrics: Map<string, MemoryOperationMetrics> = new Map();
  private usageStats = {
    totalOperations: 0,
    totalStorageOperations: 0,
    totalRetrievalOperations: 0,
    totalSearchOperations: 0,
    totalSummarizationOperations: 0,
    totalErrors: 0,
    averageLatency: 0,
    lastResetTime: new Date(),
    peakMemoryUsage: 0,
    currentConnections: 0,
  };

  private operationStartTimes = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Record the start of a memory operation
   */
  recordOperationStart(
    operationId: string,
    operationType: string,
    threadId?: string
  ): void {
    this.operationStartTimes.set(operationId, Date.now());
    this.logger.debug(
      `Started operation ${operationType} [${operationId}]${
        threadId ? ` for thread ${threadId}` : ''
      }`
    );
  }

  /**
   * Record the completion of a memory operation
   */
  recordOperationComplete(
    operationId: string,
    operationType: string,
    success = true,
    metadata?: Record<string, unknown>
  ): void {
    const startTime = this.operationStartTimes.get(operationId);
    if (!startTime) {
      this.logger.warn(`No start time found for operation ${operationId}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.operationStartTimes.delete(operationId);

    // Update operation metrics
    const key = `${operationType}_${success ? 'success' : 'failure'}`;
    const existing = this.operationMetrics.get(key) || {
      operationType,
      count: 0,
      totalLatency: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      successRate: 0,
      errorCount: 0,
      lastExecutedAt: new Date(),
    };

    existing.count++;
    existing.totalLatency += duration;
    existing.averageLatency = existing.totalLatency / existing.count;
    existing.minLatency = Math.min(existing.minLatency, duration);
    existing.maxLatency = Math.max(existing.maxLatency, duration);
    existing.lastExecutedAt = new Date();

    if (!success) {
      existing.errorCount++;
    }

    existing.successRate =
      (existing.count - existing.errorCount) / existing.count;
    this.operationMetrics.set(key, existing);

    // Update global stats
    this.usageStats.totalOperations++;
    this.usageStats.averageLatency =
      (this.usageStats.averageLatency * (this.usageStats.totalOperations - 1) +
        duration) /
      this.usageStats.totalOperations;

    if (!success) {
      this.usageStats.totalErrors++;
    }

    // Update operation-specific counters
    switch (operationType) {
      case 'store':
      case 'storeBatch':
        this.usageStats.totalStorageOperations++;
        break;
      case 'retrieve':
      case 'retrieveAll':
        this.usageStats.totalRetrievalOperations++;
        break;
      case 'search':
      case 'searchSimilar':
        this.usageStats.totalSearchOperations++;
        break;
      case 'summarize':
        this.usageStats.totalSummarizationOperations++;
        break;
    }

    this.logger.debug(
      `Completed operation ${operationType} [${operationId}] in ${duration}ms - ${
        success ? 'SUCCESS' : 'FAILURE'
      }`
    );
  }

  /**
   * Record memory usage metrics
   */
  recordMemoryUsage(usageMetrics: Partial<MemoryUsageMetrics>): void {
    if (
      usageMetrics.memoryUsageBytes &&
      usageMetrics.memoryUsageBytes > this.usageStats.peakMemoryUsage
    ) {
      this.usageStats.peakMemoryUsage = usageMetrics.memoryUsageBytes;
    }

    if (usageMetrics.activeConnections !== undefined) {
      this.usageStats.currentConnections = usageMetrics.activeConnections;
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  getStats(): MemoryStats {
    const operationBreakdown = this.getOperationBreakdown();
    const healthMetrics = this.calculateHealthMetrics();

    return {
      totalMemories: 0, // Will be populated by calling service
      activeThreads: 0, // Will be populated by calling service
      averageMemorySize: 0,
      totalStorageUsed: 0,
      searchCount: this.usageStats.totalSearchOperations,
      averageSearchTime: this.usageStats.averageLatency,
      summarizationCount: this.usageStats.totalSummarizationOperations,
      cacheHitRate: 0,
    };
  }

  /**
   * Get operation breakdown by type
   */
  private getOperationBreakdown(): Record<string, MemoryOperationMetrics> {
    const breakdown: Record<string, MemoryOperationMetrics> = {};

    // Aggregate success and failure metrics for each operation type
    const operationTypes = new Set<string>();
    for (const [key] of this.operationMetrics) {
      const operationType = key.split('_')[0];
      operationTypes.add(operationType);
    }

    for (const operationType of operationTypes) {
      const successKey = `${operationType}_success`;
      const failureKey = `${operationType}_failure`;

      const successMetrics = this.operationMetrics.get(successKey);
      const failureMetrics = this.operationMetrics.get(failureKey);

      const totalCount =
        (successMetrics?.count || 0) + (failureMetrics?.count || 0);
      const totalLatency =
        (successMetrics?.totalLatency || 0) +
        (failureMetrics?.totalLatency || 0);
      const totalErrors = failureMetrics?.errorCount || 0;

      breakdown[operationType] = {
        operationType,
        count: totalCount,
        totalLatency,
        averageLatency: totalCount > 0 ? totalLatency / totalCount : 0,
        minLatency: Math.min(
          successMetrics?.minLatency || Infinity,
          failureMetrics?.minLatency || Infinity
        ),
        maxLatency: Math.max(
          successMetrics?.maxLatency || 0,
          failureMetrics?.maxLatency || 0
        ),
        successRate:
          totalCount > 0 ? (totalCount - totalErrors) / totalCount : 0,
        errorCount: totalErrors,
        lastExecutedAt: new Date(
          Math.max(
            successMetrics?.lastExecutedAt?.getTime() || 0,
            failureMetrics?.lastExecutedAt?.getTime() || 0
          )
        ),
      };
    }

    return breakdown;
  }

  /**
   * Calculate health metrics for different components
   */
  private calculateHealthMetrics(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    storage: 'healthy' | 'degraded' | 'unhealthy';
    embedding: 'healthy' | 'degraded' | 'unhealthy';
    search: 'healthy' | 'degraded' | 'unhealthy';
    graph: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const overallErrorRate = this.calculateErrorRate();
    const avgLatency = this.usageStats.averageLatency;

    // Define health thresholds
    const errorThreshold = this.configService.get<number>(
      'memory.health.errorThreshold',
      0.05
    ); // 5%
    const latencyThreshold = this.configService.get<number>(
      'memory.health.latencyThreshold',
      5000
    ); // 5s

    const getHealthStatus = (
      errorRate: number,
      latency: number
    ): 'healthy' | 'degraded' | 'unhealthy' => {
      if (errorRate > errorThreshold * 2 || latency > latencyThreshold * 2)
        return 'unhealthy';
      if (errorRate > errorThreshold || latency > latencyThreshold)
        return 'degraded';
      return 'healthy';
    };

    const overall = getHealthStatus(overallErrorRate, avgLatency);

    // Component-specific health (simplified for now)
    const componentHealth = {
      storage: overall,
      embedding: overall,
      search: overall,
      graph: overall,
    };

    return { overall, ...componentHealth };
  }

  /**
   * Calculate percentile latency
   */
  private calculatePercentileLatency(percentile: number): number {
    const allLatencies: number[] = [];

    for (const metrics of this.operationMetrics.values()) {
      // Approximate latency distribution
      const count = metrics.count;
      const avgLatency = metrics.averageLatency;

      // Simple approximation - in real implementation, you'd store actual latencies
      for (let i = 0; i < Math.min(count, 1000); i++) {
        allLatencies.push(
          avgLatency + (Math.random() - 0.5) * avgLatency * 0.5
        );
      }
    }

    if (allLatencies.length === 0) return 0;

    allLatencies.sort((a, b) => a - b);
    const index = Math.floor(allLatencies.length * percentile);
    return Math.round(allLatencies[index] || 0);
  }

  /**
   * Calculate current throughput per second
   */
  private calculateThroughput(): number {
    const uptimeSeconds =
      (Date.now() - this.usageStats.lastResetTime.getTime()) / 1000;
    return uptimeSeconds > 0
      ? this.usageStats.totalOperations / uptimeSeconds
      : 0;
  }

  /**
   * Calculate overall error rate
   */
  private calculateErrorRate(): number {
    return this.usageStats.totalOperations > 0
      ? this.usageStats.totalErrors / this.usageStats.totalOperations
      : 0;
  }

  /**
   * Calculate overall success rate
   */
  private calculateOverallSuccessRate(): number {
    return 1 - this.calculateErrorRate();
  }

  /**
   * Get slow queries (operations above threshold)
   */
  private getSlowQueries(): Array<{
    operation: string;
    count: number;
    averageLatency: number;
  }> {
    const slowQueryThreshold = this.configService.get<number>(
      'memory.performance.slowQueryThreshold',
      2000
    );
    const slowQueries: Array<{
      operation: string;
      count: number;
      averageLatency: number;
    }> = [];

    for (const [key, metrics] of this.operationMetrics) {
      if (metrics.averageLatency > slowQueryThreshold) {
        slowQueries.push({
          operation: key,
          count: metrics.count,
          averageLatency: Math.round(metrics.averageLatency),
        });
      }
    }

    return slowQueries.sort((a, b) => b.averageLatency - a.averageLatency);
  }

  /**
   * Reset statistics (useful for testing or periodic resets)
   */
  resetStats(): void {
    this.operationMetrics.clear();
    this.operationStartTimes.clear();
    this.usageStats = {
      totalOperations: 0,
      totalStorageOperations: 0,
      totalRetrievalOperations: 0,
      totalSearchOperations: 0,
      totalSummarizationOperations: 0,
      totalErrors: 0,
      averageLatency: 0,
      lastResetTime: new Date(),
      peakMemoryUsage: 0,
      currentConnections: 0,
    };

    this.logger.log('Memory statistics reset');
  }

  /**
   * Get real-time metrics summary
   */
  getRealtimeMetrics(): {
    operationsPerMinute: number;
    currentErrorRate: number;
    averageLatency: number;
    activeOperations: number;
    peakMemoryUsage: number;
  } {
    const now = Date.now();

    // Count operations in the last minute (simplified - in practice you'd track timestamps)
    const recentOperations = this.usageStats.totalOperations; // Approximation

    return {
      operationsPerMinute: recentOperations,
      currentErrorRate: this.calculateErrorRate(),
      averageLatency: Math.round(this.usageStats.averageLatency),
      activeOperations: this.operationStartTimes.size,
      peakMemoryUsage: this.usageStats.peakMemoryUsage,
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const stats = this.getStats();
    const realtime = this.getRealtimeMetrics();

    return `
Memory Performance Report
========================
Generated: ${new Date().toISOString()}

Operations Summary:
- Total Operations: ${this.usageStats.totalOperations}
- Success Rate: ${(this.calculateOverallSuccessRate() * 100).toFixed(2)}%
- Average Latency: ${this.usageStats.averageLatency}ms
- Throughput: ${this.calculateThroughput().toFixed(2)} ops/sec

Active Operations: ${realtime.activeOperations}
Peak Memory Usage: ${Math.round(realtime.peakMemoryUsage / 1024 / 1024)}MB

${
  this.getSlowQueries().length > 0
    ? `
Slow Queries:
${this.getSlowQueries()
  .map((q) => `- ${q.operation}: ${q.averageLatency}ms (${q.count} times)`)
  .join('\n')}
`
    : 'No slow queries detected'
}
    `.trim();
  }
}