/**
 * ExecutionState Model
 *
 * Represents the current state of a LangGraph workflow execution.
 * Evidence: implementation-plan.md:587-622 (State Type Definitions)
 *
 * @remarks
 * - Tracks workflow lifecycle from idle → running → completed/error
 * - Used by DevBrandWorkflowStateService for state management
 * - Integrates with WebSocket streaming for real-time status updates
 *
 * @public
 */

/**
 * ExecutionStatus Type
 *
 * Discriminated union representing all possible execution states.
 *
 * @remarks
 * - idle: No workflow currently executing
 * - running: Workflow actively processing
 * - paused: Workflow suspended (e.g., HITL interruption)
 * - completed: Workflow finished successfully
 * - error: Workflow encountered fatal error
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
 * ExecutionState Interface
 *
 * Complete state representation for workflow execution tracking.
 *
 * @remarks
 * - status: Current execution phase (discriminator for state machine)
 * - currentStep: Current step number in workflow sequence (1-based indexing)
 * - totalSteps: Total number of steps in workflow (for progress calculation)
 * - startTime: Workflow start timestamp (null if not started)
 * - endTime: Workflow completion/error timestamp (null if not finished)
 * - error: Error message if status is 'error' (null otherwise)
 *
 * @example
 * ```typescript
 * // Initial state
 * const idleState: ExecutionState = {
 *   status: 'idle',
 *   currentStep: 0,
 *   totalSteps: 0,
 *   startTime: null,
 *   endTime: null,
 *   error: null
 * };
 *
 * // Running state
 * const runningState: ExecutionState = {
 *   status: 'running',
 *   currentStep: 2,
 *   totalSteps: 5,
 *   startTime: new Date('2025-10-28T16:00:00Z'),
 *   endTime: null,
 *   error: null
 * };
 *
 * // Error state
 * const errorState: ExecutionState = {
 *   status: 'error',
 *   currentStep: 3,
 *   totalSteps: 5,
 *   startTime: new Date('2025-10-28T16:00:00Z'),
 *   endTime: new Date('2025-10-28T16:05:00Z'),
 *   error: 'GitHub API rate limit exceeded'
 * };
 * ```
 *
 * @public
 */
export interface ExecutionState {
  /**
   * Current execution status
   *
   * @remarks
   * - Use for UI state discrimination (loading indicators, completion messages)
   * - Transitions: idle → running → (paused →) completed/error
   */
  status: ExecutionStatus;

  /**
   * Current step in workflow sequence
   *
   * @remarks
   * - 0-based indexing (0 = not started, 1 = first step)
   * - Increments as workflow progresses through agents
   * - Used for progress bar calculation: (currentStep / totalSteps) * 100
   */
  currentStep: number;

  /**
   * Total number of steps in workflow
   *
   * @remarks
   * - For DevBrand workflow: typically 3 (one per agent)
   * - Set when workflow starts (based on agent count)
   * - Used for progress percentage calculation
   */
  totalSteps: number;

  /**
   * Workflow start timestamp
   *
   * @remarks
   * - Set when status transitions to 'running'
   * - null if workflow not started
   * - Used for elapsed time calculation
   */
  startTime: Date | null;

  /**
   * Workflow end timestamp
   *
   * @remarks
   * - Set when status transitions to 'completed' or 'error'
   * - null if workflow still running
   * - Used for total execution time calculation
   */
  endTime: Date | null;

  /**
   * Error message if execution failed
   *
   * @remarks
   * - null if status is not 'error'
   * - Contains human-readable error description
   * - Display in UI for troubleshooting
   * - Example: "GitHub API rate limit exceeded", "WebSocket connection lost"
   */
  error: string | null;
}
