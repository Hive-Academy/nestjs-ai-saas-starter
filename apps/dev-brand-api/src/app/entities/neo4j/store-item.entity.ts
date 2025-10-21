import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  Neo4jBaseEntity,
  Neo4jRelationship,
  NotNull,
  Unique,
} from '@hive-academy/nestjs-neo4j';

/**
 * StoreItemEntity - Neo4j Entity for LangGraph Store Graph Relationships
 *
 * Purpose: Graph-based relationship tracking for Store items
 * Usage: StoreGraphService for relationship modeling and traversal
 *
 * IMPORTANT: This is a Neo4j graph entity for Store relationships.
 * Do not confuse with LangGraphStoreEntity (ChromaDB vector storage).
 *
 * Pattern: Entity Class with Decorators
 * Features:
 * - Graph-based relationship modeling
 * - Namespace hierarchy tracking
 * - Cross-reference to ChromaDB via chromaId
 * - Support for arbitrary relationship types
 *
 * Relationships:
 * - BELONGS_TO_NAMESPACE: Connects to parent namespace node
 * - RELATED_TO: Semantic relationships between store items
 * - DERIVED_FROM: Tracks item derivation/versioning
 */
@Neo4jEntity('StoreItem', {
  description: 'LangGraph Store item with graph relationships',
})
export class StoreItemEntity extends Neo4jBaseEntity {
  @Id()
  @Unique()
  @NotNull()
  id!: string;

  @Neo4jProp()
  @NotNull()
  key!: string;

  @Neo4jProp()
  @NotNull()
  namespace!: string; // Serialized namespace array

  @Neo4jProp()
  @NotNull()
  namespaceKey!: string; // Namespace joined with /

  @Neo4jProp({ serialized: true })
  value?: Record<string, unknown>;

  @Neo4jProp()
  @NotNull()
  chromaId!: string; // Reference to ChromaDB document ID

  @Neo4jProp()
  createdAt!: Date;

  @Neo4jProp()
  updatedAt!: Date;

  @Neo4jProp()
  @NotNull()
  namespace_depth!: number;

  @Neo4jProp()
  @NotNull()
  namespace_root!: string;

  @Neo4jRelationship({
    type: 'BELONGS_TO_NAMESPACE',
    direction: 'OUT',
    target: () => StoreItemEntity,
  })
  namespaceNode?: StoreItemEntity;

  @Neo4jRelationship({
    type: 'RELATED_TO',
    direction: 'BOTH',
    target: () => StoreItemEntity,
  })
  relatedItems?: StoreItemEntity[];

  @Neo4jRelationship({
    type: 'DERIVED_FROM',
    direction: 'OUT',
    target: () => StoreItemEntity,
  })
  derivedFrom?: StoreItemEntity;
}
