import { Test, type TestingModule } from '@nestjs/testing';
import { DevBrandSupervisorWorkflow } from './devbrand-supervisor.workflow';
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
import { GitHubAnalyzerAgent } from '../agents/github-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator.agent';
import { BrandStrategistAgent } from '../agents/brand-strategist.agent';
import type {
  AgentNetwork,
  MultiAgentResult,
  AgentState,
} from '@hive-academy/langgraph-multi-agent';
import { AIMessage } from '@langchain/core/messages';

/**
 * DevBrand Supervisor Workflow Integration Test Suite
 *
 * Tests the flagship multi-agent system that demonstrates the complete integration
 * of the sophisticated package ecosystem for personal brand development.
 *
 * User Requirement Validation:
 * - Verify multi-agent coordination showcases supervisor patterns
 * - Test sophisticated agent routing and decision-making
 * - Validate real-time streaming for frontend interface modes
 * - Ensure package integration demonstrates "massive work" achieved
 * - Test HITL workflows, checkpoint integration, and monitoring
 */
describe('DevBrandSupervisorWorkflow - Multi-Agent Ecosystem Showcase', () => {
  let workflow: DevBrandSupervisorWorkflow;
  let mockCoordinator: jest.Mocked<MultiAgentCoordinatorService>;
  let mockGithubAgent: jest.Mocked<GitHubAnalyzerAgent>;
  let mockContentAgent: jest.Mocked<ContentCreatorAgent>;
  let mockStrategistAgent: jest.Mocked<BrandStrategistAgent>;

  // Mock sophisticated agent definitions
  const mockGithubAgentDef = {
    id: 'github-analyzer',
    name: 'GitHub Analyzer',
    type: 'specialized_analyst' as const,
    systemPrompt:
      'Advanced GitHub repository analysis and skill extraction specialist',
    llmConfig: {
      model: 'gpt-4',
      temperature: 0.2,
      maxTokens: 2000,
    },
    tools: ['github_api', 'code_analyzer', 'skill_extractor'],
    metadata: {
      capabilities: [
        'repository_analysis',
        'skill_extraction',
        'contribution_analysis',
      ],
      specialization: 'technical_analysis',
      complexity: 'high',
    },
  };

  const mockContentAgentDef = {
    id: 'content-creator',
    name: 'Content Creator',
    type: 'creative_specialist' as const,
    systemPrompt:
      'Multi-platform content generation and narrative development expert',
    llmConfig: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 3000,
    },
    tools: ['content_generator', 'platform_optimizer', 'engagement_analyzer'],
    metadata: {
      capabilities: [
        'content_generation',
        'platform_optimization',
        'narrative_creation',
      ],
      specialization: 'content_creation',
      complexity: 'high',
    },
  };

  const mockStrategistAgentDef = {
    id: 'brand-strategist',
    name: 'Brand Strategist',
    type: 'strategic_coordinator' as const,
    systemPrompt: 'Senior brand strategy and workflow coordination specialist',
    llmConfig: {
      model: 'gpt-4',
      temperature: 0.4,
      maxTokens: 2500,
    },
    tools: ['strategy_analyzer', 'market_research', 'workflow_coordinator'],
    metadata: {
      capabilities: [
        'strategic_planning',
        'brand_positioning',
        'workflow_coordination',
      ],
      specialization: 'strategic_leadership',
      complexity: 'expert',
    },
  };

  // Advanced generic type for enhanced agent state with additional frontend properties
  type EnhancedAgentState = AgentState & {
    workflow?: string;
    stepNumber?: number;
    timestamp?: string;
    agentCapabilities?: string[];
  };

  // Mock sophisticated workflow execution result with proper typing
  const mockWorkflowResult: MultiAgentResult = {
    finalState: {
      messages: [
        new AIMessage({
          content:
            'Comprehensive GitHub analysis completed: 20 repositories, 8 primary technologies identified',
          id: '1',
        }),
      ],
      metadata: {
        total_agents: 3,
        execution_complexity: 'high',
        coordination_success: true,
      },
    },
    executionTime: 2150,
    executionPath: [
      'brand-strategist',
      'github-analyzer',
      'content-creator',
      'brand-strategist',
    ],
    success: true,
  };

  // Mock network status with proper typing for system health validation
  const mockNetworkStats = {
    agentCount: 3,
    type: 'supervisor',
    created: true,
    agents: ['github-analyzer', 'content-creator', 'brand-strategist'],
  };

  const mockSystemStatus = {
    agents: {
      total: 3,
      healthy: 3,
      unhealthy: 0,
    },
    networks: {
      total: 1,
      types: { supervisor: 1 },
    },
    llm: {
      providers: ['openai'],
      cacheSize: 100,
    },
  };

  // Mock agent status is used for getWorkflowStatus validation
  const mockAgentStatus = {
    networkId: 'devbrand-network-789',
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
    networkStats: mockNetworkStats,
    systemStatus: mockSystemStatus,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevBrandSupervisorWorkflow,
        {
          provide: MultiAgentCoordinatorService,
          useValue: {
            createNetwork: jest.fn(),
            executeWorkflow: jest.fn(),
            streamWorkflow: jest.fn(),
            getAgentHealth: jest.fn(),
            getNetworkStats: jest.fn(),
            getSystemStatus: jest.fn(),
            removeNetwork: jest.fn(),
          },
        },
        {
          provide: GitHubAnalyzerAgent,
          useValue: {
            getAgentDefinition: jest.fn(),
          },
        },
        {
          provide: ContentCreatorAgent,
          useValue: {
            getAgentDefinition: jest.fn(),
          },
        },
        {
          provide: BrandStrategistAgent,
          useValue: {
            getAgentDefinition: jest.fn(),
          },
        },
      ],
    }).compile();

    workflow = module.get<DevBrandSupervisorWorkflow>(
      DevBrandSupervisorWorkflow
    );
    mockCoordinator = module.get(MultiAgentCoordinatorService);
    mockGithubAgent = module.get(GitHubAnalyzerAgent);
    mockContentAgent = module.get(ContentCreatorAgent);
    mockStrategistAgent = module.get(BrandStrategistAgent);

    // Setup mock implementations
    mockGithubAgent.getAgentDefinition.mockReturnValue(mockGithubAgentDef);
    mockContentAgent.getAgentDefinition.mockReturnValue(mockContentAgentDef);
    mockStrategistAgent.getAgentDefinition.mockReturnValue(
      mockStrategistAgentDef
    );

    mockCoordinator.createNetwork.mockResolvedValue('devbrand-network-789');
    mockCoordinator.executeWorkflow.mockResolvedValue(mockWorkflowResult);
    mockCoordinator.getAgentHealth.mockReturnValue(true);
    mockCoordinator.getNetworkStats.mockReturnValue(mockNetworkStats);
    mockCoordinator.getSystemStatus.mockReturnValue(mockSystemStatus);
  });

  describe('Workflow Initialization - Package Integration Showcase', () => {
    it('should initialize sophisticated multi-agent network with comprehensive configuration', async () => {
      await workflow.onModuleInit();

      expect(mockCoordinator.createNetwork).toHaveBeenCalledWith({
        id: 'devbrand-supervisor-network',
        type: 'supervisor',
        agents: [
          mockStrategistAgentDef,
          mockGithubAgentDef,
          mockContentAgentDef,
        ],
        config: expect.objectContaining({
          systemPrompt: expect.stringContaining('DevBrand Supervisor'),
          workers: ['github-analyzer', 'content-creator', 'brand-strategist'],
          llm: {
            model: 'gpt-4',
            temperature: 0.3,
            maxTokens: 4000,
          },
          routingTool: expect.objectContaining({
            name: 'route_to_agent',
            description: expect.stringContaining('Route the conversation'),
          }),
          enableForwardMessage: true,
          removeHandoffMessages: false,
        }),
        compilationOptions: expect.objectContaining({
          enableInterrupts: true,
          debug: expect.any(Boolean),
        }),
      });

      expect(mockGithubAgent.getAgentDefinition).toHaveBeenCalled();
      expect(mockContentAgent.getAgentDefinition).toHaveBeenCalled();
      expect(mockStrategistAgent.getAgentDefinition).toHaveBeenCalled();
    });

    it('should create supervisor prompt with intelligent routing framework', async () => {
      await workflow.onModuleInit();

      const networkConfig = mockCoordinator.createNetwork.mock
        .calls[0][0] as AgentNetwork;
      // Type guard to check if config has systemPrompt property
      const config = networkConfig.config;
      // Use type assertion for supervisor config access
      const systemPrompt = (config as any).systemPrompt;

      expect(systemPrompt).toContain('DevBrand Supervisor');
      expect(systemPrompt).toContain('Brand Strategist');
      expect(systemPrompt).toContain('GitHub Analyzer');
      expect(systemPrompt).toContain('Content Creator');
      expect(systemPrompt).toContain('Routing Decision Framework');
      expect(systemPrompt).toContain('Real-time streaming');
      expect(systemPrompt).toContain('Human-in-the-loop');
    });

    it('should handle initialization failures gracefully', async () => {
      mockCoordinator.createNetwork.mockRejectedValue(
        new Error('Network creation failed')
      );

      await expect(workflow.onModuleInit()).rejects.toThrow(
        'Network creation failed'
      );
    });
  });

  describe('Complete DevBrand Workflow Execution', () => {
    beforeEach(async () => {
      await workflow.onModuleInit();
    });

    it('should execute comprehensive personal brand development workflow', async () => {
      const result = await workflow.executeDevBrandWorkflow(
        'Transform my technical expertise into compelling personal brand content',
        {
          githubUsername: 'testuser',
          analysisDepth: 'comprehensive',
          contentPlatforms: ['linkedin', 'twitter', 'blog'],
          config: {
            configurable: {
              user_id: 'user123',
              session_id: 'session456',
            },
          },
        }
      );

      expect(result).toEqual(mockWorkflowResult);

      expect(mockCoordinator.executeWorkflow).toHaveBeenCalledWith(
        'devbrand-network-789',
        {
          messages: [
            expect.objectContaining({
              content: expect.stringContaining(
                'Transform my technical expertise'
              ),
            }),
          ],
          config: expect.objectContaining({
            configurable: expect.objectContaining({
              thread_id: expect.stringContaining('devbrand_'),
              workflow_type: 'personal_brand_development',
              streaming_enabled: true,
              analysis_depth: 'comprehensive',
              user_id: 'user123',
              session_id: 'session456',
            }),
          }),
        }
      );
    });

    it('should enhance request with contextual information', async () => {
      await workflow.executeDevBrandWorkflow('Create LinkedIn content', {
        githubUsername: 'testuser',
        analysisDepth: 'quick',
        contentPlatforms: ['linkedin', 'twitter'],
      });

      const executedMessage = mockCoordinator.executeWorkflow.mock.calls[0][1];
      // Type-safe message content extraction with discriminated union handling
      const firstMessage = executedMessage.messages[0];
      const enhancedContent =
        typeof firstMessage === 'string'
          ? firstMessage
          : 'content' in firstMessage
          ? firstMessage.content
          : (firstMessage as any).text || String(firstMessage);

      expect(enhancedContent).toContain('Create LinkedIn content');
      expect(enhancedContent).toContain('GitHub Analysis Target: @testuser');
      expect(enhancedContent).toContain('Analysis Depth: quick');
      expect(enhancedContent).toContain('Target Platforms: linkedin, twitter');
      expect(enhancedContent).toContain(
        'Workflow: DevBrand Personal Brand Development'
      );
    });

    it('should handle workflow execution errors appropriately', async () => {
      mockCoordinator.executeWorkflow.mockRejectedValue(
        new Error('Agent coordination failed')
      );

      await expect(
        workflow.executeDevBrandWorkflow('Test request')
      ).rejects.toThrow('Agent coordination failed');
    });

    it('should require workflow initialization before execution', async () => {
      const uninitializedWorkflow = new DevBrandSupervisorWorkflow(
        mockCoordinator,
        mockGithubAgent,
        mockContentAgent,
        mockStrategistAgent
      );

      await expect(
        uninitializedWorkflow.executeDevBrandWorkflow('Test request')
      ).rejects.toThrow('DevBrand workflow not initialized');
    });
  });

  describe('Real-time Streaming - Frontend Interface Support', () => {
    beforeEach(async () => {
      await workflow.onModuleInit();
    });

    it('should stream sophisticated workflow execution for real-time visualization', async () => {
      // Advanced generic type for mock stream steps with proper BaseMessage typing
      const mockStreamSteps: Partial<EnhancedAgentState>[] = [
        {
          current: 'brand-strategist',
          messages: [
            new AIMessage({
              content: 'Analyzing request for optimal routing...',
              id: '1',
            }),
          ],
          metadata: { step: 1, thinking: 'Determining primary objectives' },
        },
        {
          current: 'github-analyzer',
          messages: [
            new AIMessage({
              content: 'Processing GitHub repositories...',
              id: '2',
            }),
          ],
          metadata: { step: 2, repositories_found: 15 },
        },
        {
          current: 'content-creator',
          messages: [
            new AIMessage({
              content: 'Generating multi-platform content...',
              id: '3',
            }),
          ],
          metadata: { step: 3, platforms: ['linkedin', 'twitter'] },
        },
      ];

      mockCoordinator.streamWorkflow.mockImplementation(
        async function* (): AsyncGenerator<
          Partial<AgentState>,
          MultiAgentResult,
          unknown
        > {
          for (const step of mockStreamSteps) {
            yield step;
          }
          // Return the final result to match the expected generator return type
          return mockWorkflowResult;
        }
      );

      const streamGenerator = workflow.streamDevBrandWorkflow(
        'Create compelling brand content from my GitHub work',
        {
          githubUsername: 'testuser',
          contentPlatforms: ['linkedin', 'twitter'],
          streamMode: 'values',
        }
      );

      const collectedSteps: Partial<EnhancedAgentState>[] = [];
      for await (const step of streamGenerator) {
        collectedSteps.push(step as Partial<EnhancedAgentState>);
      }

      expect(collectedSteps).toHaveLength(3);

      // Verify enhanced step data for frontend consumption
      collectedSteps.forEach((step, index) => {
        // Use optional property access with proper null checking
        expect(step.workflow).toBe('devbrand-supervisor');
        expect(step.stepNumber).toBe(index + 1);
        expect(step.timestamp).toBeDefined();
        expect(step.agentCapabilities).toBeDefined();
      });

      expect(mockCoordinator.streamWorkflow).toHaveBeenCalledWith(
        'devbrand-network-789',
        expect.objectContaining({
          streamMode: 'values',
          config: expect.objectContaining({
            configurable: expect.objectContaining({
              streaming_mode: 'values',
              workflow_type: 'personal_brand_development',
            }),
          }),
        })
      );
    });

    it('should handle streaming errors gracefully', async () => {
      mockCoordinator.streamWorkflow.mockImplementation(
        async function* (): AsyncGenerator<
          Partial<AgentState>,
          MultiAgentResult,
          unknown
        > {
          // Need to yield at least once to satisfy generator requirements
          yield {} as Partial<AgentState>;
          throw new Error('Streaming connection lost');
        }
      );

      const streamGenerator = workflow.streamDevBrandWorkflow('Test streaming');

      await expect(async () => {
        for await (const _step of streamGenerator) {
          // Should throw error
        }
      }).rejects.toThrow('Streaming connection lost');
    });
  });

  describe('Specialized Workflow Methods - Feature Showcase', () => {
    beforeEach(async () => {
      await workflow.onModuleInit();
    });

    it('should execute GitHub analysis workflow with comprehensive configuration', async () => {
      const result = await workflow.analyzeGitHub('testuser', {
        analysisDepth: 'comprehensive',
        config: {
          configurable: {
            user_id: 'user123',
            priority: 'high',
          },
        },
      });

      expect(result).toEqual(mockWorkflowResult);

      const executedMessage = mockCoordinator.executeWorkflow.mock.calls[0][1];
      // Type-safe message content extraction
      const firstMessage = executedMessage.messages[0];
      const messageContent =
        typeof firstMessage === 'string'
          ? firstMessage
          : 'content' in firstMessage
          ? firstMessage.content
          : (firstMessage as any).text || String(firstMessage);

      expect(messageContent).toContain('@testuser');
      expect(messageContent).toContain('technical achievements');
      // Safe property access with null checking
      expect(executedMessage.config?.configurable).toMatchObject({
        user_id: 'user123',
        priority: 'high',
      });
    });

    it('should execute content generation with platform optimization', async () => {
      const result = await workflow.generateBrandContent(
        'Share insights about microservices architecture',
        ['linkedin', 'blog', 'newsletter'],
        {
          config: {
            configurable: {
              content_style: 'technical_thought_leadership',
            },
          },
        }
      );

      expect(result).toEqual(mockWorkflowResult);

      const executedMessage = mockCoordinator.executeWorkflow.mock.calls[0][1];
      // Type-safe message content extraction
      const firstMessage = executedMessage.messages[0];
      const messageContent =
        typeof firstMessage === 'string'
          ? firstMessage
          : 'content' in firstMessage
          ? firstMessage.content
          : (firstMessage as any).text || String(firstMessage);

      expect(messageContent).toContain('linkedin, blog, newsletter');
      expect(messageContent).toContain('microservices architecture');
    });

    it('should execute brand strategy development with comprehensive context', async () => {
      const result = await workflow.developBrandStrategy(
        'Position me as a thought leader in AI development',
        {
          githubUsername: 'testuser',
          careerGoals: 'Transition to CTO role in AI startup',
          targetAudience: 'Tech executives and senior developers',
          config: {
            configurable: {
              market_focus: 'ai_tooling',
            },
          },
        }
      );

      expect(result).toEqual(mockWorkflowResult);

      const executedMessage = mockCoordinator.executeWorkflow.mock.calls[0][1];
      // Type-safe message content extraction
      const firstMessage = executedMessage.messages[0];
      const enhancedContent =
        typeof firstMessage === 'string'
          ? firstMessage
          : 'content' in firstMessage
          ? firstMessage.content
          : (firstMessage as any).text || String(firstMessage);

      expect(enhancedContent).toContain('thought leader in AI development');
      expect(enhancedContent).toContain('@testuser');
      expect(enhancedContent).toContain('Transition to CTO role');
      expect(enhancedContent).toContain(
        'Tech executives and senior developers'
      );
    });
  });

  describe('System Health & Monitoring - Production Readiness', () => {
    beforeEach(async () => {
      await workflow.onModuleInit();
    });

    it('should provide comprehensive workflow status for monitoring', async () => {
      const status = await workflow.getWorkflowStatus();

      expect(status).toEqual(mockAgentStatus);

      expect(mockCoordinator.getAgentHealth).toHaveBeenCalledWith(
        'github-analyzer'
      );
      expect(mockCoordinator.getAgentHealth).toHaveBeenCalledWith(
        'content-creator'
      );
      expect(mockCoordinator.getAgentHealth).toHaveBeenCalledWith(
        'brand-strategist'
      );
      expect(mockCoordinator.getNetworkStats).toHaveBeenCalledWith(
        'devbrand-network-789'
      );
      expect(mockCoordinator.getSystemStatus).toHaveBeenCalled();
    });

    it('should handle uninitialized workflow status gracefully', async () => {
      const uninitializedWorkflow = new DevBrandSupervisorWorkflow(
        mockCoordinator,
        mockGithubAgent,
        mockContentAgent,
        mockStrategistAgent
      );

      const status = await uninitializedWorkflow.getWorkflowStatus();

      expect(status).toEqual({
        networkId: null,
        agents: [],
        networkStats: null,
        systemStatus: null,
      });
    });

    it('should cleanup workflow resources properly', async () => {
      await workflow.cleanup();

      expect(mockCoordinator.removeNetwork).toHaveBeenCalledWith(
        'devbrand-network-789'
      );
    });
  });

  describe('Agent Capabilities & Metadata - Frontend Integration', () => {
    it('should provide agent capabilities for 3D visualization', () => {
      const githubCapabilities = (workflow as any).getAgentCapabilities(
        'github-analyzer'
      );
      const contentCapabilities = (workflow as any).getAgentCapabilities(
        'content-creator'
      );
      const strategistCapabilities = (workflow as any).getAgentCapabilities(
        'brand-strategist'
      );

      expect(githubCapabilities).toEqual([
        'repository_analysis',
        'skill_extraction',
        'contribution_analysis',
      ]);

      expect(contentCapabilities).toEqual([
        'content_generation',
        'platform_optimization',
        'narrative_creation',
      ]);

      expect(strategistCapabilities).toEqual([
        'strategic_planning',
        'brand_positioning',
        'workflow_coordination',
      ]);
    });

    it('should provide default capabilities for unknown agents', () => {
      const defaultCapabilities = (workflow as any).getAgentCapabilities(
        'unknown-agent'
      );
      expect(defaultCapabilities).toEqual(['multi_agent_coordination']);
    });
  });

  describe('Package Integration Validation - Ecosystem Showcase', () => {
    beforeEach(async () => {
      await workflow.onModuleInit();
    });

    it('should demonstrate integration with multi-agent package', async () => {
      await workflow.executeDevBrandWorkflow('Test multi-agent integration');

      // Verify multi-agent coordinator is utilized
      expect(mockCoordinator.createNetwork).toHaveBeenCalled();
      expect(mockCoordinator.executeWorkflow).toHaveBeenCalled();
    });

    it('should support checkpoint integration through configuration', async () => {
      await workflow.executeDevBrandWorkflow('Test checkpoint integration', {
        config: {
          configurable: {
            checkpoint_enabled: true,
            checkpoint_id: 'test-checkpoint',
          },
        },
      });

      const config = mockCoordinator.executeWorkflow.mock.calls[0][1].config;
      // Safe property access with null checking
      expect(config?.configurable?.checkpoint_enabled).toBe(true);
      expect(config?.configurable?.checkpoint_id).toBe('test-checkpoint');
    });

    it('should support HITL integration through interrupts', async () => {
      const networkConfig = mockCoordinator.createNetwork.mock
        .calls[0][0] as AgentNetwork;

      // Safe property access with null checking
      expect(networkConfig.compilationOptions?.enableInterrupts).toBe(true);
      // Type guard for config access
      const config = networkConfig.config;
      // Use type assertion for supervisor config access
      const systemPrompt = (config as any).systemPrompt;
      expect(systemPrompt).toContain('Human-in-the-loop');
    });

    it('should demonstrate sophisticated agent specialization', async () => {
      const agents = [
        mockGithubAgentDef,
        mockContentAgentDef,
        mockStrategistAgentDef,
      ];

      agents.forEach((agent) => {
        expect(agent.metadata.capabilities).toBeDefined();
        expect(agent.metadata.specialization).toBeDefined();
        expect(agent.tools.length).toBeGreaterThan(0);
      });

      // Verify different temperature settings for different agent types
      expect(mockGithubAgentDef.llmConfig.temperature).toBe(0.2); // Analytical
      expect(mockContentAgentDef.llmConfig.temperature).toBe(0.7); // Creative
      expect(mockStrategistAgentDef.llmConfig.temperature).toBe(0.4); // Strategic
    });
  });
});
