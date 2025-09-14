import { Injectable, Logger, Inject } from '@nestjs/common';
import type {
  IStreamingService,
  ITokenStreamingService,
  IEventStreamProcessorService,
  IWebSocketBridgeService,
  TokenStreamOptions,
  StreamEventData,
  ProgressData,
  StreamEventDecoratorMetadata,
  StreamProgressDecoratorMetadata,
} from '@hive-academy/langgraph-core';
import { StreamEventType } from '@hive-academy/langgraph-core';
import { getStreamingConfigWithDefaults } from '../utils/streaming-config.accessor';
import { StreamUpdate } from '../interfaces/streaming.interface';
// Switched to interface-token based injection to decouple adapter from concrete implementations
import {
  TOKEN_STREAMING_SERVICE_TOKEN,
  EVENT_STREAM_PROCESSOR_SERVICE_TOKEN,
  WEBSOCKET_BRIDGE_SERVICE_TOKEN,
} from '@hive-academy/langgraph-core';
import { normalizeAndWarn } from '@hive-academy/langgraph-core';

/**
 * Main streaming service adapter implementing the DI adapter pattern
 *
 * This adapter bridges the gap between consumer libraries (workflow-engine, multi-agent)
 * and the concrete streaming implementations, providing a clean interface for dependency injection.
 */
@Injectable()
export class StreamingServiceAdapter implements IStreamingService {
  private readonly logger = new Logger(StreamingServiceAdapter.name);
  private readonly initializedEventStreams = new Set<string>();
  private readonly initializedProgressStreams = new Set<string>();
  private readonly eventStreamConfigs = new Map<
    string,
    StreamEventDecoratorMetadata
  >();
  private readonly progressTrackerConfigs = new Map<
    string,
    StreamProgressDecoratorMetadata
  >();
  // track which raw ids have been warned (adapter-level) beyond util global - process scoped
  private readonly warnedIds = new Set<string>();
  private readonly strictNaming: boolean;

  constructor(
    @Inject(TOKEN_STREAMING_SERVICE_TOKEN)
    private readonly tokenStreamingService: ITokenStreamingService,
    @Inject(EVENT_STREAM_PROCESSOR_SERVICE_TOKEN)
    private readonly eventStreamProcessor: IEventStreamProcessorService,
    @Inject(WEBSOCKET_BRIDGE_SERVICE_TOKEN)
    private readonly webSocketBridge: IWebSocketBridgeService
  ) {
    this.logger.log(
      'StreamingServiceAdapter initialized with full DI integration'
    );
    const cfg = getStreamingConfigWithDefaults();
    this.strictNaming = cfg.strictNaming;
  }

  // central helper to canonicalize nodeId
  private canonicalize(nodeId: string): string {
    const normalized = normalizeAndWarn(nodeId, {
      warn: true,
      strict: this.strictNaming,
    });
    if (normalized !== nodeId && !this.warnedIds.has(nodeId)) {
      this.warnedIds.add(nodeId);
      this.logger.warn(
        `nodeId '${nodeId}' normalized to canonical '${normalized}'`
      );
    }
    return normalized;
  }

  // Token streaming methods
  async initializeTokenStream(options: TokenStreamOptions): Promise<void> {
    try {
      const canonicalNodeId = this.canonicalize(options.nodeId);
      await this.tokenStreamingService.initializeTokenStream({
        ...options,
        nodeId: canonicalNodeId,
      });
      this.logger.debug(
        `Initialized token stream for ${options.executionId}:${canonicalNodeId}`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize token stream:`, error);
      throw error;
    }
  }

  // --- Event / Progress Lazy Initialization ---------------------------------

  /**
   * Initialize an event stream if not already initialized. Idempotent.
   * Decorators call this before emitting NODE_START / etc. We keep a minimal
   * config record so future adaptive logic (batching / delivery tuning) can
   * reference original intent without forcing explicit initialization at
   * every call site.
   */
  async initializeEventStream(options: {
    executionId: string;
    nodeId: string;
    config: StreamEventDecoratorMetadata;
  }): Promise<void> {
    const { executionId, nodeId, config } = options;
    const canonicalNodeId = this.canonicalize(nodeId);
    const key = `${executionId}:${canonicalNodeId}`;
    if (this.initializedEventStreams.has(key)) return;

    const moduleDefaults = getStreamingConfigWithDefaults();
    const enriched: StreamEventDecoratorMetadata = {
      enabled: config.enabled ?? true,
      methodName: config.methodName || canonicalNodeId,
      events: config.events || [StreamEventType.EVENTS],
      bufferSize: config.bufferSize ?? moduleDefaults.defaultBufferSize,
      batchSize: config.batchSize ?? moduleDefaults.eventDefaults.batchSize,
      delivery: config.delivery ?? moduleDefaults.eventDefaults.delivery,
      filter: config.filter,
      transformer: config.transformer,
    };
    this.eventStreamConfigs.set(key, enriched);
    this.initializedEventStreams.add(key);
    this.logger.debug(`Initialized event stream ${key}`);
  }

  /**
   * Initialize a progress tracker lazily (idempotent). Stores config for
   * potential later metrics or adaptive interval control.
   */
  async initializeProgressTracker(options: {
    executionId: string;
    nodeId: string;
    config: StreamProgressDecoratorMetadata;
  }): Promise<void> {
    const { executionId, nodeId, config } = options;
    const canonicalNodeId = this.canonicalize(nodeId);
    const key = `${executionId}:${canonicalNodeId}`;
    if (this.initializedProgressStreams.has(key)) return;

    const moduleDefaults = getStreamingConfigWithDefaults();
    const enriched: StreamProgressDecoratorMetadata = {
      enabled: config.enabled ?? true,
      methodName: config.methodName || canonicalNodeId,
      interval: config.interval ?? moduleDefaults.progressDefaults.interval,
      granularity:
        config.granularity ?? moduleDefaults.progressDefaults.granularity,
      includeETA: config.includeETA ?? false,
      includeMetrics: config.includeMetrics ?? false,
      milestones: config.milestones || [],
      calculator: config.calculator,
      format: config.format || {
        showPercentage: true,
        showCurrent: false,
        showTotal: false,
        showRate: false,
        precision: 1,
      },
    };
    this.progressTrackerConfigs.set(key, enriched);
    this.initializedProgressStreams.add(key);
    this.logger.debug(`Initialized progress tracker ${key}`);
  }

  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void {
    const canonicalNodeId = this.canonicalize(nodeId);
    try {
      this.tokenStreamingService.streamToken(
        executionId,
        canonicalNodeId,
        token,
        metadata || {}
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream token for ${executionId}:${canonicalNodeId}:`,
        error
      );
      throw error;
    }
  }

  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    const canonicalNodeId = this.canonicalize(nodeId);
    try {
      await this.tokenStreamingService.flushTokens(
        executionId,
        canonicalNodeId
      );
      this.logger.debug(`Flushed tokens for ${executionId}:${canonicalNodeId}`);
    } catch (error) {
      this.logger.error(
        `Failed to flush tokens for ${executionId}:${canonicalNodeId}:`,
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
    const canonicalNodeId = this.canonicalize(nodeId);
    try {
      const internalUpdate: StreamUpdate = {
        type: this.mapEventTypeToStreamEventType(event.type),
        data: event.data,
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId,
          nodeId: canonicalNodeId,
          ...event.metadata,
        },
      };
      this.eventStreamProcessor.processBatch([internalUpdate]);
      if (this.webSocketBridge?.broadcastToExecution) {
        this.webSocketBridge.broadcastToExecution(executionId, internalUpdate);
      }
      this.logger.debug(
        `Streamed event ${event.type} for ${executionId}:${canonicalNodeId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream event for ${executionId}:${canonicalNodeId}:`,
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
    const canonicalNodeId = this.canonicalize(nodeId);
    try {
      this.streamEvent(executionId, canonicalNodeId, {
        type: StreamEventType.PROGRESS,
        data: progress,
        metadata: {
          progressType: 'node_progress',
          progress: progress.progress,
          message: progress.message,
        },
      });
      this.logger.debug(
        `Streamed progress ${progress.progress}% for ${executionId}:${canonicalNodeId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to stream progress for ${executionId}:${canonicalNodeId}:`,
        error
      );
      throw error;
    }
  }

  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    try {
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
      if (this.webSocketBridge?.broadcastToExecution) {
        this.webSocketBridge.broadcastToExecution(executionId, update);
      }
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
      if (this.webSocketBridge?.sendToClient) {
        this.webSocketBridge.sendToClient(clientId, update);
      }
      this.logger.debug(`Sent to client ${clientId}`);
    } catch (error) {
      this.logger.error(`Failed to send to client ${clientId}:`, error);
      throw error;
    }
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

  private isStreamUpdate(data: any): data is StreamUpdate {
    return data && typeof data === 'object' && 'type' in data && 'data' in data;
  }

  async emitEvent(eventType: string, data: any): Promise<void> {
    try {
      const streamEventType = this.mapEventTypeToStreamEventType(eventType);
      const update: StreamUpdate = {
        type: streamEventType,
        data,
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId: data.executionId || 'unknown',
        },
      };
      if ((this.eventStreamProcessor as any).processEvent) {
        (this.eventStreamProcessor as any).processEvent(update);
      } else {
        this.eventStreamProcessor.processBatch([update]);
      }
      if (data.executionId) {
        await this.webSocketBridge.broadcastToExecution(
          data.executionId,
          update
        );
      }
      this.logger.debug(`Emitted event ${eventType}`, { data });
    } catch (error) {
      this.logger.error(`Failed to emit event ${eventType}:`, error);
      throw error;
    }
  }

  async emitProgress(eventType: string, data: any): Promise<void> {
    try {
      const update: StreamUpdate = {
        type: StreamEventType.PROGRESS,
        data: {
          ...data,
          eventType,
        },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId: data.executionId || 'unknown',
        },
      };
      if ((this.eventStreamProcessor as any).processEvent) {
        (this.eventStreamProcessor as any).processEvent(update);
      } else {
        this.eventStreamProcessor.processBatch([update]);
      }
      if (data.executionId) {
        await this.webSocketBridge.broadcastToExecution(
          data.executionId,
          update
        );
      }
      this.logger.debug(`Emitted progress ${eventType}`, { data });
    } catch (error) {
      this.logger.error(`Failed to emit progress ${eventType}:`, error);
      throw error;
    }
  }
}

/**
 * Individual service adapters for granular control
 * These can be injected separately if consumers only need specific functionality
 */
@Injectable()
export class TokenStreamingServiceAdapter implements ITokenStreamingService {
  constructor(
    @Inject(TOKEN_STREAMING_SERVICE_TOKEN)
    private readonly tokenStreamingService: ITokenStreamingService
  ) {}

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
    @Inject(EVENT_STREAM_PROCESSOR_SERVICE_TOKEN)
    private readonly eventStreamProcessor: IEventStreamProcessorService
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
  constructor(
    @Inject(WEBSOCKET_BRIDGE_SERVICE_TOKEN)
    private readonly webSocketBridge: IWebSocketBridgeService
  ) {}

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
    // Not all bridge implementations expose linkClientToExecution; guard
    if ((this.webSocketBridge as any).linkClientToExecution) {
      (this.webSocketBridge as any).linkClientToExecution(
        clientId,
        executionId
      );
    }
  }

  unregisterClient(clientId: string): void {
    this.webSocketBridge.unregisterClient(clientId);
  }

  private isStreamUpdate(data: any): data is StreamUpdate {
    return data && typeof data === 'object' && 'type' in data && 'data' in data;
  }
}
