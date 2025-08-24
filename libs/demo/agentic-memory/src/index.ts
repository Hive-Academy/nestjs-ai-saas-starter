// Module exports
export { AgenticMemoryModule } from './memory.module';

// Public Memory Services (facade layer only)
export { MemoryFacadeService } from './lib/services/memory-facade.service';
export { SemanticSearchService } from './lib/services/semantic-search.service';
export { SummarizationService } from './lib/services/summarization.service';
export { MemoryHealthService } from './lib/health/memory-health.service';

// Interface and type exports
export type {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySummarizationOptions,
  MemoryConfig,
  MemoryStorageConfig,
  MemoryRetentionPolicy,
  MemoryStats,
  MemoryServiceInterface,
  UserMemoryPatterns,
  StorageStats,
  ChromaWhereClause,
  ChromaQueryResults,
} from './lib/interfaces/memory.interface';

// Validation schemas
export {
  MemoryEntrySchema,
  MemorySearchOptionsSchema,
} from './lib/interfaces/memory.interface';

// Error classes
export {
  MemoryError,
  MemoryStorageError,
  MemoryRelationshipError,
  MemoryEmbeddingError,
  MemorySummarizationError,
  MemoryConfigurationError,
  MemoryTimeoutError,
  wrapMemoryError,
  isMemoryError,
  extractErrorMessage,
} from './lib/errors/memory-errors';

export type { MemoryErrorContext } from './lib/errors/memory-errors';
