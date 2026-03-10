import { Injectable, computed, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import { StreamEventType } from '../models/stream-events.model';
import { LangGraphSseService } from './langgraph-sse.service';

/**
 * A buffered streaming message from a specific LangGraph node.
 *
 * @remarks
 * Represents accumulated token output from an LLM node during streaming.
 * Messages are buffered by `nodeId` and marked complete when the node finishes.
 *
 * @public
 */
export interface StreamingMessage {
  /** LangGraph node ID that produced this message */
  nodeId: string;
  /** Accumulated content from token events */
  content: string;
  /** Timestamp when the first token was received */
  timestamp: Date;
  /** Whether the node has finished producing tokens */
  isComplete: boolean;
}

/** Default token batch interval in milliseconds */
const TOKEN_BATCH_INTERVAL_MS = 50;

/**
 * Streaming service for real-time LLM token accumulation and display.
 *
 * @remarks
 * Handles high-frequency token events from LangGraph LLM nodes by batching
 * updates at a configurable interval (default 50ms) to prevent excessive
 * Angular change detection cycles.
 *
 * **Key features**:
 * - Token buffering with batch flush to reduce signal updates
 * - Per-node message tracking with completion state
 * - Clean lifecycle management (start/stop/reset)
 *
 * @public
 */
@Injectable()
export class LangGraphStreamingService {
  private readonly sseService = inject(LangGraphSseService);

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  private readonly _currentStreamingText = signal<string>('');
  private readonly _streamingMessages = signal<StreamingMessage[]>([]);
  private readonly _isStreaming = signal<boolean>(false);

  private tokenBuffer: string[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private sseSubscription: Subscription | null = null;

  // ---------------------------------------------------------------------------
  // Public readonly accessors
  // ---------------------------------------------------------------------------

  /** The complete accumulated streaming text from all tokens. */
  readonly currentStreamingText = this._currentStreamingText.asReadonly();

  /** All streaming messages grouped by node, with completion state. */
  readonly streamingMessages = this._streamingMessages.asReadonly();

  /** Whether the service is actively streaming tokens. */
  readonly isStreaming = computed(() => this._isStreaming());

  /** Total character count of the accumulated streaming text. */
  readonly tokenCount = computed(() => this._currentStreamingText().length);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start streaming by subscribing to SSE workflow updates.
   *
   * @remarks
   * Filters incoming events for token and message-stream types,
   * and starts the batch flush timer for efficient signal updates.
   */
  startStreaming(): void {
    // Clean up any existing streaming session
    this.stopStreaming();

    this._isStreaming.set(true);
    this.tokenBuffer = [];

    // Start the batch flush timer
    this.batchTimer = setInterval(() => {
      this.flushTokenBuffer();
    }, TOKEN_BATCH_INTERVAL_MS);

    // Subscribe to SSE events
    this.sseSubscription = this.sseService.workflowUpdates$.subscribe(
      (rawUpdate: Record<string, unknown>) => {
        const rawType = rawUpdate['type'];

        if (
          rawType === 'message-stream' ||
          rawType === StreamEventType.MESSAGE_STREAM
        ) {
          this.processMessageStreamEvent(rawUpdate);
        } else if (rawType === 'token' || rawType === StreamEventType.TOKEN) {
          this.processTokenEvent(rawUpdate);
        }
      }
    );
  }

  /**
   * Stop streaming, flush remaining tokens, and mark all messages complete.
   *
   * @remarks
   * Clears the batch timer, flushes any remaining buffered tokens,
   * and marks all in-progress streaming messages as complete.
   */
  stopStreaming(): void {
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush any remaining tokens
    this.flushTokenBuffer();

    // Mark all messages as complete
    this._streamingMessages.update((messages) =>
      messages.map((msg) =>
        msg.isComplete ? msg : { ...msg, isComplete: true }
      )
    );

    // Clean up subscription
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
      this.sseSubscription = null;
    }

    this._isStreaming.set(false);
  }

  /**
   * Reset all streaming state to initial values.
   *
   * @remarks
   * Stops any active streaming, clears accumulated text and messages.
   */
  reset(): void {
    this.stopStreaming();
    this._currentStreamingText.set('');
    this._streamingMessages.set([]);
    this.tokenBuffer = [];
  }

  // ---------------------------------------------------------------------------
  // Private event processors
  // ---------------------------------------------------------------------------

  /**
   * Process an individual token event by adding it to the buffer.
   *
   * @param data - Raw SSE event data containing the token
   */
  private processTokenEvent(data: Record<string, unknown>): void {
    const token =
      typeof data['token'] === 'string'
        ? data['token']
        : typeof data['content'] === 'string'
        ? data['content']
        : null;

    if (token) {
      this.tokenBuffer.push(token);
    }
  }

  /**
   * Process a message-stream event, accumulating content per node.
   *
   * @remarks
   * Creates a new `StreamingMessage` for each previously unseen node,
   * or appends content to an existing one.
   *
   * @param data - Raw SSE event data containing message content and node info
   */
  private processMessageStreamEvent(data: Record<string, unknown>): void {
    const content =
      typeof data['content'] === 'string' ? data['content'] : null;

    if (!content) return;

    // Also buffer the content as a token for the aggregate text signal
    this.tokenBuffer.push(content);

    const nodeId =
      (typeof data['nodeName'] === 'string' ? data['nodeName'] : null) ??
      (typeof data['nodeId'] === 'string' ? data['nodeId'] : null) ??
      'unknown';

    this._streamingMessages.update((messages) => {
      const existingIndex = messages.findIndex(
        (m) => m.nodeId === nodeId && !m.isComplete
      );

      if (existingIndex >= 0) {
        // Append content to existing message
        const updated = [...messages];
        const existing = messages[existingIndex];
        updated[existingIndex] = {
          ...existing,
          content: existing.content + content,
        };
        return updated;
      }

      // Create new streaming message for this node
      return [
        ...messages,
        {
          nodeId,
          content,
          timestamp: new Date(),
          isComplete: false,
        },
      ];
    });
  }

  /**
   * Flush accumulated tokens from the buffer to the streaming text signal.
   *
   * @remarks
   * Called on the batch interval timer. Joins all buffered tokens and
   * appends to the current streaming text in a single signal update.
   */
  private flushTokenBuffer(): void {
    if (this.tokenBuffer.length === 0) return;

    const flushed = this.tokenBuffer.join('');
    this.tokenBuffer = [];

    this._currentStreamingText.update((current) => current + flushed);
  }
}
