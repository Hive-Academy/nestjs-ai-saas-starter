import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import { HumanApprovalRequest } from './approval-workflow.types';
import { HITL_DEFAULTS } from '../constants';
import {
  IApprovalStateStorageService,
  ApprovalStateData,
} from '../interfaces/approval-state-storage.interface';

/**
 * Service for handling HITL approval state persistence - REFACTORED Phase 6
 *
 * **Phase 6 Migration** (Adapter Pattern):
 * - Migrated from direct repository injection to adapter interface
 * - Uses IApprovalStateStorageService for storage abstraction
 * - Enables swapping storage backends without service changes
 * - Follows same pattern as other HITL storage services
 *
 * **Phase 5 Migration** (TASK_2025_032):
 * - Migrated from checkpoint-based storage to Neo4j repository pattern
 * - Approval state is operational data, NOT workflow state
 * - Neo4j provides queryable approval history with relationships
 * - LangGraph still handles workflow checkpoints automatically
 *
 * **Why Adapter Pattern**:
 * - Consistent with other HITL storage (IHitlStorageService, etc.)
 * - Enables testing with mock adapters
 * - Allows swapping Neo4j for PostgreSQL/MongoDB/etc.
 * - Clean separation: Service → Adapter → Repository → Database
 *
 * **Integration**: Uses IApprovalStateStorageService adapter interface
 *
 * Verification:
 * - Pattern: libs/langgraph-modules/hitl/src/lib/services/*.service.ts
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 */
@Injectable()
export class HitlCheckpointService {
  private readonly logger = new Logger(HitlCheckpointService.name);

  constructor(
    @Optional()
    @Inject('IApprovalStateStorageService')
    private readonly approvalStateStorage?: IApprovalStateStorageService
  ) {
    if (!this.approvalStateStorage) {
      this.logger.warn(
        '⚠️ No approval state storage adapter configured. Approval state persistence will be disabled.'
      );
    } else {
      this.logger.log(
        '💾 HITL Checkpoint Service initialized with approval state storage'
      );
    }
  }

  /**
   * Save approval workflow state to storage
   */
  async saveApprovalState(
    request: HumanApprovalRequest,
    source: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    if (!this.approvalStateStorage) {
      this.logger.debug('No approval state storage configured - skipping save');
      return;
    }

    try {
      const threadId = this.generateApprovalThreadId(
        request.executionId,
        request.nodeId
      );

      const approvalState: ApprovalStateData = {
        id: request.id,
        threadId,
        nodeId: request.nodeId,
        status: this.mapWorkflowStateToStatus(request.workflowState),
        metadata: {
          executionId: request.executionId,
          source,
          workflowState: request.workflowState,
          confidence: request.confidence.current,
          riskLevel: request.riskAssessment?.level,
          additionalData,
        },
        requestedAt: request.timestamps.requested,
      };

      await this.approvalStateStorage.saveApprovalState(approvalState);

      this.logger.debug(
        `Saved approval state for request ${request.id} at ${source}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to save approval state for request ${request.id}: ${errorMsg}`
      );
      // Don't throw - gracefully continue approval workflow
    }
  }

  /**
   * Map approval workflow state to storage status
   */
  private mapWorkflowStateToStatus(
    workflowState: string
  ): 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout' {
    switch (workflowState.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'escalated':
        return 'escalated';
      case 'timeout':
        return 'timeout';
      default:
        return 'pending';
    }
  }

  /**
   * Resume approval workflow from storage state
   */
  async resumeApprovalWorkflow(
    executionId: string,
    nodeId: string,
    approvalId?: string
  ): Promise<HumanApprovalRequest | null> {
    if (!this.approvalStateStorage) {
      this.logger.debug('No approval state storage configured - cannot resume');
      return null;
    }

    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);

      // Load approval state from storage
      let approvalState: ApprovalStateData | null;

      if (approvalId) {
        approvalState = await this.approvalStateStorage.loadApprovalState(
          approvalId
        );
      } else {
        // Load most recent approval for this thread
        const approvals = await this.approvalStateStorage.listApprovalsByThread(
          threadId,
          {
            limit: 1,
          }
        );
        approvalState = approvals[0] || null;
      }

      if (!approvalState) {
        this.logger.warn(
          `No approval state found for: ${executionId}/${nodeId}`
        );
        return null;
      }

      // Reconstruct HumanApprovalRequest from stored state
      // Note: This is a minimal reconstruction - full request may need to be rebuilt
      const restoredRequest: Partial<HumanApprovalRequest> = {
        id: approvalState.id,
        executionId:
          (approvalState.metadata as any)?.executionId || executionId,
        nodeId: approvalState.nodeId,
        workflowState:
          (approvalState.metadata as any)?.workflowState ||
          approvalState.status,
        timestamps: {
          requested: approvalState.requestedAt,
          responded: approvalState.respondedAt,
        } as any,
      };

      this.logger.log(
        `Resumed approval workflow for request ${restoredRequest.id} from storage`
      );

      return restoredRequest as HumanApprovalRequest;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resume approval workflow for ${executionId}/${nodeId}: ${errorMsg}`
      );
      return null;
    }
  }

  /**
   * Save approval chain progression to storage
   */
  async saveChainProgress(
    request: HumanApprovalRequest,
    chainLevel: number,
    approvers: string[],
    chainStatus: string
  ): Promise<void> {
    if (!this.approvalStateStorage) {
      this.logger.debug(
        'No approval state storage configured - skipping chain save'
      );
      return;
    }

    if (!request.chainId) {
      return; // No chain ID - nothing to save
    }

    try {
      await this.approvalStateStorage.saveApprovalChain({
        chainId: request.chainId,
        executionId: request.executionId,
        level: chainLevel,
        approvers,
        status: chainStatus,
        requestId: request.id,
        nodeId: request.nodeId,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Saved chain progress for chain ${request.chainId} level ${chainLevel}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to save chain progress for chain ${request.chainId}: ${errorMsg}`
      );
      // Don't throw - gracefully continue chain processing
    }
  }

  /**
   * Resume approval chain from storage state
   */
  async resumeApprovalChain(
    chainId: string,
    executionId: string
  ): Promise<{
    level: number;
    approvers: string[];
    status: string;
  } | null> {
    if (!this.approvalStateStorage) {
      this.logger.debug(
        'No approval state storage configured - cannot resume chain'
      );
      return null;
    }

    try {
      const chainData = await this.approvalStateStorage.loadApprovalChain(
        chainId,
        executionId
      );

      if (!chainData) {
        this.logger.warn(
          `No chain state found for chain: ${chainId}/${executionId}`
        );
        return null;
      }

      this.logger.log(
        `Resumed approval chain ${chainId} at level ${chainData.level} with status ${chainData.status}`
      );

      return {
        level: chainData.level,
        approvers: chainData.approvers,
        status: chainData.status,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resume approval chain ${chainId}/${executionId}: ${errorMsg}`
      );
      return null;
    }
  }

  /**
   * Generate canonical thread ID for approval workflow
   */
  generateApprovalThreadId(executionId: string, nodeId: string): string {
    return NodeIdBuilder.create()
      .domain('hitl')
      .phase('approval')
      .activity('workflow')
      .detail(`${executionId}-${nodeId}`)
      .build();
  }

  /**
   * Generate canonical thread ID for approval chain
   */
  generateChainThreadId(chainId: string, executionId: string): string {
    return NodeIdBuilder.create()
      .domain('hitl')
      .phase('approval')
      .activity('chain')
      .detail(`${chainId}-${executionId}`)
      .build();
  }

  /**
   * Get all approval states for execution from storage
   */
  async getApprovalCheckpoints(
    executionId: string,
    nodeId: string,
    limit?: number
  ): Promise<ApprovalStateData[]> {
    if (!this.approvalStateStorage) {
      this.logger.debug(
        'No approval state storage configured - cannot get checkpoints'
      );
      return [];
    }

    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);
      return await this.approvalStateStorage.listApprovalsByThread(threadId, {
        limit: limit || 10,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get approval states for ${executionId}/${nodeId}: ${errorMsg}`
      );
      return [];
    }
  }

  /**
   * Cleanup old approval states from storage
   */
  async cleanupApprovalCheckpoints(maxAge?: number): Promise<number> {
    if (!this.approvalStateStorage) {
      this.logger.debug(
        'No approval state storage configured - cannot cleanup'
      );
      return 0;
    }

    try {
      return await this.approvalStateStorage.cleanupOldApprovals(
        maxAge || HITL_DEFAULTS.FEEDBACK_RETENTION_MS
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup approval states: ${errorMsg}`);
      return 0;
    }
  }
}
