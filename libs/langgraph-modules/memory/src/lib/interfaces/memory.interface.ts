import { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

/**
 * Memory entry structure
 */
export interface MemoryEntry {
  /**
   * Unique identifier for the memory entry
   */
  id: string;

  /**
   * Thread ID this memory belongs to
   */
  threadId: string;

  /**
   * Content of the memory
   */
  content: string;

  /**
   * Embedding vector for semantic search
   */
  embedding?: readonly number[];

  /**
   * Metadata associated with the memory
   */
  metadata: MemoryMetadata;

  /**
   * Timestamp when the memory was created
   */
  createdAt: Date;

  /**
   * Timestamp when the memory was last accessed
   */
  lastAccessedAt?: Date;

  /**
   * Number of times this memory has been accessed
   */
  accessCount: number;

  /**
   * Relevance score if retrieved through search
   */
  relevanceScore?: number;
}

/**
 * Memory metadata
 */
export interface MemoryMetadata {
  /**
   * Type of memory
   */
  type: 'conversation' | 'summary' | 'fact' | 'context' | 'custom';

  /**
   * Source of the memory
   */
  source?: string;

  /**
   * Tags for categorization
   */
  tags?: readonly string[];

  /**
   * Importance score (0-1)
   */
  importance?: number;

  /**
   * Whether this memory is persistent across sessions
   */
  persistent?: boolean;

  /**
   * Custom metadata fields
   */
  [key: string]: unknown;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  /**
   * Query text for semantic search
   */
  query?: string;

  /**
   * Thread IDs to search within
   */
  threadIds?: readonly string[];

  /**
   * Memory types to filter
   */
  types?: readonly MemoryMetadata['type'][];

  /**
   * Tags to filter by
   */
  tags?: readonly string[];

  /**
   * Minimum relevance score
   */
  minRelevance?: number;

  /**
   * Maximum number of results
   */
  limit?: number;

  /**
   * Whether to include embeddings in results
   */
  includeEmbeddings?: boolean;

  /**
   * Date range filter
   */
  dateRange?: {
    from?: Date;
    to?: Date;
  };

  /**
   * Sort options
   */
  sortBy?: 'relevance' | 'createdAt' | 'accessCount' | 'importance';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Memory summarization options
 */
export interface MemorySummarizationOptions {
  /**
   * Maximum number of messages to keep unsummarized
   */
  maxMessages?: number;

  /**
   * Maximum token count before summarization
   */
  maxTokens?: number;

  /**
   * Strategy for summarization
   */
  strategy?: 'progressive' | 'batch' | 'sliding-window';

  /**
   * Whether to preserve important messages
   */
  preserveImportant?: boolean;

  /**
   * Custom summarization prompt
   */
  customPrompt?: string;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
  /**
   * Storage backend configuration
   */
  storage: MemoryStorageConfig;

  /**
   * Embedding configuration
   */
  embedding?: MemoryEmbeddingConfig;

  /**
   * Summarization configuration
   */
  summarization?: MemorySummarizationOptions;

  /**
   * Retention policy
   */
  retention?: MemoryRetentionPolicy;

  /**
   * Whether to enable semantic search
   */
  enableSemanticSearch?: boolean;

  /**
   * Whether to enable automatic summarization
   */
  enableAutoSummarization?: boolean;
}

/**
 * Memory storage configuration
 */
export interface MemoryStorageConfig {
  /**
   * Storage type
   */
  type: 'memory' | 'redis' | 'postgres' | 'vector';

  /**
   * Redis configuration
   */
  redis?: {
    url?: string;
    keyPrefix?: string;
    ttl?: number;
  };

  /**
   * PostgreSQL configuration
   */
  postgres?: {
    connectionString?: string;
    tableName?: string;
  };

  /**
   * Vector database configuration
   */
  vector?: {
    provider: 'chromadb' | 'pinecone' | 'weaviate';
    config: Record<string, unknown>;
  };
}

/**
 * Memory embedding configuration
 */
export interface MemoryEmbeddingConfig {
  /**
   * Embedding provider
   */
  provider: 'openai' | 'cohere' | 'huggingface' | 'custom';

  /**
   * Model name
   */
  model?: string;

  /**
   * API key
   */
  apiKey?: string;

  /**
   * Embedding dimension
   */
  dimension?: number;

  /**
   * Custom embedding function
   */
  customEmbedder?: (text: string) => Promise<readonly number[]>;
}

/**
 * Memory retention policy
 */
export interface MemoryRetentionPolicy {
  /**
   * Maximum age of memories in milliseconds
   */
  maxAge?: number;

  /**
   * Maximum number of memories per thread
   */
  maxPerThread?: number;

  /**
   * Maximum total memories
   */
  maxTotal?: number;

  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;

  /**
   * Strategy for eviction
   */
  evictionStrategy?: 'lru' | 'lfu' | 'fifo' | 'importance';
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /**
   * Total number of memories
   */
  totalMemories: number;

  /**
   * Number of active threads
   */
  activeThreads: number;

  /**
   * Average memory size in bytes
   */
  averageMemorySize: number;

  /**
   * Total storage used in bytes
   */
  totalStorageUsed: number;

  /**
   * Number of searches performed
   */
  searchCount: number;

  /**
   * Average search time in milliseconds
   */
  averageSearchTime: number;

  /**
   * Number of summarizations performed
   */
  summarizationCount: number;

  /**
   * Cache hit rate
   */
  cacheHitRate: number;
}

/**
 * Memory service interface
 */
export interface MemoryServiceInterface {
  /**
   * Store a memory entry
   */
  store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<MemoryEntry>;

  /**
   * Store multiple memory entries
   */
  storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>
  ): Promise<readonly MemoryEntry[]>;

  /**
   * Retrieve memories by thread
   */
  retrieve(
    threadId: string,
    limit?: number
  ): Promise<readonly MemoryEntry[]>;

  /**
   * Search memories semantically
   */
  search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]>;

  /**
   * Summarize conversation history
   */
  summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string>;

  /**
   * Delete memories
   */
  delete(threadId: string, memoryIds?: readonly string[]): Promise<number>;

  /**
   * Clear all memories for a thread
   */
  clear(threadId: string): Promise<void>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<MemoryStats>;

  /**
   * Perform cleanup based on retention policy
   */
  cleanup(): Promise<number>;
}

/**
 * Memory validation schemas
 */
export const MemoryEntrySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.object({
    type: z.enum(['conversation', 'summary', 'fact', 'context', 'custom']),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    importance: z.number().min(0).max(1).optional(),
    persistent: z.boolean().optional(),
  }).passthrough(),
  createdAt: z.date(),
  lastAccessedAt: z.date().optional(),
  accessCount: z.number().min(0),
  relevanceScore: z.number().optional(),
});

export const MemorySearchOptionsSchema = z.object({
  query: z.string().optional(),
  threadIds: z.array(z.string()).optional(),
  types: z.array(
    z.enum(['conversation', 'summary', 'fact', 'context', 'custom'])
  ).optional(),
  tags: z.array(z.string()).optional(),
  minRelevance: z.number().min(0).max(1).optional(),
  limit: z.number().positive().optional(),
  includeEmbeddings: z.boolean().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  sortBy: z.enum(['relevance', 'createdAt', 'accessCount', 'importance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});