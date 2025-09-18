import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { BusinessMetricsService } from './business-metrics.service';
import type {
  CustomerSupportMetrics,
  BusinessImpact,
} from '../types';

/**
 * Metrics Analytics Service
 * Handles all metrics and analytics operations
 */
@Injectable()
export class MetricsAnalyticsService {

  constructor(
    private readonly metricsService: BusinessMetricsService
  ) {}

  /**
   * Get customer support metrics
   */
  async getMetrics(
    timeRange?: 'day' | 'week' | 'month' | 'quarter'
  ): Promise<CustomerSupportMetrics> {
    return await this.metricsService.calculateRealTimeMetrics();
  }

  /**
   * Get business impact analysis
   */
  async getBusinessImpact(
    timeRange?: 'day' | 'week' | 'month' | 'quarter'
  ): Promise<BusinessImpact> {
    return await this.metricsService.getBusinessImpact(timeRange || 'month');
  }

  /**
   * Get metrics for a specific customer
   */
  async getCustomerMetrics(customerId: string) {
    return await this.metricsService.getCustomerMetrics(customerId);
  }

  /**
   * Server-Sent Events stream for real-time metrics
   */
  streamMetrics(): Observable<MessageEvent> {
    return new Observable((observer) => {
      const interval = setInterval(async () => {
        try {
          const metrics = await this.metricsService.calculateRealTimeMetrics();
          observer.next({
            type: 'metrics',
            data: metrics,
          } as MessageEvent);
        } catch (error) {
          observer.error(error);
        }
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    });
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getDashboardAnalytics(timeRange: 'day' | 'week' | 'month' | 'quarter' = 'month') {
    try {
      const [metrics, businessImpact] = await Promise.all([
        this.metricsService.calculateRealTimeMetrics(),
        this.metricsService.getBusinessImpact(timeRange),
      ]);

      return {
        success: true,
        data: {
          overview: metrics,
          businessImpact,
          timeRange,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(timeRange: 'day' | 'week' | 'month' | 'quarter' = 'week') {
    try {
      // Generate trend data based on time range
      const trends = await this.generateTrendData(timeRange);
      
      return {
        success: true,
        data: {
          trends,
          timeRange,
          insights: this.generateInsights(trends),
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance() {
    try {
      // Mock agent performance data - would be replaced with actual metrics
      const agentPerformance = {
        agents: [
          {
            id: 'customer-support-agent',
            name: 'Customer Support Agent',
            performance: {
              ticketsProcessed: 156,
              averageResponseTime: 45000, // 45 seconds
              successRate: 0.94,
              customerSatisfaction: 4.2,
            },
          },
        ],
        totalTicketsProcessed: 156,
        averagePerformanceScore: 0.94,
      };

      return {
        success: true,
        data: agentPerformance,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Private helper methods

  private async generateTrendData(timeRange: string) {
    // Generate mock trend data - would be replaced with actual historical data
    const now = new Date();
    const dataPoints = timeRange === 'day' ? 24 : timeRange === 'week' ? 7 : 30;
    
    const trends = [];
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now);
      if (timeRange === 'day') {
        date.setHours(date.getHours() - i);
      } else if (timeRange === 'week') {
        date.setDate(date.getDate() - i);
      } else {
        date.setDate(date.getDate() - i);
      }

      trends.push({
        timestamp: date.toISOString(),
        ticketsProcessed: Math.floor(Math.random() * 50) + 10,
        averageResponseTime: Math.floor(Math.random() * 30000) + 15000,
        successRate: 0.8 + Math.random() * 0.2,
        customerSatisfaction: 3.5 + Math.random() * 1.5,
      });
    }

    return trends;
  }

  private generateInsights(trends: any[]) {
    const insights = [];
    
    if (trends.length > 1) {
      const latest = trends[trends.length - 1];
      const previous = trends[trends.length - 2];
      
      // Response time insight
      const responseTimeDiff = latest.averageResponseTime - previous.averageResponseTime;
      if (responseTimeDiff < -5000) {
        insights.push({
          type: 'improvement',
          message: 'Response times have improved significantly',
          impact: 'positive',
        });
      } else if (responseTimeDiff > 5000) {
        insights.push({
          type: 'concern',
          message: 'Response times are increasing',
          impact: 'negative',
        });
      }
      
      // Success rate insight
      const successRateDiff = latest.successRate - previous.successRate;
      if (successRateDiff > 0.05) {
        insights.push({
          type: 'improvement',
          message: 'Success rates are trending upward',
          impact: 'positive',
        });
      } else if (successRateDiff < -0.05) {
        insights.push({
          type: 'concern',
          message: 'Success rates are declining',
          impact: 'negative',
        });
      }
    }

    return insights;
  }
}