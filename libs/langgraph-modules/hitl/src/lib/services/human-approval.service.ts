import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeIdBuilder,
  type WorkflowState,
  type ICheckpointAdapter,
  type IMemoryAdapter,
  type BaseCheckpointMetadata,
  type BaseCheckpointTuple,
  generateId,
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
  EscalationStrategy,
  RequiresApprovalOptions,
} from '../decorators/approval.decorator';
import {
  ApprovalWorkflowState,
  HumanApprovalRequest,
  HumanApprovalResponse,
  ApprovalWorkflowStats,
} from './approval-workflow.types';

// Re-export moved types for backward compatibility (external imports unchanged)
export { ApprovalWorkflowState } from './approval-workflow.types';
export type {
  HumanApprovalRequest,
  HumanApprovalResponse,
  ApprovalWorkflowStats,
} from './approval-workflow.types';

/**
 * Service for managing human approval workflows with state persistence and timeout handling
 * Orchestrates multiple specialized services for approval processing, timeouts, streaming, and user interruptions
 */
@Injectable()
export class HumanApprovalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanApprovalService.name);
  private readonly approvalRequests = new Map<string, HumanApprovalRequest>();
  private currentStep = 0;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly approvalChainService: ApprovalChainService,
    private readonly confidenceEvaluator: ConfidenceEvaluatorService,
    private readonly approvalProcessingService: ApprovalProcessingService,
    private readonly approvalTimeoutService: ApprovalTimeoutService,
    private readonly approvalStreamingService: ApprovalStreamingService,
    private readonly userInterruptionService: UserInterruptionService,
    @Optional()
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter?: ICheckpointAdapter,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    if (this.checkpointAdapter) {
      this.logger.log(
        'Checkpoint adapter available - automatic approval state persistence enabled'
      );
    }

    if (this.memoryAdapter) {
      this.logger.log(
        '🧠 Memory adapter available - human feedback learning enabled'
      );
    } else {
      this.logger.debug(
        'Memory adapter not available - proceeding without feedback learning'
      );
    }
  }

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
    const requestId = generateId('approval');

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
    this.approvalTimeoutService.setupTimeout(requestId, request, (id) =>
      this.handleTimeout(id)
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

        // Save chain progress checkpoint
        await this.saveChainProgress(
          request,
          approvalRequest.currentLevel.priority,
          request.approvers,
          'initiated'
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
      streamEnabled:
        this.approvalStreamingService.hasStreamConnection(executionId),
    });

    // Stream real-time approval request if connection exists
    if (this.approvalStreamingService.hasStreamConnection(executionId)) {
      await this.approvalStreamingService.streamApprovalRequest(request);
    }

    // Save checkpoint after approval is created
    await this.saveApprovalState(request, 'approval_created');

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
    return this.approvalProcessingService.processApproval(
      request,
      this.approvalRequests
    );
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
      return {
        success: false,
        error: `Approval request ${requestId} not found`,
      };
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
    if (
      this.approvalStreamingService.hasStreamConnection(request.executionId)
    ) {
      await this.approvalStreamingService.streamApprovalUpdate(
        request,
        response
      );
    }

    // Save checkpoint after approval response is processed
    if (result.success && request) {
      await this.saveApprovalState(request, 'approval_processed', {
        decision: response.decision,
        approver: response.approver,
        nextState: result.nextState,
      });
    }

    // 🧠 AUTOMAGICAL: Learn from human feedback if memory adapter is available
    if (this.memoryAdapter && result.success && request) {
      try {
        await this.learnFromHumanFeedback(request, response);
        this.logger.debug(
          `🧠 Learned from human feedback for request ${requestId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to learn from human feedback: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // Don't fail the approval process if learning fails
      }
    }

    return result;
  }

  /**
   * Handle approval timeout
   */
  private async handleTimeout(requestId: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) return;

    // Save timeout state before handling
    await this.persistTimeoutState(request);

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
        // Save chain completion checkpoint before processing response
        if (request.chainId) {
          await this.saveChainProgress(
            request,
            event.level || 0,
            request.approvers || [],
            event.status
          );
        }

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
    this.approvalStreamingService.registerStreamConnection(
      executionId,
      connection
    );
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
    return this.userInterruptionService.handleUserInterruptionResponse(
      response
    );
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

  // ==========================================
  // CHECKPOINT OPERATIONS
  // ==========================================

  /**
   * Save approval workflow state at critical points
   */
  private async saveApprovalState(
    request: HumanApprovalRequest,
    source: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      return; // Gracefully handle when checkpoint adapter is not available
    }

    try {
      const threadId = this.generateApprovalThreadId(
        request.executionId,
        request.nodeId
      );

      const checkpointData = {
        id: request.id,
        channel_values: {
          request,
          additionalData,
          timestamp: new Date().toISOString(),
        },
      };

      const metadata: BaseCheckpointMetadata = {
        timestamp: new Date().toISOString(),
        source: source as 'input' | 'loop' | 'update' | 'fork',
        step: ++this.currentStep,
        parents: {
          executionId: request.executionId,
          nodeId: request.nodeId,
          requestId: request.id,
        },
        workflowState: request.workflowState,
        confidence: request.confidence.current,
        riskLevel: request.riskAssessment?.level,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        checkpointData,
        metadata,
        'hitl-approval'
      );

      this.logger.debug(
        `Saved approval checkpoint for request ${request.id} at ${source}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to save approval checkpoint for request ${request.id}: ${errorMsg}`
      );
      // Don't throw - gracefully continue approval workflow
    }
  }

  /**
   * Resume approval workflow from saved state
   */
  async resumeApprovalWorkflow(
    executionId: string,
    nodeId: string,
    checkpointId?: string
  ): Promise<HumanApprovalRequest | null> {
    if (!this.checkpointAdapter) {
      this.logger.warn(
        'Cannot resume approval workflow - no checkpoint adapter available'
      );
      return null;
    }

    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);

      const checkpoint = await this.checkpointAdapter.loadCheckpoint<{
        request: HumanApprovalRequest;
        additionalData?: Record<string, unknown>;
        timestamp: string;
      }>(threadId, checkpointId, 'hitl-approval');

      if (!checkpoint?.channel_values?.request) {
        this.logger.warn(
          `No checkpoint found for approval workflow: ${executionId}/${nodeId}`
        );
        return null;
      }

      const restoredRequest = checkpoint.channel_values.request;

      // Restore request to in-memory map
      this.approvalRequests.set(restoredRequest.id, restoredRequest);

      // Re-setup timeout if still in progress
      if (restoredRequest.workflowState === ApprovalWorkflowState.IN_PROGRESS) {
        const timeElapsed =
          Date.now() - restoredRequest.timestamps.requested.getTime();
        const remainingTimeout = restoredRequest.timeout.duration - timeElapsed;

        if (remainingTimeout > 0) {
          // Update the request timeout duration to the remaining time
          restoredRequest.timeout.duration = remainingTimeout;
          this.approvalTimeoutService.setupTimeout(
            restoredRequest.id,
            restoredRequest,
            (id) => this.handleTimeout(id)
          );
        }
      }

      this.logger.log(
        `Resumed approval workflow for request ${restoredRequest.id} from checkpoint`
      );

      return restoredRequest;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resume approval workflow for ${executionId}/${nodeId}: ${errorMsg}`
      );
      return null;
    }
  }

  /**
   * Handle timeout state persistence
   */
  private async persistTimeoutState(
    request: HumanApprovalRequest
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      return; // Gracefully handle when checkpoint adapter is not available
    }

    try {
      // Update request with timeout timestamp
      request.timestamps.timeout = new Date();
      request.workflowState = ApprovalWorkflowState.TIMEOUT;

      // Save timeout state
      await this.saveApprovalState(request, 'approval_timeout', {
        timeoutStrategy: request.timeout.strategy,
        originalDuration: request.timeout.duration,
        timeoutAt: request.timestamps.timeout.toISOString(),
      });

      this.logger.log(
        `Persisted timeout state for approval request ${request.id}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to persist timeout state for request ${request.id}: ${errorMsg}`
      );
      // Don't throw - gracefully continue timeout handling
    }
  }

  /**
   * Save approval chain progression
   */
  private async saveChainProgress(
    request: HumanApprovalRequest,
    chainLevel: number,
    approvers: string[],
    chainStatus: string
  ): Promise<void> {
    if (!this.checkpointAdapter || !request.chainId) {
      return; // Gracefully handle when checkpoint adapter is not available or no chain
    }

    try {
      const threadId = this.generateChainThreadId(
        request.chainId,
        request.executionId
      );

      const chainData = {
        id: `${request.chainId}-${chainLevel}`,
        channel_values: {
          chainId: request.chainId,
          level: chainLevel,
          approvers,
          status: chainStatus,
          requestId: request.id,
          executionId: request.executionId,
          nodeId: request.nodeId,
          timestamp: new Date().toISOString(),
        },
      };

      const metadata: BaseCheckpointMetadata = {
        timestamp: new Date().toISOString(),
        source: 'update',
        step: ++this.currentStep,
        parents: {
          chainId: request.chainId,
          executionId: request.executionId,
          requestId: request.id,
          level: chainLevel,
        },
        chainLevel,
        chainStatus,
        approverCount: approvers.length,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        chainData,
        metadata,
        'hitl-chain'
      );

      this.logger.debug(
        `Saved chain progress checkpoint for chain ${request.chainId} level ${chainLevel}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to save chain progress for chain ${request.chainId}: ${errorMsg}`
      );
      // Don't throw - gracefully continue chain processing
    }
  }

  /**
   * Resume approval chain from saved state
   */
  async resumeApprovalChain(
    chainId: string,
    executionId: string,
    checkpointId?: string
  ): Promise<{
    level: number;
    approvers: string[];
    status: string;
  } | null> {
    if (!this.checkpointAdapter) {
      this.logger.warn(
        'Cannot resume approval chain - no checkpoint adapter available'
      );
      return null;
    }

    try {
      const threadId = this.generateChainThreadId(chainId, executionId);

      const checkpoint = await this.checkpointAdapter.loadCheckpoint<{
        chainId: string;
        level: number;
        approvers: string[];
        status: string;
        requestId: string;
        executionId: string;
        nodeId: string;
        timestamp: string;
      }>(threadId, checkpointId, 'hitl-chain');

      if (!checkpoint?.channel_values) {
        this.logger.warn(
          `No chain checkpoint found for chain: ${chainId}/${executionId}`
        );
        return null;
      }

      const chainData = checkpoint.channel_values;

      this.logger.log(
        `Resumed approval chain ${chainId} at level ${chainData.level} with status ${chainData.status}`
      );

      return {
        level: chainData.level,
        approvers: chainData.approvers,
        status: chainData.status,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resume approval chain ${chainId}/${executionId}: ${errorMsg}`
      );
      return null;
    }
  }

  /**
   * Generate canonical thread ID for approval workflow
   */
  private generateApprovalThreadId(
    executionId: string,
    nodeId: string
  ): string {
    return NodeIdBuilder.create()
      .domain('hitl')
      .phase('approval')
      .activity('workflow')
      .detail(`${executionId}-${nodeId}`)
      .build();
  }

  /**
   * Generate canonical thread ID for approval chain
   */
  private generateChainThreadId(chainId: string, executionId: string): string {
    return NodeIdBuilder.create()
      .domain('hitl')
      .phase('approval')
      .activity('chain')
      .detail(`${chainId}-${executionId}`)
      .build();
  }

  /**
   * Get all approval checkpoints for execution
   */
  async getApprovalCheckpoints(
    executionId: string,
    nodeId: string,
    limit?: number
  ): Promise<readonly BaseCheckpointTuple[]> {
    if (!this.checkpointAdapter) {
      return [];
    }

    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);
      return await this.checkpointAdapter.listCheckpoints(
        threadId,
        { limit: limit || 10 },
        'hitl-approval'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get approval checkpoints for ${executionId}/${nodeId}: ${errorMsg}`
      );
      return [];
    }
  }

  // ============================================================================
  // AUTOMAGICAL MEMORY SUPERPOWERS (Human Feedback Learning)
  // ============================================================================

  /**
   * 🧠 AUTOMAGICAL: Learn from human approval feedback
   * Stores approval patterns and feedback for future decision improvement
   */
  private async learnFromHumanFeedback(
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
  private async storeDetailedFeedback(
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

  // Helper methods for feedback analysis
  private assessFeedbackQuality(
    response: HumanApprovalResponse
  ): 'high' | 'medium' | 'low' {
    if (!response.message) return 'low';
    const length = response.message.length;
    if (length > 100) return 'high';
    if (length > 20) return 'medium';
    return 'low';
  }

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

  private calculateFeedbackImportance(
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

  /**
   * Cleanup old approval checkpoints
   */
  async cleanupApprovalCheckpoints(maxAge?: number): Promise<number> {
    if (!this.checkpointAdapter) {
      return 0;
    }

    try {
      return await this.checkpointAdapter.cleanupCheckpoints({
        maxAge: maxAge || HITL_DEFAULTS.FEEDBACK_RETENTION_MS,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup approval checkpoints: ${errorMsg}`);
      return 0;
    }
  }
}
