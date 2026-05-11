import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  Entrypoint,
  LLMTask,
  LlmProviderService,
  Task,
  ToolRegistryService,
  WorkflowExecutionService,
  WorkflowResumptionService,
  type TaskExecutionContext,
  type TaskExecutionResult,
  StreamEventParser,
  StreamEventTransformer,
} from '@hive-academy/langgraph-workflow-engine';
import { interrupt } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
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
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly workflowResumptionService: WorkflowResumptionService,
    private readonly llmProvider: LlmProviderService,
    private readonly toolRegistry: ToolRegistryService
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

    const systemPrompt = `You are an autonomous research agent with intelligent tool selection capabilities.

RESEARCH QUERY: "${query}"
RESEARCH DEPTH: ${researchDepth}
USER ID: ${userId}

AVAILABLE TOOLS:
1. web-search - Quick web search (simple/factual queries, researchDepth="summary")
   Parameters: query, maxResults (3-5), searchDepth ("basic"), includeAnswer (true), includeDomains?, excludeDomains?

2. research-search - Comprehensive research (complex topics, researchDepth="detailed"/"comprehensive")
   Parameters: topic, includeAcademic (true), minSources (5-10), analysisDepth ("${researchDepth}")

3. create-report - Generate final markdown report (call LAST after gathering enough data)
   Parameters: title (professional report title), content (full markdown report with Executive Summary/Key Findings/Conclusions/References), metadata ({userId, query, researchDepth, totalSources, createdAt, researchTopic, researchScope})

WORKFLOW:
1. Analyze query complexity and choose web-search (simple) or research-search (complex)
2. Execute research tool(s) - run multiple if needed for better coverage
3. When sufficient data collected, call create-report with a complete professional report
4. create-report MUST be your final tool call

Now analyze the query and conduct research using the most appropriate tools. Call create-report when done.`;

    // Determine messages to send to LLM
    // First invocation: state.messages is empty → seed with system + human message
    // Subsequent invocations (after tool results): use existing messages as-is
    const existingMessages = state.messages || [];

    // Exit the tool loop early if create-report already ran successfully.
    // After ToolNode executes create-report, this handler is invoked again with
    // the ToolMessage appended. Without this guard the LLM would be called one
    // more time and might decide to call additional tools.
    if (existingMessages.length > 0) {
      const lastMsg = existingMessages[existingMessages.length - 1];
      const isToolMsg =
        (lastMsg as any)._getType?.() === 'tool' ||
        (lastMsg as any).role === 'tool';

      if (isToolMsg) {
        // Find the AI message that triggered this tool call
        const prevAI = [...existingMessages]
          .reverse()
          .find(
            (m) =>
              (m as any)._getType?.() === 'ai' ||
              (m as any).role === 'assistant'
          );
        const hadCreateReport =
          prevAI &&
          Array.isArray((prevAI as any).tool_calls) &&
          (prevAI as any).tool_calls.some(
            (tc: any) => tc.name === 'create-report'
          );

        if (hadCreateReport) {
          // Parse tool result to confirm success
          let toolResult: Record<string, unknown> = {};
          try {
            toolResult =
              typeof lastMsg.content === 'string'
                ? JSON.parse(lastMsg.content)
                : (lastMsg.content as unknown as Record<string, unknown>);
          } catch { /* leave empty */ }

          if (toolResult['success']) {
            const createReportCall = (prevAI as any).tool_calls.find(
              (tc: any) => tc.name === 'create-report'
            );
            const reportTitle =
              createReportCall?.args?.title ||
              (toolResult['filename'] as string) ||
              query;
            const reportDraft = createReportCall?.args?.content || '';

            this.logger.log(
              `Report "${reportTitle}" created — exiting tool loop, routing to approval`
            );

            return {
              state: {
                ...state,
                metadata: {
                  ...state.metadata,
                  reportTitle,
                  reportDraft,
                  savedReportPath: toolResult['filepath'] as string,
                  savedReportFilename: toolResult['filename'] as string,
                  currentStep: 'research-complete',
                },
                messages: [
                  ...existingMessages,
                  new AIMessage(
                    `Research complete. Report "${reportTitle}" has been created and is ready for your review.`
                  ),
                ],
              },
            };
          }
        }
      }
    }

    const messages =
      existingMessages.length === 0
        ? [new SystemMessage(systemPrompt), new HumanMessage(query)]
        : existingMessages;

    // Get tools and bind to LLM
    const tools = this.toolRegistry.getTools([
      'web-search',
      'research-search',
      'create-report',
    ]);

    if (tools.length === 0) {
      this.logger.warn(
        'No tools resolved from registry — research will proceed without tool calling'
      );
    }

    const llm = await this.llmProvider.getLLM();
    // bindTools exists on BaseChatModel but the interface type doesn't declare it
    const llmWithTools =
      tools.length > 0 ? (llm as any).bindTools(tools) : llm;

    this.logger.log(
      `Invoking LLM with ${tools.length} tools bound, ${messages.length} messages`
    );

    const llmResponse = await llmWithTools.invoke(messages);

    const hasToolCalls =
      Array.isArray((llmResponse as any).tool_calls) &&
      (llmResponse as any).tool_calls.length > 0;

    this.logger.log(
      `LLM response received — tool_calls: ${hasToolCalls ? (llmResponse as any).tool_calls.map((tc: any) => tc.name).join(', ') : 'none'}`
    );

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          currentStep: 'autonomous-research',
          customProgress: {
            agent: 'researcher-agent',
            stage: 'llm-tool-selection',
            message: `Analyzing query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`,
            percentage: 25,
          },
        },
        messages: [...messages, llmResponse],
      },
    };
  }

  /**
   * TASK 3: SAVE APPROVED REPORT - Human-in-the-Loop Approval Gate
   *
   * Uses LangGraph native interrupt() for HITL approval.
   * Workflow pauses at interrupt(), emitting __interrupt__ in the stream.
   * The controller detects __interrupt__ and emits interruption_request SSE.
   * User reviews and approves/rejects via POST /api/research/approve/:executionId.
   * Workflow resumes with Command({ resume: approvalData }); interrupt() returns approvalData.
   */
  @Task({ dependsOn: ['conductAutonomousResearch'] })
  async saveApprovedReport(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;

    // Pause workflow for human approval.
    // First invocation: interrupt() throws GraphInterrupt → LangGraph saves checkpoint,
    //   emits { __interrupt__: [...] } in stream, stream ends.
    // On resume via Command({ resume: data }): interrupt() returns data without throwing.
    const resumeData = interrupt({
      type: 'approval_required',
      message: `Research report draft ready for review: "${state.metadata.reportTitle || 'Untitled'}"`,
      reportDraft: state.metadata.reportDraft,
      reportTitle: state.metadata.reportTitle,
      query: state.metadata.query,
    });

    // Check approval decision from the resume data
    const approved = (resumeData as any)?.metadata?.userApproval === 'approved';
    if (!approved) {
      this.logger.log(`Report rejected by user`);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            finalReport: 'Report rejected by user',
            currentStep: 'rejected',
          },
        },
      };
    }

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
   * Resume an interrupted workflow with streaming (post-HITL approval).
   *
   * Streams the post-approval portion of the workflow so the frontend can
   * observe the saving step and receive workflow_complete via SSE.
   */
  async *resumeWithStreaming(input: {
    executionId: string;
    checkpointId: string;
    resumeValue: any;
    userConfig?: any;
  }): AsyncGenerator<any, void, unknown> {
    this.logger.log(`Streaming resume for execution: ${input.executionId}`);

    const rawStream = this.workflowResumptionService.streamResumeWorkflow(
      'ResearcherAgent',
      input.executionId,
      input.resumeValue,
      input.checkpointId,
      input.userConfig,
      ['updates', 'messages', 'custom']
    );

    const parser = new StreamEventParser();
    const transformer = new StreamEventTransformer();

    for await (const chunk of rawStream) {
      const parsedEvent = parser.parseChunk(chunk);
      if (!parsedEvent || parser.shouldSkipEvent(parsedEvent)) continue;
      const domainEvent = transformer.transformToDomainEvent(parsedEvent, input.executionId);
      yield domainEvent as any;
    }

    this.logger.log(`Streaming resume completed for ${input.executionId}`);
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
    config?: any; // RunnableConfig
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

    // Merge provided config with defaults
    const runConfig = {
      ...input.config,
      configurable: {
        ...input.config?.configurable,
        thread_id: executionId,
      },
      streamMode: ['updates', 'messages', 'custom'],
    };

    // Stream via WorkflowExecutionService
    // 🔑 Use multiple modes for comprehensive streaming:
    // - 'updates': Node-level state changes + tool execution events
    // - 'messages': LLM token streaming for real-time response display
    // - 'custom': Custom progress events from tasks
    const stream = this.workflowExecutionService.streamWorkflow(
      ResearcherAgent,
      initialState,
      runConfig
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
