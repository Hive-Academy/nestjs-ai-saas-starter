import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * AgentState Annotation for Multi-Agent Workflows
 *
 * This annotation defines the standard state structure for multi-agent coordination
 * patterns (supervisor, swarm, hierarchical) following LangGraph 2025 best practices.
 *
 * Pattern Source: libs/langgraph-modules/core/src/lib/annotations/workflow-state.annotation.ts
 * LangChain Docs: https://langchain-ai.github.io/langgraphjs/concepts/low_level/#state
 *
 * Usage:
 * ```typescript
 * import { AgentStateAnnotation } from '@hive-academy/langgraph-core';
 * import { StateGraph } from '@langchain/langgraph';
 *
 * const graph = new StateGraph(AgentStateAnnotation);
 * ```
 *
 * Extending for custom state:
 * ```typescript
 * const CustomStateAnnotation = Annotation.Root({
 *   ...AgentStateAnnotation.spec,
 *   customField: Annotation<string>({
 *     reducer: (current, update) => update ?? current,
 *     default: () => '',
 *   }),
 * });
 * ```
 */
export const AgentStateAnnotation = Annotation.Root({
  /**
   * Message history - core component of LangGraph multi-agent systems
   * Maintains conversation context across agent handoffs
   *
   * Reducer: Concatenates new messages to existing history
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (current: BaseMessage[], update: BaseMessage[]) => [
      ...current,
      ...update,
    ],
    default: () => [],
  }),

  /**
   * Next agent to execute (used by supervisor pattern)
   * Set by supervisor or routing logic to control flow
   *
   * Reducer: Latest value wins (update overrides current)
   */
  next: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  /**
   * Current agent executing
   * Tracks the agent currently processing the workflow
   *
   * Reducer: Latest value wins
   */
  current: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  /**
   * Shared scratch pad for agent collaboration
   * Agents can write temporary notes for other agents
   *
   * Reducer: Latest value wins (allows agents to overwrite)
   */
  scratchpad: Annotation<string>({
    reducer: (current: string, update: string) => update ?? current,
    default: () => '',
  }),

  /**
   * Task description passed between agents
   * Describes the current task or objective
   *
   * Reducer: Latest value wins
   */
  task: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  /**
   * Thread ID for memory context and checkpointing
   * Links this execution to persistent storage
   *
   * Reducer: Latest value wins (first thread ID usually sticks)
   */
  threadId: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  /**
   * User ID for memory context and personalization
   * Associates workflow execution with a specific user
   *
   * Reducer: Latest value wins
   */
  userId: Annotation<string | undefined>({
    reducer: (current: string | undefined, update: string | undefined) =>
      update ?? current,
    default: () => undefined,
  }),

  /**
   * Agent metadata and context
   * Enhanced with swarm pattern support
   *
   * Reducer: Deep merge (preserves existing keys, updates with new keys)
   */
  metadata: Annotation<Record<string, unknown>>({
    reducer: (
      current: Record<string, unknown>,
      update: Record<string, unknown>
    ) => ({
      ...current,
      ...update,
    }),
    default: () => ({}),
  }),
});

/**
 * TypeScript type derived from AgentStateAnnotation
 * Use this type for type safety in agent node functions
 *
 * @example
 * ```typescript
 * async function myAgentNode(state: AgentState): Promise<Partial<AgentState>> {
 *   return {
 *     messages: [...state.messages, newMessage],
 *     next: 'next-agent',
 *   };
 * }
 * ```
 */
export type AgentState = typeof AgentStateAnnotation.State;

/**
 * Create custom state annotation extending AgentStateAnnotation
 * Use this for multi-agent workflows with additional state fields
 *
 * @param customFields - Additional fields to add to the state
 * @returns Annotation.Root with base agent state + custom fields
 *
 * @example
 * ```typescript
 * const SwarmStateAnnotation = createCustomAgentStateAnnotation({
 *   handoffRound: Annotation<number>({
 *     reducer: (current, update) => update,
 *     default: () => 0,
 *   }),
 * });
 * ```
 */
export function createCustomAgentStateAnnotation<
  TCustomFields extends Record<string, any> = Record<string, any>
>(customFields: TCustomFields) {
  return Annotation.Root({
    ...AgentStateAnnotation.spec,
    ...customFields,
  });
}
