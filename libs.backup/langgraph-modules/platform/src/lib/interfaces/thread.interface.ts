/**
 * LangGraph Platform Thread interfaces
 * Based on the official LangGraph Platform API structure
 */

export interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: ThreadMetadata;
  status: ThreadStatus;
  values?: Record<string, unknown>;
}

export interface ThreadMetadata {
  [key: string]: unknown;
}

export enum ThreadStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  INTERRUPTED = 'interrupted',
  ERROR = 'error',
}

export interface CreateThreadRequest {
  metadata?: ThreadMetadata;
  if_exists?: 'raise' | 'do_nothing';
}

export interface UpdateThreadRequest {
  metadata: ThreadMetadata;
}

export interface ThreadState {
  values: Record<string, unknown>;
  next: readonly string[];
  checkpoint: ThreadCheckpoint;
  metadata: ThreadStateMetadata;
  created_at: string;
  parent_checkpoint?: string;
}

export interface ThreadCheckpoint {
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  channel_values: Record<string, unknown>;
  channel_versions: Record<string, number>;
  versions_seen: Record<string, Record<string, number>>;
}

export interface ThreadStateMetadata {
  step: number;
  run_id: string;
  source: 'loop' | 'input' | 'resume';
  writes: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThreadSearchParams {
  offset?: number;
  limit?: number;
  metadata?: Record<string, unknown>;
  status?: ThreadStatus;
  values?: Record<string, unknown>;
}

export interface ThreadsSearchResponse {
  threads: readonly Thread[];
}

export interface CopyThreadRequest {
  metadata?: ThreadMetadata;
}
