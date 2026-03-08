/**
 * Bridge interface for multi-agent decorator definitions
 * This interface allows workflow-engine to accept definitions from multi-agent
 * without creating a direct dependency on multi-agent module
 */

import type { WorkflowNode, WorkflowEdge } from './workflow-engine.interface';

/**
 * Multi-agent workflow definition from decorator patterns
 * Matches the structure from multi-agent without direct import
 */
export interface MultiAgentWorkflowDefinition {
  readonly name: string;
  readonly agents: Map<string, MultiAgentDefinition>;
  readonly network: NetworkTopologyDefinition;
  readonly coordination: CoordinationStrategyDefinition;
  readonly metadata: Record<string, unknown>;
}

/**
 * Agent definition from multi-agent decorators
 */
export interface MultiAgentDefinition {
  readonly agentId: string;
  readonly role: string;
  readonly capabilities: readonly string[];
  readonly dependencies: readonly string[];
  readonly coordinator?: string;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Network topology for multi-agent coordination
 */
export interface NetworkTopologyDefinition {
  readonly topology: 'mesh' | 'star' | 'ring' | 'hierarchy' | 'custom';
  readonly connections: Map<string, readonly string[]>;
  readonly coordinationNodes: readonly string[];
  readonly communicationProtocol: 'broadcast' | 'direct' | 'pubsub';
}

/**
 * Coordination strategy for multi-agent execution
 */
export interface CoordinationStrategyDefinition {
  readonly strategy:
    | 'sequential'
    | 'parallel'
    | 'pipeline'
    | 'supervisor'
    | 'democratic';
  readonly decisionMaking: 'consensus' | 'majority' | 'leader' | 'weighted';
  readonly conflictResolution: 'priority' | 'vote' | 'escalate' | 'merge';
  readonly synchronization: boolean;
}

/**
 * Multi-agent streaming configuration (Bridge Interface)
 */
export interface BridgeMultiAgentStreamingConfig {
  readonly agentCommunication?: boolean;
  readonly networkEvents?: boolean;
  readonly coordinationUpdates?: boolean;
  readonly consensusTracking?: boolean;
  readonly performanceMetrics?: boolean;
}

/**
 * Type guard for multi-agent workflow definition
 */
export function isMultiAgentDefinition(
  definition: any
): definition is MultiAgentWorkflowDefinition {
  return (
    'agents' in definition &&
    'network' in definition &&
    'coordination' in definition
  );
}

/**
 * Configuration for multi-agent bridge functionality
 */
export interface MultiAgentBridgeConfig {
  /**
   * Enable automatic conversion of multi-agent definitions
   */
  enableMultiAgentConversion?: boolean;

  /**
   * Default coordination timeout (ms)
   */
  defaultCoordinationTimeout?: number;

  /**
   * Default retry configuration for agent failures
   */
  defaultAgentRetry?: {
    maxAttempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };

  /**
   * Enable streaming for agent coordination
   */
  enableCoordinationStreaming?: boolean;

  /**
   * Enable consensus tracking
   */
  enableConsensusTracking?: boolean;
}

/**
 * Result of multi-agent definition translation
 */
export interface MultiAgentTranslationResult {
  /**
   * The translated workflow nodes (one per agent + coordination nodes)
   */
  nodes: WorkflowNode[];

  /**
   * The translated workflow edges (agent communication + coordination)
   */
  edges: WorkflowEdge[];

  /**
   * The entry point node ID (usually coordinator or first agent)
   */
  entryPoint: string;

  /**
   * Metadata about the translation
   */
  metadata: {
    source: 'multi-agent';
    originalDefinition: MultiAgentWorkflowDefinition;
    translationTime: number;
    agentCount: number;
    networkComplexity: 'simple' | 'moderate' | 'complex';
    coordinationStrategy: string;
    warnings?: string[];
  };
}

/**
 * Multi-agent execution context for workflow nodes
 */
export interface MultiAgentExecutionContext<
  TState extends Record<string, unknown> = Record<string, unknown>
> {
  readonly state: TState;
  readonly agentId: string;
  readonly networkState: NetworkState;
  readonly coordinationMetadata: CoordinationMetadata;
  readonly communicationChannels: CommunicationChannels;
}

/**
 * Network state for multi-agent coordination
 */
export interface NetworkState {
  readonly activeAgents: readonly string[];
  readonly completedAgents: readonly string[];
  readonly failedAgents: readonly string[];
  readonly currentCoordinator?: string;
  readonly consensusState?: 'pending' | 'achieved' | 'failed';
}

/**
 * Coordination metadata for multi-agent execution
 */
export interface CoordinationMetadata {
  readonly coordinationId: string;
  readonly strategy: string;
  readonly phase:
    | 'initialization'
    | 'execution'
    | 'coordination'
    | 'completion';
  readonly decisions: readonly CoordinationDecision[];
  readonly conflicts: readonly CoordinationConflict[];
}

/**
 * Coordination decision record
 */
export interface CoordinationDecision {
  readonly id: string;
  readonly timestamp: Date;
  readonly type: 'routing' | 'resource' | 'priority' | 'conflict';
  readonly participants: readonly string[];
  readonly outcome: string;
  readonly confidence: number;
}

/**
 * Coordination conflict record
 */
export interface CoordinationConflict {
  readonly id: string;
  readonly timestamp: Date;
  readonly type: 'resource' | 'decision' | 'timing' | 'dependency';
  readonly participants: readonly string[];
  readonly status: 'pending' | 'resolved' | 'escalated';
  readonly resolutionStrategy?: string;
}

/**
 * Communication channels for agent interaction
 */
export interface CommunicationChannels {
  readonly broadcast: (message: any) => Promise<void>;
  readonly direct: (targetAgent: string, message: any) => Promise<void>;
  readonly subscribe: (topic: string, handler: (message: any) => void) => void;
  readonly publish: (topic: string, message: any) => Promise<void>;
}
