/**
 * @file LangGraph Stream Event Types
 * @description Official LangGraph stream event types based on LangGraph documentation
 * @see https://docs.langchain.com/oss/javascript/langgraph/streaming
 *
 * CRITICAL: These types match LangGraph's official streaming API structure.
 * DO NOT modify unless LangGraph's API changes.
 *
 * Stream Mode Behaviors:
 * - 'values': Streams full state after each super-step
 * - 'updates': Streams state deltas after each node execution (RECOMMENDED)
 * - 'messages': Streams LLM tokens + metadata
 * - 'custom': Streams custom data from nodes
 * - 'debug': Streams detailed execution traces
 */

import type { WorkflowState } from '../../interfaces/workflow-engine.interface';

/**
 * LangGraph Stream Modes
 */
export type StreamMode = 'values' | 'updates' | 'messages' | 'custom' | 'debug';

/**
 * Base structure for all LangGraph stream chunks
 * Based on official documentation: { nodeName: stateUpdate }
 *
 * Examples:
 * - Node update: { 'myNode': { metadata: {...} } }
 * - Tool update: { 'tools': { messages: [...] } }
 * - Start node: { '__start__': {} }
 * - Empty update: {}
 */
export type LangGraphStreamChunk<TState extends WorkflowState = WorkflowState> =
  Record<string, Partial<TState>> | Record<string, never>; // Empty object type

/**
 * Subgraph stream chunk structure (when subgraphs: true)
 * Format: [namespace[], mode, stateUpdate]
 *
 * Examples:
 * - Parent graph: [[], 'updates', { 'myNode': { ... } }]
 * - Subgraph: [['worker-agent:uuid'], 'updates', { 'agentNode': { ... } }]
 * - Nested: [['parent:uuid', 'child:uuid'], 'updates', { 'node': { ... } }]
 */
export type SubgraphStreamChunk<TState extends WorkflowState = WorkflowState> =
  [
    string[], // Namespace path (empty for parent, populated for subgraphs)
    StreamMode | 'updates' | 'values', // Stream mode
    LangGraphStreamChunk<TState> // The actual state update
  ];

/**
 * Union type: handles both regular and subgraph chunks
 */
export type AnyStreamChunk<TState extends WorkflowState = WorkflowState> =
  | LangGraphStreamChunk<TState>
  | SubgraphStreamChunk<TState>;

/**
 * Parsed stream event with guaranteed structure
 */
export interface ParsedStreamEvent<
  TState extends WorkflowState = WorkflowState
> {
  /**
   * Node name that emitted this event
   * Examples: 'myNode', 'tools', '__start__', '__end__'
   */
  readonly nodeName: string;

  /**
   * State update from the node (partial state)
   */
  readonly stateUpdate: Partial<TState>;

  /**
   * Whether this is a special system node
   */
  readonly isSystemNode: boolean;

  /**
   * Whether this is a tool execution event
   */
  readonly isToolNode: boolean;

  /**
   * Whether this is an empty update (should usually be skipped)
   */
  readonly isEmpty: boolean;

  /**
   * Subgraph namespace path (empty array if parent graph)
   * Examples:
   * - [] = parent graph
   * - ['github-analyzer:uuid'] = github-analyzer subgraph
   * - ['supervisor:uuid', 'worker:uuid'] = nested subgraph
   */
  readonly namespacePath: readonly string[];

  /**
   * Whether this event comes from a subgraph (worker agent)
   */
  readonly isSubgraphEvent: boolean;

  /**
   * Subgraph identifier (e.g., 'github-analyzer', 'personal-brand-strategist')
   * Extracted from namespacePath[0] before ':uuid'
   */
  readonly subgraphId?: string;

  /**
   * Raw chunk for debugging
   */
  readonly rawChunk: AnyStreamChunk<TState>;
}

/**
 * Validation result for stream chunks
 */
export interface StreamChunkValidation {
  readonly isValid: boolean;
  readonly isEmpty: boolean;
  readonly reason?: string;
}

/**
 * Stream event type discriminators
 */
export const SYSTEM_NODE_NAMES = ['__start__', '__end__'] as const;
export const TOOL_NODE_NAME = 'tools' as const;

/**
 * Type guard: Check if node is a system node
 */
export function isSystemNode(nodeName: string): boolean {
  return SYSTEM_NODE_NAMES.includes(nodeName as any);
}

/**
 * Type guard: Check if node is a tool node
 */
export function isToolNode(nodeName: string): boolean {
  return nodeName === TOOL_NODE_NAME;
}

/**
 * Type guard: Check if chunk is valid
 */
export function isValidChunk<TState extends WorkflowState>(
  chunk: unknown
): chunk is LangGraphStreamChunk<TState> {
  return (
    chunk !== null &&
    typeof chunk === 'object' &&
    !Array.isArray(chunk) &&
    Object.keys(chunk).length > 0
  );
}

/**
 * Type guard: Check if chunk is empty
 */
export function isEmptyChunk(chunk: unknown): boolean {
  return (
    chunk === null ||
    chunk === undefined ||
    (typeof chunk === 'object' && Object.keys(chunk as object).length === 0)
  );
}

/**
 * Type guard: Check if chunk is a subgraph chunk (tuple format)
 */
export function isSubgraphChunk<TState extends WorkflowState>(
  chunk: unknown
): chunk is SubgraphStreamChunk<TState> {
  return (
    Array.isArray(chunk) &&
    chunk.length === 3 &&
    Array.isArray(chunk[0]) && // namespace path
    typeof chunk[1] === 'string' && // stream mode
    typeof chunk[2] === 'object' && // state update
    chunk[2] !== null
  );
}

/**
 * Extract subgraph ID from namespace path
 * Example: ['github-analyzer:e58e5673-a661-ebb0-70d4-e298a7fc28b7'] → 'github-analyzer'
 */
export function extractSubgraphId(
  namespacePath: readonly string[]
): string | undefined {
  if (namespacePath.length === 0) {
    return undefined;
  }

  const firstNamespace = namespacePath[0];
  const colonIndex = firstNamespace.indexOf(':');

  if (colonIndex === -1) {
    return firstNamespace; // No UUID suffix
  }

  return firstNamespace.substring(0, colonIndex);
}

/**
 * ============================================================================
 * MESSAGES MODE SUPPORT (Token-level LLM streaming)
 * ============================================================================
 */

/**
 * AI Message Chunk from LLM (LangChain message format)
 * Emitted during token-level streaming from LLM nodes
 */
export interface AIMessageChunk {
  /**
   * Message content (can be string or array of content blocks)
   */
  readonly content: string | unknown[];

  /**
   * Additional LLM-specific metadata (e.g., finish_reason, model info)
   */
  readonly additional_kwargs?: Record<string, unknown>;

  /**
   * Response metadata from LLM provider (e.g., token counts, latency)
   */
  readonly response_metadata?: Record<string, unknown>;

  /**
   * Tool calls generated by LLM (function calling)
   */
  readonly tool_calls?: unknown[];

  /**
   * Message identifier
   */
  readonly id?: string;
}

/**
 * Messages mode metadata (LangGraph context information)
 */
export interface MessagesStreamMetadata {
  /**
   * Node that emitted this message chunk
   */
  readonly langgraph_node: string;

  /**
   * Execution step number
   */
  readonly langgraph_step: number;

  /**
   * Triggers that caused this node execution
   */
  readonly langgraph_triggers: readonly string[];

  /**
   * Execution path through the graph
   */
  readonly langgraph_path: readonly string[];

  /**
   * Checkpoint namespace (for subgraphs)
   */
  readonly langgraph_checkpoint_ns?: string;

  /**
   * Additional custom metadata
   */
  readonly [key: string]: unknown;
}

/**
 * Messages stream chunk format: [messageChunk, metadata]
 * This is the tuple format emitted when streamMode: 'messages'
 */
export type MessagesStreamChunk = readonly [
  AIMessageChunk,
  MessagesStreamMetadata
];

/**
 * Type guard: Check if chunk is a messages mode chunk
 */
export function isMessagesChunk(chunk: unknown): chunk is MessagesStreamChunk {
  if (!Array.isArray(chunk) || chunk.length !== 2) {
    return false;
  }

  const [message, metadata] = chunk;

  // Validate message structure
  const isValidMessage =
    message !== null && typeof message === 'object' && 'content' in message;

  // Validate metadata structure
  const isValidMetadata =
    metadata !== null &&
    typeof metadata === 'object' &&
    'langgraph_node' in metadata &&
    'langgraph_step' in metadata;

  return isValidMessage && isValidMetadata;
}

/**
 * Parsed message event (result from parsing messages mode chunk)
 */
export interface ParsedMessageEvent {
  readonly type: 'message';
  readonly messageChunk: AIMessageChunk;
  readonly metadata: MessagesStreamMetadata;
  readonly nodeName: string;
  readonly step: number;
  readonly rawChunk: MessagesStreamChunk;
}

/**
 * ============================================================================
 * CUSTOM MODE SUPPORT (User-defined progress/metrics)
 * ============================================================================
 */

/**
 * Custom stream chunk - any user-defined data
 * This is emitted when streamMode: 'custom'
 */
export type CustomStreamChunk = unknown;

/**
 * Type guard: Check if chunk is a custom mode chunk
 * Custom chunks are anything that doesn't match other known formats
 */
export function isCustomChunk(chunk: unknown): boolean {
  return (
    !isSubgraphChunk(chunk) &&
    !isMessagesChunk(chunk) &&
    !isDebugChunk(chunk) &&
    !isMultiModeChunk(chunk) &&
    !isStandardChunk(chunk)
  );
}

/**
 * Type guard: Check if chunk is a standard chunk (updates/values mode)
 */
function isStandardChunk(chunk: unknown): boolean {
  return (
    chunk !== null &&
    typeof chunk === 'object' &&
    !Array.isArray(chunk) &&
    Object.keys(chunk).length > 0
  );
}

/**
 * Parsed custom event (result from parsing custom mode chunk)
 */
export interface ParsedCustomEvent {
  readonly type: 'custom';
  readonly data: unknown;
  readonly rawChunk: CustomStreamChunk;
}

/**
 * ============================================================================
 * DEBUG MODE SUPPORT (Detailed execution traces)
 * ============================================================================
 */

/**
 * Debug stream chunk (emitted when streamMode: 'debug')
 * Provides detailed execution traces for troubleshooting
 */
export interface DebugStreamChunk {
  /**
   * Debug event type
   */
  readonly type: 'task' | 'task_result' | 'checkpoint';

  /**
   * Event timestamp
   */
  readonly timestamp: string;

  /**
   * Execution step number
   */
  readonly step: number;

  /**
   * Debug payload with task/checkpoint details
   */
  readonly payload: {
    readonly id: string;
    readonly name: string;
    readonly input?: unknown;
    readonly output?: unknown;
    readonly error?: unknown;
    readonly [key: string]: unknown;
  };
}

/**
 * Type guard: Check if chunk is a debug mode chunk
 */
export function isDebugChunk(chunk: unknown): chunk is DebugStreamChunk {
  if (chunk === null || typeof chunk !== 'object') {
    return false;
  }

  const obj = chunk as any;

  return (
    'type' in obj &&
    'timestamp' in obj &&
    'payload' in obj &&
    typeof obj.type === 'string' &&
    ['task', 'task_result', 'checkpoint'].includes(obj.type)
  );
}

/**
 * Parsed debug event (result from parsing debug mode chunk)
 */
export interface ParsedDebugEvent {
  readonly type: 'debug';
  readonly eventType: 'task' | 'task_result' | 'checkpoint';
  readonly timestamp: string;
  readonly step: number;
  readonly taskId: string;
  readonly taskName: string;
  readonly payload: DebugStreamChunk['payload'];
  readonly rawChunk: DebugStreamChunk;
}

/**
 * ============================================================================
 * MULTIPLE MODES SUPPORT (Combined streaming)
 * ============================================================================
 */

/**
 * Multi-mode stream chunk format: [mode, data]
 * Emitted when streamMode is an array (e.g., ['updates', 'messages', 'custom'])
 */
export type MultiModeStreamChunk = readonly [StreamMode, unknown];

/**
 * Type guard: Check if chunk is a multi-mode chunk
 */
export function isMultiModeChunk(
  chunk: unknown
): chunk is MultiModeStreamChunk {
  if (!Array.isArray(chunk) || chunk.length !== 2) {
    return false;
  }

  const [mode, _data] = chunk;

  return (
    typeof mode === 'string' &&
    ['updates', 'values', 'messages', 'custom', 'debug'].includes(mode)
  );
}
