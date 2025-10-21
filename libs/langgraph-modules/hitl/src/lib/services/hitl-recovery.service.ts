import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  HumanApprovalRequest,
  ApprovalWorkflowState,
} from './approval-workflow.types';
import { IHitlRecoveryService } from '../interfaces/hitl-services.interface';
import { IHitlStorageService } from '../interfaces/hitl-storage.interface';

/**
 * Service for handling HITL recovery operations
 * Manages service recovery, state persistence, and backup/restore functionality
 */
@Injectable()
export class HitlRecoveryService implements IHitlRecoveryService {
  private readonly logger = new Logger(HitlRecoveryService.name);
  private readonly recoveryCache = new Map<string, HumanApprovalRequest>();
  private lastRecoveryTime?: Date;

  constructor(
    @Inject(IHitlStorageService)
    private readonly hitlStorage: IHitlStorageService
  ) {
    this.logger.log(
      '🔧 HITL Recovery Service initialized with persistent storage'
    );
  }

  /**
   * Recover pending approvals from persistent storage
   */
  async recoverPendingApprovals(): Promise<void> {
    try {
      this.logger.log(
        '🔄 Starting recovery of pending approvals from persistent storage'
      );

      const pendingApprovals = await this.hitlStorage.getAllPending();

      if (pendingApprovals.length === 0) {
        this.logger.log('✅ No pending approvals found to recover');
        return;
      }

      let recoveredCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const approval of pendingApprovals) {
        try {
          // Validate the approval request before recovery
          if (this.isValidForRecovery(approval)) {
            // Add to recovery cache
            this.recoveryCache.set(approval.id, approval);
            recoveredCount++;

            this.logger.debug(`✅ Recovered approval request: ${approval.id}`);
          } else {
            failedCount++;
            errors.push(
              `Invalid approval request for recovery: ${approval.id}`
            );
            this.logger.warn(
              `⚠️ Skipped invalid approval request: ${approval.id}`
            );
          }
        } catch (error) {
          failedCount++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push(`Failed to recover ${approval.id}: ${errorMsg}`);
          this.logger.error(
            `❌ Failed to recover approval ${approval.id}: ${errorMsg}`
          );
        }
      }

      this.lastRecoveryTime = new Date();

      this.logger.log(
        `🔄 Recovery complete: ${recoveredCount} recovered, ${failedCount} failed`
      );

      if (errors.length > 0) {
        this.logger.warn(`Recovery errors: ${errors.join('; ')}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to recover pending approvals: ${errorMsg}`);
      throw new Error(`Recovery failed: ${errorMsg}`);
    }
  }

  /**
   * Persist timeout state for recovery
   */
  async persistTimeoutState(request: HumanApprovalRequest): Promise<void> {
    try {
      // Update request with timeout timestamp
      request.timestamps.timeout = new Date();
      request.workflowState = ApprovalWorkflowState.TIMEOUT;

      // Save to persistent storage
      await this.hitlStorage.update(request);

      // Update recovery cache
      this.recoveryCache.set(request.id, request);

      this.logger.log(
        `💾 Persisted timeout state for approval request ${request.id}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `⚠️ Failed to persist timeout state for request ${request.id}: ${errorMsg}`
      );
      // Don't throw - gracefully continue timeout handling
    }
  }

  /**
   * Recover service state after restart
   */
  async recoverServiceState(executionIds?: string[]): Promise<{
    recovered: number;
    failed: number;
    errors: string[];
  }> {
    try {
      this.logger.log('🔄 Starting service state recovery');

      let approvalsToRecover: HumanApprovalRequest[] = [];

      if (executionIds && executionIds.length > 0) {
        // Recover specific executions
        for (const executionId of executionIds) {
          const execApprovals = await this.hitlStorage.getByExecutionId(
            executionId
          );
          approvalsToRecover.push(...execApprovals);
        }
      } else {
        // Recover all pending approvals
        approvalsToRecover = await this.hitlStorage.getAllPending();
      }

      let recovered = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const approval of approvalsToRecover) {
        try {
          if (this.isValidForRecovery(approval)) {
            // Restore to recovery cache
            this.recoveryCache.set(approval.id, approval);
            recovered++;
          } else {
            failed++;
            errors.push(`Invalid approval state: ${approval.id}`);
          }
        } catch (error) {
          failed++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push(`Recovery error for ${approval.id}: ${errorMsg}`);
        }
      }

      this.lastRecoveryTime = new Date();

      this.logger.log(
        `✅ Service state recovery complete: ${recovered} recovered, ${failed} failed`
      );

      return { recovered, failed, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Service state recovery failed: ${errorMsg}`);
      return {
        recovered: 0,
        failed: 0,
        errors: [`Service recovery failed: ${errorMsg}`],
      };
    }
  }

  /**
   * Backup current service state
   */
  async backupServiceState(): Promise<{
    approvalCount: number;
    backupId: string;
    timestamp: Date;
  }> {
    try {
      this.logger.log('💾 Starting service state backup');

      const result = await this.hitlStorage.backup();
      const timestamp = new Date();

      this.logger.log(
        `✅ Service state backup complete: ${result.count} approvals backed up with ID ${result.backupId}`
      );

      return {
        approvalCount: result.count,
        backupId: result.backupId,
        timestamp,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Service state backup failed: ${errorMsg}`);
      throw new Error(`Backup failed: ${errorMsg}`);
    }
  }

  /**
   * Restore service state from backup
   */
  async restoreServiceState(backupId: string): Promise<{
    restored: number;
    failed: number;
    errors: string[];
  }> {
    try {
      this.logger.log(
        `🔄 Starting service state restore from backup ${backupId}`
      );

      const result = await this.hitlStorage.restore(backupId);

      // Clear current recovery cache and rebuild from restored data
      this.recoveryCache.clear();

      // Reload pending approvals into cache
      await this.recoverPendingApprovals();

      this.logger.log(
        `✅ Service state restore complete: ${result.restored} restored, ${result.failed} failed`
      );

      return {
        restored: result.restored,
        failed: result.failed,
        errors: [],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Service state restore failed: ${errorMsg}`);
      return {
        restored: 0,
        failed: 0,
        errors: [`Restore failed: ${errorMsg}`],
      };
    }
  }

  /**
   * Check service health and recovery status
   */
  async checkRecoveryHealth(): Promise<{
    isHealthy: boolean;
    pendingRecoveries: number;
    lastRecoveryTime?: Date;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Check storage connectivity
      try {
        await this.hitlStorage.getAllPending();
      } catch (error) {
        issues.push('Storage adapter is not responding');
      }

      // Check recovery cache consistency
      const pendingRecoveries = this.recoveryCache.size;

      // Check if recovery is recent enough
      const now = new Date();
      const maxRecoveryAge = 24 * 60 * 60 * 1000; // 24 hours

      if (!this.lastRecoveryTime) {
        issues.push('No recovery has been performed yet');
      } else if (
        now.getTime() - this.lastRecoveryTime.getTime() >
        maxRecoveryAge
      ) {
        issues.push('Last recovery is older than 24 hours');
      }

      // Check for stale entries in recovery cache
      const staleEntries = Array.from(this.recoveryCache.values()).filter(
        (approval) => this.isStaleApproval(approval)
      );

      if (staleEntries.length > 0) {
        issues.push(`${staleEntries.length} stale entries in recovery cache`);
      }

      const isHealthy = issues.length === 0;

      return {
        isHealthy,
        pendingRecoveries,
        lastRecoveryTime: this.lastRecoveryTime,
        issues,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        isHealthy: false,
        pendingRecoveries: 0,
        lastRecoveryTime: this.lastRecoveryTime,
        issues: [`Health check failed: ${errorMsg}`],
      };
    }
  }

  /**
   * Get recovered approval from cache
   */
  getRecoveredApproval(requestId: string): HumanApprovalRequest | undefined {
    return this.recoveryCache.get(requestId);
  }

  /**
   * Get all recovered approvals
   */
  getAllRecoveredApprovals(): HumanApprovalRequest[] {
    return Array.from(this.recoveryCache.values());
  }

  /**
   * Remove approval from recovery cache
   */
  removeFromRecoveryCache(requestId: string): boolean {
    return this.recoveryCache.delete(requestId);
  }

  /**
   * Clear recovery cache
   */
  clearRecoveryCache(): void {
    this.recoveryCache.clear();
    this.logger.log('🧹 Recovery cache cleared');
  }

  // =====================
  // PRIVATE HELPER METHODS
  // =====================

  private isValidForRecovery(approval: HumanApprovalRequest): boolean {
    try {
      // Check required fields
      if (!approval.id || !approval.executionId || !approval.nodeId) {
        return false;
      }

      // Check if state allows recovery
      const recoverableStates = [
        ApprovalWorkflowState.PENDING,
        ApprovalWorkflowState.IN_PROGRESS,
        ApprovalWorkflowState.ESCALATED,
      ];

      if (!recoverableStates.includes(approval.workflowState)) {
        return false;
      }

      // Check if not too old (configurable threshold)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const now = Date.now();
      const requestTime = approval.timestamps.requested.getTime();

      if (now - requestTime > maxAge) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Validation error for approval ${approval.id}: ${error}`
      );
      return false;
    }
  }

  private isStaleApproval(approval: HumanApprovalRequest): boolean {
    try {
      const now = Date.now();
      const requestTime = approval.timestamps.requested.getTime();
      const maxStaleAge = 24 * 60 * 60 * 1000; // 24 hours

      // Consider stale if older than threshold and still pending/in-progress
      const isOld = now - requestTime > maxStaleAge;
      const isPending = [
        ApprovalWorkflowState.PENDING,
        ApprovalWorkflowState.IN_PROGRESS,
      ].includes(approval.workflowState);

      return isOld && isPending;
    } catch (error) {
      return false;
    }
  }
}
