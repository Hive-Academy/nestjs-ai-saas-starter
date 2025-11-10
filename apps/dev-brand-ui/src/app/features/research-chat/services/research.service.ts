import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

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
    | 'error';
  timestamp: string;
  workflowId: string;
  taskName?: string;
  state?: any;
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

  constructor(private http: HttpClient) {}

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
    return new Observable((observer) => {
      const eventSource = new EventSource(
        `${this.apiUrl}/stream/${executionId}`
      );

      // Listen for workflow-update events
      eventSource.addEventListener('workflow-update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          observer.next({
            type: 'state_update',
            timestamp: data.timestamp,
            workflowId: executionId,
            state: data.state,
          } as ResearchWorkflowEvent);
        } catch (error) {
          console.error('Failed to parse workflow-update event:', error);
        }
      });

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
            console.error('Failed to parse interruption_request event:', error);
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
            console.error('Failed to parse workflow_complete event:', error);
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
    });
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
