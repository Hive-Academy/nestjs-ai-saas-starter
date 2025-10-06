import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

// Centralized imports for all agents, tools, and workflows
import { WebResearchTools } from '../business-workflows/core/tools/web-research.tools';
import { GitHubIntegrationTools } from '../business-workflows/core/tools/github-integration.tools';
import { BrandStrategistTools } from '../business-workflows/core/tools/brand-strategist.tools';
import { ContentCreatorTools } from '../business-workflows/core/tools/content-creator.tools';
import { PersonalBrandStrategistAgent } from '../business-workflows/agents/personal-brand-strategist/personal-brand-strategist.agent';
import { ContentCreatorAgent } from '../business-workflows/agents/content-creator/content-creator.agent';
import { GitHubCodeAnalyzerAgent } from '../business-workflows/agents/github-code-analyzer/github-code-analyzer.agent';
import { DevBrandSupervisorWorkflowTransformed } from '../business-workflows/workflows/devbrand-supervisor.workflow';
import { DevBrandChatWorkflow } from '../business-workflows/workflows/devbrand-chat.workflow';

/**
 * Workflow Engine Module Configuration for dev-brand-api
 * CENTRAL REGISTRATION POINT for agents, tools, and workflows
 */
export function getWorkflowEngineConfig(): WorkflowEngineModuleOptions {
  return {
    // ✅ CENTRALIZED REGISTRATION: All providers in one place
    agents: [
      PersonalBrandStrategistAgent,
      ContentCreatorAgent,
      GitHubCodeAnalyzerAgent,
    ],

    tools: [
      WebResearchTools,
      GitHubIntegrationTools,
      BrandStrategistTools,
      ContentCreatorTools,
    ],

    workflows: [DevBrandSupervisorWorkflowTransformed, DevBrandChatWorkflow],

    // Workflow engine configuration
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
