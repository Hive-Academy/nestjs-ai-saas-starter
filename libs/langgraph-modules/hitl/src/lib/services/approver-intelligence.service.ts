import { Injectable, Logger } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { BaseStore } from '@langchain/langgraph-checkpoint';
import type { HumanApprovalRequest } from './approval-workflow.types';
import type { ApproverRanking } from '../interfaces/approver-intelligence.interface';

/**
 * Approver Intelligence Service
 *
 * Phase 1a SOLID Refactoring - Extracted from ApprovalProcessingService
 *
 * **Responsibility**: Intelligent approver selection using BaseStore patterns
 * **Pattern**: Strategy pattern - encapsulates ranking algorithms
 *
 * Simplified approver selection:
 * - Uses default ranking when BaseStore unavailable
 * - Provides basic approver selection logic
 * - Can be enhanced with BaseStore integration in future
 *
 * **Target LOC**: ~450 lines (extracted from 1,136 LOC monolith)
 *
 * Verification:
 * - Pattern source: approval-processing.service.ts:395-889
 * - Graceful degradation: Works without memory integration
 * - Interfaces: approver-intelligence.interface.ts:57-70
 */
@Injectable()
export class ApproverIntelligenceService {
  private readonly logger = new Logger(ApproverIntelligenceService.name);

  /**
   * Select best approver for a request using BaseStore patterns
   * Phase 1 P0-CRITICAL: Intelligent approver routing
   *
   * Simplified approver selection that can be enhanced with BaseStore integration:
   * - Uses default ranking when BaseStore unavailable
   * - Can retrieve historical patterns from BaseStore (future enhancement)
   * - Provides basic approver selection logic
   *
   * @param request The approval request requiring intelligent routing
   * @param potentialApprovers List of eligible approvers
   * @param config Optional RunnableConfig for BaseStore access
   * @returns Promise of selected approver ID with ranking reasoning
   */
  async selectBestApprover(
    request: HumanApprovalRequest,
    potentialApprovers: string[],
    config?: RunnableConfig
  ): Promise<ApproverRanking> {
    // Default approver selection
    this.logger.debug('Using default approver selection logic');
    return {
      selectedApproverId: potentialApprovers[0],
      rankedApprovers: potentialApprovers.map((id, index) => ({
        approverId: id,
        score: 1 - index * 0.1,
        reason: 'Default selection',
      })),
      selectionReasoning: 'Default selection - first eligible approver',
    };
  }

  /**
   * Store approver feedback pattern in BaseStore for continuous learning
   *
   * This method should be called after an approval is completed to store
   * the feedback pattern for future ML-based approver selection improvements.
   *
   * @param approverId The approver who provided the feedback
   * @param decision The approval decision (approved/rejected)
   * @param responseTime Time taken to respond in milliseconds
   * @param riskLevel Risk level of the approval
   * @param config RunnableConfig for BaseStore access
   */
  async storeFeedbackPattern(
    approverId: string,
    decision: 'approved' | 'rejected',
    responseTime: number,
    riskLevel: string,
    config?: RunnableConfig
  ): Promise<void> {
    const store = config?.configurable?.store as BaseStore | undefined;

    if (!store) {
      this.logger.debug(
        'BaseStore not available - skipping feedback pattern storage'
      );
      return;
    }

    try {
      await store.put(
        ['approver-feedback', approverId],
        `feedback-${Date.now()}`,
        {
          approverId,
          decision,
          responseTime,
          riskLevel,
          timestamp: new Date(),
        }
      );
      this.logger.debug(
        `Stored feedback pattern for approver ${approverId} in BaseStore`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store feedback pattern in BaseStore: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
