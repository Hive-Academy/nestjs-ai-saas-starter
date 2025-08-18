import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseMessage } from '@langchain/core/messages';
import { StateGraph } from '@langchain/langgraph';
import { Observable, Subject, filter, map, Subscription } from 'rxjs';
import {
  StreamUpdate,
  StreamEventType,
  StreamMetadata,
  StreamContext,
  TokenData,
} from '@langgraph-modules/streaming';
import { WorkflowStateAnnotation } from '../core/workflow-state-annotation';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import {
  StreamTokenMetadata,
  StreamEventMetadata,
  StreamProgressMetadata,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
} from '@langgraph-modules/streaming';

/**
 * Service for managing multi-level streaming of workflow execution
 * Handles streaming of values, updates, messages, events, debug info, and tokens
 * Enhanced with decorator metadata integration and token-level streaming
 */
@Injectable()
export class WorkflowStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowStreamService.name);
  private readonly streams = new Map<string, Subject<StreamUpdate>>();
  private readonly sequenceCounters = new Map<string, number>();
  private readonly tokenStreamConfigs = new Map<string, StreamTokenMetadata>();
  private readonly eventStreamConfigs = new Map<string, StreamEventMetadata>();
  private readonly progressStreamConfigs = new Map<string, StreamProgressMetadata>();
  private readonly activeSubscriptions = new Set<Subscription>();
  private readonly streamingEnabled = new Map<string, boolean>();

  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    private readonly metadataProcessor: MetadataProcessorService,
  ) {}

  /**
   * Initialize module - setup event listeners
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing WorkflowStreamService');
    this.setupEventListeners();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying WorkflowStreamService');
    this.cleanup();
  }

  /**
   * Create a new stream for a workflow execution
   */
  createStream(executionId: string): Observable<StreamUpdate> {
    if (this.streams.has(executionId)) {
      this.logger.warn(`Stream already exists for execution ${executionId}`);
      return this.streams.get(executionId)!.asObservable();
    }

    const stream = new Subject<StreamUpdate>();
    this.streams.set(executionId, stream);
    this.sequenceCounters.set(executionId, 0);

    this.logger.log(`Created stream for execution ${executionId}`);
    return stream.asObservable();
  }

  /**
   * Configure streaming for a specific workflow node from decorator metadata
   */
  configureNodeStreaming(
    executionId: string,
    nodeId: string,
    workflowClass: any,
    methodName: string,
  ): void {
    const tokenMetadata = getStreamTokenMetadata(workflowClass.prototype, methodName);
    if (tokenMetadata?.enabled) {
      this.tokenStreamConfigs.set(`${executionId}:${nodeId}`, tokenMetadata);
      this.logger.debug(`Configured token streaming for ${nodeId}: ${JSON.stringify(tokenMetadata)}`);
    }

    const eventMetadata = getStreamEventMetadata(workflowClass.prototype, methodName);
    if (eventMetadata?.enabled) {
      this.eventStreamConfigs.set(`${executionId}:${nodeId}`, eventMetadata);
      this.logger.debug(`Configured event streaming for ${nodeId}: ${JSON.stringify(eventMetadata)}`);
    }

    const progressMetadata = getStreamProgressMetadata(workflowClass.prototype, methodName);
    if (progressMetadata?.enabled) {
      this.progressStreamConfigs.set(`${executionId}:${nodeId}`, progressMetadata);
      this.logger.debug(`Configured progress streaming for ${nodeId}: ${JSON.stringify(progressMetadata)}`);
    }
  }

  /**
   * Initialize streaming configuration from workflow definition
   */
  initializeStreamingFromDefinition(
    executionId: string,
    workflowClass: any,
  ): void {
    try {
      const definition = this.metadataProcessor.extractWorkflowDefinition(workflowClass);

      // Configure streaming for each node that has streaming metadata
      definition.nodes.forEach(node => {
        const streamingMetadata = node.config?.metadata?.streaming;
        if (streamingMetadata) {
          const nodeKey = `${executionId}:${node.id}`;

          if (streamingMetadata.token?.enabled) {
            this.tokenStreamConfigs.set(nodeKey, streamingMetadata.token);
          }
          if (streamingMetadata.event?.enabled) {
            this.eventStreamConfigs.set(nodeKey, streamingMetadata.event);
          }
          if (streamingMetadata.progress?.enabled) {
            this.progressStreamConfigs.set(nodeKey, streamingMetadata.progress);
          }
        }
      });

      this.streamingEnabled.set(executionId, definition.config?.streaming || false);
      this.logger.log(`Initialized streaming configuration for execution ${executionId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize streaming configuration for ${executionId}:`, error);
    }
  }

  /**
   * Stream workflow execution with multi-level streaming and decorator integration
   */
  async *streamExecution(
    graph: StateGraph<typeof WorkflowStateAnnotation.State>,
    input: any,
    config: any,
    executionId: string,
    workflowClass?: any,
  ): AsyncGenerator<StreamUpdate> {
    const stream = this.streams.get(executionId);
    if (!stream) {
      throw new Error(`Stream not found for execution ${executionId}`);
    }

    const context: StreamContext = {
      executionId,
      streamId: `stream_${Date.now()}`,
      startTime: new Date(),
    };

    try {
      // Initialize streaming configuration if workflow class provided
      if (workflowClass) {
        this.initializeStreamingFromDefinition(executionId, workflowClass);
      }

      // Stream initial state
      yield this.createUpdate(
        StreamEventType.NODE_START,
        { message: 'Workflow execution started' },
        executionId,
      );

      // Get the compiled graph
      const compiledGraph = graph.compile(config);

      // Determine stream modes based on configuration
      const streamModes = this.getStreamModes(executionId);

      const streamResult = await compiledGraph.stream(input, {
        ...config,
        streamMode: streamModes,
      });

      for await (const chunk of streamResult) {
        // Handle different types of stream chunks
        if ('values' in chunk) {
          yield this.createUpdate(
            StreamEventType.VALUES,
            chunk.values,
            executionId,
          );
        }

        if ('updates' in chunk) {
          yield this.createUpdate(
            StreamEventType.UPDATES,
            chunk.updates,
            executionId,
          );
        }

        if ('messages' in chunk && Array.isArray(chunk.messages)) {
          for (const message of chunk.messages) {
            // Check if token-level streaming is configured for current node
            const nodeId = (chunk as any).nodeId || 'unknown';
            const tokenConfig = this.getTokenStreamConfig(executionId, nodeId);

            if (tokenConfig?.enabled && message.content) {
              // Stream tokens if enabled
              yield* this.streamMessageTokens(executionId, nodeId, message, tokenConfig);
            } else {
              // Stream regular message
              yield this.createUpdate(
                StreamEventType.MESSAGES,
                message,
                executionId,
                { nodeId },
              );
            }
          }
        }

        if ('events' in chunk) {
          // Apply event streaming configuration if available
          const nodeId = (chunk as any).nodeId || 'unknown';
          const eventConfig = this.getEventStreamConfig(executionId, nodeId);

          if (eventConfig?.enabled) {
            const filteredEvents = this.filterEvents(chunk.events as any[], eventConfig);
            const transformedEvents = this.transformEvents(filteredEvents, eventConfig);

            yield this.createUpdate(
              StreamEventType.EVENTS,
              transformedEvents,
              executionId,
              { nodeId, eventConfig: eventConfig },
            );
          } else {
            yield this.createUpdate(
              StreamEventType.EVENTS,
              chunk.events,
              executionId,
              { nodeId },
            );
          }
        }

        if ('debug' in chunk) {
          yield this.createUpdate(
            StreamEventType.DEBUG,
            chunk.debug,
            executionId,
          );
        }

        // Emit to EventEmitter for WebSocket bridge
        this.eventEmitter.emit(`workflow.stream.${executionId}`, chunk);
      }

      // Get final state
      const finalState = await compiledGraph.invoke(input, config);
      yield this.createUpdate(
        StreamEventType.FINAL,
        finalState,
        executionId,
      );

      yield this.createUpdate(
        StreamEventType.NODE_COMPLETE,
        { message: 'Workflow execution completed' },
        executionId,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Stream error for ${executionId}:`, error);
      yield this.createUpdate(
        StreamEventType.ERROR,
        { error: errorMessage, stack: errorStack },
        executionId,
      );
      throw error;
    } finally {
      this.closeStream(executionId);
    }
  }

  /**
   * Stream tokens from message content using decorator configuration
   */
  async *streamMessageTokens(
    executionId: string,
    nodeId: string,
    message: any,
    config: StreamTokenMetadata,
  ): AsyncGenerator<StreamUpdate> {
    if (!message.content || typeof message.content !== 'string') {
      return;
    }

    const {content} = message;
    const tokens = this.tokenizeContent(content, config);
    let accumulatedContent = '';

    try {
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Apply token filtering
        if (!this.shouldIncludeToken(token, config)) {
          continue;
        }

        // Process token if processor is configured
        const processedToken = config.processor
          ? config.processor(token, { index: i, nodeId, executionId })
          : token;

        accumulatedContent += processedToken;

        const tokenData: TokenData = {
          content: processedToken,
          index: i,
          role: message.role,
          totalTokens: tokens.length,
        };

        // Create token update with metadata
        const update = this.createUpdate(
          StreamEventType.TOKEN,
          tokenData,
          executionId,
          {
            nodeId,
            tokenConfig: config,
            accumulated: accumulatedContent,
            progress: ((i + 1) / tokens.length) * 100,
          },
        );

        yield update;

        // Emit token event for WebSocket bridge
        this.eventEmitter.emit(`workflow.token.${executionId}`, {
          ...tokenData,
          nodeId,
          executionId,
        });

        // Apply flush interval throttling
        if (config.flushInterval && config.flushInterval > 0) {
          await new Promise(resolve => setTimeout(resolve, config.flushInterval));
        }
      }

      // Emit completion event
      this.eventEmitter.emit(`workflow.token.complete.${executionId}`, {
        nodeId,
        content: accumulatedContent,
        tokenCount: tokens.length,
      });
    } catch (error) {
      this.logger.error(`Token streaming error for ${executionId}:${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Stream tokens from LLM responses with enhanced configuration
   */
  async *streamTokens(
    executionId: string,
    nodeId: string,
    llmStream: AsyncGenerator<any>,
    config?: StreamTokenMetadata,
  ): AsyncGenerator<StreamUpdate> {
    const tokenConfig = config || this.getTokenStreamConfig(executionId, nodeId);
    if (!tokenConfig?.enabled) {
      // Fallback to simple token streaming if no config
      yield* this.streamSimpleTokens(executionId, nodeId, llmStream);
      return;
    }

    let tokenIndex = 0;
    let totalContent = '';
    const tokenBuffer: string[] = [];

    try {
      for await (const chunk of llmStream) {
        const content = chunk.content || '';
        if (!content) {continue;}

        // Add to buffer
        tokenBuffer.push(content);
        totalContent += content;

        // Apply token filtering
        if (!this.shouldIncludeToken(content, tokenConfig)) {
          continue;
        }

        // Process token if processor is configured
        const processedContent = tokenConfig.processor
          ? tokenConfig.processor(content, { index: tokenIndex, nodeId, executionId })
          : content;

        const tokenData: TokenData = {
          content: processedContent,
          index: tokenIndex++,
          role: chunk.role,
          totalTokens: undefined, // Unknown for streaming
        };

        const update = this.createUpdate(
          StreamEventType.TOKEN,
          tokenData,
          executionId,
          {
            nodeId,
            tokenConfig,
            bufferSize: tokenBuffer.length,
          },
        );

        yield update;

        // Emit token event
        this.eventEmitter.emit(`workflow.token.${executionId}`, {
          ...tokenData,
          nodeId,
          executionId,
        });

        // Flush buffer if needed
        if (tokenBuffer.length >= (tokenConfig.bufferSize || 50)) {
          await this.flushTokenBuffer(executionId, nodeId, tokenBuffer, tokenConfig);
          tokenBuffer.length = 0;
        }

        // Apply throttling
        if (tokenConfig.flushInterval && tokenConfig.flushInterval > 0) {
          await new Promise(resolve => setTimeout(resolve, tokenConfig.flushInterval));
        }
      }

      // Flush remaining buffer
      if (tokenBuffer.length > 0) {
        await this.flushTokenBuffer(executionId, nodeId, tokenBuffer, tokenConfig);
      }

      // Emit complete message
      this.eventEmitter.emit(`workflow.message.${executionId}`, {
        nodeId,
        content: totalContent,
        tokenCount: tokenIndex,
      });
    } catch (error) {
      this.logger.error(`Enhanced token stream error for ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Simple token streaming without configuration
   */
  private async *streamSimpleTokens(
    executionId: string,
    nodeId: string,
    llmStream: AsyncGenerator<any>,
  ): AsyncGenerator<StreamUpdate> {
    let tokenIndex = 0;
    let totalContent = '';

    try {
      for await (const chunk of llmStream) {
        const tokenData: TokenData = {
          content: chunk.content || '',
          index: tokenIndex++,
          role: chunk.role,
        };

        totalContent += tokenData.content;

        const update = this.createUpdate(
          StreamEventType.TOKEN,
          tokenData,
          executionId,
          { nodeId },
        );

        yield update;

        // Emit token event
        this.eventEmitter.emit(`workflow.token.${executionId}`, tokenData);
      }

      // Emit complete message
      this.eventEmitter.emit(`workflow.message.${executionId}`, {
        content: totalContent,
        tokenCount: tokenIndex,
      });
    } catch (error) {
      this.logger.error(`Token stream error for ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Emit progress update
   */
  emitProgress(
    executionId: string,
    progress: number,
    message?: string,
    metadata?: any,
  ): void {
    const update = this.createUpdate(
      StreamEventType.PROGRESS,
      { progress, message, ...metadata },
      executionId,
    );

    const stream = this.streams.get(executionId);
    if (stream) {
      stream.next(update);
    }

    this.eventEmitter.emit(`workflow.progress.${executionId}`, update);
  }

  /**
   * Emit milestone
   */
  emitMilestone(
    executionId: string,
    milestone: string,
    metadata?: any,
  ): void {
    const update = this.createUpdate(
      StreamEventType.MILESTONE,
      { milestone, ...metadata },
      executionId,
    );

    const stream = this.streams.get(executionId);
    if (stream) {
      stream.next(update);
    }

    this.eventEmitter.emit(`workflow.milestone.${executionId}`, update);
  }

  /**
   * Get filtered stream by event types
   */
  getFilteredStream(
    executionId: string,
    eventTypes: StreamEventType[],
  ): Observable<StreamUpdate> {
    const stream = this.createStream(executionId);
    return stream.pipe(
      filter((update) => eventTypes.includes(update.type)),
    );
  }

  /**
   * Get messages-only stream
   */
  getMessagesStream(executionId: string): Observable<BaseMessage> {
    return this.getFilteredStream(executionId, [StreamEventType.MESSAGES]).pipe(
      map((update) => update.data as BaseMessage),
    );
  }

  /**
   * Get tokens-only stream
   */
  getTokensStream(executionId: string): Observable<TokenData> {
    return this.getFilteredStream(executionId, [StreamEventType.TOKEN]).pipe(
      map((update) => update.data as TokenData),
    );
  }

  /**
   * Create a stream update with metadata
   */
  private createUpdate(
    type: StreamEventType,
    data: any,
    executionId: string,
    additionalMetadata?: Partial<StreamMetadata>,
  ): StreamUpdate {
    const sequenceNumber = this.getNextSequence(executionId);

    const metadata: StreamMetadata = {
      timestamp: new Date(),
      sequenceNumber,
      executionId,
      ...additionalMetadata,
    };

    return {
      type,
      data,
      metadata,
    };
  }

  /**
   * Get next sequence number for stream
   */
  private getNextSequence(executionId: string): number {
    const current = this.sequenceCounters.get(executionId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(executionId, next);
    return next;
  }

  /**
   * Close and cleanup stream with enhanced cleanup
   */
  private closeStream(executionId: string): void {
    const stream = this.streams.get(executionId);
    if (stream) {
      stream.complete();
      this.streams.delete(executionId);
      this.sequenceCounters.delete(executionId);

      // Cleanup streaming configurations
      this.cleanupStreamingConfigs(executionId);
      this.streamingEnabled.delete(executionId);

      this.logger.log(`Closed stream for execution ${executionId}`);
    }
  }

  /**
   * Cleanup streaming configurations for an execution
   */
  private cleanupStreamingConfigs(executionId: string): void {
    // Remove all configs for this execution
    const keysToRemove: string[] = [];

    this.tokenStreamConfigs.forEach((_, key) => {
      if (key.startsWith(`${executionId}:`)) {
        keysToRemove.push(key);
      }
    });

    this.eventStreamConfigs.forEach((_, key) => {
      if (key.startsWith(`${executionId}:`)) {
        keysToRemove.push(key);
      }
    });

    this.progressStreamConfigs.forEach((_, key) => {
      if (key.startsWith(`${executionId}:`)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      this.tokenStreamConfigs.delete(key);
      this.eventStreamConfigs.delete(key);
      this.progressStreamConfigs.delete(key);
    });
  }

  /**
   * Setup event listeners for streaming coordination
   */
  private setupEventListeners(): void {
    // Listen for streaming configuration updates
    // Setup event listeners using EventEmitter2
    this.eventEmitter.on('streaming.config.update', (data) => {
      this.handleStreamingConfigUpdate(data);
    });

    // Note: EventEmitter listeners don't return subscriptions like RxJS
  }

  /**
   * Handle streaming configuration updates
   */
  private handleStreamingConfigUpdate(data: any): void {
    const { executionId, nodeId, config } = data;
    const key = `${executionId}:${nodeId}`;

    if (config.token) {
      this.tokenStreamConfigs.set(key, config.token);
    }
    if (config.event) {
      this.eventStreamConfigs.set(key, config.event);
    }
    if (config.progress) {
      this.progressStreamConfigs.set(key, config.progress);
    }
  }

  /**
   * Complete cleanup on service destruction
   */
  private cleanup(): void {
    // Close all active streams
    this.streams.forEach((stream, executionId) => {
      this.closeStream(executionId);
    });

    // Unsubscribe from all subscriptions
    this.activeSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.activeSubscriptions.clear();

    // Clear all maps
    this.tokenStreamConfigs.clear();
    this.eventStreamConfigs.clear();
    this.progressStreamConfigs.clear();
    this.streamingEnabled.clear();
  }

  // Helper methods for streaming configuration

  /**
   * Get token stream configuration for a node
   */
  private getTokenStreamConfig(executionId: string, nodeId: string): StreamTokenMetadata | undefined {
    return this.tokenStreamConfigs.get(`${executionId}:${nodeId}`);
  }

  /**
   * Get event stream configuration for a node
   */
  private getEventStreamConfig(executionId: string, nodeId: string): StreamEventMetadata | undefined {
    return this.eventStreamConfigs.get(`${executionId}:${nodeId}`);
  }

  /**
   * Get progress stream configuration for a node
   */
  private getProgressStreamConfig(executionId: string, nodeId: string): StreamProgressMetadata | undefined {
    return this.progressStreamConfigs.get(`${executionId}:${nodeId}`);
  }

  /**
   * Determine appropriate stream modes based on configuration
   */
  private getStreamModes(executionId: string): string[] {
    const defaultModes = ['values', 'updates', 'messages', 'events', 'debug'];

    if (!this.streamingEnabled.get(executionId)) {
      return ['values', 'updates']; // Minimal streaming
    }

    return defaultModes;
  }

  /**
   * Tokenize content based on configuration
   */
  private tokenizeContent(content: string, config: StreamTokenMetadata): string[] {
    // Simple word-based tokenization - can be enhanced with proper tokenizers
    const tokens = content.split(/\s+/).filter(token => token.length > 0);

    // Apply batch size if configured
    if (config.batchSize && config.batchSize > 1) {
      const batches: string[] = [];
      for (let i = 0; i < tokens.length; i += config.batchSize) {
        batches.push(tokens.slice(i, i + config.batchSize).join(' '));
      }
      return batches;
    }

    return tokens;
  }

  /**
   * Check if token should be included based on filter configuration
   */
  private shouldIncludeToken(token: string, config: StreamTokenMetadata): boolean {
    if (!config.filter) {
      return true;
    }

    const { minLength, maxLength, excludeWhitespace, pattern } = config.filter;

    if (minLength && token.length < minLength) {
      return false;
    }

    if (maxLength && token.length > maxLength) {
      return false;
    }

    if (excludeWhitespace && /^\s*$/.test(token)) {
      return false;
    }

    if (pattern && !pattern.test(token)) {
      return false;
    }

    return true;
  }

  /**
   * Filter events based on configuration
   */
  private filterEvents(events: any[], config: StreamEventMetadata): any[] {
    if (!config.filter) {
      return events;
    }

    return events.filter(event => {
      if (config.filter!.eventTypes && !config.filter!.eventTypes.includes(event.type)) {
        return false;
      }

      if (config.filter!.excludeTypes?.includes(event.type)) {
        return false;
      }

      if (!config.filter!.includeDebug && event.type === StreamEventType.DEBUG) {
        return false;
      }

      return true;
    });
  }

  /**
   * Transform events using configuration
   */
  private transformEvents(events: any[], config: StreamEventMetadata): any[] {
    if (!config.transformer) {
      return events;
    }

    return events.map(event => config.transformer!(event));
  }

  /**
   * Flush token buffer
   */
  private async flushTokenBuffer(
    executionId: string,
    nodeId: string,
    buffer: string[],
    config: StreamTokenMetadata,
  ): Promise<void> {
    if (buffer.length === 0) {
      return;
    }

    const bufferedContent = buffer.join('');

    // Emit buffer flush event
    this.eventEmitter.emit(`workflow.token.buffer.flush.${executionId}`, {
      nodeId,
      content: bufferedContent,
      bufferSize: buffer.length,
      config,
    });

    this.logger.debug(`Flushed token buffer for ${executionId}:${nodeId} - ${buffer.length} tokens`);
  }

  /**
   * Check if stream exists
   */
  hasStream(executionId: string): boolean {
    return this.streams.has(executionId);
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount(): number {
    return this.streams.size;
  }
}
