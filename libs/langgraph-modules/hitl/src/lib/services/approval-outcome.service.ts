import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import type {
  HumanApprovalRequest,
  HumanApprovalResponse,
} from './approval-workflow.types';

/**
 * Approval Outcome Service
 *
 * Phase 1a SOLID Refactoring - Extracted from ApprovalProcessingService
 *
 * **Responsibility**: Store approval outcomes for learning and tracking
 * **Pattern**: Repository pattern - data persistence abstraction
 *
 * Uses IMemoryAdapter to:
 * - Store approval outcomes as agent executions
 * - Store approval memory for learning
 * - Track user-specific approval patterns
 * - Assess feedback quality and complexity
 *
 * **Target LOC**: ~150 lines (extracted from 1,136 LOC monolith)
 *
 * Verification:
 * - Pattern source: approval-processing.service.ts:550-614, 901-1134
 * - IMemoryAdapter: Optional injection with graceful degradation
 * - Storage pattern: storeAgentExecution() + store()
 */
@Injectable()
export class ApprovalOutcomeService {
  private readonly logger = new Logger(ApprovalOutcomeService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Store approval outcome using storeAgentExecution for learning
   * Phase 1 P0-CRITICAL: Tracks approver decisions as agent executions
   *
   * Verification:
   * - Source: approval-processing.service.ts:550-614
   */
  async storeApprovalOutcome(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void> {
    if (!this.memoryAdapter) {
      this.logger.debug(
        'Memory adapter not available - skipping agent execution tracking'
      );
      return;
    }

    try {
      const approverId = response.approver?.id || 'unknown';
      const responseTime =
        response.timestamp.getTime() - request.timestamps.requested.getTime();

      // Store as agent execution for ML-based learning
      const agentState = {
        messages: [],
        userId: approverId,
        metadata: {
          approvalType: request.riskAssessment?.level,
          nodeId: request.nodeId,
          workflowType: request.state.metadata?.workflowType,
          complexity: this.assessComplexity(request),
        },
      };

      const executionResult = {
        status: 'completed' as const,
        metadata: {
          decision: response.decision,
          responseTime,
          feedbackQuality: this.assessFeedbackQuality(response.message),
          confidenceAlignment: this.calculateConfidenceAlignment(
            request,
            response
          ),
          riskAssessmentAccurate: this.assessRiskPredictionAccuracy(
            request,
            response.decision === 'approved' ? 'approved' : 'rejected'
          ),
          success: response.decision === 'approved',
        },
      };

      await this.memoryAdapter.storeAgentExecution(
        agentState,
        executionResult,
        'approval-coordinator'
      );

      this.logger.debug(`Stored approval outcome as agent execution`, {
        approverId,
        decision: response.decision,
        responseTime,
      });
    } catch (error) {
      this.logger.error(
        'Failed to store approval outcome as agent execution:',
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - tracking failures shouldn't break approval flow
    }
  }

  /**
   * Store approval decision in memory for future learning
   *
   * This follows the 2025 LangGraph pattern for Human-In-The-Loop memory learning,
   * where human feedback is stored to improve future AI decision-making and
   * confidence calibration.
   *
   * Verification:
   * - Source: approval-processing.service.ts:901-1039
   */
  async storeApprovalMemoryForLearning(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse,
    decision: 'approved' | 'rejected'
  ): Promise<void> {
    if (!this.memoryAdapter) {
      // Graceful degradation - memory learning is optional
      this.logger.debug(
        'Memory adapter not available - skipping approval memory learning'
      );
      return;
    }

    try {
      const threadId = request.executionId;
      const userId = request.state.userId || request.state.metadata?.userId;

      // Create comprehensive approval memory for learning
      const approvalMemory = {
        // Core approval information
        approvalRequestId: request.id,
        executionId: request.executionId,
        nodeId: request.nodeId,
        decision,

        // Human feedback details
        approver: {
          id: response.approver?.id || 'unknown',
          name: response.approver?.name || 'unknown',
          role: response.approver?.role || 'unknown',
        },
        feedback: response.message || '',

        // Context at time of approval
        originalState: {
          confidence: request.confidence.current,
          riskLevel: request.riskAssessment?.level,
          workflowMessage: request.message,
          nodeType: request.nodeId,
        },

        // Timing information for pattern analysis
        requestedAt: request.timestamps.requested.toISOString(),
        respondedAt: response.timestamp.toISOString(),
        responseTime:
          response.timestamp.getTime() - request.timestamps.requested.getTime(),

        // Learning signals for future decisions
        learningSignals: {
          confidenceWasTooLow:
            decision === 'approved' && request.confidence.current < 0.7,
          confidenceWasTooHigh:
            decision === 'rejected' && request.confidence.current > 0.8,
          riskAssessmentAccurate: this.assessRiskPredictionAccuracy(
            request,
            decision
          ),
          feedbackQuality: this.assessFeedbackQuality(response.message),
        },

        // Pattern analysis data
        patterns: {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          workflowType: request.state.metadata?.workflowType || 'unknown',
          nodePosition: request.state.currentNode || 'unknown',
        },
      };

      // Store as procedural memory (agent learning)
      await this.memoryAdapter.store(threadId, JSON.stringify(approvalMemory), {
        type: 'fact', // HITL decisions are facts for agent learning
        source: 'hitl_approval',
        agentId: 'approval_system',
        userId,
        importance: decision === 'rejected' ? 0.9 : 0.7, // Rejections are more important for learning
        persistent: true, // Keep approval learnings for long-term pattern analysis
        tags: JSON.stringify([
          'hitl_learning',
          'approval_decision',
          decision,
          request.nodeId,
          request.riskAssessment?.level || 'unknown_risk',
        ]),
      });

      // Also store user-specific approval patterns for personalization
      if (userId) {
        const userPatternMemory = {
          userId,
          approverStyle: this.analyzeApproverStyle(response),
          decisionPattern: {
            decision,
            confidenceRange: this.categorizeConfidence(
              request.confidence.current
            ),
            riskTolerance: this.assessRiskTolerance(request, decision),
          },
          contextualFactors: {
            workflowType: request.state.metadata?.workflowType,
            timeContext: this.getTimeContext(),
            complexityLevel: this.assessComplexity(request),
          },
        };

        await this.memoryAdapter.store(
          `user_approval_patterns_${userId}`,
          JSON.stringify(userPatternMemory),
          {
            type: 'preference', // User approval patterns are preferences
            source: 'hitl_user_pattern',
            userId,
            importance: 0.8,
            persistent: true,
            tags: JSON.stringify([
              'user_approval_pattern',
              'personalization',
              decision,
              request.riskAssessment?.level || 'unknown',
            ]),
          }
        );
      }

      this.logger.debug(`Approval memory stored for learning`, {
        requestId: request.id,
        decision,
        confidence: request.confidence.current,
        riskLevel: request.riskAssessment?.level,
        hasUserPattern: !!userId,
      });
    } catch (error) {
      this.logger.error(
        'Failed to store approval memory for learning:',
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - memory learning failures shouldn't break approval flow
    }
  }

  /**
   * Assess whether risk prediction was accurate based on human decision
   *
   * Verification:
   * - Source: approval-processing.service.ts:1044-1060
   */
  private assessRiskPredictionAccuracy(
    request: HumanApprovalRequest,
    decision: 'approved' | 'rejected'
  ): boolean {
    if (!request.riskAssessment) return false;

    const riskLevel = request.riskAssessment.level;

    // High/Critical risk should often be rejected, Low risk should often be approved
    if (riskLevel === 'high' || riskLevel === 'critical') {
      return decision === 'rejected'; // Accurate if high risk was rejected
    } else if (riskLevel === 'low') {
      return decision === 'approved'; // Accurate if low risk was approved
    }

    return true; // Medium risk can go either way
  }

  /**
   * Assess quality of human feedback for learning
   *
   * Verification:
   * - Source: approval-processing.service.ts:1065-1069
   */
  private assessFeedbackQuality(feedback?: string): 'high' | 'medium' | 'low' {
    if (!feedback || feedback.trim().length < 10) return 'low';
    if (feedback.length > 50 && feedback.includes(' ')) return 'high';
    return 'medium';
  }

  /**
   * Analyze approver decision-making style
   *
   * Verification:
   * - Source: approval-processing.service.ts:1074-1083
   */
  private analyzeApproverStyle(response: HumanApprovalResponse): string {
    const feedback = response.message || '';
    const hasDetailedFeedback = feedback.length > 30;
    const isQuickDecision =
      response.timestamp.getTime() - new Date().getTime() < 60000; // < 1 minute

    if (hasDetailedFeedback) return 'thorough';
    if (isQuickDecision) return 'decisive';
    return 'standard';
  }

  /**
   * Categorize confidence level for pattern analysis
   *
   * Verification:
   * - Source: approval-processing.service.ts:1088-1094
   */
  private categorizeConfidence(confidence: number): string {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    if (confidence >= 0.4) return 'low';
    return 'very_low';
  }

  /**
   * Assess user's risk tolerance based on decision
   *
   * Verification:
   * - Source: approval-processing.service.ts:1099-1108
   */
  private assessRiskTolerance(
    request: HumanApprovalRequest,
    decision: 'approved' | 'rejected'
  ): 'high' | 'medium' | 'low' {
    const riskLevel = request.riskAssessment?.level;

    if (riskLevel === 'high' && decision === 'approved') return 'high';
    if (riskLevel === 'low' && decision === 'rejected') return 'low';
    return 'medium';
  }

  /**
   * Get time context for decision patterns
   *
   * Verification:
   * - Source: approval-processing.service.ts:1113-1119
   */
  private getTimeContext(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Assess complexity level of approval request
   *
   * Verification:
   * - Source: approval-processing.service.ts:1124-1134
   */
  private assessComplexity(
    request: HumanApprovalRequest
  ): 'high' | 'medium' | 'low' {
    const messageLength = request.message.length;
    const hasRiskFactors = (request.riskAssessment?.factors?.length || 0) > 2;
    const hasMetadata = Object.keys(request.metadata || {}).length > 3;

    if (messageLength > 200 || hasRiskFactors || hasMetadata) return 'high';
    if (messageLength > 100) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence alignment between prediction and outcome
   *
   * Verification:
   * - Source: approval-processing.service.ts:818-843
   * - Note: Duplicated method (shared between Intelligence and Outcome services)
   */
  private calculateConfidenceAlignment(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number {
    const wasApproved = response.decision === 'approved';
    const confidence = request.confidence.current;

    // Perfect alignment: high confidence + approved OR low confidence + rejected
    if (
      (wasApproved && confidence > 0.8) ||
      (!wasApproved && confidence < 0.3)
    ) {
      return 1.0;
    }

    // Poor alignment: high confidence + rejected OR low confidence + approved
    if (
      (wasApproved && confidence < 0.3) ||
      (!wasApproved && confidence > 0.8)
    ) {
      return 0.2;
    }

    // Medium alignment
    return 0.6;
  }
}
