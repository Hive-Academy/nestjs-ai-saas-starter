import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load LLM configuration from .env.llm file
const llmEnvPath = path.resolve(process.cwd(), '.env.llm');
dotenv.config({ path: llmEnvPath });

/**
 * Workflow Engine Module Configuration for dev-brand-api
 *
 * ARCHITECTURE: Minimal orchestration configuration + LLM provider
 * - Previously: functional-api.config.ts + multi-agent.config.ts + workflow-engine.config.ts
 * - Now: workflow-engine.config.ts provides WorkflowEngineModule settings + LLM config
 * - LLM configuration loaded from .env.llm file
 * - NOTE: Multi-agent specific config removed (consolidated packages deleted)
 *
 * LLM DISPATCH BRANCHES:
 * - Branch A (native LangChain): set LLM_MODEL="provider:model-name", e.g. "anthropic:claude-sonnet-4-6"
 *   The matching API key must be in the environment (e.g. ANTHROPIC_API_KEY).
 * - Branch B (custom OpenAI-compatible endpoint): set LLM_BASE_URL to activate.
 *   LLM_MODEL becomes the bare model name sent to the endpoint, LLM_API_KEY is the auth key.
 */
export function getWorkflowEngineConfig(): Partial<WorkflowEngineModuleOptions> {
  if (!process.env.LLM_API_KEY) {
    console.warn(
      '[WorkflowEngine] LLM_API_KEY is not set — LLM calls will fail unless the provider reads its key from a dedicated env var (e.g. ANTHROPIC_API_KEY for Branch A)',
    );
  }

  return {
    // ============================================
    // COMPILATION SETTINGS
    // ============================================
    compilation: {
      cacheEnabled: process.env.WORKFLOW_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.WORKFLOW_CACHE_TTL || '300000'), // 5 minutes
      optimizeGraphs: process.env.WORKFLOW_OPTIMIZE_GRAPHS !== 'false',
    },

    // ============================================
    // EXECUTION SETTINGS
    // ============================================
    execution: {
      defaultTimeout: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT || '30000'),
      streamingEnabled: process.env.WORKFLOW_STREAMING_ENABLED === 'true',
      parallelExecution: process.env.WORKFLOW_PARALLEL_EXECUTION !== 'false',
      maxConcurrency: parseInt(process.env.WORKFLOW_MAX_CONCURRENCY || '10'),
    },

    // ============================================
    // DEBUGGING SETTINGS
    // ============================================
    debugging: {
      enabled:
        process.env.NODE_ENV === 'development' ||
        process.env.WORKFLOW_DEBUG === 'true',
      logLevel: process.env.WORKFLOW_LOG_LEVEL || 'info',
      traceExecution: process.env.WORKFLOW_TRACE_EXECUTION === 'true',
    },

    // ============================================
    // LLM CONFIGURATION (from .env.llm)
    // ============================================
    llm: {
      defaultLlm: {
        // Branch A: "provider:model" — e.g. "openrouter:z-ai/glm-4.5-air:free", "anthropic:claude-sonnet-4-6"
        // Branch B: bare model name understood by the custom endpoint (paired with LLM_BASE_URL)
        model: process.env.LLM_MODEL ?? 'openrouter:z-ai/glm-4.5-air:free',
        // Branch A: initChatModel also reads provider-specific env vars automatically
        // Branch B: sent as the Authorization header to the custom endpoint
        apiKey: process.env.LLM_API_KEY ?? '',
        // Optional: set to trigger Branch B (ChatOpenAI with custom baseURL)
        // Leave unset for Branch A (native LangChain provider dispatch)
        baseUrl: process.env.LLM_BASE_URL,
        temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.7'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? '2048'),
      },
      streaming: {
        enabled: process.env.LLM_STREAMING_ENABLED !== 'false',
      },
    },
  };
}
