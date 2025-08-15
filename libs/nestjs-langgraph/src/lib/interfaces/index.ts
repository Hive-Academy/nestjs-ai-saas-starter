// Core orchestration interfaces (only what exists in main library)
export type * from './module-options.interface';
export type * from './workflow.interface';
export type * from './node.interface';
export type * from './state-management.interface';

// Re-export from constants to avoid circular dependencies
export { CommandType } from '../constants';

// Create proper type exports for node handlers
import type { Command } from './workflow.interface';
export type NodeHandler<TState = any> = (state: TState) => Promise<
    Partial<TState> | Command<TState>
  >;
