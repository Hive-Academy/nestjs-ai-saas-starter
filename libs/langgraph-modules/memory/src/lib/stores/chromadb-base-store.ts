/**
 * @fileoverview ChromaDB Implementation of LangGraph BaseStore
 *
 * Delegates to LangGraphStoreRepository for all storage operations, implementing
 * LangGraph's BaseStore interface with type-safe repository pattern.
 *
 * **Architecture Change:**
 * - BEFORE: Direct ChromaDBService usage with manual CRUD operations
 * - AFTER: Delegates to LangGraphStoreRepository (type-safe, tested, maintainable)
 *
 * **Key Features:**
 * - Repository pattern for separation of concerns
 * - Type-safe entity model (LangGraphStoreEntity)
 * - Semantic search via ChromaDB embeddings
 * - Namespace-based organization
 * - Production-ready error handling
 *
 * @module ChromaDBBaseStore
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseStore } from '@langchain/langgraph-checkpoint';
import type {
  Item,
  Operation,
  OperationResults,
} from '@langchain/langgraph-checkpoint';
import { LangGraphStoreRepository } from '../repositories/langgraph-store.repository';

/**
 * ChromaDB implementation of LangGraph BaseStore interface
 *
 * Provides persistent storage for LangGraph workflows using ChromaDB as the backend.
 * Delegates all storage operations to LangGraphStoreRepository for type safety and maintainability.
 *
 * **Repository Delegation Pattern:**
 * ```
 * BaseStore (LangGraph API)
 *    ↓
 * ChromaDBBaseStore (this class - API adapter)
 *    ↓
 * LangGraphStoreRepository (business logic)
 *    ↓
 * ChromaDBRepository (CRUD operations)
 *    ↓
 * ChromaDBService (ChromaDB client)
 * ```
 *
 * @implements {BaseStore}
 *
 * @example
 * ```typescript
 * // Create store instance (typically done by MemoryModule)
 * const repository = new LangGraphStoreRepository(chromaDB, collectionRegistry);
 * const store = new ChromaDBBaseStore(repository);
 *
 * // Store item
 * await store.put(['user', '123'], 'preferences', { theme: 'dark', lang: 'en' });
 *
 * // Retrieve item
 * const item = await store.get(['user', '123'], 'preferences');
 *
 * // Semantic search
 * const results = await store.search(['user', '123'], { query: 'theme settings', limit: 5 });
 *
 * // List all items in namespace
 * const allItems = await store.list(['user', '123']);
 *
 * // Delete item
 * await store.delete(['user', '123'], 'preferences');
 * ```
 */
@Injectable()
export class ChromaDBBaseStore extends BaseStore {
  private readonly logger = new Logger(ChromaDBBaseStore.name);

  /**
   * Creates a new ChromaDBBaseStore instance
   *
   * @param repository - LangGraphStoreRepository for all storage operations
   */
  constructor(private readonly repository: LangGraphStoreRepository) {
    super();
    this.logger.log('ChromaDBBaseStore initialized with repository pattern');
  }

  /**
   * Store an item in the specified namespace
   *
   * Delegates to repository.putItem() which handles:
   * - ID generation
   * - JSON serialization
   * - Metadata creation
   * - Timestamp management
   *
   * @param namespace - Hierarchical namespace path (e.g., ['user', '123', 'settings'])
   * @param key - Unique key within the namespace
   * @param value - Data to store (must be JSON-serializable)
   *
   * @throws {Error} If repository operation fails
   *
   * @example
   * ```typescript
   * await store.put(['user', '123'], 'preferences', {
   *   theme: 'dark',
   *   notifications: true
   * });
   * ```
   */
  override async put(
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    try {
      this.logger.debug(
        `Storing item: namespace=${namespace.join('/')}, key=${key}`
      );

      await this.repository.putItem(namespace, key, value);

      this.logger.debug(
        `Successfully stored item: ${namespace.join('/')}/${key}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store item [${namespace.join('/')}/${key}]`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to store item in namespace [${namespace.join(
          '/'
        )}] with key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Retrieve a single item by namespace and key
   *
   * Delegates to repository.getItem() which handles:
   * - Entity lookup
   * - JSON deserialization
   * - Type conversion to Item interface
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Unique key within the namespace
   * @returns The stored item or null if not found
   *
   * @throws {Error} If repository operation fails
   *
   * @example
   * ```typescript
   * const preferences = await store.get(['user', '123'], 'preferences');
   * if (preferences) {
   *   console.log(preferences.value); // { theme: 'dark', notifications: true }
   * }
   * ```
   */
  override async get(namespace: string[], key: string): Promise<Item | null> {
    try {
      this.logger.debug(
        `Retrieving item: namespace=${namespace.join('/')}, key=${key}`
      );

      const value = await this.repository.getItem(namespace, key);

      if (!value) {
        this.logger.debug(`Item not found: ${namespace.join('/')}/${key}`);
        return null;
      }

      // Convert repository result to LangGraph Item interface
      const item: Item = {
        value,
        key,
        namespace,
        createdAt: new Date(), // Timestamps managed by repository
        updatedAt: new Date(),
      };

      this.logger.debug(
        `Successfully retrieved item: ${namespace.join('/')}/${key}`
      );

      return item;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve item [${namespace.join('/')}/${key}]`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to retrieve item from namespace [${namespace.join(
          '/'
        )}] with key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Search for items in a namespace with optional semantic search
   *
   * Delegates to repository.searchItems() or repository.listItems() depending on query:
   * - With query: Semantic search using vector embeddings
   * - Without query: List all items in namespace
   *
   * @param namespace - Hierarchical namespace path
   * @param options - Search options
   * @param options.query - Optional query string for semantic search
   * @param options.limit - Maximum number of results (default: 10)
   * @returns Array of matching items
   *
   * @throws {Error} If repository operation fails
   *
   * @example
   * ```typescript
   * // Semantic search
   * const results = await store.search(['user', '123'], {
   *   query: 'theme settings',
   *   limit: 5
   * });
   *
   * // List all (no query)
   * const allItems = await store.search(['user', '123'], { limit: 100 });
   * ```
   */
  override async search(
    namespace: string[],
    options?: { query?: string; limit?: number }
  ): Promise<Item[]> {
    try {
      const limit = options?.limit || 10;

      if (options?.query) {
        // Semantic search mode
        this.logger.debug(
          `Semantic search: namespace=${namespace.join('/')}, query="${
            options.query
          }", limit=${limit}`
        );

        const results = await this.repository.searchItems(
          namespace,
          options.query,
          limit
        );

        // Convert repository results to LangGraph Items
        const items: Item[] = results.map((result) => ({
          value: result.value,
          key: result.key,
          namespace: result.namespace,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        this.logger.debug(
          `Semantic search found ${
            items.length
          } items in namespace=${namespace.join('/')}`
        );

        return items;
      } else {
        // List all mode
        this.logger.debug(
          `Listing items: namespace=${namespace.join('/')}, limit=${limit}`
        );

        const results = await this.repository.listItems(namespace, limit);

        // Convert repository results to LangGraph Items
        const items: Item[] = results.map((result) => ({
          value: result.value,
          key: result.key,
          namespace: result.namespace,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        this.logger.debug(
          `Listed ${items.length} items in namespace=${namespace.join('/')}`
        );

        return items;
      }
    } catch (error) {
      this.logger.error(
        `Failed to search in namespace=${namespace.join('/')}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to search in namespace [${namespace.join('/')}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List all items in a namespace
   *
   * Delegates to repository.listItems() with specified limit.
   *
   * @param namespace - Hierarchical namespace path
   * @param limit - Maximum number of results (default: 1000)
   * @returns Array of all items in the namespace
   *
   * @throws {Error} If repository operation fails
   *
   * @example
   * ```typescript
   * const allUserSettings = await store.list(['user', '123']);
   * ```
   */
  async list(namespace: string[], limit = 1000): Promise<Item[]> {
    try {
      this.logger.debug(
        `Listing items: namespace=${namespace.join('/')}, limit=${limit}`
      );

      const results = await this.repository.listItems(namespace, limit);

      // Convert repository results to LangGraph Items
      const items: Item[] = results.map((result) => ({
        value: result.value,
        key: result.key,
        namespace: result.namespace,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      this.logger.debug(
        `Listed ${items.length} items in namespace=${namespace.join('/')}`
      );

      return items;
    } catch (error) {
      this.logger.error(
        `Failed to list items in namespace=${namespace.join('/')}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to list items in namespace [${namespace.join('/')}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete a single item by namespace and key
   *
   * Delegates to repository.deleteItem() which handles entity deletion.
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Unique key within the namespace
   *
   * @throws {Error} If repository operation fails
   *
   * @example
   * ```typescript
   * await store.delete(['user', '123'], 'preferences');
   * ```
   */
  override async delete(namespace: string[], key: string): Promise<void> {
    try {
      this.logger.debug(
        `Deleting item: namespace=${namespace.join('/')}, key=${key}`
      );

      await this.repository.deleteItem(namespace, key);

      this.logger.debug(
        `Successfully deleted item: ${namespace.join('/')}/${key}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete item [${namespace.join('/')}/${key}]`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to delete item from namespace [${namespace.join(
          '/'
        )}] with key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // =====================================================================
  // LangGraph BaseStore Abstract Methods (Not Yet Implemented)
  // =====================================================================

  /**
   * Execute multiple operations in a single batch
   *
   * Implements BaseStore's batch operation interface for efficient bulk operations.
   *
   * @param operations - Array of operations to execute
   * @returns Promise resolving to results matching the operations
   *
   * @throws {Error} Not yet implemented (future enhancement)
   */
  async batch<Op extends Operation[]>(
    operations: Op
  ): Promise<OperationResults<Op>> {
    this.logger.warn(
      'batch() method not yet implemented - will be added in future enhancement'
    );
    throw new Error(
      'ChromaDBBaseStore.batch() not yet implemented. Use individual operations (get, put, search, delete) instead.'
    );
  }

  /**
   * List and filter namespaces in the store
   *
   * Implements BaseStore's namespace listing interface for exploring data organization.
   *
   * @param options - Options for listing namespaces
   * @returns Promise resolving to list of namespace paths
   *
   * @throws {Error} Not yet implemented (future enhancement)
   */
  override async listNamespaces(options?: {
    prefix?: string[];
    suffix?: string[];
    maxDepth?: number;
    limit?: number;
    offset?: number;
  }): Promise<string[][]> {
    this.logger.warn(
      'listNamespaces() method not yet implemented - will be added in future enhancement'
    );
    throw new Error(
      'ChromaDBBaseStore.listNamespaces() not yet implemented. Track namespaces manually or use search() with namespace filters.'
    );
  }
}
