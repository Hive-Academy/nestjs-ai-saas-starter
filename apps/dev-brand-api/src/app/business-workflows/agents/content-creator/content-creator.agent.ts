import { generateId } from '@hive-academy/langgraph-core';
import { Edge, Node } from '@hive-academy/langgraph-functional-api';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import {
  EventStreamProcessorService,
  StreamProgress,
  StreamToken,
} from '@hive-academy/langgraph-streaming';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import {
  DeclarativeWorkflowBase,
  MetadataProcessorService,
  SubgraphManagerService,
  WorkflowGraphBuilderService,
  WorkflowStreamService,
} from '@hive-academy/langgraph-workflow-engine';
import { AIMessage } from '@langchain/core/messages';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LLMProviderError } from '../../core/errors/business-workflow.errors';
import { PersonalBrandMemoryService } from '../../core/memory/personal-brand-memory.service';
import { Optimize } from '../../core/performance/optimization.decorators';
import { Validate } from '../../core/validation/workflow.validators';
import type { TypedAgentState } from '../../types';
import type { BrandStrategy } from '../shared/agent.types';
import type { ContentCreatorMetadata } from '../shared/metadata.types';
import {
  buildDevToPrompt,
  buildLinkedInPrompt,
} from './content-creator.prompts';
import {
  buildFinalContentMessage,
  calculateQualityScore,
  optimizeDevToContent,
  optimizeLinkedInContent,
  predictEngagement,
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
  description:
    'Creates optimized content for multiple platforms using sophisticated workflow',
  type: 'workflow-agent',
  // 🆕 DEFAULTS APPLIED: metadata, outputFormat now use defaults
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
    type: 'functional-node', // 🔑 Explicit node-based workflow type
    // 🆕 DEFAULTS APPLIED: streaming, confidenceThreshold, metrics now inherit from module config
    enableInternalCheckpointing: false, // Override default true (no checkpointing needed)
    internalTimeout: 45000, // Override default 60000 (45 seconds for content generation)
    // 🆕 enableInternalStreaming, enableErrorRecovery, maxInternalRetries,
    // enableStepProgress, stateKey now use module defaults
    // 🆕 multiAgentStreaming uses module defaults

    // Multi-agent interruption configuration - HITL for content approval
    multiAgentInterruption: {
      enabled: true, // Override default false - Enable approval for content before publishing
      interruptBefore: ['content-creator'], // Pause before content creation for review
    },
  },
})
@Injectable()
export class ContentCreatorAgent extends DeclarativeWorkflowBase<
  TypedAgentState<ContentCreatorMetadata>
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
   * Entry point for the internal content creation workflow
   * Initializes content creation and extracts key parameters
   */
  @Node({ type: 'standard' })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeContentCreation(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<Partial<TypedAgentState<ContentCreatorMetadata>>> {
    const githubUsername = state.metadata.githubUsername || 'developer';
    const achievements = state.metadata.achievements || [];

    return {
      metadata: {
        ...state.metadata,
        workflowStartTime: new Date(),
        currentStep: 'initialization',
        githubUsername,
        achievements,
        contentStartTime: new Date(),
        workflowInstanceId: generateId('content'),
        targetPlatforms: ['linkedin', 'devto'],
      },
    };
  }

  /**
   * Gather comprehensive brand context from memory
   * REAL BUSINESS LOGIC: Memory service integration for brand consistency
   */
  @Node({ type: 'standard' })
  @StreamProgress({ enabled: true })
  async gatherBrandContext(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<Partial<TypedAgentState<ContentCreatorMetadata>>> {
    const githubUsername = state.metadata.githubUsername;

    try {
      const [voice, strategy] = await Promise.all([
        this.memory.getBrandVoice(githubUsername),
        this.memory.getBrandStrategy?.(githubUsername) ||
          state.metadata.brandStrategy,
      ]);

      return {
        metadata: {
          ...state.metadata,
          currentStep: 'brand-context-gathered',
          brandVoice: voice,
          brandStrategy: strategy,
          positioning:
            (strategy as BrandStrategy)?.positioning || 'Technical Excellence',
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'brand-context-fallback',
          brandVoice: { tone: 'professional', style: 'technical' },
          brandStrategy: { positioning: 'Technical Excellence' },
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Generate platform-specific content using LLM
   * REAL BUSINESS LOGIC: AI-powered content generation with brand consistency
   */
  @Node({ type: 'standard' })
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
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<Partial<TypedAgentState<ContentCreatorMetadata>>> {
    const githubUsername = state.metadata.githubUsername;
    const achievements = state.metadata.achievements || [];
    const brandVoice = state.metadata.brandVoice;
    const brandStrategy = state.metadata.brandStrategy;

    try {
      if (!brandVoice || !brandStrategy) {
        throw new LLMProviderError(
          'openai',
          'generatePlatformContent',
          'Brand voice and strategy are required for content generation',
          {
            githubUsername,
            hasBrandVoice: !!brandVoice,
            hasBrandStrategy: !!brandStrategy,
          }
        );
      }

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
        metadata: {
          ...state.metadata,
          currentStep: 'content-generated',
          rawLinkedinContent: linkedinContent,
          rawDevtoContent: devtoContent,
          contentGenerated: true,
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
  @Node({ type: 'standard' })
  @StreamProgress({ enabled: true })
  async optimizeContent(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<Partial<TypedAgentState<ContentCreatorMetadata>>> {
    const rawLinkedinContent = state.metadata.rawLinkedinContent;
    const rawDevtoContent = state.metadata.rawDevtoContent;
    const achievements = state.metadata.achievements || [];

    try {
      if (!rawLinkedinContent || !rawDevtoContent) {
        throw new Error('Raw content is required for optimization');
      }

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
        metadata: {
          ...state.metadata,
          currentStep: 'content-optimized',
          linkedinContent: optimizedLinkedin,
          devtoContent: optimizedDevto,
          linkedinEngagement,
          devtoEngagement,
          contentOptimized: true,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'optimization-fallback',
          linkedinContent:
            rawLinkedinContent || 'Content generated successfully',
          devtoContent: rawDevtoContent || 'Article content ready',
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Assess content quality - decision point in workflow
   */
  @Node({ type: 'condition' })
  async assessContentQuality(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<{ route: string }> {
    const linkedinContent = state.metadata.linkedinContent;
    const devtoContent = state.metadata.devtoContent;
    const achievements = state.metadata.achievements || [];

    const hasSubstantialContent =
      linkedinContent &&
      devtoContent &&
      linkedinContent.length > 100 &&
      devtoContent.length > 100;
    const hasAchievements = achievements.length > 0;
    const linkedinEngagement = state.metadata.linkedinEngagement || 0;
    const devtoEngagement = state.metadata.devtoEngagement || 0;

    const qualityScore = calculateQualityScore({
      hasSubstantialContent: !!hasSubstantialContent,
      hasAchievements,
      linkedinEngagement,
      devtoEngagement,
      contentLength:
        (linkedinContent?.length || 0) + (devtoContent?.length || 0),
    });

    return {
      route: qualityScore > 0.7 ? 'high-quality' : 'standard',
    };
  }

  /**
   * Finalize content and package for delivery
   *
   * HITL Integration: Requires user approval before publishing content
   * - Users can review generated content for LinkedIn and Dev.to
   * - Request changes, approve, or reject before publishing
   * - Approval timeout: 5 minutes (longer for content review)
   * - WebSocket events: interruption_request, interruption_resolved
   */
  @Node({ type: 'standard' })
  @StreamProgress({ enabled: true })
  @RequiresApproval({
    confidenceThreshold: 0.75,
    timeoutMs: 300000, // 5 minutes for content review
    message: (state) => {
      const linkedinLength =
        typeof state.metadata?.linkedinContent === 'string'
          ? state.metadata.linkedinContent.length
          : 0;
      const devtoLength =
        typeof state.metadata?.devtoContent === 'string'
          ? state.metadata.devtoContent.length
          : 0;
      const linkedinEng =
        typeof state.metadata?.linkedinEngagement === 'number'
          ? state.metadata.linkedinEngagement
          : 0;
      const devtoEng =
        typeof state.metadata?.devtoEngagement === 'number'
          ? state.metadata.devtoEngagement
          : 0;
      return `Content creation complete. LinkedIn: ${linkedinLength} chars (engagement: ${linkedinEng.toFixed(
        2
      )}), Dev.to: ${devtoLength} chars (engagement: ${devtoEng.toFixed(
        2
      )}). Please review and approve.`;
    },
    onTimeout: 'escalate',
    metadata: (state) => ({
      agentId: 'content-creator',
      linkedinLength:
        typeof state.metadata?.linkedinContent === 'string'
          ? state.metadata.linkedinContent.length
          : undefined,
      devtoLength:
        typeof state.metadata?.devtoContent === 'string'
          ? state.metadata.devtoContent.length
          : undefined,
      linkedinEngagement: state.metadata?.linkedinEngagement,
      devtoEngagement: state.metadata?.devtoEngagement,
      platforms: state.metadata?.targetPlatforms,
    }),
  })
  async finalizeContent(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<Partial<TypedAgentState<ContentCreatorMetadata>>> {
    const githubUsername = state.metadata.githubUsername;
    const linkedinContent = state.metadata.linkedinContent || '';
    const devtoContent = state.metadata.devtoContent || '';
    const linkedinEngagement = state.metadata.linkedinEngagement || 0;
    const devtoEngagement = state.metadata.devtoEngagement || 0;
    const mode = state.metadata.mode || 'optimized';

    const finalMessage = buildFinalContentMessage(
      githubUsername,
      linkedinContent,
      devtoContent,
      linkedinEngagement,
      devtoEngagement,
      mode
    );

    return {
      messages: [new AIMessage(finalMessage)],
      metadata: {
        ...state.metadata,
        currentStep: 'completed',
        contentCreated: true,
        workflowCompleted: true,
        contentEndTime: new Date(),
        totalProcessingTime:
          Date.now() -
          (state.metadata.contentStartTime?.getTime() || Date.now()),
        finalStage: true,
      },
      next: undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPLICIT EDGE DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  @Edge('initializeContentCreation', 'gatherBrandContext')
  initToGather() {
    return true;
  }

  @Edge('gatherBrandContext', 'generatePlatformContent')
  gatherToGenerate() {
    return true;
  }

  @Edge('generatePlatformContent', 'optimizeContent')
  generateToOptimize() {
    return true;
  }

  @Edge('optimizeContent', 'assessContentQuality')
  optimizeToAssess() {
    return true;
  }

  /**
   * Define workflow edges
   */

  /**
   * Define workflow edges
   */
  @Edge('assessContentQuality', 'finalizeContent')
  shouldProceedToFinalize(
    state: TypedAgentState<ContentCreatorMetadata>
  ): boolean {
    const linkedinContent = state.metadata.linkedinContent;
    const devtoContent = state.metadata.devtoContent;
    const achievements = state.metadata.achievements || [];
    const linkedinEngagement = state.metadata.linkedinEngagement || 0;
    const devtoEngagement = state.metadata.devtoEngagement || 0;

    const qualityScore = calculateQualityScore({
      hasSubstantialContent:
        (linkedinContent?.length || 0) > 100 &&
        (devtoContent?.length || 0) > 100,
      hasAchievements: achievements.length > 0,
      linkedinEngagement,
      devtoEngagement,
      contentLength:
        (linkedinContent?.length || 0) + (devtoContent?.length || 0),
    });

    return qualityScore > 0.0; // Always proceed to finalize
  }
}
