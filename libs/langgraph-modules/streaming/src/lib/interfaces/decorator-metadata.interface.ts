// Decorator metadata types for streaming decorators
// These are the detailed configuration types that streaming library owns

import type { StreamEventType } from '../constants';

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
