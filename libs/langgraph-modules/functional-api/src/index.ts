// Module
export * from './lib/functional-api.module';

// Services
export * from './lib/services/functional-workflow.service';
export * from './lib/services/workflow-discovery.service';
export * from './lib/services/graph-generator.service';

// Validation
export * from './lib/validation/workflow-validator';

// Core Decorators (moved from main library)
export * from './lib/decorators/workflow.decorator';
export * from './lib/decorators/node.decorator';
export * from './lib/decorators/edge.decorator';

// Re-export from core for backward compatibility
export { isWorkflow } from '@langgraph-modules/core';

// Functional API Decorators
export * from './lib/decorators/entrypoint.decorator';
export * from './lib/decorators/task.decorator';

// Interfaces
export type * from './lib/interfaces/functional-workflow.interface';
export type * from './lib/interfaces/module-options.interface';

// Errors
export * from './lib/errors/functional-workflow.errors';
