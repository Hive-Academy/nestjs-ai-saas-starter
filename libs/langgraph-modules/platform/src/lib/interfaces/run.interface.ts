/**
 * LangGraph Platform Run interfaces
 * Based on the official LangGraph Platform API structure
 */

export interface Run {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  status: RunStatus;
  kwargs: RunKwargs;
  multitask_strategy?: MultitaskStrategy;
}

export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  INTERRUPTED = 'interrupted',
}

export enum MultitaskStrategy {
  REJECT = 'reject',
  INTERRUPT = 'interrupt',
  ROLLBACK = 'rollback',
  ENQUEUE = 'enqueue',
}

export interface RunKwargs {
  input?: unknown;
  config?: RunConfig;
  checkpoint?: unknown;
  checkpoint_id?: string;
  interrupt_before?: readonly string[];
  interrupt_after?: readonly string[];
  webhook?: string;
  metadata?: Record<string, unknown>;
}

export interface RunConfig {
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
  recursion_limit?: number;
  configurable?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreateRunRequest {
  assistant_id: string;
  input?: unknown;
  config?: RunConfig;
  checkpoint?: unknown;
  checkpoint_id?: string;
  interrupt_before?: readonly string[];
  interrupt_after?: readonly string[];
  webhook?: string;
  metadata?: Record<string, unknown>;
  multitask_strategy?: MultitaskStrategy;
}

export interface RunsSearchParams {
  offset?: number;
  limit?: number;
  status?: RunStatus;
  assistant_id?: string;
}

export interface RunsSearchResponse {
  runs: readonly Run[];
}

export interface StreamMode {
  mode: 'values' | 'updates' | 'debug' | 'messages';
}

export interface StreamEvent {
  event: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}