// Streaming interfaces for DI adapter pattern
// Only contains abstract interfaces for dependency injection - no implementations or detailed types

/**
 * Core streaming service interface for dependency injection adapter pattern
 *
 * This interface enables consumer libraries (workflow-engine, multi-agent)
 * to depend on streaming functionality without tight coupling to implementation.
 */
export abstract class IStreamingService {
  // Token streaming
  abstract initializeTokenStream(options: any): Promise<void>;
  abstract streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void;

  abstract flushTokens(executionId: string, nodeId: string): Promise<void>;

  // Event streaming
  abstract streamEvent(executionId: string, nodeId: string, event: any): void;
  abstract emitEvent(eventType: string, data: any): Promise<void>;

  // Progress streaming
  abstract streamProgress(
    executionId: string,
    nodeId: string,
    progress: any
  ): void;
  abstract emitProgress(eventType: string, data: any): Promise<void>;

  // WebSocket integration
  abstract broadcastToExecution(executionId: string, data: any): Promise<void>;
  abstract sendToClient(clientId: string, data: any): Promise<void>;
}

/**
 * Granular token streaming interface for specialized token handling
 */
export interface ITokenStreamingService {
  initializeTokenStream(options: any): Promise<void>;
  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void;
  flushTokens(executionId: string, nodeId: string): Promise<void>;
  closeTokenStream(executionId: string, nodeId: string): void;
}

/**
 * Event stream processing interface for handling workflow events
 */
export interface IEventStreamProcessorService {
  streamEvent(executionId: string, nodeId: string, event: any): void;
  processBatch(events: any[]): void;
}

/**
 * WebSocket bridge interface for client communication
 */
export interface IWebSocketBridgeService {
  broadcastToExecution(executionId: string, data: any): Promise<void>;
  sendToClient(clientId: string, data: any): Promise<void>;
  registerClient(clientId: string, executionId: string): void;
  unregisterClient(clientId: string): void;
}

/**
 * No-op implementations for default behavior when streaming is disabled
 *
 * These provide zero-overhead fallbacks that consumer libraries can use
 * when streaming functionality is not available or disabled.
 */
export class NoOpStreamingService implements IStreamingService {
  async initializeTokenStream(): Promise<void> {
    // no-op
  }

  streamToken(): void {
    // no-op
  }

  async flushTokens(): Promise<void> {
    // no-op
  }

  streamEvent(): void {
    // no-op
  }

  async emitEvent(): Promise<void> {
    // no-op
  }

  streamProgress(): void {
    // no-op
  }

  async emitProgress(): Promise<void> {
    // no-op
  }

  async broadcastToExecution(): Promise<void> {
    // no-op
  }

  async sendToClient(): Promise<void> {
    // no-op
  }
}

export class NoOpTokenStreamingService implements ITokenStreamingService {
  async initializeTokenStream(): Promise<void> {
    // no-op
  }

  streamToken(): void {
    // no-op
  }

  async flushTokens(): Promise<void> {
    // no-op
  }

  closeTokenStream(): void {
    // no-op
  }
}

export class NoOpEventStreamProcessorService
  implements IEventStreamProcessorService
{
  streamEvent(): void {
    // no-op
  }

  processBatch(): void {
    // no-op
  }
}

export class NoOpWebSocketBridgeService implements IWebSocketBridgeService {
  async broadcastToExecution(): Promise<void> {
    // no-op
  }

  async sendToClient(): Promise<void> {
    // no-op
  }

  registerClient(): void {
    // no-op
  }

  unregisterClient(): void {
    // no-op
  }
}

/**
 * Basic streaming event types for core compatibility
 */
export enum StreamEventType {
  TOKEN = 'token',
  VALUES = 'values',
  UPDATES = 'updates',
  EVENTS = 'events',
  PROGRESS = 'progress',
  NODE_START = 'node_start',
  NODE_COMPLETE = 'node_complete',
  TOOL_START = 'tool_start',
  TOOL_COMPLETE = 'tool_complete',
  ERROR = 'error',
  DEBUG = 'debug',
}

/**
 * Basic token stream options interface for workflow-engine compatibility
 */
export interface TokenStreamOptions {
  enabled?: boolean;
  bufferSize?: number;
  flushInterval?: number;
  executionId?: string;
  nodeId?: string;
  config?: any;
}
