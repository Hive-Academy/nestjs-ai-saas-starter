// Shared approval workflow types extracted to break circular dependency
// between HumanApprovalService and ApprovalProcessingService.
// Keep ONLY type/value definitions here—no service imports.

import type { WorkflowState } from '@hive-academy/langgraph-core';
import type { RequiresApprovalOptions } from '../decorators/approval.decorator';
import type { ApprovalRiskLevel } from '../decorators/approval.decorator';

/**
 * Approval workflow state
 */
export enum ApprovalWorkflowState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Human approval request structure
 */
export interface HumanApprovalRequest {
  id: string;                 // Request ID
  executionId: string;        // Execution ID
  nodeId: string;             // Node requesting approval
  message: string;            // Approval message
  metadata: Record<string, unknown>; // Request metadata
  state: WorkflowState;       // Current workflow state snapshot
  options: RequiresApprovalOptions;  // Approval options
  workflowState: ApprovalWorkflowState; // Internal approval workflow state
  approvers?: string[];       // Assigned approvers
  chainId?: string;           // Approval chain ID
  riskAssessment?: {
    level: ApprovalRiskLevel;
    factors: string[];
    score: number;
    details?: Record<string, unknown>;
  };
  confidence: {
    current: number;
    threshold: number;
    factors: Record<string, number>; // factor -> weight/score
  };
  timestamps: {
    requested: Date;
    responded?: Date;
    timeout?: Date;
  };
  timeout: {
    duration: number;
    strategy: 'approve' | 'reject' | 'escalate' | 'retry';
  };
  retry: {
    count: number;
    maxAttempts: number;
  };
}

/**
 * Human approval response
 */
export interface HumanApprovalResponse {
  requestId: string; // Request ID
  decision: 'approved' | 'rejected' | 'escalated' | 'retry' | 'modify'; // Decision
  approver: {        // Approver information
    id: string;
    name?: string;
    role?: string;
  };
  message?: string;  // Response message
  modifications?: Record<string, unknown>; // Modifications to apply
  metadata?: Record<string, unknown>; // Additional metadata
  timestamp: Date;   // Response timestamp
}

/**
 * Approval workflow statistics
 */
export interface ApprovalWorkflowStats {
  total: number;
  byState: Record<ApprovalWorkflowState, number>;
  averageResponseTime: number;
  timeoutRate: number;
  approvalRate: number;
  escalationRate: number;
}
