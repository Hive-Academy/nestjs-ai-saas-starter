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
} from '@hive-academy/nestjs-neo4j';

/**
 * ApprovalResponse Entity
 *
 * Purpose: Responses to approval requests with audit trail
 * Current Usage: neo4j-hitl-storage.adapter.ts
 *
 * Captures approval decisions with full audit information including
 * response time metrics and processing duration tracking.
 */
@Neo4jEntity('ApprovalResponse', {
  description: 'Responses to approval requests with audit trail',
})
export class ApprovalResponse extends Neo4jBaseEntity {
  @Id()
  @Unique()
  id!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  approvalRequestId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  responderId!: string;

  @Neo4jProp()
  @NotNull()
  responderName!: string;

  @Neo4jProp()
  @NotNull()
  decision!: 'approved' | 'rejected';

  @Neo4jProp()
  comment?: string;

  @Neo4jProp()
  @JsonProperty()
  metadata!: Record<string, any>;

  @CreatedAt()
  responseTime!: Date;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  processingDuration!: number;

  // Relationships
  @Neo4jRelationship({ type: 'RESPONSE_TO', direction: 'OUT' })
  approvalRequest!: any; // ApprovalRequest - avoiding circular dependency

  @Neo4jRelationship({ type: 'RESPONDED_BY', direction: 'OUT' })
  responder!: any; // Developer - avoiding circular dependency
}
