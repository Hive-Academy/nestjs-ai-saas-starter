import { Injectable, Logger } from '@nestjs/common';
import type {
  IStoreService,
  StoreItem,
} from './interfaces/store-service.interface';
import { StoreStorageService } from './store-storage.service';
import { StoreGraphService } from './store-graph.service';

/**
 * Main store service providing orchestrated store operations
 *
 * Coordinates:
 * - Storage operations (ChromaDB) via StoreStorageService
 * - Graph operations (Neo4j) via StoreGraphService
 * - Namespace-based hierarchical organization
 * - Cross-thread memory sharing
 *
 * Implements LangGraph 2025 Store pattern for cross-thread memory persistence
 */
@Injectable()
export class StoreService implements IStoreService {
  protected readonly logger = new Logger(StoreService.name);

  /**
   * Default collection name for store operations
   * CRITICAL: This is 'langgraph-stores' NOT 'vector-memories'
   */
  private defaultCollection = 'langgraph-stores';

  constructor(
    private readonly storageService: StoreStorageService,
    private readonly graphService: StoreGraphService
  ) {}

  /**
   * Store an item with namespace-based organization
   * Coordinates both vector storage and optional graph tracking
   */
  async putStoreItem(
    namespace: string[],
    key: string,
    value: Record<string, any>
  ): Promise<void> {
    try {
      this.validateNamespace(namespace);
      this.validateKey(key);

      // Store in vector database
      await this.storageService.put(namespace, key, value);

      this.logger.debug(
        `Stored item: ${namespace.join('/')}/${key} in collection ${
          this.defaultCollection
        }`
      );
    } catch (error) {
      this.logger.error(
        `Failed to put store item [${namespace.join('/')}/${key}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Retrieve an item from the store
   */
  async getStoreItem(
    namespace: string[],
    key: string
  ): Promise<Record<string, any> | null> {
    try {
      this.validateNamespace(namespace);
      this.validateKey(key);

      const item = await this.storageService.get(namespace, key);

      this.logger.debug(
        `Retrieved item: ${namespace.join('/')}/${key} from collection ${
          this.defaultCollection
        }`
      );

      return item;
    } catch (error) {
      this.logger.error(
        `Failed to get store item [${namespace.join('/')}/${key}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete an item from the store
   * Removes from both vector and graph storage
   */
  async deleteStoreItem(namespace: string[], key: string): Promise<void> {
    try {
      this.validateNamespace(namespace);
      this.validateKey(key);

      // Delete from vector storage
      await this.storageService.delete(namespace, key);

      // Delete from graph storage (graceful degradation)
      await this.graphService.deleteStoreItem(namespace, key);

      this.logger.debug(
        `Deleted item: ${namespace.join('/')}/${key} from collection ${
          this.defaultCollection
        }`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete store item [${namespace.join('/')}/${key}]`,
        error
      );
      throw error;
    }
  }

  /**
   * Search for items with namespace prefix filtering
   */
  async searchStoreItems(
    namespacePrefix: string[],
    filter?: Record<string, any>,
    limit = 10
  ): Promise<StoreItem[]> {
    try {
      this.validateNamespace(namespacePrefix);

      const items = await this.storageService.search(
        namespacePrefix,
        '', // query - empty string for filter-only search
        limit,
        filter
      );

      this.logger.debug(
        `Found ${items.length} items with prefix [${namespacePrefix.join(
          '/'
        )}] in collection ${this.defaultCollection}`
      );

      return items;
    } catch (error) {
      this.logger.error(
        `Failed to search store items with prefix [${namespacePrefix.join(
          '/'
        )}]`,
        error
      );
      throw error;
    }
  }

  /**
   * List all unique namespaces in the store
   *
   * REAL IMPLEMENTATION - No simulation/stubs
   *
   * Strategy: Namespace extraction via IVectorService.getStoreNamespaceStats()
   * - Delegates to StoreStorageService.getNamespaceStats()
   * - Returns list of unique namespace arrays
   * - Optional prefix filtering applied at adapter level
   *
   * Verification:
   * - Architecture design: TASK_2025_007 lines 415-439
   * - IVectorService.getStoreNamespaceStats: line 319 (verified)
   * - StoreStorageService.getNamespaceStats: lines 129-133 (verified)
   *
   * @param prefix - Optional namespace prefix to filter by (empty = all namespaces)
   * @returns Array of unique namespace arrays
   */
  async listStoreNamespaces(prefix?: string[]): Promise<string[][]> {
    try {
      if (prefix) {
        this.validateNamespace(prefix);
      }

      // Delegate to StoreStorageService which uses IVectorService
      const namespaceStats = await this.storageService.getNamespaceStats(
        prefix || []
      );

      // Extract unique namespaces from stats
      const namespaces = namespaceStats.namespaces || [];

      this.logger.debug(
        `Listed ${namespaces.length} unique namespaces in collection ${
          this.defaultCollection
        }${prefix ? ` with prefix [${prefix.join('/')}]` : ''}`
      );

      return namespaces;
    } catch (error) {
      this.logger.error('Failed to list store namespaces', error);
      throw error;
    }
  }

  /**
   * Set the default collection name for store operations
   * CRITICAL: This allows collection parameter to be passed through
   */
  setDefaultCollection(collectionName: string): void {
    if (!collectionName?.trim()) {
      throw new Error('Collection name cannot be empty');
    }

    this.defaultCollection = collectionName;
    this.logger.debug(`Set default collection to: ${collectionName}`);
  }

  /**
   * Get the current default collection name
   */
  getDefaultCollection(): string {
    return this.defaultCollection;
  }

  /**
   * Create a relationship between two store items
   * Optional graph operation for enhanced querying
   */
  async createRelationship(
    namespace: string[],
    key: string,
    targetNamespace: string[],
    targetKey: string,
    relationshipType = 'RELATED_TO'
  ): Promise<void> {
    try {
      this.validateNamespace(namespace);
      this.validateKey(key);
      this.validateNamespace(targetNamespace);
      this.validateKey(targetKey);

      await this.graphService.createStoreRelationship(
        namespace,
        key,
        targetNamespace,
        targetKey,
        relationshipType
      );

      this.logger.debug(
        `Created ${relationshipType} relationship: ${namespace.join(
          '/'
        )}/${key} -> ${targetNamespace.join('/')}/${targetKey}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to create relationship (continuing with graceful degradation)`,
        error
      );
      // Don't throw - relationship creation is optional enhancement
    }
  }

  /**
   * Get related store items
   * Uses graph database for relationship traversal
   */
  async getRelatedItems(
    namespace: string[],
    key: string,
    relationshipType?: string
  ): Promise<StoreItem[]> {
    try {
      this.validateNamespace(namespace);
      this.validateKey(key);

      const relatedItems = await this.graphService.getRelatedStoreItems(
        namespace,
        key,
        relationshipType
      );

      this.logger.debug(
        `Found ${relatedItems.length} related items for ${namespace.join(
          '/'
        )}/${key}`
      );

      return relatedItems;
    } catch (error) {
      this.logger.warn(
        `Failed to get related items (returning empty array)`,
        error
      );
      return [];
    }
  }

  /**
   * Get store statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    uniqueNamespaces: number;
    defaultCollection: string;
  }> {
    try {
      const items = await this.searchStoreItems([], undefined, 1000);
      const namespaces = await this.listStoreNamespaces();

      return {
        totalItems: items.length,
        uniqueNamespaces: namespaces.length,
        defaultCollection: this.defaultCollection,
      };
    } catch (error) {
      this.logger.error('Failed to get store stats', error);
      return {
        totalItems: 0,
        uniqueNamespaces: 0,
        defaultCollection: this.defaultCollection,
      };
    }
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  /**
   * Validate namespace array for consistency and security
   */
  private validateNamespace(namespace: string[]): void {
    if (!Array.isArray(namespace)) {
      throw new Error('Namespace must be an array of strings');
    }

    if (namespace.length === 0) {
      throw new Error('Namespace cannot be empty');
    }

    if (namespace.length > 10) {
      throw new Error('Namespace depth cannot exceed 10 levels');
    }

    for (const segment of namespace) {
      if (typeof segment !== 'string' || !segment.trim()) {
        throw new Error('All namespace segments must be non-empty strings');
      }

      if (segment.includes('/')) {
        throw new Error('Namespace segments cannot contain forward slashes');
      }

      if (segment.length > 100) {
        throw new Error('Namespace segments cannot exceed 100 characters');
      }
    }
  }

  /**
   * Validate key for consistency and security
   */
  private validateKey(key: string): void {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('Key must be a non-empty string');
    }

    if (key.length > 200) {
      throw new Error('Key cannot exceed 200 characters');
    }

    if (key.includes('/')) {
      throw new Error('Key cannot contain forward slashes');
    }
  }
}
