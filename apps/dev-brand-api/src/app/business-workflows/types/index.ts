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
  completedAt?: Date; // Required by WorkflowState from @hive-academy/langgraph-core
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
export interface TypedWorkflowAgentState<TMetadata = Record<string, unknown>> {
  // Core workflow properties (from CoreWorkflowState)
  readonly executionId: string;
  readonly status:
    | 'pending'
    | 'active'
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled';
  readonly confidence: number;
  readonly retryCount: number;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly timestamps: { started: Date; updated?: Date; completed?: Date };
  readonly currentNode?: string;
  readonly previousNode?: string;
  readonly nextNode?: string;
  readonly completedNodes: string[];
  readonly requiresApproval?: boolean;
  readonly approvalReceived?: boolean;
  error?: any;
  messages?: any[];

  /**
   * Type-safe metadata property
   * Overrides CoreWorkflowState['metadata'] with strongly-typed TMetadata
   * Made required (non-optional) to avoid "possibly undefined" errors in agent code
   */
  metadata: TMetadata;

  /**
   * Human feedback - using any to avoid type conflicts between core and workflow-engine
   */
  humanFeedback?: any;

  /**
   * Index signature for compatibility with FunctionalWorkflowState
   */
  [key: string]: unknown;
}

/**
 * Unified Agent State - Consistent state architecture for all multi-agent workflows
 *
 * Eliminates metadata flow inconsistencies by ensuring metadata is ALWAYS initialized
 * in state, not just config. Provides type-safe access to agent-specific metadata.
 *
 * Design Principles:
 * 1. Extends AgentState (multi-agent module) for LangGraph compatibility
 * 2. Makes metadata REQUIRED (non-optional) to prevent undefined errors
 * 3. Provides common workflow properties expected by DeclarativeWorkflowBase
 * 4. Supports type-safe agent-specific metadata via TypedAgentState<TMetadata>
 *
 * @example Usage in DevBrandWorkflow
 * ```typescript
 * // Supervisor passes UnifiedAgentState to workers
 * const state: UnifiedAgentState = {
 *   messages: [{ role: 'user', content: 'Analyze demo-user' }],
 *   executionId: 'exec-123',
 *   status: 'active',
 *   confidence: 1.0,
 *   retryCount: 0,
 *   startedAt: new Date(),
 *   timestamps: { started: new Date() },
 *   completedNodes: [],
 *   metadata: {
 *     userId: 'user-123',
 *     executionId: 'exec-123',
 *     threadId: 'thread-123',
 *     workflowType: 'devbrand-supervisor',
 *   },
 * };
 * ```
 *
 * Evidence:
 * - AgentState: libs/langgraph-modules/multi-agent/src/lib/interfaces/agent.types.ts:57-105
 * - WorkflowState: libs/langgraph-modules/core/src/lib/interfaces/workflow.interface.ts:5-129
 * - TypedWorkflowAgentState: apps/dev-brand-api/src/app/business-workflows/types/index.ts:73-113
 */
export interface UnifiedAgentState extends AgentState {
  // ✅ Core LangGraph fields (from AgentState - inherited automatically)
  // messages: AIMessage[];        // Required by multi-agent coordination
  // next?: string;                // Supervisor routing
  // current?: string;             // Current agent tracker
  // scratchpad?: string;          // Agent collaboration notes
  // task?: string;                // Task description passed between agents
  // threadId?: string;            // Memory context and checkpointing
  // userId?: string;              // User context and personalization

  // ✅ Workflow execution properties (from WorkflowState - inherited automatically)
  // executionId: string;          // Unique execution identifier
  // status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  // confidence: number;           // Execution confidence score
  // retryCount: number;           // Error handling retry counter
  // startedAt: Date;              // Workflow start timestamp
  // completedAt?: Date;           // Workflow completion timestamp
  // timestamps: { started: Date; updated?: Date; completed?: Date };
  // currentNode?: string;         // Current workflow node
  // previousNode?: string;        // Previous workflow node (routing)
  // completedNodes: string[];     // Execution history
  // requiresApproval?: boolean;   // HITL flag
  // approvalReceived?: boolean;   // HITL approval status
  // humanFeedback?: any;          // HITL feedback data
  // error?: any;                  // Error information

  // ✅ CRITICAL: Unified metadata container (REQUIRED, not optional)
  metadata: {
    // Common metadata (present for all agents)
    userId?: string; // User identifier
    executionId?: string; // Execution identifier
    threadId?: string; // Thread identifier
    workflowType?: string; // Workflow type identifier

    // Agent coordination metadata
    lastAgent?: string; // Last executed agent
    active_agent?: string; // Currently active agent (swarm)
    handoff_from?: string; // Handoff source agent (swarm)
    handoff_task?: string; // Handoff task description (swarm)
    handoff_round?: number; // Handoff round counter (swarm)
    handoffReason?: string; // Handoff reasoning

    // Agent-specific metadata (extensible per agent type)
    [key: string]: unknown;
  };

  // ✅ Extension point for additional properties
  [key: string]: unknown;
}

/**
 * Type-safe agent-specific state
 *
 * Provides compile-time type safety for agent-specific metadata while maintaining
 * consistency with UnifiedAgentState base structure.
 *
 * @template TMetadata - Agent-specific metadata type (extends Record<string, unknown>)
 *
 * @example GitHub Code Analyzer
 * ```typescript
 * import type { GitHubAnalyzerMetadata } from '../agents/shared/metadata.types';
 *
 * export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase<
 *   TypedAgentState<GitHubAnalyzerMetadata>
 * > {
 *   async analyzeRepository(context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>) {
 *     // ✅ Type-safe access - no 'as string' needed!
 *     const username = context.state.metadata.githubUsername; // string
 *     const timeframe = context.state.metadata.timeframe; // string
 *   }
 * }
 * ```
 *
 * @example Personal Brand Strategist
 * ```typescript
 * import type { BrandStrategistMetadata } from '../agents/shared/metadata.types';
 *
 * export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase<
 *   TypedAgentState<BrandStrategistMetadata>
 * > {
 *   async analyzeBrand(context: TaskExecutionContext<TypedAgentState<BrandStrategistMetadata>>) {
 *     // ✅ Type-safe access - no type assertions!
 *     const brandScore = context.state.metadata.brandScore; // number | undefined
 *     const strategyType = context.state.metadata.strategyType; // 'optimization' | 'rebuild' | undefined
 *   }
 * }
 * ```
 *
 * Evidence:
 * - GitHubAnalyzerMetadata: apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts:71-209
 * - BrandStrategistMetadata: apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts:219-289
 * - ContentCreatorMetadata: apps/dev-brand-api/src/app/business-workflows/agents/shared/metadata.types.ts:299-469
 */
export type TypedAgentState<TMetadata extends Record<string, unknown>> = Omit<
  UnifiedAgentState,
  'metadata'
> & {
  metadata: UnifiedAgentState['metadata'] & TMetadata;
};

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
