import type { LangGraphModuleOptions } from '@hive-academy/langgraph-core';

/**
 * Minimal Core LangGraph Configuration
 *
 * Extracted from centralized 271-line config - Part of Phase 3 Subtask 3.3
 * Contains only essential LLM and tools configuration
 */
export const getLangGraphCoreConfig = (): LangGraphModuleOptions => ({
  // Essential LLM Provider Configuration
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
});
