import { Module, DynamicModule, Global } from '@nestjs/common';
import { MonitoringFacadeService } from '../core/monitoring-facade.service';
import { MetricsCollectorService } from '../services/metrics-collector.service';
import { AlertingService } from '../services/alerting.service';
import { HealthCheckService } from '../services/health-check.service';
import { PerformanceTrackerService } from '../services/performance-tracker.service';
import { DashboardService } from '../services/dashboard.service';
import { MetricsProvider } from '../providers/metrics.provider';
import { TraceProvider } from '../providers/trace.provider';
import { MonitoringConfig } from '../interfaces/monitoring.interface';

/**
 * LangGraph Monitoring Module
 * 
 * Provides comprehensive monitoring capabilities:
 * - Metrics collection and aggregation
 * - Rule-based alerting with multi-channel notifications
 * - Health monitoring with dependency validation
 * - Performance tracking with anomaly detection
 * - Dashboard data aggregation and visualization
 * - Event-driven monitoring integration
 */
@Global()
@Module({})
export class LanggraphModulesMonitoringModule {
  /**
   * Configure monitoring module synchronously
   */
  static forRoot(config?: Partial<MonitoringConfig>): DynamicModule {
    const defaultConfig: MonitoringConfig = {
      enabled: true,
      metrics: {
        backend: 'memory',
        batchSize: 100,
        flushInterval: 30000,
        maxBufferSize: 10000,
        retention: '24h',
        defaultTags: {
          service: 'langgraph-monitoring',
          environment: process.env.NODE_ENV || 'development',
        },
      },
      alerting: {
        enabled: true,
        evaluationInterval: 30000,
        defaultCooldown: 300000, // 5 minutes
        channels: [],
        escalationPolicies: [],
      },
      healthChecks: {
        enabled: true,
        interval: 60000, // 1 minute
        timeout: 5000,   // 5 seconds
        retries: 3,
        gracefulShutdownTimeout: 30000,
      },
      performance: {
        trackingEnabled: true,
        anomalyDetection: true,
        baselineWindow: '1h',
        sensitivityThreshold: 2.5,
        minSamples: 30,
      },
      dashboard: {
        id: 'default',
        name: 'Default Dashboard',
        description: 'Default monitoring dashboard',
        widgets: [],
        refreshInterval: 30000,
        timeRange: {
          start: new Date(Date.now() - 3600000), // 1 hour ago
          end: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const mergedConfig = { ...defaultConfig, ...config };

    return {
      module: LanggraphModulesMonitoringModule,
      providers: [
        {
          provide: 'MONITORING_CONFIG',
          useValue: mergedConfig,
        },
        // Core services
        MetricsCollectorService,
        AlertingService,
        HealthCheckService,
        PerformanceTrackerService,
        DashboardService,
        
        // Facade service
        MonitoringFacadeService,
        
        // Legacy providers (for backward compatibility)
        MetricsProvider,
        TraceProvider,
      ],
      exports: [
        'MONITORING_CONFIG',
        MonitoringFacadeService,
        MetricsCollectorService,
        AlertingService,
        HealthCheckService,
        PerformanceTrackerService,
        DashboardService,
        MetricsProvider,
        TraceProvider,
      ],
    };
  }

  /**
   * Configure monitoring module asynchronously
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => MonitoringConfig | Promise<MonitoringConfig>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: LanggraphModulesMonitoringModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'MONITORING_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        // Core services
        MetricsCollectorService,
        AlertingService,
        HealthCheckService,
        PerformanceTrackerService,
        DashboardService,
        
        // Facade service
        MonitoringFacadeService,
        
        // Legacy providers
        MetricsProvider,
        TraceProvider,
      ],
      exports: [
        'MONITORING_CONFIG',
        MonitoringFacadeService,
        MetricsCollectorService,
        AlertingService,
        HealthCheckService,
        PerformanceTrackerService,
        DashboardService,
        MetricsProvider,
        TraceProvider,
      ],
    };
  }
}
