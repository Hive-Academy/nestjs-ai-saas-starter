import { Module, DynamicModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TokenStreamingService } from './services/token-streaming.service';
import { EventStreamProcessorService } from './services/event-stream-processor.service';
import { WebSocketBridgeService } from './services/websocket-bridge.service';
import { StreamingWebSocketGateway } from './services/streaming-websocket-gateway.service';
import { WebSocketGatewayConfig } from './interfaces/websocket-gateway.interface';
import { setStreamingConfig } from './utils/streaming-config.accessor';
// WorkflowStreamService moved to workflow-engine module to avoid circular dependency

export interface StreamingModuleOptions {
  websocket?: {
    enabled: boolean;
    port?: number;
  };
  defaultBufferSize?: number;
  /** WebSocket gateway configuration */
  gateway?: WebSocketGatewayConfig;
}

@Module({})
export class StreamingModule {
  static forRoot(options?: StreamingModuleOptions): DynamicModule {
    // Store config for decorator access
    const config = options || {};
    setStreamingConfig(config);

    const providers: any[] = [
      TokenStreamingService,
      EventStreamProcessorService,
      WebSocketBridgeService,
      {
        provide: 'STREAMING_OPTIONS',
        useValue: options || {},
      },
    ];

    const exports: any[] = [
      TokenStreamingService,
      EventStreamProcessorService,
      WebSocketBridgeService,
    ];

    // Add WebSocket gateway if enabled and configured
    const gatewayEnabled =
      options?.gateway?.enabled ?? options?.websocket?.enabled ?? false;

    if (gatewayEnabled) {
      providers.push(StreamingWebSocketGateway, {
        provide: 'WEBSOCKET_GATEWAY_CONFIG',
        useValue: {
          enabled: gatewayEnabled,
          port: options?.websocket?.port,
          ...options?.gateway,
        },
      });

      exports.push(StreamingWebSocketGateway);
    }

    return {
      module: StreamingModule,
      imports: [
        EventEmitterModule.forRoot({
          // Set this to `true` to use wildcards
          wildcard: false,
          // The delimiter used to segment namespaces
          delimiter: '.',
          // Set this to `true` if you want to emit the newListener event
          newListener: false,
          // Set this to `true` if you want to emit the removeListener event
          removeListener: false,
          // The maximum amount of listeners that can be assigned to an event
          maxListeners: 10,
          // Show event name in memory leak message when more than maximum amount of listeners are assigned
          verboseMemoryLeak: false,
          // Disable throwing uncaughtException if an error event is emitted and it has no listeners
          ignoreErrors: false,
        }),
      ],
      providers,
      exports,
    };
  }
}
