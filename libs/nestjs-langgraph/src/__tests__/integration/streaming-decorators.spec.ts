import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import 'reflect-metadata';

// Mock implementations for testing
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const resetAllMocks = () => {
  jest.clearAllMocks();
};

const setupReflectMetadata = () => {
  // Setup reflection metadata for decorators
  if (typeof Reflect !== 'undefined' && Reflect.defineMetadata) {
    // Mock metadata setup
  }
};

import { StreamingWorkflowExample } from '../../lib/examples/streaming-workflow-example';
import {
  StreamToken,
  StreamEvent,
  StreamProgress,
  getStreamTokenMetadata,
  getStreamEventMetadata,
  getStreamProgressMetadata,
  getAllStreamingMetadata,
  hasTokenStreaming,
  hasEventStreaming,
  hasProgressStreaming,
} from '../../lib/decorators/streaming.decorator';

describe('Streaming Decorators', () => {
  let workflow: StreamingWorkflowExample;
  let module: TestingModule;

  beforeEach(async () => {
    setupReflectMetadata();
    
    module = await Test.createTestingModule({
      providers: [
        StreamingWorkflowExample,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    workflow = module.get<StreamingWorkflowExample>(StreamingWorkflowExample);
  });

  afterEach(async () => {
    resetAllMocks();
    await module.close();
  });

  describe('@StreamToken decorator', () => {
    it('should attach token streaming metadata to generateContent method', () => {
      const metadata = getStreamTokenMetadata(
        StreamingWorkflowExample.prototype,
        'generateContent'
      );

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

    it('should detect token streaming capability', () => {
      const hasStreaming = hasTokenStreaming(
        StreamingWorkflowExample.prototype,
        'generateContent'
      );

      expect(hasStreaming).toBe(true);
    });
  });

  describe('@StreamEvent decorator', () => {
    it('should attach event streaming metadata to analyzeContent method', () => {
      const metadata = getStreamEventMetadata(
        StreamingWorkflowExample.prototype,
        'analyzeContent'
      );

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

    it('should detect event streaming capability', () => {
      const hasStreaming = hasEventStreaming(
        StreamingWorkflowExample.prototype,
        'analyzeContent'
      );

      expect(hasStreaming).toBe(true);
    });
  });

  describe('@StreamProgress decorator', () => {
    it('should attach progress streaming metadata to processFiles method', () => {
      const metadata = getStreamProgressMetadata(
        StreamingWorkflowExample.prototype,
        'processFiles'
      );

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

    it('should detect progress streaming capability', () => {
      const hasStreaming = hasProgressStreaming(
        StreamingWorkflowExample.prototype,
        'processFiles'
      );

      expect(hasStreaming).toBe(true);
    });
  });

  describe('@StreamAll decorator', () => {
    it('should attach all streaming metadata types to comprehensiveProcessing method', () => {
      const allMetadata = getAllStreamingMetadata(
        StreamingWorkflowExample.prototype,
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
      const hasToken = hasTokenStreaming(
        StreamingWorkflowExample.prototype,
        'comprehensiveProcessing'
      );
      const hasEvent = hasEventStreaming(
        StreamingWorkflowExample.prototype,
        'comprehensiveProcessing'
      );
      const hasProgress = hasProgressStreaming(
        StreamingWorkflowExample.prototype,
        'comprehensiveProcessing'
      );

      expect(hasToken).toBe(true);
      expect(hasEvent).toBe(true);
      expect(hasProgress).toBe(true);
    });
  });

  describe('Non-streaming methods', () => {
    it('should not have streaming metadata for initializeWorkflow (progress only)', () => {
      const tokenMetadata = getStreamTokenMetadata(
        StreamingWorkflowExample.prototype,
        'initializeWorkflow'
      );
      const eventMetadata = getStreamEventMetadata(
        StreamingWorkflowExample.prototype,
        'initializeWorkflow'
      );
      const progressMetadata = getStreamProgressMetadata(
        StreamingWorkflowExample.prototype,
        'initializeWorkflow'
      );

      expect(tokenMetadata).toBeUndefined();
      expect(eventMetadata).toBeUndefined();
      expect(progressMetadata).toBeDefined(); // This one has @StreamProgress
    });

    it('should correctly identify streaming capabilities', () => {
      const hasToken = hasTokenStreaming(
        StreamingWorkflowExample.prototype,
        'initializeWorkflow'
      );
      const hasEvent = hasEventStreaming(
        StreamingWorkflowExample.prototype,
        'initializeWorkflow'
      );
      const hasProgress = hasProgressStreaming(
        StreamingWorkflowExample.prototype,
        'initializeWorkflow'
      );

      expect(hasToken).toBe(false);
      expect(hasEvent).toBe(false);
      expect(hasProgress).toBe(true); // This one has @StreamProgress
    });
  });

  describe('Default values', () => {
    it('should apply correct default values for token streaming', () => {
      // Create a simple class with default token streaming
      class TestClass {
        @StreamToken()
        testMethod() {
          return {};
        }
      }

      const metadata = getStreamTokenMetadata(TestClass.prototype, 'testMethod');

      expect(metadata?.enabled).toBe(true);
      expect(metadata?.bufferSize).toBe(50);
      expect(metadata?.batchSize).toBe(10);
      expect(metadata?.flushInterval).toBe(100);
      expect(metadata?.includeMetadata).toBe(false);
      expect(metadata?.format).toBe('text');
    });

    it('should apply correct default values for event streaming', () => {
      class TestClass {
        @StreamEvent()
        testMethod() {
          return {};
        }
      }

      const metadata = getStreamEventMetadata(TestClass.prototype, 'testMethod');

      expect(metadata?.enabled).toBe(true);
      expect(metadata?.bufferSize).toBe(100);
      expect(metadata?.batchSize).toBe(10);
      expect(metadata?.delivery).toBe('at-least-once');
      expect(metadata?.events).toEqual(['values', 'updates', 'events']);
    });

    it('should apply correct default values for progress streaming', () => {
      class TestClass {
        @StreamProgress()
        testMethod() {
          return {};
        }
      }

      const metadata = getStreamProgressMetadata(TestClass.prototype, 'testMethod');

      expect(metadata?.enabled).toBe(true);
      expect(metadata?.interval).toBe(1000);
      expect(metadata?.granularity).toBe('fine');
      expect(metadata?.includeETA).toBe(false);
      expect(metadata?.includeMetrics).toBe(false);
      expect(metadata?.milestones).toEqual([]);
      expect(metadata?.format?.showPercentage).toBe(true);
      expect(metadata?.format?.precision).toBe(1);
    });
  });
});