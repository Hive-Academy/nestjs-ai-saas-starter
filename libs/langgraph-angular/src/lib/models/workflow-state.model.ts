/**
 * Possible execution statuses for a LangGraph workflow.
 *
 * @remarks
 * - `idle`: No workflow is running
 * - `running`: Workflow is actively executing
 * - `paused`: Workflow is paused (e.g., waiting for HITL approval)
 * - `completed`: Workflow finished successfully
 * - `error`: Workflow encountered a fatal error
 *
 * @public
 */
export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error';

/**
 * Execution state for tracking workflow lifecycle.
 *
 * @remarks
 * Generalized from the POC's execution state model.
 * No hardcoded `totalSteps` or domain-specific values.
 * Steps are dynamically updated as the workflow progresses.
 *
 * @public
 */
export interface ExecutionState {
  /** Current execution status */
  status: ExecutionStatus;
  /** Unique identifier for the current workflow execution */
  executionId?: string;
  /** Current step number in the workflow */
  currentStep: number;
  /** Total number of steps (dynamically updated, 0 if unknown) */
  totalSteps: number;
  /** Timestamp when execution started */
  startTime: Date | null;
  /** Timestamp when execution ended */
  endTime: Date | null;
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Possible agent statuses within a workflow.
 *
 * @remarks
 * - `idle`: Agent has not started
 * - `thinking`: Agent is processing/reasoning
 * - `executing`: Agent is performing actions
 * - `waiting`: Agent is waiting for input or approval
 * - `completed`: Agent finished its work
 * - `error`: Agent encountered an error
 *
 * @public
 */
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'completed'
  | 'error';

/**
 * Progress tracking for an individual agent/node in the workflow.
 *
 * @remarks
 * Generic agent progress - no hardcoded agent IDs or names.
 * Agents are dynamically discovered from stream events.
 *
 * @public
 */
export interface AgentProgress {
  /** Unique identifier for this agent */
  agentId: string;
  /** Display name for this agent */
  agentName: string;
  /** Current agent status */
  status: AgentStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Description of current action, or null if idle */
  currentAction: string | null;
  /** Timestamp of last status update */
  lastUpdate: Date;
}

/**
 * Base workflow state that consumers extend with `TState`.
 *
 * @remarks
 * Contains common fields present in any LangGraph workflow execution.
 * Application-specific state should extend this interface:
 *
 * ```typescript
 * interface MyWorkflowState extends BaseWorkflowState {
 *   customField: string;
 *   results: MyResult[];
 * }
 * ```
 *
 * @public
 */
export interface BaseWorkflowState {
  /** Unique identifier for this workflow execution */
  executionId: string;
  /** Current workflow status */
  status: ExecutionStatus;
  /** Timestamp when execution started */
  startTime: Date | null;
  /** Timestamp when execution ended */
  endTime: Date | null;
  /** Error message if status is 'error' */
  error: string | null;
}

/**
 * Human-in-the-loop approval request.
 *
 * @remarks
 * Represents a pending approval request from a workflow that has
 * been interrupted and is waiting for human decision. The workflow
 * resumes via `Command({ resume: value })` after approval/rejection.
 *
 * @public
 */
export interface HITLApproval {
  /** Unique identifier for this approval request */
  id: string;
  /** Execution ID of the interrupted workflow */
  executionId: string;
  /** Agent that requested approval */
  agentId: string;
  /** Human-readable message describing what needs approval */
  message: string;
  /** Additional context for the approval decision */
  context: unknown;
  /** Timestamp when approval was requested */
  requestedAt: Date;
  /** Current approval status */
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Creates an initial idle execution state.
 *
 * @remarks
 * Factory function that returns a clean `ExecutionState` with
 * all values reset to their defaults. Used when initializing
 * or resetting workflow state.
 *
 * @returns A fresh `ExecutionState` in idle status
 *
 * @example
 * ```typescript
 * const state = createInitialExecutionState();
 * // { status: 'idle', currentStep: 0, totalSteps: 0, ... }
 * ```
 *
 * @public
 */
export function createInitialExecutionState(): ExecutionState {
  return {
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
    startTime: null,
    endTime: null,
    error: null,
  };
}
