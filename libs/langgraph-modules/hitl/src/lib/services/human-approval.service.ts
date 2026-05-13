import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { HitlCapableState } from '../interfaces/hitl-state.interface';
import {
  WorkflowResumptionService,
  UserContext,
} from '@hive-academy/langgraph-workflow-engine';
// Removed unused imports - services delegated to HitlApprovalRequestService
import { ApprovalProcessingService } from './approval-processing.service';
import { ApprovalTimeoutService } from './approval-timeout.service';
import { ApprovalStreamingService } from './approval-streaming.service';
import { UserInterruptionService } from './user-interruption.service';
import { HitlValidationService } from './hitl-validation.service';
import { HitlApprovalRequestService } from './hitl-approval-request.service';
import { ApprovalChainService } from './approval-chain.service';
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
 *
 * **TASK_2025_040 Phase 2** (Migration to LangGraph Native Recovery):
 * - Removed HitlRecoveryService dependency (uses LangGraph checkpointer for recovery)
 * - Approval state managed via LangGraph native checkpoints
 * - Timeout state tracked in checkpoint metadata, not recovery service
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
    private readonly hitlValidationService: HitlValidationService,
    private readonly hitlApprovalRequestService: HitlApprovalRequestService,
    private readonly approvalChainService: ApprovalChainService,
    @Inject(IHitlStorageService)
    private readonly hitlStorage: IHitlStorageService, // Required

    // NEW: WorkflowResumptionService for workflow resumption (TASK_2025_049)
    @Optional()
    private readonly resumptionService?: WorkflowResumptionService
  ) {
    this.logger.log(
      '🎯 Human Approval Service initialized with specialized services'
    );

    if (!this.resumptionService) {
      this.logger.warn(
        'WorkflowResumptionService not available - HITL workflow resumption disabled'
      );
    }
  }

  /**
   * Module initialization: Service ready for lazy-loading
   *
   * PHASE 1 CHANGE: Removed automatic recovery from onModuleInit()
   * - Old behavior: Called hitlRecoveryService.recoverPendingApprovals() causing ChromaDB queries at startup
   * - New behavior: Recovery only happens when workflows explicitly resume
   * - Impact: Zero startup queries, instant application start
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Human Approval Service initializing with specialized services'
    );
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
   *
   * ARCHITECTURE CHANGE (TASK_2025_049):
   * - Added workflowClass parameter for multi-workflow support
   * - Stores workflowClass in approval metadata for resumption
   *
   * @param executionId - Workflow execution thread ID
   * @param nodeId - Node requesting approval
   * @param message - Approval message for user
   * @param state - Current workflow state
   * @param options - Approval options (timeout, confidence threshold, etc.)
   * @param workflowClass - Workflow class name for resumption (e.g., 'ResearcherAgent')
   */
  async requestApproval(
    executionId: string,
    nodeId: string,
    message: string,
    state: HitlCapableState,
    options: RequiresApprovalOptions = {},
    workflowClass?: string // NEW parameter (optional for backward compatibility)
  ): Promise<HumanApprovalRequest> {
    // Enhance options with workflowClass metadata
    const enhancedOptions: RequiresApprovalOptions = {
      ...options,
      // metadata must be a function that returns the metadata object
      metadata: (state: HitlCapableState) => {
        const baseMetadata =
          typeof options.metadata === 'function' ? options.metadata(state) : {};
        return {
          ...baseMetadata,
          workflowClass, // Store for resumption in processApprovalResponse
        };
      },
    };

    return this.hitlApprovalRequestService.createApprovalRequest(
      executionId,
      nodeId,
      message,
      state,
      enhancedOptions,
      this.hitlStorage,
      this.approvalCache,
      (id) => this.handleTimeout(id)
    );
  }

  /**
   * Process human approval response and resume workflow using Command pattern
   *
   * ARCHITECTURE CHANGE (TASK_2025_049):
   * - Added workflow resumption via WorkflowResumptionService.resumeWorkflow()
   * - Extracts workflowClass from approval metadata
   * - Gets checkpoint_id from StateSnapshot for precise resumption
   * - Gracefully degrades if WorkflowResumptionService unavailable
   *
   * @param requestId - Approval request identifier
   * @param response - User's approval decision
   * @param approverContext - Context of the user approving the request (for auth validation)
   * @returns Approval result + workflow resumption status
   *
   * Evidence: task-description.md:410-461 (Command Class Integration with HITL)
   */
  async processApprovalResponse(
    requestId: string,
    response: HumanApprovalResponse,
    approverContext?: UserContext
  ): Promise<{
    success: boolean;
    nextState?: Partial<HitlCapableState>;
    error?: string;
    workflowResumed?: boolean; // NEW
  }> {
    // Step 1: Retrieve approval request (same as before)
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

    // Step 1.5: Validate Approver Authorization
    if (request.options.approverAuth) {
      if (!approverContext) {
        throw new UnauthorizedException(
          'Approval requires authenticated user context'
        );
      }

      const { roles, permissions, tiers, requireChainMembership } =
        request.options.approverAuth;

      // Validate Roles
      if (roles && roles.length > 0) {
        const hasRole = roles.some((role) =>
          approverContext.roles.includes(role)
        );
        if (!hasRole) {
          throw new UnauthorizedException(
            `User does not have required roles: ${roles.join(', ')}`
          );
        }
      }

      // Validate Permissions
      if (permissions && permissions.length > 0) {
        const hasPermission = permissions.some((perm) =>
          approverContext.permissions?.includes(perm)
        );
        if (!hasPermission) {
          throw new UnauthorizedException(
            `User does not have required permissions: ${permissions.join(', ')}`
          );
        }
      }

      // Validate Tiers
      if (tiers && tiers.length > 0) {
        if (!tiers.includes(approverContext.tier)) {
          throw new UnauthorizedException(
            `User tier '${
              approverContext.tier
            }' not allowed. Required: ${tiers.join(', ')}`
          );
        }
      }

      // Validate Chain Membership
      if (requireChainMembership && request.chainId) {
        const isMember = await this.approvalChainService.isUserInChain(
          request.chainId,
          approverContext.userId
        );
        if (!isMember) {
          throw new UnauthorizedException(
            'User is not a member of the required approval chain'
          );
        }
      }
    }

    // Step 2: Clear timeout (same as before)
    this.approvalTimeoutService.clearTimeout(requestId);

    // Step 3: Process through the processing service (same as before)
    const result = await this.approvalProcessingService.processApprovalResponse(
      requestId,
      response,
      this.approvalCache
    );

    // Step 4: Stream real-time update (same as before)
    if (
      this.approvalStreamingService.hasStreamConnection(request.executionId)
    ) {
      await this.approvalStreamingService.streamApprovalUpdate(
        request,
        response
      );
    }

    // Step 5: Resume workflow using Command pattern (NEW)
    let workflowResumed = false;
    if (this.resumptionService) {
      try {
        // Extract workflowClass from approval metadata
        const workflowClassName = request.metadata?.workflowClass as
          | string
          | undefined;
        if (!workflowClassName) {
          this.logger.warn(
            `Approval ${requestId} missing workflowClass metadata - cannot resume workflow`
          );
        } else {
          // Resolve workflow class from name
          const workflowClass = this.resolveWorkflowClass(workflowClassName);

          // Get current StateSnapshot to extract checkpoint_id
          const snapshot = await this.resumptionService.getWorkflowState(
            workflowClass,
            request.executionId
          );

          const checkpointId = snapshot.config.configurable?.checkpoint_id as
            | string
            | undefined;
          if (!checkpointId) {
            this.logger.warn(
              `No checkpoint_id found for thread ${request.executionId} - cannot resume`
            );
          } else {
            // Resume workflow with user's approval decision
            await this.resumptionService.resumeWorkflow(
              workflowClass,
              request.executionId,
              {
                approved: response.decision === 'approved',
                feedback: response.message,
                approvedBy: response.approver?.id,
                approvedAt: response.timestamp,
              },
              checkpointId
            );

            workflowResumed = true;
            this.logger.log(
              `✅ Workflow resumed for thread ${request.executionId} after approval ${requestId}`
            );
          }
        }
      } catch (error: any) {
        this.logger.error(
          `❌ Failed to resume workflow for thread ${request.executionId}:`,
          error.message
        );
        // Don't fail approval processing if resumption fails - graceful degradation
      }
    }

    // NOTE: State persistence handled by LangGraph checkpointer
    // No manual checkpoint saving needed

    return { ...result, workflowResumed };
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

    // NOTE: Timeout state tracked via LangGraph checkpointer metadata
    // No manual recovery persistence needed

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
        // NOTE: Chain progress tracked via Neo4j adapter storage
        // LangGraph checkpointer handles workflow state persistence

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
   * Get validation service for policy enforcement
   */
  get validation() {
    return this.hitlValidationService;
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
      byState[request.workflowState as ApprovalWorkflowState]++;

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
    // NOTE: LangGraph handles workflow state restoration via checkpointer
    // Approval workflows should be resumed via LangGraph API, not manually
    this.logger.warn(
      'resumeApprovalWorkflow() is deprecated - use LangGraph workflow resumption instead'
    );
    return null;
  }

  /**
   * Resolve workflow class from class name string
   *
   * INTERNAL HELPER: Convert string name to actual class reference
   *
   * Implementation options:
   * 1. Static registry: Map<string, Type> maintained by WorkflowEngineModule
   * 2. ModuleRef.get() if class name matches NestJS provider token
   * 3. Metadata-based lookup via MetadataProcessorService
   *
   * @param workflowClassName - Class name (e.g., 'ResearcherAgent')
   * @returns Workflow class reference
   * @throws Error if class not found
   */
  private resolveWorkflowClass(workflowClassName: string): any {
    // IMPLEMENTATION NOTE: This is a placeholder
    // Team-leader will implement in atomic task with chosen strategy
    // Recommended: Static registry in WorkflowEngineModule for performance

    throw new Error(
      `Workflow class resolution not implemented: ${workflowClassName}`
    );
  }
}
