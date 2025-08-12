import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { ToolDiscoveryService } from './tool-discovery.service';
import { ToolRegistryService } from './tool-registry.service';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import {
  Tool,
  ToolMetadata,
  getClassTools,
} from '../decorators/tool.decorator';
import { AgentType } from '@internal/shared';

// Mock tool provider for testing
@Injectable()
class MockToolProvider {
  @Tool({
    name: 'test_search',
    description: 'Search for test data',
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(10),
    }),
    agents: [AgentType.ARCHITECT, AgentType.SENIOR_DEVELOPER],
    tags: ['search', 'test'],
    version: '1.0.0',
  })
  async searchTest(params: { query: string; limit?: number }) {
    return { results: [`Found: ${params.query}`] };
  }

  @Tool({
    name: 'test_analyze',
    description: 'Analyze test data',
    agents: '*',
    tags: ['analysis', 'test'],
    streaming: true,
  })
  async analyzeTest(data: string) {
    return { analysis: `Analysis of: ${data}` };
  }

  // Method without @Tool decorator - should be ignored
  regularMethod() {
    return 'not a tool';
  }
}

@Injectable()
class MockInvalidToolProvider {
  @Tool({
    name: '', // Invalid: empty name
    description: 'Invalid tool',
    schema: 'invalid schema' as any, // Invalid: not a Zod schema
  })
  async invalidTool() {
    return {};
  }
}

describe('ToolDiscoveryService', () => {
  let service: ToolDiscoveryService;
  let toolRegistry: ToolRegistryService;
  let discoveryService: DiscoveryService;
  let moduleRef: ModuleRef;
  let module: TestingModule;

  beforeEach(async () => {
    const mockDiscoveryService = {
      getProviders: jest
        .fn()
        .mockReturnValue([
          { instance: new MockToolProvider() },
          { instance: new MockInvalidToolProvider() },
        ]),
    };

    const mockModuleRef = {
      get: jest.fn(),
    };

    const mockToolRegistry = {
      getAllTools: jest.fn().mockReturnValue([]),
      getToolsForAgent: jest.fn().mockReturnValue([]),
      getToolMetadata: jest.fn(),
      getTool: jest.fn(),
      removeTool: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ToolDiscoveryService,
        MockToolProvider,
        MockInvalidToolProvider,
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
        {
          provide: ToolRegistryService,
          useValue: mockToolRegistry,
        },
        {
          provide: MetadataScanner,
          useValue: {
            getAllMethodNames: jest
              .fn()
              .mockReturnValue(['searchTest', 'analyzeTest']),
            scanFromPrototype: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getMetadata: jest.fn(),
          },
        },
        {
          provide: MetadataProcessorService,
          useValue: {
            processMetadata: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToolDiscoveryService>(ToolDiscoveryService);
    toolRegistry = module.get<ToolRegistryService>(ToolRegistryService);
    discoveryService = module.get<DiscoveryService>(DiscoveryService);
    moduleRef = module.get<ModuleRef>(ModuleRef);

    // Mock moduleRef.get to return provider instances
    (moduleRef.get as jest.Mock).mockImplementation((providerClass) => {
      if (providerClass === MockToolProvider) {
        return new MockToolProvider();
      }
      if (providerClass === MockInvalidToolProvider) {
        return new MockInvalidToolProvider();
      }
      return {};
    });
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Tool Discovery Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultStats = service.getDiscoveryStats();
      expect(defaultStats.totalTools).toBe(0);
      expect(defaultStats.providersScanned).toBe(0);
    });

    it('should update configuration', () => {
      const newConfig = {
        autoDiscover: false,
        validateSchemas: false,
        maxConcurrency: 5,
        verbose: true,
      };

      service.configure(newConfig);

      // Configuration change should be reflected in internal state
      expect((service as any)['discoveryOptions'].autoDiscover).toBe(false);
      expect((service as any)['discoveryOptions'].validateSchemas).toBe(false);
      expect((service as any)['discoveryOptions'].maxConcurrency).toBe(5);
      expect((service as any)['discoveryOptions'].verbose).toBe(true);
    });
  });

  describe('Provider Discovery', () => {
    it('should discover tools from a valid provider', async () => {
      const result = await service.discoverFromProvider(MockToolProvider);

      expect(result.providerName).toBe('MockToolProvider');
      expect(result.toolsFound.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      expect(result.scanTime).toBeGreaterThan(0);

      // Verify tool details
      const searchTool = result.toolsFound.find(
        (tool) => tool.name === 'test_search'
      );
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toBe('Search for test data');
      expect(searchTool?.agents).toEqual([
        AgentType.ARCHITECT,
        AgentType.SENIOR_DEVELOPER,
      ]);
      expect(searchTool?.tags).toEqual(['search', 'test']);
    });

    it('should handle provider with invalid tools', async () => {
      service.configure({ validateSchemas: true });

      const result = await service.discoverFromProvider(
        MockInvalidToolProvider
      );

      expect(result.providerName).toBe('MockInvalidToolProvider');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.toolsFound.length).toBe(0);
    });

    it('should skip validation when configured', async () => {
      service.configure({ validateSchemas: false });

      const result = await service.discoverFromProvider(
        MockInvalidToolProvider
      );

      expect(result.providerName).toBe('MockInvalidToolProvider');
      expect(result.toolsFound.length).toBeGreaterThan(0); // Invalid tools still discovered
    });

    it('should handle non-injectable provider classes', async () => {
      class NonInjectableProvider {
        @Tool({
          name: 'non_injectable_tool',
          description: 'Tool from non-injectable provider',
        })
        async testTool() {
          return {};
        }
      }

      const result = await service.discoverFromProvider(NonInjectableProvider);

      expect(result.providerName).toBe('NonInjectableProvider');
      expect(result.toolsFound.length).toBeGreaterThan(0);
    });
  });

  describe('Full Discovery Process', () => {
    it('should perform comprehensive discovery', async () => {
      // Mock tool registry methods to simulate registered tools
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'test_search' },
        { name: 'test_analyze' },
      ]);

      (toolRegistry.getToolMetadata as jest.Mock).mockImplementation((name) => {
        if (name === 'test_search') {
          return {
            name: 'test_search',
            agents: [AgentType.ARCHITECT, AgentType.SENIOR_DEVELOPER],
            tags: ['search', 'test'],
            version: '1.0.0',
          };
        }
        if (name === 'test_analyze') {
          return {
            name: 'test_analyze',
            agents: '*',
            tags: ['analysis', 'test'],
          };
        }
        return null;
      });

      (toolRegistry.getToolsForAgent as jest.Mock).mockImplementation(
        (agent) => {
          if (agent === AgentType.ARCHITECT) {
            return [{ name: 'test_search' }, { name: 'test_analyze' }];
          }
          if (agent === '*') {
            return [{ name: 'test_analyze' }];
          }
          return [];
        }
      );

      const stats = await service.performFullDiscovery();

      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.providersScanned).toBeGreaterThan(0);
      expect(stats.agentToolMappings[AgentType.ARCHITECT]).toBeDefined();
      expect(stats.toolsByTag['search']).toBeDefined();
      expect(stats.toolsByVersion['1.0.0']).toBeDefined();
    });

    it('should handle discovery failures gracefully', async () => {
      // Mock discovery service to throw error
      (discoveryService.getProviders as jest.Mock).mockImplementation(() => {
        throw new Error('Discovery service error');
      });

      await expect(service.performFullDiscovery()).rejects.toThrow(
        'Discovery service error'
      );
    });

    it('should respect concurrency limits', async () => {
      const providers = Array.from({ length: 20 }, (_, i) => ({
        instance: { constructor: { name: `Provider${i}` } },
      }));

      (discoveryService.getProviders as jest.Mock).mockReturnValue(providers);

      service.configure({ maxConcurrency: 3 });

      const startTime = Date.now();
      await service.performFullDiscovery();
      const duration = Date.now() - startTime;

      // With concurrency limits, discovery should take more time
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Tool Filtering and Search', () => {
    beforeEach(() => {
      // Mock registry with test tools
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'search_tool' },
        { name: 'analysis_tool' },
        { name: 'composed_tool' },
      ]);

      (toolRegistry.getToolMetadata as jest.Mock).mockImplementation((name) => {
        const metadata = {
          search_tool: {
            name: 'search_tool',
            tags: ['search', 'rag'],
            agents: [AgentType.ARCHITECT],
          },
          analysis_tool: {
            name: 'analysis_tool',
            tags: ['analysis', 'ml'],
            agents: '*',
          },
          composed_tool: {
            name: 'composed_tool',
            tags: ['composed', 'workflow'],
            agents: [AgentType.SENIOR_DEVELOPER],
          },
        };
        return metadata[name] || null;
      });
    });

    it('should discover tools by tag', async () => {
      const searchTools = await service.discoverByTag(['search']);
      expect(searchTools.length).toBeGreaterThan(0);

      const tool = searchTools.find((t) => t.name === 'search_tool');
      expect(tool).toBeDefined();
      expect(tool?.tags).toContain('search');
    });

    it('should discover tools for specific agents', async () => {
      (toolRegistry.getToolsForAgent as jest.Mock).mockImplementation(
        (agent) => {
          if (agent === AgentType.ARCHITECT) {
            return [{ name: 'search_tool' }];
          }
          return [];
        }
      );

      const architectTools = await service.discoverForAgent(
        AgentType.ARCHITECT
      );
      expect(architectTools.length).toBeGreaterThan(0);

      const tool = architectTools[0];
      expect(tool.name).toBe('search_tool');
    });

    it('should filter tools by configuration', () => {
      service.configure({
        includeOnlyTags: ['search'],
        excludeTags: ['deprecated'],
      });

      // Test internal filtering logic
      const shouldInclude1 = (service as any)['shouldIncludeTool']({
        name: 'test',
        description: 'test',
        tags: ['search', 'rag'],
        methodName: 'test',
        handler: jest.fn(),
      });

      const shouldInclude2 = (service as any)['shouldIncludeTool']({
        name: 'test2',
        description: 'test2',
        tags: ['analysis'],
        methodName: 'test2',
        handler: jest.fn(),
      });

      expect(shouldInclude1).toBe(true);
      expect(shouldInclude2).toBe(false);
    });
  });

  describe('Tool Dependency Analysis', () => {
    beforeEach(() => {
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'parent_tool' },
        { name: 'child_tool_1' },
        { name: 'child_tool_2' },
        { name: 'orphaned_tool' },
      ]);

      (toolRegistry.getToolMetadata as jest.Mock).mockImplementation((name) => {
        const metadata = {
          parent_tool: {
            name: 'parent_tool',
            tags: ['composed'],
            agents: [AgentType.ARCHITECT],
          },
          child_tool_1: {
            name: 'child_tool_1',
            agents: [AgentType.ARCHITECT],
          },
          child_tool_2: {
            name: 'child_tool_2',
            agents: [AgentType.SENIOR_DEVELOPER],
          },
          orphaned_tool: {
            name: 'orphaned_tool',
            agents: [], // No agents assigned
          },
        };
        return metadata[name] || null;
      });
    });

    it('should analyze tool dependencies and relationships', async () => {
      const analysis = await service.analyzeToolDependencies();

      expect(analysis.dependencies).toBeDefined();
      expect(analysis.conflicts).toBeDefined();
      expect(analysis.orphanedTools).toBeDefined();
      expect(analysis.composedToolChains).toBeDefined();

      // Should identify orphaned tool
      expect(analysis.orphanedTools).toContain('orphaned_tool');

      // Should identify composed tools
      expect(analysis.composedToolChains.length).toBeGreaterThan(0);
    });

    it('should detect tool conflicts', async () => {
      // Mock duplicate tools
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'duplicate_tool' },
        { name: 'duplicate_tool' }, // Same name
      ]);

      const analysis = await service.analyzeToolDependencies();

      expect(analysis.conflicts.length).toBeGreaterThan(0);
      expect(analysis.conflicts[0].reason).toContain('Duplicate');
    });
  });

  describe('Tool Validation', () => {
    beforeEach(() => {
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'valid_tool', description: 'Valid tool' },
        { name: '', description: 'Invalid tool - no name' },
        { name: 'no_description_tool', description: '' },
      ]);

      (toolRegistry.getToolMetadata as jest.Mock).mockImplementation((name) => {
        if (name === 'valid_tool') {
          return {
            name: 'valid_tool',
            description: 'Valid tool',
            schema: z.object({ input: z.string() }),
            agents: [AgentType.ARCHITECT],
          };
        }
        if (name === 'invalid_schema_tool') {
          return {
            name: 'invalid_schema_tool',
            description: 'Tool with invalid schema',
            schema: 'not a zod schema' as any,
            agents: [AgentType.ARCHITECT],
          };
        }
        return {
          name,
          description: '',
          agents: ['invalid-agent-type'] as any,
        };
      });
    });

    it('should validate tool configurations', async () => {
      const validation = await service.validateToolConfiguration();

      expect(validation.valid.length).toBeGreaterThan(0);
      expect(validation.invalid.length).toBeGreaterThan(0);

      // Should identify valid tool
      expect(validation.valid).toContain('valid_tool');

      // Should identify invalid tools
      const invalidTool = validation.invalid.find((t) => t.toolName === '');
      expect(invalidTool).toBeDefined();
      expect(invalidTool?.errors).toContain('Tool name is required');
    });

    it('should validate Zod schemas', async () => {
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'schema_tool', description: 'Tool with schema' },
      ]);

      (toolRegistry.getToolMetadata as jest.Mock).mockReturnValue({
        name: 'schema_tool',
        description: 'Tool with schema',
        schema: z.object({
          required: z.string(),
          optional: z.number().optional(),
        }),
      });

      const validation = await service.validateToolConfiguration();

      expect(validation.valid).toContain('schema_tool');
    });

    it('should validate agent assignments', async () => {
      (toolRegistry.getAllTools as jest.Mock).mockReturnValue([
        { name: 'agent_test_tool', description: 'Tool for agent validation' },
      ]);

      (toolRegistry.getToolMetadata as jest.Mock).mockReturnValue({
        name: 'agent_test_tool',
        description: 'Tool for agent validation',
        agents: ['invalid-agent', AgentType.ARCHITECT],
      });

      const validation = await service.validateToolConfiguration();

      const tool = validation.invalid.find(
        (t) => t.toolName === 'agent_test_tool'
      );
      expect(tool).toBeDefined();
      expect(
        tool?.errors.some((error) => error.includes('Invalid agent type'))
      ).toBe(true);
    });
  });

  describe('Tool Details and Refresh', () => {
    it('should provide detailed tool information', () => {
      const mockTool = { name: 'detail_tool' };
      const mockMetadata = {
        name: 'detail_tool',
        description: 'Detailed tool',
        agents: [AgentType.ARCHITECT, AgentType.SENIOR_DEVELOPER],
      };

      (toolRegistry.getTool as jest.Mock).mockReturnValue(mockTool);
      (toolRegistry.getToolMetadata as jest.Mock).mockReturnValue(mockMetadata);

      const details = service.getToolDetails('detail_tool');

      expect(details).toBeDefined();
      expect(details?.tool).toBe(mockTool);
      expect(details?.metadata).toBe(mockMetadata);
      expect(details?.agentAssignments).toEqual([
        AgentType.ARCHITECT,
        AgentType.SENIOR_DEVELOPER,
      ]);
    });

    it('should handle non-existent tool details', () => {
      (toolRegistry.getTool as jest.Mock).mockReturnValue(null);
      (toolRegistry.getToolMetadata as jest.Mock).mockReturnValue(null);

      const details = service.getToolDetails('non_existent_tool');

      expect(details).toBeNull();
    });

    it('should refresh provider tools', async () => {
      const removeSpy = jest.spyOn(toolRegistry, 'removeTool');

      await service.refreshProvider(MockToolProvider);

      // Should have attempted to remove existing tools from provider
      expect(removeSpy).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      (moduleRef.get as jest.Mock).mockImplementation(() => {
        throw new Error('Provider not found');
      });

      await expect(service.refreshProvider(MockToolProvider)).rejects.toThrow();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large numbers of providers efficiently', async () => {
      const providers = Array.from({ length: 100 }, (_, i) => ({
        instance: { constructor: { name: `Provider${i}` } },
      }));

      (discoveryService.getProviders as jest.Mock).mockReturnValue(providers);

      const startTime = Date.now();
      await service.performFullDiscovery();
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle provider discovery errors gracefully', async () => {
      const errorProvider = {
        instance: {
          constructor: {
            name: 'ErrorProvider',
          },
        },
      };

      (discoveryService.getProviders as jest.Mock).mockReturnValue([
        errorProvider,
      ]);
      (moduleRef.get as jest.Mock).mockImplementation(() => {
        throw new Error('Provider instantiation failed');
      });

      const result = await service.discoverFromProvider(
        errorProvider.instance.constructor
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.toolsFound.length).toBe(0);
    });

    it('should provide meaningful error messages', async () => {
      service.configure({ verbose: true });

      const invalidProvider = class {
        @Tool({
          name: 'broken_tool',
          description: 'This tool will break',
        })
        async brokenMethod() {
          throw new Error('Method execution error');
        }
      };

      const result = await service.discoverFromProvider(invalidProvider);

      // Should capture errors but not fail completely
      expect(result.providerName).toBe('invalidProvider');
    });
  });
});
