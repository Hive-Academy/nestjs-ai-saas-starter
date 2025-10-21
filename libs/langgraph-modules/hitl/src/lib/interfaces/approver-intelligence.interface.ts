/**
 * Approver Intelligence Interfaces
 * Phase 1 P0-CRITICAL: Intelligent approver selection using IMemoryAdapter
 */

import type { UserMemoryPatterns } from '@hive-academy/langgraph-core';

/**
 * Approver behavior profile extracted from memory patterns
 */
export interface ApproverProfile {
  /** Approver user ID */
  approverId: string;

  /** Memory-based user patterns */
  patterns: UserMemoryPatterns;

  /** Relevance score for current approval context (0-1) */
  relevanceScore: number;

  /** Calculated expertise level for this approval type */
  expertise: ApproverExpertise;

  /** Average response time in milliseconds */
  avgResponseTime: number;

  /** Historical approval rate (0-1) */
  approvalRate: number;

  /** Decision making style */
  style: 'thorough' | 'decisive' | 'standard';
}

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
