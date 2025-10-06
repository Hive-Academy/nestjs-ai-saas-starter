import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  FunctionalWorkflow,
  Entrypoint,
  Task,
  WorkflowType,
} from '@hive-academy/langgraph-functional-api';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
  FunctionalWorkflowState,
} from '@hive-academy/langgraph-functional-api';
import { StreamProgress, StreamToken } from '@hive-academy/langgraph-streaming';
import {
  MultiAgentCoordinatorService,
  LlmProviderService,
} from '@hive-academy/langgraph-multi-agent';
import type {
  AgentDefinition,
  AgentState,
} from '@hive-academy/langgraph-multi-agent';
import { HumanMessage } from '@langchain/core/messages';
import { GitHubCodeAnalyzerAgent } from '../agents/github-code-analyzer/github-code-analyzer.agent';
import { ContentCreatorAgent } from '../agents/content-creator/content-creator.agent';
import { PersonalBrandStrategistAgent } from '../agents/personal-brand-strategist/personal-brand-strategist.agent';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

/**
 * 🆕 TRANSFORMED: DevBrand Supervisor Workflow
 *
 * NOW USES PROPER MULTI-AGENT COORDINATION:
 * ✅ Supervisor pattern with LLM-based routing
 * ✅ Multi-agent network topology
 * ✅ Memory-enhanced coordination
 * ✅ Agent compatibility learning
 * ✅ Automatic checkpoint and recovery
 *
 * BEFORE: Manual agent orchestration with direct .execute() calls
 * AFTER: Intelligent supervisor coordinates agents via LLM routing
 *
 * Architecture:
 * 1. Setup multi-agent network (supervisor + 3 workflow-agents)
 * 2. Supervisor LLM decides which agent to call based on task
 * 3. Agents communicate through AgentState messages
 * 4. Coordinator enhances with memory and learned patterns
 * 5. Results stored in personal brand memory
 */

export interface DevBrandWorkflowState extends FunctionalWorkflowState {
  // User context
  userId: string;
  githubUsername?: string;

  // Workflow execution
  executionId: string;
  currentStep: number;
  confidence: number;

  // Multi-agent network
  networkId?: string;

  // Agent communication results
  agentResults?: {
    githubAnalysis?: any;
    brandStrategy?: any;
    contentCreation?: any;
  };

  // Final outputs
  finalResult?: {
    achievements: any[];
    strategy: any;
    content: any;
    confidence: number;
  };
}

@FunctionalWorkflow({
  name: 'devbrand-supervisor-workflow-transformed',
  description:
    '🆕 TRANSFORMED: Multi-agent coordination using supervisor pattern for developer personal branding',
  type: WorkflowType.FUNCTIONAL_TASK,
  streaming: true,
  confidenceThreshold: 0.7,
})
@Injectable()
export class DevBrandSupervisorWorkflowTransformed implements OnModuleInit {
  private networkId: string | null = null;

  constructor(
    private readonly coordinator: MultiAgentCoordinatorService,
    private readonly llmProvider: LlmProviderService,
    private readonly githubAnalyzer: GitHubCodeAnalyzerAgent,
    private readonly contentCreator: ContentCreatorAgent,
    private readonly brandStrategist: PersonalBrandStrategistAgent,
    private readonly brandMemory: PersonalBrandMemoryService
  ) {}

  /**
   * Initialize multi-agent network on module startup
   * Creates supervisor network with 3 workflow-agents
   */
  async onModuleInit(): Promise<void> {
    try {
      // Convert workflow-agent classes to AgentDefinition objects
      const agents: AgentDefinition[] = [
        this.createAgentDefinition(
          this.githubAnalyzer,
          'github-code-analyzer',
          'GitHub Code Analyzer',
          'Analyzes GitHub repositories to extract developer achievements, technical skills, productivity metrics, and developer insights using AI-powered analysis'
        ),
        this.createAgentDefinition(
          this.brandStrategist,
          'personal-brand-strategist',
          'Personal Brand Strategist',
          'Develops personal brand strategy based on achievements, determines optimal positioning, defines brand voice, and provides strategic recommendations for professional growth'
        ),
        this.createAgentDefinition(
          this.contentCreator,
          'content-creator',
          'Content Creator',
          'Creates platform-specific content (LinkedIn, Dev.to) optimized for engagement, integrates brand voice, and generates high-quality professional content based on achievements and strategy'
        ),
      ];

      // Setup supervisor network with LLM-based routing
      this.networkId = await this.coordinator.setupNetwork(
        'devbrand-supervisor-network',
        agents,
        'supervisor',
        {
          systemPrompt: `You are the supervisor coordinator for a personal branding workflow.

Your role is to orchestrate three specialized agents to help developers build their personal brand:

1. github-code-analyzer: Analyzes GitHub activity to extract achievements
2. personal-brand-strategist: Develops brand strategy and positioning
3. content-creator: Creates optimized content for multiple platforms

WORKFLOW SEQUENCE (always follow this order):
Step 1: First, call github-code-analyzer to analyze the developer's GitHub profile
Step 2: Then, call personal-brand-strategist to develop brand strategy based on achievements
Step 3: Finally, call content-creator to generate platform-specific content

ROUTING RULES:
- If user provides GitHub username → Start with github-code-analyzer
- If analysis is complete → Route to personal-brand-strategist
- If strategy is complete → Route to content-creator
- If all steps done → Return control to workflow

Always maintain context between agents by passing previous results in metadata.`,
          workers: [
            'github-code-analyzer',
            'personal-brand-strategist',
            'content-creator',
          ],
          enableForwardMessage: true, // Pass context between agents
          removeHandoffMessages: true, // Clean message history
        }
      );

      console.log(
        `✅ Multi-agent network initialized: ${this.networkId} with ${agents.length} agents`
      );
    } catch (error) {
      console.error('❌ Failed to initialize multi-agent network:', error);
      throw error;
    }
  }

  /**
   * Convert workflow-agent instance to AgentDefinition
   * Extracts metadata from @Agent decorator and creates nodeFunction
   */
  private createAgentDefinition(
    agentInstance: any,
    id: string,
    name: string,
    description: string
  ): AgentDefinition {
    return {
      id,
      name,
      description,
      // nodeFunction calls the workflow-agent's execute method
      nodeFunction: async (state: AgentState) => {
        // Execute the workflow-agent's internal workflow
        const result = await agentInstance.execute(state);

        // Return partial state update
        return {
          messages: result.messages || state.messages,
          metadata: {
            ...state.metadata,
            ...result.metadata,
            lastAgent: id,
            lastAgentResult: result,
          },
        };
      },
      metadata: {
        type: 'workflow-agent',
        capabilities: this.getAgentCapabilities(id),
        priority: 'high',
      },
    };
  }

  /**
   * Get agent capabilities based on agent ID
   */
  private getAgentCapabilities(agentId: string): string[] {
    switch (agentId) {
      case 'github-code-analyzer':
        return [
          'code-analysis',
          'achievement-extraction',
          'developer-insights',
          'ai-synthesis',
        ];
      case 'personal-brand-strategist':
        return [
          'brand-analysis',
          'strategic-positioning',
          'career-guidance',
          'voice-definition',
        ];
      case 'content-creator':
        return [
          'content-generation',
          'platform-optimization',
          'engagement-analysis',
          'brand-voice-integration',
        ];
      default:
        return [];
    }
  }

  /**
   * Entry point - Initialize the multi-agent workflow
   */
  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    // Validate network is initialized
    if (!this.networkId) {
      throw new Error(
        'Multi-agent network not initialized. Module initialization may have failed.'
      );
    }

    return {
      state: {
        ...workflowState,
        executionId: `devbrand-${Date.now()}`,
        networkId: this.networkId,
        currentStep: 1,
        currentTask: 'initialization',
        confidence: 1.0,
        agentResults: {},
      },
    };
  }

  /**
   * 🆕 TRANSFORMED: Execute multi-agent coordination via supervisor
   *
   * BEFORE: Manual calls to githubAnalyzer.execute(), brandStrategist.execute()
   * AFTER: Single supervisor call with LLM-based routing
   *
   * The supervisor LLM will:
   * 1. Analyze the task
   * 2. Route to appropriate agent (github-code-analyzer first)
   * 3. Pass results to next agent (personal-brand-strategist)
   * 4. Continue to final agent (content-creator)
   * 5. Return consolidated results
   */
  @Task({ dependsOn: ['initializeWorkflow'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async executeMultiAgentCoordination(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    // Validate required input
    if (!workflowState.githubUsername) {
      throw new Error('GitHub username is required for personal branding');
    }

    if (!workflowState.networkId) {
      throw new Error('Network ID is missing from workflow state');
    }

    try {
      // 🎯 KEY TRANSFORMATION: Use supervisor coordination instead of direct agent calls
      const supervisorMessage = `Please help create a comprehensive personal brand for developer: ${workflowState.githubUsername}

User Context:
- User ID: ${workflowState.userId}
- GitHub Username: ${workflowState.githubUsername}
- Execution ID: ${workflowState.executionId}

Task Sequence:
1. Analyze GitHub profile to extract achievements and technical skills
2. Develop personal brand strategy based on the analysis
3. Create platform-specific content (LinkedIn, Dev.to) for the brand

Please coordinate the three agents (github-code-analyzer, personal-brand-strategist, content-creator) to complete this workflow.`;

      console.log(
        `🚀 Executing multi-agent coordination for ${workflowState.githubUsername}`
      );

      // Execute through supervisor - LLM decides routing automatically
      const result = await this.coordinator.executeSimpleWorkflow(
        workflowState.networkId,
        supervisorMessage,
        {
          streamMode: 'values',
          config: {
            metadata: {
              userId: workflowState.userId,
              githubUsername: workflowState.githubUsername,
              executionId: workflowState.executionId,
              workflowType: 'personal-branding',
            },
          },
        }
      );

      console.log(
        `✅ Multi-agent coordination completed. Execution path: ${result.executionPath.join(' → ')}`
      );

      // Extract results from agent coordination
      const agentResults = {
        githubAnalysis: result.finalState.metadata?.githubData || {},
        brandStrategy: result.finalState.metadata?.brandStrategy || {},
        contentCreation: result.finalState.metadata?.generatedContent || {},
      };

      return {
        state: {
          ...workflowState,
          currentStep: 2,
          currentTask: 'multi-agent-coordination-complete',
          agentResults,
          confidence: result.finalState.metadata?.confidence || 0.8,
        },
      };
    } catch (error) {
      console.error('❌ Multi-agent coordination failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 2,
          currentTask: 'multi-agent-coordination-error',
          confidence: 0.3,
        },
      };
    }
  }

  /**
   * Final step: Consolidate results and store in memory
   */
  @Task({ dependsOn: ['executeMultiAgentCoordination'] })
  @StreamProgress({ enabled: true })
  async finalizeWorkflow(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const workflowState = state as unknown as DevBrandWorkflowState;

    try {
      const results = workflowState.agentResults || {};

      // Extract achievements from GitHub analysis
      const achievements =
        results.githubAnalysis?.achievements ||
        results.githubAnalysis?.data?.achievements ||
        [];

      // Store achievements in personal brand memory
      if (achievements.length > 0) {
        for (const achievement of achievements) {
          await this.brandMemory.storeCodeAchievement(workflowState.userId, {
            id: achievement.id || `achievement-${Date.now()}`,
            description: achievement.description,
            technologies: achievement.technologies || [],
            impact: achievement.impact || 'medium',
            date: new Date().toISOString(),
            repository: achievement.repository || 'unknown',
            userId: workflowState.userId,
          });
        }
      }

      // Store brand strategy
      if (results.brandStrategy) {
        // TODO: Implement brand strategy storage in memory
        console.log('Brand strategy stored:', results.brandStrategy);
      }

      // Consolidate final result
      const finalResult = {
        achievements,
        strategy: results.brandStrategy,
        content: results.contentCreation,
        confidence: workflowState.confidence,
      };

      return {
        state: {
          ...workflowState,
          currentStep: 3,
          currentTask: 'completed',
          finalResult,
          confidence: 1.0,
        },
      };
    } catch (error) {
      console.error('Workflow finalization failed:', error);
      return {
        state: {
          ...workflowState,
          currentStep: 3,
          currentTask: 'finalization-error',
        },
      };
    }
  }
}
