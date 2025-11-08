// ===================================================================
// Memory Module - BaseStore DI Bridge
// ===================================================================

// Main module
export { MemoryModule } from './lib/memory.module';

// Module configuration types (from memory.module.ts)
export type {
  MemoryModuleOptions,
  MemoryModuleAsyncOptions,
} from './lib/memory.module';

// BaseStore implementation
export { ChromaDBBaseStore } from './lib/stores/chromadb-base-store';

// LangGraph BaseStore types (re-export from @langchain/langgraph-checkpoint)
export type { BaseStore, Item } from '@langchain/langgraph-checkpoint';

// ===================================================================
// DEPRECATED: Legacy exports maintained for backward compatibility
// These will be removed in a future version
// New consumers should use BaseStore directly
// ===================================================================

// Legacy interfaces kept for backward compatibility only
export { IVectorService } from './lib/interfaces/vector-service.interface';
export { IGraphService } from './lib/interfaces/graph-service.interface';

export type {
  VectorStoreData,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStats,
  VectorGetOptions,
  VectorGetResult,
} from './lib/interfaces/vector-service.interface';

export type {
  GraphNodeData,
  GraphRelationshipData,
  TraversalSpec,
  GraphTraversalResult,
  GraphQueryResult,
  GraphStats,
  GraphOperation,
  GraphBatchResult,
  GraphFindCriteria,
  GraphNode,
  GraphRelationship,
  GraphPath,
} from './lib/interfaces/graph-service.interface';

// Legacy error types
export {
  InvalidCollectionError,
  InvalidInputError,
  VectorOperationError,
} from './lib/interfaces/vector-service.interface';

export {
  InvalidNodeError,
  InvalidInputError as GraphInvalidInputError,
  SecurityError,
  GraphOperationError,
  TransactionError,
} from './lib/interfaces/graph-service.interface';
