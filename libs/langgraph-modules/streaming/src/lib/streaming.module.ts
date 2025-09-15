import { Module, DynamicModule, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TokenStreamingService } from './services/token-streaming.service';
import { AutoInitTokenStreamingService } from './services/auto-init-token-streaming.service';
import { EventStreamProcessorService } from './services/event-stream-processor.service';
import { WebSocketBridgeService } from './services/websocket-bridge.service';
import { StreamingWebSocketGateway } from './services/streaming-websocket-gateway.service';
import { WebSocketGatewayConfig } from './interfaces/websocket-gateway.interface';
import { setStreamingConfig } from './utils/streaming-config.accessor';
import { StreamingAuthService } from './services/streaming-auth.service';
import { RateLimiterService } from './services/rate-limiter.service';
import {
  StreamingServiceAdapter,
  TokenStreamingServiceAdapter,
  EventStreamProcessorServiceAdapter,
  WebSocketBridgeServiceAdapter,
} from './adapters/streaming-service.adapter';
import {
  STREAMING_SERVICE_TOKEN,
  TOKEN_STREAMING_SERVICE_TOKEN,
  EVENT_STREAM_PROCESSOR_SERVICE_TOKEN,
  WEBSOCKET_BRIDGE_SERVICE_TOKEN,
} from '@hive-academy/langgraph-core';
// WorkflowStreamService moved to workflow-engine module to avoid circular dependency

export interface StreamingModuleOptions {
  websocket?: {
    enabled: boolean;
    port?: number;
  };
  defaultBufferSize?: number;
  /** WebSocket gateway configuration */
  gateway?: WebSocketGatewayConfig;
  /** When true, non-canonical nodeIds should cause errors instead of warnings */
  strictNaming?: boolean;
}

@Global()
@Module({})
export class StreamingModule {
  static forRoot(options?: StreamingModuleOptions): DynamicModule {
    // Store config for decorator access
    const config = options || {};
    // Store including strictNaming flag (default handling occurs in accessor)
    setStreamingConfig(config);

    const providers: any[] = [
      // Concrete implementations
      TokenStreamingService, // inner concrete service
      AutoInitTokenStreamingService, // wrapper providing lazy auto-init
      EventStreamProcessorService,
      WebSocketBridgeService,
      StreamingAuthService,
      RateLimiterService,
      {
        provide: 'STREAMING_OPTIONS',
        useValue: options || {},
      },

      // Adapters for DI pattern
      StreamingServiceAdapter,
      TokenStreamingServiceAdapter,
      EventStreamProcessorServiceAdapter,
      WebSocketBridgeServiceAdapter,

      // Interface tokens - expose auto-init variant via TOKEN_STREAMING_SERVICE_TOKEN while keeping concrete available for wrapper injection
      {
        provide: STREAMING_SERVICE_TOKEN,
        useExisting: StreamingServiceAdapter, // adapter as facade for full streaming API
      },
      {
        provide: TOKEN_STREAMING_SERVICE_TOKEN,
        useExisting: AutoInitTokenStreamingService, // now resolves to auto-init wrapper
      },
      {
        provide: EVENT_STREAM_PROCESSOR_SERVICE_TOKEN,
        useExisting: EventStreamProcessorService,
      },
      {
        provide: WEBSOCKET_BRIDGE_SERVICE_TOKEN,
        useExisting: WebSocketBridgeService,
      },
    ];

    const exports: any[] = [
      // Concrete services
      AutoInitTokenStreamingService,
      TokenStreamingService,
      EventStreamProcessorService,
      WebSocketBridgeService,
      StreamingAuthService,
      RateLimiterService,

      // Adapters
      StreamingServiceAdapter,
      TokenStreamingServiceAdapter,
      EventStreamProcessorServiceAdapter,
      WebSocketBridgeServiceAdapter,

      // Export interface tokens for consumer injection
      STREAMING_SERVICE_TOKEN,
      TOKEN_STREAMING_SERVICE_TOKEN,
      EVENT_STREAM_PROCESSOR_SERVICE_TOKEN,
      WEBSOCKET_BRIDGE_SERVICE_TOKEN,
    ];

    // Add WebSocket gateway if enabled and configured
    const gatewayEnabled =
      options?.gateway?.enabled ?? options?.websocket?.enabled ?? false;

    if (gatewayEnabled) {
      providers.push(
        StreamingWebSocketGateway,
        {
          provide: 'WEBSOCKET_GATEWAY_CONFIG',
          useValue: {
            enabled: gatewayEnabled,
            port: options?.websocket?.port,
            ...options?.gateway,
          },
        },
        {
          provide: 'StreamingWebSocketGateway',
          useExisting: StreamingWebSocketGateway,
        }
      );

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
      global: true, // Make streaming services globally available
    };
  }
}
