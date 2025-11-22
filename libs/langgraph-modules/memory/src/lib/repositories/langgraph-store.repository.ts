import { Injectable, Logger } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  CollectionRegistryService,
  Where,
  toChromaWhere,
  type AppFilter,
} from '@hive-academy/nestjs-chromadb';
import { LangGraphStoreEntity } from '../entities/langgraph-store.entity';

/**
 * LangGraphStoreRepository - ChromaDB Repository for LangGraph Store Items
 *
 * Purpose: Type-safe repository for hierarchical namespace-based storage
 * Pattern: TypeORM-Style Repository with explicit constructor-based DI
 *
 * Features:
 * - Extends ChromaDBRepository<T> for automatic CRUD operations
 * - Explicit 3-parameter constructor (entity, collection, chromaDB)
 * - NO decorator magic - clear dependency injection
 * - Full type safety with LangGraphStoreEntity
 * - Collection binding at instantiation: 'langgraph-stores'
 *
 * Inherited CRUD Methods (from ChromaDBRepository):
 * - create(document): Create single document
 * - createMany(documents): Batch create
 * - findById(id): Find by ID
 * - findByIds(ids): Find multiple by IDs
 * - findAll(options): Find with filtering
 * - search(query, options): Semantic search
 * - searchWithScores(query, options): Search with similarity scores
 * - searchSimilar(embedding, options): Search by embedding vector
 * - update(id, data): Update document
 * - updateMany(updates): Batch update
 * - upsert(document): Create or update
 * - upsertMany(documents): Batch upsert
 * - delete(id): Delete by ID
 * - deleteMany(ids): Batch delete
 * - deleteByFilter(where, whereDocument): Delete by filter
 * - count(where, whereDocument): Count documents
 * - exists(id): Check existence
 * - peek(limit): Get first N documents
 * - clear(): Clear all documents
 * - getCollectionInfo(): Get collection metadata
 *
 * Custom Business Methods:
 * - findByKeyAndNamespace(): Get store item by key and namespace
 * - findByNamespace(): Get all items in a namespace
 * - searchInNamespace(): Semantic search within namespace
 * - deleteByNamespace(): Delete all items in namespace
 * - getNamespaceCount(): Count items in namespace
 */
@Injectable()
export class LangGraphStoreRepository extends ChromaDBRepository<LangGraphStoreEntity> {
  private readonly repositoryLogger = new Logger(LangGraphStoreRepository.name);

  /**
   * Explicit constructor with proper DI
   * Collection binding: 'langgraph-stores' (NOT 'vector-memories')
   *
   * @param chromaDB - ChromaDBService injected by NestJS
   * @param collectionRegistry - CollectionRegistryService for auto-initialization
   */
  constructor(
    chromaDB: ChromaDBService,
    collectionRegistry: CollectionRegistryService
  ) {
    super(
      LangGraphStoreEntity,
      'langgraph-stores',
      chromaDB,
      collectionRegistry
    );
    this.repositoryLogger.debug(
      'LangGraphStoreRepository initialized with collection: langgraph-stores'
    );
  }

  // ==================== CUSTOM BUSINESS METHODS ====================

  /**
   * Find store item by key and namespace
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param key - Store item key
   * @param namespace - Namespace array
   * @returns Store item or null if not found
   */
  async findByKeyAndNamespace(
    key: string,
    namespace: readonly string[]
  ): Promise<LangGraphStoreEntity | null> {
    try {
      const namespaceKey = namespace.join('/');

      const results = await this.findAll({
        where: {
          key,
          namespaceKey,
        } as Where,
        limit: 1,
      });

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to find store item by key ${key} and namespace ${namespace.join(
          '/'
        )}`,
        error
      );
      return null;
    }
  }

  /**
   * Find all items in a namespace
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param namespace - Namespace array
   * @param limit - Maximum number of items to return
   * @returns Array of store items in namespace
   */
  async findByNamespace(
    namespace: readonly string[],
    limit = 1000
  ): Promise<LangGraphStoreEntity[]> {
    try {
      const namespaceKey = namespace.join('/');

      return await this.findAll({
        where: { namespaceKey } as Where,
        limit,
      });
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to find items in namespace ${namespace.join('/')}`,
        error
      );
      return [];
    }
  }

  /**
   * Semantic search within a specific namespace
   * Uses ChromaDB server-side filtering during search
   *
   * @param query - Search query text
   * @param namespace - Namespace array to filter by
   * @param limit - Maximum number of results
   * @returns Array of semantically similar store items
   */
  async searchInNamespace(
    query: string,
    namespace: readonly string[],
    limit = 10
  ): Promise<LangGraphStoreEntity[]> {
    try {
      const namespaceKey = namespace.join('/');

      return await this.search(query, {
        where: { namespaceKey } as Where,
        limit,
      });
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to search in namespace ${namespace.join('/')}`,
        error
      );
      return [];
    }
  }

  /**
   * Delete all items in a namespace
   * Uses ChromaDB server-side filtering for deletion
   *
   * @param namespace - Namespace array
   * @returns Number of items deleted
   */
  async deleteByNamespace(namespace: readonly string[]): Promise<number> {
    try {
      const namespaceKey = namespace.join('/');

      const result = await this.deleteByFilter({ namespaceKey } as Where);

      this.repositoryLogger.debug(
        `Deleted ${result.successCount} items from namespace ${namespaceKey}`
      );

      return result.successCount || 0;
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to delete items in namespace ${namespace.join('/')}`,
        error
      );
      return 0;
    }
  }

  /**
   * Get count of items in a namespace
   * Uses ChromaDB server-side filtering for counting
   *
   * @param namespace - Namespace array
   * @returns Number of items in namespace
   */
  async getNamespaceCount(namespace: readonly string[]): Promise<number> {
    try {
      const namespaceKey = namespace.join('/');

      return await this.count({ namespaceKey } as Where);
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to count items in namespace ${namespace.join('/')}`,
        error
      );
      return 0;
    }
  }

  /**
   * List all unique namespaces in store
   * Uses ChromaDB peek and metadata extraction
   *
   * @param limit - Maximum number of namespaces to return
   * @returns Array of unique namespace keys
   */
  async listUniqueNamespaces(limit = 100): Promise<string[]> {
    try {
      const allItems = await this.findAll({ limit: 1000 });

      const uniqueNamespaces = new Set<string>();
      for (const item of allItems) {
        if (item.namespaceKey) {
          uniqueNamespaces.add(item.namespaceKey);
        }
      }

      return Array.from(uniqueNamespaces).slice(0, limit);
    } catch (error) {
      this.repositoryLogger.error('Failed to list unique namespaces', error);
      return [];
    }
  }

  // ==================== STORE BUSINESS LOGIC METHODS ====================
  // These methods contain ALL business logic for Store operations following
  // the Memory pattern (VectorMemoryRepository methods: storeMemory, retrieveByThread, etc.)

  /**
   * Put a store item (full business logic)
   * Handles ID generation, serialization, metadata creation
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key within namespace
   * @param value - Item value to store
   */
  async putItem(
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    try {
      const id = this.generateStoreId(namespace, key);
      const document = JSON.stringify(value);
      const now = new Date().toISOString();

      const metadata = {
        namespace: JSON.stringify(namespace),
        namespaceKey: namespace.join('/'),
        key,
        type: 'store_item' as const,
        createdAt: now,
        updatedAt: now,
        namespace_depth: namespace.length,
        namespace_root: namespace[0] || 'default',
        value_type: typeof value,
        serialized_length: document.length,
      };

      await this.create({
        id,
        content: document,
        metadata,
      });

      this.repositoryLogger.debug(`Put store item: ${id}`);
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to put store item [${namespace.join('/')}/${key}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Get a store item by namespace and key (full business logic)
   * Handles deserialization and null checks
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key within namespace
   * @returns Store item value or null if not found
   */
  async getItem(
    namespace: string[],
    key: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const entity = await this.findByKeyAndNamespace(key, namespace);

      if (!entity || !entity.content) {
        return null;
      }

      return JSON.parse(entity.content);
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to get store item [${namespace.join('/')}/${key}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Search store items with similarity scores (full business logic)
   *
   * @param namespacePrefix - Namespace prefix to filter by
   * @param query - Search query text
   * @param limit - Maximum number of results
   * @param filter - Optional metadata filter
   * @returns Array of store items with scores
   */
  async searchItems(
    namespacePrefix: string[],
    query: string,
    limit = 10,
    filter?: Record<string, unknown>
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
      score: number;
    }>
  > {
    try {
      // ✅ FIX: Validate query is not empty
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        this.repositoryLogger.warn(
          `[searchInNamespace] Empty or invalid query received: "${query}"`
        );
        throw new Error(
          `Query text cannot be empty or whitespace. Received: "${query}" (type: ${typeof query})`
        );
      }

      // 🔍 DEBUG: Log query details
      this.repositoryLogger.debug(
        `[searchInNamespace] namespacePrefix: ${JSON.stringify(
          namespacePrefix
        )}`
      );
      this.repositoryLogger.debug(
        `[searchInNamespace] query: "${query}" (length: ${query.length})`
      );
      this.repositoryLogger.debug(
        `[searchInNamespace] filter: ${JSON.stringify(filter)}, limit: ${limit}`
      );

      // ✅ FIX: Transform filter to ChromaDB-compliant where clause
      // Combine namespaceKey filter with optional additional filters
      const combinedFilter: AppFilter = {
        namespaceKey: namespacePrefix.join('/'),
        ...(filter || {}),
      };

      this.repositoryLogger.debug(
        `[searchInNamespace] combinedFilter: ${JSON.stringify(combinedFilter)}`
      );

      // Transform to ChromaDB-compliant format (handles $and wrapping automatically)
      const where = toChromaWhere(combinedFilter);

      this.repositoryLogger.debug(
        `[searchInNamespace] where clause: ${JSON.stringify(where)}`
      );
      this.repositoryLogger.debug(
        `[searchInNamespace] about to call searchWithScores with query: "${query}"`
      );

      const results = await this.searchWithScores(query, {
        where,
        limit,
      });

      return results.map((result) => ({
        namespace: JSON.parse(
          result.document.metadata.namespace || '["default"]'
        ),
        key: result.document.metadata.key || result.document.id,
        value: JSON.parse(result.document.content || '{}'),
        score: result.score,
      }));
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to search store items with prefix [${namespacePrefix.join(
          '/'
        )}]`,
        error
      );
      return [];
    }
  }

  /**
   * List store items in namespace (full business logic)
   *
   * @param namespacePrefix - Namespace prefix to filter by
   * @param limit - Maximum number of items
   * @param offset - Offset for pagination
   * @returns Array of store items
   */
  async listItems(
    namespacePrefix: string[],
    limit = 10,
    offset = 0
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
    }>
  > {
    try {
      const allItems = await this.findByNamespace(
        namespacePrefix,
        limit + offset
      );
      const paginatedItems = allItems.slice(offset, offset + limit);

      return paginatedItems.map((entity) => ({
        namespace: JSON.parse(entity.metadata.namespace || '["default"]'),
        key: entity.metadata.key || entity.id,
        value: JSON.parse(entity.content || '{}'),
      }));
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to list store items with prefix [${namespacePrefix.join('/')}]`,
        error
      );
      return [];
    }
  }

  /**
   * Delete a specific store item (full business logic)
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key to delete
   */
  async deleteItem(namespace: string[], key: string): Promise<void> {
    try {
      const id = this.generateStoreId(namespace, key);
      await this.delete(id);
      this.repositoryLogger.debug(`Deleted store item: ${id}`);
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to delete store item [${namespace.join('/')}/${key}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete entire namespace (full business logic)
   *
   * @param namespacePrefix - Namespace prefix to delete
   */
  async deleteNamespace(namespacePrefix: string[]): Promise<void> {
    try {
      await this.deleteByNamespace(namespacePrefix);
      this.repositoryLogger.debug(
        `Deleted namespace: ${namespacePrefix.join('/')}`
      );
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to delete namespace [${namespacePrefix.join('/')}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Get namespace statistics (full business logic)
   *
   * @param namespacePrefix - Namespace prefix to analyze
   * @returns Statistics including item count and child namespaces
   */
  async getNamespaceStats(
    namespacePrefix: string[]
  ): Promise<{ itemCount: number; namespaces: string[][] }> {
    try {
      const itemCount = await this.getNamespaceCount(namespacePrefix);
      const items = await this.findByNamespace(namespacePrefix, 1000);

      // Extract child namespaces
      const childNamespaces = new Set<string>();
      for (const item of items) {
        const ns = JSON.parse(item.metadata.namespace || '["default"]');
        if (ns.length > namespacePrefix.length) {
          // This is a child namespace
          const childKey = ns.slice(0, namespacePrefix.length + 1).join('/');
          childNamespaces.add(childKey);
        }
      }

      return {
        itemCount,
        namespaces: Array.from(childNamespaces).map((ns) => ns.split('/')),
      };
    } catch (error) {
      this.repositoryLogger.error(
        `Failed to get namespace stats for [${namespacePrefix.join('/')}]`,
        error
      );
      return { itemCount: 0, namespaces: [] };
    }
  }

  /**
   * Generate a unique store ID from namespace and key
   * Format: store:{namespace}/{key}
   *
   * @param namespace - Hierarchical namespace path
   * @param key - Item key
   * @returns Unique store ID
   */
  private generateStoreId(namespace: string[], key: string): string {
    const namespacePath = namespace.join('/');
    return `store:${namespacePath}:${key}`;
  }
}
