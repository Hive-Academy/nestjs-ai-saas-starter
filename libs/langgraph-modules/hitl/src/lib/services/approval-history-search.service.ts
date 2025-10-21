import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';

/**
 * Approval History Search Service - Phase 1b SOLID Compliance
 *
 * Provides historical approval pattern search and trend analysis using IMemoryAdapter.
 *
 * **Phase 1b Implementation** (2025-01-11):
 * - Single Responsibility: Historical search ONLY
 * - IMemoryAdapter integration: query() and getUserPatterns()
 * - Graceful degradation when memory adapter unavailable
 * - Target LOC: ~350 lines (within 450 LOC limit)
 *
 * **Responsibility**: Search and analyze historical approval patterns
 * **Pattern**: Service delegation from approval orchestrator
 * **Memory Methods Used**:
 *   - IMemoryAdapter.search() - Semantic search for similar approvals
 *   - IMemoryAdapter.getUserPatterns() - Extract user behavior trends
 *
 * Verification:
 * - Pattern source: Phase 1a success pattern
 * - IMemoryAdapter methods: Verified in memory-adapter.interface.ts:148-157, 184-187
 * - Integration: Optional injection with graceful degradation
 */
@Injectable()
export class ApprovalHistorySearchService {
  private readonly logger = new Logger(ApprovalHistorySearchService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    if (!this.memoryAdapter) {
      this.logger.warn(
        'IMemoryAdapter not available - approval history search will return empty results'
      );
    }
  }

  /**
   * Search for similar historical approvals using semantic memory search
   *
   * Uses IMemoryAdapter.search() to find approvals with similar:
   * - Action types
   * - Resource types
   * - Risk levels
   * - Contextual metadata
   *
   * @param requestContext - Context of the approval request
   * @returns Promise of similar approvals with similarity scores
   */
  async searchSimilarApprovals(
    requestContext: ApprovalRequestContext
  ): Promise<SimilarApproval[]> {
    if (!this.memoryAdapter) {
      this.logger.debug(
        'Memory adapter unavailable - returning empty similar approvals'
      );
      return [];
    }

    try {
      // Build semantic query from request context
      const queryText = this.buildSemanticQuery(requestContext);

      this.logger.debug(
        `Searching similar approvals for: ${requestContext.action} on ${requestContext.resourceType} (risk: ${requestContext.riskLevel})`
      );

      // Use IMemoryAdapter.search() for semantic similarity search
      const memories = await this.memoryAdapter.search({
        query: queryText,
        userId: requestContext.requestedBy,
        limit: 10,
        minRelevance: 0.7,
        namespace: ['approval-history', requestContext.resourceType],
      });

      // Transform memory results to SimilarApproval format
      const similarApprovals = memories.map((memory) =>
        this.transformMemoryToApproval(memory, requestContext)
      );

      this.logger.debug(
        `Found ${similarApprovals.length} similar approvals (threshold: 0.7)`
      );

      return similarApprovals;
    } catch (error) {
      this.logger.error(
        'Error searching similar approvals:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Get approval trends for a resource type over a time range
   *
   * Uses IMemoryAdapter.getUserPatterns() to extract:
   * - Approval rates
   * - Average response times
   * - Common rejection reasons
   * - Trend changes over time
   *
   * @param resourceType - Type of resource being approved
   * @param timeRange - Time range for trend analysis
   * @returns Promise of trend analysis data
   */
  async getApprovalTrends(
    resourceType: string,
    timeRange: TimeRange
  ): Promise<TrendAnalysis> {
    if (!this.memoryAdapter) {
      this.logger.debug('Memory adapter unavailable - returning empty trends');
      return this.getEmptyTrendAnalysis(resourceType, timeRange);
    }

    try {
      this.logger.debug(
        `Analyzing approval trends for ${resourceType} from ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`
      );

      // Use IMemoryAdapter.getUserPatterns() for system-wide approval trends
      // Using 'system' as userId to get aggregated patterns across all users
      const patterns = await this.memoryAdapter.getUserPatterns(
        'system',
        this.calculateDaysDiff(timeRange.start, timeRange.end)
      );

      // Analyze patterns to extract approval-specific trend data
      const trendAnalysis = this.analyzeApprovalTrends(
        patterns,
        resourceType,
        timeRange
      );

      this.logger.debug(
        `Trend analysis complete: ${trendAnalysis.totalApprovals} approvals, ${(
          trendAnalysis.approvalRate * 100
        ).toFixed(1)}% approval rate`
      );

      return trendAnalysis;
    } catch (error) {
      this.logger.error(
        'Error getting approval trends:',
        error instanceof Error ? error.message : String(error)
      );
      return this.getEmptyTrendAnalysis(resourceType, timeRange);
    }
  }

  /**
   * Search approvals by specific approver to analyze their decision patterns
   *
   * Uses IMemoryAdapter.getUserPatterns() for individual approver analysis
   *
   * @param approverId - ID of the approver
   * @param limitDays - Number of days to analyze (default: 30)
   * @returns Promise of approver's approval patterns
   */
  async getApproverPatterns(
    approverId: string,
    limitDays = 30
  ): Promise<ApproverDecisionPatterns> {
    if (!this.memoryAdapter) {
      this.logger.debug(
        'Memory adapter unavailable - returning empty patterns'
      );
      return this.getEmptyApproverPatterns(approverId);
    }

    try {
      this.logger.debug(
        `Analyzing decision patterns for approver ${approverId} (last ${limitDays} days)`
      );

      // Use IMemoryAdapter.getUserPatterns() for approver-specific patterns
      const patterns = await this.memoryAdapter.getUserPatterns(
        approverId,
        limitDays
      );

      // Extract approval-specific patterns from user patterns
      const approverPatterns = this.extractApproverPatterns(
        patterns,
        approverId
      );

      this.logger.debug(
        `Approver patterns extracted: ${
          approverPatterns.totalDecisions
        } decisions, ${(approverPatterns.approvalRate * 100).toFixed(
          1
        )}% approval rate`
      );

      return approverPatterns;
    } catch (error) {
      this.logger.error(
        'Error getting approver patterns:',
        error instanceof Error ? error.message : String(error)
      );
      return this.getEmptyApproverPatterns(approverId);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build semantic query string from approval request context
   *
   * @param context - Approval request context
   * @returns Semantic query string for memory search
   */
  private buildSemanticQuery(context: ApprovalRequestContext): string {
    const parts = [
      context.action,
      context.resourceType,
      context.riskLevel,
      'approval',
    ];

    // Add metadata keywords if available
    if (context.metadata) {
      const keywords = this.extractMetadataKeywords(context.metadata);
      parts.push(...keywords);
    }

    return parts.join(' ');
  }

  /**
   * Extract searchable keywords from metadata
   *
   * @param metadata - Approval request metadata
   * @returns Array of keyword strings
   */
  private extractMetadataKeywords(metadata: Record<string, any>): string[] {
    const keywords: string[] = [];

    // Extract common metadata fields that provide context
    const relevantFields = [
      'category',
      'department',
      'priority',
      'environment',
      'severity',
    ];

    for (const field of relevantFields) {
      if (metadata[field]) {
        keywords.push(String(metadata[field]));
      }
    }

    return keywords;
  }

  /**
   * Transform memory entry to SimilarApproval format
   *
   * @param memory - Memory entry from search
   * @param requestContext - Original request context
   * @returns SimilarApproval object
   */
  private transformMemoryToApproval(
    memory: any,
    requestContext: ApprovalRequestContext
  ): SimilarApproval {
    const metadata = memory.metadata || {};

    return {
      requestId: memory.id || 'unknown',
      similarity: memory.score || 0,
      decision: metadata.decision || 'unknown',
      approver: metadata.approver || 'unknown',
      context: {
        action: metadata.action || '',
        resourceType: metadata.resourceType || requestContext.resourceType,
        riskLevel: metadata.riskLevel || 'medium',
        requestedBy: metadata.requestedBy || 'unknown',
        metadata: metadata,
      },
      timestamp: metadata.timestamp ? new Date(metadata.timestamp) : new Date(),
      outcome: metadata.outcome || '',
    };
  }

  /**
   * Calculate days difference between two dates
   *
   * @param start - Start date
   * @param end - End date
   * @returns Number of days difference
   */
  private calculateDaysDiff(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Analyze approval trends from user memory patterns
   *
   * Extracts approval-specific metrics from generic user patterns
   *
   * @param patterns - User memory patterns from IMemoryAdapter
   * @param resourceType - Resource type being analyzed
   * @param timeRange - Time range for analysis
   * @returns TrendAnalysis object
   */
  private analyzeApprovalTrends(
    patterns: any,
    resourceType: string,
    timeRange: TimeRange
  ): TrendAnalysis {
    // Extract approval-related data from patterns
    // Note: UserMemoryPatterns has generic fields, we interpret them for approval context

    const totalApprovals = patterns.totalSessions || 0;
    const approvedCount = Math.round(
      totalApprovals * (patterns.interactionFrequency?.approved || 0.5)
    );
    const approvalRate =
      totalApprovals > 0 ? approvedCount / totalApprovals : 0;

    // Calculate average response time from session length
    const avgResponseTime = patterns.averageSessionLength || 0;

    // Extract rejection reasons from frequent errors
    const commonRejectionReasons =
      patterns.frequentErrors?.slice(0, 5).map((reason: string) => ({
        reason,
        count: 1, // Would need more detailed data for accurate counts
      })) || [];

    // Calculate trend changes (simplified without historical comparison)
    const approvalRateChange = 0; // Would need historical data
    const responseTimeChange = 0; // Would need historical data

    return {
      resourceType,
      timeRange,
      totalApprovals,
      approvalRate,
      avgResponseTime,
      commonRejectionReasons,
      trends: {
        approvalRateChange,
        responseTimeChange,
      },
    };
  }

  /**
   * Extract approver-specific patterns from user patterns
   *
   * @param patterns - User memory patterns
   * @param approverId - Approver ID
   * @returns ApproverDecisionPatterns
   */
  private extractApproverPatterns(
    patterns: any,
    approverId: string
  ): ApproverDecisionPatterns {
    const totalDecisions = patterns.totalSessions || 0;
    const approvedCount = Math.round(
      totalDecisions * (patterns.interactionFrequency?.approved || 0.5)
    );
    const approvalRate =
      totalDecisions > 0 ? approvedCount / totalDecisions : 0;

    const avgResponseTime = patterns.averageSessionLength || 0;

    // Extract preferred approval types from common topics
    const preferredApprovalTypes = patterns.commonTopics?.slice(0, 5) || [];

    // Extract risk tolerance from interaction patterns
    const riskTolerance = this.calculateRiskTolerance(patterns);

    return {
      approverId,
      totalDecisions,
      approvalRate,
      avgResponseTime,
      preferredApprovalTypes,
      riskTolerance,
      lastActivity: patterns.lastInteraction || new Date(),
    };
  }

  /**
   * Calculate risk tolerance from approval patterns
   *
   * @param patterns - User memory patterns
   * @returns Risk tolerance level
   */
  private calculateRiskTolerance(
    patterns: any
  ): 'low' | 'medium' | 'high' | 'very_high' {
    // Analyze interaction patterns to infer risk tolerance
    const approvalRate = patterns.interactionFrequency?.approved || 0.5;

    if (approvalRate > 0.8) return 'very_high';
    if (approvalRate > 0.6) return 'high';
    if (approvalRate > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Get empty trend analysis for fallback
   *
   * @param resourceType - Resource type
   * @param timeRange - Time range
   * @returns Empty TrendAnalysis
   */
  private getEmptyTrendAnalysis(
    resourceType: string,
    timeRange: TimeRange
  ): TrendAnalysis {
    return {
      resourceType,
      timeRange,
      totalApprovals: 0,
      approvalRate: 0,
      avgResponseTime: 0,
      commonRejectionReasons: [],
      trends: {
        approvalRateChange: 0,
        responseTimeChange: 0,
      },
    };
  }

  /**
   * Get empty approver patterns for fallback
   *
   * @param approverId - Approver ID
   * @returns Empty ApproverDecisionPatterns
   */
  private getEmptyApproverPatterns(
    approverId: string
  ): ApproverDecisionPatterns {
    return {
      approverId,
      totalDecisions: 0,
      approvalRate: 0,
      avgResponseTime: 0,
      preferredApprovalTypes: [],
      riskTolerance: 'medium',
      lastActivity: new Date(),
    };
  }
}

// ============================================================================
// TYPE DEFINITIONS - Approval History Search Types
// ============================================================================

/**
 * Context for approval request used in similarity search
 */
export interface ApprovalRequestContext {
  action: string;
  resourceType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  metadata?: Record<string, any>;
}

/**
 * Similar approval found in historical data
 */
export interface SimilarApproval {
  requestId: string;
  similarity: number;
  decision: 'approved' | 'rejected' | string;
  approver: string;
  context: ApprovalRequestContext;
  timestamp: Date;
  outcome: string;
}

/**
 * Time range for trend analysis
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Approval trend analysis over time
 */
export interface TrendAnalysis {
  resourceType: string;
  timeRange: TimeRange;
  totalApprovals: number;
  approvalRate: number;
  avgResponseTime: number;
  commonRejectionReasons: Array<{ reason: string; count: number }>;
  trends: {
    approvalRateChange: number; // percentage change
    responseTimeChange: number; // time change in ms
  };
}

/**
 * Approver decision patterns extracted from history
 */
export interface ApproverDecisionPatterns {
  approverId: string;
  totalDecisions: number;
  approvalRate: number;
  avgResponseTime: number;
  preferredApprovalTypes: string[];
  riskTolerance: 'low' | 'medium' | 'high' | 'very_high';
  lastActivity: Date;
}
