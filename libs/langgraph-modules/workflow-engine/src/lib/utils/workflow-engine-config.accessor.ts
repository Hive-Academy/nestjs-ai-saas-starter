import type { WorkflowEngineModuleOptions } from '../workflow-engine.module';

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
export function getWorkflowEngineConfigWithDefaults(): Required<WorkflowEngineModuleOptions> {
  const config = getWorkflowEngineConfig();

  return {
    cache: {
      enabled: config.cache?.enabled ?? true,
      maxSize: config.cache?.maxSize ?? 1000,
      ttl: config.cache?.ttl ?? 300000, // 5 minutes
    },
    debug: config.debug ?? false,
  };
}
