import type { Provider } from '@nestjs/common';
import { WorkflowStreamService } from '../streaming/workflow-stream.service';
import { TokenStreamingService } from '../streaming/token-streaming.service';
import { WebSocketBridgeService } from '../streaming/websocket-bridge.service';
import { STREAM_MANAGER } from '../constants';

/**
 * Streaming service providers for the LangGraph module
 */
export function createStreamingProviders(): Provider[] {
  return [
    WorkflowStreamService,
    TokenStreamingService,
    // StreamTransformerService,
    WebSocketBridgeService,
    // StreamBufferService,
    {
      provide: STREAM_MANAGER,
      useClass: WorkflowStreamService,
    },
  ];
}

/**
 * Streaming service exports for the LangGraph module
 */
export const STREAMING_EXPORTS = [
  WorkflowStreamService,
  TokenStreamingService,
  WebSocketBridgeService,
];
