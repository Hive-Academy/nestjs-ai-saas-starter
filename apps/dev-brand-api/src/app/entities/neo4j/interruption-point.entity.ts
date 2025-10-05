import {
  CreatedAt,
  Id,
  JsonProperty,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  NotNull,
  PropIndex,
  Unique,
  UpdatedAt,
  Validate,
} from '@hive-academy/nestjs-neo4j';

/**
 * InterruptionPoint Entity
 *
 * Purpose: Workflow interruption management
 * Current Usage: neo4j-interruption-storage.adapter.ts (237+ lines)
 *
 * Manages workflow interruption points with timeout handling
 * and user interaction tracking for HITL workflows.
 */
@Neo4jEntity('InterruptionPoint', {
  description: 'Workflow interruption points with timeout handling',
})
export class InterruptionPoint extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  executionId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  nodeId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    enum: ['user_input', 'approval', 'decision', 'confirmation'],
    message:
      'Type must be one of: user_input, approval, decision, confirmation',
  })
  type!: 'user_input' | 'approval' | 'decision' | 'confirmation';

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    enum: ['pending', 'resolved', 'timeout', 'cancelled'],
    message: 'Status must be one of: pending, resolved, timeout, cancelled',
  })
  status!: 'pending' | 'resolved' | 'timeout' | 'cancelled';

  @Neo4jProp()
  @NotNull()
  message!: string;

  @Neo4jProp()
  @JsonProperty()
  metadata!: Record<string, any>;

  @Neo4jProp()
  timeoutDuration?: number;

  @Neo4jProp()
  @PropIndex()
  @Validate({
    enum: ['proceed', 'fail', 'retry'],
    message: 'Timeout strategy must be one of: proceed, fail, retry',
  })
  timeoutStrategy!: 'proceed' | 'fail' | 'retry';

  @Neo4jProp()
  userResponse?: string;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  @Neo4jProp()
  resolvedAt?: Date;

  // Relationships
  @Neo4jRelationship({ type: 'INTERRUPTS', direction: 'OUT' })
  execution?: any; // WorkflowExecution - avoiding circular dependency

  @Neo4jRelationship({ type: 'RESOLVED_BY', direction: 'OUT' })
  resolver?: any; // Developer - avoiding circular dependency
}
