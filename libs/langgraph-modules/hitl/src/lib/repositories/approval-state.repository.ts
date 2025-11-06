import { Injectable, Logger, Inject } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';

/**
 * ApprovalStateRepository - Neo4j-based approval state persistence
 *
 * **Purpose**: Store HITL approval state in Neo4j (operational data storage)
 * **Pattern**: Repository pattern for approval state CRUD operations
 * **Schema**: (:ApprovalState) nodes with approval metadata
 *
 * **Why Neo4j Instead of Checkpoints**:
 * - Approval state is operational data, NOT workflow state
 * - Checkpoints are for workflow recovery (managed by LangGraph)
 * - Neo4j provides queryable approval history with relationships
 * - Enables approval pattern analysis and reporting
 *
 * **Integration**: Used by HitlCheckpointService (replaces checkpoint operations)
 *
 * Verification:
 * - Pattern: libs/nestjs-neo4j/CLAUDE.md (Neo4j repository patterns)
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 */

export interface ApprovalStateData {
  id: string;
  threadId: string;
  nodeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';
  metadata?: Record<string, unknown>;
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
}

export interface ApprovalChainData {
  chainId: string;
  executionId: string;
  level: number;
  approvers: string[];
  status: string;
  requestId: string;
  nodeId: string;
  timestamp: Date;
}

@Injectable()
export class ApprovalStateRepository {
  private readonly logger = new Logger(ApprovalStateRepository.name);

  constructor(
    @Inject('NEO4J_DRIVER')
    private readonly driver: Driver
  ) {
    this.logger.log('ApprovalStateRepository initialized with Neo4j driver');
  }

  /**
   * Save approval state to Neo4j
   *
   * Creates (:ApprovalState) node with approval metadata
   * Schema: { id, threadId, nodeId, status, metadata, requestedAt, respondedAt, respondedBy }
   */
  async saveApprovalState(data: ApprovalStateData): Promise<void> {
    const session: Session = this.driver.session();

    try {
      await session.run(
        `
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
        `,
        {
          id: data.id,
          threadId: data.threadId,
          nodeId: data.nodeId,
          status: data.status,
          metadata: JSON.stringify(data.metadata || {}),
          requestedAt: data.requestedAt.toISOString(),
          respondedAt: data.respondedAt?.toISOString() || null,
          respondedBy: data.respondedBy || null,
        }
      );

      this.logger.debug(
        `Saved approval state: ${data.id} for thread ${data.threadId}`
      );
    } catch (error) {
      this.logger.error(`Failed to save approval state ${data.id}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Load approval state by ID
   */
  async loadApprovalState(id: string): Promise<ApprovalStateData | null> {
    const session: Session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (a:ApprovalState { id: $id })
        RETURN a
        `,
        { id }
      );

      if (result.records.length === 0) {
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
    } catch (error) {
      this.logger.error(`Failed to load approval state ${id}:`, error);
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * List approval states by thread ID with optional filtering
   */
  async listApprovalsByThread(
    threadId: string,
    options?: {
      status?: string;
      limit?: number;
    }
  ): Promise<ApprovalStateData[]> {
    const session: Session = this.driver.session();

    try {
      const statusFilter = options?.status ? 'AND a.status = $status' : '';
      const limit = options?.limit || 10;

      const result = await session.run(
        `
        MATCH (a:ApprovalState { threadId: $threadId })
        WHERE 1=1 ${statusFilter}
        RETURN a
        ORDER BY a.requestedAt DESC
        LIMIT $limit
        `,
        {
          threadId,
          status: options?.status || null,
          limit,
        }
      );

      return result.records.map((record) => {
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
    } catch (error) {
      this.logger.error(
        `Failed to list approvals for thread ${threadId}:`,
        error
      );
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Update approval status (when response is received)
   */
  async updateApprovalStatus(
    id: string,
    status: string,
    respondedBy: string,
    respondedAt?: Date
  ): Promise<void> {
    const session: Session = this.driver.session();

    try {
      await session.run(
        `
        MATCH (a:ApprovalState { id: $id })
        SET a.status = $status,
            a.respondedBy = $respondedBy,
            a.respondedAt = datetime($respondedAt)
        RETURN a
        `,
        {
          id,
          status,
          respondedBy,
          respondedAt: (respondedAt || new Date()).toISOString(),
        }
      );

      this.logger.debug(`Updated approval status: ${id} -> ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update approval status ${id}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Save approval chain progress
   *
   * Used for multi-level approval chains
   */
  async saveApprovalChain(data: ApprovalChainData): Promise<void> {
    const session: Session = this.driver.session();

    try {
      await session.run(
        `
        CREATE (c:ApprovalChain {
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
        `,
        {
          chainId: data.chainId,
          executionId: data.executionId,
          level: data.level,
          approvers: data.approvers,
          status: data.status,
          requestId: data.requestId,
          nodeId: data.nodeId,
          timestamp: data.timestamp.toISOString(),
        }
      );

      this.logger.debug(
        `Saved approval chain: ${data.chainId} level ${data.level}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to save approval chain ${data.chainId}:`,
        error
      );
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Load approval chain progress
   */
  async loadApprovalChain(
    chainId: string,
    executionId: string
  ): Promise<ApprovalChainData | null> {
    const session: Session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (c:ApprovalChain { chainId: $chainId, executionId: $executionId })
        RETURN c
        ORDER BY c.level DESC
        LIMIT 1
        `,
        { chainId, executionId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0].get('c').properties;

      return {
        chainId: record.chainId,
        executionId: record.executionId,
        level: record.level.toNumber(),
        approvers: record.approvers,
        status: record.status,
        requestId: record.requestId,
        nodeId: record.nodeId,
        timestamp: new Date(record.timestamp),
      };
    } catch (error) {
      this.logger.error(
        `Failed to load approval chain ${chainId}/${executionId}:`,
        error
      );
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * Cleanup old approval states (retention policy)
   */
  async cleanupOldApprovals(maxAgeMs: number): Promise<number> {
    const session: Session = this.driver.session();

    try {
      const cutoffDate = new Date(Date.now() - maxAgeMs);

      const result = await session.run(
        `
        MATCH (a:ApprovalState)
        WHERE a.requestedAt < datetime($cutoffDate)
        WITH a
        DETACH DELETE a
        RETURN count(a) as deletedCount
        `,
        { cutoffDate: cutoffDate.toISOString() }
      );

      const deletedCount =
        result.records[0]?.get('deletedCount').toNumber() || 0;

      this.logger.log(`Cleaned up ${deletedCount} old approval states`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old approvals:', error);
      return 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Create indexes for fast queries (should be called on module init)
   */
  async ensureIndexes(): Promise<void> {
    const session: Session = this.driver.session();

    try {
      // Index on threadId for fast thread-based queries
      await session.run(`
        CREATE INDEX approval_state_thread_idx IF NOT EXISTS
        FOR (a:ApprovalState)
        ON (a.threadId)
      `);

      // Index on status for filtering
      await session.run(`
        CREATE INDEX approval_state_status_idx IF NOT EXISTS
        FOR (a:ApprovalState)
        ON (a.status)
      `);

      // Index on requestedAt for cleanup queries
      await session.run(`
        CREATE INDEX approval_state_requested_idx IF NOT EXISTS
        FOR (a:ApprovalState)
        ON (a.requestedAt)
      `);

      // Index on chainId for chain queries
      await session.run(`
        CREATE INDEX approval_chain_id_idx IF NOT EXISTS
        FOR (c:ApprovalChain)
        ON (c.chainId, c.executionId)
      `);

      this.logger.log('Ensured all approval state indexes exist');
    } catch (error) {
      this.logger.warn('Failed to ensure indexes (may already exist):', error);
    } finally {
      await session.close();
    }
  }
}
