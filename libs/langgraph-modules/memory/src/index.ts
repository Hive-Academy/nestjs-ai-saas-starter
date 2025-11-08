/**
 * @hive-academy/langgraph-memory
 *
 * Thin memory layer implementing LangGraph BaseStore pattern.
 * Provides direct ChromaDB-backed storage for workflow state persistence.
 *
 * Architecture: 1-layer BaseStore (was 6-layer abstraction)
 * Code: ~900 LOC (was 5,000+ LOC)
 */

// ============================================================
// Memory Module - BaseStore Pattern
// ============================================================

// Module
export * from './lib/memory.module';

// Store Implementation
export { ChromaDBBaseStore } from './lib/stores/chromadb-base-store';

// LangGraph BaseStore Types (re-export for consumer convenience)
export type { BaseStore, Item } from '@langchain/langgraph-checkpoint';

// Constants
export * from './lib/constants/store-namespaces';

// Errors
export * from './lib/errors/memory.errors';
