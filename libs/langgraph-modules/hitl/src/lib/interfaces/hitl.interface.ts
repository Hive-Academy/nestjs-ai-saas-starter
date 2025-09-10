export interface HitlConfig {
  enabled?: boolean;
  timeout?: number;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  nodeId: string;
  data: unknown;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  feedback?: string;
  approvedBy?: string;
  approvedAt: Date;
}

export interface ConfidenceThreshold {
  low: number;
  medium: number;
  high: number;
}

export interface HitlModuleOptions {
  defaultTimeout?: number;
  confidenceThreshold?: number;
  enabled?: boolean;
}
