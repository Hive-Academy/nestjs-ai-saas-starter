import {
  CreatedAt,
  Id,
  Neo4jBaseEntity,
  Neo4jEntity,
  Neo4jProp,
  NodeKey,
  UpdatedAt,
} from '@hive-academy/nestjs-neo4j';

/**
 * ApprovalState Entity - Neo4j node for approval state persistence
 *
 * **Purpose**: Represent approval state data in Neo4j graph
 * **Pattern**: Neo4j entity with decorators following existing patterns
 *
 * **Schema**: (:ApprovalState) node with approval metadata
 * - id: Unique approval state identifier
 * - threadId: Groups related approvals
 * - nodeId: Workflow node identifier
 * - status: Current approval status
 * - metadata: JSON-serialized additional data
 * - requestedAt: When approval was requested
 * - respondedAt: When approval was responded to (optional)
 * - respondedBy: Who responded (optional)
 *
 * **Why Neo4j**:
 * - Queryable approval history with relationships
 * - Pattern analysis across approval chains
 * - Separate from LangGraph checkpoints (operational vs workflow data)
 *
 * Verification:
 * - Pattern: libs/langgraph-modules/adapters/src/lib/entities/neo4j/approval-chain.entity.ts
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 */
@Neo4jEntity('ApprovalState', {
  description: 'HITL approval state for operational tracking',
})
@NodeKey(['id'])
export class ApprovalState extends Neo4jBaseEntity {
  /** Unique approval state ID */
  @Id()
  id!: string;

  /** Thread ID for grouping related approvals */
  @Neo4jProp()
  threadId!: string;

  /** Node ID in workflow graph */
  @Neo4jProp()
  nodeId!: string;

  /** Current approval status */
  @Neo4jProp()
  status!: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';

  /** Additional metadata (JSON-serialized) */
  @Neo4jProp()
  metadata?: string; // Stored as JSON string in Neo4j

  /** When approval was requested */
  @Neo4jProp()
  requestedAt!: Date;

  /** When approval was responded to (optional) */
  @Neo4jProp()
  respondedAt?: Date;

  /** Who responded to the approval (optional) */
  @Neo4jProp()
  respondedBy?: string;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

/**
 * ApprovalChainProgress Entity - Neo4j node for approval chain progression
 *
 * **Purpose**: Track multi-level approval chain progress
 * **Pattern**: Neo4j entity with decorators following existing patterns
 *
 * **Schema**: (:ApprovalChainProgress) node with chain progression data
 */
@Neo4jEntity('ApprovalChainProgress', {
  description: 'Tracks progression through multi-level approval chains',
})
@NodeKey(['chainId', 'executionId'])
export class ApprovalChainProgress extends Neo4jBaseEntity {
  /** Composite identifier */
  @Id()
  id!: string; // Format: `${chainId}:${executionId}`

  /** Chain identifier */
  @Neo4jProp()
  chainId!: string;

  /** Execution identifier */
  @Neo4jProp()
  executionId!: string;

  /** Current level in chain */
  @Neo4jProp()
  level!: number;

  /** Approvers at this level (JSON-serialized array) */
  @Neo4jProp()
  approvers!: string; // Stored as JSON string

  /** Chain status */
  @Neo4jProp()
  status!: string;

  /** Associated request ID */
  @Neo4jProp()
  requestId!: string;

  /** Node ID where chain is active */
  @Neo4jProp()
  nodeId!: string;

  /** Timestamp of chain progression */
  @Neo4jProp()
  timestamp!: Date;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}
