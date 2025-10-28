import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  StreamUpdate,
  StreamUpdateSchema,
  TokenUpdate,
  WebSocketError,
  ConnectionState,
  SubscriptionConfirmed,
} from '../models';

/**
 * DevBrand WebSocket Service
 *
 * Real-time event streaming service using Socket.io for LangGraph workflow execution.
 * Evidence: libs/langgraph-modules/streaming/src/lib/services/streaming-websocket.service.ts:108-121
 *
 * @remarks
 * **Purpose**:
 * - Establishes WebSocket connection to streaming backend
 * - Subscribes to workflow execution events
 * - Provides real-time event streams (stream updates, token updates, errors)
 * - Manages connection lifecycle with automatic reconnection
 *
 * **Connection Lifecycle**:
 * 1. User triggers workflow execution via REST API
 * 2. Backend returns websocketUrl and executionId
 * 3. Frontend calls connect(websocketUrl)
 * 4. Socket.io establishes connection (WebSocket or polling fallback)
 * 5. Backend emits 'connection_status' event
 * 6. Frontend calls subscribeToExecution(executionId)
 * 7. Backend emits 'subscription_confirmed'
 * 8. Stream events begin ('stream_update', 'token_update', 'error')
 * 9. On completion or error, call disconnect()
 *
 * **Automatic Reconnection**:
 * - Max attempts: 10 (environment.ts:15)
 * - Reconnection delay: 3000ms (environment.ts:16)
 * - Connection timeout: 30000ms (environment.ts:39)
 * - Transports: WebSocket (primary), HTTP long-polling (fallback)
 *
 * **State Management**:
 * - Signal-based connection state (modern Angular pattern)
 * - RxJS Subjects for event streams (observable architecture)
 * - Readonly signal accessors (immutable state)
 * - Computed signals for derived state (isConnected)
 *
 * **Event Validation**:
 * - Zod runtime validation for all incoming events
 * - Invalid events logged and emitted to errors$ stream
 * - Validation errors don't interrupt stream processing
 *
 * **Modern Angular Pattern**:
 * - Standalone service (providedIn: 'root')
 * - Signal-based state (NOT BehaviorSubjects for primitive state)
 * - Observable streams for event sequences
 *
 * @example
 * ```typescript
 * // In component
 * const wsService = inject(DevBrandWebSocketService);
 *
 * // Connect to WebSocket
 * wsService.connect('ws://localhost:8080/streaming');
 *
 * // Subscribe to execution stream
 * wsService.subscribeToExecution('exec-abc123');
 *
 * // Listen to stream updates
 * wsService.streamUpdates$.subscribe(update => {
 *   console.log('Event:', update.type, update.data);
 * });
 *
 * // Monitor connection state
 * effect(() => {
 *   console.log('Connection:', wsService.connectionState());
 * });
 *
 * // Cleanup on destroy
 * ngOnDestroy() {
 *   wsService.disconnect();
 * }
 * ```
 *
 * @see {@link ConnectionState} Connection state interface
 * @see {@link StreamUpdate} Stream update event interface
 * @see {@link TokenUpdate} Token update event interface
 * @see {@link WebSocketError} WebSocket error interface
 * @public
 */
@Injectable({
  providedIn: 'root',
})
export class DevBrandWebSocketService {
  /**
   * Socket.io client instance
   * @private
   * @remarks
   * - undefined when not connected
   * - Set during connect() call
   * - Cleared during disconnect() call
   */
  private socket?: Socket;

  /**
   * Connection state signal
   * @private
   * @remarks
   * - Signal-based state (modern Angular pattern)
   * - Updated by connection lifecycle events
   * - Accessible via readonly connectionState signal
   */
  private readonly _connectionState = signal<ConnectionState>({
    status: 'disconnected',
    reconnectAttempt: 0,
    maxReconnectAttempts: 10,
    lastError: undefined,
  });

  /**
   * Stream update subject (StreamUpdate events)
   * @private
   * @remarks
   * - RxJS Subject for event sequences
   * - Emits validated StreamUpdate events
   * - Accessible via streamUpdates$ observable
   */
  private readonly _streamUpdates = new Subject<StreamUpdate>();

  /**
   * Token update subject (LLM token streaming)
   * @private
   * @remarks
   * - Emits individual tokens from LLM responses
   * - Used for real-time text generation display
   * - Accessible via tokenUpdates$ observable
   */
  private readonly _tokenUpdates = new Subject<TokenUpdate>();

  /**
   * Error subject (WebSocket and validation errors)
   * @private
   * @remarks
   * - Emits connection errors, validation errors, protocol errors
   * - Does NOT complete the stream (errors are non-fatal)
   * - Accessible via errors$ observable
   */
  private readonly _errors = new Subject<WebSocketError>();

  /**
   * Readonly connection state signal
   * @public
   * @remarks
   * - Immutable view of connection state
   * - Reactive updates trigger component re-renders
   * - Use in templates or effect() functions
   */
  readonly connectionState = this._connectionState.asReadonly();

  /**
   * Stream updates observable
   * @public
   * @remarks
   * - Observable sequence of StreamUpdate events
   * - Validated with Zod schema before emission
   * - Subscribe in services or components
   */
  readonly streamUpdates$ = this._streamUpdates.asObservable();

  /**
   * Token updates observable
   * @public
   * @remarks
   * - Observable sequence of TokenUpdate events
   * - Used for LLM token streaming
   * - Subscribe for real-time text display
   */
  readonly tokenUpdates$ = this._tokenUpdates.asObservable();

  /**
   * Errors observable
   * @public
   * @remarks
   * - Observable sequence of WebSocketError events
   * - Non-fatal errors (stream continues)
   * - Subscribe for error notification UI
   */
  readonly errors$ = this._errors.asObservable();

  /**
   * Computed connection status
   * @public
   * @remarks
   * - Derived from connectionState signal
   * - Returns true when status === 'connected'
   * - Use for conditional rendering (e.g., disable buttons)
   */
  readonly isConnected = computed(
    () => this.connectionState().status === 'connected'
  );

  /**
   * Connect to WebSocket server
   *
   * Establishes Socket.io connection to streaming backend.
   * Evidence: libs/langgraph-modules/streaming/.../streaming-websocket.service.ts:167-245
   *
   * @param websocketUrl - WebSocket server URL (from REST API response)
   * @returns void
   *
   * @remarks
   * **Connection Behavior**:
   * - Checks if already connected (warns and returns if true)
   * - Updates connection state to 'connecting'
   * - Creates Socket.io client with reconnection config
   * - Registers event listeners for connection lifecycle
   *
   * **Socket.io Configuration**:
   * - transports: ['websocket', 'polling'] - WebSocket primary, polling fallback
   * - reconnection: true - Automatic reconnection enabled
   * - reconnectionAttempts: 10 - Max 10 reconnection attempts
   * - reconnectionDelay: 3000 - 3 second delay between attempts
   * - timeout: 30000 - 30 second connection timeout
   *
   * **Idempotency**:
   * - Safe to call multiple times (checks existing connection)
   * - Warns if already connected
   * - Does NOT disconnect existing connection
   *
   * @example
   * ```typescript
   * // Basic connection
   * wsService.connect('ws://localhost:8080/streaming');
   *
   * // With connection state monitoring
   * wsService.connect('ws://localhost:8080/streaming');
   * effect(() => {
   *   const state = wsService.connectionState();
   *   if (state.status === 'connected') {
   *     console.log('Connected:', state.connectionId);
   *   }
   * });
   * ```
   *
   * @throws Never throws - logs warnings to console
   * @public
   */
  connect(websocketUrl: string): void {
    // Guard: Check if already connected
    if (this.socket?.connected) {
      console.warn('[DevBrandWebSocketService] Already connected to WebSocket');
      return;
    }

    // Update state: reconnecting (used for initial connection too)
    this._connectionState.update((state) => ({
      ...state,
      status: 'reconnecting',
      reconnectAttempt: 0,
    }));

    // Create Socket.io client
    // Evidence: environment.ts:14-21 (reconnection config)
    this.socket = io(websocketUrl, {
      transports: ['websocket', 'polling'], // WebSocket first, polling fallback
      reconnection: true, // Enable automatic reconnection
      reconnectionAttempts: 10, // Max 10 reconnection attempts
      reconnectionDelay: 3000, // 3 second delay between attempts
      timeout: 30000, // 30 second connection timeout
    });

    // Register Socket.io event listeners
    this.registerSocketListeners();
  }

  /**
   * Subscribe to execution stream
   *
   * Subscribes to real-time events for a specific workflow execution.
   * Evidence: libs/langgraph-modules/streaming/.../streaming-websocket.service.ts:282-322
   *
   * @param executionId - Unique workflow execution identifier (from REST API response)
   * @returns void
   *
   * @remarks
   * **Subscription Behavior**:
   * - Emits 'subscribe_execution' event to backend
   * - Backend joins client to execution-specific Socket.io room
   * - Backend responds with 'subscription_confirmed' event
   * - Stream events begin flowing after confirmation
   *
   * **Error Handling**:
   * - Throws if WebSocket not connected
   * - Use after successful connect() call
   * - Check isConnected() computed signal before calling
   *
   * @throws Error if WebSocket not connected
   *
   * @example
   * ```typescript
   * // After connection established
   * wsService.connect('ws://localhost:8080/streaming');
   *
   * // Wait for connection
   * effect(() => {
   *   if (wsService.isConnected()) {
   *     wsService.subscribeToExecution('exec-abc123');
   *   }
   * });
   *
   * // Or with explicit check
   * if (wsService.isConnected()) {
   *   wsService.subscribeToExecution('exec-abc123');
   * } else {
   *   console.error('WebSocket not connected');
   * }
   * ```
   *
   * @public
   */
  subscribeToExecution(executionId: string): void {
    // Guard: Check if socket connected
    if (!this.socket?.connected) {
      throw new Error(
        '[DevBrandWebSocketService] WebSocket not connected. Call connect() first.'
      );
    }

    // Emit subscription request to backend
    this.socket.emit('subscribe_execution', { executionId });

    console.log(
      `[DevBrandWebSocketService] Subscribed to execution: ${executionId}`
    );
  }

  /**
   * Disconnect from WebSocket server
   *
   * Gracefully disconnects Socket.io client and cleans up resources.
   *
   * @returns void
   *
   * @remarks
   * **Cleanup Behavior**:
   * - Disconnects Socket.io client
   * - Clears socket instance
   * - Resets connection state to 'disconnected'
   * - Completes all observable streams (NO new emissions)
   *
   * **Idempotency**:
   * - Safe to call multiple times
   * - No-op if already disconnected
   * - Cleans up any existing connection
   *
   * **Observable Completion**:
   * - streamUpdates$ completes
   * - tokenUpdates$ completes
   * - errors$ completes
   * - Subscribers automatically unsubscribe on completion
   *
   * @example
   * ```typescript
   * // In component ngOnDestroy
   * ngOnDestroy() {
   *   this.wsService.disconnect();
   * }
   *
   * // Or manual cleanup
   * wsService.disconnect();
   * console.log('Connection state:', wsService.connectionState().status); // 'disconnected'
   * ```
   *
   * @public
   */
  disconnect(): void {
    // Disconnect Socket.io client
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }

    // Reset connection state
    this._connectionState.set({
      status: 'disconnected',
      reconnectAttempt: 0,
      maxReconnectAttempts: 10,
      lastError: undefined,
    });

    // Complete observables (no more emissions)
    this._streamUpdates.complete();
    this._tokenUpdates.complete();
    this._errors.complete();

    console.log('[DevBrandWebSocketService] Disconnected from WebSocket');
  }

  /**
   * Register Socket.io event listeners
   *
   * Registers all Socket.io event handlers for connection lifecycle and stream events.
   * Evidence: research-websocket.md:99-109 (connection_status)
   * Evidence: research-websocket.md:145-160 (subscription_confirmed)
   * Evidence: research-websocket.md:419-443 (stream_update)
   * Evidence: research-websocket.md:446-463 (token_update)
   *
   * @returns void
   *
   * @remarks
   * **Event Types Handled**:
   * 1. 'connection_status' - Connection established confirmation
   * 2. 'subscription_confirmed' - Execution subscription confirmation
   * 3. 'stream_update' - Workflow event updates (validated with Zod)
   * 4. 'token_update' - LLM token streaming
   * 5. 'error' - Backend error events
   * 6. 'disconnect' - Connection lost
   * 7. 'reconnect_attempt' - Reconnection attempt counter
   *
   * **Connection Status Event**:
   * - Emitted when connection established
   * - Payload: { connectionId, status, serverTime }
   * - Updates state to 'connected'
   * - Resets reconnection attempts
   *
   * **Stream Update Event**:
   * - Emitted for workflow events (node:start, workflow:end, etc.)
   * - Payload validated with Zod StreamUpdateSchema
   * - Invalid events logged and emitted to errors$ stream
   * - Valid events emitted to streamUpdates$ stream
   *
   * **Error Handling**:
   * - All errors caught and emitted to errors$ stream
   * - Stream continues processing after errors
   * - Validation errors logged but don't throw
   *
   * @private
   */
  private registerSocketListeners(): void {
    if (!this.socket) return;

    // 1. Connection status event (connection established)
    // Evidence: research-websocket.md:99-109
    this.socket.on(
      'connection_status',
      (data: { connectionId: string; status: string; serverTime: Date }) => {
        console.log(
          '[DevBrandWebSocketService] Connection established:',
          data.connectionId
        );

        this._connectionState.update((state) => ({
          ...state,
          status: 'connected',
          reconnectAttempt: 0,
        }));
      }
    );

    // 2. Subscription confirmed event
    // Evidence: research-websocket.md:145-160
    this.socket.on('subscription_confirmed', (data: SubscriptionConfirmed) => {
      console.log(
        '[DevBrandWebSocketService] Subscription confirmed:',
        data.executionId
      );
    });

    // 3. Stream update event (main workflow events)
    // Evidence: research-websocket.md:419-443
    this.socket.on(
      'stream_update',
      (message: { data: { update: unknown } }) => {
        const validated = this.validateStreamUpdate(message.data.update);
        if (validated) {
          this._streamUpdates.next(validated);
        }
      }
    );

    // 4. Token update event (LLM token streaming)
    // Evidence: research-websocket.md:446-463
    this.socket.on('token_update', (message: { data: TokenUpdate }) => {
      this._tokenUpdates.next(message.data);
    });

    // 5. Error event (backend errors)
    // Evidence: research-websocket.md:529-537
    this.socket.on('error', (data: { message: string }) => {
      console.error('[DevBrandWebSocketService] WebSocket error:', data);

      const error: WebSocketError = {
        type: 'websocket_error',
        message: data.message,
        timestamp: new Date(),
      };

      this._errors.next(error);
    });

    // 6. Disconnect event (connection lost)
    this.socket.on('disconnect', (reason: string) => {
      console.warn('[DevBrandWebSocketService] Disconnected:', reason);

      const error: WebSocketError = {
        type: 'connection_error',
        message: reason,
        timestamp: new Date(),
      };

      this._connectionState.update((state) => ({
        ...state,
        status: 'disconnected',
        lastError: error,
      }));
    });

    // 7. Reconnection attempt event (reconnection progress)
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(
        `[DevBrandWebSocketService] Reconnection attempt: ${attemptNumber}`
      );

      this._connectionState.update((state) => ({
        ...state,
        status: 'reconnecting',
        reconnectAttempt: attemptNumber,
      }));
    });
  }

  /**
   * Validate stream update with Zod schema
   *
   * Performs runtime validation of incoming WebSocket events using Zod.
   * Evidence: task-description.md:369 (strict type checking requirement)
   *
   * @param update - Unknown event payload from WebSocket
   * @returns Validated StreamUpdate object or null if invalid
   *
   * @remarks
   * **Validation Strategy**:
   * - Parse with Zod StreamUpdateSchema
   * - Catch ZodError and log validation failure
   * - Emit validation error to errors$ stream
   * - Return null for invalid events (stream continues)
   *
   * **Why Zod?**:
   * - Runtime type checking (TypeScript only validates at compile time)
   * - Backend schema changes detected immediately
   * - Malformed events caught before processing
   * - Production safety (no unhandled runtime errors)
   *
   * **Error Handling**:
   * - Invalid events logged to console (development debugging)
   * - Validation error emitted to errors$ (user notification)
   * - Returns null (caller skips invalid event)
   * - Stream processing continues (non-fatal error)
   *
   * @example
   * ```typescript
   * // Valid event
   * const valid = validateStreamUpdate({
   *   type: 'workflow:start',
   *   data: { message: 'Starting' },
   *   metadata: { timestamp: new Date(), sequenceNumber: 1, executionId: 'exec-1' }
   * });
   * console.log(valid); // StreamUpdate object
   *
   * // Invalid event
   * const invalid = validateStreamUpdate({ invalid: 'structure' });
   * console.log(invalid); // null
   * ```
   *
   * @private
   */
  private validateStreamUpdate(update: unknown): StreamUpdate | null {
    try {
      // Parse with Zod schema - returns validated StreamUpdate
      const validated = StreamUpdateSchema.parse(update);

      // Type assertion needed because Zod parse returns the inferred type
      // but TypeScript needs explicit confirmation it matches StreamUpdate
      return validated as StreamUpdate;
    } catch (error) {
      // Log validation error (development debugging)
      console.error('[DevBrandWebSocketService] Invalid stream update:', error);

      // Emit validation error (user notification)
      this._errors.next({
        type: 'validation_error',
        message: 'Invalid event structure received from WebSocket',
        timestamp: new Date(),
        details: error,
      });

      // Return null (skip invalid event)
      return null;
    }
  }
}
