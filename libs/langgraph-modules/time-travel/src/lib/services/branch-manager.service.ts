import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import {
  ICheckpointAdapter,
  IMemoryAdapter,
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
import {
  TimeTravelOperationPayloads,
  CreateBranchMetadata,
} from '../interfaces/time-travel-metadata.interface';

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
    private readonly checkpointAdapter: ICheckpointAdapter,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
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

    // Create properly typed branch metadata
    const branchMetadata: CreateBranchMetadata<TimeTravelOperationPayloads.BranchOperationPayload> =
      {
        executionId: `exec_${crypto.randomUUID()}`,
        type: 'progress',
        created_at: new Date().toISOString(),
        nodeId: 'branch-creation',
        workflowName: (checkpoint.channel_values as any)?.workflowName,
        timeTravelType: 'branch',
        sourceInfo: {
          threadId,
          checkpointId: fromCheckpointId,
          timestamp: new Date().toISOString(),
        },
        target: {
          threadId: branchThreadId,
          timestamp: new Date().toISOString(),
        },
        branchInfo: {
          branchId,
          branchName: branchOptions.name,
          description: branchOptions.description,
          parentThreadId: threadId,
          parentCheckpointId: fromCheckpointId,
          createdAt: new Date().toISOString(),
          status: 'active',
        },
        stateModifications: branchOptions.stateModifications
          ? {
              modificationType: 'partial',
              modifiedFields: Object.keys(branchOptions.stateModifications),
              originalValues: {},
              newValues: branchOptions.stateModifications,
            }
          : undefined,
        payload: {
          creationStrategy: 'fork',
          expectedDivergence: 'moderate',
          purpose: 'experiment',
          creator: {
            type: 'system',
            id: 'branch-manager-service',
          },
        },
        // BaseCheckpointMetadata required fields
        timestamp: new Date().toISOString(),
        source: 'fork', // Required enum value from BaseCheckpointMetadata
        step: 0,
        parents: {},
      };

    // Save branch checkpoint with typed metadata
    await this.checkpointAdapter.saveCheckpoint(
      branchThreadId,
      branchCheckpoint,
      branchMetadata
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

    // 🧠 MEMORY INTEGRATION: Store branch creation memory for future time-travel analysis
    await this.storeBranchMemoryContext(
      branchId,
      branchInfo,
      branchedState,
      branchOptions
    );

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

    // 🧠 MEMORY INTEGRATION: Store merge outcome for learning
    await this.storeBranchMergeMemory(
      branchId,
      threadId,
      mergeStrategy,
      'success'
    );

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

  // 🧠 MEMORY INTEGRATION: Store branch creation context for future analysis
  private async storeBranchMemoryContext<T extends Record<string, unknown>>(
    branchId: string,
    branchInfo: BranchInfo,
    branchedState: T,
    branchOptions: BranchOptions<T>
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return; // Graceful degradation when memory adapter not available
    }

    try {
      // Store branch creation memory with time-travel namespace
      await this.memoryAdapter.store(
        `time-travel.branches.${branchInfo.parentThreadId}`,
        JSON.stringify({
          branchInfo,
          creationContext: {
            originalState: branchedState,
            modifications: branchOptions.stateModifications,
            reason:
              branchOptions.description || 'Branch created for experimentation',
            parentCheckpoint: branchInfo.parentCheckpointId,
          },
          analysisData: {
            stateSize: JSON.stringify(branchedState).length,
            modificationCount: Object.keys(
              branchOptions.stateModifications || {}
            ).length,
            hasMetadata: !!branchOptions.metadata,
            branchStrategy: this.analyzeBranchStrategy(branchOptions),
          },
        }),
        {
          type: 'fact',
          source: 'branch_creation',
          branchId,
          parentThreadId: branchInfo.parentThreadId,
          timestamp: branchInfo.createdAt.toISOString(),
          importance: 0.8, // High importance for branch analysis
        }
      );

      this.logger.debug(
        `🧠 Stored branch creation memory for branch ${branchId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to store branch memory: ${errorMessage}`);
      // Don't throw - memory storage failure shouldn't break branching
    }
  }

  // 🧠 MEMORY INTEGRATION: Retrieve historical branch patterns for smart suggestions
  async getBranchingPatterns(threadId: string): Promise<{
    commonModifications: Record<string, number>;
    successfulBranchTypes: string[];
    recommendedStrategy: string;
  }> {
    if (!this.memoryAdapter) {
      return {
        commonModifications: {},
        successfulBranchTypes: [],
        recommendedStrategy: 'standard',
      };
    }

    try {
      const branchMemories = await this.memoryAdapter.search({
        query: 'branch creation patterns',
        threadId: `time-travel.branches.${threadId}`,
        limit: 10,
        minRelevance: 0.3,
      });

      const patterns = {
        commonModifications: {} as Record<string, number>,
        successfulBranchTypes: [] as string[],
        recommendedStrategy: 'standard',
      };

      for (const memory of branchMemories) {
        try {
          const context = JSON.parse(memory.content);

          // Analyze modification patterns
          if (context.creationContext?.modifications) {
            Object.keys(context.creationContext.modifications).forEach(
              (key) => {
                patterns.commonModifications[key] =
                  (patterns.commonModifications[key] || 0) + 1;
              }
            );
          }

          // Track successful branch types
          if (context.analysisData?.branchStrategy) {
            patterns.successfulBranchTypes.push(
              context.analysisData.branchStrategy
            );
          }
        } catch (parseError) {
          const errorMessage =
            parseError instanceof Error
              ? parseError.message
              : String(parseError);
          this.logger.warn(`Failed to parse branch memory: ${errorMessage}`);
        }
      }

      // Determine recommended strategy based on patterns
      patterns.recommendedStrategy =
        this.calculateRecommendedStrategy(patterns);

      return patterns;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to retrieve branching patterns: ${errorMessage}`
      );
      return {
        commonModifications: {},
        successfulBranchTypes: [],
        recommendedStrategy: 'standard',
      };
    }
  }

  // 🧠 MEMORY INTEGRATION: Store branch merge outcomes for learning
  async storeBranchMergeMemory(
    branchId: string,
    threadId: string,
    mergeStrategy: string,
    outcome: 'success' | 'conflict' | 'failed'
  ): Promise<void> {
    if (!this.memoryAdapter) {
      return;
    }

    try {
      const branchInfo = this.branches.get(branchId);
      if (!branchInfo) return;

      await this.memoryAdapter.store(
        `time-travel.branches.${threadId}`,
        JSON.stringify({
          branchId,
          branchName: branchInfo.name,
          mergeStrategy,
          outcome,
          duration: Date.now() - branchInfo.createdAt.getTime(),
          checkpointCount: branchInfo.checkpointCount,
          lessons: this.extractMergeLessons(mergeStrategy, outcome),
        }),
        {
          type: 'fact',
          source: 'branch_merge',
          branchId,
          outcome,
          timestamp: new Date().toISOString(),
          importance: outcome === 'failed' ? 0.9 : 0.7, // Failed merges are more important to learn from
        }
      );

      this.logger.debug(
        `🧠 Stored branch merge memory for branch ${branchId}: ${outcome}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to store branch merge memory: ${errorMessage}`);
    }
  }

  private analyzeBranchStrategy<T extends Record<string, unknown>>(
    branchOptions: BranchOptions<T>
  ): string {
    const modifications = branchOptions.stateModifications || {};
    const modCount = Object.keys(modifications).length;

    if (modCount === 0) return 'replay-only';
    if (modCount <= 2) return 'targeted-modification';
    if (modCount <= 5) return 'moderate-changes';
    return 'major-refactor';
  }

  private calculateRecommendedStrategy(patterns: {
    commonModifications: Record<string, number>;
    successfulBranchTypes: string[];
  }): string {
    const typeFrequency = patterns.successfulBranchTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostSuccessful = Object.entries(typeFrequency).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostSuccessful?.[0] || 'standard';
  }

  private extractMergeLessons(
    strategy: string,
    outcome: 'success' | 'conflict' | 'failed'
  ): string[] {
    const lessons: string[] = [];

    if (outcome === 'failed') {
      lessons.push(
        `${strategy} merge strategy failed - consider alternative approach`
      );
      lessons.push('Review state conflicts before attempting merge');
    } else if (outcome === 'conflict') {
      lessons.push(
        `${strategy} strategy resulted in conflicts - manual resolution needed`
      );
      lessons.push('Consider smaller, incremental changes in future branches');
    } else {
      lessons.push(
        `${strategy} strategy succeeded - good pattern for similar scenarios`
      );
    }

    return lessons;
  }
}
