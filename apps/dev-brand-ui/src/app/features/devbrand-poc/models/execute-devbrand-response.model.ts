/**
 * ExecuteDevBrandResponse Model
 *
 * Response payload from DevBrand workflow execution API.
 * Evidence: apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:68-112
 *
 * @remarks
 * - Returned by POST /api/devbrand/execute
 * - Contains execution tracking ID and WebSocket connection details
 * - Frontend uses websocketUrl to establish real-time event stream
 * - Frontend uses executionId to subscribe to execution-specific events
 *
 * @public
 */
export interface ExecuteDevBrandResponse {
  /**
   * Unique execution identifier
   *
   * @remarks
   * - Format: "devbrand-{timestamp}"
   * - Used to subscribe to execution-specific WebSocket events
   * - Required for tracking workflow progress
   * - Persisted in checkpoint storage for recovery
   *
   * @example "devbrand-1704067200000"
   */
  executionId: string;

  /**
   * Execution status indicator
   *
   * @remarks
   * - Always 'started' when workflow successfully initiates
   * - Indicates workflow has been queued and will begin execution
   * - WebSocket events provide real-time status updates after this
   *
   * @default "started"
   */
  status: 'started';

  /**
   * Human-readable success message
   *
   * @remarks
   * - Confirms workflow initiation
   * - Suitable for displaying to users
   * - Contains execution ID for reference
   *
   * @example "Workflow execution started successfully. Execution ID: devbrand-1704067200000"
   */
  message: string;

  /**
   * WebSocket server URL for real-time event streaming
   *
   * @remarks
   * - Complete WebSocket URL with protocol (ws:// or wss://)
   * - Used by DevBrandWebSocketService to establish connection
   * - Backend streaming server endpoint
   *
   * @example "ws://localhost:8080/streaming"
   */
  websocketUrl: string;

  /**
   * WebSocket connection instructions
   *
   * @remarks
   * - Provides guidance for establishing WebSocket connection
   * - Lists available event types for subscription
   * - Used by DevBrandWebSocketService for connection setup
   */
  websocketInstructions: {
    /**
     * Instructions for establishing connection
     * @example "Connect to ws://localhost:8080/streaming using Socket.IO client"
     */
    connect: string;

    /**
     * Instructions for subscribing to execution events
     * @example "Emit 'subscribe' event with { executionId: 'devbrand-...' }"
     */
    subscribe: string;

    /**
     * List of available event types from backend
     * @example ["stream_update", "token_update", "error", "connection_status"]
     */
    events: string[];
  };
}
