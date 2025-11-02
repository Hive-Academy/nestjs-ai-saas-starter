import type { Logger } from '@nestjs/common';
import type { AgentState } from '../interfaces/multi-agent.interface';

/**
 * Agent State Validation Utility
 *
 * Ensures AgentState has required properties for memory operations
 * Uses defensive programming to prevent 'unknown' fallback scenarios
 */

export class AgentStateValidationError extends Error {
  constructor(
    message: string,
    public readonly state: Partial<AgentState>,
    public readonly missingProperties: string[]
  ) {
    super(message);
    this.name = 'AgentStateValidationError';
  }
}

/**
 * Validation result with detailed diagnostic information
 */
export interface StateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  state: Partial<AgentState>;
}

/**
 * Validate AgentState for memory operations
 *
 * @param state - AgentState to validate
 * @param strict - If true, throw error on validation failure
 * @returns Validation result with diagnostic information
 */
export function validateAgentState(
  state: AgentState,
  strict = false
): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required for memory operations
  if (!state.threadId) {
    errors.push('threadId is required for memory operations');
  }

  if (!state.current) {
    errors.push('current agent ID is required for memory context');
  }

  // Recommended properties
  if (!state.messages || !Array.isArray(state.messages)) {
    warnings.push('messages array should be defined');
  }

  if (!state.metadata) {
    warnings.push('metadata object should be defined for execution tracking');
  }

  // Validate threadId format (should follow NODE_ID_STANDARD if generated properly)
  if (state.threadId && !isValidThreadId(state.threadId)) {
    warnings.push(
      `threadId "${state.threadId}" does not follow canonical NODE_ID_STANDARD pattern`
    );
  }

  const result: StateValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    state,
  };

  if (strict && !result.valid) {
    throw new AgentStateValidationError(
      `Invalid AgentState: ${errors.join(', ')}`,
      state,
      errors
    );
  }

  return result;
}

/**
 * Validate threadId format (basic check for canonical pattern)
 * Canonical pattern: <domain>|<phase>:<activity>[:<detail>]
 *
 * @param threadId - Thread ID to validate
 * @returns True if format looks canonical
 */
function isValidThreadId(threadId: string): boolean {
  // Basic validation: should contain pipe and colon for canonical format
  // Full validation would use parseNodeId from core, but this is sufficient
  return threadId.includes('|') && threadId.includes(':');
}

/**
 * Assert AgentState is valid (throws on failure)
 * Use in critical paths where state MUST be valid
 *
 * @param state - AgentState to validate
 * @param context - Context for error message (e.g., 'workflow execution')
 */
export function assertValidAgentState(
  state: AgentState,
  context = 'operation'
): void {
  validateAgentState(state, true);
}

/**
 * Validate and warn about AgentState issues
 * Logs warnings but doesn't throw errors
 *
 * @param state - AgentState to validate
 * @param logger - NestJS logger instance
 * @param context - Context for logging
 * @returns Validation result
 */
export function validateAndWarnAgentState(
  state: AgentState,
  logger: Logger,
  context = 'operation'
): StateValidationResult {
  const result = validateAgentState(state, false);

  if (!result.valid) {
    logger.error(`AgentState validation failed for ${context}:`, result.errors);
  }

  if (result.warnings.length > 0) {
    logger.warn(
      `AgentState validation warnings for ${context}:`,
      result.warnings
    );
  }

  return result;
}

/**
 * Create a default AgentState with proper initialization
 * Used as fallback when state is missing or invalid
 *
 * @param partial - Partial state to merge with defaults
 * @returns Valid AgentState with all required properties
 */
export function createDefaultAgentState(
  partial: Partial<AgentState> = {}
): AgentState {
  return {
    messages: [],
    threadId: `fallback-thread-${Date.now()}`,
    current: 'default-agent',
    metadata: {},
    ...partial,
  };
}
