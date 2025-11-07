// Module
export * from './lib/workflow-engine.module';

// Core Services (thin metadata layer only)
export * from './lib/core/metadata-processor.service';

// Base Classes (DI containers only)
export * from './lib/base/unified-workflow.base';
export * from './lib/base/declarative-workflow.base';
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
  WorkflowExecutionConfig,
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
