/**
 * Minimal state shape required by HITL services.
 * Workflows using HITL must ensure their annotation includes these fields.
 * All fields optional to support graceful degradation.
 */
export interface HitlCapableState {
  executionId?: string;
  confidence?: number;
  currentNode?: string;
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
