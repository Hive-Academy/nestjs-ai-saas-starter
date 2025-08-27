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
