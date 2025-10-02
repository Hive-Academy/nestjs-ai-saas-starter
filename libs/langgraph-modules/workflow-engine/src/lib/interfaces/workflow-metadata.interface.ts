import type { BaseCheckpointMetadata } from '@hive-academy/langgraph-core';

/**
 * Base workflow metadata that extends LangGraph's BaseCheckpointMetadata
 * Provides core workflow execution context
 */
export interface WorkflowExecutionMetadata extends BaseCheckpointMetadata {
  /** Unique workflow execution identifier */
  readonly executionId: string;

  /** Type of checkpoint */
  readonly type: 'initial' | 'progress' | 'final' | 'error' | 'milestone';

  /** ISO timestamp when metadata was created */
  readonly created_at: string;

  /** Workflow node that created this checkpoint */
  readonly nodeId?: string;

  /** Workflow name/identifier */
  readonly workflowName?: string;

  /** Workflow version */
  readonly workflowVersion?: string;

  /** Error information if type is 'error' */
  readonly error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Generic workflow checkpoint metadata with custom payload support
 * @template TPayload - Custom metadata payload type
 */
export interface WorkflowCheckpointMetadata<TPayload = Record<string, unknown>>
  extends WorkflowExecutionMetadata {
  /** Custom metadata payload with type safety */
  readonly payload?: TPayload;
}

/**
 * Streaming-specific metadata for real-time updates
 * @template TStreamData - Custom stream data type
 */
export interface WorkflowStreamMetadata<TStreamData = Record<string, unknown>>
  extends WorkflowExecutionMetadata {
  /** Sequence number in stream */
  readonly sequenceNumber: number;

  /** Stream event type */
  readonly streamType:
    | 'token'
    | 'message'
    | 'event'
    | 'progress'
    | 'milestone'
    | 'debug';

  /** Custom stream data */
  readonly streamData?: TStreamData;

  /** Buffer information for token streaming */
  readonly buffer?: {
    size: number;
    accumulated: string;
    progress: number;
  };
}

/**
 * Checkpoint record with generic metadata support
 * @template TData - Checkpoint data type
 * @template TMetadata - Metadata payload type
 */
export interface WorkflowCheckpointRecord<
  TData = unknown,
  TMetadata = Record<string, unknown>
> {
  /** Unique checkpoint identifier */
  readonly id: string;

  /** Thread identifier for checkpoint grouping */
  readonly thread_id: string;

  /** Checkpoint data with version control */
  readonly checkpoint: {
    readonly version: number;
    readonly data: TData;
  };

  /** Type-safe metadata */
  readonly metadata: WorkflowCheckpointMetadata<TMetadata>;
}

/**
 * Checkpoint list result with pagination and type safety
 * @template TData - Checkpoint data type
 * @template TMetadata - Metadata payload type
 */
export interface WorkflowCheckpointListResult<
  TData = unknown,
  TMetadata = Record<string, unknown>
> {
  /** List of checkpoints */
  readonly checkpoints: readonly WorkflowCheckpointRecord<TData, TMetadata>[];

  /** Total number of checkpoints */
  readonly total: number;

  /** Whether more checkpoints are available */
  readonly hasMore: boolean;

  /** Next page cursor for pagination */
  readonly nextCursor?: string;
}

/**
 * Checkpoint filter options with type-safe metadata filtering
 * @template TMetadata - Metadata payload type for filtering
 */
export interface WorkflowCheckpointFilter<TMetadata = Record<string, unknown>> {
  /** Filter by checkpoint type */
  type?:
    | WorkflowExecutionMetadata['type']
    | WorkflowExecutionMetadata['type'][];

  /** Filter by node ID */
  nodeId?: string | string[];

  /** Filter by workflow name */
  workflowName?: string | string[];

  /** Filter by time range */
  timeRange?: {
    from?: Date | string;
    to?: Date | string;
  };

  /** Custom metadata filter predicate */
  metadataFilter?: (metadata: WorkflowCheckpointMetadata<TMetadata>) => boolean;

  /** Pagination options */
  pagination?: {
    limit?: number;
    offset?: number;
    cursor?: string;
  };
}

/**
 * Type utility to extract metadata payload type
 */
export type ExtractMetadataPayload<T> = T extends WorkflowCheckpointMetadata<
  infer P
>
  ? P
  : never;

/**
 * Type utility to extract checkpoint data type
 */
export type ExtractCheckpointData<T> = T extends WorkflowCheckpointRecord<
  infer D,
  any
>
  ? D
  : never;

/**
 * AI/LLM related metadata payload
 */
export interface WorkflowAIMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptVersion?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * User interaction metadata payload
 */
export interface WorkflowUserMetadata {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  locale?: string;
}

/**
 * Performance metrics metadata payload
 */
export interface WorkflowPerformanceMetadata {
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkCalls?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

/**
 * Business context metadata payload
 */
export interface WorkflowBusinessMetadata {
  tenantId?: string;
  organizationId?: string;
  projectId?: string;
  environment?: 'development' | 'staging' | 'production';
  features?: string[];
  experiments?: Record<string, boolean>;
}

/**
 * Helper type for creating workflow-specific metadata
 * @template TCustom - Custom metadata fields
 */
export type CreateWorkflowMetadata<TCustom = Record<string, unknown>> =
  WorkflowCheckpointMetadata<TCustom>;

/**
 * Helper type for creating checkpoint records with specific types
 * @template TData - Checkpoint data type
 * @template TMetadata - Metadata payload type
 */
export type CreateCheckpointRecord<
  TData = unknown,
  TMetadata = Record<string, unknown>
> = WorkflowCheckpointRecord<TData, TMetadata>;
