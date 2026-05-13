import type { WorkflowEngineModuleOptions } from '../../interfaces/functional/module-options.interface';

/**
 * Global storage for functional API module configuration
 * Set when FunctionalApiModule.forRoot() is called
 */
let storedFunctionalApiConfig: WorkflowEngineModuleOptions | null = null;

/**
 * Store functional API configuration for decorator access
 * Called by FunctionalApiModule.forRoot()
 */
export function setFunctionalApiConfig(
  config: WorkflowEngineModuleOptions
): void {
  storedFunctionalApiConfig = { ...config };
}

/**
 * Get stored functional API configuration for decorators
 * Returns the config passed to FunctionalApiModule.forRoot()
 */
export function getFunctionalApiConfig(): WorkflowEngineModuleOptions {
  return storedFunctionalApiConfig || {};
}

/**
 * Get functional API config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getFunctionalApiConfigWithDefaults(): Required<
  Omit<WorkflowEngineModuleOptions, 'checkpointer'>
> &
  Pick<WorkflowEngineModuleOptions, 'checkpointer'> {
  const config = getFunctionalApiConfig();

  return {
    compilation: config.compilation ?? {},
    debugging: config.debugging ?? {},
    execution: config.execution ?? {},
    llm: config.llm ?? {},
    tools: config.tools ?? [],
    checkpointer: config.checkpointer,
  };
}
