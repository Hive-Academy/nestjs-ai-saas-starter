/**
 * @fileoverview Vector Query Decorator - Public API and re-exports
 *
 * This module provides the main @VectorQuery decorator with a clean API by
 * re-exporting from focused, split implementation modules.
 */

// Re-export main decorator
export { VectorQuery } from './vector-query-core';

// Re-export types and interfaces
export type {
  VectorQueryConfig,
  VectorQueryParams,
  TypedVectorSearchResult,
} from './vector-query-types';

// Re-export error class
export { VectorQueryError } from './vector-query-types';

// Re-export builder and utilities
export {
  VectorQueryBuilder,
  createVectorQueryBuilder,
} from './vector-query-builder';
