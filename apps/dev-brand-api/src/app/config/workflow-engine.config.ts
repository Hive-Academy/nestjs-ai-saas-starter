import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

/**
 * Workflow Engine Module Configuration for dev-brand-api
 * Core workflow orchestration for LangGraph applications
 */
export function getWorkflowEngineConfig(): WorkflowEngineModuleOptions {
  return {
    compilation: {
      cacheEnabled: process.env.WORKFLOW_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.WORKFLOW_CACHE_TTL || '300000'), // 5 minutes
      optimizeGraphs: process.env.WORKFLOW_OPTIMIZE_GRAPHS !== 'false',
    },
    debugging: {
      enabled:
        process.env.NODE_ENV === 'development' ||
        process.env.WORKFLOW_DEBUG === 'true',
      logLevel: process.env.WORKFLOW_LOG_LEVEL || 'info',
      traceExecution: process.env.WORKFLOW_TRACE_EXECUTION === 'true',
    },
  };
}
