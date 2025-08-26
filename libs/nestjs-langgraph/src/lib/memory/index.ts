// Interfaces
export type * from './interfaces/database-provider.interface';
export type * from './interfaces/memory.interface';
export type * from './interfaces/vector-database.interface';
export type * from './interfaces/graph-database.interface';

// Adapters
export * from './adapters/chromadb-vector.adapter';
export * from './adapters/neo4j-graph.adapter';

// Providers
export * from './providers/database-provider.factory';
export * from './providers/memory-provider.module';

// Services
export * from './services/memory-facade.service';
export * from './services/semantic-search.service';
export * from './services/summarization.service';
// Note: Other services temporarily disabled during Phase 2 consolidation

// Errors
export * from './errors/memory-errors';

// Re-export commonly used types and tokens
export {
  MEMORY_DATABASE_DETECTOR,
  DATABASE_PROVIDER_FACTORY,
  MEMORY_PROVIDER_TOKENS,
} from './providers/memory-provider.module';
