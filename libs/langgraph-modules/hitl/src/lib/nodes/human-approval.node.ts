import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RunnableConfig } from '@langchain/core/runnables';
import { interrupt } from '@langchain/langgraph';
import { RunnableConfigStoreHelpers } from '@hive-academy/langgraph-memory';
import type { HitlCapableState } from '../interfaces/hitl-state.interface';

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
  private readonly pendingApprovals = new Map<string, HumanApprovalRequest>();

  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Execute human approval checkpoint
   * @param state - Current workflow state
   * @param config - RunnableConfig containing checkpointer, store, and thread configuration
   * @param options - Optional execution options (extractActions, autoApproveThreshold, etc.)
   */
  async execute(
    state: HitlCapableState,
    config: RunnableConfig,
    options?: {
      extractActions?: (state: HitlCapableState) => ProposedAction[];
      autoApproveThreshold?: number;
      timeoutMs?: number;
      skipCondition?: (state: HitlCapableState) => boolean;
    }
  ): Promise<Partial<HitlCapableState>> {
    const executionId = state.executionId ?? 'unknown';

    // Validate checkpointer configuration (required for interrupt())
    const checkpointer = config.configurable?.checkpointer;
    if (!checkpointer) {
      this.logger.error(
        `Checkpointer not configured in RunnableConfig for execution ${executionId}`
      );
      throw new Error(
        'Checkpointer not configured. Human approval requires checkpointer for state persistence.'
      );
    }

    // Access BaseStore for cross-workflow memory (optional enhancement) - using type-safe helper
    const store = RunnableConfigStoreHelpers.getStore(config);
    if (store) {
      this.logger.debug(
        `BaseStore available for approval context storage in execution ${executionId}`
      );
    }

    // Check skip condition
    if (options?.skipCondition?.(state)) {
      this.logger.debug(
        `Skipping human approval for ${executionId} - condition met`
      );
      return {};
    }

    // Check auto-approve threshold
    const confidence = state.confidence ?? 0;
    const autoApproveThreshold = options?.autoApproveThreshold ?? 0.95;

    if (confidence >= autoApproveThreshold) {
      this.logger.log(
        `Auto-approving ${executionId} - confidence ${confidence} exceeds threshold`
      );
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
      };
    }

    this.logger.log(`Human approval requested for execution ${executionId}`);

    // Retrieve historical approval patterns from BaseStore (if available)
    let historicalApprovals: unknown[] = [];
    if (store) {
      try {
        const userId = state.userId || 'system';
        const items = await store.search(['approval-context', userId]);
        historicalApprovals = items.slice(0, 5); // Get top 5 similar approvals
        this.logger.debug(
          `Retrieved ${historicalApprovals.length} historical approvals from BaseStore`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to retrieve historical approvals from BaseStore: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

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
        metadata: {
          ...(state.metadata || {}),
          historicalApprovals:
            historicalApprovals.length > 0
              ? historicalApprovals.map((item) => {
                  const val = (item as Record<string, unknown>)?.value as
                    | Record<string, unknown>
                    | undefined;
                  return {
                    executionId: val?.executionId,
                    confidence: val?.confidence,
                    timestamp: val?.timestamp,
                  };
                })
              : undefined,
        },
      },
      timestamp: new Date(),
      timeoutMs: options?.timeoutMs,
      autoApproveOnTimeout: false,
    };

    // Store pending approval
    this.pendingApprovals.set(executionId, approvalRequest);

    // Store approval context in BaseStore for cross-workflow memory (if available)
    if (store) {
      try {
        const userId = state.userId || 'system';
        await store.put(
          ['approval-context', userId],
          `approval-${executionId}`,
          {
            executionId,
            nodeId: state.currentNode,
            proposedActions,
            confidence,
            risks: approvalRequest.context.risks,
            timestamp: approvalRequest.timestamp,
          }
        );
        this.logger.debug(
          `Stored approval context in BaseStore for user ${userId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store approval context in BaseStore: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Emit event for external systems
    await this.eventEmitter.emit(
      'workflow.human.approval.requested',
      approvalRequest
    );

    this.logger.log(`Approval request details:
      - Execution: ${executionId}
      - Node: ${state.currentNode}
      - Confidence: ${confidence}
      - Actions: ${proposedActions.length}
      - Risks: ${approvalRequest.context.risks?.length || 0}
    `);

    // Use LangGraph native interrupt() to pause workflow execution
    // Workflow will pause here until resumed via Command
    // Checkpointer automatically saves state at this interrupt point
    const humanDecision = interrupt({
      type: 'approval_required',
      executionId,
      nodeId: state.currentNode,
      approvalRequest,
      confidence,
      proposedActions,
      risks: approvalRequest.context.risks,
    });

    // When workflow resumes via Command, execution continues here
    // humanDecision contains the approval response data
    this.logger.log(
      `Approval received for ${executionId}: ${JSON.stringify(humanDecision)}`
    );

    // Process human decision and return state update
    const approved = humanDecision?.decision === 'approved';
    const feedback = humanDecision?.feedback;

    return {
      humanFeedback: {
        approved,
        status: approved ? 'approved' : 'rejected',
        approver: humanDecision?.approver || { id: 'unknown' },
        message: feedback,
        timestamp: new Date(),
        metadata: humanDecision?.modifications,
      },
      confidence: approved
        ? Math.min((confidence || 0) + 0.1, 1.0)
        : Math.max((confidence || 0) - 0.2, 0.0),
      waitingForApproval: false,
      approvalReceived: approved,
      rejectionReason: !approved ? feedback : undefined,
    };
  }

  /**
   * Process human feedback when workflow resumes
   */
  processHumanFeedback(
    state: HitlCapableState,
    response: HumanApprovalResponse
  ): Partial<HitlCapableState> {
    const executionId = state.executionId ?? 'unknown';

    // Remove from pending approvals
    this.pendingApprovals.delete(executionId);

    // Log the decision
    this.logger.log(`Human decision for ${executionId}: ${response.decision}`);

    // Adjust confidence based on decision
    let newConfidence = state.confidence ?? 0;
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
    const stateUpdate: Partial<HitlCapableState> = {
      humanFeedback: {
        approved: response.decision === 'approved',
        status:
          response.decision === 'retry'
            ? 'pending'
            : response.decision === 'modify'
            ? 'needs_revision'
            : response.decision,
        approver: response.approver || { id: 'unknown' },
        message: response.feedback,
        timestamp: response.timestamp,
        metadata: response.modifications,
      },
      confidence: newConfidence,
      waitingForApproval: false,
      approvalReceived: response.decision === 'approved',
      rejectionReason:
        response.decision === 'rejected' ? response.feedback : undefined,
    };

    // Add modifications to metadata if provided
    if (response.modifications) {
      stateUpdate.metadata = {
        ...(state.metadata ?? {}),
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
  private extractDefaultActions(state: HitlCapableState): ProposedAction[] {
    const actions: ProposedAction[] = [];
    const metadata = (state.metadata ?? {}) as Record<string, unknown>;

    // Check for various action types in metadata
    if (metadata.codeGeneration) {
      actions.push({
        type: 'code_generation',
        description: 'Generate code files',
        impact: 'medium',
        details: metadata.codeGeneration as Record<string, unknown>,
      });
    }

    if (metadata.fileOperations) {
      actions.push({
        type: 'file_modification',
        description: 'Modify files',
        impact: 'high',
        details: metadata.fileOperations as Record<string, unknown>,
      });
    }

    if (metadata.apiCalls) {
      actions.push({
        type: 'api_call',
        description: 'Make external API calls',
        impact: 'medium',
        details: metadata.apiCalls as Record<string, unknown>,
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
