/**
 * Routing decision from supervisor (2025 pattern)
 * Returned by supervisor LLM to determine next agent
 */
export interface RoutingDecision {
  /**
   * Next agent to execute
   * Agent ID that should handle the task
   */
  next: string;

  /**
   * Reasoning for the decision
   * Explains why this agent was chosen
   */
  reasoning?: string;

  /**
   * Task description for next agent
   * Context about what the agent should do
   */
  task?: string;
}

/**
 * Routing tool configuration for supervisor pattern
 * Defines the LLM tool used for routing decisions
 */
export interface RoutingToolConfig {
  /**
   * Tool name (default: 'route')
   */
  name: string;

  /**
   * Tool description for LLM
   * Explains when and how to use routing
   */
  description: string;
}
