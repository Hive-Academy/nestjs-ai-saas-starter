/**
 * 🎯 SHOWCASE TYPES - Comprehensive Type System
 *
 * This file defines all types used in our ultimate showcase platform,
 * demonstrating advanced TypeScript patterns and enterprise-grade type safety.
 */

import type { AgentState } from '@hive-academy/langgraph-multi-agent';

/**
 * Showcase execution patterns supported
 */
export type ShowcasePattern =
  | 'supervisor' // Hierarchical coordination with intelligent routing
  | 'swarm' // Peer-to-peer collaborative agents
  | 'hierarchical' // Multi-level command structure
  | 'pipeline' // Sequential processing chain
  | 'parallel' // Concurrent execution
  | 'map-reduce'; // Distributed processing pattern

/**
 * Agent capability categories for showcase
 */
export type AgentCapability =
  | 'analysis' // Data analysis and insights
  | 'generation' // Content creation
  | 'coordination' // Multi-agent orchestration
  | 'streaming' // Real-time communication
  | 'approval' // Human-in-the-loop workflows
  | 'monitoring' // System observability
  | 'memory' // Context management
  | 'tools' // External integrations
  | 'debugging'; // Time-travel and diagnostics

/**
 * Showcase agent state extending base AgentState
 */
export interface ShowcaseAgentState extends AgentState {
  // Core showcase data
  showcaseId: string;
  demonstrationMode: 'basic' | 'advanced' | 'enterprise';

  // Execution context
  currentPattern: ShowcasePattern;
  activeCapabilities: AgentCapability[];

  // Performance metrics
  executionStartTime: number;
  metricsCollected: ShowcaseMetrics;

  // Streaming state
  streamingEnabled: boolean;
  streamBuffer: ShowcaseStreamEvent[];

  // HITL state
  pendingApprovals: ShowcaseApproval[];
  approvalHistory: ShowcaseApprovalHistory[];

  // Memory context
  memoryContext: ShowcaseMemoryContext;

  // Error handling
  errors: ShowcaseError[];
  recoveryAttempts: number;

  // Swarm-specific properties
  swarmConfiguration?: {
    peerAgents: string[];
    coordinationMode: string;
    consensusMechanism: string;
    emergentBehavior: boolean;
    autonomousOperation: boolean;
  };

  peerCoordinationResults?: {
    networkTopology: {
      peerCount: number;
      connectionDensity: number;
      networkDiameter: number;
      clusteringCoefficient: number;
    };
    coordinationProtocol: {
      consensusMechanism: string;
      votingWeights: Record<string, number>;
      decisionThreshold: number;
      timeoutPolicy: string;
    };
    taskDistribution: {
      strategy: string;
      distributionEfficiency: number;
      loadBalancing: string;
      redundancyLevel: string;
    };
    emergentBehaviors: string[];
  };

  distributedIntelligence?: {
    consensusReached: boolean;
    consensusScore: number;
    votingResults: Record<
      string,
      {
        vote: string;
        weight: number;
        confidence: number;
      }
    >;
    collectiveIntelligence: {
      combinedInsights: number;
      averageConfidence: number;
      qualityAmplification: number;
      emergentPatterns: string[];
    };
    distributedResults: Array<{
      agent: string;
      result: string;
      confidence: number;
      processingTime: number;
      insights: number;
      qualityScore: number;
    }>;
  };

  // Additional optional properties
  swarmConvergence?: unknown;
  analysis?: unknown;
  generatedContent?: unknown;
  advancedResults?: unknown;
  demoResults?: unknown;
  specialistResults?: unknown;
  finalMetrics?: ShowcaseMetrics;
  input?: string;
  currentAgentId?: string;
}

/**
 * Comprehensive metrics collection
 */
export interface ShowcaseMetrics {
  // Execution metrics
  totalDuration: number;
  agentSwitches: number;
  toolInvocations: number;
  memoryAccesses: number;

  // Performance metrics
  averageResponseTime: number;
  peakMemoryUsage: number;
  concurrentAgents: number;

  // Quality metrics
  successRate: number;
  errorRate: number;
  approvalRate: number;

  // Streaming metrics
  tokensStreamed: number;
  streamingLatency: number;
  connectionStability: number;
}

/**
 * Real-time streaming events
 */
export interface ShowcaseStreamEvent {
  id: string;
  type: 'token' | 'event' | 'progress' | 'completion' | 'error';
  timestamp: number;
  agentId?: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Human-in-the-loop approval system
 */
export interface ShowcaseApproval {
  id: string;
  type: 'content' | 'decision' | 'action' | 'configuration';
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: number;

  // Approval options
  options: ShowcaseApprovalOption[];

  // Context for decision making
  context: {
    agentState: Partial<ShowcaseAgentState>;
    reasoning: string;
    confidence: number;
    alternatives: string[];
  };

  // Timeout configuration
  timeout: number;
  fallbackAction: 'auto-approve' | 'reject' | 'retry';
}

/**
 * Approval option choices
 */
export interface ShowcaseApprovalOption {
  id: string;
  label: string;
  description: string;
  consequences: string[];
  confidence: number;
}

/**
 * Historical approval tracking
 */
export interface ShowcaseApprovalHistory {
  approvalId: string;
  decision: string;
  decidedBy: 'human' | 'system' | 'timeout';
  decidedAt: number;
  reasoning?: string;
  satisfaction?: number; // 1-5 rating
}

/**
 * Memory context for intelligent decisions
 */
export interface ShowcaseMemoryContext {
  // Vector memory
  similarExecions: ShowcaseExecution[];
  relevantDocs: ShowcaseDocument[];

  // Graph memory
  agentRelationships: ShowcaseAgentRelationship[];
  executionPaths: ShowcaseExecutionPath[];

  // Temporal context
  recentInteractions: ShowcaseInteraction[];
  learningPoints: ShowcaseLearning[];
}

/**
 * Previous execution context
 */
export interface ShowcaseExecution {
  id: string;
  pattern: ShowcasePattern;
  agents: string[];
  duration: number;
  success: boolean;
  similarity: number; // 0-1 similarity score
}

/**
 * Relevant documentation context
 */
export interface ShowcaseDocument {
  id: string;
  title: string;
  content: string;
  category: AgentCapability;
  relevance: number; // 0-1 relevance score
}

/**
 * Agent relationship mapping
 */
export interface ShowcaseAgentRelationship {
  sourceAgent: string;
  targetAgent: string;
  relationshipType:
    | 'collaborates'
    | 'depends_on'
    | 'coordinates'
    | 'delegates_to';
  strength: number; // 0-1 relationship strength
  interactionCount: number;
}

/**
 * Execution path tracking
 */
export interface ShowcaseExecutionPath {
  nodes: string[];
  transitions: ShowcaseTransition[];
  frequency: number;
  avgDuration: number;
  successRate: number;
}

/**
 * State transitions
 */
export interface ShowcaseTransition {
  from: string;
  to: string;
  condition?: string;
  probability: number;
  avgLatency: number;
}

/**
 * User interactions
 */
export interface ShowcaseInteraction {
  type: 'input' | 'approval' | 'feedback' | 'correction';
  timestamp: number;
  content: string;
  context: Record<string, unknown>;
  satisfaction?: number;
}

/**
 * Learning and adaptation
 */
export interface ShowcaseLearning {
  insight: string;
  confidence: number;
  applicableScenarios: string[];
  learnedFrom: ShowcaseInteraction[];
  validatedAt?: number;
}

/**
 * Error handling and recovery
 */
export interface ShowcaseError {
  id: string;
  type: 'agent' | 'workflow' | 'tool' | 'memory' | 'streaming' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  occurredAt: number;

  // Recovery information
  recoverable: boolean;
  recoveryStrategy?: string;
  recoveryAttempted?: boolean;
  resolved?: boolean;
  resolvedAt?: number;
}

/**
 * Workflow execution request
 */
export interface ShowcaseWorkflowRequest {
  pattern: ShowcasePattern;
  demonstrationMode: 'basic' | 'advanced' | 'enterprise';
  input: string;

  // Configuration options
  enableStreaming?: boolean;
  enableHitl?: boolean;
  enableTimeTravel?: boolean;
  enableMetrics?: boolean;

  // Agent preferences
  preferredAgents?: string[];
  excludedAgents?: string[];

  // Context
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow execution response
 */
export interface ShowcaseWorkflowResponse {
  id: string;
  pattern: ShowcasePattern;
  status: 'running' | 'completed' | 'failed' | 'cancelled';

  // Results
  output?: string;
  finalState: ShowcaseAgentState;

  // Execution details
  executionPath: string[];
  agentsUsed: string[];
  toolsInvoked: string[];

  // Performance
  duration: number;
  metrics: ShowcaseMetrics;

  // Artifacts
  streamEvents?: ShowcaseStreamEvent[];
  approvals?: ShowcaseApprovalHistory[];
  errors?: ShowcaseError[];

  // Links
  streamingUrl?: string;
  timeTravelUrl?: string;
  metricsUrl?: string;

  // Swarm-specific results
  swarmResults?: {
    peerCoordination?: unknown;
    distributedIntelligence?: unknown;
    convergence?: unknown;
    emergentBehaviors?: number;
    collectiveIntelligenceGain?: number;
  };
}

/**
 * Agent showcase demonstration
 */
export interface ShowcaseAgentDemo {
  agentId: string;
  capabilities: AgentCapability[];
  examples: ShowcaseExample[];
  metrics: AgentMetrics;
}

/**
 * Capability examples
 */
export interface ShowcaseExample {
  title: string;
  description: string;
  input: string;
  expectedOutput: string;
  decoratorsUsed: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Agent-specific metrics
 */
export interface AgentMetrics {
  invocations: number;
  avgResponseTime: number;
  successRate: number;
  complexityHandled: 'basic' | 'intermediate' | 'advanced';
  toolsIntegrated: number;
}

/**
 * System status for monitoring
 */
export interface ShowcaseSystemStatus {
  // Overall health
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  uptime: number;

  // Component status
  agents: Record<string, 'active' | 'idle' | 'busy' | 'error'>;
  workflows: Record<string, 'running' | 'idle' | 'error'>;
  services: Record<string, 'healthy' | 'degraded' | 'critical'>;

  // Resource utilization
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;

  // Performance metrics
  currentThroughput: number;
  avgLatency: number;
  errorRate: number;
}
