import { Injectable, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { TypedWorkflowAgentState } from '../../types';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
import {
  Entrypoint,
  Task,
  Node,
  Edge,
} from '@hive-academy/langgraph-functional-api';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-functional-api';
import type { BrandStrategistMetadata } from '../shared/metadata.types';
import {
  DeclarativeWorkflowBase,
  WorkflowGraphBuilderService,
  SubgraphManagerService,
  MetadataProcessorService,
  WorkflowStreamService,
} from '@hive-academy/langgraph-workflow-engine';
import { EventStreamProcessorService } from '@hive-academy/langgraph-streaming';
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../../core/memory/personal-brand-memory.service';
import type {
  Achievement,
  BrandData,
  BrandAnalysis,
  GitHubData,
} from '../shared/agent.types';
import {
  buildBrandAnalysisPrompt,
  buildOptimizationPrompt,
  buildRebuildPrompt,
} from './personal-brand-strategist.prompts';

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
  type: 'workflow-agent',
  capabilities: ['brand-analysis', 'strategic-positioning', 'career-guidance'],
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  priority: 'high',
  executionTime: 'medium',
  workflow: {
    name: 'brand-strategist-workflow',
    description:
      'Enhanced Personal Brand Strategist with internal multi-step workflow',
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
@Injectable()
export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase<
  TypedWorkflowAgentState<BrandStrategistMetadata>
> {
  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService,
    @Inject(EventEmitter2) eventEmitter: EventEmitter2,
    @Inject(WorkflowGraphBuilderService)
    graphBuilder: WorkflowGraphBuilderService,
    @Inject(SubgraphManagerService) subgraphManager: SubgraphManagerService,
    @Inject(MetadataProcessorService)
    metadataProcessor: MetadataProcessorService,
    @Optional()
    @Inject(WorkflowStreamService)
    streamService?: WorkflowStreamService,
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
  async initializeBrandAnalysis(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<
    TaskExecutionResult<TypedWorkflowAgentState<BrandStrategistMetadata>>
  > {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername || 'developer';

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
  async gatherBrandData(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<
    TaskExecutionResult<TypedWorkflowAgentState<BrandStrategistMetadata>>
  > {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername || 'developer';
    const achievements = state.metadata.achievements || [];
    const githubData = state.metadata.githubData;

    try {
      // Gather data from memory service
      const [devContext, brandEvolution, brandVoice] = await Promise.all([
        this.memory.getDevContext(githubUsername),
        this.memory.getBrandEvolution(githubUsername),
        this.memory.getBrandVoice(githubUsername),
      ]);

      // Extract technical profile
      const primaryTech = Array.isArray(githubData?.patterns?.primaryLanguages)
        ? githubData.patterns.primaryLanguages.join(', ')
        : '';

      const techStack = {
        primary: primaryTech,
        repositories: githubData?.stats?.totalRepos || 0,
        contributions: githubData?.summary?.totalCommits || 0,
        followers: githubData?.stats?.followers || 0,
      };

      const brandData: BrandData = {
        devContext,
        brandEvolution,
        brandVoice,
        techStack,
        achievements,
        dataGatheredAt: new Date().toISOString(),
      };

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'data-gathered',
            brandData,
          },
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'data-gathering-failed',
            error: errorMessage,
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
  async analyzeBrandPositioning(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<
    TaskExecutionResult<TypedWorkflowAgentState<BrandStrategistMetadata>>
  > {
    const { state } = context;
    const brandData = state.metadata.brandData;
    const githubUsername = state.metadata.githubUsername || 'developer';

    try {
      if (!brandData) {
        throw new Error('Brand data is required for positioning analysis');
      }

      const analysisPrompt = buildBrandAnalysisPrompt(
        githubUsername,
        brandData
      );

      const model = await this.llm.getLLM({
        temperature: 0.3,
        maxTokens: 1000,
      });
      const response = await model.invoke([
        { role: 'user', content: analysisPrompt },
      ]);

      let analysis: BrandAnalysis;
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'analysis-failed',
            brandScore: 0.5,
            error: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Decision node: assess brand strength and determine strategy path
   */
  @Node({ type: 'condition' })
  async assessBrandStrength(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<{ route: string }> {
    const { state } = context;
    const brandScore = state.metadata.brandScore || 0.5;

    const route = brandScore > 0.7 ? 'optimize' : 'rebuild';

    return { route };
  }

  /**
   * Functional edge - route to optimization path for strong brands
   */
  @Edge('assessBrandStrength', 'optimizeBrand')
  shouldOptimizeBrand(
    state: TypedWorkflowAgentState<BrandStrategistMetadata>
  ): boolean {
    const brandScore = state.metadata.brandScore || 0.5;
    return brandScore > 0.7;
  }

  /**
   * Functional edge - route to rebuild path for weak brands
   */
  @Edge('assessBrandStrength', 'rebuildStrategy')
  shouldRebuildBrand(
    state: TypedWorkflowAgentState<BrandStrategistMetadata>
  ): boolean {
    const brandScore = state.metadata.brandScore || 0.5;
    return brandScore <= 0.7;
  }

  /**
   * Optimization strategy for strong brands
   */
  @Task({ dependsOn: ['assessBrandStrength'] })
  async optimizeBrand(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<
    TaskExecutionResult<TypedWorkflowAgentState<BrandStrategistMetadata>>
  > {
    const { state } = context;
    const brandAnalysis = state.metadata.brandAnalysis;
    const githubUsername = state.metadata.githubUsername || 'developer';

    if (!brandAnalysis) {
      throw new Error('Brand analysis is required for optimization');
    }

    const optimizationPrompt = buildOptimizationPrompt(
      githubUsername,
      brandAnalysis
    );

    try {
      const model = await this.llm.getLLM({ temperature: 0.5, maxTokens: 800 });
      const response = await model.invoke([
        { role: 'user', content: optimizationPrompt },
      ]);
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'optimization-failed',
            error: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Rebuild strategy for weak brands
   */
  @Task({ dependsOn: ['assessBrandStrength'] })
  async rebuildStrategy(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<
    TaskExecutionResult<TypedWorkflowAgentState<BrandStrategistMetadata>>
  > {
    const { state } = context;
    const brandAnalysis = state.metadata.brandAnalysis;
    const githubUsername = state.metadata.githubUsername || 'developer';
    const brandData = state.metadata.brandData;
    const brandScore = state.metadata.brandScore || 0.5;

    if (!brandData || !brandAnalysis) {
      throw new Error(
        'Brand data and analysis are required for rebuild strategy'
      );
    }

    const rebuildPrompt = buildRebuildPrompt(
      githubUsername,
      brandScore,
      brandData,
      brandAnalysis
    );

    try {
      const model = await this.llm.getLLM({
        temperature: 0.6,
        maxTokens: 1200,
      });
      const response = await model.invoke([
        { role: 'user', content: rebuildPrompt },
      ]);
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'rebuild-failed',
            error: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Final task: consolidate strategy and prepare output
   */
  @Task({ dependsOn: ['optimizeBrand', 'rebuildStrategy'] })
  async generateFinalStrategy(
    context: TaskExecutionContext<
      TypedWorkflowAgentState<BrandStrategistMetadata>
    >
  ): Promise<
    TaskExecutionResult<TypedWorkflowAgentState<BrandStrategistMetadata>>
  > {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername || 'developer';
    const strategyType = state.metadata.strategyType;
    const finalStrategy = state.metadata.finalStrategy;
    const brandData = state.metadata.brandData;

    const consolidatedStrategy = {
      userId: githubUsername,
      strategyType,
      brandScore: state.metadata.brandScore,
      strategy: finalStrategy,
      analysis: state.metadata.brandAnalysis,
      memoryContext: brandData?.devContext,
      brandEvolution: brandData?.brandEvolution,
      brandVoice: brandData?.brandVoice,
      createdAt: new Date().toISOString(),
      workflowMetadata: {
        stepsExecuted: [],
        completedAt: new Date().toISOString(),
      },
    };

    return {
      state: {
        ...state,
        messages: [
          new AIMessage(
            finalStrategy || `Brand strategy for ${githubUsername}`
          ),
        ],
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
