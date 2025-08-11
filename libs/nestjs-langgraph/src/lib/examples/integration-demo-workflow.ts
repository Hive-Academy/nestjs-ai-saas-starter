import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { DeclarativeWorkflowBase } from '../base/declarative-workflow.base';
import { Workflow } from '../decorators/workflow.decorator';
import { Node } from '../decorators/node.decorator';
import { 
  StreamToken, 
  StreamEvent, 
  StreamProgress, 
  StreamAll 
} from '../decorators/streaming.decorator';
import { Tool, ComposedTool } from '../decorators/tool.decorator';
import { RequiresApproval, ApprovalRiskLevel } from '../decorators/approval.decorator';

import { WorkflowState } from '../interfaces/workflow.interface';
import { StreamEventType } from '../constants';
import { AgentType } from '@anubis/shared';

/**
 * Integration Demo Workflow - Demonstrates all advanced features working together
 * 
 * This workflow showcases:
 * - Advanced Streaming System (@StreamToken, @StreamEvent, @StreamProgress)
 * - Tool Autodiscovery System (@Tool, @ComposedTool)
 * - HITL Foundation (@RequiresApproval with confidence thresholds)
 */
@Injectable()
@Workflow({
  name: 'integration-demo',
  description: 'Comprehensive demonstration of advanced features integration',
  streaming: true
})
export class IntegrationDemoWorkflow extends DeclarativeWorkflowBase {
  protected override readonly logger = new Logger(IntegrationDemoWorkflow.name);
  
  // Required by DeclarativeWorkflowBase
  protected readonly workflowConfig = {
    name: 'integration-demo',
    description: 'Comprehensive demonstration of advanced features integration',
    streaming: true
  };

  /**
   * Initialize workflow with progress tracking
   */
  @Node({ type: 'standard', description: 'Initialize integration demo workflow' })
  @StreamProgress({ 
    enabled: true,
    interval: 500,
    granularity: 'coarse',
    includeETA: true
  })
  async initializeWorkflow(state: WorkflowState): Promise<Partial<WorkflowState>> {
    this.logger.log('Initializing Integration Demo Workflow');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization work
    
    return {
      ...state,
      metadata: {
        ...state.metadata,
        initialized: true,
        phase: 'Integration Demo',
        startTime: new Date(),
      },
      status: 'active'
    };
  }

  /**
   * Content generation with token streaming
   */
  @Node({ type: 'llm', description: 'Generate content with real-time token streaming' })
  @StreamToken({ 
    enabled: true,
    bufferSize: 30,
    batchSize: 5,
    flushInterval: 100,
    format: 'text',
    includeMetadata: true,
    filter: {
      minLength: 1,
      excludeWhitespace: true,
      pattern: /\w+/ // Only word characters
    },
    processor: (token, metadata) => `[${new Date().toISOString()}] ${token}`
  })
  @StreamEvent({
    events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE, StreamEventType.PROGRESS],
    bufferSize: 50,
    delivery: 'at-least-once',
    transformer: (event: any) => ({ ...event, enriched: true, phase: 'content-generation' })
  })
  async generateContent(state: WorkflowState): Promise<Partial<WorkflowState>> {
    this.logger.debug('Generating content with streaming');

    // Simulate content generation with streaming tokens
    const contentParts = [
      'In this Phase 2 demonstration,',
      'we showcase advanced streaming capabilities,',
      'tool autodiscovery and execution,',
      'and human-in-the-loop approval workflows.',
      'All systems work together seamlessly',
      'to provide a comprehensive development experience.'
    ];

    let generatedContent = '';
    
    for (let i = 0; i < contentParts.length; i++) {
      const part = contentParts[i];
      generatedContent += part + ' ';
      
      // Emit progress update
      if (this.streamService) {
        // Emit progress as a percentage value
        const progress = ((i + 1) / contentParts.length) * 100;
        await this.streamService.emitProgress(StreamEventType.PROGRESS, progress);
      }

      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      ...state,
      content: generatedContent.trim(),
      tokenStats: {
        totalTokens: contentParts.length,
        averageTokenLength: contentParts.reduce((sum, part) => sum + part.length, 0) / contentParts.length,
        streamingEnabled: true
      }
    };
  }

  /**
   * Tool-based analysis using autodiscovered tools
   */
  @Node({ type: 'tool', description: 'Perform analysis using autodiscovered tools' })
  @StreamEvent({
    events: [StreamEventType.TOOL_START, StreamEventType.TOOL_COMPLETE, StreamEventType.VALUES],
    filter: { includeDebug: true }
  })
  async performAnalysis(state: WorkflowState): Promise<Partial<WorkflowState>> {
    this.logger.debug('Performing analysis with autodiscovered tools');

    // Use autodiscovered knowledge search tool
    const searchResult = await this.executeTool('search_knowledge', {
      query: 'Phase 2 integration patterns',
      limit: 5
    });

    // Use autodiscovered code analysis tool
    const codeAnalysisResult = await this.executeTool('analyze_code', {
      code: state['content'] || 'No content provided'
    });

    return {
      ...state,
      analysis: {
        searchResults: searchResult,
        codeAnalysis: codeAnalysisResult,
        analyzedAt: new Date(),
        toolsUsed: ['search_knowledge', 'analyze_code']
      }
    };
  }

  /**
   * Critical operation requiring human approval
   */
  @Node({ type: 'human', description: 'Perform critical operation with HITL approval' })
  @RequiresApproval({
    confidenceThreshold: 0.7,
    riskThreshold: ApprovalRiskLevel.MEDIUM,
    message: (state) => `Approve critical operation for: ${state['input']}`,
    timeoutMs: 30000,
    onTimeout: 'escalate',
    chainId: 'phase2-demo-chain',
    riskAssessment: {
      enabled: true,
      factors: ['complexity', 'impact', 'reversibility'],
      evaluator: (state) => ({
        level: state.confidence < 0.5 ? ApprovalRiskLevel.HIGH : ApprovalRiskLevel.MEDIUM,
        factors: ['confidence-level', 'user-impact'],
        score: state.confidence || 0.5
      })
    },
    skipConditions: {
      highConfidence: 0.9,
      userRole: ['admin', 'senior-developer']
    },
    handlers: {
      beforeApproval: async (state) => {
        console.log('Pre-approval validation for:', state.executionId);
      },
      afterApproval: async (state, approved) => {
        console.log('Post-approval processing:', approved ? 'APPROVED' : 'REJECTED');
      }
    }
  })
  @StreamProgress({
    enabled: true,
    granularity: 'fine',
    includeETA: true,
    includeMetrics: true
  })
  async performCriticalOperation(state: WorkflowState): Promise<any> {
    this.logger.log('Executing critical operation with approval checks');

    // Simulate critical operation
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      ...state,
      criticalOperationResult: {
        status: 'completed',
        timestamp: new Date(),
        riskMitigated: true,
        approvalRequired: state.confidence < 0.7
      }
    };
  }

  /**
   * Comprehensive processing using all Phase 2 features
   */
  @Node({ type: 'standard', description: 'Comprehensive processing with all advanced features' })
  @StreamAll({
    token: {
      enabled: true,
      format: 'structured',
      bufferSize: 25,
      processor: (token: string, metadata?: Record<string, unknown>) => {
        // Must return string for token processor
        return `[${new Date().toISOString()}] ${token}`;
      }
    },
    event: {
      events: [StreamEventType.NODE_START, StreamEventType.PROGRESS, StreamEventType.NODE_COMPLETE],
      transformer: (event: any) => ({
        ...event,
        phase: 'comprehensive-processing',
        enriched: true
      })
    },
    progress: {
      enabled: true,
      granularity: 'detailed',
      includeETA: true,
      milestones: [25, 50, 75, 90, 100],
      calculator: (current, total, metadata) => {
        // Custom progress calculation
        const baseProgress = (current / total) * 100;
        const complexityFactor = metadata?.['complexity'] as number || 1;
        return Math.min(baseProgress * complexityFactor, 100);
      },
      format: {
        showPercentage: true,
        showCurrent: true,
        showTotal: true,
        showRate: true,
        precision: 2
      }
    }
  })
  async comprehensiveProcessing(state: WorkflowState): Promise<Partial<WorkflowState>> {
    this.logger.log('Starting comprehensive processing with all advanced features');

    const processingSteps = [
      'Data validation and preprocessing',
      'Advanced analytics and insights',
      'Machine learning model inference',
      'Result aggregation and formatting',
      'Quality assurance and validation'
    ];

    const results = [];

    for (let i = 0; i < processingSteps.length; i++) {
      const step = processingSteps[i];
      this.logger.debug(`Processing step ${i + 1}: ${step}`);

      // Simulate complex processing
      await new Promise(resolve => setTimeout(resolve, 300));

      results.push({
        step: i + 1,
        name: step,
        completed: true,
        timestamp: new Date()
      });

      // Emit progress for milestones
      const progress = ((i + 1) / processingSteps.length) * 100;
      if ([25, 50, 75, 90, 100].includes(Math.round(progress))) {
        this.logger.log(`Milestone reached: ${Math.round(progress)}%`);
      }
    }

    return {
      ...state,
      result: 'All advanced features integrated successfully',
      processingResults: results,
      tokenStats: {
        tokensGenerated: results.length * 10,
        streamingActive: true
      },
      progressInfo: {
        totalSteps: processingSteps.length,
        completedSteps: results.length,
        completionRate: 100
      },
      eventSummary: {
        eventsEmitted: processingSteps.length * 3, // start, progress, complete for each step
        streamingEnabled: true
      }
    };
  }

  // Tool implementations that will be autodiscovered

  /**
   * Knowledge search tool
   */
  @Tool({
    name: 'search_knowledge',
    description: 'Search the knowledge base for relevant information using semantic similarity',
    schema: z.object({
      query: z.string().min(1).describe('The search query'),
      limit: z.number().int().positive().default(10).describe('Maximum number of results'),
      filters: z.object({
        category: z.string().optional(),
        dateRange: z.object({
          start: z.string().datetime().optional(),
          end: z.string().datetime().optional()
        }).optional()
      }).optional().describe('Search filters')
    }),
    agents: [AgentType.ARCHITECT, AgentType.SENIOR_DEVELOPER, AgentType.PRODUCT_MANAGER],
    examples: [
      {
        input: { query: 'microservices architecture patterns', limit: 5 },
        output: [
          { title: 'Microservices Design Patterns', relevance: 0.95 },
          { title: 'Event-Driven Architecture', relevance: 0.87 }
        ],
        description: 'Search for architecture patterns'
      }
    ],
    streaming: false,
    tags: ['search', 'knowledge', 'rag'],
    version: '2.0.0'
  })
  async searchKnowledge(params: {
    query: string;
    limit?: number;
    filters?: {
      category?: string;
      dateRange?: { start?: string; end?: string };
    };
  }) {
    this.logger.debug(`Searching knowledge base for: ${params.query}`);

    // Simulate knowledge search
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      query: params.query,
      results: [
        {
          id: 'kb-001',
          title: `Knowledge about ${params.query}`,
          content: `Detailed information related to ${params.query}`,
          relevance: 0.92,
          category: params.filters?.category || 'general',
          timestamp: new Date()
        },
        {
          id: 'kb-002',
          title: `Advanced ${params.query} concepts`,
          content: `Advanced concepts and best practices for ${params.query}`,
          relevance: 0.88,
          category: 'advanced',
          timestamp: new Date()
        }
      ],
      totalResults: 2,
      searchTime: '500ms'
    };
  }

  /**
   * Code analysis tool
   */
  @Tool({
    name: 'analyze_code',
    description: 'Analyze code for patterns, complexity, and quality metrics',
    schema: z.object({
      code: z.string().min(1).describe('The code to analyze'),
      language: z.string().default('typescript').describe('Programming language'),
      metrics: z.array(z.enum(['complexity', 'maintainability', 'security', 'performance']))
        .default(['complexity', 'maintainability'])
        .describe('Metrics to analyze')
    }),
    agents: [AgentType.ARCHITECT, AgentType.SENIOR_DEVELOPER],
    streaming: true,
    tags: ['analysis', 'code', 'quality'],
    rateLimit: {
      requests: 10,
      window: 60000 // 1 minute
    }
  })
  async analyzeCode(params: {
    code: string;
    language?: string;
    metrics?: ('complexity' | 'maintainability' | 'security' | 'performance')[];
  }) {
    this.logger.debug(`Analyzing ${params.language || 'typescript'} code`);

    // Simulate code analysis
    await new Promise(resolve => setTimeout(resolve, 800));

    const analysis = {
      language: params.language || 'typescript',
      linesOfCode: params.code.split('\n').length,
      complexity: {
        cyclomaticComplexity: Math.floor(Math.random() * 10) + 1,
        cognitiveComplexity: Math.floor(Math.random() * 15) + 1,
        score: Math.random() * 0.5 + 0.5
      },
      maintainability: {
        maintainabilityIndex: Math.floor(Math.random() * 40) + 60,
        technicalDebt: Math.floor(Math.random() * 30),
        score: Math.random() * 0.3 + 0.7
      },
      issues: [
        {
          type: 'warning',
          line: 5,
          message: 'Consider extracting this complex expression',
          severity: 'medium'
        }
      ],
      confidence: Math.random() * 0.2 + 0.8
    };

    return analysis;
  }

  /**
   * Composed tool for comprehensive code review
   */
  @ComposedTool({
    name: 'comprehensive_code_review',
    description: 'Perform comprehensive code review using multiple analysis tools',
    components: ['analyze_code', 'search_knowledge'],
    strategy: 'sequential',
    agents: [AgentType.ARCHITECT, AgentType.SENIOR_DEVELOPER],
    tags: ['review', 'composed', 'analysis']
  })
  async comprehensiveCodeReview(params: { code: string; context?: string }) {
    this.logger.log('Performing comprehensive code review');

    // Step 1: Analyze the code
    const codeAnalysis = await this.analyzeCode({
      code: params.code,
      metrics: ['complexity', 'maintainability', 'security', 'performance']
    });

    // Step 2: Search for related patterns and best practices
    const searchQuery = `${params.context || 'code review'} best practices`;
    const knowledgeResults = await this.searchKnowledge({
      query: searchQuery,
      limit: 3
    });

    // Step 3: Generate comprehensive review
    return {
      codeAnalysis,
      bestPractices: knowledgeResults.results,
      recommendations: [
        {
          priority: 'high',
          category: 'maintainability',
          description: 'Consider refactoring complex methods',
          impact: 'Improved code readability and maintenance'
        },
        {
          priority: 'medium',
          category: 'performance',
          description: 'Optimize data processing loops',
          impact: 'Better runtime performance'
        }
      ],
      overallScore: (codeAnalysis.complexity.score + codeAnalysis.maintainability.score) / 2,
      reviewTimestamp: new Date()
    };
  }

  /**
   * Helper method to execute tools (would be provided by base class)
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    this.logger.debug(`Executing tool: ${toolName}`);

    switch (toolName) {
      case 'search_knowledge':
        return this.searchKnowledge(params);
      case 'analyze_code':
        return this.analyzeCode(params);
      case 'comprehensive_code_review':
        return this.comprehensiveCodeReview(params);
      default:
        throw new Error(`Tool not found: ${toolName}`);
    }
  }

  /**
   * Finalize workflow with comprehensive results
   */
  @Node({ type: 'standard', description: 'Finalize integration demo workflow' })
  @StreamProgress({
    enabled: true,
    granularity: 'coarse',
    includeMetrics: true
  })
  async finalizeWorkflow(state: WorkflowState): Promise<Partial<WorkflowState>> {
    this.logger.log('Finalizing Integration Demo Workflow');

    const endTime = new Date();
    const startTime = state.metadata?.['startTime'] ? new Date(state.metadata['startTime'] as string) : endTime;
    const duration = endTime.getTime() - startTime.getTime();

    return {
      ...state,
      status: 'completed',
      metadata: {
        ...state.metadata,
        endTime,
        duration: `${duration}ms`,
        summary: {
          streamingFeaturesUsed: ['token', 'event', 'progress'],
          toolsExecuted: state['analysis']?.['toolsUsed'] || [],
          approvalRequired: !!state['criticalOperationResult']?.['approvalRequired'],
          advancedFeaturesVerified: true
        }
      }
    };
  }
}