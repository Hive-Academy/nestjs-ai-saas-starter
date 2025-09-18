# Monitoring Module - User Manual

## Overview

The **@hive-academy/langgraph-monitoring** module provides enterprise-grade observability and performance monitoring for LangGraph workflows, enabling real-time metrics collection, intelligent alerting, comprehensive health checks, and production-ready dashboard capabilities.

**Key Features:**

- **Real-Time Metrics Collection** - Counters, gauges, histograms, and timers with batch processing
- **Intelligent Alerting** - Rule-based alerts with multi-channel notifications and cooldown management
- **Health Check System** - Comprehensive service health monitoring with dependency tracking
- **Performance Tracking** - Anomaly detection, baseline analysis, and resource utilization monitoring
- **Dashboard & Visualization** - Real-time dashboards with customizable widgets and data export
- **Production-Ready** - Circuit breakers, fallback mechanisms, and failure-safe operations

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-monitoring
```

```typescript
import { Module } from '@nestjs/common';
import { MonitoringModule } from '@hive-academy/langgraph-monitoring';

@Module({
  imports: [
    MonitoringModule.forRoot({
      enabled: true,
      metrics: {
        backend: 'prometheus',
        batchSize: 100,
        flushInterval: 30000,
        maxBufferSize: 10000,
        defaultTags: { service: 'my-app', environment: 'production' },
      },
      alerting: {
        enabled: true,
        evaluationInterval: 30000,
        defaultCooldown: 300000,
        channels: [
          { type: 'slack', name: 'alerts', config: { webhook: process.env.SLACK_WEBHOOK } },
          { type: 'email', name: 'critical', config: { smtp: process.env.SMTP_CONFIG } },
        ],
      },
      healthChecks: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3,
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### MonitoringFacadeService - Primary Interface

**Central orchestrator** for all monitoring operations with failure-safe design:

```typescript
// Metric recording operations
recordMetric(name: string, value: number, tags?: MetricTags): Promise<void>
recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void>
recordCounter(name: string, increment?: number, tags?: MetricTags): Promise<void>
recordGauge(name: string, value: number, tags?: MetricTags): Promise<void>
recordHistogram(name: string, value: number, tags?: MetricTags): Promise<void>

// Health check operations
registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void>
getSystemHealth(): Promise<HealthStatus>
getServiceHealth(serviceName: string): Promise<ServiceHealth>

// Alert management
createAlertRule(rule: AlertRule): Promise<string>
updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>
getActiveAlerts(): Promise<Alert[]>
```

### Complete Production Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { MonitoringFacadeService, AlertRule } from '@hive-academy/langgraph-monitoring';

interface WorkflowMetrics {
  executionTime: number;
  nodeCount: number;
  memoryUsage: number;
  success: boolean;
  errorType?: string;
}

@Injectable()
export class ProductionWorkflowMonitoringService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async initializeProductionMonitoring(): Promise<void> {
    // Register health checks for critical dependencies
    await this.monitoring.registerHealthCheck('database', async () => {
      try {
        await this.testDatabaseConnection();
        return { healthy: true, responseTime: 50 };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    });

    await this.monitoring.registerHealthCheck('external-api', async () => {
      const startTime = Date.now();
      try {
        await this.pingExternalAPI();
        return { healthy: true, responseTime: Date.now() - startTime };
      } catch (error) {
        return { healthy: false, error: error.message, degraded: true };
      }
    });

    // Create critical alert rules
    const criticalErrorRule: AlertRule = {
      id: 'workflow-critical-errors',
      name: 'Workflow Critical Error Rate',
      description: 'Alert when workflow error rate exceeds 5%',
      condition: {
        metric: 'workflow.error_rate',
        operator: 'gt',
        threshold: 0.05,
        timeWindow: 300000, // 5 minutes
        aggregation: 'avg',
        evaluationWindow: 60000, // 1 minute
      },
      severity: 'critical',
      channels: [
        { type: 'slack', name: 'alerts', config: {}, enabled: true },
        { type: 'email', name: 'critical', config: {}, enabled: true },
      ],
      cooldownPeriod: 900000, // 15 minutes
      enabled: true,
      metadata: { team: 'platform', priority: 'high' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.monitoring.createAlertRule(criticalErrorRule);

    console.log('Production monitoring initialized with health checks and alert rules');
  }

  async trackWorkflowExecution(workflowName: string, threadId: string, execution: WorkflowMetrics): Promise<void> {
    const tags = {
      workflow_name: workflowName,
      thread_id: threadId,
      success: execution.success.toString(),
      environment: 'production',
    };

    // Record execution metrics
    await Promise.all([this.monitoring.recordTimer('workflow.execution.duration', execution.executionTime, tags), this.monitoring.recordGauge('workflow.execution.nodes', execution.nodeCount, tags), this.monitoring.recordGauge('workflow.execution.memory_mb', execution.memoryUsage / 1024 / 1024, tags), this.monitoring.recordCounter('workflow.executions.total', 1, tags)]);

    // Record success/error metrics
    if (execution.success) {
      await this.monitoring.recordCounter('workflow.executions.success', 1, tags);
    } else {
      await this.monitoring.recordCounter('workflow.executions.error', 1, {
        ...tags,
        error_type: execution.errorType || 'unknown',
      });

      // Calculate and record error rate
      const errorRate = await this.calculateErrorRate(workflowName);
      await this.monitoring.recordGauge('workflow.error_rate', errorRate, {
        workflow_name: workflowName,
      });
    }

    // Track performance anomalies
    await this.detectPerformanceAnomalies(workflowName, execution);
  }

  private async calculateErrorRate(workflowName: string): Promise<number> {
    // In production, this would query your metrics backend
    // For this example, we'll simulate error rate calculation
    const totalExecutions = 100; // Would come from metrics query
    const errorCount = 5; // Would come from metrics query
    return errorCount / totalExecutions;
  }

  private async detectPerformanceAnomalies(workflowName: string, execution: WorkflowMetrics): Promise<void> {
    // Detect execution time anomalies
    const avgExecutionTime = 5000; // Would come from baseline calculation
    if (execution.executionTime > avgExecutionTime * 3) {
      await this.monitoring.recordCounter('workflow.anomalies.slow_execution', 1, {
        workflow_name: workflowName,
        severity: 'high',
        deviation: (execution.executionTime / avgExecutionTime - 1).toFixed(2),
      });
    }

    // Detect memory usage spikes
    const avgMemoryUsage = 50 * 1024 * 1024; // 50MB baseline
    if (execution.memoryUsage > avgMemoryUsage * 2) {
      await this.monitoring.recordCounter('workflow.anomalies.high_memory', 1, {
        workflow_name: workflowName,
        severity: execution.memoryUsage > avgMemoryUsage * 5 ? 'critical' : 'medium',
      });
    }
  }

  async generateHealthReport(): Promise<HealthReport> {
    const systemHealth = await this.monitoring.getSystemHealth();
    const activeAlerts = await this.monitoring.getActiveAlerts();

    return {
      overall: systemHealth.overall,
      timestamp: new Date(),
      services: systemHealth.services,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical').length,
      uptime: systemHealth.uptime,
      recommendations: this.generateHealthRecommendations(systemHealth, activeAlerts),
    };
  }

  private generateHealthRecommendations(health: HealthStatus, alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    if (health.overall === 'unhealthy') {
      recommendations.push('Immediate attention required - system is unhealthy');
    }

    if (alerts.filter((a) => a.severity === 'critical').length > 0) {
      recommendations.push('Address critical alerts immediately');
    }

    const degradedServices = Object.entries(health.services)
      .filter(([, service]) => service.state === 'degraded')
      .map(([name]) => name);

    if (degradedServices.length > 0) {
      recommendations.push(`Monitor degraded services: ${degradedServices.join(', ')}`);
    }

    return recommendations;
  }

  private async testDatabaseConnection(): Promise<void> {
    // Simulate database health check
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private async pingExternalAPI(): Promise<void> {
    // Simulate external API health check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
```

## Configuration

### Basic Configuration

```typescript
MonitoringModule.forRoot({
  enabled: true,
  metrics: {
    backend: 'memory',
    batchSize: 50,
    flushInterval: 30000,
  },
  alerting: {
    enabled: true,
    evaluationInterval: 30000,
  },
  healthChecks: {
    enabled: true,
    interval: 30000,
  },
});
```

### Production Configuration

```typescript
MonitoringModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    enabled: configService.get('MONITORING_ENABLED', true),
    metrics: {
      backend: configService.get('METRICS_BACKEND', 'prometheus'),
      batchSize: configService.get('METRICS_BATCH_SIZE', 100),
      flushInterval: configService.get('METRICS_FLUSH_INTERVAL', 30000),
      maxBufferSize: configService.get('METRICS_BUFFER_SIZE', 10000),
      retention: configService.get('METRICS_RETENTION', '7d'),
      defaultTags: {
        service: configService.get('SERVICE_NAME', 'unknown'),
        environment: configService.get('NODE_ENV', 'development'),
        version: configService.get('APP_VERSION', '1.0.0'),
      },
    },
    alerting: {
      enabled: configService.get('ALERTING_ENABLED', true),
      evaluationInterval: configService.get('ALERT_EVALUATION_INTERVAL', 30000),
      defaultCooldown: configService.get('ALERT_DEFAULT_COOLDOWN', 300000),
      channels: [
        {
          type: 'slack',
          name: 'production-alerts',
          config: { webhook: configService.get('SLACK_WEBHOOK_URL') },
          enabled: true,
        },
        {
          type: 'email',
          name: 'critical-alerts',
          config: {
            smtp: {
              host: configService.get('SMTP_HOST'),
              port: configService.get('SMTP_PORT', 587),
              auth: {
                user: configService.get('SMTP_USER'),
                pass: configService.get('SMTP_PASS'),
              },
            },
          },
          enabled: true,
        },
      ],
    },
    healthChecks: {
      enabled: configService.get('HEALTH_CHECKS_ENABLED', true),
      interval: configService.get('HEALTH_CHECK_INTERVAL', 30000),
      timeout: configService.get('HEALTH_CHECK_TIMEOUT', 5000),
      retries: configService.get('HEALTH_CHECK_RETRIES', 3),
      gracefulShutdownTimeout: configService.get('HEALTH_GRACEFUL_SHUTDOWN', 30000),
    },
    performance: {
      trackingEnabled: configService.get('PERFORMANCE_TRACKING', true),
      anomalyDetection: configService.get('ANOMALY_DETECTION', true),
      baselineWindow: configService.get('BASELINE_WINDOW', '7d'),
      sensitivityThreshold: configService.get('ANOMALY_SENSITIVITY', 2.0),
      minSamples: configService.get('MIN_SAMPLES', 100),
    },
  }),
  inject: [ConfigService],
});
```

## Core Interfaces

### Monitoring Types

```typescript
interface MetricTags {
  readonly [key: string]: string | number | boolean;
}

interface Metric {
  readonly name: string;
  readonly type: 'counter' | 'gauge' | 'histogram' | 'timer' | 'summary';
  readonly value: number;
  readonly tags: MetricTags;
  readonly timestamp: Date;
  readonly unit?: string;
}

interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly condition: AlertCondition;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly channels: readonly NotificationChannel[];
  readonly cooldownPeriod: number;
  readonly enabled: boolean;
}

interface HealthStatus {
  readonly overall: 'healthy' | 'degraded' | 'unhealthy';
  readonly services: Record<string, ServiceHealth>;
  readonly timestamp: Date;
  readonly uptime: number;
}
```

### Service Interfaces

```typescript
interface IMonitoringFacade {
  recordMetric(name: string, value: number, tags?: MetricTags): Promise<void>;
  recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void>;
  registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void>;
  getSystemHealth(): Promise<HealthStatus>;
  createAlertRule(rule: AlertRule): Promise<string>;
  queryMetrics(query: MetricQuery): Promise<MetricData[]>;
}

type HealthCheckFunction = () => Promise<boolean | DetailedHealthCheckResult>;

interface DetailedHealthCheckResult {
  healthy: boolean;
  degraded?: boolean;
  responseTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

## Error Handling

```typescript
import { MetricsCollectionError, AlertingError, HealthCheckError } from '@hive-academy/langgraph-monitoring';

@Injectable()
export class RobustMonitoringService {
  constructor(private readonly monitoring: MonitoringFacadeService) {}

  async safeRecordMetric(name: string, value: number, tags?: MetricTags): Promise<void> {
    try {
      await this.monitoring.recordMetric(name, value, tags);
    } catch (error) {
      if (error instanceof MetricsCollectionError) {
        this.logger.warn('Metrics collection failed, continuing execution:', error.message);
        // Don't throw - monitoring failures should not break business logic
      } else {
        this.logger.error('Unexpected monitoring error:', error);
      }
    }
  }

  async safeHealthCheck(serviceName: string): Promise<ServiceHealth | null> {
    try {
      return await this.monitoring.getServiceHealth(serviceName);
    } catch (error) {
      if (error instanceof HealthCheckError) {
        this.logger.warn(`Health check failed for ${serviceName}:`, error.message);
        return null;
      }
      throw error;
    }
  }

  async safeCreateAlert(rule: AlertRule): Promise<string | null> {
    try {
      return await this.monitoring.createAlertRule(rule);
    } catch (error) {
      if (error instanceof AlertingError) {
        this.logger.error('Alert rule creation failed:', error.message);
        return null;
      }
      throw error;
    }
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { MonitoringModule, MonitoringFacadeService } from '@hive-academy/langgraph-monitoring';

describe('MonitoringFacadeService', () => {
  let service: MonitoringFacadeService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        MonitoringModule.forRoot({
          enabled: true,
          metrics: { backend: 'memory', batchSize: 10 },
          alerting: { enabled: false },
          healthChecks: { enabled: true, interval: 10000 },
        }),
      ],
    }).compile();

    service = module.get<MonitoringFacadeService>(MonitoringFacadeService);
  });

  it('should record metrics without throwing', async () => {
    await expect(service.recordCounter('test.counter', 1, { test: true })).resolves.not.toThrow();
    await expect(service.recordGauge('test.gauge', 50)).resolves.not.toThrow();
    await expect(service.recordTimer('test.timer', 1000)).resolves.not.toThrow();
  });

  it('should register and check health', async () => {
    await service.registerHealthCheck('test-service', async () => ({
      healthy: true,
      responseTime: 10,
    }));

    const health = await service.getServiceHealth('test-service');
    expect(health.state).toBe('healthy');
  });

  it('should create alert rules', async () => {
    const rule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      description: 'Test alert rule',
      condition: {
        metric: 'test.metric',
        operator: 'gt',
        threshold: 100,
        timeWindow: 60000,
        aggregation: 'avg',
        evaluationWindow: 30000,
      },
      severity: 'warning',
      channels: [],
      cooldownPeriod: 300000,
      enabled: true,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ruleId = await service.createAlertRule(rule);
    expect(ruleId).toBe('test-rule');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage from Metric Buffering

```typescript
// Solution: Configure smaller batch sizes and frequent flushing
const config = {
  metrics: {
    batchSize: 50, // Smaller batches
    flushInterval: 10000, // More frequent flushing (10s)
    maxBufferSize: 1000, // Smaller buffer limit
  },
};
```

#### 2. Alert Spam from Noisy Metrics

```typescript
// Solution: Implement longer cooldowns and aggregation windows
const alertRule: AlertRule = {
  condition: {
    metric: 'noisy.metric',
    timeWindow: 300000, // 5 minute window
    aggregation: 'avg', // Use average to smooth spikes
    evaluationWindow: 120000, // 2 minute evaluation
  },
  cooldownPeriod: 900000, // 15 minute cooldown
};
```

#### 3. Health Check Timeouts

```typescript
// Solution: Increase timeouts and implement circuit breakers
await monitoring.registerHealthCheck('slow-service', async () => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 8000));

  const check = this.performHealthCheck();

  try {
    await Promise.race([check, timeout]);
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message, degraded: true };
  }
});
```

This comprehensive monitoring module provides production-grade observability with intelligent alerting, health monitoring, and performance tracking capabilities for enterprise LangGraph AI applications.
