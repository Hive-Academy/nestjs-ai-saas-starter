/**
 * @fileoverview Performance Reporter - Reporting formats, output strategies, and dashboards
 *
 * Single Responsibility: Handles all aspects of performance data reporting
 * including logging, formatting, dashboard generation, and external integrations.
 */

import { Logger } from '@nestjs/common';
import type {
  PerformanceMetrics,
  PerformanceStatistics,
  ProfiledConfig,
} from './profile-config';

/**
 * Performance reporter for profiled operations
 */
export class PerformanceReporter {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  /**
   * Log performance metrics based on configuration
   */
  logMetrics(
    metrics: PerformanceMetrics,
    config: Required<ProfiledConfig>
  ): void {
    if (!this.shouldLog(config, metrics)) {
      return;
    }

    const logLevel = this.getLogLevel(metrics, config);
    const message = this.createLogMessage(metrics, config);

    switch (logLevel) {
      case 'error':
        this.logger.error(message, metrics.stackTrace);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
      case 'debug':
      default:
        this.logger.debug(message);
        break;
    }
  }

  /**
   * Check if metrics should be logged based on configuration
   */
  private shouldLog(
    config: Required<ProfiledConfig>,
    metrics: PerformanceMetrics
  ): boolean {
    if (config.logLevel === 'none') {
      return false;
    }

    const isSlow = metrics.executionTime > config.slowQueryThreshold;
    const hasError = !metrics.success;

    switch (config.logLevel) {
      case 'error':
        return hasError;
      case 'slow':
        return isSlow || hasError;
      case 'all':
        return true;
      default:
        return false;
    }
  }

  /**
   * Determine appropriate log level for metrics
   */
  private getLogLevel(
    metrics: PerformanceMetrics,
    config: Required<ProfiledConfig>
  ): 'error' | 'warn' | 'debug' {
    if (!metrics.success) {
      return 'error';
    }

    if (metrics.executionTime > config.slowQueryThreshold) {
      return 'warn';
    }

    return 'debug';
  }

  /**
   * Create formatted log message from metrics
   */
  private createLogMessage(
    metrics: PerformanceMetrics,
    config: Required<ProfiledConfig>
  ): string {
    const parts: string[] = [
      `Operation: ${metrics.operationName}`,
      `Duration: ${metrics.executionTime}ms`,
      `Status: ${metrics.success ? 'SUCCESS' : 'ERROR'}`,
    ];

    if (metrics.collection) {
      parts.push(`Collection: ${metrics.collection}`);
    }

    if (metrics.category) {
      parts.push(`Category: ${metrics.category}`);
    }

    if (metrics.memoryUsage) {
      parts.push(
        `Memory Delta: ${this.formatBytes(metrics.memoryUsage.heapUsed)}`
      );
    }

    if (metrics.parameters && config.includeParameters) {
      parts.push(`Parameters: ${JSON.stringify(metrics.parameters)}`);
    }

    if (metrics.error) {
      parts.push(`Error: ${metrics.error}`);
    }

    if (Object.keys(metrics.tags || {}).length > 0) {
      parts.push(`Tags: ${JSON.stringify(metrics.tags)}`);
    }

    return parts.join(' | ');
  }

  /**
   * Generate performance report for a set of statistics
   */
  generateReport(
    statistics: Map<string, PerformanceStatistics>
  ): PerformanceReport {
    const operations: OperationReport[] = [];
    let totalRequests = 0;
    let totalErrors = 0;
    let totalSlowQueries = 0;

    for (const [operationName, stats] of statistics) {
      totalRequests += stats.totalRequests;
      totalErrors += stats.failedRequests;
      totalSlowQueries += stats.slowQueryCount;

      operations.push({
        operationName,
        performance: {
          totalRequests: stats.totalRequests,
          averageTime: Math.round(stats.averageExecutionTime),
          minTime: stats.minExecutionTime,
          maxTime: stats.maxExecutionTime,
          percentiles: stats.percentiles,
        },
        reliability: {
          successRate:
            ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(
              2
            ) + '%',
          errorRate: (stats.errorRate * 100).toFixed(2) + '%',
          slowQueryRate:
            ((stats.slowQueryCount / stats.totalRequests) * 100).toFixed(2) +
            '%',
        },
        throughput: {
          requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
          firstRequest: stats.firstRequest.toISOString(),
          lastRequest: stats.lastRequest.toISOString(),
        },
      });
    }

    return {
      summary: {
        totalOperations: operations.length,
        totalRequests,
        overallErrorRate:
          totalRequests > 0
            ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%'
            : '0%',
        overallSlowQueryRate:
          totalRequests > 0
            ? ((totalSlowQueries / totalRequests) * 100).toFixed(2) + '%'
            : '0%',
        generatedAt: new Date().toISOString(),
      },
      operations: operations.sort(
        (a, b) => b.performance.totalRequests - a.performance.totalRequests
      ),
    };
  }

  /**
   * Generate text-based dashboard
   */
  generateTextDashboard(
    statistics: Map<string, PerformanceStatistics>
  ): string {
    const report = this.generateReport(statistics);
    const lines: string[] = [];

    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│                 Performance Dashboard                   │');
    lines.push('├─────────────────────────────────────────────────────────┤');
    lines.push(
      `│ Total Operations: ${report.summary.totalOperations
        .toString()
        .padStart(8)} │ Generated: ${report.summary.generatedAt.substring(
        0,
        19
      )} │`
    );
    lines.push(
      `│ Total Requests:   ${report.summary.totalRequests
        .toString()
        .padStart(8)} │ Error Rate: ${report.summary.overallErrorRate.padStart(
        7
      )} │`
    );
    lines.push(
      `│ Slow Query Rate:  ${report.summary.overallSlowQueryRate.padStart(
        8
      )} │                    │`
    );
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');

    if (report.operations.length === 0) {
      lines.push('No operations recorded.');
      return lines.join('\n');
    }

    lines.push('Operation Details:');
    lines.push('');

    for (const op of report.operations.slice(0, 10)) {
      // Top 10 operations
      lines.push(`📊 ${op.operationName}`);
      lines.push(
        `   Requests: ${op.performance.totalRequests} | Success: ${op.reliability.successRate} | RPS: ${op.throughput.requestsPerSecond}`
      );
      lines.push(
        `   Time: avg=${op.performance.averageTime}ms, min=${op.performance.minTime}ms, max=${op.performance.maxTime}ms`
      );

      if (op.performance.percentiles) {
        lines.push(
          `   Percentiles: p50=${op.performance.percentiles.p50}ms, p95=${op.performance.percentiles.p95}ms, p99=${op.performance.percentiles.p99}ms`
        );
      }

      lines.push('');
    }

    if (report.operations.length > 10) {
      lines.push(`... and ${report.operations.length - 10} more operations`);
    }

    return lines.join('\n');
  }

  /**
   * Generate JSON dashboard
   */
  generateJsonDashboard(
    statistics: Map<string, PerformanceStatistics>
  ): string {
    const report = this.generateReport(statistics);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(statistics: Map<string, PerformanceStatistics>): void {
    const dashboard = this.generateTextDashboard(statistics);
    this.logger.log('\n' + dashboard);
  }

  /**
   * Generate alert for performance issues
   */
  generatePerformanceAlert(
    metrics: PerformanceMetrics,
    config: Required<ProfiledConfig>
  ): PerformanceAlert | null {
    const alerts: string[] = [];

    // Check for slow query
    if (metrics.executionTime > config.slowQueryThreshold) {
      alerts.push(
        `Slow query detected: ${metrics.executionTime}ms > ${config.slowQueryThreshold}ms threshold`
      );
    }

    // Check for error
    if (!metrics.success) {
      alerts.push(`Operation failed: ${metrics.error}`);
    }

    // Check for high memory usage (>100MB delta)
    if (
      metrics.memoryUsage &&
      metrics.memoryUsage.heapUsed > 100 * 1024 * 1024
    ) {
      alerts.push(
        `High memory usage: ${this.formatBytes(
          metrics.memoryUsage.heapUsed
        )} heap increase`
      );
    }

    if (alerts.length === 0) {
      return null;
    }

    return {
      operationName: metrics.operationName,
      timestamp: metrics.timestamp,
      severity: !metrics.success ? 'critical' : 'warning',
      alerts,
      metrics: {
        executionTime: metrics.executionTime,
        memoryUsage: metrics.memoryUsage,
        collection: metrics.collection,
        category: metrics.category,
      },
    };
  }

  /**
   * Format bytes in human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Performance report structure
 */
export interface PerformanceReport {
  summary: {
    totalOperations: number;
    totalRequests: number;
    overallErrorRate: string;
    overallSlowQueryRate: string;
    generatedAt: string;
  };
  operations: OperationReport[];
}

/**
 * Individual operation report
 */
export interface OperationReport {
  operationName: string;
  performance: {
    totalRequests: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    percentiles?: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  reliability: {
    successRate: string;
    errorRate: string;
    slowQueryRate: string;
  };
  throughput: {
    requestsPerSecond: number;
    firstRequest: string;
    lastRequest: string;
  };
}

/**
 * Performance alert structure
 */
export interface PerformanceAlert {
  operationName: string;
  timestamp: Date;
  severity: 'warning' | 'critical';
  alerts: string[];
  metrics: {
    executionTime: number;
    memoryUsage?: PerformanceMetrics['memoryUsage'];
    collection?: string;
    category?: string;
  };
}

/**
 * Global performance monitor for all profiled operations
 */
export class GlobalPerformanceMonitor {
  private static instances: Map<string, any> = new Map();
  private static reporter = new PerformanceReporter('GlobalPerformanceMonitor');

  /**
   * Register a service instance for monitoring
   */
  static register(className: string, instance: any): void {
    this.instances.set(className, instance);
  }

  /**
   * Get all performance statistics from registered instances
   */
  static getAllStatistics(): Record<string, PerformanceStatistics[]> {
    const allStats: Record<string, PerformanceStatistics[]> = {};

    for (const [className, instance] of this.instances) {
      const stats: PerformanceStatistics[] = [];

      // Find all profiled methods
      for (const prop of Object.getOwnPropertyNames(instance)) {
        if (prop.endsWith('_getStats')) {
          const methodName = prop.replace('_getStats', '');
          const methodStats = instance[prop]();
          if (methodStats) {
            stats.push(methodStats);
          }
        }
      }

      if (stats.length > 0) {
        allStats[className] = stats;
      }
    }

    return allStats;
  }

  /**
   * Clear all statistics from registered instances
   */
  static clearAllStatistics(): void {
    for (const [, instance] of this.instances) {
      for (const prop of Object.getOwnPropertyNames(instance)) {
        if (prop.endsWith('_clearStats')) {
          instance[prop]();
        }
      }
    }
  }

  /**
   * Generate global performance report
   */
  static generateGlobalReport(): PerformanceReport {
    const allStats = this.getAllStatistics();
    const combinedStats = new Map<string, PerformanceStatistics>();

    for (const [className, stats] of Object.entries(allStats)) {
      for (const stat of stats) {
        const key = `${className}.${stat.operationName}`;
        combinedStats.set(key, stat);
      }
    }

    return this.reporter.generateReport(combinedStats);
  }

  /**
   * Log global performance dashboard
   */
  static logGlobalDashboard(): void {
    const allStats = this.getAllStatistics();
    const combinedStats = new Map<string, PerformanceStatistics>();

    for (const [className, stats] of Object.entries(allStats)) {
      for (const stat of stats) {
        const key = `${className}.${stat.operationName}`;
        combinedStats.set(key, stat);
      }
    }

    this.reporter.logPerformanceSummary(combinedStats);
  }
}
