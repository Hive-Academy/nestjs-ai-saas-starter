import type { WorkflowEngineModuleOptions } from '../workflow-engine.module';
import type { IStreamingService } from '@hive-academy/langgraph-core';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

/**
 * Global storage for workflow engine module configuration
 * Set when WorkflowEngineModule.forRoot() is called
 */
let storedWorkflowEngineConfig: WorkflowEngineModuleOptions = {};

/**
 * Store workflow engine configuration for decorator access
 * Called by WorkflowEngineModule.forRoot()
 */
export function setWorkflowEngineConfig(
  config: WorkflowEngineModuleOptions
): void {
  storedWorkflowEngineConfig = { ...config };
}

/**
 * Get stored workflow engine configuration for decorators
 * Returns the config passed to WorkflowEngineModule.forRoot()
 */
export function getWorkflowEngineConfig(): WorkflowEngineModuleOptions {
  return storedWorkflowEngineConfig;
}

/**
 * Get workflow engine config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getWorkflowEngineConfigWithDefaults(): Omit<
  Required<WorkflowEngineModuleOptions>,
  'streamingAdapter' | 'checkpointer' | 'tools'
> & {
  streamingAdapter?: IStreamingService;
  checkpointer?: BaseCheckpointSaver;
  tools?: any[];
} {
  const config = getWorkflowEngineConfig();

  return {
    compilation: {
      cacheEnabled: config.compilation?.cacheEnabled ?? true,
      cacheTTL: config.compilation?.cacheTTL ?? 300000, // 5 minutes
      optimizeGraphs: config.compilation?.optimizeGraphs ?? true,
    },
    execution: {
      defaultTimeout: config.execution?.defaultTimeout ?? 30000,
      streamingEnabled: config.execution?.streamingEnabled ?? true,
      parallelExecution: config.execution?.parallelExecution ?? true,
      maxConcurrency: config.execution?.maxConcurrency ?? 10,
    },
    debugging: {
      enabled: config.debugging?.enabled ?? false,
      logLevel: config.debugging?.logLevel ?? 'info',
      traceExecution: config.debugging?.traceExecution ?? false,
    },
    streamingAdapter: config.streamingAdapter,
    checkpointer: config.checkpointer,
    tools: config.tools,
  };
}
