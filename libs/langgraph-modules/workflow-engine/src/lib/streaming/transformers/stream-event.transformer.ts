/**
 * @file StreamEventTransformer - Business Logic Event Mapping
 * @description Transforms parsed LangGraph events into domain-specific events
 *
 * ARCHITECTURE:
 * - Separation of concerns: Parsing (StreamEventParser) vs Business Logic (this)
 * - Type-safe transformations with generic support
 * - Extensible: Easy to add custom event types
 *
 * USAGE:
 * ```typescript
 * const transformer = new StreamEventTransformer();
 * const domainEvent = transformer.transformToWorkflowUpdate(parsedEvent, executionId);
 * ```
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  ParsedStreamEvent,
  ParsedMessageEvent,
  ParsedCustomEvent,
  ParsedDebugEvent,
  AIMessageChunk,
  MessagesStreamMetadata,
} from '../types/stream-event.types';

/**
 * Domain-specific workflow update event
 * This is what your controllers/services should work with
 */
export interface WorkflowUpdateEvent<
  TState extends Record<string, unknown> = Record<string, unknown>
> {
  readonly type: 'workflow-update';
  readonly executionId: string;
  readonly nodeName: string;
  readonly state: Partial<TState>;
  readonly timestamp: string;
  readonly metadata?: {
    isSystemNode: boolean;
    isToolNode: boolean;
    isEmpty: boolean;
    isSubgraphEvent: boolean;
    subgraphId?: string;
    namespacePath: readonly string[];
  };
}

/**
 * Domain-specific tool execution event
 */
export interface ToolExecutionEvent<
  TState extends Record<string, unknown> = Record<string, unknown>
> {
  readonly type: 'tool-execution';
  readonly executionId: string;
  readonly toolData: Partial<TState>;
  readonly timestamp: string;
}

/**
 * Domain-specific message stream event (LLM token streaming)
 */
export interface MessageStreamEvent {
  readonly type: 'message-stream';
  readonly executionId: string;
  readonly nodeName: string;
  readonly step: number;
  readonly messageChunk: AIMessageChunk;
  readonly content: string;
  readonly timestamp: string;
  readonly metadata: MessagesStreamMetadata;
}

/**
 * Domain-specific custom stream event (user-defined data)
 */
export interface CustomStreamEvent {
  readonly type: 'custom-stream';
  readonly executionId: string;
  readonly data: unknown;
  readonly timestamp: string;
}

/**
 * Domain-specific debug stream event (execution traces)
 */
export interface DebugStreamEvent {
  readonly type: 'debug-stream';
  readonly executionId: string;
  readonly eventType: 'task' | 'task_result' | 'checkpoint';
  readonly timestamp: string;
  readonly step: number;
  readonly taskId: string;
  readonly taskName: string;
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
 * Union type for all domain events
 */
export type DomainStreamEvent<
  TState extends Record<string, unknown> = Record<string, unknown>
> =
  | WorkflowUpdateEvent<TState>
  | ToolExecutionEvent<TState>
  | MessageStreamEvent
  | CustomStreamEvent
  | DebugStreamEvent;

@Injectable()
export class StreamEventTransformer {
  private readonly logger = new Logger(StreamEventTransformer.name);

  /**
   * Transform parsed LangGraph event into domain-specific event
   *
   * Automatically routes to correct event type based on parsed event type
   *
   * @param parsedEvent - Parsed LangGraph event (any type)
   * @param executionId - Workflow execution ID
   * @returns Domain event
   */
  transformToDomainEvent<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    parsedEvent:
      | ParsedStreamEvent<TState>
      | ParsedMessageEvent
      | ParsedCustomEvent
      | ParsedDebugEvent,
    executionId: string
  ): DomainStreamEvent<TState> {
    // Route based on parsed event type
    if ('type' in parsedEvent) {
      switch (parsedEvent.type) {
        case 'message':
          return this.transformToMessageEvent(
            parsedEvent as ParsedMessageEvent,
            executionId
          );

        case 'custom':
          return this.transformToCustomEvent(
            parsedEvent as ParsedCustomEvent,
            executionId
          );

        case 'debug':
          return this.transformToDebugEvent(
            parsedEvent as ParsedDebugEvent,
            executionId
          );

        default:
          // 'type' doesn't exist on ParsedStreamEvent, fall through
          break;
      }
    }

    // Standard workflow event (ParsedStreamEvent)
    const standardEvent = parsedEvent as ParsedStreamEvent<TState>;

    // Tool nodes get special treatment
    if (standardEvent.isToolNode) {
      return this.transformToToolExecution(standardEvent, executionId);
    }

    // Default: workflow update
    return this.transformToWorkflowUpdate(standardEvent, executionId);
  }

  /**
   * Transform to workflow update event
   *
   * @param parsedEvent - Parsed LangGraph event
   * @param executionId - Workflow execution ID
   * @returns Workflow update event
   */
  transformToWorkflowUpdate<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    parsedEvent: ParsedStreamEvent<TState>,
    executionId: string
  ): WorkflowUpdateEvent<TState> {
    return {
      type: 'workflow-update',
      executionId,
      nodeName: parsedEvent.nodeName,
      state: parsedEvent.stateUpdate,
      timestamp: new Date().toISOString(),
      metadata: {
        isSystemNode: parsedEvent.isSystemNode,
        isToolNode: parsedEvent.isToolNode,
        isEmpty: parsedEvent.isEmpty,
        isSubgraphEvent: parsedEvent.isSubgraphEvent,
        subgraphId: parsedEvent.subgraphId,
        namespacePath: parsedEvent.namespacePath,
      },
    };
  }

  /**
   * Transform to tool execution event
   *
   * @param parsedEvent - Parsed LangGraph event
   * @param executionId - Workflow execution ID
   * @returns Tool execution event
   */
  transformToToolExecution<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    parsedEvent: ParsedStreamEvent<TState>,
    executionId: string
  ): ToolExecutionEvent<TState> {
    this.logger.debug(
      `Tool execution event for execution: ${executionId}`,
      JSON.stringify(parsedEvent.stateUpdate)
    );

    return {
      type: 'tool-execution',
      executionId,
      toolData: parsedEvent.stateUpdate,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Transform to message stream event (LLM token streaming)
   *
   * @param parsedEvent - Parsed message event
   * @param executionId - Workflow execution ID
   * @returns Message stream event
   */
  transformToMessageEvent(
    parsedEvent: ParsedMessageEvent,
    executionId: string
  ): MessageStreamEvent {
    // Extract content as string (handle array content)
    const content =
      typeof parsedEvent.messageChunk.content === 'string'
        ? parsedEvent.messageChunk.content
        : JSON.stringify(parsedEvent.messageChunk.content);

    this.logger.debug(
      `Message stream event for node: ${parsedEvent.nodeName}, step: ${parsedEvent.step}`
    );

    return {
      type: 'message-stream',
      executionId,
      nodeName: parsedEvent.nodeName,
      step: parsedEvent.step,
      messageChunk: parsedEvent.messageChunk,
      content,
      timestamp: new Date().toISOString(),
      metadata: parsedEvent.metadata,
    };
  }

  /**
   * Transform to custom stream event (user-defined data)
   *
   * @param parsedEvent - Parsed custom event
   * @param executionId - Workflow execution ID
   * @returns Custom stream event
   */
  transformToCustomEvent(
    parsedEvent: ParsedCustomEvent,
    executionId: string
  ): CustomStreamEvent {
    this.logger.debug(
      `Custom stream event for execution: ${executionId}`,
      typeof parsedEvent.data
    );

    return {
      type: 'custom-stream',
      executionId,
      data: parsedEvent.data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Transform to debug stream event (execution traces)
   *
   * @param parsedEvent - Parsed debug event
   * @param executionId - Workflow execution ID
   * @returns Debug stream event
   */
  transformToDebugEvent(
    parsedEvent: ParsedDebugEvent,
    executionId: string
  ): DebugStreamEvent {
    this.logger.debug(
      `Debug stream event: type="${parsedEvent.eventType}", task="${parsedEvent.taskName}"`
    );

    return {
      type: 'debug-stream',
      executionId,
      eventType: parsedEvent.eventType,
      timestamp: parsedEvent.timestamp,
      step: parsedEvent.step,
      taskId: parsedEvent.taskId,
      taskName: parsedEvent.taskName,
      payload: parsedEvent.payload,
    };
  }

  /**
   * Transform stream of parsed events into stream of domain events
   *
   * @param parsedStream - Stream of parsed events (any type)
   * @param executionId - Workflow execution ID
   * @yields Domain events
   */
  async *transformStream<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    parsedStream: AsyncIterable<
      | ParsedStreamEvent<TState>
      | ParsedMessageEvent
      | ParsedCustomEvent
      | ParsedDebugEvent
    >,
    executionId: string
  ): AsyncGenerator<DomainStreamEvent<TState>, void, unknown> {
    for await (const parsedEvent of parsedStream) {
      yield this.transformToDomainEvent(parsedEvent, executionId);
    }
  }
}
