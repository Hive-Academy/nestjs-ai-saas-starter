import { HumanMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';

// Import ALL decorators to demonstrate maximum utilization
import { Entrypoint, Task, Workflow } from '@hive-academy/langgraph-functional-api';
import {
  ApprovalRiskLevel,
  EscalationStrategy,
  RequiresApproval,
} from '@hive-academy/langgraph-hitl';
import {
  StreamAll,
  StreamEvent,
  StreamEventType,
  StreamProgress,
  StreamToken,
} from '@hive-academy/langgraph-streaming';

// Import types and services
import type {
  ShowcaseAgentState,
  ShowcasePattern,
  ShowcaseWorkflowRequest,
  ShowcaseWorkflowResponse,
} from '../types/showcase.types';

import { ShowcaseAnalysisService } from '../services/showcase-analysis.service';
import { ShowcaseContentService } from '../services/showcase-content.service';
import { ShowcaseMetricsService } from '../services/showcase-metrics.service';
import { ShowcaseNetworkService } from '../services/showcase-network.service';
import { ShowcaseQualityService } from '../services/showcase-quality.service';

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
    private readonly metricsService: ShowcaseMetricsService,
    private readonly analysisService: ShowcaseAnalysisService,
    private readonly contentService: ShowcaseContentService,
    private readonly qualityService: ShowcaseQualityService,
    private readonly networkService: ShowcaseNetworkService
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

    // Streaming is handled automatically by @StreamEvent and other decorators

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
   * 🤖 AGENT COORDINATION TASK - REAL MULTI-AGENT COORDINATION
   *
   * Demonstrates:
   * - @Task decorator with dependency management
   * - @StreamToken for real-time agent selection streaming
   * - ACTUAL multi-agent coordination using our MultiAgentCoordinatorService
   * - REAL agent network setup and execution
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
    state: Partial<ShowcaseAgentState>
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🤖 Coordinating REAL showcase agents with actual multi-agent system...');

    // Use NetworkService for multi-agent coordination
    const networkResult = await this.networkService.setupShowcaseNetwork(
      state.showcaseId || 'unknown',
      state.demonstrationMode || 'basic'
    );

    // Update state with network results
    return this.networkService.updateStateWithNetwork(state, networkResult);
  }

  /**
   * 🧠 INTELLIGENT ANALYSIS TASK - REAL LLM-POWERED ANALYSIS
   *
   * Demonstrates:
   * - @Task with complex dependencies
   * - @StreamAll for comprehensive streaming
   * - ACTUAL LLM integration for intelligent analysis
   * - REAL agent network execution with streaming responses
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
    state: Partial<ShowcaseAgentState>
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🧠 Performing REAL LLM-powered intelligent analysis...');

    // Use AnalysisService for intelligent analysis
    const networkId = state.networkId;
    if (networkId) {
      const analysisResult = await this.analysisService.executeAnalysisWorkflow(
        networkId,
        state.input || '',
        state.activeCapabilities || [],
        state.demonstrationMode || 'basic'
      );

      return this.analysisService.updateStateWithAnalysis(state, analysisResult);
    } else {
      // Fallback mode
      const fallbackAnalysis = this.analysisService.generateStructuredAnalysis(state.input || '');
      const failedResult = {
        success: false,
        content: '',
        metrics: { agentExecutions: 0, totalTokens: 0, agentsUsed: [], toolsInvoked: [], executionTime: 0 },
        error: new Error('No agent network available')
      };
      return this.analysisService.updateStateWithAnalysis(state, failedResult, fallbackAnalysis);
    }
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
    state: Partial<ShowcaseAgentState>
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🎨 Generating showcase content...');

    // Use ContentService for content generation
    const contentResult = await this.contentService.generateShowcaseContent(
      state.showcaseId || 'unknown'
    );

    return this.contentService.updateStateWithContent(state, contentResult);
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
    state: Partial<ShowcaseAgentState>
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('✅ Performing quality assurance with human approval...');

    // Use QualityService for quality assurance
    const approvalRequest = this.qualityService.createApprovalRequest(
      state.showcaseId || 'unknown',
      state
    );

    return this.qualityService.updateStateWithApproval(state, approvalRequest);
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
    state: Partial<ShowcaseAgentState>
  ): Promise<ShowcaseWorkflowResponse> {
    console.log('🏁 Finalizing supervisor showcase workflow...');

    // Calculate final metrics
    const finalDuration = Date.now() - (state.executionStartTime || Date.now());
    const finalMetrics = {
      totalDuration: finalDuration,
      agentSwitches: state.metricsCollected?.agentSwitches || 0,
      toolInvocations: state.metricsCollected?.toolInvocations || 0,
      memoryAccesses: state.metricsCollected?.memoryAccesses || 0,
      averageResponseTime: finalDuration / Math.max((state.metricsCollected?.agentSwitches || 1), 1),
      peakMemoryUsage: state.metricsCollected?.peakMemoryUsage || 0,
      concurrentAgents: state.metricsCollected?.concurrentAgents || 1,
      successRate: 1.0, // Successful completion
      errorRate: state.metricsCollected?.errorRate || 0,
      approvalRate: state.metricsCollected?.approvalRate || 1.0,
      tokensStreamed: state.metricsCollected?.tokensStreamed || 0,
      streamingLatency: state.metricsCollected?.streamingLatency || 0,
      connectionStability: state.metricsCollected?.connectionStability || 1.0,
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
      humanInteractions: state.approvalHistory?.length || 0,
      streamingEvents: state.streamBuffer?.length || 0,
    };

    // Workflow completion is handled automatically by @StreamProgress decorator
    console.log('🎯 Workflow completion event generated');

    // Cleanup network resources
    if (state.networkId) {
      await this.networkService.cleanupNetwork(state.networkId);
    }

    // Stop metrics collection
    await this.metricsService.stopExecution(state.showcaseId || 'unknown', finalMetrics);

    console.log('🎯 Supervisor showcase workflow completed successfully!');

    // Return comprehensive response
    const response: ShowcaseWorkflowResponse = {
      id: state.showcaseId || 'unknown',
      pattern: 'supervisor',
      status: 'completed',

      output: `Supervisor Showcase completed successfully!
              Demonstrated ${executionReport.decoratorsApplied.length} decorators
              with ${state.activeCapabilities?.length || 0} capabilities.`,

      finalState: state as ShowcaseAgentState,

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

      streamEvents: state.streamBuffer || [],
      approvals: state.approvalHistory || [],
      errors: state.errors || [],

      streamingUrl: `ws://localhost:3000/showcase/stream/${state.showcaseId || 'unknown'}`,
      timeTravelUrl: `http://localhost:3000/showcase/timetravel/${state.showcaseId || 'unknown'}`,
      metricsUrl: `http://localhost:3000/showcase/metrics/${state.showcaseId || 'unknown'}`,
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

}
