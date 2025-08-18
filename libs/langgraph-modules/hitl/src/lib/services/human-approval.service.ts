import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowState, HumanFeedback } from '@langgraph-modules/core';
import { ApprovalChainService, Approver } from './approval-chain.service';
import { FeedbackProcessorService } from './feedback-processor.service';
import { ConfidenceEvaluatorService } from './confidence-evaluator.service';
import { HITL_EVENTS, HITL_DEFAULTS } from '../constants';
import { ApprovalRiskLevel, EscalationStrategy, RequiresApprovalOptions } from '../decorators/approval.decorator';

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
  CANCELLED = 'cancelled'
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
 */
@Injectable()
export class HumanApprovalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanApprovalService.name);
  private readonly approvalRequests = new Map<string, HumanApprovalRequest>();
  private readonly timeoutHandlers = new Map<string, NodeJS.Timeout>();
  private readonly streamConnections = new Map<string, any>(); // WebSocket connections for real-time updates

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly approvalChainService: ApprovalChainService,
    private readonly feedbackProcessor: FeedbackProcessorService,
    private readonly confidenceEvaluator: ConfidenceEvaluatorService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Human Approval Service initialized');

    // Set up event listeners
    this.setupEventListeners();
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up timeout handlers
    for (const [requestId, timeout] of this.timeoutHandlers.entries()) {
      clearTimeout(timeout);
      this.logger.debug(`Cleaned up timeout handler for request ${requestId}`);
    }

    this.timeoutHandlers.clear();
    this.approvalRequests.clear();
    this.streamConnections.clear();

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

    this.logger.log(`Requesting approval for execution ${executionId}, node ${nodeId}`);

    // Evaluate confidence
    const confidence = await this.confidenceEvaluator.evaluateConfidence(state);
    const confidenceFactors = await this.confidenceEvaluator.getConfidenceFactors(state);

    // Assess risk if enabled
    let riskAssessment;
    if (options.riskAssessment?.enabled) {
      riskAssessment = await this.confidenceEvaluator.assessRisk(state, {
        factors: options.riskAssessment.factors || [],
        customEvaluator: options.riskAssessment.evaluator
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
        threshold: options.confidenceThreshold || HITL_DEFAULTS.CONFIDENCE_THRESHOLD,
        factors: confidenceFactors
      },
      timestamps: {
        requested: new Date()
      },
      timeout: {
        duration: options.timeoutMs || HITL_DEFAULTS.APPROVAL_TIMEOUT_MS,
        strategy: options.onTimeout || 'reject'
      },
      retry: {
        count: 0,
        maxAttempts: HITL_DEFAULTS.RETRY_ATTEMPTS
      }
    };

    // Store request
    this.approvalRequests.set(requestId, request);

    // Set up timeout
    this.setupTimeout(requestId);

    // Determine approvers based on escalation strategy
    if (options.chainId && options.escalationStrategy !== EscalationStrategy.DIRECT) {
      try {
        const approvalRequest = await this.approvalChainService.initiateApproval(
          executionId,
          options.chainId,
          {
            nodeId,
            message,
            confidence: confidence,
            riskAssessment,
            metadata: request.metadata
          }
        );

        request.approvers = approvalRequest.currentLevel.approvers.map(a => a.id);
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
      streamEnabled: this.hasStreamConnection(executionId)
    });

    // Stream real-time approval request if connection exists
    if (this.hasStreamConnection(executionId)) {
      await this.streamApprovalRequest(request);
    }

    this.logger.log(`Approval request ${requestId} created for execution ${executionId}`);

    return request;
  }

  /**
   * Process human approval response
   */
  async processApprovalResponse(
    requestId: string,
    response: HumanApprovalResponse
  ): Promise<{ success: boolean; nextState?: Partial<WorkflowState>; error?: string }> {
    const request = this.approvalRequests.get(requestId);

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

    this.logger.log(`Processing approval response for ${requestId}: ${response.decision}`);

    // Clear timeout
    this.clearTimeout(requestId);

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
        duration: Date.now() - request.timestamps.requested.getTime()
      });

      // Stream real-time update
      if (this.hasStreamConnection(request.executionId)) {
        await this.streamApprovalUpdate(request, response);
      }

      return { success: true, nextState };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing approval response: ${errorMessage}`, error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle approval timeout
   */
  private async handleTimeout(requestId: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);

    if (!request || request.workflowState !== ApprovalWorkflowState.IN_PROGRESS) {
      return;
    }

    this.logger.warn(`Approval timeout for request ${requestId}`);

    request.workflowState = ApprovalWorkflowState.TIMEOUT;
    request.timestamps.timeout = new Date();

    // Handle based on timeout strategy
    switch (request.timeout.strategy) {
      case 'approve':
        await this.processApprovalResponse(requestId, {
          requestId,
          decision: 'approved',
          approver: { id: 'system', name: 'Auto-Approval (Timeout)', role: 'system' },
          message: 'Auto-approved due to timeout',
          timestamp: new Date()
        });
        break;

      case 'reject':
        await this.processApprovalResponse(requestId, {
          requestId,
          decision: 'rejected',
          approver: { id: 'system', name: 'Auto-Rejection (Timeout)', role: 'system' },
          message: 'Auto-rejected due to timeout',
          timestamp: new Date()
        });
        break;

      case 'escalate':
        if (request.chainId) {
          await this.processApprovalResponse(requestId, {
            requestId,
            decision: 'escalated',
            approver: { id: 'system', name: 'Auto-Escalation (Timeout)', role: 'system' },
            message: 'Escalated due to timeout',
            timestamp: new Date()
          });
        } else {
          // No chain to escalate to, reject
          await this.processApprovalResponse(requestId, {
            requestId,
            decision: 'rejected',
            approver: { id: 'system', name: 'Auto-Rejection (No Escalation)', role: 'system' },
            message: 'Rejected due to timeout (no escalation chain)',
            timestamp: new Date()
          });
        }
        break;

      case 'retry':
        if (request.retry.count < request.retry.maxAttempts) {
          request.retry.count++;
          request.workflowState = ApprovalWorkflowState.IN_PROGRESS;
          this.setupTimeout(requestId); // Setup new timeout

          await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_REQUESTED, {
            request,
            retryAttempt: request.retry.count
          });
        } else {
          await this.processApprovalResponse(requestId, {
            requestId,
            decision: 'rejected',
            approver: { id: 'system', name: 'Auto-Rejection (Max Retries)', role: 'system' },
            message: 'Rejected after maximum retry attempts',
            timestamp: new Date()
          });
        }
        break;
    }

    // Emit timeout event
    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_TIMEOUT, {
      requestId,
      executionId: request.executionId,
      strategy: request.timeout.strategy,
      retryCount: request.retry.count
    });
  }

  /**
   * Handle successful approval
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
        data: response.metadata
      },
      response.approver
    );

    // Update confidence
    const newConfidence = Math.min(request.confidence.current + 0.1, 1.0);

    return {
      humanFeedback: {
        approved: true,
        status: 'approved',
        approver: response.approver,
        message: response.message,
        timestamp: response.timestamp,
        metadata: response.metadata
      } as HumanFeedback,
      confidence: newConfidence,
      approvalReceived: true,
      waitingForApproval: false,
      [`approved_${request.nodeId}`]: true
    };
  }

  /**
   * Handle approval rejection
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
        data: response.metadata
      },
      response.approver
    );

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
        metadata: response.metadata
      } as HumanFeedback,
      confidence: newConfidence,
      approvalReceived: false,
      waitingForApproval: false,
      rejectionReason: response.message
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
      // Process escalation through approval chain
      try {
        const chainRequest = this.approvalChainService.getApprovalRequest(request.id);
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
      chainId: request.chainId
    });

    return {
      waitingForApproval: true,
      metadata: {
        ...request.state.metadata,
        escalatedBy: response.approver,
        escalationReason: response.message
      }
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
      this.setupTimeout(request.id);

      return {
        waitingForApproval: true,
        metadata: {
          ...request.state.metadata,
          retryCount: request.retry.count,
          retryReason: response.message
        }
      };
    }
      // Max retries reached, reject
      return await this.handleApprovalRejection(request, {
        ...response,
        decision: 'rejected',
        message: `Max retries reached: ${response.message}`
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
        data: response.metadata
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
        metadata: response.modifications
      } as HumanFeedback,
      waitingForApproval: false,
      metadata: {
        ...request.state.metadata,
        humanModifications: response.modifications,
        modificationReason: response.message
      }
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for approval chain events
    this.eventEmitter.on('approval.completed', async (event) => {
      const request = Array.from(this.approvalRequests.values())
        .find(r => r.executionId === event.executionId);

      if (request) {
        await this.processApprovalResponse(request.id, {
          requestId: request.id,
          decision: event.status === 'approved' ? 'approved' : 'rejected',
          approver: { id: 'chain', name: 'Approval Chain', role: 'system' },
          message: event.reason || `Chain ${event.status}`,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Setup timeout for approval request
   */
  private setupTimeout(requestId: string): void {
    const request = this.approvalRequests.get(requestId);
    if (!request) {return;}

    // Clear existing timeout
    this.clearTimeout(requestId);

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleTimeout(requestId);
    }, request.timeout.duration);

    this.timeoutHandlers.set(requestId, timeout);
  }

  /**
   * Clear timeout for approval request
   */
  private clearTimeout(requestId: string): void {
    const timeout = this.timeoutHandlers.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutHandlers.delete(requestId);
    }
  }

  /**
   * Check if stream connection exists for execution
   */
  private hasStreamConnection(executionId: string): boolean {
    return this.streamConnections.has(executionId);
  }

  /**
   * Stream approval request to connected clients
   */
  private async streamApprovalRequest(request: HumanApprovalRequest): Promise<void> {
    const connection = this.streamConnections.get(request.executionId);
    if (connection?.send) {
      try {
        connection.send(JSON.stringify({
          type: 'approval_requested',
          data: {
            requestId: request.id,
            nodeId: request.nodeId,
            message: request.message,
            confidence: request.confidence,
            riskAssessment: request.riskAssessment,
            timeout: request.timeout.duration,
            timestamp: request.timestamps.requested
          }
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream approval request: ${errorMsg}`);
      }
    }
  }

  /**
   * Stream approval update to connected clients
   */
  private async streamApprovalUpdate(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void> {
    const connection = this.streamConnections.get(request.executionId);
    if (connection?.send) {
      try {
        connection.send(JSON.stringify({
          type: 'approval_updated',
          data: {
            requestId: request.id,
            decision: response.decision,
            approver: response.approver,
            message: response.message,
            timestamp: response.timestamp
          }
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to stream approval update: ${errorMsg}`);
      }
    }
  }

  /**
   * Register stream connection for real-time updates
   */
  registerStreamConnection(executionId: string, connection: any): void {
    this.streamConnections.set(executionId, connection);
    this.logger.debug(`Registered stream connection for execution ${executionId}`);
  }

  /**
   * Unregister stream connection
   */
  unregisterStreamConnection(executionId: string): void {
    this.streamConnections.delete(executionId);
    this.logger.debug(`Unregistered stream connection for execution ${executionId}`);
  }

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
    return Array.from(this.approvalRequests.values())
      .filter(r => r.workflowState === ApprovalWorkflowState.IN_PROGRESS);
  }

  /**
   * Get approvals for execution
   */
  getApprovalsForExecution(executionId: string): HumanApprovalRequest[] {
    return Array.from(this.approvalRequests.values())
      .filter(r => r.executionId === executionId);
  }

  /**
   * Cancel approval request
   */
  async cancelApproval(requestId: string): Promise<boolean> {
    const request = this.approvalRequests.get(requestId);

    if (!request) {
      return false;
    }

    this.clearTimeout(requestId);
    request.workflowState = ApprovalWorkflowState.CANCELLED;

    await this.eventEmitter.emit(HITL_EVENTS.APPROVAL_COMPLETED, {
      requestId,
      executionId: request.executionId,
      decision: 'cancelled',
      timestamp: new Date()
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
      [ApprovalWorkflowState.CANCELLED]: 0
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const request of requests) {
      byState[request.workflowState]++;

      if (request.timestamps.responded) {
        totalResponseTime += request.timestamps.responded.getTime() - request.timestamps.requested.getTime();
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
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      timeoutRate: total > 0 ? timeout / total : 0,
      approvalRate: total > 0 ? approved / total : 0,
      escalationRate: total > 0 ? escalated / total : 0
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
