import { Inject, Injectable, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@hive-academy/nestjs-neo4j';
import { IApprovalStateStorageService } from '@hive-academy/langgraph-hitl';
import type {
  ApprovalStateData,
  ApprovalChainData,
  ListApprovalOptions,
} from '@hive-academy/langgraph-hitl';
import { ApprovalStateRepository } from '../../repositories/neo4j/approval-state.repository';
import { ApprovalState } from '../../entities/neo4j/approval-state.entity';

/**
 * Neo4j adapter for HITL approval state storage
 *
 * **Purpose**: Implement IApprovalStateStorageService using Neo4j
 * **Pattern**: Adapter pattern with thin delegation to repository
 *
 * This adapter delegates all database operations to ApprovalStateRepository,
 * providing a clean separation of concerns and type-safe database operations.
 *
 * All methods are simple 1-5 line delegations to the repository layer.
 *
 * **Integration**:
 * ```typescript
 * HitlModule.forRoot({
 *   adapters: {
 *     approvalStateStorage: Neo4jApprovalStateStorageAdapter
 *   }
 * })
 * ```
 *
 * Verification:
 * - Pattern: libs/langgraph-modules/adapters/src/lib/adapters/hitl/neo4j-hitl-storage.adapter.ts
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 */
@Injectable()
export class Neo4jApprovalStateStorageAdapter
  implements IApprovalStateStorageService
{
  private readonly logger = new Logger(Neo4jApprovalStateStorageAdapter.name);

  constructor(
    @Inject(getRepositoryToken(ApprovalState))
    private readonly approvalStateRepo: ApprovalStateRepository
  ) {
    this.logger.debug(
      'Neo4jApprovalStateStorageAdapter initialized with ApprovalStateRepository'
    );
  }

  /**
   * Save approval state - delegates to repository
   */
  async saveApprovalState(data: ApprovalStateData): Promise<void> {
    this.validateApprovalStateData(data);
    return this.approvalStateRepo.saveApprovalState(data);
  }

  /**
   * Load approval state by ID - delegates to repository
   */
  async loadApprovalState(id: string): Promise<ApprovalStateData | null> {
    if (!id?.trim()) {
      throw new Error('Approval state ID is required');
    }
    return this.approvalStateRepo.loadApprovalState(id);
  }

  /**
   * List approval states by thread ID - delegates to repository
   */
  async listApprovalsByThread(
    threadId: string,
    options?: ListApprovalOptions
  ): Promise<ApprovalStateData[]> {
    if (!threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    return this.approvalStateRepo.listApprovalsByThread(threadId, options);
  }

  /**
   * Update approval status - delegates to repository
   */
  async updateApprovalStatus(
    id: string,
    status: string,
    respondedBy: string,
    respondedAt?: Date
  ): Promise<void> {
    if (!id?.trim()) {
      throw new Error('Approval state ID is required');
    }
    if (!status?.trim()) {
      throw new Error('Status is required');
    }
    if (!respondedBy?.trim()) {
      throw new Error('Responded by is required');
    }
    return this.approvalStateRepo.updateApprovalStatus(
      id,
      status,
      respondedBy,
      respondedAt
    );
  }

  /**
   * Save approval chain - delegates to repository
   */
  async saveApprovalChain(data: ApprovalChainData): Promise<void> {
    this.validateApprovalChainData(data);
    return this.approvalStateRepo.saveApprovalChain(data);
  }

  /**
   * Load approval chain - delegates to repository
   */
  async loadApprovalChain(
    chainId: string,
    executionId: string
  ): Promise<ApprovalChainData | null> {
    if (!chainId?.trim()) {
      throw new Error('Chain ID is required');
    }
    if (!executionId?.trim()) {
      throw new Error('Execution ID is required');
    }
    return this.approvalStateRepo.loadApprovalChain(chainId, executionId);
  }

  /**
   * Cleanup old approvals - delegates to repository
   */
  async cleanupOldApprovals(maxAgeMs: number): Promise<number> {
    if (maxAgeMs <= 0) {
      throw new Error('Max age must be positive');
    }
    return this.approvalStateRepo.cleanupOldApprovals(maxAgeMs);
  }

  /**
   * Ensure indexes - delegates to repository
   */
  async ensureIndexes(): Promise<void> {
    return this.approvalStateRepo.ensureIndexes();
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  private validateApprovalStateData(data: ApprovalStateData): void {
    if (!data.id?.trim()) {
      throw new Error('Approval state ID is required');
    }
    if (!data.threadId?.trim()) {
      throw new Error('Thread ID is required');
    }
    if (!data.nodeId?.trim()) {
      throw new Error('Node ID is required');
    }
    if (!data.status) {
      throw new Error('Status is required');
    }
    if (!data.requestedAt) {
      throw new Error('Requested at timestamp is required');
    }
  }

  private validateApprovalChainData(data: ApprovalChainData): void {
    if (!data.chainId?.trim()) {
      throw new Error('Chain ID is required');
    }
    if (!data.executionId?.trim()) {
      throw new Error('Execution ID is required');
    }
    if (typeof data.level !== 'number' || data.level < 0) {
      throw new Error('Valid level is required');
    }
    if (!Array.isArray(data.approvers)) {
      throw new Error('Approvers array is required');
    }
    if (!data.requestId?.trim()) {
      throw new Error('Request ID is required');
    }
    if (!data.nodeId?.trim()) {
      throw new Error('Node ID is required');
    }
    if (!data.timestamp) {
      throw new Error('Timestamp is required');
    }
  }
}
