import type { MemoryModuleOptions } from '@hive-academy/langgraph-memory';

/**
 * Memory Module Configuration for dev-brand-api
 *
 * TASK_2025_039: BaseStore Pattern Migration
 * - Simplified to use LangGraph native BaseStore interface
 * - ChromaDBBaseStore implementation handles storage internally
 * - No adapter configuration needed (injected by app.module.ts)
 */
export function getMemoryConfig(): MemoryModuleOptions {
  return {
    // ChromaDB collection name for BaseStore
    collection: process.env.MEMORY_COLLECTION_NAME || 'langgraph_store',

    // Enable semantic search capabilities
    enableSemanticSearch: process.env.MEMORY_SEMANTIC_SEARCH_ENABLED === 'true',
  };
}

/**
 * Development/Demo specific memory configuration
 * Optimized for testing and demonstration purposes
 */
export function getMemoryDevConfig(): MemoryModuleOptions {
  return {
    collection: 'langgraph_store_dev',
    enableSemanticSearch: true, // Always enabled in dev
  };
}
