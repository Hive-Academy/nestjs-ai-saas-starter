import type { PlatformModuleOptions } from '@hive-academy/langgraph-platform';

/**
 * Platform Module Configuration for dev-brand-api
 * Integrates with LangGraph Platform for hosted assistants
 */
export function getPlatformConfig(): PlatformModuleOptions {
  return {
    baseUrl: process.env.LANGGRAPH_ENDPOINT || 'https://api.langgraph.dev',
    apiKey: process.env.LANGGRAPH_API_KEY,
    timeout: parseInt(process.env.LANGGRAPH_TIMEOUT || '30000'),
    retryPolicy: {
      maxRetries: parseInt(process.env.LANGGRAPH_RETRY_ATTEMPTS || '3'),
      backoffFactor: parseInt(process.env.LANGGRAPH_BACKOFF_FACTOR || '2'),
      maxBackoffTime: parseInt(
        process.env.LANGGRAPH_MAX_BACKOFF_TIME || '30000'
      ),
    },
    webhook: {
      enabled: process.env.LANGGRAPH_WEBHOOK_ENABLED !== 'false',
      secret: process.env.LANGGRAPH_WEBHOOK_SECRET,
      retryPolicy: {
        maxRetries: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
        backoffFactor: parseInt(process.env.WEBHOOK_BACKOFF_FACTOR || '2'),
        maxBackoffTime: parseInt(
          process.env.WEBHOOK_MAX_BACKOFF_TIME || '30000'
        ),
      },
    },
  };
}
