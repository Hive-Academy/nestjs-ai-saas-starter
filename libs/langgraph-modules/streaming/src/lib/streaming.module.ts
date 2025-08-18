import { Module, DynamicModule } from '@nestjs/common';
import { TokenStreamingService } from './services/token-streaming.service';
import { EventStreamProcessorService } from './services/event-stream-processor.service';
import { WebSocketBridgeService } from './services/websocket-bridge.service';
// WorkflowStreamService moved to workflow-engine module to avoid circular dependency

export interface StreamingModuleOptions {
  websocket?: {
    enabled: boolean;
    port?: number;
  };
  defaultBufferSize?: number;
}

@Module({})
export class StreamingModule {
  static forRoot(options?: StreamingModuleOptions): DynamicModule {
    return {
      module: StreamingModule,
      providers: [
        TokenStreamingService,
        EventStreamProcessorService,
        WebSocketBridgeService,
        {
          provide: 'STREAMING_OPTIONS',
          useValue: options || {},
        },
      ],
      exports: [
        TokenStreamingService,
        EventStreamProcessorService,
        WebSocketBridgeService,
      ],
    };
  }
}
