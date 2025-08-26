import { Injectable, Logger, Inject } from '@nestjs/common';
import { IGraphService } from '../interfaces/graph-service.interface';
import type { MemoryEntry, MemoryConfig } from '../interfaces/memory.interface';
import { MEMORY_CONFIG } from '../constants/memory.constants';
// import { wrapMemoryError } from '../errors/memory.errors'; // Not used in this service

/**
 * Memory graph service using adapter pattern for graph database integration
 *
 * Handles:
 * - Memory relationship tracking through adapter abstraction
 * - Thread graph building via IGraphService
 * - Semantic relationship discovery with configurable backends
 * - Conversation flow analysis through adapter delegation
 * - 100% backward compatibility maintained
 */
@Injectable()
export class MemoryGraphService {
  private readonly logger = new Logger(MemoryGraphService.name);

  constructor(
    private readonly graphService: IGraphService,
    @Inject(MEMORY_CONFIG) private readonly _config: MemoryConfig // Reserved for future use
  ) {
    // Graph service initialized - config reserved for future use
  }

  /**
   * Track a memory in the graph database
   */
  async trackMemory(memory: MemoryEntry): Promise<void> {
    try {
      // Create memory node and connect to thread
      const cypher = `
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
            ? `
          MERGE (u:User {id: $userId})
          MERGE (u)-[:HAS_MEMORY]->(m)
        `
            : ''
        }
        RETURN m.id as memoryId
      `;

      await this.graphService.executeCypher(cypher, {
        threadId: memory.threadId,
        memoryId: memory.id,
        content: memory.content,
        type: memory.metadata.type,
        importance: memory.metadata.importance || 0.5,
        createdAt: memory.createdAt.toISOString(),
        accessCount: memory.accessCount,
        userId: memory.metadata.userId,
      });

      this.logger.debug(`Tracked memory ${memory.id} in graph`);
    } catch (error) {
      // Graceful degradation - don't fail memory storage if graph tracking fails
      this.logger.warn(`Failed to track memory ${memory.id} in graph`, error);
    }
  }

  /**
   * Track multiple memories in batch
   */
  async trackMemoriesBatch(memories: readonly MemoryEntry[]): Promise<void> {
    if (memories.length === 0) return;

    try {
      // Batch create memories and relationships
      const cypher = `
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

      const memoryData = memories.map((memory) => ({
        threadId: memory.threadId,
        memoryId: memory.id,
        content: memory.content.substring(0, 1000), // Limit content length
        type: memory.metadata.type,
        importance: memory.metadata.importance || 0.5,
        createdAt: memory.createdAt.toISOString(),
        accessCount: memory.accessCount,
      }));

      await this.graphService.executeCypher(cypher, { memories: memoryData });

      this.logger.debug(`Batch tracked ${memories.length} memories in graph`);
    } catch (error) {
      this.logger.warn(`Failed to batch track memories in graph`, error);
    }
  }

  /**
   * Remove memories from graph
   */
  async removeMemories(memoryIds: readonly string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    try {
      const cypher = `
        MATCH (m:Memory)
        WHERE m.id IN $memoryIds
        DETACH DELETE m
        RETURN count(m) as deleted
      `;

      await this.graphService.executeCypher(cypher, { memoryIds: [...memoryIds] });

      this.logger.debug(`Removed ${memoryIds.length} memories from graph`);
    } catch (error) {
      this.logger.warn(`Failed to remove memories from graph`, error);
    }
  }

  /**
   * Build semantic relationships between memories
   */
  async buildSemanticRelationships(): Promise<void> {
    try {
      // Find memories with similar content or shared tags
      const cypher = `
        MATCH (m1:Memory), (m2:Memory)
        WHERE m1.id <> m2.id
        AND (
          m1.type = m2.type OR
          size(apoc.text.split(toLower(m1.content), ' ')) > 5 AND
          size([word IN apoc.text.split(toLower(m1.content), ' ') 
                WHERE word IN apoc.text.split(toLower(m2.content), ' ')]) > 2
        )
        AND NOT (m1)-[:RELATED_TO]-(m2)
        WITH m1, m2, 
             size([word IN apoc.text.split(toLower(m1.content), ' ') 
                   WHERE word IN apoc.text.split(toLower(m2.content), ' ')]) as commonWords
        WHERE commonWords > 2
        CREATE (m1)-[:RELATED_TO {strength: toFloat(commonWords)/10, createdAt: datetime()}]->(m2)
        RETURN count(*) as relationshipsCreated
      `;

      const result = await this.graphService.executeCypher(cypher);
      const recordValue = result.records[0]?.relationshipsCreated;
      const count = typeof recordValue === 'number' ? recordValue : 0;

      this.logger.debug(`Built ${count} semantic relationships`);
    } catch (error) {
      this.logger.warn(`Failed to build semantic relationships`, error);
    }
  }

  /**
   * Get graph statistics
   */
  async getGraphStats(): Promise<{
    totalMemories: number;
    totalThreads: number;
    totalRelationships: number;
    averageMemoriesPerThread: number;
  }> {
    try {
      const cypher = `
        MATCH (m:Memory) 
        OPTIONAL MATCH (t:Thread)-[:CONTAINS]->(m)
        OPTIONAL MATCH (m)-[r:RELATED_TO]-()
        RETURN 
          count(DISTINCT m) as totalMemories,
          count(DISTINCT t) as totalThreads,
          count(DISTINCT r) as totalRelationships
      `;

      const result = await this.graphService.executeCypher(cypher);
      const record = result.records[0];

      const totalMemories = Number(record?.totalMemories) || 0;
      const totalThreads = Number(record?.totalThreads) || 1;
      const totalRelationships = Number(record?.totalRelationships) || 0;

      return {
        totalMemories,
        totalThreads,
        totalRelationships,
        averageMemoriesPerThread: totalMemories / totalThreads,
      };
    } catch (error) {
      this.logger.warn(`Failed to get graph stats`, error);
      return {
        totalMemories: 0,
        totalThreads: 0,
        totalRelationships: 0,
        averageMemoriesPerThread: 0,
      };
    }
  }

  /**
   * Find connected memories for conversation flow
   */
  async findMemoryConnections(
    memoryId: string,
    depth = 2
  ): Promise<readonly string[]> {
    try {
      const cypher = `
        MATCH (m:Memory {id: $memoryId})-[:RELATED_TO*1..$depth]-(connected:Memory)
        WHERE connected.id <> $memoryId
        RETURN DISTINCT connected.id as connectedId
        ORDER BY connected.importance DESC
        LIMIT 10
      `;

      const result = await this.graphService.executeCypher(cypher, { memoryId, depth });
      return result.records.map((record) =>
        String(record.connectedId)
      );
    } catch (error) {
      this.logger.warn(
        `Failed to find connections for memory ${memoryId}`,
        error
      );
      return [];
    }
  }

  /**
   * Get conversation flow for a thread
   */
  async getThreadFlow(threadId: string): Promise<
    ReadonlyArray<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: Date;
      connections: readonly string[];
    }>
  > {
    try {
      const cypher = `
        MATCH (t:Thread {id: $threadId})-[:CONTAINS]->(m:Memory)
        OPTIONAL MATCH (m)-[:RELATED_TO]-(connected:Memory)
        WITH m, collect(DISTINCT connected.id) as connections
        RETURN m.id as memoryId, m.content as content, m.type as type, 
               m.createdAt as createdAt, connections
        ORDER BY m.createdAt
      `;

      const result = await this.graphService.executeCypher(cypher, { threadId });

      return result.records.map((record) => ({
        memoryId: String(record.memoryId),
        content: String(record.content),
        type: String(record.type),
        createdAt: new Date(String(record.createdAt)),
        connections: Array.isArray(record.connections)
          ? (record.connections as string[])
          : [],
      }));
    } catch (error) {
      this.logger.warn(`Failed to get thread flow for ${threadId}`, error);
      return [];
    }
  }
}
