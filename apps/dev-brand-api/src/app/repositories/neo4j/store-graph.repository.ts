import { Injectable, Logger } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  Neo4jCrudService,
  NeogmaService,
} from '@hive-academy/nestjs-neo4j';
import { StoreItemEntity } from '../../entities/neo4j/store-item.entity';

/**
 * StoreGraphRepository - Neo4j Repository for Store Graph Relationships
 *
 * Purpose: Type-safe repository for Store graph operations
 * Pattern: TypeORM-Style Repository with explicit constructor-based DI
 *
 * Features:
 * - Extends Neo4jRepository<T> for automatic CRUD operations
 * - Explicit 2-parameter constructor (entity, neo4jService)
 * - NO decorator magic - clear dependency injection
 * - Full type safety with StoreItemEntity
 *
 * Inherited CRUD Methods (from Neo4jRepository):
 * - create(data): Create single node
 * - createMany(data): Batch create
 * - findById(id): Find by ID
 * - findByIds(ids): Find multiple by IDs
 * - findAll(options): Find with filtering
 * - update(id, data): Update node
 * - updateMany(updates): Batch update
 * - delete(id): Delete by ID
 * - deleteMany(ids): Batch delete
 * - query(cypher, params): Execute custom Cypher
 * - execute(cypher, params): Execute write Cypher
 *
 * Custom Business Methods:
 * - findRelatedItems(): Get related store items by key pattern
 * - createRelationship(): Create relationship between items
 * - deleteRelationship(): Remove relationship between items
 * - getNamespaceStats(): Get statistics for namespace
 * - findByNamespace(): Get all items in namespace
 * - findNamespaceHierarchy(): Get namespace tree structure
 */
@Injectable()
export class StoreGraphRepository extends Neo4jRepositoryBase<StoreItemEntity> {
  private readonly logger = new Logger(StoreGraphRepository.name);

  /**
   * Explicit constructor with proper DI
   *
   * @param neogma - NeogmaService injected by NestJS
   * @param crud - Neo4jCrudService injected by NestJS
   */
  constructor(
    protected override readonly neogma: NeogmaService,
    crud: Neo4jCrudService
  ) {
    super(StoreItemEntity, 'StoreItem', neogma, crud);
    this.logger.debug('StoreGraphRepository initialized');
  }

  // ==================== CUSTOM BUSINESS METHODS ====================

  /**
   * Find related store items by key pattern
   * Uses Cypher CONTAINS for pattern matching
   *
   * @param key - Key pattern to search for
   * @param namespace - Namespace array
   * @param limit - Maximum number of results
   * @returns Array of related store items
   */
  async findRelatedItems(
    key: string,
    namespace: readonly string[],
    limit = 10
  ): Promise<StoreItemEntity[]> {
    try {
      const namespaceKey = namespace.join('/');

      const query = `
        MATCH (s:StoreItem {namespaceKey: $namespaceKey})
        WHERE s.key CONTAINS $key
        RETURN s
        ORDER BY s.updatedAt DESC
        LIMIT $limit
      `;

      const result = await this.neogma.run(query, { namespaceKey, key, limit });

      return result.records.map(
        (record: any) => record.get('s').properties as StoreItemEntity
      );
    } catch (error) {
      this.logger.error(
        `Failed to find related items for key ${key} in namespace ${namespace.join(
          '/'
        )}`,
        error
      );
      return [];
    }
  }

  /**
   * Create relationship between store items (overrides base class)
   * Uses MERGE to avoid duplicate relationships
   *
   * @param fromId - Source item ID
   * @param toId - Target item ID
   * @param relationshipType - Type of relationship (e.g., RELATED_TO, DERIVED_FROM)
   * @param properties - Optional relationship properties
   */
  override async createRelationship(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const query = `
        MATCH (from:StoreItem {id: $fromId})
        MATCH (to:StoreItem {id: $toId})
        MERGE (from)-[r:${relationshipType}]->(to)
        SET r += $properties
        SET r.createdAt = COALESCE(r.createdAt, datetime())
        SET r.updatedAt = datetime()
      `;

      await this.neogma.run(query, { fromId, toId, properties });

      this.logger.debug(
        `Created ${relationshipType} relationship from ${fromId} to ${toId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to create ${relationshipType} relationship from ${fromId} to ${toId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete relationship between store items
   *
   * @param fromId - Source item ID
   * @param toId - Target item ID
   * @param relationshipType - Type of relationship to delete
   */
  async deleteRelationship(
    fromId: string,
    toId: string,
    relationshipType: string
  ): Promise<void> {
    try {
      const query = `
        MATCH (from:StoreItem {id: $fromId})-[r:${relationshipType}]->(to:StoreItem {id: $toId})
        DELETE r
      `;

      await this.neogma.run(query, { fromId, toId });

      this.logger.debug(
        `Deleted ${relationshipType} relationship from ${fromId} to ${toId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete ${relationshipType} relationship from ${fromId} to ${toId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get namespace statistics
   * Returns item count and unique keys
   *
   * @param namespace - Namespace array
   * @returns Statistics object
   */
  async getNamespaceStats(namespace: readonly string[]): Promise<{
    totalItems: number;
    keys: string[];
    rootNamespace: string;
    depth: number;
  }> {
    try {
      const namespaceKey = namespace.join('/');

      const query = `
        MATCH (s:StoreItem {namespaceKey: $namespaceKey})
        RETURN
          count(s) as totalItems,
          collect(DISTINCT s.key) as keys,
          s.namespace_root as rootNamespace,
          s.namespace_depth as depth
        LIMIT 1
      `;

      const result = await this.neogma.run(query, { namespaceKey });

      if (result.records.length === 0) {
        return {
          totalItems: 0,
          keys: [],
          rootNamespace: namespace[0] || '',
          depth: namespace.length,
        };
      }

      const record = result.records[0];
      return {
        totalItems: Number(record.get('totalItems')) || 0,
        keys: (record.get('keys') as string[]) || [],
        rootNamespace:
          (record.get('rootNamespace') as string) || namespace[0] || '',
        depth: Number(record.get('depth')) || namespace.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stats for namespace ${namespace.join('/')}`,
        error
      );
      return {
        totalItems: 0,
        keys: [],
        rootNamespace: namespace[0] || '',
        depth: namespace.length,
      };
    }
  }

  /**
   * Find all items in a namespace
   *
   * @param namespace - Namespace array
   * @param limit - Maximum number of items to return
   * @returns Array of store items
   */
  async findByNamespace(
    namespace: readonly string[],
    limit = 100
  ): Promise<StoreItemEntity[]> {
    try {
      const namespaceKey = namespace.join('/');

      const query = `
        MATCH (s:StoreItem {namespaceKey: $namespaceKey})
        RETURN s
        ORDER BY s.updatedAt DESC
        LIMIT $limit
      `;

      const result = await this.neogma.run(query, { namespaceKey, limit });

      return result.records.map(
        (record: any) => record.get('s').properties as StoreItemEntity
      );
    } catch (error) {
      this.logger.error(
        `Failed to find items in namespace ${namespace.join('/')}`,
        error
      );
      return [];
    }
  }

  /**
   * Get namespace hierarchy tree
   * Returns parent and child namespaces
   *
   * @param namespace - Root namespace array
   * @param maxDepth - Maximum depth to traverse
   * @returns Namespace hierarchy structure
   */
  async findNamespaceHierarchy(
    namespace: readonly string[],
    maxDepth = 5
  ): Promise<{
    current: string;
    children: string[];
    parent: string | null;
  }> {
    try {
      const namespaceKey = namespace.join('/');

      // Find child namespaces (namespaces that start with current + '/')
      const childQuery = `
        MATCH (s:StoreItem)
        WHERE s.namespaceKey STARTS WITH $namespaceKey + '/'
          AND s.namespace_depth = $childDepth
        RETURN DISTINCT s.namespaceKey as childNamespace
        LIMIT 100
      `;

      const childResult = await this.neogma.run(childQuery, {
        namespaceKey,
        childDepth: namespace.length + 1,
      });

      const children = childResult.records.map(
        (r: any) => r.get('childNamespace') as string
      );

      // Find parent namespace (remove last segment)
      const parent =
        namespace.length > 1 ? namespace.slice(0, -1).join('/') : null;

      return {
        current: namespaceKey,
        children,
        parent,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get hierarchy for namespace ${namespace.join('/')}`,
        error
      );
      return {
        current: namespace.join('/'),
        children: [],
        parent: null,
      };
    }
  }

  /**
   * Delete all items in a namespace
   *
   * @param namespace - Namespace array
   * @returns Number of items deleted
   */
  async deleteByNamespace(namespace: readonly string[]): Promise<number> {
    try {
      const namespaceKey = namespace.join('/');

      const query = `
        MATCH (s:StoreItem {namespaceKey: $namespaceKey})
        DETACH DELETE s
        RETURN count(s) as deletedCount
      `;

      const result = await this.neogma.run(query, { namespaceKey });

      const deletedCount =
        result.records.length > 0
          ? Number(result.records[0].get('deletedCount')) || 0
          : 0;

      this.logger.debug(
        `Deleted ${deletedCount} items from namespace ${namespaceKey}`
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete items in namespace ${namespace.join('/')}`,
        error
      );
      return 0;
    }
  }
}
