import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type {
  ConversationListResponse,
  ConversationHistoryResponse,
  NewConversationResponse,
} from '../models/conversation.model';

/**
 * Conversation API Service
 *
 * HTTP client service for conversation history endpoints across both workflows
 * (Researcher and Supervisor). Provides Observable-based API for conversation
 * management in research-chat and devbrand-poc components.
 *
 * @remarks
 * **Purpose**:
 * - Retrieve conversation lists for authenticated users
 * - Fetch full conversation history with thread ownership verification
 * - Create new conversation threads
 *
 * **API Endpoints**:
 * - Researcher: `/api/research-chat/conversation/*`
 * - Supervisor: `/api/devbrand/conversation/*`
 *
 * **Error Handling**: RxJS catchError for all HTTP calls
 * - Network errors (no connection, DNS failure)
 * - HTTP errors (401 Unauthorized, 404 Not Found, 500 Internal Server Error)
 * - JSON parsing errors (malformed response)
 *
 * **Modern Angular Pattern**:
 * - Uses inject() function (NOT constructor injection)
 * - Observable-based (NOT Promise-based)
 * - Standalone service (providedIn: 'root')
 * - Type-safe with conversation models
 *
 * @example
 * ```typescript
 * const conversationApi = inject(ConversationApiService);
 *
 * // Get researcher conversations
 * conversationApi.getResearcherConversationList('user-123')
 *   .subscribe({
 *     next: (response) => console.log('Conversations:', response.conversations),
 *     error: (err) => console.error('Failed:', err)
 *   });
 *
 * // Get supervisor conversation history
 * conversationApi.getSupervisorConversationHistory('devbrand-123-abc')
 *   .subscribe({
 *     next: (response) => console.log('History:', response.conversationHistory),
 *     error: (err) => console.error('Failed:', err)
 *   });
 * ```
 *
 * @public
 */
@Injectable({
  providedIn: 'root',
})
export class ConversationApiService {
  /**
   * Angular HttpClient for HTTP requests
   * @private
   */
  private readonly http = inject(HttpClient);

  /**
   * Base API URLs for each workflow type
   * @private
   * @remarks
   * - Researcher workflow: /api/research-chat
   * - Supervisor workflow: /api/devbrand
   */
  private readonly researchApiUrl = '/api/research/conversation';
  private readonly supervisorApiUrl = '/api/devbrand/conversation';

  /**
   * Get conversation list for Researcher workflow
   *
   * Retrieves the last 10 conversations for authenticated user in the
   * researcher workflow context. Conversations are sorted by timestamp
   * (most recent first).
   *
   * @param userId - User ID for filtering conversations (POC: x-user-id header)
   * @returns Observable that emits conversation list response
   *
   * @remarks
   * **Backend Endpoint**: GET /api/research-chat/conversation/list
   * **Response Fields**:
   * - conversations: Array of ConversationSummary (max 10 items)
   * - totalCount: Total number of conversations for user
   * - hasMore: Boolean indicating if more conversations exist
   *
   * **POC Authentication**: Uses x-user-id header for mock authentication
   * **Production**: JWT token sent automatically via HttpInterceptor
   *
   * @example
   * ```typescript
   * getResearcherConversationList('user-123')
   *   .subscribe({
   *     next: (response) => {
   *       console.log('Total conversations:', response.totalCount);
   *       response.conversations.forEach(conv => {
   *         console.log(`Thread ${conv.threadId}: ${conv.preview}`);
   *       });
   *     },
   *     error: (err) => console.error('Load failed:', err)
   *   });
   * ```
   *
   * @public
   */
  getResearcherConversationList(
    userId: string
  ): Observable<ConversationListResponse> {
    return this.http
      .get<ConversationListResponse>(`${this.researchApiUrl}/list`, {
        headers: { 'x-user-id': userId },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get conversation history for Researcher workflow
   *
   * Retrieves full conversation history for a specific thread in the
   * researcher workflow. Includes thread ownership verification to
   * ensure user can only access their own conversations.
   *
   * @param threadId - Conversation thread ID (format: "research-{timestamp}-{userId}")
   * @returns Observable that emits conversation history response
   *
   * @remarks
   * **Backend Endpoint**: GET /api/research-chat/conversation/history/:threadId
   * **Response Fields**:
   * - threadId: Thread identifier
   * - userId: Owner user ID
   * - conversationHistory: Array of Message objects
   * - metadata: Research metadata (query, reportTitle, researchStatus, confidenceScore)
   * - nextSteps: Array of suggested next actions
   * - waitingForApproval: Boolean indicating HITL approval pending
   * - checkpointId: Optional checkpoint identifier
   *
   * **Authorization**:
   * - Backend verifies thread ownership via metadata.userId === JWT userId
   * - Returns 401 Unauthorized if user doesn't own thread
   *
   * @throws 401 Unauthorized if thread ownership verification fails
   * @throws 404 Not Found if thread doesn't exist
   *
   * @example
   * ```typescript
   * getResearcherConversationHistory('research-1234-user123')
   *   .subscribe({
   *     next: (response) => {
   *       console.log('Messages:', response.conversationHistory.length);
   *       console.log('Research status:', response.metadata.researchStatus);
   *       console.log('Waiting for approval:', response.waitingForApproval);
   *     },
   *     error: (err) => console.error('Load failed:', err)
   *   });
   * ```
   *
   * @public
   */
  getResearcherConversationHistory(
    threadId: string
  ): Observable<ConversationHistoryResponse> {
    return this.http
      .get<ConversationHistoryResponse>(
        `${this.researchApiUrl}/history/${threadId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Create new conversation for Researcher workflow
   *
   * Creates a new conversation thread for the researcher workflow.
   * Optionally accepts an initial query to start the conversation.
   *
   * @param userId - User ID for thread ownership (POC: x-user-id header)
   * @param initialQuery - Optional first query to start research workflow
   * @returns Observable that emits new conversation response
   *
   * @remarks
   * **Backend Endpoint**: POST /api/research-chat/conversation/new
   * **Request Body**: { initialQuery?: string }
   * **Response Fields**:
   * - threadId: Generated thread ID (format: "research-{timestamp}-{userId}")
   * - status: Always "created" on success
   * - conversationUrl: URL to access conversation (e.g., "/research-chat?thread={threadId}")
   *
   * **Thread ID Format**: research-{timestamp}-{userId}
   * - timestamp: Date.now() milliseconds since epoch
   * - userId: User identifier from JWT token
   *
   * @example
   * ```typescript
   * // Create conversation without initial query
   * createNewResearcherConversation('user-123')
   *   .subscribe({
   *     next: (response) => {
   *       console.log('New thread:', response.threadId);
   *       console.log('Navigate to:', response.conversationUrl);
   *     }
   *   });
   *
   * // Create conversation with initial query
   * createNewResearcherConversation('user-123', 'Research AI trends in 2025')
   *   .subscribe({
   *     next: (response) => {
   *       console.log('Started research:', response.threadId);
   *     }
   *   });
   * ```
   *
   * @public
   */
  createNewResearcherConversation(
    userId: string,
    initialQuery?: string
  ): Observable<NewConversationResponse> {
    return this.http
      .post<NewConversationResponse>(
        `${this.researchApiUrl}`,
        { initialQuery },
        { headers: { 'x-user-id': userId } }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Get conversation list for Supervisor workflow
   *
   * Retrieves the last 10 conversations for authenticated user in the
   * DevBrand supervisor workflow context. Includes supervisor-specific
   * metadata (currentAgent, workflowProgress).
   *
   * @param userId - User ID for filtering conversations (POC: x-user-id header)
   * @returns Observable that emits conversation list response
   *
   * @remarks
   * **Backend Endpoint**: GET /api/devbrand/conversation/list
   * **Response Fields** (extends ConversationListResponse):
   * - conversations: Array of ConversationSummary with supervisor fields:
   *   - currentAgent: Current executing agent name
   *   - workflowProgress: Percentage completion (0-100)
   * - totalCount: Total number of conversations for user
   * - hasMore: Boolean indicating if more conversations exist
   *
   * **Supervisor-Specific Metadata**:
   * - currentAgent: e.g., "github-code-analyzer", "content-creator"
   * - workflowProgress: Visual progress bar rendering
   *
   * @example
   * ```typescript
   * getSupervisorConversationList('user-456')
   *   .subscribe({
   *     next: (response) => {
   *       response.conversations.forEach(conv => {
   *         console.log(`Thread ${conv.threadId}:`);
   *         console.log(`  Agent: ${conv.currentAgent}`);
   *         console.log(`  Progress: ${conv.workflowProgress}%`);
   *       });
   *     }
   *   });
   * ```
   *
   * @public
   */
  getSupervisorConversationList(
    userId: string
  ): Observable<ConversationListResponse> {
    return this.http
      .get<ConversationListResponse>(`${this.supervisorApiUrl}/list`, {
        headers: { 'x-user-id': userId },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get conversation history for Supervisor workflow
   *
   * Retrieves full conversation history for a specific thread in the
   * DevBrand supervisor workflow. Includes agent coordination details
   * (currentAgent, nextAgent, agentHistory, pendingTasks).
   *
   * @param threadId - Conversation thread ID (format: "devbrand-{timestamp}-{userId}")
   * @returns Observable that emits conversation history response
   *
   * @remarks
   * **Backend Endpoint**: GET /api/devbrand/conversation/history/:threadId
   * **Response Fields** (extends ConversationHistoryResponse):
   * - agentCoordination: Supervisor-specific agent coordination data
   *   - currentAgent: Current executing agent ID
   *   - nextAgent: Next scheduled agent ID
   *   - agentHistory: Array of past agent executions with timestamps
   *   - pendingTasks: Array of tasks awaiting execution
   *
   * **Message Format** (extends Message):
   * - agentId: Agent that generated the message (e.g., "github-code-analyzer")
   *
   * **Use Cases**:
   * - Visualize multi-agent workflow progress
   * - Display agent coordination timeline
   * - Show pending tasks in UI
   *
   * @example
   * ```typescript
   * getSupervisorConversationHistory('devbrand-5678-user456')
   *   .subscribe({
   *     next: (response) => {
   *       const coord = response.agentCoordination;
   *       console.log('Current agent:', coord?.currentAgent);
   *       console.log('Next agent:', coord?.nextAgent);
   *       console.log('Agent history:', coord?.agentHistory);
   *     }
   *   });
   * ```
   *
   * @public
   */
  getSupervisorConversationHistory(
    threadId: string
  ): Observable<ConversationHistoryResponse> {
    return this.http
      .get<ConversationHistoryResponse>(
        `${this.supervisorApiUrl}/history/${threadId}`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Create new conversation for Supervisor workflow
   *
   * Creates a new conversation thread for the DevBrand supervisor workflow.
   * Optionally accepts an initial query to start the multi-agent workflow.
   *
   * @param userId - User ID for thread ownership (POC: x-user-id header)
   * @param initialQuery - Optional first query to start workflow (e.g., GitHub username)
   * @returns Observable that emits new conversation response
   *
   * @remarks
   * **Backend Endpoint**: POST /api/devbrand/conversation/new
   * **Request Body**: { initialQuery?: string }
   * **Response Fields**:
   * - threadId: Generated thread ID (format: "devbrand-{timestamp}-{userId}")
   * - status: Always "created" on success
   * - conversationUrl: URL to access conversation (e.g., "/devbrand?thread={threadId}")
   *
   * **Thread ID Format**: devbrand-{timestamp}-{userId}
   * - timestamp: Date.now() milliseconds since epoch
   * - userId: User identifier from JWT token
   *
   * **Initial Query Examples**:
   * - GitHub username: "octocat"
   * - Repository URL: "https://github.com/microsoft/typescript"
   * - Brand goal: "Create technical blog content strategy"
   *
   * @example
   * ```typescript
   * // Create conversation without initial query
   * createNewSupervisorConversation('user-456')
   *   .subscribe({
   *     next: (response) => {
   *       console.log('New thread:', response.threadId);
   *     }
   *   });
   *
   * // Create conversation with GitHub username
   * createNewSupervisorConversation('user-456', 'octocat')
   *   .subscribe({
   *     next: (response) => {
   *       console.log('Started workflow:', response.threadId);
   *       console.log('Navigate to:', response.conversationUrl);
   *     }
   *   });
   * ```
   *
   * @public
   */
  createNewSupervisorConversation(
    userId: string,
    initialQuery?: string
  ): Observable<NewConversationResponse> {
    return this.http
      .post<NewConversationResponse>(
        `${this.supervisorApiUrl}/new`,
        { initialQuery },
        { headers: { 'x-user-id': userId } }
      )
      .pipe(catchError(this.handleError));
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
   * 1. Network errors (error.error instanceof ErrorEvent)
   *    - No internet connection
   *    - DNS resolution failure
   *    - CORS policy blocking
   *
   * 2. HTTP status errors (error.status)
   *    - 401: Unauthorized (thread ownership verification failed)
   *    - 404: Not Found (thread doesn't exist)
   *    - 500: Internal Server Error
   *    - 502/503: Backend service unavailable
   *
   * 3. JSON parsing errors (error.error is string)
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
   * // Network error example
   * Error: "Unable to connect to server. Please check your internet connection."
   *
   * // HTTP 401 error example
   * Error: "Unauthorized access to conversation. You don't own this thread."
   *
   * // HTTP 404 error example
   * Error: "Conversation not found. It may have been deleted."
   *
   * // HTTP 500 error example
   * Error: "Server error occurred. Please try again later. (Status: 500)"
   * ```
   *
   * @private
   */
  private handleError(error: unknown): Observable<never> {
    let errorMessage: string;

    // HTTP error response from Angular HttpClient
    if (error instanceof HttpErrorResponse) {
      // Network errors (no connection, CORS, DNS failure)
      if (error.error instanceof ErrorEvent) {
        errorMessage =
          'Unable to connect to server. Please check your internet connection.';
      }
      // HTTP status errors (4xx, 5xx)
      else if (error.status) {
        switch (error.status) {
          case 401:
            // Unauthorized - thread ownership verification failed
            errorMessage =
              "Unauthorized access to conversation. You don't own this thread.";
            break;

          case 404:
            // Not Found - thread doesn't exist
            errorMessage =
              'Conversation not found. It may have been deleted or never existed.';
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
    // Unknown error types (not HttpErrorResponse)
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
