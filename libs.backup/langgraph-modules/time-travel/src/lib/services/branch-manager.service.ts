import { Injectable, Logger } from '@nestjs/common';
import { TimeTravelService } from './time-travel.service';
import { BranchOptions, BranchInfo } from '../interfaces/time-travel.interface';

/**
 * Branch management service - Facade over TimeTravelService branch operations
 * Provides focused interface for branch-specific operations
 */
@Injectable()
export class BranchManagerService {
  private readonly logger = new Logger(BranchManagerService.name);

  constructor(private readonly timeTravelService: TimeTravelService) {}

  /**
   * Create execution branch from checkpoint
   */
  async createBranch<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    branchOptions: BranchOptions<T>
  ): Promise<string> {
    this.logger.log(
      `Creating branch '${branchOptions.name}' from checkpoint ${checkpointId}`
    );
    return this.timeTravelService.createBranch(
      threadId,
      checkpointId,
      branchOptions
    );
  }

  /**
   * List all branches for a thread
   */
  async listBranches(threadId: string): Promise<readonly BranchInfo[]> {
    return this.timeTravelService.listBranches(threadId);
  }

  /**
   * Merge branch back to main execution
   */
  async mergeBranch<T extends Record<string, unknown>>(
    threadId: string,
    branchId: string,
    mergeStrategy: 'overwrite' | 'merge' = 'merge'
  ): Promise<void> {
    this.logger.log(`Merging branch ${branchId} into thread ${threadId}`);
    return this.timeTravelService.mergeBranch(
      threadId,
      branchId,
      mergeStrategy
    );
  }

  /**
   * Delete a branch
   */
  async deleteBranch(threadId: string, branchId: string): Promise<void> {
    this.logger.log(`Deleting branch ${branchId} from thread ${threadId}`);
    return this.timeTravelService.deleteBranch(threadId, branchId);
  }
}
