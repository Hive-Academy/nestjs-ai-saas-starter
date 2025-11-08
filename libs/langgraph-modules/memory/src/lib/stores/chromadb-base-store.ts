/**
 * @fileoverview ChromaDB Implementation of LangGraph BaseStore
 *
 * Direct ChromaDBService integration implementing LangGraph's BaseStore interface
 * for persistent memory storage with semantic search capabilities.
 *
 * Key Features:
 * - Direct ChromaDBService usage (no adapter layers)
 * - Namespace-based organization via metadata
 * - Semantic search support via vector embeddings
 * - Type-safe Item interface implementation
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
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import type { GetResult } from 'chromadb';

/**
 * ChromaDB implementation of LangGraph BaseStore interface
 *
 * Provides persistent storage for LangGraph workflows using ChromaDB as the backend.
 * Supports namespace-based organization, semantic search, and full CRUD operations.
 *
 * @implements {BaseStore}
 *
 * @example
 * ```typescript
 * const store = new ChromaDBBaseStore(chromaDBService, 'langgraph_store');
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
  private collectionInitialized = false;

  /**
   * Creates a new ChromaDBBaseStore instance
   *
   * @param chromaDB - ChromaDBService instance for vector database operations
   * @param collectionName - ChromaDB collection name for storing items (default: 'langgraph_store')
   */
  constructor(
    private readonly chromaDB: ChromaDBService,
    private readonly collectionName = 'langgraph_store'
  ) {
    super();
  }

  /**
   * Store an item in the specified namespace
   *
   * Creates or updates an item with the given key and value. The item is stored
   * with metadata for namespace organization and timestamps.
   *
   * @param namespace - Hierarchical namespace path (e.g., ['user', '123', 'settings'])
   * @param key - Unique key within the namespace
   * @param value - Data to store (must be JSON-serializable)
   *
   * @throws {Error} If ChromaDB operation fails
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
    await this.ensureCollection();

    const fullKey = this.buildFullKey(namespace, key);
    const namespaceStr = namespace.join('/');
    const now = new Date().toISOString();

    try {
      this.logger.debug(
        `Storing item: key=${fullKey}, namespace=${namespaceStr}`
      );

      // Direct ChromaDB usage - store value as JSON string in content field
      await this.chromaDB.addDocuments(this.collectionName, [
        {
          id: fullKey,
          content: JSON.stringify(value),
          metadata: {
            namespace: namespaceStr,
            key,
            created_at: now,
            updated_at: now,
            type: 'store_item',
          },
        },
      ]);

      this.logger.debug(`Successfully stored item: ${fullKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to store item: ${fullKey}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to store item in namespace [${namespaceStr}] with key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Retrieve a single item by namespace and key
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Unique key within the namespace
   * @returns The stored item or null if not found
   *
   * @throws {Error} If ChromaDB operation fails
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
    await this.ensureCollection();

    const fullKey = this.buildFullKey(namespace, key);

    try {
      this.logger.debug(`Retrieving item: ${fullKey}`);

      const results = await this.chromaDB.getDocuments(this.collectionName, {
        ids: [fullKey],
        includeMetadata: true,
        includeDocuments: true,
      });

      // Check if any results returned
      if (!results.ids || results.ids.length === 0 || !results.ids[0]) {
        this.logger.debug(`Item not found: ${fullKey}`);
        return null;
      }

      // Convert ChromaDB result to Item
      const item = this.toItem(results, 0);
      this.logger.debug(`Successfully retrieved item: ${fullKey}`);

      return item;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve item: ${fullKey}`,
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
   * Supports two modes:
   * 1. Semantic search: Provide a query string for vector similarity search
   * 2. List all: Omit query to list all items in the namespace
   *
   * @param namespace - Hierarchical namespace path
   * @param options - Search options
   * @param options.query - Optional query string for semantic search
   * @param options.limit - Maximum number of results (default: 10)
   * @returns Array of matching items
   *
   * @throws {Error} If ChromaDB operation fails
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
    await this.ensureCollection();

    const namespaceStr = namespace.join('/');
    const limit = options?.limit || 10;

    try {
      if (options?.query) {
        // Semantic search mode
        this.logger.debug(
          `Semantic search in namespace=${namespaceStr}, query="${options.query}", limit=${limit}`
        );

        const results = await this.chromaDB.searchDocuments(
          this.collectionName,
          [options.query],
          undefined,
          {
            nResults: limit,
            where: {
              namespace: namespaceStr,
              type: 'store_item',
            },
            includeMetadata: true,
            includeDocuments: true,
          }
        );

        // Convert results to Items
        const items = this.searchResultsToItems(results);
        this.logger.debug(
          `Semantic search found ${items.length} items in namespace=${namespaceStr}`
        );

        return items;
      } else {
        // List all mode
        this.logger.debug(
          `Listing all items in namespace=${namespaceStr}, limit=${limit}`
        );
        return this.list(namespace, limit);
      }
    } catch (error) {
      this.logger.error(
        `Failed to search in namespace=${namespaceStr}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to search in namespace [${namespaceStr}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List all items in a namespace
   *
   * @param namespace - Hierarchical namespace path
   * @param limit - Maximum number of results (default: 1000)
   * @returns Array of all items in the namespace
   *
   * @throws {Error} If ChromaDB operation fails
   *
   * @example
   * ```typescript
   * const allUserSettings = await store.list(['user', '123']);
   * ```
   */
  async list(namespace: string[], limit = 1000): Promise<Item[]> {
    await this.ensureCollection();

    const namespaceStr = namespace.join('/');

    try {
      this.logger.debug(
        `Listing items in namespace=${namespaceStr}, limit=${limit}`
      );

      // Use metadata filtering to get all items in namespace
      const results = await this.chromaDB.getDocuments(this.collectionName, {
        where: {
          namespace: namespaceStr,
          type: 'store_item',
        },
        limit,
        includeMetadata: true,
        includeDocuments: true,
      });

      // Convert all results to Items
      const items: Item[] = [];
      const idsArray = results.ids || [];

      for (let i = 0; i < idsArray.length; i++) {
        const item = this.toItem(results, i);
        items.push(item);
      }

      this.logger.debug(
        `Listed ${items.length} items in namespace=${namespaceStr}`
      );

      return items;
    } catch (error) {
      this.logger.error(
        `Failed to list items in namespace=${namespaceStr}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to list items in namespace [${namespaceStr}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete a single item by namespace and key
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Unique key within the namespace
   *
   * @throws {Error} If ChromaDB operation fails
   *
   * @example
   * ```typescript
   * await store.delete(['user', '123'], 'preferences');
   * ```
   */
  override async delete(namespace: string[], key: string): Promise<void> {
    await this.ensureCollection();

    const fullKey = this.buildFullKey(namespace, key);

    try {
      this.logger.debug(`Deleting item: ${fullKey}`);

      await this.chromaDB.deleteDocuments(this.collectionName, [fullKey]);

      this.logger.debug(`Successfully deleted item: ${fullKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete item: ${fullKey}`,
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
  // Private Helper Methods
  // =====================================================================

  /**
   * Ensure the ChromaDB collection exists
   *
   * Creates the collection if it doesn't exist. Uses lazy initialization
   * pattern to avoid unnecessary collection checks on every operation.
   *
   * @private
   */
  private async ensureCollection(): Promise<void> {
    if (this.collectionInitialized) {
      return;
    }

    try {
      const exists = await this.chromaDB.collectionExists(this.collectionName);

      if (!exists) {
        this.logger.log(`Creating ChromaDB collection: ${this.collectionName}`);
        await this.chromaDB.createCollection(this.collectionName);
      }

      this.collectionInitialized = true;
      this.logger.log(
        `ChromaDB collection initialized: ${this.collectionName}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to ensure collection: ${this.collectionName}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to initialize ChromaDB collection "${this.collectionName}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Build full key from namespace and key
   *
   * Combines namespace path and key into a single unique identifier
   * for ChromaDB storage.
   *
   * @private
   * @param namespace - Hierarchical namespace path
   * @param key - Item key
   * @returns Full key string (e.g., "user/123/preferences")
   */
  private buildFullKey(namespace: string[], key: string): string {
    return `${namespace.join('/')}/${key}`;
  }

  /**
   * Convert ChromaDB GetResult to Item
   *
   * Transforms ChromaDB's native result format into LangGraph's Item interface.
   *
   * @private
   * @param results - ChromaDB GetResult
   * @param index - Index of the result to convert
   * @returns LangGraph Item
   *
   * @throws {Error} If result data is missing or invalid
   */
  private toItem(results: GetResult, index: number): Item {
    try {
      // Extract data from ChromaDB result structure
      const id = results.ids?.[index];
      const document = results.documents?.[index];
      const metadata = results.metadatas?.[index];

      // Validate required fields
      if (!id || !document || !metadata) {
        throw new Error(
          `Invalid result at index ${index}: missing required fields`
        );
      }

      // Parse stored JSON value
      let value: Record<string, unknown>;
      try {
        value = JSON.parse(document);
      } catch (parseError) {
        throw new Error(
          `Failed to parse document JSON: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`
        );
      }

      // Construct Item with type-safe metadata access (use camelCase)
      const item: Item = {
        value,
        key: metadata.key as string,
        namespace: (metadata.namespace as string).split('/'),
        createdAt: new Date(metadata.created_at as string),
        updatedAt: new Date(metadata.updated_at as string),
      };

      return item;
    } catch (error) {
      this.logger.error(
        `Failed to convert result to Item at index ${index}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to convert ChromaDB result to Item: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Convert ChromaDB search results to Items array
   *
   * Transforms semantic search results from ChromaDB into LangGraph Items.
   *
   * @private
   * @param results - ChromaDB search results
   * @returns Array of LangGraph Items
   */
  private searchResultsToItems(results: any): Item[] {
    try {
      const items: Item[] = [];

      // ChromaDB search results have nested array structure [0][index]
      if (!results.ids || !results.ids[0] || results.ids[0].length === 0) {
        return items;
      }

      const idsArray = results.ids[0];
      const documentsArray = results.documents?.[0] || [];
      const metadatasArray = results.metadatas?.[0] || [];

      for (let i = 0; i < idsArray.length; i++) {
        const document = documentsArray[i];
        const metadata = metadatasArray[i];

        if (!document || !metadata) {
          this.logger.warn(
            `Skipping invalid search result at index ${i}: missing document or metadata`
          );
          continue;
        }

        try {
          const value = JSON.parse(document);

          items.push({
            value,
            key: metadata.key as string,
            namespace: (metadata.namespace as string).split('/'),
            createdAt: new Date(metadata.created_at as string),
            updatedAt: new Date(metadata.updated_at as string),
          });
        } catch (parseError) {
          this.logger.warn(
            `Skipping result at index ${i}: failed to parse JSON`,
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          );
        }
      }

      return items;
    } catch (error) {
      this.logger.error(
        'Failed to convert search results to Items',
        error instanceof Error ? error.stack : String(error)
      );
      throw new Error(
        `Failed to convert search results: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

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
