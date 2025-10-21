// Re-export core interfaces for convenience
export { IMemoryAdapter, isMemoryAdapter } from '@hive-academy/langgraph-core';

export type {
  MemorySearchOptions,
  AgentState,
  AgentMemoryContext,
  UserMemoryPatterns,
  Store,
} from '@hive-academy/langgraph-core';

// Re-export Store from local interface for backward compatibility
export type { Store as MemoryStore } from './langgraph-store.interface';
