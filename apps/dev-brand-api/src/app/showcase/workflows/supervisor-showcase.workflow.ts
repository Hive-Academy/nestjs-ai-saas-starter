import { Injectable } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';

// Import ALL decorators to demonstrate maximum utilization
import { Workflow } from '@hive-academy/langgraph-functional-api';
import { Task, Entrypoint } from '@hive-academy/langgraph-functional-api';
import {
  StreamToken,
  StreamEvent,
  StreamProgress,
  StreamAll,
  StreamEventType,
} from '@hive-academy/langgraph-streaming';
import {
  RequiresApproval,
  ApprovalRiskLevel,
  EscalationStrategy,
} from '@hive-academy/langgraph-hitl';

// Import types and services
import type {
  ShowcaseAgentState,
  ShowcasePattern,
  ShowcaseWorkflowRequest,
  ShowcaseWorkflowResponse,
} from '../types/showcase.types';

import { ShowcaseCoordinatorService } from '../services/showcase-coordinator.service';
import { ShowcaseStreamingService } from '../services/showcase-streaming.service';
import { ShowcaseMetricsService } from '../services/showcase-metrics.service';

/**
 * 🎯 SUPERVISOR SHOWCASE WORKFLOW - ULTIMATE DECORATOR DEMONSTRATION
 *
 * This workflow demonstrates 100% utilization of our sophisticated decorator ecosystem.
 * It serves as the definitive example of declarative, enterprise-grade AI workflow development.
 *
 * 🚀 DECORATORS DEMONSTRATED:
 *
 * 1. @Workflow - Declarative workflow configuration with all options
 * 2. @Entrypoint - Entry point with retry/timeout/error handling
 * 3. @Task - Dependency-managed tasks with sophisticated configuration
 * 4. @StreamToken - Real-time token streaming for user feedback
 * 5. @StreamEvent - Event-based streaming for system monitoring
 * 6. @StreamProgress - Progress tracking with ETA and milestones
 * 7. @RequiresApproval - Human-in-the-loop approval workflows
 * 8. @StreamAll - Combined streaming capabilities
 *
 * This is the workflow that makes developers and investors say "WOW!"
 */
@Workflow({
  name: 'supervisor-showcase',
  description:
    'Ultimate demonstration of supervisor pattern with ALL decorator capabilities',
  pattern: 'supervisor',

  // Enable ALL enterprise features
  streaming: true,
  cache: true,
  metrics: true,

  // HITL configuration
  hitl: {
    enabled: true,
    timeout: 300000, // 5 minutes
    fallbackStrategy: 'auto-approve',
  },

  // Checkpointing for state persistence
  interruptNodes: ['human_approval', 'quality_check', 'final_review'],

  // Workflow categorization
  tags: ['showcase', 'supervisor', 'enterprise', 'demo'],
})
@Injectable()
export class SupervisorShowcaseWorkflow {
  constructor(
    private readonly coordinatorService: ShowcaseCoordinatorService,
    private readonly streamingService: ShowcaseStreamingService,
    private readonly metricsService: ShowcaseMetricsService
  ) {}

  /**
   * 🚀 ENTRYPOINT: Workflow initialization with retry and timeout
   *
   * Demonstrates:
   * - @Entrypoint decorator with comprehensive configuration
   * - @StreamEvent for initialization tracking
   * - @StreamProgress for startup progress
   */
  @Entrypoint({
    timeout: 30000, // 30 seconds
    retryCount: 3,
    errorHandler: 'handleInitializationError',
  })
  @StreamEvent({
    events: [
      StreamEventType.NODE_START,
      StreamEventType.NODE_COMPLETE,
      StreamEventType.VALUES,
      StreamEventType.UPDATES,
    ],
    bufferSize: 100,
    delivery: 'at-least-once',
  })
  @StreamProgress({
    enabled: true,
    interval: 1000,
    granularity: 'fine',
    includeETA: true,
    milestones: [25, 50, 75, 100],
  })
  async initializeShowcase(
    request: ShowcaseWorkflowRequest
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🎯 Initializing Supervisor Showcase Workflow...');

    // Start metrics collection
    const executionId = await this.metricsService.startExecution({
      workflowName: 'supervisor-showcase',
      pattern: 'supervisor',
      demonstrationMode: request.demonstrationMode,
    });

    // Initialize streaming
    await this.streamingService.initializeSession(executionId);

    // Create initial state with comprehensive context
    const initialState: Partial<ShowcaseAgentState> = {
      showcaseId: executionId,
      demonstrationMode: request.demonstrationMode,
      currentPattern: 'supervisor',
      activeCapabilities: ['coordination', 'analysis', 'generation'],
      executionStartTime: Date.now(),
      metricsCollected: {
        totalDuration: 0,
        agentSwitches: 0,
        toolInvocations: 0,
        memoryAccesses: 0,
        averageResponseTime: 0,
        peakMemoryUsage: 0,
        concurrentAgents: 1,
        successRate: 0,
        errorRate: 0,
        approvalRate: 0,
        tokensStreamed: 0,
        streamingLatency: 0,
        connectionStability: 1.0,
      },
      streamingEnabled: request.enableStreaming ?? true,
      streamBuffer: [],
      pendingApprovals: [],
      approvalHistory: [],
      memoryContext: {
        similarExecions: [],
        relevantDocs: [],
        agentRelationships: [],
        executionPaths: [],
        recentInteractions: [],
        learningPoints: [],
      },
      errors: [],
      recoveryAttempts: 0,
      messages: [
        new HumanMessage(
          `Starting ${request.demonstrationMode} demonstration of supervisor pattern`
        ),
      ],
      currentAgentId: 'supervisor',
      input: request.input,
    };

    console.log('✅ Supervisor showcase initialized successfully');
    return initialState;
  }

  /**
   * 🤖 AGENT COORDINATION TASK
   *
   * Demonstrates:
   * - @Task decorator with dependency management
   * - @StreamToken for real-time agent selection streaming
   * - Multi-agent coordination logic
   */
  @Task({
    name: 'coordinate_agents',
    dependsOn: ['initializeShowcase'],
    timeout: 60000,
    retryCount: 2,
    metadata: { capability: 'coordination' },
  })
  @StreamToken({
    enabled: true,
    format: 'structured',
    bufferSize: 50,
    includeMetadata: true,
    processor: (token, metadata) => `[COORDINATION] ${token}`,
  })
  async coordinateAgents(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🤖 Coordinating showcase agents...');

    // Demonstrate intelligent agent selection
    const selectedAgents = await this.coordinatorService.selectOptimalAgents({
      input: state.input || '',
      demonstrationMode: state.demonstrationMode,
      activeCapabilities: state.activeCapabilities,
      context: state.memoryContext,
    });

    // Stream coordination decisions
    await this.streamingService.streamCoordinationEvent({
      executionId: state.showcaseId,
      selectedAgents,
      reasoning:
        'Selected agents based on input analysis and capability matching',
      confidence: 0.95,
    });

    return {
      ...state,
      metricsCollected: {
        ...state.metricsCollected,
        agentSwitches:
          state.metricsCollected.agentSwitches + selectedAgents.length,
      },
      messages: [
        ...state.messages,
        new HumanMessage(
          `Coordinated ${selectedAgents.length} agents for execution`
        ),
      ],
    };
  }

  /**
   * 🧠 INTELLIGENT ANALYSIS TASK
   *
   * Demonstrates:
   * - @Task with complex dependencies
   * - @StreamAll for comprehensive streaming
   * - Advanced AI processing patterns
   */
  @Task({
    name: 'intelligent_analysis',
    dependsOn: ['coordinate_agents'],
    timeout: 120000, // 2 minutes for complex analysis
    retryCount: 1,
    metadata: {
      capability: 'analysis',
      complexity: 'advanced',
      expectedDuration: 90000,
    },
  })
  @StreamAll({
    token: {
      enabled: true,
      format: 'text',
      bufferSize: 100,
      filter: { minLength: 1, excludeWhitespace: true },
    },
    event: {
      events: [
        StreamEventType.VALUES,
        StreamEventType.UPDATES,
        StreamEventType.EVENTS,
      ],
      bufferSize: 50,
      transformer: (event) => ({
        ...(event as Record<string, unknown>),
        analysisStage: true,
      }),
    },
    progress: {
      enabled: true,
      granularity: 'detailed',
      includeETA: true,
      includeMetrics: true,
      milestones: [10, 25, 50, 75, 90, 100],
    },
  })
  async performIntelligentAnalysis(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🧠 Performing intelligent analysis...');

    // Simulate sophisticated AI analysis with streaming
    const analysisSteps = [
      'Analyzing input context and requirements',
      'Extracting key entities and relationships',
      'Performing semantic analysis and classification',
      'Generating insights and recommendations',
      'Validating results against best practices',
    ];

    const analysisResults = [];

    for (let i = 0; i < analysisSteps.length; i++) {
      const step = analysisSteps[i];
      console.log(`  📊 ${step}...`);

      // Stream analysis progress
      await this.streamingService.streamAnalysisProgress({
        executionId: state.showcaseId,
        step: i + 1,
        total: analysisSteps.length,
        description: step,
        progress: ((i + 1) / analysisSteps.length) * 100,
      });

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      analysisResults.push({
        step: i + 1,
        description: step,
        result: `Analysis result for: ${step}`,
        confidence: 0.85 + Math.random() * 0.15,
      });
    }

    return {
      ...state,
      metricsCollected: {
        ...state.metricsCollected,
        memoryAccesses:
          state.metricsCollected.memoryAccesses + analysisSteps.length,
      },
      messages: [
        ...state.messages,
        new HumanMessage('Intelligent analysis completed successfully'),
      ],
      analysis: analysisResults,
    };
  }

  /**
   * 🎨 CONTENT GENERATION TASK
   *
   * Demonstrates:
   * - @Task with sophisticated error handling
   * - @StreamToken with custom processing for content generation
   * - Real-time streaming of AI-generated content
   */
  @Task({
    name: 'generate_content',
    dependsOn: ['intelligent_analysis'],
    timeout: 180000, // 3 minutes for content generation
    retryCount: 2,
    errorHandler: 'handleContentGenerationError',
    metadata: {
      capability: 'generation',
      contentType: 'showcase',
      streaming: true,
    },
  })
  @StreamToken({
    enabled: true,
    format: 'text',
    bufferSize: 25,
    flushInterval: 200,
    includeMetadata: true,
    processor: (token, metadata) => {
      // Custom token processing for content generation
      const timestamp = new Date().toISOString();
      return `[${timestamp}] ${token}`;
    },
    filter: {
      minLength: 1,
      excludeWhitespace: false, // Include whitespace for natural content flow
      pattern: /^[a-zA-Z0-9\s.,!?\-_]+$/, // Allow common punctuation
    },
  })
  async generateContent(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🎨 Generating showcase content...');

    // Simulate AI content generation with token streaming
    const contentSections = [
      'Executive Summary',
      'Technical Architecture',
      'Feature Demonstration',
      'Performance Metrics',
      'Implementation Guide',
    ];

    const generatedContent = [];

    for (const section of contentSections) {
      console.log(`  ✏️  Generating ${section}...`);

      // Simulate token-by-token generation
      const sectionContent = await this.simulateTokenGeneration(
        state.showcaseId,
        `### ${section}\n\nThis section demonstrates the sophisticated capabilities of our ${section.toLowerCase()} system. Our advanced AI architecture provides enterprise-grade functionality with real-time streaming, intelligent coordination, and comprehensive monitoring capabilities.\n\n`,
        50 // tokens per section
      );

      generatedContent.push({
        section,
        content: sectionContent,
        wordCount: sectionContent.split(' ').length,
        generatedAt: new Date().toISOString(),
      });
    }

    return {
      ...state,
      metricsCollected: {
        ...state.metricsCollected,
        tokensStreamed: generatedContent.reduce(
          (total, section) => total + section.content.length,
          0
        ),
      },
      messages: [
        ...state.messages,
        new HumanMessage(
          `Generated ${generatedContent.length} content sections`
        ),
      ],
      generatedContent,
    };
  }

  /**
   * ✅ QUALITY ASSURANCE WITH HUMAN APPROVAL
   *
   * Demonstrates:
   * - @RequiresApproval with sophisticated HITL configuration
   * - @StreamEvent for approval workflow tracking
   * - Enterprise-grade quality control patterns
   */
  @Task({
    name: 'quality_assurance',
    dependsOn: ['generate_content'],
    timeout: 300000, // 5 minutes including human approval time
    retryCount: 1,
    metadata: {
      capability: 'approval',
      requiresHuman: true,
      criticalPath: true,
    },
  })
  @RequiresApproval({
    confidenceThreshold: 0.8,
    message: (state) =>
      `Please review the generated showcase content for quality assurance. Demonstration mode: ${state.demonstrationMode}`,
    timeoutMs: 180000, // 3 minutes for human response
    onTimeout: 'escalate',
    escalationStrategy: EscalationStrategy.CHAIN,

    // Advanced approval configuration
    riskAssessment: {
      enabled: true,
      factors: [
        'content_quality',
        'technical_accuracy',
        'demonstration_completeness',
      ],
      evaluator: (state) => ({
        level: ApprovalRiskLevel.MEDIUM,
        factors: ['Generated content requires human validation'],
        score: 0.7,
      }),
    },

    skipConditions: {
      highConfidence: 0.95,
      safeMode: true,
      custom: (state) => state.demonstrationMode === 'basic',
    },

    metadata: (state) => ({
      contentSections: (state.generatedContent as any[])?.length || 0,
      analysisResults: (state.analysis as any[])?.length || 0,
      executionTime: Date.now() - (state.executionStartTime as number),
      agentsSwitched: (state.metricsCollected as any).agentSwitches,
    }),
  })
  @StreamEvent({
    events: [
      'APPROVAL_REQUESTED',
      'APPROVAL_RECEIVED',
      StreamEventType.VALUES,
    ] as any,
    bufferSize: 20,
    filter: { includeDebug: false },
    transformer: (event) => ({
      ...(event as Record<string, unknown>),
      workflowStage: 'quality_assurance',
      approvalRequired: true,
    }),
  })
  async performQualityAssurance(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('✅ Performing quality assurance with human approval...');

    // Create approval request
    const approvalRequest = {
      id: `approval-${state.showcaseId}-${Date.now()}`,
      type: 'content' as const,
      title: 'Showcase Content Quality Review',
      description:
        'Review generated showcase content for accuracy and completeness',
      requestedBy: 'supervisor-showcase-workflow',
      requestedAt: Date.now(),

      options: [
        {
          id: 'approve',
          label: 'Approve Content',
          description:
            'Content meets quality standards and is ready for final processing',
          consequences: ['Content will be finalized and prepared for delivery'],
          confidence: 0.9,
        },
        {
          id: 'revise',
          label: 'Request Revisions',
          description: 'Content needs improvements before approval',
          consequences: ['Content will be regenerated with improvements'],
          confidence: 0.7,
        },
        {
          id: 'reject',
          label: 'Reject Content',
          description:
            'Content does not meet standards and needs complete rework',
          consequences: ['Workflow will restart from analysis phase'],
          confidence: 0.3,
        },
      ],

      context: {
        agentState: {
          contentSections: (state.generatedContent as any[])?.length || 0,
          analysisQuality: (state.analysis as any[])?.length || 0,
        } as Partial<ShowcaseAgentState>,
        reasoning: 'Human validation required for showcase content quality',
        confidence: 0.85,
        alternatives: [
          'Auto-approve based on high confidence',
          'Skip approval for basic mode',
        ],
      },

      timeout: 180000, // 3 minutes
      fallbackAction: 'auto-approve' as 'auto-approve' | 'reject' | 'retry',
    };

    // Add to pending approvals
    const updatedState = {
      ...state,
      pendingApprovals: [...state.pendingApprovals, approvalRequest],
      messages: [
        ...state.messages,
        new HumanMessage(
          'Quality assurance initiated - human approval requested'
        ),
      ],
    };

    // Stream approval request
    await this.streamingService.streamApprovalRequest({
      executionId: state.showcaseId,
      approval: approvalRequest,
    });

    console.log('🔔 Human approval requested for quality assurance');
    return updatedState;
  }

  /**
   * 🏁 FINALIZATION TASK
   *
   * Demonstrates:
   * - @Task with final processing
   * - @StreamProgress with completion tracking
   * - Comprehensive metrics collection and reporting
   */
  @Task({
    name: 'finalize_showcase',
    dependsOn: ['quality_assurance'],
    timeout: 60000,
    retryCount: 0, // No retries for finalization
    metadata: {
      capability: 'monitoring',
      finalTask: true,
      generateReport: true,
    },
  })
  @StreamProgress({
    enabled: true,
    granularity: 'coarse',
    includeETA: false,
    includeMetrics: true,
    format: {
      showPercentage: true,
      showCurrent: true,
      showTotal: true,
      precision: 0,
    },
  })
  async finalizeShowcase(
    state: ShowcaseAgentState
  ): Promise<ShowcaseWorkflowResponse> {
    console.log('🏁 Finalizing supervisor showcase workflow...');

    // Calculate final metrics
    const finalDuration = Date.now() - state.executionStartTime;
    const finalMetrics = {
      ...state.metricsCollected,
      totalDuration: finalDuration,
      successRate: 1.0, // Successful completion
      averageResponseTime:
        finalDuration / (state.metricsCollected.agentSwitches || 1),
    };

    // Generate comprehensive execution report
    const executionReport = {
      workflowPattern: 'supervisor' as ShowcasePattern,
      demonstrationMode: state.demonstrationMode,
      capabilitiesUsed: state.activeCapabilities,
      decoratorsApplied: [
        '@Workflow',
        '@Entrypoint',
        '@Task',
        '@StreamToken',
        '@StreamEvent',
        '@StreamProgress',
        '@StreamAll',
        '@RequiresApproval',
      ],
      performanceMetrics: finalMetrics,
      qualityScore: 0.95,
      humanInteractions: state.approvalHistory.length,
      streamingEvents: state.streamBuffer.length,
    };

    // Stream completion event
    await this.streamingService.streamWorkflowCompletion({
      executionId: state.showcaseId,
      status: 'completed',
      metrics: finalMetrics,
      report: executionReport,
    });

    // Stop metrics collection
    await this.metricsService.stopExecution(state.showcaseId, finalMetrics);

    console.log('🎯 Supervisor showcase workflow completed successfully!');

    // Return comprehensive response
    const response: ShowcaseWorkflowResponse = {
      id: state.showcaseId,
      pattern: 'supervisor',
      status: 'completed',

      output: `Supervisor Showcase completed successfully!
              Demonstrated ${executionReport.decoratorsApplied.length} decorators
              with ${state.activeCapabilities.length} capabilities.`,

      finalState: state,

      executionPath: [
        'initializeShowcase',
        'coordinateAgents',
        'intelligentAnalysis',
        'generateContent',
        'qualityAssurance',
        'finalizeShowcase',
      ],

      agentsUsed: ['supervisor', 'demo-showcase', 'advanced-showcase'],
      toolsInvoked: ['coordination-tool', 'analysis-tool', 'content-generator'],

      duration: finalDuration,
      metrics: finalMetrics,

      streamEvents: state.streamBuffer,
      approvals: state.approvalHistory,
      errors: state.errors,

      streamingUrl: `ws://localhost:3000/showcase/stream/${state.showcaseId}`,
      timeTravelUrl: `http://localhost:3000/showcase/timetravel/${state.showcaseId}`,
      metricsUrl: `http://localhost:3000/showcase/metrics/${state.showcaseId}`,
    };

    return response;
  }

  /**
   * Error handlers for sophisticated error management
   */

  async handleInitializationError(
    error: Error,
    state?: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.error('❌ Initialization error:', error.message);

    return {
      ...state,
      errors: [
        ...(state?.errors || []),
        {
          id: `init-error-${Date.now()}`,
          type: 'workflow',
          severity: 'high',
          message: error.message,
          stack: error.stack,
          context: { phase: 'initialization' },
          occurredAt: Date.now(),
          recoverable: true,
          recoveryStrategy: 'retry_with_basic_mode',
        },
      ],
      recoveryAttempts: (state?.recoveryAttempts || 0) + 1,
    };
  }

  async handleContentGenerationError(
    error: Error,
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.error('❌ Content generation error:', error.message);

    return {
      ...state,
      errors: [
        ...state.errors,
        {
          id: `content-error-${Date.now()}`,
          type: 'agent',
          severity: 'medium',
          message: error.message,
          context: { phase: 'content_generation', retryable: true },
          occurredAt: Date.now(),
          recoverable: true,
          recoveryStrategy: 'fallback_to_template',
        },
      ],
    };
  }

  /**
   * Helper method to simulate token-by-token content generation with streaming
   */
  private async simulateTokenGeneration(
    executionId: string,
    content: string,
    tokenCount: number
  ): Promise<string> {
    const words = content.split(' ');
    const tokensPerWord = Math.ceil(tokenCount / words.length);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Stream each word as multiple tokens
      for (let j = 0; j < tokensPerWord; j++) {
        const tokenPart = j === 0 ? word : '';
        if (tokenPart) {
          await this.streamingService.streamToken({
            executionId,
            token: tokenPart + (i < words.length - 1 ? ' ' : ''),
            metadata: {
              wordIndex: i,
              tokenIndex: j,
              sectionProgress: (i / words.length) * 100,
            },
          });

          // Small delay to simulate natural generation
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    return content;
  }
}
