import type { WorkflowExecutionMetadata } from '@hive-academy/langgraph-workflow-engine';

/**
 * Base time-travel metadata that extends workflow execution metadata
 * Provides core time-travel operation context
 */
export interface TimeTravelExecutionMetadata extends WorkflowExecutionMetadata {
  /** Time-travel operation type */
  readonly timeTravelType:
    | 'branch'
    | 'replay'
    | 'restore'
    | 'merge'
    | 'compare';

  /** Original source information for time-travel operations */
  readonly sourceInfo?: {
    threadId: string;
    checkpointId: string;
    timestamp: string;
  };

  /** Target destination information */
  readonly target?: {
    threadId: string;
    checkpointId?: string;
    timestamp?: string;
  };

  /** Performance metrics for time-travel operations */
  readonly performance?: {
    operationDuration: number;
    stateSize: number;
    memoryUsage: number;
    checkpointsProcessed: number;
  };
}

/**
 * Generic time-travel metadata with custom payload support
 * @template TPayload - Custom time-travel metadata payload type
 */
export interface TimeTravelMetadata<TPayload = Record<string, unknown>>
  extends TimeTravelExecutionMetadata {
  /** Custom time-travel metadata payload with type safety */
  readonly payload?: TPayload;
}

/**
 * Branch-specific metadata for branch operations
 * @template TBranchPayload - Custom branch payload type
 */
export interface BranchMetadata<TBranchPayload = Record<string, unknown>>
  extends TimeTravelMetadata<TBranchPayload> {
  /** Always branch type for branch operations */
  readonly timeTravelType: 'branch';

  /** Branch relationship information */
  readonly branchInfo: {
    /** Branch unique identifier */
    branchId: string;
    /** Human-readable branch name */
    branchName: string;
    /** Branch description */
    description?: string;
    /** Parent thread ID this branch originated from */
    parentThreadId: string;
    /** Parent checkpoint ID where branch was created */
    parentCheckpointId: string;
    /** Branch creation timestamp */
    createdAt: string;
    /** Branch status */
    status: 'active' | 'merged' | 'abandoned';
  };

  /** State modifications applied during branch creation */
  readonly stateModifications?: {
    modificationType: 'partial' | 'complete' | 'delta';
    modifiedFields: readonly string[];
    originalValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  };

  /** Branch hierarchy information */
  readonly hierarchy?: {
    depth: number;
    ancestorBranches: readonly string[];
    childBranches: readonly string[];
  };
}

/**
 * Replay-specific metadata for replay operations
 * @template TReplayPayload - Custom replay payload type
 */
export interface ReplayMetadata<TReplayPayload = Record<string, unknown>>
  extends TimeTravelMetadata<TReplayPayload> {
  /** Always replay type for replay operations */
  readonly timeTravelType: 'replay';

  /** Replay execution information */
  readonly replayInfo: {
    /** Original execution thread ID */
    originalThreadId: string;
    /** New replay thread ID */
    replayThreadId: string;
    /** Original checkpoint being replayed */
    sourceCheckpointId: string;
    /** Replay execution timestamp */
    replayStartTime: string;
    /** Replay completion timestamp */
    replayEndTime?: string;
    /** Replay execution status */
    status: 'running' | 'completed' | 'failed' | 'cancelled';
  };

  /** Replay configuration options */
  readonly replayOptions?: {
    replaySpeed: number;
    preserveTimestamps: boolean;
    skipNodes: readonly string[];
    stateModifications: boolean;
    replayMode: 'exact' | 'modified' | 'accelerated';
  };

  /** Replay results and comparison */
  readonly replayResults?: {
    originalDuration: number;
    replayDuration: number;
    stateComparison: 'identical' | 'modified' | 'divergent';
    checkpointsCreated: number;
    errorsEncountered: number;
  };
}

/**
 * Checkpoint restore metadata for restoration operations
 * @template TRestorePayload - Custom restore payload type
 */
export interface CheckpointRestoreMetadata<
  TRestorePayload = Record<string, unknown>
> extends TimeTravelMetadata<TRestorePayload> {
  /** Always restore type for restore operations */
  readonly timeTravelType: 'restore';

  /** Restoration information */
  readonly restoreInfo: {
    /** Checkpoint being restored */
    sourceCheckpointId: string;
    /** Target thread for restoration */
    targetThreadId: string;
    /** Restore operation timestamp */
    restoreTimestamp: string;
    /** Restoration strategy */
    strategy: 'overwrite' | 'merge' | 'create-new';
    /** Backup checkpoint ID before restore */
    backupCheckpointId?: string;
  };

  /** State restoration details */
  readonly stateRestore?: {
    fieldsRestored: readonly string[];
    fieldsSkipped: readonly string[];
    conflicts: readonly {
      field: string;
      originalValue: unknown;
      restoredValue: unknown;
      resolution: 'original' | 'restored' | 'merged';
    }[];
  };

  /** Validation results */
  readonly validation?: {
    isValid: boolean;
    warnings: readonly string[];
    errors: readonly string[];
    validationTimestamp: string;
  };
}

/**
 * State comparison metadata for diff operations
 * @template TComparePayload - Custom comparison payload type
 */
export interface StateComparisonMetadata<
  TComparePayload = Record<string, unknown>
> extends TimeTravelMetadata<TComparePayload> {
  /** Always compare type for comparison operations */
  readonly timeTravelType: 'compare';

  /** Comparison information */
  readonly comparisonInfo: {
    /** First checkpoint being compared */
    checkpoint1Id: string;
    /** Second checkpoint being compared */
    checkpoint2Id: string;
    /** Comparison timestamp */
    comparisonTimestamp: string;
    /** Comparison algorithm used */
    algorithm: 'deep' | 'shallow' | 'semantic' | 'structural';
  };

  /** Comparison results summary */
  readonly comparisonResults: {
    /** Whether states are identical */
    identical: boolean;
    /** Number of differences found */
    differenceCount: number;
    /** Number of fields added */
    addedCount: number;
    /** Number of fields removed */
    removedCount: number;
    /** Number of fields modified */
    modifiedCount: number;
    /** Similarity score (0-1) */
    similarityScore: number;
  };
}

/**
 * Time-travel checkpoint record with enhanced type safety
 * @template TData - Checkpoint data type
 * @template TMetadata - Time-travel metadata payload type
 */
export interface TimeTravelCheckpointRecord<
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

  /** Enhanced metadata for time-travel operations */
  readonly metadata: TimeTravelMetadata<TMetadata>;

  /** Time-travel specific checkpoint information */
  readonly timeTravelInfo?: {
    /** Whether this checkpoint supports time-travel operations */
    supportsTimeTravel: boolean;
    /** Available time-travel operations for this checkpoint */
    availableOperations: readonly (
      | 'branch'
      | 'replay'
      | 'restore'
      | 'compare'
    )[];
    /** Time-travel operation history */
    operationHistory: readonly {
      operationType: TimeTravelExecutionMetadata['timeTravelType'];
      timestamp: string;
      operationId: string;
    }[];
  };
}

/**
 * Time-travel checkpoint list result with enhanced filtering
 * @template TData - Checkpoint data type
 * @template TMetadata - Time-travel metadata payload type
 */
export interface TimeTravelCheckpointListResult<
  TData = unknown,
  TMetadata = Record<string, unknown>
> {
  /** List of time-travel checkpoints */
  readonly checkpoints: readonly TimeTravelCheckpointRecord<TData, TMetadata>[];

  /** Total number of checkpoints */
  readonly total: number;

  /** Whether more checkpoints are available */
  readonly hasMore: boolean;

  /** Next page cursor for pagination */
  readonly nextCursor?: string;

  /** Time-travel specific aggregation data */
  readonly timeTravelSummary?: {
    branchCount: number;
    replayCount: number;
    restoreCount: number;
    compareCount: number;
    operationTimeline: readonly {
      operationType: TimeTravelExecutionMetadata['timeTravelType'];
      count: number;
      firstOperation: string;
      lastOperation: string;
    }[];
  };
}

/**
 * Time-travel checkpoint filter with operation-specific filtering
 * @template TMetadata - Time-travel metadata payload type for filtering
 */
export interface TimeTravelCheckpointFilter<
  TMetadata = Record<string, unknown>
> {
  /** Filter by checkpoint type */
  type?:
    | TimeTravelExecutionMetadata['type']
    | TimeTravelExecutionMetadata['type'][];

  /** Filter by node ID */
  nodeId?: string | string[];

  /** Filter by workflow name */
  workflowName?: string | string[];

  /** Filter by time range */
  timeRange?: {
    from?: Date | string;
    to?: Date | string;
  };

  /** Filter by time-travel operation type */
  timeTravelType?:
    | TimeTravelExecutionMetadata['timeTravelType']
    | TimeTravelExecutionMetadata['timeTravelType'][];

  /** Filter by branch information */
  branchFilter?: {
    branchId?: string | string[];
    branchName?: string | string[];
    parentThreadId?: string | string[];
    status?:
      | BranchMetadata['branchInfo']['status']
      | BranchMetadata['branchInfo']['status'][];
  };

  /** Filter by replay information */
  replayFilter?: {
    originalThreadId?: string | string[];
    replayThreadId?: string | string[];
    status?:
      | ReplayMetadata['replayInfo']['status']
      | ReplayMetadata['replayInfo']['status'][];
    replayMode?:
      | NonNullable<ReplayMetadata['replayOptions']>['replayMode']
      | NonNullable<ReplayMetadata['replayOptions']>['replayMode'][];
  };

  /** Filter by restore information */
  restoreFilter?: {
    sourceCheckpointId?: string | string[];
    targetThreadId?: string | string[];
    strategy?:
      | CheckpointRestoreMetadata['restoreInfo']['strategy']
      | CheckpointRestoreMetadata['restoreInfo']['strategy'][];
  };

  /** Performance-based filtering */
  performanceFilter?: {
    maxOperationDuration?: number;
    minOperationDuration?: number;
    maxStateSize?: number;
    minStateSize?: number;
  };

  /** Custom metadata filter predicate */
  metadataFilter?: (metadata: TimeTravelMetadata<TMetadata>) => boolean;

  /** Pagination options */
  pagination?: {
    limit?: number;
    offset?: number;
    cursor?: string;
  };
}

/**
 * Common time-travel metadata payload types for specific use cases
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TimeTravelOperationPayloads {
  /** Branch creation and management payloads */
  export interface BranchOperationPayload {
    /** Branch creation strategy */
    creationStrategy?: 'fork' | 'clone' | 'snapshot';
    /** Expected divergence level */
    expectedDivergence?: 'minimal' | 'moderate' | 'significant';
    /** Branch purpose classification */
    purpose?: 'experiment' | 'bugfix' | 'feature' | 'testing' | 'analysis';
    /** User or system that created the branch */
    creator?: {
      type: 'user' | 'system' | 'automated';
      id: string;
      context?: Record<string, unknown>;
    };
    /** Branch expiration information */
    expiration?: {
      expiresAt?: string;
      autoCleanup?: boolean;
      retentionPolicy?: string;
    };
  }

  /** Replay execution and analysis payloads */
  export interface ReplayOperationPayload {
    /** Replay purpose and context */
    purpose?:
      | 'testing'
      | 'debugging'
      | 'analysis'
      | 'performance'
      | 'validation';
    /** Expected outcome prediction */
    expectedOutcome?: 'identical' | 'improved' | 'different' | 'unknown';
    /** Test scenario information */
    testScenario?: {
      name: string;
      description?: string;
      expectedResults?: Record<string, unknown>;
      validationCriteria?: string[];
    };
    /** Performance monitoring configuration */
    monitoring?: {
      trackMemory?: boolean;
      trackCpu?: boolean;
      trackLatency?: boolean;
      samplingRate?: number;
    };
    /** Replay environment settings */
    environment?: {
      isolationLevel?: 'full' | 'partial' | 'none';
      resourceLimits?: Record<string, number>;
      timeoutSettings?: Record<string, number>;
    };
  }

  /** Checkpoint restoration payloads */
  export interface RestoreOperationPayload {
    /** Restoration purpose and justification */
    purpose?: 'rollback' | 'recovery' | 'migration' | 'testing' | 'analysis';
    /** Approval and authorization information */
    authorization?: {
      approvedBy?: string;
      approvalTimestamp?: string;
      reason?: string;
      riskLevel?: 'low' | 'medium' | 'high';
    };
    /** Pre-restore validation */
    validation?: {
      checksPerformed?: string[];
      validationResults?: Record<string, boolean>;
      warnings?: string[];
    };
    /** Post-restore verification */
    verification?: {
      verificationSteps?: string[];
      expectedState?: Record<string, unknown>;
      rollbackPlan?: string;
    };
  }

  /** State comparison and analysis payloads */
  export interface ComparisonOperationPayload {
    /** Comparison purpose and context */
    purpose?:
      | 'debugging'
      | 'validation'
      | 'analysis'
      | 'audit'
      | 'optimization';
    /** Comparison scope and depth */
    scope?: {
      fields?: string[];
      includeMetadata?: boolean;
      includeTimestamps?: boolean;
      maxDepth?: number;
    };
    /** Analysis configuration */
    analysis?: {
      semanticComparison?: boolean;
      structuralComparison?: boolean;
      valueComparison?: boolean;
      typeComparison?: boolean;
    };
    /** Reporting and output options */
    reporting?: {
      format?: 'detailed' | 'summary' | 'diff' | 'visual';
      includeRecommendations?: boolean;
      highlightCritical?: boolean;
    };
  }

  /** Performance and monitoring payloads */
  export interface PerformancePayload {
    /** Memory usage metrics */
    memory?: {
      heapUsed?: number;
      heapTotal?: number;
      external?: number;
      rss?: number;
    };
    /** CPU and processing metrics */
    cpu?: {
      processingTime?: number;
      cpuPercentage?: number;
      userTime?: number;
      systemTime?: number;
    };
    /** I/O and network metrics */
    io?: {
      diskReads?: number;
      diskWrites?: number;
      networkCalls?: number;
      cacheOperations?: number;
    };
    /** Time-travel specific metrics */
    timeTravel?: {
      checkpointLoadTime?: number;
      stateDiffTime?: number;
      replicationTime?: number;
      validationTime?: number;
    };
  }

  /** Debugging and analysis payloads */
  export interface DebuggingPayload {
    /** Debug session information */
    session?: {
      sessionId?: string;
      debuggerType?: string;
      startTime?: string;
      endTime?: string;
    };
    /** Breakpoint and inspection data */
    breakpoints?: Array<{
      nodeId: string;
      condition?: string;
      hitCount?: number;
      lastHit?: string;
    }>;
    /** Variable inspection results */
    inspection?: {
      variables?: Record<string, unknown>;
      stateSnapshot?: Record<string, unknown>;
      callStack?: string[];
    };
    /** Debug analysis results */
    analysis?: {
      issuesFound?: string[];
      recommendations?: string[];
      performanceInsights?: string[];
    };
  }
}

/**
 * Type utilities for time-travel metadata
 */

/** Extract time-travel metadata payload type */
export type ExtractTimeTravelPayload<T> = T extends TimeTravelMetadata<infer P>
  ? P
  : never;

/** Extract branch metadata payload type */
export type ExtractBranchPayload<T> = T extends BranchMetadata<infer P>
  ? P
  : never;

/** Extract replay metadata payload type */
export type ExtractReplayPayload<T> = T extends ReplayMetadata<infer P>
  ? P
  : never;

/** Extract restore metadata payload type */
export type ExtractRestorePayload<T> = T extends CheckpointRestoreMetadata<
  infer P
>
  ? P
  : never;

/** Extract comparison metadata payload type */
export type ExtractComparisonPayload<T> = T extends StateComparisonMetadata<
  infer P
>
  ? P
  : never;

/**
 * Helper types for creating time-travel specific metadata
 */

/** Create branch metadata with specific payload type */
export type CreateBranchMetadata<TPayload = Record<string, unknown>> =
  BranchMetadata<TPayload>;

/** Create replay metadata with specific payload type */
export type CreateReplayMetadata<TPayload = Record<string, unknown>> =
  ReplayMetadata<TPayload>;

/** Create restore metadata with specific payload type */
export type CreateRestoreMetadata<TPayload = Record<string, unknown>> =
  CheckpointRestoreMetadata<TPayload>;

/** Create comparison metadata with specific payload type */
export type CreateComparisonMetadata<TPayload = Record<string, unknown>> =
  StateComparisonMetadata<TPayload>;

/** Create time-travel checkpoint record with specific types */
export type CreateTimeTravelCheckpointRecord<
  TData = unknown,
  TMetadata = Record<string, unknown>
> = TimeTravelCheckpointRecord<TData, TMetadata>;

/**
 * Validation and type guards for time-travel metadata
 */

/** Type guard for time-travel metadata */
export function isTimeTravelMetadata(
  metadata: unknown
): metadata is TimeTravelMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'timeTravelType' in metadata &&
    typeof (metadata as any).timeTravelType === 'string' &&
    ['branch', 'replay', 'restore', 'merge', 'compare'].includes(
      (metadata as any).timeTravelType
    )
  );
}

/** Type guard for branch metadata */
export function isBranchMetadata(
  metadata: unknown
): metadata is BranchMetadata {
  return (
    isTimeTravelMetadata(metadata) &&
    metadata.timeTravelType === 'branch' &&
    'branchInfo' in metadata &&
    typeof metadata.branchInfo === 'object'
  );
}

/** Type guard for replay metadata */
export function isReplayMetadata(
  metadata: unknown
): metadata is ReplayMetadata {
  return (
    isTimeTravelMetadata(metadata) &&
    metadata.timeTravelType === 'replay' &&
    'replayInfo' in metadata &&
    typeof metadata.replayInfo === 'object'
  );
}

/** Type guard for restore metadata */
export function isRestoreMetadata(
  metadata: unknown
): metadata is CheckpointRestoreMetadata {
  return (
    isTimeTravelMetadata(metadata) &&
    metadata.timeTravelType === 'restore' &&
    'restoreInfo' in metadata &&
    typeof metadata.restoreInfo === 'object'
  );
}

/** Type guard for comparison metadata */
export function isComparisonMetadata(
  metadata: unknown
): metadata is StateComparisonMetadata {
  return (
    isTimeTravelMetadata(metadata) &&
    metadata.timeTravelType === 'compare' &&
    'comparisonInfo' in metadata &&
    typeof metadata.comparisonInfo === 'object'
  );
}
