import {
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
} from '@hive-academy/nestjs-chromadb';

/**
 * LangGraphStoreMetadata - Metadata type for LangGraph Store items
 *
 * Purpose: Type-safe metadata for hierarchical namespace-based storage
 */
export interface LangGraphStoreMetadata {
  /**
   * Store namespace (array serialized as string)
   */
  namespace: string;

  /**
   * Store namespace as key (joined with /)
   */
  namespaceKey: string;

  /**
   * Store item key
   */
  key: string;

  /**
   * Store item type identifier
   */
  type: 'store_item';

  /**
   * ISO timestamp of item creation
   */
  createdAt: string;

  /**
   * ISO timestamp of last update
   */
  updatedAt: string;

  /**
   * Namespace depth (hierarchy level)
   */
  namespace_depth: number;

  /**
   * Root namespace segment
   */
  namespace_root: string;

  /**
   * Value type (string, object, etc.)
   */
  value_type: string;

  /**
   * Serialized value length
   */
  serialized_length: number;

  /**
   * Extensible metadata for custom fields
   */
  [key: string]: unknown;
}

/**
 * LangGraphStoreEntity - ChromaDB Entity for LangGraph Store Storage
 *
 * Purpose: Hierarchical namespace-based storage for cross-thread memory sharing
 * Usage: StoreService for namespace-based storage and retrieval
 *
 * IMPORTANT: This is a ChromaDB entity for Store operations, NOT Memory operations.
 * Do not confuse with VectorMemoryEntity (vector-memories collection).
 *
 * Pattern: Entity Class with Decorators
 * Features:
 * - Auto-embedding of serialized value field
 * - Automatic timestamp management
 * - Deterministic ID generation (store:{namespace}:{key})
 * - Type-safe metadata
 */
@ChromaEntity({
  collection: 'langgraph-stores',
  description: 'Hierarchical namespace-based storage for LangGraph Store',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: false, // IDs are deterministic based on namespace + key
  idStrategy: 'custom', // Custom ID: store:{namespace}:{key}
})
export class LangGraphStoreEntity extends BaseChromaEntity<LangGraphStoreMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Store item key for identification',
  })
  key!: string;

  @ChromaProp({
    description: 'Namespace key (joined with /) for filtering',
  })
  namespaceKey!: string;

  @ChromaProp({
    description: 'Serialized value content for semantic search',
  })
  content!: string;

  metadata!: LangGraphStoreMetadata;
  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}
