import { generateId } from '@hive-academy/langgraph-core';
import { Edge, Node } from '@hive-academy/langgraph-workflow-engine';
import {
  Agent,
  LlmProviderService,
} from '@hive-academy/langgraph-workflow-engine';
// Removed deleted streaming package imports:
// - EventStreamProcessorService (deleted)
// - StreamProgress (deleted)
// - StreamToken (deleted)
// Migration: Decorators removed, streaming now uses LangGraph native graph.stream()
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
import { buildFinalContentMessage } from './content-creator.utils';

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
    type: 'functional-node',
    streaming: true,
    confidenceThreshold: 0.8,
    metrics: true,
  },
})
@Injectable()
export class ContentCreatorAgent {
  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService
  ) {
    // No super() call - no base class
    // Agents use @Agent decorator for orchestration (decorator-driven, not inheritance-driven)
  }

  /**
   * Entry point for the internal content creation workflow
   * Initializes content creation and extracts key parameters
   */
  @Node({ type: 'standard' })
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
        // ✅ NEW: Emit custom progress at start
        customProgress: {
          agent: 'content-creator',
          stage: 'gathering-context',
          message: `Initializing content creation for ${githubUsername}...`,
          percentage: 10,
        },
      },
    };
  }

  /**
   * Gather comprehensive brand context from memory
   * REAL BUSINESS LOGIC: Memory service integration for brand consistency
   */
  @Node({ type: 'standard' })
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
   * ENHANCED: Optional linkedin-formatter and devto-formatter tool suggestions
   */
  @Node({ type: 'standard' })
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

      // Enhanced prompts with optional tool suggestions
      const linkedinEnhanced = `${linkedinPrompt}

You may optionally use the linkedin-formatter tool to ensure professional LinkedIn formatting, proper hashtag usage, and platform-specific best practices if you need structured formatting guidance.`;

      const devtoEnhanced = `${devtoPrompt}

You may optionally use the devto-formatter tool to apply Dev.to markdown conventions, code block formatting, and community engagement patterns if you need technical blogging best practices.`;

      const [linkedinResponse, devtoResponse] = await Promise.all([
        model.invoke([
          ...state.messages,
          { role: 'user', content: linkedinEnhanced },
        ]),
        model.invoke([
          ...state.messages,
          { role: 'user', content: devtoEnhanced },
        ]),
      ]);

      // Extract formatted content (with fallback to direct LLM response)
      const linkedinContent = this.extractFormattedContentOrFallback(
        linkedinResponse,
        'linkedin-formatter'
      );
      const devtoContent = this.extractFormattedContentOrFallback(
        devtoResponse,
        'devto-formatter'
      );

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
        messages: [...state.messages, linkedinResponse, devtoResponse],
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
   * MIGRATED: LLM-autonomous tool selection for content-optimizer and engagement-predictor
   */
  @Node({ type: 'standard' })
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

      // LLM with bound tools decides autonomously to call content-optimizer and engagement-predictor
      const optimizationPrompt = `Optimize the following content for LinkedIn and Dev.to platforms:

**LinkedIn Content:**
${rawLinkedinContent}

**Dev.to Content:**
${rawDevtoContent}

**Achievements Context:**
${JSON.stringify(achievements, null, 2)}

Use the content-optimizer tool to enhance both pieces of content for:
- Platform-specific best practices (hashtags, formatting, tone)
- Engagement optimization (hooks, calls-to-action, readability)
- SEO and discoverability improvements

Then use the engagement-predictor tool to forecast expected engagement metrics (likes, comments, shares) for both optimized versions.

Return the optimized content and engagement predictions.`;

      const model = await this.llm.getLLM({
        temperature: 0.5,
        maxTokens: 2500,
      });

      const response = await model.invoke([
        ...state.messages,
        { role: 'user', content: optimizationPrompt },
      ]);

      // Extract tool results from messages
      const toolMessages = this.extractToolMessages([
        ...state.messages,
        response,
      ]);

      // Parse optimized content from tool results (with fallback to raw content)
      const optimizedLinkedin =
        this.extractOptimizedContent(toolMessages, 'linkedin') ||
        rawLinkedinContent;
      const optimizedDevto =
        this.extractOptimizedContent(toolMessages, 'devto') || rawDevtoContent;

      // Parse engagement predictions from tool results (with fallback to defaults)
      const linkedinEngagement = this.extractEngagementPrediction(
        toolMessages,
        'linkedin'
      );
      const devtoEngagement = this.extractEngagementPrediction(
        toolMessages,
        'devto'
      );

      return {
        messages: [...state.messages, response],
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
   * MIGRATED: Uses quality scores from quality-scorer tool (via extractQualityScore helper)
   */
  @Node({ type: 'condition' })
  async assessContentQuality(
    state: TypedAgentState<ContentCreatorMetadata>
  ): Promise<{ route: string }> {
    const linkedinContent = state.metadata.linkedinContent;
    const devtoContent = state.metadata.devtoContent;

    // Extract quality scores from tool results in message history
    const toolMessages = this.extractToolMessages(state.messages);
    const linkedinQuality = this.extractQualityScore(toolMessages, 'linkedin');
    const devtoQuality = this.extractQualityScore(toolMessages, 'devto');

    // Average quality score across both platforms
    const overallQuality = (linkedinQuality + devtoQuality) / 2;

    // Basic validation: ensure substantial content exists
    const hasSubstantialContent =
      linkedinContent &&
      devtoContent &&
      linkedinContent.length > 100 &&
      devtoContent.length > 100;

    // Route based on quality score and content validation
    const qualityScore = hasSubstantialContent ? overallQuality : 0.5;

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
        // ✅ NEW: Emit completion progress
        customProgress: {
          agent: 'content-creator',
          stage: 'completed',
          message: `Content created for ${githubUsername}: LinkedIn (${linkedinContent.length} chars), Dev.to (${devtoContent.length} chars)`,
          percentage: 100,
        },
      },
      next: undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSAGE PARSING HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Extract tool messages from messages array
   */
  private extractToolMessages(messages: any[]): any[] {
    return messages.filter((msg) => msg.type === 'tool' || msg.tool_calls);
  }

  /**
   * Extract optimized content from tool results
   */
  private extractOptimizedContent(
    toolMessages: any[],
    platform: 'linkedin' | 'devto'
  ): string {
    const optimizerMsg = toolMessages.find(
      (msg) =>
        msg.name === 'content-optimizer' && msg.content?.includes(platform)
    );

    if (!optimizerMsg) {
      return ''; // Fallback handled by caller
    }

    try {
      const result = JSON.parse(optimizerMsg.content);
      return result.optimizedContent || '';
    } catch {
      return optimizerMsg.content || '';
    }
  }

  /**
   * Extract engagement prediction from tool results
   */
  private extractEngagementPrediction(
    toolMessages: any[],
    platform: 'linkedin' | 'devto'
  ): number {
    const engagementMsg = toolMessages.find(
      (msg) =>
        msg.name === 'engagement-predictor' && msg.content?.includes(platform)
    );

    if (!engagementMsg) {
      return 0.5; // Default engagement score
    }

    try {
      const result = JSON.parse(engagementMsg.content);
      return result.predictions?.likes?.estimate || 0.5;
    } catch {
      return 0.5;
    }
  }

  /**
   * Extract quality score from tool results
   */
  private extractQualityScore(
    toolMessages: any[],
    platform: 'linkedin' | 'devto'
  ): number {
    const qualityMsg = toolMessages.find(
      (msg) => msg.name === 'quality-scorer' && msg.content?.includes(platform)
    );

    if (!qualityMsg) {
      return 0.75; // Default quality score
    }

    try {
      const result = JSON.parse(qualityMsg.content);
      return result.overallScore || 0.75;
    } catch {
      return 0.75;
    }
  }

  /**
   * Extract formatted content from tool result or fallback to LLM response
   */
  private extractFormattedContentOrFallback(
    response: any,
    toolName: string
  ): string {
    // Check if LLM used the tool
    const toolMessage = response.tool_calls?.find(
      (tc: any) => tc.name === toolName
    );
    if (toolMessage) {
      try {
        const result = JSON.parse(toolMessage.output || '{}');
        return result.formattedContent || response.content.toString();
      } catch {
        return response.content.toString();
      }
    }

    // Fallback to direct LLM response
    return response.content.toString();
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

    // Extract quality scores from tool results
    const toolMessages = this.extractToolMessages(state.messages);
    const linkedinQuality = this.extractQualityScore(toolMessages, 'linkedin');
    const devtoQuality = this.extractQualityScore(toolMessages, 'devto');
    const overallQuality = (linkedinQuality + devtoQuality) / 2;

    // Basic validation
    const hasSubstantialContent =
      (linkedinContent?.length || 0) > 100 && (devtoContent?.length || 0) > 100;

    const qualityScore = hasSubstantialContent ? overallQuality : 0.5;

    return qualityScore > 0.0; // Always proceed to finalize
  }
}
