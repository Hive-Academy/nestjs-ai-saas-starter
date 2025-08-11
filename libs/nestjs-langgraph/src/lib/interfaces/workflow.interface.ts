import { BaseMessage } from '@langchain/core/messages';
import { StateGraph, StateGraphArgs } from '@langchain/langgraph';

export interface WorkflowState {
  /**
   * Unique execution ID
   */
  executionId: string;

  /**
   * Current workflow status
   */
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

  /**
   * Current node being executed
   */
  currentNode?: string;

  /**
   * Completed nodes
   */
  completedNodes: string[];

  /**
   * Workflow confidence score
   */
  confidence: number;

  /**
   * Messages exchanged in the workflow
   */
  messages?: BaseMessage[];

  /**
   * Error information if workflow failed
   */
  error?: WorkflowError;

  /**
   * Human feedback if HITL is enabled
   */
  humanFeedback?: HumanFeedback;

  /**
   * Workflow metadata
   */
  metadata?: Record<string, any>;

  /**
   * Timestamps
   */
  timestamps: {
    started: Date;
    updated?: Date;
    completed?: Date;
  };

  /**
   * Retry count for error handling
   */
  retryCount: number;

  /**
   * Workflow start timestamp
   */
  startedAt: Date;

  /**
   * Workflow completion timestamp
   */
  completedAt?: Date;

  /**
   * Previous node for routing
   */
  previousNode?: string;

  /**
   * Next node for routing
   */
  nextNode?: string;

  /**
   * Whether approval is required
   */
  requiresApproval?: boolean;

  /**
   * Whether approval was received
   */
  approvalReceived?: boolean;

  /**
   * Whether waiting for approval
   */
  waitingForApproval?: boolean;

  /**
   * Rejection reason
   */
  rejectionReason?: string;

  /**
   * Last error
   */
  lastError?: WorkflowError;

  /**
   * Risk assessments
   */
  risks?: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
  }>;

  /**
   * Custom state properties
   */
  [key: string]: any;
}

export interface WorkflowError {
  /**
   * Error ID
   */
  id: string;

  /**
   * Node where error occurred
   */
  nodeId: string;

  /**
   * Error type
   */
  type: 'execution' | 'validation' | 'timeout' | 'permission' | 'unknown';

  /**
   * Error message
   */
  message: string;

  /**
   * Stack trace if available
   */
  stackTrace?: string;

  /**
   * Error context
   */
  context?: Record<string, any>;

  /**
   * Whether error is recoverable
   */
  isRecoverable: boolean;

  /**
   * Suggested recovery action
   */
  suggestedRecovery?: string;

  /**
   * Timestamp
   */
  timestamp: Date;
}

export interface HumanFeedback {
  /**
   * Whether feedback was approved
   */
  approved: boolean;

  /**
   * Approval status
   */
  status: 'approved' | 'rejected' | 'needs_revision';

  /**
   * Approver information
   */
  approver: {
    id: string;
    name?: string;
    role?: string;
  };

  /**
   * Feedback message
   */
  message?: string;

  /**
   * Reason for decision
   */
  reason?: string;

  /**
   * Suggested alternatives
   */
  alternatives?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;

  /**
   * Timestamp
   */
  timestamp: Date;
}

export interface WorkflowDefinition<TState = WorkflowState> {
  /**
   * Workflow name
   */
  name: string;

  /**
   * Workflow description
   */
  description?: string;

  /**
   * State channels definition
   */
  channels?: StateGraphArgs<TState>['channels'];

  /**
   * Workflow nodes
   */
  nodes: WorkflowNode<TState>[];

  /**
   * Workflow edges
   */
  edges: WorkflowEdge<TState>[];

  /**
   * Entry point node
   */
  entryPoint: string;

  /**
   * Workflow configuration
   */
  config?: WorkflowNodeConfig;
}

export interface WorkflowNode<TState = WorkflowState> {
  /**
   * Node ID
   */
  id: string;

  /**
   * Node name
   */
  name: string;

  /**
   * Node description
   */
  description?: string;

  /**
   * Node function
   */
  handler: (state: TState) => Promise<Partial<TState> | Command<TState>>;

  /**
   * Whether this node requires approval
   */
  requiresApproval?: boolean;

  /**
   * Node configuration
   */
  config?: WorkflowNodeConfig;
}

export interface WorkflowEdge<TState = WorkflowState> {
  /**
   * Source node ID
   */
  from: string;

  /**
   * Target node ID or conditional routing
   */
  to: string | ConditionalRouting<TState>;

  /**
   * Edge configuration
   */
  config?: WorkflowEdgeConfig;
}

export interface ConditionalRouting<TState = WorkflowState> {
  /**
   * Condition function
   */
  condition: (state: TState) => string | null;

  /**
   * Mapping of condition results to target nodes
   */
  routes: Record<string, string>;

  /**
   * Default route if no condition matches
   */
  default?: string;
}

export interface WorkflowNodeConfig {
  /**
   * Requires human approval
   */
  requiresApproval?: boolean;

  /**
   * Approval configuration
   */
  approval?: {
    /**
     * Confidence threshold
     */
    threshold?: number;

    /**
     * Risk level
     */
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';

    /**
     * Custom approval condition
     */
    condition?: (state: WorkflowState) => boolean;

    /**
     * Approval message
     */
    message?: string | ((state: WorkflowState) => string);
  };

  /**
   * Retry configuration
   */
  retry?: {
    /**
     * Maximum retry attempts
     */
    maxAttempts?: number;

    /**
     * Retry delay in milliseconds
     */
    delay?: number;

    /**
     * Exponential backoff
     */
    exponentialBackoff?: boolean;

    /**
     * Retry condition
     */
    condition?: (error: Error, attempt: number) => boolean;
  };

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable streaming for this node
   */
  streaming?: boolean;

  /**
   * Tools available to this node
   */
  tools?: string[];

  /**
   * Node metadata
   */
  metadata?: Record<string, any>;
}

export interface WorkflowEdgeConfig {
  /**
   * Edge priority (higher priority edges are evaluated first)
   */
  priority?: number;

  /**
   * Minimum confidence required to traverse this edge
   */
  minConfidence?: number;

  /**
   * Maximum confidence allowed to traverse this edge
   */
  maxConfidence?: number;

  /**
   * Custom condition
   */
  condition?: (state: WorkflowState) => boolean;

  /**
   * Edge metadata
   */
  metadata?: Record<string, any>;
}

export interface Command<TState = WorkflowState> {
  /**
   * Command type
   */
  type?: 'goto' | 'update' | 'end' | 'error' | 'retry' | 'skip' | 'stop';

  /**
   * Target node for goto command
   */
  goto?: string;

  /**
   * State update for update command
   */
  update?: Partial<TState>;

  /**
   * Error for error command
   */
  error?: Error | WorkflowError;

  /**
   * Reason for the command (for skip/stop commands)
   */
  reason?: string;

  /**
   * Maximum attempts for retry commands
   */
  maxAttempts?: number;

  /**
   * Command parameters
   */
  params?: Record<string, unknown>;

  /**
   * Retry configuration for retry command
   */
  retry?: {
    /**
     * Node to retry
     */
    node: string;

    /**
     * Delay before retry
     */
    delay?: number;
  };

  /**
   * Command metadata
   */
  metadata?: Record<string, any>;

  /**
   * Command priority
   */
  priority?: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Timestamp for command
   */
  timestamp?: Date;
}

export interface WorkflowExecutionOptions {
  /**
   * Thread ID for checkpointing
   */
  threadId?: string;

  /**
   * Checkpoint ID to resume from
   */
  checkpointId?: string;

  /**
   * Streaming options
   */
  streaming?: StreamingOptions;

  /**
   * Timeout for execution
   */
  timeout?: number;

  /**
   * Interrupt configuration
   */
  interrupt?: {
    /**
     * Nodes to interrupt before
     */
    before?: string[];

    /**
     * Nodes to interrupt after
     */
    after?: string[];
  };

  /**
   * Execution metadata
   */
  metadata?: Record<string, any>;
}

export interface StreamingOptions {
  /**
   * Stream mode
   */
  mode?: 'values' | 'updates' | 'messages' | 'events' | 'debug' | 'multiple';

  /**
   * Multiple stream modes
   */
  modes?: ('values' | 'updates' | 'messages' | 'events' | 'debug')[];

  /**
   * Enable WebSocket streaming
   */
  websocket?: boolean;

  /**
   * Stream transformers
   */
  transformers?: StreamTransformer[];

  /**
   * Stream filters
   */
  filters?: StreamFilter[];
}

export interface StreamTransformer {
  /**
   * Transformer name
   */
  name: string;

  /**
   * Transform function
   */
  transform: (data: any) => any;
}

export interface StreamFilter {
  /**
   * Filter name
   */
  name: string;

  /**
   * Filter function
   */
  filter: (data: any) => boolean;
}

export interface WorkflowResult<TState = WorkflowState> {
  /**
   * Final state
   */
  state: TState;

  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Execution status
   */
  status: 'success' | 'failed' | 'cancelled' | 'timeout';

  /**
   * Execution duration in milliseconds
   */
  duration: number;

  /**
   * Number of nodes executed
   */
  nodesExecuted: number;

  /**
   * Execution metadata
   */
  metadata?: Record<string, any>;

  /**
   * Error if execution failed
   */
  error?: WorkflowError;
}

export interface CompiledWorkflow<TState = WorkflowState> {
  /**
   * Invoke the workflow with initial state
   */
  invoke(state: Partial<TState>, options?: WorkflowExecutionOptions): Promise<TState>;

  /**
   * Stream workflow execution
   */
  stream(state: Partial<TState>, options?: WorkflowExecutionOptions): AsyncIterableIterator<TState>;

  /**
   * Get workflow graph
   */
  getGraph(): StateGraph<TState>;

  /**
   * Get workflow metadata
   */
  getMetadata(): WorkflowMetadata;
}

export interface WorkflowMetadata {
  /**
   * Workflow name
   */
  name: string;

  /**
   * Workflow version
   */
  version?: string;

  /**
   * Workflow description
   */
  description?: string;

  /**
   * Node count
   */
  nodeCount: number;

  /**
   * Edge count
   */
  edgeCount: number;

  /**
   * Has human-in-the-loop
   */
  hasHITL: boolean;

  /**
   * Has tools
   */
  hasTools: boolean;

  /**
   * Supports streaming
   */
  supportsStreaming: boolean;

  /**
   * Created timestamp
   */
  created: Date;

  /**
   * Last modified timestamp
   */
  modified?: Date;
}