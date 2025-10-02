import { Injectable, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { WorkflowAgentState } from '../../types';
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
import { LLMProviderError } from '../../core/errors/business-workflow.errors';
import { Validate, Required } from '../../core/validation/workflow.validators';
import { Optimize } from '../../core/performance/optimization.decorators';
import type {
  Achievement,
  BrandVoice,
  BrandStrategy,
} from '../shared/agent.types';
import {
  buildLinkedInPrompt,
  buildDevToPrompt,
} from './content-creator.prompts';
import {
  optimizeLinkedInContent,
  optimizeDevToContent,
  predictEngagement,
  calculateQualityScore,
  buildFinalContentMessage,
} from './content-creator.utils';

/**
 * Enhanced Content Creator Agent - Workflow Agent Type
 *
 * Creates optimized content for multiple platforms using sophisticated workflow:
 * ✅ Brand voice and strategy analysis from memory
 * ✅ Multi-platform content generation (LinkedIn, Dev.to, etc.)
 * ✅ Content optimization based on platform best practices
 * ✅ Quality assessment and refinement
 * ✅ Engagement prediction and enhancement
 *
 * Internal workflow steps:
 * 1. Initialize content creation workflow
 * 2. Gather comprehensive brand context from memory
 * 3. Generate platform-specific content
 * 4. Optimize content for engagement and reach
 * 5. Assess content quality (decision point)
 * 6. Finalize and package content for delivery
 *
 * BUSINESS VALUE: Transforms personal achievements into engaging platform content
 * Externally appears as single node to other workflows.
 */
@Agent({
  id: 'content-creator',
  name: 'Content Creator',
  type: 'workflow-agent',
  capabilities: [
    'content-generation',
    'platform-optimization',
    'engagement-analysis',
    'brand-voice-integration',
  ],
  tools: [
    'linkedin-formatter',
    'devto-formatter',
    'content-optimizer',
    'quality-scorer',
    'engagement-predictor',
  ],
  priority: 'high',
  executionTime: 'medium',
  workflow: {
    name: 'content-creator-workflow',
    description:
      'Creates optimized content for multiple platforms using sophisticated workflow',
    streaming: true,
    confidenceThreshold: 0.7,
    metrics: true,
    enableInternalStreaming: true,
    enableInternalCheckpointing: false,
    internalTimeout: 45000,
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: 'content-creator-workflow',
  },
})
@Injectable()
export class ContentCreatorAgent extends DeclarativeWorkflowBase<WorkflowAgentState> {
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
   * Entry point for the internal content creation workflow
   * Initializes content creation and extracts key parameters
   */
  @Entrypoint({ timeout: 10000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeContentCreation(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername =
      (state.metadata?.githubUsername as string) || 'developer';
    const achievements = (state.metadata?.achievements as Achievement[]) || [];

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          workflowStarted: true,
          currentStep: 'initialization',
          githubUsername,
          achievementCount: achievements.length,
          contentStartTime: new Date(),
          workflowInstanceId: `content-${githubUsername}-${Date.now()}`,
          targetPlatforms: ['linkedin', 'devto'],
        },
      },
    };
  }

  /**
   * Gather comprehensive brand context from memory
   * REAL BUSINESS LOGIC: Memory service integration for brand consistency
   */
  @Task({ dependsOn: ['initializeContentCreation'] })
  @StreamProgress({ enabled: true })
  async gatherBrandContext(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;

    try {
      const [voice, strategy, devContext] = await Promise.all([
        this.memory.getBrandVoice(githubUsername),
        this.memory.getBrandStrategy?.(githubUsername) ||
          state.metadata?.brandStrategy,
        this.memory.getDevContext(githubUsername),
      ]);

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'brand-context-gathered',
            brandVoice: voice,
            brandStrategy: strategy,
            devContext,
            tone: voice.tone,
            positioning:
              (strategy as BrandStrategy)?.positioning ||
              'Technical Excellence',
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
            currentStep: 'brand-context-fallback',
            brandVoice: { tone: 'professional', style: 'technical' },
            brandStrategy: { positioning: 'Technical Excellence' },
            error: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Generate platform-specific content using LLM
   * REAL BUSINESS LOGIC: AI-powered content generation with brand consistency
   */
  @Task({ dependsOn: ['gatherBrandContext'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  @Validate
  @Optimize({
    cache: { ttl: 600000, maxSize: 50 },
    circuitBreaker: { failureThreshold: 2, resetTimeout: 15000 },
    timeout: 45000,
    metrics: { trackExecutionTime: true, trackErrorRate: true },
  })
  async generatePlatformContent(
    @Required() context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];
    const brandVoice = state.metadata?.brandVoice as BrandVoice;
    const brandStrategy = state.metadata?.brandStrategy as BrandStrategy;

    try {
      const model = await this.llm.getLLM({ temperature: 0.6, maxTokens: 900 });

      const linkedinPrompt = buildLinkedInPrompt(
        githubUsername,
        achievements,
        brandVoice,
        brandStrategy
      );
      const devtoPrompt = buildDevToPrompt(
        githubUsername,
        achievements,
        brandVoice,
        brandStrategy
      );

      const [linkedinResponse, devtoResponse] = await Promise.all([
        model.invoke([{ role: 'user', content: linkedinPrompt }]),
        model.invoke([{ role: 'user', content: devtoPrompt }]),
      ]);

      const linkedinContent = linkedinResponse.content.toString();
      const devtoContent = devtoResponse.content.toString();

      // Validate generated content quality
      if (!linkedinContent || linkedinContent.length < 50) {
        throw new LLMProviderError(
          'openai',
          'generateLinkedInContent',
          'Generated LinkedIn content too short or empty',
          { contentLength: linkedinContent?.length || 0, githubUsername }
        );
      }

      if (!devtoContent || devtoContent.length < 100) {
        throw new LLMProviderError(
          'openai',
          'generateDevToContent',
          'Generated Dev.to content too short or empty',
          { contentLength: devtoContent?.length || 0, githubUsername }
        );
      }

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'content-generated',
            rawLinkedinContent: linkedinContent,
            rawDevtoContent: devtoContent,
            contentGenerated: true,
          },
        },
      };
    } catch (error: unknown) {
      if (error instanceof LLMProviderError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const contentError = new LLMProviderError(
        'openai',
        'generatePlatformContent',
        errorMessage,
        {
          githubUsername,
          achievementCount: achievements.length,
          originalError: errorMessage,
        }
      );

      throw contentError;
    }
  }

  /**
   * Optimize content for engagement and platform best practices
   * REAL BUSINESS LOGIC: Platform-specific optimization and enhancement
   */
  @Task({ dependsOn: ['generatePlatformContent'] })
  @StreamProgress({ enabled: true })
  async optimizeContent(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const rawLinkedinContent = state.metadata?.rawLinkedinContent as string;
    const rawDevtoContent = state.metadata?.rawDevtoContent as string;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];

    try {
      const optimizedLinkedin = optimizeLinkedInContent(
        rawLinkedinContent,
        achievements
      );
      const optimizedDevto = optimizeDevToContent(
        rawDevtoContent,
        achievements
      );

      const linkedinEngagement = predictEngagement(
        'linkedin',
        optimizedLinkedin
      );
      const devtoEngagement = predictEngagement('devto', optimizedDevto);

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'content-optimized',
            linkedinContent: optimizedLinkedin,
            devtoContent: optimizedDevto,
            linkedinEngagement,
            devtoEngagement,
            contentOptimized: true,
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
            currentStep: 'optimization-fallback',
            linkedinContent:
              rawLinkedinContent || 'Content generated successfully',
            devtoContent: rawDevtoContent || 'Article content ready',
            error: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Assess content quality - decision point in workflow
   */
  @Node({ type: 'condition' })
  async assessContentQuality(
    context: TaskExecutionContext
  ): Promise<{ route: string }> {
    const { state } = context;
    const linkedinContent = state.metadata?.linkedinContent as string;
    const devtoContent = state.metadata?.devtoContent as string;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];

    const hasSubstantialContent =
      linkedinContent.length > 100 && devtoContent.length > 100;
    const hasAchievements = achievements.length > 0;
    const linkedinEngagement =
      (state.metadata?.linkedinEngagement as number) || 0;
    const devtoEngagement = (state.metadata?.devtoEngagement as number) || 0;

    const qualityScore = calculateQualityScore({
      hasSubstantialContent,
      hasAchievements,
      linkedinEngagement,
      devtoEngagement,
      contentLength: linkedinContent.length + devtoContent.length,
    });

    return {
      route: qualityScore > 0.7 ? 'high-quality' : 'standard',
    };
  }

  /**
   * Finalize content and package for delivery
   */
  @Task({ dependsOn: ['assessContentQuality'] })
  @StreamProgress({ enabled: true })
  async finalizeContent(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const linkedinContent = state.metadata?.linkedinContent as string;
    const devtoContent = state.metadata?.devtoContent as string;
    const linkedinEngagement =
      (state.metadata?.linkedinEngagement as number) || 0;
    const devtoEngagement = (state.metadata?.devtoEngagement as number) || 0;
    const mode = (state.metadata?.mode as string) || 'optimized';

    const finalMessage = buildFinalContentMessage(
      githubUsername,
      linkedinContent,
      devtoContent,
      linkedinEngagement,
      devtoEngagement,
      mode
    );

    return {
      state: {
        ...state,
        messages: [new AIMessage(finalMessage)],
        metadata: {
          ...state.metadata,
          currentStep: 'completed',
          contentCreated: true,
          workflowCompleted: true,
          contentEndTime: new Date(),
          totalProcessingTime:
            Date.now() -
            ((state.metadata?.contentStartTime as Date)?.getTime() ||
              Date.now()),
          finalStage: true,
        },
        next: undefined,
      },
    };
  }

  /**
   * Define workflow edges
   */
  @Edge('assessContentQuality', 'finalizeContent')
  shouldProceedToFinalize(state: WorkflowAgentState): boolean {
    const linkedinContent = state.metadata?.linkedinContent as string;
    const devtoContent = state.metadata?.devtoContent as string;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];
    const linkedinEngagement =
      (state.metadata?.linkedinEngagement as number) || 0;
    const devtoEngagement = (state.metadata?.devtoEngagement as number) || 0;

    const qualityScore = calculateQualityScore({
      hasSubstantialContent:
        linkedinContent?.length > 100 && devtoContent?.length > 100,
      hasAchievements: achievements.length > 0,
      linkedinEngagement,
      devtoEngagement,
      contentLength:
        (linkedinContent?.length || 0) + (devtoContent?.length || 0),
    });

    return qualityScore > 0.0; // Always proceed to finalize
  }
}
