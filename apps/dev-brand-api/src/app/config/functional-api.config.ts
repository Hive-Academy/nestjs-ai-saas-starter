import type { FunctionalApiModuleOptions } from '@hive-academy/langgraph-functional-api';

// Import showcase workflows for explicit registration
import { SupervisorShowcaseWorkflow } from '../showcase/workflows/supervisor-showcase.workflow';
import { SwarmShowcaseWorkflow } from '../showcase/workflows/swarm-showcase.workflow';

/**
 * Functional API Module Configuration for dev-brand-api
 * Enables functional programming patterns for LangGraph workflows
 */
export function getFunctionalApiConfig(): FunctionalApiModuleOptions {
  return {
    // Explicit workflow registration (replaces discovery-based registration)
    workflows: [SupervisorShowcaseWorkflow, SwarmShowcaseWorkflow],
    // Task execution settings
    defaultTimeout: parseInt(process.env.FUNCTIONAL_DEFAULT_TIMEOUT || '30000'),
    defaultRetryCount: parseInt(
      process.env.FUNCTIONAL_DEFAULT_RETRY_COUNT || '3'
    ),

    // Checkpointing settings
    enableCheckpointing:
      process.env.FUNCTIONAL_ENABLE_CHECKPOINTING !== 'false',
    checkpointInterval: parseInt(
      process.env.FUNCTIONAL_CHECKPOINT_INTERVAL || '5000'
    ),

    // Streaming settings
    enableStreaming: process.env.FUNCTIONAL_ENABLE_STREAMING === 'true',

    // Concurrency settings
    maxConcurrentTasks: parseInt(
      process.env.FUNCTIONAL_MAX_CONCURRENT_TASKS || '10'
    ),

    // Dependency management
    enableCycleDetection:
      process.env.FUNCTIONAL_ENABLE_CYCLE_DETECTION !== 'false',

    // Global metadata for workflow executions
    globalMetadata: {
      environment: process.env.NODE_ENV || 'development',
      service: 'dev-brand-api',
      version: process.env.npm_package_version || '1.0.0',
    },
  };
}
