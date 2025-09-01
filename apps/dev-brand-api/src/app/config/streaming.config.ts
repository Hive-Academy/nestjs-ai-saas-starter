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
    port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
  },
  defaultBufferSize: parseInt(process.env.STREAMING_BUFFER_SIZE || '1000', 10),
});
