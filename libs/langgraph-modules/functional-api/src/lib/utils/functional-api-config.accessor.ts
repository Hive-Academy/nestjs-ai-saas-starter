import type { FunctionalApiModuleOptions } from '../interfaces/module-options.interface';

/**
 * Global storage for functional API module configuration
 * Set when FunctionalApiModule.forRoot() is called
 */
let storedFunctionalApiConfig: FunctionalApiModuleOptions = {};

/**
 * Store functional API configuration for decorator access
 * Called by FunctionalApiModule.forRoot()
 */
export function setFunctionalApiConfig(
  config: FunctionalApiModuleOptions
): void {
  storedFunctionalApiConfig = { ...config };
}

/**
 * Get stored functional API configuration for decorators
 * Returns the config passed to FunctionalApiModule.forRoot()
 */
export function getFunctionalApiConfig(): FunctionalApiModuleOptions {
  return storedFunctionalApiConfig;
}

/**
 * Get functional API config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getFunctionalApiConfigWithDefaults(): Required<
  Omit<FunctionalApiModuleOptions, 'checkpointAdapter'>
> &
  Pick<FunctionalApiModuleOptions, 'checkpointAdapter'> {
  const config = getFunctionalApiConfig();

  return {
    workflows: config.workflows ?? [],
    defaultTimeout: config.defaultTimeout ?? 30000,
    defaultRetryCount: config.defaultRetryCount ?? 3,
    enableCheckpointing: config.enableCheckpointing ?? true,
    checkpointInterval: config.checkpointInterval ?? 5000,
    enableStreaming: config.enableStreaming ?? false,
    maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
    enableCycleDetection: config.enableCycleDetection ?? true,
    globalMetadata: config.globalMetadata ?? {},
    checkpointAdapter: config.checkpointAdapter,
  };
}
