import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
import type {
  AgentNetwork,
  MultiAgentResult,
  AgentState,
} from '@hive-academy/langgraph-multi-agent';

import { GitHubAnalyzerAgent } from '../agents/github-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator.agent';
import { BrandStrategistAgent } from '../agents/brand-strategist.agent';

/**
 * DevBrand Supervisor Workflow - Flagship Multi-Agent System
 *
 * This workflow demonstrates the complete integration of the multi-agent ecosystem
 * for personal brand development through intelligent GitHub analysis, content creation,
 * and strategic brand positioning.
 *
 * Architecture Pattern: Supervisor Coordination with Specialized Agents
 * - Brand Strategist: Senior coordinating agent with strategic oversight
 * - GitHub Analyzer: Technical analysis and achievement extraction
 * - Content Creator: Multi-platform content generation and optimization
 *
 * Integration Features:
 * - Real-time streaming for frontend interface modes
 * - Checkpoint integration for workflow persistence
 * - HITL (Human-in-the-loop) for content approval
 * - Monitoring integration for performance metrics
 * - Memory integration for contextual intelligence
 */
@Injectable()
export class DevBrandSupervisorWorkflow implements OnModuleInit {
  private readonly logger = new Logger(DevBrandSupervisorWorkflow.name);
  private networkId: string | null = null;

  constructor(
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService,
    private readonly githubAnalyzer: GitHubAnalyzerAgent,
    private readonly contentCreator: ContentCreatorAgent,
    private readonly brandStrategist: BrandStrategistAgent
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing DevBrand Supervisor Workflow...');
      await this.initializeWorkflow();
      this.logger.log(
        `✅ DevBrand Supervisor Workflow initialized with network ID: ${this.networkId}`
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize DevBrand Supervisor Workflow:',
        error
      );
      throw error;
    }
  }

  /**
   * Initialize the multi-agent network with supervisor coordination
   */
  private async initializeWorkflow(): Promise<void> {
    // Get agent definitions
    const githubAgent = this.githubAnalyzer.getAgentDefinition();
    const contentAgent = this.contentCreator.getAgentDefinition();
    const strategistAgent = this.brandStrategist.getAgentDefinition();

    // Create comprehensive network configuration
    const networkConfig: AgentNetwork = {
      id: 'devbrand-supervisor-network',
      type: 'supervisor',
      agents: [strategistAgent, githubAgent, contentAgent],
      config: {
        systemPrompt: this.createSupervisorPrompt(),
        workers: [githubAgent.id, contentAgent.id, strategistAgent.id],
        llm: {
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 4000,
        },
        routingTool: {
          name: 'route_to_agent',
          description:
            'Route the conversation to the most appropriate agent based on the current task and context',
        },
        enableForwardMessage: true,
        removeHandoffMessages: false, // Keep messages for workflow continuity and streaming
      },
      compilationOptions: {
        enableInterrupts: true, // For HITL integration
        debug: process.env.NODE_ENV === 'development',
        checkpointer: undefined, // Will be provided by checkpoint integration
      },
    };

    // Create and initialize the network
    this.networkId = await this.multiAgentCoordinator.createNetwork(
      networkConfig
    );

    this.logger.log(
      `DevBrand network created with ${networkConfig.agents.length} agents`
    );
    this.logger.log(
      `Agents: ${networkConfig.agents.map((a) => a.name).join(', ')}`
    );
  }

  /**
   * Create supervisor system prompt for intelligent agent routing
   */
  private createSupervisorPrompt(): string {
    return `You are the DevBrand Supervisor, coordinating a team of specialized agents to transform technical achievements into compelling personal brand content and strategy.

Your team consists of:

1. **Brand Strategist** (brand-strategist) - The strategic coordinator and senior agent
   - Use for: Overall strategy development, market analysis, career planning, workflow coordination
   - Capabilities: Strategic planning, brand positioning, competitive analysis, performance optimization
   - When to route: When comprehensive strategy is needed, for final recommendations, or for coordinating complex workflows

2. **GitHub Analyzer** (github-analyzer) - Technical achievement extraction specialist  
   - Use for: Repository analysis, skill extraction, contribution assessment, technical profiling
   - Capabilities: Code analysis, technology identification, achievement quantification, developer profiling
   - When to route: When GitHub analysis is requested, for technical skill assessment, or repository evaluation

3. **Content Creator** (content-creator) - Multi-platform content generation expert
   - Use for: Content creation, platform optimization, narrative development, engagement strategy
   - Capabilities: LinkedIn posts, Twitter threads, blog articles, newsletters, multi-format content
   - When to route: When content creation is needed, for platform-specific optimization, or narrative development

**Routing Decision Framework**:

For **initial requests** or **strategic planning**: → Brand Strategist
For **GitHub/repository analysis**: → GitHub Analyzer  
For **content creation/writing**: → Content Creator

For **complex workflows**, route in sequence:
1. GitHub Analyzer (if technical analysis needed)
2. Content Creator (if content generation needed) 
3. Brand Strategist (for final strategic synthesis and recommendations)

**Special Instructions**:
- Always consider the full context and previous agent outputs
- Route to Brand Strategist for final synthesis and strategic recommendations
- Enable agent collaboration by preserving message history
- For streaming workflows, ensure each agent contributes meaningfully to the overall objective

Current workflow supports:
- Real-time streaming for frontend visualization
- Checkpoint integration for persistence
- Human-in-the-loop for content approval
- Performance monitoring and metrics
- Contextual memory for personalized experiences

Route to the most appropriate agent based on the current task and maintain workflow coherence.`;
  }

  /**
   * Execute complete DevBrand workflow for personal brand development
   */
  async executeDevBrandWorkflow(
    request: string,
    options: {
      githubUsername?: string;
      analysisDepth?: 'quick' | 'comprehensive';
      contentPlatforms?: Array<'linkedin' | 'twitter' | 'blog' | 'newsletter'>;
      streamingEnabled?: boolean;
      config?: RunnableConfig;
    } = {}
  ): Promise<MultiAgentResult> {
    this.logger.log('Executing DevBrand workflow:', { request, options });

    if (!this.networkId) {
      throw new Error('DevBrand workflow not initialized');
    }

    try {
      // Enhanced request with context
      const enhancedRequest = this.enhanceRequest(request, options);

      // Execute with comprehensive configuration
      const result = await this.multiAgentCoordinator.executeWorkflow(
        this.networkId,
        {
          messages: [enhancedRequest],
          config: {
            ...options.config,
            configurable: {
              ...options.config?.configurable,
              thread_id: `devbrand_${Date.now()}`,
              workflow_type: 'personal_brand_development',
              streaming_enabled: options.streamingEnabled ?? true,
              analysis_depth: options.analysisDepth ?? 'comprehensive',
            },
          },
        }
      );

      this.logger.log(
        `DevBrand workflow completed in ${result.executionTime}ms`
      );
      this.logger.log(`Execution path: ${result.executionPath.join(' → ')}`);

      return result;
    } catch (error) {
      this.logger.error('DevBrand workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Stream DevBrand workflow for real-time frontend integration
   */
  async *streamDevBrandWorkflow(
    request: string,
    options: {
      githubUsername?: string;
      analysisDepth?: 'quick' | 'comprehensive';
      contentPlatforms?: Array<'linkedin' | 'twitter' | 'blog' | 'newsletter'>;
      streamMode?: 'values' | 'updates' | 'messages';
      config?: RunnableConfig;
    } = {}
  ): AsyncGenerator<Partial<AgentState>, MultiAgentResult, unknown> {
    this.logger.log('Starting DevBrand streaming workflow:', {
      request,
      options,
    });

    if (!this.networkId) {
      throw new Error('DevBrand workflow not initialized');
    }

    const enhancedRequest = this.enhanceRequest(request, options);

    try {
      const streamGenerator = this.multiAgentCoordinator.streamWorkflow(
        this.networkId,
        {
          messages: [enhancedRequest],
          streamMode: options.streamMode ?? 'values',
          config: {
            ...options.config,
            configurable: {
              ...options.config?.configurable,
              thread_id: `devbrand_stream_${Date.now()}`,
              workflow_type: 'personal_brand_development',
              streaming_mode: options.streamMode ?? 'values',
              analysis_depth: options.analysisDepth ?? 'comprehensive',
            },
          },
        }
      );

      let stepCount = 0;
      for await (const step of streamGenerator) {
        stepCount++;
        this.logger.debug(`DevBrand stream step ${stepCount}:`, {
          messages: step.messages?.length || 0,
          agent: step.current || 'unknown',
          hasData: !!step.metadata,
        });

        // Enhance step data for frontend consumption
        const enhancedStep = {
          ...step,
          workflow: 'devbrand-supervisor',
          stepNumber: stepCount,
          timestamp: new Date().toISOString(),
          agentCapabilities: this.getAgentCapabilities(step.current),
        };

        yield enhancedStep;
      }

      this.logger.log(`DevBrand streaming completed with ${stepCount} steps`);
    } catch (error) {
      this.logger.error('DevBrand streaming workflow failed:', error);
      throw error;
    }
  }

  /**
   * Execute quick GitHub analysis workflow
   */
  async analyzeGitHub(
    githubUsername: string,
    options: {
      analysisDepth?: 'quick' | 'comprehensive';
      config?: RunnableConfig;
    } = {}
  ): Promise<MultiAgentResult> {
    const request = `Please analyze the GitHub profile for @${githubUsername} and extract technical achievements, skills, and contribution patterns for personal brand development.`;

    return this.executeDevBrandWorkflow(request, {
      githubUsername,
      analysisDepth: options.analysisDepth,
      config: options.config,
    });
  }

  /**
   * Execute content generation workflow
   */
  async generateBrandContent(
    request: string,
    platforms: Array<'linkedin' | 'twitter' | 'blog' | 'newsletter'> = [
      'linkedin',
      'twitter',
    ],
    options: {
      analysisData?: any;
      config?: RunnableConfig;
    } = {}
  ): Promise<MultiAgentResult> {
    const enhancedRequest = `Create compelling personal brand content for the following platforms: ${platforms.join(
      ', '
    )}. Request: ${request}`;

    return this.executeDevBrandWorkflow(enhancedRequest, {
      contentPlatforms: platforms,
      analysisDepth: 'quick',
      config: options.config,
    });
  }

  /**
   * Execute complete brand strategy development
   */
  async developBrandStrategy(
    request: string,
    options: {
      githubUsername?: string;
      careerGoals?: string;
      targetAudience?: string;
      config?: RunnableConfig;
    } = {}
  ): Promise<MultiAgentResult> {
    let enhancedRequest = `Develop a comprehensive personal brand strategy. ${request}`;

    if (options.githubUsername) {
      enhancedRequest += ` Include analysis of GitHub profile: @${options.githubUsername}`;
    }

    if (options.careerGoals) {
      enhancedRequest += ` Career objectives: ${options.careerGoals}`;
    }

    if (options.targetAudience) {
      enhancedRequest += ` Target audience: ${options.targetAudience}`;
    }

    return this.executeDevBrandWorkflow(enhancedRequest, {
      githubUsername: options.githubUsername,
      analysisDepth: 'comprehensive',
      contentPlatforms: ['linkedin', 'twitter', 'blog', 'newsletter'],
      config: options.config,
    });
  }

  /**
   * Get workflow status and agent health
   */
  async getWorkflowStatus(): Promise<{
    networkId: string | null;
    agents: Array<{
      id: string;
      name: string;
      healthy: boolean;
      capabilities: string[];
    }>;
    networkStats: any;
    systemStatus: any;
  }> {
    if (!this.networkId) {
      return {
        networkId: null,
        agents: [],
        networkStats: null,
        systemStatus: null,
      };
    }

    const agents = [
      this.githubAnalyzer.getAgentDefinition(),
      this.contentCreator.getAgentDefinition(),
      this.brandStrategist.getAgentDefinition(),
    ].map((agent) => ({
      id: agent.id,
      name: agent.name,
      healthy: this.multiAgentCoordinator.getAgentHealth(agent.id),
      capabilities: agent.metadata?.capabilities || [],
    }));

    const networkStats = this.multiAgentCoordinator.getNetworkStats(
      this.networkId
    );
    const systemStatus = this.multiAgentCoordinator.getSystemStatus();

    return {
      networkId: this.networkId,
      agents,
      networkStats,
      systemStatus,
    };
  }

  /**
   * Cleanup workflow resources
   */
  async cleanup(): Promise<void> {
    if (this.networkId) {
      this.multiAgentCoordinator.removeNetwork(this.networkId);
      this.networkId = null;
    }
    this.logger.log('DevBrand workflow resources cleaned up');
  }

  /**
   * Enhance request with contextual information
   */
  private enhanceRequest(request: string, options: any): string {
    let enhanced = request;

    if (options.githubUsername) {
      enhanced += `\n\nGitHub Analysis Target: @${options.githubUsername}`;
    }

    if (options.analysisDepth) {
      enhanced += `\n\nAnalysis Depth: ${options.analysisDepth}`;
    }

    if (options.contentPlatforms) {
      enhanced += `\n\nTarget Platforms: ${options.contentPlatforms.join(
        ', '
      )}`;
    }

    enhanced += `\n\nWorkflow: DevBrand Personal Brand Development`;
    enhanced += `\n\nTimestamp: ${new Date().toISOString()}`;

    return enhanced;
  }

  /**
   * Get agent capabilities for frontend display
   */
  private getAgentCapabilities(agentId?: string): string[] {
    switch (agentId) {
      case 'github-analyzer':
        return [
          'repository_analysis',
          'skill_extraction',
          'contribution_analysis',
        ];
      case 'content-creator':
        return [
          'content_generation',
          'platform_optimization',
          'narrative_creation',
        ];
      case 'brand-strategist':
        return [
          'strategic_planning',
          'brand_positioning',
          'workflow_coordination',
        ];
      default:
        return ['multi_agent_coordination'];
    }
  }
}
