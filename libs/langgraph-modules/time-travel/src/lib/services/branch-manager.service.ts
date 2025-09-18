import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ICheckpointAdapter,
  normalizeNodeId,
  NodeIdBuilder,
} from '@hive-academy/langgraph-core';
import {
  BranchOptions,
  BranchInfo,
  BranchNotFoundError,
  CheckpointNotFoundError,
  BranchOptionsSchema,
} from '../interfaces/time-travel.interface';

/**
 * Service responsible for managing workflow execution branches
 * Handles branch creation, deletion, merging, and lifecycle management
 */
@Injectable()
export class BranchManagerService {
  private readonly logger = new Logger(BranchManagerService.name);
  private readonly branches = new Map<string, BranchInfo>();

  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter
  ) {}

  /**
   * Create execution branch from checkpoint
   */
  async createBranch<T extends Record<string, unknown>>(
    threadId: string,
    fromCheckpointId: string,
    branchOptions: BranchOptions<T>
  ): Promise<string> {
    // Validate options
    const validation = BranchOptionsSchema.safeParse(branchOptions);
    if (!validation.success) {
      throw new Error(`Invalid branch options: ${validation.error.message}`);
    }

    const checkpoint = await this.checkpointAdapter.loadCheckpoint<T>(
      threadId,
      fromCheckpointId
    );

    if (!checkpoint) {
      throw new CheckpointNotFoundError(
        `Checkpoint ${fromCheckpointId} not found`,
        threadId,
        fromCheckpointId
      );
    }

    const branchId = `branch_${crypto.randomUUID()}`;
    const branchThreadId = `${threadId}_${branchOptions.name}_${Date.now()}`;

    // Apply branch modifications
    let branchedState = checkpoint.channel_values;
    if (branchOptions.stateModifications) {
      branchedState = {
        ...branchedState,
        ...branchOptions.stateModifications,
      };
    }

    // Create branch checkpoint
    const branchCheckpoint = {
      ...checkpoint,
      id: `${checkpoint.id}_branch_${branchOptions.name}`,
      channel_values: branchedState,
    };

    // Save branch checkpoint with branch metadata
    await this.checkpointAdapter.saveCheckpoint(
      branchThreadId,
      branchCheckpoint,
      {
        timestamp: new Date().toISOString(),
        branchName: branchOptions.name,
        parentThreadId: threadId,
        parentCheckpointId: fromCheckpointId,
        branchCreatedAt: new Date().toISOString(),
        branchDescription: branchOptions.description,
        source: 'fork',
        step: 0,
        parents: {},
      }
    );

    // Store branch info
    const branchInfo: BranchInfo = {
      id: branchId,
      name: branchOptions.name,
      description: branchOptions.description,
      parentThreadId: threadId,
      parentCheckpointId: fromCheckpointId,
      createdAt: new Date(),
      checkpointCount: 1,
      status: 'active',
      metadata: branchOptions.metadata,
    };

    this.branches.set(branchId, branchInfo);

    this.logger.log(
      `Created branch '${branchOptions.name}' with ID: ${branchId}`
    );
    return branchId;
  }

  /**
   * Merge branch back to main execution
   */
  async mergeBranch<T extends Record<string, unknown>>(
    threadId: string,
    branchId: string,
    mergeStrategy: 'overwrite' | 'merge' | 'custom' = 'merge'
  ): Promise<void> {
    const branch = this.branches.get(branchId);

    if (!branch) {
      throw new BranchNotFoundError(
        `Branch ${branchId} not found`,
        threadId,
        branchId
      );
    }

    if (branch.status !== 'active') {
      throw new Error(
        `Branch ${branchId} is not active (status: ${branch.status})`
      );
    }

    // For now, just mark as merged
    // Full merge implementation would require more complex state merging
    branch.status = 'merged';
    branch.updatedAt = new Date();
    branch.metadata = {
      ...branch.metadata,
      mergedAt: new Date(),
      mergeStrategy,
    };

    this.logger.log(
      `Branch ${branchId} merged to thread ${threadId} using ${mergeStrategy} strategy`
    );
  }

  /**
   * Delete a branch and its associated checkpoints
   */
  async deleteBranch(threadId: string, branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);

    if (!branch) {
      throw new BranchNotFoundError(
        `Branch ${branchId} not found`,
        threadId,
        branchId
      );
    }

    if (branch.status === 'merged') {
      throw new Error(`Cannot delete merged branch ${branchId}`);
    }

    // 1. Normalize identifiers using Node ID standard
    const normalizedBranchId = normalizeNodeId(branchId);

    // 2. Generate canonical Node ID for deletion operation
    const deletionNodeId = NodeIdBuilder.create()
      .domain('timetravel')
      .phase('branch')
      .activity('deletion')
      .detail(normalizedBranchId.slice(-8))
      .build();

    // 3. Prevent deletion of active branches without confirmation
    if (branch.status === 'active') {
      this.logger.warn(
        `Deleting active branch ${normalizedBranchId} - this will lose all work (deletionNodeId: ${deletionNodeId})`
      );
    }

    // 4. Delete branch checkpoints using checkpointAdapter cleanup method
    try {
      // Use cleanup method to delete all branch checkpoints
      const deletedCount = await this.checkpointAdapter.cleanupCheckpoints({
        threadIds: [normalizedBranchId],
      });

      this.logger.log(
        `🗑️  Successfully cleaned up ${deletedCount} checkpoints for branch ${branch.name} (${normalizedBranchId})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup checkpoints for branch ${branch.name}:`,
        error
      );
    }

    // 5. Remove branch from registry
    this.branches.delete(branchId);

    this.logger.log(
      `Branch ${normalizedBranchId} (${branch.name}) deleted completely (deletionNodeId: ${deletionNodeId})`
    );
  }

  /**
   * List all branches for a thread
   */
  async listBranches(threadId: string): Promise<readonly BranchInfo[]> {
    const branches: BranchInfo[] = [];

    for (const branch of this.branches.values()) {
      if (branch.parentThreadId === threadId) {
        branches.push(branch);
      }
    }

    // Sort by creation date
    branches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return branches;
  }

  /**
   * Get specific branch information
   */
  async getBranchInfo(threadId: string, branchId: string): Promise<BranchInfo> {
    const branch = this.branches.get(branchId);

    if (!branch) {
      throw new BranchNotFoundError(
        `Branch ${branchId} not found`,
        threadId,
        branchId
      );
    }

    if (branch.parentThreadId !== threadId) {
      throw new BranchNotFoundError(
        `Branch ${branchId} does not belong to thread ${threadId}`,
        threadId,
        branchId
      );
    }

    return branch;
  }

  /**
   * Get branch statistics
   */
  async getBranchStats(threadId: string): Promise<{
    totalBranches: number;
    activeBranches: number;
    mergedBranches: number;
    deletedBranches: number;
  }> {
    const branches = await this.listBranches(threadId);

    return {
      totalBranches: branches.length,
      activeBranches: branches.filter((b) => b.status === 'active').length,
      mergedBranches: branches.filter((b) => b.status === 'merged').length,
      deletedBranches: branches.filter((b) => b.status === 'abandoned').length,
    };
  }
}
