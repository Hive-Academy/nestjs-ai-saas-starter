import {
  CreatedAt,
  Id,
  JsonProperty,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  NodeKey,
  PropIndex,
  RangeIndex,
  Unique,
  UpdatedAt,
  Validate,
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
  @NodeKey()
  id!: string;

  @Neo4jProp()
  @JsonProperty()
  labels!: string[];

  @Neo4jProp()
  @JsonProperty()
  properties!: Record<string, any>;

  @Neo4jProp()
  @PropIndex()
  @Validate({
    enum: ['episodic', 'semantic', 'procedural', 'working'],
    message:
      'Memory type must be one of: episodic, semantic, procedural, working',
  })
  memoryType!: 'episodic' | 'semantic' | 'procedural' | 'working';

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  @RangeIndex()
  @Validate({
    min: 0,
    max: 1,
    message: 'Importance score must be between 0 and 1',
  })
  importance!: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  @RangeIndex()
  @Validate({
    min: 0,
    max: 1,
    message: 'Confidence score must be between 0 and 1',
  })
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
