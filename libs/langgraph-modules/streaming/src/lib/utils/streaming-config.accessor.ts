import type { StreamingModuleOptions } from '../streaming.module';

/**
 * Extended runtime config shape injected by module. We augment original StreamingModuleOptions
 * (non-breaking, since backward compatibility not required) with additional streaming defaults.
 */
export interface ResolvedStreamingRuntimeConfig
  extends Required<StreamingModuleOptions> {
  strictNaming: boolean; // resolved flag (default false)
  tokenDefaults: {
    batchSize: number;
    flushInterval: number;
    format: 'text' | 'structured';
  };
  eventDefaults: {
    batchSize: number;
    delivery: 'at-least-once' | 'at-most-once';
  };
  progressDefaults: {
    interval: number;
    granularity: 'fine' | 'coarse';
  };
}

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
export function getStreamingConfigWithDefaults(): ResolvedStreamingRuntimeConfig {
  const config = getStreamingConfig();

  return {
    strictNaming: config.strictNaming ?? false,
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
    tokenDefaults: {
      batchSize: (config as any)?.tokenDefaults?.batchSize ?? 10,
      flushInterval: (config as any)?.tokenDefaults?.flushInterval ?? 100,
      format: (config as any)?.tokenDefaults?.format ?? 'text',
    },
    eventDefaults: {
      batchSize: (config as any)?.eventDefaults?.batchSize ?? 10,
      delivery: (config as any)?.eventDefaults?.delivery ?? 'at-least-once',
    },
    progressDefaults: {
      interval: (config as any)?.progressDefaults?.interval ?? 1000,
      granularity: (config as any)?.progressDefaults?.granularity ?? 'fine',
    },
  };
}
