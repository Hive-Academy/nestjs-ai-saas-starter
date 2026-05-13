/**
 * Minimal state shape required by HITL services.
 * Workflows using HITL must ensure their annotation includes these fields.
 * All fields optional to support graceful degradation.
 *
 * **Note on defaults**: When used with `HitlAgentStateAnnotation`, fields
 * have annotation defaults (e.g., `confidence` defaults to `0`, `approvalReceived`
 * defaults to `false`). When used as a plain interface without the annotation,
 * fields may be `undefined`. Always use nullish coalescing (`??`) for safe access.
 */
export interface HitlCapableState {
  executionId?: string;
  confidence?: number;
  currentNode?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  risks?: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    mitigation?: string;
  }>;
  humanFeedback?: {
    approved: boolean;
    status: string;
    approver: { id: string; name?: string; role?: string };
    message?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  };
  approvalReceived?: boolean;
  waitingForApproval?: boolean;
  rejectionReason?: string;
}
