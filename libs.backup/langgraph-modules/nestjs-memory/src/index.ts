// Main module
export { MemoryModule } from './lib/memory.module';

// Core services
export { MemoryService } from './lib/services/memory.service';
export { MemoryStorageService } from './lib/services/memory-storage.service';
export { MemoryGraphService } from './lib/services/memory-graph.service';

// Interfaces
export type {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySummarizationOptions,
  MemoryConfig,
  MemoryRetentionPolicy,
  MemoryStats,
  UserMemoryPatterns,
  MemoryServiceInterface,
  MemoryOperationMetrics,
} from './lib/interfaces/memory.interface';

export type {
  MemoryModuleOptions,
  MemoryModuleAsyncOptions,
  MemoryOptionsFactory,
} from './lib/interfaces/memory-module-options.interface';

// Adapter Pattern Interfaces
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
