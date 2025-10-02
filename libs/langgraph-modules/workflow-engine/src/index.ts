// Module
export * from './lib/workflow-engine.module';

// Core Services (moved from main library)
export * from './lib/core/workflow-graph-builder.service';
export * from './lib/core/compilation-cache.service';
export * from './lib/core/metadata-processor.service';
export * from './lib/core/subgraph-manager.service';
export * from './lib/core/workflow-checkpoint.service';
export * from './lib/core/workflow-execution.service';
export * from './lib/core/graph-patterns.service';
export * from './lib/core/graph-optimization.service';

// Decorator Bridge Services (cleaned up)
export * from './lib/services/decorator-translation.service';
export * from './lib/services/enhanced-decorator-orchestrator.service';
export * from './lib/services/enhanced-execution-context.service';
export * from './lib/services/multi-agent-translation.service';
export * from './lib/services/agent-workflow-bridge.service';

// Enhanced Agent Architecture Types (cleaned up)
export type {
  InternalWorkflowDefinition,
  AgentRegistration,
  AgentInstance,
} from './lib/services/agent-workflow-bridge.service';

// CENTRALIZED REGISTRATION: The single source of truth for all agents, tools, workflows
export * from './lib/services/central-registry.service';
export * from './lib/interfaces/decorator-bridge.interface';
export * from './lib/interfaces/multi-agent-bridge.interface';
// Removed duplicate enhanced decorator interfaces - use canonical ones from source modules

// Streaming Services (moved from streaming module to avoid circular dependency)
export * from './lib/streaming/workflow-stream.service';
export * from './lib/streaming/workflow-stream-orchestrator.service';
export * from './lib/streaming/stream-management.service';
export * from './lib/streaming/token-processing.service';
export * from './lib/streaming/stream-event-processor.service';

// Routing (moved from main library)
export * from './lib/routing/command-processor.service';

// Base Classes
export * from './lib/base/unified-workflow.base';
export * from './lib/base/declarative-workflow.base';
export * from './lib/base/streaming-workflow.base';
export * from './lib/base/agent-node.base';

// Interfaces
export * from './lib/interfaces/workflow-engine.interface';
export type * from './lib/interfaces/workflow-metadata.interface';

// Specific type exports for external module imports
export type { 
  WorkflowState, 
  WorkflowDefinition, 
  WorkflowNode, 
  WorkflowEdge,
  Command,
  ConditionalRouting,
  WorkflowError,
  HumanFeedback,
  WorkflowNodeConfig,
  WorkflowEdgeConfig,
  WorkflowExecutionConfig
} from './lib/interfaces/workflow-engine.interface';

// Multi-agent bridge exports are already included via the wildcard export above
// from './lib/interfaces/multi-agent-bridge.interface'

// Constants
export * from './lib/constants';

// Configuration utilities
export * from './lib/utils/workflow-engine-config.accessor';

// Enhanced HITL Decorators
// Removed duplicate @RequiresApproval - use from @hive-academy/langgraph-hitl instead

// Examples removed - contained broken imports and duplicated functionality
