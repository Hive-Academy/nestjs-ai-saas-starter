import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * Configuration for the LangGraph Angular integration.
 *
 * @remarks
 * Provided via `provideLangGraph(config)` to configure SSE streaming,
 * authentication, node-to-agent mapping, and HITL approval endpoints.
 *
 * @example
 * ```typescript
 * provideLangGraph({
 *   sseBaseUrl: 'http://localhost:3000/api',
 *   tokenProvider: () => inject(AuthService).getSseTicket(),
 *   nodeIdMapper: (nodeId) => nodeId.split('/')[1] ?? null,
 * })
 * ```
 *
 * @public
 */
export interface LangGraphConfig {
  /** Base URL for SSE stream endpoints (e.g., 'http://localhost:3000/api') */
  sseBaseUrl: string;

  /**
   * Optional token provider for authenticated SSE connections.
   * Returns an Observable that emits the auth token string.
   * The token is appended as `?token=<value>` query parameter.
   *
   * @example
   * ```typescript
   * tokenProvider: () => inject(AuthService).getSseTicket()
   * ```
   */
  tokenProvider?: () => Observable<string>;

  /**
   * Optional mapper from LangGraph node IDs to application-specific agent IDs.
   * Returns the mapped agent ID, or `null` to skip the event.
   *
   * @remarks
   * Replaces the POC's hardcoded `phaseToAgent` mapping with a
   * consumer-provided function, allowing any domain to define its
   * own node-to-agent mapping strategy.
   *
   * @example
   * ```typescript
   * nodeIdMapper: (nodeId) => {
   *   const phase = nodeId.split('/')[1];
   *   const map: Record<string, string> = {
   *     'github-analysis': 'github-code-analyzer',
   *     'brand-strategy': 'personal-brand-strategist',
   *   };
   *   return map[phase] ?? null;
   * }
   * ```
   */
  nodeIdMapper?: (nodeId: string) => string | null;

  /** Whether to reconnect on SSE error. Default: `false` (prevents reconnect loops). */
  reconnectOnError?: boolean;

  /**
   * SSE event names to listen for.
   * Default: `['workflow-update', 'workflow_complete', 'workflow_error']`.
   * These map to `addEventListener(eventName, ...)` on the EventSource.
   */
  eventTypes?: string[];

  /**
   * Optional base URL for HITL approval REST endpoints.
   * When provided, the approval composable will POST approve/reject
   * decisions to the backend to resume interrupted workflows via `Command({ resume: value })`.
   *
   * @remarks
   * The library will POST to:
   *   `${approvalUrl}/${executionId}` with body `{ action: 'approve' | 'reject', feedback?: string }`
   *
   * @example
   * ```typescript
   * approvalUrl: '/api/research/approve'
   * ```
   */
  approvalUrl?: string;
}

/**
 * Connection state for SSE transport.
 *
 * @remarks
 * Tracks the current state of the SSE connection including
 * status transitions and error information.
 *
 * @public
 */
export interface ConnectionState {
  /** Current connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Last error message if status is 'error' */
  lastError?: string;
}

/**
 * Default SSE event types matching the backend `@Sse()` pattern.
 *
 * @remarks
 * These are the standard event names emitted by NestJS SSE endpoints
 * in the LangGraph workflow streaming architecture.
 *
 * @public
 */
export const DEFAULT_SSE_EVENT_TYPES = [
  'workflow-update',
  'workflow_complete',
  'workflow_error',
] as const;

/**
 * Injection token for LangGraph configuration.
 *
 * @remarks
 * Used internally by LangGraph services to access the configuration
 * provided via `provideLangGraph(config)`. Consumers should not
 * need to interact with this token directly.
 *
 * @public
 */
export const LANGGRAPH_CONFIG = new InjectionToken<LangGraphConfig>(
  'LANGGRAPH_CONFIG'
);
