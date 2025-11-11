import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  Node,
  Edge,
  WorkflowExecutionService,
} from '@hive-academy/langgraph-workflow-engine';
import { RequiresApproval } from '@hive-academy/langgraph-hitl';
import { FileOperationTools } from '../core/tools/file-operation.tools';
import type { TypedAgentState } from '../types';
import type { ResearcherMetadata } from './shared/metadata.types';

/**
 * 🔬 RESEARCHER AGENT - AUTONOMOUS WEB RESEARCH & REPORT GENERATION
 *
 * Demonstrates LLM-DRIVEN TOOL CALLING pattern:
 * ✅ Tools automatically bound to LLM via @Agent decorator
 * ✅ LLM autonomously selects appropriate tools (web-search vs research-search)
 * ✅ Framework handles tool execution loop automatically
 * ✅ Cost-optimized research (simple queries use web-search, complex use research-search)
 * ✅ Human-in-the-loop (HITL) for report approval
 * ✅ Real web research using Tavily API
 * ✅ Local report storage as markdown files
 *
 * Workflow Flow (LLM-Driven):
 * 1. conductAutonomousResearch - Single @Node with type: 'llm'
 *    - LLM receives query + tool definitions (web-search, research-search, create-report)
 *    - LLM analyzes query complexity and autonomously calls appropriate tool(s)
 *    - Framework executes tools via ToolNode and returns results to LLM
 *    - LLM processes results and decides: more research OR generate report
 *    - Loop continues until LLM calls create-report (signals completion)
 * 2. 🛑 INTERRUPT - Workflow pauses after research completes for user approval
 * 3. saveApprovedReport - Save approved report to filesystem
 *
 * HITL Integration:
 * - Workflow pauses after conductAutonomousResearch completes
 * - User reviews draft in UI modal
 * - Approves/rejects via API endpoint
 * - Workflow resumes with decision to saveApprovedReport
 *
 * KEY PATTERN DIFFERENCE:
 * ❌ OLD: Manual tool calls (this.webTools.researchSearch()) - no LLM autonomy
 * ✅ NEW: LLM-driven tool selection via @Node({ type: 'llm' }) - intelligent, adaptive
 */

@Agent({
  description:
    'Autonomous research agent with LLM-driven tool selection for intelligent, cost-optimized research and report generation',
  type: 'workflow-agent',
  tools: [
    'web-search', // Quick web search (2-5 sources, fast, cost-effective)
    'research-search', // Comprehensive research (5-10+ sources, academic, in-depth)
    'create-report', // Generate markdown report from research findings
    'save-report', // Save report to filesystem (used after approval)
  ],
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
    type: 'functional-node', // 🔑 Changed from functional-task to functional-node for @Node/@Edge pattern
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
   * 🔬 AUTONOMOUS RESEARCH NODE - LLM-DRIVEN TOOL CALLING
   *
   * This node demonstrates the correct LLM-driven tool calling pattern:
   * - @Node({ type: 'llm' }) automatically binds tools to LLM
   * - LLM receives intelligent prompting to guide tool selection
   * - Framework handles tool execution loop (node → tools → node)
   * - LLM autonomously decides when research is complete
   *
   * TOOL SELECTION INTELLIGENCE:
   * - Simple queries ("What is React?") → LLM uses web-search (fast, cheap)
   * - Complex queries ("Quantum computing in drug discovery") → LLM uses research-search (comprehensive)
   * - When sufficient info gathered → LLM calls create-report to finalize
   *
   * FRAMEWORK BEHAVIOR:
   * 1. LLM analyzes query, decides to call tool (e.g., research-search)
   * 2. Framework detects tool_calls in message → routes to ToolNode
   * 3. ToolNode executes tool, appends result to messages
   * 4. Framework routes back to this node with tool results
   * 5. LLM processes results, decides: more tools OR create-report
   * 6. Loop continues until LLM calls create-report (no more tool_calls)
   * 7. Node returns final state → workflow continues to saveApprovedReport
   */
  @Node({ type: 'llm' }) // 🔑 This triggers automatic tool binding!
  async conductAutonomousResearch(
    state: TypedAgentState<ResearcherMetadata>
  ): Promise<Partial<TypedAgentState<ResearcherMetadata>>> {
    const query = state.metadata.query;
    const researchDepth = state.metadata.researchDepth || 'detailed';
    const userId = state.metadata.userId;

    this.logger.log(
      `🔬 Starting autonomous research: "${query}" (depth: ${researchDepth}, user: ${userId})`
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

    // For @Node({ type: 'llm' }), we simply return metadata updates
    // The framework automatically:
    // 1. Binds tools (web-search, research-search, create-report) to LLM
    // 2. Invokes LLM with state.messages + system prompt
    // 3. Detects tool_calls in LLM response
    // 4. Routes to ToolNode if tool_calls present
    // 5. Executes tools and appends results to messages
    // 6. Loops back to this node with tool results
    // 7. Continues until no tool_calls (research complete)

    // Note: The researchSystemPrompt will be included in the initial user message
    // when the workflow is invoked. For now, we just track metadata.

    return {
      metadata: {
        ...state.metadata,
        workflowStartTime: new Date(),
        currentStep: 'autonomous-research',
        researchStarted: true,
        systemPrompt: researchSystemPrompt, // Store for reference
      },
    };
  }

  /**
   * SAVE APPROVED REPORT - Requires user approval before saving
   *
   * Uses @RequiresApproval decorator for human-in-the-loop approval.
   * Workflow pauses before saving, allowing user to review report draft.
   * If approved, report is saved. If rejected, workflow ends without saving.
   */
  @Node({ type: 'standard' })
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
    state: TypedAgentState<ResearcherMetadata>
  ): Promise<Partial<TypedAgentState<ResearcherMetadata>>> {
    this.logger.log(
      `💾 Saving approved report: "${state.metadata.reportTitle || 'Untitled'}"`
    );

    try {
      // Extract report content from messages
      // The create-report tool call result should be in messages
      let reportContent = state.metadata.reportDraft || '';
      let reportTitle =
        state.metadata.reportTitle ||
        `Research Report: ${state.metadata.query}`;

      // If reportDraft not in metadata, try to extract from messages
      if (!reportContent && state.messages && state.messages.length > 0) {
        // Find the last tool message (from create-report)
        const toolMessages = state.messages.filter(
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
          userId: state.metadata.userId,
          query: state.metadata.query,
          researchTopic: state.metadata.researchTopic || state.metadata.query,
          researchScope: state.metadata.researchScope || 'general',
          researchDepth: state.metadata.researchDepth || 'detailed',
          totalSources: state.metadata.totalSources || 0,
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvalFeedback: state.metadata.approvalFeedback,
        },
      });

      if (!createResult.success) {
        throw new Error(createResult.error || 'Unknown save error');
      }

      this.logger.log(`✅ Report saved: ${createResult.filename}`);

      return {
        metadata: {
          ...state.metadata,
          savedReportPath: createResult.filepath,
          savedReportFilename: createResult.filename,
          finalReport: `Report successfully saved to: ${createResult.filename}`,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Report save failed:`, error.message);
      return {
        metadata: {
          ...state.metadata,
          finalReport: 'Failed to save report',
          error: `Save failed: ${error.message}`,
        },
      };
    }
  }

  /**
   * EDGES - Define workflow flow
   */

  /**
   * After research completes, proceed to save (if approved via HITL)
   */
  @Edge('conductAutonomousResearch', 'saveApprovedReport')
  researchToSave(): boolean {
    return true; // Always route to save after research (HITL happens between)
  }

  /**
   * After save, end workflow
   */
  @Edge('saveApprovedReport', '__end__')
  complete(): boolean {
    return true;
  }

  /**
   * Execute with streaming support (following DevBrand POC pattern)
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
    // 🔑 Use 'updates' mode to see individual node and tool execution events
    const stream = this.workflowExecutionService.streamWorkflow(
      ResearcherAgent,
      initialState,
      {
        configurable: { thread_id: executionId },
        streamMode: 'updates', // Shows tool execution events + node updates
      }
    );

    // Yield events to caller with enhanced typing for tool events
    for await (const update of stream) {
      // LangGraph 'updates' mode returns: { nodeName: stateUpdate }
      // Example: { 'conductAutonomousResearch': { metadata: {...} } } or { 'tools': { messages: [...] } }
      const nodeName = Object.keys(update)[0];
      const nodeData = update[nodeName];

      if (nodeName === 'tools') {
        // Tool execution event
        yield {
          type: 'tool-execution',
          executionId,
          toolData: nodeData,
          timestamp: new Date().toISOString(),
        } as any;
      } else {
        // Regular workflow node update
        yield {
          type: 'workflow-update',
          executionId,
          nodeName,
          state: nodeData as any as TypedAgentState<ResearcherMetadata>,
          timestamp: new Date().toISOString(),
        } as any;
      }
    }

    this.logger.log(`Streaming research completed for ${executionId}`);
  }
}
