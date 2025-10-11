// Main module
export { MemoryModule } from './lib/memory.module';

// Core services
export { MemoryService } from './lib/services/memory.service';
export { MemoryStorageService } from './lib/services/memory-storage.service';
export { MemoryGraphService } from './lib/services/memory-graph.service';
export { AgentMemoryBridgeService } from './lib/services/agent-memory-bridge.service';

// Specialized agent memory services (TASK_2025_006)
export { AgentMemoryCoreService } from './lib/services/agent-memory-core.service';
export { AgentMemoryContextService } from './lib/services/agent-memory-context.service';
export { AgentMemoryCheckpointService } from './lib/services/agent-memory-checkpoint.service';
export { AgentMemoryStatsService } from './lib/services/agent-memory-stats.service';

// Interfaces
export type {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySummarizationOptions,
  MemoryConfig,
  MemoryRetentionPolicy,
  MemoryStats,
  UserMemoryPatterns as BaseUserMemoryPatterns,
  MemoryServiceInterface,
  MemoryOperationMetrics,
  SerializableValue,
  SerializableArray,
  SerializableObject,
  MetadataValue,
} from './lib/interfaces/memory.interface';

export type {
  MemoryModuleOptions,
  MemoryModuleAsyncOptions,
  MemoryOptionsFactory,
} from './lib/interfaces/memory-module-options.interface';

export {
  DEFAULT_AGENTIC_CONFIG,
  DEFAULT_RAG_CONFIG,
  DEFAULT_AGENT_MEMORY_CONFIG,
  DEFAULT_STORE_CONFIG,
} from './lib/interfaces/memory-module-options.interface';

// Adapter Pattern Interfaces
export { IVectorService } from './lib/interfaces/vector-service.interface';
export { IGraphService } from './lib/interfaces/graph-service.interface';

// Memory Adapter Interfaces (re-exported from core)
// Note: ExtendedMemoryAdapter, MemoryManagerAdapter, MemoryAdapterFactory removed
// Use IMemoryAdapter from core and AgentMemoryBridgeService for implementations

// Re-export core memory adapter interfaces for convenience
export { IMemoryAdapter, isMemoryAdapter } from '@hive-academy/langgraph-core';

export type {
  AgentState,
  AgentMemoryContext,
  UserMemoryPatterns,
  Store,
  MemorySearchOptions as CoreMemorySearchOptions,
} from '@hive-academy/langgraph-core';

// NEW: LangGraph Store Interface (LangGraph 2025 Compliance)
export type {
  Item,
  Store as MemoryStore,
} from './lib/interfaces/langgraph-store.interface';
export {
  ChromaLangGraphStore,
  LangGraphStoreFactory,
  NamespaceUtils,
  isValidItem,
} from './lib/interfaces/langgraph-store.interface';

// NEW: Agent State Integration Interfaces (local extensions)
export type {
  IAgentMemoryService,
  AgentMemory,
  AgentMemoryConfig,
  AgentMemoryStats,
  IAgentMemoryBridge,
} from './lib/interfaces/agent-memory.interface';

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

// Adapter Implementations
// NOTE: Adapters have been moved to application layer for proper separation of concerns
// Applications should implement their own adapters extending IVectorService and IGraphService

// Adapter Error Types
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

// Constants
export {
  MEMORY_CONFIG,
  MEMORY_SERVICE,
  DEFAULT_MEMORY_CONFIG,
  MEMORY_TYPES,
  EVICTION_STRATEGIES,
  SUMMARIZATION_STRATEGIES,
} from './lib/constants/memory.constants';

// Validation schemas
export {
  MemoryEntrySchema,
  MemorySearchOptionsSchema,
} from './lib/interfaces/memory.interface';

// Error types
export {
  MemoryException,
  MemoryNotFoundException,
  MemoryStorageException,
  MemoryValidationException,
  MemoryQuotaExceededException,
  MemoryConfigurationException,
  extractErrorMessage,
  wrapMemoryError,
} from './lib/errors/memory.errors';
