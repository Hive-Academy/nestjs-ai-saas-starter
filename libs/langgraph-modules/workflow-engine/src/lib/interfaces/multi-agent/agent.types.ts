import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';

/**
 * Agent metadata with swarm pattern support
 * Enhanced to support LangGraph 2025 Command pattern and swarm handoffs
 */
export interface AgentMetadata {
  /**
   * Currently active agent in swarm pattern
   * Tracks which agent is currently executing in peer-to-peer coordination
   */
  active_agent?: string;

  /**
   * Agent that initiated the handoff (swarm pattern)
   * Used for context propagation and handoff chain tracking
   */
  handoff_from?: string;

  /**
   * Task description for the handoff target
   * Provides context for the agent receiving the handoff
   */
  handoff_task?: string;

  /**
   * Handoff round counter
   * Tracks number of handoffs to prevent infinite loops
   */
  handoff_round?: number;

  /**
   * Last agent that executed
   * Used for routing and execution history
   */
  lastAgent?: string;

  /**
   * Handoff reason or decision explanation
   * Provides transparency in agent coordination
   */
  handoffReason?: string;

  /**
   * Additional metadata fields
   * Extensible for custom agent metadata
   */
  [key: string]: unknown;
}

/**
 * LangGraph-compatible agent state following 2025 best practices
 * Core state interface for all multi-agent workflows
 */
export interface AgentState extends Record<string, unknown> {
  /**
   * Message history - core component of LangGraph multi-agent systems
   * Maintains conversation context across agent handoffs
   */
  messages: BaseMessage[];

  /**
   * Next agent to execute (used by supervisor pattern)
   * Set by supervisor or routing logic to control flow
   */
  next?: string;

  /**
   * Current agent executing
   * Tracks the agent currently processing the workflow
   */
  current?: string;

  /**
   * Shared scratch pad for agent collaboration
   * Agents can write temporary notes for other agents
   */
  scratchpad?: string;

  /**
   * Task description passed between agents
   * Describes the current task or objective
   */
  task?: string;

  /**
   * Thread ID for memory context and checkpointing
   * Links this execution to persistent storage
   */
  threadId?: string;

  /**
   * User ID for memory context and personalization
   * Associates workflow execution with a specific user
   */
  userId?: string;

  /**
   * Agent metadata and context
   * Enhanced with swarm pattern support
   */
  metadata?: AgentMetadata;
}

/**
 * Agent node function signature following LangGraph patterns
 * Standard function signature for agent execution
 */
export type AgentNodeFunction = (
  state: AgentState,
  config?: RunnableConfig
) => Promise<Partial<AgentState>>;

/**
 * Command object for LangGraph handoffs (2025 pattern)
 * Supports dynamic routing, state updates, and graph navigation
 */
export interface AgentCommand {
  /**
   * Target node/agent to navigate to
   * Supports special values: '__end__', 'supervisor', agent IDs
   */
  goto: string;

  /**
   * State updates to apply
   * Partial state changes applied before transition
   */
  update?: Partial<AgentState>;

  /**
   * Graph context (PARENT, CURRENT, or subgraph name)
   * Enables hierarchical graph navigation
   */
  graph?: 'PARENT' | 'CURRENT' | string;
}

/**
 * Agent definition with LangGraph integration (2025 pattern)
 * Complete agent metadata and configuration
 */
export interface AgentDefinition {
  /**
   * Unique agent identifier
   * Used for routing and registration
   */
  id: string;

  /**
   * Agent name for routing decisions
   * Human-readable name for LLM routing
   */
  name: string;

  /**
   * Agent description for supervisor routing
   * Helps supervisor understand agent capabilities
   */
  description: string;

  /**
   * System prompt for this agent
   * Defines agent behavior and personality
   */
  systemPrompt?: string;

  /**
   * Tools available to this agent
   * LangChain tools the agent can invoke
   */
  tools?: unknown[];

  /**
   * Handoff tools for swarm patterns
   * Tools that enable peer-to-peer handoffs
   */
  handoffTools?: HandoffTool[];

  /**
   * Agent capabilities for discovery and routing
   * Tags describing what the agent can do
   */
  capabilities?: string[];

  /**
   * Agent node function
   * Main execution function for this agent
   */
  nodeFunction: AgentNodeFunction;

  /**
   * Agent metadata
   * Additional configuration and context
   */
  metadata?: Record<string, unknown>;
}

/**
 * Handoff tool definition for swarm patterns
 * Tool that enables agent-to-agent handoffs
 *
 * @example
 * ```typescript
 * const handoffTool: HandoffTool = {
 *   name: 'transfer_to_researcher',
 *   description: 'Transfer control to the researcher agent for deep analysis',
 *   targetAgent: 'researcher',
 *   schema: z.object({ reason: z.string() }),
 *   contextFilter: (state) => ({ messages: state.messages })
 * };
 * ```
 */
export interface HandoffTool {
  /**
   * Tool name (e.g., "transfer_to_researcher")
   * Must be unique within the agent's tool set
   */
  name: string;

  /**
   * Tool description for LLM
   * Explains when and how to use this handoff
   */
  description: string;

  /**
   * Target agent for handoff
   * Agent ID that will receive control
   */
  targetAgent: string;

  /**
   * Tool schema for validation
   * Zod schema for handoff parameters
   */
  schema?: unknown;

  /**
   * Context filter function
   * Transforms state before passing to target agent
   * Used for context isolation in swarm patterns
   */
  contextFilter?: (state: AgentState) => Partial<AgentState>;

  /**
   * Additional metadata
   * Extensible for custom handoff configuration
   */
  metadata?: {
    /**
     * Whether this tool was created by official @langchain/langgraph-swarm
     */
    official?: boolean;

    /**
     * Source package that created this tool
     */
    source?: string;

    /**
     * Reference to the actual LangChain DynamicStructuredTool
     * When official=true, this contains the tool from createHandoffTool()
     */
    officialTool?: unknown;

    [key: string]: unknown;
  };
}
