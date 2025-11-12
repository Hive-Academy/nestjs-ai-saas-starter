import { Edge, Node } from '@hive-academy/langgraph-workflow-engine';
import {
  Agent,
  LlmProviderService,
} from '@hive-academy/langgraph-workflow-engine';
// Removed deleted streaming package imports (EventStreamProcessorService, StreamProgress, StreamToken)
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
// Removed deleted services and base class (no longer needed):
// - DeclarativeWorkflowBase (not exported, decorator-driven architecture)
// - WorkflowGraphBuilderService (deleted in consolidation)
// - SubgraphManagerService (deleted in consolidation)
// - WorkflowStreamService (deleted with streaming package)
// - MetadataProcessorService (not needed without base class)
// - EventEmitter2 (not needed without base class)
import { AIMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { PersonalBrandMemoryService } from '../../core/memory/personal-brand-memory.service';
import type { TypedAgentState } from '../../types';
import type { BrandAnalysis, BrandData } from '../shared/agent.types';
import type { BrandStrategistMetadata } from '../shared/metadata.types';
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
  description:
    'Enhanced Personal Brand Strategist with internal multi-step workflow',
  type: 'workflow-agent',
  // 🆕 DEFAULTS APPLIED: metadata, outputFormat now use defaults
  capabilities: ['brand-analysis', 'strategic-positioning', 'career-guidance'],
  tools: ['memory-analysis', 'brand-optimization', 'strategy-generation'],
  priority: 'high',
  executionTime: 'medium',
  workflow: {
    name: 'brand-strategist-workflow',
    type: 'functional-node',
    streaming: true,
    confidenceThreshold: 0.8,
    metrics: true,
  },
})
@Injectable()
export class PersonalBrandStrategistAgent {
  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService
  ) {
    // No super() call - no base class
    // Agents use @Agent decorator for orchestration (decorator-driven, not inheritance-driven)
  }

  /**
   * Entry point for the internal brand strategy workflow
   * Initializes the analysis and sets up the workflow state
   */
  @Node({ type: 'standard' })
  async initializeBrandAnalysis(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<Partial<TypedAgentState<BrandStrategistMetadata>>> {
    const githubUsername = state.metadata.githubUsername || 'developer';

    return {
      metadata: {
        ...state.metadata,
        workflowStartTime: new Date(),
        currentStep: 'initialization',
        githubUsername,
        brandAnalysisId: `brand-${githubUsername}-${Date.now()}`,
      },
    };
  }

  /**
   * Gathers comprehensive brand data from memory and GitHub metadata
   */
  @Node({ type: 'standard' })
  async gatherBrandData(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<Partial<TypedAgentState<BrandStrategistMetadata>>> {
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
        metadata: {
          ...state.metadata,
          currentStep: 'data-gathered',
          brandData,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'data-gathering-failed',
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Analyzes current brand positioning using LLM
   */
  @Node({ type: 'standard' })
  async analyzeBrandPositioning(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<Partial<TypedAgentState<BrandStrategistMetadata>>> {
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

      // Enable optional memory-analysis tool for enhanced context retrieval
      const enhancedPrompt = `${analysisPrompt}

You may optionally use the memory-analysis tool to retrieve and analyze additional developer context, brand evolution patterns, or historical positioning data if you need more detailed memory insights to improve the analysis.`;

      const model = await this.llm.getLLM({
        temperature: 0.3,
        maxTokens: 1000,
      });
      const response = await model.invoke([
        ...state.messages,
        { role: 'user', content: enhancedPrompt },
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
        messages: [...state.messages, response],
        metadata: {
          ...state.metadata,
          currentStep: 'positioning-analyzed',
          brandAnalysis: {
            ...analysis,
            analyzedAt: new Date().toISOString(),
          },
          brandScore: analysis.score || 0.6,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'analysis-failed',
          brandScore: 0.5,
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Decision node: assess brand strength and route to appropriate strategy
   * Returns routing decision for conditional edges
   */
  @Node({ type: 'condition' })
  async assessBrandStrength(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<{ route: string }> {
    const brandScore = state.metadata.brandScore || 0.5;
    const route = brandScore > 0.7 ? 'optimize' : 'rebuild';
    return { route };
  }

  /**
   * Optimization strategy for strong brands (brandScore > 0.7)
   * Reached via conditional edge from assessBrandStrength
   */
  @Node({ type: 'standard' })
  async optimizeBrand(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<Partial<TypedAgentState<BrandStrategistMetadata>>> {
    const brandAnalysis = state.metadata.brandAnalysis;
    const githubUsername = state.metadata.githubUsername || 'developer';

    if (!brandAnalysis) {
      throw new Error('Brand analysis is required for optimization');
    }

    const optimizationPrompt = buildOptimizationPrompt(
      githubUsername,
      brandAnalysis
    );

    // Enable optional brand-optimization tool for enhanced strategies
    const enhancedPrompt = `${optimizationPrompt}

You may optionally use the brand-optimization tool to generate data-driven optimization strategies, competitive positioning insights, or structured improvement recommendations if you need more analytical capabilities.`;

    try {
      const model = await this.llm.getLLM({ temperature: 0.5, maxTokens: 800 });
      const response = await model.invoke([
        ...state.messages,
        { role: 'user', content: enhancedPrompt },
      ]);
      const strategy = response.content.toString();

      return {
        messages: [...state.messages, response],
        metadata: {
          ...state.metadata,
          currentStep: 'optimization-complete',
          strategyType: 'optimization',
          finalStrategy: strategy,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'optimization-failed',
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Rebuild strategy for weak brands (brandScore <= 0.7)
   * Reached via conditional edge from assessBrandStrength
   */
  @Node({ type: 'standard' })
  async rebuildStrategy(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<Partial<TypedAgentState<BrandStrategistMetadata>>> {
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

    // Enable optional strategy-generation tool for comprehensive rebuild strategies
    const enhancedPrompt = `${rebuildPrompt}

You may optionally use the strategy-generation tool to create comprehensive brand rebuild strategies, repositioning frameworks, or multi-phase improvement roadmaps if you need structured strategic planning capabilities.`;

    try {
      const model = await this.llm.getLLM({
        temperature: 0.6,
        maxTokens: 1200,
      });
      const response = await model.invoke([
        ...state.messages,
        { role: 'user', content: enhancedPrompt },
      ]);
      const strategy = response.content.toString();

      return {
        messages: [...state.messages, response],
        metadata: {
          ...state.metadata,
          currentStep: 'rebuild-complete',
          strategyType: 'rebuild',
          finalStrategy: strategy,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'rebuild-failed',
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Final node: consolidate strategy and prepare output
   * Reached from both optimizeBrand and rebuildStrategy paths
   *
   * HITL Integration: Requires user approval before proceeding to content creation
   * - Users can validate brand strategy, request revisions, or provide guidance
   * - Approval timeout: 3 minutes (longer for strategy review)
   * - WebSocket events: interruption_request, interruption_resolved
   */
  @Node({ type: 'standard' })
  @RequiresApproval({
    confidenceThreshold: 0.7,
    timeoutMs: 180000, // 3 minutes for strategy review
    message: (state) => {
      const strategyType = state.metadata?.strategyType || 'unknown';
      const brandScore =
        typeof state.metadata?.brandScore === 'number'
          ? state.metadata.brandScore
          : 0;
      return `Brand strategy complete (${strategyType}, score: ${brandScore.toFixed(
        2
      )}). Please review the strategy and approve to continue.`;
    },
    onTimeout: 'escalate',
    metadata: (state) => ({
      agentId: 'personal-brand-strategist',
      strategyType: state.metadata?.strategyType,
      brandScore: state.metadata?.brandScore,
      hasAnalysis: !!state.metadata?.brandAnalysis,
    }),
  })
  async generateFinalStrategy(
    state: TypedAgentState<BrandStrategistMetadata>
  ): Promise<Partial<TypedAgentState<BrandStrategistMetadata>>> {
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
      messages: [
        new AIMessage(finalStrategy || `Brand strategy for ${githubUsername}`),
      ],
      metadata: {
        ...state.metadata,
        brandStrategyCompleted: true,
        brandStrategy: consolidatedStrategy,
        currentStep: 'workflow-complete',
      },
      next: 'content-creator',
      task: 'Create content from brand strategy',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPLICIT EDGE DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  @Edge('initializeBrandAnalysis', 'gatherBrandData')
  initToGather() {
    return true;
  }

  @Edge('gatherBrandData', 'analyzeBrandPositioning')
  gatherToAnalyze() {
    return true;
  }

  @Edge('analyzeBrandPositioning', 'assessBrandStrength')
  analyzeToAssess() {
    return true;
  }

  /**
   * Conditional edge: route to optimization for strong brands
   */
  @Edge('assessBrandStrength', 'optimizeBrand')
  shouldOptimizeBrand(
    state: TypedAgentState<BrandStrategistMetadata>
  ): boolean {
    const brandScore = state.metadata.brandScore || 0.5;
    return brandScore > 0.7;
  }

  /**
   * Conditional edge: route to rebuild for weak brands
   */
  @Edge('assessBrandStrength', 'rebuildStrategy')
  shouldRebuildBrand(state: TypedAgentState<BrandStrategistMetadata>): boolean {
    const brandScore = state.metadata.brandScore || 0.5;
    return brandScore <= 0.7;
  }

  @Edge('optimizeBrand', 'generateFinalStrategy')
  optimizeToFinal() {
    return true;
  }

  @Edge('rebuildStrategy', 'generateFinalStrategy')
  rebuildToFinal() {
    return true;
  }
}
