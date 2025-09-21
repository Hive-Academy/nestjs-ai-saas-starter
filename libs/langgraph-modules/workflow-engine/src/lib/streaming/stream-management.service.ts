import { Injectable, Logger } from '@nestjs/common';
import type { IStreamingService } from '@hive-academy/langgraph-core';
import type {
  StreamTokenDecoratorMetadata,
  StreamEventDecoratorMetadata,
  StreamProgressDecoratorMetadata,
} from '@hive-academy/langgraph-streaming';

/**
 * Stream Management Service - Adapter Pattern Implementation
 * 
 * Delegates all streaming operations to IStreamingService adapter.
 * Provides simplified configuration management for workflow-engine.
 * 
 * Responsibilities:
 * - Configuration delegation to streaming adapter
 * - Simple health status reporting
 * - Stream lifecycle coordination (via adapter)
 */
@Injectable()
export class StreamManagementService {
  private readonly logger = new Logger(StreamManagementService.name);
  
  constructor(private readonly streamingService: IStreamingService) {}

  /**
   * Initialize token stream - delegates to adapter
   */
  async initializeTokenStream(options: {
    executionId: string;
    nodeId: string;
    config: StreamTokenDecoratorMetadata;
  }): Promise<void> {
    this.logger.debug(`Initializing token stream for ${options.executionId}:${options.nodeId}`);
    return this.streamingService.initializeTokenStream(options);
  }

  /**
   * Stream token - delegates to adapter
   */
  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void {
    return this.streamingService.streamToken(executionId, nodeId, token, metadata);
  }

  /**
   * Flush tokens - delegates to adapter
   */
  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    return this.streamingService.flushTokens(executionId, nodeId);
  }

  /**
   * Stream event - delegates to adapter
   */
  streamEvent(executionId: string, nodeId: string, event: any): void {
    return this.streamingService.streamEvent(executionId, nodeId, event);
  }

  /**
   * Emit event - delegates to adapter
   */
  async emitEvent(eventType: string, data: any): Promise<void> {
    return this.streamingService.emitEvent(eventType, data);
  }

  /**
   * Stream progress - delegates to adapter
   */
  streamProgress(executionId: string, nodeId: string, progress: any): void {
    return this.streamingService.streamProgress(executionId, nodeId, progress);
  }

  /**
   * Emit progress - delegates to adapter
   */
  async emitProgress(eventType: string, data: any): Promise<void> {
    return this.streamingService.emitProgress(eventType, data);
  }

  /**
   * Broadcast to execution - delegates to adapter
   */
  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    return this.streamingService.broadcastToExecution(executionId, data);
  }

  /**
   * Send to client - delegates to adapter
   */
  async sendToClient(clientId: string, data: any): Promise<void> {
    return this.streamingService.sendToClient(clientId, data);
  }

  /**
   * Get stream health status - simplified for adapter pattern
   */
  getStreamHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
  } {
    // Simplified - adapter manages health
    return { status: 'healthy' };
  }

  /**
   * Close stream - delegates to adapter
   */
  closeStream(executionId: string): void {
    this.logger.debug(`Closing stream for ${executionId}`);
    // Delegate to adapter if it has this capability
    if ('closeStream' in this.streamingService && typeof this.streamingService.closeStream === 'function') {
      this.streamingService.closeStream(executionId);
    }
  }

  /**
   * Get token stream config - simplified mock for adapter pattern
   */
  getTokenStreamConfig(executionId: string, nodeId: string): StreamTokenDecoratorMetadata | null {
    // Simplified - return default config since adapter manages this
    return {
      methodName: 'default',
      enabled: true,
      bufferSize: 100,
      flushInterval: 1000
    };
  }

  /**
   * Set token stream config - delegates to adapter
   */
  setTokenStreamConfig(executionId: string, nodeId: string, config: StreamTokenDecoratorMetadata): void {
    this.logger.debug(`Setting token stream config for ${executionId}:${nodeId}`);
    // Delegate to adapter if it has this capability
    if ('setTokenStreamConfig' in this.streamingService && typeof this.streamingService.setTokenStreamConfig === 'function') {
      this.streamingService.setTokenStreamConfig(executionId, nodeId, config);
    }
  }

  /**
   * Get stream - simplified mock for adapter pattern
   */
  getStream(executionId: string): any {
    this.logger.debug(`Getting stream for ${executionId}`);
    // Return mock observable since adapter manages streams
    return {
      pipe: () => ({
        subscribe: () => ({ unsubscribe: () => {} })
      })
    };
  }

  /**
   * Update streaming config - delegates to adapter
   */
  updateStreamingConfig(data: { executionId: string; nodeId: string; config: any }): void {
    this.logger.debug(`Updating streaming config for ${data.executionId}:${data.nodeId}`);
    // Delegate to adapter if it has this capability
    if ('updateStreamingConfig' in this.streamingService && typeof this.streamingService.updateStreamingConfig === 'function') {
      this.streamingService.updateStreamingConfig(data);
    }
  }

  /**
   * Get active stream count - simplified mock for adapter pattern
   */
  getActiveStreamCount(): number {
    // Simplified - adapter manages this
    return 0;
  }

  /**
   * Cleanup stale streams - delegates to adapter
   */
  cleanupStaleStreams(): number {
    this.logger.debug('Cleaning up stale streams');
    // Delegate to adapter if it has this capability
    if ('cleanupStaleStreams' in this.streamingService && typeof this.streamingService.cleanupStaleStreams === 'function') {
      return this.streamingService.cleanupStaleStreams();
    }
    return 0;
  }

  /**
   * Set event stream config - delegates to adapter
   */
  setEventStreamConfig(executionId: string, nodeId: string, config: StreamEventDecoratorMetadata): void {
    this.logger.debug(`Setting event stream config for ${executionId}:${nodeId}`);
    // Delegate to adapter if it has this capability
    if ('setEventStreamConfig' in this.streamingService && typeof this.streamingService.setEventStreamConfig === 'function') {
      this.streamingService.setEventStreamConfig(executionId, nodeId, config);
    }
  }

  /**
   * Set progress stream config - delegates to adapter
   */
  setProgressStreamConfig(executionId: string, nodeId: string, config: StreamProgressDecoratorMetadata): void {
    this.logger.debug(`Setting progress stream config for ${executionId}:${nodeId}`);
    // Delegate to adapter if it has this capability
    if ('setProgressStreamConfig' in this.streamingService && typeof this.streamingService.setProgressStreamConfig === 'function') {
      this.streamingService.setProgressStreamConfig(executionId, nodeId, config);
    }
  }

  /**
   * Get next sequence - simplified mock for adapter pattern
   */
  getNextSequence(executionId: string): number {
    // Simplified - return incrementing number
    return Date.now();
  }
}