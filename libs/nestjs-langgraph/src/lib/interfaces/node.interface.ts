export interface NodeMetadata {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  version?: string;
}

export interface NodeContext {
  nodeId: string;
  executionId: string;
  attemptNumber: number;
  startTime: Date;
  metadata?: Record<string, any>;
}

export interface NodeResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
  metadata?: Record<string, any>;
}