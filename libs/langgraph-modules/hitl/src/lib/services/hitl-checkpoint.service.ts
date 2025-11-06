import { Injectable, Logger } from '@nestjs/common';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import { HumanApprovalRequest } from './approval-workflow.types';
import { HITL_DEFAULTS } from '../constants';
import {
  ApprovalStateRepository,
  ApprovalStateData,
} from '../repositories/approval-state.repository';

/**
 * Service for handling HITL approval state persistence - REFACTORED Phase 5
 *
 * **Phase 5 Migration** (TASK_2025_032):
 * - Migrated from checkpoint-based storage to Neo4j repository pattern
 * - Approval state is operational data, NOT workflow state
 * - Neo4j provides queryable approval history with relationships
 * - LangGraph still handles workflow checkpoints automatically
 *
 * **Why Neo4j Instead of Checkpoints**:
 * - Checkpoints are for workflow recovery (managed by LangGraph)
 * - Approval state needs persistence, queries, and reporting
 * - Neo4j enables approval pattern analysis and relationships
 * - Zero coupling to LangGraph's internal checkpoint format
 *
 * **Integration**: Uses ApprovalStateRepository for Neo4j operations
 *
 * Verification:
 * - Source: task-tracking/TASK_2025_032/checkpoint-package-assessment.md:729-770
 * - Pattern: Neo4j repository pattern (libs/nestjs-neo4j/CLAUDE.md)
 */
@Injectable()
export class HitlCheckpointService {
  private readonly logger = new Logger(HitlCheckpointService.name);

  constructor(private readonly approvalStateRepo: ApprovalStateRepository) {
    this.logger.log(
      '💾 HITL Checkpoint Service initialized with Neo4j storage'
    );
  }

  /**
   * Save approval workflow state to Neo4j
   */
  async saveApprovalState(
    request: HumanApprovalRequest,
    source: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
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

      await this.approvalStateRepo.saveApprovalState(approvalState);

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
   * Resume approval workflow from Neo4j state
   */
  async resumeApprovalWorkflow(
    executionId: string,
    nodeId: string,
    approvalId?: string
  ): Promise<HumanApprovalRequest | null> {
    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);

      // Load approval state from Neo4j
      let approvalState: ApprovalStateData | null;

      if (approvalId) {
        approvalState = await this.approvalStateRepo.loadApprovalState(
          approvalId
        );
      } else {
        // Load most recent approval for this thread
        const approvals = await this.approvalStateRepo.listApprovalsByThread(
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
        `Resumed approval workflow for request ${restoredRequest.id} from Neo4j`
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
   * Save approval chain progression to Neo4j
   */
  async saveChainProgress(
    request: HumanApprovalRequest,
    chainLevel: number,
    approvers: string[],
    chainStatus: string
  ): Promise<void> {
    if (!request.chainId) {
      return; // No chain ID - nothing to save
    }

    try {
      await this.approvalStateRepo.saveApprovalChain({
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
   * Resume approval chain from Neo4j state
   */
  async resumeApprovalChain(
    chainId: string,
    executionId: string
  ): Promise<{
    level: number;
    approvers: string[];
    status: string;
  } | null> {
    try {
      const chainData = await this.approvalStateRepo.loadApprovalChain(
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
   * Get all approval states for execution from Neo4j
   */
  async getApprovalCheckpoints(
    executionId: string,
    nodeId: string,
    limit?: number
  ): Promise<ApprovalStateData[]> {
    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);
      return await this.approvalStateRepo.listApprovalsByThread(threadId, {
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
   * Cleanup old approval states from Neo4j
   */
  async cleanupApprovalCheckpoints(maxAge?: number): Promise<number> {
    try {
      return await this.approvalStateRepo.cleanupOldApprovals(
        maxAge || HITL_DEFAULTS.FEEDBACK_RETENTION_MS
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup approval states: ${errorMsg}`);
      return 0;
    }
  }
}
