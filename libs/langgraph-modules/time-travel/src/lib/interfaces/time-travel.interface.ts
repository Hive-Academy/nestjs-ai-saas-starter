import { Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import { z } from 'zod';

/**
 * Replay options for time travel operations
 */
export interface ReplayOptions<T = unknown> {
  /**
   * New thread ID for the replay
   */
  newThreadId?: string;

  /**
   * State modifications to apply before replay
   */
  stateModifications?: Partial<T>;

  /**
   * Configuration for the replay execution
   */
  config?: Record<string, unknown>;

  /**
   * Whether to preserve original timestamps
   */
  preserveTimestamps?: boolean;

  /**
   * Whether to skip certain nodes during replay
   */
  skipNodes?: readonly string[];

  /**
   * Speed multiplier for replay (1 = real-time, 2 = 2x speed, etc.)
   */
  replaySpeed?: number;
}

/**
 * Branch options for creating execution branches
 */
export interface BranchOptions<T = unknown> {
  /**
   * Name of the branch
   */
  name: string;

  /**
   * Description of why the branch was created
   */
  description?: string;

  /**
   * State modifications for the branch
   */
  stateModifications?: Partial<T>;

  /**
   * Parent checkpoint ID to branch from
   */
  parentCheckpointId?: string;

  /**
   * Metadata for the branch
   */
  metadata?: Record<string, unknown>;
}

/**
 * Execution history node for visualization
 */
export interface ExecutionHistoryNode {
  /**
   * Checkpoint ID
   */
  checkpointId: string;

  /**
   * Thread ID
   */
  threadId: string;

  /**
   * Node ID in the workflow
   */
  nodeId: string;

  /**
   * Timestamp of execution
   */
  timestamp: Date;

  /**
   * State at this point
   */
  state: unknown;

  /**
   * Parent checkpoint ID (for branches)
   */
  parentCheckpointId?: string;

  /**
   * Branch ID if this is part of a branch
   */
  branchId?: string;

  /**
   * Branch name
   */
  branchName?: string;

  /**
   * Workflow name
   */
  workflowName?: string;

  /**
   * Execution duration in milliseconds
   */
  executionDuration?: number;

  /**
   * Type of node
   */
  nodeType?: 'start' | 'end' | 'task' | 'decision' | 'parallel' | 'error';

  /**
   * Error information if execution failed
   */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };

  /**
   * Children nodes
   */
  children?: readonly ExecutionHistoryNode[];
}

/**
 * History query options
 */
export interface HistoryOptions {
  /**
   * Maximum number of history nodes to return
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;

  /**
   * Filter by node type
   */
  nodeType?: ExecutionHistoryNode['nodeType'];

  /**
   * Filter by workflow name
   */
  workflowName?: string;

  /**
   * Filter by branch name
   */
  branchName?: string;

  /**
   * Include child nodes
   */
  includeChildren?: boolean;

  /**
   * Date range filter
   */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

/**
 * State comparison result
 */
export interface StateComparison<T = unknown> {
  /**
   * Whether states are identical
   */
  identical: boolean;

  /**
   * List of differences
   */
  differences: readonly StateDifference[];

  /**
   * Fields added in state2
   */
  added: readonly string[];

  /**
   * Fields removed from state1
   */
  removed: readonly string[];

  /**
   * Fields modified between states
   */
  modified: readonly string[];

  /**
   * First state
   */
  state1: T;

  /**
   * Second state
   */
  state2: T;
}

/**
 * Individual state difference
 */
export interface StateDifference {
  /**
   * Path to the field
   */
  path: string;

  /**
   * Type of difference
   */
  type: 'added' | 'removed' | 'modified' | 'type-changed';

  /**
   * Value in first state
   */
  value1?: unknown;

  /**
   * Value in second state
   */
  value2?: unknown;

  /**
   * Type in first state
   */
  type1?: string;

  /**
   * Type in second state
   */
  type2?: string;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecution<T = unknown> {
  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Thread ID
   */
  threadId: string;

  /**
   * Start time
   */
  startTime: Date;

  /**
   * End time (if completed)
   */
  endTime?: Date;

  /**
   * Current state
   */
  state: T;

  /**
   * Execution status
   */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /**
   * Result if completed
   */
  result?: unknown;

  /**
   * Error if failed
   */
  error?: Error;

  /**
   * Checkpoints created during execution
   */
  checkpoints: readonly string[];
}

/**
 * Time travel configuration
 */
export interface TimeTravelConfig {
  /**
   * Maximum number of checkpoints to keep per thread
   */
  maxCheckpointsPerThread?: number;

  /**
   * Maximum age of checkpoints in milliseconds
   */
  maxCheckpointAge?: number;

  /**
   * Whether to enable automatic checkpoint creation
   */
  enableAutoCheckpoint?: boolean;

  /**
   * Checkpoint creation interval in milliseconds
   */
  checkpointInterval?: number;

  /**
   * Whether to enable branch management
   */
  enableBranching?: boolean;

  /**
   * Maximum number of branches per thread
   */
  maxBranchesPerThread?: number;

  /**
   * Storage backend for checkpoints
   */
  storage?: {
    type: 'memory' | 'redis' | 'postgres' | 'sqlite';
    config?: Record<string, unknown>;
  };
}

/**
 * Time travel service interface
 */
export interface TimeTravelServiceInterface {
  /**
   * Replay workflow from specific checkpoint
   */
  replayFromCheckpoint<T>(
    threadId: string,
    checkpointId: string,
    options?: ReplayOptions<T>
  ): Promise<WorkflowExecution<T>>;

  /**
   * Create execution branch from checkpoint
   */
  createBranch<T>(
    threadId: string,
    fromCheckpointId: string,
    branchOptions: BranchOptions<T>
  ): Promise<string>;

  /**
   * Get execution history for visualization
   */
  getExecutionHistory(
    threadId: string,
    options?: HistoryOptions
  ): Promise<readonly ExecutionHistoryNode[]>;

  /**
   * Compare states between two checkpoints
   */
  compareCheckpoints<T>(
    threadId: string,
    checkpointId1: string,
    checkpointId2: string
  ): Promise<StateComparison<T>>;

  /**
   * List all branches for a thread
   */
  listBranches(threadId: string): Promise<readonly BranchInfo[]>;

  /**
   * Merge branch back to main execution
   */
  mergeBranch<T>(
    threadId: string,
    branchId: string,
    mergeStrategy?: 'overwrite' | 'merge' | 'custom'
  ): Promise<void>;

  /**
   * Delete a branch
   */
  deleteBranch(threadId: string, branchId: string): Promise<void>;

  /**
   * Export execution history for analysis
   */
  exportHistory(
    threadId: string,
    format?: 'json' | 'csv' | 'mermaid'
  ): Promise<string>;
}

/**
 * Branch information
 */
export interface BranchInfo {
  /**
   * Branch ID
   */
  id: string;

  /**
   * Branch name
   */
  name: string;

  /**
   * Description
   */
  description?: string;

  /**
   * Parent thread ID
   */
  parentThreadId: string;

  /**
   * Parent checkpoint ID
   */
  parentCheckpointId: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt?: Date;

  /**
   * Number of checkpoints in branch
   */
  checkpointCount: number;

  /**
   * Branch status
   */
  status: 'active' | 'merged' | 'abandoned';

  /**
   * Metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Checkpoint not found error
 */
export class CheckpointNotFoundError extends Error {
  public readonly code = 'CHECKPOINT_NOT_FOUND';
  
  constructor(
    message: string,
    public readonly threadId?: string,
    public readonly checkpointId?: string
  ) {
    super(message);
    this.name = 'CheckpointNotFoundError';
  }
}

/**
 * Branch not found error
 */
export class BranchNotFoundError extends Error {
  public readonly code = 'BRANCH_NOT_FOUND';
  
  constructor(
    message: string,
    public readonly threadId?: string,
    public readonly branchId?: string
  ) {
    super(message);
    this.name = 'BranchNotFoundError';
  }
}

/**
 * Validation schemas
 */
export const ReplayOptionsSchema = z.object({
  newThreadId: z.string().optional(),
  stateModifications: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
  preserveTimestamps: z.boolean().optional(),
  skipNodes: z.array(z.string()).optional(),
  replaySpeed: z.number().positive().optional(),
});

export const BranchOptionsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  stateModifications: z.record(z.unknown()).optional(),
  parentCheckpointId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const HistoryOptionsSchema = z.object({
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  nodeType: z.enum(['start', 'end', 'task', 'decision', 'parallel', 'error']).optional(),
  workflowName: z.string().optional(),
  branchName: z.string().optional(),
  includeChildren: z.boolean().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});