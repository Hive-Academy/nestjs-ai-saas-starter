/**
 * State Validator Utilities - Compile-Time and Runtime Type Safety
 *
 * Purpose: Prevent undefined state access errors by providing:
 * 1. Runtime validation with clear error messages
 * 2. TypeScript type guards for compile-time safety
 * 3. Sensible defaults for missing state properties
 *
 * This addresses the critical issue where accessing state.messages or state.metadata
 * throws "Cannot read properties of undefined" errors.
 */

import type { AgentState } from '../interfaces/agent.types';

/**
 * Runtime error for invalid state
 */
export class InvalidAgentStateError extends Error {
  constructor(message: string, public readonly receivedState: any) {
    super(`Invalid AgentState: ${message}`);
    this.name = 'InvalidAgentStateError';
  }
}

/**
 * Type guard to check if state is a valid AgentState
 * Compile-time safety via TypeScript type narrowing
 */
export function isValidAgentState(state: any): state is AgentState {
  return (
    state !== null &&
    state !== undefined &&
    typeof state === 'object' &&
    Array.isArray(state.messages)
  );
}

/**
 * Validate state and throw descriptive error if invalid
 * Runtime safety with clear error messages
 *
 * @param state - State to validate
 * @param context - Context for error message (e.g., function name)
 * @throws InvalidAgentStateError if state is invalid
 */
export function validateAgentState(
  state: any,
  context: string
): asserts state is AgentState {
  if (state === undefined) {
    throw new InvalidAgentStateError(
      `State is undefined in ${context}. This indicates a workflow execution error where state was not properly initialized.`,
      state
    );
  }

  if (state === null) {
    throw new InvalidAgentStateError(
      `State is null in ${context}. This indicates a workflow execution error where state was not properly initialized.`,
      state
    );
  }

  if (typeof state !== 'object') {
    throw new InvalidAgentStateError(
      `State is not an object in ${context}. Received type: ${typeof state}`,
      state
    );
  }

  if (!Array.isArray(state.messages)) {
    throw new InvalidAgentStateError(
      `State.messages is not an array in ${context}. ` +
        `Received: ${typeof state.messages}. ` +
        `AgentState requires a 'messages' array property.`,
      state
    );
  }
}

/**
 * Ensure state has required properties with sensible defaults
 * Defensive programming - provide defaults instead of crashing
 *
 * @param state - Potentially incomplete state
 * @returns State with guaranteed required properties
 */
export function ensureAgentState(
  state: Partial<AgentState> | undefined | null
): AgentState {
  if (!state) {
    return {
      messages: [],
      metadata: {},
    };
  }

  return {
    messages: Array.isArray(state.messages) ? state.messages : [],
    metadata:
      state.metadata && typeof state.metadata === 'object'
        ? state.metadata
        : {},
    ...state,
  };
}

/**
 * Safe accessor for state.metadata with default
 * Prevents "Cannot read properties of undefined (reading 'metadata')" errors
 *
 * @param state - Agent state (may be undefined)
 * @param defaultMetadata - Default metadata if state or state.metadata is undefined
 * @returns Metadata object (guaranteed non-undefined)
 */
export function getStateMetadata(
  state: AgentState | undefined | null,
  defaultMetadata: Record<string, any> = {}
): Record<string, any> {
  if (!state || !state.metadata || typeof state.metadata !== 'object') {
    return defaultMetadata;
  }
  return state.metadata;
}

/**
 * Safe accessor for state.messages with default
 * Prevents "Cannot read properties of undefined (reading 'messages')" errors
 *
 * @param state - Agent state (may be undefined)
 * @param defaultMessages - Default messages if state or state.messages is undefined
 * @returns Messages array (guaranteed non-undefined)
 */
export function getStateMessages(
  state: AgentState | undefined | null,
  defaultMessages: any[] = []
): any[] {
  if (!state || !Array.isArray(state.messages)) {
    return defaultMessages;
  }
  return state.messages;
}

/**
 * Create a default AgentState for testing or fallback scenarios
 *
 * @param overrides - Partial state to override defaults
 * @returns Complete AgentState with sensible defaults
 */
export function createDefaultAgentState(
  overrides: Partial<AgentState> = {}
): AgentState {
  return {
    messages: [],
    metadata: {},
    ...overrides,
  };
}
