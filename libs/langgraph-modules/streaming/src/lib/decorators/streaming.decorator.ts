import 'reflect-metadata';
import { StreamEventType } from '../constants';
import { getStreamingConfigWithDefaults } from '../utils/streaming-config.accessor';

// Metadata keys for streaming decorators
export const STREAM_TOKEN_METADATA_KEY = 'streaming:token';
export const STREAM_EVENT_METADATA_KEY = 'streaming:event';
export const STREAM_PROGRESS_METADATA_KEY = 'streaming:progress';

/**
 * Configuration options for @StreamToken decorator
 */
export interface StreamTokenOptions {
  /** Enable token-level streaming for this method/node */
  enabled?: boolean;
  /** Buffer size for token streaming (default: 50) */
  bufferSize?: number;
  /** Batch size for token processing (default: 10) */
  batchSize?: number;
  /** Token flush interval in milliseconds (default: 100) */
  flushInterval?: number;
  /** Include metadata with each token */
  includeMetadata?: boolean;
  /** Custom token processor function */
  processor?: (token: string, metadata?: Record<string, unknown>) => string;
  /** Stream format (text, json, structured) */
  format?: 'text' | 'json' | 'structured';
  /** Filter tokens based on criteria */
  filter?: {
    minLength?: number;
    maxLength?: number;
    excludeWhitespace?: boolean;
    pattern?: RegExp;
  };
}

/**
 * Metadata stored for token streaming (decorator configuration)
 */
export interface StreamTokenDecoratorMetadata extends StreamTokenOptions {
  nodeId?: string;
  methodName: string;
  enabled: boolean;
}

/**
 * Configuration options for @StreamEvent decorator
 */
export interface StreamEventOptions {
  /** Event types to stream */
  events?: StreamEventType[];
  /** Enable custom event streaming */
  enabled?: boolean;
  /** Event buffer size (default: 100) */
  bufferSize?: number;
  /** Event batch processing size (default: 10) */
  batchSize?: number;
  /** Custom event transformer */
  transformer?: (event: unknown) => unknown;
  /** Event filtering criteria */
  filter?: {
    eventTypes?: StreamEventType[];
    minPriority?: 'low' | 'medium' | 'high';
    includeDebug?: boolean;
    excludeTypes?: StreamEventType[];
  };
  /** Delivery guarantee level */
  delivery?: 'at-most-once' | 'at-least-once' | 'exactly-once';
}

/**
 * Metadata stored for event streaming (decorator configuration)
 */
export interface StreamEventDecoratorMetadata extends StreamEventOptions {
  nodeId?: string;
  methodName: string;
  enabled: boolean;
  events: StreamEventType[];
}

/**
 * Configuration options for @StreamProgress decorator
 */
export interface StreamProgressOptions {
  /** Enable progress streaming */
  enabled?: boolean;
  /** Progress reporting interval in milliseconds (default: 1000) */
  interval?: number;
  /** Progress granularity (coarse, fine, detailed) */
  granularity?: 'coarse' | 'fine' | 'detailed';
  /** Include estimation for completion time */
  includeETA?: boolean;
  /** Include performance metrics */
  includeMetrics?: boolean;
  /** Progress milestones to report */
  milestones?: number[];
  /** Custom progress calculator */
  calculator?: (
    current: number,
    total: number,
    metadata?: Record<string, unknown>
  ) => number;
  /** Progress format configuration */
  format?: {
    showPercentage?: boolean;
    showCurrent?: boolean;
    showTotal?: boolean;
    showRate?: boolean;
    precision?: number;
  };
}

/**
 * Metadata stored for progress streaming (decorator configuration)
 */
export interface StreamProgressDecoratorMetadata extends StreamProgressOptions {
  nodeId?: string;
  methodName: string;
  enabled: boolean;
}

/**
 * Decorator to enable token-level streaming for a method or node
 *
 * @example
 * ```typescript
 * @Workflow({ name: 'ai-writing', streaming: true })
 * export class AIWritingWorkflow extends DeclarativeWorkflowBase {
 *
 *   @Node({ type: 'llm' })
 *   @StreamToken({
 *     enabled: true,
 *     bufferSize: 50,
 *     format: 'text',
 *     filter: { minLength: 1, excludeWhitespace: true }
 *   })
 *   async generateContent(state: WorkflowState) {
 *     // LLM node automatically streams tokens as they're generated
 *     const response = await this.llm.invoke(state.prompt);
 *     return { content: response };
 *   }
 *
 *   @Node({ type: 'stream' })
 *   @StreamToken({
 *     enabled: true,
 *     processor: (token, metadata) => `[${metadata.timestamp}] ${token}`,
 *     format: 'structured'
 *   })
 *   async processTokens(state: WorkflowState) {
 *     // Custom token processing with metadata
 *     return { processedTokens: state.tokens };
 *   }
 * }
 * ```
 */
export function StreamToken(options: StreamTokenOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // Get stored module configuration
    // const moduleConfig = getStreamingConfigWithDefaults(); // TODO: Use in future enhancements

    // Create token streaming metadata - inherit from module config
    const tokenMetadata: StreamTokenDecoratorMetadata = {
      ...options,
      methodName: String(propertyKey),
      enabled: options.enabled ?? true,
      // ✅ Use module config instead of hardcoded defaults
      bufferSize: options.bufferSize ?? moduleConfig.defaultBufferSize ?? 50,
      batchSize: options.batchSize ?? 10, // TODO: Add to module config
      flushInterval: options.flushInterval ?? 100, // TODO: Add to module config
      includeMetadata: options.includeMetadata ?? false,
      format: options.format ?? 'text',
    };

    // Store metadata on the method
    Reflect.defineMetadata(
      STREAM_TOKEN_METADATA_KEY,
      tokenMetadata,
      target,
      propertyKey
    );

    // Wrap the original method to add token streaming context
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: unknown[]) {
      // Log token streaming initialization
      if (this.logger) {
        this.logger.debug(
          `Initializing token streaming for: ${tokenMetadata.methodName}`
        );
      }

      // Add token streaming context to state if available
      if (args[0] && typeof args[0] === 'object' && args[0] !== null) {
        (args[0] as any).tokenStreaming = {
          enabled: tokenMetadata.enabled,
          config: tokenMetadata,
          nodeId: (args[0] as any)?.currentNode || tokenMetadata.nodeId,
        };
      }

      // Initialize token stream if streaming service is available
      if (this.streamingService && tokenMetadata.enabled) {
        await this.streamingService.initializeTokenStream({
          executionId: (args[0] as any)?.executionId,
          nodeId: (args[0] as any)?.currentNode || tokenMetadata.methodName,
          config: tokenMetadata,
        });
      }

      // Execute the original method
      const result = await originalMethod.apply(this, args);

      // Handle token streaming results
      if (this.streamingService && tokenMetadata.enabled && result) {
        await this.streamingService.processTokenResult(result, tokenMetadata);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to enable event-based streaming for a method or node
 *
 * @example
 * ```typescript
 * @Workflow({ name: 'data-processing', streaming: true })
 * export class DataProcessingWorkflow extends DeclarativeWorkflowBase {
 *
 *   @Node({ type: 'tool' })
 *   @StreamEvent({
 *     events: [StreamEventType.TOOL_START, StreamEventType.TOOL_COMPLETE, StreamEventType.PROGRESS],
 *     bufferSize: 100,
 *     delivery: 'at-least-once'
 *   })
 *   async processLargeDataset(state: WorkflowState) {
 *     // Tool execution with detailed event streaming
 *     return await this.dataProcessor.process(state.dataset);
 *   }
 *
 *   @Node({ type: 'condition' })
 *   @StreamEvent({
 *     events: [StreamEventType.VALUES, StreamEventType.UPDATES],
 *     transformer: (event) => ({ ...event, enriched: true }),
 *     filter: { includeDebug: false }
 *   })
 *   async routingLogic(state: WorkflowState) {
 *     // Conditional routing with custom event processing
 *     return state.confidence > 0.8 ? 'approve' : 'review';
 *   }
 * }
 * ```
 */
export function StreamEvent(options: StreamEventOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // Get stored module configuration
    // const moduleConfig = getStreamingConfigWithDefaults(); // TODO: Use in future enhancements

    // Create event streaming metadata - inherit from module config
    const eventMetadata: StreamEventDecoratorMetadata = {
      ...options,
      methodName: String(propertyKey),
      enabled: options.enabled ?? true,
      events: options.events ?? [
        StreamEventType.VALUES,
        StreamEventType.UPDATES,
        StreamEventType.EVENTS,
      ],
      // ✅ Use module config instead of hardcoded defaults
      bufferSize: options.bufferSize ?? moduleConfig.defaultBufferSize ?? 100,
      batchSize: options.batchSize ?? 10, // TODO: Add to module config
      delivery: options.delivery ?? 'at-least-once', // TODO: Add to module config
    };

    // Store metadata on the method
    Reflect.defineMetadata(
      STREAM_EVENT_METADATA_KEY,
      eventMetadata,
      target,
      propertyKey
    );

    // Wrap the original method to add event streaming context
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: unknown[]) {
      // Log event streaming initialization
      if (this.logger) {
        this.logger.debug(
          `Initializing event streaming for: ${eventMetadata.methodName}`
        );
      }

      // Add event streaming context to state if available
      if (args[0] && typeof args[0] === 'object' && args[0] !== null) {
        (args[0] as any).eventStreaming = {
          enabled: eventMetadata.enabled,
          config: eventMetadata,
          nodeId: (args[0] as any)?.currentNode || eventMetadata.nodeId,
        };
      }

      // Initialize event stream if streaming service is available
      if (this.streamingService && eventMetadata.enabled) {
        await this.streamingService.initializeEventStream({
          executionId: (args[0] as any)?.executionId,
          nodeId: (args[0] as any)?.currentNode || eventMetadata.methodName,
          config: eventMetadata,
        });
      }

      // Emit node start event
      if (this.streamingService && eventMetadata.enabled) {
        await this.streamingService.emitEvent(StreamEventType.NODE_START, {
          nodeId: (args[0] as any)?.currentNode || eventMetadata.methodName,
          timestamp: new Date(),
          metadata: args[0],
        });
      }

      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args);

        // Emit node complete event
        if (this.streamingService && eventMetadata.enabled) {
          await this.streamingService.emitEvent(StreamEventType.NODE_COMPLETE, {
            nodeId: (args[0] as any)?.currentNode || eventMetadata.methodName,
            timestamp: new Date(),
            result,
            metadata: args[0],
          });
        }

        return result;
      } catch (error) {
        // Emit error event
        if (this.streamingService && eventMetadata.enabled) {
          await this.streamingService.emitEvent(StreamEventType.ERROR, {
            nodeId: (args[0] as any)?.currentNode || eventMetadata.methodName,
            timestamp: new Date(),
            error: (error as Error).message,
            metadata: args[0],
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to enable progress tracking and streaming for a method or node
 *
 * @example
 * ```typescript
 * @Workflow({ name: 'file-processing', streaming: true })
 * export class FileProcessingWorkflow extends DeclarativeWorkflowBase {
 *
 *   @Node({ type: 'tool' })
 *   @StreamProgress({
 *     enabled: true,
 *     interval: 500,
 *     granularity: 'fine',
 *     includeETA: true,
 *     milestones: [25, 50, 75, 90]
 *   })
 *   async processFiles(state: WorkflowState) {
 *     // File processing with detailed progress tracking
 *     const files = state.files;
 *     const results = [];
 *
 *     for (let i = 0; i < files.length; i++) {
 *       // Progress is automatically tracked and streamed
 *       const result = await this.processFile(files[i]);
 *       results.push(result);
 *
 *       // Manual progress update (optional)
 *       if (this.progressTracker) {
 *         await this.progressTracker.update(i + 1, files.length);
 *       }
 *     }
 *
 *     return { processedFiles: results };
 *   }
 *
 *   @Node({ type: 'llm' })
 *   @StreamProgress({
 *     enabled: true,
 *     granularity: 'coarse',
 *     calculator: (current, total, metadata) => {
 *       // Custom progress calculation based on token generation
 *       const tokenProgress = metadata?.tokensGenerated / metadata?.estimatedTokens;
 *       return Math.min(tokenProgress * 100, 100);
 *     }
 *   })
 *   async generateReport(state: WorkflowState) {
 *     // LLM generation with custom progress calculation
 *     return await this.llm.invoke(state.reportPrompt);
 *   }
 * }
 * ```
 */
export function StreamProgress(
  options: StreamProgressOptions = {}
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // Get stored module configuration
    // const moduleConfig = getStreamingConfigWithDefaults(); // TODO: Use in future enhancements

    // Create progress streaming metadata - inherit from module config
    const progressMetadata: StreamProgressDecoratorMetadata = {
      ...options,
      methodName: String(propertyKey),
      enabled: options.enabled ?? true,
      interval: options.interval ?? 1000, // TODO: Add to module config
      granularity: options.granularity ?? 'fine', // TODO: Add to module config
      includeETA: options.includeETA ?? false,
      includeMetrics: options.includeMetrics ?? false,
      milestones: options.milestones ?? [],
      format: {
        showPercentage: true,
        showCurrent: false,
        showTotal: false,
        showRate: false,
        precision: 1,
        ...options.format,
      },
    };

    // Store metadata on the method
    Reflect.defineMetadata(
      STREAM_PROGRESS_METADATA_KEY,
      progressMetadata,
      target,
      propertyKey
    );

    // Wrap the original method to add progress streaming context
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: unknown[]) {
      // Log progress streaming initialization
      if (this.logger) {
        this.logger.debug(
          `Initializing progress streaming for: ${progressMetadata.methodName}`
        );
      }

      // Add progress streaming context to state if available
      if (args[0] && typeof args[0] === 'object' && args[0] !== null) {
        (args[0] as any).progressStreaming = {
          enabled: progressMetadata.enabled,
          config: progressMetadata,
          nodeId: (args[0] as any)?.currentNode || progressMetadata.nodeId,
        };
      }

      // Initialize progress tracker if streaming service is available
      if (this.streamingService && progressMetadata.enabled) {
        await this.streamingService.initializeProgressTracker({
          executionId: (args[0] as any)?.executionId,
          nodeId: (args[0] as any)?.currentNode || progressMetadata.methodName,
          config: progressMetadata,
        });
      }

      // Create progress tracking wrapper
      const progressContext = {
        startTime: new Date(),
        nodeId: (args[0] as any)?.currentNode || progressMetadata.methodName,
        config: progressMetadata,
      };

      // Emit progress start event
      if (this.streamingService && progressMetadata.enabled) {
        await this.streamingService.emitProgress(StreamEventType.PROGRESS, {
          nodeId: progressContext.nodeId,
          progress: 0,
          status: 'started',
          timestamp: progressContext.startTime,
        });
      }

      try {
        // Execute the original method with progress context
        const result = await originalMethod.apply(this, args);

        // Emit progress complete event
        if (this.streamingService && progressMetadata.enabled) {
          await this.streamingService.emitProgress(StreamEventType.PROGRESS, {
            nodeId: progressContext.nodeId,
            progress: 100,
            status: 'completed',
            timestamp: new Date(),
            duration: Date.now() - progressContext.startTime.getTime(),
          });
        }

        return result;
      } catch (error) {
        // Emit progress error event
        if (this.streamingService && progressMetadata.enabled) {
          await this.streamingService.emitProgress(StreamEventType.PROGRESS, {
            nodeId: progressContext.nodeId,
            progress: -1,
            status: 'failed',
            timestamp: new Date(),
            error: (error as Error).message,
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Get token streaming metadata from a method
 */
export function getStreamTokenMetadata(
  target: object,
  propertyKey: string | symbol
): StreamTokenDecoratorMetadata | undefined {
  return Reflect.getMetadata(STREAM_TOKEN_METADATA_KEY, target, propertyKey);
}

/**
 * Get event streaming metadata from a method
 */
export function getStreamEventMetadata(
  target: object,
  propertyKey: string | symbol
): StreamEventDecoratorMetadata | undefined {
  return Reflect.getMetadata(STREAM_EVENT_METADATA_KEY, target, propertyKey);
}

/**
 * Get progress streaming metadata from a method
 */
export function getStreamProgressMetadata(
  target: object,
  propertyKey: string | symbol
): StreamProgressDecoratorMetadata | undefined {
  return Reflect.getMetadata(STREAM_PROGRESS_METADATA_KEY, target, propertyKey);
}

/**
 * Check if a method has token streaming enabled
 */
export function hasTokenStreaming(
  target: object,
  propertyKey: string | symbol
): boolean {
  const metadata = getStreamTokenMetadata(target, propertyKey);
  return metadata?.enabled === true;
}

/**
 * Check if a method has event streaming enabled
 */
export function hasEventStreaming(
  target: object,
  propertyKey: string | symbol
): boolean {
  const metadata = getStreamEventMetadata(target, propertyKey);
  return metadata?.enabled === true;
}

/**
 * Check if a method has progress streaming enabled
 */
export function hasProgressStreaming(
  target: object,
  propertyKey: string | symbol
): boolean {
  const metadata = getStreamProgressMetadata(target, propertyKey);
  return metadata?.enabled === true;
}

/**
 * Get all streaming metadata from a method
 */
export function getAllStreamingMetadata(
  target: object,
  propertyKey: string | symbol
): {
  token?: StreamTokenDecoratorMetadata;
  event?: StreamEventDecoratorMetadata;
  progress?: StreamProgressDecoratorMetadata;
} {
  return {
    token: getStreamTokenMetadata(target, propertyKey),
    event: getStreamEventMetadata(target, propertyKey),
    progress: getStreamProgressMetadata(target, propertyKey),
  };
}

/**
 * Combined decorator for comprehensive streaming capabilities
 *
 * @example
 * ```typescript
 * @Node({ type: 'llm' })
 * @StreamAll({
 *   token: { enabled: true, format: 'text', bufferSize: 50 },
 *   event: { events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE] },
 *   progress: { enabled: true, granularity: 'fine', includeETA: true }
 * })
 * async comprehensiveNode(state: WorkflowState) {
 *   // Node with full streaming capabilities
 *   return { result: 'processed' };
 * }
 * ```
 */
export function StreamAll(
  options: {
    token?: StreamTokenOptions;
    event?: StreamEventOptions;
    progress?: StreamProgressOptions;
  } = {}
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    // ✅ Zero-config by default - all options inherit from module config
    // Apply all streaming decorators
    if (options.token) {
      StreamToken(options.token)(target, propertyKey, descriptor);
    }
    if (options.event) {
      StreamEvent(options.event)(target, propertyKey, descriptor);
    }
    if (options.progress) {
      StreamProgress(options.progress)(target, propertyKey, descriptor);
    }

    return descriptor;
  };
}
