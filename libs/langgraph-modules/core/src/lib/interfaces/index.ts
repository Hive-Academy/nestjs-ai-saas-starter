// Core orchestration interfaces (only what exists in main library)
export type {
  LangGraphModuleOptions,
  LangGraphModuleAsyncOptions,
  LangGraphOptionsFactory,
} from './module-options.interface';

export type { WorkflowExecutionConfig } from './workflow-config.interface';

export type { NodeMetadata, NodeContext, NodeResult } from './node.interface';

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
} from './workflow.interface';

// Export the workflow execution state as a different name to avoid conflict
export type {
  WorkflowState as WorkflowExecutionState,
  HumanFeedback as WorkflowHumanFeedback,
} from './workflow.interface';

// Export state management interfaces (including the new WorkflowState)
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
} from './state-management.interface';

// Define CommandType enum here to avoid circular dependencies
export enum CommandType {
  GOTO = 'GOTO',
  UPDATE = 'UPDATE',
  END = 'END',
  RETRY = 'RETRY',
  ERROR = 'ERROR',
}

// Create proper type exports for node handlers
import type { Command } from './workflow.interface';
export type NodeHandler<TState = any> = (
  state: TState
) => Promise<Partial<TState> | Command<TState>>;
