/**
 * LangGraph Platform core interfaces
 */

export interface PlatformModuleOptions {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  webhook?: WebhookConfig;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffFactor: number;
  maxBackoffTime: number;
}

export interface WebhookConfig {
  enabled: boolean;
  secret?: string;
  retryPolicy: RetryPolicy;
}

export interface PlatformModuleAsyncOptions {
  useFactory?: (...args: unknown[]) => Promise<PlatformModuleOptions> | PlatformModuleOptions;
  inject?: unknown[];
}

export interface PaginatedResponse<T> {
  data: readonly T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status_code: number;
  details?: Record<string, unknown>;
}