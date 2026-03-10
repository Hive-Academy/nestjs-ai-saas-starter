/**
 * @file StreamEventParser - Defensive LangGraph Stream Parser
 * @description Parses LangGraph stream chunks with comprehensive validation
 *
 * ARCHITECTURE:
 * - Defensive programming: Validates every chunk before processing
 * - Type-safe: Uses official LangGraph types
 * - Zero assumptions: Handles empty, malformed, and edge-case chunks
 * - Production-ready: Comprehensive error handling and logging
 *
 * USAGE:
 * ```typescript
 * const parser = new StreamEventParser();
 * for await (const chunk of stream) {
 *   const parsed = parser.parseChunk(chunk);
 *   if (parsed) {
 *     // Handle parsed event
 *   }
 * }
 * ```
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  LangGraphStreamChunk,
  ParsedStreamEvent,
  ParsedMessageEvent,
  ParsedCustomEvent,
  ParsedDebugEvent,
  StreamChunkValidation,
  SubgraphStreamChunk,
  MessagesStreamChunk,
  DebugStreamChunk,
  MultiModeStreamChunk,
} from '../types/stream-event.types';
import {
  isValidChunk,
  isEmptyChunk,
  isSystemNode,
  isToolNode,
  isSubgraphChunk,
  isMessagesChunk,
  isCustomChunk,
  isDebugChunk,
  isMultiModeChunk,
  extractSubgraphId,
} from '../types/stream-event.types';

@Injectable()
export class StreamEventParser {
  private readonly logger = new Logger(StreamEventParser.name);

  /**
   * Parse a LangGraph stream chunk into a validated, structured event
   *
   * Handles all stream modes:
   * - Standard chunks (updates/values): { nodeName: stateUpdate }
   * - Subgraph chunks: [namespace[], mode, chunk]
   * - Messages chunks: [messageChunk, metadata]
   * - Custom chunks: any user-defined data
   * - Debug chunks: { type, timestamp, payload }
   * - Multi-mode chunks: [mode, data]
   *
   * Returns null for invalid/empty chunks (caller should skip)
   *
   * @param chunk - Raw chunk from LangGraph stream
   * @returns Parsed event or null if invalid/empty
   */
  parseChunk<TState extends Record<string, unknown> = Record<string, unknown>>(
    chunk: unknown
  ):
    | ParsedStreamEvent<TState>
    | ParsedMessageEvent
    | ParsedCustomEvent
    | ParsedDebugEvent
    | null {
    // Priority order: Check most specific formats first

    // 1. Multi-mode chunk (when streamMode is array)
    if (isMultiModeChunk(chunk)) {
      return this.parseMultiModeChunk(chunk);
    }

    // 2. Messages mode (LLM token streaming)
    if (isMessagesChunk(chunk)) {
      return this.parseMessagesChunk(chunk);
    }

    // 3. Debug mode (execution traces)
    if (isDebugChunk(chunk)) {
      return this.parseDebugChunk(chunk);
    }

    // 4. Subgraph chunk (multi-agent streaming)
    if (isSubgraphChunk<TState>(chunk)) {
      return this.parseSubgraphChunk(chunk);
    }

    // 5. Custom mode (user-defined data) - check BEFORE standard to avoid false positives
    if (isCustomChunk(chunk)) {
      return this.parseCustomChunk(chunk);
    }

    // 6. Standard chunk (updates/values mode)
    return this.parseStandardChunk(chunk);
  }

  /**
   * Parse a standard LangGraph chunk (without subgraphs)
   * Format: { nodeName: stateUpdate }
   */
  private parseStandardChunk<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(chunk: unknown): ParsedStreamEvent<TState> | null {
    // Step 1: Validate chunk structure
    const validation = this.validateChunk(chunk);

    if (!validation.isValid) {
      if (validation.isEmpty) {
        this.logger.debug('Skipping empty stream chunk');
      } else {
        this.logger.warn(
          `Invalid stream chunk: ${validation.reason}`,
          typeof chunk === 'object' ? JSON.stringify(chunk) : String(chunk)
        );
      }
      return null;
    }

    // Step 2: Extract node name and state update
    // LangGraph structure: { nodeName: stateUpdate }
    const typedChunk = chunk as LangGraphStreamChunk<TState>;
    const nodeNames = Object.keys(typedChunk);

    // Should have exactly one key (node name)
    if (nodeNames.length !== 1) {
      this.logger.warn(
        `Unexpected chunk structure: expected 1 key, got ${nodeNames.length}`,
        JSON.stringify(typedChunk)
      );
      return null;
    }

    const nodeName = nodeNames[0];
    const stateUpdate = typedChunk[nodeName];

    // Step 3: Validate state update is an object
    if (stateUpdate === null || typeof stateUpdate !== 'object') {
      this.logger.warn(
        `Invalid state update for node "${nodeName}": expected object, got ${typeof stateUpdate}`
      );
      return null;
    }

    // Step 4: Build parsed event (parent graph event)
    const parsedEvent: ParsedStreamEvent<TState> = {
      nodeName,
      stateUpdate: stateUpdate as Partial<TState>,
      isSystemNode: isSystemNode(nodeName),
      isToolNode: isToolNode(nodeName),
      isEmpty: Object.keys(stateUpdate).length === 0,
      namespacePath: [], // Empty = parent graph
      isSubgraphEvent: false,
      subgraphId: undefined,
      rawChunk: typedChunk,
    };

    this.logger.debug(
      `Parsed stream event: node="${nodeName}", isSystemNode=${parsedEvent.isSystemNode}, isToolNode=${parsedEvent.isToolNode}, isEmpty=${parsedEvent.isEmpty}`
    );

    return parsedEvent;
  }

  /**
   * Parse a subgraph chunk (tuple format when subgraphs: true)
   * Format: [namespace[], mode, data]
   * Where data depends on mode:
   *   - 'updates'/'values': { nodeName: stateUpdate }
   *   - 'messages': [messageChunk, metadata]
   *   - 'custom': any
   *   - 'debug': { type, timestamp, payload }
   */
  private parseSubgraphChunk<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    chunk: SubgraphStreamChunk<TState>
  ):
    | ParsedStreamEvent<TState>
    | ParsedMessageEvent
    | ParsedCustomEvent
    | ParsedDebugEvent
    | null {
    const [namespacePath, streamMode, data] = chunk;

    // Route non-updates modes to their appropriate parsers
    if (streamMode === 'messages' && isMessagesChunk(data)) {
      return this.parseMessagesChunk(data);
    }
    if (streamMode === 'debug' && isDebugChunk(data)) {
      return this.parseDebugChunk(data);
    }
    if (streamMode === 'custom') {
      return this.parseCustomChunk(data);
    }

    // Standard updates/values mode: data is { nodeName: stateUpdate }
    const stateChunk = data as LangGraphStreamChunk<TState>;

    // Validate the state chunk part (same as standard chunk)
    if (isEmptyChunk(stateChunk)) {
      this.logger.debug('Skipping empty subgraph chunk');
      return null;
    }

    const nodeNames = Object.keys(stateChunk);
    if (nodeNames.length !== 1) {
      this.logger.warn(
        `Unexpected subgraph chunk structure: expected 1 key, got ${nodeNames.length}`,
        JSON.stringify(stateChunk)
      );
      return null;
    }

    const nodeName = nodeNames[0];
    const stateUpdate = stateChunk[nodeName];

    if (stateUpdate === null || typeof stateUpdate !== 'object') {
      this.logger.warn(
        `Invalid subgraph state update for node "${nodeName}": expected object, got ${typeof stateUpdate}`
      );
      return null;
    }

    // Extract subgraph identifier from namespace path
    const subgraphId = extractSubgraphId(namespacePath);
    const isSubgraphEvent = namespacePath.length > 0;

    const parsedEvent: ParsedStreamEvent<TState> = {
      nodeName,
      stateUpdate: stateUpdate as Partial<TState>,
      isSystemNode: isSystemNode(nodeName),
      isToolNode: isToolNode(nodeName),
      isEmpty: Object.keys(stateUpdate).length === 0,
      namespacePath,
      isSubgraphEvent,
      subgraphId,
      rawChunk: chunk,
    };

    this.logger.debug(
      `Parsed subgraph event: node="${nodeName}", subgraph="${
        subgraphId || 'parent'
      }", namespace=${JSON.stringify(namespacePath)}, mode=${streamMode}`
    );

    return parsedEvent;
  }

  /**
   * Parse multiple chunks from an async iterable stream
   *
   * Automatically filters out invalid/empty chunks
   *
   * @param stream - LangGraph stream (async iterable)
   * @yields Parsed events
   */
  async *parseStream<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    stream: AsyncIterable<unknown>
  ): AsyncGenerator<
    | ParsedStreamEvent<TState>
    | ParsedMessageEvent
    | ParsedCustomEvent
    | ParsedDebugEvent,
    void,
    unknown
  > {
    for await (const chunk of stream) {
      const parsed = this.parseChunk<TState>(chunk);
      if (parsed) {
        yield parsed;
      }
    }
  }

  /**
   * Validate chunk structure
   *
   * @param chunk - Raw chunk to validate
   * @returns Validation result
   */
  private validateChunk(chunk: unknown): StreamChunkValidation {
    // Check for empty chunk
    if (isEmptyChunk(chunk)) {
      return {
        isValid: false,
        isEmpty: true,
        reason: 'Chunk is null, undefined, or empty object',
      };
    }

    // Check if chunk is a valid object
    if (!isValidChunk(chunk)) {
      return {
        isValid: false,
        isEmpty: false,
        reason: `Chunk is not a valid object: ${typeof chunk}`,
      };
    }

    return { isValid: true, isEmpty: false };
  }

  /**
   * Check if event should be skipped
   *
   * Utility method for filtering logic
   *
   * @param event - Parsed event
   * @returns True if event should be skipped
   */
  shouldSkipEvent<TState extends Record<string, unknown>>(
    event:
      | ParsedStreamEvent<TState>
      | ParsedMessageEvent
      | ParsedCustomEvent
      | ParsedDebugEvent
  ): boolean {
    // Only apply skipping logic to standard stream events
    if ('nodeName' in event && 'stateUpdate' in event) {
      const standardEvent = event as ParsedStreamEvent<TState>;

      // Skip empty updates (no state changes)
      if (standardEvent.isEmpty) {
        this.logger.debug(
          `Skipping empty update for node: ${standardEvent.nodeName}`
        );
        return true;
      }

      // Skip system start node (typically no useful state)
      if (standardEvent.nodeName === '__start__') {
        this.logger.debug('Skipping __start__ node');
        return true;
      }
    }

    // Don't skip messages, custom, or debug events
    return false;
  }

  /**
   * Parse a messages mode chunk: [messageChunk, metadata]
   * Format used when streamMode: 'messages'
   */
  private parseMessagesChunk(chunk: MessagesStreamChunk): ParsedMessageEvent {
    const [messageChunk, metadata] = chunk;

    this.logger.debug(
      `Parsed messages event: node="${metadata.langgraph_node}", step=${metadata.langgraph_step}`
    );

    return {
      type: 'message',
      messageChunk,
      metadata,
      nodeName: metadata.langgraph_node,
      step: metadata.langgraph_step,
      rawChunk: chunk,
    };
  }

  /**
   * Parse a custom mode chunk (user-defined data)
   * Format used when streamMode: 'custom'
   */
  private parseCustomChunk(chunk: unknown): ParsedCustomEvent {
    this.logger.debug('Parsed custom event', typeof chunk);

    return {
      type: 'custom',
      data: chunk,
      rawChunk: chunk,
    };
  }

  /**
   * Parse a debug mode chunk: { type, timestamp, payload }
   * Format used when streamMode: 'debug'
   */
  private parseDebugChunk(chunk: DebugStreamChunk): ParsedDebugEvent {
    const { type, timestamp, step, payload } = chunk;

    this.logger.debug(
      `Parsed debug event: type="${type}", task="${payload.name}", step=${step}`
    );

    return {
      type: 'debug',
      eventType: type,
      timestamp,
      step,
      taskId: payload.id,
      taskName: payload.name,
      payload,
      rawChunk: chunk,
    };
  }

  /**
   * Parse a multi-mode chunk: [mode, data]
   * Format used when streamMode is an array (e.g., ['updates', 'messages'])
   */
  private parseMultiModeChunk<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(
    chunk: MultiModeStreamChunk
  ):
    | ParsedStreamEvent<TState>
    | ParsedMessageEvent
    | ParsedCustomEvent
    | ParsedDebugEvent
    | null {
    const [mode, data] = chunk;

    this.logger.debug(`Parsing multi-mode chunk: mode="${mode}"`);

    // Route to appropriate parser based on mode
    switch (mode) {
      case 'updates':
      case 'values':
        return this.parseStandardChunk<TState>(data);

      case 'messages':
        if (isMessagesChunk(data)) {
          return this.parseMessagesChunk(data);
        }
        this.logger.warn(
          'Multi-mode messages data is not a valid messages chunk'
        );
        return null;

      case 'custom':
        return this.parseCustomChunk(data);

      case 'debug':
        if (isDebugChunk(data)) {
          return this.parseDebugChunk(data);
        }
        this.logger.warn('Multi-mode debug data is not a valid debug chunk');
        return null;

      default:
        this.logger.warn(`Unknown stream mode in multi-mode chunk: ${mode}`);
        return null;
    }
  }
}
