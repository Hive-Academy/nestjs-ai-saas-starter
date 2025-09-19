import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  IApprovalChainStorageService,
  ApprovalLevel,
  ApprovalRequest,
} from '@hive-academy/langgraph-hitl';

/**
 * Neo4j implementation of approval chain storage service
 * Provides persistent storage for approval chains and requests using Neo4j graph database
 */
@Injectable()
export class Neo4jApprovalChainStorageAdapter implements IApprovalChainStorageService {
  private readonly logger = new Logger(Neo4jApprovalChainStorageAdapter.name);

  constructor(private readonly neo4jService: Neo4jService) {
    this.logger.debug('Neo4jApprovalChainStorageAdapter initialized with Neo4jService');
  }

  // Chain Management

  /**
   * Store an approval chain configuration
   */
  async storeApprovalChain(chainId: string, levels: ApprovalLevel[]): Promise<void> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }
    if (!levels || levels.length === 0) {
      throw new Error('Approval levels are required');
    }

    try {
      // First delete existing chain if it exists
      await this.deleteApprovalChain(chainId);

      // Create the chain node and level nodes with relationships
      const cypher = `
        CREATE (chain:ApprovalChain {
          id: $chainId,
          levelCount: $levelCount,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        WITH chain
        UNWIND $levels as levelData
        CREATE (level:ApprovalLevel {
          id: levelData.id,
          name: levelData.name,
          priority: levelData.priority,
          policy: levelData.policy,
          approvers: levelData.approvers,
          conditions: levelData.conditions,
          timeoutMs: levelData.timeoutMs,
          autoApproveOnTimeout: levelData.autoApproveOnTimeout,
          createdAt: datetime()
        })
        CREATE (chain)-[:HAS_LEVEL {priority: levelData.priority}]->(level)
        RETURN chain.id as chainId, count(level) as levelCount
      `;

      const result = await this.neo4jService.run(cypher, {
        chainId,
        levelCount: levels.length,
        levels: levels.map(level => ({
          id: level.id,
          name: level.name,
          priority: level.priority,
          policy: level.policy,
          approvers: JSON.stringify(level.approvers),
          conditions: level.conditions ? JSON.stringify(level.conditions) : null,
          timeoutMs: level.timeoutMs || null,
          autoApproveOnTimeout: level.autoApproveOnTimeout || false,
        })),
      });

      this.logger.debug(`Stored approval chain ${chainId} with ${levels.length} levels`);
    } catch (error) {
      this.logger.error(`Failed to store approval chain ${chainId}`, error);
      throw new Error(`Failed to store approval chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve an approval chain configuration
   */
  async getApprovalChain(chainId: string): Promise<ApprovalLevel[] | null> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }

    try {
      const cypher = `
        MATCH (chain:ApprovalChain {id: $chainId})-[:HAS_LEVEL]->(level:ApprovalLevel)
        RETURN level
        ORDER BY level.priority ASC
      `;

      const result = await this.neo4jService.run(cypher, { chainId });

      if (result.records.length === 0) {
        this.logger.debug(`Approval chain ${chainId} not found`);
        return null;
      }

      const levels = result.records.map(record => {
        const levelNode = (record as any).level.properties;
        return this.mapNodeToApprovalLevel(levelNode);
      });

      this.logger.debug(`Retrieved approval chain ${chainId} with ${levels.length} levels`);
      return levels;
    } catch (error) {
      this.logger.error(`Failed to get approval chain ${chainId}`, error);
      throw new Error(`Failed to get approval chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all approval chains
   */
  async getAllApprovalChains(): Promise<Record<string, ApprovalLevel[]>> {
    try {
      const cypher = `
        MATCH (chain:ApprovalChain)-[:HAS_LEVEL]->(level:ApprovalLevel)
        RETURN chain.id as chainId, collect(level) as levels
        ORDER BY chain.id
      `;

      const result = await this.neo4jService.run(cypher);
      const chains: Record<string, ApprovalLevel[]> = {};

      result.records.forEach(record => {
        const chainId = (record as any).chainId;
        const levelNodes = (record as any).levels;
        
        const levels = levelNodes
          .map((node: any) => this.mapNodeToApprovalLevel(node.properties))
          .sort((a: ApprovalLevel, b: ApprovalLevel) => a.priority - b.priority);
          
        chains[chainId] = levels;
      });

      this.logger.debug(`Retrieved ${Object.keys(chains).length} approval chains`);
      return chains;
    } catch (error) {
      this.logger.error('Failed to get all approval chains', error);
      throw new Error(`Failed to get all approval chains: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an approval chain
   */
  async deleteApprovalChain(chainId: string): Promise<boolean> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }

    try {
      const cypher = `
        MATCH (chain:ApprovalChain {id: $chainId})
        OPTIONAL MATCH (chain)-[:HAS_LEVEL]->(level:ApprovalLevel)
        DELETE chain, level
        RETURN count(chain) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, { chainId });
      const firstRecord = result.records[0];
      const deletedCount = Number((firstRecord as any)?.deletedCount) || 0;

      const wasDeleted = deletedCount > 0;
      if (wasDeleted) {
        this.logger.debug(`Deleted approval chain ${chainId}`);
      } else {
        this.logger.debug(`Approval chain ${chainId} not found for deletion`);
      }

      return wasDeleted;
    } catch (error) {
      this.logger.error(`Failed to delete approval chain ${chainId}`, error);
      throw new Error(`Failed to delete approval chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Request Management

  /**
   * Store an approval request
   */
  async storeApprovalRequest(request: ApprovalRequest): Promise<void> {
    if (!request?.id?.trim()) {
      throw new Error('Approval request ID is required');
    }

    try {
      const cypher = `
        CREATE (req:ApprovalChainRequest {
          id: $id,
          executionId: $executionId,
          chainId: $chainId,
          currentLevel: $currentLevel,
          chain: $chain,
          context: $context,
          history: $history,
          status: $status,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        RETURN req.id as id
      `;

      await this.neo4jService.run(cypher, {
        id: request.id,
        executionId: request.executionId,
        chainId: request.chainId,
        currentLevel: request.currentLevel,
        chain: JSON.stringify(request.chain),
        context: JSON.stringify(request.context),
        history: JSON.stringify(request.history),
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      });

      this.logger.debug(`Stored approval request ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to store approval request ${request.id}`, error);
      throw new Error(`Failed to store approval request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve an approval request by ID
   */
  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    if (!requestId?.trim()) {
      throw new Error('Approval request ID is required');
    }

    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest {id: $requestId})
        RETURN req
      `;

      const result = await this.neo4jService.run(cypher, { requestId });

      if (result.records.length === 0) {
        this.logger.debug(`Approval request ${requestId} not found`);
        return null;
      }

      const requestNode = (result.records[0] as any).req.properties;
      const request = this.mapNodeToApprovalRequest(requestNode);

      this.logger.debug(`Retrieved approval request ${requestId}`);
      return request;
    } catch (error) {
      this.logger.error(`Failed to get approval request ${requestId}`, error);
      throw new Error(`Failed to get approval request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all approval requests for a specific execution
   */
  async getApprovalRequestsByExecution(executionId: string): Promise<ApprovalRequest[]> {
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }

    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest {executionId: $executionId})
        RETURN req
        ORDER BY req.createdAt ASC
      `;

      const result = await this.neo4jService.run(cypher, { executionId });

      const requests = result.records.map(record => {
        const requestNode = (record as any).req.properties;
        return this.mapNodeToApprovalRequest(requestNode);
      });

      this.logger.debug(`Found ${requests.length} approval requests for execution ${executionId}`);
      return requests;
    } catch (error) {
      this.logger.error(`Failed to get approval requests for execution ${executionId}`, error);
      throw new Error(`Failed to get approval requests by execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update approval request status and metadata
   */
  async updateApprovalRequestStatus(
    requestId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!requestId?.trim()) {
      throw new Error('Approval request ID is required');
    }

    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest {id: $requestId})
        SET req.status = $status,
            req.updatedAt = datetime(),
            req.metadata = $metadata
        RETURN req.id as id
      `;

      await this.neo4jService.run(cypher, {
        requestId,
        status,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      this.logger.debug(`Updated approval request ${requestId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update approval request ${requestId} status`, error);
      throw new Error(`Failed to update approval request status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update approval request with complete data
   */
  async updateApprovalRequest(request: ApprovalRequest): Promise<void> {
    if (!request?.id?.trim()) {
      throw new Error('Approval request ID is required');
    }

    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest {id: $id})
        SET req.currentLevel = $currentLevel,
            req.chain = $chain,
            req.context = $context,
            req.history = $history,
            req.status = $status,
            req.updatedAt = datetime($updatedAt)
        RETURN req.id as id
      `;

      await this.neo4jService.run(cypher, {
        id: request.id,
        currentLevel: request.currentLevel,
        chain: JSON.stringify(request.chain),
        context: JSON.stringify(request.context),
        history: JSON.stringify(request.history),
        status: request.status,
        updatedAt: request.updatedAt.toISOString(),
      });

      this.logger.debug(`Updated approval request ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to update approval request ${request.id}`, error);
      throw new Error(`Failed to update approval request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an approval request
   */
  async deleteApprovalRequest(requestId: string): Promise<boolean> {
    if (!requestId?.trim()) {
      throw new Error('Approval request ID is required');
    }

    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest {id: $requestId})
        DELETE req
        RETURN count(req) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, { requestId });
      const firstRecord = result.records[0];
      const deletedCount = Number((firstRecord as any)?.deletedCount) || 0;

      const wasDeleted = deletedCount > 0;
      if (wasDeleted) {
        this.logger.debug(`Deleted approval request ${requestId}`);
      } else {
        this.logger.debug(`Approval request ${requestId} not found for deletion`);
      }

      return wasDeleted;
    } catch (error) {
      this.logger.error(`Failed to delete approval request ${requestId}`, error);
      throw new Error(`Failed to delete approval request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Recovery Operations

  /**
   * Get all active approval requests (pending, escalated)
   */
  async getAllActiveRequests(): Promise<ApprovalRequest[]> {
    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest)
        WHERE req.status IN ['pending', 'escalated']
        RETURN req
        ORDER BY req.createdAt ASC
      `;

      const result = await this.neo4jService.run(cypher);

      const requests = result.records.map(record => {
        const requestNode = (record as any).req.properties;
        return this.mapNodeToApprovalRequest(requestNode);
      });

      this.logger.debug(`Found ${requests.length} active approval requests`);
      return requests;
    } catch (error) {
      this.logger.error('Failed to get all active requests', error);
      throw new Error(`Failed to get all active requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending approvals for a specific approver
   */
  async getPendingApprovalsForApprover(approverId: string): Promise<ApprovalRequest[]> {
    if (!approverId?.trim()) {
      throw new Error('Approver ID is required');
    }

    try {
      const cypher = `
        MATCH (req:ApprovalChainRequest)
        WHERE req.status = 'pending'
        AND req.chain CONTAINS $approverId
        RETURN req
        ORDER BY req.createdAt ASC
      `;

      const result = await this.neo4jService.run(cypher, { approverId });

      const requests = result.records
        .map(record => {
          const requestNode = (record as any).req.properties;
          return this.mapNodeToApprovalRequest(requestNode);
        })
        .filter(request => {
          // Additional filtering in memory to check if approver is in current level
          const currentLevel = request.chain[request.currentLevel];
          return currentLevel?.approvers?.some(approver => approver.id === approverId);
        });

      this.logger.debug(`Found ${requests.length} pending approvals for approver ${approverId}`);
      return requests;
    } catch (error) {
      this.logger.error(`Failed to get pending approvals for approver ${approverId}`, error);
      throw new Error(`Failed to get pending approvals for approver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup old requests and chains
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const cypher = `
        MATCH (req:ApprovalChainRequest)
        WHERE req.createdAt < datetime($cutoffDate)
        AND req.status IN ['approved', 'rejected', 'timeout', 'cancelled']
        DELETE req
        RETURN count(req) as deletedCount
      `;

      const result = await this.neo4jService.run(cypher, {
        cutoffDate: cutoffDate.toISOString(),
      });

      const firstRecord = result.records[0];
      const deletedCount = Number((firstRecord as any)?.deletedCount) || 0;

      this.logger.debug(`Cleaned up ${deletedCount} old approval requests`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old requests', error);
      throw new Error(`Failed to cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for storage connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const cypher = 'RETURN 1 as result';
      const result = await this.neo4jService.run(cypher);
      const isHealthy = result.records.length > 0;
      
      this.logger.debug(`Health check result: ${isHealthy}`);
      return isHealthy;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  // Private helper methods

  private mapNodeToApprovalLevel(levelNode: any): ApprovalLevel {
    if (!levelNode) {
      throw new Error('Invalid approval level node data');
    }

    return {
      id: levelNode.id,
      name: levelNode.name,
      priority: Number(levelNode.priority),
      policy: levelNode.policy,
      approvers: levelNode.approvers ? JSON.parse(levelNode.approvers) : [],
      conditions: levelNode.conditions ? JSON.parse(levelNode.conditions) : undefined,
      timeoutMs: levelNode.timeoutMs ? Number(levelNode.timeoutMs) : undefined,
      autoApproveOnTimeout: Boolean(levelNode.autoApproveOnTimeout),
    };
  }

  private mapNodeToApprovalRequest(requestNode: any): ApprovalRequest {
    if (!requestNode) {
      throw new Error('Invalid approval request node data');
    }

    return {
      id: requestNode.id,
      executionId: requestNode.executionId,
      chainId: requestNode.chainId,
      currentLevel: Number(requestNode.currentLevel),
      chain: JSON.parse(requestNode.chain),
      context: JSON.parse(requestNode.context),
      history: JSON.parse(requestNode.history),
      status: requestNode.status,
      createdAt: new Date(requestNode.createdAt),
      updatedAt: new Date(requestNode.updatedAt),
    };
  }
}