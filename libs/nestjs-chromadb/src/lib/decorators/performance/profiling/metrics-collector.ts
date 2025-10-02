/**
 * @fileoverview Metrics Collector - Performance data collection, timing, and memory tracking
 *
 * Single Responsibility: Handles all aspects of performance data collection
 * including timing, memory tracking, statistics calculation, and data storage.
 */

import type {
  PerformanceMetrics,
  PerformanceStatistics,
  ProfiledConfig,
} from './profile-config';
import type { ChromaMetricsService } from '../../../services/chroma-metrics.service';

/**
 * Performance data collector for profiled operations
 */
export class MetricsCollector {
  private readonly stats: Map<string, PerformanceStatistics> = new Map();
  private readonly executionTimes: Map<string, number[]> = new Map();

  /**
   * Collect performance metrics for an operation
   */
  collectMetrics(
    operationName: string,
    startTime: number,
    startMemory: NodeJS.MemoryUsage | undefined,
    endMemory: NodeJS.MemoryUsage | undefined,
    args: any[],
    result: any,
    error: Error | undefined,
    config: Required<ProfiledConfig>
  ): PerformanceMetrics {
    const executionTime = Date.now() - startTime;
    const success = !error;

    const metrics: PerformanceMetrics = {
      operationName,
      executionTime,
      success,
      timestamp: new Date(),
      memoryUsage: this.calculateMemoryDelta(startMemory, endMemory),
      parameters: config.includeParameters
        ? this.sanitizeParameters(args, config.maxParameterLength)
        : undefined,
      result: config.includeResults
        ? this.sanitizeResult(result, config.maxParameterLength)
        : undefined,
      error: error?.message,
      stackTrace: config.includeStackTrace && error ? error.stack : undefined,
      tags: config.tags,
      category: config.category,
      collection: this.extractCollectionName(args),
    };

    // Update statistics
    this.updateStatistics(operationName, executionTime, success, config);

    return metrics;
  }

  /**
   * Update performance statistics
   */
  private updateStatistics(
    operationName: string,
    executionTime: number,
    success: boolean,
    config: Required<ProfiledConfig>
  ): void {
    const currentStats = this.stats.get(operationName);
    const times = this.executionTimes.get(operationName) || [];

    times.push(executionTime);

    // Keep only last 1000 execution times for percentile calculation
    if (times.length > 1000) {
      times.shift();
    }

    this.executionTimes.set(operationName, times);

    const now = new Date();

    if (!currentStats) {
      // First request
      this.stats.set(operationName, {
        operationName,
        totalRequests: 1,
        successfulRequests: success ? 1 : 0,
        failedRequests: success ? 0 : 1,
        averageExecutionTime: executionTime,
        minExecutionTime: executionTime,
        maxExecutionTime: executionTime,
        percentiles: config.enablePercentiles
          ? this.calculatePercentiles(times)
          : undefined,
        slowQueryCount: executionTime > config.slowQueryThreshold ? 1 : 0,
        errorRate: success ? 0 : 1,
        requestsPerSecond: 0,
        lastRequest: now,
        firstRequest: now,
      });
    } else {
      // Update existing statistics
      const totalRequests = currentStats.totalRequests + 1;
      const successfulRequests =
        currentStats.successfulRequests + (success ? 1 : 0);
      const failedRequests = currentStats.failedRequests + (success ? 0 : 1);
      const newAverage =
        (currentStats.averageExecutionTime * currentStats.totalRequests +
          executionTime) /
        totalRequests;
      const timeDiff =
        (now.getTime() - currentStats.firstRequest.getTime()) / 1000;

      this.stats.set(operationName, {
        operationName,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageExecutionTime: newAverage,
        minExecutionTime: Math.min(
          currentStats.minExecutionTime,
          executionTime
        ),
        maxExecutionTime: Math.max(
          currentStats.maxExecutionTime,
          executionTime
        ),
        percentiles: config.enablePercentiles
          ? this.calculatePercentiles(times)
          : undefined,
        slowQueryCount:
          currentStats.slowQueryCount +
          (executionTime > config.slowQueryThreshold ? 1 : 0),
        errorRate: failedRequests / totalRequests,
        requestsPerSecond: timeDiff > 0 ? totalRequests / timeDiff : 0,
        lastRequest: now,
        firstRequest: currentStats.firstRequest,
      });
    }
  }

  /**
   * Calculate memory usage delta
   */
  private calculateMemoryDelta(
    startMemory: NodeJS.MemoryUsage | undefined,
    endMemory: NodeJS.MemoryUsage | undefined
  ): PerformanceMetrics['memoryUsage'] {
    if (!startMemory || !endMemory) {
      return undefined;
    }

    return {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
      rss: endMemory.rss - startMemory.rss,
    };
  }

  /**
   * Calculate percentiles from execution times
   */
  private calculatePercentiles(times: number[]): {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  } {
    const sorted = [...times].sort((a, b) => a - b);

    return {
      p50: this.getPercentile(sorted, 0.5),
      p90: this.getPercentile(sorted, 0.9),
      p95: this.getPercentile(sorted, 0.95),
      p99: this.getPercentile(sorted, 0.99),
    };
  }

  /**
   * Get specific percentile value
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParameters(params: any[], maxLength: number): any {
    try {
      const sanitized = params.map((param) => {
        if (typeof param === 'string' && param.length > maxLength) {
          return param.substring(0, maxLength) + '...';
        }

        if (typeof param === 'object' && param !== null) {
          const str = JSON.stringify(param);
          if (str.length > maxLength) {
            return str.substring(0, maxLength) + '...';
          }
          return param;
        }

        return param;
      });

      return sanitized;
    } catch (error) {
      return ['[Serialization Error]'];
    }
  }

  /**
   * Sanitize result for logging
   */
  private sanitizeResult(result: any, maxLength: number): any {
    try {
      if (typeof result === 'string' && result.length > maxLength) {
        return result.substring(0, maxLength) + '...';
      }

      if (Array.isArray(result)) {
        return {
          type: 'array',
          length: result.length,
          sample: result.slice(0, 3),
        };
      }

      if (typeof result === 'object' && result !== null) {
        const str = JSON.stringify(result);
        if (str.length > maxLength) {
          return {
            type: 'object',
            keys: Object.keys(result),
            truncated: true,
          };
        }
        return result;
      }

      return result;
    } catch (error) {
      return '[Serialization Error]';
    }
  }

  /**
   * Extract collection name from arguments
   */
  private extractCollectionName(args: any[]): string | undefined {
    if (args.length > 0) {
      const first = args[0];

      if (typeof first === 'string') {
        return first;
      }

      if (first && typeof first === 'object') {
        return first.collection || first.collectionName;
      }
    }

    return undefined;
  }

  /**
   * Get performance statistics for an operation
   */
  getStatistics(operationName: string): PerformanceStatistics | null {
    return this.stats.get(operationName) || null;
  }

  /**
   * Get execution times for an operation
   */
  getExecutionTimes(operationName: string): number[] {
    return [...(this.executionTimes.get(operationName) || [])];
  }

  /**
   * Clear statistics for an operation
   */
  clearStatistics(operationName: string): void {
    this.stats.delete(operationName);
    this.executionTimes.delete(operationName);
  }

  /**
   * Get all statistics
   */
  getAllStatistics(): Map<string, PerformanceStatistics> {
    return new Map(this.stats);
  }

  /**
   * Clear all statistics
   */
  clearAllStatistics(): void {
    this.stats.clear();
    this.executionTimes.clear();
  }

  /**
   * Record metrics to external metrics service
   */
  recordToMetricsService(instance: any, metrics: PerformanceMetrics): void {
    try {
      const metricsService = this.getMetricsService(instance);
      if (
        metricsService &&
        typeof metricsService.recordOperation === 'function'
      ) {
        metricsService.recordOperation({
          operationName: metrics.operationName,
          executionTime: metrics.executionTime,
          success: metrics.success,
          error: metrics.error,
          cacheHit: false, // Not applicable for profiling
          timestamp: metrics.timestamp,
        });
      }
    } catch (error) {
      // Silent failure - don't disrupt the main operation
    }
  }

  /**
   * Get metrics service from class instance
   */
  private getMetricsService(instance: any): ChromaMetricsService | null {
    if (instance.metricsService) {
      return instance.metricsService;
    }

    if (instance.chromaMetricsService) {
      return instance.chromaMetricsService;
    }

    // Look for any service with recordOperation method
    for (const key of Object.keys(instance)) {
      const service = instance[key];
      if (service && typeof service.recordOperation === 'function') {
        return service;
      }
    }

    return null;
  }

  /**
   * Get memory usage snapshot
   */
  static getMemorySnapshot(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Format memory usage for display
   */
  static formatMemoryUsage(
    memoryUsage: PerformanceMetrics['memoryUsage']
  ): string {
    if (!memoryUsage) {
      return 'N/A';
    }

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';

      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return [
      `Heap: ${formatBytes(memoryUsage.heapUsed)}`,
      `Total: ${formatBytes(memoryUsage.heapTotal)}`,
      `External: ${formatBytes(memoryUsage.external)}`,
      `RSS: ${formatBytes(memoryUsage.rss)}`,
    ].join(', ');
  }
}
