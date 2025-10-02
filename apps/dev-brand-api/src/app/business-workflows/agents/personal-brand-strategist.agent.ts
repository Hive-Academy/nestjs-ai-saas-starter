import { Injectable, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { WorkflowAgentState } from '../types';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
// Note: Memory decorators will be available in future version
// import { StoreMemory, MemoryContext } from '@hive-academy/langgraph-memory';
import {
  Entrypoint,
  Task,
  Node,
  Edge,
  FunctionalWorkflow as Workflow,
} from '@hive-academy/langgraph-functional-api';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-functional-api';
import {
  DeclarativeWorkflowBase,
  WorkflowGraphBuilderService,
  SubgraphManagerService,
  MetadataProcessorService,
  WorkflowStreamService,
} from '@hive-academy/langgraph-workflow-engine';
import { EventStreamProcessorService } from '@hive-academy/langgraph-streaming';
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';

/**
 * 🆕 ENHANCED: Personal Brand Strategist Agent - Unified Decorator Demo
 * 
 * This agent demonstrates the enhanced decorator architecture:
 * 1. Unified @Agent decorator (eliminates @Workflow duplication)
 * 2. Functional @Edge decorators (boolean return methods)
 * 
 * The agent internally executes multiple steps:
 * 1. Initialize brand analysis
 * 2. Gather brand data from memory and GitHub
 * 3. Analyze current brand positioning
 * 4. Assess brand strength (decision point)
 * 5. Generate strategy (optimize or rebuild path)
 * 
 * Externally, it appears as a single node to other workflows.
 */
@Agent({
  id: 'personal-brand-strategist',
  name: 'Personal Brand Strategist',
  type: 'workflow-agent', // 🆕 Enhanced workflow agent type
  capabilities: ['brand-analysis', 'strategic-positioning', 'career-guidance'],
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  priority: 'high',
  executionTime: 'medium',
  // 🆕 ENHANCEMENT: Unified workflow configuration (eliminates @Workflow duplication)
  workflow: {
    name: 'brand-strategist-workflow',
    description: 'Enhanced Personal Brand Strategist with internal multi-step workflow',
    streaming: true,
    confidenceThreshold: 0.7,
    metrics: true,
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 60000,
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: 'brand-strategist-workflow',
  },
})
// 🆕 ENHANCEMENT: No separate @Workflow decorator needed!
@Injectable()
export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase<WorkflowAgentState> {
  
  // 🆕 ENHANCEMENT: workflowConfig now automatically derived from @Agent decorator
  // No need to manually specify - automatically configured from unified workflow property

  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService,
    @Inject(EventEmitter2) eventEmitter: EventEmitter2,
    @Inject(WorkflowGraphBuilderService) graphBuilder: WorkflowGraphBuilderService,
    @Inject(SubgraphManagerService) subgraphManager: SubgraphManagerService,
    @Inject(MetadataProcessorService) metadataProcessor: MetadataProcessorService,
    @Optional() @Inject(WorkflowStreamService) streamService?: WorkflowStreamService,
    @Optional() eventProcessor?: EventStreamProcessorService
  ) {
    super(
      eventEmitter,
      graphBuilder,
      subgraphManager,
      metadataProcessor,
      streamService,
      eventProcessor
    );
  }

  /**
   * Entry point for the internal brand strategy workflow
   * Initializes the analysis and sets up the workflow state
   */
  @Entrypoint({ timeout: 10000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeBrandAnalysis(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';
    
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          workflowStarted: true,
          currentStep: 'initialization',
          githubUsername,
          brandAnalysisId: `brand-${githubUsername}-${Date.now()}`,
        },
      },
    };
  }

  /**
   * Gathers comprehensive brand data from memory and GitHub metadata
   */
  @Task({ dependsOn: ['initializeBrandAnalysis'] })
  @StreamProgress({ enabled: true })
  // @MemoryContext({ contextKey: 'brand-data-gathering' }) // TODO: Implement when decorator available
  async gatherBrandData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';
    const achievements = (state.metadata?.achievements as any[]) || [];
    const githubData = state.metadata?.githubData;

    try {
      // Gather data from memory service
      const [devContext, brandEvolution, brandVoice] = await Promise.all([
        this.memory.getDevContext(githubUsername),
        this.memory.getBrandEvolution(githubUsername),
        this.memory.getBrandVoice(githubUsername),
      ]);

      // Extract technical profile
      const primaryTech = Array.isArray(
        (githubData as any)?.patterns?.primaryLanguages
      )
        ? (githubData as any).patterns.primaryLanguages.join(', ')
        : '';

      const techStack = {
        primary: primaryTech,
        repositories: (githubData as any)?.stats?.totalRepos || 0,
        contributions: (githubData as any)?.stats?.totalContributions || 0,
        followers: (githubData as any)?.stats?.followers || 0,
      };

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'data-gathered',
            brandData: {
              devContext,
              brandEvolution,
              brandVoice,
              techStack,
              achievements,
              dataGatheredAt: new Date().toISOString(),
            },
          },
        },
      };
    } catch (error: any) {
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'data-gathering-failed',
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Analyzes current brand positioning using LLM
   */
  @Task({ dependsOn: ['gatherBrandData'] })
  @StreamToken({ enabled: true, format: 'structured' })
  async analyzeBrandPositioning(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const brandData = state.metadata?.brandData;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';

    try {
      const analysisPrompt = `
Analyze the brand positioning for developer: ${githubUsername}

Data:
- Technical Stack: ${brandData?.techStack?.primary || 'Not specified'}
- Repositories: ${brandData?.techStack?.repositories || 0}
- Achievements: ${brandData?.achievements?.length || 0}
- Context: ${JSON.stringify(brandData?.devContext || {})}

Provide:
1. Current brand strength (score 0-1)
2. Key strengths
3. Areas for improvement
4. Market positioning

Format as JSON with: { score, strengths, improvements, positioning }
`;

      const model = await this.llm.getLLM({ temperature: 0.3, maxTokens: 1000 });
      const response = await model.invoke([{ role: 'user', content: analysisPrompt }]);
      
      let analysis;
      try {
        analysis = JSON.parse(response.content.toString());
      } catch {
        // Fallback if JSON parsing fails
        analysis = {
          score: 0.6,
          strengths: ['Technical expertise', 'Active development'],
          improvements: ['Brand visibility', 'Thought leadership'],
          positioning: 'Developing technical professional',
        };
      }

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'positioning-analyzed',
            brandAnalysis: {
              ...analysis,
              analyzedAt: new Date().toISOString(),
            },
            brandScore: analysis.score || 0.6,
          },
        },
      };
    } catch (error: any) {
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'analysis-failed',
            brandScore: 0.5, // Default score for decision making
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Decision node: assess brand strength and determine strategy path
   */
  @Node({ type: 'condition' })
  async assessBrandStrength(context: TaskExecutionContext): Promise<{ route: string }> {
    const { state } = context;
    const brandScore = state.metadata?.brandScore || 0.5;
    
    // Decision logic: strong brands get optimization, weak brands get rebuilding
    const route = brandScore > 0.7 ? 'optimize' : 'rebuild';
    
    return { route };
  }

  /**
   * 🆕 ENHANCED: Functional edge - route to optimization path for strong brands
   * Now uses boolean return instead of condition property
   */
  @Edge('assessBrandStrength', 'optimizeBrand')
  shouldOptimizeBrand(state: WorkflowAgentState): boolean {
    const brandScore = (state.metadata?.brandScore as number) || 0.5;
    return brandScore > 0.7;
  }

  /**
   * 🆕 ENHANCED: Functional edge - route to rebuild path for weak brands
   * Now uses boolean return instead of condition property
   */
  @Edge('assessBrandStrength', 'rebuildStrategy')
  shouldRebuildBrand(state: WorkflowAgentState): boolean {
    const brandScore = (state.metadata?.brandScore as number) || 0.5;
    return brandScore <= 0.7;
  }

  /**
   * Optimization strategy for strong brands
   */
  @Task({ dependsOn: ['assessBrandStrength'] })
  async optimizeBrand(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const brandAnalysis = state.metadata?.brandAnalysis;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';

    const optimizationPrompt = `
Optimize brand strategy for ${githubUsername} (strong brand detected).

Current strengths: ${JSON.stringify(brandAnalysis?.strengths || [])}
Positioning: ${brandAnalysis?.positioning || 'Professional developer'}

Generate optimization strategy focusing on:
1. Amplifying existing strengths
2. Thought leadership opportunities
3. Community engagement
4. Content creation

Provide concrete, actionable recommendations.
`;

    try {
      const model = await this.llm.getLLM({ temperature: 0.5, maxTokens: 800 });
      const response = await model.invoke([{ role: 'user', content: optimizationPrompt }]);
      const strategy = response.content.toString();

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'optimization-complete',
            strategyType: 'optimization',
            finalStrategy: strategy,
          },
        },
      };
    } catch (error: any) {
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'optimization-failed',
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Rebuild strategy for weak brands
   */
  @Task({ dependsOn: ['assessBrandStrength'] })
  async rebuildStrategy(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const brandAnalysis = state.metadata?.brandAnalysis;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';
    const brandData = state.metadata?.brandData;

    const rebuildPrompt = `
Rebuild brand strategy for ${githubUsername} (needs strengthening).

Current situation:
- Brand score: ${state.metadata?.brandScore || 0.5}
- Tech stack: ${brandData?.techStack?.primary || 'Various'}
- Repositories: ${brandData?.techStack?.repositories || 0}
- Improvements needed: ${JSON.stringify(brandAnalysis?.improvements || [])}

Generate comprehensive rebuilding strategy:
1. Foundation elements (portfolio, presence)
2. Content strategy
3. Networking and community
4. Skill development priorities
5. Timeline and milestones

Provide structured, actionable plan.
`;

    try {
      const model = await this.llm.getLLM({ temperature: 0.6, maxTokens: 1200 });
      const response = await model.invoke([{ role: 'user', content: rebuildPrompt }]);
      const strategy = response.content.toString();

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'rebuild-complete',
            strategyType: 'rebuild',
            finalStrategy: strategy,
          },
        },
      };
    } catch (error: any) {
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'rebuild-failed',
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Final task: consolidate strategy and prepare output
   */
  @Task({ dependsOn: ['optimizeBrand', 'rebuildStrategy'] })
  // @StoreMemory({ key: 'brand-strategy' }) // TODO: Implement when decorator available
  async generateFinalStrategy(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';
    const strategyType = state.metadata?.strategyType;
    const finalStrategy = state.metadata?.finalStrategy;
    const brandData = state.metadata?.brandData;

    // Create comprehensive strategy output
    const consolidatedStrategy = {
      userId: githubUsername,
      strategyType,
      brandScore: state.metadata?.brandScore,
      strategy: finalStrategy,
      analysis: state.metadata?.brandAnalysis,
      memoryContext: brandData?.devContext,
      brandEvolution: brandData?.brandEvolution,
      brandVoice: brandData?.brandVoice,
      createdAt: new Date().toISOString(),
      workflowMetadata: {
        stepsExecuted: context.previousSteps || [],
        completedAt: new Date().toISOString(),
      },
    };

    return {
      state: {
        ...state,
        messages: [new AIMessage(finalStrategy || `Brand strategy for ${githubUsername}`)],
        metadata: {
          ...state.metadata,
          brandStrategyCompleted: true,
          brandStrategy: consolidatedStrategy,
          currentStep: 'workflow-complete',
        },
        next: 'content-creator',
        task: 'Create content from brand strategy',
      },
    };
  }
}
