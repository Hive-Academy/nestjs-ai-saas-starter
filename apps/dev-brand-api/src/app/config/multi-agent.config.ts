import type { MultiAgentModuleOptions } from '@hive-academy/langgraph-multi-agent';

/**
 * Multi-Agent Module Configuration for dev-brand-api
 * Enables coordination between multiple AI agents
 */
export function getMultiAgentConfig(): MultiAgentModuleOptions {
  // Detect if we're using OpenRouter based on API key or explicit provider setting
  const isOpenRouter =
    process.env.LLM_PROVIDER === 'openrouter' ||
    (!!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY);

  return {
    // Default LLM configuration - centralized for all agents
    defaultLlm: {
      model:
        process.env.OPENROUTER_MODEL ||
        process.env.LLM_MODEL ||
        'gpt-3.5-turbo',
      apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
      temperature: parseFloat(
        process.env.OPENROUTER_TEMPERATURE ||
          process.env.LLM_TEMPERATURE ||
          '0.7'
      ),
      maxTokens: parseInt(
        process.env.OPENROUTER_MAX_TOKENS ||
          process.env.LLM_MAX_TOKENS ||
          '2048'
      ),
      // Support OpenRouter configuration when detected
      baseURL: isOpenRouter
        ? process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
        : undefined,
      defaultHeaders: isOpenRouter
        ? {
            'HTTP-Referer':
              process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
            'X-Title':
              process.env.OPENROUTER_APP_NAME || 'NestJS AI SaaS Starter',
          }
        : undefined,
    },

    // Message history limits
    messageHistory: {
      maxMessages: parseInt(process.env.MULTI_AGENT_MAX_MESSAGES || '50'),
      pruneStrategy:
        (process.env.MULTI_AGENT_PRUNE_STRATEGY as
          | 'fifo'
          | 'lifo'
          | 'summarize') || 'fifo',
    },

    // Streaming configuration
    streaming: {
      enabled: process.env.MULTI_AGENT_STREAMING_ENABLED !== 'false',
      modes: ['values', 'updates', 'messages'] as const,
    },

    // Debug configuration
    debug: {
      enabled:
        process.env.NODE_ENV === 'development' ||
        process.env.MULTI_AGENT_DEBUG_ENABLED === 'true',
      logLevel:
        (process.env.MULTI_AGENT_LOG_LEVEL as
          | 'debug'
          | 'info'
          | 'warn'
          | 'error') || 'info',
    },

    // Performance configuration
    performance: {
      tokenOptimization: process.env.MULTI_AGENT_OPTIMIZE_TOKENS !== 'false',
      contextWindowManagement:
        process.env.MULTI_AGENT_MANAGE_CONTEXT !== 'false',
      enableMessageForwarding:
        process.env.MULTI_AGENT_ENABLE_FORWARDING !== 'false',
    },

    // Checkpointing configuration
    checkpointing: {
      enabled: process.env.MULTI_AGENT_CHECKPOINTING_ENABLED !== 'false',
      enableForAllNetworks:
        process.env.MULTI_AGENT_CHECKPOINT_ALL_NETWORKS !== 'false',
      defaultThreadPrefix:
        process.env.MULTI_AGENT_CHECKPOINT_THREAD_PREFIX || 'multi-agent',
    },

    // Agent network limits
    maxConcurrentAgents: parseInt(
      process.env.MULTI_AGENT_MAX_CONCURRENT || '10'
    ),
    executionTimeout: parseInt(
      process.env.MULTI_AGENT_EXECUTION_TIMEOUT || '300000'
    ), // 5 minutes
    retryAttempts: parseInt(process.env.MULTI_AGENT_RETRY_ATTEMPTS || '3'),
  };
}
