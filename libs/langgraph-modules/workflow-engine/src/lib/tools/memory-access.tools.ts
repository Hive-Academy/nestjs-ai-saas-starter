import { IMemoryAdapter } from '@hive-academy/langgraph-core';
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../decorators/multi-agent/tool.decorator';

/**
 * Response interfaces for memory tools
 */
export interface MemorySearchResponse {
  success: boolean;
  memories?: Array<{
    content: string;
    timestamp: string;
    relevance: number;
    source: string;
  }>;
  totalFound?: number;
  error?: string;
  errorType?: string;
  timestamp: string;
}

export interface UserPatternsResponse {
  success: boolean;
  patterns?: {
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
  };
  error?: string;
  errorType?: string;
  timestamp: string;
}

export interface StoreMemoryResponse {
  success: boolean;
  message?: string;
  memoryId?: string;
  error?: string;
  errorType?: string;
  timestamp: string;
}

/**
 * Memory Access Tools
 *
 * TASK 3: Agent-driven memory access via LangChain tools
 *
 * Provides three tools for agents to autonomously access memory:
 * 1. search-memory - Search conversation history and past interactions
 * 2. get-user-patterns - Retrieve behavioral patterns and preferences
 * 3. store-memory - Store important information for future reference
 *
 * Pattern follows existing tool implementations:
 * - @Injectable() class with constructor injection
 * - @Tool() decorated methods with Zod schemas
 * - TypeScript interfaces for responses
 * - Comprehensive error handling
 * - Structured logging
 *
 * Usage:
 * Agents autonomously decide when to call these tools via LLM reasoning.
 * No hardcoded memory calls - full agent autonomy.
 */
@Injectable()
export class MemoryAccessTools {
  private readonly logger = new Logger(MemoryAccessTools.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {
    if (!this.memoryAdapter) {
      this.logger.warn(
        '⚠️  IMemoryAdapter not available - memory tools will return graceful errors'
      );
    } else {
      this.logger.log('✅ Memory Access Tools initialized with IMemoryAdapter');
    }
  }

  /**
   * Tool 1: Search Memory
   *
   * Allows agents to search conversation history and past interactions for relevant context.
   *
   * Example LLM reasoning:
   * "User mentioned API performance last week. Let me search for that context."
   * → Calls search-memory({ query: "API performance discussion", limit: 5 })
   */
  @Tool({
    name: 'search-memory',
    description:
      'Search conversation history and past interactions for relevant context. Use this when you need to recall previous discussions, find specific information, or understand what was said before about a topic.',
    schema: z.object({
      query: z
        .string()
        .describe(
          'Natural language query for what to search (e.g., "API performance discussion", "database migration plan", "user preferences for email notifications")'
        ),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe('Maximum number of results to return (default: 5, max: 20)'),
      minRelevance: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(0.6)
        .describe(
          'Minimum relevance score 0-1 for results (default: 0.6, higher = more relevant)'
        ),
      threadId: z
        .string()
        .optional()
        .describe(
          'Specific conversation thread to search (optional, searches all threads if omitted)'
        ),
      userId: z
        .string()
        .optional()
        .describe('Specific user to search memories for (optional)'),
    }),
  })
  async searchMemory({
    query,
    limit = 5,
    minRelevance = 0.6,
    threadId,
    userId,
  }: {
    query: string;
    limit?: number;
    minRelevance?: number;
    threadId?: string;
    userId?: string;
  }): Promise<MemorySearchResponse> {
    const startTime = Date.now();

    try {
      // Check if memory adapter available
      if (!this.memoryAdapter) {
        this.logger.warn(
          `Memory adapter unavailable - search-memory tool cannot execute`
        );
        return {
          success: false,
          error: 'Memory adapter not configured - memory search unavailable',
          errorType: 'ConfigurationError',
          timestamp: new Date().toISOString(),
        };
      }

      // Validate and constrain limit
      const constrainedLimit = Math.min(Math.max(limit, 1), 20);

      // Build search options
      const searchOptions: any = {
        query,
        limit: constrainedLimit,
        minRelevance,
      };

      if (threadId) {
        searchOptions.threadId = threadId;
      }

      if (userId) {
        searchOptions.userId = userId;
      }

      // Execute search
      this.logger.debug(
        `Searching memories: query="${query}", limit=${constrainedLimit}, minRelevance=${minRelevance}`
      );

      const memories = await this.memoryAdapter.search(searchOptions);

      if (!memories || memories.length === 0) {
        this.logger.debug(`No memories found for query: "${query}"`);
        return {
          success: true,
          memories: [],
          totalFound: 0,
          timestamp: new Date().toISOString(),
        };
      }

      // Transform results
      const transformedMemories = memories.map((memory: any) => ({
        content: memory.content || memory.text || '',
        timestamp:
          memory.timestamp || memory.createdAt || new Date().toISOString(),
        relevance: memory.score || memory.relevance || minRelevance,
        source: memory.source || memory.namespace || 'unknown',
      }));

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Found ${transformedMemories.length} memories for "${query}" in ${duration}ms`
      );

      return {
        success: true,
        memories: transformedMemories,
        totalFound: transformedMemories.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      this.logger.error(
        `❌ Memory search failed for "${query}" after ${duration}ms: ${errorMsg}`
      );

      return {
        success: false,
        error: errorMsg,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Tool 2: Get User Patterns
   *
   * Allows agents to retrieve behavioral patterns and preferences for personalization.
   *
   * Example LLM reasoning:
   * "Let me understand this user's communication style and preferences."
   * → Calls get-user-patterns({ userId: "user-123", limitDays: 30 })
   */
  @Tool({
    name: 'get-user-patterns',
    description:
      'Retrieve behavioral patterns and preferences for the current user. Use this to personalize responses, understand user habits, or adapt to their communication style.',
    schema: z.object({
      userId: z.string().describe('User ID to get patterns for'),
      limitDays: z
        .number()
        .optional()
        .default(30)
        .describe(
          'Look back this many days for pattern analysis (default: 30, max: 365)'
        ),
    }),
  })
  async getUserPatterns({
    userId,
    limitDays = 30,
  }: {
    userId: string;
    limitDays?: number;
  }): Promise<UserPatternsResponse> {
    const startTime = Date.now();

    try {
      // Check if memory adapter available
      if (!this.memoryAdapter) {
        this.logger.warn(
          `Memory adapter unavailable - get-user-patterns tool cannot execute`
        );
        return {
          success: false,
          error: 'Memory adapter not configured - user patterns unavailable',
          errorType: 'ConfigurationError',
          timestamp: new Date().toISOString(),
        };
      }

      // Validate and constrain limitDays
      const constrainedDays = Math.min(Math.max(limitDays, 1), 365);

      this.logger.debug(
        `Retrieving user patterns: userId="${userId}", limitDays=${constrainedDays}`
      );

      // Get user patterns via IMemoryAdapter
      const patterns = await this.memoryAdapter.getUserPatterns(
        userId,
        constrainedDays
      );

      if (!patterns) {
        this.logger.debug(`No patterns found for user: ${userId}`);
        return {
          success: true,
          patterns: {
            userId,
            commonTopics: [],
            interactionFrequency: {},
            preferredMemoryTypes: [],
            averageSessionLength: 0,
            totalSessions: 0,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Transform patterns to standardized format (already matches UserMemoryPatterns interface)
      const transformedPatterns = {
        userId: patterns.userId || userId,
        commonTopics: patterns.commonTopics || [],
        interactionFrequency: patterns.interactionFrequency || {},
        preferredMemoryTypes: patterns.preferredMemoryTypes || [],
        averageSessionLength: patterns.averageSessionLength || 0,
        totalSessions: patterns.totalSessions || 0,
        lastInteraction: patterns.lastInteraction,
        preferredAgents: patterns.preferredAgents || [],
        successfulWorkflows: patterns.successfulWorkflows || [],
        frequentErrors: patterns.frequentErrors || [],
      };

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Retrieved patterns for user "${userId}" (${transformedPatterns.commonTopics.length} topics) in ${duration}ms`
      );

      return {
        success: true,
        patterns: transformedPatterns,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      this.logger.error(
        `❌ Failed to retrieve patterns for user "${userId}" after ${duration}ms: ${errorMsg}`
      );

      return {
        success: false,
        error: errorMsg,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Tool 3: Store Memory
   *
   * Allows agents to store important information for future reference.
   *
   * Example LLM reasoning:
   * "This is an important decision the user made. I should remember it."
   * → Calls store-memory({ content: "User prefers PostgreSQL over MongoDB", importance: 0.8, tags: ["database", "preference"] })
   */
  @Tool({
    name: 'store-memory',
    description:
      'Store important information for future reference. Use this to remember key decisions, preferences, facts, or context that will be useful later.',
    schema: z.object({
      content: z
        .string()
        .describe(
          'What to remember (be specific and concise, e.g., "User prefers dark mode UI", "Decided to use PostgreSQL for analytics database")'
        ),
      importance: z
        .number()
        .min(0)
        .max(1)
        .describe(
          'Importance level 0-1 (0.3=minor, 0.5=normal, 0.7=important, 0.9=critical, 1.0=essential)'
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Tags for categorization (e.g., ["decision", "preference", "api", "database"])'
        ),
    }),
  })
  async storeMemory({
    content,
    importance,
    tags,
  }: {
    content: string;
    importance: number;
    tags?: string[];
  }): Promise<StoreMemoryResponse> {
    const startTime = Date.now();

    try {
      // Check if memory adapter available
      if (!this.memoryAdapter) {
        this.logger.warn(
          `Memory adapter unavailable - store-memory tool cannot execute`
        );
        return {
          success: false,
          error: 'Memory adapter not configured - memory storage unavailable',
          errorType: 'ConfigurationError',
          timestamp: new Date().toISOString(),
        };
      }

      // Validate importance
      const constrainedImportance = Math.min(Math.max(importance, 0), 1);

      // Generate memory ID
      const memoryId = `memory-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      this.logger.debug(
        `Storing memory: id="${memoryId}", importance=${constrainedImportance}, tags=${
          tags?.join(', ') || 'none'
        }`
      );

      // Store via IMemoryAdapter
      await this.memoryAdapter.store(memoryId, content, {
        importance: constrainedImportance,
        tags: tags || [],
        type: 'agent-stored',
        timestamp: new Date(),
        source: 'agent-tool',
      });

      const duration = Date.now() - startTime;
      const preview =
        content.length > 50 ? `${content.substring(0, 50)}...` : content;

      this.logger.log(
        `✅ Stored memory "${memoryId}" (${preview}) in ${duration}ms`
      );

      return {
        success: true,
        message: `Memory stored successfully: "${preview}"`,
        memoryId,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      this.logger.error(
        `❌ Failed to store memory after ${duration}ms: ${errorMsg}`
      );

      return {
        success: false,
        error: errorMsg,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
