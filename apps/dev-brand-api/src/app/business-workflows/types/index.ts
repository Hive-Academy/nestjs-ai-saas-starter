/**
 * Business Workflows Types Index
 * Centralized export for all business types
 */

// Customer Support Types (commented out - file doesn't exist)
// export type * from './customer-support.types';

// Agent workflow state bridge
import type { AgentState } from '@hive-academy/langgraph-multi-agent';

/**
 * WorkflowAgentState - Bridge interface that extends both AgentState and includes workflow-specific properties
 * This satisfies both the multi-agent system requirements and the workflow engine requirements
 */
export interface WorkflowAgentState extends AgentState {
  executionId: string;
  status:
    | 'pending'
    | 'active'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';
  currentNode?: string;
  completedNodes: string[];
  confidence: number;
  timestamps: { started: Date; updated?: Date; completed?: Date };
  retryCount: number;
  startedAt: Date;
}

/**
 * 🆕 TYPE-SAFE: Generic workflow agent state with strongly-typed metadata
 *
 * Eliminates unsafe type assertions by providing compile-time type safety for metadata access.
 * Each agent uses this with its specific metadata type (GitHubAnalyzerMetadata, BrandStrategistMetadata, etc.)
 *
 * @template TMetadata - Agent-specific metadata type extending WorkflowAgentMetadata
 *
 * @example GitHub Code Analyzer
 * ```typescript
 * import type { GitHubAnalyzerMetadata } from '../agents/shared/metadata.types';
 *
 * export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase<
 *   TypedWorkflowAgentState<GitHubAnalyzerMetadata>
 * > {
 *   async analyzeRepository(context: TaskExecutionContext<TypedWorkflowAgentState<GitHubAnalyzerMetadata>>) {
 *     // Type-safe access - no 'as string' needed!
 *     const username = context.state.metadata.githubUsername; // ✅ string
 *     const timeframe = context.state.metadata.timeframe; // ✅ string
 *     const githubData = context.state.metadata.githubData; // ✅ GitHubData | undefined
 *   }
 * }
 * ```
 *
 * @example Personal Brand Strategist
 * ```typescript
 * import type { BrandStrategistMetadata } from '../agents/shared/metadata.types';
 *
 * export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase<
 *   TypedWorkflowAgentState<BrandStrategistMetadata>
 * > {
 *   async analyzeBrand(context: TaskExecutionContext<TypedWorkflowAgentState<BrandStrategistMetadata>>) {
 *     // Type-safe access - no type assertions!
 *     const brandScore = context.state.metadata.brandScore; // ✅ number | undefined
 *     const strategyType = context.state.metadata.strategyType; // ✅ 'optimization' | 'rebuild' | undefined
 *   }
 * }
 * ```
 */
export interface TypedWorkflowAgentState<TMetadata = Record<string, unknown>>
  extends Omit<WorkflowAgentState, 'metadata'> {
  /**
   * Type-safe metadata property
   * Replaces WorkflowAgentState['metadata'] with strongly-typed TMetadata
   */
  metadata: TMetadata;
}

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

// Local hardening-only types (commented out - file doesn't exist)
// export type * from './hardening.types';
