import 'reflect-metadata';
import {
  StreamToken,
  StreamEvent,
  StreamProgress,
  StreamAll,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
  getAllStreamingMetadata,
  hasTokenStreaming,
  hasEventStreaming,
  hasProgressStreaming,
} from '../../lib/decorators/streaming.decorator';
import { StreamEventType } from '../../lib/constants';

describe('Streaming Decorators (Unit Tests)', () => {
  describe('@StreamToken decorator', () => {
    it('should attach token streaming metadata with custom options', () => {
      class TestClass {
        @StreamToken({
          enabled: true,
          bufferSize: 50,
          format: 'text',
          flushInterval: 100,
          includeMetadata: true,
          filter: { minLength: 1, excludeWhitespace: true },
        })
        generateContent() {
          return {};
        }
      }

      const metadata = getStreamTokenMetadata(TestClass.prototype, 'generateContent');

      expect(metadata).toBeDefined();
      expect(metadata?.enabled).toBe(true);
      expect(metadata?.bufferSize).toBe(50);
      expect(metadata?.format).toBe('text');
      expect(metadata?.flushInterval).toBe(100);
      expect(metadata?.includeMetadata).toBe(true);
      expect(metadata?.filter?.minLength).toBe(1);
      expect(metadata?.filter?.excludeWhitespace).toBe(true);
      expect(metadata?.methodName).toBe('generateContent');
    });

    it('should apply default values when no options provided', () => {
      class TestClass {
        @StreamToken()
        defaultMethod() {
          return {};
        }
      }

      const metadata = getStreamTokenMetadata(TestClass.prototype, 'defaultMethod');

      expect(metadata?.enabled).toBe(true);
      expect(metadata?.bufferSize).toBe(50);
      expect(metadata?.batchSize).toBe(10);
      expect(metadata?.flushInterval).toBe(100);
      expect(metadata?.includeMetadata).toBe(false);
      expect(metadata?.format).toBe('text');
    });

    it('should detect token streaming capability', () => {
      class TestClass {
        @StreamToken({ enabled: true })
        streamingMethod() {
          return {};
        }

        nonStreamingMethod() {
          return {};
        }
      }

      expect(hasTokenStreaming(TestClass.prototype, 'streamingMethod')).toBe(true);
      expect(hasTokenStreaming(TestClass.prototype, 'nonStreamingMethod')).toBe(false);
    });
  });

  describe('@StreamEvent decorator', () => {
    it('should attach event streaming metadata with custom options', () => {
      class TestClass {
        @StreamEvent({
          enabled: true,
          events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE, StreamEventType.PROGRESS],
          bufferSize: 100,
          delivery: 'at-least-once',
          filter: { includeDebug: true },
        })
        analyzeContent() {
          return {};
        }
      }

      const metadata = getStreamEventMetadata(TestClass.prototype, 'analyzeContent');

      expect(metadata).toBeDefined();
      expect(metadata?.enabled).toBe(true);
      expect(metadata?.bufferSize).toBe(100);
      expect(metadata?.delivery).toBe('at-least-once');
      expect(metadata?.filter?.includeDebug).toBe(true);
      expect(metadata?.methodName).toBe('analyzeContent');
      expect(metadata?.events).toContain('node_start');
      expect(metadata?.events).toContain('node_complete');
      expect(metadata?.events).toContain('progress');
    });

    it('should apply default values when no options provided', () => {
      class TestClass {
        @StreamEvent()
        defaultMethod() {
          return {};
        }
      }

      const metadata = getStreamEventMetadata(TestClass.prototype, 'defaultMethod');

      expect(metadata?.enabled).toBe(true);
      expect(metadata?.bufferSize).toBe(100);
      expect(metadata?.batchSize).toBe(10);
      expect(metadata?.delivery).toBe('at-least-once');
      expect(metadata?.events).toEqual(['values', 'updates', 'events']);
    });

    it('should detect event streaming capability', () => {
      class TestClass {
        @StreamEvent({ enabled: true })
        streamingMethod() {
          return {};
        }

        nonStreamingMethod() {
          return {};
        }
      }

      expect(hasEventStreaming(TestClass.prototype, 'streamingMethod')).toBe(true);
      expect(hasEventStreaming(TestClass.prototype, 'nonStreamingMethod')).toBe(false);
    });
  });

  describe('@StreamProgress decorator', () => {
    it('should attach progress streaming metadata with custom options', () => {
      class TestClass {
        @StreamProgress({
          enabled: true,
          interval: 250,
          granularity: 'fine',
          includeETA: true,
          includeMetrics: true,
          milestones: [25, 50, 75, 90],
          format: {
            showPercentage: true,
            showCurrent: true,
            showTotal: true,
            showRate: true,
            precision: 1,
          },
        })
        processFiles() {
          return {};
        }
      }

      const metadata = getStreamProgressMetadata(TestClass.prototype, 'processFiles');

      expect(metadata).toBeDefined();
      expect(metadata?.enabled).toBe(true);
      expect(metadata?.interval).toBe(250);
      expect(metadata?.granularity).toBe('fine');
      expect(metadata?.includeETA).toBe(true);
      expect(metadata?.includeMetrics).toBe(true);
      expect(metadata?.milestones).toEqual([25, 50, 75, 90]);
      expect(metadata?.format?.showPercentage).toBe(true);
      expect(metadata?.format?.showCurrent).toBe(true);
      expect(metadata?.format?.showTotal).toBe(true);
      expect(metadata?.format?.showRate).toBe(true);
      expect(metadata?.format?.precision).toBe(1);
      expect(metadata?.methodName).toBe('processFiles');
    });

    it('should apply default values when no options provided', () => {
      class TestClass {
        @StreamProgress()
        defaultMethod() {
          return {};
        }
      }

      const metadata = getStreamProgressMetadata(TestClass.prototype, 'defaultMethod');

      expect(metadata?.enabled).toBe(true);
      expect(metadata?.interval).toBe(1000);
      expect(metadata?.granularity).toBe('fine');
      expect(metadata?.includeETA).toBe(false);
      expect(metadata?.includeMetrics).toBe(false);
      expect(metadata?.milestones).toEqual([]);
      expect(metadata?.format?.showPercentage).toBe(true);
      expect(metadata?.format?.precision).toBe(1);
    });

    it('should detect progress streaming capability', () => {
      class TestClass {
        @StreamProgress({ enabled: true })
        streamingMethod() {
          return {};
        }

        nonStreamingMethod() {
          return {};
        }
      }

      expect(hasProgressStreaming(TestClass.prototype, 'streamingMethod')).toBe(true);
      expect(hasProgressStreaming(TestClass.prototype, 'nonStreamingMethod')).toBe(false);
    });
  });

  describe('@StreamAll decorator', () => {
    it('should attach all streaming metadata types', () => {
      class TestClass {
        @StreamAll({
          token: {
            enabled: true,
            format: 'structured',
            bufferSize: 25,
            processor: (token, metadata) => `[${new Date().toISOString()}] ${token}`,
          },
          event: {
            events: [StreamEventType.NODE_START, StreamEventType.NODE_COMPLETE, StreamEventType.PROGRESS],
            transformer: (event: any) => ({ ...event, enhanced: true, timestamp: new Date() }),
          },
          progress: {
            enabled: true,
            granularity: 'detailed',
            includeETA: true,
            calculator: (current, total, metadata) => Math.min((current / total) * 100, 100),
          },
        })
        comprehensiveProcessing() {
          return {};
        }
      }

      const allMetadata = getAllStreamingMetadata(
        TestClass.prototype,
        'comprehensiveProcessing'
      );

      // Check token metadata
      expect(allMetadata.token).toBeDefined();
      expect(allMetadata.token?.enabled).toBe(true);
      expect(allMetadata.token?.format).toBe('structured');
      expect(allMetadata.token?.bufferSize).toBe(25);
      expect(allMetadata.token?.processor).toBeDefined();

      // Check event metadata
      expect(allMetadata.event).toBeDefined();
      expect(allMetadata.event?.enabled).toBe(true);
      expect(allMetadata.event?.transformer).toBeDefined();
      expect(allMetadata.event?.events).toContain('node_start');
      expect(allMetadata.event?.events).toContain('progress');

      // Check progress metadata
      expect(allMetadata.progress).toBeDefined();
      expect(allMetadata.progress?.enabled).toBe(true);
      expect(allMetadata.progress?.granularity).toBe('detailed');
      expect(allMetadata.progress?.includeETA).toBe(true);
      expect(allMetadata.progress?.calculator).toBeDefined();
    });

    it('should detect all streaming capabilities', () => {
      class TestClass {
        @StreamAll({
          token: { enabled: true },
          event: { enabled: true },
          progress: { enabled: true },
        })
        allStreamingMethod() {
          return {};
        }
      }

      expect(hasTokenStreaming(TestClass.prototype, 'allStreamingMethod')).toBe(true);
      expect(hasEventStreaming(TestClass.prototype, 'allStreamingMethod')).toBe(true);
      expect(hasProgressStreaming(TestClass.prototype, 'allStreamingMethod')).toBe(true);
    });

    it('should handle partial streaming configurations', () => {
      class TestClass {
        @StreamAll({
          token: { enabled: true },
          // event and progress not specified
        })
        partialStreamingMethod() {
          return {};
        }
      }

      const allMetadata = getAllStreamingMetadata(
        TestClass.prototype,
        'partialStreamingMethod'
      );

      expect(allMetadata.token).toBeDefined();
      expect(allMetadata.token?.enabled).toBe(true);
      expect(allMetadata.event).toBeUndefined();
      expect(allMetadata.progress).toBeUndefined();
    });
  });

  describe('Multiple decorators on same method', () => {
    it('should handle multiple individual streaming decorators', () => {
      class TestClass {
        @StreamToken({ enabled: true, format: 'text' })
        @StreamEvent({ enabled: true, bufferSize: 50 })
        @StreamProgress({ enabled: true, interval: 500 })
        multipleDecorators() {
          return {};
        }
      }

      expect(hasTokenStreaming(TestClass.prototype, 'multipleDecorators')).toBe(true);
      expect(hasEventStreaming(TestClass.prototype, 'multipleDecorators')).toBe(true);
      expect(hasProgressStreaming(TestClass.prototype, 'multipleDecorators')).toBe(true);

      const tokenMeta = getStreamTokenMetadata(TestClass.prototype, 'multipleDecorators');
      const eventMeta = getStreamEventMetadata(TestClass.prototype, 'multipleDecorators');
      const progressMeta = getStreamProgressMetadata(TestClass.prototype, 'multipleDecorators');

      expect(tokenMeta?.format).toBe('text');
      expect(eventMeta?.bufferSize).toBe(50);
      expect(progressMeta?.interval).toBe(500);
    });
  });

  describe('Custom function configurations', () => {
    it('should preserve custom processor function', () => {
      const customProcessor = (token: string, metadata?: Record<string, unknown>) => 
        `CUSTOM: ${token}`;

      class TestClass {
        @StreamToken({
          enabled: true,
          processor: customProcessor,
        })
        customProcessorMethod() {
          return {};
        }
      }

      const metadata = getStreamTokenMetadata(TestClass.prototype, 'customProcessorMethod');
      expect(metadata?.processor).toBe(customProcessor);
    });

    it('should preserve custom transformer function', () => {
      const customTransformer = (event: any) => ({ ...event, custom: true });

      class TestClass {
        @StreamEvent({
          enabled: true,
          transformer: customTransformer,
        })
        customTransformerMethod() {
          return {};
        }
      }

      const metadata = getStreamEventMetadata(TestClass.prototype, 'customTransformerMethod');
      expect(metadata?.transformer).toBe(customTransformer);
    });

    it('should preserve custom calculator function', () => {
      const customCalculator = (current: number, total: number) => (current / total) * 100;

      class TestClass {
        @StreamProgress({
          enabled: true,
          calculator: customCalculator,
        })
        customCalculatorMethod() {
          return {};
        }
      }

      const metadata = getStreamProgressMetadata(TestClass.prototype, 'customCalculatorMethod');
      expect(metadata?.calculator).toBe(customCalculator);
    });
  });
});