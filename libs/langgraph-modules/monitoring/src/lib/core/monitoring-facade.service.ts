import { Injectable, Logger } from '@nestjs/common';
import type {
  IMonitoringFacade,
  IMetricsCollector,
  IAlertingService,
  IHealthCheck,
  IPerformanceTracker,
  IDashboard,
  MetricTags,
  AlertRule,
  Alert,
  HealthStatus,
  ServiceHealth,
  HealthCheckFunction,
  MetricQuery,
  MetricData,
  DashboardConfig,
  DashboardData,
} from '../interfaces/monitoring.interface';

/**
 * MonitoringFacadeService - Unified interface for all monitoring operations
 * 
 * Implements the Facade pattern to provide a single entry point for:
 * - Metrics collection and querying
 * - Alerting management
 * - Health monitoring
 * - Performance tracking
 * - Dashboard operations
 * 
 * Critical Design Principle: Monitoring failures MUST NOT break workflows
 */
@Injectable()
export class MonitoringFacadeService implements IMonitoringFacade {
  private readonly logger = new Logger(MonitoringFacadeService.name);

  constructor(
    private readonly metricsCollector: IMetricsCollector,
    private readonly alertingService: IAlertingService,
    private readonly healthCheck: IHealthCheck,
    private readonly performanceTracker: IPerformanceTracker,
    private readonly dashboardService: IDashboard,
  ) {
    this.logger.log('MonitoringFacadeService initialized');
  }

  // ================================
  // METRICS OPERATIONS
  // ================================

  async recordMetric(name: string, value: number, tags?: MetricTags): Promise<void> {
    await this.safeOperation(
      async () => {
        await this.metricsCollector.collect(name, value, tags);
        // Track the metric collection performance
        await this.performanceTracker.trackExecution(`metrics.collection.${name}`, 1, { value, tags });
      },
      `recordMetric(${name}, ${value})`
    );
  }

  async recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void> {
    const timerTags = { ...tags, metric_type: 'timer' };
    await this.safeOperation(
      () => this.metricsCollector.collect(name, duration, timerTags),
      `recordTimer(${name}, ${duration}ms)`
    );
  }

  async recordCounter(name: string, increment = 1, tags?: MetricTags): Promise<void> {
    const counterTags = { ...tags, metric_type: 'counter' };
    await this.safeOperation(
      () => this.metricsCollector.collect(name, increment, counterTags),
      `recordCounter(${name}, ${increment})`
    );
  }

  async recordGauge(name: string, value: number, tags?: MetricTags): Promise<void> {
    const gaugeTags = { ...tags, metric_type: 'gauge' };
    await this.safeOperation(
      () => this.metricsCollector.collect(name, value, gaugeTags),
      `recordGauge(${name}, ${value})`
    );
  }

  async recordHistogram(name: string, value: number, tags?: MetricTags): Promise<void> {
    const histogramTags = { ...tags, metric_type: 'histogram' };
    await this.safeOperation(
      () => this.metricsCollector.collect(name, value, histogramTags),
      `recordHistogram(${name}, ${value})`
    );
  }

  // ================================
  // HEALTH CHECK OPERATIONS
  // ================================

  async registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void> {
    await this.safeOperation(
      () => this.healthCheck.register(name, check),
      `registerHealthCheck(${name})`
    );
  }

  async getSystemHealth(): Promise<HealthStatus> {
    return this.safeOperationWithFallback(
      () => this.healthCheck.getSystemHealth(),
      this.createFallbackHealthStatus(),
      'getSystemHealth()'
    );
  }

  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    return this.safeOperationWithFallback(
      () => this.healthCheck.check(serviceName),
      this.createFallbackServiceHealth(),
      `getServiceHealth(${serviceName})`
    );
  }

  // ================================
  // ALERT OPERATIONS
  // ================================

  async createAlertRule(rule: AlertRule): Promise<string> {
    const ruleId = await this.safeOperationWithFallback(
      async () => {
        const id = await this.alertingService.createRule(rule);
        // Record metric for alert rule creation
        await this.recordCounter('monitoring.alert_rules.created', 1, {
          rule_name: rule.name,
          severity: rule.severity,
        });
        return id;
      },
      rule.id,
      `createAlertRule(${rule.name})`
    );
    
    return ruleId;
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    await this.safeOperation(
      async () => {
        await this.alertingService.updateRule(ruleId, updates);
        await this.recordCounter('monitoring.alert_rules.updated', 1, {
          rule_id: ruleId,
        });
      },
      `updateAlertRule(${ruleId})`
    );
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    await this.safeOperation(
      async () => {
        await this.alertingService.deleteRule(ruleId);
        await this.recordCounter('monitoring.alert_rules.deleted', 1, {
          rule_id: ruleId,
        });
      },
      `deleteAlertRule(${ruleId})`
    );
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return this.safeOperationWithFallback(
      () => this.alertingService.getActiveAlerts(),
      [],
      'getActiveAlerts()'
    );
  }

  // ================================
  // QUERY OPERATIONS
  // ================================

  async queryMetrics(query: MetricQuery): Promise<MetricData[]> {
    return this.safeOperationWithFallback(
      async () => {
        const startTime = Date.now();
        const results = await this.dashboardService.queryMetrics(query);
        const duration = Date.now() - startTime;
        
        await this.recordTimer('monitoring.query.duration', duration, {
          metric: query.metric,
          aggregation: query.aggregation,
        });
        
        return results;
      },
      [],
      `queryMetrics(${query.metric})`
    );
  }

  async getDashboardData(dashboardId: string): Promise<DashboardData> {
    return this.safeOperationWithFallback(
      () => this.dashboardService.getDashboardData(dashboardId),
      this.createFallbackDashboardData(dashboardId),
      `getDashboardData(${dashboardId})`
    );
  }

  async createDashboard(config: DashboardConfig): Promise<string> {
    return this.safeOperationWithFallback(
      async () => {
        const id = await this.dashboardService.createDashboard(config);
        await this.recordCounter('monitoring.dashboards.created', 1, {
          dashboard_name: config.name,
        });
        return id;
      },
      config.id,
      `createDashboard(${config.name})`
    );
  }

  // ================================
  // CONFIGURATION MANAGEMENT
  // ================================

  /**
   * Update monitoring configuration
   */
  async updateConfiguration(config: {
    metrics?: { batchSize?: number; flushInterval?: number };
    alerting?: { evaluationInterval?: number };
    healthChecks?: { interval?: number; timeout?: number };
    performance?: { trackingEnabled?: boolean; anomalyDetection?: boolean };
  }): Promise<void> {
    return this.safeOperation(async () => {
      this.logger.log('Updating monitoring configuration', {
        hasMetricsConfig: !!config.metrics,
        hasAlertingConfig: !!config.alerting,
        hasHealthConfig: !!config.healthChecks,
        hasPerformanceConfig: !!config.performance,
      });

      // In a real implementation, this would update the configuration
      // of the individual services. For now, we'll just log the update.
      
      if (config.metrics) {
        this.logger.debug('Metrics configuration updated', config.metrics);
      }
      
      if (config.alerting) {
        this.logger.debug('Alerting configuration updated', config.alerting);
      }
      
      if (config.healthChecks) {
        this.logger.debug('Health checks configuration updated', config.healthChecks);
      }
      
      if (config.performance) {
        this.logger.debug('Performance tracking configuration updated', config.performance);
      }

      // Record the configuration update
      await this.recordCounter('monitoring.config.updated', 1, {
        components: Object.keys(config).join(','),
      });
      
    }, 'updateConfiguration');
  }

  // ================================
  // INTERNAL HELPER METHODS
  // ================================

  /**
   * Execute operation safely - failures don't affect business logic
   */
  private async safeOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Monitoring operation failed: ${operationName}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return undefined;
    }
  }

  /**
   * Execute operation with fallback value on failure
   */
  private async safeOperationWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Monitoring operation failed, using fallback: ${operationName}`, {
        error: error instanceof Error ? error.message : String(error),
        fallback: typeof fallback,
      });
      return fallback;
    }
  }

  /**
   * Create fallback health status when health checks fail
   */
  private createFallbackHealthStatus(): HealthStatus {
    return {
      overall: 'unhealthy',
      services: {
        monitoring: {
          state: 'unhealthy',
          error: 'Health check system unavailable',
          lastCheck: new Date(),
          responseTime: 0,
        },
      },
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  /**
   * Create fallback service health when specific check fails
   */
  private createFallbackServiceHealth(): ServiceHealth {
    return {
      state: 'unhealthy',
      error: 'Service health check unavailable',
      lastCheck: new Date(),
      responseTime: 0,
    };
  }

  /**
   * Create fallback dashboard data when dashboard service fails
   */
  private createFallbackDashboardData(dashboardId: string): DashboardData {
    return {
      dashboardId,
      widgets: {},
      timestamp: new Date(),
      timeRange: {
        start: new Date(Date.now() - 60000), // Last minute
        end: new Date(),
      },
    };
  }
}