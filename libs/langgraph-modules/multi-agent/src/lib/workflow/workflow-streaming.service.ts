import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import type { IStreamingService } from '@hive-academy/langgraph-core';
import { StreamEventType } from '@hive-academy/langgraph-core';
import {
  WorkflowConfig,
  WorkflowResult,
} from '../interfaces/multi-agent.interface';

/**
 * Workflow Streaming Service
 * Handles streaming capabilities for workflow execution
 * Extracted from WorkflowManagerService to follow SRP
 */
@Injectable()
export class WorkflowStreamingService {
  private readonly logger = new Logger(WorkflowStreamingService.name);

  constructor(
    @Optional()
    @Inject('IStreamingService')
    private readonly streamingService?: IStreamingService
  ) {
    this.logger.debug('WorkflowStreamingService initialized');
    if (this.streamingService) {
      this.logger.debug('Streaming service available for workflow operations');
    } else {
      this.logger.debug(
        'No streaming service - workflows will run without streaming'
      );
    }
  }

  /**
   * Check if streaming is available
   */
  isStreamingAvailable(): boolean {
    return !!this.streamingService;
  }

  /**
   * Initialize streaming for a workflow execution
   */
  async initializeWorkflowStream(
    workflowId: string,
    input: any,
    config?: Partial<WorkflowConfig>
  ): Promise<{
    executionId: string;
    nodeId: string;
  }> {
    const executionId = `workflow_${workflowId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const nodeId = `manager_${workflowId}`;

    if (this.streamingService) {
      try {
        await this.streamingService.initializeTokenStream({
          enabled: true,
          executionId,
          nodeId,
          config,
        });

        // Emit workflow initialization event
        await this.streamingService.emitEvent('workflow_init', {
          workflowId,
          input,
          executionId,
          timestamp: new Date(),
        });

        this.logger.debug(
          `Initialized streaming for workflow ${workflowId} with execution ID ${executionId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to initialize streaming for workflow ${workflowId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return { executionId, nodeId };
  }

  /**
   * Send progress event
   */
  async sendProgressEvent(
    executionId: string,
    nodeId: string,
    progressData: {
      status: string;
      workflowId: string;
      progress: number;
      phase?: string;
      [key: string]: any;
    },
    callback?: (event: { type: 'progress'; data: any }) => void
  ): Promise<void> {
    const progressEvent = {
      type: 'progress' as const,
      data: {
        ...progressData,
        executionId,
        timestamp: new Date(),
      },
    };

    if (callback) {
      callback(progressEvent);
    }

    if (this.streamingService) {
      this.streamingService.streamProgress(
        executionId,
        nodeId,
        progressEvent.data
      );
    }
  }

  /**
   * Send completion event
   */
  async sendCompletionEvent(
    executionId: string,
    nodeId: string,
    workflowId: string,
    result: WorkflowResult,
    callback?: (event: { type: 'complete'; data: any }) => void
  ): Promise<void> {
    const completeEvent = {
      type: 'complete' as const,
      data: {
        ...result,
        workflowId,
        executionId,
        timestamp: new Date(),
      },
    };

    if (callback) {
      callback(completeEvent);
    }

    if (this.streamingService) {
      await this.streamingService.emitEvent(
        'workflow_complete',
        completeEvent.data
      );
      await this.streamingService.flushTokens(executionId, nodeId);
    }
  }

  /**
   * Send error event
   */
  async sendErrorEvent(
    executionId: string,
    nodeId: string,
    workflowId: string,
    error: Error,
    callback?: (event: { type: 'error'; data: any }) => void
  ): Promise<void> {
    const errorEvent = {
      type: 'error' as const,
      data: {
        error: error.message,
        workflowId,
        executionId,
        timestamp: new Date(),
        details: error.stack,
      },
    };

    if (callback) {
      callback(errorEvent);
    }

    if (this.streamingService) {
      await this.streamingService.emitEvent('workflow_error', errorEvent.data);
    }
  }

  /**
   * Stream workflow execution in real-time
   */
  async createWorkflowStream(
    workflowId: string,
    input: any,
    config?: Partial<WorkflowConfig>
  ): Promise<{
    executionId: string;
    nodeId: string;
    streamGenerator: AsyncIterable<{
      type: StreamEventType;
      data: any;
      timestamp: Date;
    }>;
    addEvent: (event: { type: string; data: any }) => void;
    cancel: () => void;
  }> {
    if (!this.streamingService) {
      throw new Error(
        'Streaming service not available - cannot stream workflow execution'
      );
    }

    const { executionId, nodeId } = await this.initializeWorkflowStream(
      workflowId,
      input,
      config
    );

    let cancelled = false;
    const events: Array<{ type: StreamEventType; data: any; timestamp: Date }> =
      [];
    let streamResolver:
      | ((value: { type: StreamEventType; data: any; timestamp: Date }) => void)
      | null = null;
    let streamRejecter: ((error: Error) => void) | null = null;

    // Create the async generator for streaming
    const streamGenerator = (async function* (): AsyncIterable<{
      type: StreamEventType;
      data: any;
      timestamp: Date;
    }> {
      while (!cancelled) {
        if (events.length > 0) {
          const event = events.shift()!;
          yield event;
        } else {
          // Wait for next event
          try {
            const event = await new Promise<{
              type: StreamEventType;
              data: any;
              timestamp: Date;
            }>((resolve, reject) => {
              streamResolver = resolve;
              streamRejecter = reject;

              // Timeout after 30 seconds of no events
              setTimeout(() => {
                if (streamResolver) {
                  streamRejecter?.(
                    new Error('Stream timeout - no events received')
                  );
                  streamResolver = null;
                  streamRejecter = null;
                }
              }, 30000);
            });
            yield event;
          } catch {
            // Timeout or error, continue or break based on cancellation
            break;
          }
        }
      }
    })();

    return {
      executionId,
      nodeId,
      streamGenerator,
      addEvent: (event: { type: string; data: any }) => {
        const streamEvent = {
          type: this.mapEventTypeToStreamEventType(event.type),
          data: event.data,
          timestamp: new Date(),
        };

        if (streamResolver) {
          streamResolver(streamEvent);
          streamResolver = null;
          streamRejecter = null;
        } else {
          events.push(streamEvent);
        }
      },
      cancel: () => {
        cancelled = true;
        if (streamRejecter) {
          streamRejecter(new Error('Stream cancelled by user'));
        }
      },
    };
  }

  /**
   * Map workflow event types to streaming event types
   */
  private mapEventTypeToStreamEventType(eventType: string): StreamEventType {
    switch (eventType) {
      case 'progress':
        return StreamEventType.PROGRESS;
      case 'data':
        return StreamEventType.VALUES;
      case 'error':
        return StreamEventType.ERROR;
      case 'complete':
        return StreamEventType.UPDATES;
      default:
        return StreamEventType.EVENTS;
    }
  }

  /**
   * Execute workflow with progress tracking
   */
  async executeWithProgressTracking<T>(
    executionId: string,
    nodeId: string,
    workflowId: string,
    executeFunction: () => Promise<T>,
    streamCallback?: (event: {
      type: 'progress' | 'data' | 'error' | 'complete';
      data: any;
    }) => void
  ): Promise<T> {
    const startTime = Date.now();

    // Send pre-execution progress
    await this.sendProgressEvent(
      executionId,
      nodeId,
      {
        status: 'preparing',
        workflowId,
        progress: 10,
        phase: 'initialization',
      },
      streamCallback
    );

    try {
      // Execute the workflow
      const result = await executeFunction();

      // Send execution progress
      await this.sendProgressEvent(
        executionId,
        nodeId,
        {
          status: 'executing',
          workflowId,
          progress: 50,
          phase: 'execution',
        },
        streamCallback
      );

      // Send final progress
      await this.sendProgressEvent(
        executionId,
        nodeId,
        {
          status: 'completed',
          workflowId,
          progress: 100,
          phase: 'finalization',
          executionTime: Date.now() - startTime,
          success: true,
        },
        streamCallback
      );

      if (this.streamingService) {
        // Emit final workflow status event
        await this.streamingService.emitEvent('workflow_success', {
          workflowId,
          executionId,
          result,
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      await this.sendProgressEvent(
        executionId,
        nodeId,
        {
          status: 'failed',
          workflowId,
          progress: 100,
          phase: 'error',
          executionTime: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        streamCallback
      );

      if (this.streamingService) {
        await this.streamingService.emitEvent('workflow_failure', {
          workflowId,
          executionId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        });
      }

      throw error;
    }
  }
}
