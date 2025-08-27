import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CheckpointStats } from '../interfaces/checkpoint.interface';
import type {
  ICheckpointHealthService,
  ICheckpointRegistryService,
  ICheckpointMetricsService,
} from '../interfaces/checkpoint-services.interface';
import { BaseCheckpointService } from '../interfaces/checkpoint-services.interface';

interface HealthConfig {
  checkInterval: number;
  unhealthyThreshold: number;
  degradedThreshold: number;
}

interface HealthRecord {
  timestamp: Date;
  saverName: string;
  healthy: boolean;
  responseTime: number;
  error?: string;
}

interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Health monitoring service for checkpoint storage backends
 * Provides comprehensive health checks and monitoring capabilities
 */
@Injectable()
export class CheckpointHealthService
  extends BaseCheckpointService
  implements ICheckpointHealthService, OnModuleDestroy
{
  private healthMonitoringInterval: NodeJS.Timeout | null = null;
  private healthConfig: HealthConfig;
  private readonly healthHistory: HealthRecord[] = [];
  private readonly currentHealthStatus = new Map<string, HealthStatus>();
  private readonly maxHistorySize = 1000;

  constructor(
    @Inject('ICheckpointRegistryService')
    private readonly registryService: ICheckpointRegistryService,
    @Inject('ICheckpointMetricsService')
    private readonly metricsService: ICheckpointMetricsService,
    private readonly configService: ConfigService
  ) {
    super(CheckpointHealthService.name);

    this.healthConfig = this.loadHealthConfig();
  }

  public onModuleDestroy(): void {
    this.stopHealthMonitoring();
  }

  /**
   * Perform health check on a specific saver
   */
  public async healthCheck(saverName?: string): Promise<boolean> {
    const startTime = Date.now();
    let healthy = false;
    let error: string | undefined;

    try {
      const saver = this.registryService.getSaver(saverName);
      const actualSaverName =
        saverName || this.registryService.getDefaultSaverName() || 'default';

      if (saver.healthCheck) {
        healthy = await saver.healthCheck();
      } else {
        // Fallback health check - try to perform a simple operation
        healthy = await this.performBasicHealthCheck(saver);
      }

      const responseTime = Date.now() - startTime;
      this.updateHealthStatus(actualSaverName, healthy, responseTime);
      this.recordHealthCheck(actualSaverName, healthy, responseTime);

      this.logger.debug(
        `Health check for ${actualSaverName}: ${
          healthy ? 'healthy' : 'unhealthy'
        } (${responseTime}ms)`
      );
    } catch (err) {
      error = (err as Error).message;
      const responseTime = Date.now() - startTime;
      const actualSaverName =
        saverName || this.registryService.getDefaultSaverName() || 'default';

      this.updateHealthStatus(actualSaverName, false, responseTime, error);
      this.recordHealthCheck(actualSaverName, false, responseTime, error);

      this.logger.error(`Health check failed for ${actualSaverName}:`, err);
    }

    return healthy;
  }

  /**
   * Perform health checks on all savers
   */
  public async healthCheckAll(): Promise<Record<string, boolean>> {
    const availableSavers = this.registryService.getAvailableSavers();
    const results: Record<string, boolean> = {};

    for (const saverName of availableSavers) {
      try {
        results[saverName] = await this.healthCheck(saverName);
      } catch (error) {
        this.logger.error(`Health check failed for saver ${saverName}:`, error);
        results[saverName] = false;
      }
    }

    return results;
  }

  /**
   * Get detailed health status
   */
  public async getHealthStatus(saverName?: string): Promise<HealthStatus> {
    const actualSaverName =
      saverName || this.registryService.getDefaultSaverName() || 'default';

    // Get current status or create new one
    let status = this.currentHealthStatus.get(actualSaverName);

    if (!status) {
      // Perform initial health check
      await this.healthCheck(actualSaverName);
      status = this.currentHealthStatus.get(actualSaverName)!;
    }

    return { ...status };
  }

  /**
   * Get health statistics
   */
  public async getHealthStats(): Promise<CheckpointStats> {
    const aggregatedMetrics = this.metricsService.getAggregatedMetrics();
    const availableSavers = this.registryService.getAvailableSavers();

    // Combine health data with metrics
    const stats: CheckpointStats = {
      totalCheckpoints: 0,
      activeThreads: 0,
      averageSize: 0,
      totalStorageUsed: 0,
      recentCheckpoints: 0,
      averageSaveTime: aggregatedMetrics.averageSaveTime,
      averageLoadTime: aggregatedMetrics.averageLoadTime,
      errorRate: aggregatedMetrics.errorRate,
      storageType: availableSavers.join(', '),
    };

    // Try to get more detailed stats from savers
    for (const saverName of availableSavers) {
      try {
        const saver = this.registryService.getSaver(saverName);
        if (saver.getStats) {
          const saverStats = await saver.getStats();
          stats.totalCheckpoints += saverStats.totalCheckpoints;
          stats.activeThreads += saverStats.activeThreads;
          stats.totalStorageUsed += saverStats.totalStorageUsed;
          stats.recentCheckpoints += saverStats.recentCheckpoints;
        }
      } catch (error) {
        this.logger.warn(`Failed to get stats from saver ${saverName}:`, error);
      }
    }

    // Calculate average size
    if (stats.totalCheckpoints > 0) {
      stats.averageSize = stats.totalStorageUsed / stats.totalCheckpoints;
    }

    return stats;
  }

  /**
   * Start health monitoring
   */
  public startHealthMonitoring(intervalMs?: number): void {
    const interval = intervalMs || this.healthConfig.checkInterval;

    if (this.healthMonitoringInterval) {
      this.logger.warn(
        'Health monitoring is already running. Stopping existing monitoring.'
      );
      this.stopHealthMonitoring();
    }

    if (interval <= 0) {
      this.logger.log('Health monitoring disabled (interval <= 0)');
      return;
    }

    this.healthMonitoringInterval = setInterval(async () => {
      try {
        await this.performScheduledHealthChecks();
      } catch (error) {
        this.logger.error('Scheduled health check failed:', error);
      }
    }, interval);

    this.logger.log(`Health monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Stop health monitoring
   */
  public stopHealthMonitoring(): void {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = null;
      this.logger.log('Health monitoring stopped');
    }
  }

  /**
   * Get health monitoring configuration
   */
  public getHealthConfig(): HealthConfig {
    return { ...this.healthConfig };
  }

  /**
   * Update health monitoring configuration
   */
  public updateHealthConfig(config: Partial<HealthConfig>): void {
    const oldConfig = { ...this.healthConfig };
    this.healthConfig = { ...this.healthConfig, ...config };

    this.logger.log('Updated health monitoring configuration:', {
      old: oldConfig,
      new: this.healthConfig,
    });

    // Restart monitoring if interval changed
    if (config.checkInterval !== undefined && this.healthMonitoringInterval) {
      this.startHealthMonitoring(config.checkInterval);
    }
  }

  /**
   * Get health history
   */
  public getHealthHistory(saverName?: string): HealthRecord[] {
    if (saverName) {
      return this.healthHistory.filter(
        (record) => record.saverName === saverName
      );
    }
    return [...this.healthHistory];
  }

  /**
   * Get health summary report
   */
  public getHealthSummary(): {
    overall: {
      healthy: boolean;
      totalSavers: number;
      healthySavers: number;
      degradedSavers: number;
      unhealthySavers: number;
    };
    savers: Record<
      string,
      {
        status: HealthStatus;
        uptime: number;
        averageResponseTime: number;
        recentErrors: number;
      }
    >;
    trends: {
      healthTrend: 'improving' | 'stable' | 'degrading';
      responseTimeTrend: 'improving' | 'stable' | 'degrading';
      errorTrend: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  } {
    const availableSavers = this.registryService.getAvailableSavers();
    let healthySavers = 0;
    let degradedSavers = 0;
    let unhealthySavers = 0;

    const saverDetails: Record<
      string,
      {
        status: HealthStatus;
        uptime: number;
        averageResponseTime: number;
        recentErrors: number;
      }
    > = {};

    for (const saverName of availableSavers) {
      const status = this.currentHealthStatus.get(saverName);
      if (status) {
        switch (status.status) {
          case 'healthy':
            healthySavers++;
            break;
          case 'degraded':
            degradedSavers++;
            break;
          case 'unhealthy':
            unhealthySavers++;
            break;
          default:
            // Unknown status - treat as unhealthy
            unhealthySavers++;
            break;
        }

        saverDetails[saverName] = {
          status,
          uptime: this.calculateUptime(saverName),
          averageResponseTime: this.calculateAverageResponseTime(saverName),
          recentErrors: this.getRecentErrorCount(saverName),
        };
      }
    }

    const overall = {
      healthy: unhealthySavers === 0 && degradedSavers === 0,
      totalSavers: availableSavers.length,
      healthySavers,
      degradedSavers,
      unhealthySavers,
    };

    const trends = this.analyzeTrends();
    const recommendations = this.generateRecommendations(
      overall,
      saverDetails,
      trends
    );

    return {
      overall,
      savers: saverDetails,
      trends,
      recommendations,
    };
  }

  /**
   * Get detailed diagnostic information
   */
  public async getDiagnosticInfo(saverName?: string): Promise<{
    saver: string;
    status: HealthStatus;
    storageInfo?: {
      type: string;
      version?: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      details?: Record<string, unknown>;
    };
    metrics: {
      operations: {
        save: {
          totalTime: number;
          count: number;
          successCount: number;
          errorCount: number;
        };
        load: {
          totalTime: number;
          count: number;
          successCount: number;
          errorCount: number;
        };
      };
      performance: {
        averageSaveTime: number;
        averageLoadTime: number;
      };
    };
    issues: string[];
    suggestions: string[];
  }> {
    const actualSaverName =
      saverName || this.registryService.getDefaultSaverName() || 'default';
    const saver = this.registryService.getSaver(actualSaverName);
    const status = await this.getHealthStatus(actualSaverName);

    let storageInfo;
    if (saver.getStorageInfo) {
      try {
        storageInfo = await saver.getStorageInfo();
      } catch (error) {
        this.logger.warn(
          `Failed to get storage info for ${actualSaverName}:`,
          error
        );
      }
    }

    const metrics = this.metricsService.getMetrics(actualSaverName);
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Analyze issues and suggestions
    if (!status.healthy) {
      issues.push('Saver is currently unhealthy');
      suggestions.push('Check storage backend connectivity and configuration');
    }

    if (status.responseTime > this.healthConfig.degradedThreshold) {
      issues.push(`High response time: ${status.responseTime}ms`);
      suggestions.push(
        'Consider optimizing storage backend or scaling resources'
      );
    }

    if (metrics.save.errorCount > 0 || metrics.load.errorCount > 0) {
      issues.push('Recent errors detected in operations');
      suggestions.push('Review error logs and address underlying causes');
    }

    return {
      saver: actualSaverName,
      status,
      storageInfo,
      metrics: {
        operations: metrics,
        performance: {
          averageSaveTime:
            metrics.save.count > 0
              ? metrics.save.totalTime / metrics.save.count
              : 0,
          averageLoadTime:
            metrics.load.count > 0
              ? metrics.load.totalTime / metrics.load.count
              : 0,
        },
      },
      issues,
      suggestions,
    };
  }

  /**
   * Load health monitoring configuration
   */
  private loadHealthConfig(): HealthConfig {
    return {
      checkInterval: this.configService.get<number>(
        'checkpoint.health.checkInterval',
        60000 // 1 minute
      ),
      unhealthyThreshold: this.configService.get<number>(
        'checkpoint.health.unhealthyThreshold',
        5000 // 5 seconds
      ),
      degradedThreshold: this.configService.get<number>(
        'checkpoint.health.degradedThreshold',
        2000 // 2 seconds
      ),
    };
  }

  /**
   * Perform basic health check using simple operations
   */
  private async performBasicHealthCheck(saver: {
    list?: (
      config: { configurable: { thread_id: string } },
      options?: { limit: number }
    ) => AsyncIterableIterator<unknown>;
  }): Promise<boolean> {
    try {
      const testConfig = { configurable: { thread_id: 'health-check' } };
      if (!saver.list) {
        return false;
      }
      const generator = saver.list(testConfig, { limit: 1 });

      // Try to get first item from generator
      await generator.next();
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Update health status for a saver
   */
  private updateHealthStatus(
    saverName: string,
    healthy: boolean,
    responseTime: number,
    error?: string
  ): void {
    const status: HealthStatus = {
      healthy,
      status: this.determineHealthStatus(healthy, responseTime),
      lastCheck: new Date(),
      responseTime,
      error,
    };

    this.currentHealthStatus.set(saverName, status);
  }

  /**
   * Determine health status based on response time and health
   */
  private determineHealthStatus(
    healthy: boolean,
    responseTime: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!healthy) {
      return 'unhealthy';
    }
    if (responseTime > this.healthConfig.degradedThreshold) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Record health check result
   */
  private recordHealthCheck(
    saverName: string,
    healthy: boolean,
    responseTime: number,
    error?: string
  ): void {
    this.healthHistory.push({
      timestamp: new Date(),
      saverName,
      healthy,
      responseTime,
      error,
    });

    // Trim history if it gets too large
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.splice(
        0,
        this.healthHistory.length - this.maxHistorySize
      );
    }
  }

  /**
   * Perform scheduled health checks
   */
  private async performScheduledHealthChecks(): Promise<void> {
    this.logger.debug('Performing scheduled health checks');
    await this.healthCheckAll();
  }

  /**
   * Calculate uptime percentage for a saver
   */
  private calculateUptime(saverName: string): number {
    const recentHistory = this.getRecentHealthHistory(saverName, 3600000); // Last hour

    if (recentHistory.length === 0) {
      return 100;
    } // No data, assume healthy

    const healthyChecks = recentHistory.filter(
      (record) => record.healthy
    ).length;
    return (healthyChecks / recentHistory.length) * 100;
  }

  /**
   * Calculate average response time for a saver
   */
  private calculateAverageResponseTime(saverName: string): number {
    const recentHistory = this.getRecentHealthHistory(saverName, 3600000); // Last hour

    if (recentHistory.length === 0) {
      return 0;
    }

    const totalTime = recentHistory.reduce(
      (sum, record) => sum + record.responseTime,
      0
    );
    return totalTime / recentHistory.length;
  }

  /**
   * Get recent error count for a saver
   */
  private getRecentErrorCount(saverName: string): number {
    const recentHistory = this.getRecentHealthHistory(saverName, 3600000); // Last hour
    return recentHistory.filter((record) => !record.healthy).length;
  }

  /**
   * Get recent health history for a saver
   */
  private getRecentHealthHistory(
    saverName: string,
    timeframeMs: number
  ): HealthRecord[] {
    const cutoff = new Date(Date.now() - timeframeMs);
    return this.healthHistory.filter(
      (record) => record.saverName === saverName && record.timestamp >= cutoff
    );
  }

  /**
   * Analyze health trends
   */
  private analyzeTrends(): {
    healthTrend: 'improving' | 'stable' | 'degrading';
    responseTimeTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
  } {
    // Simplified trend analysis - could be enhanced with more sophisticated algorithms
    const recentHistory = this.healthHistory.slice(-50); // Last 50 checks

    if (recentHistory.length < 10) {
      return {
        healthTrend: 'stable',
        responseTimeTrend: 'stable',
        errorTrend: 'stable',
      };
    }

    const midpoint = Math.floor(recentHistory.length / 2);
    const firstHalf = recentHistory.slice(0, midpoint);
    const secondHalf = recentHistory.slice(midpoint);

    // Health trend
    const firstHalfHealthy =
      firstHalf.filter((r) => r.healthy).length / firstHalf.length;
    const secondHalfHealthy =
      secondHalf.filter((r) => r.healthy).length / secondHalf.length;
    let healthTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (secondHalfHealthy > firstHalfHealthy + 0.1) {
      healthTrend = 'improving';
    } else if (secondHalfHealthy < firstHalfHealthy - 0.1) {
      healthTrend = 'degrading';
    }

    // Response time trend
    const firstHalfAvgTime =
      firstHalf.reduce((sum, r) => sum + r.responseTime, 0) / firstHalf.length;
    const secondHalfAvgTime =
      secondHalf.reduce((sum, r) => sum + r.responseTime, 0) /
      secondHalf.length;
    let responseTimeTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (secondHalfAvgTime < firstHalfAvgTime * 0.9) {
      responseTimeTrend = 'improving';
    } else if (secondHalfAvgTime > firstHalfAvgTime * 1.1) {
      responseTimeTrend = 'degrading';
    }

    // Error trend
    const firstHalfErrors =
      firstHalf.filter((r) => !r.healthy).length / firstHalf.length;
    const secondHalfErrors =
      secondHalf.filter((r) => !r.healthy).length / secondHalf.length;
    let errorTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (secondHalfErrors < firstHalfErrors - 0.05) {
      errorTrend = 'improving';
    } else if (secondHalfErrors > firstHalfErrors + 0.05) {
      errorTrend = 'degrading';
    }

    return {
      healthTrend,
      responseTimeTrend,
      errorTrend,
    };
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(
    overall: {
      healthy: boolean;
      totalSavers: number;
      healthySavers: number;
      degradedSavers: number;
      unhealthySavers: number;
    },
    saverDetails: Record<
      string,
      {
        status: HealthStatus;
        uptime: number;
        averageResponseTime: number;
        recentErrors: number;
      }
    >,
    trends: {
      healthTrend: 'improving' | 'stable' | 'degrading';
      responseTimeTrend: 'improving' | 'stable' | 'degrading';
      errorTrend: 'improving' | 'stable' | 'degrading';
    }
  ): string[] {
    const recommendations: string[] = [];

    if (overall.unhealthySavers > 0) {
      recommendations.push(
        `${overall.unhealthySavers} saver(s) are unhealthy - immediate attention required`
      );
    }

    if (overall.degradedSavers > 0) {
      recommendations.push(
        `${overall.degradedSavers} saver(s) show degraded performance - monitor closely`
      );
    }

    if (trends.healthTrend === 'degrading') {
      recommendations.push(
        'Health trend is degrading - investigate potential issues'
      );
    }

    if (trends.responseTimeTrend === 'degrading') {
      recommendations.push(
        'Response times are increasing - consider performance optimization'
      );
    }

    if (trends.errorTrend === 'degrading') {
      recommendations.push(
        'Error rates are increasing - review system logs and configurations'
      );
    }

    if (overall.totalSavers === 0) {
      recommendations.push(
        'No checkpoint savers configured - add at least one storage backend'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems appear healthy - continue monitoring');
    }

    return recommendations;
  }
}
