import type { AgentDefinition } from './agent.types';

/**
 * Workflow definition interface
 * Defines a complete workflow with execution logic
 */
export interface MultiAgentWorkflowSpec {
  /**
   * Unique workflow identifier
   */
  id: string;

  /**
   * Human-readable workflow name
   */
  name: string;

  /**
   * Workflow description
   */
  description: string;

  /**
   * Workflow version for compatibility
   */
  version?: string;

  /**
   * Workflow execution function
   */
  execute: WorkflowExecuteFunction;

  /**
   * Required agents for this workflow
   */
  requiredAgents?: string[];

  /**
   * Input schema validation
   */
  inputSchema?: any;

  /**
   * Output schema definition
   */
  outputSchema?: any;

  /**
   * Workflow configuration options
   */
  config?: WorkflowConfig;

  /**
   * Workflow metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Workflow execution function signature
 */
export type WorkflowExecuteFunction = (
  input: any,
  context: WorkflowContext
) => Promise<MultiAgentWorkflowResult>;

/**
 * Workflow execution context
 * Provided to workflow execution function
 */
export interface WorkflowContext {
  /**
   * Workflow instance ID
   */
  instanceId: string;

  /**
   * Available agents for this workflow
   */
  agents: Map<string, AgentDefinition>;

  /**
   * Available tools
   */
  tools: unknown[];

  /**
   * Workflow configuration
   */
  config: WorkflowConfig;

  /**
   * Logger instance
   */
  logger: any;

  /**
   * Multi-agent coordinator service
   */
  coordinator: any;

  /**
   * Pause context information
   */
  pauseContext?: {
    pausedAt: Date;
    reason?: string;
    pausedBy?: string;
    userInputRequested?: boolean;
  };

  /**
   * Resume context information
   */
  resumeContext?: {
    resumedAt: Date;
    pauseDuration: number;
    userInputProvided: boolean;
  };
}

/**
 * Workflow configuration options
 */
export interface WorkflowConfig {
  /**
   * Maximum execution time in milliseconds
   */
  timeout?: number;

  /**
   * Enable checkpointing for this workflow
   */
  checkpointing?: boolean;

  /**
   * Enable streaming for this workflow
   */
  streaming?: boolean;

  /**
   * Retry configuration
   */
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    backoffMs: number;
  };

  /**
   * Workflow-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Workflow execution result
 */
export interface MultiAgentWorkflowResult {
  /**
   * Execution success status
   */
  success: boolean;

  /**
   * Result data
   */
  data?: any;

  /**
   * Error information if failed
   */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  /**
   * Execution metadata
   */
  metadata: {
    startTime: number;
    endTime: number;
    duration: number;
    instanceId: string;
    agentsUsed?: string[];
    checkpoints?: number;
  };
}

/**
 * Workflow status enumeration
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

/**
 * Workflow instance tracking
 */
export interface WorkflowInstance {
  /**
   * Instance ID
   */
  instanceId: string;

  /**
   * Workflow definition ID
   */
  workflowId: string;

  /**
   * Current status
   */
  status: WorkflowStatus;

  /**
   * Input data
   */
  input: any;

  /**
   * Current result (if any)
   */
  result?: MultiAgentWorkflowResult;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;

  /**
   * Pause timestamp
   */
  pausedAt?: Date;

  /**
   * Resume timestamp
   */
  resumedAt?: Date;

  /**
   * Current state
   */
  currentState?: any;

  /**
   * Instance metadata
   */
  metadata?: Record<string, any>;

  /**
   * Execution context
   */
  context: WorkflowContext;
}

/**
 * Multi-agent workflow provider type for explicit registration
 *
 * NOTE: Multi-agent extends core IWorkflowProvider from @hive-academy/langgraph-core.
 * This follows the Dependency Inversion Principle - multi-agent (feature module)
 * depends on workflow-engine (orchestration) via core interfaces (abstractions).
 */
export type MultiAgentWorkflowProvider = new (...args: any[]) => any;

/**
 * Agent provider type for explicit registration
 *
 * NOTE: Multi-agent extends core IAgentProvider from @hive-academy/langgraph-core.
 * This follows the Dependency Inversion Principle - multi-agent (feature module)
 * depends on workflow-engine (orchestration) via core interfaces (abstractions).
 */
export type AgentProvider = new (...args: any[]) => any;

/**
 * Tool provider type for explicit registration
 *
 * NOTE: Multi-agent extends core IToolProvider from @hive-academy/langgraph-core.
 * This follows the Dependency Inversion Principle - multi-agent (feature module)
 * depends on workflow-engine (orchestration) via core interfaces (abstractions).
 */
export type ToolProvider = new (...args: any[]) => any;
