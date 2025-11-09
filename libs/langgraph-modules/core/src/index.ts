// Module

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
  AsyncModuleFactory,
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

// Enums and runtime values from interfaces
export { CommandType } from './lib/interfaces';
export type { NodeHandler } from './lib/interfaces';

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
// Note: AgentState type is NOT exported here to avoid conflict with memory-adapter AgentState
// Import directly from './lib/annotations/agent-state.annotation' if needed

// Utils (runtime exports)
export * from './lib/utils/workflow-metadata.utils';
export { isWorkflow } from './lib/utils/workflow-metadata.utils';
export * from './lib/utils/node-id';
export * from './lib/utils/id-generation.utils';

// Streaming integration exports for consumer libraries
export {
  NoOpStreamingService,
  NoOpTokenStreamingService,
  NoOpEventStreamProcessorService,
  NoOpWebSocketBridgeService,
} from './lib/interfaces/streaming.interface';

export { StreamEventType } from './lib/interfaces/streaming.interface';

export type {
  IStreamingService,
  ITokenStreamingService,
  IEventStreamProcessorService,
  IWebSocketBridgeService,
  TokenStreamOptions,
} from './lib/interfaces/streaming.interface';

// Memory adapter types removed - replaced by BaseStore pattern (Task 7.6)
// AgentState, Store, and related types are now part of LangGraph native patterns
