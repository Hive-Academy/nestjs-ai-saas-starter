import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import type {
  StreamUpdate,
  StreamTokenDecoratorMetadata,
} from '@hive-academy/langgraph-streaming';
import { StreamEventType } from '@hive-academy/langgraph-streaming';
import type { IStreamingService } from '@hive-academy/langgraph-core';

/**
 * Workflow Token Processing Service
 *
 * REFACTORED: Now delegates to canonical IStreamingService via adapter pattern
 *
 * Responsibilities:
 * - Workflow-specific token processing (message boundaries, BaseMessage extraction)
 * - Delegation to canonical streaming service for core streaming logic
 * - NO custom buffering, flushing, or streaming implementation
 */
@Injectable()
export class TokenProcessingService {
  private readonly logger = new Logger(TokenProcessingService.name);

  constructor(
    @Optional()
    @Inject('IStreamingService')
    private readonly streamingService?: IStreamingService
  ) {}

  /**
   * Stream tokens with workflow-specific features
   *
   * REFACTORED: Delegates core streaming to IStreamingService, keeps only workflow-specific logic
   */
  async *streamTokens(
    executionId: string,
    nodeId: string,
    content: string,
    config?: StreamTokenDecoratorMetadata
  ): AsyncGenerator<StreamUpdate> {
    this.logger.debug(`Workflow token streaming for ${executionId}:${nodeId}`);

    try {
      // 1. Initialize streaming service if available
      if (this.streamingService) {
        await this.streamingService.initializeTokenStream({
          executionId,
          nodeId,
          config: config || {},
        });
      }

      // 2. Tokenize content (workflow-specific logic)
      const tokens = this.tokenizeContent(content, config);

      // 3. Stream tokens via delegation
      for (const [index, token] of tokens.entries()) {
        // Delegate to streaming service
        if (this.streamingService) {
          this.streamingService.streamToken(executionId, nodeId, token, {
            index,
            totalTokens: tokens.length,
            isWorkflowToken: true,
          });
        }

        // Yield workflow-specific stream update
        yield {
          type: StreamEventType.TOKEN,
          data: {
            content: token,
            index,
            totalTokens: tokens.length,
          },
          metadata: {
            timestamp: new Date(),
            sequenceNumber: index,
            executionId,
            nodeId,
            source: 'workflow-token-processing',
          },
        };
      }

      // 4. Flush via delegation
      if (this.streamingService) {
        await this.streamingService.flushTokens(executionId, nodeId);
      }
    } catch (error) {
      this.logger.error(
        `Workflow token streaming failed for ${executionId}:${nodeId}:`,
        error
      );

      yield {
        type: StreamEventType.ERROR,
        data: {
          error: (error as Error).message,
          phase: 'workflow-token-streaming',
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
   * Stream message tokens from BaseMessage objects
   *
   * WORKFLOW-SPECIFIC: Handles BaseMessage extraction and message boundaries
   */
  async *streamMessageTokens(
    executionId: string,
    nodeId: string,
    messages: BaseMessage[],
    config?: StreamTokenDecoratorMetadata
  ): AsyncGenerator<StreamUpdate> {
    this.logger.debug(
      `Streaming tokens from ${messages.length} messages for ${executionId}:${nodeId}`
    );

    for (const [index, message] of messages.entries()) {
      try {
        // Extract content from message (workflow-specific logic)
        const content = this.extractMessageContent(message);

        if (content) {
          // Stream tokens for this message
          const messageNodeId = `${nodeId}_msg_${index}`;
          yield* this.streamTokens(executionId, messageNodeId, content, config);

          // Add message boundary marker (workflow-specific feature)
          yield {
            type: StreamEventType.TOKEN,
            data: {
              content: '\n---MESSAGE_BOUNDARY---\n',
              index: index,
              totalTokens: messages.length,
            },
            metadata: {
              timestamp: new Date(),
              sequenceNumber: Date.now(),
              executionId,
              nodeId: messageNodeId,
              source: 'workflow-message-boundary',
            },
          };
        }
      } catch (error) {
        this.logger.error(`Failed to stream message ${index}:`, error);

        yield {
          type: StreamEventType.ERROR,
          data: {
            error: (error as Error).message,
            messageIndex: index,
            phase: 'workflow-message-token-streaming',
          },
          metadata: {
            timestamp: new Date(),
            sequenceNumber: Date.now(),
            executionId,
            nodeId: `${nodeId}_msg_${index}`,
          },
        };
      }
    }
  }

  /**
   * Simple tokenization for workflow content
   *
   * WORKFLOW-SPECIFIC: Basic tokenization logic, not custom buffering
   */
  private tokenizeContent(
    content: string,
    config?: StreamTokenDecoratorMetadata
  ): string[] {
    // Default: word-based tokenization
    return content.split(/\s+/).filter((word) => word.trim());
  }

  /**
   * Extract content from BaseMessage
   *
   * WORKFLOW-SPECIFIC: Handles BaseMessage content extraction
   */
  private extractMessageContent(message: BaseMessage): string {
    try {
      if (typeof message.content === 'string') {
        return message.content;
      } else if (Array.isArray(message.content)) {
        // Handle complex content (images, etc.)
        return message.content
          .filter(
            (item) =>
              typeof item === 'string' ||
              (typeof item === 'object' && item.type === 'text')
          )
          .map((item) => (typeof item === 'string' ? item : (item as any).text))
          .join(' ');
      }
    } catch (error) {
      this.logger.warn('Failed to extract message content:', error);
    }

    return '';
  }

  /**
   * Get status information - delegated to streaming service
   */
  getBufferStatus(): {
    activeBuffers: number;
    totalTokensBuffered: number;
    activeTimers: number;
  } {
    if (
      this.streamingService &&
      'getActiveTokenStreams' in this.streamingService
    ) {
      // Delegate to streaming service if available
      const streams = (this.streamingService as any).getActiveTokenStreams();
      return {
        activeBuffers: streams.length,
        totalTokensBuffered: streams.reduce(
          (sum: number, stream: any) => sum + stream.bufferSize,
          0
        ),
        activeTimers: streams.length, // Approximation
      };
    }

    // Fallback if no streaming service
    return {
      activeBuffers: 0,
      totalTokensBuffered: 0,
      activeTimers: 0,
    };
  }

  /**
   * Force flush all buffers - delegated to streaming service
   */
  async forceFlushAllBuffers(): Promise<number> {
    if (
      this.streamingService &&
      'forceFlushAllBuffers' in this.streamingService
    ) {
      return (this.streamingService as any).forceFlushAllBuffers();
    }

    this.logger.debug('No streaming service available for force flush');
    return 0;
  }

  /**
   * Cleanup - delegated to streaming service
   */
  cleanup(): void {
    if (this.streamingService && 'cleanup' in this.streamingService) {
      (this.streamingService as any).cleanup();
    }

    this.logger.debug('TokenProcessingService cleanup completed (delegated)');
  }
}
