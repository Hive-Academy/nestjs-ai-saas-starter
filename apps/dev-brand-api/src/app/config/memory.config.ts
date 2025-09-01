import type { MemoryModuleOptions } from '@hive-academy/langgraph-modules-memory';

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
      ttlSeconds: parseInt(process.env.MEMORY_TTL_SECONDS || '86400'), // 24 hours
      evictionStrategy: (process.env.MEMORY_EVICTION_STRATEGY as any) || 'lru',
    },

    // Summarization settings
    summarization: {
      enabled: process.env.MEMORY_SUMMARIZATION_ENABLED === 'true',
      strategy:
        (process.env.MEMORY_SUMMARIZATION_STRATEGY as any) || 'extractive',
      maxSummaryLength: parseInt(
        process.env.MEMORY_MAX_SUMMARY_LENGTH || '500'
      ),
      triggerThreshold: parseInt(process.env.MEMORY_TRIGGER_THRESHOLD || '100'),
    },

    // ChromaDB collection settings (used by ChromaVectorAdapter)
    chromadb: {
      collectionName:
        process.env.MEMORY_CHROMADB_COLLECTION || 'memory-entries',
      embeddingFunction: process.env.MEMORY_EMBEDDING_FUNCTION || 'default',
    },

    // Neo4j database settings (used by Neo4jGraphAdapter)
    neo4j: {
      database:
        process.env.MEMORY_NEO4J_DATABASE ||
        process.env.NEO4J_DATABASE ||
        'neo4j',
      nodeLabels: {
        user: 'User',
        memory: 'MemoryEntry',
        context: 'Context',
      },
      relationshipTypes: {
        hasMemory: 'HAS_MEMORY',
        relatedTo: 'RELATED_TO',
        inContext: 'IN_CONTEXT',
      },
    },

    // Performance settings
    performance: {
      batchSize: parseInt(process.env.MEMORY_BATCH_SIZE || '100'),
      concurrencyLimit: parseInt(process.env.MEMORY_CONCURRENCY_LIMIT || '10'),
      cacheEnabled: process.env.MEMORY_CACHE_ENABLED !== 'false',
      cacheTtlSeconds: parseInt(process.env.MEMORY_CACHE_TTL_SECONDS || '300'), // 5 minutes
    },

    // Feature flags
    features: {
      vectorSearch: process.env.MEMORY_VECTOR_SEARCH_ENABLED !== 'false',
      graphTraversal: process.env.MEMORY_GRAPH_TRAVERSAL_ENABLED !== 'false',
      contextAwareness:
        process.env.MEMORY_CONTEXT_AWARENESS_ENABLED !== 'false',
      realTimeUpdates: process.env.MEMORY_REAL_TIME_UPDATES_ENABLED === 'true',
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
    retention: {
      ...baseConfig.retention,
      maxEntries: 1000, // Smaller limit for dev
      ttlSeconds: 3600, // 1 hour for dev
    },
    summarization: {
      ...baseConfig.summarization,
      enabled: true, // Always enabled in dev
      triggerThreshold: 10, // Lower threshold for testing
    },
    performance: {
      ...baseConfig.performance,
      batchSize: 10, // Smaller batches for dev
      concurrencyLimit: 3, // Lower concurrency for dev
      cacheEnabled: true,
      cacheTtlSeconds: 60, // 1 minute cache for rapid dev
    },
    features: {
      vectorSearch: true,
      graphTraversal: true,
      contextAwareness: true,
      realTimeUpdates: true, // All features enabled for demo
    },
  };
}
