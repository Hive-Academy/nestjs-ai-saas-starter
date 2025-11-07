/**
 * Internal Type Definitions for Multi-Agent Module
 *
 * This file contains properly typed versions of LangGraph and LangChain types
 * that are used internally to eliminate `as any` type casts throughout the codebase.
 *
 * These types provide strong typing for:
 * - LangGraph graph compilation and execution
 * - LangChain LLM and message handling
 * - Tool execution and metadata
 * - State management with metadata
 */

import type { CompiledStateGraph } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { AgentState } from '@hive-academy/langgraph-core';

/**
 * Properly typed compiled state graph for multi-agent workflows
 */
export type MultiAgentGraph = CompiledStateGraph<
  AgentState,
  Partial<AgentState>,
  string
>;

/**
 * Graph compilation options with proper typing
 */
export interface GraphCompileOptions {
  checkpointer?: BaseCheckpointSaver | boolean;
  interruptBefore?: string[] | '*';
  interruptAfter?: string[] | '*';
}

/**
 * LLM instance with tool binding capability
 */
export interface LLMWithTools {
  bindTools(tools: unknown[]): LLMWithTools;
  invoke(input: unknown): Promise<unknown>;
}

/**
 * AI Message with optional tool calls
 * Note: Simplified interface for internal use, not strict BaseMessage compliance
 */
export interface AIMessageWithToolCalls {
  tool_calls?: ToolCall[];
  _getType?(): string;
  content: string | Record<string, any>;
  [key: string]: any;
}

/**
 * Tool call structure from LangChain
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

/**
 * Tool with optional handoff metadata
 */
export interface ToolWithMetadata {
  handoffMetadata?: {
    sourceAgent: string;
    targetAgent: string;
    handoffType: 'push' | 'replace';
  };
}

/**
 * Object with weight tracking for weighted merge operations
 */
export interface WeightedObject {
  __weights?: Record<string, number>;
  [key: string]: unknown;
}

/**
 * Agent state with additional metadata fields
 * Note: Extends AgentState with optional command processing fields
 */
export interface StateWithMetadata {
  messages?: any[];
  next?: string;
  current?: string;
  scratchpad?: string;
  task?: string;
  threadId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  humanFeedback?: {
    approved: boolean;
    comments?: string;
  };
  priority?: number;
  confidence?: number;
  commandMetadata?: Record<string, unknown>;
}

/**
 * Tool node with invoke capability
 */
export interface ToolNodeExecutor {
  invoke(state: AgentState): Promise<AgentState>;
}

/**
 * Workflow execution result with metadata
 */
export interface WorkflowResult {
  finalState: Partial<AgentState>;
  executionTime: number;
  tokenUsage?: TokenUsage;
}

/**
 * Token usage statistics
 * Matches MultiAgentResult.tokenUsage interface
 */
export interface TokenUsage {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Network configuration with type discriminator
 */
export type NetworkConfigWithType<T> = T & {
  type: 'supervisor' | 'swarm' | 'hierarchical';
};

/**
 * Command types for workflow control
 */
export type CommandType = 'goto' | 'update' | 'parallel' | 'sequence';

/**
 * Task types for background processing
 */
export type TaskType =
  | 'store'
  | 'retrieve'
  | 'update'
  | 'conversation'
  | 'coordination_event'
  | 'performance';

/**
 * Background task structure
 */
export interface BackgroundTask {
  type: TaskType;
  [key: string]: unknown;
}

/**
 * Tool schema with Zod validation
 */
export interface ToolSchema {
  name: string;
  description: string;
  schema: unknown; // Zod schema type
}

/**
 * Type guard to check if a message is an AI message with tool calls
 * Uses runtime check with any cast for compatibility
 */
export function isAIMessageWithToolCalls(
  message: any
): message is AIMessageWithToolCalls {
  return (
    message &&
    typeof message === 'object' &&
    '_getType' in message &&
    typeof message._getType === 'function' &&
    message._getType() === 'ai'
  );
}

/**
 * Type guard to check if an object has weight tracking
 */
export function hasWeights(obj: unknown): obj is WeightedObject {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Type guard to check if a task has a valid type
 */
export function isValidBackgroundTask(task: unknown): task is BackgroundTask {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    typeof (task as BackgroundTask).type === 'string'
  );
}

/**
 * ToolNodeService with internal weighted merge method access
 * Used for sophisticated multi-agent coordination patterns
 */
export interface ToolNodeServiceWithWeightedMerge {
  applyWeightedMerge(
    target: Partial<AgentState>,
    source: Partial<AgentState>,
    weight: number
  ): void;
}
