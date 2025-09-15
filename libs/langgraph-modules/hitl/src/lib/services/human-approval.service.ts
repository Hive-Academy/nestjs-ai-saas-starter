import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  WorkflowState,
} from '@hive-academy/langgraph-core';
import { ApprovalChainService } from './approval-chain.service';
import { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import { ApprovalProcessingService } from './approval-processing.service';
import { ApprovalTimeoutService } from './approval-timeout.service';
import { ApprovalStreamingService } from './approval-streaming.service';
import { UserInterruptionService } from './user-interruption.service';
import {
  InterruptionContext,
  UserInterruption,
  UserInterruptionResponse,
} from '../interfaces/user-interruption.interface';
import { HITL_EVENTS, HITL_DEFAULTS } from '../constants';
import {
  ApprovalRiskLevel,
  EscalationStrategy,
  RequiresApprovalOptions,
} from '../decorators/approval.decorator';

/**
 * Approval workflow state
 */
export enum ApprovalWorkflowState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Human approval request structure
 */
export interface HumanApprovalRequest {
  /** Request ID */
  id: string;

  /** Execution ID */
  executionId: string;

  /** Node requesting approval */
  nodeId: string;

  /** Approval message */
  message: string;

  /** Request metadata */
  metadata: Record<string, unknown>;

  /** Current workflow state */
  state: WorkflowState;

  /** Approval options */
  options: RequiresApprovalOptions;

  /** Current workflow state */
  workflowState: ApprovalWorkflowState;

  /** Assigned approvers */
  approvers?: string[];

  /** Approval chain ID */
  chainId?: string;

  /** Risk assessment */
  riskAssessment?: {
    level: ApprovalRiskLevel;
    factors: string[];
    score: number;
    details?: Record<string, unknown>;
  };

  /** Confidence evaluation */
  confidence: {
    current: number;
    threshold: number;
    factors: Record<string, number>;
  };

  /** Timestamps */
  timestamps: {
    requested: Date;
    responded?: Date;
    timeout?: Date;
  };

  /** Timeout configuration */
  timeout: {
    duration: number;
    strategy: 'approve' | 'reject' | 'escalate' | 'retry';
  };

  /** Retry information */
  retry: {
    count: number;
    maxAttempts: number;
  };
}

/**
 * Human approval response
 */
export interface HumanApprovalResponse {
  /** Request ID */
  requestId: string;

  /** Decision */
  decision: 'approved' | 'rejected' | 'escalated' | 'retry' | 'modify';

  /** Approver information */
  approver: {
    id: string;
    name?: string;
    role?: string;
  };

  /** Response message */
  message?: string;

  /** Modifications to apply */
  modifications?: Record<string, unknown>;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Response timestamp */
  timestamp: Date;
}

/**
 * Approval workflow statistics
 */
export interface ApprovalWorkflowStats {
  total: number;
  byState: Record<ApprovalWorkflowState, number>;
  averageResponseTime: number;
  timeoutRate: number;
  approvalRate: number;
  escalationRate: number;
}

/**
 * Service for managing human approval workflows with state persistence and timeout handling
 * Orchestrates multiple specialized services for approval processing, timeouts, streaming, and user interruptions
 */
@Injectable()
export class HumanApprovalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanApprovalService.name);
  private readonly approvalRequests = new Map<string, HumanApprovalRequest>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly approvalChainService: ApprovalChainService,
    private readonly confidenceEvaluator: ConfidenceEvaluatorService,
    private readonly approvalProcessingService: ApprovalProcessingService,
    private readonly approvalTimeoutService: ApprovalTimeoutService,
    private readonly approvalStreamingService: ApprovalStreamingService,
    private readonly userInterruptionService: UserInterruptionService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Human Approval Service initialized');
    this.setupEventListeners();
  }

  async onModuleDestroy(): Promise<void> {
    this.approvalTimeoutService.clearAllTimeouts();
    this.approvalRequests.clear();
    this.approvalStreamingService.clearAllConnections();
    this.logger.log('Human Approval Service destroyed');
  }

  /**
   * Request human approval for a workflow node
   */
  async requestApproval(
    executionId: string,
    nodeId: string,
    message: string,
    state: WorkflowState,
    options: RequiresApprovalOptions = {}
  ): Promise<HumanApprovalRequest> {
    const requestId = this.generateRequestId();

    this.logger.log(
      `Requesting approval for execution ${executionId}, node ${nodeId}`
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

    // Store request
    this.approvalRequests.set(requestId, request);

    // Set up timeout
    this.approvalTimeoutService.setupTimeout(
      requestId,
      request,
      (id) => this.handleTimeout(id)
    );

    // Determine approvers based on escalation strategy
    if (
      options.chainId &&
      options.escalationStrategy !== EscalationStrategy.DIRECT
    ) {
      try {
        const approvalRequest =
          await this.approvalChainService.initiateApproval(
            executionId,
            options.chainId,
            {
              nodeId,
              message,
              confidence: confidence,
              riskAssessment,
              metadata: request.metadata,
            }
          );

        request.approvers = approvalRequest.currentLevel.approvers.map(
          (a) => a.id
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to initiate approval chain: ${errorMsg}`);
      }
    }

    // Update state to in progress
    request.workflowState = ApprovalWorkflowState.IN_PROGRESS;

    // Emit event for external systems
    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_REQUESTED, {
      request,
      approvers: request.approvers,
      streamEnabled: this.approvalStreamingService.hasStreamConnection(executionId),
    });

    // Stream real-time approval request if connection exists
    if (this.approvalStreamingService.hasStreamConnection(executionId)) {
      await this.approvalStreamingService.streamApprovalRequest(request);
    }

    this.logger.log(
      `Approval request ${requestId} created for execution ${executionId}`
    );

    return request;
  }

  /**
   * Process approval for a ticket or workflow
   */
  async processApproval(request: {
    executionId: string;
    nodeId: string;
    approved: boolean;
    approvedBy: string;
    feedback?: string;
    timestamp: Date;
  }): Promise<{
    success: boolean;
    shouldContinue?: boolean;
    error?: string;
  }> {
    return this.approvalProcessingService.processApproval(request, this.approvalRequests);
  }

  /**
   * Process human approval response
   */
  async processApprovalResponse(
    requestId: string,
    response: HumanApprovalResponse
  ): Promise<{
    success: boolean;
    nextState?: Partial<WorkflowState>;
    error?: string;
  }> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      return { success: false, error: `Approval request ${requestId} not found` };
    }

    // Clear timeout
    this.approvalTimeoutService.clearTimeout(requestId);

    // Process through the processing service
    const result = await this.approvalProcessingService.processApprovalResponse(
      requestId,
      response,
      this.approvalRequests
    );

    // Stream real-time update
    if (this.approvalStreamingService.hasStreamConnection(request.executionId)) {
      await this.approvalStreamingService.streamApprovalUpdate(request, response);
    }

    return result;
  }

  /**
   * Handle approval timeout
   */
  private async handleTimeout(requestId: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) return;

    await this.approvalTimeoutService.handleTimeout(
      requestId,
      request,
      (id, response) => this.processApprovalResponse(id, response)
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for approval chain events
    this.eventEmitter.on('approval.completed', async (event) => {
      const request = Array.from(this.approvalRequests.values()).find(
        (r) => r.executionId === event.executionId
      );

      if (request) {
        await this.processApprovalResponse(request.id, {
          requestId: request.id,
          decision: event.status === 'approved' ? 'approved' : 'rejected',
          approver: { id: 'chain', name: 'Approval Chain', role: 'system' },
          message: event.reason || `Chain ${event.status}`,
          timestamp: new Date(),
        });
      }
    });
  }

  // ==========================================
  // STREAMING METHODS
  // ==========================================

  /**
   * Register stream connection for real-time updates
   */
  registerStreamConnection(executionId: string, connection: any): void {
    this.approvalStreamingService.registerStreamConnection(executionId, connection);
  }

  /**
   * Unregister stream connection
   */
  unregisterStreamConnection(executionId: string): void {
    this.approvalStreamingService.unregisterStreamConnection(executionId);
  }

  // ==========================================
  // USER INTERRUPTION METHODS (Delegated)
  // ==========================================

  /**
   * Request user interruption during workflow execution
   */
  async requestUserInterruption(context: InterruptionContext): Promise<string> {
    return this.userInterruptionService.requestUserInterruption(context);
  }

  /**
   * Handle user response to interruption
   */
  async handleUserInterruptionResponse(
    response: UserInterruptionResponse
  ): Promise<{
    success: boolean;
    shouldContinue: boolean;
    updatedState?: Partial<WorkflowState>;
    error?: string;
  }> {
    return this.userInterruptionService.handleUserInterruptionResponse(response);
  }

  /**
   * Get active interruptions for execution
   */
  async getActiveUserInterruptions(
    executionId: string
  ): Promise<readonly UserInterruption[]> {
    return this.userInterruptionService.getActiveUserInterruptions(executionId);
  }

  /**
   * Cancel user interruption
   */
  async cancelUserInterruption(interruptionId: string): Promise<boolean> {
    return this.userInterruptionService.cancelUserInterruption(interruptionId);
  }

  /**
   * Check if execution has pending interruptions
   */
  async hasPendingInterruptions(executionId: string): Promise<boolean> {
    return this.userInterruptionService.hasPendingInterruptions(executionId);
  }

  /**
   * Interrupt agent execution with user question
   */
  async interruptAgentWithQuestion(
    executionId: string,
    nodeId: string,
    userQuestion: string,
    userId?: string
  ): Promise<string> {
    return this.userInterruptionService.interruptAgentWithQuestion(
      executionId,
      nodeId,
      userQuestion,
      userId
    );
  }

  /**
   * Request clarification from user during execution
   */
  async requestClarification(
    executionId: string,
    nodeId: string,
    clarificationRequest: string,
    context?: Record<string, unknown>
  ): Promise<string> {
    return this.userInterruptionService.requestClarification(
      executionId,
      nodeId,
      clarificationRequest,
      context
    );
  }

  // ==========================================
  // APPROVAL MANAGEMENT METHODS
  // ==========================================

  /**
   * Get approval request by ID
   */
  getApprovalRequest(requestId: string): HumanApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  /**
   * Get all pending approvals
   */
  getPendingApprovals(): HumanApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      (r) => r.workflowState === ApprovalWorkflowState.IN_PROGRESS
    );
  }

  /**
   * Get approvals for execution
   */
  getApprovalsForExecution(executionId: string): HumanApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      (r) => r.executionId === executionId
    );
  }

  /**
   * Cancel approval request
   */
  async cancelApproval(requestId: string): Promise<boolean> {
    const request = this.approvalRequests.get(requestId);

    if (!request) {
      return false;
    }

    this.approvalTimeoutService.clearTimeout(requestId);
    request.workflowState = ApprovalWorkflowState.CANCELLED;

    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_COMPLETED, {
      requestId,
      executionId: request.executionId,
      decision: 'cancelled',
      timestamp: new Date(),
    });

    this.logger.log(`Cancelled approval request ${requestId}`);
    return true;
  }

  /**
   * Get approval workflow statistics
   */
  getApprovalStats(): ApprovalWorkflowStats {
    const requests = Array.from(this.approvalRequests.values());

    const byState: Record<ApprovalWorkflowState, number> = {
      [ApprovalWorkflowState.PENDING]: 0,
      [ApprovalWorkflowState.IN_PROGRESS]: 0,
      [ApprovalWorkflowState.APPROVED]: 0,
      [ApprovalWorkflowState.REJECTED]: 0,
      [ApprovalWorkflowState.ESCALATED]: 0,
      [ApprovalWorkflowState.TIMEOUT]: 0,
      [ApprovalWorkflowState.CANCELLED]: 0,
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const request of requests) {
      byState[request.workflowState]++;

      if (request.timestamps.responded) {
        totalResponseTime +=
          request.timestamps.responded.getTime() -
          request.timestamps.requested.getTime();
        responseCount++;
      }
    }

    const total = requests.length;
    const approved = byState[ApprovalWorkflowState.APPROVED];
    const escalated = byState[ApprovalWorkflowState.ESCALATED];
    const timeout = byState[ApprovalWorkflowState.TIMEOUT];

    return {
      total,
      byState,
      averageResponseTime:
        responseCount > 0 ? totalResponseTime / responseCount : 0,
      timeoutRate: total > 0 ? timeout / total : 0,
      approvalRate: total > 0 ? approved / total : 0,
      escalationRate: total > 0 ? escalated / total : 0,
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}