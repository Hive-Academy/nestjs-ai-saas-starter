import { Injectable } from '@nestjs/common';

/**
 * Agent state structure for memory integration
 * Compatible with LangGraph AgentState pattern
 */
export interface AgentState {
  messages: any[]; // BaseMessage[] - using any to avoid LangChain dependency
  next?: string;
  current?: string;
  scratchpad?: string;
  task?: string;
  threadId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * User memory patterns extracted from historical interactions
 */
export interface UserMemoryPatterns {
  userId: string;
  commonTopics: string[];
  interactionFrequency: Record<string, number>;
  preferredMemoryTypes: string[];
  averageSessionLength: number;
  totalSessions: number;
  lastInteraction?: Date;
  preferredAgents?: string[];
  successfulWorkflows?: string[];
  frequentErrors?: string[];
}

/**
 * Memory context for agent execution
 * Provides comprehensive memory information from multiple scopes
 */
export interface AgentMemoryContext {
  // Conversation memories from current thread
  threadMemories: any[]; // MemoryEntry[] - using any to avoid memory module dependency

  // Cross-thread user memories
  userMemories: any[]; // MemoryEntry[] - using any to avoid memory module dependency

  // Agent-specific memories
  agentMemories: any[]; // MemoryEntry[] - using any to avoid memory module dependency

  // User behavioral patterns
  userPatterns: UserMemoryPatterns;

  // Confidence and relevance scores
  relevanceScore: number;
  contextWindow: number;
}

/**
 * LangGraph Store interface for cross-thread memory
 * Provides namespace-based hierarchical storage compatible with LangGraph 2025
 */
export interface Store {
  /**
   * Search for items in a namespace
   * @param namespace Hierarchical namespace path (e.g., ['user', 'conversations', 'thread_123'])
   * @param query Optional semantic search query
   * @returns Promise of matching items
   */
  search(namespace: string[], query?: string): Promise<any[]>;

  /**
   * Get a specific item by key
   * @param namespace Hierarchical namespace path
   * @param key Item key within the namespace
   * @returns Promise of the item or null if not found
   */
  get(namespace: string[], key: string): Promise<any | null>;

  /**
   * Store an item in a namespace
   * @param namespace Hierarchical namespace path
   * @param key Item key within the namespace
   * @param value Item value to store
   * @returns Promise of void
   */
  put(namespace: string[], key: string, value: unknown): Promise<void>;

  /**
   * Delete an item from a namespace
   * @param namespace Hierarchical namespace path
   * @param key Item key within the namespace
   * @returns Promise of void
   */
  delete(namespace: string[], key: string): Promise<void>;

  /**
   * List all items in a namespace
   * @param namespace Hierarchical namespace path
   * @returns Promise of items in the namespace
   */
  list(namespace: string[]): Promise<any[]>;
}

/**
 * Memory adapter interface for automagical injection
 * Follows the same pattern as ICheckpointAdapter and IStreamingService from langgraph-core
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for memory operations, enabling the automagical dependency injection pattern.
 */
@Injectable()
export abstract class IMemoryAdapter {
  /**
   * Get memory context for agent execution
   * Retrieves relevant memories from thread, user, and agent scopes
   */
  abstract getAgentContext(state: AgentState): Promise<AgentMemoryContext>;

  /**
   * Store agent execution result
   * Preserves agent decision patterns and execution context for learning
   */
  abstract storeAgentExecution(
    state: AgentState,
    result: Partial<AgentState>,
    agentId: string
  ): Promise<void>;

  /**
   * Store conversation turn (human + AI messages)
   * Maintains conversational context for future reference and learning
   */
  abstract storeConversationTurn(
    threadId: string,
    humanMessage: string,
    aiMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * LangGraph Store interface for cross-thread memory
   * Provides namespace-based hierarchical storage compatible with LangGraph 2025
   */
  abstract getStore(collection?: string): Store;

  /**
   * Search memories with query
   * Flexible search across different memory scopes and namespaces
   */
  abstract search(options: {
    query: string;
    threadId?: string;
    userId?: string;
    agentId?: string;
    limit?: number;
    namespace?: string[];
    minRelevance?: number;
  }): Promise<any[]>;

  /**
   * Store memory entry
   * Basic memory storage for thread-scoped content
   */
  abstract store(
    threadId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<string>;

  /**
   * Batch store operation for performance optimization
   * Store multiple memory entries in a single operation
   */
  abstract storeBatch(
    threadId: string,
    entries: Array<{
      content: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<string[]>;

  /**
   * Get user memory patterns
   * Extract behavioral patterns from user's historical interactions
   */
  abstract getUserPatterns(
    userId: string,
    limitDays?: number
  ): Promise<UserMemoryPatterns>;

  /**
   * Health check for memory system
   * Validates adapter availability and functionality
   */
  abstract isHealthy(): Promise<boolean>;
}

/**
 * Memory search options interface for type safety
 */
export interface MemorySearchOptions {
  query: string;
  threadId?: string;
  userId?: string;
  agentId?: string;
  limit?: number;
  namespace?: string[];
  minRelevance?: number;
  includeMetadata?: boolean;
  includeScores?: boolean;
}

/**
 * Type guards for memory adapter validation
 */
export function isMemoryAdapter(obj: any): obj is IMemoryAdapter {
  return (
    obj &&
    typeof obj.getAgentContext === 'function' &&
    typeof obj.storeAgentExecution === 'function' &&
    typeof obj.getStore === 'function' &&
    typeof obj.isHealthy === 'function'
  );
}
