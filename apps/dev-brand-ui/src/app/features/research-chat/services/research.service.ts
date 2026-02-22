import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

/**
 * 🔬 RESEARCH SERVICE
 *
 * Angular service for ResearcherAgent interaction with SSE streaming support
 *
 * Features:
 * - Start research workflows
 * - Real-time streaming via EventSource (SSE)
 * - User approval/rejection for HITL
 * - List and read saved reports
 */

export interface ResearchWorkflowEvent {
  type:
    | 'state_update'
    | 'task_complete'
    | 'task_start'
    | 'interrupt'
    | 'workflow_complete'
    | 'tool_execution' // NEW: Tool execution event
    | 'error';
  timestamp: string;
  workflowId: string;
  taskName?: string;
  nodeName?: string; // NEW: Node that emitted the event
  state?: any;
  toolData?: {
    // NEW: Tool execution data
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    messages?: any[];
  };
  error?: string;
}

export interface ResearchReport {
  filename: string;
  filepath: string;
  title: string;
  createdAt: string;
  metadata: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class ResearchService {
  private apiUrl = '/api/research';
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Start new research workflow
   * Returns executionId for SSE streaming
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
   * Stream workflow execution via Server-Sent Events (SSE)
   * Updated to match NestJS @Sse() endpoint format
   */
  streamWorkflow(executionId: string): Observable<ResearchWorkflowEvent> {
    return this.authService.getSseTicket().pipe(
      switchMap(
        (ticket) =>
          new Observable<ResearchWorkflowEvent>((observer) => {
            const eventSource = new EventSource(
              `${this.apiUrl}/stream/${executionId}?token=${ticket}`
            );

            // Listen for workflow-update events (node execution)
            eventSource.addEventListener(
              'workflow-update',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data);
                  observer.next({
                    type: 'state_update',
                    timestamp: data.timestamp,
                    workflowId: executionId,
                    nodeName: data.nodeName, // Track which node emitted the event
                    state: data.state,
                  } as ResearchWorkflowEvent);
                } catch (error) {
                  console.error(
                    'Failed to parse workflow-update event:',
                    error
                  );
                }
              }
            );

            // Listen for tool-execution events (NEW)
            eventSource.addEventListener(
              'tool-execution',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data);

                  // Extract tool information from LangGraph message structure
                  const messages = data.toolData?.messages || [];
                  const lastMessage = messages[messages.length - 1];

                  observer.next({
                    type: 'tool_execution',
                    timestamp: data.timestamp,
                    workflowId: executionId,
                    toolData: {
                      toolName: lastMessage?.name || 'unknown-tool',
                      toolInput: lastMessage?.tool_calls?.[0]?.args,
                      toolOutput: lastMessage?.content,
                      messages: messages,
                    },
                  } as ResearchWorkflowEvent);
                } catch (error) {
                  console.error('Failed to parse tool-execution event:', error);
                }
              }
            );

            // Listen for interruption_request events (HITL)
            eventSource.addEventListener(
              'interruption_request',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data);
                  observer.next({
                    type: 'interrupt',
                    timestamp: data.timestamp,
                    workflowId: executionId,
                    state: {
                      reportDraft: data.reportDraft,
                      userApproval: 'pending',
                    },
                  } as ResearchWorkflowEvent);
                } catch (error) {
                  console.error(
                    'Failed to parse interruption_request event:',
                    error
                  );
                }
              }
            );

            // Listen for workflow_complete events
            eventSource.addEventListener(
              'workflow_complete',
              (event: MessageEvent) => {
                try {
                  const data = JSON.parse(event.data);
                  observer.next({
                    type: 'workflow_complete',
                    timestamp: data.timestamp,
                    workflowId: executionId,
                    state: data.finalState,
                  } as ResearchWorkflowEvent);
                  eventSource.close();
                  observer.complete();
                } catch (error) {
                  console.error(
                    'Failed to parse workflow_complete event:',
                    error
                  );
                }
              }
            );

            // Handle errors
            eventSource.onerror = (error) => {
              console.error('SSE connection error:', error);
              observer.error(error);
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
   * Approve or reject report (HITL)
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
   * List all saved research reports
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
   * Read specific report content
   */
  readReport(filename: string): Observable<{
    content: string;
    metadata: Record<string, any>;
    filename: string;
  }> {
    return this.http.get<{
      content: string;
      metadata: Record<string, any>;
      filename: string;
    }>(`${this.apiUrl}/reports/${filename}`);
  }
}
