import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMessage } from '@langchain/core/messages';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import {
  MemoryEntry,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySummarizationOptions,
  MemoryStats,
  MemoryServiceInterface,
  UserMemoryPatterns,
} from '../interfaces/memory.interface';
import { SummarizationService } from './summarization.service';
import { SemanticSearchService } from './semantic-search.service';
import { v4 as uuidv4 } from 'uuid';
import type { GetResult } from 'chromadb';
import type { Session } from 'neo4j-driver';

// Local metadata/extra types for ChromaDB normalization
interface ChromaMeta {
  [key: string]: string | number | boolean | null;
}

interface ExtraFields {
  embeddings?: unknown;
  distances?: unknown;
}

/**
 * Facade service that orchestrates the hybrid memory system
 * Combines ChromaDB vector storage with Neo4j graph relationships
 * Provides a unified interface for all memory operations
 */
@Injectable()
export class MemoryFacadeService
  implements MemoryServiceInterface, OnModuleInit
{
  private readonly logger = new Logger(MemoryFacadeService.name);
  private readonly collectionName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly chromaDB: ChromaDBService,
    private readonly neo4j: Neo4jService,
    private readonly summarizationService: SummarizationService,
    private readonly semanticSearch: SemanticSearchService
  ) {
    // Keep in sync with SemanticSearchService usage
    this.collectionName = this.configService.get<string>(
      'memory.collection',
      'memory-entries'
    );
  }

  public async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize the hybrid memory system
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure Chroma collection exists
      await this.chromaDB.createCollection(
        this.collectionName,
        {
          description: 'Agent conversation memories with semantic search',
          created_at: new Date().toISOString(),
        },
        undefined,
        true
      );

      // Initialize Neo4j graph schema (constraints and helpful indexes)
      await this.neo4j.write(async (session: Session) => {
        await session.run(`
          CREATE CONSTRAINT memory_id_unique IF NOT EXISTS
          FOR (m:Memory) REQUIRE m.id IS UNIQUE
        `);
        await session.run(`
          CREATE CONSTRAINT thread_id_unique IF NOT EXISTS
          FOR (t:Thread) REQUIRE t.id IS UNIQUE
        `);
        await session.run(`
          CREATE CONSTRAINT user_id_unique IF NOT EXISTS
          FOR (u:User) REQUIRE u.id IS UNIQUE
        `);
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
      });

      this.logger.log('Hybrid memory system initialized successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize memory system: ${msg}`);
      throw error;
    }
  }

  /**
   * Store a memory entry in both vector and graph stores
   */
  public async store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry> {
    try {
      const memory = this.buildMemoryEntry(threadId, content, metadata);
      await this.saveToChroma(memory);
      await this.upsertGraphForMemory(memory, userId);

      // Check if auto-summarization is needed
      await this.checkAndSummarize(threadId);

      this.logger.debug(`Stored memory ${memory.id} in hybrid system`);
      return memory;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to store memory: ${msg}`);
      throw error;
    }
  }

  /**
   * Store multiple memory entries in batch
   */
  public async storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>,
    userId?: string
  ): Promise<readonly MemoryEntry[]> {
    try {
      const memories: MemoryEntry[] = entries.map((e) =>
        this.buildMemoryEntry(threadId, e.content, e.metadata)
      );
      await this.saveBatchToChroma(memories);
      await this.upsertGraphForMemoriesBatch(memories, userId);
      await this.checkAndSummarize(threadId);
      return memories;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to store batch memories: ${msg}`);
      throw error;
    }
  }

  /**
   * Retrieve memories by thread with relationship context
   */
  public async retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]> {
    try {
      const results = await this.chromaDB.getDocuments(this.collectionName, {
        where: { threadId: { $eq: threadId } },
        limit: limit ?? 50,
        offset: 0,
        includeDocuments: true,
        includeMetadata: true,
        includeEmbeddings: true,
      });

      const memories = this.convertToMemoryEntries(
        results as GetResult<ChromaMeta>
      );

      // Update access counts
      const now = new Date();
      for (const memory of memories) {
        memory.accessCount++;
        memory.lastAccessedAt = now;
      }

      // Sort by creation date (most recent first)
      memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return memories;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve memories: ${msg}`);
      throw error;
    }
  }

  /**
   * Advanced semantic search using hybrid approach
   */
  public async search(
    options: MemorySearchOptions & {
      includeRelated?: boolean;
      userId?: string;
    }
  ): Promise<readonly MemoryEntry[]> {
    try {
      // Use hybrid search for enhanced results
      const results = await this.semanticSearch.hybridSearch({
        ...options,
        includeRelated: options.includeRelated ?? true,
        relationshipDepth: 2,
        boostRelated: 0.3,
      });

      return results;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search memories: ${msg}`);
      throw error;
    }
  }

  /**
   * Context-aware search for agent decision making
   */
  public async searchForContext(
    query: string,
    threadId: string,
    userId?: string
  ): Promise<{
    relevantMemories: MemoryEntry[];
    userPatterns: UserMemoryPatterns | null;
    confidence: number;
  }> {
    try {
      // Use context-aware search
      const contextResults = await this.semanticSearch.contextAwareSearch(
        query,
        threadId,
        userId,
        { limit: 8, minRelevance: 0.6 }
      );

      // Also search for answer-specific memories
      const answerResults = await this.semanticSearch.searchForAnswer(
        query,
        threadId,
        userId
      );

      // Combine results
      const allMemories = [
        ...contextResults.directMatches,
        ...contextResults.contextualMatches,
        ...answerResults.relevantMemories,
      ];

      // Deduplicate
      const uniqueMemories = Array.from(
        new Map(allMemories.map((m) => [m.id, m])).values()
      );

      return {
        relevantMemories: uniqueMemories.slice(0, 10),
        userPatterns: contextResults.userPatterns,
        confidence: answerResults.confidence,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search for context: ${msg}`);
      throw error;
    }
  }

  /**
   * Summarize conversation history with LLM
   */
  public async summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string> {
    try {
      // Use the dedicated summarization service
      const summary = await this.summarizationService.createSummary(
        messages,
        options
      );

      // Store the summary as a memory entry
      await this.store(threadId, summary, {
        type: 'summary',
        source: 'auto-summarization',
        importance: 0.8,
        persistent: true,
      });

      return summary;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to summarize conversation: ${msg}`);
      throw error;
    }
  }

  /**
   * Delete memories from both systems
   */
  public async delete(
    threadId: string,
    memoryIds?: readonly string[]
  ): Promise<number> {
    try {
      let deletedCount = 0;

      if (memoryIds) {
        // Delete specific memories
        await this.chromaDB.deleteDocuments(this.collectionName, [
          ...memoryIds,
        ]);
        await this.neo4j.run(
          `UNWIND $ids as id
           MATCH (m:Memory {id: id})
           DETACH DELETE m`,
          { ids: [...memoryIds] }
        );
        deletedCount = memoryIds.length;
      } else {
        // Delete all memories for thread
        const existing = await this.chromaDB.getDocuments(this.collectionName, {
          where: { threadId: { $eq: threadId } },
          limit: 10000,
        });
        const ids = Array.isArray(existing.ids?.[0])
          ? existing.ids?.[0] ?? []
          : existing.ids ?? [];
        deletedCount = ids.length;

        await this.chromaDB.deleteDocuments(this.collectionName, undefined, {
          threadId: { $eq: threadId },
        });

        await this.neo4j.write(async (session) => {
          await session.run(
            `MATCH (t:Thread {id: $threadId})-[:HAS_MEMORY]->(m:Memory)
             DETACH DELETE m`,
            { threadId }
          );
          await session.run(
            `MATCH (t:Thread {id: $threadId})
             WHERE NOT (t)-[:HAS_MEMORY]->()
             DELETE t`,
            { threadId }
          );
        });
      }

      this.logger.debug(`Deleted ${deletedCount} memories from hybrid system`);
      return deletedCount;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete memories: ${msg}`);
      throw error;
    }
  }

  /**
   * Clear all memories for a thread
   */
  public async clear(threadId: string): Promise<void> {
    await this.delete(threadId);
    this.logger.debug(`Cleared all memories for thread ${threadId}`);
  }

  /**
   * Get comprehensive memory statistics
   */
  public async getStats(): Promise<MemoryStats> {
    try {
      const [totalMemories, relationshipStats] = await Promise.all([
        this.chromaDB.countDocuments(this.collectionName),
        this.getRelationshipStats(),
      ]);

      return {
        totalMemories,
        activeThreads: relationshipStats.activeThreads,
        averageMemorySize: 0, // Would need to calculate from storage
        totalStorageUsed: 0, // Would need to calculate from storage
        searchCount: 0, // Would need to track in service
        averageSearchTime: 0, // Would need to track in service
        summarizationCount: 0, // Would need to track in service
        cacheHitRate: 0, // Would need to implement caching
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get memory stats: ${msg}`);
      throw error;
    }
  }

  /**
   * Perform cleanup based on retention policy
   */
  public async cleanup(): Promise<number> {
    try {
      const config = this.configService.get<
        Record<string, unknown> | undefined
      >('memory.retention');
      if (!config) {
        return Promise.resolve(0);
      }

      const totalDeleted = 0;

      // Potentially use relationship stats here (skipped for now)

      // Implement retention policy cleanup
      // This would involve querying both systems and removing old/unimportant memories

      this.logger.log(
        `Memory cleanup completed: ${totalDeleted} memories removed`
      );
      return Promise.resolve(totalDeleted);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Memory cleanup failed: ${msg}`);
      return Promise.reject(error);
    }
  }

  /**
   * Build semantic relationships between memories
   */
  public async buildSemanticRelationships(): Promise<void> {
    try {
      await this.semanticSearch.createSemanticLinks();
      this.logger.log('Semantic relationships built successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to build semantic relationships: ${msg}`);
      throw error;
    }
  }

  public async getUserPatterns(userId: string): Promise<UserMemoryPatterns> {
    try {
      return await this.semanticSearch.getUserMemoryPatterns(userId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get user patterns: ${msg}`);
      throw error;
    }
  }

  /**
   * Get conversation flow for a thread
   */
  public async getConversationFlow(
    threadId: string
  ): Promise<
    Array<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: Date;
      connections: string[];
    }>
  > {
    try {
      return await this.semanticSearch.getConversationFlow(threadId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get conversation flow: ${msg}`);
      throw error;
    }
  }

  /**
   * Check and perform auto-summarization if needed
   */
  private async checkAndSummarize(threadId: string): Promise<void> {
    if (
      !this.configService.get<boolean>('memory.enableAutoSummarization', false)
    ) {
      return;
    }

    try {
      const memories = await this.retrieve(threadId);
      const maxMessages = this.configService.get<number>(
        'memory.summarization.maxMessages',
        50
      );

      if (memories.length > maxMessages) {
        const conversationMemories = memories.filter(
          (m) => m.metadata.type === 'conversation'
        );

        if (conversationMemories.length > 0) {
          // Convert memories to messages for summarization
          const messages = conversationMemories.map((m) => ({
            content: m.content,
            // Add more message properties as needed
          })) as BaseMessage[];

          await this.summarize(threadId, messages);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Auto-summarization failed for thread ${threadId}: ${msg}`
      );
    }
  }

  /**
   * Get relationship statistics from Neo4j
   */
  private async getRelationshipStats(): Promise<{
    activeThreads: number;
    totalRelationships: number;
    userPatterns: number;
  }> {
    try {
      const [threadsRes, relsRes, patternsRes] = await Promise.all([
        this.neo4j.run<{ count: number }>(
          `MATCH (t:Thread)-[:HAS_MEMORY]->(:Memory)
           RETURN count(DISTINCT t) as count`
        ),
        this.neo4j.run<{ count: number }>(
          `MATCH (:Memory)-[r]-(:Memory)
           RETURN count(r) as count`
        ),
        this.neo4j.run<{ count: number }>(
          `MATCH (:Thread)-[:HAS_PREFERENCE]->(:Memory)
           RETURN count(*) as count`
        ),
      ]);

      const activeThreads = threadsRes.records[0]?.count ?? 0;
      const totalRelationships = relsRes.records[0]?.count ?? 0;
      const userPatterns = patternsRes.records[0]?.count ?? 0;

      return { activeThreads, totalRelationships, userPatterns };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get relationship stats: ${msg}`);
      return {
        activeThreads: 0,
        totalRelationships: 0,
        userPatterns: 0,
      };
    }
  }

  // Helpers to reduce method sizes and satisfy lint rules
  private buildMemoryEntry(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): MemoryEntry {
    return {
      id: uuidv4(),
      threadId,
      content,
      metadata: {
        type: metadata?.type ?? 'conversation',
        source: metadata?.source,
        tags: metadata?.tags,
        importance: metadata?.importance ?? 0.5,
        persistent: metadata?.persistent ?? false,
        ...metadata,
      },
      createdAt: new Date(),
      accessCount: 0,
    };
  }

  private async saveToChroma(memory: MemoryEntry): Promise<void> {
    await this.chromaDB.addDocuments(this.collectionName, [
      {
        id: memory.id,
        document: memory.content,
        metadata: {
          threadId: memory.threadId,
          type: memory.metadata.type,
          source: memory.metadata.source ?? null,
          tags: memory.metadata.tags?.join(',') ?? '',
          importance: memory.metadata.importance ?? 0.5,
          persistent: memory.metadata.persistent ?? false,
          createdAt: memory.createdAt.toISOString(),
          accessCount: memory.accessCount,
          lastAccessedAt: memory.lastAccessedAt?.toISOString() ?? null,
          additionalMetadata: JSON.stringify(memory.metadata),
        },
        embedding: memory.embedding ? [...memory.embedding] : undefined,
      },
    ]);
  }

  private async saveBatchToChroma(memories: MemoryEntry[]): Promise<void> {
    if (!memories.length) {
      return;
    }
    await this.chromaDB.addDocuments(
      this.collectionName,
      memories.map((memory) => ({
        id: memory.id,
        document: memory.content,
        metadata: {
          threadId: memory.threadId,
          type: memory.metadata.type,
          source: memory.metadata.source ?? null,
          tags: memory.metadata.tags?.join(',') ?? '',
          importance: memory.metadata.importance ?? 0.5,
          persistent: memory.metadata.persistent ?? false,
          createdAt: memory.createdAt.toISOString(),
          accessCount: memory.accessCount,
          lastAccessedAt: memory.lastAccessedAt?.toISOString() ?? null,
          additionalMetadata: JSON.stringify(memory.metadata),
        },
      }))
    );
  }

  private async upsertGraphForMemory(
    memory: MemoryEntry,
    userId?: string
  ): Promise<void> {
    await this.neo4j.write(async (session: Session) => {
      await session.run(
        `MERGE (m:Memory {id: $memoryId})
         SET m.threadId = $threadId,
             m.content = $content,
             m.type = $type,
             m.source = $source,
             m.importance = $importance,
             m.persistent = $persistent,
             m.createdAt = datetime($createdAt),
             m.accessCount = $accessCount,
             m.tags = $tags`,
        {
          memoryId: memory.id,
          threadId: memory.threadId,
          content: memory.content,
          type: memory.metadata.type,
          source: memory.metadata.source ?? null,
          importance: memory.metadata.importance ?? 0.5,
          persistent: memory.metadata.persistent ?? false,
          createdAt: memory.createdAt.toISOString(),
          accessCount: memory.accessCount,
          tags: memory.metadata.tags ?? [],
        }
      );

      await session.run(
        `MERGE (t:Thread {id: $threadId})
         SET t.lastActiveAt = datetime($lastActiveAt)`,
        { threadId: memory.threadId, lastActiveAt: new Date().toISOString() }
      );

      await session.run(
        `MATCH (t:Thread {id: $threadId})
         MATCH (m:Memory {id: $memoryId})
         MERGE (t)-[:HAS_MEMORY {createdAt: datetime($createdAt)}]->(m)`,
        {
          threadId: memory.threadId,
          memoryId: memory.id,
          createdAt: memory.createdAt.toISOString(),
        }
      );

      if (userId) {
        await session.run(
          `MERGE (u:User {id: $userId})
           MERGE (t:Thread {id: $threadId})
           MERGE (u)-[:OWNS_THREAD]->(t)`,
          { userId, threadId: memory.threadId }
        );
      }

      await this.createTypeSpecificRelationships(session, memory);
    });
  }

  private async upsertGraphForMemoriesBatch(
    memories: MemoryEntry[],
    userId?: string
  ): Promise<void> {
    if (!memories.length) {
      return;
    }
    await this.neo4j.write(async (session: Session) => {
      for (const memory of memories) {
        await session.run(
          `MERGE (m:Memory {id: $memoryId})
           SET m.threadId = $threadId,
               m.content = $content,
               m.type = $type,
               m.source = $source,
               m.importance = $importance,
               m.persistent = $persistent,
               m.createdAt = datetime($createdAt),
               m.accessCount = $accessCount,
               m.tags = $tags`,
          {
            memoryId: memory.id,
            threadId: memory.threadId,
            content: memory.content,
            type: memory.metadata.type,
            source: memory.metadata.source ?? null,
            importance: memory.metadata.importance ?? 0.5,
            persistent: memory.metadata.persistent ?? false,
            createdAt: memory.createdAt.toISOString(),
            accessCount: memory.accessCount,
            tags: memory.metadata.tags ?? [],
          }
        );

        await session.run(
          `MERGE (t:Thread {id: $threadId})
           SET t.lastActiveAt = datetime($lastActiveAt)`,
          { threadId: memory.threadId, lastActiveAt: new Date().toISOString() }
        );

        await session.run(
          `MATCH (t:Thread {id: $threadId})
           MATCH (m:Memory {id: $memoryId})
           MERGE (t)-[:HAS_MEMORY {createdAt: datetime($createdAt)}]->(m)`,
          {
            threadId: memory.threadId,
            memoryId: memory.id,
            createdAt: memory.createdAt.toISOString(),
          }
        );

        if (userId) {
          await session.run(
            `MERGE (u:User {id: $userId})
             MERGE (t:Thread {id: $threadId})
             MERGE (u)-[:OWNS_THREAD]->(t)`,
            { userId, threadId: memory.threadId }
          );
        }

        await this.createTypeSpecificRelationships(session, memory);
      }
    });
  }

  private convertToMemoryEntries(
    results: GetResult<ChromaMeta>
  ): MemoryEntry[] {
    if (!results?.ids) {
      return [];
    }

    const ids = this.normalizeField<string>(results.ids);
    const documents = this.normalizeField<string | null>(results.documents);
    const metadatas = this.normalizeField<ChromaMeta | null>(results.metadatas);

    const extra = results as unknown as ExtraFields;
    const embeddings = this.normalizeEmbeddings(extra.embeddings);
    const distances = this.normalizeDistances(extra.distances);

    const memories: MemoryEntry[] = [];
    for (let i = 0; i < ids.length; i++) {
      const md: Record<string, unknown> = (metadatas[i] ?? {}) as Record<
        string,
        unknown
      >;
      const additional = md.additionalMetadata
        ? safeParseJson(String(md.additionalMetadata))
        : {};
      memories.push({
        id: ids[i],
        threadId: String(md.threadId ?? ''),
        content: documents[i] ?? '',
        embedding: (embeddings[i] ?? undefined) as unknown as
          | number[]
          | undefined,
        metadata: {
          type: (md.type as MemoryMetadata['type']) ?? 'conversation',
          source: (md.source as string) ?? undefined,
          tags: md.tags
            ? String(md.tags).split(',').filter(Boolean)
            : undefined,
          importance: (md.importance as number) ?? 0.5,
          persistent: (md.persistent as boolean) ?? false,
          ...additional,
        },
        createdAt: md.createdAt ? new Date(String(md.createdAt)) : new Date(),
        lastAccessedAt: md.lastAccessedAt
          ? new Date(String(md.lastAccessedAt))
          : undefined,
        accessCount: (md.accessCount as number) || 0,
        relevanceScore:
          distances[i] !== undefined && distances[i] !== null
            ? 1 - Number(distances[i])
            : undefined,
      });
    }
    return memories;
  }

  private normalizeField<T>(field?: T | T[] | T[][] | null): T[] {
    if (!field) {
      return [];
    }
    if (Array.isArray(field)) {
      const first = field[0] as unknown;
      if (Array.isArray(first)) {
        return (field[0] as T[]) ?? [];
      }
      return field as T[];
    }
    return [];
  }

  private normalizeEmbeddings(field: unknown): Array<number[] | null> {
    if (!Array.isArray(field)) {
      return [];
    }
    const first = field[0] as unknown;
    if (Array.isArray(first)) {
      return (first as Array<number[] | null>) ?? [];
    }
    return field as Array<number[] | null>;
  }

  private normalizeDistances(field: unknown): Array<number | null> {
    if (!Array.isArray(field)) {
      return [];
    }
    const first = field[0] as unknown;
    if (Array.isArray(first)) {
      return (first as Array<number | null>) ?? [];
    }
    return field as Array<number | null>;
  }

  private async createTypeSpecificRelationships(
    session: Session,
    memory: MemoryEntry
  ): Promise<void> {
    switch (memory.metadata.type) {
      case 'preference':
        await session.run(
          `MATCH (m:Memory {id: $memoryId})
           MATCH (t:Thread {id: $threadId})
           MERGE (t)-[:HAS_PREFERENCE]->(m)`,
          { memoryId: memory.id, threadId: memory.threadId }
        );
        break;
      case 'fact':
        await session.run(
          `MATCH (m:Memory {id: $memoryId})
           SET m:Fact`,
          { memoryId: memory.id }
        );
        break;
      case 'summary':
        await session.run(
          `MATCH (m:Memory {id: $memoryId})
           MATCH (source:Memory {threadId: $threadId})
           WHERE source.createdAt < m.createdAt AND source.type <> 'summary'
           MERGE (m)-[:SUMMARIZES]->(source)`,
          { memoryId: memory.id, threadId: memory.threadId }
        );
        break;
      case 'context':
        await session.run(
          `MATCH (m:Memory {id: $memoryId})
           SET m:Context`,
          { memoryId: memory.id }
        );
        break;
      case 'conversation':
        // No-op for base conversation memories
        break;
      case 'custom':
        // No-op for custom memories by default
        break;
      default:
        break;
    }
  }
}

// Helpers
function safeParseJson(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
