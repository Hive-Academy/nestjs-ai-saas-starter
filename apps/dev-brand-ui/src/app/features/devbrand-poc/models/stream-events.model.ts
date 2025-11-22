import { z } from 'zod';

/**
 * StreamEventType Enumeration
 *
 * Comprehensive set of event types emitted by the LangGraph streaming backend.
 * Evidence: libs/langgraph-modules/streaming/src/lib/constants.ts
 *
 * @remarks
 * - Total of 16 event types across 6 categories
 * - Used for type discrimination in StreamUpdate discriminated union
 * - Backend emits these events via WebSocket during workflow execution
 *
 * @see {@link https://langchain-ai.github.io/langgraph/concepts/low_level/#stream-events LangGraph Stream Events}
 * @public
 */
export enum StreamEventType {
  // Workflow lifecycle events (workflow-level operations)
  /** Emitted when workflow execution begins */
  WORKFLOW_START = 'workflow:start',
  /** Emitted when workflow execution completes successfully */
  WORKFLOW_END = 'workflow:end',
  /** Emitted when workflow encounters fatal error */
  WORKFLOW_ERROR = 'workflow:error',

  // Node events (individual node lifecycle)
  /** Emitted when a node begins execution */
  NODE_START = 'node:start',
  /** Emitted when a node finishes execution */
  NODE_END = 'node:end',
  /** Emitted when a node encounters error */
  NODE_ERROR = 'node:error',
  /** Emitted when a node completes (alias for NODE_END) */
  NODE_COMPLETE = 'node:complete',

  // Stream data types (LangGraph stream modes)
  /** Values mode: Complete state snapshots */
  VALUES = 'values',
  /** Updates mode: Partial state updates */
  UPDATES = 'updates',
  /** Messages mode: Message streaming */
  MESSAGES = 'messages',
  /** Events mode: Event stream */
  EVENTS = 'events',
  /** Debug mode: Debugging information */
  DEBUG = 'debug',
  /** Final mode: Final output only */
  FINAL = 'final',

  // Progress events (workflow progress tracking)
  /** Generic progress update (percentage, status) */
  PROGRESS = 'progress',
  /** Milestone achieved (significant workflow step) */
  MILESTONE = 'milestone',

  // Token events (LLM token streaming)
  /** Individual token from LLM response */
  TOKEN = 'token',

  // Error events (error handling)
  /** Generic error event */
  ERROR = 'error',

  // Custom events (application-specific)
  /** Custom application event */
  CUSTOM = 'custom',

  // ============================================================================
  // NEW: LangGraph Stream Mode Events (Phase 1 Backend Integration)
  // ============================================================================
  // Evidence: apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts:239-282

  /** LLM token streaming event (streamMode: 'messages') */
  MESSAGE_STREAM = 'message-stream',
  /** Custom progress event (streamMode: 'custom') */
  CUSTOM_STREAM = 'custom-stream',
  /** Debug execution trace (streamMode: 'debug', dev mode only) */
  DEBUG_STREAM = 'debug-stream',
}

/**
 * StreamMetadata Interface
 *
 * Metadata associated with every stream event.
 * Evidence: libs/langgraph-modules/streaming/src/lib/interfaces/streaming.interface.ts
 *
 * @remarks
 * - timestamp: ISO 8601 date from backend
 * - sequenceNumber: Monotonically increasing integer for event ordering
 * - executionId: Unique identifier for workflow execution session
 * - nodeId: Canonical node ID in format: {domain}/{phase}/{activity}/{detail}
 *   Example: "devbrand/github-analysis/repository-analyzer/fetch-commits"
 * - agentType: Agent classifier (github-code-analyzer, personal-brand-strategist, content-creator)
 *
 * @example
 * ```typescript
 * const metadata: StreamMetadata = {
 *   timestamp: new Date('2025-10-28T16:00:00Z'),
 *   sequenceNumber: 42,
 *   executionId: 'exec-abc123',
 *   nodeId: 'devbrand/github-analysis/repository-analyzer/fetch-commits',
 *   agentType: 'github-code-analyzer',
 *   domain: 'devbrand',
 *   phase: 'github-analysis',
 *   activity: 'repository-analyzer',
 *   detail: 'fetch-commits'
 * };
 * ```
 *
 * @public
 */
export interface StreamMetadata {
  /** Event timestamp (ISO 8601 from backend) */
  timestamp: Date;
  /** Monotonically increasing sequence number for event ordering */
  sequenceNumber: number;
  /** Unique execution ID for this workflow run */
  executionId: string;
  /** Optional canonical node ID (format: domain/phase/activity/detail) */
  nodeId?: string;
  /** Optional agent type classifier */
  agentType?: string;

  // Node ID components (parsed from canonical node ID)
  // Format: {domain}/{phase}/{activity}/{detail}
  /** Domain component from nodeId (e.g., "devbrand") */
  domain?: string;
  /** Phase component from nodeId (e.g., "github-analysis") */
  phase?: string;
  /** Activity component from nodeId (e.g., "repository-analyzer") */
  activity?: string;
  /** Detail component from nodeId (e.g., "fetch-commits") */
  detail?: string;

  /** Allow additional metadata fields from backend */
  [key: string]: unknown;
}

/**
 * StreamUpdate Interface (Discriminated Union)
 *
 * Generic stream event structure with type discrimination.
 * Evidence: libs/langgraph-modules/streaming/src/lib/interfaces/streaming.interface.ts
 *
 * @typeParam T - Type of event data payload (defaults to unknown for runtime safety)
 *
 * @remarks
 * - Generic parameter T allows type-safe event data
 * - Use type guards (isAgentEvent, isNodeEvent, etc.) for narrowing
 * - Runtime validation via Zod schemas (StreamUpdateSchema)
 *
 * @example
 * ```typescript
 * // Type-safe node start event
 * const nodeStartEvent: StreamUpdate<{ nodeId: string }> = {
 *   type: StreamEventType.NODE_START,
 *   data: { nodeId: 'devbrand/github-analysis' },
 *   metadata: {
 *     timestamp: new Date(),
 *     sequenceNumber: 1,
 *     executionId: 'exec-123'
 *   }
 * };
 * ```
 *
 * @public
 */
export interface StreamUpdate<T = unknown> {
  /** Event type discriminator (use for narrowing) */
  type: StreamEventType;
  /** Event-specific data payload (type varies by event type) */
  data: T;
  /** Optional metadata (always present from backend) */
  metadata?: StreamMetadata;
}

/**
 * TokenUpdate Interface
 *
 * Specialized interface for token streaming events from LLM responses.
 * Evidence: research-websocket.md:446-463
 *
 * @remarks
 * - Emitted for each token generated by LLM during content creation
 * - Used for real-time display of agent responses
 * - High-frequency events (can be 10-100+ per second)
 *
 * @example
 * ```typescript
 * const tokenUpdate: TokenUpdate = {
 *   token: 'Hello',
 *   executionId: 'exec-abc123',
 *   nodeId: 'devbrand/content-creation/linkedin-post/generate'
 * };
 * ```
 *
 * @public
 */
export interface TokenUpdate {
  /** Individual token string from LLM */
  token: string;
  /** Optional execution ID for token correlation */
  executionId?: string;
  /** Optional node ID for source tracking */
  nodeId?: string;
}

// ============================================================================
// NEW: LangGraph Streaming Event Interfaces (Phase 1 Backend Integration)
// ============================================================================
// Evidence: libs/langgraph-modules/workflow-engine/src/lib/streaming/transformers/stream-event.transformer.ts

/**
 * MessageStreamEvent Interface
 *
 * LLM token streaming event emitted when LLM generates tokens in real-time.
 * Corresponds to LangGraph 'messages' stream mode.
 *
 * Backend Source: research-chat.controller.ts:239-253
 * Backend Type: MessageStreamEvent from @hive-academy/langgraph-workflow-engine
 *
 * @remarks
 * - Emitted for each token/chunk generated by LLM nodes
 * - Used for real-time display of agent responses
 * - High-frequency events during LLM generation
 *
 * @example
 * ```typescript
 * const messageEvent: MessageStreamEvent = {
 *   type: 'message-stream',
 *   executionId: 'research-123',
 *   nodeName: 'generateReport',
 *   step: 5,
 *   content: 'The research findings indicate...',
 *   messageChunk: {
 *     id: 'msg-chunk-1',
 *     type: 'ai',
 *     content: 'The research findings indicate...',
 *   },
 *   timestamp: '2025-11-14T10:00:00Z',
 *   metadata: { langgraph_node: 'generateReport', langgraph_step: 5 }
 * };
 * ```
 *
 * @public
 */
export interface MessageStreamEvent {
  /** Event type discriminator */
  readonly type: 'message-stream';
  /** Workflow execution ID */
  readonly executionId: string;
  /** Node that emitted this message chunk */
  readonly nodeName: string;
  /** Execution step number */
  readonly step: number;
  /** The token/chunk content (extracted from messageChunk) */
  readonly content: string;
  /** Optional AI message chunk structure */
  readonly messageChunk?: {
    readonly id: string;
    readonly type: string;
    readonly content: string;
    readonly additional_kwargs?: Record<string, unknown>;
  };
  /** Event timestamp (ISO 8601) */
  readonly timestamp: string;
  /** LangGraph execution metadata */
  readonly metadata?: {
    readonly langgraph_node: string;
    readonly langgraph_step: number;
    readonly langgraph_triggers?: readonly string[];
    readonly langgraph_path?: readonly string[];
    readonly [key: string]: unknown;
  };
}

/**
 * CustomStreamEvent Interface
 *
 * Custom progress event emitted for user-defined agent progress tracking.
 * Corresponds to LangGraph 'custom' stream mode.
 *
 * Backend Source: research-chat.controller.ts:254-265
 * Backend Type: CustomStreamEvent from @hive-academy/langgraph-workflow-engine
 *
 * @remarks
 * - Emitted by agents for custom progress/metrics reporting
 * - Used for progress bars, status updates, custom UI feedback
 * - Flexible data structure for application-specific needs
 *
 * @example
 * ```typescript
 * const customEvent: CustomStreamEvent = {
 *   type: 'custom-stream',
 *   executionId: 'research-123',
 *   data: {
 *     agent: 'researcher',
 *     stage: 'gathering-data',
 *     message: 'Fetching research papers...',
 *     percentage: 45
 *   },
 *   timestamp: '2025-11-14T10:00:00Z'
 * };
 * ```
 *
 * @public
 */
export interface CustomStreamEvent {
  /** Event type discriminator */
  readonly type: 'custom-stream';
  /** Workflow execution ID */
  readonly executionId: string;
  /** Custom progress data (flexible structure) */
  readonly data: {
    readonly agent?: string;
    readonly stage?: string;
    readonly message?: string;
    readonly percentage?: number;
    readonly [key: string]: unknown;
  };
  /** Event timestamp (ISO 8601) */
  readonly timestamp: string;
}

/**
 * DebugStreamEvent Interface
 *
 * Debug execution trace event emitted in development mode for detailed troubleshooting.
 * Corresponds to LangGraph 'debug' stream mode.
 *
 * Backend Source: research-chat.controller.ts:266-281
 * Backend Type: DebugStreamEvent from @hive-academy/langgraph-workflow-engine
 *
 * @remarks
 * - Only emitted when NODE_ENV === 'development'
 * - Provides detailed execution traces for debugging workflows
 * - Includes task execution details, checkpoints, errors
 *
 * @example
 * ```typescript
 * const debugEvent: DebugStreamEvent = {
 *   type: 'debug-stream',
 *   executionId: 'research-123',
 *   eventType: 'task',
 *   taskId: 'task-abc-123',
 *   taskName: 'gatherInformation',
 *   payload: {
 *     id: 'task-abc-123',
 *     name: 'gatherInformation',
 *     input: { query: 'AI research' },
 *     output: { results: [...] }
 *   },
 *   timestamp: '2025-11-14T10:00:00Z',
 *   step: 3
 * };
 * ```
 *
 * @public
 */
export interface DebugStreamEvent {
  /** Event type discriminator */
  readonly type: 'debug-stream';
  /** Workflow execution ID */
  readonly executionId: string;
  /** Debug event type */
  readonly eventType: 'task' | 'task_result' | 'checkpoint';
  /** Task identifier */
  readonly taskId?: string;
  /** Task name */
  readonly taskName?: string;
  /** Debug payload with task/checkpoint details */
  readonly payload?: {
    readonly id: string;
    readonly name: string;
    readonly input?: unknown;
    readonly output?: unknown;
    readonly error?: unknown;
    readonly [key: string]: unknown;
  };
  /** Event timestamp (ISO 8601) */
  readonly timestamp: string;
  /** Execution step number */
  readonly step?: number;
}

/**
 * WebSocketError Interface
 *
 * Error structure for WebSocket connection and stream processing errors.
 *
 * @remarks
 * - websocket_error: Socket.io connection/transport errors
 * - validation_error: Zod schema validation failures
 * - connection_error: Network/connectivity issues
 *
 * @example
 * ```typescript
 * const error: WebSocketError = {
 *   type: 'validation_error',
 *   message: 'Invalid stream event structure',
 *   timestamp: new Date(),
 *   details: { receivedType: 'invalid:type' }
 * };
 * ```
 *
 * @public
 */
export interface WebSocketError {
  /** Error category */
  type: 'websocket_error' | 'validation_error' | 'connection_error';
  /** Human-readable error message */
  message: string;
  /** Error occurrence timestamp */
  timestamp: Date;
  /** Optional additional error details */
  details?: unknown;
}

/**
 * ConnectionState Interface
 *
 * WebSocket connection state tracking.
 *
 * @remarks
 * - connected: Socket.io 'connect' event received
 * - disconnected: Socket.io 'disconnect' event received
 * - reconnecting: Automatic reconnection attempt in progress
 * - error: Connection error occurred
 *
 * @public
 */
export interface ConnectionState {
  /** Connection status */
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  /** Current reconnection attempt number (0 if not reconnecting) */
  reconnectAttempt: number;
  /** Maximum reconnection attempts allowed */
  maxReconnectAttempts: number;
  /** Last connection error (if status is 'error') */
  lastError?: WebSocketError;
}

/**
 * SubscriptionConfirmed Interface
 *
 * Server acknowledgement of execution subscription.
 *
 * @remarks
 * - Emitted by backend after client subscribes to execution ID
 * - Confirms client will receive stream updates for this execution
 *
 * @public
 */
export interface SubscriptionConfirmed {
  /** Subscribed execution ID */
  executionId: string;
  /** Server confirmation message */
  message: string;
  /** Subscription timestamp */
  timestamp: Date;
}

// =============================================================================
// Zod Schemas for Runtime Validation
// =============================================================================

/**
 * Zod schema for StreamMetadata runtime validation.
 *
 * @remarks
 * - Validates all incoming metadata from backend WebSocket
 * - Coerces timestamp string to Date object
 * - Uses passthrough() to allow additional backend fields
 *
 * @example
 * ```typescript
 * const result = StreamMetadataSchema.safeParse(rawMetadata);
 * if (result.success) {
 *   const metadata: StreamMetadata = result.data;
 * }
 * ```
 *
 * @public
 */
export const StreamMetadataSchema = z
  .object({
    timestamp: z.coerce.date(),
    sequenceNumber: z.number(),
    executionId: z.string(),
    nodeId: z.string().optional(),
    agentType: z.string().optional(),
    domain: z.string().optional(),
    phase: z.string().optional(),
    activity: z.string().optional(),
    detail: z.string().optional(),
  })
  .passthrough();

/**
 * Zod schema for StreamUpdate runtime validation.
 *
 * @remarks
 * - Validates all incoming stream events from backend WebSocket
 * - Uses z.nativeEnum for StreamEventType validation
 * - Data field is z.unknown() for flexible payload types
 * - Validate specific data structures after type narrowing
 *
 * @example
 * ```typescript
 * const result = StreamUpdateSchema.safeParse(rawEvent);
 * if (result.success) {
 *   const event: StreamUpdate = result.data;
 *   if (isNodeStartEvent(event)) {
 *     // event.data is now typed
 *   }
 * }
 * ```
 *
 * @public
 */
export const StreamUpdateSchema = z.object({
  type: z.nativeEnum(StreamEventType),
  data: z.unknown(),
  metadata: StreamMetadataSchema.optional(),
});

/**
 * Zod schema for TokenUpdate runtime validation.
 *
 * @public
 */
export const TokenUpdateSchema = z.object({
  token: z.string(),
  executionId: z.string().optional(),
  nodeId: z.string().optional(),
});

/**
 * Zod schema for WebSocketError runtime validation.
 *
 * @public
 */
export const WebSocketErrorSchema = z.object({
  type: z.enum(['websocket_error', 'validation_error', 'connection_error']),
  message: z.string(),
  timestamp: z.coerce.date(),
  details: z.unknown().optional(),
});

/**
 * Zod schema for ConnectionState runtime validation.
 *
 * @public
 */
export const ConnectionStateSchema = z.object({
  status: z.enum(['connected', 'disconnected', 'reconnecting', 'error']),
  reconnectAttempt: z.number(),
  maxReconnectAttempts: z.number(),
  lastError: WebSocketErrorSchema.optional(),
});

/**
 * Zod schema for SubscriptionConfirmed runtime validation.
 *
 * @public
 */
export const SubscriptionConfirmedSchema = z.object({
  executionId: z.string(),
  message: z.string(),
  timestamp: z.coerce.date(),
});

// ============================================================================
// NEW: Zod Schemas for LangGraph Streaming Events (Phase 1 Backend Integration)
// ============================================================================

/**
 * Zod schema for MessageStreamEvent runtime validation
 *
 * @remarks
 * - Validates LLM token streaming events from backend
 * - Ensures type-safe handling of message chunks
 *
 * @public
 */
export const MessageStreamEventSchema = z.object({
  type: z.literal('message-stream'),
  executionId: z.string(),
  nodeName: z.string(),
  step: z.number(),
  content: z.string(),
  messageChunk: z
    .object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      additional_kwargs: z.record(z.unknown()).optional(),
    })
    .optional(),
  timestamp: z.string(),
  metadata: z
    .object({
      langgraph_node: z.string(),
      langgraph_step: z.number(),
      langgraph_triggers: z.array(z.string()).optional(),
      langgraph_path: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
});

/**
 * Zod schema for CustomStreamEvent runtime validation
 *
 * @remarks
 * - Validates custom progress events from backend
 * - Flexible data structure with common fields
 *
 * @public
 */
export const CustomStreamEventSchema = z.object({
  type: z.literal('custom-stream'),
  executionId: z.string(),
  data: z
    .object({
      agent: z.string().optional(),
      stage: z.string().optional(),
      message: z.string().optional(),
      percentage: z.number().min(0).max(100).optional(),
    })
    .passthrough(),
  timestamp: z.string(),
});

/**
 * Zod schema for DebugStreamEvent runtime validation
 *
 * @remarks
 * - Validates debug trace events from backend
 * - Only present in development mode
 *
 * @public
 */
export const DebugStreamEventSchema = z.object({
  type: z.literal('debug-stream'),
  executionId: z.string(),
  eventType: z.enum(['task', 'task_result', 'checkpoint']),
  taskId: z.string().optional(),
  taskName: z.string().optional(),
  payload: z
    .object({
      id: z.string(),
      name: z.string(),
      input: z.unknown().optional(),
      output: z.unknown().optional(),
      error: z.unknown().optional(),
    })
    .passthrough()
    .optional(),
  timestamp: z.string(),
  step: z.number().optional(),
});

// =============================================================================
// Type Guards for Discriminated Union Narrowing
// =============================================================================

/**
 * Type guard for workflow lifecycle events.
 *
 * @param event - Stream event to check
 * @returns true if event is workflow lifecycle event
 *
 * @example
 * ```typescript
 * if (isWorkflowEvent(event)) {
 *   // event.type is 'workflow:start' | 'workflow:end' | 'workflow:error'
 * }
 * ```
 *
 * @public
 */
export function isWorkflowEvent(event: StreamUpdate): boolean {
  return (
    event.type === StreamEventType.WORKFLOW_START ||
    event.type === StreamEventType.WORKFLOW_END ||
    event.type === StreamEventType.WORKFLOW_ERROR
  );
}

/**
 * Type guard for node lifecycle events.
 *
 * @param event - Stream event to check
 * @returns true if event is node lifecycle event
 *
 * @public
 */
export function isNodeEvent(event: StreamUpdate): boolean {
  return (
    event.type === StreamEventType.NODE_START ||
    event.type === StreamEventType.NODE_END ||
    event.type === StreamEventType.NODE_ERROR ||
    event.type === StreamEventType.NODE_COMPLETE
  );
}

/**
 * Type guard for progress tracking events.
 *
 * @param event - Stream event to check
 * @returns true if event is progress tracking event
 *
 * @public
 */
export function isProgressEvent(event: StreamUpdate): boolean {
  return (
    event.type === StreamEventType.PROGRESS ||
    event.type === StreamEventType.MILESTONE
  );
}

/**
 * Type guard for token streaming events.
 *
 * @param event - Stream event to check
 * @returns true if event is token streaming event
 *
 * @public
 */
export function isTokenEvent(event: StreamUpdate): boolean {
  return event.type === StreamEventType.TOKEN;
}

/**
 * Type guard for error events.
 *
 * @param event - Stream event to check
 * @returns true if event is error event
 *
 * @public
 */
export function isErrorEvent(event: StreamUpdate): boolean {
  return (
    event.type === StreamEventType.ERROR ||
    event.type === StreamEventType.NODE_ERROR ||
    event.type === StreamEventType.WORKFLOW_ERROR
  );
}

/**
 * Type guard for stream data type events (LangGraph stream modes).
 *
 * @param event - Stream event to check
 * @returns true if event is stream data type event
 *
 * @public
 */
export function isStreamDataEvent(event: StreamUpdate): boolean {
  return (
    event.type === StreamEventType.VALUES ||
    event.type === StreamEventType.UPDATES ||
    event.type === StreamEventType.MESSAGES ||
    event.type === StreamEventType.EVENTS ||
    event.type === StreamEventType.DEBUG ||
    event.type === StreamEventType.FINAL
  );
}

/**
 * Type guard for agent-related events (events with agentType metadata).
 *
 * @param event - Stream event to check
 * @returns true if event has agentType in metadata
 *
 * @public
 */
export function isAgentEvent(event: StreamUpdate): boolean {
  return event.metadata?.agentType !== undefined;
}

/**
 * Type guard for specific agent type.
 *
 * @param event - Stream event to check
 * @param agentType - Agent type to match
 * @returns true if event is from specified agent
 *
 * @example
 * ```typescript
 * if (isAgentTypeEvent(event, 'github-code-analyzer')) {
 *   // Handle GitHub analyzer event
 * }
 * ```
 *
 * @public
 */
export function isAgentTypeEvent(
  event: StreamUpdate,
  agentType: string
): boolean {
  return event.metadata?.agentType === agentType;
}

/**
 * Type guard for node-specific events (events with nodeId metadata).
 *
 * @param event - Stream event to check
 * @returns true if event has nodeId in metadata
 *
 * @public
 */
export function hasNodeId(event: StreamUpdate): boolean {
  return event.metadata?.nodeId !== undefined;
}

/**
 * Helper function to extract agent type from canonical node ID.
 *
 * @param nodeId - Canonical node ID (format: domain/phase/activity/detail)
 * @returns Agent type identifier or undefined
 *
 * @remarks
 * Maps phase component to agent type:
 * - "github-analysis" → "github-code-analyzer"
 * - "brand-strategy" → "personal-brand-strategist"
 * - "content-creation" → "content-creator"
 *
 * @example
 * ```typescript
 * const agentType = extractAgentTypeFromNodeId('devbrand/github-analysis/fetch/commits');
 * // Returns: 'github-code-analyzer'
 * ```
 *
 * @public
 */
export function extractAgentTypeFromNodeId(
  nodeId: string | undefined
): string | undefined {
  if (!nodeId) return undefined;

  const parts = nodeId.split('/');
  if (parts.length < 2) return undefined;

  const phase = parts[1]; // Second component is phase

  // Map phase to agent type
  const phaseToAgentMap: Record<string, string> = {
    'github-analysis': 'github-code-analyzer',
    'brand-strategy': 'personal-brand-strategist',
    'content-creation': 'content-creator',
  };

  return phaseToAgentMap[phase];
}

/**
 * Helper function to parse canonical node ID into components.
 *
 * @param nodeId - Canonical node ID (format: domain/phase/activity/detail)
 * @returns Object with domain, phase, activity, detail components
 *
 * @example
 * ```typescript
 * const components = parseNodeId('devbrand/github-analysis/repository-analyzer/fetch-commits');
 * // Returns: {
 * //   domain: 'devbrand',
 * //   phase: 'github-analysis',
 * //   activity: 'repository-analyzer',
 * //   detail: 'fetch-commits'
 * // }
 * ```
 *
 * @public
 */
export function parseNodeId(nodeId: string): {
  domain?: string;
  phase?: string;
  activity?: string;
  detail?: string;
} {
  const parts = nodeId.split('/');

  return {
    domain: parts[0] || undefined,
    phase: parts[1] || undefined,
    activity: parts[2] || undefined,
    detail: parts[3] || undefined,
  };
}

// ============================================================================
// NEW: Type Guards for LangGraph Streaming Events (Phase 1 Backend Integration)
// ============================================================================

/**
 * Type guard for message stream events (LLM token streaming)
 *
 * @param event - Stream event to check
 * @returns true if event is a message stream event
 *
 * @example
 * ```typescript
 * if (isMessageStreamEvent(event)) {
 *   console.log('LLM token:', event.content);
 * }
 * ```
 *
 * @public
 */
export function isMessageStreamEvent(
  event:
    | StreamUpdate
    | MessageStreamEvent
    | CustomStreamEvent
    | DebugStreamEvent
): event is MessageStreamEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'message-stream'
  );
}

/**
 * Type guard for custom progress events
 *
 * @param event - Stream event to check
 * @returns true if event is a custom progress event
 *
 * @example
 * ```typescript
 * if (isCustomStreamEvent(event)) {
 *   console.log('Progress:', event.data.percentage, '%');
 * }
 * ```
 *
 * @public
 */
export function isCustomStreamEvent(
  event:
    | StreamUpdate
    | MessageStreamEvent
    | CustomStreamEvent
    | DebugStreamEvent
): event is CustomStreamEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'custom-stream'
  );
}

/**
 * Type guard for debug trace events
 *
 * @param event - Stream event to check
 * @returns true if event is a debug trace event
 *
 * @example
 * ```typescript
 * if (isDebugStreamEvent(event)) {
 *   console.log('Debug:', event.taskName, event.eventType);
 * }
 * ```
 *
 * @public
 */
export function isDebugStreamEvent(
  event:
    | StreamUpdate
    | MessageStreamEvent
    | CustomStreamEvent
    | DebugStreamEvent
): event is DebugStreamEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    event.type === 'debug-stream'
  );
}
