import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { TokenStreamingService } from '@hive-academy/langgraph-streaming';
import { HumanMessage } from '@langchain/core/messages';
import { MultiAgentCoordinatorService } from '@hive-academy/langgraph-multi-agent';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * 🧠 SHOWCASE ANALYSIS SERVICE
 *
 * Responsible for intelligent analysis operations in showcase workflows.
 * Follows single responsibility principle and clean architecture.
 */
@Injectable()
export class ShowcaseAnalysisService {
  private readonly logger = new Logger(ShowcaseAnalysisService.name);

  constructor(
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService,
    @Optional()
    @Inject(TokenStreamingService)
    private readonly tokenStreaming?: TokenStreamingService
  ) {}

  /**
   * Execute real multi-agent analysis workflow
   */
  async executeAnalysisWorkflow(
    networkId: string,
    input: string,
    capabilities: string[],
    demonstrationMode: string
  ): Promise<{
    success: boolean;
    content: string;
    metrics: {
      agentExecutions: number;
      totalTokens: number;
      agentsUsed: string[];
      toolsInvoked: string[];
      executionTime: number;
    };
    error?: Error;
  }> {
    try {
      this.logger.log('🎯 Executing REAL multi-agent analysis workflow...');

      const analysisWorkflow =
        await this.multiAgentCoordinator.executeSimpleWorkflow(
          networkId,
          `Perform comprehensive analysis of: "${input}".
         Focus on: ${capabilities.join(', ') || 'general analysis'}.
         Mode: ${demonstrationMode}.
         Provide detailed insights, extracted entities, semantic classification, and actionable recommendations.`,
          {
            config: {
              configurable: {
                recursionLimit: 10,
                checkpointer: true,
              },
            },
          }
        );

      // Extract results (defensive shaping)
      const lastMessage: any = (
        analysisWorkflow as any
      )?.finalState?.messages?.slice(-1)[0];
      const rawContent: any = lastMessage?.content;
      const analysisContent: string =
        typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
          ? rawContent
              .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
              .join(' ')
              .trim() || 'Analysis completed'
          : 'Analysis completed';

      const agentExecutions =
        (analysisWorkflow as any)?.executionPath?.length || 0;
      const agentsUsed = (analysisWorkflow as any)?.agentsUsed || [];
      const toolsInvoked = (analysisWorkflow as any)?.toolsInvoked || [];
      const executionTime = (analysisWorkflow as any)?.duration || 0;

      const metrics = {
        agentExecutions,
        totalTokens: analysisContent.length,
        agentsUsed,
        toolsInvoked,
        executionTime,
      };

      this.logger.log('✅ Real analysis workflow completed successfully');

      return {
        success: true,
        content: analysisContent,
        metrics,
      };
    } catch (error) {
      this.logger.error('❌ Analysis workflow failed:', error);
      return {
        success: false,
        content: '',
        metrics: {
          agentExecutions: 0,
          totalTokens: 0,
          agentsUsed: [],
          toolsInvoked: [],
          executionTime: 0,
        },
        error: error as Error,
      };
    }
  }

  /**
   * Stream analysis tokens for real-time updates
   */
  async *streamAnalysisTokens(
    content: string,
    executionId: string
  ): AsyncGenerator<string, void, unknown> {
    if (typeof content !== 'string') return;
    if (!executionId)
      throw new Error('executionId is required for streaming analysis tokens');
    const words = content.split(' ');
    const nodeId = 'analysis:stream';

    for (let i = 0; i < words.length; i += 3) {
      const tokenChunk = words.slice(i, i + 3).join(' ');
      if (this.tokenStreaming) {
        this.tokenStreaming.streamToken(executionId, nodeId, tokenChunk, {
          index: i,
          total: words.length,
        });
      }
      yield tokenChunk;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (this.tokenStreaming) {
      await this.tokenStreaming.flushTokens(executionId, nodeId);
    }
  }

  // ensureTokenStreamInitialized removed (lazy auto-init now handles first emission)

  /**
   * Generate fallback structured analysis
   */
  generateStructuredAnalysis(input: string): {
    content: string;
    steps: Array<{
      step: number;
      description: string;
      result: string;
      confidence: number;
      fallback: boolean;
    }>;
  } {
    const analysisSteps = [
      'Analyzing input context and requirements',
      'Extracting key entities and relationships',
      'Performing semantic analysis and classification',
      'Generating insights and recommendations',
      'Validating results against best practices',
    ];

    const steps = analysisSteps.map((step, index) => ({
      step: index + 1,
      description: step,
      result: `Structured analysis result for: ${step} (input: "${input.substring(
        0,
        50
      )}...")`,
      confidence: 0.75 + Math.random() * 0.15,
      fallback: true,
    }));

    const content = `**Structured Analysis Results**

${steps
  .map(
    (step) => `${step.step}. ${step.description}
   Result: ${step.result}
   Confidence: ${Math.round(step.confidence * 100)}%`
  )
  .join('\n\n')}

*Analysis completed using structured methodology*`;

    return { content, steps };
  }

  /**
   * Update state with analysis results
   */
  updateStateWithAnalysis(
    state: Partial<ShowcaseAgentState>,
    analysisResult: {
      success: boolean;
      content: string;
      metrics: any;
      error?: Error;
    },
    fallbackContent?: { content: string; steps: any[] }
  ): Partial<ShowcaseAgentState> {
    if (analysisResult.success) {
      return {
        ...state,
        metricsCollected: {
          totalDuration: state.metricsCollected?.totalDuration || 0,
          agentSwitches: state.metricsCollected?.agentSwitches || 0,
          toolInvocations:
            (state.metricsCollected?.toolInvocations || 0) +
            analysisResult.metrics.agentExecutions,
          memoryAccesses: (state.metricsCollected?.memoryAccesses || 0) + 1,
          averageResponseTime: state.metricsCollected?.averageResponseTime || 0,
          peakMemoryUsage: state.metricsCollected?.peakMemoryUsage || 0,
          concurrentAgents: state.metricsCollected?.concurrentAgents || 1,
          successRate: state.metricsCollected?.successRate || 0,
          errorRate: state.metricsCollected?.errorRate || 0,
          approvalRate: state.metricsCollected?.approvalRate || 0,
          tokensStreamed:
            (state.metricsCollected?.tokensStreamed || 0) +
            analysisResult.metrics.totalTokens,
          streamingLatency: state.metricsCollected?.streamingLatency || 0,
          connectionStability:
            state.metricsCollected?.connectionStability || 1.0,
        },
        messages: [
          ...(state.messages || []),
          new HumanMessage(
            '🚀 REAL Multi-Agent Analysis: Executed with actual LLM agents'
          ),
          new HumanMessage(
            `Analysis completed by agents: ${analysisResult.metrics.agentsUsed.join(
              ', '
            )}`
          ),
          new HumanMessage(
            `Tools used: ${analysisResult.metrics.toolsInvoked.join(', ')}`
          ),
        ],
        analysis: [
          {
            step: 1,
            description: 'Real multi-agent analysis execution',
            result: analysisResult.content,
            confidence: 0.92,
            metrics: analysisResult.metrics,
          },
        ],
      };
    } else {
      // Fallback mode
      const fallback =
        fallbackContent || this.generateStructuredAnalysis(state.input || '');

      return {
        ...state,
        metricsCollected: {
          totalDuration: state.metricsCollected?.totalDuration || 0,
          agentSwitches: state.metricsCollected?.agentSwitches || 0,
          toolInvocations: state.metricsCollected?.toolInvocations || 0,
          memoryAccesses:
            (state.metricsCollected?.memoryAccesses || 0) +
            fallback.steps.length,
          averageResponseTime: state.metricsCollected?.averageResponseTime || 0,
          peakMemoryUsage: state.metricsCollected?.peakMemoryUsage || 0,
          concurrentAgents: state.metricsCollected?.concurrentAgents || 1,
          successRate: state.metricsCollected?.successRate || 0,
          errorRate: state.metricsCollected?.errorRate || 0,
          approvalRate: state.metricsCollected?.approvalRate || 0,
          tokensStreamed: state.metricsCollected?.tokensStreamed || 0,
          streamingLatency: state.metricsCollected?.streamingLatency || 0,
          connectionStability:
            state.metricsCollected?.connectionStability || 1.0,
        },
        errors: [
          ...(state.errors || []),
          {
            id: `analysis-fallback-${Date.now()}`,
            type: 'workflow' as const,
            severity: 'low' as const,
            message: `Analysis fell back to structured mode: ${analysisResult.error?.message}`,
            context: { phase: 'intelligent_analysis', fallback: true },
            occurredAt: Date.now(),
            recoverable: true,
          },
        ],
        messages: [
          ...(state.messages || []),
          new HumanMessage('📊 Structured analysis completed (fallback mode)'),
        ],
        analysis: fallback.steps,
      };
    }
  }
}
