import type { HitlModuleOptions } from '../hitl.module';

/**
 * Global storage for HITL module configuration
 * Set when HitlModule.forRoot() is called
 */
let storedHitlConfig: HitlModuleOptions = {};

/**
 * Store HITL configuration for decorator access
 * Called by HitlModule.forRoot()
 */
export function setHitlConfig(config: HitlModuleOptions): void {
  storedHitlConfig = { ...config };
}

/**
 * Get stored HITL configuration for decorators
 * Returns the config passed to HitlModule.forRoot()
 */
export function getHitlConfig(): HitlModuleOptions {
  return storedHitlConfig;
}

/**
 * Get HITL config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getHitlConfigWithDefaults(): Required<HitlModuleOptions> {
  const config = getHitlConfig();

  return {
    defaultTimeout: config.defaultTimeout ?? 1800000, // 30 minutes default
    confidenceThreshold: config.confidenceThreshold ?? 0.7, // 70% confidence default
  };
}
