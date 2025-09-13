import { Injectable } from '@nestjs/common';
import {
  Workflow,
  Task,
  Entrypoint,
} from '@hive-academy/langgraph-functional-api';
import {
  StreamEvent,
  StreamProgress,
  StreamEventType,
} from '@hive-academy/langgraph-streaming';
import { HumanMessage } from '@langchain/core/messages';
import type {
  ShowcaseAgentState,
  ShowcaseWorkflowRequest,
  ShowcaseWorkflowResponse,
} from '../types/showcase.types';

/**
 * 🐝 SWARM SHOWCASE WORKFLOW - Peer-to-Peer Coordination Demonstration
 *
 * This workflow demonstrates the swarm pattern where agents collaborate
 * as peers without central coordination, showcasing distributed intelligence
 * and emergent behavior patterns.
 *
 * Key Features:
 * - Peer-to-peer agent coordination
 * - Distributed decision making
 * - Emergent behavior demonstration
 * - Collaborative intelligence patterns
 * - Self-organizing agent networks
 */
@Workflow() // ✅ Zero-config! Inherits from WorkflowEngineModule.forRoot()
@Injectable()
export class SwarmShowcaseWorkflow {
  /**
   * 🚀 SWARM INITIALIZATION
   *
   * Sets up the distributed agent network for peer-to-peer coordination
   */
  @Entrypoint() // ✅ Zero-config! Inherits timeout from FunctionalApiModule.forRoot()
  @StreamEvent() // ✅ Zero-config! Inherits buffer settings from StreamingModule.forRoot()
  async initializeSwarm(
    request: ShowcaseWorkflowRequest
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log(
      '🐝 Initializing Swarm Showcase - Peer-to-Peer Coordination...'
    );

    const swarmId = `swarm-${Date.now()}`;

    // Initialize distributed agent network
    const swarmState: Partial<ShowcaseAgentState> = {
      showcaseId: swarmId,
      demonstrationMode: request.demonstrationMode,
      currentPattern: 'swarm',
      activeCapabilities: ['coordination', 'analysis', 'generation', 'memory'],
      executionStartTime: Date.now(),

      // Swarm-specific state
      swarmConfiguration: {
        peerAgents: [
          'demo-showcase',
          'specialist-showcase',
          'advanced-showcase',
        ],
        coordinationMode: 'distributed',
        consensusMechanism: 'weighted-voting',
        emergentBehavior: true,
        autonomousOperation: true,
      },

      metricsCollected: {
        totalDuration: 0,
        agentSwitches: 0,
        toolInvocations: 0,
        memoryAccesses: 0,
        averageResponseTime: 0,
        peakMemoryUsage: 0,
        concurrentAgents: 3, // Multiple agents active simultaneously
        successRate: 0,
        errorRate: 0,
        approvalRate: 1.0, // Auto-approval in swarm mode
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
        agentRelationships: [
          {
            sourceAgent: 'demo-showcase',
            targetAgent: 'specialist-showcase',
            relationshipType: 'collaborates',
            strength: 0.8,
            interactionCount: 0,
          },
          {
            sourceAgent: 'specialist-showcase',
            targetAgent: 'advanced-showcase',
            relationshipType: 'coordinates',
            strength: 0.9,
            interactionCount: 0,
          },
          {
            sourceAgent: 'advanced-showcase',
            targetAgent: 'demo-showcase',
            relationshipType: 'delegates_to',
            strength: 0.7,
            interactionCount: 0,
          },
        ],
        executionPaths: [],
        recentInteractions: [],
        learningPoints: [],
      },

      errors: [],
      recoveryAttempts: 0,
      messages: [
        new HumanMessage(
          `Swarm initialized with ${3} peer agents in distributed coordination mode`
        ),
      ],
      // currentAgentId: 'swarm-coordinator', // Removing non-existent property
      input: request.input,
    };

    console.log(
      '✅ Swarm network initialized - agents ready for peer coordination'
    );
    return swarmState;
  }

  /**
   * 🤝 PEER COORDINATION TASK
   *
   * Demonstrates distributed agent coordination without central control
   */
  @Task({
    name: 'establish_peer_coordination',
    dependsOn: ['initializeSwarm'],
    timeout: 90000,
    retryCount: 1,
    metadata: { swarmPhase: 'coordination', autonomy: 'high' },
  })
  @StreamProgress({
    enabled: true,
    granularity: 'fine',
    includeETA: true,
    milestones: [20, 40, 60, 80, 100],
    format: { showPercentage: true, showRate: true },
  })
  async establishPeerCoordination(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🤝 Establishing peer-to-peer coordination...');

    const coordinationPhases = [
      'Agent Discovery and Handshaking',
      'Capability Broadcasting',
      'Task Distribution Negotiation',
      'Consensus Protocol Establishment',
      'Distributed Execution Planning',
    ];

    const peerCoordinationResults = {
      networkTopology: {
        peerCount: state.swarmConfiguration?.peerAgents.length || 3,
        connectionDensity: 1.0, // Fully connected network
        networkDiameter: 1, // Direct peer connections
        clusteringCoefficient: 1.0, // Complete graph
      },

      coordinationProtocol: {
        consensusMechanism: 'weighted-voting',
        votingWeights: {
          'demo-showcase': 0.3,
          'specialist-showcase': 0.4,
          'advanced-showcase': 0.3,
        },
        decisionThreshold: 0.6,
        timeoutPolicy: '30s for consensus',
      },

      taskDistribution: {
        strategy: 'capability-based-auction',
        distributionEfficiency: 0.87,
        loadBalancing: 'dynamic',
        redundancyLevel: 'medium',
      },

      emergentBehaviors: [
        'Self-organizing task prioritization',
        'Adaptive capability sharing',
        'Distributed quality assurance',
        'Collective intelligence emergence',
        'Autonomous error recovery',
      ],
    };

    // Simulate peer coordination phases
    for (const [index, phase] of coordinationPhases.entries()) {
      console.log(`  🤝 ${phase}...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const progress = ((index + 1) / coordinationPhases.length) * 100;
      console.log(`    ✅ ${phase} completed (${progress.toFixed(1)}%)`);
    }

    return {
      ...state,
      peerCoordinationResults,
      metricsCollected: {
        ...state.metricsCollected,
        agentSwitches: coordinationPhases.length,
        concurrentAgents: 3,
      },
      messages: [
        ...state.messages,
        new HumanMessage('Peer coordination established successfully'),
        new HumanMessage(
          `Network topology: ${peerCoordinationResults.networkTopology.peerCount} fully-connected peers`
        ),
        new HumanMessage(
          `Consensus mechanism: ${peerCoordinationResults.coordinationProtocol.consensusMechanism}`
        ),
        new HumanMessage(
          `${peerCoordinationResults.emergentBehaviors.length} emergent behaviors identified`
        ),
      ],
    };
  }

  /**
   * 🧠 DISTRIBUTED INTELLIGENCE TASK
   *
   * Demonstrates collective problem-solving across peer agents
   */
  @Task({
    name: 'distributed_intelligence',
    dependsOn: ['establish_peer_coordination'],
    timeout: 120000,
    retryCount: 1,
    metadata: { swarmPhase: 'intelligence', collaboration: 'high' },
  })
  @StreamEvent({
    events: [
      StreamEventType.VALUES,
      StreamEventType.UPDATES,
      'SWARM_CONSENSUS',
    ] as any,
    bufferSize: 100,
    transformer: (event) => ({
      ...(event as Record<string, unknown>),
      distributedMode: true,
      collectiveIntelligence: true,
    }),
  })
  async executeDistributedIntelligence(
    state: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.log('🧠 Executing distributed intelligence across peer network...');

    // Simulate parallel processing by multiple agents
    const intelligenceTasks = [
      {
        agent: 'demo-showcase',
        task: 'Basic Analysis & Pattern Recognition',
        specialty: 'foundational-analysis',
        duration: 3000,
      },
      {
        agent: 'specialist-showcase',
        task: 'Memory Context & Tool Optimization',
        specialty: 'contextual-intelligence',
        duration: 4000,
      },
      {
        agent: 'advanced-showcase',
        task: 'Complex Synthesis & Quality Assurance',
        specialty: 'advanced-synthesis',
        duration: 5000,
      },
    ];

    // Execute tasks concurrently (simulated)
    console.log('  🧠 Launching distributed intelligence tasks...');

    const intelligencePromises = intelligenceTasks.map(async (task) => {
      console.log(`    ${task.agent}: ${task.task}...`);
      await new Promise((resolve) => setTimeout(resolve, task.duration));

      return {
        agent: task.agent,
        result: `${task.task} completed with ${task.specialty} expertise`,
        confidence: 0.85 + Math.random() * 0.12, // 0.85-0.97
        processingTime: task.duration,
        insights: Math.floor(Math.random() * 5) + 3, // 3-7 insights
        qualityScore: 0.88 + Math.random() * 0.1, // 0.88-0.98
      };
    });

    const intelligenceResults = await Promise.all(intelligencePromises);

    // Simulate consensus building
    console.log('  🤝 Building consensus from distributed results...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const consensusResult = {
      consensusReached: true,
      consensusScore: 0.91,
      votingResults: {
        'demo-showcase': { vote: 'approve', weight: 0.3, confidence: 0.89 },
        'specialist-showcase': {
          vote: 'approve',
          weight: 0.4,
          confidence: 0.93,
        },
        'advanced-showcase': { vote: 'approve', weight: 0.3, confidence: 0.95 },
      },

      collectiveIntelligence: {
        combinedInsights: intelligenceResults.reduce(
          (sum, r) => sum + r.insights,
          0
        ),
        averageConfidence:
          intelligenceResults.reduce((sum, r) => sum + r.confidence, 0) /
          intelligenceResults.length,
        qualityAmplification: 1.15, // 15% improvement through collaboration
        emergentPatterns: [
          'Cross-agent capability synergy',
          'Distributed quality enhancement',
          'Collective confidence boosting',
          'Parallel processing optimization',
        ],
      },

      distributedResults: intelligenceResults,
    };

    return {
      ...state,
      distributedIntelligence: consensusResult,
      metricsCollected: {
        ...state.metricsCollected,
        memoryAccesses:
          state.metricsCollected.memoryAccesses +
          intelligenceResults.length * 2,
        toolInvocations:
          state.metricsCollected.toolInvocations +
          intelligenceResults.length * 3,
      },
      messages: [
        ...state.messages,
        new HumanMessage('🧠 Distributed intelligence execution completed'),
        new HumanMessage(
          `Consensus reached with ${consensusResult.consensusScore} agreement score`
        ),
        new HumanMessage(
          `${consensusResult.collectiveIntelligence.combinedInsights} total insights generated`
        ),
        new HumanMessage(
          `Quality amplified by ${(
            (consensusResult.collectiveIntelligence.qualityAmplification - 1) *
            100
          ).toFixed(0)}% through collaboration`
        ),
      ],
    };
  }

  /**
   * 🎯 SWARM CONVERGENCE
   *
   * Demonstrates how distributed agents converge on optimal solutions
   */
  @Task({
    name: 'swarm_convergence',
    dependsOn: ['distributed_intelligence'],
    timeout: 60000,
    retryCount: 0,
    metadata: { swarmPhase: 'convergence', finalPhase: true },
  })
  @StreamProgress({
    enabled: true,
    granularity: 'coarse',
    includeMetrics: true,
    format: { showPercentage: true, showTotal: true },
  })
  async achieveSwarmConvergence(
    state: ShowcaseAgentState
  ): Promise<ShowcaseWorkflowResponse> {
    console.log(
      '🎯 Achieving swarm convergence - finalizing distributed results...'
    );

    // Simulate convergence algorithm
    const convergenceSteps = [
      'Solution Space Exploration',
      'Local Optima Identification',
      'Global Consensus Building',
      'Solution Refinement',
      'Quality Validation',
    ];

    const convergenceResults = {
      convergenceAchieved: true,
      convergenceTime: 8500, // ms
      finalSolution: {
        qualityScore: 0.94,
        consensusLevel: 0.97,
        distributedOptimality: 0.92,
        emergentValue: 1.18, // 18% improvement over individual agents
      },

      swarmMetrics: {
        participationRate: 100, // % of agents participated
        contributionEquity: 0.85, // How evenly agents contributed
        networkEfficiency: 0.91,
        collectiveIntelligenceGain: 0.22, // 22% improvement
      },

      emergentOutcomes: [
        'Self-organizing optimization patterns',
        'Distributed quality assurance mechanisms',
        'Adaptive load balancing behaviors',
        'Collective error correction capabilities',
        'Emergent knowledge synthesis',
      ],
    };

    // Simulate convergence process
    for (const [index, step] of convergenceSteps.entries()) {
      console.log(`  🎯 ${step}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const progress = ((index + 1) / convergenceSteps.length) * 100;
      console.log(`    ✅ ${step} completed (${progress}%)`);
    }

    // Calculate final metrics
    const finalDuration = Date.now() - state.executionStartTime;
    const finalMetrics = {
      ...state.metricsCollected,
      totalDuration: finalDuration,
      successRate: 1.0,
      averageResponseTime: finalDuration / 3, // 3 concurrent agents
      swarmEfficiency: convergenceResults.swarmMetrics.networkEfficiency,
    };

    console.log(
      '🏆 Swarm Showcase completed - distributed intelligence demonstrated!'
    );

    // Return comprehensive swarm response
    const response: ShowcaseWorkflowResponse = {
      id: state.showcaseId,
      pattern: 'swarm',
      status: 'completed',

      output: `Swarm Intelligence Showcase completed successfully! 
              Demonstrated peer-to-peer coordination with ${
                convergenceResults.swarmMetrics.participationRate
              }% participation rate.
              Achieved ${(
                (convergenceResults.finalSolution.emergentValue - 1) *
                100
              ).toFixed(0)}% improvement through collective intelligence.`,

      finalState: {
        ...state,
        swarmConvergence: convergenceResults,
        finalMetrics,
      },

      executionPath: [
        'initializeSwarm',
        'establishPeerCoordination',
        'executeDistributedIntelligence',
        'achieveSwarmConvergence',
      ],

      agentsUsed: ['demo-showcase', 'specialist-showcase', 'advanced-showcase'],
      toolsInvoked: [
        'peer-coordinator',
        'consensus-builder',
        'intelligence-synthesizer',
      ],

      duration: finalDuration,
      metrics: finalMetrics,

      streamEvents: state.streamBuffer,
      approvals: state.approvalHistory,
      errors: state.errors,

      // Swarm-specific results
      swarmResults: {
        peerCoordination: state.peerCoordinationResults,
        distributedIntelligence: state.distributedIntelligence,
        convergence: convergenceResults,
        emergentBehaviors: convergenceResults.emergentOutcomes.length,
        collectiveIntelligenceGain:
          convergenceResults.swarmMetrics.collectiveIntelligenceGain,
      },

      streamingUrl: `ws://localhost:3000/showcase/swarm/${state.showcaseId}`,
      timeTravelUrl: `http://localhost:3000/showcase/swarm/timetravel/${state.showcaseId}`,
      metricsUrl: `http://localhost:3000/showcase/swarm/metrics/${state.showcaseId}`,
    };

    return response;
  }

  /**
   * Error handler for swarm operations
   */
  async handleSwarmInitError(
    error: Error,
    state?: ShowcaseAgentState
  ): Promise<Partial<ShowcaseAgentState>> {
    console.error('❌ Swarm initialization error:', error.message);

    return {
      ...state,
      errors: [
        ...(state?.errors || []),
        {
          id: `swarm-error-${Date.now()}`,
          type: 'workflow',
          severity: 'medium',
          message: `Swarm initialization error: ${error.message}`,
          context: { phase: 'swarm_initialization', pattern: 'peer-to-peer' },
          occurredAt: Date.now(),
          recoverable: true,
          recoveryStrategy: 'fallback_to_centralized_coordination',
        },
      ],
      recoveryAttempts: (state?.recoveryAttempts || 0) + 1,
      messages: [
        ...(state?.messages || []),
        new HumanMessage(`⚠️ Swarm error handled: ${error.message}`),
        new HumanMessage(
          '🔄 Implementing graceful degradation to centralized mode'
        ),
      ],
    };
  }
}
