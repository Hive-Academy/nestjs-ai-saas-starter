import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IExecutableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for monitoring operations
 */
export interface MonitoringConfig {
  enabled?: boolean;
  /** Metrics collection settings */
  metrics?: {
    /** Enable metrics collection */
    enabled?: boolean;
    /** Metrics collection interval in milliseconds */
    interval?: number;
    /** Custom metrics to track */
    customMetrics?: string[];
  };
  /** Alerting configuration */
  alerting?: {
    /** Enable alerting */
    enabled?: boolean;
    /** Alert thresholds */
    thresholds?: {
      errorRate?: number;
      responseTime?: number;
      memoryUsage?: number;
    };
    /** Alert destinations */
    destinations?: Array<{
      type: 'email' | 'webhook' | 'slack';
      endpoint: string;
    }>;
  };
  /** Logging configuration */
  logging?: {
    /** Log level */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** Enable structured logging */
    structured?: boolean;
    /** Include request tracing */
    tracing?: boolean;
  };
  /** Dashboard settings */
  dashboard?: {
    /** Enable dashboard */
    enabled?: boolean;
    /** Dashboard port */
    port?: number;
    /** Refresh interval in seconds */
    refreshInterval?: number;
  };
}

/**
 * Result of monitoring operations
 */
export interface MonitoringResult {
  /** Monitoring session ID */
  id: string;
  /** Operation type */
  type: 'setup' | 'tracking' | 'alert' | 'metrics';
  /** Current status */
  status: 'active' | 'inactive' | 'error';
  /** Monitoring data */
  data: {
    /** Metrics collected */
    metrics?: Record<string, any>;
    /** Active alerts */
    alerts?: Array<{
      id: string;
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: Date;
    }>;
    /** Performance data */
    performance?: {
      responseTime: number;
      throughput: number;
      errorRate: number;
      memoryUsage: number;
    };
  };
  /** Setup timestamp */
  setupAt: Date;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Metrics data structure
 */
export interface MetricsData {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Metric unit */
  unit?: string;
  /** Metric labels */
  labels?: Record<string, string>;
  /** Timestamp */
  timestamp: Date;
  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

/**
 * Alert condition structure
 */
export interface AlertCondition {
  /** Condition name */
  name: string;
  /** Metric to monitor */
  metric: string;
  /** Comparison operator */
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  /** Threshold value */
  threshold: number;
  /** Time window in minutes */
  timeWindow?: number;
}

/**
 * Alert action structure
 */
export interface AlertAction {
  /** Action type */
  type: 'email' | 'webhook' | 'slack' | 'log';
  /** Action configuration */
  config: Record<string, any>;
  /** Action name */
  name?: string;
}

/**
 * Workflow tracking request
 */
export interface WorkflowTrackingRequest {
  /** Workflow ID to track */
  workflowId: string;
  /** Tracking options */
  options?: {
    /** Include performance metrics */
    includePerformance?: boolean;
    /** Include custom metrics */
    includeCustomMetrics?: boolean;
    /** Track intermediate steps */
    trackSteps?: boolean;
  };
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise monitoring module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized monitoring module without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing monitoring APIs
 * - Delegates to enterprise-grade monitoring module when available
 * - Provides fallback to console logging when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class MonitoringAdapter
  extends BaseModuleAdapter<MonitoringConfig, MonitoringResult>
  implements
    ICreatableAdapter<MonitoringConfig, MonitoringResult>,
    IExecutableAdapter<WorkflowTrackingRequest, MonitoringResult>
{
  protected readonly serviceName = 'monitoring';

  constructor(
    @Optional()
    @Inject('MonitoringFacadeService')
    private readonly monitoringFacade?: any,
    @Optional()
    @Inject('MetricsCollectorService')
    private readonly metricsCollector?: any
  ) {
    super();
  }

  /**
   * Setup monitoring infrastructure - delegates to enterprise module if available
   * Falls back to console logging when enterprise module not installed
   */
  async create(config: MonitoringConfig): Promise<MonitoringResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('Monitoring is not enabled');
    }

    // Try enterprise monitoring module first
    if (this.monitoringFacade) {
      this.logEnterpriseUsage('monitoring setup');
      try {
        const result = await this.monitoringFacade.setupMetrics(config);
        return {
          id: result.sessionId,
          type: 'setup',
          status: 'active',
          data: {
            metrics: result.metrics,
            performance: result.initialPerformance,
          },
          setupAt: new Date(),
          lastUpdated: new Date(),
        };
      } catch (error) {
        this.logger.warn(
          'Enterprise monitoring module failed, falling back to console logging:',
          error
        );
        return this.createFallbackMonitoring(config);
      }
    }

    // Try metrics collector
    if (this.metricsCollector) {
      this.logger.log('Using metrics collector via adapter');
      try {
        const result = await this.metricsCollector.setup(config);
        return {
          id: result.id,
          type: 'setup',
          status: 'active',
          data: {
            metrics: result.metrics,
          },
          setupAt: new Date(),
          lastUpdated: new Date(),
        };
      } catch (error) {
        this.logger.warn(
          'Metrics collector failed, falling back to console logging:',
          error
        );
        return this.createFallbackMonitoring(config);
      }
    }

    // Fallback to console logging
    this.logFallbackUsage(
      'monitoring setup',
      'no enterprise services available - using console logging'
    );
    return this.createFallbackMonitoring(config);
  }

  /**
   * Execute workflow tracking
   */
  async execute(request: WorkflowTrackingRequest): Promise<MonitoringResult> {
    // Try enterprise monitoring facade first
    if (this.monitoringFacade) {
      this.logEnterpriseUsage('workflow tracking');
      try {
        const result = await this.monitoringFacade.trackWorkflow(
          request.workflowId,
          request.options
        );
        return {
          id: `tracking-${Date.now()}`,
          type: 'tracking',
          status: 'active',
          data: {
            metrics: result.metrics,
            performance: result.performance,
          },
          setupAt: new Date(),
          lastUpdated: new Date(),
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'workflow tracking');
      }
    }

    // Try metrics collector
    if (this.metricsCollector) {
      this.logger.log('Using metrics collector for workflow tracking');
      try {
        const result = await this.metricsCollector.track(request);
        return {
          id: `tracking-${Date.now()}`,
          type: 'tracking',
          status: 'active',
          data: {
            metrics: result.metrics,
          },
          setupAt: new Date(),
          lastUpdated: new Date(),
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow tracking via metrics collector'
        );
      }
    }

    // Basic tracking with console output
    this.logFallbackUsage('workflow tracking', 'using basic console logging');
    this.logger.log(`Tracking workflow: ${request.workflowId}`);

    return {
      id: `basic-${Date.now()}`,
      type: 'tracking',
      status: 'active',
      data: {
        metrics: {
          workflowId: request.workflowId,
          startTime: new Date(),
          basicTracking: true,
        },
      },
      setupAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Create alert condition
   */
  async createAlert(
    condition: AlertCondition,
    action: AlertAction
  ): Promise<MonitoringResult> {
    if (this.monitoringFacade) {
      this.logEnterpriseUsage('alert creation');
      try {
        const result = await this.monitoringFacade.createAlert(
          condition,
          action
        );
        return {
          id: result.alertId,
          type: 'alert',
          status: 'active',
          data: {
            alerts: [result.alert],
          },
          setupAt: new Date(),
          lastUpdated: new Date(),
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'alert creation');
      }
    }

    if (this.metricsCollector) {
      try {
        const result = await this.metricsCollector.createAlert(
          condition,
          action
        );
        return {
          id: result.id,
          type: 'alert',
          status: 'active',
          data: {
            alerts: [result],
          },
          setupAt: new Date(),
          lastUpdated: new Date(),
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'alert creation via metrics collector'
        );
      }
    }

    throw new Error('Alert creation requires enterprise monitoring module');
  }

  /**
   * Get current metrics for a time range
   */
  async getMetrics(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<MetricsData[]> {
    if (this.monitoringFacade) {
      try {
        return await this.monitoringFacade.getMetrics(timeRange);
      } catch (error) {
        this.logger.warn('Failed to get metrics:', error);
        return [];
      }
    }

    if (this.metricsCollector) {
      try {
        return await this.metricsCollector.getMetrics(timeRange);
      } catch (error) {
        this.logger.warn('Failed to get metrics via collector:', error);
        return [];
      }
    }

    return [];
  }

  /**
   * Record custom metric
   */
  async recordMetric(metric: MetricsData): Promise<void> {
    if (this.monitoringFacade) {
      try {
        await this.monitoringFacade.recordMetric(metric);
      } catch (error) {
        this.logger.warn('Failed to record metric:', error);
      }
      return;
    }

    if (this.metricsCollector) {
      try {
        await this.metricsCollector.record(metric);
      } catch (error) {
        this.logger.warn('Failed to record metric via collector:', error);
      }
      return;
    }

    // Fallback to logging
    this.logger.log(
      `Metric: ${metric.name} = ${metric.value} ${metric.unit || ''}`
    );
  }

  /**
   * Create fallback monitoring result
   */
  private createFallbackMonitoring(config: MonitoringConfig): MonitoringResult {
    return {
      id: `fallback-${Date.now()}`,
      type: 'setup',
      status: 'active',
      data: {
        metrics: {
          fallbackMode: true,
          consoleLogging: true,
          config,
        },
        performance: {
          responseTime: 0,
          throughput: 0,
          errorRate: 0,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        },
      },
      setupAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Check if enterprise monitoring module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.monitoringFacade;
  }

  /**
   * Check if metrics collector is available
   */
  isMetricsCollectorAvailable(): boolean {
    return !!this.metricsCollector;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const metricsCollectorAvailable = this.isMetricsCollectorAvailable();
    const fallbackMode = !enterpriseAvailable && !metricsCollectorAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('console_logging', 'basic_metrics');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_monitoring',
        'advanced_metrics',
        'alerting',
        'dashboard',
        'performance_tracking',
        'custom_metrics',
        'structured_logging',
        'request_tracing'
      );
    }

    if (metricsCollectorAvailable) {
      capabilities.push('metrics_collector', 'metric_recording');
    }

    return {
      enterpriseAvailable,
      metricsCollectorAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createMonitoringProvider(): MonitoringAdapter {
  return new MonitoringAdapter();
}
