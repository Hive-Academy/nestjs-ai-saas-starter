import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PlatformClientService } from './platform-client.service';
import {
  Run,
  CreateRunRequest,
  RunsSearchParams,
  RunsSearchResponse,
  StreamEvent,
  RunStatus,
} from '../interfaces/run.interface';

/**
 * Service for managing LangGraph Platform Runs
 */
@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);

  constructor(private readonly client: PlatformClientService) {}

  /**
   * Create a new run
   */
  async create(threadId: string, request: CreateRunRequest): Promise<Run> {
    this.logger.log(`Creating run for thread: ${threadId}, assistant: ${request.assistant_id}`);
    return this.client.post<Run>(`/threads/${threadId}/runs`, request);
  }

  /**
   * Get run by ID
   */
  async get(threadId: string, runId: string): Promise<Run> {
    return this.client.get<Run>(`/threads/${threadId}/runs/${runId}`);
  }

  /**
   * Cancel a running run
   */
  async cancel(threadId: string, runId: string, wait = true): Promise<void> {
    const params = wait ? { wait: 'true' } : {};
    this.logger.log(`Cancelling run: ${runId}`);
    await this.client.delete(`/threads/${threadId}/runs/${runId}`, params);
  }

  /**
   * Join a run (wait for completion)
   */
  async join(threadId: string, runId: string): Promise<Run> {
    return this.client.get<Run>(`/threads/${threadId}/runs/${runId}/join`);
  }

  /**
   * Search runs
   */
  async search(params: RunsSearchParams = {}): Promise<RunsSearchResponse> {
    return this.client.get<RunsSearchResponse>('/runs/search', params);
  }

  /**
   * Stream run execution
   */
  stream(
    threadId: string,
    request: CreateRunRequest,
    mode: 'values' | 'updates' | 'debug' | 'messages' = 'values'
  ): Observable<StreamEvent> {
    const subject = new Subject<StreamEvent>();
    
    // This would typically use Server-Sent Events or WebSocket
    // For now, we'll simulate streaming with polling
    this.simulateStream(threadId, request, mode, subject);
    
    return subject.asObservable();
  }

  /**
   * Wait for a run to complete and return the result
   */
  async waitForCompletion(
    threadId: string,
    runId: string,
    timeoutMs = 300000,
    pollIntervalMs = 1000
  ): Promise<Run> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const run = await this.get(threadId, runId);
      
      if (run.status === RunStatus.SUCCESS || 
          run.status === RunStatus.ERROR || 
          run.status === RunStatus.TIMEOUT ||
          run.status === RunStatus.INTERRUPTED) {
        return run;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Run ${runId} timed out after ${timeoutMs}ms`);
  }

  /**
   * Get runs for a specific thread
   */
  async getByThread(
    threadId: string, 
    limit = 100, 
    offset = 0
  ): Promise<RunsSearchResponse> {
    return this.search({ limit, offset });
  }

  /**
   * Get runs for a specific assistant
   */
  async getByAssistant(
    assistantId: string,
    limit = 100,
    offset = 0
  ): Promise<RunsSearchResponse> {
    return this.search({ assistant_id: assistantId, limit, offset });
  }

  /**
   * Check if run exists
   */
  async exists(threadId: string, runId: string): Promise<boolean> {
    try {
      await this.get(threadId, runId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Simulate streaming for development/testing
   * In production, this would use actual SSE or WebSocket connection
   */
  private async simulateStream(
    threadId: string,
    request: CreateRunRequest,
    mode: string,
    subject: Subject<StreamEvent>
  ): Promise<void> {
    try {
      // Create the run
      const run = await this.create(threadId, request);
      
      subject.next({
        event: 'run.start',
        data: run,
        metadata: { mode }
      });

      // Poll for updates
      let currentRun = run;
      while (currentRun.status === RunStatus.PENDING || currentRun.status === RunStatus.RUNNING) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentRun = await this.get(threadId, run.run_id);
        
        subject.next({
          event: 'run.update',
          data: currentRun,
          metadata: { mode }
        });
      }

      // Final event
      subject.next({
        event: currentRun.status === RunStatus.SUCCESS ? 'run.end' : 'run.error',
        data: currentRun,
        metadata: { mode }
      });

      subject.complete();
    } catch (error) {
      subject.error(error);
    }
  }
}