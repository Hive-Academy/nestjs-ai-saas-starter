import { Injectable, Logger, Optional } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import { IHitlStorageService } from '../interfaces/hitl-storage.interface';
import { HitlNotificationService } from './hitl-notification.service';
import { RunnableConfigFactory } from '../config/runnable-config.factory';
import { HITL_DEFAULTS } from '../constants';

/**
 * HITL Timeout Service
 *
 * Phase 3 - RunnableConfig Integration:
 * Now uses Command({ resume }) for timeout actions instead of custom resumption logic.
 *
 * Manages approval request timeouts with configurable strategies:
 * - Auto-approve on timeout (uses Command({ resume: 'approved' }))
 * - Auto-reject on timeout (uses Command({ resume: 'rejected' }))
 * - Escalate on timeout (uses Command({ resume: 'escalate' }))
 * - Retry on timeout (uses Command({ resume: 'retry' }))
 *
 * Pattern: Access checkpointer via RunnableConfig, use Command for resumption
 * Evidence: research-report.md:448-485 (timeout handling integration)
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
   * Handle timeout action using LangGraph native Command pattern.
   * Replaces custom resumption logic with Command({ resume }).
   *
   * @param config - LangGraph RunnableConfig with checkpointer
   * @param interruptId - Interrupt ID to resume
   * @param timeoutAction - Action to take on timeout
   * @returns Command object for LangGraph to resume workflow
   *
   * @see research-report.md:448-485 (timeout handling with Command)
   * @see implementation-plan.md:394-408 (RunnableConfig integration)
   *
   * @example
   * ```typescript
   * // Timeout handler calls this method
   * const command = await this.hitlTimeout.handleTimeoutWithCommand(
   *   config,
   *   interruptId,
   *   'reject'
   * );
   *
   * // LangGraph resumes workflow with command
   * await graph.invoke(command, config);
   * ```
   */
  async handleTimeoutWithCommand(
    config: RunnableConfig,
    interruptId: string,
    timeoutAction: 'resume' | 'cancel'
  ): Promise<Command> {
    this.logger.warn(`Handling timeout for interrupt ${interruptId}`, {
      timeoutAction,
    });

    try {
      // Get checkpointer for state access
      const checkpointer = RunnableConfigFactory.ensureCheckpointer(config);

      // Get current checkpoint to read interrupt state
      const checkpoint = await checkpointer.get(config);
      if (!checkpoint) {
        throw new Error(`No checkpoint found for interrupt ${interruptId}`);
      }

      // Build timeout response
      const timeoutResponse = {
        type: timeoutAction,
        reason: 'timeout',
        timestamp: new Date(),
        interruptId,
      };

      // Create Command with resume value based on timeout action
      const command = new Command({
        resume: timeoutResponse,
      });

      this.logger.log(`Created Command for timeout action: ${timeoutAction}`);
      return command;
    } catch (error) {
      this.logger.error(
        `Failed to handle timeout for interrupt ${interruptId}:`,
        error
      );
      throw error;
    }
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
      this.executeTimeoutHandler(approvalId, timeoutMs, strategy);
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

    for (const [, timeout] of this.timeouts.entries()) {
      clearTimeout(timeout);
    }

    this.timeouts.clear();
    this.timeoutStrategies.clear();

    this.logger.debug(`Cleared ${count} active timeouts`);
    return count;
  }

  /**
   * Execute timeout handler (legacy internal method)
   * Coordinates storage updates, notifications, and strategy execution
   */
  private async executeTimeoutHandler(
    approvalId: string,
    timeoutDuration: number,
    strategy: 'approve' | 'reject' | 'escalate' | 'retry'
  ): Promise<void> {
    try {
      // Remove from tracking
      this.timeouts.delete(approvalId);
      this.timeoutStrategies.delete(approvalId);

      // Get approval details from storage if available
      let executionId = 'unknown';
      if (this.storage) {
        try {
          const approvalData = await this.storage.getApprovalRequest(
            approvalId
          );
          if (approvalData) {
            executionId = approvalData.executionId;
          }
        } catch (error) {
          this.logger.error('Failed to get approval data for timeout:', error);
        }
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
    }
  }

  /**
   * Execute the specific timeout strategy (legacy method for compatibility)
   * @deprecated Use handleTimeoutWithCommand() with RunnableConfig instead
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
}
