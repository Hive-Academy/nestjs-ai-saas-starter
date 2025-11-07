/**
 * Type-safe interfaces for LangGraph checkpoint integration
 * TASK_2025_029: Properly typed interfaces instead of 'any'
 *
 * These types match @langchain/langgraph-checkpoint v0.1.1
 * Reference: node_modules/@langchain/langgraph-checkpoint/dist/base.d.ts
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import type { PendingWrite } from '@langchain/langgraph-checkpoint';

/**
 * Channel version type - can be number or string
 */
export type ChannelVersion = number | string;

/**
 * Record of channel versions
 */
export type ChannelVersions = Record<string, ChannelVersion>;

/**
 * LangGraph checkpoint structure (v4 format)
 */
export interface LangGraphCheckpoint<
  N extends string = string,
  C extends string = string
> {
  /** Checkpoint format version (currently 4) */
  v: number;
  /** Checkpoint ID (uuid6) */
  id: string;
  /** Timestamp (ISO string) */
  ts: string;
  /** Channel values */
  channel_values: Record<C, unknown>;
  /** Channel versions */
  channel_versions: Record<C, ChannelVersion>;
  /** Versions seen per node */
  versions_seen: Record<N, Record<C, ChannelVersion>>;
}

/**
 * Readonly checkpoint interface
 */
export interface ReadonlyLangGraphCheckpoint
  extends Readonly<LangGraphCheckpoint> {
  readonly channel_values: Readonly<Record<string, unknown>>;
  readonly channel_versions: Readonly<Record<string, ChannelVersion>>;
  readonly versions_seen: Readonly<
    Record<string, Readonly<Record<string, ChannelVersion>>>
  >;
}

/**
 * Checkpoint metadata
 */
export interface LangGraphCheckpointMetadata {
  source: 'input' | 'loop' | 'update' | 'fork';
  step: number;
  writes?: Record<string, unknown> | null;
  parents?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Pending write structure
 */
export interface LangGraphPendingWrite {
  channel: string;
  value: unknown;
  taskId?: string;
}

/**
 * Checkpoint tuple (config + checkpoint + metadata)
 */
export interface LangGraphCheckpointTuple {
  config: RunnableConfig;
  checkpoint: LangGraphCheckpoint;
  metadata?: LangGraphCheckpointMetadata;
  parentConfig?: RunnableConfig;
  pendingWrites?: LangGraphPendingWrite[];
}

/**
 * Options for listing checkpoints
 */
export interface LangGraphCheckpointListOptions {
  limit?: number;
  before?: RunnableConfig;
  filter?: Record<string, unknown>;
}

/**
 * Base checkpoint saver interface (matches @langchain/langgraph-checkpoint)
 * This is the interface that LangGraph's CompiledStateGraph.compile() expects
 */
export interface ILangGraphCheckpointSaver<V extends string | number = number> {
  /**
   * Serializer protocol for checkpoint data
   */
  serde?: unknown; // SerializerProtocol from LangGraph

  /**
   * Get a checkpoint (without metadata)
   */
  get(config: RunnableConfig): Promise<LangGraphCheckpoint | undefined>;

  /**
   * Get a checkpoint tuple (with metadata and parent config)
   */
  getTuple(
    config: RunnableConfig
  ): Promise<LangGraphCheckpointTuple | undefined>;

  /**
   * List checkpoints for a thread
   */
  list(
    config: RunnableConfig,
    options?: LangGraphCheckpointListOptions
  ): AsyncGenerator<LangGraphCheckpointTuple>;

  /**
   * Store a checkpoint
   */
  put(
    config: RunnableConfig,
    checkpoint: LangGraphCheckpoint,
    metadata: LangGraphCheckpointMetadata,
    newVersions: ChannelVersions
  ): Promise<RunnableConfig>;

  /**
   * Store intermediate writes linked to a checkpoint
   */
  putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void>;

  /**
   * Delete all checkpoints and writes for a thread
   */
  deleteThread(threadId: string): Promise<void>;

  /**
   * Generate next version ID for a channel
   */
  getNextVersion?(current: V | undefined): V;
}

/**
 * Type guard to check if an object is a LangGraph checkpoint saver
 */
export function isLangGraphCheckpointSaver(
  obj: unknown
): obj is ILangGraphCheckpointSaver {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const saver = obj as Record<string, unknown>;

  return (
    typeof saver.get === 'function' &&
    typeof saver.getTuple === 'function' &&
    typeof saver.list === 'function' &&
    typeof saver.put === 'function' &&
    typeof saver.putWrites === 'function' &&
    typeof saver.deleteThread === 'function'
  );
}
