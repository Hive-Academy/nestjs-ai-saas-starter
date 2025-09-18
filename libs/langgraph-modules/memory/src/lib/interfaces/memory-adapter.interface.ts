import { Injectable } from '@nestjs/common';
import { AgentState, AgentMemoryContext } from './agent-memory.interface';
import { Store } from './langgraph-store.interface';

/**
 * Memory adapter interface for automagical injection
 * Follows the same pattern as ICheckpointAdapter and IStreamingService
 *
 * This abstract class serves as both a contract definition and NestJS injection token
 * for memory operations, enabling the automagical dependency injection pattern
 * that makes memory superpowers available across all modules without consumer changes.
 */
@Injectable()
export abstract class IMemoryAdapter {
  /**
   * Get memory context for agent execution
   * Retrieves relevant memories from thread, user, and agent scopes
   *
   * @param state Current agent state containing context information
   * @returns Promise of comprehensive memory context for agent execution
   */
  abstract getAgentContext(state: AgentState): Promise<AgentMemoryContext>;

  /**
   * Store agent execution result
   * Preserves agent decision patterns and execution context for learning
   *
   * @param state Initial agent state
   * @param result Agent execution result
   * @param agentId Unique identifier for the executing agent
   */
  abstract storeAgentExecution(
    state: AgentState,
    result: Partial<AgentState>,
    agentId: string
  ): Promise<void>;

  /**
   * Store conversation turn (human + AI messages)
   * Maintains conversational context for future reference and learning
   *
   * @param threadId Thread identifier for conversation grouping
   * @param humanMessage Human message content
   * @param aiMessage AI response content
   * @param metadata Additional context metadata
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
   *
   * @param collection Optional collection name for scoping
   * @returns Store instance for LangGraph operations
   */
  abstract getStore(collection?: string): Store;

  /**
   * Search memories with query
   * Flexible search across different memory scopes and namespaces
   *
   * @param options Search parameters including query, filters, and limits
   * @returns Promise of matching memory entries
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
   *
   * @param threadId Thread identifier for memory grouping
   * @param content Memory content to store
   * @param metadata Additional metadata for memory classification
   * @returns Promise of stored memory identifier
   */
  abstract store(
    threadId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<any>;

  /**
   * Health check for memory system
   * Validates adapter availability and functionality
   *
   * @returns Promise indicating adapter health status
   */
  abstract isHealthy(): Promise<boolean>;

  /**
   * Batch store operation for performance optimization
   * Store multiple memory entries in a single operation
   *
   * @param threadId Thread identifier for memory grouping
   * @param entries Array of memory entries to store
   * @returns Promise of stored memory identifiers
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
   *
   * @param userId User identifier
   * @param limitDays Optional limit for pattern analysis timeframe
   * @returns Promise of user memory patterns
   */
  abstract getUserPatterns(userId: string, limitDays?: number): Promise<any>;
}

/**
 * Memory adapter implementation
 * Concrete implementation of IMemoryAdapter using existing services
 *
 * This class coordinates between MemoryService, vector storage, and graph storage
 * to provide comprehensive memory functionality following the automagical pattern.
 */
@Injectable()
export class MemoryManagerAdapter extends IMemoryAdapter {
  constructor(
    private readonly memoryService: any, // MemoryService from memory module
    private readonly vectorService: any, // ChromaVectorAdapter
    private readonly graphService?: any // Neo4jGraphAdapter - optional
  ) {
    super();
  }

  async getAgentContext(state: AgentState): Promise<AgentMemoryContext> {
    // Use enhanced ChromaVectorAdapter method if available
    if (this.vectorService.searchAgentMemories) {
      const lastMessage = state.messages?.[state.messages.length - 1];
      const query = lastMessage?.content || '';
      return this.vectorService.searchAgentMemories(
        'agent_memories',
        query,
        state,
        10
      );
    }

    // Fallback to basic memory search
    const memories = await this.memoryService.search({
      query: state.messages?.[state.messages.length - 1]?.content || '',
      threadId: state.threadId,
      userId: state.userId,
      limit: 10,
    });

    return {
      threadMemories: memories.filter(
        (m: any) => m.metadata?.threadId === state.threadId
      ),
      userMemories: memories.filter(
        (m: any) => m.metadata?.userId === state.userId
      ),
      agentMemories: memories.filter(
        (m: any) => m.metadata?.agentId === state.current
      ),
      userPatterns: await this.getUserPatterns(state.userId || ''),
      relevanceScore: 0.8,
      contextWindow: memories.length,
    };
  }

  async storeAgentExecution(
    state: AgentState,
    result: Partial<AgentState>,
    agentId: string
  ): Promise<void> {
    // Store agent execution with enhanced context
    if (this.vectorService.storeAgentMemory) {
      const executionMemory = JSON.stringify({
        input: state.messages?.[state.messages.length - 1]?.content,
        output: result.messages?.[result.messages.length - 1]?.content,
        agentId,
        timestamp: new Date().toISOString(),
        success: !result.metadata?.error,
      });

      await this.vectorService.storeAgentMemory(
        'agent_memories',
        agentId,
        state,
        executionMemory,
        {
          type: 'agent_execution',
          agentId,
          success: !result.metadata?.error,
          importance: result.metadata?.error ? 0.9 : 0.7,
        }
      );
    } else {
      // Fallback to basic memory storage
      await this.memoryService.store(
        state.threadId || 'unknown',
        JSON.stringify({
          input: state.messages?.[state.messages.length - 1]?.content,
          output: result.messages?.[result.messages.length - 1]?.content,
          agentId,
        }),
        {
          type: 'agent_execution',
          agentId,
          success: !result.metadata?.error,
        }
      );
    }
  }

  async storeConversationTurn(
    threadId: string,
    humanMessage: string,
    aiMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const turnId = `${threadId}-turn-${Date.now()}`;

    // Store conversation turn as batch operation
    await this.storeBatch(threadId, [
      {
        content: humanMessage,
        metadata: {
          type: 'conversation',
          role: 'human',
          turnId,
          ...metadata,
        },
      },
      {
        content: aiMessage,
        metadata: {
          type: 'conversation',
          role: 'assistant',
          turnId,
          ...metadata,
        },
      },
    ]);
  }

  getStore(collection = 'langgraph_store'): Store {
    // Import and create ChromaLangGraphStore
    const { ChromaLangGraphStore } = require('./langgraph-store.interface');
    return new ChromaLangGraphStore(this.vectorService, collection);
  }

  async search(options: {
    query: string;
    threadId?: string;
    userId?: string;
    agentId?: string;
    limit?: number;
    namespace?: string[];
    minRelevance?: number;
  }): Promise<any[]> {
    if (options.namespace) {
      // Use LangGraph Store interface for namespace-based search
      const store = this.getStore();
      return store.search(options.namespace, options.query);
    } else {
      // Use traditional memory search
      return this.memoryService.search({
        query: options.query,
        threadId: options.threadId,
        userId: options.userId,
        limit: options.limit || 10,
      });
    }
  }

  async store(
    threadId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<any> {
    return this.memoryService.store(threadId, content, metadata);
  }

  async storeBatch(
    threadId: string,
    entries: Array<{
      content: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<string[]> {
    if (this.memoryService.storeBatch) {
      return this.memoryService.storeBatch(threadId, entries);
    }

    // Fallback to individual store operations
    const results: string[] = [];
    for (const entry of entries) {
      const id = await this.store(threadId, entry.content, entry.metadata);
      results.push(id);
    }
    return results;
  }

  async getUserPatterns(userId: string, limitDays = 30): Promise<any> {
    if (!userId) {
      return {
        userId: 'unknown',
        commonTopics: [],
        interactionFrequency: {},
        preferredMemoryTypes: [],
        averageSessionLength: 0,
        totalSessions: 0,
      };
    }

    // Use graph service for pattern analysis if available
    if (this.graphService?.analyzeConversationPatterns) {
      return this.graphService.analyzeConversationPatterns(userId, limitDays);
    }

    // Fallback to basic pattern extraction
    const userMemories = await this.search({
      query: '',
      userId,
      limit: 100,
    });

    return {
      userId,
      commonTopics: this.extractTopics(userMemories),
      interactionFrequency: this.calculateFrequency(userMemories),
      preferredMemoryTypes: this.extractMemoryTypes(userMemories),
      averageSessionLength: this.calculateAverageLength(userMemories),
      totalSessions: this.countSessions(userMemories),
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test basic memory operations
      await this.memoryService.getStats?.();

      // Test vector service if available
      if (this.vectorService.getStats) {
        await this.vectorService.getStats('health_check');
      }

      // Test graph service if available
      if (this.graphService?.isHealthy) {
        await this.graphService.isHealthy();
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Private helper methods for pattern analysis
  private extractTopics(memories: any[]): string[] {
    const topics = new Set<string>();
    memories.forEach((memory) => {
      if (memory.metadata?.topics) {
        memory.metadata.topics.forEach((topic: string) => topics.add(topic));
      }
    });
    return Array.from(topics).slice(0, 10);
  }

  private calculateFrequency(memories: any[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    memories.forEach((memory) => {
      const date = new Date(memory.createdAt).toDateString();
      frequency[date] = (frequency[date] || 0) + 1;
    });
    return frequency;
  }

  private extractMemoryTypes(memories: any[]): string[] {
    const types = new Set<string>();
    memories.forEach((memory) => {
      if (memory.metadata?.type) {
        types.add(memory.metadata.type);
      }
    });
    return Array.from(types);
  }

  private calculateAverageLength(memories: any[]): number {
    if (memories.length === 0) return 0;
    const totalLength = memories.reduce(
      (sum, memory) => sum + (memory.content?.length || 0),
      0
    );
    return totalLength / memories.length;
  }

  private countSessions(memories: any[]): number {
    const sessions = new Set<string>();
    memories.forEach((memory) => {
      if (memory.metadata?.threadId) {
        sessions.add(memory.metadata.threadId);
      }
    });
    return sessions.size;
  }
}

/**
 * Factory for creating memory adapter instances
 * Supports different service configurations and graceful degradation
 */
export class MemoryAdapterFactory {
  static create(
    memoryService: any,
    vectorService?: any,
    graphService?: any
  ): IMemoryAdapter {
    return new MemoryManagerAdapter(memoryService, vectorService, graphService);
  }

  /**
   * Create adapter with health check validation
   */
  static async createWithHealthCheck(
    memoryService: any,
    vectorService?: any,
    graphService?: any
  ): Promise<IMemoryAdapter | null> {
    try {
      const adapter = new MemoryManagerAdapter(
        memoryService,
        vectorService,
        graphService
      );
      const isHealthy = await adapter.isHealthy();
      return isHealthy ? adapter : null;
    } catch (error) {
      return null;
    }
  }
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

/**
 * Search options interface for type safety
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
