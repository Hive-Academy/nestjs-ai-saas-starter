import type { RoutingToolConfig } from '../routing.types';

/**
 * Supervisor configuration following 2025 LangGraph patterns
 * Central supervisor coordinates worker agents using LLM-based routing
 */
export interface SupervisorConfig {
  /**
   * Supervisor system prompt
   * Defines supervisor behavior and routing logic
   */
  systemPrompt: string;

  /**
   * Worker agents managed by supervisor
   * List of agent IDs that supervisor can route to
   */
  workers: readonly string[];

  /**
   * LLM configuration for routing decisions
   * Optional - uses default LLM if not specified
   */
  llm?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };

  /**
   * Routing tool configuration
   * Defines the tool supervisor uses to make routing decisions
   */
  routingTool?: RoutingToolConfig;

  /**
   * Enable forward message tool
   * Allows supervisor to forward messages to workers
   */
  enableForwardMessage?: boolean;

  /**
   * Remove handoff messages from worker context
   * Filters out routing/handoff messages before passing to workers
   */
  removeHandoffMessages?: boolean;
}
