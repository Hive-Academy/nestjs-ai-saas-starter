import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowState, HumanFeedback } from '../interfaces/workflow.interface';

/**
 * Proposed action for human approval
 */
export interface ProposedAction {
  /**
   * Type of action
   */
  type: 
    | 'code_generation'
    | 'architecture_change'
    | 'file_modification'
    | 'test_execution'
    | 'deployment'
    | 'data_modification'
    | 'api_call'
    | 'custom';

  /**
   * Description of the action
   */
  description: string;

  /**
   * Impact level
   */
  impact: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Additional details
   */
  details?: Record<string, unknown>;

  /**
   * Requires explicit approval
   */
  requiresApproval?: boolean;
}

/**
 * Human approval request
 */
export interface HumanApprovalRequest {
  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Node requesting approval
   */
  nodeId?: string;

  /**
   * Context for approval
   */
  context: {
    /**
     * Current work state
     */
    currentWork?: unknown;

    /**
     * Proposed actions
     */
    proposedActions: ProposedAction[];

    /**
     * Current confidence level
     */
    confidence: number;

    /**
     * Identified risks
     */
    risks?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      mitigation?: string;
    }>;

    /**
     * Additional metadata
     */
    metadata?: Record<string, unknown>;
  };

  /**
   * Request timestamp
   */
  timestamp: Date;

  /**
   * Timeout for approval (ms)
   */
  timeoutMs?: number;

  /**
   * Auto-approve after timeout
   */
  autoApproveOnTimeout?: boolean;
}

/**
 * Human approval response
 */
export interface HumanApprovalResponse {
  /**
   * Decision
   */
  decision: 'approved' | 'rejected' | 'retry' | 'modify';

  /**
   * Feedback message
   */
  feedback?: string;

  /**
   * Modifications to apply
   */
  modifications?: Record<string, unknown>;

  /**
   * Response timestamp
   */
  timestamp: Date;

  /**
   * Approver information
   */
  approver?: {
    id: string;
    name?: string;
    role?: string;
  };
}

/**
 * Human approval node for workflow interruption
 * Implements the LangGraph human-in-the-loop pattern
 */
@Injectable()
export class HumanApprovalNode {
  private readonly logger = new Logger(HumanApprovalNode.name);
  private pendingApprovals = new Map<string, HumanApprovalRequest>();

  constructor(@Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2) {}

  /**
   * Execute human approval checkpoint
   */
  async execute<TState extends WorkflowState = WorkflowState>(
    state: TState,
    options?: {
      extractActions?: (state: TState) => ProposedAction[];
      autoApproveThreshold?: number;
      timeoutMs?: number;
      skipCondition?: (state: TState) => boolean;
    },
  ): Promise<Partial<TState>> {
    const executionId = state.executionId;
    
    // Check skip condition
    if (options?.skipCondition?.(state)) {
      this.logger.debug(`Skipping human approval for ${executionId} - condition met`);
      return {};
    }

    // Check auto-approve threshold
    const confidence = state.confidence || 0;
    const autoApproveThreshold = options?.autoApproveThreshold ?? 0.95;
    
    if (confidence >= autoApproveThreshold) {
      this.logger.log(`Auto-approving ${executionId} - confidence ${confidence} exceeds threshold`);
      return {
        humanFeedback: {
          approved: true,
          status: 'approved',
          approver: {
            id: 'system',
            name: 'Auto-Approval',
            role: 'system',
          },
          message: `Auto-approved with confidence ${confidence}`,
          timestamp: new Date(),
        },
        approvalReceived: true,
      } as unknown as Partial<TState>;
    }

    this.logger.log(`Human approval requested for execution ${executionId}`);

    // Extract proposed actions
    const proposedActions = options?.extractActions
      ? options.extractActions(state)
      : this.extractDefaultActions(state);

    // Create approval request
    const approvalRequest: HumanApprovalRequest = {
      executionId,
      nodeId: state.currentNode,
      context: {
        currentWork: state.metadata,
        proposedActions,
        confidence,
        risks: state.risks,
        metadata: state.metadata,
      },
      timestamp: new Date(),
      timeoutMs: options?.timeoutMs,
      autoApproveOnTimeout: false,
    };

    // Store pending approval
    this.pendingApprovals.set(executionId, approvalRequest);

    // Emit event for external systems
    await this.eventEmitter.emit('workflow.human.approval.requested', approvalRequest);

    this.logger.log(`Approval request details:
      - Execution: ${executionId}
      - Node: ${state.currentNode}
      - Confidence: ${confidence}
      - Actions: ${proposedActions.length}
      - Risks: ${approvalRequest.context.risks?.length || 0}
    `);

    // Return state update to indicate waiting for approval
    return {
      humanFeedback: {
        approved: false,
        status: 'pending',
        timestamp: approvalRequest.timestamp,
        metadata: {
          requestedAt: approvalRequest.timestamp,
          proposedActions: proposedActions.length,
        },
      },
      waitingForApproval: true,
      requiresApproval: true,
    } as unknown as Partial<TState>;
  }

  /**
   * Process human feedback when workflow resumes
   */
  processHumanFeedback<TState extends WorkflowState = WorkflowState>(
    state: TState,
    response: HumanApprovalResponse,
  ): Partial<TState> {
    const executionId = state.executionId;
    
    // Remove from pending approvals
    this.pendingApprovals.delete(executionId);

    // Log the decision
    this.logger.log(`Human decision for ${executionId}: ${response.decision}`);

    // Adjust confidence based on decision
    let newConfidence = state.confidence || 0;
    switch (response.decision) {
      case 'approved':
        newConfidence = Math.min(newConfidence + 0.1, 1.0);
        break;
      case 'rejected':
        newConfidence = Math.max(newConfidence - 0.2, 0.0);
        break;
      case 'modify':
        newConfidence = Math.max(newConfidence - 0.1, 0.0);
        break;
    }

    // Build state update
    const stateUpdate: Partial<TState> = {
      humanFeedback: {
        approved: response.decision === 'approved',
        status: response.decision === 'retry' ? 'pending' : 
                response.decision === 'modify' ? 'needs_revision' :
                response.decision,
        approver: response.approver || { id: 'unknown' },
        message: response.feedback,
        timestamp: response.timestamp,
        metadata: response.modifications,
      } as HumanFeedback,
      confidence: newConfidence,
      waitingForApproval: false,
      approvalReceived: response.decision === 'approved',
      rejectionReason: response.decision === 'rejected' ? response.feedback : undefined,
    } as unknown as Partial<TState>;

    // Add modifications to metadata if provided
    if (response.modifications) {
      (stateUpdate as any).metadata = {
        ...(state.metadata || {}),
        humanModifications: response.modifications,
      };
    }

    // Emit event for tracking
    this.eventEmitter.emit('workflow.human.approval.processed', {
      executionId,
      decision: response.decision,
      timestamp: response.timestamp,
    });

    return stateUpdate;
  }

  /**
   * Extract default proposed actions from state
   */
  private extractDefaultActions<TState extends WorkflowState>(
    state: TState,
  ): ProposedAction[] {
    const actions: ProposedAction[] = [];
    const metadata = state.metadata || {};

    // Check for various action types in metadata
    if (metadata['codeGeneration']) {
      actions.push({
        type: 'code_generation',
        description: 'Generate code files',
        impact: 'medium',
        details: metadata['codeGeneration'],
      });
    }

    if (metadata['fileOperations']) {
      actions.push({
        type: 'file_modification',
        description: 'Modify files',
        impact: 'high',
        details: metadata['fileOperations'],
      });
    }

    if (metadata['apiCalls']) {
      actions.push({
        type: 'api_call',
        description: 'Make external API calls',
        impact: 'medium',
        details: metadata['apiCalls'],
      });
    }

    // Default action if none found
    if (actions.length === 0) {
      actions.push({
        type: 'custom',
        description: 'Continue workflow execution',
        impact: 'low',
      });
    }

    return actions;
  }

  /**
   * Cancel a pending approval
   */
  cancelApproval(executionId: string): boolean {
    if (this.pendingApprovals.has(executionId)) {
      this.pendingApprovals.delete(executionId);
      this.logger.log(`Cancelled approval for ${executionId}`);
      
      this.eventEmitter.emit('workflow.human.approval.cancelled', {
        executionId,
        timestamp: new Date(),
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): HumanApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Check if approval is pending
   */
  isApprovalPending(executionId: string): boolean {
    return this.pendingApprovals.has(executionId);
  }
}