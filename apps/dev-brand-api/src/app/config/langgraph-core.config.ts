import type { LangGraphModuleOptions } from '@hive-academy/langgraph-core';

/**
 * Minimal Core LangGraph Configuration
 *
 * Extracted from centralized 271-line config - Part of Phase 3 Subtask 3.3
 * Contains only essential tools configuration (LLM providers moved to multi-agent module)
 */
export const getLangGraphCoreConfig = (): LangGraphModuleOptions => ({
  // LLM Provider Configuration moved to @hive-academy/langgraph-multi-agent
  // Use MultiAgentModule.forRoot() for LLM configuration instead

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
