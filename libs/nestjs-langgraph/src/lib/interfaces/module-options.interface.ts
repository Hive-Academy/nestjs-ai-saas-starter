import { Type, ModuleMetadata } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCheckpointSaver } from '@langchain/langgraph';

export interface LangGraphModuleOptions {
  /**
   * Default LLM provider configuration
   */
  defaultLLM?: LLMProviderConfig;

  /**
   * Multiple LLM providers configuration
   */
  providers?: Record<string, LLMProviderConfig>;

  /**
   * Tool configuration
   */
  tools?: ToolsConfig;

  /**
   * Streaming configuration
   */
  streaming?: StreamingConfig;

  /**
   * Human-in-the-loop configuration
   */
  hitl?: HITLConfig;

  /**
   * Workflow configuration
   */
  workflows?: WorkflowConfig;

  /**
   * Checkpointing configuration
   */
  checkpoint?: CheckpointConfig;

  /**
   * Observability configuration
   */
  observability?: ObservabilityConfig;

  /**
   * Performance configuration
   */
  performance?: PerformanceConfig;
}

export interface LLMProviderConfig {
  /**
   * Provider type (openai, anthropic, google, azure, custom)
   */
  type: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';

  /**
   * API key for the provider
   */
  apiKey?: string;

  /**
   * Model name
   */
  model?: string;

  /**
   * Base URL for custom providers
   */
  baseURL?: string;

  /**
   * Additional provider-specific options
   */
  options?: Record<string, any>;

  /**
   * Custom provider factory
   */
  factory?: () => BaseChatModel;
}

export interface ToolsConfig {
  /**
   * Auto-register tools from decorated methods
   */
  autoRegister?: boolean;

  /**
   * Directory to scan for tool definitions
   */
  directory?: string;

  /**
   * Tool namespaces for organization
   */
  namespaces?: string[];

  /**
   * Global tool timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable tool execution tracking
   */
  tracking?: boolean;

  /**
   * Tool validation configuration
   */
  validation?: {
    /**
     * Enable schema validation
     */
    enabled?: boolean;

    /**
     * Strict mode throws on validation errors
     */
    strict?: boolean;
  };
}

export interface StreamingConfig {
  /**
   * Enable streaming support
   */
  enabled?: boolean;

  /**
   * Default stream mode
   */
  defaultMode?: 'values' | 'updates' | 'messages' | 'events' | 'debug' | 'multiple';

  /**
   * WebSocket configuration for real-time streaming
   */
  websocket?: {
    /**
     * Enable WebSocket bridge
     */
    enabled?: boolean;

    /**
     * WebSocket namespace
     */
    namespace?: string;

    /**
     * Event names to emit
     */
    events?: string[];
  };

  /**
   * Stream buffer configuration
   */
  buffer?: {
    /**
     * Buffer size
     */
    size?: number;

    /**
     * Buffer strategy
     */
    strategy?: 'sliding' | 'dropping' | 'blocking';
  };

  /**
   * Token streaming configuration
   */
  tokens?: {
    /**
     * Enable token-level streaming
     */
    enabled?: boolean;

    /**
     * Token buffer size
     */
    bufferSize?: number;

    /**
     * Batch tokens before emitting
     */
    batchSize?: number;
  };
}

export interface HITLConfig {
  /**
   * Enable human-in-the-loop
   */
  enabled?: boolean;

  /**
   * Default approval timeout in milliseconds
   */
  timeout?: number;

  /**
   * Fallback strategy when timeout occurs
   */
  fallbackStrategy?: 'approve' | 'reject' | 'retry' | 'error';

  /**
   * Default confidence threshold for approval
   */
  confidenceThreshold?: number;

  /**
   * Risk levels that trigger approval
   */
  riskLevels?: ('low' | 'medium' | 'high' | 'critical')[];

  /**
   * Approval chain configuration
   */
  approvalChain?: {
    /**
     * Enable multi-level approvals
     */
    enabled?: boolean;

    /**
     * Maximum approval levels
     */
    maxLevels?: number;
  };
}

export interface WorkflowConfig {
  /**
   * Enable workflow caching
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   */
  cacheTTL?: number;

  /**
   * Maximum cached workflows
   */
  maxCached?: number;

  /**
   * Default interrupt behavior
   */
  interruptBehavior?: 'before' | 'after' | 'both';

  /**
   * Enable workflow metrics
   */
  metrics?: boolean;

  /**
   * Workflow timeout in milliseconds
   */
  timeout?: number;

  /**
   * Maximum retry attempts
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

export interface CheckpointConfig {
  /**
   * Enable checkpointing
   */
  enabled?: boolean;

  /**
   * Checkpoint saver implementation
   */
  saver?: BaseCheckpointSaver;

  /**
   * Checkpoint storage type
   */
  storage?: 'memory' | 'redis' | 'database' | 'custom';

  /**
   * Storage configuration
   */
  storageConfig?: Record<string, any>;

  /**
   * Auto-checkpoint interval in milliseconds
   */
  interval?: number;

  /**
   * Maximum checkpoints to retain
   */
  maxCheckpoints?: number;
}

export interface ObservabilityConfig {
  /**
   * Enable tracing
   */
  tracing?: boolean;

  /**
   * Enable metrics collection
   */
  metrics?: boolean;

  /**
   * Enable logging
   */
  logging?: boolean;

  /**
   * Log level
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Custom trace exporter
   */
  traceExporter?: any;

  /**
   * Custom metrics exporter
   */
  metricsExporter?: any;

  /**
   * Sampling rate for traces (0-1)
   */
  samplingRate?: number;
}

export interface PerformanceConfig {
  /**
   * Enable performance optimizations
   */
  enabled?: boolean;

  /**
   * Maximum concurrent workflows
   */
  maxConcurrent?: number;

  /**
   * Queue configuration
   */
  queue?: {
    /**
     * Enable queueing
     */
    enabled?: boolean;

    /**
     * Maximum queue size
     */
    maxSize?: number;

    /**
     * Queue strategy
     */
    strategy?: 'fifo' | 'lifo' | 'priority';
  };

  /**
   * Circuit breaker configuration
   */
  circuitBreaker?: {
    /**
     * Enable circuit breaker
     */
    enabled?: boolean;

    /**
     * Failure threshold
     */
    threshold?: number;

    /**
     * Reset timeout in milliseconds
     */
    resetTimeout?: number;
  };
}

export interface LangGraphModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<LangGraphModuleOptions> | LangGraphModuleOptions;
  inject?: any[];
  useClass?: Type<LangGraphOptionsFactory>;
  useExisting?: Type<LangGraphOptionsFactory>;
}

export interface LangGraphOptionsFactory {
  createLangGraphOptions(): Promise<LangGraphModuleOptions> | LangGraphModuleOptions;
}