import { Injectable } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  NeogmaService,
  Neo4jCrudService,
  Safe,
  Authorize,
  ValidateInput,
  AuditLog,
  ParameterBindingUtility,
} from '@hive-academy/nestjs-neo4j';
import { ApprovalState } from '../../entities/neo4j/approval-state.entity';
import type {
  ApprovalStateData,
  ApprovalChainData,
  ListApprovalOptions,
} from '@hive-academy/langgraph-hitl';

/**
 * ApprovalStateRepository - Neo4j-based approval state persistence
 *
 * **Purpose**: Handle all Neo4j operations for approval state storage
 * **Pattern**: Extends Neo4jRepositoryBase following existing repository patterns
 * **Schema**: (:ApprovalState) and (:ApprovalChainProgress) nodes
 *
 * **Why Neo4j Instead of Checkpoints**:
 * - Approval state is operational data, NOT workflow state
 * - Checkpoints are for workflow recovery (managed by LangGraph)
 * - Neo4j provides queryable approval history with relationships
 * - Enables approval pattern analysis and reporting
 *
 * **Integration**: Used by Neo4jApprovalStateStorageAdapter
 *
 * Verification:
 * - Pattern: libs/langgraph-modules/adapters/src/lib/repositories/neo4j/approval-chain.repository.ts
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 *
 * CRUD methods (inherited from Neo4jRepositoryBase<ApprovalState>):
 * - findById, findAll, create, update, delete, count, exists
 */
@Injectable()
export class ApprovalStateRepository extends Neo4jRepositoryBase<ApprovalState> {
  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(ApprovalState, 'ApprovalState', neogma, crud);
  }

  // ============================================================================
  // APPROVAL STATE OPERATIONS
  // ============================================================================

  /**
   * Save approval state to Neo4j
   */
  @Authorize({ roles: ['system', 'admin'] })
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async saveApprovalState(data: ApprovalStateData): Promise<void> {
    const baseQuery = `
      CREATE (a:ApprovalState {
        id: $id,
        threadId: $threadId,
        nodeId: $nodeId,
        status: $status,
        metadata: $metadata,
        requestedAt: datetime($requestedAt),
        respondedAt: CASE WHEN $respondedAt IS NOT NULL THEN datetime($respondedAt) ELSE NULL END,
        respondedBy: $respondedBy
      })
      RETURN a
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      id: data.id,
      threadId: data.threadId,
      nodeId: data.nodeId,
      status: data.status,
      metadata: JSON.stringify(data.metadata || {}),
      requestedAt: data.requestedAt.toISOString(),
      respondedAt: data.respondedAt?.toISOString() || null,
      respondedBy: data.respondedBy || null,
    });

    await this.neogma.run(query, params);
  }

  /**
   * Load approval state by ID
   */
  @Safe()
  async loadApprovalState(id: string): Promise<ApprovalStateData | null> {
    const baseQuery = `
      MATCH (a:ApprovalState { id: $id })
      RETURN a
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      id,
    });
    const result = await this.neogma.run(query, params);

    if (!result.records || result.records.length === 0) {
      return null;
    }

    const record = result.records[0].get('a').properties;

    return {
      id: record.id,
      threadId: record.threadId,
      nodeId: record.nodeId,
      status: record.status,
      metadata: record.metadata ? JSON.parse(record.metadata) : {},
      requestedAt: new Date(record.requestedAt),
      respondedAt: record.respondedAt
        ? new Date(record.respondedAt)
        : undefined,
      respondedBy: record.respondedBy || undefined,
    };
  }

  /**
   * List approval states by thread ID with optional filtering
   */
  @Safe()
  async listApprovalsByThread(
    threadId: string,
    options?: ListApprovalOptions
  ): Promise<ApprovalStateData[]> {
    let statusFilter = '';
    const paramData: Record<string, any> = {
      threadId,
      limit: options?.limit || 10,
    };

    if (options?.status) {
      statusFilter = 'AND a.status = $status';
      paramData.status = options.status;
    }

    const baseQuery = `
      MATCH (a:ApprovalState { threadId: $threadId })
      WHERE 1=1 ${statusFilter}
      RETURN a
      ORDER BY a.requestedAt DESC
      LIMIT $limit
    `;

    const { query, params } = ParameterBindingUtility.autoBind(
      baseQuery,
      paramData
    );
    const result = await this.neogma.run(query, params);

    return (result.records || []).map((record) => {
      const props = record.get('a').properties;
      return {
        id: props.id,
        threadId: props.threadId,
        nodeId: props.nodeId,
        status: props.status,
        metadata: props.metadata ? JSON.parse(props.metadata) : {},
        requestedAt: new Date(props.requestedAt),
        respondedAt: props.respondedAt
          ? new Date(props.respondedAt)
          : undefined,
        respondedBy: props.respondedBy || undefined,
      };
    });
  }

  /**
   * Update approval status (when response is received)
   */
  @Authorize({ roles: ['system', 'admin', 'user'] })
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async updateApprovalStatus(
    id: string,
    status: string,
    respondedBy: string,
    respondedAt?: Date
  ): Promise<void> {
    const baseQuery = `
      MATCH (a:ApprovalState { id: $id })
      SET a.status = $status,
          a.respondedBy = $respondedBy,
          a.respondedAt = datetime($respondedAt)
      RETURN a
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      id,
      status,
      respondedBy,
      respondedAt: (respondedAt || new Date()).toISOString(),
    });

    await this.neogma.run(query, params);
  }

  // ============================================================================
  // APPROVAL CHAIN PROGRESS OPERATIONS
  // ============================================================================

  /**
   * Save approval chain progress
   */
  @Authorize({ roles: ['system', 'admin'] })
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async saveApprovalChain(data: ApprovalChainData): Promise<void> {
    const baseQuery = `
      CREATE (c:ApprovalChainProgress {
        chainId: $chainId,
        executionId: $executionId,
        level: $level,
        approvers: $approvers,
        status: $status,
        requestId: $requestId,
        nodeId: $nodeId,
        timestamp: datetime($timestamp)
      })
      RETURN c
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      chainId: data.chainId,
      executionId: data.executionId,
      level: data.level,
      approvers: JSON.stringify(data.approvers),
      status: data.status,
      requestId: data.requestId,
      nodeId: data.nodeId,
      timestamp: data.timestamp.toISOString(),
    });

    await this.neogma.run(query, params);
  }

  /**
   * Load approval chain progress
   */
  @Safe()
  async loadApprovalChain(
    chainId: string,
    executionId: string
  ): Promise<ApprovalChainData | null> {
    const baseQuery = `
      MATCH (c:ApprovalChainProgress { chainId: $chainId, executionId: $executionId })
      RETURN c
      ORDER BY c.level DESC
      LIMIT 1
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      chainId,
      executionId,
    });
    const result = await this.neogma.run(query, params);

    if (!result.records || result.records.length === 0) {
      return null;
    }

    const record = result.records[0].get('c').properties;

    return {
      chainId: record.chainId,
      executionId: record.executionId,
      level:
        typeof record.level === 'number'
          ? record.level
          : record.level.toNumber(),
      approvers: JSON.parse(record.approvers),
      status: record.status,
      requestId: record.requestId,
      nodeId: record.nodeId,
      timestamp: new Date(record.timestamp),
    };
  }

  // ============================================================================
  // MAINTENANCE OPERATIONS
  // ============================================================================

  /**
   * Cleanup old approval states (retention policy)
   */
  @Authorize({ roles: ['system', 'admin'] })
  @AuditLog({ logLevel: 'standard', enabled: true, logSuccess: true })
  @Safe()
  async cleanupOldApprovals(maxAgeMs: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    const baseQuery = `
      MATCH (a:ApprovalState)
      WHERE a.requestedAt < datetime($cutoffDate)
      WITH a
      DETACH DELETE a
      RETURN count(a) as deletedCount
    `;

    const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
      cutoffDate: cutoffDate.toISOString(),
    });
    const result = await this.neogma.run(query, params);

    const deletedCount =
      result.records?.[0]?.get('deletedCount')?.toNumber?.() || 0;

    return deletedCount;
  }

  /**
   * Create indexes for fast queries (should be called on module init)
   */
  @Safe()
  async ensureIndexes(): Promise<void> {
    // Index on threadId for fast thread-based queries
    await this.neogma.run(`
      CREATE INDEX approval_state_thread_idx IF NOT EXISTS
      FOR (a:ApprovalState)
      ON (a.threadId)
    `);

    // Index on status for filtering
    await this.neogma.run(`
      CREATE INDEX approval_state_status_idx IF NOT EXISTS
      FOR (a:ApprovalState)
      ON (a.status)
    `);

    // Index on requestedAt for cleanup queries
    await this.neogma.run(`
      CREATE INDEX approval_state_requested_idx IF NOT EXISTS
      FOR (a:ApprovalState)
      ON (a.requestedAt)
    `);

    // Index on chainId for chain queries
    await this.neogma.run(`
      CREATE INDEX approval_chain_progress_id_idx IF NOT EXISTS
      FOR (c:ApprovalChainProgress)
      ON (c.chainId, c.executionId)
    `);
  }
}
