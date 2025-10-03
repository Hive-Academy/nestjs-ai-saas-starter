import { Injectable, Logger, Inject } from '@nestjs/common';
import { IGraphService } from '../interfaces/graph-service.interface';
import { IVectorService } from '../interfaces/vector-service.interface';
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
    @Inject('IGraphService')
    private readonly graphService: IGraphService,
    @Inject('IVectorService')
    private readonly vectorService: IVectorService,
    @Inject(MEMORY_CONFIG) private readonly config: MemoryConfig
  ) {
    this.logger.debug('MemoryGraphService initialized with configuration', {
      neo4jDatabase: this.config.neo4j?.database || 'neo4j',
      enableAutoSummarization: this.config.enableAutoSummarization || false,
    });
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
        content: memory.content.substring(
          0,
          this.config.limits?.memoryContentLimit || 1000
        ), // Configurable content length limit
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

      await this.graphService.executeCypher(cypher, {
        memoryIds: [...memoryIds],
      });

      this.logger.debug(`Removed ${memoryIds.length} memories from graph`);
    } catch (error) {
      this.logger.warn(`Failed to remove memories from graph`, error);
    }
  }

  /**
   * Build semantic relationships between memories using configurable strategies
   */
  async buildSemanticRelationships(): Promise<void> {
    // Check if semantic relationships are enabled
    if (!this.config.semanticRelationships?.enabled) {
      this.logger.debug('Semantic relationships disabled in configuration');
      return;
    }

    const strategy = this.config.semanticRelationships.strategy || 'hybrid';
    const maxRelationships =
      this.config.semanticRelationships.maxRelationshipsPerMemory || 5;

    try {
      let totalRelationships = 0;

      switch (strategy) {
        case 'vector_similarity':
          totalRelationships = await this.buildVectorBasedRelationships(
            maxRelationships
          );
          break;
        case 'word_matching':
          totalRelationships = await this.buildWordMatchingRelationships(
            maxRelationships
          );
          break;
        case 'hybrid':
        default:
          // Try vector similarity first, fallback to word matching
          try {
            totalRelationships = await this.buildVectorBasedRelationships(
              maxRelationships
            );
            this.logger.debug(
              `Built ${totalRelationships} relationships using vector similarity`
            );
          } catch (vectorError) {
            this.logger.warn(
              'Vector similarity failed, falling back to word matching',
              vectorError
            );
            totalRelationships = await this.buildWordMatchingRelationships(
              maxRelationships
            );
            this.logger.debug(
              `Built ${totalRelationships} relationships using word matching fallback`
            );
          }
          break;
      }

      this.logger.debug(
        `Built ${totalRelationships} semantic relationships using ${strategy} strategy`
      );
    } catch (error) {
      this.logger.warn(`Failed to build semantic relationships`, error);
    }
  }

  /**
   * Build relationships using vector similarity (requires vector service)
   */
  private async buildVectorBasedRelationships(
    maxRelationships: number
  ): Promise<number> {
    try {
      // Get all memories from graph to compare
      const allMemoriesQuery = `
        MATCH (m:Memory)
        RETURN m.id as id, m.content as content
        LIMIT ${this.config.limits?.countAccuracyLimit || 1000}
      `;

      const memoriesResult = await this.graphService.executeCypher(
        allMemoriesQuery
      );
      const memories = memoriesResult.records.map((record) => ({
        id: record.id as string,
        content: record.content as string,
      }));

      let totalCreated = 0;
      const similarityThreshold =
        this.config.semanticRelationships?.similarityThreshold || 0.7;
      const collection = this.config.collection || 'memory_store';

      // For each memory, find similar memories using vector search
      for (const memory of memories) {
        try {
          // Use vector service to find similar content
          const similarMemories = await this.vectorService.search(collection, {
            queryText: memory.content,
            limit: maxRelationships * 2, // Get more to filter out self and apply threshold
          });

          const relationships: Array<{ targetId: string; strength: number }> =
            [];

          for (const similar of similarMemories) {
            // Skip self-references and apply similarity threshold
            if (
              similar.id !== memory.id &&
              (similar.relevanceScore || 0) >= similarityThreshold
            ) {
              relationships.push({
                targetId: similar.id,
                strength: similar.relevanceScore || 0,
              });
            }
          }

          // Create relationships with highest similarity scores
          const topRelationships = relationships
            .sort((a, b) => b.strength - a.strength)
            .slice(0, maxRelationships);

          for (const rel of topRelationships) {
            const relationshipCypher = `
              MATCH (m1:Memory {id: $sourceId}), (m2:Memory {id: $targetId})
              WHERE NOT (m1)-[:RELATED_TO]-(m2)
              CREATE (m1)-[:RELATED_TO {
                strength: $strength, 
                type: 'vector_similarity',
                createdAt: datetime()
              }]->(m2)
              RETURN count(*) as created
            `;

            const result = await this.graphService.executeCypher(
              relationshipCypher,
              {
                sourceId: memory.id,
                targetId: rel.targetId,
                strength: rel.strength,
              }
            );

            totalCreated += (result.records[0]?.created as number) || 0;
          }
        } catch (memoryError) {
          this.logger.debug(
            `Failed to process memory ${memory.id}`,
            memoryError
          );
        }
      }

      return totalCreated;
    } catch (error) {
      throw new Error(
        `Vector-based relationship building failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Build relationships using word matching (APOC-independent)
   */
  private async buildWordMatchingRelationships(
    maxRelationships: number
  ): Promise<number> {
    const minCommonWords =
      this.config.semanticRelationships?.minCommonWords || 2;
    const requireApoc = this.config.semanticRelationships?.requireApoc ?? false;

    try {
      let cypher: string;

      if (requireApoc) {
        // Original APOC-dependent implementation
        cypher = `
          MATCH (m1:Memory), (m2:Memory)
          WHERE m1.id <> m2.id
          AND size(apoc.text.split(toLower(m1.content), ' ')) > 5
          AND NOT (m1)-[:RELATED_TO]-(m2)
          WITH m1, m2, 
               size([word IN apoc.text.split(toLower(m1.content), ' ') 
                     WHERE word IN apoc.text.split(toLower(m2.content), ' ')]) as commonWords
          WHERE commonWords >= ${minCommonWords}
          WITH m1, m2, commonWords
          ORDER BY commonWords DESC
          WITH m1, collect({memory: m2, score: commonWords})[0..${maxRelationships}] as topRelated
          UNWIND topRelated as related
          CREATE (m1)-[:RELATED_TO {
            strength: toFloat(related.score)/10, 
            type: 'word_matching',
            createdAt: datetime()
          }]->(related.memory)
          RETURN count(*) as relationshipsCreated
        `;
      } else {
        // APOC-independent implementation using native Cypher functions
        cypher = `
          MATCH (m1:Memory), (m2:Memory)
          WHERE m1.id <> m2.id
          AND size(split(toLower(m1.content), ' ')) > 5
          AND NOT (m1)-[:RELATED_TO]-(m2)
          WITH m1, m2, 
               split(toLower(m1.content), ' ') as words1,
               split(toLower(m2.content), ' ') as words2
          WITH m1, m2, 
               size([word IN words1 WHERE word IN words2]) as commonWords
          WHERE commonWords >= ${minCommonWords}
          WITH m1, m2, commonWords
          ORDER BY commonWords DESC
          WITH m1, collect({memory: m2, score: commonWords})[0..${maxRelationships}] as topRelated
          UNWIND topRelated as related
          CREATE (m1)-[:RELATED_TO {
            strength: toFloat(related.score)/10, 
            type: 'word_matching',
            createdAt: datetime()
          }]->(related.memory)
          RETURN count(*) as relationshipsCreated
        `;
      }

      const result = await this.graphService.executeCypher(cypher);
      const recordValue = result.records[0]?.relationshipsCreated;
      return typeof recordValue === 'number' ? recordValue : 0;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes('apoc') &&
        !requireApoc
      ) {
        throw new Error(
          'APOC procedures not available and requireApoc is false'
        );
      }
      throw error;
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
        LIMIT ${this.config.limits?.relationshipQueryLimit || 10}
      `;

      const result = await this.graphService.executeCypher(cypher, {
        memoryId,
        depth,
      });
      return result.records.map((record) => String(record.connectedId));
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

      const result = await this.graphService.executeCypher(cypher, {
        threadId,
      });

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
