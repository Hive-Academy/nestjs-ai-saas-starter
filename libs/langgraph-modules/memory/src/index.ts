/**
 * @hive-academy/langgraph-memory
 *
 * Thin memory layer implementing LangGraph BaseStore pattern.
 * Provides direct ChromaDB-backed storage for workflow state persistence.
 *
 * Architecture: Repository pattern with type-safe injection
 * - ChromaDBBaseStore: LangGraph BaseStore implementation
 * - LangGraphStoreRepository: Type-safe ChromaDB repository
 * - BASE_STORE_TOKEN: Typed injection token
 * - RunnableConfigStoreHelpers: Type-safe config access utilities
 */

// ============================================================
// Memory Module - BaseStore Pattern
// ============================================================

// Module
export * from './lib/memory.module';

// Store Implementation
export { ChromaDBBaseStore } from './lib/stores/chromadb-base-store';

// Repository & Entity
export { LangGraphStoreRepository } from './lib/repositories/langgraph-store.repository';
export { LangGraphStoreEntity } from './lib/entities/langgraph-store.entity';
export type { LangGraphStoreMetadata } from './lib/entities/langgraph-store.entity';

// Typed Injection Tokens
export {
  BASE_STORE_TOKEN,
  type BaseStoreTokenType,
} from './lib/tokens/base-store.token';

export {
  THREAD_REGISTRY_TOKEN,
  type ThreadRegistryTokenType,
} from './lib/tokens/thread-registry.token';

// Thread Registry Interface & Types
export {
  IThreadRegistryStore,
  type ThreadMetadata,
  type ThreadListOptions,
} from './lib/interfaces/thread-registry-store.interface';

// Type-Safe Utilities
export { RunnableConfigStoreHelpers } from './lib/utils/runnable-config-store.helpers';

// LangGraph BaseStore Types (re-export for consumer convenience)
export type { BaseStore, Item } from '@langchain/langgraph-checkpoint';

// Constants
export * from './lib/constants/store-namespaces';

// Errors
export * from './lib/errors/memory.errors';
