// Module exports
export { LanggraphModulesMemoryModule } from './memory.module';

// Public Memory Services (facade layer only)
export { MemoryFacadeService } from './lib/services/memory-facade.service';
export { SemanticSearchService } from './lib/services/semantic-search.service';
export { SummarizationService } from './lib/services/summarization.service';

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
