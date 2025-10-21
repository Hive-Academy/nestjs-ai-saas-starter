import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceDashboardService } from '../services/performance-dashboard.service';

/**
 * Performance Monitoring Controller
 *
 * Provides comprehensive ChromaDB performance metrics and optimization recommendations.
 * Part of Phase 1: Core Profiling & Monitoring implementation.
 */
@Controller('performance')
@ApiTags('Performance Monitoring')
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceDashboardService
  ) {}

  /**
   * Get comprehensive performance dashboard
   *
   * @returns Aggregated performance, caching, reliability, and health metrics
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Performance Dashboard',
    description:
      'Comprehensive performance metrics including ChromaDB operations, caching, reliability, and health',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance dashboard data',
    schema: {
      type: 'object',
      properties: {
        performance: {
          type: 'object',
          properties: {
            avgResponseTime: { type: 'number', example: 45.5 },
            operationsPerSecond: { type: 'number', example: 120.3 },
            percentiles: {
              type: 'object',
              properties: {
                p50: { type: 'number', example: 30 },
                p95: { type: 'number', example: 95 },
                p99: { type: 'number', example: 150 },
              },
            },
            slowQueries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  operation: { type: 'string' },
                  duration: { type: 'number' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
            errorRate: { type: 'number', example: 0.02 },
          },
        },
        caching: {
          type: 'object',
          properties: {
            hitRate: { type: 'number', example: 0.85 },
            missRate: { type: 'number', example: 0.15 },
            evictionRate: { type: 'number', example: 0.05 },
            memoryUsage: { type: 'number', example: 45.2 },
            avgResponseTime: { type: 'number', example: 12.3 },
            totalOperations: { type: 'number', example: 15420 },
          },
        },
        reliability: {
          type: 'object',
          properties: {
            errorRate: { type: 'number', example: 0.02 },
            circuitBreakerTrips: { type: 'number', example: 0 },
            successfulRetries: { type: 'number', example: 45 },
            totalRetries: { type: 'number', example: 48 },
            avgRetryDelay: { type: 'number', example: 1250 },
          },
        },
        health: {
          type: 'object',
          properties: {
            connection: { type: 'boolean', example: true },
            collections: { type: 'boolean', example: true },
            embedding: { type: 'boolean', example: true },
            cache: { type: 'boolean', example: true },
            multiTenant: { type: 'boolean', example: false },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getDashboard() {
    return this.performanceService.getComprehensiveMetrics();
  }

  /**
   * Get repository-level metrics
   *
   * @returns Per-collection metrics for all ChromaDB collections
   */
  @Get('repositories')
  @ApiOperation({
    summary: 'Repository Metrics',
    description:
      'Per-collection metrics including document counts and collection existence',
  })
  @ApiResponse({
    status: 200,
    description: 'Repository-level metrics',
    schema: {
      type: 'object',
      properties: {
        collections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              collection: { type: 'string', example: 'vector-memories' },
              count: { type: 'number', example: 1523 },
              exists: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  async getRepositoryMetrics() {
    return this.performanceService.getRepositoryMetrics();
  }

  /**
   * Get optimization recommendations
   *
   * @returns Array of actionable performance optimization recommendations
   */
  @Get('recommendations')
  @ApiOperation({
    summary: 'Optimization Recommendations',
    description:
      'AI-powered performance optimization recommendations based on current metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance optimization recommendations',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            example: 'Caching',
            enum: ['Caching', 'Performance', 'Reliability'],
          },
          severity: {
            type: 'string',
            example: 'medium',
            enum: ['low', 'medium', 'high'],
          },
          recommendation: {
            type: 'string',
            example:
              'Increase cache TTL or enable background refresh for frequently accessed data',
          },
          currentValue: { type: 'number', example: 0.65 },
          targetValue: { type: 'number', example: 0.8 },
        },
      },
    },
  })
  async getOptimizationRecommendations() {
    return this.performanceService.getOptimizationRecommendations();
  }

  /**
   * Get performance summary (quick overview)
   *
   * @returns Condensed performance summary for quick health checks
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Performance Summary',
    description: 'Quick performance overview with key metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance summary',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'healthy',
          enum: ['healthy', 'degraded', 'critical'],
        },
        avgResponseTime: { type: 'number', example: 45.5 },
        cacheHitRate: { type: 'number', example: 0.85 },
        errorRate: { type: 'number', example: 0.02 },
        systemHealth: { type: 'boolean', example: true },
        recommendationsCount: { type: 'number', example: 2 },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getPerformanceSummary() {
    const dashboard = await this.performanceService.getComprehensiveMetrics();
    const recommendations =
      await this.performanceService.getOptimizationRecommendations();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (
      dashboard.performance.avgResponseTime > 200 ||
      dashboard.caching.hitRate < 0.5 ||
      dashboard.reliability.errorRate > 0.1
    ) {
      status = 'critical';
    } else if (
      dashboard.performance.avgResponseTime > 100 ||
      dashboard.caching.hitRate < 0.7 ||
      dashboard.reliability.errorRate > 0.05
    ) {
      status = 'degraded';
    }

    return {
      status,
      avgResponseTime: dashboard.performance.avgResponseTime,
      cacheHitRate: dashboard.caching.hitRate,
      errorRate: dashboard.reliability.errorRate,
      systemHealth:
        dashboard.health.connection &&
        dashboard.health.collections &&
        dashboard.health.embedding,
      recommendationsCount: recommendations.length,
      timestamp: dashboard.timestamp,
    };
  }
}
