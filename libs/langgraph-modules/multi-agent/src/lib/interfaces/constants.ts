/**
 * Constants for multi-agent operations (2025 standards)
 * Centralized constants used across multi-agent module
 */
export const MULTI_AGENT_CONSTANTS = {
  /**
   * Special node name for ending execution
   * LangGraph reserved keyword
   */
  END: '__end__',

  /**
   * Default supervisor system prompt (2025 optimized)
   * Template prompt for supervisor agents
   */
  DEFAULT_SUPERVISOR_PROMPT: `You are a supervisor tasked with managing a conversation between the following workers: {workers}.

Given the following user request, respond with the worker to act next.
Each worker will perform a task and respond with their results and status.

When finished, respond with FINISH.

Workers:
{worker_descriptions}`,

  /**
   * Default routing tool name
   * Tool name used by supervisor for routing decisions
   */
  DEFAULT_ROUTING_TOOL: 'route',

  /**
   * Default handoff tool prefix
   * Prefix for dynamically generated handoff tools (e.g., 'transfer_to_researcher')
   */
  DEFAULT_HANDOFF_TOOL_PREFIX: 'transfer_to_',

  /**
   * Default forward message tool
   * Tool name for forwarding messages to workers
   */
  DEFAULT_FORWARD_MESSAGE_TOOL: 'forward_message',

  /**
   * Router node name for swarm pattern
   * Special node that tracks active agent in swarm
   */
  ROUTER_NODE: '__router__',

  /**
   * Start node name
   * LangGraph reserved keyword for entry point
   */
  START: '__start__',

  /**
   * Default maximum handoff rounds for swarm pattern
   * Prevents infinite handoff loops
   */
  DEFAULT_MAX_HANDOFF_ROUNDS: 10,

  /**
   * Default maximum routing hops for network pattern
   * Prevents infinite routing loops
   */
  DEFAULT_MAX_ROUTING_HOPS: 10,
} as const;

/**
 * Metadata key constants for multi-agent state
 * Standard keys used in AgentState.metadata
 */
export const METADATA_KEYS = {
  /**
   * Currently active agent in swarm pattern
   */
  ACTIVE_AGENT: 'active_agent',

  /**
   * Agent that initiated handoff
   */
  HANDOFF_FROM: 'handoff_from',

  /**
   * Task description for handoff target
   */
  HANDOFF_TASK: 'handoff_task',

  /**
   * Current handoff round counter
   */
  HANDOFF_ROUND: 'handoff_round',

  /**
   * Last agent that executed
   */
  LAST_AGENT: 'lastAgent',

  /**
   * Handoff reason/decision explanation
   */
  HANDOFF_REASON: 'handoffReason',

  /**
   * Maximum rounds exceeded flag
   */
  MAX_ROUNDS_EXCEEDED: 'maxRoundsExceeded',

  /**
   * Routing history for network pattern
   */
  ROUTING_HISTORY: 'routingHistory',

  /**
   * Routing hop counter
   */
  ROUTING_HOP: 'routingHop',
} as const;
