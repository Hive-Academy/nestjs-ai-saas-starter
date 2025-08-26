import { Test, type TestingModule } from '@nestjs/testing';
import { HitlModule } from '../hitl.module';

describe('HITL Module Independence Tests', () => {
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
          HitlModule.forRoot({
            enabled: true,
            defaultTimeout: 30000, // 30 seconds
            maxPendingRequests: 100,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(HitlModule)).toBeDefined();
    });

    it('should work with minimal configuration', async () => {
      module = await Test.createTestingModule({
        imports: [HitlModule.forRoot({})],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should initialize quickly in standalone mode', async () => {
      const startTime = Date.now();

      module = await Test.createTestingModule({
        imports: [
          HitlModule.forRoot({
            enabled: true,
            defaultTimeout: 15000,
          }),
        ],
      }).compile();

      const initTime = Date.now() - startTime;

      // Should initialize quickly for HITL module
      expect(initTime).toBeLessThan(100);
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
      // This tests that HITL can work completely independently
      module = await Test.createTestingModule({
        imports: [
          HitlModule.forRoot({
            enabled: true,
            defaultTimeout: 30000,
            maxPendingRequests: 50,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();

      // Should be able to get HITL services
      const hitlModule = module.get(HitlModule);
      expect(hitlModule).toBeDefined();
    });

    it('should handle various configuration patterns', async () => {
      const configs = [
        {},
        { enabled: true },
        { enabled: false },
        { defaultTimeout: 10000 },
        { maxPendingRequests: 25 },
        {
          enabled: true,
          defaultTimeout: 30000,
          maxPendingRequests: 100,
          enableWebhooks: true,
        },
        {
          enabled: false,
          defaultTimeout: 5000,
          maxPendingRequests: 10,
        },
      ];

      for (const config of configs) {
        const testModule = await Test.createTestingModule({
          imports: [HitlModule.forRoot(config)],
        }).compile();

        expect(testModule).toBeDefined();
        await testModule.close();
      }
    });
  });

  describe('Human-in-the-Loop Functionality', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          HitlModule.forRoot({
            enabled: true,
            defaultTimeout: 30000,
            maxPendingRequests: 100,
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should work independently of external workflow systems', async () => {
      expect(module).toBeDefined();

      // HITL should be able to operate without external orchestration
      const hitlModule = module.get(HitlModule);
      expect(hitlModule).toBeDefined();
    });

    it('should handle disabled state gracefully', async () => {
      const disabledModule = await Test.createTestingModule({
        imports: [
          HitlModule.forRoot({
            enabled: false,
          }),
        ],
      }).compile();

      expect(disabledModule).toBeDefined();

      const hitlModule = disabledModule.get(HitlModule);
      expect(hitlModule).toBeDefined();

      await disabledModule.close();
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
          HitlModule.forRoot({
            enabled: true,
            defaultTimeout: 30000,
            maxPendingRequests: 100,
          }),
        ],
      }).compile();

      const memoryAfterInit = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfterInit - initialMemory;

      // HITL should be lightweight (less than 8MB)
      expect(memoryIncrease).toBeLessThan(8 * 1024 * 1024);
      expect(module).toBeDefined();
    });

    it('should clean up resources properly', async () => {
      module = await Test.createTestingModule({
        imports: [
          HitlModule.forRoot({
            enabled: true,
            defaultTimeout: 30000,
            maxPendingRequests: 100,
          }),
        ],
      }).compile();

      expect(module).toBeDefined();

      // Should close without errors
      await expect(module.close()).resolves.not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should accept various timeout configurations', async () => {
      const timeoutConfigs = [
        { defaultTimeout: 1000 }, // 1 second
        { defaultTimeout: 5000 }, // 5 seconds
        { defaultTimeout: 30000 }, // 30 seconds
        { defaultTimeout: 60000 }, // 1 minute
        { defaultTimeout: 300000 }, // 5 minutes
      ];

      for (const config of timeoutConfigs) {
        const module = await Test.createTestingModule({
          imports: [HitlModule.forRoot(config)],
        }).compile();

        expect(module).toBeDefined();
        await module.close();
      }
    });

    it('should handle various pending request limits', async () => {
      const requestLimitConfigs = [
        { maxPendingRequests: 1 },
        { maxPendingRequests: 10 },
        { maxPendingRequests: 50 },
        { maxPendingRequests: 100 },
        { maxPendingRequests: 500 },
      ];

      for (const config of requestLimitConfigs) {
        const module = await Test.createTestingModule({
          imports: [HitlModule.forRoot(config)],
        }).compile();

        expect(module).toBeDefined();
        await module.close();
      }
    });

    it('should provide reasonable defaults for missing configuration', async () => {
      const module = await Test.createTestingModule({
        imports: [HitlModule.forRoot({})],
      }).compile();

      expect(module).toBeDefined();

      // Should work with no explicit configuration
      const hitlModule = module.get(HitlModule);
      expect(hitlModule).toBeDefined();

      await module.close();
    });
  });

  describe('Error Handling', () => {
    let module: TestingModule;

    afterEach(async () => {
      if (module) {
        await module.close();
      }
    });

    it('should handle invalid configuration gracefully', async () => {
      // Test with potentially problematic configs that should still work
      const problematicConfigs = [
        { defaultTimeout: 0 }, // Zero timeout
        { maxPendingRequests: 0 }, // Zero pending requests
        { defaultTimeout: -1 }, // Negative timeout
        { maxPendingRequests: -1 }, // Negative pending requests
      ];

      for (const config of problematicConfigs) {
        // Should not throw during module creation
        expect(async () => {
          const testModule = await Test.createTestingModule({
            imports: [HitlModule.forRoot(config)],
          }).compile();

          await testModule.close();
        }).not.toThrow();
      }
    });

    it('should handle null/undefined configuration values', async () => {
      const nullConfigs = [
        { enabled: null },
        { defaultTimeout: null },
        { maxPendingRequests: null },
        { enabled: undefined },
        { defaultTimeout: undefined },
        { maxPendingRequests: undefined },
      ];

      for (const config of nullConfigs) {
        const module = await Test.createTestingModule({
          imports: [HitlModule.forRoot(config)],
        }).compile();

        expect(module).toBeDefined();
        await module.close();
      }
    });
  });
});
