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
@NodeKey(['id'])
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
  @Validate({
    validation: {
      custom: {
        validator: (value, entity) => {
          const validTypes = ['episodic', 'semantic', 'procedural', 'working'];
          return validTypes.includes(value);
        },
        message:
          'Memory type must be one of: episodic, semantic, procedural, working',
      },
    },
  })
  memoryType!: 'episodic' | 'semantic' | 'procedural' | 'working';

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  @Validate({
    validation: {
      length: {
        min: 0,
        max: 1,
      },
    },
    errorMessage: 'Importance score must be between 0 and 1',
  })
  importance!: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  @Validate({
    validation: {
      length: {
        min: 0,
        max: 1,
      },
    },
    errorMessage: 'Confidence score must be between 0 and 1',
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
