# CLAUDE.md - Monitoring Module

This file provides comprehensive guidance for working with the Monitoring Module in the LangGraph system. The monitoring module provides sophisticated observability and metrics collection for AI workflow systems in production environments.

## Business Domain: Observability & Performance Monitoring

### Core Purpose
The Monitoring Module enables **comprehensive observability** for AI agent workflows by providing real-time metrics, alerting, and performance tracking, allowing for:

- **Production Monitoring**: Real-time visibility into workflow health and performance
- **Performance Analytics**: Detailed metrics on execution times, success rates, and resource usage
- **Alerting & Notifications**: Automated alerts for failures, performance degradation, and SLA violations
- **Capacity Planning**: Resource utilization trends for infrastructure scaling decisions
- **Compliance Monitoring**: Audit trails and regulatory compliance reporting
- **Business Intelligence**: Workflow usage patterns and business metric correlation
- **Troubleshooting**: Rapid identification and diagnosis of production issues

### Key Business Value
- **Operational Excellence**: Proactive issue detection and resolution
- **SLA Compliance**: Monitor and maintain service level agreements
- **Cost Optimization**: Identify resource waste and optimization opportunities
- **Customer Experience**: Ensure consistent performance for end users
- **Business Insights**: Understand workflow usage patterns and business impact
- **Risk Mitigation**: Early warning systems for potential failures
- **Regulatory Compliance**: Maintain audit trails and compliance reporting

### Target Use Cases
- **Production AI Systems**: Monitor deployed AI workflows in production
- **SaaS Applications**: Track performance and usage metrics for customer-facing services
- **Enterprise Workflows**: Monitor business-critical automated processes
- **Multi-tenant Systems**: Per-tenant performance and resource tracking
- **Compliance Systems**: Audit trails for regulatory requirements
- **Development Operations**: Performance monitoring during CI/CD and testing
- **Resource Management**: Infrastructure utilization and capacity planning

## Architecture: Distributed Monitoring System

### High-Level Design
The Monitoring Module follows a **microservices-oriented architecture** with distributed metrics collection:

```
┌─────────────────────────────────────────────┐
│         MonitoringFacadeService             │  ← Primary Interface
├─────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────────┐│
│  │ MetricsCollector│ │   AlertingService   ││  ← Core Services
│  │    Service      │ │                     ││
│  └─────────────────┘ └─────────────────────┘│
├─────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────────┐│
│  │ HealthCheck     │ │  PerformanceTracker ││  ← Monitoring Services
│  │   Service       │ │     Service         ││
│  └─────────────────┘ └─────────────────────┘│
├─────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────────┐│
│  │   Dashboard     │ │   ReportingService  ││  ← Presentation Layer
│  │    Service      │ │                     ││
│  └─────────────────┘ └─────────────────────┘│
├─────────────────────────────────────────────┤
│ Prometheus│Grafana│ElasticSearch│DataDog    │  ← Backend Integrations
└─────────────────────────────────────────────┘
```

### SOLID Principles Implementation

**Single Responsibility**:
- `MonitoringFacadeService`: Unified interface for all monitoring operations
- `MetricsCollectorService`: Metrics gathering and aggregation
- `AlertingService`: Alert rule evaluation and notification delivery
- `HealthCheckService`: System health assessment and reporting
- `PerformanceTrackerService`: Performance metrics and analysis
- `DashboardService`: Visualization and reporting interfaces
- `ReportingService`: Scheduled reports and data export

**Open/Closed**:
- Plugin architecture for different monitoring backends (Prometheus, DataDog, etc.)
- Extensible alert types and notification channels
- Custom metrics and dashboard extensions

**Interface Segregation**:
- Separate interfaces for metrics, alerting, health checks, and reporting
- Minimal interfaces for specific monitoring concerns

**Dependency Inversion**:
- Abstract monitoring backend interfaces
- Configurable notification providers through dependency injection

## Monitoring Patterns & Strategies

### Real-Time Metrics Collection

**Workflow Execution Metrics**:
```typescript
// Automatic metrics collection during workflow execution
@Injectable()
export class WorkflowMetricsInterceptor {
  constructor(private monitoring: MonitoringService) {}

  @EventPattern('workflow.started')
  async onWorkflowStarted(event: WorkflowStartedEvent): Promise<void> {
    await this.monitoring.recordMetric('workflow.executions.started', 1, {
      workflowName: event.workflowName,
      threadId: event.threadId,
      timestamp: event.timestamp
    });

    await this.monitoring.recordGauge('workflow.active_executions', 
      await this.getActiveExecutionCount()
    );
  }

  @EventPattern('workflow.completed')
  async onWorkflowCompleted(event: WorkflowCompletedEvent): Promise<void> {
    await this.monitoring.recordMetric('workflow.executions.completed', 1, {
      workflowName: event.workflowName,
      duration: event.duration,
      success: event.success
    });

    await this.monitoring.recordHistogram('workflow.execution.duration',
      event.duration,
      { workflowName: event.workflowName }
    );
  }
}
```

**Node-Level Performance Tracking**:
```typescript
// Track individual node performance
@Node('expensive-computation')
@MonitorPerformance({ 
  trackDuration: true, 
  trackMemory: true,
  alertThreshold: { duration: 30000, memory: 500 * 1024 * 1024 } // 30s, 500MB
})
async performExpensiveTask(state: WorkflowState): Promise<WorkflowState> {
  const startTime = Date.now();
  const initialMemory = process.memoryUsage();

  try {
    const result = await this.heavyComputation(state.input);
    
    // Automatic performance tracking via decorator
    return { ...state, result };
  } finally {
    const duration = Date.now() - startTime;
    const finalMemory = process.memoryUsage();
    
    await this.monitoring.recordNodePerformance('expensive-computation', {
      duration,
      memoryUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      success: true
    });
  }
}
```

### Health Check Patterns

**Comprehensive System Health**:
```typescript
@Injectable()
export class WorkflowHealthService {
  constructor(
    private monitoring: MonitoringService,
    private checkpointManager: CheckpointManagerService,
    private memoryService: MemoryService
  ) {}

  @Cron('*/30 * * * * *')  // Every 30 seconds
  async performHealthChecks(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnectivity(),
      this.checkMemoryServiceHealth(),
      this.checkCheckpointStorage(),
      this.checkResourceUtilization(),
      this.checkActiveWorkflows()
    ]);

    const healthStatus: HealthStatus = {
      overall: 'healthy',
      checks: {},
      timestamp: new Date()
    };

    // Process check results
    checks.forEach((result, index) => {
      const checkName = this.getCheckName(index);
      
      if (result.status === 'fulfilled') {
        healthStatus.checks[checkName] = result.value;
      } else {
        healthStatus.checks[checkName] = {
          status: 'unhealthy',
          error: result.reason.message,
          lastCheck: new Date()
        };
        healthStatus.overall = 'degraded';
      }
    });

    // Record health metrics
    await this.monitoring.recordHealthStatus(healthStatus);
    
    // Trigger alerts if unhealthy
    if (healthStatus.overall !== 'healthy') {
      await this.monitoring.triggerAlert('system.health.degraded', {
        status: healthStatus.overall,
        failedChecks: Object.keys(healthStatus.checks).filter(
          key => healthStatus.checks[key].status !== 'healthy'
        )
      });
    }

    return healthStatus;
  }
}
```

**Dependency Health Monitoring**:
```typescript
// Monitor external service dependencies
@Injectable()
export class DependencyHealthMonitor {
  @Interval(60000)  // Every minute
  async checkExternalServices(): Promise<void> {
    const services = [
      { name: 'neo4j', check: () => this.neo4j.isConnected() },
      { name: 'chromadb', check: () => this.chromadb.health() },
      { name: 'redis', check: () => this.redis.ping() },
      { name: 'openai', check: () => this.openai.checkQuota() }
    ];

    for (const service of services) {
      try {
        const startTime = Date.now();
        const isHealthy = await Promise.race([
          service.check(),
          this.timeout(5000)  // 5 second timeout
        ]);

        const responseTime = Date.now() - startTime;

        await this.monitoring.recordServiceHealth(service.name, {
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          timestamp: new Date()
        });

      } catch (error) {
        await this.monitoring.recordServiceHealth(service.name, {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date()
        });

        await this.monitoring.triggerAlert('dependency.unhealthy', {
          service: service.name,
          error: error.message
        });
      }
    }
  }
}
```

### Alerting & Notification Patterns

**Rule-Based Alerting**:
```typescript
@Injectable()
export class AlertingRuleEngine {
  private rules: AlertingRule[] = [
    {
      name: 'high-error-rate',
      condition: 'workflow.error_rate > 0.05',  // 5% error rate
      severity: 'critical',
      cooldown: 300000,  // 5 minutes
      channels: ['slack', 'email', 'pagerduty']
    },
    {
      name: 'slow-execution',
      condition: 'workflow.avg_duration > 60000',  // 1 minute average
      severity: 'warning',
      cooldown: 900000,  // 15 minutes
      channels: ['slack']
    },
    {
      name: 'memory-leak',
      condition: 'system.memory.trend > 0.1',  // 10% memory growth trend
      severity: 'warning',
      cooldown: 1800000,  // 30 minutes
      channels: ['email']
    }
  ];

  @Interval(30000)  // Every 30 seconds
  async evaluateRules(): Promise<void> {
    for (const rule of this.rules) {
      try {
        const shouldAlert = await this.evaluateCondition(rule.condition);
        
        if (shouldAlert && !this.isInCooldown(rule.name)) {
          await this.triggerAlert(rule);
          this.setCooldown(rule.name, rule.cooldown);
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate rule ${rule.name}:`, error);
      }
    }
  }

  private async triggerAlert(rule: AlertingRule): Promise<void> {
    const alert: Alert = {
      id: `${rule.name}_${Date.now()}`,
      name: rule.name,
      severity: rule.severity,
      message: await this.formatAlertMessage(rule),
      timestamp: new Date(),
      metadata: await this.gatherAlertContext(rule)
    };

    // Send to configured channels
    for (const channel of rule.channels) {
      await this.notificationService.send(channel, alert);
    }

    // Record alert metrics
    await this.monitoring.recordAlert(alert);
  }
}
```

**Adaptive Alerting**:
```typescript
// Intelligent alerting that adapts to patterns
@Injectable()
export class AdaptiveAlertingService {
  async evaluateAdaptiveAlert(metricName: string, value: number): Promise<void> {
    // Get historical baseline
    const baseline = await this.getMetricBaseline(metricName, {
      timeRange: '7d',
      aggregation: 'avg'
    });

    const deviation = Math.abs(value - baseline.average) / baseline.stddev;

    // Dynamic threshold based on historical patterns
    const threshold = this.calculateDynamicThreshold(baseline, {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      seasonality: await this.getSeasonalityFactor(metricName)
    });

    if (deviation > threshold) {
      await this.triggerAdaptiveAlert(metricName, {
        value,
        baseline: baseline.average,
        deviation,
        threshold,
        confidence: this.calculateConfidence(deviation, threshold)
      });
    }
  }
}
```

## Key Services Deep Dive

### MonitoringFacadeService
Central interface for all monitoring operations:

**Core Responsibilities**:
- Unified API for metrics collection
- Alert management and routing
- Health check coordination
- Dashboard data aggregation
- Report generation orchestration

**Key Methods**:
```typescript
// Record various metric types
async recordCounter(name: string, value: number, tags?: MetricTags): Promise<void>
async recordGauge(name: string, value: number, tags?: MetricTags): Promise<void>
async recordHistogram(name: string, value: number, tags?: MetricTags): Promise<void>
async recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void>

// Health check management
async registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void>
async getHealthStatus(): Promise<HealthStatus>
async getServiceHealth(serviceName: string): Promise<ServiceHealth>

// Alert management
async createAlertRule(rule: AlertRule): Promise<string>
async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>
async disableAlert(ruleId: string): Promise<void>
async getActiveAlerts(): Promise<Alert[]>

// Dashboard and reporting
async createDashboard(config: DashboardConfig): Promise<string>
async getMetricData(query: MetricQuery): Promise<MetricData[]>
async generateReport(config: ReportConfig): Promise<Report>
```

### MetricsCollectorService
Advanced metrics collection and aggregation:

**Metric Types & Collection**:
```typescript
interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  tags: string[];
  retention: string;      // '1h', '24h', '7d', '30d'
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'p95' | 'p99';
}

// Business metrics
const workflowMetrics: MetricDefinition[] = [
  {
    name: 'workflow_executions_total',
    type: 'counter',
    description: 'Total number of workflow executions',
    tags: ['workflow_name', 'status', 'tenant_id']
  },
  {
    name: 'workflow_duration_seconds',
    type: 'histogram',
    description: 'Workflow execution duration in seconds',
    tags: ['workflow_name', 'tenant_id']
  },
  {
    name: 'active_workflows',
    type: 'gauge',
    description: 'Number of currently active workflows',
    tags: ['workflow_name']
  }
];

// System metrics
const systemMetrics: MetricDefinition[] = [
  {
    name: 'system_memory_usage_bytes',
    type: 'gauge',
    description: 'System memory usage in bytes',
    tags: ['type']  // heap, rss, external
  },
  {
    name: 'system_cpu_usage_percent',
    type: 'gauge',
    description: 'System CPU usage percentage',
    tags: []
  }
];
```

**Custom Metrics Collection**:
```typescript
// Decorator for automatic metrics collection
export function TrackMetrics(config: MetricConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const metricTags = {
        method: propertyKey,
        class: target.constructor.name,
        ...config.tags
      };

      try {
        const result = await originalMethod.apply(this, args);
        
        // Record success metrics
        await this.monitoring.recordCounter(`${config.prefix}.success`, 1, metricTags);
        await this.monitoring.recordTimer(`${config.prefix}.duration`, 
          Date.now() - startTime, metricTags);
        
        return result;
      } catch (error) {
        // Record error metrics
        await this.monitoring.recordCounter(`${config.prefix}.error`, 1, {
          ...metricTags,
          error_type: error.constructor.name
        });
        throw error;
      }
    };
  };
}

// Usage
@Injectable()
export class WorkflowService {
  @TrackMetrics({ 
    prefix: 'workflow.execution',
    tags: { service: 'workflow' }
  })
  async executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    // Method implementation
  }
}
```

### AlertingService
Sophisticated alerting with multiple channels:

**Alert Rule Engine**:
```typescript
interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: NotificationChannel[];
  cooldownPeriod: number;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  threshold: number;
  timeWindow: string;      // '5m', '1h', '24h'
  aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

// Advanced rule evaluation
@Injectable()
export class AlertRuleEvaluator {
  async evaluateRule(rule: AlertRule): Promise<boolean> {
    const metricData = await this.metricsService.queryMetric({
      name: rule.condition.metric,
      timeRange: rule.condition.timeWindow,
      aggregation: rule.condition.aggregation
    });

    const value = this.aggregateData(metricData, rule.condition.aggregation);
    
    switch (rule.condition.operator) {
      case '>': return value > rule.condition.threshold;
      case '<': return value < rule.condition.threshold;
      case '>=': return value >= rule.condition.threshold;
      case '<=': return value <= rule.condition.threshold;
      case '==': return value === rule.condition.threshold;
      case '!=': return value !== rule.condition.threshold;
      default: return false;
    }
  }
}
```

**Multi-Channel Notifications**:
```typescript
@Injectable()
export class NotificationService {
  private channels = new Map<string, NotificationChannel>();

  constructor() {
    this.registerChannel('slack', new SlackNotificationChannel());
    this.registerChannel('email', new EmailNotificationChannel());
    this.registerChannel('webhook', new WebhookNotificationChannel());
    this.registerChannel('pagerduty', new PagerDutyNotificationChannel());
    this.registerChannel('teams', new TeamsNotificationChannel());
  }

  async sendAlert(alert: Alert, channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Unknown notification channel: ${channelName}`);
    }

    const message = await this.formatAlertMessage(alert, channelName);
    
    try {
      await channel.send(message);
      await this.recordNotificationSuccess(alert, channelName);
    } catch (error) {
      await this.recordNotificationFailure(alert, channelName, error);
      throw error;
    }
  }

  private async formatAlertMessage(alert: Alert, channel: string): Promise<NotificationMessage> {
    const formatter = this.getFormatter(channel);
    return formatter.format(alert);
  }
}

// Slack notification channel implementation
class SlackNotificationChannel implements NotificationChannel {
  async send(message: NotificationMessage): Promise<void> {
    const payload = {
      text: message.title,
      attachments: [{
        color: this.getSeverityColor(message.severity),
        fields: message.fields,
        ts: Math.floor(message.timestamp.getTime() / 1000)
      }]
    };

    await this.slack.post(payload);
  }
}
```

### PerformanceTrackerService
Advanced performance monitoring and analysis:

**Performance Metrics Collection**:
```typescript
@Injectable()
export class PerformanceTrackerService {
  // Track workflow performance patterns
  async trackWorkflowPerformance(
    workflowName: string, 
    execution: WorkflowExecution
  ): Promise<void> {
    const metrics: PerformanceMetrics = {
      workflowName,
      threadId: execution.threadId,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.endTime.getTime() - execution.startTime.getTime(),
      nodeCount: execution.nodeExecutions.length,
      memoryUsage: await this.getMemoryUsage(),
      cpuUsage: await this.getCpuUsage(),
      success: execution.status === 'completed',
      errorType: execution.error?.constructor.name
    };

    // Record performance metrics
    await this.recordPerformanceMetrics(metrics);
    
    // Check for performance anomalies
    await this.detectPerformanceAnomalies(metrics);
    
    // Update performance baselines
    await this.updatePerformanceBaseline(workflowName, metrics);
  }

  // Detect performance anomalies
  private async detectPerformanceAnomalies(
    current: PerformanceMetrics
  ): Promise<void> {
    const baseline = await this.getPerformanceBaseline(current.workflowName);
    
    const anomalies: PerformanceAnomaly[] = [];

    // Duration anomaly detection
    if (current.duration > baseline.averageDuration * 2) {
      anomalies.push({
        type: 'slow_execution',
        metric: 'duration',
        current: current.duration,
        baseline: baseline.averageDuration,
        severity: current.duration > baseline.averageDuration * 5 ? 'high' : 'medium'
      });
    }

    // Memory anomaly detection
    if (current.memoryUsage > baseline.averageMemory * 1.5) {
      anomalies.push({
        type: 'high_memory_usage',
        metric: 'memory',
        current: current.memoryUsage,
        baseline: baseline.averageMemory,
        severity: current.memoryUsage > baseline.averageMemory * 3 ? 'high' : 'low'
      });
    }

    // Trigger alerts for anomalies
    for (const anomaly of anomalies) {
      await this.alertingService.triggerPerformanceAlert(current.workflowName, anomaly);
    }
  }
}
```

**Resource Utilization Monitoring**:
```typescript
@Injectable()
export class ResourceMonitor {
  @Interval(10000)  // Every 10 seconds
  async collectSystemMetrics(): Promise<void> {
    const metrics = {
      memory: process.memoryUsage(),
      cpu: await this.getCpuUsage(),
      eventLoop: await this.getEventLoopLag(),
      uptime: process.uptime(),
      timestamp: new Date()
    };

    await this.monitoring.recordSystemMetrics(metrics);
    
    // Check resource thresholds
    await this.checkResourceThresholds(metrics);
  }

  private async checkResourceThresholds(metrics: SystemMetrics): Promise<void> {
    const thresholds = await this.getResourceThresholds();

    // Memory threshold check
    if (metrics.memory.heapUsed > thresholds.memory.warning) {
      const severity = metrics.memory.heapUsed > thresholds.memory.critical 
        ? 'critical' : 'warning';
        
      await this.alertingService.triggerResourceAlert('high_memory_usage', {
        current: metrics.memory.heapUsed,
        threshold: thresholds.memory[severity],
        severity
      });
    }

    // CPU threshold check
    if (metrics.cpu > thresholds.cpu.warning) {
      const severity = metrics.cpu > thresholds.cpu.critical ? 'critical' : 'warning';
      
      await this.alertingService.triggerResourceAlert('high_cpu_usage', {
        current: metrics.cpu,
        threshold: thresholds.cpu[severity],
        severity
      });
    }

    // Event loop lag check
    if (metrics.eventLoop > thresholds.eventLoop.warning) {
      await this.alertingService.triggerResourceAlert('event_loop_lag', {
        current: metrics.eventLoop,
        threshold: thresholds.eventLoop.warning,
        severity: 'warning'
      });
    }
  }
}
```

## Production Monitoring Strategies

### Multi-Tenant Monitoring

**Tenant-Specific Metrics**:
```typescript
@Injectable()
export class TenantMonitoringService {
  // Track per-tenant metrics
  async recordTenantMetric(
    tenantId: string,
    metricName: string,
    value: number,
    tags?: MetricTags
  ): Promise<void> {
    const tenantTags = {
      tenant_id: tenantId,
      tenant_tier: await this.getTenantTier(tenantId),
      ...tags
    };

    await this.monitoring.recordMetric(metricName, value, tenantTags);
    
    // Check tenant-specific limits
    await this.checkTenantLimits(tenantId, metricName, value);
  }

  // Tenant usage analysis
  async getTenantUsageReport(tenantId: string): Promise<TenantUsageReport> {
    const timeRange = '30d';  // Last 30 days
    
    const [
      workflowExecutions,
      totalDuration,
      errorRate,
      resourceUsage,
      costs
    ] = await Promise.all([
      this.getMetricSum('workflow_executions_total', tenantId, timeRange),
      this.getMetricSum('workflow_duration_seconds', tenantId, timeRange),
      this.getMetricAverage('workflow_error_rate', tenantId, timeRange),
      this.getResourceUsage(tenantId, timeRange),
      this.calculateTenantCosts(tenantId, timeRange)
    ]);

    return {
      tenantId,
      period: timeRange,
      executions: workflowExecutions,
      totalDuration,
      averageDuration: totalDuration / workflowExecutions,
      errorRate,
      resourceUsage,
      estimatedCosts: costs,
      generatedAt: new Date()
    };
  }
}
```

**SLA Monitoring**:
```typescript
@Injectable()
export class SLAMonitoringService {
  private slaDefinitions: SLADefinition[] = [
    {
      name: 'workflow_availability',
      target: 99.9,  // 99.9% availability
      measurement: 'availability',
      timeWindow: '30d'
    },
    {
      name: 'response_time',
      target: 5000,   // 5 seconds max response time
      measurement: 'p95_response_time',
      timeWindow: '24h'
    },
    {
      name: 'error_budget',
      target: 0.1,    // 0.1% error rate
      measurement: 'error_rate',
      timeWindow: '30d'
    }
  ];

  @Cron('0 */6 * * *')  // Every 6 hours
  async evaluateSLAs(): Promise<void> {
    for (const sla of this.slaDefinitions) {
      const currentValue = await this.measureSLA(sla);
      const compliance = this.calculateCompliance(sla, currentValue);

      await this.recordSLACompliance(sla.name, compliance);

      if (compliance.status === 'breach' || compliance.status === 'at_risk') {
        await this.alertingService.triggerSLAAlert(sla, compliance);
      }
    }
  }

  private calculateCompliance(sla: SLADefinition, currentValue: number): SLACompliance {
    const isBreaching = sla.measurement === 'availability' 
      ? currentValue < sla.target
      : currentValue > sla.target;

    const errorBudgetUsed = sla.measurement === 'error_rate'
      ? currentValue / sla.target
      : (sla.target - currentValue) / sla.target;

    let status: 'healthy' | 'at_risk' | 'breach';
    if (isBreaching) {
      status = 'breach';
    } else if (errorBudgetUsed > 0.8) {  // 80% of error budget used
      status = 'at_risk';
    } else {
      status = 'healthy';
    }

    return {
      slaName: sla.name,
      target: sla.target,
      current: currentValue,
      errorBudgetUsed,
      status,
      timeWindow: sla.timeWindow
    };
  }
}
```

### Distributed Tracing Integration

**Workflow Tracing**:
```typescript
@Injectable()
export class DistributedTracingService {
  // Create trace context for workflow execution
  async startWorkflowTrace(
    workflowName: string,
    threadId: string,
    input?: unknown
  ): Promise<TraceContext> {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId: null,
      workflowName,
      threadId,
      startTime: Date.now(),
      tags: {
        'workflow.name': workflowName,
        'workflow.thread_id': threadId,
        'workflow.input_size': JSON.stringify(input || {}).length
      }
    };

    await this.recordTraceSpan('workflow.start', traceContext);
    return traceContext;
  }

  // Create child span for node execution
  async startNodeSpan(
    parentContext: TraceContext,
    nodeId: string,
    nodeType: string
  ): Promise<TraceContext> {
    const nodeContext: TraceContext = {
      ...parentContext,
      spanId: this.generateSpanId(),
      parentSpanId: parentContext.spanId,
      startTime: Date.now(),
      tags: {
        ...parentContext.tags,
        'node.id': nodeId,
        'node.type': nodeType
      }
    };

    await this.recordTraceSpan('node.start', nodeContext);
    return nodeContext;
  }

  // Finish span with results
  async finishSpan(
    context: TraceContext,
    result?: { success: boolean; error?: Error; output?: unknown }
  ): Promise<void> {
    const duration = Date.now() - context.startTime;

    const spanData: SpanData = {
      ...context,
      duration,
      success: result?.success ?? true,
      error: result?.error?.message,
      tags: {
        ...context.tags,
        'span.duration': duration,
        'span.success': result?.success ?? true,
        'output.size': result?.output ? JSON.stringify(result.output).length : 0
      }
    };

    await this.recordTraceSpan('span.finish', spanData);
  }
}

// Usage with workflow nodes
@Node('process-data')
async processData(state: WorkflowState): Promise<WorkflowState> {
  const traceContext = await this.tracing.startNodeSpan(
    state.traceContext,
    'process-data',
    'processing'
  );

  try {
    const result = await this.performDataProcessing(state.data);
    
    await this.tracing.finishSpan(traceContext, { 
      success: true, 
      output: result 
    });

    return { ...state, processedData: result, traceContext };
  } catch (error) {
    await this.tracing.finishSpan(traceContext, { 
      success: false, 
      error 
    });
    throw error;
  }
}
```

## Integration with Monitoring Backends

### Prometheus Integration

**Metrics Export Configuration**:
```typescript
@Injectable()
export class PrometheusService implements MonitoringBackend {
  private registry = new prometheus.Registry();
  private metrics = new Map<string, prometheus.Metric>();

  async initialize(): Promise<void> {
    // Register default Node.js metrics
    prometheus.collectDefaultMetrics({ register: this.registry });

    // Create custom workflow metrics
    this.createWorkflowMetrics();
    
    // Start metrics server
    this.startMetricsServer();
  }

  private createWorkflowMetrics(): void {
    // Counter for workflow executions
    const executionCounter = new prometheus.Counter({
      name: 'langgraph_workflow_executions_total',
      help: 'Total number of workflow executions',
      labelNames: ['workflow_name', 'status', 'tenant_id'],
      registers: [this.registry]
    });

    // Histogram for execution duration
    const durationHistogram = new prometheus.Histogram({
      name: 'langgraph_workflow_duration_seconds',
      help: 'Workflow execution duration in seconds',
      labelNames: ['workflow_name', 'tenant_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry]
    });

    // Gauge for active workflows
    const activeGauge = new prometheus.Gauge({
      name: 'langgraph_active_workflows',
      help: 'Number of currently active workflows',
      labelNames: ['workflow_name'],
      registers: [this.registry]
    });

    this.metrics.set('workflow_executions_total', executionCounter);
    this.metrics.set('workflow_duration_seconds', durationHistogram);
    this.metrics.set('active_workflows', activeGauge);
  }

  async recordMetric(name: string, value: number, tags?: MetricTags): Promise<void> {
    const metric = this.metrics.get(name);
    if (!metric) {
      this.logger.warn(`Unknown metric: ${name}`);
      return;
    }

    if (metric instanceof prometheus.Counter) {
      metric.inc(tags || {}, value);
    } else if (metric instanceof prometheus.Gauge) {
      metric.set(tags || {}, value);
    } else if (metric instanceof prometheus.Histogram) {
      metric.observe(tags || {}, value);
    }
  }

  // Expose metrics endpoint
  getMetrics(): string {
    return this.registry.metrics();
  }
}
```

### Grafana Dashboard Configuration

**Dashboard as Code**:
```typescript
const workflowDashboard: GrafanaDashboard = {
  dashboard: {
    id: null,
    title: "LangGraph Workflow Monitoring",
    tags: ["langgraph", "workflows", "ai"],
    timezone: "browser",
    panels: [
      {
        id: 1,
        title: "Workflow Execution Rate",
        type: "stat",
        targets: [{
          expr: "rate(langgraph_workflow_executions_total[5m])",
          legendFormat: "{{workflow_name}}"
        }],
        fieldConfig: {
          defaults: {
            unit: "reqps",
            color: { mode: "palette-classic" }
          }
        }
      },
      {
        id: 2,
        title: "Average Execution Duration",
        type: "timeseries",
        targets: [{
          expr: "histogram_quantile(0.95, rate(langgraph_workflow_duration_seconds_bucket[5m]))",
          legendFormat: "95th percentile - {{workflow_name}}"
        }, {
          expr: "histogram_quantile(0.50, rate(langgraph_workflow_duration_seconds_bucket[5m]))",
          legendFormat: "50th percentile - {{workflow_name}}"
        }],
        fieldConfig: {
          defaults: {
            unit: "s",
            color: { mode: "palette-classic" }
          }
        }
      },
      {
        id: 3,
        title: "Error Rate by Workflow",
        type: "timeseries",
        targets: [{
          expr: "rate(langgraph_workflow_executions_total{status=\"error\"}[5m]) / rate(langgraph_workflow_executions_total[5m])",
          legendFormat: "Error Rate - {{workflow_name}}"
        }],
        fieldConfig: {
          defaults: {
            unit: "percentunit",
            color: { mode: "palette-classic" },
            max: 1,
            min: 0
          }
        }
      },
      {
        id: 4,
        title: "Active Workflows",
        type: "stat",
        targets: [{
          expr: "langgraph_active_workflows",
          legendFormat: "{{workflow_name}}"
        }],
        fieldConfig: {
          defaults: {
            unit: "short",
            color: { mode: "value" },
            mappings: [{
              options: { "0": { text: "No Active Workflows" } },
              type: "value"
            }]
          }
        }
      }
    ],
    time: {
      from: "now-1h",
      to: "now"
    },
    refresh: "30s"
  }
};
```

### ElasticSearch Integration

**Log Aggregation and Analysis**:
```typescript
@Injectable()
export class ElasticSearchService implements LogAggregationBackend {
  constructor(private elasticsearch: ElasticsearchService) {}

  async indexWorkflowLog(log: WorkflowLogEntry): Promise<void> {
    await this.elasticsearch.index({
      index: `langgraph-logs-${this.getDateString()}`,
      body: {
        '@timestamp': log.timestamp,
        level: log.level,
        message: log.message,
        workflow_name: log.workflowName,
        thread_id: log.threadId,
        node_id: log.nodeId,
        duration: log.duration,
        tags: log.tags,
        error: log.error,
        trace_id: log.traceId,
        span_id: log.spanId
      }
    });
  }

  // Search workflow logs with advanced querying
  async searchWorkflowLogs(query: LogSearchQuery): Promise<LogSearchResult> {
    const searchBody: any = {
      query: {
        bool: {
          must: [],
          filter: []
        }
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: query.limit || 100,
      from: query.offset || 0
    };

    // Add time range filter
    if (query.timeRange) {
      searchBody.query.bool.filter.push({
        range: {
          '@timestamp': {
            gte: query.timeRange.from,
            lte: query.timeRange.to
          }
        }
      });
    }

    // Add workflow filter
    if (query.workflowName) {
      searchBody.query.bool.filter.push({
        term: { workflow_name: query.workflowName }
      });
    }

    // Add level filter
    if (query.level) {
      searchBody.query.bool.filter.push({
        term: { level: query.level }
      });
    }

    // Full-text search
    if (query.searchText) {
      searchBody.query.bool.must.push({
        multi_match: {
          query: query.searchText,
          fields: ['message', 'error.message', 'tags.*']
        }
      });
    }

    const response = await this.elasticsearch.search({
      index: 'langgraph-logs-*',
      body: searchBody
    });

    return {
      total: response.body.hits.total.value,
      logs: response.body.hits.hits.map(hit => hit._source),
      aggregations: response.body.aggregations
    };
  }

  // Create log analysis dashboard
  async createLogAnalysisDashboard(): Promise<void> {
    const dashboard = {
      objects: [{
        type: 'dashboard',
        attributes: {
          title: 'LangGraph Workflow Logs',
          panelsJSON: JSON.stringify([
            {
              title: 'Log Level Distribution',
              type: 'pie',
              query: {
                aggregations: {
                  levels: {
                    terms: { field: 'level' }
                  }
                }
              }
            },
            {
              title: 'Error Logs Timeline',
              type: 'histogram',
              query: {
                query: { term: { level: 'error' } },
                aggregations: {
                  timeline: {
                    date_histogram: {
                      field: '@timestamp',
                      interval: '1h'
                    }
                  }
                }
              }
            }
          ])
        }
      }]
    };

    await this.elasticsearch.transport.request({
      method: 'POST',
      path: '/.kibana/_doc/dashboard:langgraph-logs',
      body: dashboard
    });
  }
}
```

## Testing Monitoring Systems

### Monitoring Test Strategies

**Mock Monitoring for Unit Tests**:
```typescript
describe('WorkflowService', () => {
  let mockMonitoring: jest.Mocked<MonitoringService>;

  beforeEach(() => {
    mockMonitoring = {
      recordMetric: jest.fn(),
      recordTimer: jest.fn(),
      triggerAlert: jest.fn(),
      recordHealthCheck: jest.fn()
    };
  });

  it('should record metrics during workflow execution', async () => {
    const workflowService = new WorkflowService(mockMonitoring);
    
    await workflowService.executeWorkflow(testConfig);

    expect(mockMonitoring.recordMetric).toHaveBeenCalledWith(
      'workflow.executions.started', 1, 
      expect.objectContaining({ workflowName: testConfig.name })
    );
  });
});
```

**Integration Testing with Real Backends**:
```typescript
describe('Monitoring Integration', () => {
  beforeAll(async () => {
    // Start test monitoring stack
    await startPrometheusTestServer();
    await startGrafanaTestInstance();
  });

  it('should collect and export metrics to Prometheus', async () => {
    // Execute monitored operation
    await monitoredService.performOperation();

    // Wait for metric export
    await sleep(1000);

    // Verify metrics in Prometheus
    const metrics = await queryPrometheus(
      'langgraph_workflow_executions_total{workflow_name="test"}'
    );

    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].value).toBe(1);
  });
});
```

### Load Testing Monitoring

**Performance Under Load**:
```typescript
describe('Monitoring Performance Under Load', () => {
  it('should handle high metric volume without degradation', async () => {
    const startTime = Date.now();
    
    // Generate high volume of metrics
    const promises = Array.from({ length: 10000 }, async (_, i) => {
      await monitoring.recordMetric('load_test.counter', 1, {
        iteration: i,
        timestamp: Date.now()
      });
    });

    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(10000);  // Under 10 seconds for 10k metrics
  });

  it('should maintain alerting responsiveness under load', async () => {
    // Trigger high-volume metrics that should generate alerts
    for (let i = 0; i < 1000; i++) {
      await monitoring.recordMetric('error.count', 10, { batch: i });
    }

    // Verify alerts are still triggered within reasonable time
    const alertPromise = waitForAlert('high_error_rate');
    const alertResult = await Promise.race([
      alertPromise,
      sleep(30000).then(() => 'timeout')
    ]);

    expect(alertResult).not.toBe('timeout');
  });
});
```

## Best Practices

### Monitoring Strategy Guidelines

1. **Golden Signals**: Focus on latency, traffic, errors, and saturation
2. **Business Metrics**: Monitor KPIs that matter to business outcomes
3. **Alert Fatigue**: Avoid over-alerting with proper thresholds and cooldowns
4. **Observability**: Ensure logs, metrics, and traces provide complete visibility
5. **Cost Optimization**: Balance monitoring coverage with infrastructure costs

### Performance Optimization

1. **Metric Cardinality**: Control metric label combinations to prevent explosion
2. **Sampling**: Use sampling for high-volume traces to reduce overhead
3. **Batching**: Batch metric collection to reduce network overhead
4. **Local Aggregation**: Pre-aggregate metrics locally before export
5. **Retention Policies**: Implement appropriate data retention to manage storage

### Security & Compliance

1. **Data Privacy**: Sanitize sensitive data in metrics and logs
2. **Access Control**: Implement RBAC for monitoring dashboards and alerts
3. **Audit Trails**: Log all monitoring configuration changes
4. **Encryption**: Encrypt metrics data in transit and at rest
5. **Compliance**: Meet regulatory requirements for monitoring and retention

### Configuration Example

```typescript
// Complete monitoring module configuration
const monitoringConfig: MonitoringConfig = {
  // Metrics collection
  metrics: {
    enabled: true,
    backend: 'prometheus',
    exportInterval: 30000,  // 30 seconds
    maxCardinality: 100000,
    retention: '30d'
  },

  // Alerting configuration
  alerting: {
    enabled: true,
    evaluationInterval: 30000,
    channels: {
      slack: { webhook: process.env.SLACK_WEBHOOK },
      email: { smtp: process.env.SMTP_CONFIG },
      pagerduty: { routingKey: process.env.PAGERDUTY_KEY }
    }
  },

  // Health checks
  healthChecks: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
    dependencies: ['neo4j', 'chromadb', 'redis']
  },

  // Performance tracking
  performance: {
    tracing: { enabled: true, samplingRate: 0.1 },
    profiling: { enabled: false },
    resourceMonitoring: { enabled: true }
  },

  // Dashboard configuration
  dashboards: {
    grafana: { enabled: true, provisioning: true },
    custom: { enabled: true, port: 3001 }
  }
};
```

### Development Workflow Commands

```bash
# Monitoring module development
npx nx test langgraph-modules-monitoring           # Run tests
npx nx test langgraph-modules-monitoring --watch   # Watch mode
npx nx build langgraph-modules-monitoring          # Build module

# Integration testing with monitoring backends
npm run dev:monitoring                             # Start monitoring stack
npx nx test langgraph-modules-monitoring --testPathPattern=integration

# Performance testing
npx nx test langgraph-modules-monitoring --testPathPattern=performance

# Dashboard development
npx nx serve monitoring-dashboard --port=3001
```

The Monitoring Module provides comprehensive observability for LangGraph workflows, enabling production-ready AI systems with enterprise-grade monitoring, alerting, and performance tracking capabilities.