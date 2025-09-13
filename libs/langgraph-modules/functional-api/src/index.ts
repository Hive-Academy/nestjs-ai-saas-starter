// Module
export * from './lib/functional-api.module';

// Services
export * from './lib/services/functional-workflow.service';
export * from './lib/services/workflow-registration.service';
export * from './lib/services/graph-generator.service';

// Validation
export * from './lib/validation/workflow-validator';

// Core Decorators (moved from main library)
export * from './lib/decorators/workflow.decorator';
export * from './lib/decorators/node.decorator';
export * from './lib/decorators/edge.decorator';

// Metadata functions
export { getWorkflowMetadata } from './lib/decorators/workflow.decorator';
export {
  getWorkflowNodes,
  getAllStreamingMetadata,
} from './lib/decorators/node.decorator';
export { getWorkflowEdges } from './lib/decorators/edge.decorator';

// Re-export from core for backward compatibility
export { isWorkflow } from '@hive-academy/langgraph-core';

// Functional API Decorators
export * from './lib/decorators/entrypoint.decorator';
export * from './lib/decorators/task.decorator';

// Interfaces
export type * from './lib/interfaces/functional-workflow.interface';
export type * from './lib/interfaces/module-options.interface';

// Metadata Types
export type {
  NodeMetadata,
  NodeOptions,
} from './lib/decorators/node.decorator';
export type {
  EdgeMetadata,
  EdgeOptions,
  ConditionalRouteOptions,
} from './lib/decorators/edge.decorator';
export type { WorkflowOptions } from './lib/decorators/workflow.decorator';
export type {
  TaskMetadata,
  TaskOptions,
} from './lib/decorators/task.decorator';
export type {
  EntrypointMetadata,
  EntrypointOptions,
} from './lib/decorators/entrypoint.decorator';

// Errors
export * from './lib/errors/functional-workflow.errors';

// Constants
export { FUNCTIONAL_API_MODULE_OPTIONS } from './lib/constants/module.constants';

// Configuration utilities
export * from './lib/utils/functional-api-config.accessor';
