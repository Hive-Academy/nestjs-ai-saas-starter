import { BaseMessage } from '@langchain/core/messages';

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