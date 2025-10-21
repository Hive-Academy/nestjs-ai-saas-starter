// Module
export * from './lib/streaming.module';

// Config utilities for decorator access
export * from './lib/utils/streaming-config.accessor';

// Direct service exports - no more adapter pattern confusion
export * from './lib/services/token-streaming.service';
export * from './lib/services/websocket-bridge.service';
export * from './lib/services/event-stream-processor.service';
export * from './lib/services/streaming-websocket.service';

// Adapter for core interface compatibility
export * from './lib/adapters/streaming-service.adapter';

// User-controlled initialization pattern
export * from './lib/interfaces/streaming-manager.interface';

// Decorators - explicit exports to avoid duplicates
export {
  StreamToken,
  StreamEvent,
  StreamProgress,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
  STREAM_TOKEN_METADATA_KEY,
  STREAM_EVENT_METADATA_KEY,
  STREAM_PROGRESS_METADATA_KEY,
} from './lib/decorators/streaming.decorator';

// Export decorator metadata types and options
export type {
  StreamTokenOptions,
  StreamTokenDecoratorMetadata,
  StreamEventOptions,
  StreamEventDecoratorMetadata,
  StreamProgressOptions,
  StreamProgressDecoratorMetadata,
} from './lib/decorators/streaming.decorator';

// Interfaces and constants
export { StreamEventType } from './lib/constants';
export type {
  StreamUpdate,
  StreamMetadata,
  StreamContext,
  TokenData,
} from './lib/interfaces/streaming.interface';

// WebSocket Gateway Interfaces
export type {
  WebSocketGatewayConfig,
  WebSocketConnection,
  WebSocketMessage,
  SubscribeExecutionPayload,
  SubscribeEventsPayload,
  JoinRoomPayload,
  StreamUpdatePayload,
  ConnectionStatusPayload,
  ExecutionStatusPayload,
  AuthenticationPayload,
  ErrorPayload,
  WebSocketGatewayEvents,
  WebSocketGatewayStats,
} from './lib/interfaces/websocket-gateway.interface';

export { WebSocketMessageType } from './lib/interfaces/websocket-gateway.interface';

// Export metadata types (what workflow-engine expects)
export type {
  StreamTokenMetadata,
  StreamEventMetadata,
  StreamProgressMetadata,
} from './lib/interfaces/streaming.interface';

// Export helper functions for creating metadata objects (runtime creation)
export {
  getStreamTokenMetadata as createStreamTokenMetadata,
  getStreamEventMetadata as createStreamEventMetadata,
  getStreamProgressMetadata as createStreamProgressMetadata,
} from './lib/interfaces/streaming.interface';

// Constants
export * from './lib/constants';

export * from './lib/services/streaming-websocket.service';
