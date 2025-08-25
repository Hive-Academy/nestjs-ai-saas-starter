import type { LangGraphModuleOptions } from '@hive-academy/langgraph-core';

/**
 * Configuration for the Supervisor Agent Module
 *
 * This configuration leverages our full NestJS-LangGraph infrastructure
 * using the correct interface options
 */
export const getNestLanggraphConfig = (): LangGraphModuleOptions => ({
  // ===== LLM Provider Configuration =====
  // Using OpenAI as the default LLM provider
  defaultLLM: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
    model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    baseURL: process.env.OPENROUTER_BASE_URL,
    options: process.env.OPENROUTER_BASE_URL
      ? {
          apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENROUTER_BASE_URL,
          defaultHeaders: {
            'HTTP-Referer':
              process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
            'X-Title':
              process.env.OPENROUTER_APP_NAME || 'NestJS AI SaaS Starter',
          },
          temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
        }
      : {
          temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
        },
  },

  // Additional LLM providers can be configured here
  providers: process.env.ADDITIONAL_LLM_PROVIDERS
    ? JSON.parse(process.env.ADDITIONAL_LLM_PROVIDERS)
    : undefined,

  // ===== Checkpoint Module Configuration =====
  checkpoint: {
    enabled: process.env.CHECKPOINT_ENABLED !== 'false',
    storage:
      (process.env.CHECKPOINT_STORAGE as
        | 'memory'
        | 'redis'
        | 'postgresql'
        | 'sqlite') || 'memory',
    storageConfig: {
      // Redis configuration
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),

      // PostgreSQL configuration
      database: process.env.CHECKPOINT_DB_NAME || 'workflow_checkpoints',
      username: process.env.CHECKPOINT_DB_USER,
      password: process.env.CHECKPOINT_DB_PASSWORD,

      // SQLite configuration
      path: process.env.CHECKPOINT_SQLITE_PATH || './data/checkpoints.db',
    },
    maxCheckpoints: parseInt(process.env.CHECKPOINT_MAX_COUNT || '100', 10),
    interval: parseInt(process.env.CHECKPOINT_INTERVAL_MS || '1000', 10),
  },

  // ===== Memory Module Configuration =====
  // Memory integration is now handled at app level through configureMemoryIntegration()
  // This ensures proper contract interface usage and prevents duplicate connections
  // Memory configuration is provided via app.module.ts

  // ===== Tools Configuration =====
  tools: {
    autoRegister: process.env.TOOLS_AUTO_DISCOVER !== 'false',
    validation: {
      enabled: process.env.TOOLS_VALIDATION !== 'false',
      strict: process.env.TOOLS_STRICT_MODE === 'true',
    },
    tracking: process.env.TOOLS_TRACKING !== 'false',
    timeout: parseInt(process.env.TOOLS_TIMEOUT_MS || '30000', 10),
  },

  // ===== Streaming Module Configuration =====
  streaming: {
    enabled: process.env.STREAMING_ENABLED !== 'false',
    defaultMode:
      (process.env.STREAMING_DEFAULT_MODE as
        | 'values'
        | 'updates'
        | 'messages'
        | 'events'
        | 'debug'
        | 'multiple') || 'values',
    websocket: {
      enabled: process.env.WEBSOCKET_ENABLED !== 'false',
      namespace: process.env.WEBSOCKET_NAMESPACE || '/langgraph',
      events: process.env.WEBSOCKET_EVENTS
        ? process.env.WEBSOCKET_EVENTS.split(',')
        : ['workflow-update', 'agent-message'],
    },
    buffer: {
      size: parseInt(process.env.STREAMING_BUFFER_SIZE || '1000', 10),
      strategy:
        (process.env.STREAMING_BUFFER_STRATEGY as
          | 'sliding'
          | 'dropping'
          | 'blocking') || 'sliding',
    },
    tokens: {
      enabled: process.env.TOKEN_STREAMING_ENABLED !== 'false',
      bufferSize: parseInt(process.env.TOKEN_BUFFER_SIZE || '50', 10),
      batchSize: parseInt(process.env.TOKEN_BATCH_SIZE || '1', 10),
    },
  },

  // ===== HITL Configuration =====
  hitl: {
    enabled: process.env.HITL_ENABLED !== 'false',
    timeout: parseInt(process.env.HITL_TIMEOUT_MS || '1800000', 10), // 30 minutes default
    fallbackStrategy:
      (process.env.HITL_FALLBACK_STRATEGY as
        | 'approve'
        | 'reject'
        | 'retry'
        | 'error') || 'error',
    confidenceThreshold: parseFloat(
      process.env.HITL_CONFIDENCE_THRESHOLD || '0.7'
    ),
    riskLevels: (process.env.HITL_RISK_LEVELS || 'high,critical').split(
      ','
    ) as Array<'low' | 'medium' | 'high' | 'critical'>,
  },

  // ===== Workflows Configuration =====
  workflows: {
    cache: process.env.WORKFLOWS_CACHE !== 'false',
    cacheTTL: parseInt(process.env.WORKFLOWS_CACHE_TTL || '300000', 10), // 5 minutes
    maxCached: parseInt(process.env.WORKFLOWS_MAX_CACHED || '100', 10),
    metrics: process.env.WORKFLOWS_METRICS !== 'false',
    timeout: parseInt(process.env.WORKFLOWS_TIMEOUT_MS || '600000', 10), // 10 minutes
    maxRetries: parseInt(process.env.WORKFLOWS_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.WORKFLOWS_RETRY_DELAY || '1000', 10),
  },

  // ===== Observability Configuration =====
  observability: {
    tracing: process.env.OBSERVABILITY_TRACING !== 'false',
    metrics: process.env.OBSERVABILITY_METRICS !== 'false',
    logging: process.env.OBSERVABILITY_LOGGING !== 'false',
    logLevel:
      (process.env.OBSERVABILITY_LOG_LEVEL as
        | 'debug'
        | 'info'
        | 'warn'
        | 'error') || 'info',
    samplingRate: parseFloat(process.env.OBSERVABILITY_SAMPLING_RATE || '0.1'),
  },

  // ===== Performance Configuration =====
  performance: {
    enabled: process.env.PERFORMANCE_OPTIMIZATIONS !== 'false',
    maxConcurrent: parseInt(process.env.PERFORMANCE_MAX_CONCURRENT || '10', 10),
    queue: {
      enabled: process.env.PERFORMANCE_QUEUE_ENABLED !== 'false',
      maxSize: parseInt(process.env.PERFORMANCE_QUEUE_MAX_SIZE || '1000', 10),
      strategy:
        (process.env.PERFORMANCE_QUEUE_STRATEGY as
          | 'fifo'
          | 'lifo'
          | 'priority') || 'fifo',
    },
    circuitBreaker: {
      enabled: process.env.PERFORMANCE_CIRCUIT_BREAKER !== 'false',
      threshold: parseInt(process.env.PERFORMANCE_CB_THRESHOLD || '5', 10),
      resetTimeout: parseInt(
        process.env.PERFORMANCE_CB_RESET_TIMEOUT || '60000',
        10
      ),
    },
  },
});

/**
 * Environment variables reference for Supervisor Agent Module
 *
 * Required:
 * - OPENROUTER_API_KEY: API key for OpenRouter (https://openrouter.ai/keys)
 *
 * Optional LLM Configuration (OpenRouter):
 * - OPENROUTER_MODEL: Model name (default: 'openai/gpt-3.5-turbo')
 *   Popular options: 'google/gemini-pro', 'anthropic/claude-2', 'meta-llama/llama-2-70b-chat'
 *   Full list: https://openrouter.ai/models
 * - OPENROUTER_TEMPERATURE: Temperature for generation (default: '0.7')
 * - OPENROUTER_MAX_TOKENS: Max tokens for generation (default: '2048')
 * - OPENROUTER_BASE_URL: OpenRouter API URL (default: 'https://openrouter.ai/api/v1')
 * - OPENROUTER_SITE_URL: Your app URL for OpenRouter dashboard
 * - OPENROUTER_APP_NAME: Your app name for OpenRouter dashboard
 *
 * Optional Checkpoint Configuration:
 * - CHECKPOINT_ENABLED: Enable checkpointing (default: 'true')
 * - CHECKPOINT_STORAGE: 'memory' | 'sqlite' | 'redis' | 'postgresql' (default: 'memory')
 * - CHECKPOINT_MAX_COUNT: Max checkpoints to keep (default: '100')
 * - CHECKPOINT_INTERVAL_MS: Checkpoint interval in ms (default: '1000')
 * - REDIS_HOST: Redis host (default: 'localhost')
 * - REDIS_PORT: Redis port (default: '6379')
 * - CHECKPOINT_DB_NAME: PostgreSQL database name
 * - CHECKPOINT_DB_USER: PostgreSQL username
 * - CHECKPOINT_DB_PASSWORD: PostgreSQL password
 * - CHECKPOINT_SQLITE_PATH: SQLite database path
 *
 * Optional Memory Configuration:
 * - MEMORY_ENABLED: Enable memory module (default: 'true')
 * - MEMORY_CHROMADB_COLLECTION: ChromaDB collection name (default: 'supervisor_memory')
 * - MEMORY_EMBEDDING_FUNCTION: Embedding function (default: 'openai')
 * - MEMORY_MAX_ENTRIES: Max memory entries (default: '1000')
 * - MEMORY_TTL_DAYS: Memory TTL in days (default: '7')
 *
 * Optional Multi-Agent Configuration:
 * - MULTI_AGENT_ENABLED: Enable multi-agent module (default: 'true')
 * - MULTI_AGENT_LIST: Comma-separated list of agents (default: 'supervisor,researcher,analyzer')
 * - MULTI_AGENT_STRATEGY: 'supervisor' | 'swarm' | 'hierarchical' (default: 'supervisor')
 * - MULTI_AGENT_MAX_CONCURRENT: Max concurrent agents (default: '3')
 *
 * Optional Monitoring Configuration:
 * - MONITORING_ENABLED: Enable monitoring (default: 'true')
 * - MONITORING_WORKFLOW: Monitor workflow metrics (default: 'true')
 * - MONITORING_AGENTS: Monitor agent metrics (default: 'true')
 * - MONITORING_PERFORMANCE: Monitor performance metrics (default: 'true')
 * - MONITORING_ALERTING_ENABLED: Enable alerting (default: 'true')
 * - MONITORING_ERROR_RATE_THRESHOLD: Error rate threshold (default: '0.05')
 * - MONITORING_LATENCY_THRESHOLD_MS: Latency threshold in ms (default: '5000')
 *
 * Optional Time Travel Configuration:
 * - TIME_TRAVEL_ENABLED: Enable time travel (default: 'true')
 * - TIME_TRAVEL_MAX_SNAPSHOTS: Max snapshots to keep (default: '50')
 * - TIME_TRAVEL_DEBUG_MODE: Enable debug mode (default: 'false')
 *
 * Optional Streaming Configuration:
 * - STREAMING_ENABLED: Enable streaming (default: 'true')
 * - STREAMING_TOKENS: Enable token streaming (default: 'true')
 * - STREAMING_EVENTS: Enable event streaming (default: 'true')
 * - STREAMING_PROGRESS: Enable progress streaming (default: 'true')
 * - WEBSOCKET_ENABLED: Enable WebSocket (default: 'true')
 * - WEBSOCKET_PORT: WebSocket port (default: '3001')
 * - WEBSOCKET_CORS: Enable CORS for WebSocket (default: 'true')
 *
 * Optional HITL Configuration:
 * - HITL_ENABLED: Enable HITL (default: 'true')
 * - HITL_CONFIDENCE_THRESHOLD: Confidence threshold (default: '0.7')
 * - HITL_RISK_LOW: Low risk threshold (default: '0.3')
 * - HITL_RISK_MEDIUM: Medium risk threshold (default: '0.6')
 * - HITL_RISK_HIGH: High risk threshold (default: '0.8')
 * - HITL_RISK_CRITICAL: Critical risk threshold (default: '0.95')
 * - HITL_TIMEOUT_MS: HITL timeout in ms (default: '1800000' - 30 minutes)
 *
 * Optional Tool Configuration:
 * - TOOLS_AUTO_DISCOVER: Auto-discover tools (default: 'true')
 * - TOOLS_VALIDATION: Validate tools (default: 'true')
 * - TOOLS_CACHE: Cache tools (default: 'true')
 *
 * Optional Compilation Configuration:
 * - COMPILATION_CACHE: Enable compilation cache (default: 'true')
 * - COMPILATION_EAGER: Enable eager compilation (default: 'false')
 * - COMPILATION_MAX_CACHE_SIZE: Max cache size (default: '50')
 *
 * Optional Debug Configuration:
 * - DEBUG_ENABLED: Enable debug mode (default: based on NODE_ENV)
 * - DEBUG_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' (default: 'info')
 * - NODE_ENV: Environment mode ('development' | 'production')
 */
