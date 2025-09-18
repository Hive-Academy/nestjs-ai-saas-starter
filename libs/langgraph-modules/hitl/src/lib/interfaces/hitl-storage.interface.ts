import { Injectable } from '@nestjs/common';

/**
 * HITL Storage service interface for approval persistence operations
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for HITL storage operations, enabling adapter pattern implementation while
 * maintaining type safety and dependency injection compatibility.
 *
 * Follows the same pattern as IVectorService and IGraphService in the memory module.
 */
@Injectable()
export abstract class IHitlStorageService {
  /**
   * Store an approval request for persistence
   */
  abstract storeApprovalRequest(request: ApprovalStorageData): Promise<string>;

  /**
   * Get approval request by ID
   */
  abstract getApprovalRequest(id: string): Promise<ApprovalStorageData | null>;

  /**
   * Get all pending approval requests (not expired)
   */
  abstract getPendingApprovals(): Promise<readonly ApprovalStorageData[]>;

  /**
   * Get approval requests for a specific execution
   */
  abstract getApprovalsByExecution(
    executionId: string
  ): Promise<readonly ApprovalStorageData[]>;

  /**
   * Update approval request status and response
   */
  abstract updateApprovalStatus(
    id: string,
    status: ApprovalStorageStatus,
    response?: ApprovalStorageResponse
  ): Promise<void>;

  /**
   * Delete approval request by ID
   */
  abstract deleteApprovalRequest(id: string): Promise<boolean>;

  /**
   * Delete expired approval requests
   */
  abstract deleteExpiredApprovals(before: Date): Promise<number>;

  /**
   * Get storage statistics
   */
  abstract getStorageStats(): Promise<HitlStorageStats>;

  /**
   * Common validation method for approval request data
   * Available to all implementations as template method
   */
  protected validateApprovalData(data: ApprovalStorageData): void {
    if (!data.id?.trim()) {
      throw new InvalidApprovalDataError(
        'Approval request ID is required and cannot be empty'
      );
    }

    if (!data.executionId?.trim()) {
      throw new InvalidApprovalDataError(
        'Execution ID is required and cannot be empty'
      );
    }

    if (!data.nodeId?.trim()) {
      throw new InvalidApprovalDataError(
        'Node ID is required and cannot be empty'
      );
    }

    if (!data.message?.trim()) {
      throw new InvalidApprovalDataError(
        'Approval message is required and cannot be empty'
      );
    }

    if (!data.requestedAt || !(data.requestedAt instanceof Date)) {
      throw new InvalidApprovalDataError(
        'Requested timestamp must be a valid Date'
      );
    }
  }

  /**
   * Common validation for approval response data
   */
  protected validateApprovalResponse(response: ApprovalStorageResponse): void {
    if (
      !response.decision ||
      !['approved', 'rejected', 'escalated', 'timeout'].includes(
        response.decision
      )
    ) {
      throw new InvalidApprovalDataError(
        'Approval decision must be one of: approved, rejected, escalated, timeout'
      );
    }

    if (!response.approvedBy?.trim()) {
      throw new InvalidApprovalDataError(
        'ApprovedBy is required and cannot be empty'
      );
    }

    if (!response.timestamp || !(response.timestamp instanceof Date)) {
      throw new InvalidApprovalDataError(
        'Response timestamp must be a valid Date'
      );
    }
  }
}

/**
 * Approval request data structure for storage
 */
export interface ApprovalStorageData {
  /** Unique approval request ID */
  readonly id: string;

  /** Workflow execution ID */
  readonly executionId: string;

  /** Node ID requesting approval */
  readonly nodeId: string;

  /** Approval message */
  readonly message: string;

  /** Request metadata as JSON string (for database compatibility) */
  readonly metadata?: string;

  /** Current approval status */
  readonly status: ApprovalStorageStatus;

  /** When the approval was requested */
  readonly requestedAt: Date;

  /** When the approval expires (for timeout handling) */
  readonly expiresAt?: Date;

  /** Confidence score (0-1) */
  readonly confidence?: number;

  /** Risk level assessment */
  readonly riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  /** Approval chain ID if using escalation */
  readonly chainId?: string;

  /** Assigned approvers (as JSON array string) */
  readonly approvers?: string;

  /** Timeout strategy */
  readonly timeoutStrategy?: 'approve' | 'reject' | 'escalate';

  /** Response data if approval has been processed */
  readonly response?: ApprovalStorageResponse;
}

/**
 * Approval status enumeration
 */
export type ApprovalStorageStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'timeout'
  | 'cancelled';

/**
 * Approval response data structure
 */
export interface ApprovalStorageResponse {
  /** Approval decision */
  readonly decision: 'approved' | 'rejected' | 'escalated' | 'timeout';

  /** Who approved/rejected the request */
  readonly approvedBy: string;

  /** Optional response message/reason */
  readonly message?: string;

  /** When the response was made */
  readonly timestamp: Date;

  /** Additional response metadata as JSON string */
  readonly metadata?: string;
}

/**
 * Storage statistics
 */
export interface HitlStorageStats {
  /** Total number of approval requests */
  readonly totalRequests: number;

  /** Requests by status */
  readonly requestsByStatus: Record<ApprovalStorageStatus, number>;

  /** Average response time in milliseconds */
  readonly averageResponseTime: number;

  /** Timeout rate (0-1) */
  readonly timeoutRate: number;

  /** Approval rate (0-1) */
  readonly approvalRate: number;

  /** When statistics were last updated */
  readonly lastUpdated: Date;
}

/**
 * Error thrown when approval data is invalid
 */
export class InvalidApprovalDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidApprovalDataError';
  }
}

/**
 * Error thrown when storage operations fail
 */
export class HitlStorageError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HitlStorageError';
  }
}
