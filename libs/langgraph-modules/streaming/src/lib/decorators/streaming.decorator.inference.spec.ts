import {
  StreamToken,
  getStreamTokenMetadata,
  StreamEvent,
  getStreamEventMetadata,
  StreamProgress,
  getStreamProgressMetadata,
} from './streaming.decorator';
import { InvalidNodeIdError } from '../errors/invalid-node-id.error';
import { getStreamingConfigWithDefaults } from '../utils/streaming-config.accessor';

// We will mock the module config accessor to control strictNaming flag
jest.mock('../utils/streaming-config.accessor', () => ({
  getStreamingConfigWithDefaults: jest.fn(() => ({
    strictNaming: false,
    defaultBufferSize: 42,
    tokenDefaults: { batchSize: 10, flushInterval: 25 },
    eventDefaults: { batchSize: 5, delivery: 'at-least-once' },
    progressDefaults: { interval: 500, granularity: 'fine' },
  })),
}));

describe('streaming decorators - auto nodeId inference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('infers nodeId from class & method names (token)', () => {
    class ContentIngestWorkflow {
      logger = { debug: jest.fn() } as any;
      @StreamToken()
      ingestChunks() {
        /* no-op */
      }
    }
    const proto = ContentIngestWorkflow.prototype as any;
    const meta = getStreamTokenMetadata(proto, 'ingestChunks') as any;
    expect(meta.nodeId).toBe('content|ingest:chunks');
    expect(meta.inferredNodeId).toBe(true);
  });

  test('explicit override normalized & not marked inferred', () => {
    class ContentIngestWorkflow {
      @StreamToken({ nodeId: 'Content|Ingest:Chunks:RAW' } as any)
      ingestChunks() {
        /* no-op */
      }
    }
    const meta = getStreamTokenMetadata(
      ContentIngestWorkflow.prototype,
      'ingestChunks'
    ) as any;
    expect(meta.nodeId).toBe('content|ingest:chunks:raw');
    expect(meta.inferredNodeId).toBe(false);
  });

  test('strict mode invalid id throws (missing segments)', () => {
    (getStreamingConfigWithDefaults as jest.Mock).mockReturnValueOnce({
      strictNaming: true,
      defaultBufferSize: 10,
      tokenDefaults: { batchSize: 10, flushInterval: 20 },
      eventDefaults: { batchSize: 5, delivery: 'at-least-once' },
      progressDefaults: { interval: 500, granularity: 'fine' },
    });
    expect(() => {
      class AnyWorkflow {
        @StreamToken({ nodeId: 'Bad' } as any)
        run() {
          /* no-op */
        }
      }
      return AnyWorkflow; // reference to trigger decorator emit
    }).toThrow(InvalidNodeIdError);
  });

  test('event decorator inference parallels token', () => {
    class QualityScoreProcessor {
      @StreamEvent()
      evaluateBatch() {
        /* no-op */
      }
    }
    const meta = getStreamEventMetadata(
      QualityScoreProcessor.prototype,
      'evaluateBatch'
    ) as any;
    expect(meta.nodeId).toBe('quality|evaluate:batch');
  });

  test('progress decorator inference with detail tokens', () => {
    class NetworkGraphBuilderService {
      @StreamProgress()
      buildGraphStageTwo() {
        /* no-op */
      }
    }
    const meta = getStreamProgressMetadata(
      NetworkGraphBuilderService.prototype,
      'buildGraphStageTwo'
    ) as any;
    // class -> network, method tokens: build, graph, stage, two -> phase=build, activity=graph, detail=stage-two
    expect(meta.nodeId).toBe('network|build:graph:stage-two');
  });

  test('state currentNode overrides inferred for runtime init (token)', async () => {
    const initSpy = jest.fn();
    class RuntimeWorkflow {
      streamingService = {
        initializeTokenStream: initSpy,
        processTokenResult: jest.fn(),
      } as any;
      @StreamToken()
      processBatch(state: any) {
        return { ok: true };
      }
    }
    const inst = new (RuntimeWorkflow as any)();
    await inst.processBatch({
      executionId: 'exec-1',
      currentNode: 'override|plan:dispatch',
    });
    const callArg = initSpy.mock.calls[0][0];
    expect(callArg.nodeId).toBe('override|plan:dispatch');
  });
});
