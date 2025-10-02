import { Injectable } from '@nestjs/common';
import {
  Repository,
  InjectNeogma,
  NeogmaService,
  CypherQuery,
} from '@hive-academy/nestjs-neo4j';
import { ApprovalRequest } from '../../entities/neo4j/approval-request.entity';
import type { ApprovalLevel } from '@hive-academy/langgraph-hitl';

interface ApprovalRequestType {
  id: string;
  executionId?: string;
  nodeId?: string;
  chainId?: string;
  level?: number;
  status?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  requestedAt?: Date;
  expiresAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  escalatedAt?: Date;
  escalatedTo?: string;
}

/**
 * ApprovalChain Repository
 *
 * Replaces: neo4j-approval-chain-storage.adapter.ts (603 lines)
 *
 * Provides type-safe operations for approval chain management including
 * hierarchical approval levels and request routing using modern @Repository pattern.
 *
 * Note: This repository manages both ApprovalChain nodes and their relationships
 * to ApprovalRequest entities via the chainId property.
 *
 * The @Repository decorator auto-generates these methods:
 * - findById(id: string): Promise<ApprovalRequest | null>
 * - findAll(options?: FindOptions<ApprovalRequest>): Promise<ApprovalRequest[]>
 * - create(data: Partial<ApprovalRequest>): Promise<ApprovalRequest>
 * - update(id: string, updates: Partial<ApprovalRequest>): Promise<ApprovalRequest | null>
 * - delete(id: string): Promise<boolean>
 * - count(where?: Partial<ApprovalRequest>): Promise<number>
 * - exists(id: string): Promise<boolean>
 */
@Repository(() => ApprovalRequest) // Using ApprovalRequest entity as base since no dedicated ApprovalChain entity exists
@Injectable()
export class ApprovalChainRepository {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {}

  // ============================================================================
  // APPROVAL CHAIN MANAGEMENT
  // ============================================================================

  /**
   * Store an approval chain configuration
   * Migrated from: storeApprovalChain in neo4j-approval-chain-storage.adapter.ts
   */
  async storeApprovalChain(
    chainId: string,
    levels: ApprovalLevel[]
  ): Promise<void> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }
    if (!levels || levels.length === 0) {
      throw new Error('Approval levels are required');
    }

    try {
      // First delete existing chain if it exists
      await this.deleteApprovalChain(chainId);

      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const chainIdParam = bindParam.add(chainId);
      const levelCountParam = bindParam.add(levels.length);
      const levelsParam = bindParam.add(
        levels.map((level) => ({
          id: level.id,
          name: level.name,
          priority: level.priority,
          policy: level.policy,
          approvers: JSON.stringify(level.approvers),
          conditions: level.conditions
            ? JSON.stringify(level.conditions)
            : null,
          timeoutMs: level.timeoutMs || null,
          autoApproveOnTimeout: level.autoApproveOnTimeout || false,
        }))
      );

      qb.create(
        `(chain:ApprovalChain {
          id: $${chainIdParam},
          levelCount: $${levelCountParam},
          createdAt: datetime(),
          updatedAt: datetime()
        })`
      )
        .with('chain')
        .unwind(`$${levelsParam} as levelData`)
        .create(
          `(level:ApprovalLevel {
          id: levelData.id,
          name: levelData.name,
          priority: levelData.priority,
          policy: levelData.policy,
          approvers: levelData.approvers,
          conditions: levelData.conditions,
          timeoutMs: levelData.timeoutMs,
          autoApproveOnTimeout: levelData.autoApproveOnTimeout,
          createdAt: datetime()
        })`
        )
        .create('(chain)-[:HAS_LEVEL {priority: levelData.priority}]->(level)')
        .return('chain.id as chainId, count(level) as levelCount');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(
        `Failed to store approval chain: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Retrieve an approval chain configuration
   * Migrated from: getApprovalChain in neo4j-approval-chain-storage.adapter.ts
   */
  @CypherQuery()
  async getApprovalChain(chainId: string): Promise<ApprovalLevel[] | null> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const chainIdParam = bindParam.add(chainId);

      qb.match('(chain:ApprovalChain)-[:HAS_LEVEL]->(level:ApprovalLevel)')
        .where(`chain.id = $${chainIdParam}`)
        .return('level')
        .orderBy('level.priority ASC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const levels: ApprovalLevel[] = result.records.map((record) => {
        const levelProps = record.get('level').properties;
        return {
          id: levelProps.id,
          name: levelProps.name,
          priority: levelProps.priority,
          policy: levelProps.policy,
          approvers: levelProps.approvers
            ? JSON.parse(levelProps.approvers)
            : [],
          conditions: levelProps.conditions
            ? JSON.parse(levelProps.conditions)
            : undefined,
          timeoutMs: levelProps.timeoutMs || undefined,
          autoApproveOnTimeout: levelProps.autoApproveOnTimeout || false,
        };
      });

      return levels;
    } catch (error) {
      throw new Error(
        `Failed to retrieve approval chain: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get all approval chains
   * Migrated from: getAllApprovalChains in neo4j-approval-chain-storage.adapter.ts
   */
  @CypherQuery()
  async getAllApprovalChains(): Promise<Record<string, ApprovalLevel[]>> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(chain:ApprovalChain)-[:HAS_LEVEL]->(level:ApprovalLevel)')
        .return('chain.id as chainId, collect(level) as levels')
        .orderBy('chain.id ASC');

      const cypher = qb.getStatement();
      const params = qb.getBindParam().get();
      const result = await this.neogma.run(cypher, params);

      const chains: Record<string, ApprovalLevel[]> = {};

      result.records.forEach((record) => {
        const chainId = record.get('chainId');
        const levelNodes = record.get('levels');

        const levels: ApprovalLevel[] = levelNodes
          .map((levelNode: any) => {
            const props = levelNode.properties;
            return {
              id: props.id,
              name: props.name,
              priority: props.priority,
              policy: props.policy,
              approvers: props.approvers ? JSON.parse(props.approvers) : [],
              conditions: props.conditions
                ? JSON.parse(props.conditions)
                : undefined,
              timeoutMs: props.timeoutMs || undefined,
              autoApproveOnTimeout: props.autoApproveOnTimeout || false,
            };
          })
          .sort(
            (a: ApprovalLevel, b: ApprovalLevel) => a.priority - b.priority
          );

        chains[chainId] = levels;
      });

      return chains;
    } catch (error) {
      throw new Error(
        `Failed to retrieve all approval chains: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Delete an approval chain
   * Migrated from: deleteApprovalChain in neo4j-approval-chain-storage.adapter.ts
   */
  async deleteApprovalChain(chainId: string): Promise<boolean> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const chainIdParam = bindParam.add(chainId);

      qb.match('(chain:ApprovalChain)')
        .where(`chain.id = $${chainIdParam}`)
        .match('(level:ApprovalLevel)')
        .where(
          '(chain)-[:HAS_LEVEL]->(level) OR NOT EXISTS((chain)-[:HAS_LEVEL]->())'
        )
        .delete('chain, level')
        .return('count(chain) as deletedCount');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const firstRecord = result.records[0];
      const deletedCount = Number(firstRecord?.get('deletedCount')) || 0;

      return deletedCount > 0;
    } catch (error) {
      throw new Error(
        `Failed to delete approval chain: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // ============================================================================
  // APPROVAL REQUEST MANAGEMENT (for chain-related requests)
  // ============================================================================

  /**
   * Store an approval request
   * Migrated from: storeApprovalRequest in neo4j-approval-chain-storage.adapter.ts
   */
  async storeApprovalRequest(request: ApprovalRequestType): Promise<void> {
    if (!request.id?.trim()) {
      throw new Error('Request ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const idParam = bindParam.add(request.id);
      const executionIdParam = bindParam.add(request.executionId || null);
      const nodeIdParam = bindParam.add(request.nodeId || null);
      const chainIdParam = bindParam.add(request.chainId || null);
      const levelParam = bindParam.add(request.level || 0);
      const statusParam = bindParam.add(request.status || 'pending');
      const messageParam = bindParam.add(request.message || '');
      const metadataParam = bindParam.add(
        request.metadata ? JSON.stringify(request.metadata) : null
      );
      const requestedAtParam = bindParam.add(
        request.requestedAt
          ? request.requestedAt.toISOString()
          : new Date().toISOString()
      );
      const expiresAtParam = bindParam.add(
        request.expiresAt ? request.expiresAt.toISOString() : null
      );

      qb.create(
        `(req:ApprovalRequest {
          id: $${idParam},
          executionId: $${executionIdParam},
          nodeId: $${nodeIdParam},
          chainId: $${chainIdParam},
          level: $${levelParam},
          status: $${statusParam},
          message: $${messageParam},
          metadata: $${metadataParam},
          requestedAt: datetime($${requestedAtParam}),
          expiresAt: $${expiresAtParam},
          createdAt: datetime(),
          updatedAt: datetime()
        })`
      ).return('req.id as id');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(
        `Failed to store approval request: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get approval requests for a specific execution
   * Migrated from: getApprovalRequestsByExecution in neo4j-approval-chain-storage.adapter.ts
   */
  @CypherQuery()
  async getApprovalRequestsByExecution(
    executionId: string
  ): Promise<ApprovalRequestType[]> {
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const executionIdParam = bindParam.add(executionId);

      qb.match('(req:ApprovalRequest)')
        .where(`req.executionId = $${executionIdParam}`)
        .return('req')
        .orderBy('req.requestedAt ASC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const reqProps = record.get('req').properties;
        return this.mapNodeToApprovalRequest(reqProps);
      });
    } catch (error) {
      throw new Error(
        `Failed to get approval requests for execution: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get all active approval requests (pending, escalated)
   * Migrated from: getAllActiveRequests in neo4j-approval-chain-storage.adapter.ts
   */
  @CypherQuery()
  async getAllActiveRequests(): Promise<ApprovalRequestType[]> {
    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const statusListParam = bindParam.add([
        'pending',
        'escalated',
        'in_progress',
      ]);

      qb.match('(req:ApprovalRequest)')
        .where(`req.status IN $${statusListParam}`)
        .return('req')
        .orderBy('req.requestedAt ASC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const reqProps = record.get('req').properties;
        return this.mapNodeToApprovalRequest(reqProps);
      });
    } catch (error) {
      throw new Error(
        `Failed to get active approval requests: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get pending approvals for a specific approver
   * Migrated from: getPendingApprovalsForApprover in neo4j-approval-chain-storage.adapter.ts
   */
  @CypherQuery()
  async getPendingApprovalsForApprover(
    approverId: string
  ): Promise<ApprovalRequestType[]> {
    if (!approverId?.trim()) {
      throw new Error('Approver ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const statusListParam = bindParam.add(['pending', 'in_progress']);
      const approverIdParam = bindParam.add(approverId);

      // This is a complex query that joins with chain levels to find requests assigned to the approver
      qb.match('(req:ApprovalRequest)')
        .where(`req.status IN $${statusListParam}`)
        .match('(chain:ApprovalChain)-[:HAS_LEVEL]->(level:ApprovalLevel)')
        .where('chain.id = req.chainId AND level.priority = req.level')
        .where(`level.approvers CONTAINS $${approverIdParam}`)
        .return('req')
        .orderBy('req.requestedAt ASC');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      return result.records.map((record) => {
        const reqProps = record.get('req').properties;
        return this.mapNodeToApprovalRequest(reqProps);
      });
    } catch (error) {
      throw new Error(
        `Failed to get pending approvals for approver: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Update approval request status and metadata
   * Migrated from: updateApprovalRequestStatus in neo4j-approval-chain-storage.adapter.ts
   */
  async updateApprovalRequestStatus(
    requestId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const requestIdParam = bindParam.add(requestId);
      const statusParam = bindParam.add(status);

      qb.match('(req:ApprovalRequest)')
        .where(`req.id = $${requestIdParam}`)
        .set(`req.status = $${statusParam}`)
        .set('req.updatedAt = datetime()');

      if (metadata) {
        const metadataParam = bindParam.add(JSON.stringify(metadata));
        qb.set(`req.metadata = $${metadataParam}`);
      }

      const cypher = qb.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new Error(
        `Failed to update approval request status: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Cleanup old requests and chains
   * Migrated from: cleanup in neo4j-approval-chain-storage.adapter.ts
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    // 30 days default
    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const cutoffDateParam = bindParam.add(cutoffDate.toISOString());
      const statusListParam = bindParam.add([
        'approved',
        'rejected',
        'cancelled',
        'timeout',
      ]);

      qb.match('(req:ApprovalRequest)')
        .where(
          `req.createdAt < datetime($${cutoffDateParam}) AND req.status IN $${statusListParam}`
        )
        .delete('req')
        .return('count(req) as deletedCount');

      const cypher = qb.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const firstRecord = result.records[0];
      const deletedCount = Number(firstRecord?.get('deletedCount')) || 0;

      return deletedCount;
    } catch (error) {
      throw new Error(
        `Failed to cleanup old requests: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Health check for storage connectivity
   * Migrated from: healthCheck in neo4j-approval-chain-storage.adapter.ts
   */
  async healthCheck(): Promise<boolean> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.return('1 as health');

      const cypher = qb.getStatement();
      const params = qb.getBindParam().get();
      const result = await this.neogma.run(cypher, params);
      return result.records.length > 0;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapNodeToApprovalRequest(props: any): ApprovalRequestType {
    return {
      id: props.id,
      executionId: props.executionId,
      nodeId: props.nodeId,
      chainId: props.chainId,
      level: props.level || 0,
      status: props.status || 'pending',
      message: props.message || '',
      metadata: props.metadata
        ? typeof props.metadata === 'string'
          ? JSON.parse(props.metadata)
          : props.metadata
        : {},
      requestedAt: props.requestedAt ? new Date(props.requestedAt) : new Date(),
      expiresAt: props.expiresAt ? new Date(props.expiresAt) : undefined,
      // These properties don't exist on the actual entity, but are required by the interface
      approvedAt: undefined,
      approvedBy: undefined,
      rejectedAt: undefined,
      rejectedBy: undefined,
      escalatedAt: undefined,
      escalatedTo: undefined,
    } as ApprovalRequestType;
  }
}
