import { Injectable, Logger } from '@nestjs/common';
import {
  MultiAgent,
  MultiAgentTopology,
  SupervisorConfig,
  WorkflowExecutionService,
} from '@hive-academy/langgraph-workflow-engine';
import { GitHubCodeAnalyzerAgent } from '../agents/github-code-analyzer/github-code-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator/content-creator.agent';
import { PersonalBrandStrategistAgent } from '../agents/personal-brand-strategist/personal-brand-strategist.agent';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';
import type { TypedAgentState } from '../types';

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
export class DevBrandSupervisorWorkflow {
  private readonly logger = new Logger(DevBrandSupervisorWorkflow.name);

  constructor(
    private readonly workflowExecution: WorkflowExecutionService,
    private readonly brandMemory: PersonalBrandMemoryService
  ) {}

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
      // 1. Build LangGraph state from input
      const initialState: TypedAgentState<Record<string, unknown>> = {
        messages: [],
        metadata: {
          userId: input.userId,
          githubUsername: input.githubUsername,
          executionId,
          workflowType: 'personal-brand-analysis',
        },
      };

      // 2. Execute via WorkflowExecutionService (automatic checkpoint + memory)
      const finalState = await this.workflowExecution.executeMultiAgentWorkflow(
        DevBrandSupervisorWorkflow,
        [
          GitHubCodeAnalyzerAgent,
          PersonalBrandStrategistAgent,
          ContentCreatorAgent,
        ],
        initialState,
        { configurable: { thread_id: executionId } }
      );

      this.logger.log(
        '✅ Multi-agent coordination completed via WorkflowExecutionService'
      );

      // 3. Extract results from finalState.metadata (inline extraction for Task 2)
      const achievements = finalState.metadata?.githubData?.achievements || [];
      const strategy = finalState.metadata?.brandStrategy || {};
      const content = finalState.metadata?.generatedContent || {};
      const confidence = finalState.metadata?.confidence || 0.8;

      // 4. Store achievements in memory (individual failures don't fail workflow)
      let storedCount = 0;
      for (const achievement of achievements) {
        try {
          await this.brandMemory.storeCodeAchievement(input.userId, {
            id: achievement.id || `ach-${Date.now()}-${storedCount}`,
            repository: achievement.repository,
            description: achievement.description || achievement.achievement,
            technologies: achievement.technologies || [],
            impact: achievement.impact || 'medium',
            date: achievement.date || achievement.timestamp || new Date(),
          });
          storedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to store achievement for ${achievement.repository}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      this.logger.log(
        `Stored ${storedCount}/${achievements.length} achievements for user ${input.userId}`
      );

      // 5. Return consolidated results
      return {
        achievements,
        strategy,
        content,
        confidence,
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
   *
   * TODO: Implement with LangGraph native streaming after base class removal
   */
  async *executeWithStreaming(
    input: DevBrandWorkflowInput
  ): AsyncGenerator<any, void, unknown> {
    // TODO: Implement streaming with LangGraph native API
    throw new Error(
      'Multi-agent streaming execution not yet implemented after base class removal. ' +
        'Requires LangGraph native streaming API integration. See TASK_2025_039.'
    );

    // ORIGINAL CODE (requires base class methods):
    // const executionId = input.executionId || `devbrand-${Date.now()}`;
    //
    // const supervisorMessage = `Please help create a comprehensive personal brand for developer: ${input.githubUsername}
    //
    // User Context:
    // - User ID: ${input.userId}
    // - GitHub Username: ${input.githubUsername}
    // - Execution ID: ${executionId}
    //
    // Task Sequence:
    // 1. Analyze GitHub profile to extract achievements and technical skills
    // 2. Develop personal brand strategy based on the analysis
    // 3. Create platform-specific content (LinkedIn, Dev.to) for the brand`;
    //
    // const stream = await this.executeCoordination(
    //   {
    //     messages: [supervisorMessage],
    //     config: {
    //       metadata: {
    //         userId: input.userId,
    //         githubUsername: input.githubUsername,
    //         executionId,
    //         workflowType: 'personal-branding',
    //       },
    //     },
    //   },
    //   { stream: true, streamMode: 'values' }
    // );
    //
    // for await (const event of stream) {
    //   yield event;
    // }
  }
}
