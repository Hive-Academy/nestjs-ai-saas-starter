import type { StreamingModuleOptions } from '../streaming.module';

/**
 * Global storage for streaming module configuration
 * Set when StreamingModule.forRoot() is called
 */
let storedStreamingConfig: StreamingModuleOptions = {};

/**
 * Store streaming configuration for decorator access
 * Called by StreamingModule.forRoot()
 */
export function setStreamingConfig(config: StreamingModuleOptions): void {
  storedStreamingConfig = { ...config };
}

/**
 * Get stored streaming configuration for decorators
 * Returns the config passed to StreamingModule.forRoot()
 */
export function getStreamingConfig(): StreamingModuleOptions {
  return storedStreamingConfig;
}

/**
 * Get streaming config with safe defaults
 * Used by decorators to inherit module configuration
 */
export function getStreamingConfigWithDefaults(): Required<StreamingModuleOptions> {
  const config = getStreamingConfig();

  return {
    websocket: {
      enabled: config.websocket?.enabled ?? true,
      port: config.websocket?.port ?? 3000,
    },
    defaultBufferSize: config.defaultBufferSize ?? 1000,
    gateway: {
      enabled: config.gateway?.enabled ?? true,
      cors: config.gateway?.cors ?? { origin: true, credentials: true },
      websocket: {
        maxConnections: config.gateway?.websocket?.maxConnections ?? 1000,
        connectionTimeout:
          config.gateway?.websocket?.connectionTimeout ?? 30000,
        heartbeatInterval:
          config.gateway?.websocket?.heartbeatInterval ?? 25000,
        compression: config.gateway?.websocket?.compression ?? false,
      },
      auth: {
        required: config.gateway?.auth?.required ?? false,
        jwtSecret: config.gateway?.auth?.jwtSecret,
      },
      rateLimit: {
        max: config.gateway?.rateLimit?.max ?? 100,
        windowMs: config.gateway?.rateLimit?.windowMs ?? 60000,
      },
      ...config.gateway,
    },
  };
}
