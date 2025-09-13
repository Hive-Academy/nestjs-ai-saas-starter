import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { EventStreamProcessorService } from './services/event-stream-processor.service';
import { StreamingWebSocketGateway } from './services/streaming-websocket-gateway.service';
import { TokenStreamingService } from './services/token-streaming.service';
import { WebSocketBridgeService } from './services/websocket-bridge.service';
import {
  StreamingModule,
  type StreamingModuleOptions,
} from './streaming.module';

describe('StreamingModule', () => {
  describe('Backward Compatibility', () => {
    it('should work with legacy configuration (no gateway)', async () => {
      const legacyConfig: StreamingModuleOptions = {
        websocket: {
          enabled: true,
          port: 3000,
        },
        defaultBufferSize: 1000,
      };

      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot(legacyConfig)],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      // Should have core services
      expect(moduleRef.get(TokenStreamingService)).toBeDefined();
      expect(moduleRef.get(EventStreamProcessorService)).toBeDefined();
      expect(moduleRef.get(WebSocketBridgeService)).toBeDefined();

      // Should NOT have gateway service (not enabled)
      expect(() => moduleRef.get(StreamingWebSocketGateway)).toThrow();

      // Should have streaming options
      const options = moduleRef.get('STREAMING_OPTIONS');
      expect(options).toEqual(legacyConfig);
    });

    it('should work with minimal configuration', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot()],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      // Should have core services
      expect(moduleRef.get(TokenStreamingService)).toBeDefined();
      expect(moduleRef.get(EventStreamProcessorService)).toBeDefined();
      expect(moduleRef.get(WebSocketBridgeService)).toBeDefined();

      // Should NOT have gateway service (not enabled)
      expect(() => moduleRef.get(StreamingWebSocketGateway)).toThrow();

      // Should have default options
      const options = moduleRef.get('STREAMING_OPTIONS');
      expect(options).toEqual({});
    });
  });

  describe('Gateway Integration', () => {
    it('should register gateway when enabled via websocket.enabled', async () => {
      const config: StreamingModuleOptions = {
        websocket: {
          enabled: true,
          port: 3000,
        },
        defaultBufferSize: 1000,
      };

      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot(config)],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      // Should have core services
      expect(moduleRef.get(TokenStreamingService)).toBeDefined();
      expect(moduleRef.get(EventStreamProcessorService)).toBeDefined();
      expect(moduleRef.get(WebSocketBridgeService)).toBeDefined();

      // Should have gateway service (enabled via websocket.enabled)
      expect(moduleRef.get(StreamingWebSocketGateway)).toBeDefined();

      // Should have gateway config
      const gatewayConfig = moduleRef.get('WEBSOCKET_GATEWAY_CONFIG');
      expect(gatewayConfig.enabled).toBe(true);
      expect(gatewayConfig.port).toBe(3000);
    });

    it('should register gateway when enabled via gateway.enabled', async () => {
      const config: StreamingModuleOptions = {
        websocket: {
          enabled: false, // Legacy disabled
          port: 3000,
        },
        gateway: {
          enabled: true, // New gateway enabled
          websocket: {
            maxConnections: 500,
          },
        },
        defaultBufferSize: 1000,
      };

      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot(config)],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      // Should have core services
      expect(moduleRef.get(TokenStreamingService)).toBeDefined();
      expect(moduleRef.get(EventStreamProcessorService)).toBeDefined();
      expect(moduleRef.get(WebSocketBridgeService)).toBeDefined();

      // Should have gateway service (enabled via gateway.enabled)
      expect(moduleRef.get(StreamingWebSocketGateway)).toBeDefined();

      // Should have merged gateway config
      const gatewayConfig = moduleRef.get('WEBSOCKET_GATEWAY_CONFIG');
      expect(gatewayConfig.enabled).toBe(true);
      expect(gatewayConfig.port).toBe(3000);
      expect(gatewayConfig.websocket.maxConnections).toBe(500);
    });

    it('should not register gateway when disabled', async () => {
      const config: StreamingModuleOptions = {
        websocket: {
          enabled: false,
          port: 3000,
        },
        gateway: {
          enabled: false,
        },
        defaultBufferSize: 1000,
      };

      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot(config)],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      // Should have core services
      expect(moduleRef.get(TokenStreamingService)).toBeDefined();
      expect(moduleRef.get(EventStreamProcessorService)).toBeDefined();
      expect(moduleRef.get(WebSocketBridgeService)).toBeDefined();

      // Should NOT have gateway service (explicitly disabled)
      expect(() => moduleRef.get(StreamingWebSocketGateway)).toThrow();
    });
  });

  describe('Configuration Priority', () => {
    it('should prioritize gateway.enabled over websocket.enabled', async () => {
      const config: StreamingModuleOptions = {
        websocket: {
          enabled: true, // Legacy enabled
          port: 3000,
        },
        gateway: {
          enabled: false, // New gateway explicitly disabled
        },
        defaultBufferSize: 1000,
      };

      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot(config)],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      // Should NOT have gateway service (gateway.enabled takes priority)
      expect(() => moduleRef.get(StreamingWebSocketGateway)).toThrow();
    });

    it('should merge configuration properly', async () => {
      const config: StreamingModuleOptions = {
        websocket: {
          enabled: true,
          port: 3000,
        },
        gateway: {
          enabled: true,
          websocket: {
            maxConnections: 500,
            heartbeatInterval: 30000,
          },
          auth: {
            required: true,
            jwtSecret: 'test-secret',
          },
        },
      };

      const moduleRef = await Test.createTestingModule({
        imports: [StreamingModule.forRoot(config)],
        providers: [
          {
            provide: EventEmitter2,
            useValue: { emit: jest.fn() },
          },
        ],
      }).compile();

      const gatewayConfig = moduleRef.get('WEBSOCKET_GATEWAY_CONFIG');

      // Should have merged configuration
      expect(gatewayConfig.enabled).toBe(true);
      expect(gatewayConfig.port).toBe(3000); // From websocket config
      expect(gatewayConfig.websocket.maxConnections).toBe(500); // From gateway config
      expect(gatewayConfig.websocket.heartbeatInterval).toBe(30000); // From gateway config
      expect(gatewayConfig.auth.required).toBe(true); // From gateway config
      expect(gatewayConfig.auth.jwtSecret).toBe('test-secret'); // From gateway config
    });
  });
});
