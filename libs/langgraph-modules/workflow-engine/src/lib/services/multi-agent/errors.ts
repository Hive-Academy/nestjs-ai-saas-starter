/**
 * Custom error classes for multi-agent graph builder failures
 *
 * These errors provide contextual information about graph building failures
 * and support error chaining for debugging complex failure scenarios.
 */

/**
 * Base error class for all multi-agent graph builder errors
 *
 * Thrown when graph construction fails for any reason. Supports error chaining
 * via the optional `cause` parameter to preserve the original error context.
 *
 * @example
 * ```typescript
 * throw new MultiAgentGraphBuilderError(
 *   'Failed to build graph for MySupervisor',
 *   originalError
 * );
 * ```
 */
export class MultiAgentGraphBuilderError extends Error {
  /**
   * Creates a multi-agent graph builder error
   *
   * @param message - Human-readable error description
   * @param cause - Optional original error that caused this failure
   */
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = 'MultiAgentGraphBuilderError';
    Error.captureStackTrace(this, MultiAgentGraphBuilderError);
  }
}

/**
 * Error thrown when supervisor pattern graph building fails
 *
 * Thrown by SupervisorGraphBuilder when:
 * - Invalid supervisor configuration (missing systemPrompt, workers)
 * - Worker agent configuration invalid (missing @Agent decorator)
 * - Tool schema generation fails
 * - LLM binding fails
 * - Graph structure construction fails
 *
 * @example
 * ```typescript
 * throw new SupervisorGraphBuilderError(
 *   'Supervisor systemPrompt is required'
 * );
 * ```
 */
export class SupervisorGraphBuilderError extends MultiAgentGraphBuilderError {
  /**
   * Creates a supervisor graph builder error
   *
   * @param message - Human-readable error description
   * @param cause - Optional original error that caused this failure
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'SupervisorGraphBuilderError';
    Error.captureStackTrace(this, SupervisorGraphBuilderError);
  }
}

/**
 * Error thrown when sequential pattern graph building fails
 *
 * Thrown by SequentialGraphBuilder when:
 * - Invalid sequential configuration (missing sequence array)
 * - Sequence array contains unknown agent IDs
 * - Agent classes missing @Agent decorator
 * - Agent workflow definitions empty (no @Node decorators)
 * - Subgraph compilation fails
 *
 * @example
 * ```typescript
 * throw new SequentialGraphBuilderError(
 *   'Sequential sequence contains unknown agent IDs: agent-x, agent-y'
 * );
 * ```
 */
export class SequentialGraphBuilderError extends MultiAgentGraphBuilderError {
  /**
   * Creates a sequential graph builder error
   *
   * @param message - Human-readable error description
   * @param cause - Optional original error that caused this failure
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'SequentialGraphBuilderError';
    Error.captureStackTrace(this, SequentialGraphBuilderError);
  }
}
