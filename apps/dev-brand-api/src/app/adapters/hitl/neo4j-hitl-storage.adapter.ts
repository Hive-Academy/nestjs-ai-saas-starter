import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  IHitlStorageService,
  ApprovalStorageData,
  ApprovalStorageStatus,
  ApprovalStorageResponse,
  HitlStorageStats,
  HitlStorageError,
  InvalidApprovalDataError,
} from '@hive-academy/langgraph-hitl';

/**
 * Application-specific Neo4j adapter for HITL approval storage.
 *
 * This adapter follows the same pattern as Neo4jGraphAdapter,
 * properly using the existing Neo4jService from @hive-academy/nestjs-neo4j
 * instead of creating its own connection.
 *
 * Stores approval requests as nodes in Neo4j for persistence and auditability.
 */
@Injectable()
export class Neo4jHitlStorageAdapter extends IHitlStorageService {
  private readonly logger = new Logger(Neo4jHitlStorageAdapter.name);

  constructor(private readonly neo4jService: Neo4jService) {
    super();
    this.logger.debug('Neo4jHitlStorageAdapter initialized with Neo4jService');
  }

  /**
   * Store an approval request in Neo4j
   */
  async storeApprovalRequest(request: ApprovalStorageData): Promise<string> {
    this.validateApprovalData(request);

    try {
      const cypher = `
        CREATE (a:ApprovalRequest {
          id: $id,
          executionId: $executionId,
          nodeId: $nodeId,
          message: $message,
          metadata: $metadata,
          status: $status,
          requestedAt: datetime($requestedAt),
          expiresAt: $expiresAt,
          confidence: $confidence,
          riskLevel: $riskLevel,
          chainId: $chainId,
          approvers: $approvers,
          timeoutStrategy: $timeoutStrategy,
          createdAt: datetime()
        })
        RETURN a.id as id
      `;

      const result = await this.neo4jService.run(cypher, {
        id: request.id,
        executionId: request.executionId,
        nodeId: request.nodeId,
        message: request.message,
        metadata: request.metadata || null,
        status: request.status,
        requestedAt: request.requestedAt.toISOString(),
        expiresAt: request.expiresAt
          ? datetime(request.expiresAt.toISOString())
          : null,
        confidence: request.confidence || null,
        riskLevel: request.riskLevel || null,
        chainId: request.chainId || null,
        approvers: request.approvers || null,
        timeoutStrategy: request.timeoutStrategy || null,
      });

      const firstRecord = result.records[0];
      if (!firstRecord) {
        throw new HitlStorageError(
          'No record returned from approval request creation',
          'storeApprovalRequest',
          { request }
        );
      }

      const createdId = String((firstRecord as any).id || request.id);
      this.logger.debug(`Stored approval request ${createdId}`);

      return createdId;
    } catch (error) {
      this.logger.error('Failed to store approval request', error);
      throw new HitlStorageError(
        'Failed to store approval request',
        'storeApprovalRequest',
        { request, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequest(id: string): Promise<ApprovalStorageData | null> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }

    try {
      const cypher = `
        MATCH (a:ApprovalRequest {id: $id})
        OPTIONAL MATCH (a)-[:HAS_RESPONSE]->(r:ApprovalResponse)
        RETURN a, r
      `;

      const result = await this.neo4jService.run(cypher, { id });

      if (result.records.length === 0) {
        this.logger.debug(`Approval request ${id} not found`);
        return null;
      }

      const record = result.records[0];
      const approvalNode = (record as any).a?.properties;
      const responseNode = (record as any).r?.properties;

      if (!approvalNode) {
        return null;
      }

      const approval = this.mapNodeToApprovalData(approvalNode, responseNode);
      this.logger.debug(`Retrieved approval request ${id}`);

      return approval;
    } catch (error) {
      this.logger.error(`Failed to get approval request ${id}`, error);
      throw new HitlStorageError(
        'Failed to get approval request',
        'getApprovalRequest',
        { id, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get all pending approval requests (not expired)
   */
  async getPendingApprovals(): Promise<readonly ApprovalStorageData[]> {
    try {
      const cypher = `
        MATCH (a:ApprovalRequest)
        WHERE a.status IN ['pending', 'in_progress']
        AND (a.expiresAt IS NULL OR datetime() < a.expiresAt)
        OPTIONAL MATCH (a)-[:HAS_RESPONSE]->(r:ApprovalResponse)
        RETURN a, r
        ORDER BY a.requestedAt ASC
      `;

      const result = await this.neo4jService.run(cypher);

      const approvals = result.records.map((record) => {
        const approvalNode = (record as any).a?.properties;
        const responseNode = (record as any).r?.properties;
        return this.mapNodeToApprovalData(approvalNode, responseNode);
      });

      this.logger.debug(`Found ${approvals.length} pending approval requests`);
      return approvals;
    } catch (error) {
      this.logger.error('Failed to get pending approvals', error);
      throw new HitlStorageError(
        'Failed to get pending approvals',
        'getPendingApprovals',
        { error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get approval requests for a specific execution
   */
  async getApprovalsByExecution(
    executionId: string
  ): Promise<readonly ApprovalStorageData[]> {
    if (!executionId?.trim()) {
      throw new InvalidApprovalDataError('Execution ID is required');
    }

    try {
      const cypher = `
        MATCH (a:ApprovalRequest {executionId: $executionId})
        OPTIONAL MATCH (a)-[:HAS_RESPONSE]->(r:ApprovalResponse)
        RETURN a, r
        ORDER BY a.requestedAt ASC
      `;

      const result = await this.neo4jService.run(cypher, { executionId });

      const approvals = result.records.map((record) => {
        const approvalNode = (record as any).a?.properties;
        const responseNode = (record as any).r?.properties;
        return this.mapNodeToApprovalData(approvalNode, responseNode);
      });

      this.logger.debug(
        `Found ${approvals.length} approval requests for execution ${executionId}`
      );
      return approvals;
    } catch (error) {
      this.logger.error(
        `Failed to get approvals for execution ${executionId}`,
        error
      );
      throw new HitlStorageError(
        'Failed to get approvals by execution',
        'getApprovalsByExecution',
        { executionId, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Update approval request status and response
   */
  async updateApprovalStatus(
    id: string,
    status: ApprovalStorageStatus,
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
        const cypher = `
          MATCH (a:ApprovalRequest {id: $id})
          SET a.status = $status,
              a.updatedAt = datetime()
          CREATE (r:ApprovalResponse {
            decision: $decision,
            approvedBy: $approvedBy,
            message: $message,
            timestamp: datetime($timestamp),
            metadata: $metadata,
            createdAt: datetime()
          })
          CREATE (a)-[:HAS_RESPONSE]->(r)
          RETURN a.id as id
        `;

        await this.neo4jService.run(cypher, {
          id,
          status,
          decision: response.decision,
          approvedBy: response.approvedBy,
          message: response.message || null,
          timestamp: response.timestamp.toISOString(),
          metadata: response.metadata || null,
        });
      } else {
        // Update approval only
        const cypher = `
          MATCH (a:ApprovalRequest {id: $id})
          SET a.status = $status,
              a.updatedAt = datetime()
          RETURN a.id as id
        `;

        await this.neo4jService.run(cypher, { id, status });
      }

      this.logger.debug(`Updated approval request ${id} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update approval status for ${id}`, error);
      throw new HitlStorageError(
        'Failed to update approval status',
        'updateApprovalStatus',
        { id, status, response, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Delete approval request by ID
   */
  async deleteApprovalRequest(id: string): Promise<boolean> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }

    try {
      const cypher = `
        MATCH (a:ApprovalRequest {id: $id})
        OPTIONAL MATCH (a)-[:HAS_RESPONSE]->(r:ApprovalResponse)
        DELETE r, a
        RETURN count(a) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, { id });
      const firstRecord = result.records[0];
      const deletedCount = Number((firstRecord as any)?.deletedCount) || 0;

      const wasDeleted = deletedCount > 0;
      if (wasDeleted) {
        this.logger.debug(`Deleted approval request ${id}`);
      } else {
        this.logger.debug(`Approval request ${id} not found for deletion`);
      }

      return wasDeleted;
    } catch (error) {
      this.logger.error(`Failed to delete approval request ${id}`, error);
      throw new HitlStorageError(
        'Failed to delete approval request',
        'deleteApprovalRequest',
        { id, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Delete expired approval requests
   */
  async deleteExpiredApprovals(before: Date): Promise<number> {
    try {
      const cypher = `
        MATCH (a:ApprovalRequest)
        WHERE a.expiresAt IS NOT NULL
        AND a.expiresAt < datetime($before)
        OPTIONAL MATCH (a)-[:HAS_RESPONSE]->(r:ApprovalResponse)
        DELETE r, a
        RETURN count(a) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, {
        before: before.toISOString(),
      });

      const firstRecord = result.records[0];
      const deletedCount = Number((firstRecord as any)?.deletedCount) || 0;

      this.logger.debug(`Deleted ${deletedCount} expired approval requests`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete expired approvals', error);
      throw new HitlStorageError(
        'Failed to delete expired approvals',
        'deleteExpiredApprovals',
        { before, error: this.serializeError(error) }
      );
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<HitlStorageStats> {
    try {
      // Get basic counts by status
      const statusCypher = `
        MATCH (a:ApprovalRequest)
        RETURN a.status as status, count(*) as count
      `;

      // Get response time statistics
      const timingCypher = `
        MATCH (a:ApprovalRequest)-[:HAS_RESPONSE]->(r:ApprovalResponse)
        WHERE r.timestamp IS NOT NULL AND a.requestedAt IS NOT NULL
        WITH duration.between(a.requestedAt, r.timestamp).milliseconds as responseTime
        RETURN
          avg(responseTime) as averageResponseTime,
          count(*) as responseCount
      `;

      // Get timeout and approval rates
      const rateCypher = `
        MATCH (a:ApprovalRequest)
        WITH 
          count(*) as total,
          count(CASE WHEN a.status = 'timeout' THEN 1 END) as timeouts,
          count(CASE WHEN a.status = 'approved' THEN 1 END) as approved
        RETURN 
          total,
          timeouts,
          approved,
          CASE WHEN total > 0 THEN toFloat(timeouts) / total ELSE 0.0 END as timeoutRate,
          CASE WHEN total > 0 THEN toFloat(approved) / total ELSE 0.0 END as approvalRate
      `;

      const [statusResult, timingResult, rateResult] = await Promise.all([
        this.neo4jService.run(statusCypher),
        this.neo4jService.run(timingCypher),
        this.neo4jService.run(rateCypher),
      ]);

      // Process status counts
      const requestsByStatus: Record<ApprovalStorageStatus, number> = {
        pending: 0,
        in_progress: 0,
        approved: 0,
        rejected: 0,
        escalated: 0,
        timeout: 0,
        cancelled: 0,
      };

      statusResult.records.forEach((record) => {
        const status = (record as any).status as ApprovalStorageStatus;
        const count = Number((record as any).count) || 0;
        if (status in requestsByStatus) {
          requestsByStatus[status] = count;
        }
      });

      // Process timing data
      const timingRecord = timingResult.records[0];
      const averageResponseTime =
        Number((timingRecord as any)?.averageResponseTime) || 0;

      // Process rate data
      const rateRecord = rateResult.records[0];
      const totalRequests = Number((rateRecord as any)?.total) || 0;
      const timeoutRate = Number((rateRecord as any)?.timeoutRate) || 0;
      const approvalRate = Number((rateRecord as any)?.approvalRate) || 0;

      return {
        totalRequests,
        requestsByStatus,
        averageResponseTime,
        timeoutRate,
        approvalRate,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get storage statistics', error);
      throw new HitlStorageError(
        'Failed to get storage statistics',
        'getStorageStats',
        { error: this.serializeError(error) }
      );
    }
  }

  // Private helper methods

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
      metadata: approvalNode.metadata,
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

  private datetime(isoString: string): any {
    // Neo4j datetime function equivalent
    return { __isDateTime__: true, value: isoString };
  }
}
