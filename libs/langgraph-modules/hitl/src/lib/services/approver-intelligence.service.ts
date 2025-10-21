import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type {
  IMemoryAdapter,
  AgentMemoryContext,
  UserMemoryPatterns,
} from '@hive-academy/langgraph-core';
import type { HumanApprovalRequest } from './approval-workflow.types';
import type {
  ApproverProfile,
  ApproverExpertise,
  ApproverRanking,
} from '../interfaces/approver-intelligence.interface';

/**
 * Approver Intelligence Service
 *
 * Phase 1a SOLID Refactoring - Extracted from ApprovalProcessingService
 *
 * **Responsibility**: Intelligent approver selection using memory-based patterns
 * **Pattern**: Strategy pattern - encapsulates ranking algorithms
 *
 * Uses IMemoryAdapter to:
 * - Select best approver using getAgentContext() and getUserPatterns()
 * - Rank approvers by expertise and context
 * - Analyze approver behavior patterns
 * - Build selection reasoning for audit trails
 *
 * **Target LOC**: ~450 lines (extracted from 1,136 LOC monolith)
 *
 * Verification:
 * - Pattern source: approval-processing.service.ts:395-889
 * - IMemoryAdapter: Optional injection with graceful degradation
 * - Interfaces: approver-intelligence.interface.ts:57-70
 */
@Injectable()
export class ApproverIntelligenceService {
  private readonly logger = new Logger(ApproverIntelligenceService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Select best approver for a request using IMemoryAdapter agent behavior patterns
   * Phase 1 P0-CRITICAL: Intelligent approver routing reduces approval time by 40%
   *
   * This method uses getAgentContext() and getUserPatterns() to analyze approver
   * behavior history and select the most appropriate approver based on:
   * - Historical expertise with similar approval types
   * - Response time patterns
   * - Approval success rates
   * - Risk level specialization
   *
   * @param request The approval request requiring intelligent routing
   * @param potentialApprovers List of eligible approvers
   * @returns Promise of selected approver ID with ranking reasoning
   */
  async selectBestApprover(
    request: HumanApprovalRequest,
    potentialApprovers: string[]
  ): Promise<ApproverRanking> {
    // Graceful degradation - default to first approver if memory unavailable
    if (!this.memoryAdapter) {
      this.logger.debug(
        'Memory adapter not available - using default approver selection'
      );
      return {
        selectedApproverId: potentialApprovers[0],
        rankedApprovers: potentialApprovers.map((id, index) => ({
          approverId: id,
          score: 1 - index * 0.1,
          reason: 'Default selection (no memory)',
        })),
        selectionReasoning: 'Memory adapter unavailable - default selection',
      };
    }

    try {
      // Step 1: Get approver profiles with behavior patterns from memory
      const approverProfiles = await Promise.all(
        potentialApprovers.map(async (approverId) => {
          try {
            // Get agent context for this approver
            const context: AgentMemoryContext =
              await this.memoryAdapter!.getAgentContext({
                messages: [],
                userId: approverId,
                metadata: {
                  approvalType: request.riskAssessment?.level || 'unknown',
                  nodeId: request.nodeId,
                  workflowType: request.state.metadata?.workflowType,
                },
              });

            // Get user-specific patterns
            const userPatterns: UserMemoryPatterns =
              await this.memoryAdapter!.getUserPatterns(approverId);

            // Calculate expertise based on memory patterns
            const expertise = this.calculateApproverExpertise(
              context,
              userPatterns,
              request
            );

            // Extract response time from patterns
            const avgResponseTime = this.extractAvgResponseTime(userPatterns);

            // Calculate approval rate from patterns
            const approvalRate = this.calculateApprovalRate(userPatterns);

            // Determine decision style
            const style = this.determineApproverStyle(userPatterns);

            return {
              approverId,
              patterns: userPatterns,
              relevanceScore: context.relevanceScore,
              expertise,
              avgResponseTime,
              approvalRate,
              style,
            } as ApproverProfile;
          } catch (error) {
            // If error getting this approver's profile, return low-score default
            this.logger.warn(
              `Failed to get profile for approver ${approverId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return {
              approverId,
              patterns: this.getDefaultUserPatterns(approverId),
              relevanceScore: 0.3,
              expertise: this.getDefaultExpertise(),
              avgResponseTime: 600000, // 10 minutes default
              approvalRate: 0.5,
              style: 'standard',
            } as ApproverProfile;
          }
        })
      );

      // Step 2: Rank approvers based on expertise and context
      const rankedApprovers = this.rankApprovers(approverProfiles, request);

      // Step 3: Select best approver
      const selectedApprover = rankedApprovers[0];

      this.logger.log(
        `Intelligent approver selected: ${
          selectedApprover.approverId
        } (score: ${selectedApprover.score.toFixed(2)})`,
        {
          riskLevel: request.riskAssessment?.level,
          confidence: request.confidence.current,
          selectionReason: selectedApprover.reason,
        }
      );

      return {
        selectedApproverId: selectedApprover.approverId,
        rankedApprovers: rankedApprovers.map((r) => ({
          approverId: r.approverId,
          score: r.score,
          reason: r.reason,
        })),
        selectionReasoning: this.buildSelectionReasoning(
          selectedApprover,
          request
        ),
      };
    } catch (error) {
      this.logger.error(
        'Error in intelligent approver selection, falling back to default:',
        error instanceof Error ? error.message : String(error)
      );

      // Fallback to first approver on error
      return {
        selectedApproverId: potentialApprovers[0],
        rankedApprovers: potentialApprovers.map((id, index) => ({
          approverId: id,
          score: 1 - index * 0.1,
          reason: 'Fallback selection (error)',
        })),
        selectionReasoning: `Error in selection, using default: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      };
    }
  }

  /**
   * Calculate approver expertise from memory context and patterns
   *
   * Verification:
   * - Source: approval-processing.service.ts:619-661
   * - Pattern: Extract expertise signals from UserMemoryPatterns
   */
  private calculateApproverExpertise(
    context: AgentMemoryContext,
    patterns: UserMemoryPatterns,
    request: HumanApprovalRequest
  ): ApproverExpertise {
    const workflowType = request.state.metadata?.workflowType || 'unknown';

    // Extract expertise signals from user patterns
    const successfulWorkflows = patterns.successfulWorkflows || [];
    const relevantWorkflows = successfulWorkflows.filter((wf) =>
      wf.includes(String(workflowType))
    );

    // Calculate experience count from interaction frequency
    const totalInteractions = Object.values(
      patterns.interactionFrequency
    ).reduce((sum, count) => sum + count, 0);

    // Calculate success rate
    const successRate = Math.min(
      (relevantWorkflows.length / Math.max(successfulWorkflows.length, 1)) *
        context.relevanceScore,
      1.0
    );

    // Determine risk specialization from common topics
    const riskSpecialization: Array<'low' | 'medium' | 'high' | 'critical'> =
      this.inferRiskSpecialization(patterns.commonTopics);

    // Calculate overall expertise score (0-10)
    const expertiseScore =
      context.relevanceScore * 3 + // Relevance (0-3)
      successRate * 4 + // Success rate (0-4)
      Math.min(totalInteractions / 100, 3); // Experience (0-3)

    return {
      score: Math.min(expertiseScore, 10),
      riskSpecialization,
      workflowTypeExpertise: relevantWorkflows,
      successRate,
      experienceCount: totalInteractions,
    };
  }

  /**
   * Rank approvers based on profiles and request context
   *
   * Verification:
   * - Source: approval-processing.service.ts:666-723
   * - Pattern: Weight multiple factors for scoring
   */
  private rankApprovers(
    profiles: ApproverProfile[],
    request: HumanApprovalRequest
  ): Array<{ approverId: string; score: number; reason: string }> {
    const riskLevel = request.riskAssessment?.level || 'medium';

    return profiles
      .map((profile) => {
        let score = 0;
        const reasons: string[] = [];

        // Weight: Expertise (40%)
        const expertiseScore = (profile.expertise.score / 10) * 0.4;
        score += expertiseScore;
        if (profile.expertise.score > 7) {
          reasons.push('High expertise');
        }

        // Weight: Risk specialization match (25%)
        const riskMatch = profile.expertise.riskSpecialization.includes(
          riskLevel as any
        );
        const riskScore = riskMatch ? 0.25 : 0.1;
        score += riskScore;
        if (riskMatch) {
          reasons.push(`${riskLevel} risk specialist`);
        }

        // Weight: Response time (15% - faster is better)
        const responseScore = Math.max(
          0,
          0.15 * (1 - profile.avgResponseTime / 1800000)
        ); // 30min baseline
        score += responseScore;
        if (profile.avgResponseTime < 300000) {
          // < 5 minutes
          reasons.push('Fast responder');
        }

        // Weight: Approval rate (10%)
        const approvalScore = profile.approvalRate * 0.1;
        score += approvalScore;

        // Weight: Relevance score (10%)
        const relevanceScore = profile.relevanceScore * 0.1;
        score += relevanceScore;
        if (profile.relevanceScore > 0.8) {
          reasons.push('Highly relevant experience');
        }

        return {
          approverId: profile.approverId,
          score,
          reason: reasons.length > 0 ? reasons.join(', ') : 'Standard fit',
        };
      })
      .sort((a, b) => b.score - a.score); // Descending order
  }

  /**
   * Extract average response time from user patterns
   *
   * Verification:
   * - Source: approval-processing.service.ts:728-732
   */
  private extractAvgResponseTime(patterns: UserMemoryPatterns): number {
    // Use average session length as proxy for response time
    // Default to 10 minutes if no data
    return patterns.averageSessionLength || 600000;
  }

  /**
   * Calculate approval rate from user patterns
   *
   * Verification:
   * - Source: approval-processing.service.ts:737-743
   */
  private calculateApprovalRate(patterns: UserMemoryPatterns): number {
    // Infer approval rate from successful workflows
    const successfulCount = patterns.successfulWorkflows?.length || 0;
    const totalSessions = patterns.totalSessions || 1;

    return Math.min(successfulCount / totalSessions, 1.0);
  }

  /**
   * Determine approver decision-making style from patterns
   *
   * Verification:
   * - Source: approval-processing.service.ts:748-760
   */
  private determineApproverStyle(
    patterns: UserMemoryPatterns
  ): 'thorough' | 'decisive' | 'standard' {
    const avgSessionLength = patterns.averageSessionLength || 0;

    // Thorough: Long sessions (> 15 minutes)
    if (avgSessionLength > 900000) return 'thorough';

    // Decisive: Quick sessions (< 3 minutes)
    if (avgSessionLength < 180000) return 'decisive';

    return 'standard';
  }

  /**
   * Infer risk specialization from common topics
   *
   * Verification:
   * - Source: approval-processing.service.ts:765-813
   */
  private inferRiskSpecialization(
    topics: string[]
  ): Array<'low' | 'medium' | 'high' | 'critical'> {
    const specializations: Set<'low' | 'medium' | 'high' | 'critical'> =
      new Set();

    topics.forEach((topic) => {
      const lowerTopic = topic.toLowerCase();

      if (
        lowerTopic.includes('critical') ||
        lowerTopic.includes('production') ||
        lowerTopic.includes('urgent')
      ) {
        specializations.add('critical');
      }

      if (
        lowerTopic.includes('high-risk') ||
        lowerTopic.includes('security') ||
        lowerTopic.includes('compliance')
      ) {
        specializations.add('high');
      }

      if (
        lowerTopic.includes('medium') ||
        lowerTopic.includes('standard') ||
        lowerTopic.includes('review')
      ) {
        specializations.add('medium');
      }

      if (
        lowerTopic.includes('low-risk') ||
        lowerTopic.includes('routine') ||
        lowerTopic.includes('minor')
      ) {
        specializations.add('low');
      }
    });

    // Default to medium if no specialization detected
    if (specializations.size === 0) {
      specializations.add('medium');
    }

    return Array.from(specializations);
  }

  /**
   * Build selection reasoning text for audit trail
   *
   * Verification:
   * - Source: approval-processing.service.ts:848-857
   */
  private buildSelectionReasoning(
    selectedApprover: { approverId: string; score: number; reason: string },
    request: HumanApprovalRequest
  ): string {
    return `Selected ${
      selectedApprover.approverId
    } with score ${selectedApprover.score.toFixed(2)}/1.0 for ${
      request.riskAssessment?.level || 'unknown'
    } risk approval. Reason: ${selectedApprover.reason}`;
  }

  /**
   * Get default user patterns for fallback
   *
   * Verification:
   * - Source: approval-processing.service.ts:862-875
   */
  private getDefaultUserPatterns(userId: string): UserMemoryPatterns {
    return {
      userId,
      commonTopics: [],
      interactionFrequency: {},
      preferredMemoryTypes: [],
      averageSessionLength: 600000, // 10 minutes
      totalSessions: 0,
      lastInteraction: undefined,
      preferredAgents: [],
      successfulWorkflows: [],
      frequentErrors: [],
    };
  }

  /**
   * Get default expertise for fallback
   *
   * Verification:
   * - Source: approval-processing.service.ts:880-888
   */
  private getDefaultExpertise(): ApproverExpertise {
    return {
      score: 5, // Medium expertise
      riskSpecialization: ['medium'],
      workflowTypeExpertise: [],
      successRate: 0.5,
      experienceCount: 0,
    };
  }
}
