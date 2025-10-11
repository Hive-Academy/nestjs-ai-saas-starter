import { Injectable, Inject } from '@nestjs/common';
import { IVectorService } from '../../interfaces/vector-service.interface';

/**
 * Store storage service - pure delegation to vector service adapter
 *
 * Architecture (MATCHES MemoryStorageService pattern):
 * - Library service delegates to IVectorService adapter (provided by application)
 * - Application adapter contains all business logic:
 *   - ID generation from namespace + key
 *   - StoreItem creation and serialization
 *   - Metadata handling
 *   - Collection name management (via repository)
 *   - Error handling
 *
 * Verification:
 * - Plan suggested: vectorService.store() (generic method)
 * - Codebase pattern: vectorService.putStoreItem() (specialized method)
 * - Evidence: MemoryStorageService uses specialized methods (storeMemory, retrieveByThread, etc.)
 * - Decision: Using specialized Store methods per Memory pattern
 *
 * This service is a thin facade for consistent API surface across the store module.
 */
@Injectable()
export class StoreStorageService {
  constructor(
    @Inject('IVectorService')
    private readonly vectorService: IVectorService
  ) {}

  /**
   * Store an item in the Store
   * Delegates to application adapter's putStoreItem method
   */
  async put(
    namespace: string[],
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    return this.vectorService.putStoreItem(namespace, key, value);
  }

  /**
   * Retrieve an item from the Store
   * Delegates to application adapter's getStoreItem method
   */
  async get(
    namespace: string[],
    key: string
  ): Promise<Record<string, unknown> | null> {
    return this.vectorService.getStoreItem(namespace, key);
  }

  /**
   * Search for items in the Store by vector similarity
   * Delegates to application adapter's searchStoreItems method
   */
  async search(
    namespacePrefix: string[],
    query: string,
    limit?: number,
    filter?: Record<string, unknown>
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
      score: number;
    }>
  > {
    return this.vectorService.searchStoreItems(
      namespacePrefix,
      query,
      limit,
      filter
    );
  }

  /**
   * List all items in a namespace
   * Delegates to application adapter's listStoreItems method
   */
  async list(
    namespacePrefix: string[],
    limit?: number,
    offset?: number
  ): Promise<
    Array<{
      namespace: string[];
      key: string;
      value: Record<string, unknown>;
    }>
  > {
    return this.vectorService.listStoreItems(namespacePrefix, limit, offset);
  }

  /**
   * Delete a specific item from the Store
   * Delegates to application adapter's deleteStoreItem method
   */
  async delete(namespace: string[], key: string): Promise<void> {
    return this.vectorService.deleteStoreItem(namespace, key);
  }

  /**
   * Delete an entire namespace and all items within
   * Delegates to application adapter's deleteStoreNamespace method
   */
  async deleteNamespace(namespacePrefix: string[]): Promise<void> {
    return this.vectorService.deleteStoreNamespace(namespacePrefix);
  }

  /**
   * Get statistics for a namespace including all unique namespaces
   *
   * REAL IMPLEMENTATION - Delegates to IVectorService adapter
   *
   * Returns namespace statistics including:
   * - itemCount: Total number of items matching prefix
   * - namespaces: List of unique namespace arrays
   *
   * Verification:
   * - Architecture design: TASK_2025_007 lines 447-472
   * - IVectorService.getStoreNamespaceStats: line 319 (verified)
   *
   * @param namespacePrefix - Optional prefix to filter namespaces (empty array = all namespaces)
   * @returns Statistics with item count and unique namespace list
   */
  async getNamespaceStats(
    namespacePrefix: string[]
  ): Promise<{ itemCount: number; namespaces: string[][] }> {
    return this.vectorService.getStoreNamespaceStats(namespacePrefix);
  }

  /**
   * Get statistics for a namespace
   * Delegates to application adapter's getStoreNamespaceStats method
   *
   * @deprecated Use getNamespaceStats() instead (consistent naming)
   */
  async getStats(
    namespacePrefix: string[]
  ): Promise<{ itemCount: number; namespaces: string[][] }> {
    return this.getNamespaceStats(namespacePrefix);
  }
}
