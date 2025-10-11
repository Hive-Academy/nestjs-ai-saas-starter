import { generateId } from '@hive-academy/langgraph-core';
import type { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
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
    private readonly chainStorage: IApprovalChainStorageService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    if (this.memoryAdapter) {
      this.logger.log(
        '🔗 Approval Chain Service initialized with adapter-first storage + IMemoryAdapter.getStore() for hierarchical tracking'
      );
    } else {
      this.logger.log(
        '🔗 Approval Chain Service initialized with adapter-first storage (IMemoryAdapter unavailable - Store tracking disabled)'
      );
    }
  }

  /**
   * Module lifecycle - recover state from persistent storage
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Approval Chain Service initializing with persistent storage'
    );
    await this.recoverActiveRequests();
    this.logger.log('✅ Approval Chain Service initialized');
  }

  /**
   * Recover all active approval requests and chains from storage
   */
  private async recoverActiveRequests(): Promise<void> {
    try {
      // Recover all active approval requests
      const activeRequests = await this.chainStorage.getAllActiveRequests();
      activeRequests.forEach((request) => {
        this.requestCache.set(request.id, request);
      });

      // Recover all approval chains
      const allChains = await this.chainStorage.getAllApprovalChains();
      Object.entries(allChains).forEach(([chainId, levels]) => {
        this.chainCache.set(chainId, levels);
      });

      this.logger.log(
        `✅ Recovered ${activeRequests.length} requests and ${
          Object.keys(allChains).length
        } chains`
      );
    } catch (error) {
      this.logger.error(
        '❌ CRITICAL: Failed to recover approval chains - service will fail fast',
        error
      );
      throw new Error(
        'Cannot initialize ApprovalChainService without persistent storage recovery'
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

    // Track chain initiation in Store (hierarchical namespace)
    await this.trackChainProgressionInStore(request, 0, 'pending');

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

        // Track level completion in Store (hierarchical namespace)
        await this.trackChainProgressionInStore(
          request,
          request.currentLevel - 1,
          'approved'
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

        // Track final level completion in Store
        await this.trackChainProgressionInStore(
          request,
          request.currentLevel,
          'approved'
        );
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

      // Track rejection in Store
      await this.trackChainProgressionInStore(
        request,
        request.currentLevel,
        'rejected'
      );
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
   * Track approval chain progression in Store (IMemoryAdapter.getStore())
   * Uses hierarchical namespaces for multi-level chain tracking
   *
   * Namespace pattern: ['approval-chains', executionId, chainId, 'level', levelIndex]
   */
  private async trackChainProgressionInStore(
    request: ApprovalRequest,
    levelIndex: number,
    decision: 'approved' | 'rejected' | 'pending'
  ): Promise<void> {
    if (!this.memoryAdapter) {
      // Graceful degradation - Store tracking unavailable
      return;
    }

    try {
      const store: Store = this.memoryAdapter.getStore('hitl-approval-chains');
      const currentLevel = request.chain[levelIndex];

      // Store current chain level state with hierarchical namespace
      // Pattern: ['approval-chains', executionId, chainId, 'level', levelIndex.toString()]
      const namespace = [
        'approval-chains',
        request.executionId,
        request.chainId,
        'level',
        levelIndex.toString(),
      ];

      await store.put(namespace, 'state', {
        levelId: currentLevel.id,
        levelName: currentLevel.name,
        priority: currentLevel.priority,
        policy: currentLevel.policy,
        decision,
        timestamp: new Date().toISOString(),
        approvers: currentLevel.approvers.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
        })),
        approvalHistory: request.history.filter(
          (h) => h.levelId === currentLevel.id
        ),
      });

      // Store chain overview for quick queries
      const chainOverviewNamespace = [
        'approval-chains',
        request.executionId,
        request.chainId,
      ];

      await store.put(chainOverviewNamespace, 'overview', {
        requestId: request.id,
        executionId: request.executionId,
        chainId: request.chainId,
        currentLevel: levelIndex,
        totalLevels: request.chain.length,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      });

      this.logger.debug(
        `Tracked chain progression for ${request.chainId} level ${levelIndex} in Store`
      );
    } catch (error) {
      // Log error but don't fail the approval chain
      this.logger.error(
        `Failed to track chain progression in Store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get approval chain history from Store
   * Query all levels for a specific approval chain
   */
  async getChainHistoryFromStore(
    executionId: string,
    chainId: string
  ): Promise<Array<{ level: number; state: any }> | null> {
    if (!this.memoryAdapter) {
      return null;
    }

    try {
      const store: Store = this.memoryAdapter.getStore('hitl-approval-chains');

      // List all levels in the chain
      const chainLevelsNamespace = [
        'approval-chains',
        executionId,
        chainId,
        'level',
      ];

      const levels = await store.list(chainLevelsNamespace);

      return levels.map((levelItem: any) => ({
        level: parseInt(levelItem.key, 10),
        state: levelItem.value,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to retrieve chain history from Store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Search related approval chains via Store namespace search
   * Find similar chains by execution context or chain characteristics
   */
  async searchRelatedChains(
    executionId: string,
    searchQuery: string
  ): Promise<any[]> {
    if (!this.memoryAdapter) {
      return [];
    }

    try {
      const store: Store = this.memoryAdapter.getStore('hitl-approval-chains');

      // Search within execution's approval chains
      const executionChainsNamespace = ['approval-chains', executionId];

      const results = await store.search(executionChainsNamespace, searchQuery);

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to search related chains in Store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }
}
