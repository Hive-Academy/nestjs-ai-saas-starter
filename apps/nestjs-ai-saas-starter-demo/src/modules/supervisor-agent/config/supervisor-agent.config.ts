import type { LangGraphModuleOptions } from '@hive-academy/nestjs-langgraph';

/**
 * Configuration for the Supervisor Agent Module
 *
 * This configuration leverages our full NestJS-LangGraph infrastructure
 * and all 7 child modules as per Day 4 implementation plan
 */
export const getSupervisorAgentConfig = (): LangGraphModuleOptions => ({
  // ===== LLM Provider Configuration =====
  // Using OpenRouter as the default LLM provider
  // NOTE: There's a bug in nestjs-langgraph - it checks for 'type' but interface has 'provider'
  // We need to set both for now until the library is fixed
  defaultLLM: {
    provider: 'openai' as const, // Interface requires 'provider'
    type: 'openai', // Factory checks for 'type' (bug workaround)
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    model:
      process.env.OPENROUTER_MODEL ||
      process.env.LLM_MODEL ||
      'openai/gpt-3.5-turbo',
    temperature: parseFloat(
      process.env.OPENROUTER_TEMPERATURE || process.env.LLM_TEMPERATURE || '0.7'
    ),
    maxTokens: parseInt(
      process.env.OPENROUTER_MAX_TOKENS || process.env.LLM_MAX_TOKENS || '2048',
      10
    ),
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    // OpenRouter-specific options
    options: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL:
        process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer':
          process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'NestJS AI SaaS Starter',
      },
    },
  } as any,

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
        | 'sqlite'
        | 'redis'
        | 'postgresql') || 'memory',
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
  // REMOVED: Memory is now handled at app level, not through child modules
  // The memory module (AgenticMemoryModule) is now imported directly in the main app module
  // and uses the injected ChromaDB and Neo4j services from the app level.
  // This prevents duplicate database connections and follows proper module hierarchy.
  // memory: {
  //   enabled: process.env.MEMORY_ENABLED !== 'false',
  //   chromadb: {
  //     collection: process.env.MEMORY_CHROMADB_COLLECTION || 'supervisor_memory',
  //   },
  //   neo4j: {
  //     database: process.env.NEO4J_DATABASE || 'neo4j',
  //   },
  // },

  // ===== Multi-Agent Module Configuration =====
  multiAgent: {
    enabled: process.env.MULTI_AGENT_ENABLED !== 'false',
    agents: (
      process.env.MULTI_AGENT_LIST || 'supervisor,researcher,analyzer'
    ).split(','),
    coordinationStrategy:
      (process.env.MULTI_AGENT_STRATEGY as
        | 'supervisor'
        | 'swarm'
        | 'hierarchical') || 'supervisor',
    maxConcurrentAgents: parseInt(
      process.env.MULTI_AGENT_MAX_CONCURRENT || '3',
      10
    ),
  },

  // ===== Monitoring Module Configuration =====
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metrics: {
      workflow: process.env.MONITORING_WORKFLOW !== 'false',
      agents: process.env.MONITORING_AGENTS !== 'false',
      performance: process.env.MONITORING_PERFORMANCE !== 'false',
    },
    alerting: {
      enabled: process.env.MONITORING_ALERTING_ENABLED !== 'false',
      thresholds: {
        errorRate: parseFloat(
          process.env.MONITORING_ERROR_RATE_THRESHOLD || '0.05'
        ),
        latency: parseInt(
          process.env.MONITORING_LATENCY_THRESHOLD_MS || '5000',
          10
        ),
      },
    },
  },

  // ===== Time Travel Module Configuration =====
  timeTravel: {
    enabled: process.env.TIME_TRAVEL_ENABLED !== 'false',
    maxSnapshots: parseInt(process.env.TIME_TRAVEL_MAX_SNAPSHOTS || '50', 10),
    debugMode: process.env.TIME_TRAVEL_DEBUG_MODE === 'true',
  },

  // ===== Streaming Module Configuration =====
  streaming: {
    enabled: process.env.STREAMING_ENABLED !== 'false',
    tokenStreaming: process.env.STREAMING_TOKENS !== 'false',
    eventStreaming: process.env.STREAMING_EVENTS !== 'false',
    progressStreaming: process.env.STREAMING_PROGRESS !== 'false',
    websocket: {
      enabled: process.env.WEBSOCKET_ENABLED !== 'false',
      port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
      cors: process.env.WEBSOCKET_CORS !== 'false',
    },
  },

  // ===== HITL (Human-in-the-Loop) Module Configuration =====
  hitl: {
    enabled: process.env.HITL_ENABLED !== 'false',
    confidenceThreshold: parseFloat(
      process.env.HITL_CONFIDENCE_THRESHOLD || '0.7'
    ),
    riskThresholds: {
      low: parseFloat(process.env.HITL_RISK_LOW || '0.3'),
      medium: parseFloat(process.env.HITL_RISK_MEDIUM || '0.6'),
      high: parseFloat(process.env.HITL_RISK_HIGH || '0.8'),
      critical: parseFloat(process.env.HITL_RISK_CRITICAL || '0.95'),
    },
    defaultTimeout: parseInt(process.env.HITL_TIMEOUT_MS || '1800000', 10), // 30 minutes
  },

  // ===== Tool System Configuration =====
  tools: {
    autoDiscover: process.env.TOOLS_AUTO_DISCOVER !== 'false',
    validation: process.env.TOOLS_VALIDATION !== 'false',
    cache: process.env.TOOLS_CACHE !== 'false',
  },

  // ===== Compilation Configuration =====
  compilation: {
    cache: process.env.COMPILATION_CACHE !== 'false',
    eager: process.env.COMPILATION_EAGER === 'true',
    maxCacheSize: parseInt(process.env.COMPILATION_MAX_CACHE_SIZE || '50', 10),
  },

  // ===== Debug Configuration =====
  debug: {
    enabled:
      process.env.DEBUG_ENABLED === 'true' ||
      process.env.NODE_ENV === 'development',
    logLevel:
      (process.env.DEBUG_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
      'info',
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
