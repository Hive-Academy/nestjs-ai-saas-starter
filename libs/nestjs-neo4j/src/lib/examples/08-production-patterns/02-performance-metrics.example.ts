/**
 * Example: Performance Metrics and Monitoring - Production-Grade Performance Tracking
 * Category: 08-production-patterns
 * Features: Neo4jMetricsService integration, Prometheus/Grafana, business metrics, performance optimization
 */
import { Injectable, Controller, Get, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Neo4jMetricsService,
  Neo4jConnectionService,
  Neo4jHealthService,
  FindMany,
  CreateEntity,
  UpdateEntity,
  CountEntities,
  type QueryMetrics,
  type ConnectionPoolMetrics
} from '../../../index';

// ===== Metrics Types =====

interface BusinessMetrics {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  revenue: number;
  conversionRate: number;
  timestamp: Date;
}

interface PerformanceSnapshot {
  timestamp: Date;
  queryMetrics: {
    totalQueries: number;
    averageExecutionTime: number;
    cacheHitRate: number;
    errorRate: number;
    slowQueries: number;
    queriesPerSecond: number;
    queryTypeBreakdown: Record<'READ' | 'WRITE' | 'MIXED', number>;
  };
  connectionMetrics: ConnectionPoolMetrics & {
    utilizationPercentage: number;
    connectionsPerSecond: number;
    avgConnectionTime: number;
  };
  resourceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage?: number;
    networkLatency: number;
  };
  businessMetrics: BusinessMetrics;
}

interface AlertThreshold {
  metric: string;
  warningValue: number;
  criticalValue: number;
  operator: '>' | '<' | '==' | '>=' | '<=';
}

interface MetricsConfiguration {
  collectionInterval: number;  // milliseconds
  retentionPeriod: number;     // hours
  alertThresholds: AlertThreshold[];
  enabledCollectors: string[];
  exportTargets: ('prometheus' | 'grafana' | 'datadog' | 'newrelic')[];
}

// ===== Production Metrics Service =====

/**
 * Enterprise-grade metrics collection and monitoring service
 * Integrates with observability platforms and provides real-time insights
 */
@Injectable()
export class Neo4jProductionMetricsService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jProductionMetricsService.name);

  // Metrics storage
  private metricsHistory: PerformanceSnapshot[] = [];
  private currentSnapshot: PerformanceSnapshot | null = null;

  // Performance tracking
  private queryPatternMetrics = new Map<string, QueryMetrics[]>();
  private slowQueryLog: Array<{
    query: string;
    executionTime: number;
    timestamp: Date;
    parameters?: Record<string, any>;
  }> = [];

  // Business metrics cache
  private businessMetricsCache: BusinessMetrics | null = null;
  private lastBusinessMetricsUpdate = 0;

  // Configuration
  private readonly config: MetricsConfiguration = {
    collectionInterval: 30000,    // 30 seconds
    retentionPeriod: 168,         // 7 days
    alertThresholds: [
      { metric: 'averageExecutionTime', warningValue: 1000, criticalValue: 5000, operator: '>' },
      { metric: 'errorRate', warningValue: 5, criticalValue: 15, operator: '>' },
      { metric: 'cacheHitRate', warningValue: 70, criticalValue: 50, operator: '<' },
      { metric: 'utilizationPercentage', warningValue: 80, criticalValue: 95, operator: '>' },
      { metric: 'queriesPerSecond', warningValue: 1000, criticalValue: 2000, operator: '>' }
    ],
    enabledCollectors: ['query', 'connection', 'business', 'system'],
    exportTargets: ['prometheus']
  };

  constructor(
    private readonly metricsService: Neo4jMetricsService,
    private readonly connectionService: Neo4jConnectionService,
    private readonly healthService: Neo4jHealthService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    // Start metrics collection
    this.startMetricsCollection();
    this.logger.log('Production metrics service initialized');
  }

  // ===== Core Metrics Collection =====

  /**
   * Collect comprehensive performance snapshot
   */
  async collectPerformanceSnapshot(): Promise<PerformanceSnapshot> {
    const timestamp = new Date();

    try {
      // Collect all metrics in parallel for performance
      const [
        queryMetrics,
        connectionMetrics,
        resourceMetrics,
        businessMetrics
      ] = await Promise.all([
        this.collectQueryMetrics(),
        this.collectConnectionMetrics(),
        this.collectResourceMetrics(),
        this.collectBusinessMetrics()
      ]);

      const snapshot: PerformanceSnapshot = {
        timestamp,
        queryMetrics,
        connectionMetrics,
        resourceMetrics,
        businessMetrics
      };

      // Store snapshot and update history
      this.currentSnapshot = snapshot;
      this.updateMetricsHistory(snapshot);

      // Emit metrics event for real-time processing
      this.eventEmitter.emit('metrics.snapshot', snapshot);

      // Check for threshold breaches
      this.checkAlertThresholds(snapshot);

      return snapshot;

    } catch (error) {
      this.logger.error('Failed to collect performance snapshot', error);
      throw error;
    }
  }

  private async collectQueryMetrics() {
    const rawMetrics = this.metricsService.getMetrics();
    const allQueryMetrics = this.metricsService.getQueryMetrics();

    // Calculate queries per second based on recent activity
    const recentQueries = allQueryMetrics.filter(
      m => m.timestamp && m.timestamp > new Date(Date.now() - 60000) // Last minute
    );
    const queriesPerSecond = recentQueries.length / 60;

    // Calculate query type breakdown
    const queryTypeBreakdown: Record<'READ' | 'WRITE' | 'MIXED', number> = {
      READ: 0,
      WRITE: 0,
      MIXED: 0
    };

    allQueryMetrics.forEach(metric => {
      queryTypeBreakdown[metric.queryType]++;
    });

    return {
      totalQueries: rawMetrics.totalQueries,
      averageExecutionTime: rawMetrics.averageExecutionTime,
      cacheHitRate: rawMetrics.cacheHitRate,
      errorRate: rawMetrics.errorRate,
      slowQueries: rawMetrics.slowQueries,
      queriesPerSecond,
      queryTypeBreakdown
    };
  }

  private async collectConnectionMetrics() {
    const connectionPoolMetrics = this.metricsService.getConnectionPoolMetrics();
    const connectionStatus = await this.connectionService.getConnectionStatus();

    const utilizationPercentage = (connectionPoolMetrics.activeConnections / connectionPoolMetrics.maxPoolSize) * 100;
    const connectionsPerSecond = connectionPoolMetrics.connectionRequests / 60; // Approximate

    return {
      ...connectionPoolMetrics,
      utilizationPercentage,
      connectionsPerSecond,
      avgConnectionTime: connectionPoolMetrics.averageConnectionTime
    };
  }

  private async collectResourceMetrics() {
    // System resource metrics collection
    // In production, integrate with actual system monitoring

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Test connection latency to Neo4j
    const startTime = Date.now();
    const testResult = await this.connectionService.testConnection(5000);
    const networkLatency = testResult.latency;

    return {
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000, // milliseconds
      networkLatency
    };
  }

  private async collectBusinessMetrics(): Promise<BusinessMetrics> {
    // Cache business metrics for 5 minutes to avoid expensive queries
    if (
      this.businessMetricsCache &&
      Date.now() - this.lastBusinessMetricsUpdate < 300000
    ) {
      return this.businessMetricsCache;
    }

    try {
      // These would be real business queries in production
      const [
        totalUsers,
        activeUsers,
        totalOrders,
        revenueData
      ] = await Promise.all([
        this.getTotalUsersCount(),
        this.getActiveUsersCount(),
        this.getTotalOrdersCount(),
        this.getRevenueMetrics()
      ]);

      const businessMetrics: BusinessMetrics = {
        totalUsers,
        activeUsers,
        totalOrders,
        revenue: revenueData.total,
        conversionRate: activeUsers > 0 ? (totalOrders / activeUsers) * 100 : 0,
        timestamp: new Date()
      };

      this.businessMetricsCache = businessMetrics;
      this.lastBusinessMetricsUpdate = Date.now();

      return businessMetrics;

    } catch (error) {
      this.logger.error('Failed to collect business metrics', error);

      return {
        totalUsers: 0,
        activeUsers: 0,
        totalOrders: 0,
        revenue: 0,
        conversionRate: 0,
        timestamp: new Date()
      };
    }
  }

  // ===== Business Metrics Queries (Using Decorators) =====

  @CountEntities(() => Object, {
    cache: '5m',
    description: 'Count total users for metrics'
  })
  private async getTotalUsersCount(): Promise<number> {
    // Replaced by: MATCH (u:User) RETURN count(u) as count
    return 0; // Placeholder - decorator handles implementation
  }

  @CountEntities(() => Object, {
    cache: '2m',
    description: 'Count active users for metrics'
  })
  private async getActiveUsersCount(): Promise<number> {
    // Replaced by: MATCH (u:User {isActive: true}) RETURN count(u) as count
    return 0; // Placeholder - decorator handles implementation
  }

  @CountEntities(() => Object, {
    cache: '10m',
    description: 'Count total orders for metrics'
  })
  private async getTotalOrdersCount(): Promise<number> {
    // Replaced by: MATCH (o:Order) RETURN count(o) as count
    return 0; // Placeholder - decorator handles implementation
  }

  @FindMany(() => Object, {
    cache: '15m',
    description: 'Get revenue metrics'
  })
  private async getRevenueMetrics(): Promise<{ total: number; currency: string }> {
    // Replaced by: MATCH (o:Order) RETURN sum(o.amount) as total, 'USD' as currency
    return { total: 0, currency: 'USD' }; // Placeholder - decorator handles implementation
  }

  // ===== Query Pattern Analysis =====

  /**
   * Analyze query patterns for optimization opportunities
   */
  async analyzeQueryPatterns(): Promise<{
    mostFrequent: Array<{ pattern: string; count: number; avgTime: number }>;
    slowestQueries: Array<{ pattern: string; avgTime: number; count: number }>;
    cacheOpportunities: Array<{ pattern: string; hitRate: number; frequency: number }>;
    optimizationSuggestions: string[];
  }> {
    const patternAnalysis = new Map<string, {
      count: number;
      totalTime: number;
      cacheHits: number;
      examples: QueryMetrics[];
    }>();

    // Analyze all query metrics
    this.metricsService.getQueryMetrics().forEach(metric => {
      const pattern = this.extractQueryPattern(metric);

      if (!patternAnalysis.has(pattern)) {
        patternAnalysis.set(pattern, {
          count: 0,
          totalTime: 0,
          cacheHits: 0,
          examples: []
        });
      }

      const analysis = patternAnalysis.get(pattern)!;
      analysis.count++;
      analysis.totalTime += metric.executionTime;
      if (metric.cacheHit) analysis.cacheHits++;
      if (analysis.examples.length < 3) {
        analysis.examples.push(metric);
      }
    });

    // Generate insights
    const patterns = Array.from(patternAnalysis.entries()).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      avgTime: data.totalTime / data.count,
      cacheHitRate: (data.cacheHits / data.count) * 100,
      examples: data.examples
    }));

    const mostFrequent = patterns
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const slowestQueries = patterns
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    const cacheOpportunities = patterns
      .filter(p => p.cacheHitRate < 50 && p.count > 10)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const optimizationSuggestions = this.generateOptimizationSuggestions(
      mostFrequent,
      slowestQueries,
      cacheOpportunities
    );

    return {
      mostFrequent,
      slowestQueries,
      cacheOpportunities,
      optimizationSuggestions
    };
  }

  private extractQueryPattern(metric: QueryMetrics): string {
    // This would extract a normalized pattern from the query
    // For example: "MATCH (u:User) WHERE u.id = $param RETURN u" becomes "MATCH (u:User) WHERE u.id = $param RETURN u"
    return `${metric.queryType}_PATTERN`; // Simplified for example
  }

  private generateOptimizationSuggestions(
    mostFrequent: any[],
    slowestQueries: any[],
    cacheOpportunities: any[]
  ): string[] {
    const suggestions: string[] = [];

    // Frequent query suggestions
    if (mostFrequent.length > 0 && mostFrequent[0].avgTime > 100) {
      suggestions.push(`Consider optimizing your most frequent query pattern (${mostFrequent[0].pattern}) which averages ${mostFrequent[0].avgTime}ms`);
    }

    // Slow query suggestions
    if (slowestQueries.length > 0 && slowestQueries[0].avgTime > 1000) {
      suggestions.push(`Optimize slow query: ${slowestQueries[0].pattern} (${slowestQueries[0].avgTime}ms average)`);
    }

    // Cache suggestions
    cacheOpportunities.forEach(opportunity => {
      suggestions.push(`Add caching to frequent query: ${opportunity.pattern} (${opportunity.count} executions, ${opportunity.cacheHitRate}% hit rate)`);
    });

    // Index suggestions (would be based on actual query analysis)
    suggestions.push('Consider adding indexes for frequently filtered properties');
    suggestions.push('Review connection pool size based on current utilization patterns');

    return suggestions;
  }

  // ===== Alert System =====

  private checkAlertThresholds(snapshot: PerformanceSnapshot): void {
    this.config.alertThresholds.forEach(threshold => {
      const value = this.getMetricValue(snapshot, threshold.metric);
      if (this.shouldAlert(value, threshold)) {
        this.emitAlert(threshold, value, snapshot.timestamp);
      }
    });
  }

  private getMetricValue(snapshot: PerformanceSnapshot, metric: string): number {
    // Navigate through the snapshot object to get the metric value
    const parts = metric.split('.');
    let value: any = snapshot;

    for (const part of parts) {
      if (part in value) {
        value = value[part];
      } else {
        // Try to find the metric in different sections
        if (metric in snapshot.queryMetrics) {
          value = snapshot.queryMetrics[metric as keyof typeof snapshot.queryMetrics];
        } else if (metric in snapshot.connectionMetrics) {
          value = snapshot.connectionMetrics[metric as keyof typeof snapshot.connectionMetrics];
        } else {
          return 0;
        }
        break;
      }
    }

    return typeof value === 'number' ? value : 0;
  }

  private shouldAlert(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case '>': return value > threshold.criticalValue || value > threshold.warningValue;
      case '<': return value < threshold.criticalValue || value < threshold.warningValue;
      case '>=': return value >= threshold.criticalValue || value >= threshold.warningValue;
      case '<=': return value <= threshold.criticalValue || value <= threshold.warningValue;
      case '==': return value === threshold.criticalValue || value === threshold.warningValue;
      default: return false;
    }
  }

  private emitAlert(threshold: AlertThreshold, value: number, timestamp: Date): void {
    const severity = this.shouldAlert(value, { ...threshold, warningValue: threshold.criticalValue })
      ? 'critical'
      : 'warning';

    this.eventEmitter.emit('metrics.alert', {
      metric: threshold.metric,
      value,
      threshold,
      severity,
      timestamp
    });

    this.logger.warn(`[METRIC ALERT] ${severity.toUpperCase()}: ${threshold.metric} = ${value} (threshold: ${threshold.warningValue}/${threshold.criticalValue})`);
  }

  // ===== Scheduled Collection =====

  @Cron('*/30 * * * * *') // Every 30 seconds
  async scheduledMetricsCollection(): Promise<void> {
    try {
      await this.collectPerformanceSnapshot();
    } catch (error) {
      this.logger.error('Scheduled metrics collection failed', error);
    }
  }

  // ===== History Management =====

  private updateMetricsHistory(snapshot: PerformanceSnapshot): void {
    this.metricsHistory.push(snapshot);

    // Clean old metrics based on retention period
    const cutoffTime = new Date(Date.now() - (this.config.retentionPeriod * 60 * 60 * 1000));
    this.metricsHistory = this.metricsHistory.filter(s => s.timestamp > cutoffTime);
  }

  private startMetricsCollection(): void {
    // Initial collection
    this.collectPerformanceSnapshot().catch(error => {
      this.logger.error('Initial metrics collection failed', error);
    });
  }

  // ===== Export Capabilities =====

  /**
   * Export metrics in Prometheus format
   */
  generatePrometheusMetrics(): string {
    if (!this.currentSnapshot) return '';

    const { queryMetrics, connectionMetrics, businessMetrics } = this.currentSnapshot;

    return `
# HELP neo4j_queries_total Total number of queries executed
# TYPE neo4j_queries_total counter
neo4j_queries_total ${queryMetrics.totalQueries}

# HELP neo4j_query_duration_ms Average query execution time in milliseconds
# TYPE neo4j_query_duration_ms gauge
neo4j_query_duration_ms ${queryMetrics.averageExecutionTime}

# HELP neo4j_cache_hit_rate_percent Query cache hit rate percentage
# TYPE neo4j_cache_hit_rate_percent gauge
neo4j_cache_hit_rate_percent ${queryMetrics.cacheHitRate}

# HELP neo4j_error_rate_percent Query error rate percentage
# TYPE neo4j_error_rate_percent gauge
neo4j_error_rate_percent ${queryMetrics.errorRate}

# HELP neo4j_queries_per_second Queries per second
# TYPE neo4j_queries_per_second gauge
neo4j_queries_per_second ${queryMetrics.queriesPerSecond}

# HELP neo4j_connection_pool_utilization_percent Connection pool utilization percentage
# TYPE neo4j_connection_pool_utilization_percent gauge
neo4j_connection_pool_utilization_percent ${connectionMetrics.utilizationPercentage}

# HELP neo4j_active_connections Number of active connections
# TYPE neo4j_active_connections gauge
neo4j_active_connections ${connectionMetrics.activeConnections}

# HELP business_total_users Total number of users
# TYPE business_total_users gauge
business_total_users ${businessMetrics.totalUsers}

# HELP business_active_users Number of active users
# TYPE business_active_users gauge
business_active_users ${businessMetrics.activeUsers}

# HELP business_revenue_total Total revenue
# TYPE business_revenue_total gauge
business_revenue_total ${businessMetrics.revenue}

# HELP business_conversion_rate_percent Conversion rate percentage
# TYPE business_conversion_rate_percent gauge
business_conversion_rate_percent ${businessMetrics.conversionRate}
`.trim();
  }

  // ===== Public API =====

  getCurrentSnapshot(): PerformanceSnapshot | null {
    return this.currentSnapshot;
  }

  getMetricsHistory(hours = 24): PerformanceSnapshot[] {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.metricsHistory.filter(s => s.timestamp > cutoffTime);
  }

  getSlowQueryLog(limit = 50): typeof this.slowQueryLog {
    return this.slowQueryLog.slice(-limit);
  }

  clearMetricsHistory(): void {
    this.metricsHistory = [];
    this.metricsService.clearMetrics();
    this.logger.log('Metrics history cleared');
  }
}

// ===== Metrics API Controller =====

/**
 * REST API for metrics access
 */
@Controller('metrics')
export class Neo4jMetricsController {
  constructor(
    private readonly metricsService: Neo4jProductionMetricsService
  ) {}

  /**
   * Current performance snapshot
   * GET /metrics/current
   */
  @Get('current')
  async getCurrentMetrics() {
    return this.metricsService.getCurrentSnapshot();
  }

  /**
   * Metrics history
   * GET /metrics/history?hours=24
   */
  @Get('history')
  async getMetricsHistory() {
    return this.metricsService.getMetricsHistory(24);
  }

  /**
   * Query pattern analysis
   * GET /metrics/query-analysis
   */
  @Get('query-analysis')
  async getQueryAnalysis() {
    return this.metricsService.analyzeQueryPatterns();
  }

  /**
   * Prometheus metrics endpoint
   * GET /metrics/prometheus
   */
  @Get('prometheus')
  async getPrometheusMetrics() {
    return this.metricsService.generatePrometheusMetrics();
  }

  /**
   * Slow query log
   * GET /metrics/slow-queries
   */
  @Get('slow-queries')
  async getSlowQueries() {
    return this.metricsService.getSlowQueryLog(100);
  }

  /**
   * Performance dashboard data
   * GET /metrics/dashboard
   */
  @Get('dashboard')
  async getDashboardData() {
    const [
      current,
      history,
      queryAnalysis
    ] = await Promise.all([
      this.metricsService.getCurrentSnapshot(),
      this.metricsService.getMetricsHistory(1), // Last hour
      this.metricsService.analyzeQueryPatterns()
    ]);

    return {
      current,
      trends: {
        queryCount: history.map(h => ({ timestamp: h.timestamp, value: h.queryMetrics.totalQueries })),
        responseTime: history.map(h => ({ timestamp: h.timestamp, value: h.queryMetrics.averageExecutionTime })),
        errorRate: history.map(h => ({ timestamp: h.timestamp, value: h.queryMetrics.errorRate })),
        cacheHitRate: history.map(h => ({ timestamp: h.timestamp, value: h.queryMetrics.cacheHitRate }))
      },
      analysis: queryAnalysis
    };
  }
}

// ===== Usage Examples =====

/**
 * Example integration with monitoring platforms
 */
export const MONITORING_INTEGRATION_EXAMPLE = `
// Prometheus scraping configuration
// prometheus.yml
scrape_configs:
  - job_name: 'neo4j-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics/prometheus'
    scrape_interval: 30s

// Grafana dashboard configuration
// grafana-dashboard.json
{
  "dashboard": {
    "title": "Neo4j Application Metrics",
    "panels": [
      {
        "title": "Query Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "neo4j_query_duration_ms",
            "legendFormat": "Avg Response Time"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "neo4j_cache_hit_rate_percent",
            "legendFormat": "Cache Hit %"
          }
        ]
      }
    ]
  }
}

// DataDog integration (if using DataDog)
import { DogStatsD } from 'hot-shots';

export class DataDogMetricsExporter {
  private datadog = new DogStatsD();

  exportMetrics(snapshot: PerformanceSnapshot) {
    this.datadog.gauge('neo4j.query.avg_time', snapshot.queryMetrics.averageExecutionTime);
    this.datadog.gauge('neo4j.cache.hit_rate', snapshot.queryMetrics.cacheHitRate);
    this.datadog.gauge('neo4j.pool.utilization', snapshot.connectionMetrics.utilizationPercentage);
    this.datadog.gauge('business.users.total', snapshot.businessMetrics.totalUsers);
  }
}
`;
