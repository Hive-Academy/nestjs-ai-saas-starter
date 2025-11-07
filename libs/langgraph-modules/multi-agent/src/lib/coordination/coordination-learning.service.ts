import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import { MultiAgentResult } from '../interfaces/multi-agent.interface';

/**
 * Coordination pattern learned from workflow execution
 * Represents a successful coordination sequence with performance metrics
 */
export interface CoordinationPattern {
  /**
   * Network ID this pattern was learned from
   */
  networkId: string;

  /**
   * Agent execution path (sequence of agent IDs)
   */
  agentPath: string[];

  /**
   * Success rate for this pattern (0-1)
   */
  successRate: number;

  /**
   * Average execution time in milliseconds
   */
  averageExecutionTime: number;

  /**
   * Number of times this pattern was observed
   */
  occurrences: number;

  /**
   * Context type this pattern applies to
   */
  contextType: string;

  /**
   * Performance score (0-1, higher is better)
   */
  performanceScore: number;

  /**
   * When this pattern was last observed
   */
  lastObserved: string;

  /**
   * When this pattern was first learned
   */
  firstObserved: string;
}

/**
 * Agent compatibility pattern
 * Tracks which agents work well together
 */
export interface CompatibilityPattern {
  /**
   * Primary agent ID
   */
  agentId: string;

  /**
   * Compatible agent IDs (work well together)
   */
  compatibleWith: string[];

  /**
   * Incompatible agent IDs (poor performance together)
   */
  incompatibleWith: string[];

  /**
   * Compatibility scores by agent ID (0-1)
   */
  compatibilityScores: Record<string, number>;

  /**
   * Context this compatibility applies to
   */
  context: string;
}

/**
 * Internal storage format for patterns in memory Store
 */
interface StoredPattern {
  /**
   * Pattern type identifier
   */
  type: 'coordination' | 'compatibility';

  /**
   * Pattern data (CoordinationPattern or CompatibilityPattern)
   */
  data: CoordinationPattern | CompatibilityPattern;

  /**
   * Metadata for tracking and analysis
   */
  metadata: {
    version: number;
    createdAt: string;
    updatedAt: string;
    executionCount: number;
  };
}

/**
 * Coordination Learning Service
 *
 * Learns coordination patterns from completed workflow executions in the BACKGROUND.
 * This service operates post-execution using fire-and-forget async patterns to ensure
 * learning does not block workflow completion.
 *
 * **Key Characteristics**:
 * - Fire-and-forget: Returns immediately, processes in background
 * - Non-blocking: Errors are caught and logged, never thrown
 * - Memory-based: Uses IMemoryAdapter.getStore() for pattern storage
 * - Post-execution: Only called AFTER workflow completes
 *
 * **Pattern Storage**:
 * - Namespace: `['coordination', 'patterns', networkId]`
 * - Keys: Pattern-specific identifiers (e.g., 'path_agent1_agent2_agent3')
 *
 * **Integration Points**:
 * - Called FROM: WorkflowExecutionCoordinationService (post-execution)
 * - Uses: IMemoryAdapter for pattern storage via Store interface
 */
@Injectable()
export class CoordinationLearningService {
  private readonly logger = new Logger(CoordinationLearningService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    if (this.memoryAdapter) {
      this.logger.log(
        'Coordination learning service initialized with memory adapter'
      );
    } else {
      this.logger.log(
        'Coordination learning service initialized without memory adapter (learning disabled)'
      );
    }
  }

  /**
   * Learn from a completed workflow execution
   * Fire-and-forget: Returns immediately, processes in background
   *
   * **CRITICAL**: This method NEVER throws errors - all exceptions are caught and logged
   *
   * @param execution Completed workflow execution result
   * @returns Promise<void> - Completes immediately (fire-and-forget)
   */
  async learnFromExecution(execution: MultiAgentResult): Promise<void> {
    if (!this.memoryAdapter) {
      // No memory adapter - learning disabled, return silently
      return;
    }

    try {
      // Extract network ID from execution metadata
      const networkId = this.extractNetworkId(execution);
      if (!networkId) {
        this.logger.warn(
          '[CoordinationLearning] Cannot learn: networkId not found in execution metadata'
        );
        return;
      }

      // Extract context type for pattern categorization
      const contextType = this.extractContextType(execution);

      // Learn coordination pattern from execution path
      await this.learnCoordinationPattern({
        networkId,
        executionPath: execution.executionPath,
        executionTime: execution.executionTime,
        success: execution.success,
        contextType,
      });

      // Learn agent compatibility patterns
      await this.learnCompatibilityPattern(execution);

      this.logger.debug(
        `[CoordinationLearning] Learned patterns from execution: ${networkId} (${execution.executionPath.length} agents, ${execution.executionTime}ms, success=${execution.success})`
      );
    } catch (error) {
      // CRITICAL: Don't throw, just log - this is fire-and-forget
      this.logger.warn(
        `[CoordinationLearning] Learning failed (non-blocking): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get learned coordination patterns for a network and context
   *
   * @param networkId Network identifier
   * @param context Context type to filter patterns
   * @returns Promise<CoordinationPattern[]> - Array of learned patterns
   */
  async getLearnedPatterns(
    networkId: string,
    context: string
  ): Promise<CoordinationPattern[]> {
    if (!this.memoryAdapter) {
      return [];
    }

    try {
      const store = this.memoryAdapter.getStore();
      const namespace = ['coordination', 'patterns', networkId];

      // List all patterns in the namespace
      const items = await store.list(namespace);

      // Filter and extract coordination patterns
      const patterns: CoordinationPattern[] = [];

      for (const item of items) {
        try {
          const stored = item as StoredPattern;
          if (
            stored.type === 'coordination' &&
            (stored.data as CoordinationPattern).contextType === context
          ) {
            patterns.push(stored.data as CoordinationPattern);
          }
        } catch (error) {
          // Skip invalid pattern
          this.logger.warn(
            `[CoordinationLearning] Invalid pattern in storage: ${error}`
          );
        }
      }

      // Sort by performance score (highest first)
      patterns.sort((a, b) => b.performanceScore - a.performanceScore);

      return patterns;
    } catch (error) {
      this.logger.warn(
        `[CoordinationLearning] Failed to get learned patterns: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  /**
   * Analyze agent compatibility from execution result
   *
   * @param execution Completed workflow execution
   * @returns CompatibilityPattern - Agent compatibility analysis
   */
  analyzeAgentCompatibility(execution: MultiAgentResult): CompatibilityPattern {
    const path = execution.executionPath;

    // Extract primary agent (last in path for successful executions)
    const primaryAgent =
      execution.success && path.length > 0
        ? path[path.length - 1]
        : path[0] || 'unknown';

    // Calculate compatibility scores
    const compatibilityScores: Record<string, number> = {};
    const compatibleWith: string[] = [];
    const incompatibleWith: string[] = [];

    // Analyze agent sequences
    for (let i = 0; i < path.length; i++) {
      const agentId = path[i];
      if (agentId === primaryAgent) continue;

      // Calculate compatibility score based on execution success and position
      const positionScore =
        1 - Math.abs(path.indexOf(primaryAgent) - i) / path.length;
      const successScore = execution.success ? 0.8 : 0.3;
      const score = (positionScore + successScore) / 2;

      compatibilityScores[agentId] = score;

      if (score >= 0.6) {
        compatibleWith.push(agentId);
      } else if (score < 0.4) {
        incompatibleWith.push(agentId);
      }
    }

    return {
      agentId: primaryAgent,
      compatibleWith,
      incompatibleWith,
      compatibilityScores,
      context: this.extractContextType(execution),
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Learn coordination pattern from execution
   * Stores pattern in memory Store with deduplication and aggregation
   */
  private async learnCoordinationPattern(data: {
    networkId: string;
    executionPath: string[];
    executionTime: number;
    success: boolean;
    contextType: string;
  }): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const store = this.memoryAdapter.getStore();
      const namespace = ['coordination', 'patterns', data.networkId];

      // Generate pattern key from agent path
      const patternKey = `path_${data.executionPath.join('_')}`;

      // Try to get existing pattern
      const existingItem = await store.get(namespace, patternKey);
      let pattern: CoordinationPattern;
      let metadata: StoredPattern['metadata'];

      if (existingItem) {
        // Update existing pattern
        const stored = existingItem as StoredPattern;
        const existing = stored.data as CoordinationPattern;

        const newOccurrences = existing.occurrences + 1;
        const newSuccessRate = data.success
          ? (existing.successRate * existing.occurrences + 1) / newOccurrences
          : (existing.successRate * existing.occurrences) / newOccurrences;

        pattern = {
          networkId: data.networkId,
          agentPath: data.executionPath,
          successRate: newSuccessRate,
          averageExecutionTime:
            (existing.averageExecutionTime * existing.occurrences +
              data.executionTime) /
            newOccurrences,
          occurrences: newOccurrences,
          contextType: data.contextType,
          performanceScore: this.calculatePerformanceScore(
            newSuccessRate,
            data.executionTime
          ),
          lastObserved: new Date().toISOString(),
          firstObserved: existing.firstObserved,
        };

        metadata = {
          ...stored.metadata,
          updatedAt: new Date().toISOString(),
          executionCount: newOccurrences,
        };
      } else {
        // Create new pattern
        pattern = {
          networkId: data.networkId,
          agentPath: data.executionPath,
          successRate: data.success ? 1 : 0,
          averageExecutionTime: data.executionTime,
          occurrences: 1,
          contextType: data.contextType,
          performanceScore: this.calculatePerformanceScore(
            data.success ? 1 : 0,
            data.executionTime
          ),
          lastObserved: new Date().toISOString(),
          firstObserved: new Date().toISOString(),
        };

        metadata = {
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          executionCount: 1,
        };
      }

      // Store pattern
      const storedPattern: StoredPattern = {
        type: 'coordination',
        data: pattern,
        metadata,
      };

      await store.put(namespace, patternKey, storedPattern);
    } catch (error) {
      // Don't throw - just log
      this.logger.warn(
        `[CoordinationLearning] Failed to learn coordination pattern: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Learn agent compatibility patterns from execution
   * Stores compatibility data in memory Store
   */
  private async learnCompatibilityPattern(
    execution: MultiAgentResult
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const compatibility = this.analyzeAgentCompatibility(execution);
      const networkId = this.extractNetworkId(execution);
      if (!networkId) return;

      const store = this.memoryAdapter.getStore();
      const namespace = ['coordination', 'patterns', networkId];

      // Store compatibility pattern for primary agent
      const patternKey = `compatibility_${compatibility.agentId}`;

      const storedPattern: StoredPattern = {
        type: 'compatibility',
        data: compatibility,
        metadata: {
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          executionCount: 1,
        },
      };

      await store.put(namespace, patternKey, storedPattern);
    } catch (error) {
      // Don't throw - just log
      this.logger.warn(
        `[CoordinationLearning] Failed to learn compatibility pattern: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Extract network ID from execution result
   */
  private extractNetworkId(execution: MultiAgentResult): string | null {
    // Try to extract from finalState.metadata
    const metadata = execution.finalState?.metadata;
    if (metadata && typeof metadata === 'object' && 'networkId' in metadata) {
      return String(metadata.networkId);
    }

    // Try to extract from finalState.current
    if (execution.finalState?.current) {
      return execution.finalState.current;
    }

    return null;
  }

  /**
   * Extract context type from execution result
   * Used for categorizing patterns
   */
  private extractContextType(execution: MultiAgentResult): string {
    const metadata = execution.finalState?.metadata;
    if (metadata && typeof metadata === 'object' && 'contextType' in metadata) {
      return String(metadata.contextType);
    }

    // Default context based on execution characteristics
    if (execution.executionPath.length === 1) {
      return 'single-agent';
    } else if (execution.executionPath.length <= 3) {
      return 'simple-coordination';
    } else {
      return 'complex-coordination';
    }
  }

  /**
   * Calculate performance score based on success rate and execution time
   * Returns a score from 0 to 1 (higher is better)
   */
  private calculatePerformanceScore(
    successRate: number,
    executionTime: number
  ): number {
    // Weight success rate heavily (80%), time efficiency (20%)
    const timeScore = Math.max(0, 1 - executionTime / 30000); // Normalize to 30s max
    return successRate * 0.8 + timeScore * 0.2;
  }
}
