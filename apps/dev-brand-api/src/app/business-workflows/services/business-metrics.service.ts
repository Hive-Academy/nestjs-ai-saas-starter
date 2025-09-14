import { Inject, Injectable } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  STREAMING_SERVICE_TOKEN,
  IStreamingService,
} from '@hive-academy/langgraph-core';
import {
  BusinessImpact,
  CustomerSupportMetrics,
  CustomerSupportState,
} from '../types';

/**
 * Business Metrics Service
 * Tracks and analyzes customer support performance metrics
 * Following REFACTORING_GUIDE.md specifications
 */
@Injectable()
export class BusinessMetricsService {
  constructor(
    private readonly neo4j: Neo4jService,
    @Inject(STREAMING_SERVICE_TOKEN)
    private readonly streaming: IStreamingService
  ) {}

  /**
   * Track customer support workflow execution
   */
  async trackCustomerSupport(execution: CustomerSupportState): Promise<void> {
    try {
      // Store execution data in Neo4j for relationship analysis
      await this.neo4j.run(
        `
        CREATE (e:Execution {
          id: $id,
          type: 'customer_support',
          duration: $duration,
          success: $success,
          escalated: $escalated,
          requiresApproval: $requiresApproval,
          businessImpact: $businessImpact,
          sentiment: $sentiment,
          complexity: $complexity,
          timestamp: datetime(),
          metadata: $metadata
        })
        MERGE (c:Customer {id: $customerId})
        CREATE (c)-[:HAD_SUPPORT]->(e)

        WITH e, c
        MERGE (cat:Category {name: $category})
        CREATE (e)-[:BELONGS_TO]->(cat)

        WITH e
        UNWIND $suggestedActions as action
        MERGE (a:Action {name: action})
        CREATE (e)-[:SUGGESTED]->(a)
      `,
        {
          id: execution.ticketId,
          duration: execution.completedAt
            ? execution.completedAt - execution.startTime
            : null,
          success: execution.status === 'completed',
          escalated: execution.escalationRequired || false,
          requiresApproval: execution.requiresApproval || false,
          businessImpact: execution.analysis?.businessImpact || 'low',
          sentiment: execution.analysis?.sentiment || 0,
          complexity: execution.analysis?.complexity || 'moderate',
          customerId: execution.ticket.customerId,
          category: execution.ticket.category,
          suggestedActions: execution.suggestedActions || [],
          metadata: JSON.stringify(execution.metadata || {}),
        }
      );

      // Stream real-time metrics update
      const metrics = await this.calculateRealTimeMetrics();
      await this.streaming.emitEvent('customer_support_metrics', {
        data: metrics,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error tracking customer support execution:', error);
    }
  }

  /**
   * Get comprehensive business impact analysis
   */
  async getBusinessImpact(
    timeRange: 'day' | 'week' | 'month' | 'quarter' = 'month'
  ): Promise<BusinessImpact> {
    try {
      const duration = this.getTimeRangeDuration(timeRange);

      const results = await this.neo4j.run(`
        MATCH (e:Execution {type: 'customer_support'})
        WHERE e.timestamp > datetime() - duration('${duration}')

        OPTIONAL MATCH (e)<-[:HAD_SUPPORT]-(c:Customer)

        WITH e, c,
             CASE WHEN e.success THEN 1 ELSE 0 END as successful,
             CASE WHEN e.escalated THEN 1 ELSE 0 END as escalated,
             CASE WHEN c.tier = 'enterprise' THEN 500
                  WHEN c.tier = 'premium' THEN 100
                  ELSE 20 END as customerValue

        RETURN
          avg(e.duration) as avgResolutionTime,
          count(e) as totalTickets,
          sum(successful) as resolvedTickets,
          sum(escalated) as escalations,
          avg(e.sentiment) as avgSentiment,
          avg(customerValue) as avgCustomerValue,

          // Calculate cost savings (compared to human-only support)
          sum(CASE WHEN e.success AND NOT e.escalated
                   THEN customerValue * 0.8
                   ELSE 0 END) as estimatedCostSavings,

          // Performance by complexity
          avg(CASE WHEN e.complexity = 'simple' THEN e.duration END) as simpleAvgTime,
          avg(CASE WHEN e.complexity = 'moderate' THEN e.duration END) as moderateAvgTime,
          avg(CASE WHEN e.complexity = 'complex' THEN e.duration END) as complexAvgTime,

          // Business impact metrics
          sum(CASE WHEN e.businessImpact = 'critical' THEN 1 ELSE 0 END) as criticalIssues,
          sum(CASE WHEN e.businessImpact = 'high' THEN 1 ELSE 0 END) as highImpactIssues
      `);

      if (!results || results.records.length === 0) {
        return this.getDefaultBusinessImpact();
      }

      const record = results.records[0];
      const avgResolutionTime =
        (record.get('avgResolutionTime') as number) || 0;
      const totalTickets = (record.get('totalTickets') as number) || 0;
      const resolvedTickets = (record.get('resolvedTickets') as number) || 0;
      const escalations = (record.get('escalations') as number) || 0;
      const avgSentiment = (record.get('avgSentiment') as number) || 0;
      const estimatedCostSavings =
        (record.get('estimatedCostSavings') as number) || 0;

      return {
        avgResolutionTime,
        ticketsResolved: resolvedTickets,
        escalationRate: totalTickets > 0 ? escalations / totalTickets : 0,
        customerSatisfaction: this.sentimentToSatisfaction(avgSentiment),
        costSavings: estimatedCostSavings,
        timeToResolution: avgResolutionTime,
        agentProductivity: this.calculateProductivity({
          avgResolutionTime,
          totalTickets,
          resolvedTickets,
        }),
        customerRetention: this.calculateRetention(avgSentiment),
      };
    } catch (error) {
      console.error('Error calculating business impact:', error);
      return this.getDefaultBusinessImpact();
    }
  }

  /**
   * Get real-time customer support metrics for streaming
   */
  async calculateRealTimeMetrics(): Promise<CustomerSupportMetrics> {
    try {
      const results = await this.neo4j.run(`
        MATCH (e:Execution {type: 'customer_support'})
        WHERE e.timestamp > datetime() - duration('P1D') // Last 24 hours

        WITH e,
             CASE WHEN e.success THEN 1 ELSE 0 END as successful,
             CASE WHEN e.escalated THEN 1 ELSE 0 END as escalated,
             CASE WHEN e.requiresApproval THEN 0 ELSE 1 END as automated

        RETURN
          count(e) as totalTickets,
          sum(successful) as resolvedTickets,
          avg(e.duration) as avgResolutionTime,
          avg((e.sentiment + 1) * 2.5) as avgSatisfactionScore, // Convert -1,1 to 0,5 scale
          sum(escalated) as escalations,
          sum(automated) as automatedTickets,

          // Response time calculation (first analysis completion)
          avg(CASE WHEN e.metadata IS NOT NULL
                   THEN toInteger(replace(e.metadata, '.*"analysisCompletedAt":([0-9]+).*', '$1')) -
                        toInteger(replace(e.metadata, '.*"initialProcessingTime":([0-9]+).*', '$1'))
                   ELSE null END) as avgResponseTime
      `);

      if (!results || results.records.length === 0) {
        return this.getDefaultMetrics();
      }

      const record = results.records[0];
      const totalTickets = (record.get('totalTickets') as number) || 0;
      const resolvedTickets = (record.get('resolvedTickets') as number) || 0;
      const avgResolutionTime =
        (record.get('avgResolutionTime') as number) || 0;
      const avgSatisfactionScore =
        (record.get('avgSatisfactionScore') as number) || 3.0;
      const escalations = (record.get('escalations') as number) || 0;
      const automatedTickets = (record.get('automatedTickets') as number) || 0;
      const avgResponseTime = (record.get('avgResponseTime') as number) || 0;

      return {
        totalTickets,
        resolvedTickets,
        avgResolutionTime,
        avgSatisfactionScore,
        escalationRate: totalTickets > 0 ? escalations / totalTickets : 0,
        automationRate: totalTickets > 0 ? automatedTickets / totalTickets : 0,
        costSavings: this.calculateCostSavings({ automatedTickets }),
        responseTime: avgResponseTime,
        firstContactResolution:
          totalTickets > 0 ? (resolvedTickets - escalations) / totalTickets : 0,
        customerSatisfactionTrend: await this.getSatisfactionTrend(),
      };
    } catch (error) {
      console.error('Error calculating real-time metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get customer satisfaction trend for the last 7 days
   */
  async getSatisfactionTrend(): Promise<number[]> {
    try {
      const results = await this.neo4j.run(`
        MATCH (e:Execution {type: 'customer_support'})
        WHERE e.timestamp > datetime() - duration('P7D')

        WITH e,
             date(e.timestamp) as executionDate,
             (e.sentiment + 1) * 2.5 as satisfaction

        WITH executionDate, avg(satisfaction) as dailySatisfaction
        ORDER BY executionDate

        RETURN collect(dailySatisfaction) as trend
      `);

      const record = results?.records?.[0];
      const trend = record?.get('trend') as number[];
      if (results && results.records.length > 0 && trend) {
        return trend.map((score: number) => Math.round(score * 100) / 100);
      }

      // Return default trend if no data
      return [3.0, 3.1, 3.2, 3.1, 3.3, 3.2, 3.4];
    } catch (error) {
      console.error('Error getting satisfaction trend:', error);
      return [3.0, 3.1, 3.2, 3.1, 3.3, 3.2, 3.4];
    }
  }

  /**
   * Get metrics for a specific customer
   */
  async getCustomerMetrics(
    customerId: string
  ): Promise<Partial<CustomerSupportMetrics>> {
    try {
      const results = await this.neo4j.run(
        `
        MATCH (c:Customer {id: $customerId})-[:HAD_SUPPORT]->(e:Execution {type: 'customer_support'})

        WITH c, e,
             CASE WHEN e.success THEN 1 ELSE 0 END as successful,
             CASE WHEN e.escalated THEN 1 ELSE 0 END as escalated

        RETURN
          count(e) as totalTickets,
          sum(successful) as resolvedTickets,
          avg(e.duration) as avgResolutionTime,
          avg((e.sentiment + 1) * 2.5) as avgSatisfactionScore,
          sum(escalated) as escalations
      `,
        { customerId }
      );

      if (!results || results.records.length === 0) {
        return { totalTickets: 0, resolvedTickets: 0 };
      }

      const record = results.records[0];
      const totalTickets = (record.get('totalTickets') as number) || 0;
      const resolvedTickets = (record.get('resolvedTickets') as number) || 0;
      const avgResolutionTime =
        (record.get('avgResolutionTime') as number) || 0;
      const avgSatisfactionScore =
        (record.get('avgSatisfactionScore') as number) || 3.0;
      const escalations = (record.get('escalations') as number) || 0;

      return {
        totalTickets,
        resolvedTickets,
        avgResolutionTime,
        avgSatisfactionScore,
        escalationRate: totalTickets > 0 ? escalations / totalTickets : 0,
      };
    } catch (error) {
      console.error('Error getting customer metrics:', error);
      return { totalTickets: 0, resolvedTickets: 0 };
    }
  }

  /**
   * Stream metric update to connected clients
   */
  async streamMetricUpdate(metric: string, value: number): Promise<void> {
    await this.streaming.emitEvent('metric_update', {
      data: { [metric]: value },
      timestamp: Date.now(),
    });
  }

  // Private helper methods

  private getTimeRangeDuration(timeRange: string): string {
    switch (timeRange) {
      case 'day':
        return 'P1D';
      case 'week':
        return 'P7D';
      case 'month':
        return 'P30D';
      case 'quarter':
        return 'P90D';
      default:
        return 'P30D';
    }
  }

  private sentimentToSatisfaction(sentiment: number): number {
    // Convert sentiment (-1 to 1) to satisfaction score (1 to 5)
    return Math.max(1, Math.min(5, (sentiment + 1) * 2 + 1));
  }

  private calculateProductivity(data: any): number {
    // Calculate agent productivity based on resolution time and success rate
    const avgTime = data.avgResolutionTime || 1440; // Default 24 hours
    const successRate =
      data.totalTickets > 0 ? data.resolvedTickets / data.totalTickets : 0;

    // Higher productivity = faster resolution + higher success rate
    const timeScore = Math.max(0, 1 - avgTime / 2880); // Normalize against 48 hours
    return Math.round((timeScore * 0.5 + successRate * 0.5) * 100);
  }

  private calculateRetention(avgSentiment: number): number {
    // Estimate customer retention based on sentiment
    const satisfaction = this.sentimentToSatisfaction(avgSentiment);
    return Math.max(70, Math.min(95, satisfaction * 18 + 5)); // Scale to 70-95%
  }

  private calculateCostSavings(data: any): number {
    // Estimate cost savings from automation
    const automatedTickets = data.automatedTickets || 0;
    const avgHumanCost = 25; // $25 per human-handled ticket
    const avgAiCost = 2; // $2 per AI-handled ticket

    return automatedTickets * (avgHumanCost - avgAiCost);
  }

  private getDefaultBusinessImpact(): BusinessImpact {
    return {
      avgResolutionTime: 0,
      ticketsResolved: 0,
      escalationRate: 0,
      customerSatisfaction: 3.0,
      costSavings: 0,
      timeToResolution: 0,
      agentProductivity: 50,
      customerRetention: 85,
    };
  }

  private getDefaultMetrics(): CustomerSupportMetrics {
    return {
      totalTickets: 0,
      resolvedTickets: 0,
      avgResolutionTime: 0,
      avgSatisfactionScore: 3.0,
      escalationRate: 0,
      automationRate: 0,
      costSavings: 0,
      responseTime: 0,
      firstContactResolution: 0,
      customerSatisfactionTrend: [3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0],
    };
  }
}
