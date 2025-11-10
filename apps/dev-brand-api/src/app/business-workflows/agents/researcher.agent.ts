import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  Entrypoint,
  Task,
  WorkflowExecutionService,
} from '@hive-academy/langgraph-workflow-engine';
import type {
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-workflow-engine';
import { LlmProviderService } from '@hive-academy/langgraph-workflow-engine';
import { WebResearchTools } from '../core/tools/web-research.tools';
import { FileOperationTools } from '../core/tools/file-operation.tools';
import type { TypedAgentState } from '../types';
import type { ResearcherMetadata } from './shared/metadata.types';

/**
 * 🔬 RESEARCHER AGENT - AUTONOMOUS WEB RESEARCH & REPORT GENERATION
 *
 * Standalone agent demonstrating:
 * ✅ @Agent decorator with workflow-agent type
 * ✅ Streaming to Angular UI via SSE
 * ✅ Human-in-the-loop (HITL) for report approval
 * ✅ Real web research using Tavily API
 * ✅ Local report storage as markdown files
 * ✅ Zero multi-agent dependencies (standalone workflow)
 *
 * Workflow Flow:
 * 1. parseQuery - Extract research parameters from user query
 * 2. conductResearch - Execute web research using Tavily
 * 3. generateReportDraft - Generate markdown report with LLM
 * 4. 🛑 INTERRUPT - Wait for user approval
 * 5. saveReport - Save approved report to filesystem
 *
 * HITL Integration:
 * - Workflow pauses after generateReportDraft
 * - User reviews draft in UI modal
 * - Approves/rejects via API endpoint
 * - Workflow resumes with decision
 */

@Agent({
  description:
    'Autonomous research agent that conducts web research, generates reports, and saves them locally with user approval',
  type: 'workflow-agent',
  tools: [
    'web-search',
    'research-search',
    'create-report',
    'save-report',
    'list-reports',
  ],
  capabilities: [
    'web-research',
    'report-generation',
    'academic-search',
    'content-synthesis',
  ],
  priority: 'high',
  executionTime: 'slow',
  outputFormat: 'markdown',
  workflow: {
    name: 'researcher-workflow',
    description: 'Autonomous research and report generation workflow',
    type: 'functional-task', // Linear @Entrypoint + @Task flow
    streaming: true, // Enable streaming to UI
    confidenceThreshold: 0.7,
    metrics: true,
    // 🔥 HITL CONFIGURATION
    enableInternalStreaming: true,
    enableInternalCheckpointing: true, // Required for HITL resume
    internalTimeout: 180000, // 3 minutes
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateReportDraft'], // Pause workflow after draft generation
    },
  },
})
@Injectable()
export class ResearcherAgent {
  private readonly logger = new Logger(ResearcherAgent.name);

  constructor(
    private readonly webTools: WebResearchTools,
    private readonly fileTools: FileOperationTools,
    private readonly llmProvider: LlmProviderService,
    private readonly workflowExecutionService: WorkflowExecutionService
  ) {}

  /**
   * STEP 1: Parse user query and extract research parameters
   */
  @Entrypoint({ timeout: 15000 })
  async parseQuery(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    this.logger.log(`📝 Parsing research query: "${state.metadata.query}"`);

    try {
      // Use LLM to analyze query and extract structured parameters
      const llm = await this.llmProvider.getLLM({
        temperature: 0.1,
        maxTokens: 300,
      });

      const analysisPrompt = `Analyze this research query and extract key information:

Query: "${state.metadata.query}"

Extract:
1. Main research topic (concise phrase)
2. Research scope (broad overview / focused deep-dive / comparative analysis)
3. Suggested report title (professional, clear)
4. Key entities, technologies, or concepts to focus on

Response format:
Topic: [main topic]
Scope: [broad/focused/comparative]
Title: [report title]
Entities: [comma-separated list]`;

      const response = await llm.invoke([
        { role: 'user', content: analysisPrompt },
      ]);

      const analysisText = response.content.toString();

      // Parse LLM response
      const topicMatch = analysisText.match(/Topic:\s*(.+)/i);
      const scopeMatch = analysisText.match(/Scope:\s*(.+)/i);
      const titleMatch = analysisText.match(/Title:\s*(.+)/i);

      const researchTopic = topicMatch?.[1]?.trim() || state.metadata.query;
      const researchScope = scopeMatch?.[1]?.trim() || 'comprehensive overview';
      const reportTitle =
        titleMatch?.[1]?.trim() || `Research Report: ${state.metadata.query}`;

      this.logger.log(`✅ Query parsed - Topic: "${researchTopic}"`);

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            researchTopic,
            researchScope,
            reportTitle,
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Query parsing failed:`, error.message);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            researchTopic: state.metadata.query,
            researchScope: 'general overview',
            reportTitle: `Research Report: ${state.metadata.query}`,
            error: `Query parsing failed: ${error.message}`,
          },
        },
      };
    }
  }

  /**
   * STEP 2: Conduct comprehensive web research
   */
  @Task({ dependsOn: ['parseQuery'] })
  async conductResearch(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    this.logger.log(
      `🔍 Conducting research on: "${state.metadata.researchTopic}"`
    );

    try {
      // Use WebResearchTools.researchSearch for comprehensive multi-source research
      const researchResults = await this.webTools.researchSearch({
        topic: state.metadata.researchTopic || state.metadata.query,
        includeAcademic: true,
        minSources: state.metadata.researchDepth === 'comprehensive' ? 10 : 5,
        analysisDepth: state.metadata.researchDepth || 'detailed',
      });

      if ('error' in researchResults) {
        throw new Error(researchResults.error);
      }

      this.logger.log(
        `✅ Research completed - Found ${researchResults.totalSources} sources`
      );

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            searchResults: researchResults.sources,
            synthesis: researchResults.synthesis,
            totalSources: researchResults.totalSources,
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Research failed:`, error.message);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            searchResults: [],
            synthesis: 'Research failed - no sources available',
            totalSources: 0,
            error: `Research failed: ${error.message}`,
          },
        },
      };
    }
  }

  /**
   * STEP 3: Generate comprehensive markdown report draft
   * 🛑 WORKFLOW PAUSES HERE FOR USER APPROVAL
   */
  @Task({ dependsOn: ['conductResearch'] })
  async generateReportDraft(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    this.logger.log(
      `📄 Generating report draft: "${state.metadata.reportTitle}"`
    );

    try {
      // Build comprehensive context from research results
      interface SourceItem {
        title: string;
        type: string;
        credibility: string;
        url: string;
        content: string;
      }

      const sourcesContext: string = state.metadata.searchResults
        ? state.metadata.searchResults
            .slice(0, 5)
            .map(
              (source: SourceItem, idx: number): string =>
                `${idx + 1}. **${source.title}** (${source.type}, ${
                  source.credibility
                } credibility)\n   URL: ${
                  source.url
                }\n   Summary: ${source.content.substring(0, 200)}...`
            )
            .join('\n\n')
        : '';

      // Use LLM to generate professional markdown report
      const llm = await this.llmProvider.getLLM({
        temperature: 0.7,
        maxTokens: 3000,
      });

      const reportPrompt = `Generate a comprehensive research report in markdown format:

**Research Topic:** ${state.metadata.researchTopic}
**Research Scope:** ${state.metadata.researchScope}
**Total Sources Analyzed:** ${state.metadata.totalSources}
**Research Depth:** ${state.metadata.researchDepth}

**Research Synthesis:**
${state.metadata.synthesis}

**Top Sources:**
${sourcesContext}

**Instructions:**
Create a well-structured, professional markdown report with:

1. **Executive Summary** (2-3 paragraphs)
2. **Introduction** (context and objectives)
3. **Key Findings** (organized by themes with source citations [1], [2], etc.)
4. **Analysis & Insights** (synthesis and implications)
5. **Conclusions** (summary and recommendations)
6. **References** (numbered list of all sources with URLs)

Use proper markdown formatting:
- Headings (##, ###)
- Bullet points and numbered lists
- Bold/italic emphasis
- Code blocks if relevant
- Proper citations [1], [2], etc.

Generate a report suitable for professional use.`;

      const response = await llm.invoke([
        { role: 'user', content: reportPrompt },
      ]);

      const reportDraft = response.content.toString();

      this.logger.log(
        `✅ Report draft generated (${reportDraft.length} chars)`
      );
      this.logger.log(`🛑 Workflow interrupted - Awaiting user approval`);

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            reportDraft,
            userApproval: 'pending', // Trigger HITL interruption
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Report generation failed:`, error.message);

      // Generate fallback report
      const fallbackReport = `# ${state.metadata.reportTitle}

## Research Failed

Unable to generate comprehensive report due to error: ${error.message}

## Available Information

**Topic:** ${state.metadata.researchTopic}
**Sources Found:** ${state.metadata.totalSources}

**Synthesis:**
${state.metadata.synthesis || 'No synthesis available'}

## Error Details

\`\`\`
${error.message}
\`\`\``;

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            reportDraft: fallbackReport,
            userApproval: 'pending',
            error: `Report generation failed: ${error.message}`,
          },
        },
      };
    }
  }

  /**
   * STEP 4: Save approved report to filesystem
   * Only executes if user approved the report
   */
  @Task({ dependsOn: ['generateReportDraft'] })
  async saveReport(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;

    // Check approval status
    if (state.metadata.userApproval !== 'approved') {
      this.logger.warn(`⚠️ Report rejected by user - Not saving`);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            finalReport: 'Report was rejected by user and not saved.',
            error: 'User rejected report',
          },
        },
      };
    }

    this.logger.log(
      `💾 Saving approved report: "${state.metadata.reportTitle}"`
    );

    try {
      // Save report using FileOperationTools
      const saveResult = await this.fileTools.createReport({
        title: state.metadata.reportTitle || 'Untitled Report',
        content: state.metadata.reportDraft || '',
        metadata: {
          userId: state.metadata.userId,
          query: state.metadata.query,
          researchTopic: state.metadata.researchTopic,
          researchScope: state.metadata.researchScope,
          researchDepth: state.metadata.researchDepth,
          totalSources: state.metadata.totalSources,
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvalFeedback: state.metadata.approvalFeedback,
        },
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Unknown save error');
      }

      this.logger.log(`✅ Report saved: ${saveResult.filename}`);

      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            savedReportPath: saveResult.filepath,
            savedReportFilename: saveResult.filename,
            finalReport: `Report successfully saved to: ${saveResult.filename}`,
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Report save failed:`, error.message);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            finalReport: 'Failed to save report',
            error: `Save failed: ${error.message}`,
          },
        },
      };
    }
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
      // Example: { 'parseQuery': { metadata: {...} } } or { 'tools': { messages: [...] } }
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
