/**
 * LangGraph Platform Webhook interfaces
 * Based on the official LangGraph Platform API structure
 */

export interface Webhook {
  webhook_id: string;
  url: string;
  events: readonly WebhookEvent[];
  secret?: string;
  created_at: string;
  updated_at: string;
  status: WebhookStatus;
}

export enum WebhookEvent {
  RUN_START = 'run.start',
  RUN_END = 'run.end',
  RUN_ERROR = 'run.error',
  RUN_TIMEOUT = 'run.timeout',
  RUN_INTERRUPT = 'run.interrupt',
  THREAD_UPDATE = 'thread.update',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface CreateWebhookRequest {
  url: string;
  events?: readonly WebhookEvent[];
  secret?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: readonly WebhookEvent[];
  secret?: string;
  status?: WebhookStatus;
}

export interface WebhookPayload {
  webhook_id: string;
  event: WebhookEvent;
  timestamp: string;
  data: WebhookEventData;
}

export interface WebhookEventData {
  run_id?: string;
  thread_id?: string;
  assistant_id?: string;
  status?: RunStatus;
  error?: string;
  output?: unknown;
  metadata?: Record<string, unknown>;
}

export interface WebhooksSearchResponse {
  webhooks: readonly Webhook[];
}

// Import RunStatus from run interface
export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  INTERRUPTED = 'interrupted',
}