import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  Entrypoint,
  LLMTask,
  Task,
  WorkflowExecutionService,
  type TaskExecutionContext,
  type TaskExecutionResult,
  StreamEventParser,
  StreamEventTransformer,
} from '@hive-academy/langgraph-workflow-engine';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import { AIMessage } from '@langchain/core/messages';
import { FileOperationTools } from '../core/tools/file-operation.tools';
import type { TypedAgentState } from '../types';
import type { ResearcherMetadata } from './shared/metadata.types';

/**
 * 🔬 RESEARCHER AGENT - AUTONOMOUS WEB RESEARCH & REPORT GENERATION
 *
 * **Pattern**: Functional-Task with @LLMTask Decorator
 *
 * Demonstrates modern @LLMTask pattern for LLM-driven autonomous tool calling:
 * ✅ @LLMTask enables LLM autonomous tool selection (web-search vs research-search)
 * ✅ Task-specific tool routing (tools_conductAutonomousResearch loops back to task)
 * ✅ Framework handles tool execution loop automatically
 * ✅ Cost-optimized research (simple queries use web-search, complex use research-search)
 * ✅ Human-in-the-loop (HITL) for report approval via @RequiresApproval
 * ✅ Real web research using Tavily API
 * ✅ Local report storage as markdown files
 *
 * **Workflow Flow** (Task-Based Pattern):
 * ```
 * initializeResearch (Entrypoint)
 *         ↓
 * conductAutonomousResearch (@LLMTask)
 *         ↔ tools_conductAutonomousResearch (automatic tool loop)
 *         ↓
 * saveApprovedReport (@Task + @RequiresApproval)
 *         ↓
 *       END
 * ```
 *
 * **LLM Tool Selection Intelligence**:
 * - Simple queries ("What is React?") → LLM uses web-search (fast, cheap)
 * - Complex queries ("Quantum computing in drug discovery") → LLM uses research-search (comprehensive)
 * - When sufficient info gathered → LLM calls create-report to finalize
 *
 * **HITL Integration**:
 * - @RequiresApproval decorator on saveApprovedReport
 * - Workflow pauses after research completes for user approval
 * - User reviews draft in UI modal
 * - Approves/rejects via API endpoint
 * - Workflow resumes with decision to save or reject
 *
 * **Key Pattern Difference**:
 * ❌ OLD (@Node/@Edge): Manual edge definitions, explicit routing logic
 * ✅ NEW (@LLMTask): Automatic task dependencies, task-specific tool loops
 */

@Agent({
  description:
    'Autonomous research agent with LLM-driven tool selection for intelligent, cost-optimized research and report generation',
  type: 'workflow-agent',
  capabilities: [
    'web-research',
    'report-generation',
    'academic-search',
    'content-synthesis',
    'intelligent-tool-selection',
  ],
  priority: 'high',
  executionTime: 'slow',
  outputFormat: 'markdown',
  workflow: {
    name: 'researcher-workflow',
    description:
      'LLM-driven autonomous research with intelligent tool selection',
    type: 'functional-task', // 🔑 Changed from functional-node to functional-task for @LLMTask pattern
    streaming: true,
    confidenceThreshold: 0.7,
    metrics: true,
  },
})
@Injectable()
export class ResearcherAgent {
  private readonly logger = new Logger(ResearcherAgent.name);

  constructor(
    private readonly fileTools: FileOperationTools,
    private readonly workflowExecutionService: WorkflowExecutionService
  ) {}

  /**
   * TASK 1: Initialize Research Context
   * - Sets up initial state
   * - Logs research query
   * - Prepares metadata for research workflow
   */
  @Entrypoint({ timeout: 5000 })
  async initializeResearch(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    const query = state.metadata.query;
    const researchDepth = state.metadata.researchDepth || 'detailed';
    const userId = state.metadata.userId;

    this.logger.log(
      `🔬 Initializing research: "${query}" (depth: ${researchDepth}, user: ${userId})`
    );

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          workflowStartTime: new Date(),
          currentStep: 'initialized',
          researchStarted: true,
        },
      },
    };
  }

  /**
   * TASK 2: AUTONOMOUS RESEARCH - LLM-DRIVEN TOOL CALLING
   *
   * This task demonstrates the @LLMTask pattern for autonomous tool calling:
   * - @LLMTask automatically binds tools to LLM
   * - LLM receives intelligent prompting to guide tool selection
   * - Framework handles tool execution loop (task → tools_conductAutonomousResearch → task)
   * - LLM autonomously decides when research is complete
   *
   * TOOL SELECTION INTELLIGENCE:
   * - Simple queries ("What is React?") → LLM uses web-search (fast, cheap)
   * - Complex queries ("Quantum computing in drug discovery") → LLM uses research-search (comprehensive)
   * - When sufficient info gathered → LLM calls create-report to finalize
   *
   * FRAMEWORK BEHAVIOR:
   * 1. LLM analyzes query, decides to call tool (e.g., research-search)
   * 2. Framework detects tool_calls in message → routes to tools_conductAutonomousResearch
   * 3. ToolNode executes tool, appends result to messages
   * 4. Framework routes back to this task with tool results
   * 5. LLM processes results, decides: more tools OR create-report
   * 6. Loop continues until LLM calls create-report (no more tool_calls)
   * 7. Task completes → workflow continues to saveApprovedReport
   *
   * **Tools Available**:
   * - web-search: Quick search for 2-5 sources (fast, cost-effective)
   * - research-search: Comprehensive search for 5-10+ sources (academic, in-depth)
   * - create-report: Generate markdown report from research findings
   */
  @LLMTask({
    description: 'Conduct autonomous research with LLM tool selection',
    tools: ['web-search', 'research-search', 'create-report'],
    maxToolIterations: 10,
    toolTimeout: 30000,
    dependsOn: ['initializeResearch'],
  })
  async conductAutonomousResearch(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    const query = state.metadata.query;
    const researchDepth = state.metadata.researchDepth || 'detailed';
    const userId = state.metadata.userId;

    this.logger.log(
      `🔬 Conducting autonomous research with LLM tool calling: "${query}"`
    );

    // Build intelligent system prompt that guides LLM tool selection
    const researchSystemPrompt = `You are an autonomous research agent with intelligent tool selection capabilities.

RESEARCH QUERY: "${query}"
RESEARCH DEPTH: ${researchDepth}
USER ID: ${userId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE TOOLS & INTELLIGENT SELECTION STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **web-search** - Quick web search (2-5 sources, ~$0.01, <10s)
   ✅ USE WHEN:
   - Simple factual queries ("What is X?", "Who is Y?", "Define Z")
   - Well-known topics requiring quick facts
   - User specified researchDepth: "summary"
   - Budget-conscious research

   📌 EXAMPLES:
   - "What is React?"
   - "Who founded Tesla?"
   - "Define machine learning"
   - "Latest news about OpenAI"

2. **research-search** - Comprehensive research (5-10+ sources, academic, ~$0.05, <30s)
   ✅ USE WHEN:
   - Complex technical topics requiring depth
   - Academic or scientific research
   - Comparative analysis needed
   - User specified researchDepth: "detailed" or "comprehensive"
   - Topic requires multiple perspectives

   📌 EXAMPLES:
   - "Analyze quantum computing applications in drug discovery"
   - "Compare GraphQL vs REST for microservices"
   - "Latest AI safety research papers"
   - "How does CRISPR gene editing work?"

3. **create-report** - Generate professional markdown report
   ✅ USE WHEN:
   - Sufficient research data collected
   - Ready to compile findings into final report
   - This should be your FINAL tool call

   📝 REQUIRED PARAMETERS:
   - title: Professional report title based on research topic
   - content: Comprehensive markdown report with:
     * Executive Summary (2-3 paragraphs)
     * Introduction (context, objectives)
     * Key Findings (organized by themes, include citations)
     * Analysis & Insights (synthesis, implications)
     * Conclusions (summary, recommendations)
     * References (numbered list with URLs from sources)

   📌 METADATA OBJECT:
   Pass all relevant metadata for report tracking:
   {
     userId: "${userId}",
     query: "${query}",
     researchDepth: "${researchDepth}",
     totalSources: <number of sources used>,
     createdAt: <ISO timestamp>,
     researchTopic: <extracted topic>,
     researchScope: <scope description>
   }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTELLIGENT RESEARCH WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: ANALYZE QUERY COMPLEXITY
- Assess if query is simple/factual OR complex/analytical
- Consider user's specified research depth: "${researchDepth}"
- Determine optimal tool: web-search (fast) vs research-search (comprehensive)

STEP 2: EXECUTE INITIAL RESEARCH
- Call selected tool with appropriate parameters
- For web-search: maxResults: 3-5, searchDepth: 'basic'
- For research-search: includeAcademic: true, minSources: 5-10, analysisDepth: '${researchDepth}'

STEP 3: EVALUATE RESULTS & DECIDE NEXT ACTION
- Assess if research is sufficient for comprehensive report
- If gaps exist: Call additional tools with refined queries
- If comprehensive: Proceed to create-report

STEP 4: GENERATE FINAL REPORT
- When research is complete, call create-report with:
  * Professional title derived from query
  * Well-structured markdown content (follow format above)
  * All metadata fields populated
- This MUST be your FINAL tool call

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST OPTIMIZATION GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  researchDepth === 'summary'
    ? '⚡ SUMMARY MODE: Prefer web-search for speed and cost efficiency'
    : ''
}
${
  researchDepth === 'detailed'
    ? '🔍 DETAILED MODE: Analyze query, then choose optimal tool'
    : ''
}
${
  researchDepth === 'comprehensive'
    ? '📚 COMPREHENSIVE MODE: Use research-search for maximum depth'
    : ''
}

IMPORTANT: Balance thoroughness with cost. Don't use research-search for simple queries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now analyze the query and autonomously execute research using the most appropriate tools.
Remember: Call create-report LAST when research is complete!`;

    // For @LLMTask, the framework automatically:
    // 1. Binds tools (web-search, research-search, create-report) to LLM
    // 2. Invokes LLM with state.messages + system prompt
    // 3. Detects tool_calls in LLM response
    // 4. Routes to tools_conductAutonomousResearch if tool_calls present
    // 5. Executes tools and appends results to messages
    // 6. Loops back to this task with tool results
    // 7. Continues until no tool_calls (research complete)
    // 8. Proceeds to next task (saveApprovedReport)

    this.logger.log('LLM will autonomously select and call research tools');

    // ✅ NEW: Return state with custom progress
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          currentStep: 'autonomous-research',
          customProgress: {
            agent: 'researcher-agent',
            stage: 'llm-tool-selection',
            message: `Analyzing query: "${query.substring(0, 50)}${
              query.length > 50 ? '...' : ''
            }"`,
            percentage: 25,
          },
        },
        messages: [
          ...state.messages,
          new AIMessage({
            content: researchSystemPrompt,
            additional_kwargs: {
              llmTaskId: 'conductAutonomousResearch',
            },
          }),
        ],
      },
    };
  }

  /**
   * TASK 3: SAVE APPROVED REPORT - Human-in-the-Loop Approval Gate
   *
   * Uses @RequiresApproval decorator for human-in-the-loop approval.
   * Workflow pauses before saving, allowing user to review report draft.
   * If approved, report is saved. If rejected, workflow ends without saving.
   *
   * @RequiresApproval integration:
   * - Workflow automatically pauses before this task executes
   * - User sees approval modal with report draft
   * - User approves/rejects via API endpoint
   * - Workflow resumes with user's decision
   */
  @Task({ dependsOn: ['conductAutonomousResearch'] })
  @RequiresApproval({
    message: (state) =>
      `Research report draft ready for review: "${
        state.metadata?.reportTitle || 'Untitled'
      }"`,
    timeoutMs: 180000, // 3 minutes
    onTimeout: 'approve', // Auto-approve if timeout (proceed with save)
    metadata: (state) => ({
      approvalType: 'report-draft-review',
      reportTitle: state.metadata?.reportTitle,
      query: state.metadata?.query,
      researchDepth: state.metadata?.researchDepth,
    }),
  })
  async saveApprovedReport(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    this.logger.log(
      `💾 Saving approved report: "${state.metadata.reportTitle || 'Untitled'}"`
    );

    // ✅ NEW: Emit custom progress at start
    const stateWithProgress = {
      ...state,
      metadata: {
        ...state.metadata,
        customProgress: {
          agent: 'researcher-agent',
          stage: 'saving-report',
          message: 'Saving approved research report...',
          percentage: 90,
        },
      },
    };

    try {
      // Extract report content from messages
      // The create-report tool call result should be in messages
      let reportContent = state.metadata.reportDraft || '';
      let reportTitle =
        state.metadata.reportTitle ||
        `Research Report: ${state.metadata.query}`;

      // If reportDraft not in metadata, try to extract from messages
      if (
        !reportContent &&
        stateWithProgress.messages &&
        stateWithProgress.messages.length > 0
      ) {
        // Find the last tool message (from create-report)
        const toolMessages = stateWithProgress.messages.filter(
          (msg: any) => msg.role === 'tool'
        );
        if (toolMessages.length > 0) {
          const lastToolMsg = toolMessages[toolMessages.length - 1];
          try {
            const toolResult =
              typeof lastToolMsg.content === 'string'
                ? JSON.parse(lastToolMsg.content)
                : lastToolMsg.content;

            if (toolResult.content) {
              reportContent = toolResult.content;
            }
            if (toolResult.title) {
              reportTitle = toolResult.title;
            }
          } catch (parseError) {
            this.logger.warn('Could not parse tool message content');
          }
        }
      }

      if (!reportContent) {
        throw new Error('No report content found in state');
      }

      // Create new report file using FileOperationTools
      const createResult = await this.fileTools.createReport({
        title: reportTitle,
        content: reportContent,
        metadata: {
          userId: stateWithProgress.metadata.userId,
          query: stateWithProgress.metadata.query,
          researchTopic:
            stateWithProgress.metadata.researchTopic ||
            stateWithProgress.metadata.query,
          researchScope: stateWithProgress.metadata.researchScope || 'general',
          researchDepth: stateWithProgress.metadata.researchDepth || 'detailed',
          totalSources: stateWithProgress.metadata.totalSources || 0,
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvalFeedback: stateWithProgress.metadata.approvalFeedback,
        },
      });

      if (!createResult.success) {
        throw new Error(createResult.error || 'Unknown save error');
      }

      this.logger.log(`✅ Report saved: ${createResult.filename}`);

      // ✅ NEW: Return with completion progress
      return {
        state: {
          ...stateWithProgress,
          metadata: {
            ...stateWithProgress.metadata,
            savedReportPath: createResult.filepath,
            savedReportFilename: createResult.filename,
            finalReport: `Report successfully saved to: ${createResult.filename}`,
            customProgress: {
              agent: 'researcher-agent',
              stage: 'completed',
              message: `Report saved: ${createResult.filename}`,
              percentage: 100,
            },
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Report save failed:`, error.message);
      return {
        state: {
          ...stateWithProgress,
          metadata: {
            ...stateWithProgress.metadata,
            finalReport: 'Failed to save report',
            error: `Save failed: ${error.message}`,
            customProgress: {
              agent: 'researcher-agent',
              stage: 'error',
              message: `Save failed: ${error.message}`,
              percentage: 0,
            },
          },
        },
        error: error as Error,
      };
    }
  }

  /**
   * Execute with streaming support (following DevBrand POC pattern)
   *
   * ✅ UPDATED: Now uses StreamEventParser and StreamEventTransformer for robust stream handling
   *
   * Returns an async iterator for real-time streaming of research workflow events.
   * Uses WorkflowExecutionService.streamWorkflow() for LangGraph native streaming.
   *
   * @param input - Research input with userId and query
   * @yields StreamEvent objects with workflow state updates
   */
  async *executeWithStreaming(input: {
    userId: string;
    query: string;
    researchDepth?: 'summary' | 'detailed' | 'comprehensive';
    executionId?: string;
  }): AsyncGenerator<
    | {
        type: 'workflow-update';
        executionId: string;
        nodeName: string;
        state: TypedAgentState<ResearcherMetadata>;
        timestamp: string;
      }
    | {
        type: 'tool-execution';
        executionId: string;
        toolData: any;
        timestamp: string;
      },
    void,
    unknown
  > {
    const executionId = input.executionId || `research-${Date.now()}`;

    this.logger.log(
      `Starting streaming research for query: "${input.query}" (execution: ${executionId})`
    );

    // Build initial state
    const initialState: any = {
      messages: [], // Required by WorkflowState
      metadata: {
        userId: input.userId,
        query: input.query.trim(),
        researchDepth: input.researchDepth || 'detailed',
        userApproval: 'pending',
        searchResults: [],
        totalSources: 0,
      },
    };

    // Stream via WorkflowExecutionService
    // 🔑 Use multiple modes for comprehensive streaming:
    // - 'updates': Node-level state changes + tool execution events
    // - 'messages': LLM token streaming for real-time response display
    // - 'custom': Custom progress events from tasks
    const stream = this.workflowExecutionService.streamWorkflow(
      ResearcherAgent,
      initialState,
      {
        configurable: { thread_id: executionId },
        streamMode: ['updates', 'messages', 'custom'], // ✅ Add messages + custom modes
      }
    );

    // ✅ NEW: Use StreamEventParser and StreamEventTransformer for robust parsing
    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    // Parse and transform stream events
    for await (const chunk of stream) {
      // Parse chunk with defensive validation
      const parsedEvent = parser.parseChunk(chunk);

      if (!parsedEvent) {
        // Skip invalid/empty chunks
        continue;
      }

      // Skip events that should be filtered (e.g., __start__)
      if (parser.shouldSkipEvent(parsedEvent)) {
        continue;
      }

      // Transform to domain event
      const domainEvent = transformer.transformToDomainEvent(
        parsedEvent,
        executionId
      );

      // Yield domain event in expected format
      yield domainEvent as any;
    }

    this.logger.log(`Streaming research completed for ${executionId}`);
  }
}
