import type { MultiAgentModuleOptions } from '@hive-academy/langgraph-multi-agent';

/**
 * Multi-Agent Module Configuration for dev-brand-api
 * Simple and consistent LLM provider configuration
 */
export function getMultiAgentConfig(): MultiAgentModuleOptions {
  // Simple provider selection - explicit from LLM_PROVIDER environment variable
  const provider =
    (process.env.LLM_PROVIDER as
      | 'openai'
      | 'anthropic'
      | 'openrouter'
      | 'google'
      | 'local'
      | 'azure-openai'
      | 'cohere') || 'openai';

  // Get model from provider-specific or universal env vars
  const getModel = (): string => {
    switch (provider) {
      case 'anthropic':
        return (
          process.env.ANTHROPIC_MODEL ||
          process.env.LLM_MODEL ||
          'claude-3-sonnet-20240229'
        );
      case 'openrouter':
        return (
          process.env.OPENROUTER_MODEL ||
          process.env.LLM_MODEL ||
          'openai/gpt-3.5-turbo'
        );
      case 'google':
        return (
          process.env.GOOGLE_MODEL || process.env.LLM_MODEL || 'gemini-pro'
        );
      case 'local':
        return process.env.LOCAL_MODEL || process.env.LLM_MODEL || 'llama2';
      case 'azure-openai':
        return (
          process.env.AZURE_OPENAI_MODEL ||
          process.env.LLM_MODEL ||
          'gpt-35-turbo'
        );
      case 'cohere':
        return process.env.COHERE_MODEL || process.env.LLM_MODEL || 'command';
      case 'openai':
      default:
        return (
          process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-3.5-turbo'
        );
    }
  };

  return {
    // Simple and consistent LLM configuration
    defaultLlm: {
      // Explicit provider selection - no detection logic
      provider,
      model: getModel(),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),

      // Universal API keys - users provide all they want to use
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      googleApiKey: process.env.GOOGLE_API_KEY,
      azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY,
      cohereApiKey: process.env.COHERE_API_KEY,

      // Provider-specific configuration
      openai: {
        organization: process.env.OPENAI_ORGANIZATION,
        project: process.env.OPENAI_PROJECT,
      },

      anthropic: {
        version: process.env.ANTHROPIC_VERSION || '2023-06-01',
      },

      openrouter: {
        baseUrl:
          process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        siteName: process.env.OPENROUTER_APP_NAME || 'NestJS AI SaaS Starter',
        siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        appName: process.env.OPENROUTER_APP_NAME || 'NestJS AI SaaS Starter',
      },

      google: {
        location: process.env.GOOGLE_LOCATION || 'us-central1',
        project: process.env.GOOGLE_PROJECT_ID,
      },

      local: {
        baseUrl: process.env.LOCAL_LLM_BASE_URL || 'http://localhost:11434/v1',
      },

      azureOpenai: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
      },

      cohere: {
        version: process.env.COHERE_VERSION,
      },

      // Backward compatibility - deprecated
      apiKey: process.env.OPENAI_API_KEY,
      llmProvider: (['openai', 'anthropic', 'openrouter'].includes(provider)
        ? provider
        : 'openai') as 'openai' | 'anthropic' | 'openrouter',
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
      modes: ['values', 'updates', 'messages'] as (
        | 'values'
        | 'updates'
        | 'messages'
      )[],
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
  };
}
