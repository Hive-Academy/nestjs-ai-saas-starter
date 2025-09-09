import { z } from 'zod';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';

/**
 * LangGraph-compatible agent state following 2025 best practices
 */
export interface AgentState {
  /**
   * Message history - core component of LangGraph multi-agent systems
   */
  messages: BaseMessage[];

  /**
   * Next agent to execute (used by supervisor pattern)
   */
  next?: string;

  /**
   * Current agent executing
   */
  current?: string;

  /**
   * Shared scratch pad for agent collaboration
   */
  scratchpad?: string;

  /**
   * Task description passed between agents
   */
  task?: string;

  /**
   * Agent metadata and context
   */
  metadata?: Record<string, unknown>;
}

/**
 * Agent node function signature following LangGraph patterns
 */
export type AgentNodeFunction = (
  state: AgentState,
  config?: RunnableConfig
) => Promise<Partial<AgentState>>;

/**
 * Command object for LangGraph handoffs (2025 pattern)
 */
export interface AgentCommand {
  /**
   * Target node/agent to navigate to
   */
  goto: string;

  /**
   * State updates to apply
   */
  update?: Partial<AgentState>;

  /**
   * Graph context (PARENT, current, etc.)
   */
  graph?: 'PARENT' | 'CURRENT' | string;
}

/**
 * Routing decision from supervisor (2025 pattern)
 */
export interface RoutingDecision {
  /**
   * Next agent to execute
   */
  next: string;

  /**
   * Reasoning for the decision
   */
  reasoning?: string;

  /**
   * Task description for next agent
   */
  task?: string;
}

/**
 * Agent definition with LangGraph integration (2025 pattern)
 */
export interface AgentDefinition {
  /**
   * Unique agent identifier
   */
  id: string;

  /**
   * Agent name for routing decisions
   */
  name: string;

  /**
   * Agent description for supervisor routing
   */
  description: string;

  /**
   * System prompt for this agent
   */
  systemPrompt?: string;

  /**
   * Tools available to this agent
   */
  tools?: unknown[];

  /**
   * Handoff tools for swarm patterns
   */
  handoffTools?: HandoffTool[];

  /**
   * Agent node function
   */
  nodeFunction: AgentNodeFunction;

  /**
   * Agent metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Handoff tool definition for swarm patterns
 */
export interface HandoffTool {
  /**
   * Tool name (e.g., "transfer_to_researcher")
   */
  name: string;

  /**
   * Tool description for LLM
   */
  description: string;

  /**
   * Target agent for handoff
   */
  targetAgent: string;

  /**
   * Tool schema for validation
   */
  schema?: z.ZodSchema;

  /**
   * Context filter function
   */
  contextFilter?: (state: AgentState) => Partial<AgentState>;
}

/**
 * Supervisor configuration following 2025 LangGraph patterns
 */
export interface SupervisorConfig {
  /**
   * Supervisor system prompt
   */
  systemPrompt: string;

  /**
   * Worker agents managed by supervisor
   */
  workers: readonly string[];

  /**
   * LLM configuration for routing decisions
   */
  llm?: {
    model: string;
    temperature?: number;
    maxTokens?: number;
  };

  /**
   * Routing tool configuration
   */
  routingTool?: {
    name: string;
    description: string;
  };

  /**
   * Enable forward message tool
   */
  enableForwardMessage?: boolean;

  /**
   * Remove handoff messages from worker context
   */
  removeHandoffMessages?: boolean;
}

/**
 * Swarm configuration for peer-to-peer agent networks (2025 pattern)
 */
export interface SwarmConfig {
  /**
   * Enable dynamic handoffs between any agents
   */
  enableDynamicHandoffs: boolean;

  /**
   * Message history management
   */
  messageHistory: {
    /**
     * Remove handoff messages from agent context
     */
    removeHandoffMessages: boolean;

    /**
     * Add agent attribution to messages
     */
    addAgentAttribution: boolean;

    /**
     * Maximum message history per agent
     */
    maxMessages?: number;
  };

  /**
   * Context isolation settings
   */
  contextIsolation: {
    /**
     * Enable per-agent memory isolation
     */
    enabled: boolean;

    /**
     * Shared context keys accessible to all agents
     */
    sharedKeys?: string[];
  };
}

/**
 * Hierarchical configuration for multi-level agent systems
 */
export interface HierarchicalConfig {
  /**
   * Hierarchy levels (top-level supervisors to leaf workers)
   */
  levels: ReadonlyArray<readonly string[]>;

  /**
   * Escalation rules
   */
  escalationRules?: EscalationRule[];

  /**
   * Parent graph navigation rules
   */
  parentGraphRules?: ParentGraphRule[];
}

/**
 * Escalation rule for hierarchical systems
 */
export interface EscalationRule {
  /**
   * Condition for escalation
   */
  condition: (state: AgentState) => boolean;

  /**
   * Target level for escalation
   */
  targetLevel: number;

  /**
   * Escalation message
   */
  message?: string;
}

/**
 * Parent graph navigation rule
 */
export interface ParentGraphRule {
  /**
   * Condition for parent navigation
   */
  condition: (state: AgentState) => boolean;

  /**
   * Target agent in parent graph
   */
  targetAgent: string;

  /**
   * Command to execute
   */
  command: AgentCommand;
}

/**
 * Multi-agent network configuration (2025 pattern)
 */
export interface AgentNetwork {
  /**
   * Network identifier
   */
  id: string;

  /**
   * Network type
   */
  type: 'supervisor' | 'swarm' | 'hierarchical';

  /**
   * Agent definitions in the network
   */
  agents: readonly AgentDefinition[];

  /**
   * Network-specific configuration
   */
  config: SupervisorConfig | SwarmConfig | HierarchicalConfig;

  /**
   * State schema definition
   */
  stateSchema?: z.ZodSchema<AgentState>;

  /**
   * Graph compilation options
   */
  compilationOptions?: {
    /**
     * Enable state interrupts for human-in-the-loop
     */
    enableInterrupts?: boolean;

    /**
     * Checkpointer for persistence
     */
    checkpointer?: unknown;

    /**
     * Debug mode
     */
    debug?: boolean;
  };
}

/**
 * Checkpointing configuration for multi-agent networks
 */
export interface CheckpointingConfig {
  /**
   * Enable checkpointing globally
   */
  enabled: boolean;

  /**
   * Enable checkpointing for all networks by default
   */
  enableForAllNetworks: boolean;

  /**
   * Default thread prefix for checkpoint storage
   */
  defaultThreadPrefix: string;
}

/**
 * Multi-agent module configuration (2025 pattern)
 */
export interface MultiAgentModuleOptions {
  /**
   * Default LLM configuration
   */
  defaultLlm?: {
    model: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };

  /**
   * Message history limits
   */
  messageHistory?: {
    maxMessages?: number;
    pruneStrategy?: 'fifo' | 'lifo' | 'summarize';
  };

  /**
   * Streaming configuration
   */
  streaming?: {
    enabled: boolean;
    modes?: Array<'values' | 'updates' | 'messages'>;
  };

  /**
   * Debug configuration
   */
  debug?: {
    enabled: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };

  /**
   * Performance optimizations
   */
  performance?: {
    /**
     * Enable token optimization
     */
    tokenOptimization?: boolean;

    /**
     * Enable context window management
     */
    contextWindowManagement?: boolean;

    /**
     * Enable message forwarding for supervisors
     */
    enableMessageForwarding?: boolean;
  };

  /**
   * Checkpointing configuration
   */
  checkpointing?: CheckpointingConfig;
}

/**
 * Async configuration options for MultiAgentModule
 */
export interface MultiAgentModuleAsyncOptions {
  imports?: any[];
  useFactory?: (
    ...args: any[]
  ) => Promise<MultiAgentModuleOptions> | MultiAgentModuleOptions;
  inject?: any[];
}

/**
 * Execution result from multi-agent workflow
 */
export interface MultiAgentResult {
  /**
   * Final state of the workflow
   */
  finalState: AgentState;

  /**
   * Execution path taken
   */
  executionPath: string[];

  /**
   * Total execution time
   */
  executionTime: number;

  /**
   * Success status
   */
  success: boolean;

  /**
   * Error if execution failed
   */
  error?: Error;

  /**
   * Token usage statistics
   */
  tokenUsage?: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Constants for multi-agent operations (2025 standards)
 */
export const MULTI_AGENT_CONSTANTS = {
  /**
   * Special node name for ending execution
   */
  END: '__end__',

  /**
   * Default supervisor system prompt (2025 optimized)
   */
  DEFAULT_SUPERVISOR_PROMPT: `You are a supervisor tasked with managing a conversation between the following workers: {workers}.

Given the following user request, respond with the worker to act next.
Each worker will perform a task and respond with their results and status.

When finished, respond with FINISH.

Workers:
{worker_descriptions}`,

  /**
   * Default routing tool name
   */
  DEFAULT_ROUTING_TOOL: 'route',

  /**
   * Default handoff tool prefix
   */
  DEFAULT_HANDOFF_TOOL_PREFIX: 'transfer_to_',

  /**
   * Default forward message tool
   */
  DEFAULT_FORWARD_MESSAGE_TOOL: 'forward_message',
} as const;

/**
 * Multi-agent specific errors (2025 pattern)
 */
export class MultiAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MultiAgentError';
  }
}

export class AgentNotFoundError extends MultiAgentError {
  constructor(agentId: string, details?: unknown) {
    super(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND', details);
  }
}

export class NetworkConfigurationError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_CONFIGURATION_ERROR', details);
  }
}

export class RoutingError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'ROUTING_ERROR', details);
  }
}

export class HandoffError extends MultiAgentError {
  constructor(message: string, details?: unknown) {
    super(message, 'HANDOFF_ERROR', details);
  }
}

/**
 * Validation schemas for multi-agent configurations (2025 pattern)
 */
export const AgentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  systemPrompt: z.string().optional(),
  tools: z.array(z.unknown()).optional(),
  handoffTools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        targetAgent: z.string(),
        schema: z.unknown().optional(),
        contextFilter: z.function().optional(),
      })
    )
    .optional(),
  nodeFunction: z.function(),
  metadata: z.record(z.unknown()).optional(),
});

export const SupervisorConfigSchema = z.object({
  systemPrompt: z.string(),
  workers: z.array(z.string()).min(1),
  llm: z
    .object({
      model: z.string(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
  routingTool: z
    .object({
      name: z.string(),
      description: z.string(),
    })
    .optional(),
  enableForwardMessage: z.boolean().optional(),
  removeHandoffMessages: z.boolean().optional(),
});

export const SwarmConfigSchema = z.object({
  enableDynamicHandoffs: z.boolean(),
  messageHistory: z.object({
    removeHandoffMessages: z.boolean(),
    addAgentAttribution: z.boolean(),
    maxMessages: z.number().positive().optional(),
  }),
  contextIsolation: z.object({
    enabled: z.boolean(),
    sharedKeys: z.array(z.string()).optional(),
  }),
});

export const AgentNetworkSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['supervisor', 'swarm', 'hierarchical']),
  agents: z.array(AgentDefinitionSchema).min(1),
  config: z.union([
    SupervisorConfigSchema,
    SwarmConfigSchema,
    z.object({ levels: z.array(z.array(z.string())) }), // Simplified hierarchical
  ]),
  stateSchema: z.unknown().optional(),
  compilationOptions: z
    .object({
      enableInterrupts: z.boolean().optional(),
      checkpointer: z.unknown().optional(),
      debug: z.boolean().optional(),
    })
    .optional(),
});

export const RoutingDecisionSchema = z.object({
  next: z.string(),
  reasoning: z.string().optional(),
  task: z.string().optional(),
});

export const AgentCommandSchema = z.object({
  goto: z.string(),
  update: z.record(z.unknown()).optional(),
  graph: z.enum(['PARENT', 'CURRENT']).or(z.string()).optional(),
});
