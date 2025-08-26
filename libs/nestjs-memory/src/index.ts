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