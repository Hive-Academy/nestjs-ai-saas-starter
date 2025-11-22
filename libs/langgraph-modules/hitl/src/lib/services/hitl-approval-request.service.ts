import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RunnableConfig } from '@langchain/core/runnables';
import { type WorkflowState, generateId } from '@hive-academy/langgraph-core';
import { ApprovalChainService } from './approval-chain.service';
import { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import { ApprovalTimeoutService } from './approval-timeout.service';
import { ApprovalStreamingService } from './approval-streaming.service';
import { HITL_EVENTS, HITL_DEFAULTS } from '../constants';
import {
  EscalationStrategy,
  RequiresApprovalOptions,
} from '../decorators/approval.decorator';
import {
  ApprovalWorkflowState,
  HumanApprovalRequest,
} from './approval-workflow.types';

// Storage interface for HITL operations
interface IHitlStorageService {
  save(request: HumanApprovalRequest): Promise<void>;
}

/**
 * Service for creating and setting up approval requests
 * Handles the complex request creation process
 *
 * **TASK_2025_040 Phase 1** (Migration to LangGraph Native Interruption):
 * - Removed HitlCheckpointService dependency (uses LangGraph checkpointer via config)
 * - Methods now accept RunnableConfig parameter for checkpoint access
 * - No more custom checkpoint logic - LangGraph handles state persistence
 */
@Injectable()
export class HitlApprovalRequestService {
  private readonly logger = new Logger(HitlApprovalRequestService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly approvalChainService: ApprovalChainService,
    private readonly confidenceEvaluator: ConfidenceEvaluatorService,
    private readonly approvalTimeoutService: ApprovalTimeoutService,
    private readonly approvalStreamingService: ApprovalStreamingService
  ) {
    this.logger.log('📝 HITL Approval Request Service initialized');
  }

  /**
   * Create and setup a human approval request
   *
   * **Phase 1 Change**: Added optional config parameter for LangGraph checkpointer access
   * Config is optional for backward compatibility with decorator-based approvals
   */
  async createApprovalRequest(
    executionId: string,
    nodeId: string,
    message: string,
    state: WorkflowState,
    options: RequiresApprovalOptions = {},
    hitlStorage: IHitlStorageService,
    approvalCache: Map<string, HumanApprovalRequest>,
    handleTimeout: (requestId: string) => Promise<void>,
    config?: RunnableConfig
  ): Promise<HumanApprovalRequest> {
    const requestId = generateId('approval');

    this.logger.log(
      `Creating approval request for execution ${executionId}, node ${nodeId}`
    );

    // Evaluate confidence
    const confidence = await this.confidenceEvaluator.evaluateConfidence(state);
    const confidenceFactors =
      await this.confidenceEvaluator.getConfidenceFactors(state);

    // Assess risk if enabled
    let riskAssessment;
    if (options.riskAssessment?.enabled) {
      riskAssessment = await this.confidenceEvaluator.assessRisk(state, {
        factors: options.riskAssessment.factors || [],
        customEvaluator: options.riskAssessment.evaluator,
      });
    }

    // Create approval request
    const request: HumanApprovalRequest = {
      id: requestId,
      executionId,
      nodeId,
      message,
      metadata: options.metadata?.(state) || {},
      state,
      options,
      workflowState: ApprovalWorkflowState.PENDING,
      chainId: options.chainId,
      riskAssessment,
      confidence: {
        current: confidence,
        threshold:
          options.confidenceThreshold || HITL_DEFAULTS.CONFIDENCE_THRESHOLD,
        factors: confidenceFactors,
      },
      timestamps: {
        requested: new Date(),
      },
      timeout: {
        duration: options.timeoutMs || HITL_DEFAULTS.APPROVAL_TIMEOUT_MS,
        strategy: options.onTimeout || 'reject',
      },
      retry: {
        count: 0,
        maxAttempts: HITL_DEFAULTS.RETRY_ATTEMPTS,
      },
    };

    // Store request in persistent storage (adapter-first)
    await hitlStorage.save(request);
    // Cache for performance
    approvalCache.set(requestId, request);

    // Set up timeout
    this.approvalTimeoutService.setupTimeout(requestId, request, handleTimeout);

    // Handle approval chain setup
    await this.setupApprovalChain(request, executionId);

    // Update state to in progress
    request.workflowState = ApprovalWorkflowState.IN_PROGRESS;

    // Emit event for external systems
    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_REQUESTED, {
      request,
      approvers: request.approvers,
      streamEnabled:
        this.approvalStreamingService.hasStreamConnection(executionId),
    });

    // Stream real-time approval request if connection exists
    if (this.approvalStreamingService.hasStreamConnection(executionId)) {
      await this.approvalStreamingService.streamApprovalRequest(request);
    }

    // NOTE: State persistence handled by LangGraph checkpointer (via config parameter)
    // No manual checkpoint saving needed - LangGraph automatically persists state

    this.logger.log(
      `Approval request ${requestId} created for execution ${executionId}`
    );

    return request;
  }

  /**
   * Setup approval chain if configured
   *
   * **Phase 1 Change**: No checkpoint saving - LangGraph handles persistence
   */
  private async setupApprovalChain(
    request: HumanApprovalRequest,
    executionId: string
  ): Promise<void> {
    if (
      request.options.chainId &&
      request.options.escalationStrategy !== EscalationStrategy.DIRECT
    ) {
      try {
        const approvalRequest =
          await this.approvalChainService.initiateApproval(
            executionId,
            request.options.chainId,
            {
              nodeId: request.nodeId,
              message: request.message,
              confidence: request.confidence.current,
              riskAssessment: request.riskAssessment,
              metadata: request.metadata,
            }
          );

        const currentLevelObj =
          approvalRequest.chain[approvalRequest.currentLevel];
        request.approvers = currentLevelObj.approvers.map((a) => a.id);

        // NOTE: Chain progress tracked via Neo4j adapter storage
        // LangGraph checkpointer handles workflow state persistence
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to initiate approval chain: ${errorMsg}`);
      }
    }
  }
}
