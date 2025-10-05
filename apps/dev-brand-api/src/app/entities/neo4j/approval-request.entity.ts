import {
  CreatedAt,
  Id,
  JsonProperty,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  NodeKey,
  NotNull,
  PropIndex,
  RangeIndex,
  TextIndex,
  Unique,
  UpdatedAt,
  Validate,
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
  @NodeKey()
  @PropIndex()
  executionId!: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  nodeId!: string;

  @Neo4jProp()
  @NotNull()
  @TextIndex()
  message!: string;

  @Neo4jProp()
  @JsonProperty()
  metadata!: Record<string, any>;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  @Validate({
    enum: ['pending', 'approved', 'rejected', 'expired'],
    message: 'Status must be one of: pending, approved, rejected, expired',
  })
  status!: 'pending' | 'approved' | 'rejected' | 'expired';

  @CreatedAt()
  @RangeIndex()
  requestedAt!: Date;

  @Neo4jProp()
  expiresAt?: Date;

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
  @Validate({
    enum: ['low', 'medium', 'high', 'critical'],
    message: 'Risk level must be one of: low, medium, high, critical',
  })
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
