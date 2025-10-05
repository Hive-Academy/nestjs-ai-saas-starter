import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
} from '@hive-academy/nestjs-chromadb';
import { VectorMemoryEntity } from '../../entities/chromadb/vector-memory.entity';

/**
 * VectorMemoryRepository - ChromaDB Repository for Vector Memories
 *
 * Purpose: Type-safe repository for AI agent memory storage and retrieval
 * Pattern: TypeORM-Style Repository with explicit constructor-based DI
 *
 * Features:
 * - Extends ChromaDBRepository<T> for automatic CRUD operations
 * - Explicit 3-parameter constructor (entity, collection, chromaDB)
 * - NO decorator magic - clear dependency injection
 * - Full type safety with VectorMemoryEntity
 *
 * Inherited CRUD Methods (from ChromaDBRepository):
 * - create(document): Create single document
 * - createMany(documents): Batch create
 * - findById(id): Find by ID
 * - findByIds(ids): Find multiple by IDs
 * - findAll(options): Find with filtering
 * - search(query, options): Semantic search
 * - searchWithScores(query, options): Search with similarity scores
 * - searchSimilar(embedding, options): Search by embedding vector
 * - update(id, data): Update document
 * - updateMany(updates): Batch update
 * - upsert(document): Create or update
 * - upsertMany(documents): Batch upsert
 * - delete(id): Delete by ID
 * - deleteMany(ids): Batch delete
 * - deleteByFilter(where, whereDocument): Delete by filter
 * - count(where, whereDocument): Count documents
 * - exists(id): Check existence
 * - peek(limit): Get first N documents
 * - clear(): Clear all documents
 * - getCollectionInfo(): Get collection metadata
 *
 * Custom Business Methods:
 * - findByAgent(): Get memories for specific agent
 * - findByThread(): Get memories for conversation thread
 * - searchMemories(): Semantic search with agent filter
 * - findHighImportance(): Get high-priority memories
 * - findByUser(): Get memories by user across all agents
 * - findByClassification(): Get memories by classification type
 */
@Injectable()
export class VectorMemoryRepository extends ChromaDBRepository<VectorMemoryEntity> {
  /**
   * Explicit constructor with proper DI
   *
   * @param chromaDB - ChromaDBService injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(VectorMemoryEntity, 'vector-memories', chromaDB);
  }

  // ==================== CUSTOM BUSINESS METHODS ====================

  /**
   * Find all memories for a specific agent
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param agentId - Agent ID
   * @param limit - Maximum number of memories to return
   * @returns Array of vector memories for the agent
   */
  async findByAgent(
    agentId: string,
    limit = 50
  ): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: { agentId } as any,
      limit,
    });
  }

  /**
   * Find all memories for a conversation thread
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param threadId - Thread/conversation ID
   * @returns Array of vector memories for the thread
   */
  async findByThread(threadId: string): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: { threadId } as any,
      limit: 1000,
    });
  }

  /**
   * Semantic search for memories with agent filtering
   * Uses ChromaDB server-side filtering during search for optimal performance
   *
   * @param query - Search query text
   * @param agentId - Agent ID to filter by
   * @param limit - Maximum number of results
   * @returns Array of semantically similar memories
   */
  async searchMemories(
    query: string,
    agentId: string,
    limit = 10
  ): Promise<VectorMemoryEntity[]> {
    return await this.search(query, {
      where: { agentId } as any,
      limit,
    });
  }

  /**
   * Find high-importance memories for an agent
   * Uses ChromaDB server-side filtering with comparison operators
   *
   * @param agentId - Agent ID
   * @param minImportance - Minimum importance threshold (0.0 - 1.0)
   * @returns Array of high-importance memories
   */
  async findHighImportance(
    agentId: string,
    minImportance = 0.7
  ): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: {
        agentId,
        importance: { $gte: minImportance },
      } as any,
      limit: 200,
    });
  }

  /**
   * Find memories by user across all agents
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param userId - User ID
   * @param limit - Maximum number of memories to return
   * @returns Array of vector memories for the user
   */
  async findByUser(userId: string, limit = 100): Promise<VectorMemoryEntity[]> {
    return await this.findAll({
      where: { userId } as any,
      limit,
    });
  }

  /**
   * Find memories by classification type
   * Uses ChromaDB server-side filtering for optimal performance
   *
   * @param classification - Memory classification (error, success, conversation, general)
   * @param agentId - Optional agent ID filter
   * @returns Array of vector memories matching classification
   */
  async findByClassification(
    classification: string,
    agentId?: string
  ): Promise<VectorMemoryEntity[]> {
    const where: any = { classification };
    if (agentId) {
      where.agentId = agentId;
    }

    return await this.findAll({
      where,
      limit: 1000,
    });
  }
}
