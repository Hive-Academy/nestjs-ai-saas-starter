import { Injectable, Inject, Logger } from '@nestjs/common';
import { IGraphService } from '../../interfaces/graph-service.interface';
import type { StoreItem } from './interfaces/store-service.interface';

/**
 * Store graph service - delegates to graph service adapter for relationship tracking
 *
 * Architecture:
 * - Library service delegates to IGraphService adapter (provided by application)
 * - Application adapter contains all business logic:
 *   - Node creation for store items
 *   - Relationship creation between store items
 *   - Graph traversal for finding related items
 *   - Error handling and transaction management
 *
 * This service enables relationship tracking for store items across namespaces.
 */
@Injectable()
export class StoreGraphService {
  private readonly logger = new Logger(StoreGraphService.name);

  constructor(
    @Inject('IGraphService')
    private readonly graphService: IGraphService
  ) {}

  /**
   * Create a relationship between two store items in the graph database
   * @param namespace Source item namespace
   * @param key Source item key
   * @param targetNamespace Target item namespace
   * @param targetKey Target item key
   * @param relationshipType Type of relationship (e.g., 'RELATED_TO', 'DEPENDS_ON')
   */
  async createStoreRelationship(
    namespace: string[],
    key: string,
    targetNamespace: string[],
    targetKey: string,
    relationshipType: string
  ): Promise<void> {
    try {
      const sourceId = this.generateStoreNodeId(namespace, key);
      const targetId = this.generateStoreNodeId(targetNamespace, targetKey);

      // Create source node if it doesn't exist
      await this.graphService.createNode({
        id: sourceId,
        labels: ['StoreItem'],
        properties: {
          namespace: JSON.stringify(namespace),
          namespaceKey: namespace.join('/'),
          key,
          type: 'store_item',
        },
      });

      // Create target node if it doesn't exist
      await this.graphService.createNode({
        id: targetId,
        labels: ['StoreItem'],
        properties: {
          namespace: JSON.stringify(targetNamespace),
          namespaceKey: targetNamespace.join('/'),
          key: targetKey,
          type: 'store_item',
        },
      });

      // Create relationship between nodes
      await this.graphService.createRelationship(sourceId, targetId, {
        type: relationshipType,
        properties: {
          createdAt: new Date().toISOString(),
        },
      });

      this.logger.debug(
        `Created ${relationshipType} relationship: ${sourceId} -> ${targetId}`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to create store relationship: ${namespace.join(
          '/'
        )}/${key} -> ${targetNamespace.join('/')}/${targetKey}`,
        error
      );
      // Graceful degradation - don't fail store operations if graph tracking fails
    }
  }

  /**
   * Get related store items for a given store item
   * @param namespace Item namespace
   * @param key Item key
   * @param relationshipType Optional relationship type to filter by
   * @returns Array of related store items
   */
  async getRelatedStoreItems(
    namespace: string[],
    key: string,
    relationshipType?: string
  ): Promise<StoreItem[]> {
    try {
      const nodeId = this.generateStoreNodeId(namespace, key);

      // Use traverse to find related nodes
      const traversalResult = await this.graphService.traverse(nodeId, {
        depth: 1,
        direction: 'BOTH',
        relationshipTypes: relationshipType ? [relationshipType] : undefined,
        nodeLabels: ['StoreItem'],
      });

      return traversalResult.nodes.map((node) => ({
        namespace: JSON.parse(
          (node.properties.namespace as string) || '["default"]'
        ),
        key: (node.properties.key as string) || '',
        value: {}, // Value not stored in graph, only metadata
        metadata: {
          namespaceKey: node.properties.namespaceKey,
          nodeId: node.id,
        },
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to get related store items for ${namespace.join('/')}/${key}`,
        error
      );
      return [];
    }
  }

  /**
   * Delete store item from graph database
   * @param namespace Item namespace
   * @param key Item key
   */
  async deleteStoreItem(namespace: string[], key: string): Promise<void> {
    try {
      const nodeId = this.generateStoreNodeId(namespace, key);
      await this.graphService.deleteNodes([nodeId]);
      this.logger.debug(`Deleted store item node: ${nodeId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete store item from graph: ${namespace.join('/')}/${key}`,
        error
      );
      // Graceful degradation
    }
  }

  /**
   * Get graph statistics for store items
   * @returns Statistics about store items in the graph
   */
  async getStoreGraphStats(): Promise<{
    totalStoreItems: number;
    totalRelationships: number;
    uniqueNamespaces: number;
  }> {
    try {
      const stats = await this.graphService.getStats();
      return {
        totalStoreItems: stats.nodeCount || 0,
        totalRelationships: stats.relationshipCount || 0,
        uniqueNamespaces: 0, // Would require custom query
      };
    } catch (error) {
      this.logger.warn('Failed to get store graph stats', error);
      return {
        totalStoreItems: 0,
        totalRelationships: 0,
        uniqueNamespaces: 0,
      };
    }
  }

  /**
   * Find connected store items within a namespace
   * @param namespace Namespace to search within
   * @param depth Traversal depth (default: 2)
   * @returns Array of connected store item IDs
   */
  async findNamespaceConnections(
    namespace: string[],
    depth = 2
  ): Promise<string[]> {
    try {
      const namespaceKey = namespace.join('/');

      // This would require custom Cypher query in the adapter
      // For now, return empty array as graceful degradation
      this.logger.debug(
        `Namespace connection traversal not yet implemented for ${namespaceKey}`
      );
      return [];
    } catch (error) {
      this.logger.warn(
        `Failed to find namespace connections for ${namespace.join('/')}`,
        error
      );
      return [];
    }
  }

  /**
   * Generate a unique node ID for a store item
   * Format: store:{namespace}/{key}
   * @param namespace Item namespace
   * @param key Item key
   * @returns Unique node ID
   */
  private generateStoreNodeId(namespace: string[], key: string): string {
    const namespacePath = namespace.join('/');
    return `store:${namespacePath}:${key}`;
  }
}
