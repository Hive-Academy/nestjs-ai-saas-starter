import { Injectable } from '@nestjs/common';
import { IStreamingService, parseNodeId } from '@hive-academy/langgraph-core';
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
  // Hierarchical sequence counters scoped per execution + node ID
  private readonly sequenceCounters = new Map<string, number>();

  constructor(
    private readonly tokenStreamingService: TokenStreamingService,
    private readonly eventStreamProcessor: EventStreamProcessorService,
    private readonly webSocketBridge: WebSocketBridgeService
  ) {}

  /**
   * Get and increment sequence number for a specific execution + node
   * Uses hierarchical counter key: `${executionId}:${nodeId}`
   */
  private getNodeSequence(executionId: string, nodeId: string): number {
    const counterKey = `${executionId}:${nodeId}`;

    if (!this.sequenceCounters.has(counterKey)) {
      this.sequenceCounters.set(counterKey, 0);
    }

    const currentSequence = this.sequenceCounters.get(counterKey)!;
    this.sequenceCounters.set(counterKey, currentSequence + 1);

    return currentSequence;
  }

  /**
   * Parse node ID components for metadata enrichment
   * Returns domain/phase/activity/detail if node ID is canonical, undefined otherwise
   */
  private parseNodeIdComponents(nodeId: string): {
    domain?: string;
    phase?: string;
    activity?: string;
    detail?: string;
  } {
    try {
      const parts = parseNodeId(nodeId);
      return {
        domain: parts.domain,
        phase: parts.phase,
        activity: parts.activity,
        detail: parts.detail,
      };
    } catch {
      // Non-canonical node ID - return empty object
      return {};
    }
  }

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
    // Parse node ID to extract hierarchical components
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const streamUpdate: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data: event,
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        // Include node ID structure for metrics/observability
        ...nodeIdParts,
      },
    };

    // Process the event and broadcast via WebSocket
    this.eventStreamProcessor.processEvent(streamUpdate);
    this.webSocketBridge.broadcastToExecution(executionId, streamUpdate);
  }

  async emitEvent(eventType: string, data: any): Promise<void> {
    const executionId = data.executionId || 'global';
    const nodeId = data.nodeId || eventType; // Use eventType as fallback node ID

    // Parse node ID to extract hierarchical components
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const streamUpdate: StreamUpdate = {
      type: StreamEventType.EVENTS,
      data: { eventType, ...data },
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        // Include node ID structure for metrics/observability
        ...nodeIdParts,
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
    // Parse node ID to extract hierarchical components
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const streamUpdate: StreamUpdate = {
      type: StreamEventType.PROGRESS,
      data: progress,
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        // Include node ID structure for metrics/observability
        ...nodeIdParts,
      },
    };

    this.webSocketBridge.broadcastToExecution(executionId, streamUpdate);
  }

  async emitProgress(eventType: string, data: any): Promise<void> {
    const executionId = data.executionId || 'global';
    const nodeId = data.nodeId || eventType; // Use eventType as fallback node ID

    // Parse node ID to extract hierarchical components
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const streamUpdate: StreamUpdate = {
      type: StreamEventType.PROGRESS,
      data: { eventType, ...data },
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        // Include node ID structure for metrics/observability
        ...nodeIdParts,
      },
    };

    if (data.executionId) {
      this.webSocketBridge.broadcastToExecution(data.executionId, streamUpdate);
    }
  }

  // WebSocket integration methods - delegate to WebSocketBridgeService
  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    // Use 'broadcast' as default node ID for general execution broadcasts
    const nodeId = data.nodeId || 'broadcast';

    // Parse node ID to extract hierarchical components
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const streamUpdate: StreamUpdate = {
      type: StreamEventType.VALUES,
      data,
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        // Include node ID structure for metrics/observability
        ...nodeIdParts,
      },
    };

    this.webSocketBridge.broadcastToExecution(executionId, streamUpdate);
  }

  async sendToClient(clientId: string, data: any): Promise<void> {
    const executionId = `client-${clientId}`;
    const nodeId = data.nodeId || 'direct-message';

    // Parse node ID to extract hierarchical components
    const nodeIdParts = this.parseNodeIdComponents(nodeId);

    const streamUpdate: StreamUpdate = {
      type: StreamEventType.VALUES,
      data,
      metadata: {
        executionId,
        nodeId,
        timestamp: new Date(),
        sequenceNumber: this.getNodeSequence(executionId, nodeId), // ✅ Per-node counter
        // Include node ID structure for metrics/observability
        ...nodeIdParts,
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
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return { unsubscribe: () => {} };
          },
        };
      },
    };
  }

  async createStream(executionId: string, options?: any): Promise<any> {
    // Initialize stream for execution
    return this.getStream(executionId);
  }

  closeStream(executionId: string): void {
    // Close token stream if it exists
    this.tokenStreamingService.closeTokenStream(executionId, 'all');

    // Clean up sequence counters for this execution
    const keysToDelete: string[] = [];
    for (const key of this.sequenceCounters.keys()) {
      if (key.startsWith(`${executionId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.sequenceCounters.delete(key));
  }
}
