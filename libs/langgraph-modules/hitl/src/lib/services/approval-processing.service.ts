import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { HitlCapableState } from '../interfaces/hitl-state.interface';
import { FeedbackProcessorService } from './feedback-processor.service';
import { ApprovalChainService, Approver } from './approval-chain.service';
import { ApproverIntelligenceService } from './approver-intelligence.service';
import { HITL_EVENTS } from '../constants';
import {
  ApprovalWorkflowState,
  HumanApprovalRequest,
  HumanApprovalResponse,
} from './approval-workflow.types';
import type { ApproverRanking } from '../interfaces/approver-intelligence.interface';

/**
 * Approval Processing Service - REFACTORED Phase 1a SOLID Compliance
 *
 * Handles the core approval workflow logic and state transitions.
 *
 * **Phase 1a SOLID Refactoring** (2025-01-11):
 * - Reduced from 1,136 LOC to ~390 LOC (66% reduction)
 * - Extracted ApproverIntelligenceService (~450 LOC)
 * - Extracted ApprovalOutcomeService (~150 LOC)
 * - ZERO backward compatibility concerns (direct replacement)
 *
 * **Responsibility**: Orchestrate approval workflows and state transitions
 * **Pattern**: Facade pattern - coordinates specialized services
 * **Target LOC**: ~400 lines (down from 1,136)
 *
 * Verification:
 * - Source: approval-processing.service.ts:1-1136 (original monolith)
 * - Pattern: Delegation to specialized services
 */
@Injectable()
export class ApprovalProcessingService {
  private readonly logger = new Logger(ApprovalProcessingService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly feedbackProcessor: FeedbackProcessorService,
    private readonly approvalChainService: ApprovalChainService,
    // Phase 1a: NEW service dependencies (extracted from this file)
    private readonly approverIntelligence: ApproverIntelligenceService // Note: ApprovalOutcomeService methods removed during IMemoryAdapter purge (TASK_2025_042)
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
    nextState?: Partial<HitlCapableState>;
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
      let nextState: Partial<HitlCapableState> = {};

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
   *
   * Phase 1a: Delegates to ApprovalOutcomeService for memory storage
   */
  private async handleApprovalSuccess(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<HitlCapableState>> {
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

    // Note: Memory learning methods removed during IMemoryAdapter purge (TASK_2025_042)
    // Approval outcome tracking can be restored via BaseStore if needed

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
      },
      confidence: newConfidence,
      approvalReceived: true,
      waitingForApproval: false,
      [`approved_${request.nodeId}`]: true,
    };
  }

  /**
   * Handle approval rejection - Enhanced with 2025 Memory Learning
   *
   * Phase 1a: Delegates to ApprovalOutcomeService for memory storage
   */
  private async handleApprovalRejection(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<Partial<HitlCapableState>> {
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

    // Note: Memory learning methods removed during IMemoryAdapter purge (TASK_2025_042)
    // Approval outcome tracking can be restored via BaseStore if needed

    // Decrease confidence
    const newConfidence = Math.max(request.confidence.current - 0.2, 0.0);

    return {
      humanFeedback: {
        approved: false,
        status: 'rejected',
        approver: response.approver,
        message: response.message,
        timestamp: response.timestamp,
        metadata: response.metadata,
      },
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
  ): Promise<Partial<HitlCapableState>> {
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
  ): Promise<Partial<HitlCapableState>> {
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
  ): Promise<Partial<HitlCapableState>> {
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
      },
      waitingForApproval: false,
      metadata: {
        ...request.state.metadata,
        humanModifications: response.modifications,
        modificationReason: response.message,
      },
    };
  }

  // ============================================================================
  // PUBLIC DELEGATION METHODS - Phase 1a: Expose extracted service functionality
  // ============================================================================

  /**
   * Select best approver for a request using intelligent routing
   *
   * Phase 1a: Delegates to ApproverIntelligenceService
   * Verification: approval-processing.service.ts:410-544 (original implementation)
   *
   * @param request The approval request requiring intelligent routing
   * @param potentialApprovers List of eligible approvers
   * @returns Promise of selected approver ID with ranking reasoning
   */
  async selectBestApprover(
    request: HumanApprovalRequest,
    potentialApprovers: string[]
  ): Promise<ApproverRanking> {
    return this.approverIntelligence.selectBestApprover(
      request,
      potentialApprovers
    );
  }
}
