/**
 * ExecuteDevBrandResponse Model
 *
 * Response payload from DevBrand workflow execution API.
 * Evidence: apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:74-99
 *
 * @remarks
 * - Returned by POST /api/devbrand/execute
 * - Contains execution tracking ID and SSE stream URL
 * - Frontend uses streamUrl to establish real-time event stream via EventSource
 * - Frontend uses executionId to track workflow progress
 *
 * @public
 */
export interface ExecuteDevBrandResponse {
  /**
   * Unique execution identifier
   *
   * @remarks
   * - Format: "devbrand-{timestamp}"
   * - Used to track workflow progress
   * - Required for connecting to SSE stream
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
   * - SSE events provide real-time status updates after this
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
   * @example "Workflow started successfully. Connect to stream URL for real-time updates."
   */
  message: string;

  /**
   * SSE stream URL for real-time event streaming
   *
   * @remarks
   * - Relative URL path to SSE stream endpoint
   * - Used by DevBrandSseService to establish EventSource connection
   * - Backend streaming endpoint using Server-Sent Events protocol
   *
   * @example "/api/devbrand/stream/devbrand-1704067200000"
   */
  streamUrl: string;
}
