import type { MemoryModuleOptions } from '@hive-academy/langgraph-memory';

/**
 * Memory Module Configuration for dev-brand-api
 *
 * TASK_2025_039: BaseStore Pattern Migration
 * - Simplified to use LangGraph native BaseStore interface
 * - ChromaDBBaseStore implementation handles storage internally
 *
 * TASK_2025_052: Thread Registry Integration
 * - Thread registry adapter is now injected in app.module.ts via forRootAsync
 * - Follows the same pattern as HitlModule for proper dependency injection
 * - Prevents direct coupling between library modules
 */
export function getMemoryConfig(): MemoryModuleOptions {
  return {
    // ChromaDB collection name for BaseStore
    collection: process.env.MEMORY_COLLECTION_NAME || 'langgraph_store',

    // Enable semantic search capabilities
    enableSemanticSearch: process.env.MEMORY_SEMANTIC_SEARCH_ENABLED === 'true',

    // NOTE: threadRegistry is injected in app.module.ts via forRootAsync
    // This prevents direct dependency between MemoryModule and LangGraphAdaptersModule
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

    // NOTE: threadRegistry is injected in app.module.ts via forRootAsync
  };
}
