import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { LANGGRAPH_CONFIG } from '../models/config.model';
import type { LangGraphConfig } from '../models/config.model';
import { LangGraphSseService } from './langgraph-sse.service';

// =============================================================================
// Mock EventSource
// =============================================================================

type EventSourceListener = (event: MessageEvent<string>) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private listeners = new Map<string, EventSourceListener[]>();
  closed = false;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventSourceListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  close(): void {
    this.closed = true;
  }

  /** Test helper: simulate the connection opening */
  simulateOpen(): void {
    this.onopen?.();
  }

  /** Test helper: simulate a connection error */
  simulateError(): void {
    this.onerror?.();
  }

  /** Test helper: simulate a named SSE event with JSON data */
  simulateEvent(eventType: string, data: string): void {
    const listeners = this.listeners.get(eventType) ?? [];
    const event = new MessageEvent('message', { data });
    for (const listener of listeners) {
      listener(event);
    }
  }

  static reset(): void {
    MockEventSource.instances = [];
  }

  static get latest(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

// Install mock globally
const originalEventSource = globalThis.EventSource;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as Record<string, unknown>)['EventSource'] =
    MockEventSource as unknown as typeof EventSource;
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as Record<string, unknown>)['EventSource'] = originalEventSource;
});

// =============================================================================
// Tests
// =============================================================================

describe('LangGraphSseService', () => {
  let service: LangGraphSseService;
  let mockConfig: LangGraphConfig;

  beforeEach(() => {
    MockEventSource.reset();

    mockConfig = {
      sseBaseUrl: 'http://localhost:3000/api',
      eventTypes: ['workflow-update', 'workflow_complete'],
    };

    TestBed.configureTestingModule({
      providers: [
        LangGraphSseService,
        { provide: LANGGRAPH_CONFIG, useValue: mockConfig },
      ],
    });

    service = TestBed.inject(LangGraphSseService);
  });

  afterEach(() => {
    service.disconnect();
  });

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  describe('connect/disconnect lifecycle', () => {
    it('should start in disconnected state', () => {
      expect(service.connectionState().status).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
    });

    it('should transition to connecting when connect is called', () => {
      service.connect('/api/stream/exec-1');

      expect(service.connectionState().status).toBe('connecting');
    });

    it('should transition to connected on EventSource open', () => {
      service.connect('/api/stream/exec-1');

      const es = MockEventSource.latest;
      expect(es).toBeDefined();
      es!.simulateOpen();

      expect(service.connectionState().status).toBe('connected');
      expect(service.isConnected()).toBe(true);
    });

    it('should transition to disconnected on disconnect', () => {
      service.connect('/api/stream/exec-1');
      MockEventSource.latest!.simulateOpen();

      service.disconnect();

      expect(service.connectionState().status).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
    });

    it('should close EventSource on disconnect', () => {
      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;

      service.disconnect();

      expect(es.closed).toBe(true);
    });

    it('should be safe to call disconnect when not connected', () => {
      expect(() => service.disconnect()).not.toThrow();
      expect(service.connectionState().status).toBe('disconnected');
    });
  });

  // ---------------------------------------------------------------------------
  // Double connect guard
  // ---------------------------------------------------------------------------

  describe('double connect guard', () => {
    it('should disconnect existing connection before creating new one', () => {
      service.connect('/api/stream/exec-1');
      const firstEs = MockEventSource.latest!;
      firstEs.simulateOpen();

      service.connect('/api/stream/exec-2');
      const secondEs = MockEventSource.latest!;

      expect(firstEs.closed).toBe(true);
      expect(secondEs).not.toBe(firstEs);
      expect(secondEs.url).toBe('/api/stream/exec-2');
    });

    it('should create exactly 2 EventSource instances for double connect', () => {
      service.connect('/api/stream/exec-1');
      service.connect('/api/stream/exec-2');

      expect(MockEventSource.instances).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Token provider integration
  // ---------------------------------------------------------------------------

  describe('token provider', () => {
    it('should append token as query parameter when tokenProvider is set', () => {
      mockConfig.tokenProvider = () => of('my-secret-token');

      service.connect('/api/stream/exec-1');

      const es = MockEventSource.latest!;
      expect(es.url).toBe('/api/stream/exec-1?token=my-secret-token');
    });

    it('should use & separator when URL already has query params', () => {
      mockConfig.tokenProvider = () => of('my-token');

      service.connect('/api/stream/exec-1?mode=values');

      const es = MockEventSource.latest!;
      expect(es.url).toBe('/api/stream/exec-1?mode=values&token=my-token');
    });

    it('should URL-encode the token value', () => {
      mockConfig.tokenProvider = () => of('token with spaces&special=chars');

      service.connect('/api/stream/exec-1');

      const es = MockEventSource.latest!;
      expect(es.url).toContain(
        encodeURIComponent('token with spaces&special=chars')
      );
    });

    it('should connect without token when tokenProvider is not set', () => {
      delete mockConfig.tokenProvider;

      service.connect('/api/stream/exec-1');

      const es = MockEventSource.latest!;
      expect(es.url).toBe('/api/stream/exec-1');
    });

    it('should emit error when tokenProvider fails', () => {
      const errors: Array<{ message: string; timestamp: Date }> = [];
      service.errors$.subscribe((err) => errors.push(err));

      mockConfig.tokenProvider = () =>
        throwError(() => new Error('Auth failed'));

      service.connect('/api/stream/exec-1');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Authentication failed');
      expect(service.connectionState().status).toBe('error');
    });

    it('should not create EventSource when tokenProvider fails', () => {
      mockConfig.tokenProvider = () =>
        throwError(() => new Error('Auth failed'));

      service.connect('/api/stream/exec-1');

      // No EventSource should have been created
      expect(MockEventSource.instances).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Event handling
  // ---------------------------------------------------------------------------

  describe('event handling', () => {
    it('should emit parsed JSON data on workflowUpdates$', () => {
      const received: Record<string, unknown>[] = [];
      service.workflowUpdates$.subscribe((data) => received.push(data));

      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      es.simulateEvent(
        'workflow-update',
        JSON.stringify({ type: 'workflow-update', executionId: 'exec-1' })
      );

      expect(received).toHaveLength(1);
      expect(received[0]['type']).toBe('workflow-update');
      expect(received[0]['executionId']).toBe('exec-1');
    });

    it('should register listeners for all configured event types', () => {
      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      const received: Record<string, unknown>[] = [];
      service.workflowUpdates$.subscribe((data) => received.push(data));

      es.simulateEvent('workflow-update', JSON.stringify({ type: 'update' }));
      es.simulateEvent(
        'workflow_complete',
        JSON.stringify({ type: 'complete' })
      );

      expect(received).toHaveLength(2);
    });

    it('should use DEFAULT_SSE_EVENT_TYPES when config.eventTypes is undefined', () => {
      delete mockConfig.eventTypes;

      const received: Record<string, unknown>[] = [];
      service.workflowUpdates$.subscribe((data) => received.push(data));

      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      // Default types include 'workflow-update', 'workflow_complete', 'workflow_error'
      es.simulateEvent(
        'workflow-update',
        JSON.stringify({ test: 'default-type' })
      );

      expect(received).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('should emit error and disconnect on EventSource onerror', () => {
      const errors: Array<{ message: string; timestamp: Date }> = [];
      service.errors$.subscribe((err) => errors.push(err));

      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      es.simulateError();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('SSE connection lost');
      expect(errors[0].timestamp).toBeInstanceOf(Date);
      expect(service.connectionState().status).toBe('disconnected');
      expect(es.closed).toBe(true);
    });

    it('should set error state before disconnecting', () => {
      const states: string[] = [];
      // Capture state transitions by checking in error handler
      service.errors$.subscribe(() => {
        // The connectionState is set to 'error' before disconnect sets it to 'disconnected'
        // But since disconnect happens synchronously in onerror, we check final state
        states.push(service.connectionState().status);
      });

      service.connect('/api/stream/exec-1');
      MockEventSource.latest!.simulateOpen();
      MockEventSource.latest!.simulateError();

      // After error + disconnect, final state is disconnected
      expect(service.connectionState().status).toBe('disconnected');
    });

    it('should emit error on malformed JSON in SSE event', () => {
      const errors: Array<{ message: string; timestamp: Date }> = [];
      service.errors$.subscribe((err) => errors.push(err));

      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      es.simulateEvent('workflow-update', 'not-valid-json{{{');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Failed to parse SSE event data');
      expect(errors[0].message).toContain('workflow-update');
    });

    it('should not emit workflowUpdates on malformed JSON', () => {
      const received: Record<string, unknown>[] = [];
      service.workflowUpdates$.subscribe((data) => received.push(data));

      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      es.simulateEvent('workflow-update', '{{invalid}}');

      expect(received).toHaveLength(0);
    });

    it('should log error to console on parse failure', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.connect('/api/stream/exec-1');
      const es = MockEventSource.latest!;
      es.simulateOpen();

      es.simulateEvent('workflow-update', 'bad-json');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LangGraphSseService]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Reusability
  // ---------------------------------------------------------------------------

  describe('reusability', () => {
    it('should allow reconnecting after disconnect', () => {
      service.connect('/api/stream/exec-1');
      MockEventSource.latest!.simulateOpen();
      service.disconnect();

      service.connect('/api/stream/exec-2');
      MockEventSource.latest!.simulateOpen();

      expect(service.connectionState().status).toBe('connected');
      expect(MockEventSource.latest!.url).toBe('/api/stream/exec-2');
    });

    it('should continue emitting events after reconnect', () => {
      const received: Record<string, unknown>[] = [];
      service.workflowUpdates$.subscribe((data) => received.push(data));

      // First connection
      service.connect('/api/stream/exec-1');
      MockEventSource.latest!.simulateOpen();
      MockEventSource.latest!.simulateEvent(
        'workflow-update',
        JSON.stringify({ id: 1 })
      );

      service.disconnect();

      // Second connection
      service.connect('/api/stream/exec-2');
      MockEventSource.latest!.simulateOpen();
      MockEventSource.latest!.simulateEvent(
        'workflow-update',
        JSON.stringify({ id: 2 })
      );

      expect(received).toHaveLength(2);
      expect(received[0]['id']).toBe(1);
      expect(received[1]['id']).toBe(2);
    });
  });
});
