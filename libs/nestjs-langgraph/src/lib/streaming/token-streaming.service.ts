import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { Subject, Observable, BehaviorSubject, timer, Subscription } from 'rxjs';
import { buffer, debounceTime, filter, map, throttleTime } from 'rxjs/operators';
import {
  StreamUpdate,
  StreamEventType,
  StreamMetadata,
  TokenData,
} from '../interfaces/streaming.interface';
import {
  StreamTokenMetadata,
  StreamTokenOptions,
} from '../decorators/streaming.decorator';

/**
 * Token buffer entry for batching and processing
 */
interface TokenBufferEntry {
  executionId: string;
  nodeId: string;
  token: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  index: number;
}

/**
 * Token stream configuration per execution/node
 */
interface TokenStreamConfig extends StreamTokenMetadata {
  subject: Subject<TokenBufferEntry>;
  subscription?: Subscription;
  buffer: TokenBufferEntry[];
  lastFlush: Date;
  totalTokens: number;
}

/**
 * Service for token-level streaming implementation
 * Handles buffering, throttling, and advanced token processing
 */
@Injectable()
export class TokenStreamingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenStreamingService.name);
  
  // Token stream configurations per execution:node
  private tokenStreams = new Map<string, TokenStreamConfig>();
  
  // Global token subjects for broadcasting
  private globalTokenSubject = new Subject<StreamUpdate>();
  private tokenStatsSubject = new BehaviorSubject<{
    activeStreams: number;
    totalTokensProcessed: number;
    averageTokensPerSecond: number;
  }>({
    activeStreams: 0,
    totalTokensProcessed: 0,
    averageTokensPerSecond: 0,
  });
  
  // Performance tracking
  private totalTokensProcessed = 0;
  private streamStartTime = new Date();
  private activeSubscriptions = new Set<Subscription>();
  
  // Cleanup timer
  private cleanupTimer?: Subscription;

  constructor(@Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize service - setup cleanup timer
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing TokenStreamingService');
    this.setupCleanupTimer();
    this.setupPerformanceTracking();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying TokenStreamingService');
    this.cleanup();
  }

  /**
   * Initialize token streaming for a specific node
   */
  async initializeTokenStream(options: {
    executionId: string;
    nodeId: string;
    config: StreamTokenMetadata;
  }): Promise<void> {
    const { executionId, nodeId, config } = options;
    const streamKey = `${executionId}:${nodeId}`;

    if (this.tokenStreams.has(streamKey)) {
      this.logger.warn(`Token stream already exists for ${streamKey}`);
      return;
    }

    this.logger.debug(`Initializing token stream for ${streamKey} with config:`, config);

    // Create token subject for this stream
    const subject = new Subject<TokenBufferEntry>();
    
    // Create stream configuration
    const streamConfig: TokenStreamConfig = {
      ...config,
      subject,
      buffer: [],
      lastFlush: new Date(),
      totalTokens: 0,
    };

    // Setup buffering and processing pipeline
    this.setupTokenProcessingPipeline(streamKey, streamConfig);

    // Store configuration
    this.tokenStreams.set(streamKey, streamConfig);

    // Update stats
    this.updateTokenStats();

    this.logger.log(`Token stream initialized for ${streamKey}`);
  }

  /**
   * Process token result from decorated method
   */
  async processTokenResult(
    result: any,
    config: StreamTokenMetadata,
  ): Promise<void> {
    // This method would be called by the decorator wrapper
    // to process the result and extract tokens if applicable
    if (typeof result === 'string') {
      // Direct string result - tokenize and stream
      await this.processStringTokens(result, config);
    } else if (result && typeof result.content === 'string') {
      // Object with content property
      await this.processStringTokens(result.content, config);
    } else if (this.isAsyncIterable(result)) {
      // Async iterable - stream each token
      await this.processAsyncIterableTokens(result, config);
    }
  }

  /**
   * Stream a single token to the appropriate stream
   */
  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata: Record<string, unknown> = {},
  ): void {
    const streamKey = `${executionId}:${nodeId}`;
    const streamConfig = this.tokenStreams.get(streamKey);

    if (!streamConfig) {
      this.logger.warn(`No token stream found for ${streamKey}`);
      return;
    }

    const tokenEntry: TokenBufferEntry = {
      executionId,
      nodeId,
      token,
      metadata,
      timestamp: new Date(),
      index: streamConfig.totalTokens++,
    };

    // Send to processing pipeline
    streamConfig.subject.next(tokenEntry);
  }

  /**
   * Flush tokens for a specific stream
   */
  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    const streamKey = `${executionId}:${nodeId}`;
    const streamConfig = this.tokenStreams.get(streamKey);

    if (!streamConfig) {
      return;
    }

    await this.flushTokenBuffer(streamKey, streamConfig);
  }

  /**
   * Get token stream observable for a specific execution/node
   */
  getTokenStream(executionId: string, nodeId?: string): Observable<StreamUpdate> {
    if (nodeId) {
      const streamKey = `${executionId}:${nodeId}`;
      const streamConfig = this.tokenStreams.get(streamKey);
      
      if (!streamConfig) {
        return new Observable(subscriber => {
          subscriber.error(new Error(`No token stream found for ${streamKey}`));
        });
      }
      
      return streamConfig.subject.pipe(
        map(entry => this.createTokenStreamUpdate(entry)),
      );
    }

    // Return global stream filtered by execution ID
    return this.globalTokenSubject.pipe(
      filter(update => update.metadata?.executionId === executionId),
    );
  }

  /**
   * Get global token stream
   */
  getGlobalTokenStream(): Observable<StreamUpdate> {
    return this.globalTokenSubject.asObservable();
  }

  /**
   * Get token statistics observable
   */
  getTokenStats(): Observable<{
    activeStreams: number;
    totalTokensProcessed: number;
    averageTokensPerSecond: number;
  }> {
    return this.tokenStatsSubject.asObservable();
  }

  /**
   * Close token stream for a specific execution/node
   */
  closeTokenStream(executionId: string, nodeId: string): void {
    const streamKey = `${executionId}:${nodeId}`;
    const streamConfig = this.tokenStreams.get(streamKey);

    if (!streamConfig) {
      return;
    }

    // Flush remaining tokens
    this.flushTokenBuffer(streamKey, streamConfig);

    // Complete subject
    streamConfig.subject.complete();

    // Cleanup subscription
    if (streamConfig.subscription) {
      streamConfig.subscription.unsubscribe();
      this.activeSubscriptions.delete(streamConfig.subscription);
    }

    // Remove from map
    this.tokenStreams.delete(streamKey);

    // Update stats
    this.updateTokenStats();

    this.logger.log(`Token stream closed for ${streamKey}`);
  }

  /**
   * Close all token streams for an execution
   */
  closeExecutionTokenStreams(executionId: string): void {
    const streamsToClose: string[] = [];
    
    this.tokenStreams.forEach((_, streamKey) => {
      if (streamKey.startsWith(`${executionId}:`)) {
        streamsToClose.push(streamKey);
      }
    });

    streamsToClose.forEach(streamKey => {
      const [, nodeId] = streamKey.split(':');
      this.closeTokenStream(executionId, nodeId);
    });

    this.logger.log(`Closed ${streamsToClose.length} token streams for execution ${executionId}`);
  }

  /**
   * Get active token stream info
   */
  getActiveTokenStreams(): {
    streamKey: string;
    config: StreamTokenMetadata;
    bufferSize: number;
    totalTokens: number;
    lastFlush: Date;
  }[] {
    return Array.from(this.tokenStreams.entries()).map(([streamKey, config]) => ({
      streamKey,
      config: {
        enabled: config.enabled,
        bufferSize: config.bufferSize,
        batchSize: config.batchSize,
        flushInterval: config.flushInterval,
        format: config.format,
        methodName: config.methodName,
      },
      bufferSize: config.buffer.length,
      totalTokens: config.totalTokens,
      lastFlush: config.lastFlush,
    }));
  }

  // Private methods

  /**
   * Setup token processing pipeline for a stream
   */
  private setupTokenProcessingPipeline(
    streamKey: string,
    streamConfig: TokenStreamConfig,
  ): void {
    // Create buffering pipeline
    const bufferTrigger = timer(0, streamConfig.flushInterval || 100);
    
    const subscription = streamConfig.subject
      .pipe(
        // Buffer tokens based on size or time
        buffer(bufferTrigger),
        // Filter out empty buffers
        filter(tokens => tokens.length > 0),
        // Throttle if configured
        streamConfig.flushInterval ? throttleTime(streamConfig.flushInterval) : map(x => x),
      )
      .subscribe({
        next: (tokens) => this.processTokenBatch(streamKey, tokens, streamConfig),
        error: (error) => this.logger.error(`Token processing error for ${streamKey}:`, error),
        complete: () => this.logger.debug(`Token processing completed for ${streamKey}`),
      });

    streamConfig.subscription = subscription;
    this.activeSubscriptions.add(subscription);
  }

  /**
   * Process a batch of tokens
   */
  private async processTokenBatch(
    streamKey: string,
    tokens: TokenBufferEntry[],
    streamConfig: TokenStreamConfig,
  ): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    try {
      // Add tokens to buffer
      streamConfig.buffer.push(...tokens);

      // Check if buffer should be flushed
      const shouldFlush = this.shouldFlushBuffer(streamConfig);
      
      if (shouldFlush) {
        await this.flushTokenBuffer(streamKey, streamConfig);
      }

      // Update global stats
      this.totalTokensProcessed += tokens.length;
      this.updateTokenStats();

    } catch (error) {
      this.logger.error(`Error processing token batch for ${streamKey}:`, error);
    }
  }

  /**
   * Check if buffer should be flushed
   */
  private shouldFlushBuffer(streamConfig: TokenStreamConfig): boolean {
    const bufferSize = streamConfig.buffer.length;
    const maxBufferSize = streamConfig.bufferSize || 50;
    
    // Flush if buffer is full
    if (bufferSize >= maxBufferSize) {
      return true;
    }

    // Flush if enough time has passed
    const timeSinceLastFlush = Date.now() - streamConfig.lastFlush.getTime();
    const flushInterval = streamConfig.flushInterval || 1000;
    
    if (timeSinceLastFlush >= flushInterval && bufferSize > 0) {
      return true;
    }

    return false;
  }

  /**
   * Flush token buffer for a stream
   */
  private async flushTokenBuffer(
    streamKey: string,
    streamConfig: TokenStreamConfig,
  ): Promise<void> {
    if (streamConfig.buffer.length === 0) {
      return;
    }

    const tokensToFlush = [...streamConfig.buffer];
    streamConfig.buffer.length = 0;
    streamConfig.lastFlush = new Date();

    try {
      // Process tokens based on configuration
      const processedTokens = await this.processTokensWithConfig(tokensToFlush, streamConfig);

      // Create stream updates for each token
      processedTokens.forEach(tokenEntry => {
        const streamUpdate = this.createTokenStreamUpdate(tokenEntry);
        
        // Emit to global stream
        this.globalTokenSubject.next(streamUpdate);
        
        // Emit to EventEmitter for WebSocket bridge
        this.eventEmitter.emit(`workflow.token.${tokenEntry.executionId}`, {
          content: tokenEntry.token,
          index: tokenEntry.index,
          nodeId: tokenEntry.nodeId,
          executionId: tokenEntry.executionId,
          metadata: tokenEntry.metadata,
        });
      });

      // Emit batch completion event
      this.eventEmitter.emit('token.batch.processed', {
        streamKey,
        tokenCount: tokensToFlush.length,
        timestamp: new Date(),
      });

      this.logger.debug(`Flushed ${tokensToFlush.length} tokens for ${streamKey}`);

    } catch (error) {
      this.logger.error(`Error flushing token buffer for ${streamKey}:`, error);
      throw error;
    }
  }

  /**
   * Process tokens with configuration filters and transformers
   */
  private async processTokensWithConfig(
    tokens: TokenBufferEntry[],
    config: TokenStreamConfig,
  ): Promise<TokenBufferEntry[]> {
    let processedTokens = [...tokens];

    // Apply filtering
    if (config.filter) {
      processedTokens = processedTokens.filter(entry => 
        this.shouldIncludeToken(entry.token, config)
      );
    }

    // Apply processing
    if (config.processor) {
      processedTokens = processedTokens.map(entry => ({
        ...entry,
        token: config.processor!(entry.token, entry.metadata),
      }));
    }

    // Apply batching
    if (config.batchSize && config.batchSize > 1) {
      processedTokens = this.batchTokens(processedTokens, config.batchSize);
    }

    return processedTokens;
  }

  /**
   * Check if token should be included based on filter configuration
   */
  private shouldIncludeToken(token: string, config: TokenStreamConfig): boolean {
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
   * Batch tokens together
   */
  private batchTokens(tokens: TokenBufferEntry[], batchSize: number): TokenBufferEntry[] {
    const batched: TokenBufferEntry[] = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const batchedToken = batch[0]; // Use first token as base
      
      // Combine token content
      batchedToken.token = batch.map(t => t.token).join('');
      
      // Merge metadata
      batchedToken.metadata = {
        ...batchedToken.metadata,
        batchSize: batch.length,
        batchTokens: batch.map(t => t.token),
      };
      
      batched.push(batchedToken);
    }

    return batched;
  }

  /**
   * Create stream update from token entry
   */
  private createTokenStreamUpdate(tokenEntry: TokenBufferEntry): StreamUpdate {
    const tokenData: TokenData = {
      content: tokenEntry.token,
      index: tokenEntry.index,
      totalTokens: undefined, // Will be set when known
    };

    const metadata: StreamMetadata = {
      timestamp: tokenEntry.timestamp,
      sequenceNumber: tokenEntry.index,
      executionId: tokenEntry.executionId,
      nodeId: tokenEntry.nodeId,
      ...tokenEntry.metadata,
    };

    return {
      type: StreamEventType.TOKEN,
      data: tokenData,
      metadata,
    };
  }

  /**
   * Process string tokens
   */
  private async processStringTokens(
    content: string,
    config: StreamTokenMetadata,
  ): Promise<void> {
    // Simple tokenization - split by whitespace
    const tokens = content.split(/\s+/).filter(token => token.length > 0);
    
    // This would need execution context from the decorator
    // For now, log that tokens were processed
    this.logger.debug(`Processed ${tokens.length} tokens from string content`);
  }

  /**
   * Process async iterable tokens
   */
  private async processAsyncIterableTokens(
    iterable: AsyncIterable<any>,
    config: StreamTokenMetadata,
  ): Promise<void> {
    let tokenCount = 0;
    
    try {
      for await (const chunk of iterable) {
        tokenCount++;
        // Process each chunk as a token
        // This would need execution context from the decorator
      }
      
      this.logger.debug(`Processed ${tokenCount} tokens from async iterable`);
    } catch (error) {
      this.logger.error('Error processing async iterable tokens:', error);
      throw error;
    }
  }

  /**
   * Check if value is async iterable
   */
  private isAsyncIterable(value: any): value is AsyncIterable<any> {
    return value != null && typeof value[Symbol.asyncIterator] === 'function';
  }

  /**
   * Update token statistics
   */
  private updateTokenStats(): void {
    const activeStreams = this.tokenStreams.size;
    const totalTokensProcessed = this.totalTokensProcessed;
    
    // Calculate average tokens per second
    const elapsedSeconds = (Date.now() - this.streamStartTime.getTime()) / 1000;
    const averageTokensPerSecond = elapsedSeconds > 0 ? totalTokensProcessed / elapsedSeconds : 0;

    this.tokenStatsSubject.next({
      activeStreams,
      totalTokensProcessed,
      averageTokensPerSecond: Math.round(averageTokensPerSecond * 100) / 100,
    });
  }

  /**
   * Setup performance tracking
   */
  private setupPerformanceTracking(): void {
    // Update stats every 5 seconds
    const statsTimer = timer(0, 5000).subscribe(() => {
      this.updateTokenStats();
    });
    
    this.activeSubscriptions.add(statsTimer);
  }

  /**
   * Setup cleanup timer
   */
  private setupCleanupTimer(): void {
    // Cleanup stale streams every minute
    this.cleanupTimer = timer(60000, 60000).subscribe(() => {
      this.cleanupStaleStreams();
    });
  }

  /**
   * Cleanup stale streams
   */
  private cleanupStaleStreams(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const streamsToRemove: string[] = [];

    this.tokenStreams.forEach((config, streamKey) => {
      const lastActivity = Math.max(
        config.lastFlush.getTime(),
        ...(config.buffer.map(entry => entry.timestamp.getTime()))
      );

      if (now - lastActivity > staleThreshold) {
        streamsToRemove.push(streamKey);
      }
    });

    streamsToRemove.forEach(streamKey => {
      const [executionId, nodeId] = streamKey.split(':');
      this.closeTokenStream(executionId, nodeId);
      this.logger.debug(`Cleaned up stale token stream: ${streamKey}`);
    });

    if (streamsToRemove.length > 0) {
      this.logger.log(`Cleaned up ${streamsToRemove.length} stale token streams`);
    }
  }

  /**
   * Complete cleanup on service destruction
   */
  private cleanup(): void {
    // Close cleanup timer
    if (this.cleanupTimer) {
      this.cleanupTimer.unsubscribe();
    }

    // Close all token streams
    const streamKeys = Array.from(this.tokenStreams.keys());
    streamKeys.forEach(streamKey => {
      const [executionId, nodeId] = streamKey.split(':');
      this.closeTokenStream(executionId, nodeId);
    });

    // Unsubscribe from all subscriptions
    this.activeSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.activeSubscriptions.clear();

    // Complete subjects
    this.globalTokenSubject.complete();
    this.tokenStatsSubject.complete();

    this.logger.log('TokenStreamingService cleanup completed');
  }
}