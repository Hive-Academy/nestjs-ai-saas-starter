/**
 * Multi-agent specific errors (2025 pattern)
 * Centralized error classes for multi-agent module
 */

/**
 * Base error class for multi-agent operations
 * All multi-agent errors extend this class
 */
export class MultiAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MultiAgentError';
    Object.setPrototypeOf(this, MultiAgentError.prototype);
  }
}

/**
 * Agent not found error
 * Thrown when attempting to route to non-existent agent
 */
export class AgentNotFoundError extends MultiAgentError {
  constructor(agentId: string, details?: unknown) {
    super(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND', details);
    this.name = 'AgentNotFoundError';
    Object.setPrototypeOf(this, AgentNotFoundError.prototype);
  }
}

/**
 * Network configuration error
 * Thrown when multi-agent network configuration is invalid
 */
export class NetworkConfigurationError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_CONFIGURATION_ERROR', details);
    this.name = 'NetworkConfigurationError';
    Object.setPrototypeOf(this, NetworkConfigurationError.prototype);
  }
}

/**
 * Routing error
 * Thrown when agent routing fails
 */
export class RoutingError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'ROUTING_ERROR', details);
    this.name = 'RoutingError';
    Object.setPrototypeOf(this, RoutingError.prototype);
  }
}

/**
 * Handoff error
 * Thrown when agent handoff fails in swarm pattern
 */
export class HandoffError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'HANDOFF_ERROR', details);
    this.name = 'HandoffError';
    Object.setPrototypeOf(this, HandoffError.prototype);
  }
}

/**
 * Workflow execution error
 * Thrown when multi-agent workflow execution fails
 */
export class WorkflowExecutionError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'WORKFLOW_EXECUTION_ERROR', details);
    this.name = 'WorkflowExecutionError';
    Object.setPrototypeOf(this, WorkflowExecutionError.prototype);
  }
}

/**
 * Command processing error
 * Thrown when Command object processing fails
 */
export class CommandProcessingError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'COMMAND_PROCESSING_ERROR', details);
    this.name = 'CommandProcessingError';
    Object.setPrototypeOf(this, CommandProcessingError.prototype);
  }
}

/**
 * Maximum rounds exceeded error
 * Thrown when handoff/routing rounds exceed configured limit
 */
export class MaxRoundsExceededError extends MultiAgentError {
  constructor(maxRounds: number, currentRound: number, details?: unknown) {
    super(
      `Maximum rounds (${maxRounds}) exceeded. Current round: ${currentRound}`,
      'MAX_ROUNDS_EXCEEDED',
      details
    );
    this.name = 'MaxRoundsExceededError';
    Object.setPrototypeOf(this, MaxRoundsExceededError.prototype);
  }
}
