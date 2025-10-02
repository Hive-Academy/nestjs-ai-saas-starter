import { Injectable, Logger, Inject } from '@nestjs/common';
import { IMemoryAdapter } from '@hive-academy/langgraph-core';
import { HumanApprovalRequest, HumanApprovalResponse } from './approval-workflow.types';
import { IHitlMemoryLearningService } from '../interfaces/hitl-services.interface';

/**
 * Service for learning from human approval feedback
 * Stores approval patterns and feedback for future decision improvement
 */
@Injectable()
export class HitlMemoryLearningService implements IHitlMemoryLearningService {
  private readonly logger = new Logger(HitlMemoryLearningService.name);

  constructor(
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter: IMemoryAdapter
  ) {
    this.logger.log('🧠 HITL Memory Learning Service initialized');
  }

  /**
   * 🧠 AUTOMAGICAL: Learn from human approval feedback
   * Stores approval patterns and feedback for future decision improvement
   */
  async learnFromHumanFeedback(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      // Generate thread ID for approval learning
      const learningThreadId = `hitl-learning-${request.executionId}`;

      // Create rich feedback memory entry
      const feedbackMemory = {
        // Core approval data
        requestId: request.id,
        executionId: request.executionId,
        nodeId: request.nodeId,
        decision: response.decision,
        approver: response.approver,

        // Context that led to the decision
        originalMessage: request.message,
        confidence: {
          initial: request.confidence.current,
          threshold: request.confidence.threshold,
          factors: request.confidence.factors,
        },
        riskAssessment: request.riskAssessment,

        // Timing and workflow data
        responseTime:
          response.timestamp.getTime() - request.timestamps.requested.getTime(),
        timeoutDuration: request.timeout.duration,
        chainId: request.chainId,

        // Human feedback insights
        feedback: response.message,
        feedbackQuality: this.assessFeedbackQuality(response),
        approverExperience: this.getApproverExperience(response.approver),

        // Learning signals
        shouldApprove: response.decision === 'approved',
        confidenceGap: this.calculateConfidenceGap(request, response),
        patternStrength: this.calculatePatternStrength(request, response),

        timestamp: new Date().toISOString(),
      };

      // Store the feedback memory with rich metadata
      await this.memoryAdapter.store(
        learningThreadId,
        JSON.stringify(feedbackMemory),
        {
          type: 'human_feedback',
          subtype: 'approval_decision',
          decision: response.decision,
          approverId: response.approver.id,
          approverRole: response.approver.role || 'unknown',
          confidence: request.confidence.current,
          riskLevel: request.riskAssessment?.level || 'unknown',
          responseTimeMs: feedbackMemory.responseTime,
          importance: this.calculateFeedbackImportance(request, response),

          // Searchable patterns
          contextType: this.extractContextType(request.message),
          workflowPattern: this.extractWorkflowPattern(request),
          seasonality: this.extractSeasonality(request.timestamps.requested),

          // User identification for personalized learning
          userId: response.approver.id,
          teamId: this.extractTeamId(response.approver),

          // Learning metadata
          learningSignal: response.decision,
          feedbackAvailable: !!response.message,
          chainLengthFactor: request.chainId ? 'chained' : 'direct',
        }
      );

      // If there's detailed feedback, store it as a separate learning entry
      if (response.message && response.message.trim().length > 10) {
        await this.storeDetailedFeedback(request, response, learningThreadId);
      }

      this.logger.debug(
        `🧠 Stored human feedback: ${response.decision} from ${
          response.approver.role || 'unknown'
        } ` +
          `(confidence: ${request.confidence.current}, response time: ${feedbackMemory.responseTime}ms)`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to learn from human feedback: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      // Don't throw - learning failures shouldn't break approval workflow
    }
  }

  /**
   * Store detailed feedback as a separate learning entry
   */
  async storeDetailedFeedback(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse,
    learningThreadId: string
  ): Promise<void> {
    if (!this.memoryAdapter || !response.message) {
      return;
    }

    try {
      const detailedFeedback = {
        requestId: request.id,
        feedbackText: response.message,
        context: request.message,
        decision: response.decision,
        approver: response.approver,
        confidence: request.confidence.current,
        timestamp: new Date().toISOString(),
      };

      await this.memoryAdapter.store(
        learningThreadId,
        JSON.stringify(detailedFeedback),
        {
          type: 'human_feedback',
          subtype: 'detailed_feedback',
          decision: response.decision,
          approverId: response.approver.id,
          importance: 0.9, // High importance for detailed feedback

          // NLP-ready metadata
          feedbackLength: response.message.length,
          feedbackSentiment: this.analyzeFeedbackSentiment(response.message),
          keyPhrases: this.extractKeyPhrases(response.message),

          // Contextual learning
          originalContext: request.message.slice(0, 200),
          confidenceLevel: this.categorizeConfidence(
            request.confidence.current
          ),
        }
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store detailed feedback: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Assess the quality of feedback provided
   */
  assessFeedbackQuality(
    response: HumanApprovalResponse
  ): 'high' | 'medium' | 'low' {
    if (!response.message) return 'low';
    const length = response.message.length;
    if (length > 100) return 'high';
    if (length > 20) return 'medium';
    return 'low';
  }

  /**
   * Calculate the importance of feedback for learning
   */
  calculateFeedbackImportance(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number {
    let importance = 0.7; // Base importance

    // Higher importance for disagreements with system confidence
    const systemSaid =
      request.confidence.current >= request.confidence.threshold
        ? 'approve'
        : 'reject';
    const humanSaid = response.decision === 'approved' ? 'approve' : 'reject';
    if (systemSaid !== humanSaid) importance += 0.2;

    // Higher importance for high-risk decisions
    if (request.riskAssessment?.level === 'high') importance += 0.1;

    // Higher importance for experienced approvers
    if (this.getApproverExperience(response.approver) === 'senior')
      importance += 0.1;

    return Math.min(importance, 1.0);
  }

  // =====================
  // PRIVATE HELPER METHODS
  // =====================

  private getApproverExperience(approver: {
    id: string;
    role?: string;
  }): 'senior' | 'mid' | 'junior' {
    // Simple heuristic based on role - can be enhanced with actual experience data
    const role = (approver.role || 'unknown').toLowerCase();
    if (
      role.includes('senior') ||
      role.includes('lead') ||
      role.includes('manager')
    )
      return 'senior';
    if (role.includes('junior') || role.includes('intern')) return 'junior';
    return 'mid';
  }

  private calculateConfidenceGap(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number {
    const systemSaid =
      request.confidence.current >= request.confidence.threshold
        ? 'approve'
        : 'reject';
    const humanSaid = response.decision === 'approved' ? 'approve' : 'reject';
    return systemSaid === humanSaid
      ? 0
      : Math.abs(request.confidence.current - request.confidence.threshold);
  }

  private calculatePatternStrength(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number {
    let strength = 0.5; // Base strength

    // Higher strength for consistent decisions
    if (
      response.decision === 'approved' &&
      request.confidence.current >= request.confidence.threshold
    )
      strength += 0.3;
    if (
      response.decision === 'rejected' &&
      request.confidence.current < request.confidence.threshold
    )
      strength += 0.3;

    // Adjust for feedback quality
    if (response.message && response.message.length > 50) strength += 0.2;

    return Math.min(strength, 1.0);
  }

  private extractContextType(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('payment') ||
      lowerMessage.includes('transaction')
    )
      return 'financial';
    if (lowerMessage.includes('user') || lowerMessage.includes('customer'))
      return 'user_action';
    if (lowerMessage.includes('data') || lowerMessage.includes('information'))
      return 'data_operation';
    if (lowerMessage.includes('security') || lowerMessage.includes('access'))
      return 'security';
    return 'general';
  }

  private extractWorkflowPattern(request: HumanApprovalRequest): string {
    if (request.chainId) return 'chained_approval';
    if (request.riskAssessment?.level === 'high') return 'high_risk_single';
    if (request.confidence.current < 0.5) return 'low_confidence_single';
    return 'standard_single';
  }

  private extractSeasonality(timestamp: Date): string {
    const hour = timestamp.getHours();
    if (hour >= 9 && hour <= 17) return 'business_hours';
    if (hour >= 18 && hour <= 22) return 'evening';
    return 'after_hours';
  }

  private extractTeamId(approver: { id: string; role?: string }): string {
    // Simple heuristic - can be enhanced with actual team data
    const role = (approver.role || 'unknown').toLowerCase();
    if (role.includes('finance')) return 'finance_team';
    if (role.includes('security')) return 'security_team';
    if (role.includes('ops') || role.includes('operations')) return 'ops_team';
    return 'general_team';
  }

  private analyzeFeedbackSentiment(
    feedback: string
  ): 'positive' | 'neutral' | 'negative' {
    const lowerFeedback = feedback.toLowerCase();
    const positiveWords = [
      'good',
      'approve',
      'correct',
      'right',
      'yes',
      'agree',
    ];
    const negativeWords = ['bad', 'reject', 'wrong', 'no', 'disagree', 'error'];

    const positiveCount = positiveWords.filter((word) =>
      lowerFeedback.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerFeedback.includes(word)
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractKeyPhrases(feedback: string): string[] {
    // Simple key phrase extraction - can be enhanced with NLP
    const words = feedback.toLowerCase().split(/\s+/);
    const keyWords = words.filter(
      (word) =>
        word.length > 4 &&
        ![
          'this',
          'that',
          'with',
          'from',
          'they',
          'have',
          'been',
          'will',
          'would',
          'could',
          'should',
        ].includes(word)
    );
    return keyWords.slice(0, 5); // Top 5 key words
  }

  private categorizeConfidence(
    confidence: number
  ): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (confidence < 0.2) return 'very_low';
    if (confidence < 0.4) return 'low';
    if (confidence < 0.6) return 'medium';
    if (confidence < 0.8) return 'high';
    return 'very_high';
  }
}