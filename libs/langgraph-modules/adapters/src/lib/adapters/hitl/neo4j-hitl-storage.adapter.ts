import { Inject, Injectable, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@hive-academy/nestjs-neo4j';
import {
  IHitlStorageService,
  InvalidApprovalDataError,
} from '@hive-academy/langgraph-hitl';
import type {
  ApprovalStorageData,
  ApprovalStorageStatus,
  ApprovalStorageResponse,
  HitlStorageStats,
} from '@hive-academy/langgraph-hitl';
import { ApprovalRequestRepository } from '../../repositories/neo4j/approval-request.repository';
import { ApprovalRequest } from '../../entities/neo4j/approval-request.entity';

/**
 * Clean Neo4j adapter for HITL approval storage.
 *
 * This adapter delegates all database operations to ApprovalRequestRepository,
 * providing a clean separation of concerns and type-safe database operations.
 *
 * All methods are simple 1-5 line delegations to the repository layer.
 */
@Injectable()
export class Neo4jHitlStorageAdapter extends IHitlStorageService {
  private readonly logger = new Logger(Neo4jHitlStorageAdapter.name);

  constructor(
    @Inject(getRepositoryToken(ApprovalRequest))
    private readonly approvalRequestRepo: ApprovalRequestRepository
  ) {
    super();
    this.logger.debug(
      'Neo4jHitlStorageAdapter initialized with ApprovalRequestRepository'
    );
  }

  /**
   * Store an approval request - delegates to repository
   */
  async storeApprovalRequest(request: ApprovalStorageData): Promise<string> {
    this.validateApprovalData(request);
    return this.approvalRequestRepo.storeApprovalRequest(request);
  }

  /**
   * Get approval request by ID - delegates to repository
   */
  async getApprovalRequest(id: string): Promise<ApprovalStorageData | null> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }
    return this.approvalRequestRepo.getApprovalRequest(id);
  }

  /**
   * Get all pending approval requests - delegates to repository
   */
  async getPendingApprovals(): Promise<readonly ApprovalStorageData[]> {
    return this.approvalRequestRepo.getPendingApprovals();
  }

  /**
   * Get approval requests for a specific execution - delegates to repository
   */
  async getApprovalsByExecution(
    executionId: string
  ): Promise<readonly ApprovalStorageData[]> {
    if (!executionId?.trim()) {
      throw new InvalidApprovalDataError('Execution ID is required');
    }
    return this.approvalRequestRepo.getApprovalsByExecution(executionId);
  }

  /**
   * Update approval request status and response - delegates to repository
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
    await this.approvalRequestRepo.updateApprovalStatus(id, status, response);
  }

  /**
   * Delete approval request by ID - delegates to repository
   */
  async deleteApprovalRequest(id: string): Promise<boolean> {
    if (!id?.trim()) {
      throw new InvalidApprovalDataError('Approval request ID is required');
    }
    return this.approvalRequestRepo.deleteApprovalRequest(id);
  }

  /**
   * Delete expired approval requests - delegates to repository
   */
  async deleteExpiredApprovals(before: Date): Promise<number> {
    return this.approvalRequestRepo.deleteExpiredApprovals(before);
  }

  /**
   * Get storage statistics - delegates to repository
   */
  async getStorageStats(): Promise<HitlStorageStats> {
    return this.approvalRequestRepo.getStorageStats();
  }

  // ============================================================================
  // ALIAS METHODS (required by IHitlStorageService interface)
  // ============================================================================

  /**
   * Save approval request (alias for storeApprovalRequest)
   */
  async save(request: any): Promise<void> {
    await this.storeApprovalRequest(request);
  }

  /**
   * Get approval request (alias for getApprovalRequest)
   */
  async get(id: string): Promise<any> {
    return this.getApprovalRequest(id);
  }

  /**
   * Get all pending approvals (alias for getPendingApprovals)
   */
  async getAllPending(): Promise<any[]> {
    return this.getPendingApprovals() as Promise<any[]>;
  }

  /**
   * Get approvals by execution ID (alias for getApprovalsByExecution)
   */
  async getByExecutionId(executionId: string): Promise<any[]> {
    return this.getApprovalsByExecution(executionId) as Promise<any[]>;
  }

  /**
   * Update approval request (alias for updateApprovalStatus)
   */
  async update(request: any): Promise<void> {
    if (request.id && request.status) {
      await this.updateApprovalStatus(
        request.id,
        request.status,
        request.response
      );
    }
  }

  /**
   * Backup all approval data
   */
  async backup(): Promise<{ backupId: string; count: number }> {
    const allApprovals = await this.getPendingApprovals();
    const backupId = `backup_${Date.now()}`;
    // TODO: Implement actual backup logic
    return { backupId, count: allApprovals.length };
  }

  /**
   * Restore approval data from backup
   */
  async restore(
    backupId: string
  ): Promise<{ restored: number; failed: number }> {
    // TODO: Implement actual restore logic
    return { restored: 0, failed: 0 };
  }
}
