import { Injectable, Logger } from '@nestjs/common';
import { TokenStreamingService } from './token-streaming.service';
import { getStreamingConfigWithDefaults } from '../utils/streaming-config.accessor';
import { StreamTokenDecoratorMetadata } from '../decorators/streaming.decorator';

/**
 * Lightweight wrapper that transparently initializes a token stream on the
 * first token emission (lazy auto-init). This removes the requirement for
 * feature/services to call initializeTokenStream explicitly. Advanced
 * callers can still explicitly initialize beforehand; duplicate init is
 * ignored by the underlying service.
 */
@Injectable()
export class AutoInitTokenStreamingService {
  private readonly logger = new Logger(AutoInitTokenStreamingService.name);
  private readonly initialized = new Set<string>();

  constructor(private readonly inner: TokenStreamingService) {}

  /**
   * Stream a token; if its (executionId,nodeId) pair has not been seen,
   * perform a one-time initialization using module token defaults.
   */
  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const key = this.key(executionId, nodeId);
    if (!this.initialized.has(key)) {
      this.lazyInit(executionId, nodeId).catch((err) => {
        this.logger.error(
          `Lazy initialization failed for ${key}; token will be dropped: ${err}`
        );
      });
    }
    this.inner.streamToken(executionId, nodeId, token, metadata);
  }

  /**
   * Explicit flush passthrough.
   */
  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    await this.inner.flushTokens(executionId, nodeId);
  }

  /**
   * Allow explicit initialization for callers that want to pre-create
   * streams with custom decorator metadata (still idempotent).
   */
  async initializeTokenStream(options: {
    executionId: string;
    nodeId: string;
    config: StreamTokenDecoratorMetadata;
  }): Promise<void> {
    const key = this.key(options.executionId, options.nodeId);
    await this.inner.initializeTokenStream(options);
    this.initialized.add(key);
  }

  /** Build unique key */
  private key(executionId: string, nodeId: string): string {
    return `${executionId}:${nodeId}`;
  }

  /** Perform one-time initialization using module defaults */
  private async lazyInit(executionId: string, nodeId: string): Promise<void> {
    const key = this.key(executionId, nodeId);
    if (this.initialized.has(key)) return;

    const configDefaults = getStreamingConfigWithDefaults();
    const tokenDefaults = configDefaults.tokenDefaults;

    await this.inner.initializeTokenStream({
      executionId,
      nodeId,
      config: {
        enabled: true,
        bufferSize: configDefaults.defaultBufferSize,
        batchSize: tokenDefaults.batchSize,
        flushInterval: tokenDefaults.flushInterval,
        format: tokenDefaults.format,
        methodName: 'lazyAutoInit',
      },
    });
    this.initialized.add(key);
    this.logger.debug(`Lazy initialized token stream for ${key}`);
  }
}
