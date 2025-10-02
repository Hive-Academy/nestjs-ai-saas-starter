import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  WorkflowState,
  HumanFeedback,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';
import { FeedbackProcessorService } from './feedback-processor.service';
import { ApprovalChainService, Approver } from './approval-chain.service';
import { HITL_EVENTS } from '../constants';
import {
  ApprovalWorkflowState,
  HumanApprovalRequest,
  HumanApprovalResponse,
} from './approval-workflow.types';

/**
 * Approval Processing Service
 * Handles the core approval workflow logic and state transitions
 */
@Injectable()
export class ApprovalProcessingService {
  private readonly logger = new Logger(ApprovalProcessingService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly feedbackProcessor: FeedbackProcessorService,
    private readonly approvalChainService: ApprovalChainService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Process approval for a ticket or workflow
   */
  async processApproval(
    request: {
      executionId: string;
      nodeId: string;
      approved: boolean;
      approvedBy: string;
      feedback?: string;
      timestamp: Date;
    },
    approvalRequests: Map<string, HumanApprovalRequest>
  ): Promise<{
    success: boolean;
    shouldContinue?: boolean;
    error?: string;
  }> {
    try {
      // Find the approval request by executionId and nodeId
      const approvalRequest = Array.from(approvalRequests.values()).find(
        (req) =>
          req.executionId === request.executionId &&
          req.nodeId === request.nodeId
      );

      if (!approvalRequest) {
        return {
          success: false,
          error: `No approval request found for execution ${request.executionId}, node ${request.nodeId}`,
        };
      }

      // Process the approval response
      const result = await this.processApprovalResponse(
        approvalRequest.id,
        {
          requestId: approvalRequest.id,
          decision: request.approved ? 'approved' : 'rejected',
          approver: {
            id: request.approvedBy,
            name: request.approvedBy,
          },
          message: request.feedback,
          timestamp: request.timestamp,
          metadata: {
            processedViaAPI: true,
            nodeId: request.nodeId,
            executionId: request.executionId,
          },
        },
        approvalRequests
      );

      return {
        success: result.success,
        shouldContinue: request.approved && result.success,
        error: result.error,
      };
    } catch (error) {
      this.logger.error('Error processing approval:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process human approval response
   */
  async processApprovalResponse(
    requestId: string,
    response: HumanApprovalResponse,
    approvalRequests: Map<string, HumanApprovalRequest>
  ): Promise<{
    success: boolean;
    nextState?: Partial<WorkflowState>;
    error?: string;
  }> {
    const request = approvalRequests.get(requestId);

    if (!request) {
      const error = `Approval request ${requestId} not found`;
      this.logger.error(error);
      return { success: false, error };
    }

    if (request.workflowState !== ApprovalWorkflowState.IN_PROGRESS) {
      const error = `Approval request ${requestId} is not in progress (current state: ${request.workflowState})`;
      this.logger.warn(error);
      return { success: false, error };
    }

    this.logger.log(
      `Processing approval response for ${requestId}: ${response.decision}`
    );

    // Update request timestamps
    request.timestamps.responded = response.timestamp;

    try {
      let nextState: Partial<WorkflowState> = {};

      switch (response.decision) {
        case 'approved':
          request.workflowState = ApprovalWorkflowState.APPROVED;
          nextState = await this.handleApprovalSuccess(request, response);
          break;

        case 'rejected':
          request.workflowState = ApprovalWorkflowState.REJECTED;
          nextState = await this.handleApprovalRejection(request, response);
          break;

        case 'escalated':
          request.workflowState = ApprovalWorkflowState.ESCALATED;
          nextState = await this.handleApprovalEscalation(request, response);
          break;

        case 'retry':
          nextState = await this.handleApprovalRetry(request, response);
          break;

        case 'modify':
          nextState = await this.handleApprovalModification(request, response);
          break;

        default:
          throw new Error(`Unknown approval decision: ${response.decision}`);
      }

      // Emit completion event
      await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_COMPLETED, {
        requestId,
        executionId: request.executionId,
        decision: response.decision,
        approver: response.approver,
        duration: Date.now() - request.timestamps.requested.getTime(),
      });

      return { success: true, nextState };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing approval response: ${errorMessage}`,
        error
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle successful approval - Enhanced with 2025 Memory Learning
   */
  private async handleApprovalSuccess(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<WorkflowState>> {
    // Submit approval feedback
    await this.feedbackProcessor.submitFeedback(
      request.executionId,
      'approval' as any,
      {
        message: response.message,
        data: response.metadata,
      },
      response.approver
    );

    // 🧠 MEMORY LEARNING: Store approval decision for future learning (2025 Pattern)
    await this.storeApprovalMemoryForLearning(request, response, 'approved');

    // Update confidence
    const newConfidence = Math.min(request.confidence.current + 0.1, 1.0);

    return {
      humanFeedback: {
        approved: true,
        status: 'approved',
        approver: response.approver,
        message: response.message,
        timestamp: response.timestamp,
        metadata: response.metadata,
      } as HumanFeedback,
      confidence: newConfidence,
      approvalReceived: true,
      waitingForApproval: false,
      [`approved_${request.nodeId}`]: true,
    };
  }

  /**
   * Handle approval rejection - Enhanced with 2025 Memory Learning
   */
  private async handleApprovalRejection(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<WorkflowState>> {
    // Submit rejection feedback
    await this.feedbackProcessor.submitFeedback(
      request.executionId,
      'rejection' as any,
      {
        message: response.message,
        data: response.metadata,
      },
      response.approver
    );

    // 🧠 MEMORY LEARNING: Store rejection decision for future learning (2025 Pattern)
    await this.storeApprovalMemoryForLearning(request, response, 'rejected');

    // Decrease confidence
    const newConfidence = Math.max(request.confidence.current - 0.2, 0.0);

    return {
      humanFeedback: {
        approved: false,
        status: 'rejected',
        approver: response.approver,
        message: response.message,
        reason: response.message,
        timestamp: response.timestamp,
        metadata: response.metadata,
      } as HumanFeedback,
      confidence: newConfidence,
      approvalReceived: false,
      waitingForApproval: false,
      rejectionReason: response.message,
    };
  }

  /**
   * Handle approval escalation
   */
  private async handleApprovalEscalation(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<WorkflowState>> {
    if (request.chainId && this.approvalChainService) {
      try {
        const chainRequest = await this.approvalChainService.getApprovalRequest(
          request.id
        );
        if (chainRequest) {
          await this.approvalChainService.processApproval(
            request.id,
            response.approver as Approver,
            'escalated',
            response.message
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process escalation: ${errorMsg}`);
      }
    }

    // Emit escalation event
    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_ESCALATED, {
      requestId: request.id,
      executionId: request.executionId,
      escalatedBy: response.approver,
      chainId: request.chainId,
    });

    return {
      waitingForApproval: true,
      metadata: {
        ...request.state.metadata,
        escalatedBy: response.approver,
        escalationReason: response.message,
      },
    };
  }

  /**
   * Handle approval retry
   */
  private async handleApprovalRetry(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<WorkflowState>> {
    if (request.retry.count < request.retry.maxAttempts) {
      request.retry.count++;
      request.workflowState = ApprovalWorkflowState.IN_PROGRESS;

      return {
        waitingForApproval: true,
        metadata: {
          ...request.state.metadata,
          retryCount: request.retry.count,
          retryReason: response.message,
        },
      };
    }

    // Max retries reached, reject
    return await this.handleApprovalRejection(request, {
      ...response,
      decision: 'rejected',
      message: `Max retries reached: ${response.message}`,
    });
  }

  /**
   * Handle approval modification
   */
  private async handleApprovalModification(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<WorkflowState>> {
    // Submit modification feedback
    await this.feedbackProcessor.submitFeedback(
      request.executionId,
      'modification' as any,
      {
        message: response.message,
        modifications: response.modifications,
        data: response.metadata,
      },
      response.approver
    );

    return {
      humanFeedback: {
        approved: false,
        status: 'needs_revision',
        approver: response.approver,
        message: response.message,
        timestamp: response.timestamp,
        metadata: response.modifications,
      } as HumanFeedback,
      waitingForApproval: false,
      metadata: {
        ...request.state.metadata,
        humanModifications: response.modifications,
        modificationReason: response.message,
      },
    };
  }

  // ============================================================================
  // MEMORY LEARNING INTEGRATION - 2025 LangGraph Patterns
  // ============================================================================

  /**
   * Store approval decision in memory for future learning
   *
   * This follows the 2025 LangGraph pattern for Human-In-The-Loop memory learning,
   * where human feedback is stored to improve future AI decision-making and
   * confidence calibration.
   */
  private async storeApprovalMemoryForLearning(
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
   */
  private assessFeedbackQuality(feedback?: string): 'high' | 'medium' | 'low' {
    if (!feedback || feedback.trim().length < 10) return 'low';
    if (feedback.length > 50 && feedback.includes(' ')) return 'high';
    return 'medium';
  }

  /**
   * Analyze approver decision-making style
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
}
