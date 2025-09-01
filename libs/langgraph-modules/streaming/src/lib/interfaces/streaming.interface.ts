// import { BaseMessage } from '@langchain/core/messages';

import { StreamEventType } from '../constants';

// Re-export StreamEventType for external use
export { StreamEventType };

export interface StreamUpdate<T = any> {
  type: StreamEventType;
  data: T;
  metadata?: StreamMetadata;
}

// StreamEventType is defined in constants.ts to avoid duplicate exports

export interface StreamMetadata {
  timestamp: Date;
  sequenceNumber: number;
  executionId: string;
  nodeId?: string;
  agentType?: string;
  [key: string]: any;
}

export interface StreamContext {
  executionId: string;
  streamId: string;
  startTime: Date;
  metadata?: Record<string, any>;
}

export interface TokenData {
  content: string;
  role?: string;
  index?: number;
  totalTokens?: number;
}

export interface StreamTokenMetadata extends StreamMetadata {
  tokenIndex: number;
  totalTokens?: number;
  role?: string;
}

export interface StreamEventMetadata extends StreamMetadata {
  eventType: string;
  eventData?: any;
}

export interface StreamProgressMetadata extends StreamMetadata {
  progress: number;
  total?: number;
  stage?: string;
}

// Helper functions for creating metadata
export function getStreamTokenMetadata(
  executionId: string,
  nodeId: string,
  tokenIndex: number,
  totalTokens?: number,
  role?: string
): StreamTokenMetadata {
  return {
    timestamp: new Date(),
    sequenceNumber: tokenIndex,
    executionId,
    nodeId,
    tokenIndex,
    totalTokens,
    role,
  };
}

export function getStreamEventMetadata(
  executionId: string,
  nodeId: string,
  eventType: string,
  eventData?: any
): StreamEventMetadata {
  return {
    timestamp: new Date(),
    sequenceNumber: Date.now(),
    executionId,
    nodeId,
    eventType,
    eventData,
  };
}

export function getStreamProgressMetadata(
  executionId: string,
  nodeId: string,
  progress: number,
  total?: number,
  stage?: string
): StreamProgressMetadata {
  return {
    timestamp: new Date(),
    sequenceNumber: Date.now(),
    executionId,
    nodeId,
    progress,
    total,
    stage,
  };
}


