import { Injectable } from '@nestjs/common';
import {
  MultiAgent,
  MultiAgentTopology,
  MultiAgentWorkflowBase,
  SupervisorConfig,
} from '@hive-academy/langgraph-workflow-engine';
import { GitHubCodeAnalyzerAgent } from '../agents/github-code-analyzer/github-code-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator/content-creator.agent';
import { PersonalBrandStrategistAgent } from '../agents/personal-brand-strategist/personal-brand-strategist.agent';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

/**
 * DevBrand workflow input type
 */
export interface DevBrandWorkflowInput {
  userId: string;
  githubUsername: string;
  executionId?: string;
}

/**
 * ✨ DevBrand Supervisor Workflow - Clean Multi-Agent Implementation
 *
 * This workflow uses the new @MultiAgent decorator for:
 * ✅ Automatic agent registration and network setup
 * ✅ No manual onModuleInit or createAgentDefinition boilerplate
 * ✅ Clean, declarative configuration
 * ✅ Automatic streaming and HITL from worker metadata
 * ✅ Internal coordination services (not exposed to consumers)
 *
 * ARCHITECTURE:
 * - Extends MultiAgentWorkflowBase for automatic lifecycle management
 * - @MultiAgent decorator handles all setup automatically
 * - Workers explicitly listed with their streaming/HITL configuration
 * - Supervisor coordinates via LLM-based routing
 *
 * TOPOLOGY: SUPERVISOR
 * - Central LLM coordinator routes tasks to specialized worker agents
 * - Workers: GitHub Analyzer → Brand Strategist → Content Creator
 * - Sequential execution with intelligent routing
 */

@MultiAgent({
  // Network configuration
  networkId: 'devbrand-supervisor-network',
  topology: MultiAgentTopology.SUPERVISOR,

  // Explicit agent registration
  agents: [
    GitHubCodeAnalyzerAgent,
    PersonalBrandStrategistAgent,
    ContentCreatorAgent,
  ],

  // Supervisor-specific configuration
  config: {
    systemPrompt: `You are the supervisor coordinator for a personal branding workflow.

Your role is to orchestrate three specialized agents to help developers build their personal brand:

**Available Workers:**

1. **github-code-analyzer**: Analyzes GitHub activity to extract achievements
   - Extracts repository contributions, technologies used, impact metrics
   - Identifies standout projects and technical skills
   - Outputs: achievements, technologies, project highlights

2. **personal-brand-strategist**: Develops brand strategy and positioning
   - Analyzes achievements and creates positioning strategy
   - Defines unique value proposition and target audience
   - Outputs: brand strategy, positioning, recommendations

3. **content-creator**: Creates optimized content for multiple platforms
   - Generates platform-specific content (LinkedIn, Dev.to, Twitter)
   - Optimizes for engagement and reach
   - Outputs: generated content for each platform

**Workflow Sequence (ALWAYS follow this order):**

Step 1: First, call **github-code-analyzer** to analyze the developer's GitHub profile
Step 2: Then, call **personal-brand-strategist** to develop brand strategy based on achievements
Step 3: Finally, call **content-creator** to generate platform-specific content

**Routing Rules:**

- If user provides GitHub username → Start with github-code-analyzer
- If analysis is complete → Route to personal-brand-strategist
- If strategy is complete → Route to content-creator
- If all steps done → Return control to workflow with FINISH

**Context Management:**

Always maintain context between agents by passing previous results in metadata.
Each agent builds on the work of the previous agent.`,

    workers: [
      'github-code-analyzer',
      'personal-brand-strategist',
      'content-creator',
    ],

    // 🆕 DEFAULTS APPLIED: enableForwardMessage and removeHandoffMessages now use module defaults
    // Keeping explicit config to override defaults
    enableForwardMessage: true,
    removeHandoffMessages: true,

    // 🆕 LLM CONFIG REMOVED: Supervisor LLM now uses module-level configuration
    // Configure via MultiAgentModule.forRoot({ defaultLlm: { ... } })
    // This ensures single source of truth for all LLM instances
  } as SupervisorConfig,

  // 🆕 DEFAULTS APPLIED: streaming, checkpointing, debug now inherit from module config
  // Keeping explicit config for documentation purposes
  streaming: true,
  checkpointing: true,
  debug: false,
})
@Injectable()
export class DevBrandSupervisorWorkflow extends MultiAgentWorkflowBase {
  constructor(private readonly brandMemory: PersonalBrandMemoryService) {
    super();
  }

  /**
   * Execute the complete personal branding workflow
   *
   * This is the main entry point for consumers. The multi-agent coordination
   * happens automatically via the @MultiAgent decorator.
   */
  async execute(input: {
    userId: string;
    githubUsername: string;
    executionId?: string;
  }): Promise<{
    achievements: any[];
    strategy: any;
    content: any;
    confidence: number;
  }> {
    const executionId = input.executionId || `devbrand-${Date.now()}`;

    this.logger.log(
      `🚀 Starting DevBrand workflow for user: ${input.userId}, GitHub: ${input.githubUsername}`
    );

    try {
      // Build supervisor message
      const supervisorMessage = `Please help create a comprehensive personal brand for developer: ${input.githubUsername}

User Context:
- User ID: ${input.userId}
- GitHub Username: ${input.githubUsername}
- Execution ID: ${executionId}

Task Sequence:
1. Analyze GitHub profile to extract achievements and technical skills
2. Develop personal brand strategy based on the analysis
3. Create platform-specific content (LinkedIn, Dev.to) for the brand

Please coordinate the three agents to complete this workflow.`;

      // Execute multi-agent coordination (automatic streaming/HITL)
      const result = await this.executeSimple(supervisorMessage, {
        userId: input.userId,
        githubUsername: input.githubUsername,
        executionId,
        workflowType: 'personal-branding',
      });

      this.logger.log(
        `✅ Multi-agent coordination completed. Execution path: ${result.executionPath?.join(
          ' → '
        )}`
      );

      // Extract results from agent coordination
      const agentResults = {
        githubAnalysis: result.finalState.metadata?.githubData || {},
        brandStrategy: result.finalState.metadata?.brandStrategy || {},
        contentCreation: result.finalState.metadata?.generatedContent || {},
      };

      // Store achievements in personal brand memory
      const achievements =
        agentResults.githubAnalysis?.achievements ||
        agentResults.githubAnalysis?.data?.achievements ||
        [];

      if (achievements.length > 0) {
        this.logger.log(
          `Storing ${achievements.length} achievements in memory`
        );

        for (const achievement of achievements) {
          await this.brandMemory.storeCodeAchievement(input.userId, {
            id: achievement.id || `achievement-${Date.now()}`,
            description: achievement.description,
            technologies: achievement.technologies || [],
            impact: achievement.impact || 'medium',
            date: new Date().toISOString(),
            repository: achievement.repository || 'unknown',
            userId: input.userId,
          });
        }
      }

      // Return consolidated results
      return {
        achievements,
        strategy: agentResults.brandStrategy,
        content: agentResults.contentCreation,
        confidence: result.finalState.metadata?.confidence || 0.8,
      };
    } catch (error) {
      this.logger.error('Multi-agent coordination failed:', error);
      throw new Error(
        `DevBrand workflow failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Execute with streaming support
   *
   * Returns an async iterator for real-time streaming of agent events
   * Implements StreamableWorkflow interface
   */
  async *executeWithStreaming(
    input: DevBrandWorkflowInput
  ): AsyncGenerator<any, void, unknown> {
    const executionId = input.executionId || `devbrand-${Date.now()}`;

    const supervisorMessage = `Please help create a comprehensive personal brand for developer: ${input.githubUsername}

User Context:
- User ID: ${input.userId}
- GitHub Username: ${input.githubUsername}
- Execution ID: ${executionId}

Task Sequence:
1. Analyze GitHub profile to extract achievements and technical skills
2. Develop personal brand strategy based on the analysis
3. Create platform-specific content (LinkedIn, Dev.to) for the brand`;

    // Execute with streaming
    const stream = await this.executeCoordination(
      {
        messages: [supervisorMessage],
        config: {
          metadata: {
            userId: input.userId,
            githubUsername: input.githubUsername,
            executionId,
            workflowType: 'personal-branding',
          },
        },
      },
      { stream: true, streamMode: 'values' }
    );

    // Yield events from stream
    for await (const event of stream) {
      yield event;
    }
  }
}
