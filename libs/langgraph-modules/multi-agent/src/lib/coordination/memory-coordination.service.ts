import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import {
  AgentDefinition,
  AgentState,
  MultiAgentResult,
} from '../interfaces/multi-agent.interface';
import { BackgroundMemoryService } from '../services/background-memory.service';

/**
 * Memory Coordination Service
 *
 * Handles memory-enhanced features for multi-agent coordination.
 * Responsible for:
 * - Agent compatibility learning and enhancement
 * - Coordination context optimization
 * - Performance pattern analysis
 * - Conversation storage and retrieval
 */
@Injectable()
export class MemoryCoordinationService {
  private readonly logger = new Logger(MemoryCoordinationService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter,
    @Optional()
    private readonly backgroundMemory?: BackgroundMemoryService
  ) {
    if (this.memoryAdapter) {
      this.logger.log('Memory adapter available - memory superpowers enabled');
      if (this.backgroundMemory) {
        this.logger.log(
          'BackgroundMemoryService available - using batched async writes'
        );
      } else {
        this.logger.warn(
          'BackgroundMemoryService not available - using direct writes'
        );
      }
    }
  }

  /**
   * Get agents by capability
   * Memory-enhanced with compatibility learning
   */
  async getAgentsByCapability(
    capability: string,
    agents: AgentDefinition[]
  ): Promise<AgentDefinition[]> {
    if (!this.memoryAdapter || agents.length === 0) {
      return agents;
    }

    try {
      const enhancedAgents = await this.enhanceAgentsWithCompatibility(
        agents,
        capability
      );
      this.logger.debug(
        `Enhanced ${agents.length} agents with compatibility patterns for capability: ${capability}`
      );
      return enhancedAgents;
    } catch (error) {
      this.logger.warn(`Failed to enhance agents with compatibility: ${error}`);
      return agents;
    }
  }

  /**
   * Enhance agents with compatibility patterns from memory
   */
  async enhanceAgentsWithCompatibility(
    agents: AgentDefinition[],
    capability: string
  ): Promise<AgentDefinition[]> {
    if (!this.memoryAdapter) return agents;

    try {
      // Get agent compatibility patterns from memory
      const compatibilityMemories = await this.memoryAdapter.search({
        query: `capability ${capability} agent compatibility performance`,
        limit: 20,
        minRelevance: 0.6,
      });

      // Extract performance scores for each agent
      const agentPerformance = new Map<string, number>();
      const agentCompatibility = new Map<string, string[]>();

      for (const memory of compatibilityMemories) {
        try {
          const data = JSON.parse(memory.content);
          if (data.agentId && data.performanceScore) {
            agentPerformance.set(data.agentId, data.performanceScore);
          }
          if (data.agentId && data.compatibleAgents) {
            agentCompatibility.set(data.agentId, data.compatibleAgents);
          }
        } catch {
          // Skip invalid JSON
        }
      }

      // Sort agents by learned performance patterns
      const enhancedAgents = [...agents].sort((a, b) => {
        const scoreA = agentPerformance.get(a.id) || 0.5;
        const scoreB = agentPerformance.get(b.id) || 0.5;
        return scoreB - scoreA; // Higher performance first
      });

      // Add compatibility metadata
      enhancedAgents.forEach((agent) => {
        const compatibleAgents = agentCompatibility.get(agent.id) || [];
        agent.metadata = {
          ...agent.metadata,
          learnedPerformance: agentPerformance.get(agent.id) || 0.5,
          compatibleAgents,
          memoryEnhanced: true,
        };
      });

      return enhancedAgents;
    } catch (error) {
      this.logger.warn(`Failed to enhance agents with compatibility: ${error}`);
      return agents;
    }
  }

  /**
   * Get optimal coordination context from learned patterns
   */
  async getOptimalCoordinationContext(
    networkId: string,
    input: any
  ): Promise<any> {
    if (!this.memoryAdapter) return {};

    try {
      const query = input.messages?.[0]?.content || input.messages?.[0] || '';

      // Phase 1: Get agent compatibility patterns
      const compatibilityMemories = await this.memoryAdapter.search({
        query: `network ${networkId} agent compatibility success`,
        limit: 10,
        minRelevance: 0.7,
      });

      // Phase 2: Get network optimization patterns
      const optimizationMemories = await this.memoryAdapter.search({
        query: `network optimization topology performance ${query}`,
        limit: 5,
        minRelevance: 0.6,
      });

      // Phase 3: Get performance patterns for similar tasks
      const performanceMemories = await this.memoryAdapter.search({
        query: `agent performance execution success ${query}`,
        limit: 15,
        minRelevance: 0.5,
      });

      return {
        agentCompatibility: this.extractCompatibilityPatterns(
          compatibilityMemories
        ),
        networkOptimizations:
          this.extractOptimizationPatterns(optimizationMemories),
        performancePatterns:
          this.extractPerformancePatterns(performanceMemories),
        contextGenerated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(`Failed to get coordination context: ${error}`);
      return {};
    }
  }

  /**
   * Store agent coordination event for learning
   */
  async storeAgentCoordinationEvent(eventData: {
    networkId: string;
    executionId: string;
    threadId: string;
    input: any;
    result: any;
    coordinationContext: any;
    executionTime: number;
    timestamp: string;
  }): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      const {
        networkId,
        executionId,
        result,
        executionTime,
        coordinationContext,
      } = eventData;

      // Store overall coordination event
      const coordinationEvent = {
        networkId,
        executionId,
        success: result.success,
        executionTime,
        agentPath: result.executionPath || [],
        coordinationContext,
        inputType: typeof eventData.input.messages?.[0],
        outputQuality: result.success ? 0.8 : 0.3,
        timestamp: eventData.timestamp,
      };

      await this.memoryAdapter.store(
        `agents.coordination.events.${networkId}`,
        JSON.stringify(coordinationEvent),
        {
          type: 'coordination_event',
          source: 'memory_coordination',
          networkId,
          executionId,
          importance: result.success ? 0.8 : 0.9,
          persistent: false,
          tags: JSON.stringify([
            'coordination',
            'execution',
            networkId,
            result.success ? 'success' : 'failure',
          ]),
        }
      );

      // Store individual agent performance data
      if (result.executionPath && Array.isArray(result.executionPath)) {
        await this.storeAgentPerformanceData(result.executionPath, eventData);
      }
    } catch (error) {
      this.logger.warn(`Failed to store coordination event: ${error}`);
    }
  }

  /**
   * Store individual agent performance data
   */
  async storeAgentPerformanceData(
    executionPath: string[],
    eventData: any
  ): Promise<void> {
    if (!this.memoryAdapter) return;

    try {
      for (let i = 0; i < executionPath.length; i++) {
        const agentId = executionPath[i];
        const isLastAgent = i === executionPath.length - 1;
        const wasSuccessful = eventData.result.success;

        const performanceData = {
          agentId,
          networkId: eventData.networkId,
          executionPosition: i,
          totalAgents: executionPath.length,
          wasLastAgent: isLastAgent,
          overallSuccess: wasSuccessful,
          executionTime: eventData.executionTime / executionPath.length,
          performanceScore: wasSuccessful ? (isLastAgent ? 0.9 : 0.7) : 0.3,
          timestamp: eventData.timestamp,
          context: {
            previousAgents: executionPath.slice(0, i),
            nextAgents: executionPath.slice(i + 1),
            coordinationContext: eventData.coordinationContext,
          },
        };

        await this.memoryAdapter.store(
          `agents.coordination.performance.${agentId}`,
          JSON.stringify(performanceData),
          {
            type: 'agent_performance',
            source: 'memory_coordination',
            agentId,
            networkId: eventData.networkId,
            importance: wasSuccessful ? 0.6 : 0.8,
            persistent: false,
            tags: JSON.stringify([
              'performance',
              'agent',
              agentId,
              eventData.networkId,
              wasSuccessful ? 'success' : 'failure',
            ]),
          }
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to store agent performance data: ${error}`);
    }
  }

  /**
   * Enhance input with memory context
   */
  async enhanceInputWithMemoryContext(
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    },
    threadId: string,
    networkId: string
  ): Promise<typeof input> {
    if (!this.memoryAdapter) {
      return input;
    }

    try {
      const mockState = {
        messages: input.messages.map((msg) =>
          typeof msg === 'string' ? new HumanMessage(msg) : msg
        ),
        threadId,
        userId: (input.config?.metadata?.userId as string) || 'unknown',
        current: networkId,
        metadata: {
          ...input.config?.metadata,
          networkId,
        },
        // Required AgentState fields from WorkflowState
        executionId: `exec_${Date.now()}`,
        status: 'active' as const,
        completedNodes: [],
        confidence: 1.0,
        retryCount: 0,
        timestamps: {
          started: new Date(),
        },
        startedAt: new Date(),
      } as unknown as AgentState;

      const memoryContext = await this.memoryAdapter.getAgentContext(mockState);

      const enhancedConfig: RunnableConfig = {
        ...input.config,
        metadata: {
          ...input.config?.metadata,
          memoryContext: {
            threadMemories: memoryContext.threadMemories,
            userMemories: memoryContext.userMemories,
            agentMemories: memoryContext.agentMemories,
            userPatterns: memoryContext.userPatterns,
            relevanceScore: memoryContext.relevanceScore,
            contextWindow: memoryContext.contextWindow,
          },
          memoryEnabled: true,
          memoryContextSize:
            memoryContext.threadMemories.length +
            memoryContext.userMemories.length +
            memoryContext.agentMemories.length,
        },
      };

      return {
        ...input,
        config: enhancedConfig,
      };
    } catch (error) {
      this.logger.warn(
        `Memory context enhancement failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return input;
    }
  }

  /**
   * Store conversation turn in memory
   */
  async storeConversationInMemory(
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
    },
    result: MultiAgentResult,
    threadId: string,
    executionId: string,
    networkId: string,
    agentCount: number
  ): Promise<void> {
    if (!this.memoryAdapter || !result.finalState?.messages) {
      return;
    }

    try {
      const humanMessage = input.messages[input.messages.length - 1];
      const humanContent =
        typeof humanMessage === 'string' ? humanMessage : humanMessage.content;

      const aiMessages = result.finalState.messages.filter(
        (msg) => msg._getType() === 'ai'
      );
      const aiContent =
        aiMessages.length > 0
          ? aiMessages[aiMessages.length - 1].content
          : 'No response generated';

      // TASK_2025_029: Extract userId from config with better fallback handling
      const userId =
        (input.config?.metadata?.userId as string) ||
        (input.config?.configurable?.user_id as string) ||
        undefined;

      // TASK_2025_029: Only store if userId is available (prevent 'unknown' agent errors)
      if (!userId) {
        this.logger.debug(
          `Skipping conversation memory storage - no userId available (execution: ${executionId})`
        );
        return;
      }

      const metadata = {
        executionId,
        networkId,
        agentPath: result.executionPath,
        executionTime: result.executionTime,
        success: result.success,
        timestamp: new Date().toISOString(),
        type: 'multi_agent_conversation',
        importance: result.success ? 0.8 : 0.5,
        userId, // Now guaranteed to be defined
        agentCount,
        checkpointEnabled: true,
        streamingEnabled: true,
        agentId: networkId, // TASK_2025_029: Use networkId as agentId for conversation context
      };

      // TASK_2025_029: Use BackgroundMemoryService for queued writes (batching + non-blocking)
      if (this.backgroundMemory) {
        await this.backgroundMemory.queueConversationWrite(
          threadId,
          String(humanContent),
          String(aiContent),
          metadata,
          'low' // Low priority for conversation storage
        );
      } else {
        // Fallback to direct write (no batching)
        await this.memoryAdapter.storeConversationTurn(
          threadId,
          String(humanContent),
          String(aiContent),
          metadata
        );
      }

      this.logger.debug(
        `Stored conversation turn in memory: ${executionId} (${String(
          humanContent
        ).slice(0, 50)}...)`
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store conversation in memory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ============================================================================
  // MEMORY PATTERN EXTRACTION HELPERS
  // ============================================================================

  private extractCompatibilityPatterns(memories: any[]): any[] {
    const patterns: any[] = [];

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.agentCompatibility) {
          patterns.push(data.agentCompatibility);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return patterns;
  }

  private extractOptimizationPatterns(memories: any[]): any[] {
    const patterns: any[] = [];

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.optimization) {
          patterns.push(data.optimization);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return patterns;
  }

  private extractPerformancePatterns(memories: any[]): any[] {
    const patterns: any[] = [];

    for (const memory of memories) {
      try {
        const data = JSON.parse(memory.content);
        if (data.performanceScore !== undefined) {
          patterns.push({
            agentId: data.agentId,
            score: data.performanceScore,
            context: data.context,
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return patterns;
  }
}
