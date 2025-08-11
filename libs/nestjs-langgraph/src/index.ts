// Main module
export { NestjsLanggraphModule } from './lib/nestjs-langgraph.module';

// Interfaces - export specific interfaces to avoid conflicts
export type {
  WorkflowState,
  WorkflowError,
  HumanFeedback,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ConditionalRouting,
  WorkflowNodeConfig,
  WorkflowEdgeConfig,
  Command,
  WorkflowExecutionOptions,
  StreamingOptions,
  StreamTransformer,
  StreamFilter,
  WorkflowResult,
  CompiledWorkflow,
  WorkflowMetadata,
} from './lib/interfaces/workflow.interface';

export type {
  NodeMetadata,
  NodeContext,
  NodeResult,
} from './lib/interfaces/node.interface';

export * from './lib/interfaces/tool.interface';
export * from './lib/interfaces/streaming.interface';
export * from './lib/interfaces/module-options.interface';

// Re-export specific items from interfaces for convenience
export { CommandType } from './lib/interfaces';
export type { NodeHandler } from './lib/interfaces';

// Constants
export * from './lib/constants';

// Core services
export { WorkflowGraphBuilderService } from './lib/core/workflow-graph-builder.service';
export { SubgraphManagerService } from './lib/core/subgraph-manager.service';
export { CompilationCacheService } from './lib/core/compilation-cache.service';

// Streaming services
export { WorkflowStreamService } from './lib/streaming/workflow-stream.service';
export { TokenStreamingService } from './lib/streaming/token-streaming.service';
export { EventStreamProcessorService } from './lib/streaming/event-stream-processor.service';
export { WebSocketBridgeService } from './lib/streaming/websocket-bridge.service';

// Tool services
export * from './lib/tools';

// Routing services
export * from './lib/routing';
export { CommandProcessorService } from './lib/routing/command-processor.service';

// Core workflow state annotation
export { WorkflowStateAnnotation } from './lib/core/workflow-state-annotation';

// Base classes
export { UnifiedWorkflowBase } from './lib/base/unified-workflow.base';
export type { WorkflowConfig } from './lib/base/unified-workflow.base';
export { DeclarativeWorkflowBase } from './lib/base/declarative-workflow.base';
export { StreamingWorkflowBase } from './lib/base/streaming-workflow.base';
export { AgentNodeBase } from './lib/base/agent-node.base';
export type { AgentNodeConfig } from './lib/base/agent-node.base';

// Decorators
export * from './lib/decorators';

// Providers
export { createCheckpointProvider } from './lib/providers/checkpoint.provider';
export { createLLMProvider } from './lib/providers/llm-provider.factory';

// HITL services
export * from './lib/hitl';

// Testing utilities
export { WorkflowTestBuilder } from './lib/testing/workflow-test.builder';
export { MockAgentFactory } from './lib/testing/mock-agent.factory';

// Examples and integration tests
export { SimpleTestWorkflow } from './lib/examples/simple-test-workflow';
// Note: Other test files have been moved to __tests__ directory
// export { HITLApprovalTestWorkflow, HITLTestDataFactory } from './lib/examples/hitl-approval-test';

// TODO: Additional exports will be added as services are implemented
// - Routing services (CommandProcessorService, AgentHandoffService, etc.)
// - Patterns (SupervisorPattern, PipelinePattern, etc.)
