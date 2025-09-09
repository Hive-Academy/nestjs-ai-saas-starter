import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

/**
 * Workflow Engine Module Configuration for dev-brand-api
 * Core workflow orchestration for LangGraph applications
 */
export function getWorkflowEngineConfig(): WorkflowEngineModuleOptions {
  return {
    cache: {
      enabled: process.env.WORKFLOW_CACHE_ENABLED !== 'false',
      maxSize: parseInt(process.env.WORKFLOW_CACHE_MAX_SIZE || '1000'),
      ttl: parseInt(process.env.WORKFLOW_CACHE_TTL || '300000'), // 5 minutes
    },
    debug:
      process.env.NODE_ENV === 'development' ||
      process.env.WORKFLOW_DEBUG === 'true',
  };
}
