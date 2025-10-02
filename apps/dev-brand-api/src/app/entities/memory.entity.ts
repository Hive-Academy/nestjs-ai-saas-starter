import {
  CreatedAt,
  Id,
  JsonProperty,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  PropIndex,
  Unique,
  UpdatedAt,
} from '@hive-academy/nestjs-neo4j';

/**
 * Memory Entity
 *
 * Purpose: Memory nodes for graph-based memory management
 * Current Usage: neo4j-graph.adapter.ts (968 lines)
 *
 * Represents memory nodes in the graph-based contextual memory system
 * with type classification, importance scoring, and relationship management.
 */
@Neo4jEntity('Memory', {
  description: 'Memory nodes for graph-based contextual memory management',
})
export class Memory extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @JsonProperty()
  labels!: string[];

  @Neo4jProp()
  @JsonProperty()
  properties!: Record<string, any>;

  @Neo4jProp()
  @PropIndex()
  memoryType!: 'episodic' | 'semantic' | 'procedural' | 'working';

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  importance!: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  confidence!: number;

  @Neo4jProp()
  @PropIndex()
  agentId?: string;

  @Neo4jProp()
  @PropIndex()
  sessionId?: string;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  lastAccessed!: Date;

  @Neo4jProp()
  expiresAt?: Date;

  // Relationships
  @Neo4jRelationship({ type: 'RELATES_TO', direction: 'BOTH' })
  relatedMemories?: Memory[];

  @Neo4jRelationship({ type: 'CONTAINS', direction: 'OUT' })
  subMemories?: Memory[];
}
