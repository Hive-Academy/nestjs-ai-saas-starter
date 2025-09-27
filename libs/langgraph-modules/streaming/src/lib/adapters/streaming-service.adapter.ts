import { Injectable } from '@nestjs/common';
import { IStreamingService } from '@hive-academy/langgraph-core';
import { TokenStreamingService } from '../services/token-streaming.service';
import { EventStreamProcessorService } from '../services/event-stream-processor.service';
import { WebSocketBridgeService } from '../services/websocket-bridge.service';
import { StreamUpdate } from '../interfaces/streaming.interface';
import { StreamEventType } from '../constants';

/**
 * Streaming Service Adapter
 *
 * Bridges the streaming module implementation with core interface
 * for cross-package dependency injection without direct linking
 */
@Injectable()
export class StreamingServiceAdapter implements IStreamingService {
  constructor(
    private readonly tokenStreamingService: TokenStreamingService,
    private readonly eventStreamProcessor: EventStreamProcessorService,
    private readonly webSocketBridge: WebSocketBridgeService
  ) {}

  // Token streaming methods - delegate to TokenStreamingService
  async initializeTokenStream(options: {
    executionId: string;
    nodeId: string;
    config: any;
  }): Promise<void> {
    return this.tokenStreamingService.initializeTokenStream(options);
  }

  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void {
    return this.tokenStreamingService.streamToken(
      executionId,
      nodeId,
      token,
      metadata
    );
  }

  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    return this.tokenStreamingService.flushTokens(executionId, nodeId);
  }

  closeTokenStream(executionId: string, nodeId: string): void {
    return this.tokenStreamingService.closeTokenStream(executionId, nodeId);
  }

  closeExecutionTokenStreams(executionId: string): void {
    return this.tokenStreamingService.closeExecutionTokenStreams(executionId);
  }

  getTokenStream(executionId: string, nodeId?: string): any {
    return this.tokenStreamingService.getTokenStream(executionId, nodeId);
  }

  getGlobalTokenStream(): any {
    return this.tokenStreamingService.getGlobalTokenStream();
  }

  // Event streaming methods - delegate to EventStreamProcessorService and WebSocketBridge
  streamEvent(executionId: string, nodeId: string, event: any): void {
    const streamUpdate: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data: event,
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: Date.now(),
      },
    };

    // Process the event and broadcast via WebSocket
    this.eventStreamProcessor.processEvent(streamUpdate);
    this.webSocketBridge.broadcastToExecution(executionId, streamUpdate);
  }

  async emitEvent(eventType: string, data: any): Promise<void> {
    const streamUpdate: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data: { eventType, ...data },
      metadata: {
        executionId: data.executionId || 'global',
        timestamp: new Date(),
        sequenceNumber: Date.now(),
      },
    };

    // Process and broadcast the event
    this.eventStreamProcessor.processEvent(streamUpdate);
    if (data.executionId) {
      this.webSocketBridge.broadcastToExecution(data.executionId, streamUpdate);
    }
  }

  // Progress streaming methods - delegate to WebSocketBridge
  streamProgress(executionId: string, nodeId: string, progress: any): void {
    const streamUpdate: StreamUpdate = {
      type: StreamEventType.PROGRESS,
      data: progress,
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: Date.now(),
      },
    };

    this.webSocketBridge.broadcastToExecution(executionId, streamUpdate);
  }

  async emitProgress(eventType: string, data: any): Promise<void> {
    const streamUpdate: StreamUpdate = {
      type: StreamEventType.PROGRESS,
      data: { eventType, ...data },
      metadata: {
        executionId: data.executionId || 'global',
        timestamp: new Date(),
        sequenceNumber: Date.now(),
      },
    };

    if (data.executionId) {
      this.webSocketBridge.broadcastToExecution(data.executionId, streamUpdate);
    }
  }

  // WebSocket integration methods - delegate to WebSocketBridgeService
  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    const streamUpdate: StreamUpdate = {
      type: StreamEventType.VALUES,
      data,
      metadata: {
        executionId,
        timestamp: new Date(),
        sequenceNumber: Date.now(),
      },
    };

    this.webSocketBridge.broadcastToExecution(executionId, streamUpdate);
  }

  async sendToClient(clientId: string, data: any): Promise<void> {
    const streamUpdate: StreamUpdate = {
      type: StreamEventType.VALUES,
      data,
      metadata: {
        executionId: 'direct-client',
        timestamp: new Date(),
        sequenceNumber: Date.now(),
      },
    };

    this.webSocketBridge.sendToClient(clientId, streamUpdate);
  }

  // Stream management methods - required by IStreamingService
  getStream(executionId: string): any {
    // Return a mock stream object for compatibility
    return {
      executionId,
      asObservable: () => {
        // Return a basic observable-like object
        return {
          subscribe: (observer: any) => {
            // Basic stream subscription
            return { unsubscribe: () => {} };
          }
        };
      }
    };
  }

  async createStream(executionId: string, options?: any): Promise<any> {
    // Initialize stream for execution
    return this.getStream(executionId);
  }

  closeStream(executionId: string): void {
    // Close token stream if it exists
    this.tokenStreamingService.closeTokenStream(executionId, 'all');
  }
}
