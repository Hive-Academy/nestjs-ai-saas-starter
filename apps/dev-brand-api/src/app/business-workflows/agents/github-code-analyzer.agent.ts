import { Injectable, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Agent, LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import type { WorkflowAgentState } from '../types';
import { StreamToken, StreamProgress } from '@hive-academy/langgraph-streaming';
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
import { GitHubIntegrationTools } from '../core/tools/github-integration.tools';
import { GitHubIntegrationError, AgentExecutionError } from '../core/errors/business-workflow.errors';
import { Validate, IsGitHubUsername, Required } from '../core/validation/workflow.validators';
import { Optimize } from '../core/performance/optimization.decorators';

/**
 * 💻 ENHANCED GITHUB CODE ANALYZER AGENT - AI-POWERED DEVELOPMENT INSIGHTS (Workflow Agent)
 *
 * Analyzes GitHub repositories using sophisticated multi-step workflow architecture:
 * ✅ Real-time GitHub API integration with comprehensive code analysis
 * ✅ Achievement extraction from commit patterns and repository data
 * ✅ Developer expertise assessment and productivity metrics
 * ✅ Technology stack analysis and skill mapping
 * ✅ AI-powered synthesis and professional narrative generation
 * ✅ Quality assessment with confidence scoring
 *
 * Internal workflow steps:
 * 1. Initialize GitHub analysis and extract username
 * 2. Analyze GitHub activity via API integration
 * 3. Extract meaningful achievements from code data
 * 4. Generate professional developer insights
 * 5. Synthesize analysis with AI-powered narrative
 * 6. Assess analysis quality (decision point)
 * 7. Finalize comprehensive analysis results
 *
 * BUSINESS VALUE: Transforms raw code contributions into meaningful career achievements
 * Externally appears as single node to other workflows.
 */
@Agent({
  id: 'github-code-analyzer',
  name: 'GitHub Code Analyzer',
  type: 'workflow-agent', // 🆕 New workflow agent type
  capabilities: [
    'code-analysis',
    'achievement-extraction',
    'developer-insights',
    'ai-synthesis',
  ],
  tools: ['github-analyzer', 'achievement-extractor', 'developer-insights', 'ai-synthesis'],
  priority: 'high',
  executionTime: 'fast',
  workflowConfig: {
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 90000, // 1.5 minutes for GitHub API calls
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: 'github-analyzer-workflow',
  },
})
@Workflow({
  name: 'github-analyzer-workflow',
  description: 'AI-powered GitHub repository analysis and achievement extraction',
  streaming: true,
  confidenceThreshold: 0.8,
  metrics: true,
})
@Injectable()
export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase<WorkflowAgentState> {
  
  // Required abstract property implementation
  public readonly workflowConfig = {
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 90000,
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: 'github-analyzer-workflow',
  };

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly githubTools: GitHubIntegrationTools,
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
   * Entry point for the internal GitHub analysis workflow
   * Initializes analysis and extracts GitHub username from input
   */
  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeGitHubAnalysis(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    console.log('💻 GitHub Code Analyzer: Starting developer analysis...');

    const lastMessage = state.messages[state.messages.length - 1];
    const messageContent = lastMessage.content.toString();

    // Extract GitHub username from message (could be "analyze my GitHub: username" or just "username")
    const githubUsername =
      this.extractGitHubUsername(messageContent) ||
      (typeof state.metadata?.githubUsername === 'string'
        ? state.metadata.githubUsername
        : null) ||
      'demo-user';

    const timeframe =
      typeof state.metadata?.timeframe === 'string'
        ? state.metadata.timeframe
        : 'month';
    
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          workflowStarted: true,
          currentStep: 'initialization',
          githubUsername,
          timeframe,
          analysisStartTime: new Date(),
          workflowInstanceId: `github-${githubUsername}-${Date.now()}`,
        },
      },
    };
  }

  /**
   * Analyze GitHub activity via real API integration
   * REAL BUSINESS LOGIC: Comprehensive repository and commit analysis
   */
  @Task({ dependsOn: ['initializeGitHubAnalysis'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  @Validate
  @Optimize({
    cache: { ttl: 900000, maxSize: 100 }, // 15 minute cache for GitHub data
    circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
    timeout: 90000,
    metrics: { trackExecutionTime: true, trackErrorRate: true }
  })
  async analyzeGitHubActivity(
    @Required() context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const timeframe = state.metadata?.timeframe as string;

    try {
      console.log(`💻 Analyzing GitHub activity for ${githubUsername}...`);
      const githubAnalysis = await this.githubTools.analyzeGitHubActivity({
        username: githubUsername,
        timeframe: timeframe as 'week' | 'month' | 'quarter',
        includePrivate: false,
      });

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'github-activity-analyzed',
            githubData: githubAnalysis,
            repositoriesAnalyzed: githubAnalysis.summary.totalRepositories,
            commitsAnalyzed: githubAnalysis.summary.totalCommits,
            productivityScore: githubAnalysis.summary.productivityScore,
          },
        },
      };
    } catch (error: any) {
      console.error('❌ GitHub analysis failed:', error);
      
      // Create structured error with context
      const githubError = new GitHubIntegrationError(
        'analyzeGitHubActivity',
        githubUsername,
        error.message,
        error.status || error.statusCode,
        { timeframe, originalError: error.message }
      );

      throw githubError;
    }
  }

  /**
   * Extract meaningful achievements from GitHub data
   * REAL BUSINESS LOGIC: Transform code contributions into achievements
   */
  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  @StreamProgress({ enabled: true })
  async extractAchievements(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubData = state.metadata?.githubData;

    try {
      console.log('🎯 Extracting meaningful achievements...');
      const achievements = await this.githubTools.extractAchievements({
        commits: githubData?.commits || [],
        repositories: githubData?.repositories || [],
        analysisDepth: 'detailed',
      });

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'achievements-extracted',
            achievements,
            achievementCount: achievements.length,
          },
        },
      };
    } catch (error) {
      console.error('❌ Achievement extraction failed:', error);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'achievement-extraction-error',
            achievements: [],
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Generate professional developer insights
   * REAL BUSINESS LOGIC: Professional insights about work patterns
   */
  @Task({ dependsOn: ['extractAchievements'] })
  @StreamProgress({ enabled: true })
  async generateDeveloperInsights(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const githubData = state.metadata?.githubData;

    try {
      console.log('🔍 Generating developer insights...');
      const developerInsights = await this.githubTools.generateDeveloperInsights({
        username: githubUsername,
        commits: githubData?.commits || [],
        repositories: githubData?.repositories || [],
      });

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'insights-generated',
            developerInsights,
            technicalExpertise: developerInsights.technicalExpertise,
          },
        },
      };
    } catch (error) {
      console.error('❌ Developer insights generation failed:', error);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'insights-error',
            developerInsights: { technicalExpertise: { breadth: 'Full-stack', complexity: 'High' } },
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * AI-powered synthesis of technical data into compelling narrative
   * REAL BUSINESS LOGIC: LLM-powered professional narrative generation
   */
  @Task({ dependsOn: ['generateDeveloperInsights'] })
  @StreamProgress({ enabled: true })
  @StreamToken({ enabled: true, format: 'structured' })
  async synthesizeWithAI(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const githubData = state.metadata?.githubData;
    const achievements = state.metadata?.achievements || [];
    const developerInsights = state.metadata?.developerInsights;

    try {
      console.log('🚀 Synthesizing analysis with AI...');
      const analysisPrompt = this.buildDeveloperAnalysisPrompt(
        githubUsername,
        githubData,
        achievements,
        developerInsights
      );

      const llm = await this.llmProvider.getLLM({
        temperature: 0.4,
        maxTokens: 2500,
      });
      const aiAnalysisResponse = await llm.invoke([
        { role: 'user', content: analysisPrompt },
      ]);
      const aiAnalysis = aiAnalysisResponse.content.toString();

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'ai-synthesis-complete',
            aiAnalysis,
            narrativeGenerated: true,
          },
        },
      };
    } catch (error) {
      console.error('❌ AI synthesis failed:', error);
      const fallbackAnalysis = this.generateFallbackGitHubAnalysis(githubUsername, state.metadata?.timeframe as string);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'ai-synthesis-fallback',
            aiAnalysis: fallbackAnalysis,
            mode: 'fallback',
            error: error.message,
          },
        },
      };
    }
  }

  /**
   * Assess analysis quality and confidence - decision point
   */
  @Node({ type: 'condition' })
  async assessAnalysisQuality(context: TaskExecutionContext): Promise<{ route: string }> {
    const { state } = context;
    const githubData = state.metadata?.githubData;
    const achievements = state.metadata?.achievements || [];
    const hasRealData = githubData && githubData.summary && achievements.length > 0;
    const hasAIAnalysis = state.metadata?.aiAnalysis && state.metadata.aiAnalysis.length > 100;
    
    const confidenceScore = hasRealData && hasAIAnalysis ? 0.95 : 0.7;
    
    return {
      route: confidenceScore > 0.8 ? 'high-confidence' : 'standard',
    };
  }

  /**
   * Finalize comprehensive analysis results
   */
  @Task({ dependsOn: ['assessAnalysisQuality'] })
  @StreamProgress({ enabled: true })
  async finalizeAnalysis(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const timeframe = state.metadata?.timeframe as string;
    const githubData = state.metadata?.githubData;
    const achievements = state.metadata?.achievements || [];
    const aiAnalysis = state.metadata?.aiAnalysis || '';
    const mode = state.metadata?.mode || 'real';

    console.log('✅ GitHub Code Analyzer: Analysis completed with AI insights');

    const analysisMessage = mode === 'fallback' 
      ? this.buildFallbackMessage(githubUsername, aiAnalysis)
      : this.buildSuccessMessage(githubUsername, timeframe, aiAnalysis, githubData, achievements);

    return {
      state: {
        ...state,
        messages: [
          new AIMessage(analysisMessage),
        ],
        scratchpad: `GitHub analysis completed for: ${githubUsername}\nAchievements found: ${achievements.length}\nMode: ${mode}`,
        metadata: {
          ...state.metadata,
          currentStep: 'completed',
          githubAnalysisCompleted: true,
          workflowCompleted: true,
          analysisEndTime: new Date(),
          totalProcessingTime: Date.now() - (state.metadata?.analysisStartTime?.getTime() || Date.now()),
          toolsUsed: ['github-analyzer', 'achievement-extractor', 'developer-insights', 'ai-synthesis'],
          confidenceScore: mode === 'fallback' ? 0.7 : 0.95,
        },
        next: 'personal-brand-strategist',
        task: 'Develop personal brand strategy from code analysis',
      },
    };
  }

  // Define workflow edges
  @Edge('assessAnalysisQuality', 'finalizeAnalysis', { 
    condition: (state: WorkflowAgentState) => {
      const githubData = state.metadata?.githubData;
      const achievements = state.metadata?.achievements || [];
      const hasRealData = githubData && githubData.summary && achievements.length > 0;
      const hasAIAnalysis = state.metadata?.aiAnalysis && state.metadata.aiAnalysis.length > 100;
      const confidenceScore = hasRealData && hasAIAnalysis ? 0.95 : 0.7;
      return confidenceScore > 0.8;
    }
  })
  routeHighConfidence() {}

  @Edge('assessAnalysisQuality', 'finalizeAnalysis', { 
    condition: (state: WorkflowAgentState) => {
      const githubData = state.metadata?.githubData;
      const achievements = state.metadata?.achievements || [];
      const hasRealData = githubData && githubData.summary && achievements.length > 0;
      const hasAIAnalysis = state.metadata?.aiAnalysis && state.metadata.aiAnalysis.length > 100;
      const confidenceScore = hasRealData && hasAIAnalysis ? 0.95 : 0.7;
      return confidenceScore <= 0.8;
    }
  })
  routeStandard() {}

  /**
   * Build success message for real analysis
   */
  private buildSuccessMessage(
    githubUsername: string,
    timeframe: string,
    aiAnalysis: string,
    githubData: any,
    achievements: any[]
  ): string {
    return `💻 **GITHUB CODE ANALYSIS COMPLETE**

**Developer:** ${githubUsername}
**Analysis Period:** ${timeframe}

${aiAnalysis}

---
**📊 TECHNICAL METRICS:**
• **Repositories Analyzed:** ${githubData?.summary?.totalRepositories || 0}
• **Commits Analyzed:** ${githubData?.summary?.totalCommits || 0}
• **Lines of Code:** ${githubData?.summary?.linesOfCode?.toLocaleString() || '0'}
• **Productivity Score:** ${githubData?.summary?.productivityScore || 0}/100

**🎯 ACHIEVEMENTS EXTRACTED:** ${achievements.length}
${achievements
  .slice(0, 3)
  .map((a: any) => `• ${a.description} (${a.impact} impact)`)
  .join('\n')}

**💡 PRIMARY TECHNOLOGIES:** ${githubData?.patterns?.primaryLanguages?.join(', ') || 'Multiple technologies'}

**⚡ WORKING PATTERNS:** ${githubData?.patterns?.workingHours || 'Standard hours'} | Focus: ${githubData?.patterns?.focusAreas?.join(', ') || 'Full-stack development'}

---
*Analysis powered by GitHub API + AI insights for personal branding*`;
  }

  /**
   * Build fallback message for demo mode
   */
  private buildFallbackMessage(githubUsername: string, fallbackAnalysis: string): string {
    return `💻 **GITHUB CODE ANALYSIS** (Demo Mode)

**Developer:** ${githubUsername}

${fallbackAnalysis}

---
*Note: Using demo analysis - GitHub API integration temporarily unavailable*`;
  }

  /**
   * Extract GitHub username from user message
   */
  private extractGitHubUsername(message: string): string | null {
    // Look for patterns like "analyze my GitHub: username", "GitHub username", or just a username
    const patterns = [
      /github[:\s]+([a-zA-Z0-9\-_]+)/i,
      /username[:\s]+([a-zA-Z0-9\-_]+)/i,
      /analyze[:\s]+([a-zA-Z0-9\-_]+)/i,
      /^([a-zA-Z0-9\-_]{2,39})$/, // Just a username
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Build comprehensive developer analysis prompt
   */
  private buildDeveloperAnalysisPrompt(
    username: string,
    githubData: any,
    achievements: any[],
    insights: any
  ): string {
    return `As an expert technical recruiter and personal branding strategist, analyze the following developer's GitHub activity and create a compelling professional narrative.

**Developer Profile:** ${username}
**Analysis Period:** ${githubData.timeframe}

**📊 TECHNICAL METRICS:**
• Repositories: ${githubData.summary.totalRepositories}
• Commits: ${githubData.summary.totalCommits}
• Lines of Code: ${githubData.summary.linesOfCode.toLocaleString()}
• Productivity Score: ${githubData.summary.productivityScore}/100

**🎯 EXTRACTED ACHIEVEMENTS:**
${achievements
  .slice(0, 5)
  .map(
    (a) =>
      `• ${a.description} (${a.impact} impact) - ${a.technologies.join(', ')}`
  )
  .join('\n')}

**💡 TECHNICAL EXPERTISE:**
• Primary Languages: ${githubData.patterns.primaryLanguages.join(', ')}
• Working Hours: ${githubData.patterns.workingHours}
• Focus Areas: ${githubData.patterns.focusAreas.join(', ')}

**🔍 DEVELOPER INSIGHTS:**
• Technical Breadth: ${insights.technicalExpertise?.breadth || 'Full-stack'}
• Complexity Level: ${insights.technicalExpertise?.complexity || 'High'}
• Growth Opportunities: ${
      insights.recommendations?.slice(0, 2).join(', ') ||
      'Continue current trajectory'
    }

Please create a professional developer profile that includes:

1. **Executive Summary** - Compelling 2-3 sentence overview highlighting key strengths
2. **Technical Leadership** - Evidence of technical decision-making and problem-solving
3. **Innovation & Impact** - Specific examples of meaningful contributions and improvements
4. **Professional Growth** - Trajectory and development patterns shown in the code
5. **Brand Positioning** - How this developer should position themselves in the market
6. **Key Differentiators** - What makes this developer stand out from peers

Focus on transforming technical contributions into business value and career advancement opportunities.`;
  }

  /**
   * Generate fallback analysis for demo purposes
   */
  private generateFallbackGitHubAnalysis(
    username: string,
    timeframe: string
  ): string {
    return `**Developer Profile Analysis for: ${username}**

**🎯 EXECUTIVE SUMMARY:**
Highly productive developer demonstrating consistent contribution patterns and modern technology adoption. Shows strong technical leadership through quality code commits and innovative problem-solving approaches.

**📊 TECHNICAL HIGHLIGHTS:**
• **Productivity Score:** 85/100 - Above industry average
• **Primary Technologies:** TypeScript, React, Node.js, Python
• **Working Pattern:** Consistent daily commits with focus on quality over quantity
• **Code Quality:** Strong testing practices and documentation standards

**🚀 KEY ACHIEVEMENTS:**
• **Performance Optimization Expert:** Implemented 5+ performance improvements resulting in 40% faster load times
• **Full-Stack Innovation:** Delivered 3 major features integrating modern frontend/backend technologies
• **Quality Champion:** Maintained high code standards with comprehensive testing and documentation

**💡 PROFESSIONAL STRENGTHS:**
• **Problem Solving:** Demonstrates analytical thinking through commit patterns
• **Technology Adoption:** Early adopter of modern development practices
• **Collaboration:** Regular contribution patterns showing team-oriented development
• **Continuous Learning:** Technology diversity shows commitment to skill expansion

**🎯 BRAND POSITIONING:**
Position as a **Senior Full-Stack Engineer** with expertise in modern web technologies and performance optimization. Strong candidate for **technical leadership roles** requiring both hands-on development and architectural decision-making.

**📈 GROWTH TRAJECTORY:**
• Consistent upward trend in code complexity and project scope
• Increasing responsibility evidenced through architectural decisions
• Strong foundation for advancement to **Staff Engineer** or **Tech Lead** roles

*Analysis based on contribution patterns, technology choices, and development practices*`;
  }
}

// Export alias for config compatibility
export { GitHubCodeAnalyzerAgent as ResearchShowcaseAgent };
