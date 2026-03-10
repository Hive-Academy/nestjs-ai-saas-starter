import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

import type { ConnectionState } from '../models/config.model';
import {
  DEFAULT_SSE_EVENT_TYPES,
  LANGGRAPH_CONFIG,
} from '../models/config.model';

/**
 * Generic SSE connection service for LangGraph workflow streaming.
 *
 * @remarks
 * Manages EventSource lifecycle including authenticated connections
 * via a configurable `tokenProvider`, event parsing, and error handling.
 * Replaces the POC's `DevBrandSseService` with a domain-agnostic,
 * library-level implementation.
 *
 * **Key differences from POC**:
 * - Injects `LANGGRAPH_CONFIG` token instead of a concrete `AuthService`
 * - Event types are configurable via `config.eventTypes`
 * - Typed `workflowUpdates$` (`Record<string, unknown>` instead of `any`)
 * - Structured logging without emoji spam
 *
 * @example
 * ```typescript
 * const sse = inject(LangGraphSseService);
 *
 * sse.workflowUpdates$.subscribe(update => {
 *   console.log('Received:', update);
 * });
 *
 * sse.connect('/api/stream/exec-123');
 *
 * // Later...
 * sse.disconnect();
 * ```
 *
 * @public
 */
@Injectable()
export class LangGraphSseService {
  private readonly config = inject(LANGGRAPH_CONFIG);

  private eventSource?: EventSource;

  private readonly _connectionState = signal<ConnectionState>({
    status: 'disconnected',
  });

  private readonly _workflowUpdates = new Subject<Record<string, unknown>>();

  private readonly _errors = new Subject<{
    message: string;
    timestamp: Date;
  }>();

  /** Readonly signal reflecting the current SSE connection state. */
  readonly connectionState = this._connectionState.asReadonly();

  /** Observable stream of parsed workflow update events from the SSE connection. */
  readonly workflowUpdates$ = this._workflowUpdates.asObservable();

  /** Observable stream of error events (authentication failures, parse errors, connection loss). */
  readonly errors$ = this._errors.asObservable();

  /** Computed signal that is `true` when the SSE connection is established. */
  readonly isConnected = computed(
    () => this.connectionState().status === 'connected'
  );

  /**
   * Establish an SSE connection to the given stream URL.
   *
   * @remarks
   * If the service is already connected, the existing connection is
   * disconnected first to prevent resource leaks.
   *
   * When a `tokenProvider` is configured, the provider is called and
   * the emitted token is appended as a `?token=<value>` query parameter
   * before creating the `EventSource`.
   *
   * @param streamUrl - Full or relative URL for the SSE stream endpoint
   */
  connect(streamUrl: string): void {
    // If already connected, disconnect first (prevents resource leaks)
    if (this.eventSource) {
      this.disconnect();
    }

    this._connectionState.set({ status: 'connecting' });

    const { tokenProvider } = this.config;

    if (tokenProvider) {
      tokenProvider().subscribe({
        next: (token: string) => {
          const urlWithToken = this.appendTokenToUrl(streamUrl, token);
          this.createEventSource(urlWithToken);
        },
        error: (err: unknown) => {
          const message = 'Authentication failed: could not obtain SSE token';
          this._connectionState.set({ status: 'error', lastError: message });
          this._errors.next({ message, timestamp: new Date() });
          this.logError(message, err);
        },
      });
    } else {
      this.createEventSource(streamUrl);
    }
  }

  /**
   * Gracefully close the SSE connection and reset state.
   *
   * @remarks
   * The internal Subjects are **not** completed so the service
   * remains reusable across multiple workflow executions.
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    this._connectionState.set({ status: 'disconnected' });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Create the EventSource instance and wire up all event listeners.
   *
   * @param url - Fully-resolved URL (with token if applicable)
   */
  private createEventSource(url: string): void {
    this.eventSource = new EventSource(url);
    this.registerEventListeners();
  }

  /**
   * Register listeners for the `onopen`, `onerror`, and all configured
   * SSE event types on the active EventSource.
   */
  private registerEventListeners(): void {
    if (!this.eventSource) {
      return;
    }

    // Connection established
    this.eventSource.onopen = () => {
      this._connectionState.set({ status: 'connected' });
    };

    // Connection-level error (network issues, server close)
    // Always disconnect to prevent EventSource auto-reconnect loops
    // when the backend has already cleaned up the stream.
    this.eventSource.onerror = () => {
      const message = 'SSE connection lost';
      this._connectionState.set({ status: 'error', lastError: message });
      this._errors.next({ message, timestamp: new Date() });
      this.disconnect();
    };

    // Register listeners for each configured event type
    const eventTypes = this.config.eventTypes ?? DEFAULT_SSE_EVENT_TYPES;

    for (const eventType of eventTypes) {
      this.eventSource.addEventListener(
        eventType,
        (event: MessageEvent<string>) => {
          this.handleSseEvent(eventType, event);
        }
      );
    }
  }

  /**
   * Parse and emit a single SSE event. Malformed JSON is caught
   * and emitted on the `errors$` stream instead of crashing.
   *
   * @param eventType - The SSE event name that triggered this handler
   * @param event - The raw MessageEvent from the EventSource
   */
  private handleSseEvent(eventType: string, event: MessageEvent<string>): void {
    let data: Record<string, unknown>;

    try {
      data = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      const message = `Failed to parse SSE event data for "${eventType}"`;
      this._errors.next({ message, timestamp: new Date() });
      this.logError(message, event.data);
      return;
    }

    this._workflowUpdates.next(data);
  }

  /**
   * Append an authentication token as a query parameter to the given URL.
   *
   * @param url - Base stream URL
   * @param token - Auth token to append
   * @returns URL with `?token=<value>` or `&token=<value>` appended
   */
  private appendTokenToUrl(url: string, token: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }

  /**
   * Minimal structured error logging (replaces POC emoji-heavy console output).
   */
  private logError(message: string, detail?: unknown): void {
    console.error(`[LangGraphSseService] ${message}`, detail ?? '');
  }
}
