import type { WorkflowState } from './index';

/**
 * Agent step metadata for enhanced execution
 */
export interface AgentStepMetadata {
  /**
   * Agent type identifier
   */
  agentType: string;
  
  /**
   * Step name
   */
  stepName?: string;
  
  /**
   * Execution timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Number of retry attempts
   */
  retries?: number;
  
  /**
   * Step dependencies
   */
  dependencies?: string[];
  
  /**
   * Step metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Subworkflow metadata for enhanced execution
 */
export interface SubworkflowMetadata {
  /**
   * Workflow name to execute
   */
  workflowName: string;
  
  /**
   * Input mapping configuration
   */
  inputMapping?: Record<string, any>;
  
  /**
   * Output mapping configuration
   */
  outputMapping?: Record<string, any>;
  
  /**
   * Merge strategy for results
   */
  mergeStrategy?: 'replace' | 'merge';
  
  /**
   * Subworkflow metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Workflow command types
 */
export enum WorkflowCommandType {
  EXECUTE_NODE = 'EXECUTE_NODE',
  BRANCH = 'BRANCH',
  TERMINATE = 'TERMINATE',
}

/**
 * Workflow command interface
 */
export interface WorkflowCommand {
  /**
   * Command type
   */
  type: WorkflowCommandType;
  
  /**
   * Command payload
   */
  payload: any;
}

/**
 * Enhanced execution context for decorator bridge
 */
export interface EnhancedExecutionContext<TState extends WorkflowState = WorkflowState> {
  /**
   * Execute a workflow command with enhanced capabilities
   */
  executeCommand: (command: any) => Promise<any>;
  
  /**
   * Retrieve data from memory adapter
   */
  retrieveMemory: (key: string, options?: any) => Promise<any>;
  
  /**
   * Store data in memory adapter
   */
  storeMemory: (key: string, value: any, options?: any) => Promise<void>;
  
  /**
   * Request approval for an action
   */
  requestApproval: (data: any) => Promise<any>;
  
  /**
   * Create a checkpoint of the current state
   */
  createCheckpoint: () => Promise<any>;
  
  /**
   * Get the enhanced context itself
   */
  getEnhancedContext: () => EnhancedExecutionContext<TState>;
}

/**
 * Agent step context for enhanced execution
 */
export interface AgentStepContext {
  /**
   * Type of agent being executed
   */
  agentType: string;
  
  /**
   * Name of the step
   */
  stepName: string;
  
  /**
   * Timeout for execution in milliseconds
   */
  timeout: number;
  
  /**
   * Number of retry attempts
   */
  retries: number;
  
  /**
   * Execute the step as an agent
   */
  executeAsAgent: (input: any) => Promise<any>;
}

/**
 * Subworkflow execution context
 */
export interface SubworkflowContext {
  /**
   * Name of the subworkflow
   */
  workflowName: string;
  
  /**
   * Input mapping configuration
   */
  inputMapping: Record<string, any>;
  
  /**
   * Output mapping configuration
   */
  outputMapping: Record<string, any>;
  
  /**
   * Merge result with parent workflow
   */
  mergeWithParent: (result: any) => Promise<any>;
  
  /**
   * Execute with specific tools
   */
  executeWithTools: (tools: string[]) => Promise<any>;
  
  /**
   * Coordinate with other agents
   */
  coordinateWithAgents: (agents: string[], strategy: string) => Promise<any>;
}

/**
 * Enhanced decorator bridge configuration
 */
export interface EnhancedDecoratorBridgeConfig {
  /**
   * Enable memory capabilities
   */
  enableMemory: boolean;
  
  /**
   * Enable approval workflow
   */
  enableApproval: boolean;
  
  /**
   * Enable streaming capabilities
   */
  enableStreaming: boolean;
  
  /**
   * Enable checkpointing
   */
  enableCheckpointing: boolean;
  
  /**
   * Memory configuration
   */
  memoryConfig?: {
    namespace?: string;
    ttl?: number;
    maxEntries?: number;
  };
  
  /**
   * Streaming configuration
   */
  streamingConfig?: {
    enableTokens?: boolean;
    enableEvents?: boolean;
    enableProgress?: boolean;
    bufferSize?: number;
  };
  
  /**
   * Approval configuration
   */
  approvalConfig?: {
    requireApproval?: boolean;
    approvers?: string[];
    timeout?: number;
  };
  
  /**
   * Checkpoint configuration
   */
  checkpointConfig?: {
    autoCheckpoint?: boolean;
    interval?: number;
    maxCheckpoints?: number;
  };
}

/**
 * Enhanced decorator metadata
 */
export interface EnhancedDecoratorMetadata {
  /**
   * Decorator type
   */
  type: 'agent' | 'subworkflow' | 'tool' | 'approval' | 'streaming' | 'memory' | 'checkpoint';
  
  /**
   * Method name being decorated
   */
  methodName: string;
  
  /**
   * Decorator configuration
   */
  config: EnhancedDecoratorBridgeConfig;
  
  /**
   * Agent-specific metadata (if type is 'agent')
   */
  agentMetadata?: AgentStepMetadata;
  
  /**
   * Subworkflow-specific metadata (if type is 'subworkflow')
   */
  subworkflowMetadata?: SubworkflowMetadata;
  
  /**
   * Tool metadata (if type is 'tool')
   */
  toolMetadata?: {
    toolName: string;
    parameters?: Record<string, any>;
    timeout?: number;
  };
  
  /**
   * Approval metadata (if type is 'approval')
   */
  approvalMetadata?: {
    approvalType: string;
    requiredApprovers?: string[];
    timeout?: number;
  };
  
  /**
   * Streaming metadata (if type is 'streaming')
   */
  streamingMetadata?: {
    streamType: 'token' | 'event' | 'progress';
    bufferSize?: number;
    flushInterval?: number;
  };
  
  /**
   * Memory metadata (if type is 'memory')
   */
  memoryMetadata?: {
    operation: 'store' | 'retrieve' | 'clear';
    key?: string;
    namespace?: string;
  };
  
  /**
   * Checkpoint metadata (if type is 'checkpoint')
   */
  checkpointMetadata?: {
    auto: boolean;
    interval?: number;
    label?: string;
  };
}

/**
 * Context for enhanced decorator execution
 */
export interface EnhancedDecoratorExecutionContext<TState extends WorkflowState = WorkflowState> {
  /**
   * Current workflow state
   */
  state: TState;
  
  /**
   * Enhanced execution context
   */
  enhancedContext: EnhancedExecutionContext<TState>;
  
  /**
   * Decorator metadata
   */
  metadata: EnhancedDecoratorMetadata;
  
  /**
   * Instance being decorated
   */
  instance: object;
  
  /**
   * Method arguments
   */
  args: any[];
  
  /**
   * Execution timestamp
   */
  timestamp: Date;
  
  /**
   * Execution ID for tracking
   */
  executionId: string;
}

/**
 * Result of enhanced decorator execution
 */
export interface EnhancedDecoratorExecutionResult<TState extends WorkflowState = WorkflowState> {
  /**
   * Execution success status
   */
  success: boolean;
  
  /**
   * Result data
   */
  result?: any;
  
  /**
   * Updated state (if any)
   */
  state?: Partial<TState>;
  
  /**
   * Error information (if failed)
   */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  
  /**
   * Execution metadata
   */
  metadata: {
    /**
     * Execution duration in milliseconds
     */
    duration: number;
    
    /**
     * Decorator type executed
     */
    decoratorType: string;
    
    /**
     * Method name executed
     */
    methodName: string;
    
    /**
     * Capabilities used during execution
     */
    capabilitiesUsed: {
      memory?: boolean;
      streaming?: boolean;
      approval?: boolean;
      checkpointing?: boolean;
      tools?: boolean;
    };
    
    /**
     * Timestamp of execution
     */
    timestamp: Date;
    
    /**
     * Execution ID
     */
    executionId: string;
  };
}

/**
 * Enhanced decorator registry entry
 */
export interface EnhancedDecoratorRegistryEntry {
  /**
   * Target class constructor
   */
  target: any;
  
  /**
   * Method name
   */
  methodName: string;
  
  /**
   * Decorator metadata
   */
  metadata: EnhancedDecoratorMetadata;
  
  /**
   * Registration timestamp
   */
  registeredAt: Date;
  
  /**
   * Whether the decorator is active
   */
  active: boolean;
}