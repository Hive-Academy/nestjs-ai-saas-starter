// Module
export * from './lib/core.module';

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

export type {
  LangGraphModuleOptions,
  LangGraphModuleAsyncOptions,
  LangGraphOptionsFactory,
} from './lib/interfaces/module-options.interface';

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
} from './lib/interfaces/workflow.interface';

// Note: WorkflowState and HumanFeedback are already exported above

// Workflow config interface (both type and runtime export for WorkflowExecutionConfig)
export type { WorkflowExecutionConfig } from './lib/interfaces/workflow-config.interface';

// Enums and runtime values from interfaces
export { CommandType } from './lib/interfaces';
export type { NodeHandler } from './lib/interfaces';

// Annotations (runtime exports)
export * from './lib/annotations';
export {
  WorkflowStateAnnotation,
  createCustomStateAnnotation,
} from './lib/annotations/workflow-state.annotation';

// Utils (runtime exports)
export * from './lib/utils/workflow-metadata.utils';
export { isWorkflow } from './lib/utils/workflow-metadata.utils';
