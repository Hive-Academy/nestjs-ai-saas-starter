import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IStreamableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for streaming operations
 */
export interface StreamingConfig {
  enabled?: boolean;
  /** Streaming protocol to use */
  protocol?: 'websocket' | 'sse' | 'grpc';
  /** Buffer size for streaming */
  bufferSize?: number;
  /** Batch updates before sending */
  batchUpdates?: boolean;
  /** Real-time streaming options */
  realtime?: {
    enabled?: boolean;
    /** Interval for updates in milliseconds */
    updateInterval?: number;
  };
  /** WebSocket specific configuration */
  websocket?: {
    port?: number;
    cors?: boolean;
    path?: string;
  };
}

/**
 * Result of streaming operations
 */
export interface StreamingResult {
  /** Unique identifier for the stream */
  streamId: string;
  /** Stream status */
  status: 'active' | 'paused' | 'completed' | 'error';
  /** Stream metadata */
  metadata: Record<string, any>;
  /** Number of events streamed */
  eventCount: number;
  /** Stream creation timestamp */
  createdAt: Date;
}

/**
 * Streaming event structure
 */
export interface StreamingEvent {
  /** Event type */
  type: string;
  /** Event data */
  data: any;
  /** Event timestamp */
  timestamp: Date;
  /** Stream ID */
  streamId: string;
  /** Sequence number */
  sequence: number;
}

/**
 * Stream input for workflow streaming
 */
export interface StreamInput {
  /** Workflow to stream */
  workflow: any;
  /** Streaming options */
  options?: {
    includeIntermediateSteps?: boolean;
    includeMetadata?: boolean;
    filter?: string[];
  };
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the enterprise streaming module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the specialized streaming module without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing streaming APIs
 * - Delegates to enterprise-grade streaming module when available
 * - Provides fallback to synchronous execution when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class StreamingAdapter
  extends BaseModuleAdapter<StreamingConfig, StreamingResult>
  implements
    ICreatableAdapter<StreamingConfig, StreamingResult>,
    IStreamableAdapter<StreamInput, StreamingEvent>
{
  protected readonly serviceName = 'streaming';

  constructor(
    @Optional()
    @Inject('StreamingManagerService')
    private readonly streamingManager?: any,
    @Optional()
    @Inject('StreamingProcessorService')
    private readonly streamingProcessor?: any
  ) {
    super();
  }

  /**
   * Create streaming handler - delegates to enterprise module if available
   * Falls back to synchronous execution when enterprise module not installed
   */
  async create(config: StreamingConfig): Promise<StreamingResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('Streaming is not enabled');
    }

    // Try enterprise streaming module first
    if (this.streamingManager) {
      this.logEnterpriseUsage('streaming handler creation');
      try {
        return await this.streamingManager.createStreamHandler(config);
      } catch (error) {
        this.logger.warn(
          'Enterprise streaming module failed, falling back to synchronous execution:',
          error
        );
        return this.createFallbackStream(config);
      }
    }

    // Try streaming processor
    if (this.streamingProcessor) {
      this.logger.log('Using streaming processor via adapter');
      try {
        return await this.streamingProcessor.create(config);
      } catch (error) {
        this.logger.warn(
          'Streaming processor failed, falling back to synchronous execution:',
          error
        );
        return this.createFallbackStream(config);
      }
    }

    // Fallback to synchronous execution
    this.logFallbackUsage(
      'streaming handler creation',
      'no enterprise services available'
    );
    return this.createFallbackStream(config);
  }

  /**
   * Stream workflow execution events
   */
  async *stream(
    input: StreamInput,
    options?: any
  ): AsyncGenerator<StreamingEvent, void, unknown> {
    // Try enterprise streaming service first
    if (this.streamingManager) {
      this.logEnterpriseUsage('workflow streaming');
      try {
        yield* this.streamingManager.streamWorkflow(input.workflow, {
          ...input.options,
          ...options,
        });
        return;
      } catch (error) {
        this.logger.warn(
          'Enterprise streaming failed, falling back to synchronous execution:',
          error
        );
      }
    }

    // Try streaming processor
    if (this.streamingProcessor) {
      this.logger.log('Using streaming processor for workflow streaming');
      try {
        yield* this.streamingProcessor.stream(input, options);
        return;
      } catch (error) {
        this.logger.warn(
          'Streaming processor failed, falling back to synchronous execution:',
          error
        );
      }
    }

    // Fallback to synchronous execution with single event
    this.logFallbackUsage('workflow streaming', 'executing synchronously');
    yield* this.createFallbackStreamGenerator(input);
  }

  /**
   * Stream workflow updates for a specific workflow
   */
  async streamUpdates(
    workflowId: string
  ): Promise<AsyncGenerator<StreamingEvent, void, unknown>> {
    if (this.streamingManager) {
      this.logEnterpriseUsage('workflow updates streaming');
      try {
        return this.streamingManager.streamUpdates(workflowId);
      } catch (error) {
        this.logger.warn('Failed to stream updates:', error);
        throw this.handleFallback(error as Error, 'workflow updates streaming');
      }
    }

    if (this.streamingProcessor) {
      try {
        return this.streamingProcessor.streamUpdates(workflowId);
      } catch (error) {
        this.logger.warn('Failed to stream updates via processor:', error);
        throw this.handleFallback(
          error as Error,
          'workflow updates streaming via processor'
        );
      }
    }

    throw new Error(
      'Workflow updates streaming requires enterprise streaming module'
    );
  }

  /**
   * Get status of a specific stream
   */
  async getStreamStatus(streamId: string): Promise<StreamingResult | null> {
    if (this.streamingManager) {
      try {
        return await this.streamingManager.getStreamStatus(streamId);
      } catch (error) {
        this.logger.warn('Failed to get stream status:', error);
        return null;
      }
    }

    if (this.streamingProcessor) {
      try {
        return await this.streamingProcessor.getStatus(streamId);
      } catch (error) {
        this.logger.warn('Failed to get stream status via processor:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Create fallback streaming result for synchronous execution
   */
  private createFallbackStream(config: StreamingConfig): StreamingResult {
    return {
      streamId: `fallback-${Date.now()}`,
      status: 'completed',
      metadata: {
        fallback: true,
        config,
      },
      eventCount: 1,
      createdAt: new Date(),
    };
  }

  /**
   * Create fallback stream generator for synchronous workflow execution
   */
  private async *createFallbackStreamGenerator(
    input: StreamInput
  ): AsyncGenerator<StreamingEvent, void, unknown> {
    const streamId = `fallback-${Date.now()}`;

    try {
      // Execute workflow synchronously
      const result = await input.workflow;

      yield {
        type: 'workflow_completed',
        data: result,
        timestamp: new Date(),
        streamId,
        sequence: 1,
      };
    } catch (error) {
      yield {
        type: 'workflow_error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
        streamId,
        sequence: 1,
      };
    }
  }

  /**
   * Check if enterprise streaming module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.streamingManager;
  }

  /**
   * Check if streaming processor is available
   */
  isStreamingProcessorAvailable(): boolean {
    return !!this.streamingProcessor;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const streamingProcessorAvailable = this.isStreamingProcessorAvailable();
    const fallbackMode = !enterpriseAvailable && !streamingProcessorAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('synchronous_fallback', 'basic_streaming');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_streaming',
        'real_time_streaming',
        'websocket_support',
        'sse_support',
        'grpc_streaming',
        'batch_updates',
        'stream_management'
      );
    }

    if (streamingProcessorAvailable) {
      capabilities.push('streaming_processor', 'workflow_streaming');
    }

    return {
      enterpriseAvailable,
      streamingProcessorAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createStreamingProvider(): StreamingAdapter {
  return new StreamingAdapter();
}
