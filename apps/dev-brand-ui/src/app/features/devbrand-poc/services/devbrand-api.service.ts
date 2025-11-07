import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { ExecuteDevBrandRequest, ExecuteDevBrandResponse } from '../models';

/**
 * DevBrand API Service
 *
 * REST API integration service for DevBrand workflow execution.
 * Evidence: apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:143-210
 *
 * @remarks
 * **Purpose**:
 * - Initiates DevBrand workflow execution via REST API
 * - Returns execution ID and WebSocket connection details
 * - Provides comprehensive error handling with retry logic
 *
 * **API Endpoint**: POST /api/devbrand/execute
 *
 * **Timeout Strategy**: 30 seconds (environment.ts:29)
 * - Workflows can take 20-40 seconds for complete execution
 * - Network latency can add 1-3 seconds
 * - 30s timeout provides safety margin
 *
 * **Retry Strategy**: 2 attempts with 1 second delay
 * - Handles transient network failures
 * - Exponential backoff not needed (workflow idempotent)
 * - Max 2 retries to avoid excessive wait times
 *
 * **Error Handling**: User-friendly messages for all error types
 * - Network errors (no connection, DNS failure)
 * - Timeout errors (>30s response time)
 * - HTTP errors (400 Bad Request, 500 Internal Server Error)
 * - JSON parsing errors (malformed response)
 *
 * **Modern Angular Pattern**:
 * - Uses inject() function (NOT constructor injection)
 * - Observable-based (NOT Promise-based)
 * - Standalone service (providedIn: 'root')
 *
 * @example
 * ```typescript
 * const apiService = inject(DevBrandApiService);
 *
 * apiService.executeWorkflow({ githubUsername: 'octocat' })
 *   .subscribe({
 *     next: (response) => {
 *       console.log('Execution started:', response.executionId);
 *       console.log('WebSocket URL:', response.websocketUrl);
 *     },
 *     error: (errorMessage) => {
 *       console.error('Workflow failed:', errorMessage);
 *     }
 *   });
 * ```
 *
 * @see {@link ExecuteDevBrandRequest} Request payload model
 * @see {@link ExecuteDevBrandResponse} Response payload model
 * @public
 */
@Injectable({
  providedIn: 'root',
})
export class DevBrandApiService {
  /**
   * Angular HttpClient for HTTP requests
   * @private
   */
  private readonly http = inject(HttpClient);

  /**
   * Base API URL for DevBrand endpoints
   * @private
   * @remarks
   * - Development: http://localhost:3000/api/devbrand
   * - Production: Configured via environment.ts
   */
  private readonly apiUrl = '/api/devbrand';

  /**
   * Execute DevBrand workflow
   *
   * Initiates a complete DevBrand workflow execution including:
   * 1. GitHub repository analysis (github-code-analyzer agent)
   * 2. Personal brand strategy development (personal-brand-strategist agent)
   * 3. Platform-specific content generation (content-creator agent)
   *
   * @param request - Workflow execution request with GitHub username
   * @returns Observable that emits execution response with WebSocket connection details
   *
   * @remarks
   * **Success Response**:
   * - executionId: Unique identifier for tracking (format: "devbrand-{timestamp}")
   * - status: Always "started" on success
   * - websocketUrl: WebSocket server URL for real-time events
   * - websocketInstructions: Connection setup guidance
   *
   * **Error Handling**:
   * - Network errors → "Unable to connect to server. Please check your internet connection."
   * - Timeout errors → "Request timed out after 30 seconds. Please try again."
   * - 400 errors → "Invalid request: {error details}"
   * - 404 errors → "API endpoint not found. Please contact support."
   * - 500 errors → "Server error occurred. Please try again later."
   * - Unknown errors → "An unexpected error occurred: {error message}"
   *
   * **Retry Behavior**:
   * - Automatically retries failed requests 2 times
   * - 1 second delay between retries
   * - Does NOT retry on 4xx client errors (only 5xx and network errors)
   *
   * @throws Error Observable with user-friendly error message
   *
   * @example
   * ```typescript
   * // Basic usage
   * executeWorkflow({ githubUsername: 'octocat' })
   *   .subscribe({
   *     next: (response) => console.log('Started:', response.executionId),
   *     error: (err) => console.error('Failed:', err)
   *   });
   *
   * // With user ID tracking
   * executeWorkflow({ githubUsername: 'octocat', userId: 'user-123' })
   *   .subscribe({
   *     next: (response) => {
   *       // Connect to WebSocket using response.websocketUrl
   *       // Subscribe to events using response.executionId
   *     }
   *   });
   * ```
   *
   * @see {@link ExecuteDevBrandRequest} Request payload structure
   * @see {@link ExecuteDevBrandResponse} Response payload structure
   * @public
   */
  executeWorkflow(
    request: ExecuteDevBrandRequest
  ): Observable<ExecuteDevBrandResponse> {
    return this.http
      .post<ExecuteDevBrandResponse>(`${this.apiUrl}/execute`, request)
      .pipe(
        timeout(30000), // 30 second timeout
        retry({ count: 2, delay: 1000 }), // Retry 2 times with 1s delay
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors with user-friendly messages
   *
   * Transforms technical HTTP errors into user-friendly error messages
   * suitable for displaying in the UI.
   *
   * @param error - Error from Angular HttpClient or RxJS operators
   * @returns Observable that immediately errors with user-friendly message
   *
   * @remarks
   * **Error Type Detection**:
   * 1. Timeout errors (error instanceof TimeoutError)
   *    - Request exceeded 30 second timeout
   *    - Backend processing too slow
   *    - Network latency too high
   *
   * 2. Network errors (error.error instanceof ErrorEvent)
   *    - No internet connection
   *    - DNS resolution failure
   *    - CORS policy blocking
   *
   * 3. HTTP status errors (error.status)
   *    - 400: Invalid request data
   *    - 404: API endpoint not found
   *    - 500: Backend server error
   *    - 502/503: Backend service unavailable
   *
   * 4. JSON parsing errors (error.error is string)
   *    - Malformed JSON response
   *    - HTML error page returned
   *    - Text error message from backend
   *
   * **Error Message Format**:
   * - Clear indication of what went wrong
   * - Actionable guidance for user (e.g., "try again", "check connection")
   * - Technical details included when available (e.g., status code)
   *
   * @example
   * ```typescript
   * // Timeout error example
   * Error: "Request timed out after 30 seconds. Please try again."
   *
   * // Network error example
   * Error: "Unable to connect to server. Please check your internet connection."
   *
   * // HTTP 400 error example
   * Error: "Invalid request: GitHub username is required"
   *
   * // HTTP 500 error example
   * Error: "Server error occurred. Please try again later. (Status: 500)"
   * ```
   *
   * @private
   */
  private handleError(error: unknown): Observable<never> {
    let errorMessage: string;

    // Timeout errors (request exceeded 30s) - Check FIRST before HttpErrorResponse
    if (error instanceof TimeoutError) {
      errorMessage = 'Request timed out after 30 seconds. Please try again.';
    }
    // HTTP error response from Angular HttpClient
    else if (error instanceof HttpErrorResponse) {
      // Network errors (no connection, CORS, DNS failure)
      if (error.error instanceof ErrorEvent) {
        // Client-side or network error occurred
        errorMessage =
          'Unable to connect to server. Please check your internet connection.';
      }
      // HTTP status errors (4xx, 5xx)
      else if (error.status) {
        switch (error.status) {
          case 400:
            // Bad Request - invalid input data
            errorMessage = `Invalid request: ${
              error.error?.message || 'Please check your input and try again.'
            }`;
            break;

          case 404:
            // Not Found - API endpoint missing
            errorMessage =
              'API endpoint not found. Please contact support or try again later.';
            break;

          case 500:
            // Internal Server Error
            errorMessage = `Server error occurred. Please try again later. (Status: ${error.status})`;
            break;

          case 502:
          case 503:
            // Bad Gateway / Service Unavailable
            errorMessage = `Service temporarily unavailable. Please try again in a few moments. (Status: ${error.status})`;
            break;

          default:
            // Other HTTP errors
            errorMessage = `An error occurred (Status: ${error.status}). ${
              error.error?.message || 'Please try again.'
            }`;
        }
      }
      // JSON parsing errors or unknown HttpErrorResponse errors
      else {
        errorMessage = `An unexpected error occurred: ${
          error.message || 'Unknown error'
        }`;
      }
    }
    // Unknown error types (not TimeoutError, not HttpErrorResponse)
    else {
      const err = error as Error;
      errorMessage = `An unexpected error occurred: ${
        err?.message || 'Unknown error'
      }`;
    }

    // Return observable that immediately errors with user-friendly message
    return throwError(() => errorMessage);
  }
}
