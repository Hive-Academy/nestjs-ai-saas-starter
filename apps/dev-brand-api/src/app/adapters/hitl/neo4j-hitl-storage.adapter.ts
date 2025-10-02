import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly approvalRequestRepo: ApprovalRequestRepository) {
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
}
