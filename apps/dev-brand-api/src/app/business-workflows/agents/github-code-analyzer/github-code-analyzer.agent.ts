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
import { GitHubIntegrationTools } from '../../core/tools/github-integration.tools';
import { GitHubIntegrationError } from '../../core/errors/business-workflow.errors';
import { Validate, Required } from '../../core/validation/workflow.validators';
import { Optimize } from '../../core/performance/optimization.decorators';
import type {
  Achievement,
  GitHubData,
  DeveloperInsights,
} from '../shared/agent.types';
import {
  buildDeveloperAnalysisPrompt,
  generateFallbackAnalysis,
} from './github-code-analyzer.prompts';
import {
  extractGitHubUsername,
  buildSuccessMessage,
  buildFallbackMessage,
} from './github-code-analyzer.utils';

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
  type: 'workflow-agent',
  capabilities: [
    'code-analysis',
    'achievement-extraction',
    'developer-insights',
    'ai-synthesis',
  ],
  tools: [
    'github-analyzer',
    'achievement-extractor',
    'developer-insights',
    'ai-synthesis',
  ],
  priority: 'high',
  executionTime: 'fast',
  workflow: {
    name: 'github-analyzer-workflow',
    description:
      'AI-powered GitHub repository analysis and achievement extraction',
    streaming: true,
    confidenceThreshold: 0.8,
    metrics: true,
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 90000,
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: 'github-analyzer-workflow',
  },
})
@Injectable()
export class GitHubCodeAnalyzerAgent extends DeclarativeWorkflowBase<WorkflowAgentState> {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly githubTools: GitHubIntegrationTools,
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
   * Entry point for the internal GitHub analysis workflow
   * Initializes analysis and extracts GitHub username from input
   */
  @Entrypoint({ timeout: 15000 })
  @StreamProgress({ enabled: true, includeETA: true })
  async initializeGitHubAnalysis(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    console.log('💻 GitHub Code Analyzer: Starting developer analysis...');

    const lastMessage = state.messages[state.messages.length - 1];
    const messageContent = lastMessage.content.toString();

    const githubUsername =
      extractGitHubUsername(messageContent) ||
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
    cache: { ttl: 900000, maxSize: 100 },
    circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
    timeout: 90000,
    metrics: { trackExecutionTime: true, trackErrorRate: true },
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
    } catch (error: unknown) {
      console.error('❌ GitHub analysis failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode =
        (error as { status?: number; statusCode?: number }).status ||
        (error as { status?: number; statusCode?: number }).statusCode;

      const githubError = new GitHubIntegrationError(
        'analyzeGitHubActivity',
        githubUsername,
        errorMessage,
        statusCode,
        { timeframe, originalError: errorMessage }
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
  async extractAchievements(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubData = state.metadata?.githubData as GitHubData;

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
    } catch (error: unknown) {
      console.error('❌ Achievement extraction failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'achievement-extraction-error',
            achievements: [],
            error: errorMessage,
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
  async generateDeveloperInsights(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const githubData = state.metadata?.githubData as GitHubData;

    try {
      console.log('🔍 Generating developer insights...');
      const developerInsights =
        await this.githubTools.generateDeveloperInsights({
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
    } catch (error: unknown) {
      console.error('❌ Developer insights generation failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'insights-error',
            developerInsights: {
              technicalExpertise: { breadth: 'Full-stack', complexity: 'High' },
            },
            error: errorMessage,
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
  async synthesizeWithAI(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const githubData = state.metadata?.githubData as GitHubData;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];
    const developerInsights = state.metadata
      ?.developerInsights as DeveloperInsights;

    try {
      console.log('🚀 Synthesizing analysis with AI...');
      const analysisPrompt = buildDeveloperAnalysisPrompt(
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
    } catch (error: unknown) {
      console.error('❌ AI synthesis failed:', error);
      const fallbackAnalysis = generateFallbackAnalysis(
        githubUsername,
        state.metadata?.timeframe as string
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            currentStep: 'ai-synthesis-fallback',
            aiAnalysis: fallbackAnalysis,
            mode: 'fallback',
            error: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Assess analysis quality and confidence - decision point
   */
  @Node({ type: 'condition' })
  async assessAnalysisQuality(
    context: TaskExecutionContext
  ): Promise<{ route: string }> {
    const { state } = context;
    const githubData = state.metadata?.githubData as GitHubData | undefined;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];
    const hasRealData =
      githubData && githubData.summary && achievements.length > 0;
    const hasAIAnalysis =
      state.metadata?.aiAnalysis &&
      (state.metadata.aiAnalysis as string).length > 100;

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
  async finalizeAnalysis(
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const { state } = context;
    const githubUsername = state.metadata?.githubUsername as string;
    const timeframe = state.metadata?.timeframe as string;
    const githubData = state.metadata?.githubData as GitHubData;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];
    const aiAnalysis = (state.metadata?.aiAnalysis as string) || '';
    const mode = (state.metadata?.mode as string) || 'real';

    console.log('✅ GitHub Code Analyzer: Analysis completed with AI insights');

    const analysisMessage =
      mode === 'fallback'
        ? buildFallbackMessage(githubUsername, aiAnalysis)
        : buildSuccessMessage(
            githubUsername,
            timeframe,
            aiAnalysis,
            githubData,
            achievements
          );

    return {
      state: {
        ...state,
        messages: [new AIMessage(analysisMessage)],
        scratchpad: `GitHub analysis completed for: ${githubUsername}\nAchievements found: ${achievements.length}\nMode: ${mode}`,
        metadata: {
          ...state.metadata,
          currentStep: 'completed',
          githubAnalysisCompleted: true,
          workflowCompleted: true,
          analysisEndTime: new Date(),
          totalProcessingTime:
            Date.now() -
            ((state.metadata?.analysisStartTime as Date)?.getTime() ||
              Date.now()),
          toolsUsed: [
            'github-analyzer',
            'achievement-extractor',
            'developer-insights',
            'ai-synthesis',
          ],
          confidenceScore: mode === 'fallback' ? 0.7 : 0.95,
        },
        next: 'personal-brand-strategist',
        task: 'Develop personal brand strategy from code analysis',
      },
    };
  }

  /**
   * Define workflow edges
   */
  @Edge('assessAnalysisQuality', 'finalizeAnalysis')
  shouldProceedToFinalize(state: WorkflowAgentState): boolean {
    const githubData = state.metadata?.githubData as GitHubData | undefined;
    const achievements = (state.metadata?.achievements as Achievement[]) || [];
    const hasRealData =
      githubData && githubData.summary && achievements.length > 0;
    const hasAIAnalysis =
      state.metadata?.aiAnalysis &&
      (state.metadata.aiAnalysis as string).length > 100;
    const confidenceScore = hasRealData && hasAIAnalysis ? 0.95 : 0.7;
    return confidenceScore > 0.0; // Always proceed to finalize
  }
}

// Export alias for config compatibility
export { GitHubCodeAnalyzerAgent as ResearchShowcaseAgent };
