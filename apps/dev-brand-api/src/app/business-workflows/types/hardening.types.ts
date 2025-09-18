/**
 * Hardening Types
 * Local application-only interfaces extracted to remove `as any` casts in services & workflows.
 * These deliberately do NOT re-export library internals; they model the runtime shapes we access.
 */

// Neo4j analytics aggregated shape
export interface KnowledgeBaseAnalytics {
  totalArticles: number;
  totalTickets: number;
  topCategories: Array<{
    category: string;
    count: number;
    effectiveness: number;
  }>;
  mostUsedArticles: Array<{
    id: string;
    title: string;
    useCount: number;
    effectiveness: number;
  }>;
  resolutionPatterns: Array<{
    pattern: string;
    frequency: number;
    avgSatisfaction: number;
  }>;
}

// Pending approval summary (subset of internal HITL object surface)
export interface ApprovalRequestSummary {
  id: string;
  executionId: string;
  nodeId: string;
  message: string;
  priority: string; // risk / priority label
  requestedAt: Date;
  expiresAt?: Date;
}

// Workflow execution statistics snapshot
export interface WorkflowExecutionStats {
  totalExecutions: number;
  activeInstances: number;
  successRate: number; // 0..1
  averageExecutionTime: number; // ms
}

// Normalized ticket input (pre-validation for workflow entry)
export interface NormalizedTicketInput {
  issue: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  customerId?: string;
}

// Approval predicate metadata (extracted to isolate decorator from instance `this`)
export interface ApprovalPredicateStateLike {
  escalationRequired?: boolean;
  ticket?: { customerTier?: string };
  analysis?: { businessImpact?: string; sentiment?: number };
  customerContext?: { riskLevel?: string };
}

export type ApprovalPredicate = (state: ApprovalPredicateStateLike | undefined) => boolean;

// Helper to build predicate input (will be implemented in workflow file)
export interface BuildsApprovalPredicateInput<TState> {
  (state: TState): ApprovalPredicateStateLike;
}
