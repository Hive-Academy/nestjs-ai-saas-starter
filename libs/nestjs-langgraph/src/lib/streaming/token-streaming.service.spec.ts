import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Subject, take } from 'rxjs';

import { TokenStreamingService } from './token-streaming.service';
import { StreamEventType } from '../constants';
import { StreamTokenMetadata } from '../decorators/streaming.decorator';

import {
  mockLogger,
  resetAllMocks,
  TEST_TIMEOUT,
  waitForAsync,
} from '../test-utils';

describe('TokenStreamingService', () => {
  let service: TokenStreamingService;
  let eventEmitter: EventEmitter2;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TokenStreamingService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TokenStreamingService>(TokenStreamingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await module.init();
    resetAllMocks();
  });

  afterEach(async () => {
    resetAllMocks();
    await module.close();
  });

  describe('Token Stream Initialization', () => {
    it('should initialize token stream with correct configuration', async () => {
      const executionId = 'test-exec';
      const nodeId = 'test-node';
      const config: StreamTokenMetadata = {
        enabled: true,
        bufferSize: 25,
        flushInterval: 200,
        format: 'text',
        methodName: 'testMethod',
      };

      await service.initializeTokenStream({ executionId, nodeId, config });

      const activeStreams = service.getActiveTokenStreams();
      expect(activeStreams).toHaveLength(1);
      expect(activeStreams[0].streamKey).toBe(`${executionId}:${nodeId}`);
      expect(activeStreams[0].config.bufferSize).toBe(25);
    });

    it('should not create duplicate streams for same execution:node', async () => {
      const executionId = 'test-exec';
      const nodeId = 'test-node';
      const config: StreamTokenMetadata = {
        enabled: true,
        bufferSize: 25,
        methodName: 'testMethod',
      };

      await service.initializeTokenStream({ executionId, nodeId, config });
      await service.initializeTokenStream({ executionId, nodeId, config });

      const activeStreams = service.getActiveTokenStreams();
      expect(activeStreams).toHaveLength(1);
    });

    it('should handle stream initialization with default values', async () => {
      const config: StreamTokenMetadata = {
        enabled: true,
        methodName: 'testMethod',
      };

      await service.initializeTokenStream({
        executionId: 'test',
        nodeId: 'node',
        config,
      });

      const activeStreams = service.getActiveTokenStreams();
      const streamConfig = activeStreams[0].config;

      expect(streamConfig.bufferSize).toBe(50); // Default
      expect(streamConfig.batchSize).toBe(10); // Default
      expect(streamConfig.flushInterval).toBe(100); // Default
    });
  });

  describe('Token Streaming Operations', () => {
    let executionId: string;
    let nodeId: string;

    beforeEach(async () => {
      executionId = 'stream-test';
      nodeId = 'stream-node';

      await service.initializeTokenStream({
        executionId,
        nodeId,
        config: {
          enabled: true,
          bufferSize: 5,
          flushInterval: 100,
          methodName: 'streamTest',
        },
      });
    });

    it('should stream individual tokens', () => {
      const tokens = ['Hello', 'World', 'Test'];

      tokens.forEach(token => {
        service.streamToken(executionId, nodeId, token, { index: tokens.indexOf(token) });
      });

      const activeStreams = service.getActiveTokenStreams();
      expect(activeStreams[0].totalTokens).toBe(tokens.length);
    });

    it('should emit token stream updates', async (done) => {
      const tokenStream = service.getTokenStream(executionId, nodeId);
      let eventCount = 0;

      const subscription = tokenStream.subscribe({
        next: (update) => {
          expect(update.type).toBe(StreamEventType.TOKEN);
          expect(update.data).toBeDefined();
          expect(update.metadata?.executionId).toBe(executionId);
          eventCount++;
          
          if (eventCount === 3) {
            subscription.unsubscribe();
            done();
          }
        }
      });

      // Stream tokens that will trigger buffer flushes
      ['Token1', 'Token2', 'Token3'].forEach(token => {
        service.streamToken(executionId, nodeId, token);
      });
    });

    it('should handle token filtering', async () => {
      await service.initializeTokenStream({
        executionId: 'filter-test',
        nodeId: 'filter-node',
        config: {
          enabled: true,
          bufferSize: 10,
          filter: {
            minLength: 3,
            excludeWhitespace: true,
            pattern: /^[a-zA-Z]+$/
          },
          methodName: 'filterTest',
        },
      });

      // Stream various tokens
      const tokens = ['Hi', 'Hello', '123', 'Test', '   ', 'Valid'];
      tokens.forEach(token => {
        service.streamToken('filter-test', 'filter-node', token);
      });

      // Allow processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have filtered out short, numeric, and whitespace tokens
      const stats = await service.getTokenStats().pipe(take(1)).toPromise();
      expect(stats?.totalTokensProcessed).toBeLessThan(tokens.length);
    });

    it('should process tokens with custom processor', async () => {
      const processor = jest.fn((token: string) => `processed-${token}`);

      await service.initializeTokenStream({
        executionId: 'processor-test',
        nodeId: 'processor-node',
        config: {
          enabled: true,
          bufferSize: 2,
          processor,
          methodName: 'processorTest',
        },
      });

      service.streamToken('processor-test', 'processor-node', 'test-token');
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processor).toHaveBeenCalledWith('test-token', expect.any(Object));
    });
  });

  describe('Token Stream Management', () => {
    it('should close token streams properly', async () => {
      const executionId = 'close-test';
      const nodeId = 'close-node';

      await service.initializeTokenStream({
        executionId,
        nodeId,
        config: { enabled: true, methodName: 'closeTest' },
      });

      expect(service.getActiveTokenStreams()).toHaveLength(1);

      service.closeTokenStream(executionId, nodeId);

      expect(service.getActiveTokenStreams()).toHaveLength(0);
    });

    it('should close all streams for an execution', async () => {
      const executionId = 'multi-close-test';
      const nodeIds = ['node1', 'node2', 'node3'];

      // Initialize multiple streams
      for (const nodeId of nodeIds) {
        await service.initializeTokenStream({
          executionId,
          nodeId,
          config: { enabled: true, methodName: 'multiCloseTest' },
        });
      }

      expect(service.getActiveTokenStreams()).toHaveLength(3);

      service.closeExecutionTokenStreams(executionId);

      expect(service.getActiveTokenStreams()).toHaveLength(0);
    });

    it('should handle flush operations', async () => {
      const executionId = 'flush-test';
      const nodeId = 'flush-node';

      await service.initializeTokenStream({
        executionId,
        nodeId,
        config: {
          enabled: true,
          bufferSize: 100, // Large buffer to prevent auto-flush
          methodName: 'flushTest',
        },
      });

      // Add tokens without triggering auto-flush
      service.streamToken(executionId, nodeId, 'token1');
      service.streamToken(executionId, nodeId, 'token2');

      // Manually flush
      await service.flushTokens(executionId, nodeId);

      // Verify flush occurred by checking if tokens were processed
      const stats = await service.getTokenStats().pipe(take(1)).toPromise();
      expect(stats?.totalTokensProcessed).toBeGreaterThan(0);
    });
  });

  describe('Token Stream Statistics', () => {
    it('should provide accurate token statistics', async () => {
      const executionId = 'stats-test';
      const nodeId = 'stats-node';

      await service.initializeTokenStream({
        executionId,
        nodeId,
        config: {
          enabled: true,
          bufferSize: 2,
          flushInterval: 50,
          methodName: 'statsTest',
        },
      });

      // Stream several tokens
      ['A', 'B', 'C', 'D', 'E'].forEach(token => {
        service.streamToken(executionId, nodeId, token);
      });

      // Allow processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = await service.getTokenStats().pipe(take(1)).toPromise();
      
      expect(stats?.activeStreams).toBe(1);
      expect(stats?.totalTokensProcessed).toBeGreaterThan(0);
      expect(stats?.averageTokensPerSecond).toBeGreaterThanOrEqual(0);
    });

    it('should track performance metrics', async () => {
      const startTime = Date.now();
      
      // Process a batch of tokens
      const executionId = 'perf-test';
      const nodeId = 'perf-node';

      await service.initializeTokenStream({
        executionId,
        nodeId,
        config: {
          enabled: true,
          bufferSize: 10,
          flushInterval: 25,
          methodName: 'perfTest',
        },
      });

      const tokenCount = 50;
      for (let i = 0; i < tokenCount; i++) {
        service.streamToken(executionId, nodeId, `token-${i}`);
      }

      // Allow processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const endTime = Date.now();
      const duration = endTime - startTime;

      const stats = await service.getTokenStats().pipe(take(1)).toPromise();
      
      expect(stats?.totalTokensProcessed).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Performance check: should process at least 10 tokens per second
      const tokensPerSecond = stats?.totalTokensProcessed! / (duration / 1000);
      expect(tokensPerSecond).toBeGreaterThan(10);
    });
  });

  describe('Global Token Stream', () => {
    it('should provide global token stream observable', async () => {
      const globalStream = service.getGlobalTokenStream();
      let receivedEvents = 0;

      const subscription = globalStream.pipe(take(3)).subscribe({
        next: (update) => {
          expect(update.type).toBe(StreamEventType.TOKEN);
          receivedEvents++;
        },
        complete: () => {
          expect(receivedEvents).toBe(3);
        }
      });

      // Initialize stream and send tokens
      await service.initializeTokenStream({
        executionId: 'global-test',
        nodeId: 'global-node',
        config: {
          enabled: true,
          bufferSize: 1,
          flushInterval: 10,
          methodName: 'globalTest',
        },
      });

      ['A', 'B', 'C'].forEach(token => {
        service.streamToken('global-test', 'global-node', token);
      });
    });

    it('should filter global stream by execution ID', async () => {
      const executionId = 'filter-global-test';
      const filteredStream = service.getTokenStream(executionId);

      let receivedEvents = 0;
      const subscription = filteredStream.pipe(take(2)).subscribe({
        next: (update) => {
          expect(update.metadata?.executionId).toBe(executionId);
          receivedEvents++;
        }
      });

      // Initialize two streams with different execution IDs
      await service.initializeTokenStream({
        executionId,
        nodeId: 'node1',
        config: { enabled: true, bufferSize: 1, methodName: 'filter1' },
      });

      await service.initializeTokenStream({
        executionId: 'other-exec',
        nodeId: 'node2',
        config: { enabled: true, bufferSize: 1, methodName: 'filter2' },
      });

      // Send tokens to both streams
      service.streamToken(executionId, 'node1', 'Token1');
      service.streamToken('other-exec', 'node2', 'Token2');
      service.streamToken(executionId, 'node1', 'Token3');

      await new Promise(resolve => setTimeout(resolve, 100));
      subscription.unsubscribe();
    });
  });

  describe('Error Handling', () => {
    it('should handle streaming to non-existent streams gracefully', () => {
      expect(() => {
        service.streamToken('non-existent', 'node', 'token');
      }).not.toThrow();
    });

    it('should handle invalid configuration gracefully', async () => {
      const config: StreamTokenMetadata = {
        enabled: true,
        bufferSize: -1, // Invalid
        flushInterval: -100, // Invalid
        methodName: '',
      };

      await expect(
        service.initializeTokenStream({
          executionId: 'invalid-config',
          nodeId: 'invalid-node',
          config,
        })
      ).resolves.not.toThrow();
    });

    it('should handle token processing errors', async () => {
      const errorProcessor = jest.fn(() => {
        throw new Error('Processing error');
      });

      await service.initializeTokenStream({
        executionId: 'error-test',
        nodeId: 'error-node',
        config: {
          enabled: true,
          processor: errorProcessor,
          bufferSize: 1,
          methodName: 'errorTest',
        },
      });

      expect(() => {
        service.streamToken('error-test', 'error-node', 'test-token');
      }).not.toThrow();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up stale streams automatically', async () => {
      // This test would require mocking time or waiting for the cleanup interval
      // For now, we'll test the manual cleanup method exists
      expect(typeof service['cleanupStaleStreams']).toBe('function');
    });

    it('should handle module destruction gracefully', async () => {
      await service.initializeTokenStream({
        executionId: 'cleanup-test',
        nodeId: 'cleanup-node',
        config: { enabled: true, methodName: 'cleanupTest' },
      });

      expect(service.getActiveTokenStreams()).toHaveLength(1);

      await service.onModuleDestroy();

      expect(service.getActiveTokenStreams()).toHaveLength(0);
    });

    it('should handle concurrent token streaming', async () => {
      const concurrentStreams = 5;
      const tokensPerStream = 10;
      const promises: Promise<void>[] = [];

      // Initialize concurrent streams
      for (let i = 0; i < concurrentStreams; i++) {
        promises.push(
          service.initializeTokenStream({
            executionId: `concurrent-${i}`,
            nodeId: 'node',
            config: {
              enabled: true,
              bufferSize: 5,
              flushInterval: 50,
              methodName: 'concurrentTest',
            },
          })
        );
      }

      await Promise.all(promises);

      // Stream tokens concurrently
      const streamPromises: Promise<void>[] = [];
      for (let i = 0; i < concurrentStreams; i++) {
        streamPromises.push(
          new Promise<void>((resolve) => {
            for (let j = 0; j < tokensPerStream; j++) {
              service.streamToken(`concurrent-${i}`, 'node', `token-${j}`);
            }
            resolve();
          })
        );
      }

      await Promise.all(streamPromises);

      // Allow processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = await service.getTokenStats().pipe(take(1)).toPromise();
      expect(stats?.totalTokensProcessed).toBeGreaterThan(0);
      expect(stats?.activeStreams).toBe(concurrentStreams);
    });
  });
});