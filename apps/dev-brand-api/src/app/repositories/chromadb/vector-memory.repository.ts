import { Injectable } from '@nestjs/common';
import {
  BaseChromaRepository,
  ChromaRepository,
} from '@hive-academy/nestjs-chromadb';
import { VectorMemoryEntity } from '../../entities/chromadb/vector-memory.entity';

/**
 * VectorMemoryRepository - ChromaDB Repository for Vector Memories
 *
 * Purpose: Type-safe repository for AI agent memory storage and retrieval
 * Pattern: Entity & Repository Pattern with auto-generated CRUD methods
 *
 * Auto-Generated Methods (from BaseChromaRepository):
 * - create(document): Create single document
 * - createMany(documents): Batch create
 * - findById(id): Find by ID
 * - findAll(options): Find with filtering
 * - search(query, options): Semantic search
 * - update(id, data): Update document
 * - delete(id): Delete by ID
 * - count(filter): Count documents
 * - exists(id): Check existence
 * - ... 20+ more methods
 *
 * Custom Business Methods:
 * - findByAgent(): Get memories for specific agent
 * - findByThread(): Get memories for conversation thread
 * - searchMemories(): Semantic search with agent filter
 * - findHighImportance(): Get high-priority memories
 */
@Injectable()
@ChromaRepository<VectorMemoryEntity>({
  collection: 'vector-memories',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
  autoTimestamp: true,
})
export class VectorMemoryRepository extends BaseChromaRepository<VectorMemoryEntity> {
  /**
   * Find all memories for a specific agent
   */
  async findByAgent(
    agentId: string,
    limit = 50
  ): Promise<VectorMemoryEntity[]> {
    return this.findAll({
      where: { agentId } as any,
      limit,
    });
  }

  /**
   * Find all memories for a conversation thread
   */
  async findByThread(threadId: string): Promise<VectorMemoryEntity[]> {
    return this.findAll({
      where: { threadId } as any,
    });
  }

  /**
   * Semantic search for memories with agent filtering
   */
  async searchMemories(
    query: string,
    agentId: string,
    limit = 10
  ): Promise<VectorMemoryEntity[]> {
    return this.search(query, {
      where: { agentId } as any,
      limit,
    });
  }

  /**
   * Find high-importance memories for an agent
   */
  async findHighImportance(
    agentId: string,
    minImportance = 0.7
  ): Promise<VectorMemoryEntity[]> {
    return this.findAll({
      where: {
        agentId,
        importance: { $gte: minImportance },
      } as any,
    });
  }

  /**
   * Find memories by user across all agents
   */
  async findByUser(userId: string, limit = 100): Promise<VectorMemoryEntity[]> {
    return this.findAll({
      where: { userId } as any,
      limit,
    });
  }

  /**
   * Find memories by classification type
   */
  async findByClassification(
    classification: string,
    agentId?: string
  ): Promise<VectorMemoryEntity[]> {
    const where: any = { classification };
    if (agentId) {
      where.agentId = agentId;
    }

    return this.findAll({ where });
  }
}
