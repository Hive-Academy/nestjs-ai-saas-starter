import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import { DeclarativeWorkflowBase } from './declarative-workflow.base';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import { WorkflowGraphBuilderService } from '../core/workflow-graph-builder.service';
import { SubgraphManagerService } from '../core/subgraph-manager.service';
import { WorkflowStreamService } from '../streaming/workflow-stream.service';
import { TokenStreamingService } from '../streaming/token-streaming.service';
import { WebSocketBridgeService } from '../streaming/websocket-bridge.service';
import { EventStreamProcessorService } from '../streaming/event-stream-processor.service';
import {
  WorkflowState,
  WorkflowDefinition,
  StreamUpdate,
  StreamEventType,
} from '../interfaces';
import {
  StreamTokenMetadata,
  StreamEventMetadata,
  StreamProgressMetadata,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
} from '../decorators/streaming.decorator';

/**
 * Streaming workflow execution context
 */
interface StreamingExecutionContext {
  executionId: string;
  streamingEnabled: boolean;
  tokenStreaming: boolean;
  eventStreaming: boolean;
  progressStreaming: boolean;
  clientConnections: string[];
  rooms: string[];
}

/**
 * Streaming configuration for a workflow execution
 */
interface StreamingConfiguration {
  enabled: boolean;
  tokenStreaming: {
    enabled: boolean;
    nodes: Map<string, StreamTokenMetadata>;
  };
  eventStreaming: {
    enabled: boolean;
    nodes: Map<string, StreamEventMetadata>;
  };
  progressStreaming: {
    enabled: boolean;
    nodes: Map<string, StreamProgressMetadata>;
  };
  webSocketConfig: {
    enableRooms: boolean;
    defaultRoom?: string;
    allowedEventTypes?: StreamEventType[];
  };
}

/**
 * Base class for streaming workflows that use decorators
 *
 * This class extends DeclarativeWorkflowBase and provides automatic streaming
 * setup from @StreamToken, @StreamEvent, and @StreamProgress decorators.
 * It integrates with WorkflowStreamService, TokenStreamingService, and WebSocketBridgeService
 * for comprehensive real-time streaming capabilities.
 *
 * @example
 * ```typescript
 * @Workflow({
 *   name: 'ai-content-generation',
 *   description: 'AI content generation with real-time streaming',
 *   streaming: true,
 * })
 * export class AIContentGenerationWorkflow extends StreamingWorkflowBase<ContentState> {
 *
 *   @StartNode({ description: 'Initialize content generation' })
 *   @StreamProgress({
 *     enabled: true,
 *     granularity: 'fine',
 *     includeETA: true
 *   })
 *   async start(state: ContentState): Promise<Partial<ContentState>> {
 *     return {
 *       sessionId: `session_${Date.now()}`,
 *       status: 'initializing',
 *       progress: 0
 *     };
 *   }
 *
 *   @Node({
 *     type: 'llm',
 *     description: 'Generate content with AI'
 *   })
 *   @StreamToken({
 *     enabled: true,
 *     bufferSize: 25,
 *     format: 'text',
 *     filter: { excludeWhitespace: true }
 *   })
 *   @StreamEvent({
 *     events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE],
 *     delivery: 'at-least-once'
 *   })
 *   async generateContent(state: ContentState): Promise<Partial<ContentState>> {
 *     const content = await this.llm.invoke(state.prompt);
 *     return {
 *       content: content.content,
 *       status: 'content_generated'
 *     };
 *   }
 *
 *   @Node('review_content')
 *   @StreamEvent({
 *     events: [StreamEventType.VALUES, StreamEventType.UPDATES],
 *     transformer: (event) => ({ ...event, reviewed: true })
 *   })
 *   async reviewContent(state: ContentState): Promise<Partial<ContentState>> {
 *     const review = await this.reviewService.review(state.content);
 *     return {
 *       review,
 *       status: review.approved ? 'approved' : 'revision_needed'
 *     };
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class StreamingWorkflowBase<
    TState extends WorkflowState = WorkflowState
  >
  extends DeclarativeWorkflowBase<TState>
  implements OnModuleInit
{
  protected override readonly logger: Logger;
  private streamingConfiguration?: StreamingConfiguration;
  private readonly executionContexts = new Map<string, StreamingExecutionContext>();

  constructor(
    @Inject(EventEmitter2)
    protected override readonly eventEmitter: EventEmitter2,
    @Inject(WorkflowGraphBuilderService)
    protected override readonly graphBuilder: WorkflowGraphBuilderService,
    @Inject(SubgraphManagerService)
    protected override readonly subgraphManager: SubgraphManagerService,
    @Inject(MetadataProcessorService)
    protected override readonly metadataProcessor: MetadataProcessorService,
    @Optional()
    @Inject(WorkflowStreamService)
    protected override readonly streamService?: WorkflowStreamService,
    @Optional()
    @Inject(EventStreamProcessorService)
    protected override readonly eventProcessor?: EventStreamProcessorService,
    @Optional()
    @Inject(TokenStreamingService)
    protected readonly tokenStreamingService?: TokenStreamingService,
    @Optional()
    @Inject(WebSocketBridgeService)
    protected readonly webSocketBridgeService?: WebSocketBridgeService
  ) {
    super(eventEmitter, graphBuilder, subgraphManager, metadataProcessor, streamService, eventProcessor);
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Enhanced initialization with streaming setup
   */
  override async onModuleInit(): Promise<void> {
    // Call parent initialization first
    await super.onModuleInit();

    // Setup streaming configuration
    await this.setupStreamingConfiguration();

    this.logger.log(
      `StreamingWorkflowBase initialized: ${this.workflowConfig.name}`
    );
  }

  /**
   * Execute workflow with streaming support
   */
  override async execute(
    input: Partial<TState>,
    config: any = {}
  ): Promise<TState> {
    const executionId =
      config.executionId ||
      `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      // Setup streaming context
      await this.setupStreamingContext(executionId, input, config);

      // Execute with parent implementation
      const result = await super.execute(input, config);

      // Complete streaming
      await this.completeStreaming(executionId, result);

      return result;
    } catch (error) {
      await this.handleStreamingError(executionId, error);
      throw error;
    } finally {
      // Cleanup streaming context
      this.cleanupStreamingContext(executionId);
    }
  }

  /**
   * Execute workflow with enhanced streaming options
   */
  async executeWithStreamingOptions(
    input: TState,
    options: {
      executionId?: string;
      clientId?: string;
      streamingOptions?: {
        enableTokenStreaming?: boolean;
        enableEventStreaming?: boolean;
        enableProgressStreaming?: boolean;
        rooms?: string[];
        webSocketConfig?: Record<string, unknown>;
      };
    } = {}
  ): Promise<TState> {
    return this.execute(input, options);
  }

  /**
   * Execute workflow with streaming generator
   */
  async *executeWithStreaming(
    input: TState,
    options: {
      executionId?: string;
      clientId?: string;
      streamingOptions?: {
        enableTokenStreaming?: boolean;
        enableEventStreaming?: boolean;
        enableProgressStreaming?: boolean;
        rooms?: string[];
      };
    } = {}
  ): AsyncGenerator<StreamUpdate> {
    const executionId =
      options.executionId ||
      `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    if (!this.streamService) {
      throw new Error(
        'WorkflowStreamService not available for streaming execution'
      );
    }

    try {
      // Setup streaming context
      await this.setupStreamingContext(executionId, input, options);

      // Get workflow definition and create placeholder graph
      // TODO: Implement proper graph building from workflow definition
      const graph = {} as any; // Placeholder for now

      // Stream execution with enhanced workflow stream service
      yield* this.streamService.streamExecution(
        graph,
        input,
        this.getExecutionConfig(),
        executionId,
        this.constructor
      );
    } finally {
      // Cleanup streaming context
      this.cleanupStreamingContext(executionId);
    }
  }

  /**
   * Get streaming observable for an execution
   */
  getStreamingObservable(executionId: string): Observable<StreamUpdate> {
    if (!this.streamService) {
      throw new Error('WorkflowStreamService not available');
    }

    return this.streamService.createStream(executionId);
  }

  /**
   * Get token streaming observable for an execution
   */
  getTokenStreamingObservable(
    executionId: string,
    nodeId?: string
  ): Observable<StreamUpdate> {
    if (!this.tokenStreamingService) {
      throw new Error('TokenStreamingService not available');
    }

    return this.tokenStreamingService.getTokenStream(executionId, nodeId);
  }

  /**
   * Connect a WebSocket client to workflow streaming
   */
  connectWebSocketClient(
    clientId: string,
    options: {
      executionId?: string;
      rooms?: string[];
      eventTypes?: StreamEventType[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Observable<StreamUpdate> {
    if (!this.webSocketBridgeService) {
      throw new Error('WebSocketBridgeService not available');
    }

    // Register client
    const clientStream = this.webSocketBridgeService.registerClient(clientId, {
      executionId: options.executionId,
      rooms: options.rooms,
      metadata: options.metadata,
    });

    // Subscribe to specific event types if provided
    if (options.eventTypes && options.eventTypes.length > 0) {
      this.webSocketBridgeService.subscribeToEvents(
        clientId,
        options.eventTypes
      );
    }

    // Update execution context if executionId provided
    if (options.executionId) {
      const context = this.executionContexts.get(options.executionId);
      if (context) {
        context.clientConnections.push(clientId);
        if (options.rooms) {
          context.rooms.push(...options.rooms);
        }
      }
    }

    return clientStream.asObservable();
  }

  /**
   * Disconnect WebSocket client
   */
  disconnectWebSocketClient(clientId: string, executionId?: string): void {
    if (!this.webSocketBridgeService) {
      return;
    }

    // Remove from execution context
    if (executionId) {
      const context = this.executionContexts.get(executionId);
      if (context) {
        const index = context.clientConnections.indexOf(clientId);
        if (index > -1) {
          context.clientConnections.splice(index, 1);
        }
      }
    }

    // Unregister client
    this.webSocketBridgeService.unregisterClient(clientId);
  }

  /**
   * Get streaming statistics for the workflow
   */
  getStreamingStats(): {
    workflowStats: any;
    activeStreams?: number;
    activeTokenStreams?: any[];
    connectedClients?: number;
    activeRooms?: any[];
  } {
    const workflowStats = this.getWorkflowStats();
    const stats: any = { workflowStats };

    if (this.streamService) {
      stats.activeStreams = this.streamService.getActiveStreamCount();
    }

    if (this.tokenStreamingService) {
      stats.activeTokenStreams =
        this.tokenStreamingService.getActiveTokenStreams();
    }

    if (this.webSocketBridgeService) {
      stats.connectedClients = this.webSocketBridgeService.getClientCount();
      stats.activeRooms = this.webSocketBridgeService.getAllRoomsInfo();
    }

    return stats;
  }

  /**
   * Enable/disable streaming for specific features
   */
  configureStreaming(config: {
    tokenStreaming?: boolean;
    eventStreaming?: boolean;
    progressStreaming?: boolean;
    webSocketRooms?: boolean;
  }): void {
    if (!this.streamingConfiguration) {
      return;
    }

    if (config.tokenStreaming !== undefined) {
      this.streamingConfiguration.tokenStreaming.enabled =
        config.tokenStreaming;
    }

    if (config.eventStreaming !== undefined) {
      this.streamingConfiguration.eventStreaming.enabled =
        config.eventStreaming;
    }

    if (config.progressStreaming !== undefined) {
      this.streamingConfiguration.progressStreaming.enabled =
        config.progressStreaming;
    }

    if (config.webSocketRooms !== undefined) {
      this.streamingConfiguration.webSocketConfig.enableRooms =
        config.webSocketRooms;
    }

    this.logger.debug('Streaming configuration updated:', config);
  }

  // Private methods

  /**
   * Setup streaming configuration from decorators
   */
  private async setupStreamingConfiguration(): Promise<void> {
    const definition = this.getWorkflowDefinition();

    // Extract streaming metadata from workflow definition
    const streamingConfig: StreamingConfiguration = {
      enabled: this.workflowConfig.streaming || false,
      tokenStreaming: {
        enabled: false,
        nodes: new Map(),
      },
      eventStreaming: {
        enabled: false,
        nodes: new Map(),
      },
      progressStreaming: {
        enabled: false,
        nodes: new Map(),
      },
      webSocketConfig: {
        enableRooms: true,
        defaultRoom: `workflow_${this.workflowConfig.name}`,
      },
    };

    // Process each node for streaming metadata
    definition.nodes.forEach((node) => {
      const streamingMetadata = node.config?.metadata?.streaming;

      if (streamingMetadata?.token?.enabled) {
        streamingConfig.tokenStreaming.enabled = true;
        streamingConfig.tokenStreaming.nodes.set(
          node.id,
          streamingMetadata.token
        );
      }

      if (streamingMetadata?.event?.enabled) {
        streamingConfig.eventStreaming.enabled = true;
        streamingConfig.eventStreaming.nodes.set(
          node.id,
          streamingMetadata.event
        );
      }

      if (streamingMetadata?.progress?.enabled) {
        streamingConfig.progressStreaming.enabled = true;
        streamingConfig.progressStreaming.nodes.set(
          node.id,
          streamingMetadata.progress
        );
      }
    });

    this.streamingConfiguration = streamingConfig;

    this.logger.debug(
      `Streaming configuration: Token=${streamingConfig.tokenStreaming.enabled}, ` +
        `Event=${streamingConfig.eventStreaming.enabled}, ` +
        `Progress=${streamingConfig.progressStreaming.enabled}`
    );
  }

  /**
   * Setup streaming context for an execution
   */
  private async setupStreamingContext(
    executionId: string,
    input: Partial<TState>,
    options: any
  ): Promise<void> {
    const context: StreamingExecutionContext = {
      executionId,
      streamingEnabled: this.streamingConfiguration?.enabled || false,
      tokenStreaming:
        this.streamingConfiguration?.tokenStreaming.enabled || false,
      eventStreaming:
        this.streamingConfiguration?.eventStreaming.enabled || false,
      progressStreaming:
        this.streamingConfiguration?.progressStreaming.enabled || false,
      clientConnections: [],
      rooms: [
        this.streamingConfiguration?.webSocketConfig.defaultRoom ||
          `exec_${executionId}`,
      ],
    };

    // Apply streaming options
    if (options.streamingOptions) {
      if (options.streamingOptions.enableTokenStreaming !== undefined) {
        context.tokenStreaming = options.streamingOptions.enableTokenStreaming;
      }
      if (options.streamingOptions.enableEventStreaming !== undefined) {
        context.eventStreaming = options.streamingOptions.enableEventStreaming;
      }
      if (options.streamingOptions.enableProgressStreaming !== undefined) {
        context.progressStreaming =
          options.streamingOptions.enableProgressStreaming;
      }
      if (options.streamingOptions.rooms) {
        context.rooms.push(...options.streamingOptions.rooms);
      }
    }

    this.executionContexts.set(executionId, context);

    // Initialize streaming services
    if (context.streamingEnabled) {
      // Setup workflow streaming
      if (this.streamService) {
        this.streamService.createStream(executionId);
      }

      // Setup token streaming for each enabled node
      if (context.tokenStreaming && this.tokenStreamingService) {
        for (const [nodeId, config] of this.streamingConfiguration!
          .tokenStreaming.nodes) {
          await this.tokenStreamingService.initializeTokenStream({
            executionId,
            nodeId,
            config,
          });
        }
      }
    }

    // Emit streaming context setup event
    this.eventEmitter.emit('streaming.context.setup', {
      executionId,
      context,
      workflowName: this.workflowConfig.name,
    });

    this.logger.debug(`Streaming context setup for execution ${executionId}`);
  }

  /**
   * Complete streaming for an execution
   */
  private async completeStreaming(
    executionId: string,
    result: TState
  ): Promise<void> {
    const context = this.executionContexts.get(executionId);
    if (!context?.streamingEnabled) {
      return;
    }

    // Emit completion events
    this.eventEmitter.emit('workflow.execution.complete', {
      executionId,
      result,
      workflowName: this.workflowConfig.name,
    });

    // Complete token streams
    if (context.tokenStreaming && this.tokenStreamingService) {
      this.tokenStreamingService.closeExecutionTokenStreams(executionId);
    }

    this.logger.debug(`Streaming completed for execution ${executionId}`);
  }

  /**
   * Handle streaming errors
   */
  private async handleStreamingError(
    executionId: string,
    error: unknown
  ): Promise<void> {
    const context = this.executionContexts.get(executionId);
    if (!context) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Emit error event
    this.eventEmitter.emit('workflow.execution.error', {
      executionId,
      error: errorMessage,
      workflowName: this.workflowConfig.name,
    });

    // Notify connected clients
    if (this.webSocketBridgeService && context.clientConnections.length > 0) {
      const errorUpdate: StreamUpdate = {
        type: StreamEventType.ERROR,
        data: { error: errorMessage },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: 0,
          executionId,
        },
      };

      context.clientConnections.forEach((clientId) => {
        this.webSocketBridgeService!.sendToClient(clientId, errorUpdate);
      });
    }

    this.logger.error(`Streaming error for execution ${executionId}:`, error);
  }

  /**
   * Cleanup streaming context
   */
  private cleanupStreamingContext(executionId: string): void {
    const context = this.executionContexts.get(executionId);
    if (!context) {
      return;
    }

    // Disconnect clients
    context.clientConnections.forEach((clientId) => {
      this.disconnectWebSocketClient(clientId, executionId);
    });

    // Remove context
    this.executionContexts.delete(executionId);

    // Emit cleanup event
    this.eventEmitter.emit('streaming.context.cleanup', {
      executionId,
      workflowName: this.workflowConfig.name,
    });

    this.logger.debug(`Streaming context cleanup for execution ${executionId}`);
  }

  /**
   * Get execution configuration for LangGraph
   */
  private getExecutionConfig(): any {
    return {
      // Add any workflow-specific execution configuration
      streamingEnabled: this.streamingConfiguration?.enabled || false,
      ...this.workflowConfig,
    };
  }
}
