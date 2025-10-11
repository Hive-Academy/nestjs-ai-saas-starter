import { Injectable, Logger, Inject } from '@nestjs/common';
import type {
  AgentMemoryContext,
  UserMemoryPatterns,
} from '../interfaces/agent-memory.interface';
import type { MemoryEntry } from '../interfaces/memory.interface';
import type { IVectorService } from '../interfaces/vector-service.interface';
import { AgentMemoryCoreService } from './agent-memory-core.service';

/**
 * Memory context retrieval service for agents
 *
 * Responsibility: Single-purpose service for agent memory context assembly
 * - Retrieve comprehensive memory context (thread + user + agent scopes)
 * - Dual search strategy (general thread context + agent-specific memories)
 * - Context merging with deduplication
 * - User pattern extraction from memories
 *
 * Pattern: Coordinates AgentMemoryCoreService + VectorService for context retrieval
 * Verification: Extracted from AgentMemoryBridgeService lines 69-183, 955-995
 */
@Injectable()
export class AgentMemoryContextService {
  private readonly logger = new Logger(AgentMemoryContextService.name);

  constructor(
    private readonly coreService: AgentMemoryCoreService,
    @Inject('IVectorService')
    private readonly vectorService: IVectorService
  ) {
    this.logger.log('AgentMemoryContextService initialized');
  }

  /**
   * Get comprehensive memory context for an agent during execution
   *
   * Verification:
   * - Pattern source: phase-2-architecture.md:275-434
   * - Uses vectorService.searchMemoriesSimilar() (verified in vector-service.interface.ts:72)
   * - Dual context retrieval: general thread context + agent-specific memories
   * - Vector search PRIMARY, no graph enrichment (vector-only context retrieval)
   * - Context merging with deduplication by memory ID
   * - Confidence calculation based on result count
   * - Graceful degradation on failure (empty context)
   *
   * @param agentId - Agent identifier
   * @param threadId - Thread identifier
   * @param query - Optional query for context retrieval
   * @param userId - Optional user identifier for user-scoped memories
   * @returns Comprehensive memory context with thread/user/agent memories
   */
  async getAgentMemoryContext(
    agentId: string,
    threadId: string,
    query?: string,
    userId?: string
  ): Promise<AgentMemoryContext> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Getting memory context for agent ${agentId} in thread ${threadId}`
      );

      // 1. Vector search for general thread context (PRIMARY - must succeed)
      // Pattern: Direct vectorService call with thread/user filtering
      const searchResults = await this.vectorService.searchMemoriesSimilar(
        query || `agent context for ${agentId}`,
        {
          threadId, // Thread filter
          userId, // User filter
          type: ['conversation', 'agent_action'], // Memory types
        },
        20 // Limit for general context
      );

      // 2. Agent-specific search with namespace filtering
      // Uses AgentMemoryCoreService's searchAgentMemories() method
      const agentSpecificMemories = await this.coreService.searchAgentMemories(
        agentId,
        query || '',
        {
          threadId,
          userId,
          limit: 5,
          minRelevance: 0.6,
        }
      );

      // 3. Combine results with deduplication by memory ID
      const allMemories = [
        ...searchResults,
        ...agentSpecificMemories.filter(
          // Avoid duplicates
          (agentMem) => !searchResults.some((mem) => mem.id === agentMem.id)
        ),
      ];

      // 4. Categorize memories by type (logic unchanged)
      const threadMemories = allMemories.filter(
        (m) => m.metadata?.threadId === threadId
      );
      const userMemories = allMemories.filter(
        (m) =>
          m.metadata?.userId === agentId && m.metadata?.threadId !== threadId
      );
      const agentMemoriesFiltered = allMemories.filter(
        (m) => m.metadata?.agentId === agentId
      );

      // 5. Calculate confidence based on result count
      const confidence = searchResults.length > 0 ? 0.8 : 0.5;

      // 6. Extract user patterns from memories
      const userPatterns = this.extractPatternsFromMemories(
        allMemories,
        agentId
      );

      const context: AgentMemoryContext = {
        threadMemories,
        userMemories,
        agentMemories: agentMemoriesFiltered,
        userPatterns: userPatterns || {
          userId: agentId || 'unknown',
          commonTopics: [],
          interactionFrequency: {},
          preferredMemoryTypes: [],
          averageSessionLength: 0,
          totalSessions: 0,
          lastInteraction: undefined,
        },
        relevanceScore: confidence,
        contextWindow: allMemories.length,
      };

      this.logger.debug(
        `Retrieved ${
          allMemories.length
        } memories for agent ${agentId} (confidence: ${confidence}, time: ${
          Date.now() - startTime
        }ms)`
      );

      return context;
    } catch (error) {
      this.logger.error(
        `Failed to get memory context for agent ${agentId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      // Return empty context on failure (graceful degradation)
      return {
        threadMemories: [],
        userMemories: [],
        agentMemories: [],
        userPatterns: {
          userId: agentId || 'unknown',
          commonTopics: [],
          interactionFrequency: {},
          preferredMemoryTypes: [],
          averageSessionLength: 0,
          totalSessions: 0,
          lastInteraction: undefined,
        } as UserMemoryPatterns,
        relevanceScore: 0,
        contextWindow: 0,
      };
    }
  }

  /**
   * Extract user patterns from memories (fallback when graph adapter unavailable)
   *
   * Verification:
   * - Pattern source: AgentMemoryBridgeService lines 955-995
   * - Analyzes memory metadata for pattern recognition
   * - Extracts topics, interaction frequency, memory types
   * - Calculates session statistics
   *
   * @param memories - Array of memory entries to analyze
   * @param userId - User identifier for pattern association
   * @returns User memory patterns
   */
  private extractPatternsFromMemories(
    memories: readonly MemoryEntry[],
    userId: string
  ): UserMemoryPatterns {
    const topics = new Set<string>();
    const interactions: Record<string, number> = {};
    const memoryTypes: Record<string, number> = {};

    for (const memory of memories) {
      // Extract topics from metadata tags
      const tags = memory.metadata?.tags;
      if (tags) {
        try {
          const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
          if (Array.isArray(parsedTags)) {
            parsedTags.forEach((tag) => topics.add(String(tag)));
          }
        } catch {
          // If not JSON, treat as single tag
          topics.add(String(tags));
        }
      }

      // Count interaction types
      const type = memory.metadata?.type || 'unknown';
      interactions[type] = (interactions[type] || 0) + 1;
      memoryTypes[type] = (memoryTypes[type] || 0) + 1;
    }

    return {
      userId,
      commonTopics: Array.from(topics).slice(0, 10),
      interactionFrequency: interactions,
      preferredMemoryTypes: Object.keys(memoryTypes)
        .sort((a, b) => memoryTypes[b] - memoryTypes[a])
        .slice(0, 5),
      averageSessionLength: memories.length > 0 ? memories.length / 10 : 0,
      totalSessions: Math.max(Math.floor(memories.length / 10), 1),
      lastInteraction:
        memories.length > 0 ? new Date(memories[0].createdAt) : undefined,
    };
  }
}
