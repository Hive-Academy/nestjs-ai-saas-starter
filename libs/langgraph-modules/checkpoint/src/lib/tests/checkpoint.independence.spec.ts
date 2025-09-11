import { Test, type TestingModule } from '@nestjs/testing';
import { LanggraphModulesCheckpointModule } from '../langgraph-modules/checkpoint.module';
import { CheckpointManagerService } from '../core/checkpoint-manager.service';

describe('Checkpoint Module Independence Tests', () => {
  describe('Standalone Module Loading', () => {
    let module: TestingModule;
    let checkpointManager: CheckpointManagerService;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should load module independently without any external dependencies', async () => {
      // Test that the module can be imported and initialized without any core services
      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(LanggraphModulesCheckpointModule)).toBeDefined();
    });

    it('should initialize CheckpointManagerService with optional dependencies', async () => {
      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      checkpointManager = module.get(CheckpointManagerService);
      expect(checkpointManager).toBeDefined();
    });

    it('should handle graceful degradation when ConfigService is not available', async () => {
      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      checkpointManager = module.get(CheckpointManagerService);

      // Should work without ConfigService
      expect(checkpointManager.isConfigServiceAvailable()).toBe(false);
      expect(checkpointManager.isCoreServicesAvailable()).toBe(true); // Memory provider should be available
    });
  });

  describe('Optional Dependency Pattern Validation', () => {
    let module: TestingModule;
    let checkpointManager: CheckpointManagerService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      checkpointManager = module.get(CheckpointManagerService);
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should report capability detection correctly', async () => {
      const capabilities = checkpointManager.getCapabilities();

      expect(capabilities).toHaveProperty('configService');
      expect(capabilities).toHaveProperty('coreServices');
      expect(capabilities).toHaveProperty('monitoring');
      expect(capabilities).toHaveProperty('cleanup');
      expect(capabilities).toHaveProperty('summary');
      expect(Array.isArray(capabilities.summary)).toBe(true);
    });

    it('should handle missing dependencies gracefully in core operations', async () => {
      // Test that core checkpoint operations work even with minimal dependencies
      // These should not throw errors, even if some services are unavailable
      expect(() => {
        checkpointManager.isConfigServiceAvailable();
        checkpointManager.isCoreServicesAvailable();
        checkpointManager.isMonitoringAvailable();
        checkpointManager.isCleanupAvailable();
      }).not.toThrow();
    });

    it('should provide clear error messages when features are unavailable', async () => {
      const capabilities = checkpointManager.getCapabilities();

      // Should provide meaningful capability summary
      expect(capabilities.summary.length).toBeGreaterThan(0);

      // Monitoring might not be available in minimal setup
      if (!capabilities.monitoring) {
        expect(capabilities.summary).toContain(
          'Monitoring capabilities not available'
        );
      }

      // Cleanup might not be available in minimal setup
      if (!capabilities.cleanup) {
        expect(capabilities.summary).toContain(
          'Cleanup capabilities not available'
        );
      }
    });
  });

  describe('Memory Provider Independence', () => {
    let module: TestingModule;
    let checkpointManager: CheckpointManagerService;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      checkpointManager = module.get(CheckpointManagerService);
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should work with memory provider only', async () => {
      const capabilities = checkpointManager.getCapabilities();

      // Core services should be available with memory provider
      expect(capabilities.coreServices).toBe(true);

      // Basic operations should not throw
      expect(() => {
        checkpointManager.isConfigServiceAvailable();
      }).not.toThrow();
    });

    it('should initialize without external storage dependencies', async () => {
      // Module should start successfully without Neo4j, ChromaDB, or other external storage
      expect(checkpointManager).toBeDefined();
      expect(checkpointManager.isCoreServicesAvailable()).toBe(true);
    });
  });

  describe('Configuration Flexibility', () => {
    it('should accept minimal configuration', async () => {
      const module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 50,
            },
          }),
        ],
      }).compile();

      const checkpointManager = module.get(CheckpointManagerService);
      expect(checkpointManager).toBeDefined();

      await module.close();
    });

    it('should work with empty configuration', async () => {
      const module = await Test.createTestingModule({
        imports: [LanggraphModulesCheckpointModule.forRoot({})],
      }).compile();

      const checkpointManager = module.get(CheckpointManagerService);
      expect(checkpointManager).toBeDefined();

      await module.close();
    });

    it('should provide reasonable defaults when no config is provided', async () => {
      const module = await Test.createTestingModule({
        imports: [LanggraphModulesCheckpointModule.forRoot({})],
      }).compile();

      const checkpointManager = module.get(CheckpointManagerService);
      const capabilities = checkpointManager.getCapabilities();

      // Should have some basic functionality even with no config
      expect(capabilities.summary.length).toBeGreaterThan(0);

      await module.close();
    });
  });

  describe('Performance and Resource Management', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should initialize quickly without external dependencies', async () => {
      const startTime = Date.now();

      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      const initTime = Date.now() - startTime;

      // Should initialize in under 100ms for standalone module
      expect(initTime).toBeLessThan(100);
      expect(module).toBeDefined();
    });

    it('should have minimal memory footprint in standalone mode', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      module = await Test.createTestingModule({
        imports: [
          LanggraphModulesCheckpointModule.forRoot({
            checkpoint: {
              cleanupInterval: 60000,
              maxAge: 3600000,
              maxPerThread: 100,
            },
          }),
        ],
      }).compile();

      const checkpointManager = module.get(CheckpointManagerService);
      expect(checkpointManager).toBeDefined();

      const memoryAfterInit = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfterInit - initialMemory;

      // Should not use excessive memory (less than 10MB increase)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
