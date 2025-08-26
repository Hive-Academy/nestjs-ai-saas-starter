import {
  ChildModuleLoader,
  ChildModuleImportFactory,
} from './child-module-loading';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';

describe('ChildModuleLoader', () => {
  describe('loadChildModules', () => {
    it('should return empty array when no modules are enabled', () => {
      const options: LangGraphModuleOptions = {};
      const modules = ChildModuleLoader.loadChildModules(options);

      expect(modules).toEqual([]);
    });

    it('should successfully load checkpoint module when enabled', () => {
      const options: LangGraphModuleOptions = {
        checkpoint: { enabled: true },
      };

      const modules = ChildModuleLoader.loadChildModules(options);

      // Should load the checkpoint module since it exists in the monorepo
      expect(modules).toHaveLength(1);
      expect(modules[0]).toHaveProperty('module');
      expect(modules[0]).toHaveProperty('providers');
      expect(modules[0]).toHaveProperty('exports');
    });

    it('should successfully load multiple modules when configured', () => {
      const options: LangGraphModuleOptions = {
        checkpoint: { enabled: true },
        multiAgent: { enabled: true },
        platform: { apiKey: 'test' },
      };

      const modules = ChildModuleLoader.loadChildModules(options);

      // Should load multiple modules since they exist in the monorepo
      expect(modules.length).toBeGreaterThan(0);
      modules.forEach((module) => {
        expect(module).toHaveProperty('module');
        expect(module).toHaveProperty('providers');
        expect(module).toHaveProperty('exports');
      });
    });
  });
});

describe('ChildModuleImportFactory', () => {
  describe('createChildModuleImports', () => {
    it('should delegate to ChildModuleLoader.loadChildModules', () => {
      const options: LangGraphModuleOptions = {};
      const modules =
        ChildModuleImportFactory.createChildModuleImports(options);

      expect(modules).toEqual([]);
    });
  });

  describe('createChildModuleImportsAsync', () => {
    it('should return same result as sync version', async () => {
      const options: LangGraphModuleOptions = {};
      const modules =
        await ChildModuleImportFactory.createChildModuleImportsAsync(options);

      expect(modules).toEqual([]);
    });
  });
});
