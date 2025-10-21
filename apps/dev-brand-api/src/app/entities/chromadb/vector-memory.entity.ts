import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * VectorMemoryMetadata - Metadata type for Vector Memory entities
 *
 * Purpose: Type-safe metadata for AI agent memory storage
 */
export interface VectorMemoryMetadata {
  /**
   * Agent ID associated with this memory
   */
  agentId: string;

  /**
   * Thread/conversation ID for context grouping
   */
  threadId: string;

  /**
   * User ID for multi-tenant isolation
   */
  userId: string;

  /**
   * Importance score (0.0 - 1.0)
   * Higher values indicate more critical memories
   */
  importance: number;

  /**
   * Memory classification (error, success, conversation, general)
   */
  classification: string;

  /**
   * ISO timestamp of memory creation
   */
  timestamp: string;

  /**
   * Extensible metadata for custom fields
   */
  [key: string]: unknown;
}

/**
 * VectorMemoryEntity - ChromaDB Entity for Vector-based Memory Storage
 *
 * Purpose: Vector-based memory storage for AI agent interactions
 * Usage: ChromaVectorAdapter for semantic search and memory retrieval
 *
 * IMPORTANT: This is a ChromaDB entity, NOT a Neo4j entity.
 * Do not confuse with Neo4j Memory entity (memory.entity.ts).
 *
 * Pattern: Entity Class with Decorators
 * Features:
 * - Auto-embedding of content field
 * - Automatic timestamp management
 * - UUID-based ID generation
 * - Type-safe metadata
 */
@ChromaEntity({
  collection: 'vector-memories',
  description: 'Vector-based memory storage for AI agent interactions',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class VectorMemoryEntity extends BaseChromaEntity<VectorMemoryMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Memory content for semantic search and embedding',
  })
  content!: string;

  metadata!: VectorMemoryMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
