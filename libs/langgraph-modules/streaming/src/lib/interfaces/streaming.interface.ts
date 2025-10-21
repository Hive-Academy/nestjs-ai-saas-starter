// import { BaseMessage } from '@langchain/core/messages';

// Import StreamEventType from local constants - streaming library is source of truth
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

  // Node ID structure components (parsed from canonical node ID)
  domain?: string;
  phase?: string;
  activity?: string;
  detail?: string;

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
  role?: string,
  nodeIdParts?: {
    domain?: string;
    phase?: string;
    activity?: string;
    detail?: string;
  }
): StreamTokenMetadata {
  return {
    timestamp: new Date(),
    sequenceNumber: tokenIndex,
    executionId,
    nodeId,
    tokenIndex,
    totalTokens,
    role,
    // Include parsed node ID components if provided
    ...(nodeIdParts?.domain && { domain: nodeIdParts.domain }),
    ...(nodeIdParts?.phase && { phase: nodeIdParts.phase }),
    ...(nodeIdParts?.activity && { activity: nodeIdParts.activity }),
    ...(nodeIdParts?.detail && { detail: nodeIdParts.detail }),
  };
}

export function getStreamEventMetadata(
  executionId: string,
  nodeId: string,
  eventType: string,
  sequenceNumber: number,
  eventData?: any,
  nodeIdParts?: {
    domain?: string;
    phase?: string;
    activity?: string;
    detail?: string;
  }
): StreamEventMetadata {
  return {
    timestamp: new Date(),
    sequenceNumber,
    executionId,
    nodeId,
    eventType,
    eventData,
    // Include parsed node ID components if provided
    ...(nodeIdParts?.domain && { domain: nodeIdParts.domain }),
    ...(nodeIdParts?.phase && { phase: nodeIdParts.phase }),
    ...(nodeIdParts?.activity && { activity: nodeIdParts.activity }),
    ...(nodeIdParts?.detail && { detail: nodeIdParts.detail }),
  };
}

export function getStreamProgressMetadata(
  executionId: string,
  nodeId: string,
  progress: number,
  sequenceNumber: number,
  total?: number,
  stage?: string,
  nodeIdParts?: {
    domain?: string;
    phase?: string;
    activity?: string;
    detail?: string;
  }
): StreamProgressMetadata {
  return {
    timestamp: new Date(),
    sequenceNumber,
    executionId,
    nodeId,
    progress,
    total,
    stage,
    // Include parsed node ID components if provided
    ...(nodeIdParts?.domain && { domain: nodeIdParts.domain }),
    ...(nodeIdParts?.phase && { phase: nodeIdParts.phase }),
    ...(nodeIdParts?.activity && { activity: nodeIdParts.activity }),
    ...(nodeIdParts?.detail && { detail: nodeIdParts.detail }),
  };
}
