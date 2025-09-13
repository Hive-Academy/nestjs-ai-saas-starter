// Streaming interfaces for DI adapter pattern
// Based on blueprint: STREAMING_INTEGRATION_BLUEPRINT.md

// Decorator metadata types and options (moved from streaming library to fix circular dependency)

// Define StreamEventType locally to avoid circular dependency
// This is a subset of the full enum from streaming library - only what's needed for decorator metadata
export enum StreamEventType {
  // Workflow lifecycle events
  WORKFLOW_START = 'workflow:start',
  WORKFLOW_END = 'workflow:end',
  WORKFLOW_ERROR = 'workflow:error',

  // Node events
  NODE_START = 'node:start',
  NODE_END = 'node:end',
  NODE_ERROR = 'node:error',
  NODE_COMPLETE = 'node:complete',

  // Stream data types
  VALUES = 'values',
  UPDATES = 'updates',
  MESSAGES = 'messages',
  EVENTS = 'events',
  DEBUG = 'debug',
  FINAL = 'final',

  // Progress events
  PROGRESS = 'progress',
  MILESTONE = 'milestone',

  // Token events
  TOKEN = 'token',

  // Error events
  ERROR = 'error',

  // Custom events
  CUSTOM = 'custom',
}

/**
 * Configuration options for @StreamToken decorator
 */
export interface StreamTokenOptions {
  /** Enable token-level streaming for this method/node */
  enabled?: boolean;
  /** Buffer size for token streaming (default: 50) */
  bufferSize?: number;
  /** Batch size for token processing (default: 10) */
  batchSize?: number;
  /** Token flush interval in milliseconds (default: 100) */
  flushInterval?: number;
  /** Include metadata with each token */
  includeMetadata?: boolean;
  /** Custom token processor function */
  processor?: (token: string, metadata?: Record<string, unknown>) => string;
  /** Stream format (text, json, structured) */
  format?: 'text' | 'json' | 'structured';
  /** Filter tokens based on criteria */
  filter?: {
    minLength?: number;
    maxLength?: number;
    excludeWhitespace?: boolean;
    pattern?: RegExp;
  };
}

/**
 * Metadata stored for token streaming (decorator configuration)
 */
export interface StreamTokenDecoratorMetadata extends StreamTokenOptions {
  nodeId?: string;
  methodName: string;
  enabled: boolean;
}

/**
 * Configuration options for @StreamEvent decorator
 */
export interface StreamEventOptions {
  /** Event types to stream */
  events?: StreamEventType[];
  /** Enable custom event streaming */
  enabled?: boolean;
  /** Event buffer size (default: 100) */
  bufferSize?: number;
  /** Event batch processing size (default: 10) */
  batchSize?: number;
  /** Custom event transformer */
  transformer?: (event: unknown) => unknown;
  /** Event filtering criteria */
  filter?: {
    eventTypes?: StreamEventType[];
    minPriority?: 'low' | 'medium' | 'high';
    includeDebug?: boolean;
    excludeTypes?: StreamEventType[];
  };
  /** Delivery guarantee level */
  delivery?: 'at-most-once' | 'at-least-once' | 'exactly-once';
}

/**
 * Metadata stored for event streaming (decorator configuration)
 */
export interface StreamEventDecoratorMetadata extends StreamEventOptions {
  nodeId?: string;
  methodName: string;
  enabled: boolean;
  events: StreamEventType[];
}

/**
 * Configuration options for @StreamProgress decorator
 */
export interface StreamProgressOptions {
  /** Enable progress streaming */
  enabled?: boolean;
  /** Progress reporting interval in milliseconds (default: 1000) */
  interval?: number;
  /** Progress granularity (coarse, fine, detailed) */
  granularity?: 'coarse' | 'fine' | 'detailed';
  /** Include estimation for completion time */
  includeETA?: boolean;
  /** Include performance metrics */
  includeMetrics?: boolean;
  /** Progress milestones to report */
  milestones?: number[];
  /** Custom progress calculator */
  calculator?: (
    current: number,
    total: number,
    metadata?: Record<string, unknown>
  ) => number;
  /** Progress format configuration */
  format?: {
    showPercentage?: boolean;
    showCurrent?: boolean;
    showTotal?: boolean;
    showRate?: boolean;
    precision?: number;
  };
}

/**
 * Metadata stored for progress streaming (decorator configuration)
 */
export interface StreamProgressDecoratorMetadata extends StreamProgressOptions {
  nodeId?: string;
  methodName: string;
  enabled: boolean;
}

/**
 * Core streaming service interface for dependency injection adapter pattern
 *
 * This interface enables consumer libraries (workflow-engine, multi-agent)
 * to depend on streaming functionality without tight coupling to implementation.
 */
export interface IStreamingService {
  // Token streaming
  initializeTokenStream(options: TokenStreamOptions): Promise<void>;
  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void;
  flushTokens(executionId: string, nodeId: string): Promise<void>;

  // Event streaming
  streamEvent(
    executionId: string,
    nodeId: string,
    event: StreamEventData
  ): void;

  // Progress streaming
  streamProgress(
    executionId: string,
    nodeId: string,
    progress: ProgressData
  ): void;

  // WebSocket integration
  broadcastToExecution(executionId: string, data: any): Promise<void>;
  sendToClient(clientId: string, data: any): Promise<void>;
}

/**
 * Granular token streaming interface for specialized token handling
 */
export interface ITokenStreamingService {
  initializeTokenStream(options: TokenStreamOptions): Promise<void>;
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
  streamEvent(
    executionId: string,
    nodeId: string,
    event: StreamEventData
  ): void;
  processBatch(events: StreamUpdate[]): void;
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

// Supporting interfaces
export interface TokenStreamOptions {
  executionId: string;
  nodeId: string;
  config: StreamTokenDecoratorMetadata;
}

export interface StreamEventData {
  type: string;
  data: any;
  metadata?: Record<string, unknown>;
}

export interface ProgressData {
  progress: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

// Import necessary types from streaming module
export interface StreamUpdate {
  type: string;
  data: any;
  metadata?: Record<string, unknown>;
}

// Import TokenFilter interface
export interface TokenFilter {
  minLength?: number;
  maxLength?: number;
  excludeWhitespace?: boolean;
  pattern?: RegExp;
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

  streamProgress(): void {
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

// Dependency injection tokens
export const STREAMING_SERVICE_TOKEN = 'STREAMING_SERVICE_TOKEN';
export const TOKEN_STREAMING_SERVICE_TOKEN = 'TOKEN_STREAMING_SERVICE_TOKEN';
export const EVENT_STREAM_PROCESSOR_SERVICE_TOKEN =
  'EVENT_STREAM_PROCESSOR_SERVICE_TOKEN';
export const WEBSOCKET_BRIDGE_SERVICE_TOKEN = 'WEBSOCKET_BRIDGE_SERVICE_TOKEN';
