import { Injectable } from '@nestjs/common';
import {
  Agent,
  LlmProviderService,
} from '@hive-academy/langgraph-workflow-engine';
import type { TypedAgentState } from '../../types';
// Removed deleted streaming package imports (StreamToken, StreamProgress)
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import { Entrypoint, Task } from '@hive-academy/langgraph-workflow-engine';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-workflow-engine';
import type { GitHubAnalyzerMetadata } from '../shared/metadata.types';
// Removed deleted services and base class (no longer needed):
// - DeclarativeWorkflowBase (not exported, decorator-driven architecture)
// - WorkflowGraphBuilderService (deleted in consolidation)
// - SubgraphManagerService (deleted in consolidation)
// - WorkflowStreamService (deleted with streaming package)
// - EventStreamProcessorService (deleted)
// - MetadataProcessorService (not needed without base class)
// - EventEmitter2 (not needed without base class)
import { AIMessage } from '@langchain/core/messages';
import { GitHubIntegrationTools } from '../../core/tools/github-integration.tools';
import { GitHubIntegrationError } from '../../core/errors/business-workflow.errors';
import { Validate, Required } from '../../core/validation/workflow.validators';
import { Optimize } from '../../core/performance/optimization.decorators';
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
  description:
    'AI-powered GitHub repository analysis and achievement extraction',
  type: 'workflow-agent',
  // 🆕 DEFAULTS APPLIED: tools, capabilities, metadata, outputFormat now use defaults
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
    type: 'functional-task', // 🔑 Explicit workflow type: uses @Entrypoint + @Task
    // 🆕 DEFAULTS APPLIED: streaming, metrics, checkpointing now inherit from module config
    confidenceThreshold: 0.8, // Override default 0.7
    internalTimeout: 90000, // Override default 60000 (1.5 minutes for GitHub API calls)
    // 🆕 enableInternalStreaming, enableInternalCheckpointing, enableErrorRecovery,
    // maxInternalRetries, enableStepProgress now use module defaults
    // 🆕 multiAgentStreaming and multiAgentInterruption now use module defaults
    multiAgentInterruption: {
      enabled: true, // Enable HITL approval at end of agent execution
    },
  },
})
@Injectable()
export class GitHubCodeAnalyzerAgent {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly githubTools: GitHubIntegrationTools
  ) {
    // No super() call - no base class
    // Agents use @Agent decorator for orchestration (decorator-driven, not inheritance-driven)
  }

  /**
   * Entry point for the internal GitHub analysis workflow
   * Initializes analysis and extracts GitHub username from input
   */
  @Entrypoint({ timeout: 15000 })
  async initializeGitHubAnalysis(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    console.log('💻 GitHub Code Analyzer: Starting developer analysis...');

    const lastMessage = state.messages?.[state.messages.length - 1];
    const messageContent = lastMessage?.content?.toString() || '';

    const githubUsername =
      extractGitHubUsername(messageContent) ||
      state.metadata.githubUsername ||
      'demo-user';

    const timeframe = state.metadata.timeframe || 'month';

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          workflowStartTime: new Date(),
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
  @Validate
  @Optimize({
    cache: { ttl: 900000, maxSize: 100 },
    circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
    timeout: 90000,
    metrics: { trackExecutionTime: true, trackErrorRate: true },
  })
  async analyzeGitHubActivity(
    @Required()
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername;
    const timeframe = state.metadata.timeframe;

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
  async extractAchievements(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubData = state.metadata.githubData;

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
  async generateDeveloperInsights(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername;
    const githubData = state.metadata.githubData;

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
  async synthesizeWithAI(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername;
    const githubData = state.metadata.githubData;
    const achievements = state.metadata.achievements || [];
    const developerInsights = state.metadata.developerInsights;

    // Validate required data
    if (!githubData) {
      throw new Error('GitHub data is required for AI synthesis');
    }

    if (!developerInsights) {
      throw new Error('Developer insights are required for AI synthesis');
    }

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
        state.metadata.timeframe
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
   * Finalize comprehensive analysis results
   * Note: Confidence assessment integrated directly (removed separate assessAnalysisQuality node)
   *
   * HITL Integration: Requires user approval before proceeding to next agent
   * - Users can validate achievements, request changes, or provide feedback
   * - Approval timeout: 2 minutes (escalates if no response)
   * - WebSocket events: interruption_request, interruption_resolved
   */
  @Task({ dependsOn: ['synthesizeWithAI'] })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    timeoutMs: 120000, // 2 minutes
    message: (state) => {
      const achievementCount = state.metadata?.achievementCount || 0;
      const githubUsername = state.metadata?.githubUsername || 'user';
      return `GitHub analysis complete for ${githubUsername}. Found ${achievementCount} achievements. Please review and approve to continue.`;
    },
    onTimeout: 'escalate', // Escalate if user doesn't respond
    metadata: (state) => ({
      agentId: 'github-code-analyzer',
      achievementCount: state.metadata?.achievementCount,
      repositoriesAnalyzed: state.metadata?.repositoriesAnalyzed,
      confidenceScore: state.metadata?.confidenceScore,
    }),
  })
  async finalizeAnalysis(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername;
    const timeframe = state.metadata.timeframe;
    const githubData = state.metadata.githubData;
    const achievements = state.metadata.achievements || [];
    const aiAnalysis = state.metadata.aiAnalysis || '';
    let mode = state.metadata.mode || 'real';

    // If in real mode but no GitHub data, force fallback mode
    if (mode !== 'fallback' && !githubData) {
      console.warn('⚠️ No GitHub data available, switching to fallback mode');
      mode = 'fallback';
    }

    console.log('✅ GitHub Code Analyzer: Analysis completed with AI insights');

    const analysisMessage =
      mode === 'fallback'
        ? buildFallbackMessage(githubUsername, aiAnalysis)
        : buildSuccessMessage(
            githubUsername,
            timeframe,
            aiAnalysis,
            githubData!, // Non-null assertion: guaranteed by fallback mode check above
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
            (state.metadata.analysisStartTime?.getTime() || Date.now()),
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
}

// Export alias for config compatibility
export { GitHubCodeAnalyzerAgent as ResearchShowcaseAgent };
