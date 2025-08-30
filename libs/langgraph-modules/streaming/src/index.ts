// Module
export { StreamingModule } from './lib/streaming.module';

// Services
export { TokenStreamingService } from './lib/services/token-streaming.service';
export { EventStreamProcessorService } from './lib/services/event-stream-processor.service';
export { WebSocketBridgeService } from './lib/services/websocket-bridge.service';
// WorkflowStreamService moved to workflow-engine module to avoid circular dependency

// Decorators
export * from './lib/decorators/streaming.decorator';

// Interfaces
export type {
  StreamUpdate,
  StreamMetadata,
  StreamContext,
  TokenData
} from './lib/interfaces/streaming.interface';

// Export interface metadata types (for creating metadata objects)
export type {
  StreamTokenMetadata as StreamTokenMetadataInterface,
  StreamEventMetadata as StreamEventMetadataInterface,
  StreamProgressMetadata as StreamProgressMetadataInterface
} from './lib/interfaces/streaming.interface';

// Export decorator metadata types (what workflow-engine expects)
export type {
  StreamTokenMetadata,
  StreamEventMetadata,
  StreamProgressMetadata
} from './lib/decorators/streaming.decorator';

export {
  StreamEventType
} from './lib/interfaces/streaming.interface';

// Export helper functions for creating metadata (renamed to avoid conflict)
export {
  getStreamTokenMetadata as createStreamTokenMetadata,
  getStreamEventMetadata as createStreamEventMetadata,
  getStreamProgressMetadata as createStreamProgressMetadata
} from './lib/interfaces/streaming.interface';

// Export decorator metadata retrieval functions (what workflow-engine expects)
export {
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata
} from './lib/decorators/streaming.decorator';

// Constants
export * from './lib/constants';
