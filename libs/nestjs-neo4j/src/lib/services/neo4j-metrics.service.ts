import { Injectable } from '@nestjs/common';
import type {
  QueryMetrics,
  ConnectionPoolMetrics,
  QueryResult,
  QueryOptions,
} from '../interfaces/query-result.interface';

/**
 * Neo4j Metrics Service
 * Handles performance metrics collection and analysis
 */
@Injectable()
export class Neo4jMetricsService {
  private readonly queryMetrics: Map<string, QueryMetrics[]> = new Map();
  private readonly connectionMetrics: ConnectionPoolMetrics;
  private queryCounter = 0;

  constructor() {
    // Initialize connection metrics
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      maxPoolSize: 100,
      connectionRequests: 0,
      connectionFailures: 0,
      averageConnectionTime: 0,
      lastResetTime: new Date(),
    };
  }

  /**
   * Track a session acquisition (approximation of pool usage)
   */
  incrementActiveSessions(): void {
    this.connectionMetrics.activeConnections++;
    this.connectionMetrics.totalConnections = Math.max(
      this.connectionMetrics.totalConnections,
      this.connectionMetrics.activeConnections
    );
    this.connectionMetrics.idleConnections = Math.max(
      0,
      this.connectionMetrics.totalConnections -
        this.connectionMetrics.activeConnections
    );
  }

  /**
   * Track a session release
   */
  decrementActiveSessions(): void {
    this.connectionMetrics.activeConnections = Math.max(
      0,
      this.connectionMetrics.activeConnections - 1
    );
    this.connectionMetrics.idleConnections = Math.max(
      0,
      this.connectionMetrics.totalConnections -
        this.connectionMetrics.activeConnections
    );
  }

  /**
   * Get connection pool metrics
   */
  getConnectionPoolMetrics(): ConnectionPoolMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(queryPattern?: string): QueryMetrics[] {
    if (queryPattern) {
      return this.queryMetrics.get(queryPattern) || [];
    }

    const allMetrics: QueryMetrics[] = [];
    this.queryMetrics.forEach((metrics) => allMetrics.push(...metrics));
    return allMetrics;
  }

  /**
   * Clear metrics data
   */
  clearMetrics(): void {
    this.queryMetrics.clear();
    this.connectionMetrics.lastResetTime = new Date();
    this.connectionMetrics.connectionRequests = 0;
    this.connectionMetrics.connectionFailures = 0;
  }

  /**
   * Get comprehensive metrics summary
   */
  getMetrics(): {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    errorRate: number;
    slowQueries: number;
    poolUtilization: number;
  } {
    const allMetrics = this.getQueryMetrics();
    const totalQueries = allMetrics.length;

    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        slowQueries: 0,
        poolUtilization: 0,
      };
    }

    const totalExecutionTime = allMetrics.reduce(
      (sum, m) => sum + m.executionTime,
      0
    );
    const cacheHits = allMetrics.filter((m) => m.cacheHit).length;
    const slowQueryThreshold = 1000; // 1 second
    const slowQueries = allMetrics.filter(
      (m) => m.executionTime > slowQueryThreshold
    ).length;

    return {
      totalQueries,
      averageExecutionTime: totalExecutionTime / totalQueries,
      cacheHitRate: (cacheHits / totalQueries) * 100,
      errorRate:
        (this.connectionMetrics.connectionFailures /
          this.connectionMetrics.connectionRequests) *
        100,
      slowQueries,
      poolUtilization:
        (this.connectionMetrics.activeConnections /
          this.connectionMetrics.maxPoolSize) *
        100,
    };
  }

  /**
   * Collect query metrics for monitoring
   */
  collectQueryMetrics(
    cypher: string,
    result: QueryResult,
    options?: QueryOptions
  ): void {
    const queryPattern = this.extractQueryPattern(cypher);
    const metrics: QueryMetrics = {
      queryType: this.determineQueryType(cypher),
      executionTime: result.performance?.executionTime || 0,
      planningTime: result.performance?.planningTime || 0,
      totalTime: result.performance?.totalTime || 0,
      rowsReturned: result.records.length,
      rowsAffected: this.calculateRowsAffected(result.summary?.counters),
      cacheHit: result.performance?.cacheHit || false,
      retryCount: result.performance?.retryCount || 0,
      timestamp: new Date(),
      tags: options?.metrics?.tags,
    };

    if (!this.queryMetrics.has(queryPattern)) {
      this.queryMetrics.set(queryPattern, []);
    }

    const patternMetrics = this.queryMetrics.get(queryPattern)!;
    patternMetrics.push(metrics);

    // Keep only last 100 metrics per pattern to prevent memory leaks
    if (patternMetrics.length > 100) {
      patternMetrics.splice(0, patternMetrics.length - 100);
    }
  }

  /**
   * Update connection metrics
   */
  updateConnectionMetrics(connectionTime: number): void {
    const totalRequests = this.connectionMetrics.connectionRequests;
    const currentAverage = this.connectionMetrics.averageConnectionTime;

    this.connectionMetrics.averageConnectionTime =
      (currentAverage * (totalRequests - 1) + connectionTime) / totalRequests;
  }

  /**
   * Record connection attempt
   */
  recordConnectionAttempt(success: boolean, connectionTime?: number): void {
    this.connectionMetrics.connectionRequests++;
    if (!success) {
      this.connectionMetrics.connectionFailures++;
    }

    if (connectionTime !== undefined) {
      this.updateConnectionMetrics(connectionTime);
    }
  }

  /**
   * Generate unique query ID
   */
  generateQueryId(): string {
    return `query_${++this.queryCounter}_${Date.now()}`;
  }

  /**
   * Extract query pattern for metrics grouping
   */
  private extractQueryPattern(cypher: string): string {
    // Remove parameters and normalize whitespace
    return cypher
      .replace(/\$\w+/g, '$param')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .substring(0, 100); // Limit length
  }

  /**
   * Determine query type from Cypher statement
   */
  private determineQueryType(cypher: string): 'READ' | 'WRITE' | 'MIXED' {
    const normalizedQuery = cypher.toLowerCase().trim();

    const writeKeywords = [
      'create',
      'merge',
      'set',
      'delete',
      'remove',
      'drop',
    ];
    const readKeywords = ['match', 'return', 'with'];

    const hasWrite = writeKeywords.some((keyword) =>
      normalizedQuery.includes(keyword)
    );
    const hasRead = readKeywords.some((keyword) =>
      normalizedQuery.includes(keyword)
    );

    if (hasWrite && hasRead) return 'MIXED';
    if (hasWrite) return 'WRITE';
    return 'READ';
  }

  /**
   * Calculate total rows affected by query
   */
  private calculateRowsAffected(counters?: any): number {
    if (!counters) return 0;

    return (
      (counters.nodesCreated || 0) +
      (counters.nodesDeleted || 0) +
      (counters.relationshipsCreated || 0) +
      (counters.relationshipsDeleted || 0) +
      (counters.propertiesSet || 0)
    );
  }
}
