import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ResearchDomainEvent } from '../models';

/**
 * Research Service
 *
 * Angular service for ResearcherAgent interaction with SSE streaming support.
 *
 * Features:
 * - Start research workflows
 * - Real-time streaming via EventSource (SSE) for all 7 backend event types
 * - User approval/rejection for HITL
 * - List and read saved reports
 */

export interface ResearchReport {
  readonly filename: string;
  readonly filepath: string;
  readonly title: string;
  readonly createdAt: string;
  readonly metadata: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class ResearchService {
  private readonly apiUrl = '/api/research';
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Start new research workflow.
   * Returns executionId for SSE streaming.
   */
  startResearch(
    query: string,
    userId: string,
    researchDepth: 'summary' | 'detailed' | 'comprehensive' = 'detailed'
  ): Observable<{
    executionId: string;
    status: string;
    message: string;
    streamUrl: string;
  }> {
    return this.http.post<{
      executionId: string;
      status: string;
      message: string;
      streamUrl: string;
    }>(`${this.apiUrl}/chat`, {
      userId,
      query,
      researchDepth,
    });
  }

  /**
   * Stream workflow execution via Server-Sent Events (SSE).
   * Emits ResearchDomainEvent for all 7 backend SSE event types:
   *   workflow-update, tool-execution, llm-token, custom-progress,
   *   debug-trace, interruption_request, workflow_complete
   */
  streamWorkflow(executionId: string): Observable<ResearchDomainEvent> {
    return this.authService.getSseTicket().pipe(
      switchMap(
        (ticket) =>
          new Observable<ResearchDomainEvent>((observer) => {
            const eventSource = new EventSource(
              `${this.apiUrl}/stream/${executionId}?token=${ticket}`
            );

            // 1. workflow-update: node execution updates
            eventSource.addEventListener(
              'workflow-update',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  observer.next({
                    type: 'workflow-update',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    nodeName: data['nodeName'] as string | undefined,
                    state: data['state'] as Record<string, unknown> | undefined,
                  });
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse workflow-update event:',
                    error
                  );
                }
              }
            );

            // 2. tool-execution: tool call results
            eventSource.addEventListener(
              'tool-execution',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  const toolData = data['toolData'] as
                    | { messages?: unknown[] }
                    | undefined;
                  observer.next({
                    type: 'tool-execution',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    toolData: toolData
                      ? { messages: toolData.messages }
                      : undefined,
                  });
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse tool-execution event:',
                    error
                  );
                }
              }
            );

            // 3. llm-token: LLM token streaming (remapped from message-stream on backend)
            eventSource.addEventListener(
              'llm-token',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  observer.next({
                    type: 'llm-token',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    nodeName: data['nodeName'] as string | undefined,
                    token: data['token'] as string | undefined,
                    step: data['step'] as number | undefined,
                    messageChunk: data['messageChunk'] as
                      | Record<string, unknown>
                      | undefined,
                  });
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse llm-token event:',
                    error
                  );
                }
              }
            );

            // 4. custom-progress: progress updates (remapped from custom-stream on backend)
            eventSource.addEventListener(
              'custom-progress',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  const progress = data['progress'] as
                    | {
                        agent?: string;
                        stage?: string;
                        message?: string;
                        percentage?: number;
                      }
                    | undefined;
                  observer.next({
                    type: 'custom-progress',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    progress,
                  });
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse custom-progress event:',
                    error
                  );
                }
              }
            );

            // 5. debug-trace: debug events
            eventSource.addEventListener(
              'debug-trace',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  observer.next({
                    type: 'debug-trace',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    eventType: data['eventType'] as string | undefined,
                    taskName: data['taskName'] as string | undefined,
                    payload: data['payload'] as
                      | Record<string, unknown>
                      | undefined,
                  });
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse debug-trace event:',
                    error
                  );
                }
              }
            );

            // 6. interruption_request: HITL approval requests
            eventSource.addEventListener(
              'interruption_request',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  observer.next({
                    type: 'interruption_request',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    message: data['message'] as string | undefined,
                    reportDraft: data['reportDraft'] as string | undefined,
                    approvalRequest: data['approvalRequest'] as
                      | Record<string, unknown>
                      | undefined,
                  });
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse interruption_request event:',
                    error
                  );
                }
              }
            );

            // 7. workflow_complete: completion
            eventSource.addEventListener(
              'workflow_complete',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<
                    string,
                    unknown
                  >;
                  observer.next({
                    type: 'workflow_complete',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    finalState: data['finalState'] as
                      | Record<string, unknown>
                      | undefined,
                  });
                  eventSource.close();
                  observer.complete();
                } catch (error) {
                  console.warn(
                    '[ResearchService] Failed to parse workflow_complete event:',
                    error
                  );
                }
              }
            );

            // 7. workflow-error: backend emits before closing on LLM/tool failure
            eventSource.addEventListener(
              'workflow-error',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data) as Record<string, unknown>;
                  observer.next({
                    type: 'workflow-error',
                    timestamp: data['timestamp'] as string,
                    executionId,
                    message: data['message'] as string | undefined,
                  });
                  observer.complete();
                } catch (error) {
                  console.warn('[ResearchService] Failed to parse workflow-error event:', error);
                }
                eventSource.close();
              }
            );

            // Handle unexpected connection drops (network loss, server crash)
            eventSource.onerror = () => {
              if (eventSource.readyState === EventSource.CLOSED) {
                // Connection closed cleanly after workflow-error or workflow_complete
                return;
              }
              const sseError = new Error(
                'Connection to research service was lost. Please try again.'
              );
              console.error('[ResearchService] SSE connection error:', sseError.message);
              observer.error(sseError);
              eventSource.close();
            };

            // Cleanup on unsubscribe
            return () => {
              eventSource.close();
            };
          })
      )
    );
  }

  /**
   * Approve or reject report (HITL).
   */
  approveReport(
    executionId: string,
    approved: boolean,
    feedback?: string
  ): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/approve/${executionId}`,
      {
        approved,
        feedback,
      }
    );
  }

  /**
   * List all saved research reports.
   */
  listReports(): Observable<{
    reports: ResearchReport[];
    totalReports: number;
  }> {
    return this.http.get<{
      reports: ResearchReport[];
      totalReports: number;
    }>(`${this.apiUrl}/reports`);
  }

  /**
   * Read specific report content.
   */
  readReport(filename: string): Observable<{
    content: string;
    metadata: Record<string, unknown>;
    filename: string;
  }> {
    return this.http.get<{
      content: string;
      metadata: Record<string, unknown>;
      filename: string;
    }>(`${this.apiUrl}/reports/${filename}`);
  }
}
