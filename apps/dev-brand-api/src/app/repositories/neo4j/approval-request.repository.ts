import { Injectable } from '@nestjs/common';
import {
  Repository,
  InjectNeogma,
  NeogmaService,
  Safe,
  BaseRepositoryService,
} from '@hive-academy/nestjs-neo4j';
import { ApprovalRequest } from '../../entities/neo4j/approval-request.entity';
import {
  HitlStorageError,
  InvalidApprovalDataError,
} from '@hive-academy/langgraph-hitl';
import type {
  ApprovalStorageData,
  ApprovalStorageResponse,
  ApprovalStorageStatus,
  HitlStorageStats,
} from '@hive-academy/langgraph-hitl';

/**
 * ApprovalRequest Repository
 *
 * Replaces: neo4j-hitl-storage.adapter.ts (500 lines)
 *
 * Provides type-safe CRUD operations and custom business methods
 * for HITL approval request management using modern @Repository pattern.
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
@Repository(() => ApprovalRequest)
@Injectable()
export class ApprovalRequestRepository extends BaseRepositoryService<ApprovalRequest> {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {
    super();
  }

  // ============================================================================
  // AUTO-GENERATED CRUD METHODS (from @Repository decorator)
  // ============================================================================
  // - create(data: Partial<ApprovalRequest>): Promise<ApprovalRequest>
  // - findById(id: string): Promise<ApprovalRequest | null>
  // - findAll(filter?: any): Promise<ApprovalRequest[]>
  // - update(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest>
  // - delete(id: string): Promise<boolean>
  // - count(filter?: any): Promise<number>
  // - exists(id: string): Promise<boolean>

  // ============================================================================
  // CUSTOM BUSINESS METHODS (migrated from legacy adapter)
  // ============================================================================

  /**
   * Store an approval request in Neo4j
   * Migrated from: storeApprovalRequest in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async storeApprovalRequest(request: ApprovalStorageData): Promise<string> {
    this.validateApprovalData(request);

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      // Add parameters using BindParam
      const idParam = bindParam.add(request.id);
      const executionIdParam = bindParam.add(request.executionId);
      const nodeIdParam = bindParam.add(request.nodeId);
      const messageParam = bindParam.add(request.message);
      // Convert metadata string to object for storage in Neo4j
      const metadataParam = bindParam.add(
        request.metadata ? JSON.parse(request.metadata) : null
      );
      const statusParam = bindParam.add(request.status);
      const requestedAtParam = bindParam.add(request.requestedAt.toISOString());
      const expiresAtParam = bindParam.add(
        request.expiresAt ? request.expiresAt.toISOString() : null
      );
      const confidenceParam = bindParam.add(request.confidence || null);
      const riskLevelParam = bindParam.add(request.riskLevel || null);
      const chainIdParam = bindParam.add(request.chainId || null);
      const approversParam = bindParam.add(request.approvers || null);
      const timeoutStrategyParam = bindParam.add(
        request.timeoutStrategy || null
      );

      queryBuilder
        .create(
          `(a:ApprovalRequest {
          id: $${idParam},
          executionId: $${executionIdParam},
          nodeId: $${nodeIdParam},
          message: $${messageParam},
          metadata: $${metadataParam},
          status: $${statusParam},
          requestedAt: datetime($${requestedAtParam}),
          expiresAt: $${expiresAtParam},
          confidence: $${confidenceParam},
          riskLevel: $${riskLevelParam},
          chainId: $${chainIdParam},
          approvers: $${approversParam},
          timeoutStrategy: $${timeoutStrategyParam},
          createdAt: datetime(),
          updatedAt: datetime()
        })`
        )
        .return('a.id as id');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const firstRecord = result.records[0];
      if (!firstRecord) {
        throw new HitlStorageError(
          'No record returned from approval request creation',
          'storeApprovalRequest',
          { request }
        );
      }

      const createdId = String(firstRecord.get('id') || request.id);
      return createdId;
    } catch (error) {
      throw new HitlStorageError(
        'Failed to store approval request',
        'storeApprovalRequest',
        { request, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get approval request by ID with optional response
   * Migrated from: getApprovalRequest in neo4j-hitl-storage.adapter.ts
   * Uses RECOMMENDED QueryBuilder pattern with BindParam
   */
  @Safe()
  async getApprovalRequest(id: string): Promise<ApprovalStorageData | null> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(id);

      queryBuilder
        .match('(a:ApprovalRequest)')
        .where(`a.id = $${idParam}`)
        .match('(r:ApprovalResponse)')
        .where(
          '(a)-[:HAS_RESPONSE]->(r) OR NOT EXISTS((a)-[:HAS_RESPONSE]->())'
        )
        .return('a, r');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const approvalNode = record.get('a')?.properties;
      const responseNode = record.get('r')?.properties;

      if (!approvalNode) {
        return null;
      }

      return this.mapNodeToApprovalData(approvalNode, responseNode);
    } catch (error) {
      throw new HitlStorageError(
        'Failed to get approval request',
        'getApprovalRequest',
        { id, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get all pending approval requests that haven't expired
   * Migrated from: getPendingApprovals in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async getPendingApprovals(): Promise<readonly ApprovalStorageData[]> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const pendingStatuses = bindParam.add(['pending', 'in_progress']);

      queryBuilder
        .match('(a:ApprovalRequest)')
        .where(
          `a.status IN $${pendingStatuses} AND (a.expiresAt IS NULL OR datetime() < a.expiresAt)`
        )
        .match('(r:ApprovalResponse)')
        .where(
          '(a)-[:HAS_RESPONSE]->(r) OR NOT EXISTS((a)-[:HAS_RESPONSE]->())'
        )
        .return('a, r')
        .orderBy('a.requestedAt ASC');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const approvals = result.records.map((record) => {
        const approvalNode = record.get('a')?.properties;
        const responseNode = record.get('r')?.properties;
        return this.mapNodeToApprovalData(approvalNode, responseNode);
      });

      return approvals;
    } catch (error) {
      throw new HitlStorageError(
        'Failed to get pending approvals',
        'getPendingApprovals',
        { error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get approval requests for a specific execution
   * Migrated from: getApprovalsByExecution in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async getApprovalsByExecution(
    executionId: string
  ): Promise<readonly ApprovalStorageData[]> {
    if (!executionId?.trim()) {
      throw new InvalidApprovalDataError('Execution ID is required');
    }

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const executionIdParam = bindParam.add(executionId);

      queryBuilder
        .match('(a:ApprovalRequest)')
        .where(`a.executionId = $${executionIdParam}`)
        .match('(r:ApprovalResponse)')
        .where(
          '(a)-[:HAS_RESPONSE]->(r) OR NOT EXISTS((a)-[:HAS_RESPONSE]->())'
        )
        .return('a, r')
        .orderBy('a.requestedAt ASC');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

      const approvals = result.records.map((record) => {
        const approvalNode = record.get('a')?.properties;
        const responseNode = record.get('r')?.properties;
        return this.mapNodeToApprovalData(approvalNode, responseNode);
      });

      return approvals;
    } catch (error) {
      throw new HitlStorageError(
        'Failed to get approvals by execution',
        'getApprovalsByExecution',
        { executionId, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Update approval request status and response
   * Migrated from: updateApprovalStatus in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async updateApprovalStatus(
    id: string,
    status: string,
    response?: ApprovalStorageResponse
  ): Promise<void> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }

    if (response) {
      this.validateApprovalResponse(response);
    }

    try {
      if (response) {
        // Update approval and create response node
        const queryBuilder = this.neogma.createQueryBuilder();
        const bindParam = queryBuilder.getBindParam();

        const idParam = bindParam.add(id);
        const statusParam = bindParam.add(status);
        const decisionParam = bindParam.add(response.decision);
        const approvedByParam = bindParam.add('system'); // response doesn't have approvedBy in interface
        const messageParam = bindParam.add(response.responseMessage || null);
        const timestampParam = bindParam.add(new Date().toISOString()); // response doesn't have timestamp in interface
        const metadataParam = bindParam.add(response.metadata || null);

        queryBuilder
          .match('(a:ApprovalRequest)')
          .where(`a.id = $${idParam}`)
          .set(`a.status = $${statusParam}`)
          .set('a.updatedAt = datetime()')
          .create(
            `(r:ApprovalResponse {
            decision: $${decisionParam},
            approvedBy: $${approvedByParam},
            message: $${messageParam},
            timestamp: datetime($${timestampParam}),
            metadata: $${metadataParam},
            createdAt: datetime()
          })`
          )
          .create('(a)-[:HAS_RESPONSE]->(r)')
          .return('a.id as id');

        const cypher = queryBuilder.getStatement();
        const params = bindParam.get();
        await this.neogma.run(cypher, params);
      } else {
        // Update approval only
        const queryBuilder = this.neogma.createQueryBuilder();
        const bindParam = queryBuilder.getBindParam();

        const idParam = bindParam.add(id);
        const statusParam = bindParam.add(status);

        queryBuilder
          .match('(a:ApprovalRequest)')
          .where(`a.id = $${idParam}`)
          .set(`a.status = $${statusParam}`)
          .set('a.updatedAt = datetime()')
          .return('a.id as id');

        const cypher = queryBuilder.getStatement();
        const params = bindParam.get();
        await this.neogma.run(cypher, params);
      }
    } catch (error) {
      throw new HitlStorageError(
        'Failed to update approval status',
        'updateApprovalStatus',
        { id, status, response, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Update approval request status with optional metadata
   * Required by: IApprovalChainStorageService interface
   */
  @Safe()
  async updateApprovalRequestStatus(
    requestId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!requestId?.trim()) {
      throw new InvalidApprovalDataError('Request ID is required');
    }
    if (!status?.trim()) {
      throw new InvalidApprovalDataError('Status is required');
    }

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(requestId);
      const statusParam = bindParam.add(status);

      queryBuilder
        .match('(a:ApprovalRequest)')
        .where(`a.id = $${idParam}`)
        .set(`a.status = $${statusParam}`)
        .set('a.updatedAt = datetime()');

      // If metadata is provided, update it
      if (metadata) {
        const metadataParam = bindParam.add(metadata);
        queryBuilder.set(`a.metadata = $${metadataParam}`);
      }

      queryBuilder.return('a.id as id');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);
    } catch (error) {
      throw new HitlStorageError(
        'Failed to update approval request status',
        'updateApprovalRequestStatus',
        { requestId, status, metadata, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Delete approval request by ID
   * Migrated from: deleteApprovalRequest in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async deleteApprovalRequest(id: string): Promise<boolean> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }

    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const idParam = bindParam.add(id);

      queryBuilder
        .match('(a:ApprovalRequest)')
        .where(`a.id = $${idParam}`)
        .match('(r:ApprovalResponse)')
        .where(
          '(a)-[:HAS_RESPONSE]->(r) OR NOT EXISTS((a)-[:HAS_RESPONSE]->())'
        )
        .delete('r, a')
        .return('count(a) as deletedCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const firstRecord = result.records[0];
      const deletedCount = Number(firstRecord?.get('deletedCount')) || 0;

      return deletedCount > 0;
    } catch (error) {
      throw new HitlStorageError(
        'Failed to delete approval request',
        'deleteApprovalRequest',
        { id, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Delete expired approval requests
   * Migrated from: deleteExpiredApprovals in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async deleteExpiredApprovals(before: Date): Promise<number> {
    try {
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const beforeParam = bindParam.add(before.toISOString());

      queryBuilder
        .match('(a:ApprovalRequest)')
        .where(
          `a.expiresAt IS NOT NULL AND a.expiresAt < datetime($${beforeParam})`
        )
        .match('(r:ApprovalResponse)')
        .where(
          '(a)-[:HAS_RESPONSE]->(r) OR NOT EXISTS((a)-[:HAS_RESPONSE]->())'
        )
        .delete('r, a')
        .return('count(a) as deletedCount');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);
      const firstRecord = result.records[0];
      const deletedCount = Number(firstRecord?.get('deletedCount')) || 0;

      return deletedCount;
    } catch (error) {
      throw new HitlStorageError(
        'Failed to delete expired approvals',
        'deleteExpiredApprovals',
        { before, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get storage statistics
   * Migrated from: getStorageStats in neo4j-hitl-storage.adapter.ts
   */
  @Safe()
  async getStorageStats(): Promise<HitlStorageStats> {
    try {
      // Get basic counts by status
      const statusBuilder = this.neogma.createQueryBuilder();
      statusBuilder
        .match('(a:ApprovalRequest)')
        .return('a.status as status, count(*) as count');
      const statusCypher = statusBuilder.getStatement();
      const statusParams = statusBuilder.getBindParam().get();

      // Get response time statistics
      const timingBuilder = this.neogma.createQueryBuilder();
      timingBuilder
        .match('(a:ApprovalRequest)-[:HAS_RESPONSE]->(r:ApprovalResponse)')
        .where('r.timestamp IS NOT NULL AND a.requestedAt IS NOT NULL')
        .with(
          'duration.between(a.requestedAt, r.timestamp).milliseconds as responseTime'
        )
        .return(
          'avg(responseTime) as averageResponseTime, count(*) as responseCount'
        );
      const timingCypher = timingBuilder.getStatement();
      const timingParams = timingBuilder.getBindParam().get();

      // Get timeout and approval rates
      const rateBuilder = this.neogma.createQueryBuilder();
      rateBuilder.match('(a:ApprovalRequest)').with(`
          count(*) as total,
          count(CASE WHEN a.status = 'timeout' THEN 1 END) as timeouts,
          count(CASE WHEN a.status = 'approved' THEN 1 END) as approved
        `).return(`
          total,
          timeouts,
          approved,
          CASE WHEN total > 0 THEN toFloat(timeouts) / total ELSE 0.0 END as timeoutRate,
          CASE WHEN total > 0 THEN toFloat(approved) / total ELSE 0.0 END as approvalRate
        `);
      const rateCypher = rateBuilder.getStatement();
      const rateParams = rateBuilder.getBindParam().get();

      const [statusResult, timingResult, rateResult] = await Promise.all([
        this.neogma.run(statusCypher, statusParams),
        this.neogma.run(timingCypher, timingParams),
        this.neogma.run(rateCypher, rateParams),
      ]);

      // Process status counts
      const requestsByStatus: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        approved: 0,
        rejected: 0,
        escalated: 0,
        timeout: 0,
        cancelled: 0,
      };

      statusResult.records.forEach((record) => {
        const status = record.get('status') as string;
        const count = Number(record.get('count')) || 0;
        if (status in requestsByStatus) {
          requestsByStatus[status] = count;
        }
      });

      // Process timing data
      const timingRecord = timingResult.records[0];
      const averageResponseTime =
        Number(timingRecord?.get('averageResponseTime')) || 0;

      // Process rate data
      const rateRecord = rateResult.records[0];
      const totalRequests = Number(rateRecord?.get('total')) || 0;
      const timeoutRate = Number(rateRecord?.get('timeoutRate')) || 0;
      const approvalRate = Number(rateRecord?.get('approvalRate')) || 0;

      return {
        totalRequests,
        pendingRequests: requestsByStatus.pending || 0,
        approvedRequests: requestsByStatus.approved || 0,
        rejectedRequests: requestsByStatus.rejected || 0,
        expiredRequests: requestsByStatus.timeout || 0,
        requestsByStatus,
        averageResponseTime,
        timeoutRate,
        approvalRate,
        completionRate:
          totalRequests > 0
            ? ((requestsByStatus.approved + requestsByStatus.rejected) /
                totalRequests) *
              100
            : 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new HitlStorageError(
        'Failed to get storage statistics',
        'getStorageStats',
        { error: this.serializeError(error) }
      );
    }
  }

  // ============================================================================
  // HELPER METHODS (private utilities)
  // ============================================================================

  private mapNodeToApprovalData(
    approvalNode: any,
    responseNode?: any
  ): ApprovalStorageData {
    if (!approvalNode) {
      throw new InvalidApprovalDataError('Invalid approval node data');
    }

    let response: ApprovalStorageResponse | undefined;
    if (responseNode) {
      response = {
        id: responseNode.id,
        decision: responseNode.decision,
        approvedBy: responseNode.approvedBy,
        message: responseNode.message,
        timestamp: new Date(responseNode.timestamp),
        metadata: responseNode.metadata,
      };
    }

    return {
      id: approvalNode.id,
      executionId: approvalNode.executionId,
      nodeId: approvalNode.nodeId,
      message: approvalNode.message,
      // Convert metadata object to string for HITL module compatibility
      metadata: approvalNode.metadata
        ? JSON.stringify(approvalNode.metadata)
        : undefined,
      status: approvalNode.status,
      requestedAt: new Date(approvalNode.requestedAt),
      expiresAt: approvalNode.expiresAt
        ? new Date(approvalNode.expiresAt)
        : undefined,
      confidence: approvalNode.confidence,
      riskLevel: approvalNode.riskLevel,
      chainId: approvalNode.chainId,
      approvers: approvalNode.approvers,
      timeoutStrategy: approvalNode.timeoutStrategy,
      response,
    };
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return { error: String(error) };
  }

  private validateApprovalData(data: ApprovalStorageData): void {
    if (!data.id?.trim()) {
      throw new InvalidApprovalDataError(
        'Approval request ID is required and cannot be empty'
      );
    }

    if (!data.executionId?.trim()) {
      throw new InvalidApprovalDataError(
        'Execution ID is required and cannot be empty'
      );
    }

    if (!data.nodeId?.trim()) {
      throw new InvalidApprovalDataError(
        'Node ID is required and cannot be empty'
      );
    }

    if (!data.message?.trim()) {
      throw new InvalidApprovalDataError(
        'Approval message is required and cannot be empty'
      );
    }

    if (!data.requestedAt || !(data.requestedAt instanceof Date)) {
      throw new InvalidApprovalDataError(
        'Requested timestamp must be a valid Date'
      );
    }
  }

  private validateApprovalResponse(response: ApprovalStorageResponse): void {
    if (
      !response.decision ||
      !['approved', 'rejected', 'escalated', 'timeout'].includes(
        response.decision
      )
    ) {
      throw new InvalidApprovalDataError(
        'Approval decision must be one of: approved, rejected, escalated, timeout'
      );
    }

    if (!response.approvedBy?.trim()) {
      throw new InvalidApprovalDataError(
        'ApprovedBy is required and cannot be empty'
      );
    }

    if (!response.timestamp || !(response.timestamp instanceof Date)) {
      throw new InvalidApprovalDataError(
        'Response timestamp must be a valid Date'
      );
    }
  }
}
