import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { IHitlStorageService } from '../interfaces/hitl-storage.interface';
import {
  HitlNotificationService,
  ApprovalTimeoutNotificationData,
} from './hitl-notification.service';
import { HITL_DEFAULTS } from '../constants';

/**
 * HITL Timeout Service
 *
 * Manages approval request timeouts with configurable strategies:
 * - Auto-approve on timeout
 * - Auto-reject on timeout (most common for production)
 * - Escalate on timeout
 * - Retry on timeout
 */
@Injectable()
export class HitlTimeoutService {
  private readonly logger = new Logger(HitlTimeoutService.name);
  private readonly timeouts = new Map<string, NodeJS.Timeout>();
  private readonly timeoutStrategies = new Map<
    string,
    'approve' | 'reject' | 'escalate' | 'retry'
  >();

  constructor(
    @Optional() private readonly storage?: IHitlStorageService,
    @Optional() private readonly notifications?: HitlNotificationService
  ) {
    this.logger.debug('HitlTimeoutService initialized', {
      storageAvailable: !!this.storage,
      notificationsAvailable: !!this.notifications,
    });
  }

  /**
   * Set approval timeout with specified strategy
   */
  setApprovalTimeout(
    approvalId: string,
    timeoutMs: number = HITL_DEFAULTS.APPROVAL_TIMEOUT_MS,
    strategy: 'approve' | 'reject' | 'escalate' | 'retry' = 'reject'
  ): void {
    this.logger.debug(`Setting timeout for approval ${approvalId}`, {
      timeoutMs,
      strategy,
      timeoutMinutes: Math.round(timeoutMs / 60000),
    });

    // Clear existing timeout if any
    this.clearTimeout(approvalId);

    // Store strategy for later use
    this.timeoutStrategies.set(approvalId, strategy);

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleTimeout(approvalId, timeoutMs, strategy);
    }, timeoutMs);

    this.timeouts.set(approvalId, timeout);

    this.logger.debug(
      `Timeout set for approval ${approvalId} (${Math.round(
        timeoutMs / 60000
      )} minutes)`
    );
  }

  /**
   * Clear timeout for approval request
   */
  clearTimeout(approvalId: string): boolean {
    const timeout = this.timeouts.get(approvalId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(approvalId);
      this.timeoutStrategies.delete(approvalId);

      this.logger.debug(`Cleared timeout for approval ${approvalId}`);
      return true;
    }
    return false;
  }

  /**
   * Check if approval has active timeout
   */
  hasTimeout(approvalId: string): boolean {
    return this.timeouts.has(approvalId);
  }

  /**
   * Get timeout strategy for approval
   */
  getTimeoutStrategy(
    approvalId: string
  ): 'approve' | 'reject' | 'escalate' | 'retry' | null {
    return this.timeoutStrategies.get(approvalId) || null;
  }

  /**
   * Get remaining time for approval timeout in milliseconds
   */
  getRemainingTime(approvalId: string): number | null {
    // This is tricky to implement accurately with setTimeout
    // For now, return null if no timeout exists
    return this.timeouts.has(approvalId) ? -1 : null; // -1 means unknown time remaining
  }

  /**
   * Get all active timeouts (for monitoring/debugging)
   */
  getActiveTimeouts(): { approvalId: string; strategy: string }[] {
    const active: { approvalId: string; strategy: string }[] = [];

    for (const [approvalId] of this.timeouts) {
      const strategy = this.timeoutStrategies.get(approvalId) || 'unknown';
      active.push({ approvalId, strategy });
    }

    return active;
  }

  /**
   * Clear all timeouts (useful for cleanup)
   */
  clearAllTimeouts(): number {
    const count = this.timeouts.size;

    for (const [approvalId, timeout] of this.timeouts.entries()) {
      clearTimeout(timeout);
    }

    this.timeouts.clear();
    this.timeoutStrategies.clear();

    this.logger.debug(`Cleared ${count} active timeouts`);
    return count;
  }

  /**
   * Handle approval timeout based on strategy
   */
  private async handleTimeout(
    approvalId: string,
    timeoutDuration: number,
    strategy: 'approve' | 'reject' | 'escalate' | 'retry'
  ): Promise<void> {
    this.logger.warn(`Handling timeout for approval ${approvalId}`, {
      strategy,
      timeoutDuration,
      timeoutMinutes: Math.round(timeoutDuration / 60000),
    });

    try {
      // Remove from our tracking
      this.timeouts.delete(approvalId);
      this.timeoutStrategies.delete(approvalId);

      // Get approval details from storage if available
      let approvalData = null;
      let executionId = 'unknown';

      if (this.storage) {
        try {
          approvalData = await this.storage.getApprovalRequest(approvalId);
          if (approvalData) {
            executionId = approvalData.executionId;
          }
        } catch (error) {
          this.logger.error(
            `Failed to get approval data for timeout: ${error.message}`
          );
        }
      }

      // Send timeout notification
      if (this.notifications) {
        const notificationData: ApprovalTimeoutNotificationData = {
          requestId: approvalId,
          executionId,
          timeoutStrategy: strategy,
          timeoutDuration,
        };

        await this.notifications.notifyApprovalTimeout(notificationData);
      }

      // Update storage with timeout status and response based on strategy
      if (this.storage && approvalData) {
        const timeoutResponse = this.createTimeoutResponse(
          strategy,
          timeoutDuration
        );
        await this.storage.updateApprovalStatus(
          approvalId,
          'timeout',
          timeoutResponse
        );
      }

      // Execute timeout strategy
      await this.executeTimeoutStrategy(
        approvalId,
        strategy,
        timeoutDuration,
        executionId
      );
    } catch (error) {
      this.logger.error(
        `Error handling timeout for approval ${approvalId}`,
        error
      );
      // Don't rethrow - timeout handling should not fail silently but not crash
    }
  }

  /**
   * Execute the specific timeout strategy
   */
  private async executeTimeoutStrategy(
    approvalId: string,
    strategy: 'approve' | 'reject' | 'escalate' | 'retry',
    timeoutDuration: number,
    executionId: string
  ): Promise<void> {
    switch (strategy) {
      case 'approve':
        await this.handleTimeoutApprove(
          approvalId,
          timeoutDuration,
          executionId
        );
        break;

      case 'reject':
        await this.handleTimeoutReject(
          approvalId,
          timeoutDuration,
          executionId
        );
        break;

      case 'escalate':
        await this.handleTimeoutEscalate(
          approvalId,
          timeoutDuration,
          executionId
        );
        break;

      case 'retry':
        await this.handleTimeoutRetry(approvalId, timeoutDuration, executionId);
        break;

      default:
        this.logger.warn(
          `Unknown timeout strategy: ${strategy}, defaulting to reject`
        );
        await this.handleTimeoutReject(
          approvalId,
          timeoutDuration,
          executionId
        );
        break;
    }
  }

  /**
   * Handle auto-approve on timeout
   */
  private async handleTimeoutApprove(
    approvalId: string,
    timeoutDuration: number,
    executionId: string
  ): Promise<void> {
    this.logger.log(`Auto-approving timed out request ${approvalId}`);

    // For demo purposes, log the auto-approval
    console.log(`✅ AUTO-APPROVED (Timeout): ${approvalId}`);
    console.log(
      `   Reason: Approved automatically after ${Math.round(
        timeoutDuration / 60000
      )} minute timeout`
    );
    console.log(`   Execution: ${executionId}`);
    console.log('─'.repeat(50));

    // Here you would typically trigger the workflow continuation
    // This depends on your workflow engine integration
    // For now, we'll just log it - the actual integration with HumanApprovalService
    // would happen when we update those services to use the timeout service
  }

  /**
   * Handle auto-reject on timeout
   */
  private async handleTimeoutReject(
    approvalId: string,
    timeoutDuration: number,
    executionId: string
  ): Promise<void> {
    this.logger.log(`Auto-rejecting timed out request ${approvalId}`);

    // For demo purposes, log the auto-rejection
    console.log(`❌ AUTO-REJECTED (Timeout): ${approvalId}`);
    console.log(
      `   Reason: Rejected automatically after ${Math.round(
        timeoutDuration / 60000
      )} minute timeout`
    );
    console.log(`   Execution: ${executionId}`);
    console.log(
      '   ⚠️  Workflow will be terminated or require manual intervention'
    );
    console.log('─'.repeat(50));
  }

  /**
   * Handle escalate on timeout
   */
  private async handleTimeoutEscalate(
    approvalId: string,
    timeoutDuration: number,
    executionId: string
  ): Promise<void> {
    this.logger.log(`Escalating timed out request ${approvalId}`);

    // For demo purposes, log the escalation
    console.log(`🔺 ESCALATED (Timeout): ${approvalId}`);
    console.log(
      `   Reason: Escalated automatically after ${Math.round(
        timeoutDuration / 60000
      )} minute timeout`
    );
    console.log(`   Execution: ${executionId}`);
    console.log(`   Action: Request moved to next approval level`);
    console.log('─'.repeat(50));

    // Here you would typically escalate to the next approval level
    // This would integrate with the ApprovalChainService
  }

  /**
   * Handle retry on timeout
   */
  private async handleTimeoutRetry(
    approvalId: string,
    timeoutDuration: number,
    executionId: string
  ): Promise<void> {
    this.logger.log(`Retrying timed out request ${approvalId}`);

    // For demo purposes, log the retry
    console.log(`🔄 RETRY (Timeout): ${approvalId}`);
    console.log(
      `   Reason: Retrying automatically after ${Math.round(
        timeoutDuration / 60000
      )} minute timeout`
    );
    console.log(`   Execution: ${executionId}`);
    console.log(`   Action: New approval request will be created`);
    console.log('─'.repeat(50));

    // Here you would typically create a new approval request
    // with potentially different parameters or approvers
  }

  /**
   * Create a timeout response object
   */
  private createTimeoutResponse(
    strategy: 'approve' | 'reject' | 'escalate' | 'retry',
    timeoutDuration: number
  ) {
    const decision =
      strategy === 'approve'
        ? 'approved'
        : strategy === 'escalate'
        ? 'escalated'
        : 'rejected';

    return {
      decision: decision as 'approved' | 'rejected' | 'escalated' | 'timeout',
      approvedBy: 'SYSTEM_TIMEOUT',
      message: `${strategy.toUpperCase()} due to ${Math.round(
        timeoutDuration / 60000
      )} minute timeout`,
      timestamp: new Date(),
      metadata: JSON.stringify({
        automaticAction: true,
        timeoutStrategy: strategy,
        timeoutDurationMs: timeoutDuration,
        systemGenerated: true,
      }),
    };
  }
}
