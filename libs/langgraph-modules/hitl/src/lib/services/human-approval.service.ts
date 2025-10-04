import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowState } from '@hive-academy/langgraph-core';
// Removed unused imports - services delegated to HitlApprovalRequestService
import { ApprovalProcessingService } from './approval-processing.service';
import { ApprovalTimeoutService } from './approval-timeout.service';
import { ApprovalStreamingService } from './approval-streaming.service';
import { UserInterruptionService } from './user-interruption.service';
import { HitlMemoryLearningService } from './hitl-memory-learning.service';
import { HitlCheckpointService } from './hitl-checkpoint.service';
import { HitlValidationService } from './hitl-validation.service';
import { HitlRecoveryService } from './hitl-recovery.service';
import { HitlApprovalRequestService } from './hitl-approval-request.service';
// User interruption interfaces - removed as using direct service access
import { HITL_EVENTS } from '../constants';
import { IHitlStorageService } from '../interfaces/hitl-storage.interface';
import { RequiresApprovalOptions } from '../decorators/approval.decorator';
import {
  ApprovalWorkflowState,
  HumanApprovalRequest,
  HumanApprovalResponse,
  ApprovalWorkflowStats,
} from './approval-workflow.types';

// Re-export moved types for backward compatibility
export { ApprovalWorkflowState } from './approval-workflow.types';
export type {
  HumanApprovalRequest,
  HumanApprovalResponse,
  ApprovalWorkflowStats,
} from './approval-workflow.types';

/**
 * Core Human Approval Service - orchestrates specialized HITL services
 */
@Injectable()
export class HumanApprovalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanApprovalService.name);
  private readonly approvalCache = new Map<string, HumanApprovalRequest>(); // Cache only

  constructor(
    private readonly eventEmitter: EventEmitter2,
    // Note: Chain and confidence services delegated to HitlApprovalRequestService
    private readonly approvalProcessingService: ApprovalProcessingService,
    private readonly approvalTimeoutService: ApprovalTimeoutService,
    private readonly approvalStreamingService: ApprovalStreamingService,
    private readonly userInterruptionService: UserInterruptionService,
    private readonly hitlMemoryLearningService: HitlMemoryLearningService,
    private readonly hitlCheckpointService: HitlCheckpointService,
    private readonly hitlValidationService: HitlValidationService,
    private readonly hitlRecoveryService: HitlRecoveryService,
    private readonly hitlApprovalRequestService: HitlApprovalRequestService,
    @Inject(IHitlStorageService)
    private readonly hitlStorage: IHitlStorageService // Required
  ) {
    this.logger.log(
      '🎯 Human Approval Service initialized with specialized services'
    );
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Human Approval Service initializing with specialized services'
    );
    await this.hitlRecoveryService.recoverPendingApprovals();
    this.setupEventListeners();
    this.logger.log('✅ Human Approval Service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.approvalTimeoutService.clearAllTimeouts();
    this.approvalCache.clear();
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
    return this.hitlApprovalRequestService.createApprovalRequest(
      executionId,
      nodeId,
      message,
      state,
      options,
      this.hitlStorage,
      this.approvalCache,
      (id) => this.handleTimeout(id)
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
    let request = this.approvalCache.get(requestId);
    if (!request) {
      const storageRequest = await this.hitlStorage.get(requestId);
      if (storageRequest) {
        this.approvalCache.set(requestId, storageRequest);
        request = storageRequest;
      }
    }

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
      this.approvalCache
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

    if (result.success && request) {
      await this.hitlCheckpointService.saveApprovalState(
        request,
        'approval_processed',
        {
          decision: response.decision,
          approver: response.approver,
          nextState: result.nextState,
        }
      );
    }

    if (result.success && request) {
      try {
        await this.hitlMemoryLearningService.learnFromHumanFeedback(
          request,
          response
        );
        this.logger.debug(
          `🧠 Learned from human feedback for request ${requestId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to learn from human feedback: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return result;
  }

  /**
   * Handle approval timeout
   */
  private async handleTimeout(requestId: string): Promise<void> {
    let request = this.approvalCache.get(requestId);
    if (!request) {
      const storageRequest = await this.hitlStorage.get(requestId);
      if (storageRequest) {
        this.approvalCache.set(requestId, storageRequest);
        request = storageRequest;
      }
    }

    if (!request) return;

    // Save timeout state via recovery service
    await this.hitlRecoveryService.persistTimeoutState(request);

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
      // Find request in cache first, then check storage
      let request = Array.from(this.approvalCache.values()).find(
        (r) => r.executionId === event.executionId
      );

      if (!request) {
        // If not in cache, check storage by execution ID
        const approvals = await this.hitlStorage.getByExecutionId(
          event.executionId
        );
        request = approvals.find((r) => r.executionId === event.executionId);
        if (request) {
          this.approvalCache.set(request.id, request); // Update cache
        }
      }

      if (request) {
        // Save chain completion checkpoint via checkpoint service
        if (request.chainId) {
          await this.hitlCheckpointService.saveChainProgress(
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
  // SPECIALIZED SERVICES ACCESS
  // ==========================================

  /**
   * Get streaming service for real-time updates
   */
  get streaming() {
    return this.approvalStreamingService;
  }

  /**
   * Get user interruption service for direct access to interruption functionality
   */
  get userInterruptions() {
    return this.userInterruptionService;
  }

  /**
   * Get memory learning service for feedback analysis
   */
  get memoryLearning() {
    return this.hitlMemoryLearningService;
  }

  /**
   * Get checkpoint service for state persistence
   */
  get checkpoints() {
    return this.hitlCheckpointService;
  }

  /**
   * Get validation service for policy enforcement
   */
  get validation() {
    return this.hitlValidationService;
  }

  /**
   * Get recovery service for state restoration
   */
  get recovery() {
    return this.hitlRecoveryService;
  }

  // ==========================================
  // APPROVAL MANAGEMENT METHODS
  // ==========================================

  /**
   * Get approval request by ID
   */
  async getApprovalRequest(
    requestId: string
  ): Promise<HumanApprovalRequest | undefined> {
    // Check cache first
    let request = this.approvalCache.get(requestId);
    if (!request) {
      // Load from storage
      request = (await this.hitlStorage.get(requestId)) || undefined;
      if (request) {
        this.approvalCache.set(requestId, request); // Update cache
      }
    }
    return request;
  }

  /**
   * Get all pending approvals
   */
  async getPendingApprovals(): Promise<HumanApprovalRequest[]> {
    return await this.hitlStorage.getAllPending();
  }

  /**
   * Get approvals for execution
   */
  async getApprovalsForExecution(
    executionId: string
  ): Promise<HumanApprovalRequest[]> {
    return await this.hitlStorage.getByExecutionId(executionId);
  }

  /**
   * Cancel approval request
   */
  async cancelApproval(requestId: string): Promise<boolean> {
    let request = this.approvalCache.get(requestId);
    if (!request) {
      const storageRequest = await this.hitlStorage.get(requestId);
      if (storageRequest) {
        this.approvalCache.set(requestId, storageRequest);
        request = storageRequest;
      }
    }

    if (!request) {
      return false;
    }

    this.approvalTimeoutService.clearTimeout(requestId);
    request.workflowState = ApprovalWorkflowState.CANCELLED;

    // Update in storage
    await this.hitlStorage.update(request);
    // Update cache
    this.approvalCache.set(requestId, request);

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
  async getApprovalStats(): Promise<ApprovalWorkflowStats> {
    // Get all approvals from storage for accurate stats
    const allApprovals = await this.hitlStorage.getAllPending();
    // Note: This should ideally get ALL approvals, not just pending
    // The storage interface may need an getAllApprovals method

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

    for (const request of allApprovals) {
      byState[request.workflowState]++;

      if (request.timestamps.responded) {
        totalResponseTime +=
          request.timestamps.responded.getTime() -
          request.timestamps.requested.getTime();
        responseCount++;
      }
    }

    const total = allApprovals.length;
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
  // CORE WORKFLOW RESUME (HIGH-LEVEL OPERATIONS)
  // ==========================================

  /**
   * Resume approval workflow from saved state with full restoration
   * For other checkpoint operations, use the .checkpoints service directly
   */
  async resumeApprovalWorkflow(
    executionId: string,
    nodeId: string,
    checkpointId?: string
  ): Promise<HumanApprovalRequest | null> {
    const restoredRequest =
      await this.hitlCheckpointService.resumeApprovalWorkflow(
        executionId,
        nodeId,
        checkpointId
      );

    if (restoredRequest) {
      // Add to cache and re-setup timeout if needed
      this.approvalCache.set(restoredRequest.id, restoredRequest);

      if (restoredRequest.workflowState === ApprovalWorkflowState.IN_PROGRESS) {
        const timeElapsed =
          Date.now() - restoredRequest.timestamps.requested.getTime();
        const remainingTimeout = restoredRequest.timeout.duration - timeElapsed;

        if (remainingTimeout > 0) {
          restoredRequest.timeout.duration = remainingTimeout;
          this.approvalTimeoutService.setupTimeout(
            restoredRequest.id,
            restoredRequest,
            (id) => this.handleTimeout(id)
          );
        }
      }
    }

    return restoredRequest;
  }
}
