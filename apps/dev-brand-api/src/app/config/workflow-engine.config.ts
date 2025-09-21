import type { WorkflowEngineModuleOptions } from '@hive-academy/langgraph-workflow-engine';

// Centralized imports for all agents, tools, and workflows
import { DocumentProcessingTools } from '../business-workflows/core/tools/document-processing.tools';
import { WebResearchTools } from '../business-workflows/core/tools/web-research.tools';
import { PersonalBrandStrategistAgent } from '../business-workflows/agents/personal-brand-strategist.agent';
import { ContentCreatorAgent } from '../business-workflows/agents/content-creator.agent';
import { GitHubCodeAnalyzerAgent } from '../business-workflows/agents/github-code-analyzer.agent';
import { CustomerSupportAgent } from '../business-workflows/agents/customer-support.agent';
import { EnhancedSupportWorkflow } from '../business-workflows/workflows/enhanced-support.workflow';

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
      CustomerSupportAgent,
    ],
    
    tools: [
      DocumentProcessingTools,
      WebResearchTools,
    ],
    
    workflows: [
      EnhancedSupportWorkflow,
    ],
    
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
