import { Injectable, Logger, Inject } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  ICheckpointAdapter,
  IStreamingService,
} from '@hive-academy/langgraph-core';
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
import {
  AgentState,
  MultiAgentResult,
} from '../interfaces/multi-agent.interface';
import { NetworkManagerService } from '../network/network-manager.service';

/**
 * Stream Coordination Service
 *
 * Handles streaming workflow execution with checkpoint integration.
 * Responsible for:
 * - Stream setup and configuration
 * - Streaming event emission
 * - Periodic checkpoint saving during streaming
 * - Stream error handling
 */
@Injectable()
export class StreamCoordinationService {
  private readonly logger = new Logger(StreamCoordinationService.name);

  constructor(
    private readonly networkManager: NetworkManagerService,
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter,
    @Inject('IStreamingService')
    private readonly streamingService: IStreamingService
  ) {}

  /**
   * Stream workflow execution
   */
  streamWorkflow(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): AsyncGenerator<Partial<AgentState>, MultiAgentResult, unknown> {
    const threadId = this.generateThreadId(networkId);

    // Prepare checkpoint-enabled config for streaming
    const checkpointConfig: RunnableConfig = {
      ...input.config,
      configurable: {
        ...input.config?.configurable,
        thread_id: threadId,
      },
      tags: [
        ...(input.config?.tags || []),
        'multi-agent',
        'auto-checkpoint',
        'streaming',
      ],
      metadata: {
        ...input.config?.metadata,
        networkId,
        threadId,
        streamMode: input.streamMode || 'values',
        checkpointEnabled: !!this.checkpointAdapter,
      },
    };

    // Set up streaming bridge with checkpoint-enabled config
    return this.bridgeNetworkStreaming(networkId, {
      ...input,
      config: checkpointConfig,
    });
  }

  /**
   * Initialize streaming capabilities for multi-agent operations
   */
  initializeStreamingCapabilities(): void {
    this.logger.debug('Streaming service available:', !!this.streamingService);
  }

  /**
   * Set up streaming hooks for agent events
   */
  async setupAgentStreamingHooks(): Promise<void> {
    if (!this.streamingService) {
      this.logger.debug(
        'Streaming service not available - skipping agent streaming hooks'
      );
      return;
    }

    this.logger.debug('Setting up agent streaming hooks');
    // Additional streaming hook setup can be added here
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Bridge streaming between networkManager and streaming service
   */
  private async *bridgeNetworkStreaming(
    networkId: string,
    input: {
      messages: string[] | HumanMessage[];
      config?: RunnableConfig;
      streamMode?: 'values' | 'updates' | 'messages';
    }
  ): AsyncGenerator<Partial<AgentState>, MultiAgentResult, unknown> {
    const executionId = this.generateExecutionId(networkId);
    const threadId =
      (input.config?.metadata?.threadId as string) ||
      this.generateThreadId(networkId);
    const startTime = Date.now();

    // Save initial checkpoint for streaming if adapter is available
    if (this.checkpointAdapter) {
      try {
        await this.saveWorkflowCheckpoint(threadId, {
          networkId,
          executionId,
          phase: 'stream_start',
          messages: input.messages,
          streamMode: input.streamMode || 'values',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to save initial streaming checkpoint: ${error}`
        );
      }
    }

    // Stream start event
    if (this.streamingService) {
      await this.streamingService.emitEvent('stream_start', {
        executionId,
        networkId,
        threadId,
        timestamp: new Date(),
        metadata: {
          checkpointEnabled: !!this.checkpointAdapter,
          streamMode: input.streamMode || 'values',
        },
      });
    }

    // Get the original stream from network manager
    const originalStream = this.networkManager.streamWorkflow(networkId, input);

    try {
      let stepCount = 0;
      for await (const update of originalStream) {
        stepCount++;

        // Save periodic checkpoints during streaming
        if (this.checkpointAdapter && stepCount % 5 === 0) {
          try {
            await this.saveWorkflowCheckpoint(threadId, {
              networkId,
              executionId,
              phase: 'stream_update',
              step: stepCount,
              current: update.current,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            this.logger.warn(
              `Failed to save streaming checkpoint at step ${stepCount}: ${error}`
            );
          }
        }

        // Stream progress events for each update
        if (this.streamingService && update) {
          await this.streamingService.emitEvent('agent_update', {
            executionId,
            networkId,
            threadId,
            current: update.current,
            timestamp: new Date(),
            metadata: {
              messageCount: update.messages?.length || 0,
              step: stepCount,
              checkpointSaved: this.checkpointAdapter && stepCount % 5 === 0,
            },
          });
        }

        yield update;
      }

      const executionTime = Date.now() - startTime;

      // Save final checkpoint
      if (this.checkpointAdapter) {
        try {
          await this.saveWorkflowCheckpoint(threadId, {
            networkId,
            executionId,
            phase: 'stream_complete',
            totalSteps: stepCount,
            executionTime,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.warn(
            `Failed to save final streaming checkpoint: ${error}`
          );
        }
      }

      // Stream completion
      if (this.streamingService) {
        await this.streamingService.emitEvent('stream_complete', {
          executionId,
          networkId,
          threadId,
          timestamp: new Date(),
          metadata: {
            totalSteps: stepCount,
            executionTime,
            checkpointSaved: !!this.checkpointAdapter,
          },
        });
      }
    } catch (error) {
      // Stream error
      if (this.streamingService) {
        await this.streamingService.emitEvent('stream_error', {
          executionId,
          networkId,
          threadId,
          error: (error as Error).message,
          timestamp: new Date(),
          metadata: {
            checkpointEnabled: !!this.checkpointAdapter,
          },
        });
      }
      throw error;
    }

    // Return from the generator
    return {
      finalState: {} as AgentState,
      executionPath: [],
      executionTime: Date.now() - startTime,
      success: true,
    };
  }

  /**
   * Generate thread ID for a network (consistent naming)
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

  /**
   * Save workflow checkpoint with state and metadata
   */
  private async saveWorkflowCheckpoint(
    threadId: string,
    state: Record<string, unknown>
  ): Promise<void> {
    if (!this.checkpointAdapter) {
      return;
    }

    try {
      const checkpoint = {
        id: `checkpoint_${threadId}_${Date.now()}`,
        channel_values: state,
      };

      const metadata = {
        threadId,
        timestamp: new Date().toISOString(),
        source: 'input' as const,
        step: 0,
        parents: {},
        networkId: state.networkId as string,
        executionId: state.executionId as string,
        phase: state.phase as string,
      };

      await this.checkpointAdapter.saveCheckpoint(
        threadId,
        checkpoint,
        metadata
      );

      this.logger.debug(`Checkpoint saved for thread ${threadId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save checkpoint for thread ${threadId}:`,
        error
      );
    }
  }
}
