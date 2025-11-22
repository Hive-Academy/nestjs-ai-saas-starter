import type { AgentState } from '../agent.types';

/**
 * Network configuration for all-to-all agent communication (2025 pattern)
 * Each agent can communicate with any other agent via LLM-based routing
 */
export interface NetworkConfig {
  /**
   * Enable LLM-based routing for each agent
   * When true, each agent uses its own LLM to decide next agent
   */
  enableLlmRouting: boolean;

  /**
   * Routing strategy for network pattern
   * Determines how agents decide which peer to route to
   */
  routingStrategy: 'llm' | 'rules' | 'hybrid';

  /**
   * Routing rules for rule-based or hybrid strategies
   * Maps conditions to target agents
   */
  routingRules?: Array<{
    /**
     * Condition function to evaluate
     * Returns true if this rule should apply
     */
    condition: (state: AgentState) => boolean;

    /**
     * Target agent if condition is true
     * Agent ID to route to
     */
    targetAgent: string;

    /**
     * Priority for rule evaluation
     * Higher priority rules evaluated first
     */
    priority?: number;
  }>;

  /**
   * Communication topology
   * Defines which agents can communicate directly
   * Default: 'full-mesh' (all-to-all)
   */
  topology?: 'full-mesh' | 'partial-mesh' | 'custom';

  /**
   * Custom communication matrix (for 'custom' topology)
   * Maps agent IDs to allowed target agent IDs
   * Example: { 'agent1': ['agent2', 'agent3'], 'agent2': ['agent1'] }
   */
  communicationMatrix?: Record<string, string[]>;

  /**
   * Enable routing history tracking
   * Tracks which agents have been visited to prevent loops
   */
  trackRoutingHistory?: boolean;

  /**
   * Maximum routing hops
   * Prevents infinite routing loops (default: 10)
   */
  maxRoutingHops?: number;
}
