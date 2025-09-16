import { Injectable } from '@nestjs/common';
import { IStreamingService } from '@hive-academy/langgraph-core';
import { TokenStreamingService } from '@hive-academy/langgraph-streaming';

/**
 * Streaming Service Adapter
 * 
 * Bridges the streaming module implementation with core interface
 * for cross-package dependency injection without direct linking
 */
@Injectable()
export class StreamingServiceAdapter implements IStreamingService {
  constructor(private readonly streamingService: TokenStreamingService) {}

  // Delegate all IStreamingService methods to the real implementation
  async initializeTokenStream(options: { 
    executionId: string; 
    nodeId: string; 
    config: any;
  }): Promise<void> {
    return this.streamingService.initializeTokenStream(options);
  }

  streamToken(executionId: string, nodeId: string, token: string, metadata?: Record<string, unknown>): void {
    return this.streamingService.streamToken(executionId, nodeId, token, metadata);
  }

  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    return this.streamingService.flushTokens(executionId, nodeId);
  }

  closeTokenStream(executionId: string, nodeId: string): void {
    return this.streamingService.closeTokenStream(executionId, nodeId);
  }

  closeExecutionTokenStreams(executionId: string): void {
    return this.streamingService.closeExecutionTokenStreams(executionId);
  }

  // Add any other IStreamingService methods that need delegation
  getTokenStream(executionId: string, nodeId?: string): any {
    return this.streamingService.getTokenStream(executionId, nodeId);
  }

  getGlobalTokenStream(): any {
    return this.streamingService.getGlobalTokenStream();
  }
}