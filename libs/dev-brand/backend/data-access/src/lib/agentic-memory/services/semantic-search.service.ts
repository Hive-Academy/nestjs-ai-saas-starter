import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService, cypher } from '@hive-academy/nestjs-neo4j';
import type { GetResult, Where } from 'chromadb';
import type { ChromaSearchResult } from '@hive-academy/nestjs-chromadb';
import type { Transaction } from 'neo4j-driver';
import {
  MemoryEntry,
  MemorySearchOptions,
  UserMemoryPatterns,
} from '../interfaces/memory.interface';

/**
 * Advanced semantic search service that combines vector similarity and graph relationships
 * This creates a hybrid search that leverages both ChromaDB and Neo4j capabilities
 */
@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private readonly chromaDBService: ChromaDBService,
    private readonly neo4jService: Neo4jService
  ) {}

  /**
   * Hybrid semantic search combining vector similarity and graph relationships
   */
  public async hybridSearch(
    options: MemorySearchOptions & {
      includeRelated?: boolean;
      relationshipDepth?: number;
      boostRelated?: number;
      userId?: string;
    }
  ): Promise<MemoryEntry[]> {
    try {
      // Step 1: Vector similarity search using ChromaDB
      const vectorResults = await this.vectorSearch(options);

      if (!options.includeRelated || vectorResults.length === 0) {
        return vectorResults;
      }

      // Step 2: Find related memories using graph relationships
      const relatedMemoriesMap = new Map<string, number>();

      for (const memory of vectorResults.slice(0, 5)) {
        // Limit to top 5 for performance
        const related = await this.findRelatedMemories(
          memory.id,
          options.relationshipDepth ?? 2,
          10
        );

        for (const rel of related) {
          const existingScore = relatedMemoriesMap.get(rel.memoryId) ?? 0;
          const boostFactor = options.boostRelated ?? 0.3;
          relatedMemoriesMap.set(
            rel.memoryId,
            Math.max(existingScore, rel.similarity * boostFactor)
          );
        }
      }

      // Step 3: Fetch related memories and merge results
      if (relatedMemoriesMap.size > 0) {
        const relatedIds = Array.from(relatedMemoriesMap.keys());
        const relatedMemories = await this.getMemoriesByIds(relatedIds);

        // Add relationship scores to related memories
        for (const memory of relatedMemories) {
          const relationshipScore = relatedMemoriesMap.get(memory.id) ?? 0;
          memory.relevanceScore =
            (memory.relevanceScore ?? 0) + relationshipScore;
        }

        // Merge and deduplicate results
        const allResults = this.mergeAndDeduplicateResults(
          vectorResults,
          relatedMemories
        );

        // Sort by combined relevance score
        allResults.sort(
          (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
        );

        return allResults.slice(0, options.limit ?? 10);
      }

      return vectorResults;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Hybrid search failed: ${msg}`);
      throw error;
    }
  }

  /**
   * Context-aware search that considers user patterns and preferences
   */
  public async contextAwareSearch(
    query: string,
    threadId: string,
    userId?: string,
    options: Partial<MemorySearchOptions> = {}
  ): Promise<{
    directMatches: MemoryEntry[];
    contextualMatches: MemoryEntry[];
    userPatterns: UserMemoryPatterns | null;
  }> {
    try {
      // Get user patterns if userId provided
      let userPatterns: UserMemoryPatterns | null = null;
      if (userId) {
        userPatterns = await this.getUserMemoryPatterns(userId);
      }

      // Direct semantic search
      const directMatches = await this.vectorSearch({
        query,
        threadIds: [threadId],
        limit: options.limit ?? 5,
        minRelevance: options.minRelevance ?? 0.7,
        ...options,
      });

      // Contextual search based on user patterns
      let contextualMatches: MemoryEntry[] = [];
      if (userPatterns && userPatterns.preferredTopics.length > 0) {
        // Search for memories related to user's preferred topics
        contextualMatches = await this.vectorSearch({
          tags: userPatterns.preferredTopics.slice(0, 3), // Top 3 topics
          threadIds: options.threadIds ?? [threadId],
          limit: 3,
          minRelevance: 0.5,
          types: ['preference', 'fact', 'context'],
        });
      }

      return {
        directMatches,
        contextualMatches,
        userPatterns,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Context-aware search failed: ${msg}`);
      throw error;
    }
  }

  /**
   * Find memories that are semantically similar to a given memory
   */
  public async findSimilarMemories(
    memoryId: string,
    limit = 5,
    minSimilarity = 0.6
  ): Promise<MemoryEntry[]> {
    try {
      // Get the source memory to extract its content for search
      const sourceMemories = await this.getMemoriesByIds([memoryId]);
      if (sourceMemories.length === 0) {
        return [];
      }

      const sourceMemory = sourceMemories[0];

      // Search for similar memories using the content
      const similarMemories = await this.vectorSearch({
        query: sourceMemory.content,
        limit: limit + 1, // +1 to account for the source memory itself
        minRelevance: minSimilarity,
      });

      // Filter out the source memory and return results
      return similarMemories.filter((memory) => memory.id !== memoryId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to find similar memories: ${msg}`);
      throw error;
    }
  }

  /**
   * Search for memories that could be used to answer a specific question
   */
  public async searchForAnswer(
    question: string,
    threadId?: string,
    _userId?: string
  ): Promise<{
    relevantMemories: MemoryEntry[];
    confidence: number;
    sources: string[];
  }> {
    try {
      // Multi-faceted search approach
      const searchPromises = [
        // Direct semantic search
        this.vectorSearch({
          query: question,
          threadIds: threadId ? [threadId] : undefined,
          limit: 5,
          minRelevance: 0.6,
        }),

        // Search in facts and context
        this.vectorSearch({
          query: question,
          types: ['fact', 'context', 'summary'],
          limit: 3,
          minRelevance: 0.5,
        }),
      ];

      const [directResults, factualResults] = await Promise.all(searchPromises);

      // Combine and deduplicate results
      const allMemories = this.mergeAndDeduplicateResults(
        directResults,
        factualResults
      );

      // Calculate confidence based on relevance scores and memory types
      const confidence = this.calculateAnswerConfidence(allMemories);

      // Extract sources
      const sources = allMemories
        .map((m) => m.metadata.source)
        .filter((source): source is string => Boolean(source))
        .filter((source, index, arr) => arr.indexOf(source) === index);

      return {
        relevantMemories: allMemories.slice(0, 8), // Top 8 most relevant
        confidence,
        sources,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search for answer: ${msg}`);
      throw error;
    }
  }

  /**
   * Create semantic relationships between memories based on similarity
   */
  public async createSemanticLinks(batchSize = 50): Promise<void> {
    try {
      this.logger.log('Starting semantic link creation process...');

      // Get all memories in batches
      let offset = 0;
      let processedCount = 0;

      while (true) {
        const memories = await this.getAllMemoriesBatch(offset, batchSize);
        if (memories.length === 0) {
          break;
        }

        // Process each memory in the batch
        for (const memory of memories) {
          await this.linkSimilarMemoriesFor(memory);
        }

        processedCount += memories.length;
        offset += batchSize;

        this.logger.debug(
          `Processed ${processedCount} memories for semantic linking`
        );
      }

      this.logger.log(
        `Completed semantic link creation for ${processedCount} memories`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create semantic links: ${msg}`);
      throw error;
    }
  }

  private async linkSimilarMemoriesFor(memory: MemoryEntry): Promise<void> {
    if (!memory.embedding) {
      return;
    }
    const similarMemories = await this.findSimilarMemories(memory.id, 3, 0.8);
    for (const similar of similarMemories) {
      const score = similar.relevanceScore ?? 0;
      if (score <= 0.8) {
        continue;
      }
      await this.createSemanticRelationships(
        memory.id,
        similar.id,
        score,
        'SEMANTICALLY_SIMILAR'
      );
    }
  }

  // Removed legacy helper methods that referenced deprecated services

  /**
   * Merge and deduplicate memory results
   */
  private mergeAndDeduplicateResults(
    ...resultSets: MemoryEntry[][]
  ): MemoryEntry[] {
    const memoryMap = new Map<string, MemoryEntry>();

    for (const results of resultSets) {
      for (const memory of results) {
        const existing = memoryMap.get(memory.id);
        if (
          !existing ||
          (memory.relevanceScore ?? 0) > (existing.relevanceScore ?? 0)
        ) {
          memoryMap.set(memory.id, memory);
        }
      }
    }

    return Array.from(memoryMap.values());
  }

  /**
   * Calculate confidence score for answer relevance
   */
  private calculateAnswerConfidence(memories: MemoryEntry[]): number {
    if (memories.length === 0) {
      return 0;
    }

    const scores = memories.map((m) => m.relevanceScore ?? 0);
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Boost confidence for factual and context memories
    const factualBoost =
      memories.filter(
        (m) => m.metadata.type === 'fact' || m.metadata.type === 'context'
      ).length * 0.1;

    // Boost confidence for persistent memories (important information)
    const persistentBoost =
      memories.filter((m) => m.metadata.persistent).length * 0.05;

    return Math.min(1.0, avgScore + factualBoost + persistentBoost);
  }

  /**
   * Vector search against ChromaDB using either similarity or filter-only retrieval
   */
  private async vectorSearch(
    options: MemorySearchOptions
  ): Promise<MemoryEntry[]> {
    const where: Where | undefined = this.buildWhereFilter(options);

    let memories: MemoryEntry[];
    if (options.query) {
      const searchResults: ChromaSearchResult =
        await this.chromaDBService.searchDocuments(
          'memory-entries',
          [options.query],
          undefined,
          {
            nResults: options.limit ?? 10,
            where,
            includeDocuments: true,
            includeMetadata: true,
            includeDistances: true,
            includeEmbeddings: options.includeEmbeddings ?? false,
          }
        );
      memories = this.convertToMemoryEntries(searchResults);
    } else {
      const getResults = await this.chromaDBService.getDocuments(
        'memory-entries',
        {
          where,
          limit: options.limit ?? 1000,
          offset: 0,
          includeDocuments: true,
          includeMetadata: true,
          includeEmbeddings: options.includeEmbeddings ?? false,
        }
      );
      memories = this.convertToMemoryEntries(
        getResults as unknown as GetResult<
          Record<string, string | number | boolean | null>
        >
      );
    }

    return this.postFilterAndSort(memories, options);
  }

  private buildWhereFilter(options: MemorySearchOptions): Where | undefined {
    const where: Record<string, unknown> = {};
    if (options.threadIds?.length) {
      where.threadId =
        options.threadIds.length === 1
          ? options.threadIds[0]
          : { $in: [...options.threadIds] };
    }
    if (options.types?.length) {
      where.type =
        options.types.length === 1
          ? options.types[0]
          : { $in: [...options.types] };
    }
    if (options.dateRange) {
      const createdAt: Record<string, string> = {};
      if (options.dateRange.from) {
        createdAt.$gte = options.dateRange.from.toISOString();
      }
      if (options.dateRange.to) {
        createdAt.$lte = options.dateRange.to.toISOString();
      }
      if (Object.keys(createdAt).length) {
        where.createdAt = createdAt;
      }
    }
    return Object.keys(where).length ? (where as unknown as Where) : undefined;
  }

  private postFilterAndSort(
    memories: MemoryEntry[],
    options: MemorySearchOptions
  ): MemoryEntry[] {
    let result = [...memories];
    if (options.tags?.length) {
      const tags = new Set(options.tags);
      result = result.filter((m) => m.metadata.tags?.some((t) => tags.has(t)));
    }
    if (options.minRelevance !== null && options.minRelevance !== undefined) {
      const minRel = options.minRelevance;
      result = result.filter((m) => (m.relevanceScore ?? 0) >= (minRel ?? 0));
    }

    const sortBy = options.sortBy ?? 'relevance';
    const sortOrder = options.sortOrder ?? 'desc';
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'relevance':
          cmp = (a.relevanceScore ?? 0) - (b.relevanceScore ?? 0);
          break;
        case 'createdAt':
          cmp = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'accessCount':
          cmp = a.accessCount - b.accessCount;
          break;
        case 'importance':
          cmp = (a.metadata.importance ?? 0) - (b.metadata.importance ?? 0);
          break;
        default:
          cmp = 0;
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    if (options.limit && !options.query) {
      result = result.slice(0, options.limit);
    }
    return result;
  }

  /**
   * Resolve MemoryEntry list by IDs via ChromaDB
   */
  private async getMemoriesByIds(memoryIds: string[]): Promise<MemoryEntry[]> {
    if (!memoryIds.length) {
      return [];
    }
    try {
      const results = await this.chromaDBService.getDocuments(
        'memory-entries',
        {
          ids: memoryIds,
          includeDocuments: true,
          includeMetadata: true,
          includeEmbeddings: true,
        }
      );
      return this.convertToMemoryEntries(
        results as unknown as GetResult<
          Record<string, string | number | boolean | null>
        >
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get memories by IDs: ${msg}`);
      return [];
    }
  }

  /**
   * Page through all memories using limit/offset
   */
  private async getAllMemoriesBatch(
    offset: number,
    limit: number
  ): Promise<MemoryEntry[]> {
    try {
      const results = await this.chromaDBService.getDocuments(
        'memory-entries',
        {
          limit,
          offset,
          includeDocuments: true,
          includeMetadata: true,
          includeEmbeddings: true,
        }
      );
      return this.convertToMemoryEntries(
        results as unknown as GetResult<
          Record<string, string | number | boolean | null>
        >
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get memories batch: ${msg}`);
      return [];
    }
  }

  /**
   * Create semantic relationships in Neo4j
   */
  private async createSemanticRelationships(
    memory1Id: string,
    memory2Id: string,
    similarity: number,
    relationshipType = 'SIMILAR_TO'
  ): Promise<void> {
    // Ensure relationship type is a valid Cypher identifier to avoid injection
    const relType = /^[A-Z_][A-Z0-9_]*$/.test(relationshipType)
      ? relationshipType
      : 'SIMILAR_TO';

    await this.neo4jService.run(
      `MATCH (m1:Memory {id: $memory1Id})
       MATCH (m2:Memory {id: $memory2Id})
       MERGE (m1)-[r:${relType}]->(m2)
       SET r.similarity = $similarity, r.createdAt = datetime()`,
      { memory1Id, memory2Id, similarity },
      { defaultAccessMode: 'WRITE' }
    );
  }

  /**
   * Graph traversal for related memories in Neo4j
   */
  private async findRelatedMemories(
    memoryId: string,
    maxDepth = 2,
    limit = 10
  ): Promise<
    Array<{ memoryId: string; relationshipPath: string[]; similarity: number }>
  > {
    const result = await this.neo4jService.run<{
      memoryId: string;
      relationshipPath: string[];
      similarity: number;
    }>(
      `MATCH (m:Memory {id: $memoryId})
       CALL {
         WITH m
         MATCH path = (m)-[*1..$maxDepth]-(related:Memory)
         WHERE related.id <> m.id
         RETURN related,
                [rel in relationships(path) | type(rel)] as relationshipPath,
                1.0 / length(path) as similarity
         ORDER BY similarity DESC, related.importance DESC
         LIMIT $limit
       }
       RETURN related.id as memoryId, relationshipPath, similarity`,
      { memoryId, maxDepth, limit },
      { defaultAccessMode: 'READ' }
    );

    return result.records.map((r) => ({
      memoryId: r.memoryId,
      relationshipPath: r.relationshipPath,
      similarity: r.similarity,
    }));
  }

  /**
   * Get conversation flow for a thread via Neo4j
   */
  public async getConversationFlow(threadId: string): Promise<
    Array<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: Date;
      connections: string[];
    }>
  > {
    const result = await this.neo4jService.run<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: string | number | Date;
      connections: string[];
    }>(
      `MATCH (t:Thread {id: $threadId})-[:HAS_MEMORY]->(m:Memory)
       OPTIONAL MATCH (m)-[r]-(connected:Memory)
       WHERE connected.threadId = $threadId
       RETURN m.id as memoryId,
              m.content as content,
              m.type as type,
              m.createdAt as createdAt,
              collect(DISTINCT connected.id) as connections
       ORDER BY m.createdAt ASC`,
      { threadId },
      { defaultAccessMode: 'READ' }
    );

    return result.records.map((rec) => ({
      memoryId: rec.memoryId,
      content: rec.content,
      type: rec.type,
      createdAt: toDateSafe(rec.createdAt),
      connections: (rec.connections || []).filter(Boolean),
    }));
  }

  /**
   * Derive user memory patterns via Neo4j
   */
  public async getUserMemoryPatterns(
    userId: string
  ): Promise<UserMemoryPatterns> {
    const { topics, styles, stats } =
      await this.neo4jService.runInReadTransaction(async (tx) => ({
        topics: await this.fetchUserTopics(tx, userId),
        styles: await this.fetchUserStyles(tx, userId),
        stats: await this.fetchUserStats(tx, userId),
      }));

    return {
      preferredTopics: topics.map((t) => t.tag).filter(Boolean),
      communicationStyle: styles.map((s) => s.content).filter(Boolean),
      frequentInteractions: [],
      memoryStats: {
        totalMemories: stats.totalMemories,
        averageImportance: stats.avgImportance,
        mostActiveThreads: [],
        recentActivity: toDateSafe(stats.lastMemoryAt),
      },
    } as UserMemoryPatterns;
  }

  private async fetchUserTopics(
    tx: Transaction,
    userId: string
  ): Promise<Array<{ tag: string; frequency: number; avgImportance: number }>> {
    const qb = cypher()
      .match(
        '(u:User {id: $userId})-[:OWNS_THREAD]->(t:Thread)-[:HAS_MEMORY]->(m:Memory)'
      )
      .where('m.importance > $minImportance', { minImportance: 0.7 })
      .unwind('m.tags', 'tag')
      .return('tag, count(*) as frequency, avg(m.importance) as avgImportance')
      .orderBy('frequency', 'DESC')
      .orderBy('avgImportance', 'DESC')
      .limit(10)
      .addParameter('userId', userId);

    const { cypher: query, parameters } = qb.build();
    const res = await tx.run(query, parameters);
    return res.records.map((r) => ({
      tag: String(r.get('tag')),
      frequency: toNumberSafe(r.get('frequency') as unknown),
      avgImportance: toNumberSafe(r.get('avgImportance') as unknown),
    }));
  }

  private async fetchUserStyles(
    tx: Transaction,
    userId: string
  ): Promise<Array<{ content: string; importance: number }>> {
    const qb = cypher()
      .match(
        '(u:User {id: $userId})-[:OWNS_THREAD]->(t:Thread)-[:HAS_MEMORY]->(m:Memory)'
      )
      .where("m.type = 'preference' OR m.source = 'user_feedback'")
      .return('m.content as content, m.importance as importance')
      .orderBy('importance', 'DESC')
      .limit(5)
      .addParameter('userId', userId);

    const { cypher: query, parameters } = qb.build();
    const res = await tx.run(query, parameters);
    return res.records.map((r) => ({
      content: String(r.get('content')),
      importance: toNumberSafe(r.get('importance') as unknown),
    }));
  }

  private async fetchUserStats(
    tx: Transaction,
    userId: string
  ): Promise<{
    totalThreads: number;
    totalMemories: number;
    avgImportance: number;
    lastMemoryAt: string | number | Date;
  }> {
    const qb = cypher()
      .match(
        '(u:User {id: $userId})-[:OWNS_THREAD]->(t:Thread)-[:HAS_MEMORY]->(m:Memory)'
      )
      .return(
        'count(DISTINCT t) as totalThreads, count(m) as totalMemories, avg(m.importance) as avgImportance, max(m.createdAt) as lastMemoryAt'
      )
      .addParameter('userId', userId);

    const { cypher: query, parameters } = qb.build();
    const res = await tx.run(query, parameters);
    const rec = res.records[0];
    return rec
      ? {
          totalThreads: toNumberSafe(rec.get('totalThreads') as unknown),
          totalMemories: toNumberSafe(rec.get('totalMemories') as unknown),
          avgImportance: toNumberSafe(rec.get('avgImportance') as unknown),
          lastMemoryAt: rec.get('lastMemoryAt') as string | number | Date,
        }
      : {
          totalThreads: 0,
          totalMemories: 0,
          avgImportance: 0,
          lastMemoryAt: Date.now(),
        };
  }

  /**
   * Convert Chroma query/get results to MemoryEntry[]
   */
  // The ChromaDB SDK returns different shapes for search vs get.
  // We normalize both with careful parsing; suppressing some lint rules for SDK typings.

  private convertToMemoryEntries(
    results:
      | ChromaSearchResult
      | GetResult<Record<string, string | number | boolean | null>>
  ): MemoryEntry[] {
    const memories: MemoryEntry[] = [];
    if (!results || !(results as any).ids) {
      return memories;
    }

    const ids = Array.isArray((results as any).ids[0])
      ? (results as any).ids[0]
      : (results as any).ids;
    const documents = (results as any).documents
      ? Array.isArray((results as any).documents[0])
        ? (results as any).documents[0]
        : (results as any).documents
      : [];
    const metadatas = (results as any).metadatas
      ? Array.isArray((results as any).metadatas[0])
        ? (results as any).metadatas[0]
        : (results as any).metadatas
      : [];
    const embeddings = (results as any).embeddings
      ? Array.isArray((results as any).embeddings[0])
        ? (results as any).embeddings[0]
        : (results as any).embeddings
      : [];
    const distances = (results as any).distances
      ? Array.isArray((results as any).distances[0])
        ? (results as any).distances[0]
        : (results as any).distances
      : [];

    for (let i = 0; i < ids.length; i++) {
      const md = metadatas[i] ?? {};
      const additional = md.additionalMetadata
        ? safeParseJson(md.additionalMetadata as string)
        : {};

      memories.push({
        id: ids[i],
        threadId: md.threadId as string,
        content: documents[i] ?? '',
        embedding: embeddings[i] ?? undefined,
        metadata: {
          type: md.type ?? 'conversation',
          source: md.source ?? undefined,
          tags: md.tags
            ? String(md.tags).split(',').filter(Boolean)
            : undefined,
          importance: md.importance ?? 0.5,
          persistent: md.persistent ?? false,
          ...additional,
        },
        createdAt: md.createdAt ? new Date(md.createdAt as string) : new Date(),
        lastAccessedAt: md.lastAccessedAt
          ? new Date(md.lastAccessedAt as string)
          : undefined,
        accessCount: (md.accessCount as number) || 0,
        relevanceScore:
          distances[i] !== null && distances[i] !== undefined
            ? 1 - Number(distances[i])
            : undefined,
      });
    }

    return memories;
  }
}

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

function toNumberSafe(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  // Neo4j Integer from neo4j-driver has toNumber()
  const maybeInt = value as { toNumber?: () => number } | null | undefined;
  if (maybeInt && typeof maybeInt.toNumber === 'function') {
    try {
      return maybeInt.toNumber();
    } catch {
      /* ignore */
    }
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toDateSafe(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}
