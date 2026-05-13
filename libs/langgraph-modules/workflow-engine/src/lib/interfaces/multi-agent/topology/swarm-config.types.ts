/**
 * Swarm configuration for peer-to-peer agent networks (2025 pattern)
 * Enables decentralized agent collaboration with handoff tools
 */
export interface SwarmConfig {
  /**
   * Enable dynamic handoffs between any agents
   * When true, agents can transfer control to peers using handoff tools
   */
  enableDynamicHandoffs: boolean;

  /**
   * Message history management
   * Controls how messages are stored and filtered in swarm pattern
   */
  messageHistory: {
    /**
     * Remove handoff messages from agent context
     * Filters out transfer_to_* tool calls from message history
     */
    removeHandoffMessages: boolean;

    /**
     * Add agent attribution to messages
     * Tags messages with agent name/ID for transparency
     */
    addAgentAttribution: boolean;

    /**
     * Maximum message history per agent
     * Limits context window size (undefined = unlimited)
     */
    maxMessages?: number;
  };

  /**
   * Context isolation settings
   * Controls state sharing between agents
   */
  contextIsolation: {
    /**
     * Enable per-agent memory isolation
     * When true, agents have isolated state contexts
     */
    enabled: boolean;

    /**
     * Shared context keys accessible to all agents
     * List of state keys that bypass isolation (e.g., ['messages', 'userId'])
     */
    sharedKeys?: string[];
  };
}
