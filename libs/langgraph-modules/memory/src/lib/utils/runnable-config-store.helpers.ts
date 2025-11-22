/**
 * @fileoverview Type-Safe Helpers for BaseStore Access from RunnableConfig
 *
 * Centralizes BaseStore extraction from LangGraph's RunnableConfig with proper type safety.
 * Encapsulates the type casting required due to LangGraph's loose typing of `config.configurable`.
 *
 * **Why These Helpers Exist:**
 *
 * LangGraph's `RunnableConfig.configurable` is typed as `Record<string, any>`, which means
 * accessing `config.configurable.store` requires a type cast. These helpers:
 *
 * 1. Centralize the type casting logic in one location
 * 2. Provide descriptive error messages when store is missing
 * 3. Offer both optional and required access patterns
 * 4. Maintain type safety throughout the application
 *
 * **Pattern Source:**
 * - Originally created in HITL module (`runnable-config.factory.ts`)
 * - Moved to memory package for centralized access (this file)
 * - Used across workflow-engine, HITL, and other modules
 *
 * @module RunnableConfigStoreHelpers
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import type { BaseStore } from '@langchain/langgraph-checkpoint';

/**
 * Type-safe helpers for accessing BaseStore from RunnableConfig
 *
 * Provides static utility methods for extracting BaseStore from LangGraph's RunnableConfig
 * parameter passed to workflow nodes.
 *
 * **LangGraph Pattern:**
 * Store is passed via graph compilation and accessed in nodes through RunnableConfig:
 *
 * ```typescript
 * // Graph compilation (workflow-engine)
 * graph.compile({
 *   checkpointer: this.checkpointer,
 *   store: this.store  // ← Injected into graph
 * });
 *
 * // Node execution (your code)
 * async function myNode(state: State, config: RunnableConfig) {
 *   const store = RunnableConfigStoreHelpers.getStore(config);  // ← Type-safe access
 *   if (store) {
 *     await store.put(['memories', userId], 'key', { data });
 *   }
 * }
 * ```
 *
 * @class RunnableConfigStoreHelpers
 */
export class RunnableConfigStoreHelpers {
  /**
   * Get BaseStore from RunnableConfig (optional access)
   *
   * Returns the store if present, or undefined if not configured.
   * Use this when store access is optional (graceful degradation pattern).
   *
   * **Type Casting Explanation:**
   * The cast `as BaseStore | undefined` is required because LangGraph's
   * `RunnableConfig.configurable` is typed as `Record<string, any>`.
   * This is a LangGraph API limitation, not our architecture's fault.
   *
   * @param config - LangGraph RunnableConfig object passed to node functions
   * @returns BaseStore instance or undefined if not present in config
   *
   * @example
   * ```typescript
   * // Optional store access with graceful degradation
   * async function approvalNode(state: State, config: RunnableConfig) {
   *   const store = RunnableConfigStoreHelpers.getStore(config);
   *
   *   if (store) {
   *     // Store available - use it for cross-workflow memory
   *     await store.put(['approval-context', userId], `approval-${id}`, {
   *       executionId,
   *       confidence,
   *       timestamp: new Date(),
   *     });
   *   } else {
   *     // Store unavailable - continue without memory enhancement
   *     logger.debug('BaseStore not available - skipping pattern storage');
   *   }
   *
   *   return processApproval(state);
   * }
   * ```
   */
  static getStore(config: RunnableConfig): BaseStore | undefined {
    return config.configurable?.store as BaseStore | undefined;
  }

  /**
   * Ensure BaseStore is present in RunnableConfig (required access)
   *
   * Returns the store if present, or throws a descriptive error if missing.
   * Use this when store access is mandatory for node functionality.
   *
   * @param config - LangGraph RunnableConfig object passed to node functions
   * @returns BaseStore instance (guaranteed non-null)
   * @throws {Error} If BaseStore not found in config with instructions to fix
   *
   * @example
   * ```typescript
   * // Required store access (throws if missing)
   * async function memoryIntensiveNode(state: State, config: RunnableConfig) {
   *   // This node REQUIRES store to function
   *   const store = RunnableConfigStoreHelpers.ensureStore(config);
   *
   *   // Store guaranteed to be defined - no null checks needed
   *   const historicalData = await store.search(
   *     ['user-patterns', userId],
   *     { query: state.currentQuery, limit: 10 }
   *   );
   *
   *   return { ...state, context: historicalData };
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Error handling example
   * try {
   *   const store = RunnableConfigStoreHelpers.ensureStore(config);
   *   // Use store...
   * } catch (error) {
   *   // Error message: "BaseStore not found in RunnableConfig.
   *   //  Ensure graph is compiled with store: graph.compile({ checkpointer, store })"
   *   logger.error('Store required but not configured:', error.message);
   *   throw error;
   * }
   * ```
   */
  static ensureStore(config: RunnableConfig): BaseStore {
    const store = this.getStore(config);

    if (!store) {
      throw new Error(
        'BaseStore not found in RunnableConfig. ' +
          'Ensure graph is compiled with store: ' +
          'graph.compile({ checkpointer, store }). ' +
          'Store must be provided via MemoryModule.forRoot() or equivalent.'
      );
    }

    return store;
  }

  /**
   * Check if BaseStore is present in RunnableConfig
   *
   * Returns a boolean indicating whether store is configured.
   * Useful for conditional logic without retrieving the store instance.
   *
   * @param config - LangGraph RunnableConfig object passed to node functions
   * @returns true if store is present and defined, false otherwise
   *
   * @example
   * ```typescript
   * async function adaptiveNode(state: State, config: RunnableConfig) {
   *   if (RunnableConfigStoreHelpers.hasStore(config)) {
   *     // Enhanced mode with memory
   *     return await processWithMemory(state, config);
   *   } else {
   *     // Basic mode without memory
   *     return await processBasic(state);
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Logging and diagnostics
   * function logNodeContext(config: RunnableConfig) {
   *   const storeAvailable = RunnableConfigStoreHelpers.hasStore(config);
   *   logger.info('Node context:', {
   *     storeAvailable,
   *     threadId: config.configurable?.thread_id,
   *     checkpoint: !!config.configurable?.checkpointer,
   *   });
   * }
   * ```
   */
  static hasStore(config: RunnableConfig): boolean {
    return !!this.getStore(config);
  }
}
