import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
   * Current approval level
   */
  currentLevel: ApprovalLevel;

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
 * Service for managing approval chains
 */
@Injectable()
export class ApprovalChainService {
  private readonly logger = new Logger(ApprovalChainService.name);
  private approvalRequests = new Map<string, ApprovalRequest>();
  private approvalChains = new Map<string, ApprovalLevel[]>();

  constructor(@Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2) {}

  /**
   * Create an approval chain
   */
  createApprovalChain(
    chainId: string,
    levels: ApprovalLevel[],
  ): void {
    // Sort levels by priority
    const sortedLevels = [...levels].sort((a, b) => a.priority - b.priority);
    
    this.approvalChains.set(chainId, sortedLevels);
    this.logger.log(`Created approval chain ${chainId} with ${sortedLevels.length} levels`);
  }

  /**
   * Initiate an approval request
   */
  async initiateApproval(
    executionId: string,
    chainId: string,
    context: Record<string, unknown>,
  ): Promise<ApprovalRequest> {
    const chain = this.approvalChains.get(chainId);
    
    if (!chain || chain.length === 0) {
      throw new Error(`Approval chain ${chainId} not found`);
    }

    // Determine which levels are required based on conditions
    const requiredLevels = this.filterRequiredLevels(chain, context);
    
    if (requiredLevels.length === 0) {
      this.logger.log(`No approval levels required for execution ${executionId}`);
      return this.createAutoApprovedRequest(executionId, chain, context);
    }

    const requestId = this.generateRequestId();
    const request: ApprovalRequest = {
      id: requestId,
      executionId,
      currentLevel: requiredLevels[0],
      chain: requiredLevels,
      context,
      history: [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.approvalRequests.set(requestId, request);

    // Emit event for first level
    await this.notifyApprovers(request, requiredLevels[0]);

    this.logger.log(`Initiated approval request ${requestId} for execution ${executionId}`);
    
    return request;
  }

  /**
   * Process an approval decision
   */
  async processApproval(
    requestId: string,
    approver: Approver,
    decision: 'approved' | 'rejected' | 'escalated',
    comments?: string,
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending`);
    }

    // Add to history
    const historyEntry: ApprovalHistoryEntry = {
      levelId: request.currentLevel.id,
      approver,
      decision,
      comments,
      timestamp: new Date(),
    };
    request.history.push(historyEntry);

    // Check if level approval is complete
    const levelDecision = this.evaluateLevelDecision(
      request.currentLevel,
      request.history.filter(h => h.levelId === request.currentLevel.id),
    );

    if (levelDecision === 'approved') {
      // Move to next level or complete
      const currentIndex = request.chain.indexOf(request.currentLevel);
      
      if (currentIndex < request.chain.length - 1) {
        // Move to next level
        request.currentLevel = request.chain[currentIndex + 1];
        request.status = 'pending';
        await this.notifyApprovers(request, request.currentLevel);
        
        this.logger.log(`Approval request ${requestId} escalated to level ${request.currentLevel.name}`);
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
    return request;
  }

  /**
   * Filter levels based on conditions
   */
  private filterRequiredLevels(
    chain: ApprovalLevel[],
    context: Record<string, unknown>,
  ): ApprovalLevel[] {
    return chain.filter(level => {
      if (!level.conditions || level.conditions.length === 0) {
        return true; // No conditions, level is always required
      }

      return level.conditions.every(condition => 
        this.evaluateCondition(condition, context)
      );
    });
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: ApprovalCondition,
    context: Record<string, unknown>,
  ): boolean {
    const value = condition.field 
      ? context[condition.field]
      : context;

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
        return Array.isArray(condition.value) && condition.value.includes(value);
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
    levelHistory: ApprovalHistoryEntry[],
  ): 'pending' | 'approved' | 'rejected' {
    const approvals = levelHistory.filter(h => h.decision === 'approved').length;
    const rejections = levelHistory.filter(h => h.decision === 'rejected').length;
    const total = level.approvers.length;

    switch (level.policy) {
      case ApprovalPolicy.ALL:
        if (rejections > 0) return 'rejected';
        if (approvals === total) return 'approved';
        return 'pending';

      case ApprovalPolicy.ANY:
        if (approvals > 0) return 'approved';
        if (rejections === total) return 'rejected';
        return 'pending';

      case ApprovalPolicy.MAJORITY: {
        const majority = Math.floor(total / 2) + 1;
        if (approvals >= majority) return 'approved';
        if (rejections >= majority) return 'rejected';
        return 'pending';
      }

      case ApprovalPolicy.THRESHOLD: {
        // Default threshold to 1 if not specified
        const threshold = 1;
        if (approvals >= threshold) return 'approved';
        if (rejections > total - threshold) return 'rejected';
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
    level: ApprovalLevel,
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
   * Handle approval timeout
   */
  private async handleApprovalTimeout(
    requestId: string,
    level: ApprovalLevel,
  ): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    
    if (!request || request.status !== 'pending' || request.currentLevel.id !== level.id) {
      return; // Request already processed or moved to different level
    }

    if (level.autoApproveOnTimeout) {
      await this.processApproval(
        requestId,
        { id: 'system', name: 'Auto-Approval', role: 'system' },
        'approved',
        'Auto-approved due to timeout',
      );
    } else {
      request.status = 'timeout';
      await this.eventEmitter.emit('approval.timeout', {
        requestId,
        executionId: request.executionId,
        level: level.name,
      });
    }
  }

  /**
   * Create auto-approved request
   */
  private createAutoApprovedRequest(
    executionId: string,
    chain: ApprovalLevel[],
    context: Record<string, unknown>,
  ): ApprovalRequest {
    const requestId = this.generateRequestId();
    return {
      id: requestId,
      executionId,
      currentLevel: chain[0],
      chain,
      context,
      history: [{
        levelId: 'auto',
        approver: { id: 'system', name: 'Auto-Approval', role: 'system' },
        decision: 'approved',
        comments: 'No approval required based on conditions',
        timestamp: new Date(),
      }],
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get approval request
   */
  getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  /**
   * Get pending approvals for approver
   */
  getPendingApprovalsForApprover(approverId: string): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      request => 
        request.status === 'pending' &&
        request.currentLevel.approvers.some(a => a.id === approverId)
    );
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}