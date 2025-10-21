import type { StreamingModuleOptions } from '@hive-academy/langgraph-streaming';

/**
 * Modular Streaming Configuration
 *
 * Extracted from centralized 271-line config - Part of Phase 3 Subtask 3.3
 * Reduces configuration complexity by 90%+
 */
export const getStreamingConfig = (): StreamingModuleOptions => ({
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
    port: parseInt(process.env.WEBSOCKET_PORT || '3000', 10),
  },
  defaultBufferSize: parseInt(process.env.STREAMING_BUFFER_SIZE || '1000', 10),
  // Enable WebSocket gateway with comprehensive configuration
  gateway: {
    enabled: process.env.WEBSOCKET_GATEWAY_ENABLED !== 'false',
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    },
    websocket: {
      maxConnections: parseInt(
        process.env.MAX_WEBSOCKET_CONNECTIONS || '1000',
        10
      ),
      connectionTimeout: parseInt(
        process.env.WEBSOCKET_CONNECTION_TIMEOUT || '30000',
        10
      ),
      heartbeatInterval: parseInt(
        process.env.WEBSOCKET_HEARTBEAT_INTERVAL || '25000',
        10
      ),
      compression: process.env.WEBSOCKET_COMPRESSION !== 'false',
    },
    auth: {
      required: process.env.WEBSOCKET_AUTH_REQUIRED === 'true',
      jwtSecret: process.env.JWT_SECRET,
    },
    rateLimit: {
      max: parseInt(process.env.WEBSOCKET_RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(
        process.env.WEBSOCKET_RATE_LIMIT_WINDOW || '60000',
        10
      ),
    },
  },
});
