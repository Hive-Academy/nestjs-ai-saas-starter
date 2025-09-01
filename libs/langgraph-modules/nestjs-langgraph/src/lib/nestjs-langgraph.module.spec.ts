import { Test, TestingModule } from '@nestjs/testing';
import { NestjsLanggraphModule } from './nestjs-langgraph.module';

describe('NestjsLanggraphModule', () => {
  describe('forRoot', () => {
    it('should create a dynamic module with default options', () => {
      const module = NestjsLanggraphModule.forRoot();

      expect(module).toBeDefined();
      expect(module.module).toBe(NestjsLanggraphModule);
      expect(module.imports).toBeDefined();
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });

    it('should create a dynamic module with custom options', () => {
      const options = { checkpoint: { enabled: true } };
      const module = NestjsLanggraphModule.forRoot(options);

      expect(module).toBeDefined();
      expect(module.module).toBe(NestjsLanggraphModule);
      expect(module.imports).toBeDefined();
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should create a dynamic module with useFactory', () => {
      const options = {
        useFactory: () => ({ checkpoint: { enabled: true } }),
        inject: [],
      };

      const module = NestjsLanggraphModule.forRootAsync(options);

      expect(module).toBeDefined();
      expect(module.module).toBe(NestjsLanggraphModule);
      expect(module.imports).toBeDefined();
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });
  });

  describe('forFeature', () => {
    it('should create a dynamic module for feature workflows', () => {
      class TestWorkflow {}
      const workflows = [TestWorkflow];

      const module = NestjsLanggraphModule.forFeature(workflows);

      expect(module).toBeDefined();
      expect(module.module).toBe(NestjsLanggraphModule);
      expect(module.providers).toHaveLength(1);
      expect(module.exports).toHaveLength(1);
    });
  });
});
