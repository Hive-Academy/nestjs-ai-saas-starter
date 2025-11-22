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
 */
export function getWorkflowEngineConfig(): Omit<
  WorkflowEngineModuleOptions,
  | 'streamingAdapter'
  | 'checkpointAdapter'
  | 'memoryAdapter'
  | 'checkpointer'
  | 'tools'
  | 'llm'
> & { llm?: any } {
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
        provider: (process.env.LLM_PROVIDER as any) || 'openai',
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        openrouterApiKey: process.env.OPENROUTER_API_KEY,
        googleApiKey: process.env.GOOGLE_API_KEY,
        azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY,
        cohereApiKey: process.env.COHERE_API_KEY,
      },
      streaming: {
        enabled: process.env.LLM_STREAMING_ENABLED !== 'false',
      },
    },
  };
}
