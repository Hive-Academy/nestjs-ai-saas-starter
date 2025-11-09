import { Injectable, Logger } from '@nestjs/common';
import type {
  HumanApprovalRequest,
  HumanApprovalResponse,
} from './approval-workflow.types';

/**
 * Approval Outcome Service
 *
 * Phase 1a SOLID Refactoring - Extracted from ApprovalProcessingService
 *
 * **Responsibility**: Analyze approval outcomes for metrics and insights
 * **Pattern**: Service pattern - outcome analysis and assessment
 *
 * Provides:
 * - Feedback quality assessment
 * - Risk prediction accuracy evaluation
 * - Complexity analysis
 * - Confidence alignment calculation
 *
 * **Target LOC**: ~150 lines (extracted from 1,136 LOC monolith)
 *
 * Verification:
 * - Pattern source: approval-processing.service.ts:550-614, 901-1134
 * - Storage: Neo4j via storage adapters (primary operational storage)
 */
@Injectable()
export class ApprovalOutcomeService {
  private readonly logger = new Logger(ApprovalOutcomeService.name);

  /**
   * Analyze approval outcome metrics
   *
   * Provides assessment of approval outcomes for storage in Neo4j
   * via storage adapters. This method is called by approval processing
   * service to prepare outcome data for persistence.
   *
   * Verification:
   * - Source: approval-processing.service.ts:550-614
   */
  analyzeApprovalOutcome(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): {
    responseTime: number;
    feedbackQuality: 'high' | 'medium' | 'low';
    confidenceAlignment: number;
    riskAssessmentAccurate: boolean;
    complexity: 'high' | 'medium' | 'low';
  } {
    const approverId = response.approver?.id || 'unknown';
    const responseTime =
      response.timestamp.getTime() - request.timestamps.requested.getTime();

    const analysis = {
      responseTime,
      feedbackQuality: this.assessFeedbackQuality(response.message),
      confidenceAlignment: this.calculateConfidenceAlignment(request, response),
      riskAssessmentAccurate: this.assessRiskPredictionAccuracy(
        request,
        response.decision === 'approved' ? 'approved' : 'rejected'
      ),
      complexity: this.assessComplexity(request),
    };

    this.logger.debug(`Analyzed approval outcome`, {
      approverId,
      decision: response.decision,
      ...analysis,
    });

    return analysis;
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
