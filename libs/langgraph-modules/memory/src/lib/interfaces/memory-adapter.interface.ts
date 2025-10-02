import { Injectable } from '@nestjs/common';
import {
  IMemoryAdapter,
  AgentState,
  AgentMemoryContext,
  UserMemoryPatterns,
  Store,
  MemorySearchOptions as CoreMemorySearchOptions,
} from '@hive-academy/langgraph-core';
import { MemoryEntry } from './memory.interface';
import { Store as MemoryStore } from './langgraph-store.interface';

/**
 * Extended memory adapter for memory module
 * Extends the core IMemoryAdapter with memory-specific functionality
 */
@Injectable()
export abstract class ExtendedMemoryAdapter extends IMemoryAdapter {
  /**
   * Enhanced agent context method with full MemoryEntry types
   */
  abstract override getAgentContext(
    state: AgentState
  ): Promise<AgentMemoryContext>;

  /**
   * Enhanced user patterns method with full UserMemoryPatterns type
   */
  abstract override getUserPatterns(
    userId: string,
    limitDays?: number
  ): Promise<UserMemoryPatterns>;

  /**
   * Enhanced store method with MemoryStore support
   */
  abstract override getStore(collection?: string): MemoryStore;

  /**
   * Enhanced search with local MemorySearchOptions
   */
  abstract searchMemories(
    options: CoreMemorySearchOptions
  ): Promise<MemoryEntry[]>;
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
  ): Promise<string> {
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

  /**
   * Enhanced search with MemorySearchOptions support
   * Provides type-safe search functionality for memory-specific implementations
   */
  async searchMemories(
    options: CoreMemorySearchOptions
  ): Promise<MemoryEntry[]> {
    // Convert CoreMemorySearchOptions to the basic search format
    const basicOptions = {
      query: options.query,
      threadId: options.threadId,
      userId: options.userId,
      agentId: options.agentId,
      limit: options.limit,
      namespace: options.namespace,
      minRelevance: options.minRelevance,
    };

    // Use the existing search method and cast results to MemoryEntry[]
    const results = await this.search(basicOptions);
    return results as MemoryEntry[];
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
