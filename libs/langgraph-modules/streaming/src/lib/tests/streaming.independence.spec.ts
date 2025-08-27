import { Test, type TestingModule } from '@nestjs/testing';
import { StreamingModule } from '../streaming.module';

describe('Streaming Module Independence Tests', () => {
  describe('Standalone Module Loading', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should load module independently without any external dependencies', async () => {
      // Test that the module can be imported and initialized without any core services
      module = await Test.createTestingModule({
        imports: [
          StreamingModule.forRoot({
            enabled: true,
            bufferSize: 1024,
            flushInterval: 100,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(StreamingModule)).toBeDefined();
    });

    it('should work with minimal configuration', async () => {
      module = await Test.createTestingModule({
        imports: [StreamingModule.forRoot({})],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should initialize quickly in standalone mode', async () => {
      const startTime = Date.now();

      module = await Test.createTestingModule({
        imports: [
          StreamingModule.forRoot({
            enabled: true,
            bufferSize: 512,
          }),
        ],
      }).compile();

      const initTime = Date.now() - startTime;

      // Should initialize very quickly for streaming module
      expect(initTime).toBeLessThan(50);
      expect(module).toBeDefined();
    });
  });

  describe('Direct Import Pattern', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should work with direct import without core library', async () => {
      // This tests that streaming can work completely independently
      module = await Test.createTestingModule({
        imports: [
          StreamingModule.forRoot({
            enabled: true,
            bufferSize: 1024,
            flushInterval: 100,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();

      // Should be able to get streaming services
      const streamingModule = module.get(StreamingModule);
      expect(streamingModule).toBeDefined();
    });

    it('should handle configuration gracefully', async () => {
      const configs = [
        {},
        { enabled: true },
        { enabled: false },
        { bufferSize: 2048 },
        { flushInterval: 200 },
        { enabled: true, bufferSize: 1024, flushInterval: 100 },
      ];

      for (const config of configs) {
        const testModule = await Test.createTestingModule({
          imports: [StreamingModule.forRoot(config)],
        }).compile();

        expect(testModule).toBeDefined();
        await testModule.close();
      }
    });
  });

  describe('Resource Management', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should have minimal resource usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      module = await Test.createTestingModule({
        imports: [
          StreamingModule.forRoot({
            enabled: true,
            bufferSize: 1024,
            flushInterval: 100,
          }),
        ],
      }).compile();

      const memoryAfterInit = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfterInit - initialMemory;

      // Streaming should be very lightweight (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
      expect(module).toBeDefined();
    });

    it('should clean up resources properly', async () => {
      module = await Test.createTestingModule({
        imports: [
          StreamingModule.forRoot({
            enabled: true,
            bufferSize: 1024,
            flushInterval: 100,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();

      // Should close without errors
      await expect(module.close()).resolves.not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should accept various configuration patterns', async () => {
      const testCases = [
        // Empty config
        {},
        // Minimal config
        { enabled: true },
        // Full config
        {
          enabled: true,
          bufferSize: 2048,
          flushInterval: 200,
          maxConcurrentStreams: 10,
          compressionEnabled: false,
        },
        // Disabled streaming
        { enabled: false },
        // Large buffer
        { bufferSize: 16384 },
        // Fast flush
        { flushInterval: 10 },
      ];

      for (const config of testCases) {
        const module = await Test.createTestingModule({
          imports: [StreamingModule.forRoot(config)],
        }).compile();

        expect(module).toBeDefined();
        await module.close();
      }
    });

    it('should provide reasonable defaults', async () => {
      const module = await Test.createTestingModule({
        imports: [StreamingModule.forRoot({})],
      }).compile();

      expect(module).toBeDefined();

      // Should work with no explicit configuration
      const streamingModule = module.get(StreamingModule);
      expect(streamingModule).toBeDefined();

      await module.close();
    });
  });
});
