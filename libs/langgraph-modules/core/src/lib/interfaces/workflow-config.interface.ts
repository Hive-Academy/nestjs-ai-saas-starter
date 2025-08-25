/**
 * Configuration for individual workflow execution behavior
 * 
 * This interface defines the configuration options available for individual workflows.
 * It supports human-in-the-loop patterns, streaming, caching, and metrics collection.
 * 
 * Note: This is different from the module-level WorkflowConfig which configures
 * the overall workflow system.
 */
export interface WorkflowExecutionConfig {
  /** Unique name for the workflow */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Confidence threshold for automatic approval */
  confidenceThreshold?: number;
  /** Whether to require human approval for certain operations */
  requiresHumanApproval?: boolean;
  /** Threshold for automatic approval without human intervention */
  autoApproveThreshold?: number;
  /** Enable streaming for this workflow */
  streaming?: boolean;
  /** Enable caching for compiled graphs */
  cache?: boolean;
  /** Enable metrics collection */
  metrics?: boolean;
  /** Human-in-the-loop configuration */
  hitl?: {
    enabled: boolean;
    timeout?: number;
    fallbackStrategy?: 'auto-approve' | 'reject' | 'retry';
  };
}