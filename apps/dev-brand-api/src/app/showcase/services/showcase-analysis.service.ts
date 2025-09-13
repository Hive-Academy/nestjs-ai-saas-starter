import { Injectable, Logger } from '@nestjs/common';
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
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService
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
      
      const analysisWorkflow = await this.multiAgentCoordinator.executeSimpleWorkflow(
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
            }
          }
        }
      );

      // Extract results
      const lastMessage = analysisWorkflow.finalState.messages?.slice(-1)[0];
      const analysisContent = lastMessage?.content || 'Analysis completed';

      const metrics = {
        agentExecutions: analysisWorkflow.executionPath?.length || 0,
        totalTokens: analysisContent.length,
        agentsUsed: analysisWorkflow.agentsUsed || [],
        toolsInvoked: analysisWorkflow.toolsInvoked || [],
        executionTime: analysisWorkflow.duration || 0,
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
  async *streamAnalysisTokens(content: string): AsyncGenerator<string, void, unknown> {
    if (typeof content === 'string') {
      const words = content.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const tokenChunk = words.slice(i, i + 3).join(' ');
        yield tokenChunk;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

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
      result: `Structured analysis result for: ${step} (input: "${input.substring(0, 50)}...")`,
      confidence: 0.75 + Math.random() * 0.15,
      fallback: true,
    }));

    const content = `**Structured Analysis Results**

${steps.map(step => `${step.step}. ${step.description}
   Result: ${step.result}
   Confidence: ${Math.round(step.confidence * 100)}%`).join('\n\n')}

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
          ...state.metricsCollected,
          memoryAccesses: (state.metricsCollected?.memoryAccesses || 0) + 1,
          toolInvocations: (state.metricsCollected?.toolInvocations || 0) + analysisResult.metrics.agentExecutions,
          tokensStreamed: (state.metricsCollected?.tokensStreamed || 0) + analysisResult.metrics.totalTokens,
        },
        messages: [
          ...(state.messages || []),
          new HumanMessage('🚀 REAL Multi-Agent Analysis: Executed with actual LLM agents'),
          new HumanMessage(`Analysis completed by agents: ${analysisResult.metrics.agentsUsed.join(', ')}`),
          new HumanMessage(`Tools used: ${analysisResult.metrics.toolsInvoked.join(', ')}`),
        ],
        analysis: [{
          step: 1,
          description: 'Real multi-agent analysis execution',
          result: analysisResult.content,
          confidence: 0.92,
          metrics: analysisResult.metrics,
        }],
        llmAnalysisResult: analysisResult,
      };
    } else {
      // Fallback mode
      const fallback = fallbackContent || this.generateStructuredAnalysis(state.input || '');
      
      return {
        ...state,
        metricsCollected: {
          ...state.metricsCollected,
          memoryAccesses: (state.metricsCollected?.memoryAccesses || 0) + fallback.steps.length,
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