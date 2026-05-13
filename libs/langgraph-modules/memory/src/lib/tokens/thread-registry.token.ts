/**
 * @fileoverview Typed Injection Token for ThreadRegistryStore
 *
 * Provides type-safe dependency injection token for thread registry storage.
 * Eliminates string-based injection in favor of compile-time type checking.
 *
 * **Architecture Pattern**: Symbol-based Token with TypeScript Utility Type
 * **Reference**: BASE_STORE_TOKEN (base-store.token.ts:52-64)
 *
 * **Type Safety Benefits**:
 * - Compile-time type checking at injection sites
 * - IDE autocomplete and refactoring support
 * - Clear dependency graph visualization
 * - Zero runtime overhead (symbols are native)
 *
 * @module ThreadRegistryToken
 */

import type { IThreadRegistryStore } from '../interfaces/thread-registry-store.interface';

/**
 * Typed injection token for ThreadRegistryStore
 *
 * Use this token instead of string 'ThreadRegistryStore' for type-safe dependency injection.
 * The token is a symbol, providing unique identity and preventing naming conflicts.
 *
 * **Usage Example:**
 * ```typescript
 * // Provider definition (in MemoryModule)
 * {
 *   provide: THREAD_REGISTRY_TOKEN,
 *   useClass: Neo4jThreadRegistryAdapter,
 * }
 *
 * // Consumer injection (in DevBrandController)
 * constructor(
 *   @Optional()
 *   @Inject(THREAD_REGISTRY_TOKEN)
 *   private readonly threadRegistry?: IThreadRegistryStore
 * ) {}
 * ```
 *
 * **Benefits vs String Token:**
 * ```typescript
 * // ❌ OLD: String token (weak typing, typo-prone)
 * @Inject('ThreadRegistryStore') private store?: IThreadRegistryStore
 *
 * // ✅ NEW: Typed token (strong typing, autocomplete)
 * @Inject(THREAD_REGISTRY_TOKEN) private store?: IThreadRegistryStore
 * ```
 *
 * **Graceful Degradation Pattern:**
 * ```typescript
 * // Always use @Optional() for graceful degradation
 * @Optional()
 * @Inject(THREAD_REGISTRY_TOKEN)
 * private readonly threadRegistry?: IThreadRegistryStore
 *
 * // Check before usage
 * if (!this.threadRegistry) {
 *   return []; // Return empty array when unavailable
 * }
 * ```
 *
 * @type {symbol}
 */
export const THREAD_REGISTRY_TOKEN: unique symbol = Symbol(
  'ThreadRegistryStore'
);

/**
 * TypeScript utility type for THREAD_REGISTRY_TOKEN
 * Enables TypeScript to infer the correct type when using the token
 *
 * @example
 * ```typescript
 * type TokenType = typeof THREAD_REGISTRY_TOKEN;        // symbol
 * type StoreInstance = ThreadRegistryTokenType;         // IThreadRegistryStore
 * ```
 */
export type ThreadRegistryTokenType = IThreadRegistryStore;
