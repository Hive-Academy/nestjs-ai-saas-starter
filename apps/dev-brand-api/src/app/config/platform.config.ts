import type { PlatformModuleOptions } from '@hive-academy/langgraph-platform';

/**
 * Platform Module Configuration for dev-brand-api
 * Integrates with LangGraph Platform for hosted assistants
 */
export function getPlatformConfig(): PlatformModuleOptions {
  return {
    // Platform connection settings
    connection: {
      apiKey: process.env.LANGGRAPH_API_KEY,
      endpoint: process.env.LANGGRAPH_ENDPOINT || 'https://api.langgraph.dev',
      timeout: parseInt(process.env.LANGGRAPH_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.LANGGRAPH_RETRY_ATTEMPTS || '3'),
    },

    // Assistant configuration
    assistants: {
      defaultModel: process.env.LANGGRAPH_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.LANGGRAPH_MAX_TOKENS || '4096'),
      temperature: parseFloat(process.env.LANGGRAPH_TEMPERATURE || '0.7'),
      topP: parseFloat(process.env.LANGGRAPH_TOP_P || '1.0'),
    },

    // Workflow deployment settings
    deployment: {
      autoSync: process.env.LANGGRAPH_AUTO_SYNC === 'true',
      syncInterval: parseInt(process.env.LANGGRAPH_SYNC_INTERVAL || '300000'), // 5 minutes
      version: process.env.LANGGRAPH_VERSION || 'latest',
      environment: process.env.LANGGRAPH_ENVIRONMENT || 'development',
    },

    // Authentication settings
    auth: {
      tokenExpiry: parseInt(process.env.LANGGRAPH_TOKEN_EXPIRY || '3600'), // 1 hour
      refreshThreshold: parseInt(
        process.env.LANGGRAPH_REFRESH_THRESHOLD || '300'
      ), // 5 minutes
      validateTokens: process.env.LANGGRAPH_VALIDATE_TOKENS !== 'false',
    },

    // Caching settings
    cache: {
      enabled: process.env.LANGGRAPH_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.LANGGRAPH_CACHE_TTL || '600'), // 10 minutes
      maxSize: parseInt(process.env.LANGGRAPH_CACHE_SIZE || '1000'),
      strategy: process.env.LANGGRAPH_CACHE_STRATEGY || 'lru',
    },

    // Development features for demo
    demo: {
      enablePlayground: process.env.NODE_ENV === 'development',
      logApiCalls: process.env.NODE_ENV === 'development',
      mockResponses: process.env.LANGGRAPH_MOCK_RESPONSES === 'true',
    },
  };
}
