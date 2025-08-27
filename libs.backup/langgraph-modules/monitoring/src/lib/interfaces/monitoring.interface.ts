/**
 * Core monitoring interfaces for LangGraph workflows
 * Provides comprehensive types for production-grade observability
 */

// ================================
// CORE METRIC TYPES
// ================================

export type MetricType =
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'timer'
  | 'summary';
export type HealthState = 'healthy' | 'degraded' | 'unhealthy';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface MetricTags {
  readonly [key: string]: string | number | boolean;
}

export interface Metric {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number;
  readonly tags: MetricTags;
  readonly timestamp: Date;
  readonly unit?: string;
}

// ================================
// MONITORING FACADE INTERFACE
// ================================

export interface IMonitoringFacade {
  // Metric recording operations
  recordMetric(name: string, value: number, tags?: MetricTags): Promise<void>;
  recordTimer(name: string, duration: number, tags?: MetricTags): Promise<void>;
  recordCounter(
    name: string,
    increment?: number,
    tags?: MetricTags
  ): Promise<void>;
  recordGauge(name: string, value: number, tags?: MetricTags): Promise<void>;
  recordHistogram(
    name: string,
    value: number,
    tags?: MetricTags
  ): Promise<void>;

  // Health check operations
  registerHealthCheck(name: string, check: HealthCheckFunction): Promise<void>;
  getSystemHealth(): Promise<HealthStatus>;
  getServiceHealth(serviceName: string): Promise<ServiceHealth>;

  // Alert operations
  createAlertRule(rule: AlertRule): Promise<string>;
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>;
  deleteAlertRule(ruleId: string): Promise<void>;
  getActiveAlerts(): Promise<Alert[]>;

  // Query operations
  queryMetrics(query: MetricQuery): Promise<MetricData[]>;
  getDashboardData(dashboardId: string): Promise<DashboardData>;
  createDashboard(config: DashboardConfig): Promise<string>;
}

// ================================
// METRICS COLLECTOR INTERFACE
// ================================

export interface IMetricsCollector {
  collect(name: string, value: number, tags?: MetricTags): Promise<void>;
  collectBatch(metrics: Metric[]): Promise<void>;
  getMetric(name: string): Promise<Metric | undefined>;
  getMetrics(pattern: string): Promise<Metric[]>;
  flush(): Promise<void>;
  reset(): Promise<void>;
}

export interface IMetricsBackend {
  initialize(config: BackendConfig): Promise<void>;
  recordMetric(metric: Metric): Promise<void>;
  recordBatch(metrics: Metric[]): Promise<void>;
  query(query: MetricQuery): Promise<MetricResult[]>;
  health(): Promise<boolean>;
  cleanup(): Promise<void>;
}

// ================================
// ALERTING INTERFACES
// ================================

export interface IAlertingService {
  createRule(rule: AlertRule): Promise<string>;
  updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>;
  deleteRule(ruleId: string): Promise<void>;
  enableRule(ruleId: string): Promise<void>;
  disableRule(ruleId: string): Promise<void>;
  evaluateRules(): Promise<void>;
  triggerAlert(alert: Alert): Promise<void>;
  getActiveAlerts(): Promise<Alert[]>;
  getAlertHistory(ruleId?: string): Promise<Alert[]>;
}

export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly condition: AlertCondition;
  readonly severity: AlertSeverity;
  readonly channels: readonly NotificationChannel[];
  readonly cooldownPeriod: number;
  readonly enabled: boolean;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AlertCondition {
  readonly metric: string;
  readonly operator: ComparisonOperator;
  readonly threshold: number;
  readonly timeWindow: number;
  readonly aggregation: AggregationType;
  readonly evaluationWindow: number;
}

export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
export type AggregationType =
  | 'avg'
  | 'sum'
  | 'min'
  | 'max'
  | 'count'
  | 'p95'
  | 'p99';

export interface Alert {
  readonly id: string;
  readonly ruleId: string;
  readonly name: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface INotificationProvider {
  send(alert: Alert, channel: NotificationChannel): Promise<void>;
  test(channel: NotificationChannel): Promise<boolean>;
}

export interface NotificationChannel {
  readonly type: 'email' | 'slack' | 'webhook' | 'sms' | 'custom';
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly enabled: boolean;
}

// ================================
// HEALTH CHECK INTERFACES
// ================================

export interface IHealthCheck {
  register(name: string, check: HealthCheckFunction): Promise<void>;
  unregister(name: string): Promise<void>;
  check(name: string): Promise<ServiceHealth>;
  checkAll(): Promise<HealthStatus>;
  getSystemHealth(): Promise<HealthStatus>;
}

export type HealthCheckFunction = () => Promise<boolean>;

export interface ServiceHealth {
  readonly state: HealthState;
  readonly lastCheck: Date;
  readonly responseTime: number;
  readonly error?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  readonly overall: HealthState;
  readonly services: Record<string, ServiceHealth>;
  readonly timestamp: Date;
  readonly uptime: number;
}

// ================================
// PERFORMANCE TRACKING INTERFACES
// ================================

export interface IPerformanceTracker {
  trackExecution(
    name: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  trackMemoryUsage(name: string, usage: number): Promise<void>;
  trackResourceUtilization(
    name: string,
    utilization: ResourceUtilization
  ): Promise<void>;
  detectAnomalies(metric: string): Promise<Anomaly[]>;
  getPerformanceBaseline(metric: string): Promise<PerformanceBaseline>;
  analyzePerformanceTrend(
    metric: string,
    timeRange: TimeRange
  ): Promise<TrendAnalysis>;
}

export interface ResourceUtilization {
  readonly cpu: number;
  readonly memory: number;
  readonly disk: number;
  readonly network: number;
}

export interface Anomaly {
  readonly id: string;
  readonly metric: string;
  readonly timestamp: Date;
  readonly actualValue: number;
  readonly expectedValue: number;
  readonly deviation: number;
  readonly severity: 'low' | 'medium' | 'high';
  readonly confidence: number;
}

export interface PerformanceBaseline {
  readonly metric: string;
  readonly mean: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly standardDeviation: number;
  readonly sampleSize: number;
  readonly lastUpdated: Date;
}

export interface TrendAnalysis {
  readonly metric: string;
  readonly timeRange: TimeRange;
  readonly trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  readonly changeRate: number;
  readonly confidence: number;
  readonly dataPoints: number;
}

// ================================
// DASHBOARD INTERFACES
// ================================

export interface IDashboard {
  createDashboard(config: DashboardConfig): Promise<string>;
  updateDashboard(
    dashboardId: string,
    updates: Partial<DashboardConfig>
  ): Promise<void>;
  deleteDashboard(dashboardId: string): Promise<void>;
  getDashboard(dashboardId: string): Promise<DashboardConfig>;
  getDashboardData(dashboardId: string): Promise<DashboardData>;
  queryMetrics(query: DashboardQuery): Promise<MetricData[]>;
  exportDashboard(dashboardId: string, format: 'json' | 'csv'): Promise<string>;
}

export interface DashboardConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly widgets: readonly Widget[];
  readonly refreshInterval: number;
  readonly timeRange: TimeRange;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Widget {
  readonly id: string;
  readonly type: 'line' | 'bar' | 'pie' | 'gauge' | 'table' | 'stat';
  readonly title: string;
  readonly query: DashboardQuery;
  readonly position: WidgetPosition;
  readonly config: Record<string, unknown>;
}

export interface WidgetPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DashboardQuery {
  readonly metric: string;
  readonly timeRange: TimeRange;
  readonly aggregation: AggregationType;
  readonly groupBy?: readonly string[];
  readonly filters?: Record<string, unknown>;
  readonly limit?: number;
}

export interface DashboardData {
  readonly dashboardId: string;
  readonly widgets: Record<string, MetricData[]>;
  readonly timestamp: Date;
  readonly timeRange: TimeRange;
}

export interface MetricData {
  readonly metric: string;
  readonly timestamp: Date;
  readonly value: number;
  readonly tags: MetricTags;
}

// ================================
// QUERY INTERFACES
// ================================

export interface MetricQuery {
  readonly metric: string;
  readonly timeRange: TimeRange;
  readonly aggregation: AggregationType;
  readonly groupBy?: readonly string[];
  readonly filters?: MetricTags;
  readonly limit?: number;
}

export interface MetricResult {
  readonly metric: string;
  readonly values: readonly MetricDataPoint[];
  readonly tags: MetricTags;
}

export interface MetricDataPoint {
  readonly timestamp: Date;
  readonly value: number;
}

export interface TimeRange {
  readonly start: Date;
  readonly end: Date;
}

// ================================
// CONFIGURATION INTERFACES
// ================================

export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly metrics: MetricsConfig;
  readonly alerting: AlertingConfig;
  readonly healthChecks: HealthCheckConfig;
  readonly performance: PerformanceConfig;
  readonly dashboard: DashboardConfig;
}

export interface MetricsConfig {
  readonly backend: 'prometheus' | 'datadog' | 'custom' | 'memory';
  readonly batchSize: number;
  readonly flushInterval: number;
  readonly maxBufferSize: number;
  readonly retention: string;
  readonly defaultTags: MetricTags;
}

export interface AlertingConfig {
  readonly enabled: boolean;
  readonly evaluationInterval: number;
  readonly defaultCooldown: number;
  readonly channels: readonly NotificationChannelConfig[];
  readonly escalationPolicies: readonly EscalationPolicy[];
}

export interface NotificationChannelConfig {
  readonly type: string;
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly enabled: boolean;
}

export interface EscalationPolicy {
  readonly id: string;
  readonly name: string;
  readonly rules: readonly EscalationRule[];
}

export interface EscalationRule {
  readonly delay: number;
  readonly channels: readonly string[];
  readonly severity: AlertSeverity;
}

export interface HealthCheckConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly timeout: number;
  readonly retries: number;
  readonly gracefulShutdownTimeout: number;
}

export interface PerformanceConfig {
  readonly trackingEnabled: boolean;
  readonly anomalyDetection: boolean;
  readonly baselineWindow: string;
  readonly sensitivityThreshold: number;
  readonly minSamples: number;
}

export interface BackendConfig {
  readonly type: string;
  readonly connection: Record<string, unknown>;
  readonly options: Record<string, unknown>;
}

// ================================
// BATCH PROCESSING INTERFACES
// ================================

export interface BatchConfig {
  readonly maxBatchSize: number;
  readonly flushInterval: number;
  readonly maxBufferSize: number;
  readonly compressionEnabled: boolean;
}

export interface BatchProcessor<T> {
  add(item: T): Promise<void>;
  addBatch(items: readonly T[]): Promise<void>;
  flush(): Promise<void>;
  getQueueSize(): number;
  isProcessing(): boolean;
}

// ================================
// EVENT INTERFACES
// ================================

export interface MonitoringEvent {
  readonly type: string;
  readonly source: string;
  readonly timestamp: Date;
  readonly data: Record<string, unknown>;
}

export interface WorkflowEvent extends MonitoringEvent {
  readonly workflowId: string;
  readonly threadId: string;
  readonly nodeId?: string;
  readonly phase: 'started' | 'completed' | 'failed' | 'timeout';
}

// ================================
// ERROR INTERFACES
// ================================

export interface MonitoringError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly recoverable: boolean;
}

export class MetricsCollectionError extends Error implements MonitoringError {
  readonly code = 'METRICS_COLLECTION_ERROR';
  readonly timestamp = new Date();
  readonly recoverable = true;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MetricsCollectionError';
  }
}

export class AlertingError extends Error implements MonitoringError {
  readonly code = 'ALERTING_ERROR';
  readonly timestamp = new Date();
  readonly recoverable = true;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AlertingError';
  }
}

export class HealthCheckError extends Error implements MonitoringError {
  readonly code = 'HEALTH_CHECK_ERROR';
  readonly timestamp = new Date();
  readonly recoverable = false;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}
