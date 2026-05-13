import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { LANGGRAPH_CONFIG } from '../models/config.model';
import type { LangGraphConfig } from '../models/config.model';
import { LangGraphSseService } from './langgraph-sse.service';
import { LangGraphStreamingService } from './langgraph-streaming.service';
import type { StreamingMessage } from './langgraph-streaming.service';

// =============================================================================
// Mock SSE service
// =============================================================================

class MockLangGraphSseService {
  private readonly _workflowUpdates = new Subject<Record<string, unknown>>();
  readonly workflowUpdates$ = this._workflowUpdates.asObservable();

  /** Test helper: emit a raw event */
  emit(data: Record<string, unknown>): void {
    this._workflowUpdates.next(data);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('LangGraphStreamingService', () => {
  let service: LangGraphStreamingService;
  let mockSseService: MockLangGraphSseService;
  let mockConfig: LangGraphConfig;

  beforeEach(() => {
    mockConfig = {
      sseBaseUrl: 'http://localhost:3000/api',
    };

    mockSseService = new MockLangGraphSseService();

    TestBed.configureTestingModule({
      providers: [
        LangGraphStreamingService,
        { provide: LangGraphSseService, useValue: mockSseService },
        { provide: LANGGRAPH_CONFIG, useValue: mockConfig },
      ],
    });

    service = TestBed.inject(LangGraphStreamingService);
  });

  afterEach(() => {
    service.reset();
  });

  // ---------------------------------------------------------------------------
  // Start / Stop lifecycle
  // ---------------------------------------------------------------------------

  describe('start/stop lifecycle', () => {
    it('should start in non-streaming state', () => {
      expect(service.isStreaming()).toBe(false);
      expect(service.currentStreamingText()).toBe('');
      expect(service.streamingMessages()).toEqual([]);
      expect(service.tokenCount()).toBe(0);
    });

    it('should set isStreaming to true when startStreaming is called', fakeAsync(() => {
      service.startStreaming();

      expect(service.isStreaming()).toBe(true);

      service.stopStreaming();
      tick(100);
    }));

    it('should set isStreaming to false when stopStreaming is called', fakeAsync(() => {
      service.startStreaming();
      service.stopStreaming();
      tick(100);

      expect(service.isStreaming()).toBe(false);
    }));

    it('should clean up previous session when startStreaming is called twice', fakeAsync(() => {
      service.startStreaming();
      mockSseService.emit({ type: 'token', token: 'first' });
      tick(50);

      // Start a new session - should stop previous
      service.startStreaming();
      expect(service.isStreaming()).toBe(true);

      service.stopStreaming();
      tick(100);
    }));

    it('should reset all state when reset is called', fakeAsync(() => {
      service.startStreaming();
      mockSseService.emit({ type: 'token', token: 'hello' });
      tick(50);

      service.reset();
      tick(100);

      expect(service.isStreaming()).toBe(false);
      expect(service.currentStreamingText()).toBe('');
      expect(service.streamingMessages()).toEqual([]);
      expect(service.tokenCount()).toBe(0);
    }));
  });

  // ---------------------------------------------------------------------------
  // Token batching with flush interval
  // ---------------------------------------------------------------------------

  describe('token batching', () => {
    it('should buffer tokens and flush at interval', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', token: 'Hello' });
      mockSseService.emit({ type: 'token', token: ' ' });
      mockSseService.emit({ type: 'token', token: 'World' });

      // Before flush interval, text should be empty
      expect(service.currentStreamingText()).toBe('');

      // After flush interval (50ms), tokens should be flushed
      tick(50);

      expect(service.currentStreamingText()).toBe('Hello World');

      service.stopStreaming();
      tick(100);
    }));

    it('should accumulate across multiple flush intervals', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', token: 'A' });
      tick(50);
      expect(service.currentStreamingText()).toBe('A');

      mockSseService.emit({ type: 'token', token: 'B' });
      tick(50);
      expect(service.currentStreamingText()).toBe('AB');

      mockSseService.emit({ type: 'token', token: 'C' });
      tick(50);
      expect(service.currentStreamingText()).toBe('ABC');

      service.stopStreaming();
      tick(100);
    }));

    it('should extract token from content field as fallback', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', content: 'from-content' });
      tick(50);

      expect(service.currentStreamingText()).toBe('from-content');

      service.stopStreaming();
      tick(100);
    }));

    it('should ignore token events with no token or content', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', other: 'field' });
      tick(50);

      expect(service.currentStreamingText()).toBe('');

      service.stopStreaming();
      tick(100);
    }));

    it('should not flush if buffer is empty', fakeAsync(() => {
      service.startStreaming();

      // Tick past multiple intervals with no events
      tick(200);

      expect(service.currentStreamingText()).toBe('');

      service.stopStreaming();
      tick(100);
    }));

    it('should flush remaining tokens on stopStreaming', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', token: 'remaining' });

      // Don't wait for interval - stop immediately
      service.stopStreaming();
      tick(100);

      // Remaining tokens should be flushed by stopStreaming
      expect(service.currentStreamingText()).toBe('remaining');
    }));

    it('should update tokenCount signal', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', token: 'Hello' });
      tick(50);

      expect(service.tokenCount()).toBe(5); // 'Hello'.length

      mockSseService.emit({ type: 'token', token: ' World' });
      tick(50);

      expect(service.tokenCount()).toBe(11); // 'Hello World'.length (with space = 6)

      service.stopStreaming();
      tick(100);
    }));
  });

  // ---------------------------------------------------------------------------
  // Message-stream event handling
  // ---------------------------------------------------------------------------

  describe('message-stream events', () => {
    it('should create a new streaming message for a new node', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'Hello',
        nodeName: 'research-agent',
      });
      tick(50);

      const messages = service.streamingMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].nodeId).toBe('research-agent');
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].isComplete).toBe(false);
      expect(messages[0].timestamp).toBeInstanceOf(Date);

      service.stopStreaming();
      tick(100);
    }));

    it('should append content to existing node message', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'Hello',
        nodeName: 'agent-1',
      });
      mockSseService.emit({
        type: 'message-stream',
        content: ' World',
        nodeName: 'agent-1',
      });
      tick(50);

      const messages = service.streamingMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello World');

      service.stopStreaming();
      tick(100);
    }));

    it('should track separate messages per node', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'From agent 1',
        nodeName: 'agent-1',
      });
      mockSseService.emit({
        type: 'message-stream',
        content: 'From agent 2',
        nodeName: 'agent-2',
      });
      tick(50);

      const messages = service.streamingMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].nodeId).toBe('agent-1');
      expect(messages[0].content).toBe('From agent 1');
      expect(messages[1].nodeId).toBe('agent-2');
      expect(messages[1].content).toBe('From agent 2');

      service.stopStreaming();
      tick(100);
    }));

    it('should use nodeId field as fallback when nodeName is absent', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'Test',
        nodeId: 'fallback-node',
      });
      tick(50);

      expect(service.streamingMessages()[0].nodeId).toBe('fallback-node');

      service.stopStreaming();
      tick(100);
    }));

    it('should use "unknown" when neither nodeName nor nodeId is present', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'No node',
      });
      tick(50);

      expect(service.streamingMessages()[0].nodeId).toBe('unknown');

      service.stopStreaming();
      tick(100);
    }));

    it('should also buffer message-stream content as tokens', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'streamed',
        nodeName: 'agent',
      });
      tick(50);

      expect(service.currentStreamingText()).toBe('streamed');

      service.stopStreaming();
      tick(100);
    }));

    it('should ignore message-stream events without content', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        nodeName: 'agent',
      });
      tick(50);

      expect(service.streamingMessages()).toHaveLength(0);
      expect(service.currentStreamingText()).toBe('');

      service.stopStreaming();
      tick(100);
    }));

    it('should mark all messages complete on stopStreaming', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({
        type: 'message-stream',
        content: 'msg1',
        nodeName: 'agent-1',
      });
      mockSseService.emit({
        type: 'message-stream',
        content: 'msg2',
        nodeName: 'agent-2',
      });
      tick(50);

      service.stopStreaming();
      tick(100);

      const messages = service.streamingMessages();
      expect(messages.every((m: StreamingMessage) => m.isComplete)).toBe(true);
    }));
  });

  // ---------------------------------------------------------------------------
  // Mixed event types
  // ---------------------------------------------------------------------------

  describe('mixed event types', () => {
    it('should handle interleaved token and message-stream events', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', token: 'T1' });
      mockSseService.emit({
        type: 'message-stream',
        content: 'M1',
        nodeName: 'agent',
      });
      mockSseService.emit({ type: 'token', token: 'T2' });
      tick(50);

      // currentStreamingText should contain all: T1 + M1 + T2
      expect(service.currentStreamingText()).toBe('T1M1T2');

      // streamingMessages should have the message-stream entry
      expect(service.streamingMessages()).toHaveLength(1);
      expect(service.streamingMessages()[0].content).toBe('M1');

      service.stopStreaming();
      tick(100);
    }));

    it('should ignore unrecognized event types', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'workflow-update', state: {} });
      mockSseService.emit({ type: 'custom-stream', data: {} });
      tick(50);

      expect(service.currentStreamingText()).toBe('');
      expect(service.streamingMessages()).toHaveLength(0);

      service.stopStreaming();
      tick(100);
    }));
  });

  // ---------------------------------------------------------------------------
  // Signal consistency
  // ---------------------------------------------------------------------------

  describe('signal updates', () => {
    it('should keep tokenCount consistent with currentStreamingText length', fakeAsync(() => {
      service.startStreaming();

      mockSseService.emit({ type: 'token', token: 'abc' });
      tick(50);

      expect(service.tokenCount()).toBe(service.currentStreamingText().length);
      expect(service.tokenCount()).toBe(3);

      mockSseService.emit({ type: 'token', token: 'de' });
      tick(50);

      expect(service.tokenCount()).toBe(service.currentStreamingText().length);
      expect(service.tokenCount()).toBe(5);

      service.stopStreaming();
      tick(100);
    }));

    it('should reset tokenCount to 0 on reset', fakeAsync(() => {
      service.startStreaming();
      mockSseService.emit({ type: 'token', token: 'test' });
      tick(50);

      expect(service.tokenCount()).toBe(4);

      service.reset();
      tick(100);

      expect(service.tokenCount()).toBe(0);
    }));
  });

  // ---------------------------------------------------------------------------
  // Subscription cleanup
  // ---------------------------------------------------------------------------

  describe('subscription cleanup', () => {
    it('should not process events after stopStreaming', fakeAsync(() => {
      service.startStreaming();
      mockSseService.emit({ type: 'token', token: 'before' });
      tick(50);

      service.stopStreaming();
      tick(100);

      // Emit after stop - should be ignored
      mockSseService.emit({ type: 'token', token: 'after' });
      tick(50);

      expect(service.currentStreamingText()).toBe('before');
    }));

    it('should not process events after reset', fakeAsync(() => {
      service.startStreaming();
      mockSseService.emit({ type: 'token', token: 'before' });
      tick(50);

      service.reset();
      tick(100);

      mockSseService.emit({ type: 'token', token: 'after' });
      tick(50);

      expect(service.currentStreamingText()).toBe('');
    }));
  });
});
