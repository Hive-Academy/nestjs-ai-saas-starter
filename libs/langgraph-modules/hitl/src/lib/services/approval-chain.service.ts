import { generateId } from '@hive-academy/langgraph-core';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IApprovalChainStorageService } from '../interfaces/approval-chain-storage.interface';

/**
 * Approval level in the chain
 */
export interface ApprovalLevel {
  /**
   * Level ID
   */
  id: string;

  /**
   * Level name
   */
  name: string;

  /**
   * Level priority (lower number = higher priority)
   */
  priority: number;

  /**
   * Approvers at this level
   */
  approvers: Approver[];

  /**
   * Approval policy
   */
  policy: ApprovalPolicy;

  /**
   * Conditions for this level to be required
   */
  conditions?: ApprovalCondition[];

  /**
   * Timeout for approval (ms)
   */
  timeoutMs?: number;

  /**
   * Auto-approve on timeout
   */
  autoApproveOnTimeout?: boolean;
}

/**
 * Approver information
 */
export interface Approver {
  /**
   * Approver ID
   */
  id: string;

  /**
   * Approver name
   */
  name: string;

  /**
   * Approver role
   */
  role?: string;

  /**
   * Email address
   */
  email?: string;

  /**
   * Notification preferences
   */
  notifications?: {
    email?: boolean;
    webhook?: boolean;
    inApp?: boolean;
  };
}

/**
 * Approval policy
 */
export enum ApprovalPolicy {
  /**
   * All approvers must approve
   */
  ALL = 'all',

  /**
   * Any single approver can approve
   */
  ANY = 'any',

  /**
   * Majority must approve
   */
  MAJORITY = 'majority',

  /**
   * Specific number must approve
   */
  THRESHOLD = 'threshold',
}

/**
 * Approval condition
 */
export interface ApprovalCondition {
  /**
   * Condition type
   */
  type: 'confidence' | 'risk' | 'impact' | 'custom';

  /**
   * Operator
   */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

  /**
   * Value to compare
   */
  value: unknown;

  /**
   * Field to evaluate
   */
  field?: string;
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  /**
   * Request ID
   */
  id: string;

  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Chain ID for this request
   */
  chainId: string;

  /**
   * Current approval level (index into chain array)
   */
  currentLevel: number;

  /**
   * All levels in the chain
   */
  chain: ApprovalLevel[];

  /**
   * Request context
   */
  context: Record<string, unknown>;

  /**
   * Approval history
   */
  history: ApprovalHistoryEntry[];

  /**
   * Current status
   */
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';

  /**
   * Created timestamp
   */
  createdAt: Date;

  /**
   * Updated timestamp
   */
  updatedAt: Date;
}

/**
 * Approval history entry
 */
export interface ApprovalHistoryEntry {
  /**
   * Level ID
   */
  levelId: string;

  /**
   * Approver
   */
  approver: Approver;

  /**
   * Decision
   */
  decision: 'approved' | 'rejected' | 'escalated';

  /**
   * Comments
   */
  comments?: string;

  /**
   * Timestamp
   */
  timestamp: Date;
}

/**
 * Service for managing approval chains with persistent storage
 */
@Injectable()
export class ApprovalChainService implements OnModuleInit {
  private readonly logger = new Logger(ApprovalChainService.name);

  // Cache-only storage for performance (NOT primary storage)
  private readonly requestCache = new Map<string, ApprovalRequest>();
  private readonly chainCache = new Map<string, ApprovalLevel[]>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('IApprovalChainStorageService')
    private readonly chainStorage: IApprovalChainStorageService
  ) {
    this.logger.log(
      '🔗 Approval Chain Service initialized with adapter-first storage'
    );
  }

  /**
   * Module lifecycle - Service ready for lazy-loading
   *
   * PHASE 1 CHANGE: Removed automatic recovery from onModuleInit()
   * - Old behavior: Queried ChromaDB for ALL approval chains at startup
   * - New behavior: Chains loaded lazily when workflows need them
   * - Impact: Zero startup queries, instant application start
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(
      '✅ ApprovalChainService initialized (lazy-loading enabled - chains load on-demand)'
    );
  }

  /**
   * Resume approval chain for specific execution (lazy-loading)
   *
   * PHASE 1 NEW METHOD: Replaces automatic recovery
   * Call this when workflows resume with pending approvals
   *
   * @param executionId - Workflow execution ID to resume
   * @returns Chain ID if found, null otherwise
   */
  async resumeChainForExecution(executionId: string): Promise<string | null> {
    try {
      // Load only requests for this specific execution
      const executionRequests =
        await this.chainStorage.getActiveRequestsByExecution(executionId);

      if (executionRequests.length === 0) {
        this.logger.debug(
          `No active approval requests found for execution ${executionId}`
        );
        return null;
      }

      // Rebuild cache for this execution's requests
      executionRequests.forEach((request: ApprovalRequest) => {
        this.requestCache.set(request.id, request);
      });

      // Load the chain for the first request (all requests in execution use same chain)
      const chainId = executionRequests[0].chainId;
      if (chainId && !this.chainCache.has(chainId)) {
        const chainLevels = await this.chainStorage.getApprovalChain(chainId);
        if (chainLevels) {
          this.chainCache.set(chainId, chainLevels);
        }
      }

      this.logger.log(
        `✅ Resumed approval chain for execution ${executionId}: ${executionRequests.length} requests, chain ${chainId}`
      );

      return chainId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resume approval chain for execution ${executionId}: ${errorMsg}`
      );
      throw new Error(
        `Cannot resume approval chain for execution ${executionId}: ${errorMsg}`
      );
    }
  }

  /**
   * Create an approval chain with persistent storage
   */
  async createApprovalChain(
    chainId: string,
    levels: ApprovalLevel[]
  ): Promise<void> {
    // Sort levels by priority
    const sortedLevels = [...levels].sort((a, b) => a.priority - b.priority);

    // ✅ CORRECT: Store in adapter first
    await this.chainStorage.storeApprovalChain(chainId, sortedLevels);

    // ✅ CORRECT: Cache for performance
    this.chainCache.set(chainId, sortedLevels);

    this.logger.log(
      `Created approval chain ${chainId} with ${sortedLevels.length} levels`
    );
  }

  /**
   * Initiate an approval request with persistent storage
   */
  async initiateApproval(
    executionId: string,
    chainId: string,
    context: Record<string, unknown>
  ): Promise<ApprovalRequest> {
    // ✅ CORRECT: Load from cache first, then storage
    let chain = this.chainCache.get(chainId);
    if (!chain) {
      chain = (await this.chainStorage.getApprovalChain(chainId)) || undefined;
      if (chain) {
        this.chainCache.set(chainId, chain); // Update cache
      }
    }

    if (!chain || chain.length === 0) {
      throw new Error(`Approval chain ${chainId} not found`);
    }

    // Determine which levels are required based on conditions
    const requiredLevels = this.filterRequiredLevels(chain, context);

    if (requiredLevels.length === 0) {
      this.logger.log(
        `No approval levels required for execution ${executionId}`
      );
      return this.createAutoApprovedRequest(
        executionId,
        chainId,
        chain,
        context
      );
    }

    const requestId = generateId('approval');
    const request: ApprovalRequest = {
      id: requestId,
      executionId,
      chainId,
      currentLevel: 0, // Start at first level (index 0)
      chain: requiredLevels,
      context,
      history: [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ✅ CORRECT: Store in adapter first
    await this.chainStorage.storeApprovalRequest(request);

    // ✅ CORRECT: Cache for performance
    this.requestCache.set(requestId, request);

    // Emit event for first level
    await this.notifyApprovers(request, requiredLevels[0]);

    this.logger.log(
      `Initiated approval request ${requestId} for execution ${executionId}`
    );

    return request;
  }

  /**
   * Process an approval decision with persistent storage
   */
  async processApproval(
    requestId: string,
    approver: Approver,
    decision: 'approved' | 'rejected' | 'escalated',
    comments?: string
  ): Promise<ApprovalRequest> {
    // ✅ CORRECT: Load from cache first, then storage
    let request = this.requestCache.get(requestId);
    if (!request) {
      request =
        (await this.chainStorage.getApprovalRequest(requestId)) || undefined;
      if (request) {
        this.requestCache.set(requestId, request); // Update cache
      }
    }

    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending`);
    }

    const currentLevel = request.chain[request.currentLevel];
    if (!currentLevel) {
      throw new Error(
        `Invalid approval level ${request.currentLevel} for request ${requestId}`
      );
    }

    // Add to history
    const historyEntry: ApprovalHistoryEntry = {
      levelId: currentLevel.id,
      approver,
      decision,
      comments,
      timestamp: new Date(),
    };
    request.history.push(historyEntry);

    // Check if level approval is complete
    const levelDecision = this.evaluateLevelDecision(
      currentLevel,
      request.history.filter((h) => h.levelId === currentLevel.id)
    );

    if (levelDecision === 'approved') {
      // Move to next level or complete
      if (request.currentLevel < request.chain.length - 1) {
        // Move to next level
        request.currentLevel += 1;
        request.status = 'pending';
        const nextLevel = request.chain[request.currentLevel];
        await this.notifyApprovers(request, nextLevel);

        this.logger.log(
          `Approval request ${requestId} escalated to level ${nextLevel.name}`
        );
      } else {
        // All levels approved
        request.status = 'approved';
        await this.eventEmitter.emit('approval.completed', {
          requestId,
          executionId: request.executionId,
          status: 'approved',
        });

        this.logger.log(`Approval request ${requestId} fully approved`);
      }
    } else if (levelDecision === 'rejected') {
      request.status = 'rejected';
      await this.eventEmitter.emit('approval.completed', {
        requestId,
        executionId: request.executionId,
        status: 'rejected',
        reason: comments,
      });

      this.logger.log(`Approval request ${requestId} rejected`);
    }

    request.updatedAt = new Date();

    // ✅ CORRECT: Update storage first, then cache
    await this.chainStorage.updateApprovalRequest(request);
    this.requestCache.set(requestId, request);

    return request;
  }

  /**
   * Filter levels based on conditions
   */
  private filterRequiredLevels(
    chain: ApprovalLevel[],
    context: Record<string, unknown>
  ): ApprovalLevel[] {
    return chain.filter((level) => {
      if (!level.conditions || level.conditions.length === 0) {
        return true; // No conditions, level is always required
      }

      return level.conditions.every((condition) =>
        this.evaluateCondition(condition, context)
      );
    });
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: ApprovalCondition,
    context: Record<string, unknown>
  ): boolean {
    const value = condition.field ? context[condition.field] : context;

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'gte':
        return Number(value) >= Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'lte':
        return Number(value) <= Number(condition.value);
      case 'in':
        return (
          Array.isArray(condition.value) && condition.value.includes(value)
        );
      case 'contains':
        return String(value).includes(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Evaluate level decision based on policy
   */
  private evaluateLevelDecision(
    level: ApprovalLevel,
    levelHistory: ApprovalHistoryEntry[]
  ): 'pending' | 'approved' | 'rejected' {
    const approvals = levelHistory.filter(
      (h) => h.decision === 'approved'
    ).length;
    const rejections = levelHistory.filter(
      (h) => h.decision === 'rejected'
    ).length;
    const total = level.approvers.length;

    switch (level.policy) {
      case ApprovalPolicy.ALL:
        if (rejections > 0) {
          return 'rejected';
        }
        if (approvals === total) {
          return 'approved';
        }
        return 'pending';

      case ApprovalPolicy.ANY:
        if (approvals > 0) {
          return 'approved';
        }
        if (rejections === total) {
          return 'rejected';
        }
        return 'pending';

      case ApprovalPolicy.MAJORITY: {
        const majority = Math.floor(total / 2) + 1;
        if (approvals >= majority) {
          return 'approved';
        }
        if (rejections >= majority) {
          return 'rejected';
        }
        return 'pending';
      }

      case ApprovalPolicy.THRESHOLD: {
        // Default threshold to 1 if not specified
        const threshold = 1;
        if (approvals >= threshold) {
          return 'approved';
        }
        if (rejections > total - threshold) {
          return 'rejected';
        }
        return 'pending';
      }

      default:
        return 'pending';
    }
  }

  /**
   * Notify approvers for a level
   */
  private async notifyApprovers(
    request: ApprovalRequest,
    level: ApprovalLevel
  ): Promise<void> {
    await this.eventEmitter.emit('approval.requested', {
      requestId: request.id,
      executionId: request.executionId,
      level: level.name,
      approvers: level.approvers,
      context: request.context,
    });

    // Set timeout if configured
    if (level.timeoutMs) {
      setTimeout(() => {
        this.handleApprovalTimeout(request.id, level);
      }, level.timeoutMs);
    }
  }

  /**
   * Handle approval timeout with adapter-first pattern
   */
  private async handleApprovalTimeout(
    requestId: string,
    level: ApprovalLevel
  ): Promise<void> {
    // ✅ CORRECT: Load from cache first, then storage
    let request = this.requestCache.get(requestId);
    if (!request) {
      request =
        (await this.chainStorage.getApprovalRequest(requestId)) || undefined;
      if (request) {
        this.requestCache.set(requestId, request); // Update cache
      }
    }

    if (
      !request ||
      request.status !== 'pending' ||
      request.chain[request.currentLevel]?.id !== level.id
    ) {
      return; // Request already processed or moved to different level
    }

    if (level.autoApproveOnTimeout) {
      await this.processApproval(
        requestId,
        { id: 'system', name: 'Auto-Approval', role: 'system' },
        'approved',
        'Auto-approved due to timeout'
      );
    } else {
      request.status = 'timeout';
      request.updatedAt = new Date();

      // ✅ CORRECT: Update storage first, then cache
      await this.chainStorage.updateApprovalRequest(request);
      this.requestCache.set(requestId, request);

      await this.eventEmitter.emit('approval.timeout', {
        requestId,
        executionId: request.executionId,
        level: level.name,
      });
    }
  }

  /**
   * Create auto-approved request with persistent storage
   */
  private async createAutoApprovedRequest(
    executionId: string,
    chainId: string,
    chain: ApprovalLevel[],
    context: Record<string, unknown>
  ): Promise<ApprovalRequest> {
    const requestId = generateId('approval');
    const request: ApprovalRequest = {
      id: requestId,
      executionId,
      chainId,
      currentLevel: 0, // Index-based
      chain,
      context,
      history: [
        {
          levelId: 'auto',
          approver: { id: 'system', name: 'Auto-Approval', role: 'system' },
          decision: 'approved',
          comments: 'No approval required based on conditions',
          timestamp: new Date(),
        },
      ],
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ✅ CORRECT: Store in adapter first
    await this.chainStorage.storeApprovalRequest(request);

    // ✅ CORRECT: Cache for performance
    this.requestCache.set(requestId, request);

    return request;
  }

  /**
   * Get approval request with adapter-first pattern
   */
  async getApprovalRequest(
    requestId: string
  ): Promise<ApprovalRequest | undefined> {
    // ✅ CORRECT: Check cache first, then storage
    let request = this.requestCache.get(requestId);
    if (!request) {
      request =
        (await this.chainStorage.getApprovalRequest(requestId)) || undefined;
      if (request) {
        this.requestCache.set(requestId, request); // Update cache
      }
    }
    return request;
  }

  /**
   * Get pending approvals for approver with adapter-first pattern
   */
  async getPendingApprovalsForApprover(
    approverId: string
  ): Promise<ApprovalRequest[]> {
    // ✅ CORRECT: Use storage adapter for comprehensive search
    return await this.chainStorage.getPendingApprovalsForApprover(approverId);
  }

  /**
   * Check if a user is a member of an approval chain
   */
  async isUserInChain(chainId: string, userId: string): Promise<boolean> {
    let chain = this.chainCache.get(chainId);
    if (!chain) {
      chain = (await this.chainStorage.getApprovalChain(chainId)) || undefined;
      if (chain) {
        this.chainCache.set(chainId, chain);
      }
    }

    if (!chain) {
      return false;
    }

    return chain.some((level) =>
      level.approvers.some((approver) => approver.id === userId)
    );
  }
}
