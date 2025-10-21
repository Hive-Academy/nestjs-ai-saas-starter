// Dependency injection tokens
export const MEMORY_CONFIG = 'MEMORY_CONFIG';
export const MEMORY_SERVICE = 'MEMORY_SERVICE';

// Default configuration values
export const DEFAULT_MEMORY_CONFIG = {
  collection: 'memory_store',
  enableAutoSummarization: true,
  summarization: {
    maxMessages: 20,
    strategy: 'balanced' as const,
  },
  retention: {
    maxEntries: 10000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    maxPerThread: 1000,
    maxTotal: 50000,
    cleanupInterval: 60 * 60 * 1000, // 1 hour in milliseconds
    evictionStrategy: 'lru' as const,
    importance: {
      threshold: 0.7,
      strategy: 'keep_above' as const,
    },
  },
  chromadb: {
    collection: 'memory_store',
  },
  neo4j: {
    database: 'neo4j',
  },
  limits: {
    countAccuracyLimit: 1000,
    memoryContentLimit: 1000,
    relationshipQueryLimit: 10,
    batchOperationLimit: 100,
    searchResultLimit: 100,
  },
  semanticRelationships: {
    enabled: true,
    strategy: 'hybrid' as const,
    similarityThreshold: 0.7,
    minCommonWords: 2,
    requireApoc: false,
    maxRelationshipsPerMemory: 5,
  },
} as const;

// Memory types
export const MEMORY_TYPES = [
  'conversation',
  'fact',
  'preference',
  'summary',
  'context',
  'custom',
] as const;

// Eviction strategies
export const EVICTION_STRATEGIES = [
  'lru',
  'lfu',
  'fifo',
  'importance',
] as const;

// Summarization strategies
export const SUMMARIZATION_STRATEGIES = [
  'recent',
  'important',
  'balanced',
] as const;
