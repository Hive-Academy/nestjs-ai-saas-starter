/**
 * Approver Intelligence Interfaces
 * Phase 1 P0-CRITICAL: Intelligent approver selection
 * Note: IMemoryAdapter purged - simplified to default selection
 */

/**
 * Approver expertise metrics for ranking
 */
export interface ApproverExpertise {
  /** Overall expertise score (0-10) */
  score: number;

  /** Risk levels this approver handles well */
  riskSpecialization: Array<'low' | 'medium' | 'high' | 'critical'>;

  /** Workflow types this approver excels at */
  workflowTypeExpertise: string[];

  /** Historical success rate (0-1) */
  successRate: number;

  /** Number of similar approvals handled */
  experienceCount: number;
}

/**
 * Approver ranking result
 */
export interface ApproverRanking {
  /** Selected approver ID */
  selectedApproverId: string;

  /** All ranked approvers in order of suitability */
  rankedApprovers: Array<{
    approverId: string;
    score: number;
    reason: string;
  }>;

  /** Selection reasoning for audit trail */
  selectionReasoning: string;
}
