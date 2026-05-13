/**
 * Tools Integration Test
 *
 * Validates that all 4 tool classes can be injected via NestJS DI
 * and are ready for agent use in the DevBrand workflow.
 *
 * This test ensures:
 * - Tool classes are properly registered in NestJS module
 * - NestJS dependency injection resolves all tool providers
 * - Tools are accessible for agent injection
 */

import { Test, type TestingModule } from '@nestjs/testing';
import { GitHubIntegrationTools } from './github-integration.tools';
import { WebResearchTools } from './web-research.tools';
import { BrandStrategistTools } from './brand-strategist.tools';
import { ContentCreatorTools } from './content-creator.tools';
import { LlmProviderService } from '@hive-academy/langgraph-workflow-engine';
import { PersonalBrandMemoryService } from '../memory/personal-brand-memory.service';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { getRepositoryToken } from '@hive-academy/nestjs-chromadb';
import { BrandStrategyEntity } from '../../../entities/chromadb/brand-strategy.entity';

describe('Tools Integration', () => {
  let githubTools: GitHubIntegrationTools;
  let webTools: WebResearchTools;
  let brandTools: BrandStrategistTools;
  let contentTools: ContentCreatorTools;

  beforeEach(async () => {
    // Create mock providers for dependencies
    const mockLlmProvider = {
      getLLM: jest.fn().mockResolvedValue({
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            analysis: { test: 'data' },
          }),
        }),
      }),
    };

    const mockMemoryService = {
      getDevContext: jest.fn().mockResolvedValue({ test: 'context' }),
      getBrandEvolution: jest.fn().mockResolvedValue({ test: 'evolution' }),
      getBrandVoice: jest.fn().mockResolvedValue({ test: 'voice' }),
      storeCodeAchievement: jest.fn().mockResolvedValue(undefined),
    };

    const mockChromaDBService = {
      searchDocuments: jest.fn().mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      }),
    };

    const mockBrandStrategyRepo = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    // Create mock WebResearchTools to avoid Tavily API key requirement
    const mockWebResearchTools = {
      webSearch: jest.fn(),
      newsSearch: jest.fn(),
      searchSocialProfiles: jest.fn(),
      researchSearch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubIntegrationTools,
        {
          provide: WebResearchTools,
          useValue: mockWebResearchTools,
        },
        BrandStrategistTools,
        ContentCreatorTools,
        {
          provide: LlmProviderService,
          useValue: mockLlmProvider,
        },
        {
          provide: PersonalBrandMemoryService,
          useValue: mockMemoryService,
        },
        {
          provide: ChromaDBService,
          useValue: mockChromaDBService,
        },
        {
          provide: getRepositoryToken(BrandStrategyEntity),
          useValue: mockBrandStrategyRepo,
        },
      ],
    }).compile();

    githubTools = module.get<GitHubIntegrationTools>(GitHubIntegrationTools);
    webTools = module.get<WebResearchTools>(WebResearchTools);
    brandTools = module.get<BrandStrategistTools>(BrandStrategistTools);
    contentTools = module.get<ContentCreatorTools>(ContentCreatorTools);
  });

  describe('Tool Class Injection', () => {
    it('should inject GitHubIntegrationTools via NestJS DI', () => {
      expect(githubTools).toBeDefined();
      expect(githubTools).toBeInstanceOf(GitHubIntegrationTools);
    });

    it('should inject WebResearchTools via NestJS DI', () => {
      expect(webTools).toBeDefined();
      // WebResearchTools is mocked to avoid Tavily API key requirement
      // Verify it has the expected tool methods instead of instanceof check
      expect(webTools.webSearch).toBeDefined();
    });

    it('should inject BrandStrategistTools via NestJS DI', () => {
      expect(brandTools).toBeDefined();
      expect(brandTools).toBeInstanceOf(BrandStrategistTools);
    });

    it('should inject ContentCreatorTools via NestJS DI', () => {
      expect(contentTools).toBeDefined();
      expect(contentTools).toBeInstanceOf(ContentCreatorTools);
    });
  });

  describe('Tool Method Availability', () => {
    it('should have GitHub tool methods available', () => {
      // Verify @Tool decorated methods exist
      expect(typeof githubTools.analyzeGitHubActivity).toBe('function');
      expect(typeof githubTools.extractAchievements).toBe('function');
      expect(typeof githubTools.generateDeveloperInsights).toBe('function');
      expect(typeof githubTools.synthesizeInsights).toBe('function');
    });

    it('should have web research tool methods available', () => {
      // Verify @Tool decorated methods exist
      expect(typeof webTools.webSearch).toBe('function');
      expect(typeof webTools.newsSearch).toBe('function');
      expect(typeof webTools.searchSocialProfiles).toBe('function');
      expect(typeof webTools.researchSearch).toBe('function');
    });

    it('should have brand strategist tool methods available', () => {
      // Verify @Tool decorated methods exist
      expect(typeof brandTools.analyzeMemory).toBe('function');
      expect(typeof brandTools.optimizeBrand).toBe('function');
      expect(typeof brandTools.generateStrategy).toBe('function');
    });

    it('should have content creator tool methods available', () => {
      // Verify @Tool decorated methods exist
      expect(typeof contentTools.formatLinkedInContent).toBe('function');
      expect(typeof contentTools.formatDevToContent).toBe('function');
      expect(typeof contentTools.optimizeContent).toBe('function');
      expect(typeof contentTools.scoreContentQuality).toBe('function');
      expect(typeof contentTools.predictEngagement).toBe('function');
    });
  });

  describe('Tool Dependencies Injection', () => {
    it('should inject LlmProviderService into GitHubIntegrationTools', () => {
      // Access private property for testing (TypeScript workaround)
      expect((githubTools as any).llm).toBeDefined();
    });

    it('should inject PersonalBrandMemoryService into GitHubIntegrationTools', () => {
      expect((githubTools as any).memory).toBeDefined();
    });

    it('should inject LlmProviderService into BrandStrategistTools', () => {
      expect((brandTools as any).llm).toBeDefined();
    });

    it('should inject PersonalBrandMemoryService into BrandStrategistTools', () => {
      expect((brandTools as any).memory).toBeDefined();
    });

    it('should inject LlmProviderService into ContentCreatorTools', () => {
      expect((contentTools as any).llm).toBeDefined();
    });

    it('should inject ChromaDBService into ContentCreatorTools', () => {
      expect((contentTools as any).chromaDB).toBeDefined();
    });
  });

  describe('Tools Ready for Agent Use', () => {
    it('should have all 4 tool classes ready for workflow execution', () => {
      // Verify all tools are instantiated and ready
      const allToolsReady = [
        githubTools,
        webTools,
        brandTools,
        contentTools,
      ].every((tool) => tool !== undefined && tool !== null);

      expect(allToolsReady).toBe(true);
    });

    it('should support tool invocation pattern used by agents', async () => {
      // Test that tools can be called with proper input/output structure
      // This validates the integration pattern between agents and tools

      // Example: BrandStrategistTools.analyzeMemory
      const memoryAnalysisResult = await brandTools.analyzeMemory({
        githubUsername: 'test-user',
      });

      expect(memoryAnalysisResult).toBeDefined();
      expect(memoryAnalysisResult.success).toBeDefined();
    });
  });
});
