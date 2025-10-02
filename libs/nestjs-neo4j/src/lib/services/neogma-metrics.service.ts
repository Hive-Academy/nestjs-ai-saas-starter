/**
 * NeogmaMetricsService - Performance monitoring and metrics collection
 *
 * Focused service for tracking query performance, connection metrics,
 * and system health using Neogma patterns.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  errorRate: number;
  queriesPerSecond: number;
}

/**
 * Connection pool metrics
 */
export interface ConnectionMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  connectionFailures: number;
  averageConnectionTime: number;
}

/**
 * Overall system health metrics
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  queryMetrics: QueryMetrics;
  connectionMetrics: ConnectionMetrics;
  lastHealthCheck: Date;
}

/**
 * Query execution record
 */
interface QueryRecord {
  timestamp: Date;
  executionTime: number;
  failed: boolean;
  queryType: 'read' | 'write' | 'transaction';
}

/**
 * NeogmaMetricsService - Performance monitoring for Neogma operations
 */
@Injectable()
export class NeogmaMetricsService {
  private readonly logger = new Logger(NeogmaMetricsService.name);
  private readonly queryHistory: QueryRecord[] = [];
  private readonly maxHistorySize = 10000; // Keep last 10k queries
  private startTime = Date.now();

  // Connection tracking
  private activeConnections = 0;
  private connectionFailures = 0;
  private totalConnectionTime = 0;
  private connectionCount = 0;

  constructor() {
    this.logger.log('NeogmaMetricsService initialized');

    // Clean up old records every 5 minutes
    setInterval(() => this.cleanupOldRecords(), 5 * 60 * 1000);
  }

  // ==================== QUERY METRICS ====================

  /**
   * Record a query execution
   */
  recordQueryExecution(
    executionTime: number,
    failed: boolean,
    queryType: 'read' | 'write' | 'transaction' = 'read'
  ): void {
    const record: QueryRecord = {
      timestamp: new Date(),
      executionTime,
      failed,
      queryType,
    };

    this.queryHistory.push(record);

    // Maintain history size
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.splice(
        0,
        this.queryHistory.length - this.maxHistorySize
      );
    }

    // Log performance warnings
    if (executionTime > 5000) {
      // 5 seconds
      this.logger.warn(
        `Slow query detected: ${executionTime}ms execution time`
      );
    }

    if (failed) {
      this.logger.error(`Query execution failed after ${executionTime}ms`);
    }
  }

  /**
   * Get comprehensive query metrics
   */
  getQueryMetrics(): QueryMetrics {
    if (this.queryHistory.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      };
    }

    const successful = this.queryHistory.filter((q) => !q.failed);
    const failed = this.queryHistory.filter((q) => q.failed);
    const executionTimes = this.queryHistory.map((q) => q.executionTime);

    // Calculate queries per second (last minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentQueries = this.queryHistory.filter(
      (q) => q.timestamp >= oneMinuteAgo
    );

    return {
      totalQueries: this.queryHistory.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      averageExecutionTime:
        executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      errorRate: (failed.length / this.queryHistory.length) * 100,
      queriesPerSecond: recentQueries.length / 60,
    };
  }

  /**
   * Get query metrics for specific time period
   */
  getQueryMetricsForPeriod(minutes: number): QueryMetrics {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const periodQueries = this.queryHistory.filter(
      (q) => q.timestamp >= cutoff
    );

    if (periodQueries.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      };
    }

    const successful = periodQueries.filter((q) => !q.failed);
    const failed = periodQueries.filter((q) => q.failed);
    const executionTimes = periodQueries.map((q) => q.executionTime);

    return {
      totalQueries: periodQueries.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      averageExecutionTime:
        executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      errorRate: (failed.length / periodQueries.length) * 100,
      queriesPerSecond: periodQueries.length / (minutes * 60),
    };
  }

  // ==================== CONNECTION METRICS ====================

  /**
   * Increment active connection count
   */
  incrementActiveConnections(): void {
    this.activeConnections++;
  }

  /**
   * Decrement active connection count
   */
  decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Record a connection failure
   */
  recordConnectionFailure(): void {
    this.connectionFailures++;
    this.logger.error('Connection failure recorded');
  }

  /**
   * Record connection establishment time
   */
  recordConnectionTime(connectionTime: number): void {
    this.totalConnectionTime += connectionTime;
    this.connectionCount++;
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return {
      activeConnections: this.activeConnections,
      idleConnections: 0, // Neogma manages this internally
      totalConnections: this.connectionCount,
      connectionFailures: this.connectionFailures,
      averageConnectionTime:
        this.connectionCount > 0
          ? this.totalConnectionTime / this.connectionCount
          : 0,
    };
  }

  // ==================== SYSTEM HEALTH ====================

  /**
   * Get comprehensive system health status
   */
  getSystemHealth(): SystemHealth {
    const queryMetrics = this.getQueryMetrics();
    const connectionMetrics = this.getConnectionMetrics();

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      queryMetrics.errorRate > 50 ||
      queryMetrics.averageExecutionTime > 10000
    ) {
      status = 'unhealthy';
    } else if (
      queryMetrics.errorRate > 10 ||
      queryMetrics.averageExecutionTime > 5000
    ) {
      status = 'degraded';
    }

    // Memory usage (Node.js process)
    const memUsage = process.memoryUsage();
    const memoryUsage = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    };

    return {
      status,
      uptime: Date.now() - this.startTime,
      memoryUsage,
      queryMetrics,
      connectionMetrics,
      lastHealthCheck: new Date(),
    };
  }

  // ==================== MAINTENANCE ====================

  /**
   * Clear all metrics and reset counters
   */
  clearMetrics(): void {
    this.queryHistory.length = 0;
    this.activeConnections = 0;
    this.connectionFailures = 0;
    this.totalConnectionTime = 0;
    this.connectionCount = 0;
    this.startTime = Date.now();

    this.logger.log('All metrics cleared and counters reset');
  }

  /**
   * Clean up old query records (keep last hour)
   */
  private cleanupOldRecords(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const originalLength = this.queryHistory.length;

    // Remove records older than 1 hour
    for (let i = this.queryHistory.length - 1; i >= 0; i--) {
      if (this.queryHistory[i].timestamp < oneHourAgo) {
        this.queryHistory.splice(i, 1);
      }
    }

    const removedCount = originalLength - this.queryHistory.length;
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} old query records`);
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    queries: QueryMetrics;
    connections: ConnectionMetrics;
    system: SystemHealth;
    timestamp: Date;
  } {
    return {
      queries: this.getQueryMetrics(),
      connections: this.getConnectionMetrics(),
      system: this.getSystemHealth(),
      timestamp: new Date(),
    };
  }
}
