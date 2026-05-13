import type { RunnableConfig } from '@langchain/core/runnables';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type { BaseStore } from '@langchain/langgraph';

/**
 * Factory class providing static helper methods for RunnableConfig access patterns.
 * Standardizes checkpointer and store extraction from LangGraph RunnableConfig.
 *
 * Pattern: Access state management via RunnableConfig parameter (not service injection)
 * Evidence: workflow-engine/CLAUDE.md:586-598 (embedded state management)
 *
 * @see implementation-plan.md:413-477 (RunnableConfig access pattern)
 * @see research-report.md:85-114 (LangGraph native checkpointer usage)
 */
export class RunnableConfigFactory {
  /**
   * Extract checkpointer from RunnableConfig (optional).
   *
   * @param config - LangGraph RunnableConfig object
   * @returns BaseCheckpointSaver instance or undefined if not present
   *
   * @example
   * ```typescript
   * async approvalNode(state: State, config: RunnableConfig) {
   *   const checkpointer = RunnableConfigFactory.getCheckpointer(config);
   *   if (checkpointer) {
   *     const checkpoint = await checkpointer.get(config);
   *   }
   * }
   * ```
   */
  static getCheckpointer(
    config: RunnableConfig
  ): BaseCheckpointSaver | undefined {
    return config.configurable?.checkpointer as BaseCheckpointSaver | undefined;
  }

  /**
   * Extract BaseStore from RunnableConfig (optional).
   * Requires TASK_2025_039 Task 7.8 completion (BaseStore integration in workflow-engine).
   *
   * @param config - LangGraph RunnableConfig object
   * @returns BaseStore instance or undefined if not present
   *
   * @example
   * ```typescript
   * async approvalNode(state: State, config: RunnableConfig) {
   *   const store = RunnableConfigFactory.getStore(config);
   *   if (store) {
   *     await store.put(['approval', userId], key, data);
   *   }
   * }
   * ```
   */
  static getStore(config: RunnableConfig): BaseStore | undefined {
    return config.configurable?.store as BaseStore | undefined;
  }

  /**
   * Ensure checkpointer is present in RunnableConfig (throws if missing).
   *
   * @param config - LangGraph RunnableConfig object
   * @returns BaseCheckpointSaver instance (guaranteed non-null)
   * @throws {Error} If checkpointer not found in config
   *
   * @example
   * ```typescript
   * async approvalNode(state: State, config: RunnableConfig) {
   *   const checkpointer = RunnableConfigFactory.ensureCheckpointer(config);
   *   // checkpointer guaranteed to be defined
   *   const checkpoint = await checkpointer.get(config);
   * }
   * ```
   */
  static ensureCheckpointer(config: RunnableConfig): BaseCheckpointSaver {
    const checkpointer = this.getCheckpointer(config);
    if (!checkpointer) {
      throw new Error(
        'Checkpointer not found in RunnableConfig. ' +
          'Ensure graph is compiled with checkpointer: graph.compile({ checkpointer })'
      );
    }
    return checkpointer;
  }

  /**
   * Ensure BaseStore is present in RunnableConfig (throws if missing).
   * Requires TASK_2025_039 Task 7.8 completion (BaseStore integration in workflow-engine).
   *
   * @param config - LangGraph RunnableConfig object
   * @returns BaseStore instance (guaranteed non-null)
   * @throws {Error} If store not found in config
   *
   * @example
   * ```typescript
   * async approvalNode(state: State, config: RunnableConfig) {
   *   const store = RunnableConfigFactory.ensureStore(config);
   *   // store guaranteed to be defined
   *   await store.put(['memories', userId], 'key', { data: 'value' });
   * }
   * ```
   */
  static ensureStore(config: RunnableConfig): BaseStore {
    const store = this.getStore(config);
    if (!store) {
      throw new Error(
        'BaseStore not found in RunnableConfig. ' +
          'Ensure graph is compiled with store: graph.compile({ checkpointer, store }). ' +
          'Note: Requires TASK_2025_039 Task 7.8 completion.'
      );
    }
    return store;
  }

  /**
   * Check if checkpointer is present in RunnableConfig.
   *
   * @param config - LangGraph RunnableConfig object
   * @returns true if checkpointer present, false otherwise
   */
  static hasCheckpointer(config: RunnableConfig): boolean {
    return !!this.getCheckpointer(config);
  }

  /**
   * Check if BaseStore is present in RunnableConfig.
   * Requires TASK_2025_039 Task 7.8 completion (BaseStore integration in workflow-engine).
   *
   * @param config - LangGraph RunnableConfig object
   * @returns true if store present, false otherwise
   */
  static hasStore(config: RunnableConfig): boolean {
    return !!this.getStore(config);
  }
}
