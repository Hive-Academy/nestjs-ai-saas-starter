import { Injectable, Logger } from '@nestjs/common';
import {
  InjectNeogma,
  NeogmaService,
  Safe,
  ParameterBindingUtility,
} from '@hive-academy/nestjs-neo4j';
import type { AgentState, MemoryEntry } from '@hive-academy/langgraph-memory';
import { Memory } from '../../entities/neo4j/memory.entity';
import { GraphHelpersService } from './graph-helpers.service';

/**
 * Graph Agent Service
 *
 * Handles agent-aware memory operations including relationship creation,
 * conversation flow management, and pattern analysis.
 * Extracted from memory-graph.repository.ts (lines 255-541).
 */
@Injectable()
export class GraphAgentService {
  private readonly logger = new Logger(GraphAgentService.name);

  constructor(
    @InjectNeogma() private readonly neogma: NeogmaService,
    private readonly helpers: GraphHelpersService
  ) {}

  // ============================================================================
  // PRIORITY 0: CORE MEMORY TRACKING OPERATIONS (MOVED FROM LIBRARY)
  // ============================================================================

  /**
   * Track a memory entry in the graph database
   * Moved from MemoryGraphService.trackMemory() (lines 38-78)
   */
  @Safe()
  async trackMemory(memory: MemoryEntry): Promise<void> {
    try {
      // Build base query with user relationship conditionally
      const baseQuery = `
        MERGE (t:Thread {id: $threadId})
        SET t.lastActivity = datetime()
        MERGE (m:Memory {id: $memoryId})
        SET m.content = $content,
            m.type = $type,
            m.importance = $importance,
            m.createdAt = datetime($createdAt),
            m.accessCount = $accessCount
        MERGE (t)-[:CONTAINS]->(m)
        ${
          memory.metadata.userId
            ? 'MERGE (u:User {id: $userId}) MERGE (u)-[:HAS_MEMORY]->(m)'
            : ''
        }
        RETURN m.id as memoryId
      `;

      // Auto-bind all parameters
      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        threadId: memory.threadId,
        memoryId: memory.id,
        content: memory.content,
        type: memory.metadata.type,
        importance: memory.metadata.importance || 0.5,
        createdAt: memory.createdAt.toISOString(),
        accessCount: memory.accessCount,
        userId: memory.metadata.userId, // Auto-skipped if undefined
      });

      await this.neogma.run(query, params);

      this.logger.debug(`Tracked memory ${memory.id} in graph`);
    } catch (error) {
      this.logger.warn(`Failed to track memory ${memory.id} in graph`, error);
      throw new Error(
        `Failed to track memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Track multiple memories in batch
   * Moved from MemoryGraphService.trackMemoriesBatch() (lines 83-121)
   */
  @Safe()
  async trackMemoriesBatch(memories: readonly MemoryEntry[]): Promise<void> {
    if (memories.length === 0) return;

    try {
      // Prepare batch data with content length limits
      const memoryData = memories.map((memory) => ({
        threadId: memory.threadId,
        memoryId: memory.id,
        content: memory.content.substring(0, 1000), // Limit content length
        type: memory.metadata.type,
        importance: memory.metadata.importance || 0.5,
        createdAt: memory.createdAt.toISOString(),
        accessCount: memory.accessCount,
      }));

      const baseQuery = `
        UNWIND $memories as memoryData
        MERGE (t:Thread {id: memoryData.threadId})
        SET t.lastActivity = datetime()
        MERGE (m:Memory {id: memoryData.memoryId})
        SET m.content = memoryData.content,
            m.type = memoryData.type,
            m.importance = memoryData.importance,
            m.createdAt = datetime(memoryData.createdAt),
            m.accessCount = memoryData.accessCount
        MERGE (t)-[:CONTAINS]->(m)
        RETURN count(m) as created
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        memories: memoryData,
      });

      await this.neogma.run(query, params);

      this.logger.debug(`Batch tracked ${memories.length} memories in graph`);
    } catch (error) {
      this.logger.warn(`Failed to batch track memories in graph`, error);
      throw new Error(
        `Failed to batch track memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Remove memories from graph with DETACH DELETE
   * Moved from MemoryGraphService.removeMemories() (lines 126-145)
   */
  @Safe()
  async deleteMemories(memoryIds: readonly string[]): Promise<number> {
    if (memoryIds.length === 0) return 0;

    try {
      const baseQuery = `
        MATCH (m:Memory)
        WHERE m.id IN $memoryIds
        DETACH DELETE m
        RETURN count(m) as deleted
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        memoryIds: [...memoryIds],
      });

      const result = await this.neogma.run(query, params);

      const deletedCount = Number(result.records[0]?.get('deleted')) || 0;

      this.logger.debug(`Removed ${deletedCount} memories from graph`);

      return deletedCount;
    } catch (error) {
      this.logger.warn(`Failed to remove memories from graph`, error);
      throw new Error(
        `Failed to delete memories: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ============================================================================
  // AGENT-AWARE MEMORY OPERATIONS
  // ============================================================================

  @Safe()
  async createAgentMemoryRelationship(
    fromMemoryId: string,
    toMemoryId: string,
    agentState: AgentState,
    relationshipType: string
  ): Promise<string> {
    try {
      const relationshipStrength = this.calculateRelationshipStrength(
        agentState,
        relationshipType
      );

      const baseQuery = `
        MATCH (from:Memory {id: $fromMemoryId})
        MATCH (to:Memory {id: $toMemoryId})
        CREATE (from)-[r:${relationshipType} {
          strength: $strength,
          agentId: $agentId,
          threadId: $threadId,
          userId: $userId,
          createdAt: datetime()
        }]->(to)
        RETURN id(r) as relationshipId
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        fromMemoryId,
        toMemoryId,
        strength: relationshipStrength,
        agentId: agentState.current,
        threadId: agentState.threadId,
        userId: agentState.userId,
      });

      const result = await this.neogma.run(query, params);

      const relationshipId =
        result.records[0]?.get('relationshipId')?.toString() || '';

      this.logger.debug(
        `Created agent memory relationship ${relationshipId} from ${fromMemoryId} to ${toMemoryId}`
      );

      return relationshipId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create agent memory relationship: ${errorMsg}`
      );
    }
  }

  @Safe()
  async findRelatedMemoriesForAgent(
    startMemoryId: string,
    agentState: AgentState,
    maxDepth = 2
  ): Promise<{
    relatedMemories: Array<{
      memory: Memory;
      relationshipStrengths: number[];
      depth: number;
    }>;
    totalFound: number;
  }> {
    try {
      const baseQuery = `
        MATCH path = (start:Memory {id: $startMemoryId})-[*1..${maxDepth}]-(related:Memory)
        WHERE ALL(r IN relationships(path) WHERE
          r.userId = $userId AND (r.threadId = $threadId OR r.agentId = $agentId)
        )
        RETURN
          related,
          [r IN relationships(path) | r.strength] as strengths,
          length(path) as depth
        ORDER BY length(path) ASC, reduce(sum = 0, s IN [r IN relationships(path) | r.strength] | sum + s) DESC
        LIMIT $limit
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        startMemoryId,
        userId: agentState.userId,
        threadId: agentState.threadId,
        agentId: agentState.current,
        limit: 20,
      });

      const result = await this.neogma.run(query, params);

      const relatedMemories = result.records.map((record) => ({
        memory: this.helpers.mapNodeToMemory(
          record.get('related')?.properties || {}
        ),
        relationshipStrengths: record.get('strengths') || [],
        depth: Number(record.get('depth')) || 0,
      }));

      return {
        relatedMemories,
        totalFound: result.records.length,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find agent-related memories: ${errorMsg}`);
    }
  }

  @Safe()
  async createConversationFlow(
    threadId: string,
    conversationMemories: string[]
  ): Promise<void> {
    if (conversationMemories.length < 2) {
      return;
    }

    try {
      for (let i = 0; i < conversationMemories.length - 1; i++) {
        const baseQuery = `
          MATCH (from:Memory {id: $fromId})
          MATCH (to:Memory {id: $toId})
          CREATE (from)-[r:FOLLOWS_IN_CONVERSATION {
            threadId: $threadId,
            sequence: $sequence,
            createdAt: datetime()
          }]->(to)
          RETURN id(r) as relationshipId
        `;

        const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
          fromId: conversationMemories[i],
          toId: conversationMemories[i + 1],
          threadId,
          sequence: i + 1,
        });

        await this.neogma.run(query, params);
      }

      this.logger.debug(
        `Created conversation flow for thread ${threadId} with ${conversationMemories.length} memories`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create conversation flow: ${errorMsg}`);
    }
  }

  @Safe()
  async analyzeConversationPatterns(
    userId: string,
    limitDays = 30
  ): Promise<{
    conversationPatterns: Array<{
      threadId: string;
      messageCount: number;
      avgMessagesPerThread: number;
    }>;
    recentThreads: string[];
  }> {
    try {
      const baseQuery = `
        MATCH (m:Memory)-[r:FOLLOWS_IN_CONVERSATION]->(next:Memory)
        WHERE r.createdAt > datetime() - duration({days: $limitDays})
          AND (m.properties.userId = $userId OR next.properties.userId = $userId)
        WITH r.threadId as threadId, count(*) as messageCount
        RETURN
          threadId,
          messageCount,
          avg(messageCount) as avgMessagesPerThread,
          collect(threadId)[0..5] as recentThreads
        ORDER BY messageCount DESC
        LIMIT $limit
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        userId,
        limitDays,
        limit: 10,
      });

      const result = await this.neogma.run(query, params);

      const conversationPatterns = result.records.map((record) => ({
        threadId: record.get('threadId') || '',
        messageCount: Number(record.get('messageCount')) || 0,
        avgMessagesPerThread: Number(record.get('avgMessagesPerThread')) || 0,
      }));

      const recentThreads = result.records[0]?.get('recentThreads') || [];

      return {
        conversationPatterns,
        recentThreads,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze conversation patterns: ${errorMsg}`);
    }
  }

  @Safe()
  async buildSemanticRelationships(
    memoryIds: string[],
    similarityThreshold = 0.7
  ): Promise<number> {
    if (memoryIds.length < 2) {
      return 0;
    }

    let relationshipsCreated = 0;

    try {
      for (let i = 0; i < memoryIds.length; i++) {
        for (let j = i + 1; j < memoryIds.length; j++) {
          const similarity = await this.calculateTextSimilarity(
            memoryIds[i],
            memoryIds[j]
          );

          if (similarity >= similarityThreshold) {
            const baseQuery = `
              MATCH (m1:Memory {id: $id1})
              MATCH (m2:Memory {id: $id2})
              CREATE (m1)-[r:SEMANTICALLY_SIMILAR {
                similarity: $similarity,
                createdAt: datetime()
              }]->(m2)
              RETURN id(r) as relationshipId
            `;

            const { query, params } = ParameterBindingUtility.autoBind(
              baseQuery,
              {
                id1: memoryIds[i],
                id2: memoryIds[j],
                similarity,
              }
            );

            await this.neogma.run(query, params);

            relationshipsCreated++;
          }
        }
      }

      this.logger.debug(
        `Built ${relationshipsCreated} semantic relationships from ${memoryIds.length} memories`
      );

      return relationshipsCreated;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to build semantic relationships: ${errorMsg}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateRelationshipStrength(
    agentState: AgentState,
    relationshipType: string
  ): number {
    let strength = 0.5;

    if (relationshipType === 'FOLLOWS_IN_CONVERSATION') strength += 0.3;
    if (relationshipType === 'SEMANTICALLY_SIMILAR') strength += 0.2;
    if (agentState.messages && agentState.messages.length > 0) strength += 0.1;

    return Math.min(strength, 1.0);
  }

  private async calculateTextSimilarity(
    memoryId1: string,
    memoryId2: string
  ): Promise<number> {
    try {
      const baseQuery = `
        MATCH (m1:Memory {id: $id1})
        MATCH (m2:Memory {id: $id2})
        RETURN m1.properties.content as content1, m2.properties.content as content2
      `;

      const { query, params } = ParameterBindingUtility.autoBind(baseQuery, {
        id1: memoryId1,
        id2: memoryId2,
      });

      const result = await this.neogma.run(query, params);

      if (result.records.length === 0) return 0;

      const content1 = result.records[0].get('content1') || '';
      const content2 = result.records[0].get('content2') || '';

      const words1 = new Set(content1.toLowerCase().split(/\s+/));
      const words2 = new Set(content2.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter((x) => words2.has(x)));
      const union = new Set([...words1, ...words2]);

      return intersection.size / union.size;
    } catch (error) {
      this.logger.warn(`Failed to calculate text similarity: ${error}`);
      return 0;
    }
  }
}
