import type { WorkflowError } from '@hive-academy/langgraph-core';
import type { AnnotationRoot } from '@langchain/langgraph';

export interface WorkflowDefinition {
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channels?: AnnotationRoot<any>;
  nodes: Array<WorkflowNode>;
  edges: Array<WorkflowEdge>;
  entryPoint: string;
  config?: WorkflowNodeConfig;
}

export interface WorkflowNode {
  id: string;
  name: string;
  description?: string;
  handler: (
    state: Record<string, unknown>
  ) => Promise<Partial<Record<string, unknown>> | Command>;
  requiresApproval?: boolean;
  config?: WorkflowNodeConfig;
  /**
   * Flag indicating if this node is an LLM task with tool calling
   * @see @LLMTask decorator
   */
  isLLMTask?: boolean;
  /**
   * LLM task-specific options (only present if isLLMTask = true)
   */
  llmTaskOptions?: {
    /**
     * Tool names bound to this task
     */
    readonly tools: readonly string[];
    /**
     * Max tool execution iterations
     */
    readonly maxToolIterations: number;
    /**
     * Timeout per tool execution (ms)
     */
    readonly toolTimeout: number;
  };
}

export interface WorkflowEdge {
  from: string;
  to: string | ConditionalRouting;
  config?: WorkflowEdgeConfig;
}

export interface ConditionalRouting {
  condition: (state: Record<string, unknown>) => string;
  routes: Record<string, string>;
  default?: string;
}

export interface WorkflowNodeConfig {
  requiresApproval?: boolean;
  approval?: {
    threshold?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    condition?: (state: Record<string, unknown>) => boolean;
    message?: string | ((state: Record<string, unknown>) => string);
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
  metadata?: Record<string, unknown>;
}

export interface WorkflowEdgeConfig {
  priority?: number;
  minConfidence?: number;
  maxConfidence?: number;
  condition?: (state: Record<string, unknown>) => boolean;
  metadata?: Record<string, unknown>;
}

export interface Command {
  type?: 'goto' | 'update' | 'end' | 'error' | 'retry' | 'skip' | 'stop';
  goto?: string;
  update?: Partial<Record<string, unknown>>;
  error?: Error | WorkflowError;
  reason?: string;
  maxAttempts?: number;
  params?: Record<string, unknown>;
  retry?: {
    node: string;
    delay?: number;
  };
  metadata?: Record<string, unknown>;
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
