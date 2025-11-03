import {
  CreatedAt,
  Id,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  NodeKey,
  UpdatedAt,
} from '@hive-academy/nestjs-neo4j';
import { ApprovalRequest } from './approval-request.entity';

/**
 * ApprovalChain Entity
 *
 * Purpose: Approval chain configuration with levels
 * Separate from ApprovalRequest to maintain single responsibility
 *
 * Represents the configuration/template for an approval process,
 * while ApprovalRequest represents individual approval instances.
 */
@Neo4jEntity('ApprovalChain', {
  description: 'Approval chain configuration with hierarchical levels',
})
@NodeKey(['id'])
export class ApprovalChain extends Neo4jBaseEntity {
  @Id()
  id!: string;

  @Neo4jProp()
  name?: string;

  @Neo4jProp()
  levelCount!: number;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // Relationships
  @Neo4jRelationship({ type: 'HAS_LEVEL', direction: 'OUT' })
  levels?: ApprovalLevel[];

  @Neo4jRelationship({ type: 'USES_CHAIN', direction: 'IN' })
  requests?: ApprovalRequest[];
}

/**
 * ApprovalLevel Entity (child of ApprovalChain)
 */
@Neo4jEntity('ApprovalLevel', {
  description: 'Individual approval level within a chain',
})
export class ApprovalLevel extends Neo4jBaseEntity {
  @Id()
  id!: string;

  @Neo4jProp()
  name!: string;

  @Neo4jProp()
  priority!: number;

  @Neo4jProp()
  policy!: string;

  @Neo4jProp()
  approvers!: string; // JSON string

  @Neo4jProp()
  conditions?: string; // JSON string

  @Neo4jProp()
  timeoutMs?: number;

  @Neo4jProp()
  autoApproveOnTimeout!: boolean;

  @CreatedAt()
  createdAt!: Date;
}
