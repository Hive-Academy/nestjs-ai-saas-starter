import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { Tool } from '../decorators/multi-agent/tool.decorator';
import { z } from 'zod';

/**
 * Mock Tool Classes with Real @Tool Decorators
 *
 * CRITICAL: Using REAL @Tool decorators (not mocks)
 * This validates the actual metadata registration flow
 */
@Injectable()
class GitHubIntegrationTools {
  logger = new Logger(GitHubIntegrationTools.name);

  @Tool({
    name: 'github-analyzer',
    description: 'Analyzes GitHub repositories for technical achievements',
    schema: z.object({
      username: z.string().describe('GitHub username'),
      includeRepos: z.boolean().optional().default(true),
    }),
  })
  async analyzeGitHubProfile(input: {
    username: string;
    includeRepos?: boolean;
  }) {
    return {
      username: input.username,
      repos: input.includeRepos ? 42 : 0,
      achievements: ['TypeScript Expert', 'Open Source Contributor'],
    };
  }

  @Tool({
    name: 'achievement-extractor',
    description: 'Extracts achievements from commit history',
    schema: z.object({
      commits: z.array(z.string()),
    }),
  })
  async extractAchievements(input: { commits: string[] }) {
    return {
      achievements: input.commits.map((c) => `Achievement from ${c}`),
    };
  }
}

@Injectable()
class WebResearchTools {
  logger = new Logger(WebResearchTools.name);

  @Tool({
    name: 'web-search',
    description: 'Search the web for information',
    schema: z.object({
      query: z.string(),
      limit: z.number().optional().default(10),
    }),
  })
  async searchWeb(input: { query: string; limit?: number }) {
    return {
      results: Array.from({ length: input.limit || 10 }, (_, i) => ({
        title: `Result ${i + 1}`,
        url: `https://example.com/${i + 1}`,
      })),
    };
  }
}

@Injectable()
class ToolsWithErrors {
  logger = new Logger(ToolsWithErrors.name);

  @Tool({
    name: 'failing-tool',
    description: 'A tool that throws errors',
    schema: z.object({
      shouldFail: z.boolean(),
    }),
  })
  async failingTool(input: { shouldFail: boolean }) {
    if (input.shouldFail) {
      throw new Error('Tool execution failed intentionally');
    }
    return { success: true };
  }
}

@Injectable()
class ToolsWithoutDescription {
  logger = new Logger(ToolsWithoutDescription.name);

  @Tool({
    name: 'no-description-tool',
    description: '', // Empty description to trigger warning
  })
  async noDescriptionTool() {
    return { result: 'ok' };
  }
}

@Injectable()
class DuplicateToolProvider {
  logger = new Logger(DuplicateToolProvider.name);

  @Tool({
    name: 'github-analyzer', // DUPLICATE NAME!
    description: 'Duplicate analyzer',
  })
  async duplicateAnalyzer() {
    return { duplicate: true };
  }
}

describe('ToolRegistryService', () => {
  let service: ToolRegistryService;
  let moduleRef: ModuleRef;
  let module: TestingModule;

  /**
   * Test Suite 1: Should extract tools from registered classes
   */
  describe('Tool Discovery and Extraction', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          GitHubIntegrationTools,
          WebResearchTools,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [GitHubIntegrationTools, WebResearchTools],
          },
        ],
      }).compile();

      service = module.get<ToolRegistryService>(ToolRegistryService);
      moduleRef = module.get<ModuleRef>(ModuleRef);

      // Trigger onModuleInit manually (NestJS testing doesn't auto-trigger)
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should extract tools from registered classes', () => {
      // ACCEPTANCE CRITERIA:
      // - All @Tool decorated methods discovered
      // - Tools converted to LangChain DynamicStructuredTool format
      // - Tools accessible via getTools()

      const allTools = service.getTools();

      // Verify total tool count (2 from GitHubIntegrationTools + 1 from WebResearchTools)
      expect(allTools).toHaveLength(3);

      // Verify tool names
      const toolNames = allTools.map((tool) => tool.name);
      expect(toolNames).toContain('github-analyzer');
      expect(toolNames).toContain('achievement-extractor');
      expect(toolNames).toContain('web-search');

      // Verify tool properties (LangChain DynamicStructuredTool format)
      const githubTool = allTools.find((t) => t.name === 'github-analyzer');
      expect(githubTool).toBeDefined();
      expect(githubTool?.description).toBe(
        'Analyzes GitHub repositories for technical achievements'
      );
      expect(githubTool?.schema).toBeDefined();
      expect(typeof githubTool?.func).toBe('function');
    });

    it('should store tools in registry with O(1) lookup', () => {
      // ACCEPTANCE CRITERIA:
      // - Tools stored in Map for fast access
      // - Registry stats available for monitoring

      const stats = service.getStats();

      expect(stats.totalTools).toBe(3);
      expect(stats.toolNames).toEqual([
        'github-analyzer',
        'achievement-extractor',
        'web-search',
      ]);
      expect(stats.memoryEstimate).toMatch(/~\d+KB/);
    });

    it('should execute tools with correct context binding', async () => {
      // ACCEPTANCE CRITERIA:
      // - Tool execution preserves instance context
      // - Tool receives correct input parameters
      // - Tool returns expected output

      const allTools = service.getTools();
      const githubTool = allTools.find((t) => t.name === 'github-analyzer');

      expect(githubTool).toBeDefined();

      // Execute tool
      const result = await githubTool!.func({
        username: 'testuser',
        includeRepos: true,
      });

      // Verify output
      expect(result).toEqual({
        username: 'testuser',
        repos: 42,
        achievements: ['TypeScript Expert', 'Open Source Contributor'],
      });
    });
  });

  /**
   * Test Suite 2: Should throw on duplicate tool names
   */
  describe('Duplicate Tool Detection', () => {
    it('should throw error on duplicate tool names during registration', async () => {
      // ACCEPTANCE CRITERIA:
      // - Duplicate tool names detected during onModuleInit
      // - Error message includes both class names
      // - Error message is descriptive and actionable

      const moduleWithDuplicate = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          GitHubIntegrationTools,
          DuplicateToolProvider,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [GitHubIntegrationTools, DuplicateToolProvider],
          },
        ],
      }).compile();

      const serviceWithDuplicate =
        moduleWithDuplicate.get<ToolRegistryService>(ToolRegistryService);

      // Expect onModuleInit to throw due to duplicate
      await expect(serviceWithDuplicate.onModuleInit()).rejects.toThrow(
        /Duplicate tool name "github-analyzer"/
      );

      await expect(serviceWithDuplicate.onModuleInit()).rejects.toThrow(
        /GitHubIntegrationTools/
      );

      await expect(serviceWithDuplicate.onModuleInit()).rejects.toThrow(
        /Tool names must be unique/
      );

      await moduleWithDuplicate.close();
    });
  });

  /**
   * Test Suite 3: Should filter tools by names
   */
  describe('Tool Filtering', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          GitHubIntegrationTools,
          WebResearchTools,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [GitHubIntegrationTools, WebResearchTools],
          },
        ],
      }).compile();

      service = module.get<ToolRegistryService>(ToolRegistryService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should filter tools by specific names', () => {
      // ACCEPTANCE CRITERIA:
      // - Only requested tools returned
      // - Tool order preserved
      // - Non-existent tools gracefully handled

      const selectedTools = service.getTools(['github-analyzer', 'web-search']);

      expect(selectedTools).toHaveLength(2);

      const toolNames = selectedTools.map((t) => t.name);
      expect(toolNames).toContain('github-analyzer');
      expect(toolNames).toContain('web-search');
      expect(toolNames).not.toContain('achievement-extractor');
    });

    it('should handle empty tool name array by returning all tools', () => {
      // ACCEPTANCE CRITERIA:
      // - Empty array returns all tools
      // - Consistent with wildcard behavior

      const allTools = service.getTools([]);

      expect(allTools).toHaveLength(3);
      expect(allTools.map((t) => t.name)).toEqual([
        'github-analyzer',
        'achievement-extractor',
        'web-search',
      ]);
    });

    it('should handle undefined tool names by returning all tools', () => {
      // ACCEPTANCE CRITERIA:
      // - Undefined parameter returns all tools
      // - Consistent with "no filter" semantics

      const allTools = service.getTools(undefined);

      expect(allTools).toHaveLength(3);
    });
  });

  /**
   * Test Suite 4: Should return all tools when '*' is included
   */
  describe('Wildcard Tool Selection', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          GitHubIntegrationTools,
          WebResearchTools,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [GitHubIntegrationTools, WebResearchTools],
          },
        ],
      }).compile();

      service = module.get<ToolRegistryService>(ToolRegistryService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should return all tools when wildcard "*" is included', () => {
      // ACCEPTANCE CRITERIA:
      // - '*' in tool names returns all tools
      // - Consistent with "select all" semantics
      // - Other tool names in array ignored when '*' present

      const allTools = service.getTools(['*']);

      expect(allTools).toHaveLength(3);
      expect(allTools.map((t) => t.name)).toEqual([
        'github-analyzer',
        'achievement-extractor',
        'web-search',
      ]);
    });

    it('should return all tools when wildcard mixed with specific names', () => {
      // ACCEPTANCE CRITERIA:
      // - '*' overrides specific tool names
      // - Returns all tools regardless of other entries

      const allTools = service.getTools(['github-analyzer', '*', 'web-search']);

      expect(allTools).toHaveLength(3);
    });
  });

  /**
   * Test Suite 5: Should warn for missing tools
   */
  describe('Missing Tool Handling', () => {
    let loggerWarnSpy: jest.SpyInstance;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          GitHubIntegrationTools,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [GitHubIntegrationTools],
          },
        ],
      }).compile();

      service = module.get<ToolRegistryService>(ToolRegistryService);
      await service.onModuleInit();

      // Spy on logger.warn
      loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
    });

    afterEach(async () => {
      loggerWarnSpy.mockRestore();
      await module.close();
    });

    it('should warn when requesting non-existent tool', () => {
      // ACCEPTANCE CRITERIA:
      // - Warning logged for missing tools
      // - Warning includes available tool names
      // - No error thrown (graceful degradation)

      const tools = service.getTools(['nonexistent-tool']);

      // Verify warning logged
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool not found: nonexistent-tool')
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('github-analyzer, achievement-extractor')
      );

      // Verify empty array returned (graceful handling)
      expect(tools).toHaveLength(0);
    });

    it('should warn for each missing tool in request', () => {
      // ACCEPTANCE CRITERIA:
      // - Multiple warnings for multiple missing tools
      // - Existing tools still returned

      const tools = service.getTools([
        'github-analyzer', // EXISTS
        'missing-tool-1', // MISSING
        'missing-tool-2', // MISSING
      ]);

      // Verify warnings logged for each missing tool
      expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool not found: missing-tool-1')
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool not found: missing-tool-2')
      );

      // Verify existing tool returned
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('github-analyzer');
    });
  });

  /**
   * Test Suite 6: Error Handling in Tool Execution
   */
  describe('Tool Execution Error Handling', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          ToolsWithErrors,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [ToolsWithErrors],
          },
        ],
      }).compile();

      service = module.get<ToolRegistryService>(ToolRegistryService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should return error object when tool execution fails', async () => {
      // ACCEPTANCE CRITERIA:
      // - Tool errors caught and returned as error objects
      // - No exceptions thrown to LLM
      // - Error object contains useful context

      const tools = service.getTools(['failing-tool']);
      const failingTool = tools[0];

      const result = await failingTool.func({ shouldFail: true });

      // Verify error object structure
      expect(result).toHaveProperty('error', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('tool', 'failing-tool');
      expect(result).toHaveProperty('timestamp');

      // Verify error message
      expect(result.message).toContain('Tool execution failed intentionally');
    });

    it('should return normal result when tool execution succeeds', async () => {
      // ACCEPTANCE CRITERIA:
      // - Successful execution returns actual result
      // - No error wrapping when tool succeeds

      const tools = service.getTools(['failing-tool']);
      const failingTool = tools[0];

      const result = await failingTool.func({ shouldFail: false });

      // Verify normal result
      expect(result).toEqual({ success: true });
      expect(result).not.toHaveProperty('error');
    });
  });

  /**
   * Test Suite 7: Schema Validation
   */
  describe('Tool Schema Validation', () => {
    it('should warn when tool has missing description', async () => {
      // ACCEPTANCE CRITERIA:
      // - Warning logged for tools without descriptions
      // - Tool still registered (warning, not error)

      const moduleWithWarning = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          ToolsWithoutDescription,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [ToolsWithoutDescription],
          },
        ],
      }).compile();

      const serviceWithWarning =
        moduleWithWarning.get<ToolRegistryService>(ToolRegistryService);

      // Spy on logger.warn
      const loggerWarnSpy = jest.spyOn(serviceWithWarning['logger'], 'warn');

      await serviceWithWarning.onModuleInit();

      // Verify warning logged
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no-description-tool')
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing description')
      );

      // Verify tool still registered
      const tools = serviceWithWarning.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('no-description-tool');

      loggerWarnSpy.mockRestore();
      await moduleWithWarning.close();
    });
  });

  /**
   * Test Suite 8: Performance Monitoring
   */
  describe('Performance Monitoring', () => {
    it('should log performance metrics on registration', async () => {
      // ACCEPTANCE CRITERIA:
      // - Registration duration logged
      // - Total tools count logged
      // - Warning if registration > 100ms

      const moduleWithPerf = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          GitHubIntegrationTools,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [GitHubIntegrationTools],
          },
        ],
      }).compile();

      const serviceWithPerf =
        moduleWithPerf.get<ToolRegistryService>(ToolRegistryService);

      const loggerLogSpy = jest.spyOn(serviceWithPerf['logger'], 'log');

      await serviceWithPerf.onModuleInit();

      // Verify performance logging
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool registration completed in')
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total tools: 2')
      );

      loggerLogSpy.mockRestore();
      await moduleWithPerf.close();
    });
  });

  /**
   * Test Suite 9: Empty Tool Classes
   */
  describe('Empty Tool Classes', () => {
    @Injectable()
    class EmptyToolClass {
      // No @Tool decorated methods
    }

    it('should warn when tool class has no decorated methods', async () => {
      // ACCEPTANCE CRITERIA:
      // - Warning logged for classes without @Tool methods
      // - No tools registered from empty class
      // - No errors thrown (graceful handling)

      const moduleWithEmpty = await Test.createTestingModule({
        providers: [
          ToolRegistryService,
          EmptyToolClass,
          {
            provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
            useValue: [EmptyToolClass],
          },
        ],
      }).compile();

      const serviceWithEmpty =
        moduleWithEmpty.get<ToolRegistryService>(ToolRegistryService);

      const loggerWarnSpy = jest.spyOn(serviceWithEmpty['logger'], 'warn');

      await serviceWithEmpty.onModuleInit();

      // Verify warning logged
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No @Tool decorated methods found')
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('EmptyToolClass')
      );

      // Verify no tools registered
      const tools = serviceWithEmpty.getTools();
      expect(tools).toHaveLength(0);

      loggerWarnSpy.mockRestore();
      await moduleWithEmpty.close();
    });
  });
});
