/**
 * @fileoverview Typed Injection Tokens for Memory Module
 *
 * Provides type-safe dependency injection tokens for BaseStore and related services.
 * Eliminates string-based injection in favor of compile-time type checking.
 *
 * **Type Safety Benefits:**
 * - Compile-time type checking at injection sites
 * - IDE autocomplete and refactoring support
 * - Clear dependency graph visualization
 * - No runtime overhead (tokens are symbols)
 *
 * @module BaseStoreToken
 */

import type { BaseStore } from '@langchain/langgraph-checkpoint';

/**
 * Typed injection token for BaseStore
 *
 * Use this token instead of string 'BaseStore' for type-safe dependency injection.
 * The token is a symbol, providing unique identity and preventing naming conflicts.
 *
 * **Usage Example:**
 * ```typescript
 * // Provider definition (in MemoryModule)
 * {
 *   provide: BASE_STORE_TOKEN,
 *   useFactory: (chromaDB: ChromaDBService) => new ChromaDBBaseStore(chromaDB),
 *   inject: [ChromaDBService],
 * }
 *
 * // Consumer injection (in WorkflowExecutionService)
 * constructor(
 *   @Optional()
 *   @Inject(BASE_STORE_TOKEN)
 *   private readonly store?: BaseStore
 * ) {}
 * ```
 *
 * **Benefits vs String Token:**
 * ```typescript
 * // ❌ OLD: String token (weak typing)
 * @Inject('BaseStore') private store?: BaseStore
 *
 * // ✅ NEW: Typed token (strong typing)
 * @Inject(BASE_STORE_TOKEN) private store?: BaseStore
 * ```
 *
 * @type {symbol}
 */
export const BASE_STORE_TOKEN: unique symbol = Symbol('BaseStore');

/**
 * TypeScript utility type for BASE_STORE_TOKEN
 * Enables TypeScript to infer the correct type when using the token
 *
 * @example
 * ```typescript
 * type StoreType = typeof BASE_STORE_TOKEN; // symbol
 * type StoreInstance = BaseStoreTokenType;  // BaseStore
 * ```
 */
export type BaseStoreTokenType = BaseStore;
