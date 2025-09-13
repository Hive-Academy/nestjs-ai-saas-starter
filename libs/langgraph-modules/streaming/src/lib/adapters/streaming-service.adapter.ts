import { Injectable, Logger } from '@nestjs/common';
import {
  IStreamingService,
  ITokenStreamingService,
  IEventStreamProcessorService,
  IWebSocketBridgeService,
  TokenStreamOptions,
  StreamEventData,
  ProgressData,
  StreamEventType,
} from '@hive-academy/langgraph-core';
import { StreamUpdate } from '../interfaces/streaming.interface';
import { TokenStreamingService } from '../services/token-streaming.service';
import { EventStreamProcessorService } from '../services/event-stream-processor.service';
import { WebSocketBridgeService } from '../services/websocket-bridge.service';

/**
 * Main streaming service adapter implementing the DI adapter pattern
 *
 * This adapter bridges the gap between consumer libraries (workflow-engine, multi-agent)
 * and the concrete streaming implementations, providing a clean interface for dependency injection.
 */
@Injectable()
export class StreamingServiceAdapter implements IStreamingService {
  private readonly logger = new Logger(StreamingServiceAdapter.name);

  constructor(
    private readonly tokenStreamingService: TokenStreamingService,
    private readonly eventStreamProcessor: EventStreamProcessorService,
    private readonly webSocketBridge: WebSocketBridgeService
  ) {
    this.logger.log(
      'StreamingServiceAdapter initialized with full DI integration'
    );
  }

  // Token streaming methods
  async initializeTokenStream(options: TokenStreamOptions): Promise<void> {
    try {
      await this.tokenStreamingService.initializeTokenStream(options);
      this.logger.debug(
        `Initialized token stream for ${options.executionId}:${options.nodeId}`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize token stream:`, error);
      throw error;
    }
  }

  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void {
    try {
      this.tokenStreamingService.streamToken(
        executionId,
        nodeId,
        token,
        metadata || {}
      );
      // Optionally log at debug level
      // this.logger.debug(`Streamed token for ${executionId}:${nodeId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stream token for ${executionId}:${nodeId}:`,
        error
      );
      throw error;
    }
  }

  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    try {
      await this.tokenStreamingService.flushTokens(executionId, nodeId);
      this.logger.debug(`Flushed tokens for ${executionId}:${nodeId}`);
    } catch (error) {
      this.logger.error(
        `Failed to flush tokens for ${executionId}:${nodeId}:`,
        error
      );
      throw error;
    }
  }

  // Event streaming methods
  streamEvent(
    executionId: string,
    nodeId: string,
    event: StreamEventData
  ): void {
    try {
      // Convert to internal event format and stream
      const internalUpdate: StreamUpdate = {
        type: this.mapEventTypeToStreamEventType(event.type),
        data: event.data,
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(), // Use timestamp as sequence for now
          executionId,
          nodeId,
          ...event.metadata,
        },
      };

      // Process event through the event stream processor
      this.eventStreamProcessor.processBatch([internalUpdate]);

      // Also broadcast directly to WebSocket for immediate delivery
      this.webSocketBridge.broadcastToExecution(executionId, internalUpdate);

      this.logger.debug(
        `Streamed event ${event.type} for ${executionId}:${nodeId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream event for ${executionId}:${nodeId}:`,
        error
      );
      throw error;
    }
  }

  // Progress streaming methods
  streamProgress(
    executionId: string,
    nodeId: string,
    progress: ProgressData
  ): void {
    try {
      this.streamEvent(executionId, nodeId, {
        type: StreamEventType.PROGRESS,
        data: progress,
        metadata: {
          progressType: 'node_progress',
          progress: progress.progress,
          message: progress.message,
        },
      });
      this.logger.debug(
        `Streamed progress ${progress.progress}% for ${executionId}:${nodeId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream progress for ${executionId}:${nodeId}:`,
        error
      );
      throw error;
    }
  }

  // WebSocket integration methods
  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    try {
      // Convert data to StreamUpdate if not already
      let update: StreamUpdate;
      if (this.isStreamUpdate(data)) {
        update = data;
      } else {
        update = {
          type: StreamEventType.EVENTS,
          data,
          metadata: {
            timestamp: new Date(),
            sequenceNumber: Date.now(),
            executionId,
          },
        };
      }

      this.webSocketBridge.broadcastToExecution(executionId, update);
      this.logger.debug(`Broadcasted to execution ${executionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to broadcast to execution ${executionId}:`,
        error
      );
      throw error;
    }
  }

  async sendToClient(clientId: string, data: any): Promise<void> {
    try {
      // Convert data to StreamUpdate if not already
      let update: StreamUpdate;
      if (this.isStreamUpdate(data)) {
        update = data;
      } else {
        update = {
          type: StreamEventType.EVENTS,
          data,
          metadata: {
            timestamp: new Date(),
            sequenceNumber: Date.now(),
            executionId: 'direct', // Direct client communication
          },
        };
      }

      this.webSocketBridge.sendToClient(clientId, update);
      this.logger.debug(`Sent to client ${clientId}`);
    } catch (error) {
      this.logger.error(`Failed to send to client ${clientId}:`, error);
      throw error;
    }
  }

  // Helper methods
  private mapEventTypeToStreamEventType(eventType: string): StreamEventType {
    // Map generic event types to internal StreamEventType enum
    const typeMapping: Record<string, StreamEventType> = {
      progress: StreamEventType.PROGRESS,
      token: StreamEventType.TOKEN,
      node_start: StreamEventType.NODE_START,
      node_complete: StreamEventType.NODE_COMPLETE,
      node_error: StreamEventType.ERROR,
      values: StreamEventType.VALUES,
      updates: StreamEventType.UPDATES,
      events: StreamEventType.EVENTS,
      milestone: StreamEventType.MILESTONE,
      debug: StreamEventType.DEBUG,
    };

    return typeMapping[eventType] || StreamEventType.EVENTS;
  }

  private isStreamUpdate(data: any): data is StreamUpdate {
    return data && typeof data === 'object' && 'type' in data && 'data' in data;
  }
}

/**
 * Individual service adapters for granular control
 * These can be injected separately if consumers only need specific functionality
 */
@Injectable()
export class TokenStreamingServiceAdapter implements ITokenStreamingService {
  constructor(private readonly tokenStreamingService: TokenStreamingService) {}

  async initializeTokenStream(options: TokenStreamOptions): Promise<void> {
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
      metadata || {}
    );
  }

  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    return this.tokenStreamingService.flushTokens(executionId, nodeId);
  }

  closeTokenStream(executionId: string, nodeId: string): void {
    return this.tokenStreamingService.closeTokenStream(executionId, nodeId);
  }
}

@Injectable()
export class EventStreamProcessorServiceAdapter
  implements IEventStreamProcessorService
{
  constructor(
    private readonly eventStreamProcessor: EventStreamProcessorService
  ) {}

  streamEvent(
    executionId: string,
    nodeId: string,
    event: StreamEventData
  ): void {
    const internalUpdate: StreamUpdate = {
      type: this.mapEventTypeToStreamEventType(event.type),
      data: event.data,
      metadata: {
        timestamp: new Date(),
        sequenceNumber: Date.now(),
        executionId,
        nodeId,
        ...event.metadata,
      },
    };

    this.eventStreamProcessor.processBatch([internalUpdate]);
  }

  processBatch(events: StreamUpdate[]): void {
    this.eventStreamProcessor.processBatch(events);
  }

  private mapEventTypeToStreamEventType(eventType: string): StreamEventType {
    const typeMapping: Record<string, StreamEventType> = {
      progress: StreamEventType.PROGRESS,
      token: StreamEventType.TOKEN,
      node_start: StreamEventType.NODE_START,
      node_complete: StreamEventType.NODE_COMPLETE,
      node_error: StreamEventType.ERROR,
      values: StreamEventType.VALUES,
      updates: StreamEventType.UPDATES,
      events: StreamEventType.EVENTS,
      milestone: StreamEventType.MILESTONE,
      debug: StreamEventType.DEBUG,
    };

    return typeMapping[eventType] || StreamEventType.EVENTS;
  }
}

@Injectable()
export class WebSocketBridgeServiceAdapter implements IWebSocketBridgeService {
  constructor(private readonly webSocketBridge: WebSocketBridgeService) {}

  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    let update: StreamUpdate;
    if (this.isStreamUpdate(data)) {
      update = data;
    } else {
      update = {
        type: StreamEventType.EVENTS,
        data,
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId,
        },
      };
    }

    this.webSocketBridge.broadcastToExecution(executionId, update);
  }

  async sendToClient(clientId: string, data: any): Promise<void> {
    let update: StreamUpdate;
    if (this.isStreamUpdate(data)) {
      update = data;
    } else {
      update = {
        type: StreamEventType.EVENTS,
        data,
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId: 'direct',
        },
      };
    }

    this.webSocketBridge.sendToClient(clientId, update);
  }

  registerClient(clientId: string, executionId: string): void {
    this.webSocketBridge.linkClientToExecution(clientId, executionId);
  }

  unregisterClient(clientId: string): void {
    this.webSocketBridge.unregisterClient(clientId);
  }

  private isStreamUpdate(data: any): data is StreamUpdate {
    return data && typeof data === 'object' && 'type' in data && 'data' in data;
  }
}
