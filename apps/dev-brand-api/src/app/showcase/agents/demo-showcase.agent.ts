import { Injectable } from '@nestjs/common';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { HumanMessage } from '@langchain/core/messages';
import type { ShowcaseAgentState } from '../types/showcase.types';

/**
 * 🎯 DEMO SHOWCASE AGENT - Basic Capabilities Demonstration
 *
 * This agent demonstrates the @Agent decorator with basic configuration,
 * showcasing fundamental multi-agent capabilities and clean declarative patterns.
 *
 * Features demonstrated:
 * - @Agent decorator with essential configuration
 * - Basic tool integration
 * - Simple capability declaration
 * - Standard priority and execution patterns
 * - Clean node function implementation
 */
@Agent({
  id: 'demo-showcase',
  name: 'Demo Showcase Agent',
  description:
    'Demonstrates basic agent capabilities with clean, declarative patterns for fundamental multi-agent operations',

  // Basic tool integration
  tools: ['basic-analyzer', 'content-formatter'],

  // Core capabilities
  capabilities: ['analysis', 'formatting', 'demonstration'],

  // Standard configuration
  priority: 'medium',
  executionTime: 'fast',
  outputFormat: 'structured',

  // System prompt for consistent behavior
  systemPrompt: `You are the Demo Showcase Agent, designed to demonstrate fundamental multi-agent capabilities. 
  Your role is to:
  1. Perform basic analysis tasks efficiently
  2. Format content with clean, structured output
  3. Demonstrate declarative agent patterns
  4. Provide clear, actionable results
  
  Always maintain a professional, helpful tone and focus on delivering practical demonstrations.`,

  // Agent metadata
  metadata: {
    version: '1.0.0',
    category: 'demonstration',
    complexity: 'basic',
    showcaseLevel: 'foundational',
    decoratorsUsed: ['@Agent'],
    capabilities: ['basic-analysis', 'content-formatting', 'structured-output'],
  },
})
@Injectable()
export class DemoShowcaseAgent {
  /**
   * Main node function implementing agent logic
   *
   * Demonstrates:
   * - Clean agent implementation patterns
   * - Type-safe state management
   * - Structured output formatting
   * - Basic capability demonstration
   */
  async nodeFunction(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🎯 Demo Showcase Agent executing...');

    // Demonstrate basic analysis capability
    const analysisResult = await this.performBasicAnalysis(state);

    // Demonstrate content formatting capability
    const formattedResult = await this.formatContent(analysisResult, state);

    // Update state with agent results
    const updatedState: Partial<ShowcaseAgentState> = {
      ...state,
      currentAgentId: 'demo-showcase',
      messages: [
        ...state.messages,
        new HumanMessage(
          'Demo Showcase Agent completed basic analysis and formatting'
        ),
        new HumanMessage(
          `Analyzed input: "${state.input?.substring(0, 100)}..."`
        ),
        new HumanMessage(
          `Generated structured output with ${formattedResult.sections.length} sections`
        ),
      ],

      // Agent-specific results
      demoResults: {
        agentId: 'demo-showcase',
        executionTime: Date.now() - state.executionStartTime,
        analysisPerformed: true,
        contentFormatted: true,
        structuredOutput: formattedResult,
        capabilitiesUsed: ['analysis', 'formatting'],
        toolsInvoked: ['basic-analyzer', 'content-formatter'],
        confidence: 0.85,
      },

      // Update metrics
      metricsCollected: {
        ...state.metricsCollected,
        toolInvocations: state.metricsCollected.toolInvocations + 2,
        averageResponseTime:
          (state.metricsCollected.averageResponseTime + 1200) / 2, // 1.2s avg
      },
    };

    console.log('✅ Demo Showcase Agent execution completed');
    return updatedState;
  }

  /**
   * Basic analysis capability demonstration
   */
  private async performBasicAnalysis(state: ShowcaseAgentState) {
    console.log('  📊 Performing basic analysis...');

    // Simulate basic analysis logic
    const inputLength = state.input?.length || 0;
    const wordCount = state.input?.split(' ').length || 0;
    const sentenceCount = state.input?.split(/[.!?]+/).length || 0;

    const analysis = {
      inputMetrics: {
        characterCount: inputLength,
        wordCount: wordCount,
        sentenceCount: sentenceCount,
        avgWordsPerSentence: Math.round(wordCount / sentenceCount) || 0,
      },

      complexity:
        inputLength > 500 ? 'high' : inputLength > 200 ? 'medium' : 'low',

      keyInsights: [
        `Input contains ${wordCount} words across ${sentenceCount} sentences`,
        `Content complexity assessed as ${
          inputLength > 500 ? 'high' : inputLength > 200 ? 'medium' : 'low'
        }`,
        `Suitable for ${state.demonstrationMode} demonstration mode`,
      ],

      recommendations: [
        'Content is well-structured for demonstration purposes',
        'Agent coordination patterns can be effectively applied',
        'Streaming capabilities will provide good user feedback',
      ],
    };

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 800));

    return analysis;
  }

  /**
   * Content formatting capability demonstration
   */
  private async formatContent(analysisResult: any, state: ShowcaseAgentState) {
    console.log('  📝 Formatting content...');

    // Simulate content formatting logic
    const formattedContent = {
      title: `Demo Analysis Results - ${state.demonstrationMode.toUpperCase()} Mode`,

      summary: `Basic analysis completed for input of ${analysisResult.inputMetrics.wordCount} words. 
                Content complexity: ${analysisResult.complexity}. 
                Ready for advanced processing by specialized agents.`,

      sections: [
        {
          id: 'metrics',
          title: 'Input Metrics',
          content: analysisResult.inputMetrics,
          type: 'data',
        },
        {
          id: 'insights',
          title: 'Key Insights',
          content: analysisResult.keyInsights,
          type: 'list',
        },
        {
          id: 'recommendations',
          title: 'Recommendations',
          content: analysisResult.recommendations,
          type: 'list',
        },
        {
          id: 'next-steps',
          title: 'Next Steps',
          content: [
            'Pass results to Advanced Showcase Agent for complex processing',
            'Enable streaming capabilities for real-time feedback',
            'Initiate human-in-the-loop workflows for quality assurance',
          ],
          type: 'list',
        },
      ],

      metadata: {
        generatedBy: 'demo-showcase-agent',
        generatedAt: new Date().toISOString(),
        demonstrationMode: state.demonstrationMode,
        processingTime: '0.8s',
        confidence: 0.85,
      },
    };

    // Simulate formatting time
    await new Promise((resolve) => setTimeout(resolve, 400));

    return formattedContent;
  }

  /**
   * Health check method for agent monitoring
   */
  async healthCheck(): Promise<{
    status: string;
    capabilities: string[];
    metadata: Record<string, unknown>;
  }> {
    return {
      status: 'healthy',
      capabilities: ['analysis', 'formatting', 'demonstration'],
      metadata: {
        agentId: 'demo-showcase',
        version: '1.0.0',
        lastExecution: new Date().toISOString(),
        averageResponseTime: '1.2s',
        successRate: '98.5%',
      },
    };
  }

  /**
   * Agent configuration getter for runtime inspection
   */
  getAgentCapabilities() {
    return {
      primaryCapabilities: ['analysis', 'formatting'],
      supportedModes: ['basic', 'advanced', 'enterprise'],
      toolIntegrations: ['basic-analyzer', 'content-formatter'],
      outputFormats: ['structured', 'json', 'markdown'],
      decoratorsUsed: ['@Agent'],
      showcaseLevel: 'foundational',
    };
  }
}
