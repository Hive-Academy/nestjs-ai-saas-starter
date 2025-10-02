import { Injectable, Logger, Inject } from '@nestjs/common';
import { 
  NodeIdBuilder, 
  ICheckpointAdapter, 
  BaseCheckpointMetadata, 
  BaseCheckpointTuple 
} from '@hive-academy/langgraph-core';
import { HumanApprovalRequest } from './approval-workflow.types';
import { IHitlCheckpointService } from '../interfaces/hitl-services.interface';
import { HITL_DEFAULTS } from '../constants';

/**
 * Service for handling HITL checkpoint operations
 * Manages state persistence and workflow recovery
 */
@Injectable()
export class HitlCheckpointService implements IHitlCheckpointService {
  private readonly logger = new Logger(HitlCheckpointService.name);
  private currentStep = 0;

  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter
  ) {
    this.logger.log('💾 HITL Checkpoint Service initialized with adapter-first storage');
  }

  /**
   * Save approval workflow state at critical points
   */
  async saveApprovalState(
    request: HumanApprovalRequest,
    source: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      return; // Gracefully handle when checkpoint adapter is not available
    }

    try {
      const threadId = this.generateApprovalThreadId(
        request.executionId,
        request.nodeId
      );

      const checkpointData = {
        id: request.id,
        channel_values: {
          request,
          additionalData,
          timestamp: new Date().toISOString(),
        },
      };

      const metadata: BaseCheckpointMetadata = {
        timestamp: new Date().toISOString(),
        source: source as 'input' | 'loop' | 'update' | 'fork',
        step: ++this.currentStep,
        parents: {
          executionId: request.executionId,
          nodeId: request.nodeId,
          requestId: request.id,
        },
        workflowState: request.workflowState,
        confidence: request.confidence.current,
        riskLevel: request.riskAssessment?.level,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        checkpointData,
        metadata,
        'hitl-approval'
      );

      this.logger.debug(
        `Saved approval checkpoint for request ${request.id} at ${source}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to save approval checkpoint for request ${request.id}: ${errorMsg}`
      );
      // Don't throw - gracefully continue approval workflow
    }
  }

  /**
   * Resume approval workflow from saved state
   */
  async resumeApprovalWorkflow(
    executionId: string,
    nodeId: string,
    checkpointId?: string
  ): Promise<HumanApprovalRequest | null> {
    if (!this.checkpointAdapter) {
      this.logger.warn(
        'Cannot resume approval workflow - no checkpoint adapter available'
      );
      return null;
    }

    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);

      const checkpoint = await this.checkpointAdapter.loadCheckpoint<{
        request: HumanApprovalRequest;
        additionalData?: Record<string, unknown>;
        timestamp: string;
      }>(threadId, checkpointId, 'hitl-approval');

      if (!checkpoint?.channel_values?.request) {
        this.logger.warn(
          `No checkpoint found for approval workflow: ${executionId}/${nodeId}`
        );
        return null;
      }

      const restoredRequest = checkpoint.channel_values.request;

      this.logger.log(
        `Resumed approval workflow for request ${restoredRequest.id} from checkpoint`
      );

      return restoredRequest;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to resume approval workflow for ${executionId}/${nodeId}: ${errorMsg}`
      );
      return null;
    }
  }

  /**
   * Save approval chain progression
   */
  async saveChainProgress(
    request: HumanApprovalRequest,
    chainLevel: number,
    approvers: string[],
    chainStatus: string
  ): Promise<void> {
    if (!this.checkpointAdapter || !request.chainId) {
      return; // Gracefully handle when checkpoint adapter is not available or no chain
    }

    try {
      const threadId = this.generateChainThreadId(
        request.chainId,
        request.executionId
      );

      const chainData = {
        id: `${request.chainId}-${chainLevel}`,
        channel_values: {
          chainId: request.chainId,
          level: chainLevel,
          approvers,
          status: chainStatus,
          requestId: request.id,
          executionId: request.executionId,
          nodeId: request.nodeId,
          timestamp: new Date().toISOString(),
        },
      };

      const metadata: BaseCheckpointMetadata = {
        timestamp: new Date().toISOString(),
        source: 'update',
        step: ++this.currentStep,
        parents: {
          chainId: request.chainId,
          executionId: request.executionId,
          requestId: request.id,
          level: chainLevel,
        },
        chainLevel,
        chainStatus,
        approverCount: approvers.length,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        chainData,
        metadata,
        'hitl-chain'
      );

      this.logger.debug(
        `Saved chain progress checkpoint for chain ${request.chainId} level ${chainLevel}`
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
   * Resume approval chain from saved state
   */
  async resumeApprovalChain(
    chainId: string,
    executionId: string,
    checkpointId?: string
  ): Promise<{
    level: number;
    approvers: string[];
    status: string;
  } | null> {
    if (!this.checkpointAdapter) {
      this.logger.warn(
        'Cannot resume approval chain - no checkpoint adapter available'
      );
      return null;
    }

    try {
      const threadId = this.generateChainThreadId(chainId, executionId);

      const checkpoint = await this.checkpointAdapter.loadCheckpoint<{
        chainId: string;
        level: number;
        approvers: string[];
        status: string;
        requestId: string;
        executionId: string;
        nodeId: string;
        timestamp: string;
      }>(threadId, checkpointId, 'hitl-chain');

      if (!checkpoint?.channel_values) {
        this.logger.warn(
          `No chain checkpoint found for chain: ${chainId}/${executionId}`
        );
        return null;
      }

      const chainData = checkpoint.channel_values;

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
  generateApprovalThreadId(
    executionId: string,
    nodeId: string
  ): string {
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
   * Get all approval checkpoints for execution
   */
  async getApprovalCheckpoints(
    executionId: string,
    nodeId: string,
    limit?: number
  ): Promise<readonly BaseCheckpointTuple[]> {
    if (!this.checkpointAdapter) {
      return [];
    }

    try {
      const threadId = this.generateApprovalThreadId(executionId, nodeId);
      return await this.checkpointAdapter.listCheckpoints(
        threadId,
        { limit: limit || 10 },
        'hitl-approval'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get approval checkpoints for ${executionId}/${nodeId}: ${errorMsg}`
      );
      return [];
    }
  }

  /**
   * Cleanup old approval checkpoints
   */
  async cleanupApprovalCheckpoints(maxAge?: number): Promise<number> {
    if (!this.checkpointAdapter) {
      return 0;
    }

    try {
      return await this.checkpointAdapter.cleanupCheckpoints({
        maxAge: maxAge || HITL_DEFAULTS.FEEDBACK_RETENTION_MS,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup approval checkpoints: ${errorMsg}`);
      return 0;
    }
  }
}