/**
 * Example: Health Monitoring and Observability - Production-Grade Health Checks
 * Category: 08-production-patterns
 * Features: Neo4jHealthService integration, Kubernetes health endpoints, dependency monitoring, alerting patterns
 */
import { Injectable, Controller, Get, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { Cron } from '@nestjs/schedule';
import {
  Neo4jHealthService,
  Neo4jConnectionService,
  Neo4jMetricsService,
  FindOne,
  CreateEntity,
  type ComprehensiveMetrics
} from '../../../index';

// ===== Health Status Types =====

interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'maintenance';
  timestamp: Date;
  responseTime: number;
  details: Record<string, any>;
  dependencies: DependencyStatus[];
  alerts: HealthAlert[];
}

interface DependencyStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  errorMessage?: string;
  criticalLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface HealthAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  component: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

interface HealthThresholds {
  responseTime: {
    warning: number;    // ms
    critical: number;   // ms
  };
  errorRate: {
    warning: number;    // percentage
    critical: number;   // percentage
  };
  connectionPool: {
    utilizationWarning: number;  // percentage
    utilizationCritical: number; // percentage
  };
  database: {
    nodeCountCritical: number;
    queriesPerSecondWarning: number;
  };
}

// ===== Production Health Monitoring Service =====

/**
 * Enterprise-grade health monitoring service
 * Integrates with Neo4j services and provides comprehensive observability
 */
@Injectable()
export class Neo4jProductionHealthService {
  private readonly logger = new Logger(Neo4jProductionHealthService.name);

  // Health status cache and history
  private currentHealthStatus: ServiceHealthStatus | null = null;
  private healthHistory: ServiceHealthStatus[] = [];
  private activeAlerts = new Map<string, HealthAlert>();

  // Configuration
  private readonly thresholds: HealthThresholds = {
    responseTime: {
      warning: 1000,   // 1 second
      critical: 5000   // 5 seconds
    },
    errorRate: {
      warning: 5,      // 5%
      critical: 15     // 15%
    },
    connectionPool: {
      utilizationWarning: 80,  // 80%
      utilizationCritical: 95  // 95%
    },
    database: {
      nodeCountCritical: 10000000,  // 10M nodes
      queriesPerSecondWarning: 1000
    }
  };

  constructor(
    private readonly healthService: Neo4jHealthService,
    private readonly connectionService: Neo4jConnectionService,
    private readonly metricsService: Neo4jMetricsService,
    private readonly terminusHealthService: HealthCheckService
  ) {}

  // ===== Core Health Check Methods =====

  /**
   * Comprehensive health check for production environments
   * Returns detailed health status with all dependencies
   */
  async performComprehensiveHealthCheck(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Execute all health checks in parallel
      const [
        basicHealth,
        connectionStatus,
        metrics,
        comprehensiveMetrics,
        dependencyStatus
      ] = await Promise.all([
        this.healthService.checkHealth(),
        this.connectionService.getConnectionStatus(),
        this.metricsService.getMetrics(),
        this.healthService.getComprehensiveMetrics(),
        this.checkDependencies()
      ]);

      const responseTime = Date.now() - startTime;

      // Analyze health status
      const status = this.determineOverallStatus(
        basicHealth,
        connectionStatus,
        metrics,
        responseTime
      );

      // Generate alerts based on thresholds
      const alerts = this.generateHealthAlerts(
        basicHealth,
        connectionStatus,
        metrics,
        comprehensiveMetrics,
        responseTime
      );

      const healthStatus: ServiceHealthStatus = {
        status,
        timestamp,
        responseTime,
        details: {
          basic: basicHealth,
          connection: connectionStatus,
          metrics,
          comprehensive: comprehensiveMetrics,
          thresholds: this.thresholds
        },
        dependencies: dependencyStatus,
        alerts
      };

      // Cache current status and update history
      this.currentHealthStatus = healthStatus;
      this.updateHealthHistory(healthStatus);
      this.processAlerts(alerts);

      return healthStatus;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Comprehensive health check failed: ${errorMessage}`, error);

      const criticalAlert: HealthAlert = {
        id: `health-check-failure-${Date.now()}`,
        severity: 'critical',
        message: `Health check system failure: ${errorMessage}`,
        component: 'health-monitoring',
        timestamp,
        acknowledged: false,
        metadata: { error: errorMessage, responseTime }
      };

      return {
        status: 'unhealthy',
        timestamp,
        responseTime,
        details: { error: errorMessage },
        dependencies: [],
        alerts: [criticalAlert]
      };
    }
  }

  /**
   * Quick health check for Kubernetes liveness probe
   * Fast response time, basic connectivity only
   */
  async quickHealthCheck(): Promise<{
    status: 'ok' | 'error';
    timestamp: Date;
    responseTime: number
  }> {
    const startTime = Date.now();

    try {
      const isConnected = await this.connectionService.isConnected();
      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'ok' : 'error',
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Deep health check for Kubernetes readiness probe
   * Comprehensive validation of all systems
   */
  async readinessCheck(): Promise<{
    ready: boolean;
    checks: Record<string, boolean>;
    timestamp: Date;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const [
        connectionReady,
        metricsReady,
        dependenciesReady
      ] = await Promise.all([
        this.checkConnectionReadiness(),
        this.checkMetricsReadiness(),
        this.checkDependenciesReadiness()
      ]);

      const checks = {
        connection: connectionReady,
        metrics: metricsReady,
        dependencies: dependenciesReady
      };

      const ready = Object.values(checks).every(check => check);
      const responseTime = Date.now() - startTime;

      return {
        ready,
        checks,
        timestamp,
        responseTime
      };

    } catch (error) {
      this.logger.error(`Readiness check failed: ${error.message}`, error);

      return {
        ready: false,
        checks: {
          connection: false,
          metrics: false,
          dependencies: false
        },
        timestamp,
        responseTime: Date.now() - startTime
      };
    }
  }

  // ===== Dependency Health Checks =====

  /**
   * Check health of all system dependencies
   */
  private async checkDependencies(): Promise<DependencyStatus[]> {
    const dependencies: DependencyStatus[] = [];

    // Neo4j Database
    dependencies.push(await this.checkNeo4jDependency());

    // External services (customize based on your architecture)
    dependencies.push(await this.checkRedisDependency());
    dependencies.push(await this.checkOpenAIDependency());
    dependencies.push(await this.checkChromaDBDependency());

    return dependencies;
  }

  private async checkNeo4jDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      const testResult = await this.connectionService.testConnection(5000);
      const responseTime = Date.now() - startTime;

      return {
        name: 'neo4j',
        status: testResult.success ? 'up' : 'down',
        responseTime,
        lastCheck: new Date(),
        errorMessage: testResult.error,
        criticalLevel: 'critical'
      };
    } catch (error) {
      return {
        name: 'neo4j',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        criticalLevel: 'critical'
      };
    }
  }

  private async checkRedisDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      // Simulate Redis health check - replace with actual implementation
      const responseTime = Date.now() - startTime;

      return {
        name: 'redis',
        status: 'up', // Replace with actual check
        responseTime,
        lastCheck: new Date(),
        criticalLevel: 'high'
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        criticalLevel: 'high'
      };
    }
  }

  private async checkOpenAIDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      // Simulate OpenAI health check - replace with actual implementation
      const responseTime = Date.now() - startTime;

      return {
        name: 'openai',
        status: 'up', // Replace with actual check
        responseTime,
        lastCheck: new Date(),
        criticalLevel: 'medium'
      };
    } catch (error) {
      return {
        name: 'openai',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        criticalLevel: 'medium'
      };
    }
  }

  private async checkChromaDBDependency(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      // Simulate ChromaDB health check - replace with actual implementation
      const responseTime = Date.now() - startTime;

      return {
        name: 'chromadb',
        status: 'up', // Replace with actual check
        responseTime,
        lastCheck: new Date(),
        criticalLevel: 'high'
      };
    } catch (error) {
      return {
        name: 'chromadb',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        criticalLevel: 'high'
      };
    }
  }

  // ===== Status Analysis =====

  private determineOverallStatus(
    basicHealth: any,
    connectionStatus: any,
    metrics: any,
    responseTime: number
  ): ServiceHealthStatus['status'] {
    // Critical failures
    if (basicHealth.status === 'down' || !connectionStatus.connected) {
      return 'unhealthy';
    }

    // Performance degradation
    if (responseTime > this.thresholds.responseTime.critical) {
      return 'degraded';
    }

    // Warning conditions
    if (
      responseTime > this.thresholds.responseTime.warning ||
      metrics.errorRate > this.thresholds.errorRate.warning ||
      metrics.poolUtilization > this.thresholds.connectionPool.utilizationWarning
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  // ===== Alert Generation =====

  private generateHealthAlerts(
    basicHealth: any,
    connectionStatus: any,
    metrics: any,
    comprehensiveMetrics: ComprehensiveMetrics,
    responseTime: number
  ): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const timestamp = new Date();

    // Response time alerts
    if (responseTime > this.thresholds.responseTime.critical) {
      alerts.push({
        id: `response-time-critical-${Date.now()}`,
        severity: 'critical',
        message: `Response time ${responseTime}ms exceeds critical threshold ${this.thresholds.responseTime.critical}ms`,
        component: 'performance',
        timestamp,
        acknowledged: false,
        metadata: { responseTime, threshold: this.thresholds.responseTime.critical }
      });
    } else if (responseTime > this.thresholds.responseTime.warning) {
      alerts.push({
        id: `response-time-warning-${Date.now()}`,
        severity: 'warning',
        message: `Response time ${responseTime}ms exceeds warning threshold ${this.thresholds.responseTime.warning}ms`,
        component: 'performance',
        timestamp,
        acknowledged: false,
        metadata: { responseTime, threshold: this.thresholds.responseTime.warning }
      });
    }

    // Connection pool alerts
    if (metrics.poolUtilization > this.thresholds.connectionPool.utilizationCritical) {
      alerts.push({
        id: `pool-critical-${Date.now()}`,
        severity: 'critical',
        message: `Connection pool utilization ${metrics.poolUtilization}% exceeds critical threshold`,
        component: 'connection-pool',
        timestamp,
        acknowledged: false,
        metadata: { utilization: metrics.poolUtilization, threshold: this.thresholds.connectionPool.utilizationCritical }
      });
    }

    // Error rate alerts
    if (metrics.errorRate > this.thresholds.errorRate.critical) {
      alerts.push({
        id: `error-rate-critical-${Date.now()}`,
        severity: 'critical',
        message: `Error rate ${metrics.errorRate}% exceeds critical threshold`,
        component: 'errors',
        timestamp,
        acknowledged: false,
        metadata: { errorRate: metrics.errorRate, threshold: this.thresholds.errorRate.critical }
      });
    }

    // Database size alerts
    if (comprehensiveMetrics.database &&
        comprehensiveMetrics.database.nodeCount > this.thresholds.database.nodeCountCritical) {
      alerts.push({
        id: `database-size-warning-${Date.now()}`,
        severity: 'warning',
        message: `Database contains ${comprehensiveMetrics.database.nodeCount} nodes, approaching size limits`,
        component: 'database',
        timestamp,
        acknowledged: false,
        metadata: { nodeCount: comprehensiveMetrics.database.nodeCount, threshold: this.thresholds.database.nodeCountCritical }
      });
    }

    return alerts;
  }

  // ===== Alert Management =====

  private processAlerts(alerts: HealthAlert[]): void {
    for (const alert of alerts) {
      if (!this.activeAlerts.has(alert.id)) {
        this.activeAlerts.set(alert.id, alert);
        this.sendAlert(alert);
      }
    }

    // Clean up resolved alerts (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < oneHourAgo) {
        this.activeAlerts.delete(id);
      }
    }
  }

  private sendAlert(alert: HealthAlert): void {
    this.logger.error(
      `[ALERT] ${alert.severity.toUpperCase()} - ${alert.component}: ${alert.message}`,
      { alert }
    );

    // Integration points for alerting systems
    // - Slack notifications
    // - PagerDuty integration
    // - Email alerts
    // - Webhook notifications
  }

  // ===== Health History Management =====

  private updateHealthHistory(status: ServiceHealthStatus): void {
    this.healthHistory.push(status);

    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory.splice(0, this.healthHistory.length - 100);
    }
  }

  // ===== Readiness Checks =====

  private async checkConnectionReadiness(): Promise<boolean> {
    try {
      const testResult = await this.connectionService.testConnection(2000);
      return testResult.success && testResult.latency < 2000;
    } catch {
      return false;
    }
  }

  private async checkMetricsReadiness(): Promise<boolean> {
    try {
      const metrics = this.metricsService.getMetrics();
      return metrics.poolUtilization < 90; // Ensure pool isn't at capacity
    } catch {
      return false;
    }
  }

  private async checkDependenciesReadiness(): Promise<boolean> {
    try {
      const dependencies = await this.checkDependencies();
      const criticalDependencies = dependencies.filter(dep => dep.criticalLevel === 'critical');
      return criticalDependencies.every(dep => dep.status === 'up');
    } catch {
      return false;
    }
  }

  // ===== Scheduled Health Checks =====

  /**
   * Scheduled comprehensive health check (every 5 minutes)
   */
  @Cron('*/5 * * * *')
  async scheduledHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.performComprehensiveHealthCheck();

      if (healthStatus.status === 'unhealthy') {
        this.logger.warn('Scheduled health check detected unhealthy status', { healthStatus });
      }
    } catch (error) {
      this.logger.error('Scheduled health check failed', error);
    }
  }

  // ===== Public API =====

  /**
   * Get current health status
   */
  getCurrentHealthStatus(): ServiceHealthStatus | null {
    return this.currentHealthStatus;
  }

  /**
   * Get health history
   */
  getHealthHistory(limit = 24): ServiceHealthStatus[] {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.log(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }
}

// ===== Kubernetes Health Controller =====

/**
 * Production-ready health endpoints for Kubernetes
 */
@Controller('health')
export class Neo4jHealthController {
  constructor(
    private readonly healthMonitoring: Neo4jProductionHealthService,
    private readonly terminusHealth: HealthCheckService
  ) {}

  /**
   * Kubernetes liveness probe endpoint
   * GET /health/live
   */
  @Get('live')
  async liveness() {
    const result = await this.healthMonitoring.quickHealthCheck();

    if (result.status === 'error') {
      throw new HttpException('Service not live', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: 'ok',
      timestamp: result.timestamp,
      responseTime: result.responseTime
    };
  }

  /**
   * Kubernetes readiness probe endpoint
   * GET /health/ready
   */
  @Get('ready')
  async readiness() {
    const result = await this.healthMonitoring.readinessCheck();

    if (!result.ready) {
      throw new HttpException('Service not ready', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: 'ready',
      checks: result.checks,
      timestamp: result.timestamp,
      responseTime: result.responseTime
    };
  }

  /**
   * Comprehensive health check endpoint
   * GET /health/detailed
   */
  @Get('detailed')
  async detailedHealth() {
    return this.healthMonitoring.performComprehensiveHealthCheck();
  }

  /**
   * Health history endpoint for monitoring dashboards
   * GET /health/history
   */
  @Get('history')
  async healthHistory() {
    return {
      current: this.healthMonitoring.getCurrentHealthStatus(),
      history: this.healthMonitoring.getHealthHistory(24),
      alerts: this.healthMonitoring.getActiveAlerts()
    };
  }

  /**
   * NestJS Terminus integration
   * GET /health/terminus
   */
  @Get('terminus')
  @HealthCheck()
  async terminusHealthCheck(): Promise<any> {
    return this.terminusHealth.check([
      async (): Promise<HealthIndicatorResult> => {
        const status = await this.healthMonitoring.quickHealthCheck();

        return {
          neo4j: {
            status: status.status === 'ok' ? 'up' : 'down',
            responseTime: status.responseTime
          }
        };
      }
    ]);
  }
}

// ===== Application-Specific Health Checks =====

/**
 * Domain-specific health service
 * Customize for your specific business requirements
 */
@Injectable()
export class ApplicationHealthService {
  private readonly logger = new Logger(ApplicationHealthService.name);

  constructor(
    private readonly healthMonitoring: Neo4jProductionHealthService
  ) {}

  // Simple health check using decorators
  @FindOne(() => Object, {
    cache: '30s',
    description: 'Basic connectivity test'
  })
  async testBasicQuery(): Promise<any> {
    // This will be replaced by actual Cypher: MATCH (n) RETURN n LIMIT 1
  }

  // Create a test entity to verify write operations
  @CreateEntity(() => Object, {
    safe: true,
    retry: 2,
    description: 'Write operation test'
  })
  async testWriteOperation(): Promise<any> {
    // This will be replaced by actual Cypher: CREATE (n:HealthCheck {timestamp: $now}) RETURN n
  }

  /**
   * Business-specific health checks
   */
  async performBusinessHealthChecks(): Promise<{
    canRead: boolean;
    canWrite: boolean;
    businessLogicHealthy: boolean;
    timestamp: Date;
  }> {
    const timestamp = new Date();

    try {
      // Test read operations
      const canRead = await this.testReadOperations();

      // Test write operations
      const canWrite = await this.testWriteOperations();

      // Test business logic
      const businessLogicHealthy = await this.testBusinessLogic();

      return {
        canRead,
        canWrite,
        businessLogicHealthy,
        timestamp
      };

    } catch (error) {
      this.logger.error('Business health check failed', error);

      return {
        canRead: false,
        canWrite: false,
        businessLogicHealthy: false,
        timestamp
      };
    }
  }

  private async testReadOperations(): Promise<boolean> {
    try {
      await this.testBasicQuery();
      return true;
    } catch {
      return false;
    }
  }

  private async testWriteOperations(): Promise<boolean> {
    try {
      await this.testWriteOperation();
      return true;
    } catch {
      return false;
    }
  }

  private async testBusinessLogic(): Promise<boolean> {
    // Implement your specific business logic tests here
    // Examples:
    // - Key entities exist
    // - Critical relationships are intact
    // - Business rules are functioning
    return true;
  }
}

// ===== Usage Examples =====

/**
 * Example usage in your main application module
 */
export const HEALTH_MONITORING_EXAMPLE = `
// app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TerminusModule,
    // ... other modules
  ],
  providers: [
    Neo4jProductionHealthService,
    ApplicationHealthService,
  ],
  controllers: [
    Neo4jHealthController,
  ],
})
export class AppModule {}

// kubernetes/deployment.yaml
spec:
  containers:
  - name: app
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

// docker-compose.yml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;
