import { z } from 'zod';
import type { BaseMessage } from '@langchain/core/messages';

// Advanced serializable types for complex metadata structures
export type SerializableValue = string | number | boolean | null | undefined;
export type SerializableArray = readonly SerializableValue[];
export type SerializableObject = {
  readonly [K in string]?:
    | SerializableValue
    | SerializableArray
    | SerializableObject;
};

// Generic metadata type that allows complex nested structures
export type MetadataValue =
  | SerializableValue
  | SerializableArray
  | SerializableObject;

// Memory-specific metadata that's compatible with ChromaDB metadata
export interface MemoryMetadata {
  readonly type:
    | 'conversation'
    | 'fact'
    | 'preference'
    | 'summary'
    | 'context'
    | 'custom';
  readonly source?: string;
  readonly tags?: string; // Store as JSON string for ChromaDB compatibility
  readonly importance?: number; // 0-1 scale
  readonly persistent?: boolean;
  readonly userId?: string;
  readonly [key: string]: MetadataValue;
}

// Core memory entry for the application layer
export interface MemoryEntry {
  readonly id: string;
  readonly threadId: string;
  readonly content: string;
  readonly embedding?: readonly number[];
  readonly metadata: MemoryMetadata;
  readonly createdAt: Date;
  readonly lastAccessedAt?: Date;
  readonly accessCount: number;
  readonly relevanceScore?: number;
}

// Search options for memory queries
export interface MemorySearchOptions {
  readonly query?: string;
  readonly threadId?: string;
  readonly userId?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly minRelevance?: number;
  readonly tags?: string[]; // Mutable for easier filtering
  readonly type?: MemoryMetadata['type'];
  readonly startDate?: Date;
  readonly endDate?: Date;
}

// Summarization options
export interface MemorySummarizationOptions {
  readonly maxLength?: number;
  readonly strategy?: 'recent' | 'important' | 'balanced';
  readonly includeMetadata?: boolean;
}

// Configuration interfaces
export interface MemoryConfig {
  readonly collection?: string;
  readonly enableAutoSummarization?: boolean;
  readonly summarization?: {
    readonly maxMessages?: number;
    readonly strategy?: 'recent' | 'important' | 'balanced';
  };
  readonly retention?: MemoryRetentionPolicy;
  readonly chromadb?: {
    readonly collection?: string;
  };
  readonly neo4j?: {
    readonly database?: string;
  };
}

export interface MemoryRetentionPolicy {
  readonly maxEntries?: number;
  readonly maxAge?: number; // milliseconds
  readonly maxPerThread?: number;
  readonly maxTotal?: number;
  readonly cleanupInterval?: number; // milliseconds
  readonly evictionStrategy?: 'lru' | 'lfu' | 'fifo' | 'importance';
  readonly importance?: {
    readonly threshold?: number;
    readonly strategy?: 'keep_above' | 'keep_top_n';
  };
}

// Stats and analytics
export interface MemoryOperationMetrics {
  readonly operationType: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly duration?: number;
  readonly success: boolean;
  readonly threadId?: string;
  readonly memoryId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface MemoryStats {
  readonly totalMemories: number;
  readonly activeThreads: number;
  readonly averageMemorySize: number;
  readonly totalStorageUsed: number;
  readonly searchCount: number;
  readonly averageSearchTime: number;
  readonly summarizationCount: number;
  readonly cacheHitRate: number;
}

// User patterns and behavior
export interface UserMemoryPatterns {
  readonly userId: string;
  readonly commonTopics: readonly string[];
  readonly interactionFrequency: Record<string, number>;
  readonly preferredMemoryTypes: ReadonlyArray<MemoryMetadata['type']>;
  readonly averageSessionLength: number;
  readonly totalSessions: number;
}

// Service interface
export interface MemoryServiceInterface {
  store(
    threadId: string,
    content: string,
    metadata?: Partial<MemoryMetadata>,
    userId?: string
  ): Promise<MemoryEntry>;

  storeBatch(
    threadId: string,
    entries: ReadonlyArray<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
    }>,
    userId?: string
  ): Promise<readonly MemoryEntry[]>;

  retrieve(threadId: string, limit?: number): Promise<readonly MemoryEntry[]>;

  search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]>;

  searchForContext(
    query: string,
    threadId: string,
    userId?: string
  ): Promise<{
    relevantMemories: readonly MemoryEntry[];
    userPatterns: UserMemoryPatterns | null;
    confidence: number;
  }>;

  summarize(
    threadId: string,
    messages: readonly BaseMessage[],
    options?: MemorySummarizationOptions
  ): Promise<string>;

  delete(threadId: string, memoryIds?: readonly string[]): Promise<number>;

  clear(threadId: string): Promise<void>;

  getStats(): Promise<MemoryStats>;

  cleanup(): Promise<number>;

  buildSemanticRelationships(): Promise<void>;

  getUserPatterns(userId: string): Promise<UserMemoryPatterns>;

  getConversationFlow(threadId: string): Promise<
    ReadonlyArray<{
      memoryId: string;
      content: string;
      type: string;
      createdAt: Date;
      connections: readonly string[];
    }>
  >;
}

// Recursive schema for complex metadata structures
const SerializableValueSchema: z.ZodType<MetadataValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.undefined(),
    z.array(
      z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
    ),
    z.record(SerializableValueSchema),
  ])
);

// Validation schemas
export const MemoryEntrySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z
    .object({
      type: z.enum([
        'conversation',
        'fact',
        'preference',
        'summary',
        'context',
        'custom',
      ]),
      source: z.string().optional(),
      tags: z.string().optional(), // JSON string for ChromaDB compatibility
      importance: z.number().min(0).max(1).optional(),
      persistent: z.boolean().optional(),
      userId: z.string().optional(),
    })
    .and(z.record(SerializableValueSchema)),
  createdAt: z.date(),
  lastAccessedAt: z.date().optional(),
  accessCount: z.number().min(0),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const MemorySearchOptionsSchema = z.object({
  query: z.string().optional(),
  threadId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
  minRelevance: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  type: z
    .enum([
      'conversation',
      'fact',
      'preference',
      'summary',
      'context',
      'custom',
    ])
    .optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});
