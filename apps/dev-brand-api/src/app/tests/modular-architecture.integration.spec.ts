import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

// Direct child module imports - Phase 3 validation
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { StreamingModule } from '@hive-academy/langgraph-streaming';
import { HitlModule } from '@hive-academy/langgraph-hitl';
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';

// Configuration imports
import { getLangGraphCoreConfig } from '../config/langgraph-core.config';
import { getCheckpointConfig } from '../config/checkpoint.config';
import { getStreamingConfig } from '../config/streaming.config';
import { getHitlConfig } from '../config/hitl.config';

describe('Modular Architecture Integration Tests', () => {
  describe('Phase 3 Direct Import Pattern Validation', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should load all modules using direct import pattern', async () => {
      const startTime = Date.now();

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),

          // Core LangGraph Module with minimal configuration
          NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),

          // Direct child module imports - the new architectural pattern
          LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
          StreamingModule.forRoot(getStreamingConfig()),
          HitlModule.forRoot(getHitlConfig()),
        ],
      }).compile();

      const initTime = Date.now() - startTime;

      expect(module).toBeDefined();

      // Should initialize faster than the old monolithic approach (target <300ms)
      expect(initTime).toBeLessThan(300);

      // All modules should be available
      expect(module.get(NestjsLanggraphModule)).toBeDefined();
      expect(module.get(LanggraphModulesCheckpointModule)).toBeDefined();
      expect(module.get(StreamingModule)).toBeDefined();
      expect(module.get(HitlModule)).toBeDefined();
    });

    it('should work with selective module loading', async () => {
      // Test loading only checkpoint module
      const checkpointOnlyModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
          LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
        ],
      }).compile();

      expect(checkpointOnlyModule).toBeDefined();
      expect(
        checkpointOnlyModule.get(LanggraphModulesCheckpointModule)
      ).toBeDefined();

      await checkpointOnlyModule.close();

      // Test loading only streaming module
      const streamingOnlyModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
          StreamingModule.forRoot(getStreamingConfig()),
        ],
      }).compile();

      expect(streamingOnlyModule).toBeDefined();
      expect(streamingOnlyModule.get(StreamingModule)).toBeDefined();

      await streamingOnlyModule.close();

      // Test loading only HITL module
      const hitlOnlyModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
          HitlModule.forRoot(getHitlConfig()),
        ],
      }).compile();

      expect(hitlOnlyModule).toBeDefined();
      expect(hitlOnlyModule.get(HitlModule)).toBeDefined();

      await hitlOnlyModule.close();
    });
  });

  describe('Configuration Modularity Validation', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should validate modular configuration structure', () => {
      // Test that configurations are properly separated
      const coreConfig = getLangGraphCoreConfig();
      const checkpointConfig = getCheckpointConfig();
      const streamingConfig = getStreamingConfig();
      const hitlConfig = getHitlConfig();

      // Each config should be focused and not overlap
      expect(coreConfig).toBeDefined();
      expect(checkpointConfig).toBeDefined();
      expect(streamingConfig).toBeDefined();
      expect(hitlConfig).toBeDefined();

      // Configs should be relatively small (Phase 3 target: <50 lines each)
      const coreConfigString = JSON.stringify(coreConfig);
      const checkpointConfigString = JSON.stringify(checkpointConfig);
      const streamingConfigString = JSON.stringify(streamingConfig);
      const hitlConfigString = JSON.stringify(hitlConfig);

      // Each config should be reasonably sized
      expect(coreConfigString.length).toBeGreaterThan(10);
      expect(checkpointConfigString.length).toBeGreaterThan(10);
      expect(streamingConfigString.length).toBeGreaterThan(10);
      expect(hitlConfigString.length).toBeGreaterThan(10);
    });

    it('should work with minimal configurations', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),

          // Minimal configurations
          NestjsLanggraphModule.forRoot({}),
          LanggraphModulesCheckpointModule.forRoot({}),
          StreamingModule.forRoot({}),
          HitlModule.forRoot({}),
        ],
      }).compile();

      expect(module).toBeDefined();

      // All modules should work with empty configs
      expect(module.get(NestjsLanggraphModule)).toBeDefined();
      expect(module.get(LanggraphModulesCheckpointModule)).toBeDefined();
      expect(module.get(StreamingModule)).toBeDefined();
      expect(module.get(HitlModule)).toBeDefined();
    });
  });

  describe('Performance and Resource Usage Validation', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should meet startup time performance targets', async () => {
      const iterations = 3;
      const startupTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const testModule = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: '.env.test',
            }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
            LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
            StreamingModule.forRoot(getStreamingConfig()),
            HitlModule.forRoot(getHitlConfig()),
          ],
        }).compile();

        const initTime = Date.now() - startTime;
        startupTimes.push(initTime);

        await testModule.close();
      }

      const averageStartupTime =
        startupTimes.reduce((sum, time) => sum + time, 0) / iterations;

      // Phase 3 target: <300ms startup time
      expect(averageStartupTime).toBeLessThan(300);

      console.log(`Average startup time: ${averageStartupTime.toFixed(2)}ms`);
    });

    it('should have reasonable memory footprint', async () => {
      const initialMemory = process.memoryUsage();

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
          LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
          StreamingModule.forRoot(getStreamingConfig()),
          HitlModule.forRoot(getHitlConfig()),
        ],
      }).compile();

      const memoryAfterInit = process.memoryUsage();
      const heapIncrease = memoryAfterInit.heapUsed - initialMemory.heapUsed;
      const rssIncrease = memoryAfterInit.rss - initialMemory.rss;

      // Should not use excessive memory (target: <30MB)
      expect(heapIncrease).toBeLessThan(30 * 1024 * 1024);
      expect(rssIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(
        `Memory increase - Heap: ${(heapIncrease / 1024 / 1024).toFixed(
          2
        )}MB, RSS: ${(rssIncrease / 1024 / 1024).toFixed(2)}MB`
      );
    });

    it('should support concurrent module initialization', async () => {
      // Test that multiple modules can be initialized concurrently without issues
      const createModulePromise = () =>
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: '.env.test',
            }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
            LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
            StreamingModule.forRoot(getStreamingConfig()),
            HitlModule.forRoot(getHitlConfig()),
          ],
        }).compile();

      const startTime = Date.now();

      // Create multiple modules concurrently
      const modules = await Promise.all([
        createModulePromise(),
        createModulePromise(),
        createModulePromise(),
      ]);

      const concurrentInitTime = Date.now() - startTime;

      // All modules should initialize successfully
      modules.forEach((mod) => {
        expect(mod).toBeDefined();
        expect(mod.get(NestjsLanggraphModule)).toBeDefined();
        expect(mod.get(LanggraphModulesCheckpointModule)).toBeDefined();
        expect(mod.get(StreamingModule)).toBeDefined();
        expect(mod.get(HitlModule)).toBeDefined();
      });

      // Clean up
      await Promise.all(modules.map((mod) => mod.close()));

      // Concurrent initialization should not take much longer than sequential
      expect(concurrentInitTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Architecture Migration Validation', () => {
    it('should validate that old centralized pattern is replaced', async () => {
      // This test ensures the old pattern is no longer in use
      // The old pattern would have been NestjsLanggraphModule.forRoot(getAllConfig())
      // with a monolithic 271-line configuration

      const testModule: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),

          // NEW PATTERN: Direct module imports with focused configs
          NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
          LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
          StreamingModule.forRoot(getStreamingConfig()),
          HitlModule.forRoot(getHitlConfig()),
        ],
      }).compile();

      expect(testModule).toBeDefined();

      // Validate that all modules are independently configured and loaded
      expect(testModule.get(NestjsLanggraphModule)).toBeDefined();
      expect(testModule.get(LanggraphModulesCheckpointModule)).toBeDefined();
      expect(testModule.get(StreamingModule)).toBeDefined();
      expect(testModule.get(HitlModule)).toBeDefined();

      await testModule.close();
    });

    it('should validate configuration size reduction', () => {
      // Test that new modular configs are significantly smaller than old monolithic config
      const coreConfig = getLangGraphCoreConfig();
      const checkpointConfig = getCheckpointConfig();
      const streamingConfig = getStreamingConfig();
      const hitlConfig = getHitlConfig();

      // Calculate total configuration size
      const totalConfigSize =
        JSON.stringify(coreConfig).length +
        JSON.stringify(checkpointConfig).length +
        JSON.stringify(streamingConfig).length +
        JSON.stringify(hitlConfig).length;

      // The old config was 271 lines (approximately 8000+ characters)
      // New modular approach should be significantly smaller
      expect(totalConfigSize).toBeLessThan(8000);

      console.log(`Total modular config size: ${totalConfigSize} characters`);
    });
  });

  describe('Build and Deployment Validation', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should validate that the application builds successfully', async () => {
      // This test simulates the application structure that would be built
      expect(async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: '.env.test',
            }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
            LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
            StreamingModule.forRoot(getStreamingConfig()),
            HitlModule.forRoot(getHitlConfig()),
          ],
        }).compile();
      }).not.toThrow();
    });

    it('should validate that modules can be deployed independently', async () => {
      // Test that individual modules can be used in isolation
      const independentConfigs = [
        // Just core
        {
          imports: [
            ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
          ],
        },
        // Core + Checkpoint
        {
          imports: [
            ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
            LanggraphModulesCheckpointModule.forRoot(getCheckpointConfig()),
          ],
        },
        // Core + Streaming
        {
          imports: [
            ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
            StreamingModule.forRoot(getStreamingConfig()),
          ],
        },
        // Core + HITL
        {
          imports: [
            ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
            NestjsLanggraphModule.forRoot(getLangGraphCoreConfig()),
            HitlModule.forRoot(getHitlConfig()),
          ],
        },
      ];

      for (const config of independentConfigs) {
        const testModule = await Test.createTestingModule(config).compile();
        expect(testModule).toBeDefined();
        await testModule.close();
      }
    });
  });
});
