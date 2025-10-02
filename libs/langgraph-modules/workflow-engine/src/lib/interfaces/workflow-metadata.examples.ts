/**
 * Example usage of the generic workflow metadata system
 * This file demonstrates how to use the new type-safe metadata interfaces
 */

import type {
  WorkflowCheckpointMetadata,
  WorkflowStreamMetadata,
  WorkflowCheckpointListResult,
  WorkflowCheckpointFilter,
  WorkflowAIMetadata,
  WorkflowUserMetadata,
  WorkflowPerformanceMetadata,
  WorkflowBusinessMetadata,
  CreateWorkflowMetadata,
  CreateCheckpointRecord,
} from './workflow-metadata.interface';

// Example 1: AI/LLM workflow with token usage tracking
export interface AIWorkflowData {
  prompt: string;
  response: string;
  model: string;
  settings: {
    temperature: number;
    maxTokens: number;
  };
}

export type AIWorkflowMetadata = CreateWorkflowMetadata<
  WorkflowAIMetadata & {
    promptVersion: string;
    responseQuality: number;
  }
>;

export type AICheckpointRecord = CreateCheckpointRecord<
  AIWorkflowData,
  WorkflowAIMetadata
>;

// Example 2: Business workflow with user context
export interface BusinessWorkflowData {
  documentId: string;
  processedContent: string[];
  approvals: {
    userId: string;
    timestamp: string;
    status: 'approved' | 'rejected';
  }[];
}

export type BusinessWorkflowMetadata = CreateWorkflowMetadata<
  WorkflowBusinessMetadata &
    WorkflowUserMetadata & {
      documentType: string;
      priority: 'low' | 'medium' | 'high';
      department: string;
    }
>;

// Example 3: Performance monitoring workflow
export interface PerformanceWorkflowData {
  operationName: string;
  metrics: {
    startTime: number;
    endTime: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  results: unknown[];
}

export type PerformanceWorkflowMetadata = CreateWorkflowMetadata<
  WorkflowPerformanceMetadata & {
    benchmark: string;
    targetSLA: number;
    actualSLA: number;
  }
>;

// Example 4: Streaming metadata for real-time updates
export type TokenStreamMetadata = WorkflowStreamMetadata<{
  tokenizer: string;
  language: string;
  confidence: number;
}>;

export type EventStreamMetadata = WorkflowStreamMetadata<{
  eventSource: string;
  severity: 'info' | 'warning' | 'error';
  tags: string[];
}>;

// Example 5: Complex multi-domain metadata
export interface MultiDomainWorkflowData {
  userRequest: string;
  aiAnalysis: {
    intent: string;
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
  businessRules: {
    ruleId: string;
    applied: boolean;
    reason?: string;
  }[];
  result: {
    action: string;
    payload: unknown;
  };
}

export type MultiDomainMetadata = CreateWorkflowMetadata<
  WorkflowAIMetadata &
    WorkflowBusinessMetadata &
    WorkflowUserMetadata &
    WorkflowPerformanceMetadata & {
      // Custom domain-specific metadata
      workflowVersion: string;
      experimentId?: string;
      featureFlags: Record<string, boolean>;
      compliance: {
        level: 'basic' | 'enhanced' | 'strict';
        requirements: string[];
      };
    }
>;

// Example 6: Type-safe checkpoint filtering
export function createBusinessWorkflowFilter(): WorkflowCheckpointFilter<WorkflowBusinessMetadata> {
  return {
    type: ['progress', 'final'],
    timeRange: {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      to: new Date(),
    },
    metadataFilter: (metadata) => {
      return (
        metadata.payload?.tenantId === 'acme-corp' &&
        metadata.payload?.environment === 'production'
      );
    },
    pagination: {
      limit: 50,
      offset: 0,
    },
  };
}

// Example 7: Checkpoint list result with strong typing
export function processAIWorkflowResults(
  results: WorkflowCheckpointListResult<AIWorkflowData, WorkflowAIMetadata>
): void {
  results.checkpoints.forEach((checkpoint) => {
    // All properties are strongly typed
    const data = checkpoint.checkpoint.data;
    const metadata = checkpoint.metadata;

    console.log(`Model: ${data.model}`);
    console.log(
      `Tokens used: ${metadata.payload?.tokenUsage?.total ?? 'unknown'}`
    );
    console.log(`Temperature: ${data.settings.temperature}`);
    console.log(`Created: ${metadata.created_at}`);
  });
}

// Example 8: Service method signatures with generics
export interface WorkflowCheckpointServiceExamples {
  /**
   * Save an AI workflow checkpoint with token usage metadata
   */
  saveAICheckpoint(
    executionId: string,
    data: AIWorkflowData,
    metadata: WorkflowAIMetadata
  ): Promise<void>;

  /**
   * Resume a business workflow with typed data
   */
  resumeBusinessWorkflow(
    executionId: string
  ): Promise<BusinessWorkflowData | null>;

  /**
   * List performance workflow checkpoints with filtering
   */
  listPerformanceCheckpoints(
    filter: WorkflowCheckpointFilter<WorkflowPerformanceMetadata>
  ): Promise<
    WorkflowCheckpointListResult<
      PerformanceWorkflowData,
      WorkflowPerformanceMetadata
    >
  >;
}

// Example 9: Factory functions for common metadata types
export class WorkflowMetadataFactory {
  static createAIMetadata(
    model: string,
    tokenUsage: { prompt: number; completion: number; total: number }
  ): WorkflowAIMetadata {
    return {
      model,
      tokenUsage,
      temperature: 0.7,
      maxTokens: 1000,
    };
  }

  static createBusinessMetadata(
    tenantId: string,
    environment: 'development' | 'staging' | 'production'
  ): WorkflowBusinessMetadata {
    return {
      tenantId,
      environment,
      features: [],
      experiments: {},
    };
  }

  static createPerformanceMetadata(
    duration: number,
    memoryUsage: number
  ): WorkflowPerformanceMetadata {
    return {
      duration,
      memoryUsage,
      cpuUsage: 0,
      networkCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
}

// Example 10: Validation functions
export function validateAIMetadata(
  metadata: WorkflowCheckpointMetadata<WorkflowAIMetadata>
): boolean {
  const payload = metadata.payload;
  if (!payload) return false;

  return (
    typeof payload.model === 'string' &&
    payload.model.length > 0 &&
    (payload.tokenUsage?.total ?? 0) > 0 &&
    (payload.temperature ?? 0) >= 0 &&
    (payload.temperature ?? 0) <= 2.0
  );
}

export function validateBusinessMetadata(
  metadata: WorkflowCheckpointMetadata<WorkflowBusinessMetadata>
): boolean {
  const payload = metadata.payload;
  if (!payload) return false;

  return (
    typeof payload.tenantId === 'string' &&
    payload.tenantId.length > 0 &&
    ['development', 'staging', 'production'].includes(payload.environment ?? '')
  );
}
