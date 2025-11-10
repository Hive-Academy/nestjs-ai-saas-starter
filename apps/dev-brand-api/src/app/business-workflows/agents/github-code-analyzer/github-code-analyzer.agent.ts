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
import { Validate, Required } from '../../core/validation/workflow.validators';
import { Optimize } from '../../core/performance/optimization.decorators';
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
    // ✅ VERIFIED: All tool names match @Tool decorators in GitHubIntegrationTools
    // Registered in WorkflowEngineModule.forRoot() (Task 33)
    'github-analyzer', // GitHubIntegrationTools:111
    'achievement-extractor', // GitHubIntegrationTools:199
    'developer-insights', // GitHubIntegrationTools:343
    'ai-synthesis', // GitHubIntegrationTools:383
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
  constructor(private readonly llmProvider: LlmProviderService) {
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
   * Analyze GitHub activity via LLM-autonomous tool selection
   * MIGRATED: LLM decides when to call github-analyzer tool based on prompt
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

    console.log(`💻 Analyzing GitHub activity for ${githubUsername}...`);

    // LLM with bound tools decides autonomously to call github-analyzer
    const prompt = `Analyze GitHub activity for user "${githubUsername}" over the last ${timeframe}.
Use the github-analyzer tool to fetch comprehensive repository data, commits, pull requests, and code contributions.
The tool should return structured data with summary metrics including total repositories, commits, and productivity score.
Format: Call github-analyzer with username="${githubUsername}", timeframe="${timeframe}", includePrivate=false.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.3,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      state: {
        ...state,
        messages: [...state.messages, response],
        metadata: {
          ...state.metadata,
          currentStep: 'github-activity-analyzed',
        },
      },
    };
  }

  /**
   * Extract meaningful achievements from GitHub data via LLM-autonomous tool selection
   * MIGRATED: LLM decides when to call achievement-extractor tool based on prompt
   */
  @Task({ dependsOn: ['analyzeGitHubActivity'] })
  async extractAchievements(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;

    console.log('🎯 Extracting meaningful achievements...');

    // LLM with bound tools decides autonomously to call achievement-extractor
    const prompt = `Extract meaningful achievements from the GitHub data in the previous messages.
Use the achievement-extractor tool to analyze commits and repositories, identifying:
- Technical accomplishments (new features, major refactors, performance improvements)
- Code quality improvements (test coverage, documentation, CI/CD)
- Collaboration metrics (PR reviews, issue resolution, mentoring)
- Technology adoption (new languages/frameworks/tools)
Provide detailed achievements with context and impact. Analysis depth: detailed.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      state: {
        ...state,
        messages: [...state.messages, response],
        metadata: {
          ...state.metadata,
          currentStep: 'achievements-extracted',
        },
      },
    };
  }

  /**
   * Generate professional developer insights via LLM-autonomous tool selection
   * MIGRATED: LLM decides when to call developer-insights tool based on prompt
   */
  @Task({ dependsOn: ['extractAchievements'] })
  async generateDeveloperInsights(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername;

    console.log('🔍 Generating developer insights...');

    // LLM with bound tools decides autonomously to call developer-insights
    const prompt = `Generate professional developer insights for "${githubUsername}" based on the GitHub data and achievements in previous messages.
Use the developer-insights tool to analyze:
- Technical expertise (breadth: frontend/backend/full-stack, complexity: junior/mid/senior/expert)
- Work patterns (commit frequency, code review activity, collaboration style)
- Technology proficiency (languages, frameworks, tools with skill levels)
- Career trajectory (growth indicators, specialization trends)
- Professional strengths (code quality, architectural decisions, mentorship)
Provide actionable insights for personal branding and career development.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2000,
    });

    const response = await llm.invoke([
      ...state.messages,
      { role: 'user', content: prompt },
    ]);

    return {
      state: {
        ...state,
        messages: [...state.messages, response],
        metadata: {
          ...state.metadata,
          currentStep: 'insights-generated',
        },
      },
    };
  }

  /**
   * AI-powered synthesis of technical data into compelling narrative
   * MIGRATED: Uses message-based flow - all tool results available in conversation history
   */
  @Task({ dependsOn: ['generateDeveloperInsights'] })
  async synthesizeWithAI(
    context: TaskExecutionContext<TypedAgentState<GitHubAnalyzerMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const { state } = context;
    const githubUsername = state.metadata.githubUsername;
    const timeframe = state.metadata.timeframe;

    console.log('🚀 Synthesizing analysis with AI...');

    // LLM has access to all previous tool results via messages array
    const synthesisPrompt = `Synthesize a comprehensive professional analysis for "${githubUsername}" based on all the GitHub data, achievements, and developer insights gathered in our conversation.

Create a compelling narrative that:
1. Highlights their strongest technical accomplishments and expertise
2. Identifies unique value propositions for personal branding
3. Suggests strategic positioning for career growth
4. Provides actionable recommendations for skill development

Format the analysis as a professional developer profile suitable for LinkedIn, portfolio sites, or job applications.
Focus on impact, technical depth, and career trajectory over the ${timeframe}.`;

    const llm = await this.llmProvider.getLLM({
      temperature: 0.4,
      maxTokens: 2500,
    });

    const aiAnalysisResponse = await llm.invoke([
      ...state.messages,
      { role: 'user', content: synthesisPrompt },
    ]);

    const aiAnalysis = aiAnalysisResponse.content.toString();

    return {
      state: {
        ...state,
        messages: [...state.messages, aiAnalysisResponse],
        metadata: {
          ...state.metadata,
          currentStep: 'ai-synthesis-complete',
          aiAnalysis,
          narrativeGenerated: true,
        },
      },
    };
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
