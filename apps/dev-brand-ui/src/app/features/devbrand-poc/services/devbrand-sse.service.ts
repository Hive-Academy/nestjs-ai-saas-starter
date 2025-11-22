import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * DevBrand SSE Service
 *
 * Server-Sent Events (SSE) streaming service for LangGraph workflow execution.
 * Replaces WebSocket (Socket.io) with simpler SSE pattern using EventSource API.
 *
 * @remarks
 * **Purpose**:
 * - Establishes SSE connection to streaming backend
 * - Receives workflow execution events in real-time
 * - Provides reactive event streams (workflow updates, errors)
 * - Manages connection lifecycle with automatic reconnection
 *
 * **Connection Lifecycle**:
 * 1. User triggers workflow execution via REST API
 * 2. Backend returns streamUrl and executionId
 * 3. Frontend calls connect(streamUrl)
 * 4. EventSource establishes SSE connection
 * 5. Stream events begin ('workflow-update', 'workflow_complete', 'error')
 * 6. On completion or error, call disconnect()
 *
 * **Advantages over WebSocket**:
 * - Simpler protocol (HTTP-based, no handshake)
 * - Native browser API (EventSource)
 * - Automatic reconnection built-in
 * - Better for unidirectional server→client streaming
 * - Lower overhead (no Socket.io library needed)
 *
 * **State Management**:
 * - Signal-based connection state (modern Angular pattern)
 * - RxJS Subjects for event streams (observable architecture)
 * - Readonly signal accessors (immutable state)
 * - Computed signals for derived state (isConnected)
 *
 * @example
 * ```typescript
 * // In component
 * const sseService = inject(DevBrandSseService);
 *
 * // Connect to SSE stream
 * sseService.connect('/api/devbrand/stream/exec-abc123');
 *
 * // Listen to workflow updates
 * sseService.workflowUpdates$.subscribe(update => {
 *   console.log('Event:', update.type, update.data);
 * });
 *
 * // Monitor connection state
 * effect(() => {
 *   console.log('Connection:', sseService.connectionState());
 * });
 *
 * // Cleanup on destroy
 * ngOnDestroy() {
 *   sseService.disconnect();
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class DevBrandSseService {
  /**
   * EventSource instance
   * @private
   */
  private eventSource?: EventSource;

  /**
   * Connection state signal
   * @private
   */
  private readonly _connectionState = signal<{
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastError?: string;
  }>({
    status: 'disconnected',
  });

  /**
   * Workflow update subject
   * @private
   */
  private readonly _workflowUpdates = new Subject<any>();

  /**
   * Error subject
   * @private
   */
  private readonly _errors = new Subject<{
    message: string;
    timestamp: Date;
  }>();

  /**
   * Readonly connection state signal
   * @public
   */
  readonly connectionState = this._connectionState.asReadonly();

  /**
   * Workflow updates observable
   * @public
   */
  readonly workflowUpdates$ = this._workflowUpdates.asObservable();

  /**
   * Errors observable
   * @public
   */
  readonly errors$ = this._errors.asObservable();

  /**
   * Computed connection status
   * @public
   */
  readonly isConnected = computed(
    () => this.connectionState().status === 'connected'
  );

  /**
   * Connect to SSE stream
   *
   * Establishes EventSource connection to streaming backend.
   *
   * @param streamUrl - SSE stream URL (from REST API response)
   * @returns void
   *
   * @remarks
   * **Connection Behavior**:
   * - Checks if already connected (warns and returns if true)
   * - Updates connection state to 'connecting'
   * - Creates EventSource instance
   * - Registers event listeners for stream events
   *
   * **EventSource Configuration**:
   * - Automatic reconnection enabled by default
   * - Reconnection handled by browser (3-5 second retry)
   * - No manual reconnection logic needed
   *
   * @example
   * ```typescript
   * // Basic connection
   * sseService.connect('/api/devbrand/stream/exec-123');
   *
   * // With connection state monitoring
   * sseService.connect('/api/devbrand/stream/exec-123');
   * effect(() => {
   *   const state = sseService.connectionState();
   *   if (state.status === 'connected') {
   *     console.log('Connected to SSE stream');
   *   }
   * });
   * ```
   *
   * @public
   */
  connect(streamUrl: string): void {
    console.log('🔌 [DevBrandSseService] connect() called');
    console.log('📍 [DevBrandSseService] Stream URL:', streamUrl);

    // Guard: Check if already connected
    if (this.eventSource) {
      console.warn('⚠️ [DevBrandSseService] Already connected to SSE stream');
      return;
    }

    // Update state: connecting
    console.log(
      '🔄 [DevBrandSseService] Updating connection state to: connecting'
    );
    this._connectionState.update((state) => ({
      ...state,
      status: 'connecting',
    }));

    // Create EventSource
    console.log('🚀 [DevBrandSseService] Creating EventSource...');
    this.eventSource = new EventSource(streamUrl);

    // Register EventSource event listeners
    this.registerEventListeners();
  }

  /**
   * Disconnect from SSE stream
   *
   * Gracefully disconnects EventSource and cleans up resources.
   *
   * @returns void
   *
   * @remarks
   * **Cleanup Behavior**:
   * - Closes EventSource connection
   * - Clears eventSource instance
   * - Resets connection state to 'disconnected'
   * - Completes all observable streams (NO new emissions)
   *
   * @public
   */
  disconnect(): void {
    console.log('🔌 [DevBrandSseService] disconnect() called');

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    // Reset connection state
    this._connectionState.set({
      status: 'disconnected',
    });

    // Complete observables (no more emissions)
    this._workflowUpdates.complete();
    this._errors.complete();

    console.log('✅ [DevBrandSseService] Disconnected from SSE stream');
  }

  /**
   * Register EventSource event listeners
   *
   * Registers all EventSource event handlers for connection lifecycle and stream events.
   *
   * @returns void
   *
   * @remarks
   * **Event Types Handled**:
   * 1. 'open' - Connection established
   * 2. 'workflow-update' - Workflow event updates
   * 3. 'workflow_complete' - Workflow completion
   * 4. 'error' - Connection or stream errors
   *
   * @private
   */
  private registerEventListeners(): void {
    if (!this.eventSource) {
      console.error(
        '❌ [DevBrandSseService] Cannot register listeners: eventSource is undefined'
      );
      return;
    }

    console.log('👂 [DevBrandSseService] Registering EventSource listeners...');

    // 1. Connection established event
    this.eventSource.onopen = () => {
      console.log(
        '✅ [DevBrandSseService] EVENT: open (connection established)'
      );
      this._connectionState.update((state) => ({
        ...state,
        status: 'connected',
        lastError: undefined,
      }));
    };

    // 2. Workflow update event
    this.eventSource.addEventListener(
      'workflow-update',
      (event: MessageEvent) => {
        console.log('📨 [DevBrandSseService] EVENT: workflow-update received');
        console.log('📦 [DevBrandSseService] Raw event data:', event.data);

        try {
          const data = JSON.parse(event.data);
          console.log('✅ [DevBrandSseService] Parsed workflow update:', data);
          this._workflowUpdates.next(data);
        } catch (error) {
          console.error(
            '❌ [DevBrandSseService] Failed to parse event data:',
            error
          );
          this._errors.next({
            message: 'Failed to parse workflow update',
            timestamp: new Date(),
          });
        }
      }
    );

    // 3. Workflow complete event
    this.eventSource.addEventListener(
      'workflow_complete',
      (event: MessageEvent) => {
        console.log(
          '🎉 [DevBrandSseService] EVENT: workflow_complete received'
        );
        console.log('📦 [DevBrandSseService] Final data:', event.data);

        try {
          const data = JSON.parse(event.data);
          console.log('✅ [DevBrandSseService] Workflow completed:', data);
          this._workflowUpdates.next(data);

          // Auto-disconnect after completion
          setTimeout(() => {
            console.log(
              '🔌 [DevBrandSseService] Auto-disconnecting after completion'
            );
            this.disconnect();
          }, 1000);
        } catch (error) {
          console.error(
            '❌ [DevBrandSseService] Failed to parse completion data:',
            error
          );
        }
      }
    );

    // 4. Error event (connection or stream errors)
    this.eventSource.onerror = (event) => {
      console.error('❌ [DevBrandSseService] EVENT: error received');
      console.error('💥 [DevBrandSseService] Error event:', event);

      const errorMessage =
        this.eventSource?.readyState === EventSource.CLOSED
          ? 'SSE connection closed by server'
          : 'SSE connection error';

      this._connectionState.update((state) => ({
        ...state,
        status: 'error',
        lastError: errorMessage,
      }));

      this._errors.next({
        message: errorMessage,
        timestamp: new Date(),
      });

      // If connection closed permanently, disconnect
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.warn(
          '🔌 [DevBrandSseService] Connection closed, disconnecting...'
        );
        this.disconnect();
      }
    };

    console.log(
      '✅ [DevBrandSseService] All event listeners registered successfully'
    );
  }
}
