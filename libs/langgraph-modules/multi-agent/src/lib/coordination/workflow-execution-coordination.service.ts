import type {
  ICheckpointAdapter,
  IMemoryAdapter,
  IStreamingService,
} from '@hive-academy/langgraph-core';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { MultiAgentResult } from '../interfaces/multi-agent.interface';
import { NetworkManagerService } from '../network/network-manager.service';
import { MemoryCoordinationService } from './memory-coordination.service';
import { CoordinationLearningService } from './coordination-learning.service';

/**
 * Workflow Execution Coordination Service
 *
 * Handles workflow execution orchestration with checkpoint and memory integration.
 * Responsible for:
 * - Workflow execution with checkpoint management
 * - Memory context integration
 * - Execution result processing
 * - Thread and execution ID generation
 */
@Injectable()
export class WorkflowExecutionCoordinationService {
  private readonly logger = new Logger(
    WorkflowExecutionCoordinationService.name
  );

  constructor(
    private readonly networkManager: NetworkManagerService,
    private readonly memoryCoordination: MemoryCoordinationService,
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter,
    @Inject('IStreamingService')
    private readonly streamingService: IStreamingService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter,
    @Optional()
    private readonly coordinationLearningService?: CoordinationLearningService
  ) {}

  /**
   * Execute multi-agent workflow
   * Memory-enhanced with intelligent coordination through memory-based learning
   */
  async executeWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): Promise<MultiAgentResult> {
    const executionId = this.generateExecutionId(networkId);
    const threadId = this.generateThreadId(networkId);

    /**
     * REMOVED: Pre-execution memory loading (LangGraph 2025 alignment)
     *
     * Rationale:
     * - Blocking memory operations caused 25+ second workflow start delays
     * - LangGraph 2025 recommends "memory-in-nodes" pattern via store parameter
     * - Pre-execution memory loading violates instant workflow execution principle
     * - Coordination context will be provided via BaseStore interface (Priority 4)
     *
     * See: implementation-plan.md:113-208 (Priority 1: Remove Pre-Execution Memory)
     */

    // Memory superpowers: Get optimal agent coordination based on learned patterns
    // COMMENTED OUT: Blocking pre-execution memory call (25+ second delay)
    // let coordinationContext: any = {};
    // if (this.memoryAdapter) {
    // try {
    // coordinationContext =
    // await this.memoryCoordination.getOptimalCoordinationContext(
    // networkId,
    // input
    // );
    // this.logger.debug(
    // `Retrieved coordination context for network ${networkId}`,
    // {
    // agentCompatibility:
    // coordinationContext.agentCompatibility?.length || 0,
    // networkOptimizations:
    // coordinationContext.networkOptimizations?.length || 0,
    // performancePatterns:
    // coordinationContext.performancePatterns?.length || 0,
    // }
    // );
    // } catch (error) {
    // this.logger.warn(`Failed to get coordination context: ${error}`);
    // }
    // }
    //
    // Automagical: Enhance initial state with memory context if available
    // COMMENTED OUT: Blocking input enhancement (causes cascade failures)
    // let enhancedInput = input;
    // if (this.memoryAdapter) {
    // try {
    // enhancedInput =
    // await this.memoryCoordination.enhanceInputWithMemoryContext(
    // input,
    // threadId,
    // networkId
    // );
    // this.logger.debug(
    // `Enhanced input with memory context for execution ${executionId}`
    // );
    // } catch (error) {
    // this.logger.warn(
    // `Failed to enhance input with memory context: ${
    // error instanceof Error ? error.message : String(error)
    // }`
    // );
    // }
    // }

    // Initialize empty coordination context and use input directly (instant start)
    const coordinationContext: any = {};
    const enhancedInput = input;

    // Initialize state.metadata BEFORE workflow execution (TASK_2025_037)
    // This ensures metadata exists from the very beginning of workflow execution
    const initialState = {
      messages: enhancedInput.messages || [],
      metadata: {
        // Common metadata fields (unified state architecture)
        userId: enhancedInput.config?.metadata?.userId,
        executionId,
        threadId,
        workflowType: networkId,
        networkId,
        // Agent coordination metadata (for multi-agent workflows)
        active_agent: undefined,
        lastAgent: undefined,
        // Merge any existing metadata from input
        ...enhancedInput.config?.metadata,
        // Coordination intelligence (preserved for backward compatibility)
        coordinationContext,
        agentCompatibility: coordinationContext.agentCompatibility || [],
        networkOptimizations: coordinationContext.networkOptimizations || [],
        performancePatterns: coordinationContext.performancePatterns || [],
      },
    };

    // Prepare checkpoint-enabled config (maintain backward compatibility)
    const checkpointConfig: RunnableConfig = {
      ...enhancedInput.config,
      configurable: {
        ...enhancedInput.config?.configurable,
        thread_id: threadId,
      },
      tags: [
        ...(enhancedInput.config?.tags || []),
        'multi-agent',
        'auto-checkpoint',
      ],
      metadata: {
        ...enhancedInput.config?.metadata,
        networkId,
        executionId,
        threadId,
        checkpointEnabled: !!this.checkpointAdapter,
        memoryEnabled: !!this.memoryAdapter,
        // Memory superpowers: Inject coordination intelligence
        coordinationContext,
        agentCompatibility: coordinationContext.agentCompatibility || [],
        networkOptimizations: coordinationContext.networkOptimizations || [],
        performancePatterns: coordinationContext.performancePatterns || [],
      },
    };

    // BUGFIX (TASK_2025_032): Removed manual checkpoint saves
    // LangGraph's compile({ checkpointer }) handles all checkpointing internally

    // Stream workflow start event
    if (this.streamingService) {
      await this.streamingService.emitEvent('workflow_start', {
        executionId,
        networkId,
        threadId,
        input: { messageCount: input.messages.length },
        timestamp: new Date(),
        metadata: {
          agentCount:
            this.networkManager.getNetworkConfig(networkId)?.agents?.length ||
            0,
          checkpointEnabled: !!this.checkpointAdapter,
        },
      });
    }

    // Memory superpowers: Track execution start time for performance learning
    const executionStartTime = Date.now();

    const result = await this.networkManager.executeWorkflow(networkId, {
      ...initialState,
      config: checkpointConfig,
    });

    // Memory superpowers: Store agent coordination patterns and performance
    if (this.memoryAdapter && result) {
      try {
        await this.memoryCoordination.storeAgentCoordinationEvent({
          networkId,
          executionId,
          threadId,
          input: enhancedInput,
          result,
          coordinationContext,
          executionTime: Date.now() - executionStartTime,
          timestamp: new Date().toISOString(),
        });
        this.logger.debug(
          `Stored coordination event for learning: ${executionId}`
        );
      } catch (error) {
        this.logger.warn(`Failed to store coordination event: ${error}`);
      }
    }

    // BUGFIX (TASK_2025_032): Removed completion checkpoint save
    // LangGraph handles all checkpointing automatically

    // TASK_2025_029 Phase 1: Async background memory writes (non-blocking)
    // Changed from blocking await to fire-and-forget background queue
    if (this.memoryAdapter && result) {
      this.memoryCoordination
        .storeConversationInMemory(
          enhancedInput,
          result,
          threadId,
          executionId,
          networkId,
          this.networkManager.getNetworkConfig(networkId)?.agents?.length || 0
        )
        .then(() => {
          this.logger.debug(
            `Stored conversation turn in memory for execution ${executionId}`
          );
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to store conversation in memory: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
    }

    // Background coordination learning (fire-and-forget)
    if (this.coordinationLearningService && result) {
      this.coordinationLearningService
        .learnFromExecution(result)
        .catch((err) =>
          this.logger.warn(
            `Background coordination learning failed (non-blocking): ${err}`
          )
        );
    }

    // Stream workflow completion event
    if (this.streamingService && result) {
      await this.streamingService.emitEvent('workflow_complete', {
        executionId,
        networkId,
        threadId,
        result: {
          success: result.success,
          executionTime: result.executionTime,
          executionPath: result.executionPath,
        },
        timestamp: new Date(),
        metadata: {
          checkpointSaved: !!this.checkpointAdapter,
        },
      });
    }

    return result;
  }

  /**
   * Quick execute: Simple text-based workflow execution
   * Automagical: Memory context and storage handled automatically
   */
  async executeSimpleWorkflow(
    networkId: string,
    message: string,
    options?: {
      streamMode?: 'values' | 'updates' | 'messages';
      config?: RunnableConfig;
    }
  ): Promise<MultiAgentResult> {
    return this.executeWorkflow(networkId, {
      messages: [message],
      streamMode: options?.streamMode,
      config: options?.config,
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate thread ID for a network (consistent naming)
   * Uses NodeIdBuilder to create canonical thread ID
   */
  private generateThreadId(networkId: string): string {
    try {
      return NodeIdBuilder.create()
        .domain('multi-agent')
        .phase('network')
        .activity(networkId)
        .build();
    } catch (error) {
      this.logger.warn(
        `Failed to generate canonical thread ID, using fallback: ${error}`
      );
      return `multi-agent.network.${networkId}`;
    }
  }

  /**
   * Generate execution ID for streaming events
   */
  private generateExecutionId(networkId: string): string {
    return `exec_${networkId}_${Date.now()}`;
  }

  // BUGFIX (TASK_2025_032): Removed saveWorkflowCheckpoint() method entirely
  // This method created malformed checkpoints missing channel_versions and versions_seen
  // LangGraph's compile({ checkpointer }) handles all checkpointing correctly
}
