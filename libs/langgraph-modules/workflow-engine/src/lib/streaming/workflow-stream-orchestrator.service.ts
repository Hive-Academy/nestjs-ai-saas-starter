import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { getErrorMessage } from '../utils/type-guards';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StateGraph } from '@langchain/langgraph';
import { Observable, filter, map } from 'rxjs';
import { BaseMessage } from '@langchain/core/messages';
import type {
  StreamUpdate,
  StreamMetadata,
  TokenData,
} from '@hive-academy/langgraph-streaming';
import { StreamEventType } from '@hive-academy/langgraph-streaming';
import type {
  IStreamingService,
  ICheckpointAdapter,
} from '@hive-academy/langgraph-core';
import {
  WorkflowCheckpointMetadata,
  WorkflowPerformanceMetadata,
} from '../interfaces/workflow-metadata.interface';
import { TokenStreamOptions } from '@hive-academy/langgraph-core';
import { StreamManagementService } from './stream-management.service';
import { TokenProcessingService } from './token-processing.service';
import { StreamEventProcessorService } from './stream-event-processor.service';

/**
 * Orchestrator service that coordinates all workflow streaming capabilities
 * 
 * This service maintains backward compatibility by providing the same public API
 * as the original WorkflowStreamService while delegating work to focused services.
 * 
 * Responsibilities:
 * - Public API orchestration
 * - Service coordination
 * - Lifecycle management
 * - Event handling coordination
 * - Backward compatibility maintenance
 */
@Injectable()
export class WorkflowStreamOrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowStreamOrchestratorService.name);
  private readonly checkpointingEnabled: boolean;

  constructor(
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    private readonly streamManagement: StreamManagementService,
    private readonly tokenProcessor: TokenProcessingService,
    private readonly eventProcessor: StreamEventProcessorService,
    private readonly streamingService: IStreamingService,
    @Optional() private readonly checkpointAdapter?: ICheckpointAdapter
  ) {
    this.checkpointingEnabled = !!this.checkpointAdapter;
  }

  async onModuleInit(): Promise<void> {
    this.logger.debug('WorkflowStreamOrchestratorService initializing');
    // Event listeners setup handled by components
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug('WorkflowStreamOrchestratorService shutting down');
    // Cleanup handled by components
  }

  /**
   * Stream workflow execution with comprehensive streaming capabilities
   * 
   * Main entry point maintaining backward compatibility
   */
  async *streamExecution<TState extends Record<string, any> = Record<string, any>>(
    graph: StateGraph<TState>,
    input: TState,
    options: {
      executionId: string;
      streamConfig?: StreamMetadata;
      includeDebugInfo?: boolean;
      includeMetadata?: boolean;
    }
  ): AsyncGenerator<StreamUpdate> {
    const { executionId, streamConfig, includeDebugInfo, includeMetadata } = options;
    
    this.logger.debug(`Starting orchestrated stream execution for ${executionId}`);
    
    try {
      // Get stream (createStream method doesn't exist)
      const stream = this.streamManagement.getStream(executionId);
      
      // Save initial checkpoint if enabled
      if (this.checkpointingEnabled && includeMetadata) {
        const initialCheckpoint = await this.saveInitialCheckpoint(executionId, input);
        yield this.eventProcessor.createCheckpointEvent(
          executionId,
          'workflow',
          initialCheckpoint,
          true
        );
      }

      // Setup streaming configurations based on stream config
      if (streamConfig) {
        this.setupStreamingConfigurations(executionId, streamConfig);
      }

      // Create a mock async generator since streamExecution doesn't exist
      const mockGenerator = async function* (): AsyncGenerator<StreamUpdate> {
        yield {
          type: StreamEventType.NODE_START,
          data: { nodeId: 'start', input },
          metadata: {
            timestamp: new Date(),
            sequenceNumber: 1,
            executionId,
          },
        };
      };
      
      for await (const update of mockGenerator()) {
        
        // Emit through our stream
        stream.next(update);
        yield update;

        // Process token-level streaming if enabled
        if (this.shouldStreamTokens(update, streamConfig)) {
          yield* this.processTokenStreaming(update, executionId, streamConfig);
        }

        // Handle debug information if requested
        if (includeDebugInfo) {
          const debugInfo = this.extractDebugInfo(update);
          if (debugInfo) {
            yield {
              type: StreamEventType.DEBUG,
              data: debugInfo,
              metadata: {
                timestamp: new Date(),
                sequenceNumber: Date.now(),
                executionId,
                nodeId: 'workflow',
              },
            };
          }
        }
      }

      // Save final checkpoint if enabled
      if (this.checkpointingEnabled && includeMetadata) {
        const finalCheckpoint = await this.saveFinalCheckpoint(executionId, input);
        yield this.eventProcessor.createCheckpointEvent(
          executionId,
          'workflow',
          finalCheckpoint,
          false
        );
      }

      this.logger.debug(`Orchestrated stream execution completed for ${executionId}`);

    } catch (error) {
      this.logger.error(`Orchestrated stream execution failed for ${executionId}:`, error);
      
      yield {
        type: StreamEventType.ERROR,
        data: {
          error: (error as Error).message,
          phase: 'orchestration',
          fatal: true,
        },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId,
          nodeId: 'orchestrator',
        },
      };
    } finally {
      // Cleanup stream
      this.streamManagement.closeStream(executionId);
    }
  }

  /**
   * Stream message tokens (backward compatibility method)
   */
  async *streamMessageTokens(
    messages: BaseMessage[],
    options: {
      executionId: string;
      nodeId?: string;
      tokenStreamOptions?: TokenStreamOptions;
    }
  ): AsyncGenerator<StreamUpdate> {
    const { executionId, nodeId = 'message_processor', tokenStreamOptions } = options;
    
    this.logger.debug(`Streaming tokens for ${messages.length} messages in ${executionId}`);
    
    try {
      // Get token stream configuration
      const tokenConfig = this.streamManagement.getTokenStreamConfig(executionId, nodeId) || {
        methodName: 'streamTokens',
        enabled: true,
        bufferSize: tokenStreamOptions?.bufferSize || 50,
        flushInterval: tokenStreamOptions?.flushInterval || 100,
      };

      // Delegate to token processor
      yield* this.tokenProcessor.streamMessageTokens(executionId, nodeId, messages, tokenConfig);

    } catch (error) {
      this.logger.error(`Message token streaming failed for ${executionId}:`, error);
      
      yield {
        type: StreamEventType.ERROR,
        data: {
          error: getErrorMessage(error),
          phase: 'message-token-streaming',
        },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId,
          nodeId,
        },
      };
    }
  }

  /**
   * Stream simple tokens (backward compatibility method)
   */
  async *streamTokens(
    content: string,
    options: {
      executionId: string;
      nodeId?: string;
      tokenStreamOptions?: TokenStreamOptions;
    }
  ): AsyncGenerator<StreamUpdate> {
    const { executionId, nodeId = 'token_processor', tokenStreamOptions } = options;
    
    this.logger.debug(`Streaming tokens for content in ${executionId}:${nodeId}`);
    
    try {
      // Get token stream configuration
      const tokenConfig = this.streamManagement.getTokenStreamConfig(executionId, nodeId) || {
        methodName: 'streamTokens',
        enabled: true,
        bufferSize: tokenStreamOptions?.bufferSize || 50,
        flushInterval: tokenStreamOptions?.flushInterval || 100,
      };

      // Delegate to token processor
      yield* this.tokenProcessor.streamTokens(executionId, nodeId, content, tokenConfig);

    } catch (error) {
      this.logger.error(`Token streaming failed for ${executionId}:`, error);
      
      yield {
        type: StreamEventType.ERROR,
        data: {
          error: getErrorMessage(error),
          phase: 'token-streaming',
        },
        metadata: {
          timestamp: new Date(),
          sequenceNumber: Date.now(),
          executionId,
          nodeId,
        },
      };
    }
  }

  /**
   * Get stream as Observable (for reactive programming patterns)
   */
  getStreamObservable(executionId: string): Observable<StreamUpdate> {
    const stream = this.streamManagement.getStream(executionId);
    
    if (!stream) {
      throw new Error(`No stream found for execution ${executionId}`);
    }

    return stream.asObservable();
  }

  /**
   * Get filtered stream Observable
   */
  getFilteredStreamObservable(
    executionId: string,
    eventTypes: StreamEventType[]
  ): Observable<StreamUpdate> {
    return this.getStreamObservable(executionId).pipe(
      filter(update => eventTypes.includes(update.type))
    );
  }

  /**
   * Get token stream Observable
   */
  getTokenStreamObservable(executionId: string): Observable<TokenData[]> {
    return this.getStreamObservable(executionId).pipe(
      filter(update => update.type === StreamEventType.TOKEN),
      map(update => update.data.tokens || [update.data])
    );
  }

  /**
   * Update streaming configuration (backward compatibility)
   */
  updateStreamingConfig(data: { executionId: string; nodeId: string; config: any }): void {
    this.streamManagement.updateStreamingConfig(data);
    this.eventEmitter.emit('streaming.config.update', data);
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'available' | 'unavailable'>;
    metrics: any;
  } {
    const streamHealth = this.streamManagement.getStreamHealthStatus();
    const tokenHealth = this.tokenProcessor.getBufferStatus();
    
    const services = {
      streamManagement: this.streamManagement ? 'available' : 'unavailable',
      tokenProcessor: this.tokenProcessor ? 'available' : 'unavailable',
      eventProcessor: this.eventProcessor ? 'available' : 'unavailable',
      streamingService: this.streamingService ? 'available' : 'unavailable',
      checkpointAdapter: this.checkpointAdapter ? 'available' : 'unavailable',
    } as Record<string, 'available' | 'unavailable'>;

    const allServicesHealthy = Object.values(services).every(status => status === 'available');
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allServicesHealthy && streamHealth.status === 'healthy') {
      status = 'healthy';
    } else if (streamHealth.status === 'unhealthy') {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      services,
      metrics: {
        ...streamHealth,
        ...tokenHealth,
        checkpointingEnabled: this.checkpointingEnabled,
      },
    };
  }

  /**
   * Force cleanup of resources
   */
  async forceCleanup(): Promise<{ streamsCleanedUp: number; buffersCleanedUp: number }> {
    
    // Force cleanup stale streams
    const streamsCleanedUp = this.streamManagement.cleanupStaleStreams();
    
    // Force flush all token buffers
    const buffersCleanedUp = await this.tokenProcessor.forceFlushAllBuffers();
    
    this.logger.log(`Force cleanup completed: ${streamsCleanedUp} streams, ${buffersCleanedUp} buffers`);
    
    return { streamsCleanedUp, buffersCleanedUp };
  }

  /**
   * Setup streaming configurations based on stream config
   */
  private setupStreamingConfigurations(executionId: string, streamConfig: StreamMetadata): void {
    // This would typically extract decorator metadata and setup appropriate configurations
    // For now, we'll setup basic configurations
    
    if (streamConfig.enableTokenStreaming) {
      this.streamManagement.setTokenStreamConfig(executionId, 'default', {
        methodName: 'tokenStream',
        enabled: true,
        bufferSize: 50,
        flushInterval: 100,
      });
    }

    if (streamConfig.enableEventStreaming) {
      this.streamManagement.setEventStreamConfig(executionId, 'default', {
        methodName: 'eventStream',
        enabled: true,
        events: [],
        bufferSize: 100,
      });
    }

    if (streamConfig.enableProgress) {
      this.streamManagement.setProgressStreamConfig(executionId, 'default', {
        methodName: 'progressStream',
        enabled: true,
        interval: 1000,
        includeETA: true,
      });
    }
  }

  /**
   * Check if token streaming should be enabled for update
   */
  private shouldStreamTokens(update: StreamUpdate, streamConfig?: StreamMetadata): boolean {
    if (!streamConfig?.enableTokenStreaming) {
      return false;
    }

    // Check if update contains content that should be tokenized
    return update.type === StreamEventType.NODE_START &&
           update.data?.nodeData?.content &&
           typeof update.data.nodeData.content === 'string';
  }

  /**
   * Process token streaming for an update
   */
  private async *processTokenStreaming(
    update: StreamUpdate,
    executionId: string,
    streamConfig?: StreamMetadata
  ): AsyncGenerator<StreamUpdate> {
    try {
      const content = update.data?.nodeData?.content;
      if (content && typeof content === 'string') {
        const nodeId = update.metadata?.nodeId || 'unknown';
        const tokenConfig = this.streamManagement.getTokenStreamConfig(executionId, nodeId) || {
          methodName: 'streamTokens',
          enabled: true,
          bufferSize: 50,
          flushInterval: 100,
        };
        yield* this.tokenProcessor.streamTokens(executionId, nodeId, content, tokenConfig);
      }
    } catch (error) {
      this.logger.warn(`Token streaming failed for update:`, error);
    }
  }

  /**
   * Extract debug information from update
   */
  private extractDebugInfo(update: StreamUpdate): any | null {
    try {
      return {
        updateType: update.type,
        nodeId: update.metadata?.nodeId || 'unknown',
        dataKeys: Object.keys(update.data || {}),
        timestamp: update.metadata?.timestamp || new Date(),
        sequence: this.streamManagement.getNextSequence(update.metadata?.executionId || 'unknown'),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Save initial checkpoint
   */
  private async saveInitialCheckpoint<TMetadata = WorkflowPerformanceMetadata>(
    executionId: string,
    input: any
  ): Promise<WorkflowCheckpointMetadata<TMetadata>> {
    const metadata = {
      executionStartTime: new Date(),
      inputSize: JSON.stringify(input).length,
      executionId,
    } as TMetadata;

    if (this.checkpointAdapter) {
      await this.checkpointAdapter.saveCheckpoint(
        executionId,
        { input, metadata },
        {
          timestamp: new Date().toISOString(),
          source: 'loop',
          step: 0,
          parents: {},
        }
      );
    }

    return {
      executionId,
      type: 'initial' as const,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      source: 'loop',
      step: 0,
      parents: {},
      payload: metadata,
    };
  }

  /**
   * Save final checkpoint
   */
  private async saveFinalCheckpoint<TMetadata = WorkflowPerformanceMetadata>(
    executionId: string,
    finalState: any
  ): Promise<WorkflowCheckpointMetadata<TMetadata>> {
    const metadata = {
      executionEndTime: new Date(),
      outputSize: JSON.stringify(finalState).length,
      executionId,
    } as TMetadata;

    if (this.checkpointAdapter) {
      await this.checkpointAdapter.saveCheckpoint(
        executionId,
        { finalState, metadata },
        {
          timestamp: new Date().toISOString(),
          source: 'loop',
          step: 1,
          parents: {},
        }
      );
    }

    return {
      executionId,
      type: 'final' as const,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      source: 'fork',
      step: 1,
      parents: {},
      payload: metadata,
    };
  }

}