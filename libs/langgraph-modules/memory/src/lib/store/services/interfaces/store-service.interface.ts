/**
 * Store service interface for LangGraph 2025 Store pattern
 * Provides namespace-based hierarchical storage for cross-thread memory sharing
 */
export interface IStoreService {
  // ============================================================================
  // Core Store Operations (LangGraph 2025 Spec Compliant)
  // ============================================================================

  /**
   * Store an item in the store with namespace-based organization
   * @param namespace Hierarchical namespace path (e.g., ['user', 'user-123', 'preferences'])
   * @param key Item key within the namespace
   * @param value Item value (any serializable data)
   */
  putStoreItem(
    namespace: string[],
    key: string,
    value: Record<string, any>
  ): Promise<void>;

  /**
   * Retrieve an item from the store
   * @param namespace Hierarchical namespace path
   * @param key Item key within the namespace
   * @returns Item value or null if not found
   */
  getStoreItem(
    namespace: string[],
    key: string
  ): Promise<Record<string, any> | null>;

  /**
   * Delete an item from the store
   * @param namespace Hierarchical namespace path
   * @param key Item key to delete
   */
  deleteStoreItem(namespace: string[], key: string): Promise<void>;

  /**
   * Search for items in a namespace with optional filtering
   * @param namespacePrefix Namespace prefix to search within
   * @param filter Optional metadata filter criteria
   * @param limit Maximum number of results (default: 10)
   * @returns Array of matching store items
   */
  searchStoreItems(
    namespacePrefix: string[],
    filter?: Record<string, any>,
    limit?: number
  ): Promise<StoreItem[]>;

  /**
   * List all namespaces with optional prefix filtering
   * @param prefix Optional namespace prefix to filter by
   * @returns Array of namespace paths
   */
  listStoreNamespaces(prefix?: string[]): Promise<string[][]>;

  // ============================================================================
  // Collection Management
  // ============================================================================

  /**
   * Set the default collection name for store operations
   * @param collectionName Collection name to use as default
   */
  setDefaultCollection(collectionName: string): void;

  /**
   * Get the current default collection name
   * @returns Current default collection name
   */
  getDefaultCollection(): string;
}

/**
 * Store item structure representing a namespace-based key-value pair
 */
export interface StoreItem {
  /** Hierarchical namespace path */
  namespace: string[];

  /** Item key within the namespace */
  key: string;

  /** Item value (serializable data) */
  value: Record<string, any>;

  /** When the item was created */
  createdAt?: string;

  /** When the item was last updated */
  updatedAt?: string;

  /** Optional metadata for filtering and querying */
  metadata?: Record<string, any>;
}

/**
 * Store search options for advanced querying
 */
export interface StoreSearchOptions {
  /** Namespace prefix to search within */
  namespacePrefix: string[];

  /** Optional semantic query for vector search */
  query?: string;

  /** Optional metadata filter criteria */
  filter?: Record<string, any>;

  /** Maximum number of results (default: 10) */
  limit?: number;

  /** Minimum similarity threshold for semantic search (0-1) */
  minScore?: number;
}
