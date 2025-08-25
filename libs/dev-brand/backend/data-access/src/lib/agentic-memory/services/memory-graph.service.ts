import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import type { MemoryEntry } from '../interfaces/memory.interface';
import { MemoryRelationshipError } from '../errors/memory-errors';

/**
 * Specialized service for Neo4j graph operations and relationship tracking
 *
 * Responsibilities:
 * - Graph relationship modeling between memories
 * - Conversation flow tracking and analysis
 * - Entity relationship mapping
 * - Memory graph schema management
 * - Temporal relationship creation
 * - Graph-based memory discovery
 *
 * This service is framework-agnostic and provides reusable graph patterns
 * for memory relationship tracking in any application context.
 */
@Injectable()
export class MemoryGraphService implements OnModuleInit {
  private readonly logger = new Logger(MemoryGraphService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeGraphSchema();
      this.logger.log('Memory graph service initialized with Neo4j schema');
    } catch (error) {
      this.logger.warn(
        'Failed to initialize Neo4j schema (may already exist)',
        error
      );
      // Don't throw - schema initialization failures shouldn't prevent service startup
    }
  }

  /**
   * Track a memory entry in the graph with relationships
   */
  async trackMemory(entry: MemoryEntry): Promise<void> {
    try {
      await this.neo4jService.write(async (session) => {
        // Create or update the memory node
        await session.run(
          `
          MERGE (m:Memory {id: $memoryId})
          SET m.threadId = $threadId,
              m.content = $content,
              m.type = $type,
              m.source = $source,
              m.importance = $importance,
              m.persistent = $persistent,
              m.createdAt = datetime($createdAt),
              m.accessCount = $accessCount,
              m.tags = $tags
        `,
          {
            memoryId: entry.id,
            threadId: entry.threadId,
            content: entry.content,
            type: entry.metadata.type,
            source: entry.metadata.source ?? null,
            importance: entry.metadata.importance ?? 0.5,
            persistent: entry.metadata.persistent ?? false,
            createdAt: entry.createdAt.toISOString(),
            accessCount: entry.accessCount,
            tags: entry.metadata.tags ?? [],
          }
        );

        // Create or update the thread node and relationship
        await session.run(
          `
          MERGE (t:Thread {id: $threadId})
          SET t.lastActiveAt = datetime($lastActiveAt)
        `,
          {
            threadId: entry.threadId,
            lastActiveAt: new Date().toISOString(),
          }
        );

        await session.run(
          `
          MATCH (t:Thread {id: $threadId})
          MATCH (m:Memory {id: $memoryId})
          MERGE (t)-[:HAS_MEMORY {createdAt: datetime($createdAt)}]->(m)
        `,
          {
            threadId: entry.threadId,
            memoryId: entry.id,
            createdAt: entry.createdAt.toISOString(),
          }
        );

        // Create type-specific relationships and labels
        await this.createTypeSpecificRelationships(session, entry);
      });
    } catch (error) {
      const neo4jError = MemoryRelationshipError.graphStorage(
        'trackMemory',
        entry.threadId,
        entry.id,
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(
        `Failed to track memory ${entry.id} in graph`,
        neo4jError.toJSON()
      );
      // Don't throw - Neo4j failures shouldn't prevent ChromaDB storage
    }
  }

  /**
   * Track multiple memories in batch for efficiency
   */
  async trackMemoriesBatch(entries: readonly MemoryEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      await this.neo4jService.write(async (session) => {
        for (const entry of entries) {
          // Create memory node
          await session.run(
            `
            MERGE (m:Memory {id: $memoryId})
            SET m.threadId = $threadId,
                m.content = $content,
                m.type = $type,
                m.source = $source,
                m.importance = $importance,
                m.persistent = $persistent,
                m.createdAt = datetime($createdAt),
                m.accessCount = $accessCount,
                m.tags = $tags
          `,
            {
              memoryId: entry.id,
              threadId: entry.threadId,
              content: entry.content,
              type: entry.metadata.type,
              source: entry.metadata.source ?? null,
              importance: entry.metadata.importance ?? 0.5,
              persistent: entry.metadata.persistent ?? false,
              createdAt: entry.createdAt.toISOString(),
              accessCount: entry.accessCount,
              tags: entry.metadata.tags ?? [],
            }
          );

          // Create thread relationship
          await session.run(
            `
            MERGE (t:Thread {id: $threadId})
            SET t.lastActiveAt = datetime($lastActiveAt)
          `,
            {
              threadId: entry.threadId,
              lastActiveAt: new Date().toISOString(),
            }
          );

          await session.run(
            `
            MATCH (t:Thread {id: $threadId})
            MATCH (m:Memory {id: $memoryId})
            MERGE (t)-[:HAS_MEMORY {createdAt: datetime($createdAt)}]->(m)
          `,
            {
              threadId: entry.threadId,
              memoryId: entry.id,
              createdAt: entry.createdAt.toISOString(),
            }
          );

          // Create type-specific relationships
          await this.createTypeSpecificRelationships(session, entry);
        }
      });
    } catch (error) {
      const neo4jError = MemoryRelationshipError.graphStorage(
        'trackMemoriesBatch',
        entries[0]?.threadId ?? 'unknown',
        'batch',
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(
        'Failed to track batch memories in graph',
        neo4jError.toJSON()
      );
      // Don't throw - Neo4j failures shouldn't prevent ChromaDB storage
    }
  }

  /**
   * Find memories related to a specific memory through graph relationships
   */
  async findRelatedMemories(
    memoryId: string,
    relationshipTypes?: string[]
  ): Promise<any[]> {
    try {
      const result = await this.neo4jService.read(async (session) => {
        const typeFilter = relationshipTypes
          ? `WHERE type(r) IN $relationshipTypes`
          : '';

        return await session.run(
          `
          MATCH (source:Memory {id: $memoryId})-[r]->(related:Memory)
          ${typeFilter}
          RETURN related, type(r) as relationshipType, r
          ORDER BY related.importance DESC, related.createdAt DESC
          LIMIT 20
        `,
          {
            memoryId,
            relationshipTypes: relationshipTypes || [],
          }
        );
      });

      return result.records.map((record) => ({
        memory: record.get('related').properties,
        relationshipType: record.get('relationshipType'),
        relationship: record.get('r').properties,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to find related memories for ${memoryId}`,
        error
      );
      return [];
    }
  }

  /**
   * Get conversation flow for a thread
   */
  async getConversationFlow(threadId: string): Promise<any[]> {
    try {
      const result = await this.neo4jService.read(async (session) => {
        return await session.run(
          `
          MATCH (t:Thread {id: $threadId})-[:HAS_MEMORY]->(m:Memory)
          OPTIONAL MATCH (m)-[:FOLLOWED_BY*]->(next:Memory)
          RETURN m, collect(next) as followingMemories
          ORDER BY m.createdAt ASC
        `,
          { threadId }
        );
      });

      return result.records.map((record) => ({
        memory: record.get('m').properties,
        followingMemories: record
          .get('followingMemories')
          .map((node: any) => node.properties),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get conversation flow for thread ${threadId}`,
        error
      );
      return [];
    }
  }

  /**
   * Remove memories from the graph
   */
  async removeMemories(memoryIds: readonly string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    try {
      await this.neo4jService.write(async (session) => {
        // Delete memory nodes and their relationships
        await session.run(
          `
          UNWIND $ids as memoryId
          MATCH (m:Memory {id: memoryId})
          DETACH DELETE m
        `,
          { ids: [...memoryIds] }
        );

        // Clean up orphaned threads (threads with no memories)
        await session.run(`
          MATCH (t:Thread)
          WHERE NOT (t)-[:HAS_MEMORY]->()
          DELETE t
        `);
      });

      this.logger.debug(`Removed ${memoryIds.length} memories from graph`);
    } catch (error) {
      const neo4jError = MemoryRelationshipError.relationshipQuery(
        'removeMemories',
        'unknown',
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(
        'Failed to remove memories from graph',
        neo4jError.toJSON()
      );
      // Don't throw - Neo4j failures shouldn't prevent cleanup
    }
  }

  /**
   * Get graph statistics
   */
  async getGraphStats(): Promise<{
    totalMemories: number;
    totalThreads: number;
    totalRelationships: number;
    memoryTypes: Record<string, number>;
  }> {
    try {
      const result = await this.neo4jService.read(async (session) => {
        const stats = await session.run(`
          MATCH (m:Memory)
          WITH count(m) as totalMemories
          MATCH (t:Thread)
          WITH totalMemories, count(t) as totalThreads
          MATCH ()-[r]->()
          WITH totalMemories, totalThreads, count(r) as totalRelationships
          MATCH (m:Memory)
          RETURN totalMemories, totalThreads, totalRelationships, 
                 collect(DISTINCT m.type) as memoryTypes,
                 [type IN collect(DISTINCT m.type) | {type: type, count: size([n IN collect(m) WHERE n.type = type])}] as typeCounts
        `);

        if (stats.records.length > 0) {
          const record = stats.records[0];
          const typeCounts = record.get('typeCounts') || [];
          const memoryTypes = Object.fromEntries(
            typeCounts.map((item: any) => [item.type, item.count])
          );

          return {
            totalMemories: record.get('totalMemories')?.low || 0,
            totalThreads: record.get('totalThreads')?.low || 0,
            totalRelationships: record.get('totalRelationships')?.low || 0,
            memoryTypes,
          };
        }

        return {
          totalMemories: 0,
          totalThreads: 0,
          totalRelationships: 0,
          memoryTypes: {},
        };
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get graph statistics', error);
      return {
        totalMemories: 0,
        totalThreads: 0,
        totalRelationships: 0,
        memoryTypes: {},
      };
    }
  }

  /**
   * Initialize Neo4j schema for memory storage
   */
  private async initializeGraphSchema(): Promise<void> {
    await this.neo4jService.write(async (session) => {
      // Create constraints for unique memory IDs
      await session.run(`
        CREATE CONSTRAINT memory_id_unique IF NOT EXISTS
        FOR (m:Memory) REQUIRE m.id IS UNIQUE
      `);

      // Create constraint for unique thread IDs
      await session.run(`
        CREATE CONSTRAINT thread_id_unique IF NOT EXISTS
        FOR (t:Thread) REQUIRE t.id IS UNIQUE
      `);

      // Create indexes for efficient querying
      await session.run(`
        CREATE INDEX memory_thread_idx IF NOT EXISTS
        FOR (m:Memory) ON (m.threadId)
      `);

      await session.run(`
        CREATE INDEX memory_type_idx IF NOT EXISTS
        FOR (m:Memory) ON (m.type)
      `);

      await session.run(`
        CREATE INDEX memory_created_idx IF NOT EXISTS
        FOR (m:Memory) ON (m.createdAt)
      `);

      await session.run(`
        CREATE INDEX memory_importance_idx IF NOT EXISTS
        FOR (m:Memory) ON (m.importance)
      `);
    });
  }

  /**
   * Create type-specific relationships and labels in Neo4j
   */
  private async createTypeSpecificRelationships(
    session: any,
    entry: MemoryEntry
  ): Promise<void> {
    switch (entry.metadata.type) {
      case 'summary':
        // Add Summary label and create relationships to summarized memories
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          SET m:Summary
        `,
          { memoryId: entry.id }
        );

        // Link to memories from the same thread that were created before this summary
        await session.run(
          `
          MATCH (summary:Memory {id: $memoryId})
          MATCH (source:Memory {threadId: $threadId})
          WHERE source.createdAt < summary.createdAt
            AND source.type <> 'summary'
            AND NOT (summary)-[:SUMMARIZES]->(source)
          MERGE (summary)-[:SUMMARIZES]->(source)
        `,
          {
            memoryId: entry.id,
            threadId: entry.threadId,
          }
        );
        break;

      case 'fact':
        // Add Fact label for easier querying
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          SET m:Fact
        `,
          { memoryId: entry.id }
        );
        break;

      case 'context':
        // Add Context label for easier querying
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          SET m:Context
        `,
          { memoryId: entry.id }
        );
        break;

      case 'preference':
        // Create preference relationship to thread
        await session.run(
          `
          MATCH (m:Memory {id: $memoryId})
          MATCH (t:Thread {id: $threadId})
          MERGE (t)-[:HAS_PREFERENCE]->(m)
        `,
          {
            memoryId: entry.id,
            threadId: entry.threadId,
          }
        );
        break;

      case 'conversation':
      case 'custom':
      default:
        // For conversation and custom types, create temporal relationships
        await this.createTemporalRelationships(session, entry);
        break;
    }
  }

  /**
   * Create temporal relationships between memories in the same thread
   */
  private async createTemporalRelationships(
    session: any,
    entry: MemoryEntry
  ): Promise<void> {
    // Link to the previous memory in the same thread
    await session.run(
      `
      MATCH (current:Memory {id: $memoryId})
      MATCH (previous:Memory {threadId: $threadId})
      WHERE previous.createdAt < current.createdAt
        AND NOT (previous)-[:FOLLOWED_BY]->()
      WITH previous
      ORDER BY previous.createdAt DESC
      LIMIT 1
      MERGE (previous)-[:FOLLOWED_BY]->(current)
    `,
      {
        memoryId: entry.id,
        threadId: entry.threadId,
      }
    );
  }
}
