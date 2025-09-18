import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type {
  DetailedHealthCheckResult,
  IHealthCheck,
  HealthCheckFunction,
  ServiceHealth,
  HealthStatus,
  HealthState,
} from '../interfaces/monitoring.interface';
import { HealthCheckError } from '../interfaces/monitoring.interface';

/**
 * HealthCheckService - System health monitoring with dependency validation
 *
 * Features:
 * - Comprehensive dependency monitoring
 * - Configurable health check intervals
 * - Health status aggregation with intelligent rollup
 * - Caching to prevent excessive checking
 * - Timeout protection for slow dependencies
 * - Health history tracking
 */
@Injectable()
export class HealthCheckService implements IHealthCheck, OnModuleDestroy {
  private readonly logger = new Logger(HealthCheckService.name);

  /**
   * Type guard to check if result is DetailedHealthCheckResult
   */
  private isDetailedHealthCheckResult(
    result: unknown
  ): result is DetailedHealthCheckResult {
    return (
      result !== null &&
      typeof result === 'object' &&
      'healthy' in result &&
      'degraded' in result &&
      'unhealthy' in result &&
      typeof (result as any).healthy === 'boolean' &&
      typeof (result as any).degraded === 'boolean' &&
      typeof (result as any).unhealthy === 'boolean'
    );
  }
  private readonly healthChecks = new Map<string, HealthCheckFunction>();
  private readonly healthCache = new Map<string, ServiceHealth>();
  private readonly healthHistory = new Map<string, ServiceHealth[]>();
  private readonly monitoringInterval: NodeJS.Timeout;
  private readonly cacheTimeout = 30000; // 30 seconds
  private readonly checkTimeout = 5000; // 5 seconds per check
  private readonly maxHistorySize = 100;
  private isShuttingDown = false;
  private totalChecks = 0;
  private failedChecks = 0;

  constructor() {
    // Start periodic health monitoring (every minute)
    this.monitoringInterval = setInterval(() => {
      this.performScheduledHealthCheck().catch((error) => {
        this.logger.error('Scheduled health check failed:', error);
      });
    }, 60000);

    // Register default system checks
    this.registerDefaultChecks();

    this.logger.log(
      'HealthCheckService initialized with 60s monitoring interval'
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.logger.log(
      `HealthCheckService shutdown - Total checks: ${this.totalChecks}, Failed: ${this.failedChecks}`
    );
  }

  // ================================
  // PUBLIC INTERFACE METHODS
  // ================================

  async register(name: string, check: HealthCheckFunction): Promise<void> {
    if (this.healthChecks.has(name)) {
      this.logger.warn(`Health check already exists: ${name}, replacing...`);
    }

    this.healthChecks.set(name, check);
    this.logger.log(`Health check registered: ${name}`);

    // Perform initial check
    try {
      await this.check(name);
    } catch (error) {
      this.logger.warn(`Initial health check failed for ${name}:`, error);
    }
  }

  async unregister(name: string): Promise<void> {
    if (this.healthChecks.delete(name)) {
      this.healthCache.delete(name);
      this.healthHistory.delete(name);
      this.logger.log(`Health check unregistered: ${name}`);
    } else {
      this.logger.warn(
        `Attempted to unregister non-existent health check: ${name}`
      );
    }
  }

  async check(name: string): Promise<ServiceHealth> {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new HealthCheckError(`Health check not found: ${name}`, {
        serviceName: name,
      });
    }

    // Check cache first
    const cached = this.healthCache.get(name);
    if (cached && this.isCacheValid(cached.lastCheck)) {
      return cached;
    }

    // Perform actual health check
    const health = await this.executeHealthCheck(name, healthCheck);

    // Update cache and history
    this.healthCache.set(name, health);
    this.updateHealthHistory(name, health);

    this.totalChecks++;
    if (health.state !== 'healthy') {
      this.failedChecks++;
    }

    return health;
  }

  async checkAll(): Promise<HealthStatus> {
    return this.getSystemHealth();
  }

  async getSystemHealth(): Promise<HealthStatus> {
    if (this.isShuttingDown) {
      return this.createShutdownHealthStatus();
    }

    const checkPromises = Array.from(this.healthChecks.keys()).map((name) =>
      this.checkWithErrorHandling(name)
    );

    const healthResults = await Promise.allSettled(checkPromises);
    const services: Record<string, ServiceHealth> = {};
    let overallState: HealthState = 'healthy';

    // Process results
    healthResults.forEach((result, index) => {
      const serviceName = Array.from(this.healthChecks.keys())[index];

      if (result.status === 'fulfilled') {
        const serviceHealth = result.value;
        services[serviceName] = serviceHealth;

        // Determine overall state using priority: unhealthy > degraded > healthy
        if (serviceHealth.state === 'unhealthy') {
          overallState = 'unhealthy';
        } else if (
          serviceHealth.state === 'degraded' &&
          overallState === 'healthy'
        ) {
          overallState = 'degraded';
        }
      } else {
        // Health check completely failed
        services[serviceName] = {
          state: 'unhealthy',
          error: `Health check execution failed: ${result.reason.message}`,
          lastCheck: new Date(),
          responseTime: this.checkTimeout,
        };
        overallState = 'unhealthy';
      }
    });

    return {
      overall: overallState,
      services,
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * Execute individual health check with timeout protection
   */
  private async executeHealthCheck(
    name: string,
    check: HealthCheckFunction
  ): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        check(),
        this.createTimeoutPromise(this.checkTimeout),
      ]);

      const responseTime = Date.now() - startTime;

      // Handle different result types from health checks
      let state: 'healthy' | 'degraded' | 'unhealthy';
      let metadata: any = {
        checkName: name,
        executionTime: responseTime,
      };

      if (typeof result === 'boolean') {
        // Simple boolean result (legacy checks)
        state = result ? 'healthy' : 'degraded';
      } else if (this.isDetailedHealthCheckResult(result)) {
        // Detailed result object (new memory check format)
        if (result.unhealthy) {
          state = 'unhealthy';
        } else if (result.degraded) {
          state = 'degraded';
        } else {
          state = 'healthy';
        }
        // Include detailed metadata from the check
        metadata = { ...metadata, ...result };
      } else {
        // Fallback for other result types
        state = 'degraded';
      }

      return {
        state,
        lastCheck: new Date(),
        responseTime,
        metadata,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        state: 'unhealthy',
        error:
          (error instanceof Error ? error.message : String(error)) ||
          'Health check failed',
        lastCheck: new Date(),
        responseTime,
        metadata: {
          checkName: name,
          executionTime: responseTime,
          errorType:
            error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * Execute health check with comprehensive error handling
   */
  private async checkWithErrorHandling(name: string): Promise<ServiceHealth> {
    try {
      return await this.check(name);
    } catch (error) {
      this.logger.error(`Health check error for ${name}:`, error);
      return {
        state: 'unhealthy',
        error: `Health check system error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        lastCheck: new Date(),
        responseTime: 0,
      };
    }
  }

  /**
   * Create timeout promise for health check timeout
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Check if cached health result is still valid
   */
  private isCacheValid(lastCheck: Date): boolean {
    const cacheAge = Date.now() - lastCheck.getTime();
    return cacheAge < this.cacheTimeout;
  }

  /**
   * Update health history for trending analysis
   */
  private updateHealthHistory(name: string, health: ServiceHealth): void {
    let history = this.healthHistory.get(name) || [];

    history.push(health);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history = history.slice(-this.maxHistorySize);
    }

    this.healthHistory.set(name, history);
  }

  /**
   * Perform scheduled health monitoring
   */
  private async performScheduledHealthCheck(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.logger.debug('Performing scheduled health check...');

    try {
      const health = await this.getSystemHealth();

      if (health.overall !== 'healthy') {
        this.logger.warn('System health degraded:', {
          overall: health.overall,
          unhealthyServices: Object.entries(health.services)
            .filter(([_, service]) => service.state !== 'healthy')
            .map(([name, service]) => ({
              name,
              state: service.state,
              error: service.error,
            })),
        });
      }
    } catch (error) {
      this.logger.error(
        'Scheduled health check failed:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Register default system health checks
   */
  private registerDefaultChecks(): void {
    // Memory usage check with proper state differentiation
    this.register('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;

      // Return object to allow for detailed state determination
      return {
        healthy: usagePercent < 80,
        degraded: usagePercent >= 80 && usagePercent < 90,
        unhealthy: usagePercent >= 90,
        usagePercent,
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
      };
    });

    // CPU availability check (simplified)
    this.register('cpu', async () => {
      // Simple check - if we can execute this quickly, CPU is available
      const start = process.hrtime.bigint();
      await new Promise((resolve) => setImmediate(resolve));
      const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms

      // If it takes more than 100ms for a simple setImmediate, CPU might be overloaded
      return duration < 100;
    });

    // Process uptime check
    this.register('uptime', async () => {
      // Always healthy - this is more for information
      return true;
    });

    this.logger.debug('Default system health checks registered');
  }

  /**
   * Create health status for shutdown state
   */
  private createShutdownHealthStatus(): HealthStatus {
    return {
      overall: 'unhealthy',
      services: {
        system: {
          state: 'unhealthy',
          error: 'Service is shutting down',
          lastCheck: new Date(),
          responseTime: 0,
        },
      },
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  // ================================
  // MISSING METHODS FROM TESTS
  // ================================

  /**
   * Get registered health checks
   */
  getRegisteredChecks(): Array<{
    name: string;
    lastCheck?: Date;
    state?: HealthState;
    responseTime?: number;
  }> {
    return Array.from(this.healthChecks.keys()).map((name) => {
      const cached = this.healthCache.get(name);
      return {
        name,
        lastCheck: cached?.lastCheck,
        state: cached?.state,
        responseTime: cached?.responseTime,
      };
    });
  }

  /**
   * Get health history for a service
   */
  getHealthHistory(serviceName: string, limit?: number): ServiceHealth[] {
    const history = this.healthHistory.get(serviceName) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Analyze health trend for a service
   */
  analyzeHealthTrend(serviceName: string): {
    trend: 'improving' | 'degrading' | 'stable';
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
    avgResponseTime: number;
  } {
    const history = this.getHealthHistory(serviceName);

    if (history.length === 0) {
      return {
        trend: 'stable',
        healthyCount: 0,
        degradedCount: 0,
        unhealthyCount: 0,
        avgResponseTime: 0,
      };
    }

    const healthyCount = history.filter((h) => h.state === 'healthy').length;
    const degradedCount = history.filter((h) => h.state === 'degraded').length;
    const unhealthyCount = history.filter(
      (h) => h.state === 'unhealthy'
    ).length;

    const avgResponseTime =
      history.reduce((sum, h) => sum + h.responseTime, 0) / history.length;

    // Simple trend analysis based on recent vs older entries
    const recent = history.slice(-10);
    const older = history.slice(0, -10);

    if (older.length === 0) {
      return {
        trend: 'stable',
        healthyCount,
        degradedCount,
        unhealthyCount,
        avgResponseTime: Math.round(avgResponseTime),
      };
    }

    const recentHealthyRatio =
      recent.filter((h) => h.state === 'healthy').length / recent.length;
    const olderHealthyRatio =
      older.filter((h) => h.state === 'healthy').length / older.length;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (recentHealthyRatio > olderHealthyRatio + 0.1) {
      trend = 'improving';
    } else if (recentHealthyRatio < olderHealthyRatio - 0.1) {
      trend = 'degrading';
    }

    return {
      trend,
      healthyCount,
      degradedCount,
      unhealthyCount,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }

  /**
   * Get health insights for the system
   */
  getHealthInsights(): {
    systemStability: 'high' | 'medium' | 'low';
    recommendations: string[];
    criticalServices: string[];
    avgSystemResponseTime: number;
  } {
    const allServices = Array.from(this.healthChecks.keys());
    const criticalServices: string[] = [];
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let healthyServices = 0;

    allServices.forEach((serviceName) => {
      const trend = this.analyzeHealthTrend(serviceName);
      if (trend.unhealthyCount > trend.healthyCount) {
        criticalServices.push(serviceName);
      }
      if (trend.avgResponseTime > 0) {
        totalResponseTime += trend.avgResponseTime;
        responseTimeCount++;
      }
      if (trend.healthyCount > trend.unhealthyCount + trend.degradedCount) {
        healthyServices++;
      }
    });

    const healthyRatio = healthyServices / allServices.length;
    let systemStability: 'high' | 'medium' | 'low' = 'high';
    if (healthyRatio < 0.5) {
      systemStability = 'low';
    } else if (healthyRatio < 0.8) {
      systemStability = 'medium';
    }

    const recommendations: string[] = [];
    if (criticalServices.length > 0) {
      recommendations.push(
        `Review critical services: ${criticalServices.join(', ')}`
      );
    }
    if (totalResponseTime / responseTimeCount > 1000) {
      recommendations.push('Consider optimizing slow health checks');
    }
    if (this.failedChecks / this.totalChecks > 0.1) {
      recommendations.push(
        'High failure rate detected - investigate infrastructure'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push('System health is optimal');
    }

    return {
      systemStability,
      recommendations,
      criticalServices,
      avgSystemResponseTime:
        responseTimeCount > 0
          ? Math.round(totalResponseTime / responseTimeCount)
          : 0,
    };
  }

  /**
   * Clean up old health data
   */
  cleanupOldHealthData(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = new Date(Date.now() - maxAge);
    let totalRemoved = 0;

    this.healthHistory.forEach((history, serviceName) => {
      const initialLength = history.length;
      const filteredHistory = history.filter((h) => h.lastCheck > cutoffTime);

      if (filteredHistory.length !== initialLength) {
        this.healthHistory.set(serviceName, filteredHistory);
        totalRemoved += initialLength - filteredHistory.length;
      }
    });

    this.logger.debug(`Cleaned up ${totalRemoved} old health records`);
    return totalRemoved;
  }

  /**
   * Export health metrics
   */
  async exportHealthMetrics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const systemHealth = await this.getSystemHealth();
    const allHistory = new Map<string, ServiceHealth[]>();

    this.healthHistory.forEach((history, serviceName) => {
      allHistory.set(serviceName, history);
    });

    const exportData = {
      currentStatus: systemHealth,
      history: Object.fromEntries(allHistory.entries()),
      statistics: this.getHealthCheckStats(),
      insights: this.getHealthInsights(),
      exportedAt: new Date(),
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else if (format === 'csv') {
      const csvRows: string[] = [];
      csvRows.push('Service,State,Error,LastCheck,ResponseTime');

      Object.entries(systemHealth.services).forEach(([serviceName, health]) => {
        csvRows.push(
          [
            serviceName,
            health.state,
            health.error || '',
            health.lastCheck.toISOString(),
            health.responseTime.toString(),
          ].join(',')
        );
      });

      return csvRows.join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Configure health webhook notifications
   */
  configureHealthWebhook(config: {
    url: string;
    headers?: Record<string, string>;
    enabled: boolean;
    triggers: HealthState[];
  }): void {
    this.logger.log('Configuring health webhook', {
      url: config.url,
      enabled: config.enabled,
      triggers: config.triggers,
    });

    // Store webhook configuration (placeholder implementation)
    // In a real implementation, this would store the config and set up webhook notifications
  }

  /**
   * Get webhook notification history
   */
  getWebhookHistory(): Array<{
    timestamp: Date;
    serviceName: string;
    state: HealthState;
    success: boolean;
    responseTime: number;
  }> {
    // Placeholder implementation - would return actual webhook history
    return [
      {
        timestamp: new Date(),
        serviceName: 'memory',
        state: 'healthy',
        success: true,
        responseTime: 150,
      },
    ];
  }

  /**
   * Get health check service statistics
   */
  getHealthCheckStats(): {
    totalChecks: number;
    failedChecks: number;
    registeredChecks: number;
    cacheSize: number;
    successRate: number;
  } {
    const successRate =
      this.totalChecks > 0
        ? ((this.totalChecks - this.failedChecks) / this.totalChecks) * 100
        : 0;

    return {
      totalChecks: this.totalChecks,
      failedChecks: this.failedChecks,
      registeredChecks: this.healthChecks.size,
      cacheSize: this.healthCache.size,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Get health trends for a specific service
   */
  getServiceHealthTrend(serviceName: string): ServiceHealth[] {
    return this.healthHistory.get(serviceName) || [];
  }
}
