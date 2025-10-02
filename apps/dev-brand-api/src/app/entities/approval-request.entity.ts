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
} from '@hive-academy/nestjs-neo4j';

/**
 * ApprovalRequest Entity
 *
 * Purpose: HITL approval requests with workflow integration
 * Current Usage: neo4j-hitl-storage.adapter.ts (500 lines)
 *
 * Represents approval requests in the Human-in-the-Loop workflow system
 * with comprehensive metadata, confidence scoring, and relationship tracking.
 */
@Neo4jEntity('ApprovalRequest', {
  description: 'HITL approval requests with workflow context',
})
export class ApprovalRequest extends Neo4jBaseEntity {
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
  message!: string;

  @Neo4jProp()
  @JsonProperty()
  metadata!: Record<string, any>;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  status!: 'pending' | 'approved' | 'rejected' | 'expired';

  @CreatedAt()
  requestedAt!: Date;

  @Neo4jProp()
  expiresAt?: Date;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE' })
  confidence!: number;

  @Neo4jProp()
  @PropIndex()
  riskLevel!: 'low' | 'medium' | 'high' | 'critical';

  @Neo4jProp()
  chainId?: string;

  @Neo4jProp()
  @JsonProperty()
  approvers!: string[];

  @Neo4jProp()
  responseMessage?: string;

  @UpdatedAt()
  updatedAt!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'PART_OF_CHAIN', direction: 'OUT' })
  approvalChain?: any; // ApprovalChain - avoiding circular dependency

  @Neo4jRelationship({ type: 'HAS_RESPONSE', direction: 'OUT' })
  responses?: any[]; // ApprovalResponse[] - avoiding circular dependency

  @Neo4jRelationship({ type: 'REQUESTED_BY', direction: 'OUT' })
  requester?: any; // Developer - avoiding circular dependency
}
