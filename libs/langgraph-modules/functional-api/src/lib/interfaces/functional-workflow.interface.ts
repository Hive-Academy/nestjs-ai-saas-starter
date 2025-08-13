
/**
 * Base state interface for functional workflows
 */
export interface FunctionalWorkflowState {
  readonly [key: string]: unknown;
}

/**
 * Task execution context provided to decorated methods
 */
export interface TaskExecutionContext<TState extends FunctionalWorkflowState = FunctionalWorkflowState> {
  readonly state: TState;
  readonly taskName: string;
  readonly workflowId: string;
  readonly executionId: string;
  readonly previousTask?: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Result of task execution
 */
export interface TaskExecutionResult<TState extends FunctionalWorkflowState = FunctionalWorkflowState> {
  readonly state: Partial<TState>;
  readonly nextTasks?: readonly string[];
  readonly metadata?: Record<string, unknown>;
  readonly shouldCheckpoint?: boolean;
  readonly error?: Error;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult<TState extends FunctionalWorkflowState = FunctionalWorkflowState> {
  readonly finalState: TState;
  readonly executionPath: readonly string[];
  readonly executionTime: number;
  readonly checkpointCount: number;
  readonly error?: Error;
}

/**
 * Functional workflow definition
 */
export interface FunctionalWorkflowDefinition {
  readonly name: string;
  readonly entrypoint: string;
  readonly tasks: Map<string, TaskDefinition>;
  readonly dependencies: Map<string, readonly string[]>;
  readonly errorHandlers: Map<string, string>;
  readonly metadata: Record<string, unknown>;
}

/**
 * Task definition extracted from decorated methods
 */
export interface TaskDefinition {
  readonly name: string;
  readonly methodName: string;
  readonly dependencies: readonly string[];
  readonly isEntrypoint: boolean;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly errorHandler?: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Task dependency resolution result
 */
export interface TaskDependencyGraph {
  readonly tasks: Map<string, TaskDefinition>;
  readonly edges: Map<string, readonly string[]>;
  readonly entrypoint: string;
  readonly cycles: readonly string[][];
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  readonly initialState?: FunctionalWorkflowState;
  readonly timeout?: number;
  readonly checkpointInterval?: number;
  readonly enableStreaming?: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Streaming workflow event types
 */
export interface WorkflowStreamEvent<TState extends FunctionalWorkflowState = FunctionalWorkflowState> {
  readonly type: 'task_start' | 'task_complete' | 'task_error' | 'workflow_complete' | 'workflow_error' | 'checkpoint_saved';
  readonly taskName?: string;
  readonly state?: Partial<TState>;
  readonly error?: Error;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}