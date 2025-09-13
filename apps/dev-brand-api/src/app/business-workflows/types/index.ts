/**
 * Business Workflows Types Index
 * Centralized export for all business types
 */

// Customer Support Types
export type * from './customer-support.types';

// Shared Business Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StreamingResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  executionId: string;
  streaming: boolean;
  streamUrl?: string;
}

export interface WorkflowMetadata {
  workflowId: string;
  workflowName: string;
  version: string;
  executionId: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
}

export interface AgentCapability {
  name: string;
  description: string;
  tools: string[];
  requiredPermissions: string[];
  estimatedExecutionTime: number;
}

export interface BusinessConfiguration {
  environment: 'development' | 'staging' | 'production';
  features: {
    streamingEnabled: boolean;
    hitlEnabled: boolean;
    monitoringEnabled: boolean;
    cacheEnabled: boolean;
  };
  limits: {
    maxConcurrentWorkflows: number;
    maxExecutionTime: number;
    maxTokensPerRequest: number;
  };
  integrations: {
    chromadb: boolean;
    neo4j: boolean;
    redis: boolean;
    monitoring: boolean;
  };
}

// Generic workflow state interface
export interface BaseWorkflowState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startTime: number;
  endTime?: number;
  error?: string;
  metadata?: WorkflowMetadata;
  progress?: number;
  currentStep?: string;
}
