import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

/**
 * Workflow Engine Module Configuration for dev-brand-api
 *
 * ARCHITECTURE: Minimal orchestration configuration
 * - Previously: functional-api.config.ts + multi-agent.config.ts + workflow-engine.config.ts
 * - Now: workflow-engine.config.ts provides only WorkflowEngineModule settings
 * - NOTE: LLM configuration moved to business-workflows.module.ts (belongs with agents/workflows)
 * - NOTE: Multi-agent specific config removed (consolidated packages deleted)
 */
export function getWorkflowEngineConfig(): Omit<
  WorkflowEngineModuleOptions,
  'streamingAdapter' | 'checkpointAdapter' | 'memoryAdapter'
> {
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

    // NOTE: Adapters (streamingAdapter, checkpointAdapter, memoryAdapter)
    // are injected by app.module.ts - not configured here
  };
}
