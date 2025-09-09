import type { LangGraphModuleOptions } from '@hive-academy/langgraph-core';

/**
 * DEPRECATED: Core NestJS LangGraph Configuration
 *
 * ⚠️  THIS FILE IS DEPRECATED ⚠️
 * This configuration has been split into specialized module configs:
 *
 * - Core LangGraph: ./langgraph-core.config.ts
 * - Memory: ./memory.config.ts
 * - Checkpoint: ./checkpoint.config.ts
 * - Monitoring: ./monitoring.config.ts
 * - Multi-Agent: ./multi-agent.config.ts
 * - Time Travel: ./time-travel.config.ts
 * - Streaming: ./streaming.config.ts
 * - HITL: ./hitl.config.ts
 * - Platform: ./platform.config.ts
 * - Workflow Engine: ./workflow-engine.config.ts
 *
 * Use the individual module configs instead of this centralized one.
 * This file is kept for backward compatibility and will be removed in v2.0
 */

/**
 * Legacy configuration - Use getLangGraphCoreConfig() from ./langgraph-core.config.ts instead
 * @deprecated Use individual module configs
 */
export const getNestLanggraphConfig = (): LangGraphModuleOptions => {
  console.warn(
    '⚠️  DEPRECATION WARNING: getNestLanggraphConfig() is deprecated. ' +
      'Use individual module configs from ./config/*.config.ts files instead.'
  );

  // Return minimal core configuration only
  return {
    // Essential LLM Provider Configuration
    defaultLLM: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
      model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      baseURL: process.env.OPENROUTER_BASE_URL,
      options: process.env.OPENROUTER_BASE_URL
        ? {
            apiKey:
              process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
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

    // Essential Tools Configuration
    tools: {
      autoRegister: process.env.TOOLS_AUTO_DISCOVER !== 'false',
      validation: {
        enabled: process.env.TOOLS_VALIDATION !== 'false',
        strict: process.env.TOOLS_STRICT_MODE === 'true',
      },
      tracking: process.env.TOOLS_TRACKING !== 'false',
      timeout: parseInt(process.env.TOOLS_TIMEOUT_MS || '30000', 10),
    },
  };
};

/**
 * Environment variables reference for Core LangGraph Module
 *
 * @deprecated - See individual module config files for environment variables
 *
 * Core LLM Configuration:
 * - OPENAI_API_KEY or OPENROUTER_API_KEY: API key for LLM provider
 * - LLM_MODEL: Model name (default: 'gpt-3.5-turbo')
 * - OPENROUTER_BASE_URL: OpenRouter API URL
 * - OPENROUTER_SITE_URL: Your app URL for OpenRouter dashboard
 * - OPENROUTER_APP_NAME: Your app name for OpenRouter dashboard
 * - LLM_TEMPERATURE: Temperature for generation (default: '0.7')
 * - LLM_MAX_TOKENS: Max tokens for generation (default: '2048')
 *
 * Tools Configuration:
 * - TOOLS_AUTO_DISCOVER: Auto-discover tools (default: 'true')
 * - TOOLS_VALIDATION: Validate tools (default: 'true')
 * - TOOLS_STRICT_MODE: Strict validation mode (default: 'false')
 * - TOOLS_TRACKING: Enable tool tracking (default: 'true')
 * - TOOLS_TIMEOUT_MS: Tool timeout in ms (default: '30000')
 *
 * ===== MOVED TO SEPARATE CONFIGS =====
 *
 * Checkpoint: See ./checkpoint.config.ts
 * Memory: See ./memory.config.ts
 * Monitoring: See ./monitoring.config.ts
 * Multi-Agent: See ./multi-agent.config.ts
 * Time Travel: See ./time-travel.config.ts
 * Streaming: See ./streaming.config.ts
 * HITL: See ./hitl.config.ts
 * Platform: See ./platform.config.ts
 * Workflow Engine: See ./workflow-engine.config.ts
 */
