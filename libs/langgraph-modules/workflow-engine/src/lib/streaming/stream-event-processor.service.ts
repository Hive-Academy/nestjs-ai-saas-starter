import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StateGraph } from '@langchain/langgraph';
import type { StreamMetadata } from '@hive-academy/langgraph-streaming';
import {
  StreamEventDecoratorMetadata,
  StreamProgressDecoratorMetadata,
} from '@hive-academy/langgraph-streaming';
import type { IStreamingService } from '@hive-academy/langgraph-core';
import { WorkflowPerformanceMetadata } from '../interfaces/workflow-metadata.interface';

/**
 * Stream Event Processor Service - Adapter Pattern Implementation
 *
 * Delegates all streaming operations to IStreamingService adapter.
 * Provides simplified event processing and delegation coordination.
 *
 * Responsibilities:
 * - Event delegation to streaming adapter
 * - Progress delegation to streaming adapter
 * - Basic streaming options building
 * - Event filtering utilities
 */
@Injectable()
export class StreamEventProcessorService {
  private readonly logger = new Logger(StreamEventProcessorService.name);

  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject('IStreamingService')
    private readonly streamingService: IStreamingService
  ) {}

  /**
   * Stream execution - delegates to adapter
   */
  async streamExecution<
    TState extends Record<string, any> = Record<string, any>
  >(
    graph: StateGraph<TState>,
    input: TState,
    options: {
      executionId: string;
      streamConfig?: StreamMetadata;
      checkpointingEnabled?: boolean;
      includeMetadata?: boolean;
    }
  ): Promise<void> {
    const { executionId, streamConfig } = options;

    this.logger.debug(
      `Delegating stream execution for ${executionId} to adapter`
    );

    try {
      // Delegate execution start event to adapter
      await this.streamingService.emitEvent('execution_start', {
        executionId,
        input,
        config: streamConfig,
      });

      // Setup streaming configuration
      const streamingOptions = this.buildStreamingOptions(streamConfig);

      // Process execution stream via adapter
      // Since StateGraph doesn't have a direct stream method, we'll use invoke and simulate streaming
      try {
        const result = await (graph as any).invoke(input, streamingOptions);
        // Simulate streaming by yielding the result
        const update = result;

        // Delegate update processing to adapter
        this.streamingService.streamEvent(executionId, 'workflow', update);

        // Delegate progress events if configured
        if (streamConfig?.enableProgress) {
          this.streamingService.streamProgress(
            executionId,
            'workflow',
            this.extractProgressData(update)
          );
        }
      } catch (invocationError) {
        this.logger.error(
          `Failed to invoke graph for ${executionId}:`,
          invocationError
        );
        const errorMessage =
          invocationError instanceof Error
            ? invocationError.message
            : String(invocationError);

        // Delegate error event to adapter
        await this.streamingService.emitEvent('execution_error', {
          executionId,
          error: errorMessage,
          phase: 'invocation',
        });
      }

      // Delegate execution completion event to adapter
      await this.streamingService.emitEvent('execution_complete', {
        executionId,
        completed: true,
      });

      this.logger.debug(`Stream execution completed for ${executionId}`);
    } catch (error) {
      this.logger.error(`Stream execution failed for ${executionId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Delegate fatal error to adapter
      await this.streamingService.emitEvent('execution_error', {
        executionId,
        error: errorMessage,
        phase: 'execution',
        fatal: true,
      });
    }
  }

  /**
   * Stream event - delegates to adapter
   */
  streamEvent(
    executionId: string,
    nodeId: string,
    event: any,
    config?: StreamEventDecoratorMetadata
  ): void {
    // Apply event filtering if configured - simplified since filter is complex type
    if (config?.filter) {
      // Simple filtering - just log that filtering would be applied
      this.logger.debug(
        `Filter configured for ${executionId}:${nodeId} - would apply filtering`
      );
    }

    // Delegate to adapter
    this.streamingService.streamEvent(executionId, nodeId, event);

    // Emit to local EventEmitter2 for backwards compatibility
    this.eventEmitter.emit('stream.event', { executionId, nodeId, event });

    this.logger.debug(`Delegated stream event for ${executionId}:${nodeId}`);
  }

  /**
   * Emit execution event - delegates to adapter
   */
  async emitExecutionEvent(
    eventType: string,
    executionId: string,
    data?: any
  ): Promise<void> {
    return this.streamingService.emitEvent(eventType, { executionId, ...data });
  }

  /**
   * Create execution event - alias for emitExecutionEvent
   */
  createExecutionEvent(
    eventType: string,
    executionId: string,
    data?: any
  ): any {
    const executionData = { executionId, ...data };
    this.streamingService.emitEvent(eventType, executionData);
    return executionData;
  }

  /**
   * Stream progress - delegates to adapter
   */
  streamProgress(
    executionId: string,
    nodeId: string,
    update: any,
    config?: StreamProgressDecoratorMetadata
  ): void {
    const progressData = this.extractProgressData(update, config);
    this.streamingService.streamProgress(executionId, nodeId, progressData);
  }

  /**
   * Emit progress event - delegates to adapter
   */
  async emitProgress(executionId: string, progressData: any): Promise<void> {
    return this.streamingService.emitProgress('workflow_progress', {
      executionId,
      ...progressData,
    });
  }

  /**
   * Stream checkpoint event - delegates to adapter
   */
  streamCheckpointEvent<TMetadata = WorkflowPerformanceMetadata>(
    executionId: string,
    nodeId: string,
    metadata: TMetadata,
    isInitial = false
  ): void {
    const checkpointData = {
      metadata,
      isInitial,
      timestamp: new Date().toISOString(),
    };

    this.streamingService.streamEvent(executionId, nodeId, checkpointData);
  }

  /**
   * Create checkpoint event - alias for streamCheckpointEvent
   */
  createCheckpointEvent<TMetadata = WorkflowPerformanceMetadata>(
    executionId: string,
    nodeId: string,
    metadata: TMetadata,
    isInitial = false
  ): any {
    const checkpointData = {
      metadata,
      isInitial,
      timestamp: new Date().toISOString(),
    };

    this.streamingService.streamEvent(executionId, nodeId, checkpointData);
    return checkpointData;
  }

  /**
   * Stream metadata event - delegates to adapter
   */
  streamMetadataEvent(
    executionId: string,
    nodeId: string,
    metadata: any,
    metadataType = 'general'
  ): void {
    const metadataEvent = {
      metadata,
      metadataType,
      extractedAt: new Date().toISOString(),
    };

    this.streamingService.streamEvent(executionId, nodeId, metadataEvent);
  }

  /**
   * Apply event filters - utility method
   */
  applyEventFilters(event: any, filters: string[]): boolean {
    // Simplified filter implementation
    for (const filter of filters) {
      if (filter.startsWith('level:')) {
        const requiredLevel = filter.substring(6);
        if (event.metadata?.eventLevel !== requiredLevel) {
          return false;
        }
      } else if (filter.startsWith('category:')) {
        const requiredCategory = filter.substring(9);
        if (event.metadata?.category !== requiredCategory) {
          return false;
        }
      } else if (filter.startsWith('tag:')) {
        const requiredTag = filter.substring(4);
        if (!event.metadata?.tags?.includes(requiredTag)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extract progress data from update - utility method
   */
  extractProgressData(
    update: any,
    config?: StreamProgressDecoratorMetadata
  ): any {
    // Simplified progress extraction
    return {
      completed: this.extractCompletedSteps(update),
      total: this.extractTotalSteps(update),
      percentage: this.calculatePercentage(update),
      phase: this.extractExecutionPhase(update),
      estimatedTimeRemaining: this.estimateTimeRemaining(update),
    };
  }

  /**
   * Build streaming options from configuration - utility method
   */
  buildStreamingOptions(streamConfig?: StreamMetadata): any {
    if (!streamConfig) {
      return {};
    }

    return {
      streamMode: streamConfig.modes || ['values'],
      streamSubgraphs: streamConfig.includeSubgraphs || false,
      debug: streamConfig.debug || false,
    };
  }

  /**
   * Utility methods for update analysis
   */
  private extractExecutionPhase(update: any): string {
    return update.phase || update.stage || 'execution';
  }

  private extractCompletedSteps(update: any): number {
    return update.completed || update.progress?.completed || 0;
  }

  private extractTotalSteps(update: any): number {
    return update.total || update.progress?.total || 100;
  }

  private calculatePercentage(update: any): number {
    const completed = this.extractCompletedSteps(update);
    const total = this.extractTotalSteps(update);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  private estimateTimeRemaining(update: any): number {
    // Simplified estimation
    return update.estimatedTimeRemaining || 0;
  }
}
