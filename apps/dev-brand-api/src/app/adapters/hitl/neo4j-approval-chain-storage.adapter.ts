import { Injectable, Logger } from '@nestjs/common';
import { IApprovalChainStorageService } from '@hive-academy/langgraph-hitl';
import type {
  ApprovalLevel,
  ApprovalRequest,
} from '@hive-academy/langgraph-hitl';

// Define local interfaces for type mapping
interface Approver {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

import { ApprovalChainRepository } from '../../repositories/approval-chain.repository';

/**
 * Clean Neo4j adapter for approval chain storage.
 *
 * This adapter delegates all database operations to ApprovalChainRepository,
 * providing a clean separation of concerns and type-safe database operations.
 */
@Injectable()
export class Neo4jApprovalChainStorageAdapter
  implements IApprovalChainStorageService
{
  private readonly logger = new Logger(Neo4jApprovalChainStorageAdapter.name);

  constructor(private readonly approvalChainRepo: ApprovalChainRepository) {
    this.logger.debug(
      'Neo4jApprovalChainStorageAdapter initialized with ApprovalChainRepository'
    );
  }

  /**
   * Convert repository level to HITL ApprovalLevel format
   */
  private mapFromRepositoryLevel(repoLevel: ApprovalLevel): ApprovalLevel {
    return {
      id: repoLevel.id,
      name: repoLevel.name,
      priority: repoLevel.priority,
      policy: repoLevel.policy,
      approvers: repoLevel.approvers.map((approver): Approver => {
        if (typeof approver === 'string') {
          return {
            id: approver,
            name: approver,
            role: 'approver',
          };
        }
        return approver as Approver;
      }),
      conditions: repoLevel.conditions,
      timeoutMs: repoLevel.timeoutMs,
      autoApproveOnTimeout: repoLevel.autoApproveOnTimeout,
    };
  }

  // Chain Management

  /**
   * Store an approval chain configuration - delegates to repository
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
    // Repository now accepts HITL types directly (no conversion needed)
    return this.approvalChainRepo.storeApprovalChain(chainId, levels);
  }

  /**
   * Retrieve an approval chain configuration - delegates to repository
   */
  async getApprovalChain(chainId: string): Promise<ApprovalLevel[] | null> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }
    const repoLevels = await this.approvalChainRepo.getApprovalChain(chainId);
    if (!repoLevels) return null;
    // Convert repository types to HITL types
    return repoLevels.map((level) => this.mapFromRepositoryLevel(level));
  }

  /**
   * Get all approval chains - delegates to repository
   */
  async getAllApprovalChains(): Promise<Record<string, ApprovalLevel[]>> {
    const repoChains = await this.approvalChainRepo.getAllApprovalChains();
    const result: Record<string, ApprovalLevel[]> = {};
    for (const [chainId, levels] of Object.entries(repoChains)) {
      result[chainId] = levels.map((level) =>
        this.mapFromRepositoryLevel(level)
      );
    }
    return result;
  }

  /**
   * Delete an approval chain - delegates to repository
   */
  async deleteApprovalChain(chainId: string): Promise<boolean> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }
    return this.approvalChainRepo.deleteApprovalChain(chainId);
  }

  // Request Management

  /**
   * Store an approval request - delegates to repository
   */
  async storeApprovalRequest(request: ApprovalRequest): Promise<void> {
    if (!request?.id?.trim()) {
      throw new Error('Request ID is required');
    }
    return this.approvalChainRepo.storeApprovalRequest(request);
  }

  /**
   * Get approval request by ID - delegates to repository
   */
  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required');
    }
    // Note: Repository may not have this method, using getAllActiveRequests for now
    const activeRequests = await this.approvalChainRepo.getAllActiveRequests();
    const repoRequest = activeRequests.find((req) => req.id === requestId);
    if (!repoRequest) return null;
    // Convert repository type to HITL type
    return {
      id: repoRequest.id,
      executionId: repoRequest.executionId || '',
      chainId: repoRequest.chainId || '',
      currentLevel: 0, // Default level
      chain: [], // Default empty chain
      context: repoRequest.metadata || {},
      history: [], // Default empty history
      status:
        (repoRequest.status as
          | 'pending'
          | 'approved'
          | 'rejected'
          | 'escalated'
          | 'timeout') || 'pending',
      createdAt: repoRequest.requestedAt || new Date(),
      updatedAt: new Date(), // Default since repository doesn't track updatedAt
    };
  }

  /**
   * Get approval requests by execution ID - delegates to repository
   */
  async getApprovalRequestsByExecution(
    executionId: string
  ): Promise<ApprovalRequest[]> {
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }
    const repoRequests =
      await this.approvalChainRepo.getApprovalRequestsByExecution(executionId);
    return repoRequests.map((req) => ({
      id: req.id,
      executionId: req.executionId || '',
      chainId: req.chainId || '',
      currentLevel: 0, // Default level
      chain: [], // Default empty chain
      context: req.metadata || {},
      history: [], // Default empty history
      status:
        (req.status as
          | 'pending'
          | 'approved'
          | 'rejected'
          | 'escalated'
          | 'timeout') || 'pending',
      createdAt: req.requestedAt || new Date(),
      updatedAt: new Date(), // Default since repository doesn't track updatedAt
    }));
  }

  /**
   * Update approval request status - delegates to repository
   */
  async updateApprovalRequestStatus(
    requestId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required');
    }
    if (!status?.trim()) {
      throw new Error('Status is required');
    }
    return this.approvalChainRepo.updateApprovalRequestStatus(
      requestId,
      status,
      metadata
    );
  }

  /**
   * Update approval request - delegates to repository
   */
  async updateApprovalRequest(request: ApprovalRequest): Promise<void> {
    if (!request?.id?.trim()) {
      throw new Error('Request ID is required');
    }
    // Convert HITL ApprovalRequest to repository entity type
    const entityData = {
      id: request.id,
      executionId: request.executionId,
      nodeId: '', // Default empty node ID
      message: (request.context?.message as string) || '', // Extract message from context
      metadata: request.context || {}, // Use context as metadata
      status: request.status,
      requestedAt: request.createdAt, // HITL uses createdAt instead of requestedAt
      chainId: request.chainId,
      approvers: [], // Default empty approvers
      confidence: 0.5, // Default confidence
      riskLevel: 'medium' as const, // Default risk level
      updatedAt: request.updatedAt,
    };
    return this.approvalChainRepo.storeApprovalRequest(entityData);
  }

  /**
   * Delete approval request - delegates to repository
   */
  async deleteApprovalRequest(requestId: string): Promise<boolean> {
    if (!requestId?.trim()) {
      throw new Error('Request ID is required');
    }
    // Note: Repository may not have this method, return false for now
    this.logger.warn(
      `deleteApprovalRequest not implemented in repository: ${requestId}`
    );
    return false;
  }

  /**
   * Get all active requests - delegates to repository
   */
  async getAllActiveRequests(): Promise<ApprovalRequest[]> {
    const repoRequests = await this.approvalChainRepo.getAllActiveRequests();
    return repoRequests.map((req) => ({
      id: req.id,
      executionId: req.executionId || '',
      chainId: req.chainId || '',
      currentLevel: 0, // Default level
      chain: [], // Default empty chain
      context: req.metadata || {},
      history: [], // Default empty history
      status:
        (req.status as
          | 'pending'
          | 'approved'
          | 'rejected'
          | 'escalated'
          | 'timeout') || 'pending',
      createdAt: req.requestedAt || new Date(),
      updatedAt: new Date(), // Default since repository doesn't track updatedAt
    }));
  }

  /**
   * Get pending approvals for approver - delegates to repository
   */
  async getPendingApprovalsForApprover(
    approverId: string
  ): Promise<ApprovalRequest[]> {
    if (!approverId?.trim()) {
      throw new Error('Approver ID is required');
    }
    const repoRequests =
      await this.approvalChainRepo.getPendingApprovalsForApprover(approverId);
    return repoRequests.map((req) => ({
      id: req.id,
      executionId: req.executionId || '',
      chainId: req.chainId || '',
      currentLevel: 0, // Default level
      chain: [], // Default empty chain
      context: req.metadata || {},
      history: [], // Default empty history
      status:
        (req.status as
          | 'pending'
          | 'approved'
          | 'rejected'
          | 'escalated'
          | 'timeout') || 'pending',
      createdAt: req.requestedAt || new Date(),
      updatedAt: new Date(), // Default since repository doesn't track updatedAt
    }));
  }

  /**
   * Cleanup old data - delegates to repository
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    return this.approvalChainRepo.cleanup(maxAge);
  }

  /**
   * Health check - delegates to repository
   */
  async healthCheck(): Promise<boolean> {
    return this.approvalChainRepo.healthCheck();
  }
}
