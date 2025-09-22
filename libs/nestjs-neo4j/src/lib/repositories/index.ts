/**
 * Neo4j Repository Framework
 *
 * This module provides a comprehensive repository pattern implementation for Neo4j:
 *
 * Base Repository:
 * - Standard CRUD operations with type safety
 * - Pagination and sorting utilities
 * - Soft delete support
 * - Query builder helpers
 * - Error handling and logging
 * - Performance monitoring integration
 *
 * Graph Repository:
 * - Graph traversals and path finding
 * - Relationship management
 * - Pattern matching
 * - Graph algorithms integration
 * - Centrality calculations
 * - Community detection
 *
 * Relationship Repository:
 * - CRUD operations for relationships
 * - Batch relationship operations
 * - Relationship traversal and queries
 * - Type-safe relationship handling
 * - Source and target node management
 *
 * Features:
 * - Full TypeScript type safety
 * - Automatic query optimization
 * - Connection pool management
 * - Transaction support
 * - Caching integration
 * - Metrics collection
 */

export * from './base-repository';
export * from './graph-repository';
export * from './relationship-repository';
