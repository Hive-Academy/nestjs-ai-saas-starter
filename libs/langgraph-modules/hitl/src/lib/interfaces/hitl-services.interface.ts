import type {
  HumanApprovalRequest,
  HumanApprovalResponse,
} from '../services/approval-workflow.types';
import type { BaseCheckpointTuple } from '@hive-academy/langgraph-core';

/**
 * Interface for HITL Memory Learning Service
 * Handles feedback processing and learning from human decisions
 */
export interface IHitlMemoryLearningService {
  /**
   * Learn from human approval feedback
   * @param request The original approval request
   * @param response The human response containing feedback
   */
  learnFromHumanFeedback(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): Promise<void>;

  /**
   * Store detailed feedback as a separate learning entry
   * @param request The original approval request
   * @param response The human response
   * @param learningThreadId Thread ID for the learning session
   */
  storeDetailedFeedback(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse,
    learningThreadId: string
  ): Promise<void>;

  /**
   * Assess the quality of feedback provided
   * @param response The human response
   * @returns Quality rating
   */
  assessFeedbackQuality(
    response: HumanApprovalResponse
  ): 'high' | 'medium' | 'low';

  /**
   * Calculate the importance of feedback for learning
   * @param request The original approval request
   * @param response The human response
   * @returns Importance score (0-1)
   */
  calculateFeedbackImportance(
    request: HumanApprovalRequest,
    response: HumanApprovalResponse
  ): number;
}

/**
 * Interface for HITL Checkpoint Service
 * Handles state persistence and workflow checkpointing
 */
export interface IHitlCheckpointService {
  /**
   * Save approval workflow state at critical points
   * @param request The approval request
   * @param source The checkpoint source
   * @param additionalData Optional additional data to store
   */
  saveApprovalState(
    request: HumanApprovalRequest,
    source: string,
    additionalData?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Resume approval workflow from saved state
   * @param executionId The execution ID
   * @param nodeId The node ID
   * @param checkpointId Optional specific checkpoint ID
   * @returns The restored approval request or null
   */
  resumeApprovalWorkflow(
    executionId: string,
    nodeId: string,
    checkpointId?: string
  ): Promise<HumanApprovalRequest | null>;

  /**
   * Save approval chain progression
   * @param request The approval request
   * @param chainLevel The current chain level
   * @param approvers List of approvers
   * @param chainStatus Current chain status
   */
  saveChainProgress(
    request: HumanApprovalRequest,
    chainLevel: number,
    approvers: string[],
    chainStatus: string
  ): Promise<void>;

  /**
   * Resume approval chain from saved state
   * @param chainId The chain ID
   * @param executionId The execution ID
   * @param checkpointId Optional specific checkpoint ID
   * @returns Chain state or null
   */
  resumeApprovalChain(
    chainId: string,
    executionId: string,
    checkpointId?: string
  ): Promise<{
    level: number;
    approvers: string[];
    status: string;
  } | null>;

  /**
   * Get all approval checkpoints for execution
   * @param executionId The execution ID
   * @param nodeId The node ID
   * @param limit Optional limit on results
   * @returns List of checkpoints
   */
  getApprovalCheckpoints(
    executionId: string,
    nodeId: string,
    limit?: number
  ): Promise<readonly BaseCheckpointTuple[]>;

  /**
   * Cleanup old approval checkpoints
   * @param maxAge Maximum age in milliseconds
   * @returns Number of checkpoints cleaned up
   */
  cleanupApprovalCheckpoints(maxAge?: number): Promise<number>;

  /**
   * Generate canonical thread ID for approval workflow
   * @param executionId The execution ID
   * @param nodeId The node ID
   * @returns Thread ID
   */
  generateApprovalThreadId(executionId: string, nodeId: string): string;

  /**
   * Generate canonical thread ID for approval chain
   * @param chainId The chain ID
   * @param executionId The execution ID
   * @returns Thread ID
   */
  generateChainThreadId(chainId: string, executionId: string): string;
}

/**
 * Interface for HITL Validation Service
 * Handles policy enforcement and validation logic
 */
export interface IHitlValidationService {
  /**
   * Validate approval request against policies
   * @param request The approval request to validate
   * @returns Validation result
   */
  validateApprovalRequest(request: HumanApprovalRequest): Promise<{
    isValid: boolean;
    violations: string[];
    warnings: string[];
  }>;

  /**
   * Validate human response against constraints
   * @param response The human response
   * @param request The original request
   * @returns Validation result
   */
  validateHumanResponse(
    response: HumanApprovalResponse,
    request: HumanApprovalRequest
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }>;

  /**
   * Check if request requires escalation
   * @param request The approval request
   * @returns Whether escalation is required
   */
  requiresEscalation(request: HumanApprovalRequest): Promise<boolean>;

  /**
   * Validate chain configuration
   * @param chainId The chain ID
   * @param request The approval request
   * @returns Validation result
   */
  validateChainConfiguration(
    chainId: string,
    request: HumanApprovalRequest
  ): Promise<{
    isValid: boolean;
    issues: string[];
  }>;
}

/**
 * Interface for HITL Recovery Service
 * Handles service recovery and persistence management
 */
export interface IHitlRecoveryService {
  /**
   * Recover pending approvals from persistent storage
   */
  recoverPendingApprovals(): Promise<void>;

  /**
   * Persist timeout state for recovery
   * @param request The approval request
   */
  persistTimeoutState(request: HumanApprovalRequest): Promise<void>;

  /**
   * Recover service state after restart
   * @param executionIds Optional specific execution IDs to recover
   */
  recoverServiceState(executionIds?: string[]): Promise<{
    recovered: number;
    failed: number;
    errors: string[];
  }>;

  /**
   * Backup current service state
   * @returns Backup result
   */
  backupServiceState(): Promise<{
    approvalCount: number;
    backupId: string;
    timestamp: Date;
  }>;

  /**
   * Restore service state from backup
   * @param backupId The backup ID to restore from
   */
  restoreServiceState(backupId: string): Promise<{
    restored: number;
    failed: number;
    errors: string[];
  }>;

  /**
   * Check service health and recovery status
   * @returns Health status
   */
  checkRecoveryHealth(): Promise<{
    isHealthy: boolean;
    pendingRecoveries: number;
    lastRecoveryTime?: Date;
    issues: string[];
  }>;
}
