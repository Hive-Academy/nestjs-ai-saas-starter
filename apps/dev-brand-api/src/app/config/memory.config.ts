import type { MemoryModuleOptions } from '@hive-academy/langgraph-memory';

/**
 * Memory Module Configuration for dev-brand-api
 *
 * TASK_INT_012: Adapter Pattern Implementation
 * - Uses ChromaVectorAdapter with existing ChromaDB setup
 * - Uses Neo4jGraphAdapter with existing Neo4j setup
 * - No direct database imports in MemoryModule
 */
export function getMemoryConfig(): Omit<MemoryModuleOptions, 'adapters'> {
  return {
    // Memory configuration options
    retention: {
      maxEntries: parseInt(process.env.MEMORY_MAX_ENTRIES || '10000'),
      maxAge: parseInt(process.env.MEMORY_MAX_AGE_MS || '86400000'), // 24 hours in milliseconds
      maxPerThread: parseInt(process.env.MEMORY_MAX_PER_THREAD || '1000'),
      maxTotal: parseInt(process.env.MEMORY_MAX_TOTAL || '50000'),
      cleanupInterval: parseInt(
        process.env.MEMORY_CLEANUP_INTERVAL_MS || '3600000'
      ), // 1 hour in milliseconds
      evictionStrategy:
        (process.env.MEMORY_EVICTION_STRATEGY as
          | 'lru'
          | 'lfu'
          | 'fifo'
          | 'importance') || 'lru',
    },

    // Auto-summarization settings
    enableAutoSummarization:
      process.env.MEMORY_SUMMARIZATION_ENABLED === 'true',
    summarization: {
      maxMessages: parseInt(process.env.MEMORY_MAX_MESSAGES || '100'),
      strategy:
        (process.env.MEMORY_SUMMARIZATION_STRATEGY as
          | 'recent'
          | 'important'
          | 'balanced') || 'balanced',
    },

    // ChromaDB collection settings (used by ChromaVectorAdapter)
    chromadb: {
      collection: process.env.MEMORY_CHROMADB_COLLECTION || 'memory-entries',
    },

    // Neo4j database settings (used by Neo4jGraphAdapter)
    neo4j: {
      database:
        process.env.MEMORY_NEO4J_DATABASE ||
        process.env.NEO4J_DATABASE ||
        'neo4j',
    },

    // Collection name for memory entries
    collection: process.env.MEMORY_COLLECTION_NAME || 'dev-brand-memory',

    // Configurable operational limits
    limits: {
      countAccuracyLimit: parseInt(
        process.env.MEMORY_COUNT_ACCURACY_LIMIT || '1000'
      ),
      memoryContentLimit: parseInt(process.env.MEMORY_CONTENT_LIMIT || '1000'),
      relationshipQueryLimit: parseInt(
        process.env.MEMORY_RELATIONSHIP_QUERY_LIMIT || '10'
      ),
      batchOperationLimit: parseInt(
        process.env.MEMORY_BATCH_OPERATION_LIMIT || '100'
      ),
      searchResultLimit: parseInt(
        process.env.MEMORY_SEARCH_RESULT_LIMIT || '100'
      ),
    },

    // Semantic relationship configuration
    semanticRelationships: {
      enabled: process.env.MEMORY_SEMANTIC_RELATIONSHIPS_ENABLED !== 'false',
      strategy:
        (process.env.MEMORY_SEMANTIC_STRATEGY as
          | 'word_matching'
          | 'vector_similarity'
          | 'hybrid') || 'hybrid',
      similarityThreshold: parseFloat(
        process.env.MEMORY_SIMILARITY_THRESHOLD || '0.7'
      ),
      minCommonWords: parseInt(process.env.MEMORY_MIN_COMMON_WORDS || '2'),
      requireApoc: process.env.MEMORY_REQUIRE_APOC === 'true',
      maxRelationshipsPerMemory: parseInt(
        process.env.MEMORY_MAX_RELATIONSHIPS_PER_MEMORY || '5'
      ),
    },
  };
}

/**
 * Development/Demo specific memory configuration
 * Optimized for testing and demonstration purposes
 */
export function getMemoryDevConfig(): Omit<MemoryModuleOptions, 'adapters'> {
  const baseConfig = getMemoryConfig();

  return {
    ...baseConfig,
    collection: 'dev-brand-memory-dev',
    enableAutoSummarization: true, // Always enabled in dev
    retention: {
      ...baseConfig.retention,
      maxEntries: 1000, // Smaller limit for dev
      maxAge: 3600000, // 1 hour for dev (in milliseconds)
      maxPerThread: 100, // Lower limit for dev
      cleanupInterval: 600000, // 10 minutes for dev
    },
    summarization: {
      maxMessages: 10, // Lower threshold for testing
      strategy: 'balanced',
    },
    chromadb: {
      collection: 'memory-entries-dev',
    },
    neo4j: {
      database: 'neo4j',
    },
    limits: {
      countAccuracyLimit: 500, // Smaller limit for dev
      memoryContentLimit: 500, // Smaller content for dev
      relationshipQueryLimit: 5, // Fewer relationships for dev
      batchOperationLimit: 50, // Smaller batches for dev
      searchResultLimit: 50, // Fewer search results for dev
    },
    semanticRelationships: {
      enabled: true,
      strategy: 'word_matching', // Use simpler strategy for dev
      similarityThreshold: 0.6, // Lower threshold for more relationships
      minCommonWords: 1, // Lower threshold for dev
      requireApoc: false, // APOC-independent for dev reliability
      maxRelationshipsPerMemory: 3, // Fewer relationships for dev
    },
  };
}
