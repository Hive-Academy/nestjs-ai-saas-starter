import { Injectable, Logger } from '@nestjs/common';
import { InjectNeogma, NeogmaService, Safe } from '@hive-academy/nestjs-neo4j';
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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const threadIdParam = bindParam.add(memory.threadId);
      const memoryIdParam = bindParam.add(memory.id);
      const contentParam = bindParam.add(memory.content);
      const typeParam = bindParam.add(memory.metadata.type);
      const importanceParam = bindParam.add(memory.metadata.importance || 0.5);
      const createdAtParam = bindParam.add(memory.createdAt.toISOString());
      const accessCountParam = bindParam.add(memory.accessCount);

      // Build base query for Thread and Memory nodes
      queryBuilder.raw(
        `MERGE (t:Thread {id: $${threadIdParam}})
           SET t.lastActivity = datetime()
           MERGE (m:Memory {id: $${memoryIdParam}})
           SET m.content = $${contentParam},
               m.type = $${typeParam},
               m.importance = $${importanceParam},
               m.createdAt = datetime($${createdAtParam}),
               m.accessCount = $${accessCountParam}
           MERGE (t)-[:CONTAINS]->(m)`
      );

      // Add user relationship if userId exists
      if (memory.metadata.userId) {
        const userIdParam = bindParam.add(memory.metadata.userId);
        queryBuilder.raw(
          `MERGE (u:User {id: $${userIdParam}})
           MERGE (u)-[:HAS_MEMORY]->(m)`
        );
      }

      queryBuilder.return('m.id as memoryId');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);

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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

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

      const memoriesParam = bindParam.add(memoryData);

      queryBuilder.raw(
        `UNWIND $${memoriesParam} as memoryData
           MERGE (t:Thread {id: memoryData.threadId})
           SET t.lastActivity = datetime()
           MERGE (m:Memory {id: memoryData.memoryId})
           SET m.content = memoryData.content,
               m.type = memoryData.type,
               m.importance = memoryData.importance,
               m.createdAt = datetime(memoryData.createdAt),
               m.accessCount = memoryData.accessCount
           MERGE (t)-[:CONTAINS]->(m)
           RETURN count(m) as created`
      );

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      await this.neogma.run(cypher, params);

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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const memoryIdsParam = bindParam.add([...memoryIds]);

      queryBuilder.raw(
        `MATCH (m:Memory)
           WHERE m.id IN $${memoryIdsParam}
           DETACH DELETE m
           RETURN count(m) as deleted`
      );

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

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

      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const fromMemoryIdParam = bindParam.add(fromMemoryId);
      const toMemoryIdParam = bindParam.add(toMemoryId);
      const strengthParam = bindParam.add(relationshipStrength);
      const agentIdParam = bindParam.add(agentState.current);
      const threadIdParam = bindParam.add(agentState.threadId);
      const userIdParam = bindParam.add(agentState.userId);

      queryBuilder
        .match(`(from:Memory {id: $${fromMemoryIdParam}})`)
        .match(`(to:Memory {id: $${toMemoryIdParam}})`)
        .create(
          `(from)-[r:${relationshipType} {
          strength: $${strengthParam},
          agentId: $${agentIdParam},
          threadId: $${threadIdParam},
          userId: $${userIdParam},
          createdAt: datetime()
        }]->(to)`
        )
        .return('id(r) as relationshipId');

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const startMemoryIdParam = bindParam.add(startMemoryId);
      const userIdParam = bindParam.add(agentState.userId);
      const threadIdParam = bindParam.add(agentState.threadId);
      const agentIdParam = bindParam.add(agentState.current);
      const limitParam = bindParam.add(20);

      queryBuilder
        .match(
          `path = (start:Memory {id: $${startMemoryIdParam}})-[*1..${maxDepth}]-(related:Memory)`
        )
        .where(
          `ALL(r IN relationships(path) WHERE
          r.userId = $${userIdParam} AND (r.threadId = $${threadIdParam} OR r.agentId = $${agentIdParam})
        )`
        )
        .return(
          `
          related,
          [r IN relationships(path) | r.strength] as strengths,
          length(path) as depth
        `
        )
        .orderBy(
          'length(path) ASC, reduce(sum = 0, s IN [r IN relationships(path) | r.strength] | sum + s) DESC'
        )
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

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
        const queryBuilder = this.neogma.createQueryBuilder();
        const bindParam = queryBuilder.getBindParam();

        const fromIdParam = bindParam.add(conversationMemories[i]);
        const toIdParam = bindParam.add(conversationMemories[i + 1]);
        const threadIdParam = bindParam.add(threadId);
        const sequenceParam = bindParam.add(i + 1);

        queryBuilder
          .match(`(from:Memory {id: $${fromIdParam}})`)
          .match(`(to:Memory {id: $${toIdParam}})`)
          .create(
            `(from)-[r:FOLLOWS_IN_CONVERSATION {
            threadId: $${threadIdParam},
            sequence: $${sequenceParam},
            createdAt: datetime()
          }]->(to)`
          )
          .return('id(r) as relationshipId');

        const cypher = queryBuilder.getStatement();
        const params = bindParam.get();
        await this.neogma.run(cypher, params);
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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const userIdParam = bindParam.add(userId);
      const limitDaysParam = bindParam.add(limitDays);
      const limitParam = bindParam.add(10);

      queryBuilder
        .match('(m:Memory)-[r:FOLLOWS_IN_CONVERSATION]->(next:Memory)')
        .where(
          `r.createdAt > datetime() - duration({days: $${limitDaysParam}}) AND (m.properties.userId = $${userIdParam} OR next.properties.userId = $${userIdParam})`
        )
        .with('r.threadId as threadId, count(*) as messageCount')
        .return(
          `
          threadId,
          messageCount,
          avg(messageCount) as avgMessagesPerThread,
          collect(threadId)[0..5] as recentThreads
        `
        )
        .orderBy('messageCount DESC')
        .limit(`$${limitParam}`);

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

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
            const queryBuilder = this.neogma.createQueryBuilder();
            const bindParam = queryBuilder.getBindParam();

            const id1Param = bindParam.add(memoryIds[i]);
            const id2Param = bindParam.add(memoryIds[j]);
            const similarityParam = bindParam.add(similarity);

            queryBuilder
              .match(`(m1:Memory {id: $${id1Param}})`)
              .match(`(m2:Memory {id: $${id2Param}})`)
              .create(
                `(m1)-[r:SEMANTICALLY_SIMILAR {
                similarity: $${similarityParam},
                createdAt: datetime()
              }]->(m2)`
              )
              .return('id(r) as relationshipId');

            const cypher = queryBuilder.getStatement();
            const params = bindParam.get();
            await this.neogma.run(cypher, params);

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
      const queryBuilder = this.neogma.createQueryBuilder();
      const bindParam = queryBuilder.getBindParam();

      const id1Param = bindParam.add(memoryId1);
      const id2Param = bindParam.add(memoryId2);

      queryBuilder
        .match(`(m1:Memory {id: $${id1Param}})`)
        .match(`(m2:Memory {id: $${id2Param}})`)
        .return(
          'm1.properties.content as content1, m2.properties.content as content2'
        );

      const cypher = queryBuilder.getStatement();
      const params = bindParam.get();
      const result = await this.neogma.run(cypher, params);

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
