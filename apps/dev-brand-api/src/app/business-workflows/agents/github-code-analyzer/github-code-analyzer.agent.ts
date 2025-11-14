import { Injectable } from '@nestjs/common';
import { Agent, Node, Edge } from '@hive-academy/langgraph-workflow-engine';
import type { TypedAgentState } from '../../types';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import type { GitHubAnalyzerMetadata } from '../shared/metadata.types';
import { AIMessage } from '@langchain/core/messages';
import {
  extractGitHubUsername,
  buildSuccessMessage,
  buildFallbackMessage,
} from './github-code-analyzer.utils';

/**
 * 💻 GITHUB CODE ANALYZER AGENT - LLM-DRIVEN AUTONOMOUS CODE ANALYSIS
 *
 * Demonstrates LLM-DRIVEN TOOL CALLING pattern for GitHub analysis:
 * ✅ Tools automatically bound to LLM via @Agent decorator
 * ✅ LLM autonomously orchestrates multi-tool analysis workflow
 * ✅ Single intelligent node handles entire analysis pipeline
 * ✅ Framework manages tool execution loop automatically
 * ✅ HITL approval before passing results to next agent
 *
 * Workflow Flow (LLM-Driven):
 * 1. analyzeGitHubProfile - Single @Node with type: 'llm'
 *    - LLM receives GitHub username + tool definitions
 *    - LLM autonomously calls tools in optimal sequence:
 *      a) github-analyzer → fetch repository data
 *      b) achievement-extractor → identify accomplishments
 *      c) developer-insights → assess expertise & patterns
 *      d) ai-synthesis → generate professional narrative
 *    - Framework executes each tool and returns results to LLM
 *    - LLM synthesizes final comprehensive analysis
 * 2. 🛑 INTERRUPT - Workflow pauses for user approval via @RequiresApproval
 * 3. finalizeAnalysis - Package results for next agent
 *
 * HITL Integration:
 * - @RequiresApproval decorator on finalizeAnalysis node
 * - User reviews GitHub analysis, achievements, insights
 * - Approves/rejects via WebSocket/API
 * - Workflow continues to personal-brand-strategist if approved
 *
 * KEY PATTERN DIFFERENCE:
 * ❌ OLD: Manual LLM prompting for each tool (still calling LLM manually)
 * ✅ NEW: LLM-driven tool orchestration via @Node({ type: 'llm' }) - fully autonomous
 */

@Agent({
  id: 'github-code-analyzer',
  name: 'GitHub Code Analyzer',
  description:
    'AI-powered GitHub repository analysis with autonomous tool orchestration for achievement extraction and developer insights',
  type: 'workflow-agent',
  tools: [
    'github-analyzer', // Fetch comprehensive repository data
    'achievement-extractor', // Extract meaningful accomplishments
    'developer-insights', // Assess technical expertise & patterns
    'ai-synthesis', // Generate professional narrative (optional - LLM can synthesize directly)
  ],
  capabilities: [
    'code-analysis',
    'achievement-extraction',
    'developer-insights',
    'ai-synthesis',
    'autonomous-tool-orchestration',
  ],
  priority: 'high',
  executionTime: 'fast',
  workflow: {
    name: 'github-analyzer-workflow',
    description:
      'LLM-driven autonomous GitHub analysis with multi-tool orchestration',
    type: 'functional-node',
    streaming: true,
    confidenceThreshold: 0.8,
    metrics: true,
  },
})
@Injectable()
export class GitHubCodeAnalyzerAgent {
  /**
   * 💻 AUTONOMOUS GITHUB ANALYSIS NODE - LLM-DRIVEN TOOL ORCHESTRATION
   *
   * This node demonstrates advanced LLM-driven tool orchestration:
   * - @Node({ type: 'llm' }) automatically binds ALL 4 tools to LLM
   * - LLM receives intelligent prompt guiding tool usage sequence
   * - LLM autonomously decides tool call order and parameters
   * - Framework handles execution loop (node → tools → node)
   * - LLM synthesizes final analysis from all tool results
   *
   * TOOL ORCHESTRATION INTELLIGENCE:
   * - github-analyzer FIRST → get raw repository data
   * - achievement-extractor → analyze commits for accomplishments
   * - developer-insights → assess expertise from patterns
   * - ai-synthesis (optional) → LLM can synthesize directly or use tool
   *
   * FRAMEWORK BEHAVIOR:
   * 1. LLM analyzes username, decides to call github-analyzer
   * 2. Framework detects tool_calls → routes to ToolNode
   * 3. ToolNode executes github-analyzer, returns repo data
   * 4. Framework routes back with results
   * 5. LLM processes data, decides to call achievement-extractor
   * 6. Loop continues through all tools
   * 7. LLM generates final comprehensive analysis
   * 8. No more tool_calls → node completes
   */
  @Node({ type: 'llm' }) // 🔑 This triggers automatic tool binding!
  async analyzeGitHubProfile(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): Promise<Partial<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const lastMessage = state.messages?.[state.messages.length - 1];
    const messageContent = lastMessage?.content?.toString() || '';

    const githubUsername =
      extractGitHubUsername(messageContent) ||
      state.metadata.githubUsername ||
      'demo-user';

    const timeframe = state.metadata.timeframe || 'month';

    console.log(
      `💻 Starting autonomous GitHub analysis for: ${githubUsername}`
    );

    // Build intelligent system prompt that guides LLM through tool orchestration
    const analysisSystemPrompt = `You are an AI-powered GitHub code analyzer with autonomous tool orchestration capabilities.

TARGET: GitHub user "${githubUsername}"
TIMEFRAME: ${timeframe}
GOAL: Generate comprehensive professional developer analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE TOOLS & ORCHESTRATION STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **github-analyzer** - Fetch comprehensive GitHub data
   ✅ CALL FIRST - This is your data source
   📊 Returns: repositories, commits, PRs, languages, activity metrics
   📌 Parameters:
   - username: "${githubUsername}"
   - timeframe: "${timeframe}"
   - includePrivate: false
   - detailed: true

2. **achievement-extractor** - Extract meaningful accomplishments
   ✅ CALL SECOND - After you have GitHub data
   🏆 Analyzes: commits, repos, contributions for achievements
   📌 Parameters:
   - commits: <array from github-analyzer>
   - repositories: <array from github-analyzer>
   - analysisDepth: "detailed"
   - focusAreas: ["technical", "collaboration", "innovation"]

3. **developer-insights** - Assess technical expertise & patterns
   ✅ CALL THIRD - After you have achievements
   🔍 Analyzes: expertise breadth/depth, work patterns, tech proficiency
   📌 Parameters:
   - githubData: <object from github-analyzer>
   - achievements: <array from achievement-extractor>
   - profileDepth: "comprehensive"

4. **ai-synthesis** - Generate professional narrative (OPTIONAL)
   💡 You can use this tool OR synthesize directly yourself
   📝 Generates: compelling professional developer profile
   📌 Parameters:
   - developerData: <combined data from all tools>
   - targetAudience: "professional" (LinkedIn, portfolio, recruiters)
   - tone: "confident and achievement-focused"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTELLIGENT ORCHESTRATION WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: FETCH GITHUB DATA
- Call github-analyzer with username and timeframe
- Wait for comprehensive repository data
- Verify data quality (check for errors, empty results)

STEP 2: EXTRACT ACHIEVEMENTS
- Use results from github-analyzer
- Call achievement-extractor with commits and repositories
- Identify technical accomplishments, code quality, collaboration

STEP 3: GENERATE INSIGHTS
- Use GitHub data + achievements
- Call developer-insights for expertise assessment
- Analyze technical breadth, work patterns, career trajectory

STEP 4: SYNTHESIZE FINAL ANALYSIS
- Option A: Call ai-synthesis tool for professional narrative
- Option B: Synthesize directly using all gathered data
- Create comprehensive professional developer profile

STEP 5: FINALIZE
- Package results with confidence score
- Include: GitHub data, achievements, insights, narrative
- Return complete analysis ready for personal brand strategist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your final response must include:

**1. PROFESSIONAL SUMMARY** (2-3 paragraphs)
- Highlight strongest technical accomplishments
- Emphasize unique value propositions
- Focus on impact and expertise

**2. TECHNICAL EXPERTISE** (categorized)
- Primary languages/frameworks (with proficiency levels)
- Technical breadth (frontend/backend/full-stack)
- Complexity level (junior/mid/senior/expert)

**3. KEY ACHIEVEMENTS** (5-10 items)
- Specific accomplishments with context
- Technical innovations and contributions
- Code quality and collaboration highlights

**4. WORK PATTERNS & INSIGHTS**
- Commit frequency and consistency
- Collaboration style (PR reviews, mentoring)
- Growth trajectory and specialization

**5. CAREER POSITIONING**
- Strategic recommendations for personal branding
- Suggested positioning for target roles
- Actionable next steps for skill development

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now analyze "${githubUsername}" by autonomously orchestrating the tools in the recommended sequence.
Begin with github-analyzer to fetch comprehensive data!`;

    // For @Node({ type: 'llm' }), the framework handles everything
    // We just store metadata for tracking
    return {
      metadata: {
        ...state.metadata,
        workflowStartTime: new Date(),
        currentStep: 'initialization', // Use existing type instead of new 'autonomous-analysis'
        githubUsername,
        timeframe,
        analysisStartTime: new Date(),
        workflowInstanceId: `github-${githubUsername}-${Date.now()}`,
        systemPrompt: analysisSystemPrompt, // Store for reference
        // ✅ NEW: Emit custom progress at start
        customProgress: {
          agent: 'github-code-analyzer',
          stage: 'fetching-repos',
          message: `Fetching repositories for ${githubUsername}...`,
          percentage: 10,
        },
      },
    };
  }

  /**
   * FINALIZE ANALYSIS - Package results and trigger HITL approval
   *
   * After LLM completes tool orchestration, this node:
   * - Extracts analysis from messages
   * - Calculates confidence score
   * - Packages results for next agent
   * - Triggers HITL approval (@RequiresApproval)
   */
  @Node({ type: 'standard' })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    timeoutMs: 120000, // 2 minutes
    message: (state) => {
      const githubUsername = state.metadata?.githubUsername || 'user';
      return `GitHub analysis complete for ${githubUsername}. Please review achievements and insights before continuing to brand strategy.`;
    },
    onTimeout: 'escalate',
    metadata: (state) => ({
      agentId: 'github-code-analyzer',
      githubUsername: state.metadata?.githubUsername,
      confidenceScore: state.metadata?.confidenceScore,
    }),
  })
  async finalizeAnalysis(
    state: TypedAgentState<GitHubAnalyzerMetadata>
  ): Promise<Partial<TypedAgentState<GitHubAnalyzerMetadata>>> {
    const githubUsername = state.metadata.githubUsername || 'demo-user';
    const timeframe = state.metadata.timeframe || 'month';
    let mode = state.metadata.mode || 'real';

    console.log(`✅ Finalizing GitHub analysis for ${githubUsername}`);

    // Extract analysis from messages
    // The LLM's final synthesis should be in the last message
    let aiAnalysis = '';
    let githubData = state.metadata.githubData;
    let achievements = state.metadata.achievements || [];

    if (state.messages && state.messages.length > 0) {
      // Find tool messages to extract data
      const toolMessages = state.messages.filter(
        (msg: any) => msg.role === 'tool'
      );

      // Extract GitHub data from github-analyzer tool result
      const githubAnalyzerMsg = toolMessages.find(
        (msg: any) =>
          msg.name === 'github-analyzer' || msg.content?.includes('summary')
      );
      if (githubAnalyzerMsg && !githubData) {
        try {
          const toolResult =
            typeof githubAnalyzerMsg.content === 'string'
              ? JSON.parse(githubAnalyzerMsg.content)
              : githubAnalyzerMsg.content;
          githubData = toolResult;
        } catch (parseError) {
          console.warn('Could not parse github-analyzer result');
        }
      }

      // Extract achievements from achievement-extractor tool result
      const achievementMsg = toolMessages.find(
        (msg: any) => msg.name === 'achievement-extractor'
      );
      if (achievementMsg && achievements.length === 0) {
        try {
          const toolResult =
            typeof achievementMsg.content === 'string'
              ? JSON.parse(achievementMsg.content)
              : achievementMsg.content;
          achievements = toolResult.achievements || toolResult.items || [];
        } catch (parseError) {
          console.warn('Could not parse achievement-extractor result');
        }
      }

      // Get final LLM analysis from last assistant message
      const assistantMessages = state.messages.filter(
        (msg: any) => msg.role === 'assistant'
      );
      if (assistantMessages.length > 0) {
        const lastAssistantMsg =
          assistantMessages[assistantMessages.length - 1];
        aiAnalysis = lastAssistantMsg.content?.toString() || '';
      }
    }

    // If in real mode but no GitHub data, force fallback mode
    if (mode !== 'fallback' && !githubData) {
      console.warn('⚠️ No GitHub data available, switching to fallback mode');
      mode = 'fallback';
    }

    const analysisMessage =
      mode === 'fallback'
        ? buildFallbackMessage(githubUsername, aiAnalysis)
        : buildSuccessMessage(
            githubUsername,
            timeframe,
            aiAnalysis,
            githubData!,
            achievements
          );

    const confidenceScore = mode === 'fallback' ? 0.7 : 0.95;

    return {
      messages: [new AIMessage(analysisMessage)],
      scratchpad: `GitHub analysis completed for: ${githubUsername}\nAchievements found: ${achievements.length}\nMode: ${mode}\nConfidence: ${confidenceScore}`,
      metadata: {
        ...state.metadata,
        currentStep: 'completed',
        githubAnalysisCompleted: true,
        workflowCompleted: true,
        analysisEndTime: new Date(),
        totalProcessingTime:
          Date.now() -
          (state.metadata.analysisStartTime?.getTime() || Date.now()),
        githubData,
        achievements,
        aiAnalysis,
        mode,
        confidenceScore,
        toolsUsed: [
          'github-analyzer',
          'achievement-extractor',
          'developer-insights',
          'ai-synthesis',
        ],
        // ✅ NEW: Emit completion progress
        customProgress: {
          agent: 'github-code-analyzer',
          stage: 'completed',
          message: `Analysis complete for ${githubUsername}: ${achievements.length} achievements found`,
          percentage: 100,
        },
      },
      next: 'personal-brand-strategist',
      task: 'Develop personal brand strategy from code analysis',
    };
  }

  /**
   * EDGES - Define workflow flow
   */

  /**
   * After analysis completes, finalize results (with HITL approval)
   */
  @Edge('analyzeGitHubProfile', 'finalizeAnalysis')
  analysisToFinalize(): boolean {
    return true;
  }

  /**
   * After finalization (and approval), end workflow
   */
  @Edge('finalizeAnalysis', '__end__')
  complete(): boolean {
    return true;
  }
}
