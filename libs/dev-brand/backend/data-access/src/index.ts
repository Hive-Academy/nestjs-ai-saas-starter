// Module exports
export { AgenticMemoryModule } from './lib/agentic-memory/memory.module';

// Public Memory Services (facade layer only)
export { MemoryFacadeService } from './lib/agentic-memory/services/memory-facade.service';
export { SemanticSearchService } from './lib/agentic-memory/services/semantic-search.service';
export { SummarizationService } from './lib/agentic-memory/services/summarization.service';
export { MemoryHealthService } from './lib/agentic-memory/health/memory-health.service';

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
} from './lib/agentic-memory/interfaces/memory.interface';

// Validation schemas
export {
  MemoryEntrySchema,
  MemorySearchOptionsSchema,
} from './lib/agentic-memory/interfaces/memory.interface';

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
} from './lib/agentic-memory/errors/memory-errors';

export type { MemoryErrorContext } from './lib/agentic-memory/errors/memory-errors';
