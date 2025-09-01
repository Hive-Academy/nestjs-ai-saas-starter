/**
 * State management interfaces for workflow execution
 * These interfaces define how state is handled throughout workflow execution
 */

/**
 * Base state interface that all workflow states should implement
 */
export interface BaseWorkflowState {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * State transformer function type for modifying state during transitions
 */
export type StateTransformer<TState = unknown> = (
  currentState: TState,
  incomingState: Partial<TState>
) => TState;

/**
 * State validator function type for validating state changes
 */
export type StateValidator<TState = unknown> = (
  state: TState
) => Promise<boolean>;

/**
 * State persistence options
 */
export interface StatePersistenceOptions {
  readonly enabled: boolean;
  readonly storageKey?: string;
  readonly ttl?: number; // Time to live in milliseconds
  readonly compression?: boolean;
}

/**
 * State management configuration
 */
export interface StateManagementConfig<TState = unknown> {
  readonly initialState?: Partial<TState>;
  readonly transformer?: StateTransformer<TState>;
  readonly validator?: StateValidator<TState>;
  readonly persistence?: StatePersistenceOptions;
  readonly immutable?: boolean;
  readonly deepMerge?: boolean;
}

/**
 * State change event data
 */
export interface StateChangeEvent<TState = unknown> {
  readonly previousState: TState;
  readonly currentState: TState;
  readonly changeType: 'update' | 'replace' | 'merge';
  readonly timestamp: Date;
  readonly nodeId?: string;
  readonly userId?: string;
}

/**
 * State manager interface for managing workflow state
 */
export interface StateManager<TState = unknown> {
  /**
   * Get the current state
   */
  getCurrentState: () => Promise<TState>;

  /**
   * Update the state with partial changes
   */
  updateState: (changes: Partial<TState>) => Promise<TState>;

  /**
   * Replace the entire state
   */
  replaceState: (newState: TState) => Promise<TState>;

  /**
   * Reset state to initial values
   */
  resetState: () => Promise<TState>;

  /**
   * Subscribe to state changes
   */
  onStateChange: (
    callback: (event: StateChangeEvent<TState>) => void
  ) => () => void;

  /**
   * Get state history if persistence is enabled
   */
  getStateHistory: () => Promise<Array<StateChangeEvent<TState>>>;

  /**
   * Validate the current state
   */
  validateState: () => Promise<boolean>;
}

/**
 * State snapshot for checkpointing
 */
export interface StateSnapshot<TState = unknown> {
  readonly id: string;
  readonly state: TState;
  readonly timestamp: Date;
  readonly version: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * State recovery options
 */
export interface StateRecoveryOptions {
  readonly snapshotId?: string;
  readonly version?: number;
  readonly timestamp?: Date;
  readonly validateAfterRecovery?: boolean;
}

/**
 * Human feedback interface for state management
 */
export interface HumanFeedback {
  readonly approved: boolean;
  readonly status: 'approved' | 'rejected' | 'needs_revision' | 'pending';
  readonly confidence?: number;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Risk assessment interface for workflow state
 */
export interface WorkflowRisk {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly type: string;
  readonly description: string;
}

/**
 * Workflow error interface for state management
 */
export interface WorkflowError {
  readonly id: string;
  readonly nodeId: string;
  readonly type:
    | 'execution'
    | 'validation'
    | 'timeout'
    | 'permission'
    | 'unknown';
  readonly message: string;
  readonly stackTrace?: string;
  readonly context?: Record<string, unknown>;
  readonly isRecoverable: boolean;
  readonly suggestedRecovery?: string;
  readonly timestamp: Date;
}

/**
 * Workflow timestamps interface
 */
export interface WorkflowTimestamps {
  readonly started: Date;
  readonly updated?: Date;
  readonly completed?: Date;
}

/**
 * Workflow state interface that extends BaseWorkflowState with comprehensive workflow properties
 * This interface is used for state management in workflows and includes all properties needed for workflow execution
 */
export interface WorkflowState extends BaseWorkflowState {
  // Core workflow properties
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
  readonly timestamps: WorkflowTimestamps;

  // Node and routing properties
  readonly currentNode?: string;
  readonly previousNode?: string;
  readonly nextNode?: string;
  readonly completedNodes: string[];

  // Human-in-the-loop properties
  readonly humanFeedback?: HumanFeedback;
  readonly requiresApproval?: boolean;
  readonly approvalReceived?: boolean;
  readonly waitingForApproval?: boolean;
  readonly rejectionReason?: string;

  // Error handling properties
  readonly error?: WorkflowError;
  readonly lastError?: WorkflowError;

  // Risk and assessment properties
  readonly risks?: WorkflowRisk[];

  // Messages and data (using any for compatibility with existing code)
  readonly messages?: any[];

  // Allow additional custom properties for extensibility
  readonly [key: string]: unknown;
}
