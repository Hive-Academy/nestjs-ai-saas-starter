// Module

import type { Command } from './lib/interfaces/workflow.interface';

// Constants (runtime exports)
export * from './lib/constants';

// Interfaces (type-only exports)
export type {
  NodeMetadata,
  NodeContext,
  NodeResult,
} from './lib/interfaces/node.interface';

export type {
  BaseWorkflowState,
  StateTransformer,
  StateValidator,
  StatePersistenceOptions,
  StateManagementConfig,
  StateChangeEvent,
  StateManager,
  StateSnapshot,
  StateRecoveryOptions,
  HumanFeedback,
  WorkflowRisk,
  WorkflowError,
  WorkflowTimestamps,
  WorkflowState,
} from './lib/interfaces/state-management.interface';

export enum CommandType {
  GOTO = 'GOTO',
  UPDATE = 'UPDATE',
  END = 'END',
  RETRY = 'RETRY',
  ERROR = 'ERROR',
}

export type NodeHandler<TState = any> = (
  state: TState
) => Promise<Partial<TState> | Command<TState>>;

// Export workflow interfaces with explicit naming to avoid conflicts
export type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionError,
  Command,
  WorkflowExecutionOptions,
  WorkflowResult,
  CompiledWorkflow,
  WorkflowMetadata,
  ConditionalRouting,
  WorkflowNodeConfig,
  WorkflowEdgeConfig,
  StreamingOptions,
  StreamTransformer,
  StreamFilter,
  IWorkflowProvider,
} from './lib/interfaces/workflow.interface';

// Note: WorkflowState and HumanFeedback are already exported above

// Agent provider interfaces (type-only exports)
export type {
  IAgentProvider,
  IAgentWorkflowConfig,
  IMultiAgentStreamingConfig,
  IMultiAgentInterruptionConfig,
} from './lib/interfaces/agent.interface';

// Tool provider interfaces (type-only exports)
export type { IToolProvider } from './lib/interfaces/tool.interface';

// Workflow config interface (both type and runtime export for WorkflowExecutionConfig)
export type { WorkflowExecutionConfig } from './lib/interfaces/workflow-config.interface';

// Annotations (runtime exports)
export * from './lib/annotations';
export {
  WorkflowStateAnnotation,
  createCustomStateAnnotation,
} from './lib/annotations/workflow-state.annotation';
export {
  AgentStateAnnotation,
  createCustomAgentStateAnnotation,
} from './lib/annotations/agent-state.annotation';

// Utils (runtime exports)
export * from './lib/utils/workflow-metadata.utils';
export { isWorkflow } from './lib/utils/workflow-metadata.utils';
export * from './lib/utils/node-id';
export * from './lib/utils/id-generation.utils';
