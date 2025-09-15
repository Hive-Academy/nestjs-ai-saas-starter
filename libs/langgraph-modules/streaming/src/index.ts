// Module
export * from './lib/streaming.module';

// Config utilities for decorator access
export * from './lib/utils/streaming-config.accessor';

// NOTE: Direct concrete service exports intentionally removed to enforce
// interface + token based DI pattern. Consumers must inject via tokens
// from @hive-academy/langgraph-core (STREAMING_SERVICE_TOKEN, etc.).
// The underlying services remain internal implementation details.

// (WorkflowStreamService previously moved to workflow-engine module to avoid circular dependency)

// Adapters for DI pattern
export * from './lib/adapters/streaming-service.adapter';

// Decorators
export * from './lib/decorators/streaming.decorator';

// Export decorator metadata types
export type {
  StreamTokenDecoratorMetadata,
  StreamEventDecoratorMetadata,
  StreamProgressDecoratorMetadata,
} from './lib/decorators/streaming.decorator';

// Interfaces
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

export { StreamEventType } from './lib/interfaces/streaming.interface';

// Export helper functions for creating metadata objects (runtime creation)
export {
  getStreamTokenMetadata as createStreamTokenMetadata,
  getStreamEventMetadata as createStreamEventMetadata,
  getStreamProgressMetadata as createStreamProgressMetadata,
} from './lib/interfaces/streaming.interface';

// Export decorator-based metadata functions (what workflow-engine expects)
export {
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
} from './lib/decorators/streaming.decorator';

// Constants
export * from './lib/constants';

export * from './lib/services/streaming-websocket-gateway.service'
