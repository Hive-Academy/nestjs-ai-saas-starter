import { Module, DynamicModule, Global } from '@nestjs/common';
import { TokenStreamingService } from './services/token-streaming.service';
// AutoInitTokenStreamingService removed - functionality merged into TokenStreamingService
import { EventStreamProcessorService } from './services/event-stream-processor.service';
import { WebSocketBridgeService } from './services/websocket-bridge.service';
import { StreamingWebSocketService } from './services/streaming-websocket.service';
import { WebSocketGatewayConfig } from './interfaces/websocket-gateway.interface';
import { setStreamingConfig } from './utils/streaming-config.accessor';
import { StreamingAuthService } from './services/streaming-auth.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { StreamingServiceAdapter } from './adapters/streaming-service.adapter';
// No longer importing token - using adapter pattern instead
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
      // Core services - direct injection without adapters
      TokenStreamingService,
      EventStreamProcessorService,
      WebSocketBridgeService,
      StreamingAuthService,
      RateLimiterService,
      {
        provide: 'STREAMING_OPTIONS',
        useValue: options || {},
      },
      // Streaming adapter - bridges streaming module to core interface
      StreamingServiceAdapter,
      {
        provide: 'IStreamingService',
        useExisting: StreamingServiceAdapter,
      },

      // No longer providing token - using adapter pattern in app module
    ];

    const exports: any[] = [
      // Core services - direct exports
      TokenStreamingService,
      EventStreamProcessorService,
      WebSocketBridgeService,
      StreamingAuthService,
      RateLimiterService,
      'IStreamingService',
      // No longer exporting token - using adapter pattern in app module
    ];

    // Add WebSocket service if enabled - REFACTORED to use new clean service
    const gatewayEnabled =
      options?.gateway?.enabled ?? options?.websocket?.enabled ?? false;

    if (gatewayEnabled) {
      providers.push(
        StreamingWebSocketService,
        {
          provide: 'WEBSOCKET_GATEWAY_CONFIG',
          useValue: {
            enabled: gatewayEnabled,
            port: options?.websocket?.port,
            ...options?.gateway,
          },
        },
        {
          provide: 'StreamingWebSocketService',
          useExisting: StreamingWebSocketService,
        }
      );

      exports.push(StreamingWebSocketService);
    }

    return {
      module: StreamingModule,
      imports: [], // EventEmitter provided globally by app.module with maxListeners: 20
      providers,
      exports,
      global: true, // Make streaming services globally available
    };
  }
}
