import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBHealthIndicator } from '@hive-academy/nestjs-chromadb';

/**
 * PerformanceMetrics - Aggregated performance statistics
 */
export interface PerformanceMetrics {
  avgResponseTime: number;
  operationsPerSecond: number;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  slowQueries: Array<{
    operation: string;
    duration: number;
    timestamp: Date;
  }>;
  errorRate: number;
}

/**
 * CachingMetrics - Cache performance statistics
 */
export interface CachingMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: number;
  avgResponseTime: number;
  totalOperations: number;
}

/**
 * ReliabilityMetrics - Retry and circuit breaker statistics
 */
export interface ReliabilityMetrics {
  errorRate: number;
  circuitBreakerTrips: number;
  successfulRetries: number;
  totalRetries: number;
  avgRetryDelay: number;
}

/**
 * HealthMetrics - System health status
 */
export interface HealthMetrics {
  connection: boolean;
  collections: boolean;
  embedding: boolean;
  cache: boolean;
  multiTenant: boolean;
}

/**
 * RepositoryMetrics - Per-collection metrics
 */
export interface RepositoryMetrics {
  collections: Array<{
    collection: string;
    count: number;
    exists: boolean;
  }>;
}

/**
 * PerformanceDashboard - Comprehensive dashboard data
 */
export interface PerformanceDashboard {
  performance: PerformanceMetrics;
  caching: CachingMetrics;
  reliability: ReliabilityMetrics;
  health: HealthMetrics;
  timestamp: Date;
}

/**
 * PerformanceDashboardService - Aggregates all ChromaDB performance metrics
 *
 * Purpose: Provide unified interface for monitoring ChromaDB performance
 * Features:
 * - Real-time performance metrics aggregation
 * - Cache hit rate analysis
 * - Circuit breaker and retry statistics
 * - System health monitoring
 * - Per-collection metrics tracking
 */
@Injectable()
export class PerformanceDashboardService {
  private readonly logger = new Logger(PerformanceDashboardService.name);

  // Known collections in the system
  private readonly COLLECTIONS = [
    'vector-memories',
    'brand-evolution',
    'dev-achievements',
    'content-metrics',
    'developer-profiles',
  ];

  constructor(private readonly chromaHealth: ChromaDBHealthIndicator) {}

  /**
   * Get comprehensive performance dashboard metrics
   *
   * @returns Aggregated performance, caching, reliability, and health metrics
   */
  async getComprehensiveMetrics(): Promise<PerformanceDashboard> {
    this.logger.debug('Fetching comprehensive performance metrics');

    try {
      // Fetch all metrics in parallel for performance
      const [performanceStats, cacheStats, retryStats, healthMetrics] =
        await Promise.all([
          this.getPerformanceStatistics(),
          this.getCacheStatistics(),
          this.getRetryStatistics(),
          this.getHealthMetrics(),
        ]);

      return {
        performance: performanceStats,
        caching: cacheStats,
        reliability: retryStats,
        health: healthMetrics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch comprehensive metrics', error);
      throw error;
    }
  }

  /**
   * Get repository-level metrics for all collections
   *
   * @returns Per-collection metrics
   */
  async getRepositoryMetrics(): Promise<RepositoryMetrics> {
    this.logger.debug('Fetching repository-level metrics');

    try {
      const metrics = await Promise.all(
        this.COLLECTIONS.map(async (collection) => ({
          collection,
          count: await this.getCollectionCount(collection),
          exists: await this.collectionExists(collection),
        }))
      );

      return { collections: metrics };
    } catch (error) {
      this.logger.error('Failed to fetch repository metrics', error);
      throw error;
    }
  }

  /**
   * Get performance optimization recommendations
   *
   * @returns Array of actionable recommendations
   */
  async getOptimizationRecommendations(): Promise<
    Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
      currentValue: number;
      targetValue: number;
    }>
  > {
    const dashboard = await this.getComprehensiveMetrics();
    const recommendations: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
      currentValue: number;
      targetValue: number;
    }> = [];

    // Cache hit rate recommendations
    if (dashboard.caching.hitRate < 0.7) {
      recommendations.push({
        category: 'Caching',
        severity: dashboard.caching.hitRate < 0.5 ? 'high' : 'medium',
        recommendation:
          'Increase cache TTL or enable background refresh for frequently accessed data',
        currentValue: dashboard.caching.hitRate,
        targetValue: 0.8,
      });
    }

    // Response time recommendations
    if (dashboard.performance.avgResponseTime > 100) {
      recommendations.push({
        category: 'Performance',
        severity:
          dashboard.performance.avgResponseTime > 200 ? 'high' : 'medium',
        recommendation:
          'Enable caching decorators on frequently called repository methods',
        currentValue: dashboard.performance.avgResponseTime,
        targetValue: 50,
      });
    }

    // Error rate recommendations
    if (dashboard.reliability.errorRate > 0.05) {
      recommendations.push({
        category: 'Reliability',
        severity: dashboard.reliability.errorRate > 0.1 ? 'high' : 'medium',
        recommendation:
          'Investigate and fix recurring errors or increase retry attempts',
        currentValue: dashboard.reliability.errorRate,
        targetValue: 0.01,
      });
    }

    // Circuit breaker recommendations
    if (dashboard.reliability.circuitBreakerTrips > 5) {
      recommendations.push({
        category: 'Reliability',
        severity: 'high',
        recommendation:
          'Frequent circuit breaker trips indicate underlying stability issues',
        currentValue: dashboard.reliability.circuitBreakerTrips,
        targetValue: 0,
      });
    }

    return recommendations;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Get performance statistics
   * Note: In production, this would use actual getPerformanceStatistics() from ChromaDB
   */
  private async getPerformanceStatistics(): Promise<PerformanceMetrics> {
    // TODO: Import and use actual getPerformanceStatistics() when available
    // For now, return mock data structure
    return {
      avgResponseTime: 45.5,
      operationsPerSecond: 120.3,
      percentiles: {
        p50: 30,
        p95: 95,
        p99: 150,
      },
      slowQueries: [],
      errorRate: 0.02,
    };
  }

  /**
   * Get cache statistics
   * Note: In production, this would use actual getCacheStatistics() from ChromaDB
   */
  private async getCacheStatistics(): Promise<CachingMetrics> {
    // TODO: Import and use actual getCacheStatistics() when available
    return {
      hitRate: 0.85,
      missRate: 0.15,
      evictionRate: 0.05,
      memoryUsage: 45.2,
      avgResponseTime: 12.3,
      totalOperations: 15420,
    };
  }

  /**
   * Get retry statistics
   * Note: In production, this would use actual getRetryStatistics() from ChromaDB
   */
  private async getRetryStatistics(): Promise<ReliabilityMetrics> {
    // TODO: Import and use actual getRetryStatistics() when available
    return {
      errorRate: 0.02,
      circuitBreakerTrips: 0,
      successfulRetries: 45,
      totalRetries: 48,
      avgRetryDelay: 1250,
    };
  }

  /**
   * Get health metrics using ChromaDBHealthIndicator
   */
  private async getHealthMetrics(): Promise<HealthMetrics> {
    try {
      const healthCheck = await this.chromaHealth.isHealthyDetailed('chromadb');
      const chromaStatus = healthCheck.chromadb;

      return {
        connection: chromaStatus.status === 'up',
        collections: chromaStatus.status === 'up',
        embedding: chromaStatus.status === 'up',
        cache: chromaStatus.status === 'up',
        multiTenant: chromaStatus.status === 'up',
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        connection: false,
        collections: false,
        embedding: false,
        cache: false,
        multiTenant: false,
      };
    }
  }

  /**
   * Get collection count
   * Note: This method would use ChromaDBService in production
   */
  private async getCollectionCount(collection: string): Promise<number> {
    try {
      // TODO: Import ChromaDBService and use countDocuments method
      // For now, return mock data
      this.logger.debug(`Getting count for collection: ${collection}`);
      return 0;
    } catch (error) {
      this.logger.warn(
        `Failed to get count for collection ${collection}`,
        error
      );
      return 0;
    }
  }

  /**
   * Check if collection exists
   * Note: This method would use ChromaDBService in production
   */
  private async collectionExists(collection: string): Promise<boolean> {
    try {
      // TODO: Import ChromaDBService and use collectionExists method
      // For now, return true for known collections
      this.logger.debug(`Checking existence of collection: ${collection}`);
      return this.COLLECTIONS.includes(collection);
    } catch (error) {
      this.logger.warn(
        `Failed to check existence of collection ${collection}`,
        error
      );
      return false;
    }
  }
}
