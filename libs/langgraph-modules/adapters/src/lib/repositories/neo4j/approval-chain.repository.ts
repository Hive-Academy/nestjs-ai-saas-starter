import { Inject, Injectable } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  NeogmaService,
  Neo4jCrudService,
  Safe,
  Authorize,
  ValidateInput,
  AuditLog,
  getRepositoryToken,
  ParameterBindingUtility,
} from '@hive-academy/nestjs-neo4j';
import { ApprovalChain } from '../../entities/neo4j/approval-chain.entity';
import { ApprovalRequest } from '../../entities/neo4j/approval-request.entity';
import { ApprovalRequestRepository } from './approval-request.repository';
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
 * ApprovalChain Repository - Composition Pattern
 *
 * Replaces: neo4j-approval-chain-storage.adapter.ts (603 lines)
 *
 * Extends Neo4jRepository<ApprovalChain> for chain operations.
 * Composes ApprovalRequestRepository for request operations.
 *
 * This follows proper separation of concerns:
 * - Manages ApprovalChain entity directly
 * - Delegates ApprovalRequest operations to ApprovalRequestRepository
 *
 * CRUD methods (inherited from Neo4jRepository<ApprovalChain>):
 * - findById, findAll, create, update, delete, count, exists (for chains)
 */
@Injectable()
export class ApprovalChainRepository extends Neo4jRepositoryBase<ApprovalChain> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    @Inject(getRepositoryToken(ApprovalRequest))
    private readonly approvalRequestRepo: ApprovalRequestRepository
  ) {
    super(ApprovalChain, 'ApprovalChain', neogma, crud);
  }

  // ============================================================================
  // APPROVAL CHAIN MANAGEMENT
  // ============================================================================

  /**
   * Store an approval chain configuration
   * Migrated from: storeApprovalChain in neo4j-approval-chain-storage.adapter.ts
   */
  @Authorize({ roles: ['admin'] })
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
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

      const chainIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'chainId',
        chainId
      );
      const levelCountParam = ParameterBindingUtility.addParam(
        bindParam,
        'levelCount',
        levels.length
      );
      const levelsParam = ParameterBindingUtility.addParam(
        bindParam,
        'levels',
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
  async getApprovalChain(chainId: string): Promise<ApprovalLevel[] | null> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(chain:ApprovalChain)-[:HAS_LEVEL]->(level:ApprovalLevel)')
        .where('chain.id = $chainId') // ✅ Named parameter
        .return('level')
        .orderBy('level.priority ASC');

      const cypher = qb.getStatement();
      const result = await this.neogma.run(cypher, { chainId });

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
  @Authorize({ roles: ['admin'] })
  @AuditLog({ logLevel: 'standard', enabled: true, logSuccess: true })
  @Safe()
  async deleteApprovalChain(chainId: string): Promise<boolean> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();
      const bindParam = qb.getBindParam();

      const chainIdParam = ParameterBindingUtility.addParam(
        bindParam,
        'chainId',
        chainId
      );

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
   * Delegates to ApprovalRequestRepository
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async storeApprovalRequest(request: ApprovalRequestType): Promise<void> {
    if (!request.id?.trim()) {
      throw new Error('Request ID is required');
    }

    try {
      // Delegate to ApprovalRequestRepository
      await this.approvalRequestRepo.storeApprovalRequest({
        id: request.id,
        executionId: request.executionId || '',
        nodeId: request.nodeId || '',
        chainId: request.chainId,
        // riskLevel: request.level || 0,
        status: (request.status as any) || 'pending',
        message: request.message || '',
        metadata: (request.metadata || {}) as any,
        requestedAt: request.requestedAt || new Date(),
        expiresAt: request.expiresAt,
      });
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
   * Delegates to ApprovalRequestRepository
   */
  async getApprovalRequestsByExecution(
    executionId: string
  ): Promise<ApprovalRequestType[]> {
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }

    try {
      // Delegate to ApprovalRequestRepository
      const requests = await this.approvalRequestRepo.getApprovalsByExecution(
        executionId
      );
      return requests.map((req) => this.mapNodeToApprovalRequest(req as any));
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
  async getAllActiveRequests(): Promise<ApprovalRequestType[]> {
    try {
      const qb = this.neogma.createQueryBuilder();

      qb.match('(req:ApprovalRequest)')
        .where('req.status IN $statusList') // ✅ Named parameter
        .return('req')
        .orderBy('req.requestedAt ASC');

      const cypher = qb.getStatement();
      const result = await this.neogma.run(cypher, {
        statusList: ['pending', 'escalated', 'in_progress'],
      });

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
  async getPendingApprovalsForApprover(
    approverId: string
  ): Promise<ApprovalRequestType[]> {
    if (!approverId?.trim()) {
      throw new Error('Approver ID is required');
    }

    try {
      const qb = this.neogma.createQueryBuilder();

      // This is a complex query that joins with chain levels to find requests assigned to the approver
      qb.match('(req:ApprovalRequest)')
        .where('req.status IN $statusList') // ✅ Named parameter
        .match('(chain:ApprovalChain)-[:HAS_LEVEL]->(level:ApprovalLevel)')
        .where('chain.id = req.chainId AND level.priority = req.level')
        .where('level.approvers CONTAINS $approverId') // ✅ Named parameter
        .return('req')
        .orderBy('req.requestedAt ASC');

      const cypher = qb.getStatement();
      const result = await this.neogma.run(cypher, {
        statusList: ['pending', 'in_progress'],
        approverId,
      });

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
   * Delegates to ApprovalRequestRepository
   */
  @ValidateInput()
  @AuditLog({ logLevel: 'detailed', enabled: true, logSuccess: true })
  @Safe()
  async updateApprovalRequestStatus(
    requestId: string,
    status: 'pending' | 'approved' | 'rejected' | 'expired' | undefined,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required');
    }

    try {
      // Delegate to ApprovalRequestRepository
      await this.approvalRequestRepo.updateApprovalStatus(
        requestId,
        status as any,
        metadata ? ({ response: metadata } as any) : undefined
      );
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

      const cutoffDateParam = ParameterBindingUtility.addParam(
        bindParam,
        'cutoffDate',
        cutoffDate.toISOString()
      );
      const statusListParam = ParameterBindingUtility.addParam(
        bindParam,
        'statusList',
        ['approved', 'rejected', 'cancelled', 'timeout']
      );

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
