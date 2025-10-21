import { Injectable, Logger } from '@nestjs/common';
import type { AgentMemoryStats } from '../interfaces/agent-memory.interface';

/**
 * Agent memory statistics tracking service
 *
 * Responsibility: Single-purpose service for agent memory statistics
 * - Track memory access counts per agent
 * - Track memory creation counts per agent
 * - Calculate average search times
 * - Monitor context hit rates
 * - Provide statistics for agent monitoring
 *
 * Pattern: In-memory Map-based state management with stateful updates
 * Verification: Extracted from AgentMemoryBridgeService lines 39, 498-512, 869-900
 */
@Injectable()
export class AgentMemoryStatsService {
  private readonly logger = new Logger(AgentMemoryStatsService.name);
  private readonly agentStats = new Map<string, AgentMemoryStats>();

  constructor() {
    this.logger.log('AgentMemoryStatsService initialized');
  }

  /**
   * Get memory usage statistics for an agent
   *
   * Verification:
   * - Pattern source: AgentMemoryBridgeService lines 498-512
   * - Returns current statistics or default values
   * - Non-blocking: Always returns valid statistics object
   *
   * @param agentId - Agent identifier for statistics lookup
   * @returns Agent memory statistics
   */
  async getAgentMemoryStats(agentId: string): Promise<AgentMemoryStats> {
    const stats = this.agentStats.get(agentId);

    if (!stats) {
      return {
        agentId,
        memoriesAccessed: 0,
        memoriesCreated: 0,
        averageSearchTime: 0,
        contextHitRate: 0,
        lastAccess: new Date(),
      };
    }

    return stats;
  }

  /**
   * Update agent memory statistics
   *
   * Verification:
   * - Pattern source: AgentMemoryBridgeService lines 869-900
   * - Updates statistics incrementally
   * - Calculates average search time dynamically
   * - Maintains context hit rate
   * - Updates last access timestamp
   *
   * @param agentId - Agent identifier for statistics update
   * @param updates - Partial statistics updates (memoriesAccessed, memoriesCreated, searchTime)
   */
  updateAgentStats(
    agentId: string,
    updates: {
      memoriesAccessed?: number;
      memoriesCreated?: number;
      searchTime?: number;
    }
  ): void {
    const currentStats = this.agentStats.get(agentId) || {
      agentId,
      memoriesAccessed: 0,
      memoriesCreated: 0,
      averageSearchTime: 0,
      contextHitRate: 0.85,
      lastAccess: new Date(),
    };

    const newStats: AgentMemoryStats = {
      agentId,
      memoriesAccessed:
        currentStats.memoriesAccessed + (updates.memoriesAccessed || 0),
      memoriesCreated:
        currentStats.memoriesCreated + (updates.memoriesCreated || 0),
      averageSearchTime: updates.searchTime
        ? (currentStats.averageSearchTime + updates.searchTime) / 2
        : currentStats.averageSearchTime,
      contextHitRate: currentStats.contextHitRate,
      lastAccess: new Date(),
    };

    this.agentStats.set(agentId, newStats);
  }

  /**
   * Get all agent statistics (for testing and monitoring)
   *
   * @returns Map of all agent statistics
   */
  getStats(): Map<string, AgentMemoryStats> {
    return this.agentStats;
  }
}
