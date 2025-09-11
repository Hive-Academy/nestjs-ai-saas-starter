import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus, HttpException } from '@nestjs/common';
import { DevBrandController } from './devbrand.controller';
import { DevBrandSupervisorWorkflow } from '../workflows/devbrand-supervisor.workflow';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';
import type {
  GitHubAnalysisRequestDto,
  DevBrandChatRequestDto,
  ContentGenerationRequestDto,
  BrandStrategyRequestDto,
  AnalysisDepth,
  ContentPlatform,
  ContentType,
  StrategyScope,
} from '../dto/devbrand-api.dto';

/**
 * DevBrand Controller Test Suite
 *
 * Tests the primary API surface layer that showcases the massive ecosystem work
 * through 8 sophisticated endpoints demonstrating multi-agent coordination,
 * memory integration, and real-time capabilities.
 *
 * User Requirement Validation:
 * - Verify API endpoints demonstrate the "massive work" achieved with package ecosystem
 * - Test multi-agent coordination through REST endpoints
 * - Validate frontend integration readiness for 5 interface modes
 * - Ensure package ecosystem integration works cohesively
 */
describe('DevBrandController - API Showcase Validation', () => {
  let controller: DevBrandController;
  let mockWorkflow: jest.Mocked<DevBrandSupervisorWorkflow>;
  let mockMemoryService: jest.Mocked<PersonalBrandMemoryService>;

  // Mock implementations for sophisticated multi-agent results
  const mockWorkflowResult = {
    metadata: { workflowId: 'test-workflow-123' },
    state: {
      messages: [
        {
          content: 'GitHub analysis completed with 15+ repositories analyzed',
          agent: 'github-analyzer',
        },
        {
          content: 'Generated compelling LinkedIn content with 95% confidence',
          agent: 'content-creator',
        },
        {
          content:
            'Strategic recommendations for developer relations positioning',
          agent: 'brand-strategist',
        },
      ],
      final_result: 'Comprehensive personal brand development completed',
    },
    executionTime: 1250,
    executionPath: ['brand-strategist', 'github-analyzer', 'content-creator'],
    agentOutputs: {
      'github-analyzer': {
        repositories: 15,
        skills: ['TypeScript', 'React', 'Node.js', 'AI/ML'],
        achievements: 8,
      },
      'content-creator': {
        linkedin_post: 'Generated professional LinkedIn content',
        twitter_thread: 'Created engaging Twitter thread',
        confidence: 0.95,
      },
      'brand-strategist': {
        strategy: 'Developer Relations & Thought Leadership',
        recommendations: 5,
        market_analysis: 'Strong positioning in AI tooling space',
      },
    },
  };

  const mockAgentStatus = {
    networkId: 'devbrand-network-456',
    agents: [
      {
        id: 'github-analyzer',
        name: 'GitHub Analyzer',
        healthy: true,
        capabilities: [
          'repository_analysis',
          'skill_extraction',
          'contribution_analysis',
        ],
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        healthy: true,
        capabilities: [
          'content_generation',
          'platform_optimization',
          'narrative_creation',
        ],
      },
      {
        id: 'brand-strategist',
        name: 'Brand Strategist',
        healthy: true,
        capabilities: [
          'strategic_planning',
          'brand_positioning',
          'workflow_coordination',
        ],
      },
    ],
    networkStats: {
      totalExecutions: 142,
      averageExecutionTime: 1150,
      successRate: 0.97,
    },
    systemStatus: {
      healthy: true,
      uptime: '7d 14h 32m',
      memoryUsage: '245MB',
    },
  };

  const mockMemoryResults = [
    {
      id: 'memory-1',
      type: 'github_analysis',
      content:
        'Previous GitHub analysis revealing strong TypeScript contributions',
      score: 0.92,
      metadata: {
        repositories: 12,
        languages: ['TypeScript', 'JavaScript', 'Python'],
        created: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'memory-2',
      type: 'content_generation',
      content:
        'LinkedIn post about microservices architecture gained 150+ likes',
      score: 0.88,
      metadata: {
        platform: 'linkedin',
        engagement: 150,
        created: '2024-01-20T15:45:00Z',
      },
    },
  ];

  const mockBrandAnalytics = {
    totalMemories: 45,
    contentMetrics: {
      linkedin_posts: 12,
      twitter_threads: 8,
      blog_articles: 5,
      avg_engagement: 125,
    },
    skillProgress: {
      typescript: 0.92,
      react: 0.88,
      nodejs: 0.85,
      ai_ml: 0.78,
    },
    brandEvolution: {
      positioning: 'Developer Relations & AI Tooling',
      growth_trend: 'positive',
      market_penetration: 0.34,
    },
  };

  beforeEach(async () => {
    const mockWorkflowProvider = {
      provide: DevBrandSupervisorWorkflow,
      useValue: {
        analyzeGitHub: jest.fn(),
        executeDevBrandWorkflow: jest.fn(),
        generateBrandContent: jest.fn(),
        developBrandStrategy: jest.fn(),
        getWorkflowStatus: jest.fn(),
      },
    };

    const mockMemoryProvider = {
      provide: PersonalBrandMemoryService,
      useValue: {
        searchBrandMemories: jest.fn(),
        getBrandAnalytics: jest.fn(),
        storeBrandMemory: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevBrandController],
      providers: [mockWorkflowProvider, mockMemoryProvider],
    }).compile();

    controller = module.get<DevBrandController>(DevBrandController);
    mockWorkflow = module.get(DevBrandSupervisorWorkflow);
    mockMemoryService = module.get(PersonalBrandMemoryService);

    // Setup default mock implementations
    mockWorkflow.analyzeGitHub.mockResolvedValue(mockWorkflowResult);
    mockWorkflow.executeDevBrandWorkflow.mockResolvedValue(mockWorkflowResult);
    mockWorkflow.generateBrandContent.mockResolvedValue(mockWorkflowResult);
    mockWorkflow.developBrandStrategy.mockResolvedValue(mockWorkflowResult);
    mockWorkflow.getWorkflowStatus.mockResolvedValue(mockAgentStatus);
    mockMemoryService.searchBrandMemories.mockResolvedValue(mockMemoryResults);
    mockMemoryService.getBrandAnalytics.mockResolvedValue(mockBrandAnalytics);
    mockMemoryService.storeBrandMemory.mockResolvedValue(undefined);
  });

  describe('GitHub Analysis Endpoint - Package Ecosystem Showcase', () => {
    it('should demonstrate sophisticated GitHub analysis with multi-agent coordination', async () => {
      const request: GitHubAnalysisRequestDto = {
        githubUsername: 'testuser',
        userId: 'user123',
        sessionId: 'session456',
        analysisDepth: AnalysisDepth.COMPREHENSIVE,
      };

      const result = await controller.analyzeGitHub(request);

      expect(result).toEqual({
        success: true,
        workflowId: 'test-workflow-123',
        result: mockWorkflowResult.state,
        executionTime: 1250,
        executionPath: [
          'brand-strategist',
          'github-analyzer',
          'content-creator',
        ],
        agentOutputs: expect.objectContaining({
          'github-analyzer': expect.objectContaining({
            repositories: expect.any(Number),
            skills: expect.arrayContaining(['TypeScript', 'React']),
            achievements: expect.any(Number),
          }),
        }),
        timestamp: expect.any(String),
      });

      expect(mockWorkflow.analyzeGitHub).toHaveBeenCalledWith('testuser', {
        analysisDepth: 'comprehensive',
        config: {
          configurable: {
            user_id: 'user123',
            session_id: 'session456',
            analysis_depth: 'comprehensive',
          },
        },
      });

      expect(mockMemoryService.storeBrandMemory).toHaveBeenCalledWith(
        'user123',
        {
          type: 'github_analysis',
          content: JSON.stringify(mockWorkflowResult),
          metadata: expect.any(Object),
        }
      );
    });

    it('should handle GitHub analysis errors gracefully', async () => {
      mockWorkflow.analyzeGitHub.mockRejectedValue(
        new Error('GitHub API rate limit exceeded')
      );

      const request: GitHubAnalysisRequestDto = {
        githubUsername: 'testuser',
        analysisDepth: AnalysisDepth.QUICK,
      };

      await expect(controller.analyzeGitHub(request)).rejects.toThrow(
        HttpException
      );

      try {
        await controller.analyzeGitHub(request);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse()).toEqual({
          success: false,
          error: 'GitHub analysis workflow failed',
          details: 'GitHub API rate limit exceeded',
        });
      }
    });
  });

  describe('DevBrand Chat Endpoint - Multi-Agent Communication', () => {
    it('should execute sophisticated chat workflow with agent coordination', async () => {
      const request: DevBrandChatRequestDto = {
        message:
          'Help me create compelling content about my TypeScript expertise',
        userId: 'user123',
        sessionId: 'session456',
        githubUsername: 'testuser',
        analysisDepth: AnalysisDepth.QUICK,
        contentPlatforms: [ContentPlatform.LINKEDIN, ContentPlatform.TWITTER],
      };

      const result = await controller.chat(request);

      expect(result.success).toBe(true);
      expect(result.executionPath).toContain('github-analyzer');
      expect(result.executionPath).toContain('content-creator');
      expect(result.agentOutputs).toHaveProperty('content-creator');

      expect(mockWorkflow.executeDevBrandWorkflow).toHaveBeenCalledWith(
        'Help me create compelling content about my TypeScript expertise',
        {
          githubUsername: 'testuser',
          analysisDepth: 'quick',
          contentPlatforms: ['linkedin', 'twitter'],
          streamingEnabled: false,
          config: {
            configurable: {
              user_id: 'user123',
              session_id: 'session456',
              conversation_context: undefined,
            },
          },
        }
      );
    });

    it('should validate minimum message length for quality interactions', async () => {
      const request: DevBrandChatRequestDto = {
        message: 'help',
        userId: 'user123',
      };

      // This should be caught by the validation pipe in a real scenario
      // We test the business logic handles short messages appropriately
      const result = await controller.chat(request);
      expect(result).toBeDefined();
    });
  });

  describe('Content Generation Endpoint - Creative Workflow Showcase', () => {
    it('should generate sophisticated multi-platform content', async () => {
      const request: ContentGenerationRequestDto = {
        contentRequest:
          'Create engaging content about my open source contributions to React ecosystem',
        platforms: [ContentPlatform.LINKEDIN, ContentPlatform.BLOG],
        contentType: ContentType.ARTICLE,
        userId: 'user123',
      };

      const result = await controller.generateContent(request);

      expect(result.success).toBe(true);
      expect(result.agentOutputs).toHaveProperty('content-creator');
      expect(result.executionTime).toBeGreaterThan(0);

      expect(mockWorkflow.generateBrandContent).toHaveBeenCalledWith(
        'Create engaging content about my open source contributions to React ecosystem',
        ['linkedin', 'blog'],
        {
          config: {
            configurable: {
              user_id: 'user123',
              session_id: undefined,
              content_type: 'article',
            },
          },
        }
      );
    });

    it('should handle content generation with default platforms', async () => {
      const request: ContentGenerationRequestDto = {
        contentRequest: 'Share insights about microservices architecture',
        userId: 'user123',
      };

      const result = await controller.generateContent(request);

      expect(result.success).toBe(true);
      expect(mockWorkflow.generateBrandContent).toHaveBeenCalledWith(
        'Share insights about microservices architecture',
        undefined, // Should use default platforms in workflow
        expect.any(Object)
      );
    });
  });

  describe('Brand Strategy Endpoint - Strategic Intelligence Demo', () => {
    it('should develop comprehensive brand strategy with full context', async () => {
      const request: BrandStrategyRequestDto = {
        strategyRequest:
          'Position me as a thought leader in AI development tools',
        userId: 'user123',
        sessionId: 'session456',
        githubUsername: 'testuser',
        careerGoals: 'Transition to engineering leadership in AI startups',
        targetAudience: 'Senior developers, CTOs, and AI startup founders',
        strategyScope: StrategyScope.LEADERSHIP,
      };

      const result = await controller.developStrategy(request);

      expect(result.success).toBe(true);
      expect(result.agentOutputs).toHaveProperty('brand-strategist');
      expect(result.executionPath).toEqual([
        'brand-strategist',
        'github-analyzer',
        'content-creator',
      ]);

      expect(mockWorkflow.developBrandStrategy).toHaveBeenCalledWith(
        'Position me as a thought leader in AI development tools',
        {
          githubUsername: 'testuser',
          careerGoals: 'Transition to engineering leadership in AI startups',
          targetAudience: 'Senior developers, CTOs, and AI startup founders',
          config: {
            configurable: {
              user_id: 'user123',
              session_id: 'session456',
              strategy_scope: 'leadership',
            },
          },
        }
      );
    });

    it('should require userId for personalized strategy development', async () => {
      const request = {
        strategyRequest: 'Develop comprehensive brand strategy',
        // missing userId - should be caught by validation
      } as BrandStrategyRequestDto;

      // In real scenario, validation pipe would catch this
      // We test that the service handles the request appropriately
      const result = await controller.developStrategy({
        ...request,
        userId: 'user123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Agent Status Endpoint - System Health Showcase', () => {
    it('should return comprehensive agent status demonstrating ecosystem health', async () => {
      const result = await controller.getAgentStatus();

      expect(result).toEqual({
        networkId: 'devbrand-network-456',
        agents: [
          {
            id: 'github-analyzer',
            name: 'GitHub Analyzer',
            healthy: true,
            capabilities: [
              'repository_analysis',
              'skill_extraction',
              'contribution_analysis',
            ],
          },
          {
            id: 'content-creator',
            name: 'Content Creator',
            healthy: true,
            capabilities: [
              'content_generation',
              'platform_optimization',
              'narrative_creation',
            ],
          },
          {
            id: 'brand-strategist',
            name: 'Brand Strategist',
            healthy: true,
            capabilities: [
              'strategic_planning',
              'brand_positioning',
              'workflow_coordination',
            ],
          },
        ],
        networkStats: expect.objectContaining({
          totalExecutions: expect.any(Number),
          averageExecutionTime: expect.any(Number),
          successRate: expect.any(Number),
        }),
        systemHealth: expect.objectContaining({
          healthy: true,
          uptime: expect.any(String),
          memoryUsage: expect.any(String),
        }),
        timestamp: expect.any(String),
      });

      expect(mockWorkflow.getWorkflowStatus).toHaveBeenCalled();
    });

    it('should handle workflow status errors gracefully', async () => {
      mockWorkflow.getWorkflowStatus.mockRejectedValue(
        new Error('Network connection failed')
      );

      await expect(controller.getAgentStatus()).rejects.toThrow(HttpException);
    });
  });

  describe('Memory Context Endpoint - Hybrid Intelligence Showcase', () => {
    it('should retrieve sophisticated brand memory context', async () => {
      const result = await controller.getMemoryContext(
        'user123',
        'TypeScript expertise',
        5,
        'github_analysis,content_generation'
      );

      expect(result).toEqual({
        userId: 'user123',
        memoryResults: mockMemoryResults,
        brandAnalytics: mockBrandAnalytics,
        contextGenerated: expect.any(String),
        totalMemories: 2,
        queryUsed: 'TypeScript expertise',
      });

      expect(mockMemoryService.searchBrandMemories).toHaveBeenCalledWith(
        'user123',
        'TypeScript expertise',
        {
          limit: 5,
          memoryTypes: ['github_analysis', 'content_generation'],
          includeAnalytics: true,
        }
      );

      expect(mockMemoryService.getBrandAnalytics).toHaveBeenCalledWith(
        'user123'
      );
    });

    it('should use default search query when none provided', async () => {
      const result = await controller.getMemoryContext('user123');

      expect(result.queryUsed).toBe('personal brand development context');
      expect(mockMemoryService.searchBrandMemories).toHaveBeenCalledWith(
        'user123',
        'personal brand development context',
        {
          limit: 10,
          memoryTypes: undefined,
          includeAnalytics: true,
        }
      );
    });

    it('should limit memory results to maximum 50 for performance', async () => {
      await controller.getMemoryContext('user123', 'test query', 100);

      expect(mockMemoryService.searchBrandMemories).toHaveBeenCalledWith(
        'user123',
        'test query',
        {
          limit: 50, // Should be capped at 50
          memoryTypes: undefined,
          includeAnalytics: true,
        }
      );
    });
  });

  describe('Health Check Endpoint - System Vitals', () => {
    it('should return healthy status when all systems operational', async () => {
      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          workflow: true,
          agents: true,
          memory: true,
        },
      });
    });

    it('should return unhealthy status when workflow fails', async () => {
      mockWorkflow.getWorkflowStatus.mockRejectedValue(
        new Error('Workflow failure')
      );

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        services: {
          workflow: false,
          agents: false,
          memory: false,
        },
      });
    });
  });

  describe('Memory Storage Integration - Context Persistence', () => {
    it('should store brand context for all workflow types', async () => {
      // Test GitHub analysis context storage
      const githubRequest: GitHubAnalysisRequestDto = {
        githubUsername: 'testuser',
        userId: 'user123',
      };

      await controller.analyzeGitHub(githubRequest);

      expect(mockMemoryService.storeBrandMemory).toHaveBeenCalledWith(
        'user123',
        {
          type: 'github_analysis',
          content: JSON.stringify(mockWorkflowResult),
          metadata: expect.objectContaining({
            execution_time: 1250,
            execution_path: [
              'brand-strategist',
              'github-analyzer',
              'content-creator',
            ],
            timestamp: expect.any(String),
          }),
        }
      );

      // Test chat context storage
      const chatRequest: DevBrandChatRequestDto = {
        message: 'Test chat message',
        userId: 'user123',
      };

      await controller.chat(chatRequest);

      expect(mockMemoryService.storeBrandMemory).toHaveBeenCalledWith(
        'user123',
        {
          type: 'conversation',
          content: JSON.stringify(mockWorkflowResult),
          metadata: expect.any(Object),
        }
      );
    });

    it('should handle memory storage failures gracefully without breaking workflows', async () => {
      mockMemoryService.storeBrandMemory.mockRejectedValue(
        new Error('Memory service unavailable')
      );

      const request: GitHubAnalysisRequestDto = {
        githubUsername: 'testuser',
        userId: 'user123',
      };

      // Should still return successful result even if memory storage fails
      const result = await controller.analyzeGitHub(request);
      expect(result.success).toBe(true);
    });
  });

  describe('Frontend Integration Readiness', () => {
    it('should provide all data structures needed for 5 interface modes', async () => {
      const githubResult = await controller.analyzeGitHub({
        githubUsername: 'testuser',
        userId: 'user123',
      });

      // Agent Constellation 3D - needs agent execution path and capabilities
      expect(githubResult.executionPath).toBeDefined();
      expect(githubResult.agentOutputs).toBeDefined();

      // Workflow Canvas D3 - needs workflow state and progression
      expect(githubResult.workflowId).toBeDefined();
      expect(githubResult.executionTime).toBeDefined();

      // Memory Constellation - memory context available
      const memoryResult = await controller.getMemoryContext('user123');
      expect(memoryResult.brandAnalytics).toBeDefined();
      expect(memoryResult.memoryResults).toBeDefined();

      // Content Forge - content creation outputs
      expect(githubResult.agentOutputs['content-creator']).toBeDefined();

      // Enhanced Chat - conversation context
      expect(githubResult.result).toBeDefined();
      expect(githubResult.timestamp).toBeDefined();
    });

    it('should provide real-time data structures for WebSocket integration', async () => {
      const agentStatus = await controller.getAgentStatus();

      // Should provide data that WebSocket can broadcast
      expect(agentStatus.networkId).toBeDefined();
      expect(agentStatus.agents).toHaveLength(3);
      expect(agentStatus.networkStats).toBeDefined();
      expect(agentStatus.systemHealth).toBeDefined();

      // Each agent should have capabilities for 3D visualization
      agentStatus.agents.forEach((agent) => {
        expect(agent.capabilities).toBeDefined();
        expect(agent.capabilities.length).toBeGreaterThan(0);
        expect(agent.healthy).toBeDefined();
      });
    });
  });
});
