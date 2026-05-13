/**
 * Core agent provider interface
 * All agent implementations must conform to this interface
 *
 * This interface follows the Dependency Inversion Principle:
 * - High-level modules (workflow-engine) depend on this abstraction
 * - Low-level modules (multi-agent) implement this abstraction
 */
export interface IAgentProvider {
  id: string;
  name: string;
  description?: string;
  type?: 'simple-agent' | 'workflow-agent';
  nodeFunction?: (state: any) => Promise<Partial<any>>;
  workflowConfig?: IAgentWorkflowConfig;
}

/**
 * Agent workflow configuration
 * Defines how an agent should be executed within a workflow
 */
export interface IAgentWorkflowConfig {
  name: string;
  description?: string;
  type?: 'functional-task' | 'functional-node';
  streaming?: boolean;
  multiAgentStreaming?: IMultiAgentStreamingConfig;
  multiAgentInterruption?: IMultiAgentInterruptionConfig;
}

/**
 * Multi-agent streaming configuration
 * Controls how agent outputs are streamed in multi-agent scenarios
 */
export interface IMultiAgentStreamingConfig {
  enabled: boolean;
  captureSubgraphs?: boolean;
  streamMode?: 'values' | 'updates' | 'messages';
}

/**
 * Multi-agent interruption configuration
 * Defines interruption points for human-in-the-loop patterns
 */
export interface IMultiAgentInterruptionConfig {
  enabled: boolean;
  interruptBefore?: readonly string[];
  interruptAfter?: readonly string[];
}
