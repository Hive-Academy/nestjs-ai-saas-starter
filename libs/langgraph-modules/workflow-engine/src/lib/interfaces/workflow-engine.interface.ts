// Local interface definitions to avoid external dependencies during build
// These are duplicated from core to avoid circular dependency issues

export interface WorkflowState {
  executionId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentNode?: string;
  completedNodes: string[];
  confidence: number;
  messages?: any[];
  error?: WorkflowError;
  humanFeedback?: HumanFeedback;
  metadata?: Record<string, any>;
  timestamps: {
    started: Date;
    updated?: Date;
    completed?: Date;
  };
  retryCount: number;
  startedAt: Date;
  completedAt?: Date;
  previousNode?: string;
  nextNode?: string;
  requiresApproval?: boolean;
  approvalReceived?: boolean;
  waitingForApproval?: boolean;
  rejectionReason?: string;
  lastError?: WorkflowError;
  risks?: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
  }>;
  [key: string]: any;
}

export interface WorkflowError {
  id: string;
  nodeId: string;
  type: 'execution' | 'validation' | 'timeout' | 'permission' | 'unknown';
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
  isRecoverable: boolean;
  suggestedRecovery?: string;
  timestamp: Date;
}

export interface HumanFeedback {
  approved: boolean;
  status: 'approved' | 'rejected' | 'needs_revision';
  approver: {
    id: string;
    name?: string;
    role?: string;
  };
  message?: string;
  reason?: string;
  alternatives?: string[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface WorkflowDefinition<TState = WorkflowState> {
  name: string;
  description?: string;
  channels?: any;
  nodes: Array<WorkflowNode<TState>>;
  edges: Array<WorkflowEdge<TState>>;
  entryPoint: string;
  config?: WorkflowNodeConfig;
}

export interface WorkflowNode<TState = WorkflowState> {
  id: string;
  name: string;
  description?: string;
  handler: (state: TState) => Promise<Partial<TState> | Command<TState>>;
  requiresApproval?: boolean;
  config?: WorkflowNodeConfig;
}

export interface WorkflowEdge<TState = WorkflowState> {
  from: string;
  to: string | ConditionalRouting<TState>;
  config?: WorkflowEdgeConfig;
}

export interface ConditionalRouting<TState = WorkflowState> {
  condition: (state: TState) => string | null;
  routes: Record<string, string>;
  default?: string;
}

export interface WorkflowNodeConfig {
  requiresApproval?: boolean;
  approval?: {
    threshold?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    condition?: (state: WorkflowState) => boolean;
    message?: string | ((state: WorkflowState) => string);
  };
  retry?: {
    maxAttempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
    condition?: (error: Error, attempt: number) => boolean;
  };
  timeout?: number;
  streaming?: boolean;
  tools?: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowEdgeConfig {
  priority?: number;
  minConfidence?: number;
  maxConfidence?: number;
  condition?: (state: WorkflowState) => boolean;
  metadata?: Record<string, any>;
}

export interface Command<TState = WorkflowState> {
  type?: 'goto' | 'update' | 'end' | 'error' | 'retry' | 'skip' | 'stop';
  goto?: string;
  update?: Partial<TState>;
  error?: Error | WorkflowError;
  reason?: string;
  maxAttempts?: number;
  params?: Record<string, unknown>;
  retry?: {
    node: string;
    delay?: number;
  };
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
}

export interface LangGraphModuleOptions {
  defaultLLM?: any;
  providers?: Record<string, any>;
  tools?: any;
  streaming?: any;
  hitl?: any;
  workflows?: any;
  checkpoint?: any;
  observability?: any;
  performance?: any;
}

export interface WorkflowExecutionConfig {
  name?: string;
  description?: string;
  confidenceThreshold?: number;
  requiresHumanApproval?: boolean;
  autoApproveThreshold?: number;
  streaming?: boolean;
  cache?: boolean;
  metrics?: boolean;
  hitl?: {
    enabled: boolean;
    timeout?: number;
    fallbackStrategy?: 'auto-approve' | 'reject' | 'retry';
  };
}

// Constants
export const WORKFLOW_METADATA_KEY = 'workflow:metadata';
export const WORKFLOW_NODES_KEY = 'workflow:nodes';
export const WORKFLOW_EDGES_KEY = 'workflow:edges';
export const WORKFLOW_TOOLS_KEY = 'workflow:tools';
export const LANGGRAPH_MODULE_OPTIONS = 'LANGGRAPH_MODULE_OPTIONS';

// Placeholder functions - these will be replaced by actual imports at runtime
export const WorkflowStateAnnotation = {} as any;
export const createCustomStateAnnotation = (() => {}) as any;
export const isWorkflow = (() => false) as any;

// Workflow engine specific interfaces can be added here as needed
