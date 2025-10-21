import { z } from 'zod';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { AgentState } from './agent.types';

/**
 * Configuration for creating a handoff tool
 * Used with HandoffToolBuilderService to create LangChain-compatible tools
 */
export interface HandoffToolConfig {
  /**
   * Target agent ID for handoff
   */
  targetAgent: string;

  /**
   * Tool description for LLM
   */
  description?: string;

  /**
   * Context filter to apply before handoff
   * Transforms state before passing to target agent
   */
  contextFilter?: (state: AgentState) => Partial<AgentState>;

  /**
   * Enable official @langchain/langgraph-swarm integration
   * Uses createHandoffTool from official package when available
   */
  useOfficialSwarmPackage?: boolean;
}

/**
 * Metadata for handoff tools
 * Tracks handoff tool provenance and configuration
 */
export interface HandoffToolMetadata {
  /**
   * Whether this tool uses official @langchain/langgraph-swarm
   */
  official: boolean;

  /**
   * Source package that created this tool
   */
  source: string;

  /**
   * Target agent ID
   */
  targetAgent: string;

  /**
   * Has context filter
   */
  hasContextFilter: boolean;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Additional metadata
   */
  [key: string]: unknown;
}

/**
 * Handoff tool result
 * Returned when handoff tool is invoked
 */
export interface HandoffToolResult {
  /**
   * Target agent to transfer to
   */
  targetAgent: string;

  /**
   * Task description for target agent
   */
  task?: string;

  /**
   * Reason for handoff
   */
  reason?: string;

  /**
   * Filtered state to pass to target agent
   */
  filteredState?: Partial<AgentState>;

  /**
   * Handoff timestamp
   */
  timestamp: Date;
}

/**
 * Handoff context passed through agent handoffs
 */
export interface HandoffContext {
  /**
   * Source agent ID
   */
  from: string;

  /**
   * Target agent ID
   */
  to: string;

  /**
   * Task description
   */
  task?: string;

  /**
   * Handoff round number
   */
  round: number;

  /**
   * Total handoffs in this chain
   */
  totalHandoffs: number;

  /**
   * Handoff chain (agent IDs in order)
   */
  chain: string[];

  /**
   * Additional context
   */
  metadata?: Record<string, unknown>;
}

/**
 * LangChain DynamicStructuredTool with handoff metadata
 */
export interface HandoffDynamicTool extends DynamicStructuredTool {
  /**
   * Handoff-specific metadata
   */
  handoffMetadata?: HandoffToolMetadata;
}

/**
 * Handoff tool schema for validation
 */
export const HandoffToolSchema = z.object({
  task_description: z
    .string()
    .optional()
    .describe('Description of the task to be handled by the target agent'),
  reason: z
    .string()
    .optional()
    .describe('Reason for transferring control to the target agent'),
});

/**
 * Extended handoff tool schema with context
 */
export const ExtendedHandoffToolSchema = z.object({
  task_description: z
    .string()
    .optional()
    .describe('Description of the task to be handled by the target agent'),
  reason: z
    .string()
    .optional()
    .describe('Reason for transferring control to the target agent'),
  context: z
    .record(z.unknown())
    .optional()
    .describe('Additional context to pass to target agent'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('Priority of the handoff request'),
});

/**
 * Handoff routing decision
 * Returned by swarm router to determine next agent
 */
export interface HandoffRoutingDecision {
  /**
   * Next agent to execute ('__end__' to finish)
   */
  next: string;

  /**
   * State updates to apply
   */
  update?: Partial<AgentState>;

  /**
   * Handoff context
   */
  handoffContext?: HandoffContext;
}

/**
 * Swarm routing function signature
 * Router reads active_agent from state and routes accordingly
 */
export type SwarmRouterFunction = (
  state: AgentState
) => Promise<HandoffRoutingDecision>;
