import type { AgentStepContext } from './enhanced-decorator-metadata.interface';
import type { AgentInstance } from '../services/agent-workflow-bridge.service';
import type { AgentConfig } from '@hive-academy/langgraph-multi-agent';
import type { WorkflowState } from './index';
import type { EnhancedExecutionContext } from './enhanced-decorator-metadata.interface';

/**
 * Rich agent step context with full infrastructure integration
 * 
 * Extends the base AgentStepContext with real agent instances,
 * infrastructure services, and enhanced capabilities for
 * agent-workflow integration.
 */
export interface RichAgentStepContext<TState extends WorkflowState = WorkflowState> 
  extends AgentStepContext {
  
  // Agent instance and metadata
  /** Real agent instance (not null) */
  agent: any;
  /** Agent configuration metadata */
  agentConfig: AgentConfig;
  /** Full agent instance with execution metadata */
  agentInstance: AgentInstance;
  
  // Workflow integration
  /** Enhanced workflow execution context */
  workflowContext: EnhancedExecutionContext<TState>;
  /** Current workflow state */
  state: TState;
  
  // Enhanced execution context
  /** Execution ID for tracking */
  executionId: string;
  /** Current node ID in workflow */
  nodeId: string;
  /** Workflow name */
  workflowName: string;
  
  // Infrastructure services
  /** Streaming capabilities (if enabled) */
  streaming?: StreamingCapabilities;
  /** Memory capabilities (if enabled) */
  memory?: MemoryCapabilities;
  /** Tool execution capabilities (if available) */
  tools?: ToolExecutionCapabilities;
  
  // Agent coordination
  /** Agent coordination capabilities */
  coordination: AgentCoordinationCapabilities;
  
  // Context transformation utilities
  /** Transform context with error handling */
  transformContext: <T>(transformer: (context: any) => T) => T;
  /** Transform result with error handling */
  transformResult: <T>(transformer: (result: any) => T) => T;
  /** Execute agent with rich context */
  executeWithRichContext: (input: any) => Promise<any>;
}

/**
 * Streaming capabilities for agents
 */
export interface StreamingCapabilities {
  /** Whether streaming capabilities are available */
  available?: boolean;
  /** Whether token streaming is available */
  streamTokens?: boolean;
  /** Whether event streaming is available */
  streamEvents?: boolean;
  /** Whether progress streaming is available */
  streamProgress?: boolean;
  /** Create stream for specific type */
  createStream?: (streamType: string) => Promise<any>;
  /** Stream tokens from agent output */
  streamToken: (token: string) => Promise<void> | void;
  /** Stream events from agent execution */
  streamEvent: (event: any) => Promise<void> | void;
  /** Stream progress updates */
  streamProgressData: (progress: any) => Promise<void> | void;
  /** Emit agent-specific events */
  emitAgentEvent: (eventType: string, data: any) => Promise<void> | void;
}

/**
 * Memory capabilities for agents
 */
export interface MemoryCapabilities {
  /** Whether memory capabilities are available */
  available: boolean;
  /** Store data in agent-specific namespace */
  store: (key: string, value: any) => Promise<void>;
  /** Retrieve data from agent memory */
  retrieve: (query: any) => Promise<any>;
  /** Get memory context for agent */
  getContext: (contextKey?: string) => Promise<any>;
  /** Store conversation input/output */
  storeConversation: (input: any, output: any) => Promise<void>;
  /** Get conversation history */
  getConversationHistory: (limit?: number) => Promise<any[]>;
}

/**
 * Tool execution capabilities for agents
 */
export interface ToolExecutionCapabilities {
  /** Whether tool capabilities are available */
  available: boolean;
  /** Execute multiple tools with input */
  executeTools: (toolNames: string[], input: any) => Promise<Record<string, any>>;
  /** Get list of available tools */
  getAvailableTools: () => string[];
  /** Check if agent has access to specific tool */
  hasToolAccess: (toolName: string) => boolean;
}

/**
 * Agent coordination capabilities
 */
export interface AgentCoordinationCapabilities {
  /** Whether coordination capabilities are available */
  available: boolean;
  /** Coordinate with other agents using strategy */
  coordinateWith: (agentIds: string[], strategy: string) => Promise<any>;
  /** Send message to specific agent */
  communicateWith: (agentId: string, message: any) => Promise<any>;
  /** Broadcast message to all agents */
  broadcastMessage: (message: any) => Promise<any>;
}

/**
 * Agent execution result with metadata
 */
export interface AgentExecutionResult<TState extends WorkflowState = WorkflowState> {
  /** Agent that executed */
  agentId: string;
  /** Execution result */
  result: Partial<TState>;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Whether execution was successful */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Execution metadata */
  metadata: {
    /** Execution timestamp */
    timestamp: Date;
    /** Tools used during execution */
    toolsUsed?: string[];
    /** Memory operations performed */
    memoryOperations?: number;
    /** Streaming events emitted */
    streamingEvents?: number;
  };
}

/**
 * Multi-agent coordination result
 */
export interface MultiAgentCoordinationResult<TState extends WorkflowState = WorkflowState> {
  /** Coordination strategy used */
  strategy: 'sequential' | 'parallel' | 'consensus';
  /** Results from each agent */
  agentResults: AgentExecutionResult<TState>[];
  /** Final aggregated result */
  finalResult: Partial<TState>;
  /** Coordination metadata */
  metadata: {
    /** Total coordination time */
    totalTime: number;
    /** Number of successful agents */
    successCount: number;
    /** Number of failed agents */
    failureCount: number;
    /** Coordination timestamp */
    timestamp: Date;
  };
}

/**
 * Agent capability metadata
 */
export interface AgentCapabilityMetadata {
  /** Agent capabilities */
  capabilities: string[];
  /** Available tools */
  tools: string[];
  /** Execution priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Expected execution time category */
  executionTime: 'fast' | 'medium' | 'slow';
  /** Whether agent supports streaming */
  supportsStreaming: boolean;
  /** Whether agent supports memory */
  supportsMemory: boolean;
  /** Whether agent supports coordination */
  supportsCoordination: boolean;
}

/**
 * Agent discovery metadata
 */
export interface AgentDiscoveryMetadata {
  /** Module where agent was discovered */
  module: string;
  /** Provider token for DI */
  token: string;
  /** Whether agent is injectable */
  injectable: boolean;
  /** Discovery timestamp */
  discoveredAt: Date;
  /** Agent class constructor */
  agentClass: any;
}

/**
 * Agent instance metadata
 */
export interface AgentInstanceMetadata {
  /** Last execution timestamp */
  lastExecuted?: Date;
  /** Total execution count */
  executionCount: number;
  /** Average execution time */
  averageExecutionTime?: number;
  /** Instance creation timestamp */
  createdAt: Date;
  /** Total successful executions */
  successfulExecutions: number;
  /** Total failed executions */
  failedExecutions: number;
  /** Agent health status */
  healthStatus: 'healthy' | 'degraded' | 'failed';
}

/**
 * Agent workflow integration statistics
 */
export interface AgentWorkflowStats {
  /** Total agents registered */
  totalAgents: number;
  /** Cached agent instances */
  cachedInstances: number;
  /** Agents by priority level */
  agentsByPriority: Record<string, number>;
  /** Agents by execution time category */
  agentsByExecutionTime: Record<string, number>;
  /** Total agent executions */
  totalExecutions: number;
  /** Average execution time across all agents */
  averageExecutionTime: number;
  /** Agent success rate */
  successRate: number;
  /** Most active agents */
  mostActiveAgents: Array<{
    agentId: string;
    executionCount: number;
    successRate: number;
  }>;
}