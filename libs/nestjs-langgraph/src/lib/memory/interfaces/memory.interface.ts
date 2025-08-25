import { z } from 'zod';
import { BaseMessage } from '@langchain/core/messages';

// Basic memory entry structure
export interface MemoryEntry {
  id: string;
  threadId: string;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  createdAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  relevanceScore?: number;
}

// Memory metadata structure
export interface MemoryMetadata {
  type: 'conversation' | 'fact' | 'preference' | 'summary' | 'context' | 'custom';
  source?: string;
  tags?: string[];
  importance?: number; // 0-1 scale
  persistent?: boolean;
  [key: string]: unknown; // Allow additional metadata
}

// Search options for memory queries
export interface MemorySearchOptions {
  query?: string;
  threadId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  minRelevance?: number;
  tags?: string[];
  type?: MemoryMetadata['type'];
  startDate?: Date;
  endDate?: Date;
}

// Summarization options
export interface MemorySummarizationOptions {
  maxLength?: number;
  strategy?: 'recent' | 'important' | 'balanced';
  includeMetadata?: boolean;
}

// Configuration interfaces  
export interface MemoryServiceConfig {
  collection?: string;
  enableAutoSummarization?: boolean;
  summarization?: {
    maxMessages?: number;
    strategy?: 'recent' | 'important' | 'balanced';
  };
  retention?: MemoryRetentionPolicy;
}

export interface MemoryStorageConfig {
  chromadb?: {
    collection?: string;
    host?: string;
    port?: number;
  };
  neo4j?: {
    uri?: string;
    user?: string;
    password?: string;
    database?: string;
  };
}

export interface MemoryRetentionPolicy {
  maxEntries?: number;
  maxAge?: number; // milliseconds
  maxPerThread?: number;
  maxTotal?: number;
  cleanupInterval?: number; // milliseconds
  evictionStrategy?: 'lru' | 'lfu' | 'fifo' | 'importance';
  importance?: {
    threshold?: number;
    strategy?: 'keep_above' | 'keep_top_n';
  };
}

// Stats and analytics
export interface MemoryOperationMetrics {
  operationType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  threadId?: string;
  memoryId?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryUsageMetrics {
  totalMemories: number;
  totalSize: number;
  averageSize: number;
  memoryDistribution: Record<string, number>;
  cacheHitRate: number;
  queryLatency: number;
}

export interface MemoryStats {
  totalMemories: number;
  activeThreads: number;
  averageMemorySize: number;
  totalStorageUsed: number;
  searchCount: number;
  averageSearchTime: number;
  summarizationCount: number;
  cacheHitRate: number;
}

// User patterns and behavior
export interface UserMemoryPatterns {
  userId: string;
  commonTopics: string[];
  interactionFrequency: Record<string, number>;
  preferredMemoryTypes: MemoryMetadata['type'][];
  averageSessionLength: number;
  totalSessions: number;
}

// Storage-specific types
export interface StorageStats {
  provider: 'chromadb' | 'neo4j' | 'hybrid';
  totalEntries: number;
  storageUsed: number;
  averageQueryTime: number;
  healthStatus: 'healthy' | 'degraded' | 'offline';
}

// ChromaDB specific types
export interface ChromaWhereClause {
  [key: string]: 
    | string 
    | number 
    | boolean 
    | { $eq?: any; $ne?: any; $gt?: number; $gte?: number; $lt?: number; $lte?: number; $in?: any[]; $nin?: any[] };
}

export interface ChromaQueryResults {
  ids: string[];
  documents: string[];
  metadatas: Record<string, unknown>[];
  distances: number[];
  embeddings?: number[][];
}

// Service interface
export interface MemoryServiceInterface {
  store(threadId: string, content: string, metadata?: Partial<MemoryMetadata>, userId?: string): Promise<MemoryEntry>;
  storeBatch(threadId: string, entries: ReadonlyArray<{ content: string; metadata?: Partial<MemoryMetadata>; }>, userId?: string): Promise<readonly MemoryEntry[]>;
  retrieve(threadId: string, limit?: number): Promise<readonly MemoryEntry[]>;
  search(options: MemorySearchOptions): Promise<readonly MemoryEntry[]>;
  searchForContext(query: string, threadId: string, userId?: string): Promise<{
    relevantMemories: MemoryEntry[];
    userPatterns: UserMemoryPatterns | null;
    confidence: number;
  }>;
  summarize(threadId: string, messages: readonly BaseMessage[], options?: MemorySummarizationOptions): Promise<string>;
  delete(threadId: string, memoryIds?: readonly string[]): Promise<number>;
  clear(threadId: string): Promise<void>;
  getStats(): Promise<MemoryStats>;
  cleanup(): Promise<number>;
  buildSemanticRelationships(): Promise<void>;
  getUserPatterns(userId: string): Promise<UserMemoryPatterns>;
  getConversationFlow(threadId: string): Promise<Array<{
    memoryId: string;
    content: string;
    type: string;
    createdAt: Date;
    connections: string[];
  }>>;
}

// Validation schemas
export const MemoryEntrySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.object({
    type: z.enum(['conversation', 'fact', 'preference', 'summary', 'context', 'custom']),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    importance: z.number().min(0).max(1).optional(),
    persistent: z.boolean().optional(),
  }).and(z.record(z.unknown())),
  createdAt: z.date(),
  lastAccessedAt: z.date().optional(),
  accessCount: z.number(),
  relevanceScore: z.number().optional(),
});

export const MemorySearchOptionsSchema = z.object({
  query: z.string().optional(),
  threadId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  minRelevance: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['conversation', 'fact', 'preference', 'summary', 'context', 'custom']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});