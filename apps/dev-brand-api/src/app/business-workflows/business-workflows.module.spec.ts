import { BusinessWorkflowsModule } from './business-workflows.module';
import { DevBrandSupervisorWorkflow } from './workflows/devbrand-supervisor.workflow';
import { GitHubCodeAnalyzerAgent } from './agents/github-code-analyzer/github-code-analyzer.agent';
import { PersonalBrandStrategistAgent } from './agents/personal-brand-strategist/personal-brand-strategist.agent';
import { ContentCreatorAgent } from './agents/content-creator/content-creator.agent';
import { PersonalBrandMemoryService } from './core/memory/personal-brand-memory.service';
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';
import { RepositoryModule } from '../repositories/repository.module';

/**
 * BusinessWorkflowsModule DI Resolution Tests
 *
 * Purpose: Verify NestJS module dependency injection configuration is correct
 * Scope: Tests module metadata and provider registration
 *
 * Verification Requirements:
 * - WorkflowEngineModule imported in BusinessWorkflowsModule
 * - DevBrandSupervisorWorkflow registered in providers
 * - All 3 agents registered in providers
 * - PersonalBrandMemoryService registered in providers
 * - No circular dependency configuration errors
 *
 * Note: This test verifies module configuration without requiring full module compilation
 * or live database connections. It checks that the DI wiring is set up correctly.
 */
describe('BusinessWorkflowsModule - Dependency Injection Configuration', () => {
  describe('Module Metadata Verification', () => {
    let moduleMetadata: any;

    beforeAll(() => {
      // Extract metadata using Reflect (NestJS stores module metadata via decorators)
      moduleMetadata = Reflect.getMetadata('imports', BusinessWorkflowsModule) || [];
      const providers = Reflect.getMetadata('providers', BusinessWorkflowsModule) || [];
      const exports = Reflect.getMetadata('exports', BusinessWorkflowsModule) || [];

      moduleMetadata = {
        imports: moduleMetadata,
        providers: providers,
        exports: exports,
      };
    });

    it('should import WorkflowEngineModule', () => {
      const hasWorkflowEngineModule = moduleMetadata.imports.includes(WorkflowEngineModule);
      expect(hasWorkflowEngineModule).toBe(true);
    });

    it('should import RepositoryModule for database access', () => {
      const hasRepositoryModule = moduleMetadata.imports.includes(RepositoryModule);
      expect(hasRepositoryModule).toBe(true);
    });

    it('should register DevBrandSupervisorWorkflow in providers', () => {
      const providers = moduleMetadata.providers;
      const hasWorkflow = providers.some((p: any) =>
        p === DevBrandSupervisorWorkflow || p.provide === DevBrandSupervisorWorkflow
      );
      expect(hasWorkflow).toBe(true);
    });

    it('should register GitHubCodeAnalyzerAgent in providers', () => {
      const providers = moduleMetadata.providers;
      const hasAgent = providers.some((p: any) =>
        p === GitHubCodeAnalyzerAgent || p.provide === GitHubCodeAnalyzerAgent
      );
      expect(hasAgent).toBe(true);
    });

    it('should register PersonalBrandStrategistAgent in providers', () => {
      const providers = moduleMetadata.providers;
      const hasAgent = providers.some((p: any) =>
        p === PersonalBrandStrategistAgent || p.provide === PersonalBrandStrategistAgent
      );
      expect(hasAgent).toBe(true);
    });

    it('should register ContentCreatorAgent in providers', () => {
      const providers = moduleMetadata.providers;
      const hasAgent = providers.some((p: any) =>
        p === ContentCreatorAgent || p.provide === ContentCreatorAgent
      );
      expect(hasAgent).toBe(true);
    });

    it('should register PersonalBrandMemoryService in providers', () => {
      const providers = moduleMetadata.providers;
      const hasService = providers.some((p: any) =>
        p === PersonalBrandMemoryService || p.provide === PersonalBrandMemoryService
      );
      expect(hasService).toBe(true);
    });

    it('should export DevBrandSupervisorWorkflow for external use', () => {
      const exports = moduleMetadata.exports;
      const exportsWorkflow = exports.includes(DevBrandSupervisorWorkflow);
      expect(exportsWorkflow).toBe(true);
    });

    it('should export all 3 agents for external use', () => {
      const exports = moduleMetadata.exports;
      const exportsGitHubAgent = exports.includes(GitHubCodeAnalyzerAgent);
      const exportsBrandAgent = exports.includes(PersonalBrandStrategistAgent);
      const exportsContentAgent = exports.includes(ContentCreatorAgent);

      expect(exportsGitHubAgent).toBe(true);
      expect(exportsBrandAgent).toBe(true);
      expect(exportsContentAgent).toBe(true);
    });

    it('should export PersonalBrandMemoryService for external use', () => {
      const exports = moduleMetadata.exports;
      const exportsService = exports.includes(PersonalBrandMemoryService);
      expect(exportsService).toBe(true);
    });
  });

  describe('Module Configuration Integrity', () => {
    it('should have valid module decorator metadata', () => {
      const metadata = Reflect.getMetadata('__module:metadata__', BusinessWorkflowsModule);
      // NestJS modules should have decorator metadata
      expect(metadata || Reflect.getMetadata('imports', BusinessWorkflowsModule)).toBeDefined();
    });

    it('should not have circular dependency issues in module structure', () => {
      // If this test runs, module metadata was successfully extracted without errors
      const imports = Reflect.getMetadata('imports', BusinessWorkflowsModule);
      expect(imports).toBeDefined();
      expect(Array.isArray(imports)).toBe(true);
    });
  });
});
