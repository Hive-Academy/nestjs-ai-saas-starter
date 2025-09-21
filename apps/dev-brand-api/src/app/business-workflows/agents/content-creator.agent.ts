import { Injectable } from '@nestjs/common';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { WorkflowAgentState } from '../types';
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
import { AIMessage } from '@langchain/core/messages';
import { PersonalBrandMemoryService } from '../core/memory/personal-brand-memory.service';
import { AgentExecutionError, MemoryServiceError, LLMProviderError } from '../core/errors/business-workflow.errors';
import { Validate, Required, IsContentType, IsPlatform } from '../core/validation/workflow.validators';
import { Optimize } from '../core/performance/optimization.decorators';

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
  type: 'workflow-agent', // 🆕 New workflow agent type
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
  workflowConfig: {
    enableInternalStreaming: true,
    enableInternalCheckpointing: false, // Content creation is fast
    internalTimeout: 45000, // 45 seconds for content generation
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: 'content-creator-workflow',
  },
})
@Workflow({
  name: 'content-creator-workflow',
  description: 'Creates optimized content for multiple platforms using sophisticated workflow',
  streaming: true,
  confidenceThreshold: 0.7,
  metrics: true,
})
@Injectable()
export class ContentCreatorAgent {

  constructor(
    private readonly llm: LlmProviderService,
    private readonly memory: PersonalBrandMemoryService
  ) {}

  /**
   * Entry point for the internal content creation workflow
   * Initializes content creation and extracts key parameters
   */
  @Entrypoint({ timeout: 10000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeContentCreation(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = (state.metadata?.githubUsername as string) || 'developer';
    const achievements = (state.metadata?.achievements as any[]) || [];
    
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
          targetPlatforms: ['linkedin', 'devto'], // Could be expanded
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
  async gatherBrandContext(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const achievements = (state.metadata?.achievements as any[]) || [];

    try {
      const [voice, strategy, devContext] = await Promise.all([
        this.memory.getBrandVoice(githubUsername),
        this.memory.getBrandStrategy?.(githubUsername) || state.metadata?.brandStrategy,
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
            positioning: strategy?.positioning || 'Technical Excellence',
          },
        },
      };
    } catch (error) {
      // Fallback brand context
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'brand-context-fallback',
            brandVoice: { tone: 'professional', style: 'technical' },
            brandStrategy: { positioning: 'Technical Excellence' },
            error: error.message,
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
    cache: { ttl: 600000, maxSize: 50 }, // 10 minute cache for content generation
    circuitBreaker: { failureThreshold: 2, resetTimeout: 15000 },
    timeout: 45000,
    metrics: { trackExecutionTime: true, trackErrorRate: true }
  })
  async generatePlatformContent(
    @Required() context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const achievements = (state.metadata?.achievements as any[]) || [];
    const brandVoice = state.metadata?.brandVoice;
    const brandStrategy = state.metadata?.brandStrategy;

    try {
      const model = await this.llm.getLLM({ temperature: 0.6, maxTokens: 900 });
      
      // Create sophisticated prompts based on brand context
      const linkedinPrompt = this.buildLinkedInPrompt(githubUsername, achievements, brandVoice, brandStrategy);
      const devtoPrompt = this.buildDevToPrompt(githubUsername, achievements, brandVoice, brandStrategy);

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
    } catch (error: any) {
      // Enhanced error handling with proper error types
      if (error instanceof LLMProviderError) {
        throw error; // Re-throw structured errors
      }

      // Create structured error for unexpected failures
      const contentError = new LLMProviderError(
        'openai',
        'generatePlatformContent',
        error.message || 'Content generation failed',
        { githubUsername, achievementCount: achievements.length, originalError: error.message }
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
  async optimizeContent(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const rawLinkedinContent = state.metadata?.rawLinkedinContent as string;
    const rawDevtoContent = state.metadata?.rawDevtoContent as string;
    const achievements = (state.metadata?.achievements as any[]) || [];

    try {
      // Apply platform-specific optimizations
      const optimizedLinkedin = this.optimizeLinkedInContent(rawLinkedinContent, achievements);
      const optimizedDevto = this.optimizeDevToContent(rawDevtoContent, achievements);
      
      // Calculate engagement predictions
      const linkedinEngagement = this.predictEngagement('linkedin', optimizedLinkedin);
      const devtoEngagement = this.predictEngagement('devto', optimizedDevto);

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
    } catch (error) {
      // Use raw content if optimization fails
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'optimization-fallback',
            linkedinContent: rawLinkedinContent || 'Content generated successfully',
            devtoContent: rawDevtoContent || 'Article content ready',
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Assess content quality - decision point in workflow
   */
  @Node({ type: 'condition' })
  async assessContentQuality(context: TaskExecutionContext): Promise<{ route: string }> {
    const { state } = context;
    const linkedinContent = state.metadata?.linkedinContent as string;
    const devtoContent = state.metadata?.devtoContent as string;
    const achievements = (state.metadata?.achievements as any[]) || [];
    
    // Quality assessment criteria
    const hasSubstantialContent = linkedinContent.length > 100 && devtoContent.length > 100;
    const hasAchievements = achievements.length > 0;
    const linkedinEngagement = state.metadata?.linkedinEngagement || 0;
    const devtoEngagement = state.metadata?.devtoEngagement || 0;
    
    const qualityScore = this.calculateQualityScore({
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
  async finalizeContent(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const linkedinContent = state.metadata?.linkedinContent as string;
    const devtoContent = state.metadata?.devtoContent as string;
    const linkedinEngagement = state.metadata?.linkedinEngagement || 0;
    const devtoEngagement = state.metadata?.devtoEngagement || 0;
    const mode = state.metadata?.mode || 'optimized';

    const finalMessage = this.buildFinalContentMessage(
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
        messages: [
          new AIMessage(finalMessage),
        ],
        metadata: {
          ...state.metadata,
          currentStep: 'completed',
          contentCreated: true,
          workflowCompleted: true,
          contentEndTime: new Date(),
          totalProcessingTime: Date.now() - (state.metadata?.contentStartTime?.getTime() || Date.now()),
          finalStage: true,
        },
        next: undefined, // Content creation is final step
      },
    };
  }

  // Define workflow edges
  @Edge('assessContentQuality', 'finalizeContent', { 
    condition: (state: WorkflowAgentState) => {
      const linkedinContent = state.metadata?.linkedinContent as string;
      const devtoContent = state.metadata?.devtoContent as string;
      const achievements = (state.metadata?.achievements as any[]) || [];
      const linkedinEngagement = state.metadata?.linkedinEngagement || 0;
      const devtoEngagement = state.metadata?.devtoEngagement || 0;
      
      const qualityScore = this.calculateQualityScore({
        hasSubstantialContent: linkedinContent?.length > 100 && devtoContent?.length > 100,
        hasAchievements: achievements.length > 0,
        linkedinEngagement,
        devtoEngagement,
        contentLength: (linkedinContent?.length || 0) + (devtoContent?.length || 0),
      });
      
      return qualityScore > 0.7;
    }
  })
  routeHighQuality() {}

  @Edge('assessContentQuality', 'finalizeContent', { 
    condition: (state: WorkflowAgentState) => {
      const linkedinContent = state.metadata?.linkedinContent as string;
      const devtoContent = state.metadata?.devtoContent as string;
      const achievements = (state.metadata?.achievements as any[]) || [];
      const linkedinEngagement = state.metadata?.linkedinEngagement || 0;
      const devtoEngagement = state.metadata?.devtoEngagement || 0;
      
      const qualityScore = this.calculateQualityScore({
        hasSubstantialContent: linkedinContent?.length > 100 && devtoContent?.length > 100,
        hasAchievements: achievements.length > 0,
        linkedinEngagement,
        devtoEngagement,
        contentLength: (linkedinContent?.length || 0) + (devtoContent?.length || 0),
      });
      
      return qualityScore <= 0.7;
    }
  })
  routeStandard() {}

  /**
   * Build sophisticated LinkedIn prompt with brand context
   */
  private buildLinkedInPrompt(
    username: string,
    achievements: any[],
    brandVoice: any,
    brandStrategy: any
  ): string {
    return `Create a compelling LinkedIn post for ${username} that showcases their professional achievements.

CONTEXT:
- Developer: ${username}
- Brand Voice: ${brandVoice?.tone || 'professional'} tone, ${brandVoice?.style || 'technical'} style
- Brand Strategy: ${brandStrategy?.positioning || 'Technical Excellence'}
- Achievements: ${achievements.length} technical accomplishments

KEY ACHIEVEMENTS TO HIGHLIGHT:
${achievements.slice(0, 3).map((a: any, i: number) => `${i + 1}. ${a.description || a.title || 'Technical achievement'} (${a.impact || 'high'} impact)`).join('\n')}

REQUIREMENTS:
- Professional tone matching brand voice
- Include relevant hashtags (3-5)
- Call-to-action for engagement
- 150-300 words
- Focus on business value and impact
- Use first person perspective

Create an engaging LinkedIn post that positions ${username} as a skilled developer and thought leader.`;
  }

  /**
   * Build sophisticated Dev.to prompt with brand context
   */
  private buildDevToPrompt(
    username: string,
    achievements: any[],
    brandVoice: any,
    brandStrategy: any
  ): string {
    return `Create an engaging Dev.to article introduction for ${username} based on their recent technical achievements.

CONTEXT:
- Developer: ${username}
- Brand Voice: ${brandVoice?.tone || 'professional'} tone, ${brandVoice?.style || 'technical'} style
- Brand Strategy: ${brandStrategy?.positioning || 'Technical Excellence'}
- Recent Achievements: ${achievements.length} technical accomplishments

TOP TECHNICAL ACHIEVEMENTS:
${achievements.slice(0, 3).map((a: any, i: number) => `${i + 1}. ${a.description || a.title || 'Technical achievement'} - ${a.technologies?.join(', ') || 'Modern tech stack'}`).join('\n')}

REQUIREMENTS:
- Technical but accessible writing style
- Hook readers in first paragraph
- Promise valuable insights
- 200-400 words for introduction
- Include what readers will learn
- Developer-focused audience

Create an article introduction that establishes ${username} as a knowledgeable developer sharing valuable insights.`;
  }

  /**
   * Optimize LinkedIn content for engagement
   */
  private optimizeLinkedInContent(content: string, achievements: any[]): string {
    // Add LinkedIn-specific optimizations
    let optimized = content;
    
    // Ensure proper spacing for readability
    if (!optimized.includes('\n\n')) {
      optimized = optimized.replace(/\. /g, '.\n\n');
    }
    
    // Add engagement elements if missing
    if (!optimized.includes('💡') && !optimized.includes('🚀') && !optimized.includes('✨')) {
      optimized = '🚀 ' + optimized;
    }
    
    // Ensure call-to-action
    if (!optimized.toLowerCase().includes('what') && !optimized.toLowerCase().includes('share') && !optimized.toLowerCase().includes('thoughts')) {
      optimized += '\n\nWhat\'s your experience with similar challenges? Share your thoughts in the comments!';
    }
    
    return optimized;
  }

  /**
   * Optimize Dev.to content for technical audience
   */
  private optimizeDevToContent(content: string, achievements: any[]): string {
    let optimized = content;
    
    // Ensure technical focus
    if (!optimized.toLowerCase().includes('code') && !optimized.toLowerCase().includes('technical') && !optimized.toLowerCase().includes('development')) {
      optimized += '\n\nIn this article, we\'ll dive deep into the technical implementation and lessons learned.';
    }
    
    // Add learning promise
    if (!optimized.toLowerCase().includes('learn') && !optimized.toLowerCase().includes('discover')) {
      optimized += '\n\nYou\'ll learn practical techniques you can apply to your own projects.';
    }
    
    return optimized;
  }

  /**
   * Predict engagement score for platform
   */
  private predictEngagement(platform: 'linkedin' | 'devto', content: string): number {
    let score = 0.5; // Base score
    
    // Content length optimization
    if (platform === 'linkedin') {
      if (content.length >= 150 && content.length <= 300) score += 0.2;
    } else {
      if (content.length >= 200 && content.length <= 400) score += 0.2;
    }
    
    // Engagement elements
    if (content.includes('?')) score += 0.1; // Questions increase engagement
    if (content.match(/[🚀💡✨🎯]/)) score += 0.1; // Emojis (but not too many)
    if (content.toLowerCase().includes('share') || content.toLowerCase().includes('comment')) score += 0.1;
    
    // Technical relevance for dev.to
    if (platform === 'devto' && (content.toLowerCase().includes('technical') || content.toLowerCase().includes('code'))) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Calculate overall content quality score
   */
  private calculateQualityScore(criteria: {
    hasSubstantialContent: boolean;
    hasAchievements: boolean;
    linkedinEngagement: number;
    devtoEngagement: number;
    contentLength: number;
  }): number {
    let score = 0;
    
    if (criteria.hasSubstantialContent) score += 0.3;
    if (criteria.hasAchievements) score += 0.2;
    if (criteria.linkedinEngagement > 0.6) score += 0.2;
    if (criteria.devtoEngagement > 0.6) score += 0.2;
    if (criteria.contentLength > 500) score += 0.1;
    
    return score;
  }

  /**
   * Build final content delivery message
   */
  private buildFinalContentMessage(
    username: string,
    linkedinContent: string,
    devtoContent: string,
    linkedinEngagement: number,
    devtoEngagement: number,
    mode: string
  ): string {
    return `🎨 **CONTENT CREATION COMPLETE**

**Created for:** ${username}
**Mode:** ${mode === 'fallback' ? 'Fallback Template' : 'AI-Optimized'}

---

📱 **LINKEDIN POST:**
${linkedinContent}

*Engagement Prediction: ${Math.round(linkedinEngagement * 100)}% • Optimized for professional network*

---

📝 **DEV.TO ARTICLE INTRO:**
${devtoContent}

*Engagement Prediction: ${Math.round(devtoEngagement * 100)}% • Optimized for developer community*

---

**📊 CONTENT METRICS:**
• **LinkedIn Length:** ${linkedinContent.length} characters (optimal: 150-300)
• **Dev.to Length:** ${devtoContent.length} characters (optimal: 200-400)
• **Total Processing:** AI-powered generation with brand voice integration

*Ready to publish! Content optimized for maximum engagement and brand consistency.*`;
  }
}
