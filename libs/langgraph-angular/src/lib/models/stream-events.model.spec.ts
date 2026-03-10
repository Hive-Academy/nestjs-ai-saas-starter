import {
  StreamEventType,
  StreamMetadataSchema,
  StreamUpdateSchema,
  TokenUpdateSchema,
  StreamErrorSchema,
  MessageStreamEventSchema,
  CustomStreamEventSchema,
  DebugStreamEventSchema,
  isWorkflowEvent,
  isNodeEvent,
  isProgressEvent,
  isTokenEvent,
  isErrorEvent,
  isStreamDataEvent,
  isAgentEvent,
  isAgentTypeEvent,
  hasNodeId,
  isMessageStreamEvent,
  isCustomStreamEvent,
  isDebugStreamEvent,
  parseNodeId,
} from './stream-events.model';
import type { StreamUpdate } from './stream-events.model';

// =============================================================================
// Helper factories
// =============================================================================

function makeStreamUpdate(
  type: StreamEventType,
  data: unknown = {},
  metadata?: Partial<{
    timestamp: Date;
    sequenceNumber: number;
    executionId: string;
    nodeId: string;
    agentType: string;
  }>
): StreamUpdate {
  return {
    type,
    data,
    metadata: metadata
      ? {
          timestamp: metadata.timestamp ?? new Date(),
          sequenceNumber: metadata.sequenceNumber ?? 1,
          executionId: metadata.executionId ?? 'exec-1',
          ...metadata,
        }
      : undefined,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

describe('Type Guards', () => {
  describe('isWorkflowEvent', () => {
    it('should return true for WORKFLOW_START', () => {
      const event = makeStreamUpdate(StreamEventType.WORKFLOW_START);
      expect(isWorkflowEvent(event)).toBe(true);
    });

    it('should return true for WORKFLOW_END', () => {
      const event = makeStreamUpdate(StreamEventType.WORKFLOW_END);
      expect(isWorkflowEvent(event)).toBe(true);
    });

    it('should return true for WORKFLOW_ERROR', () => {
      const event = makeStreamUpdate(StreamEventType.WORKFLOW_ERROR);
      expect(isWorkflowEvent(event)).toBe(true);
    });

    it('should return false for non-workflow events', () => {
      const nodeEvent = makeStreamUpdate(StreamEventType.NODE_START);
      const tokenEvent = makeStreamUpdate(StreamEventType.TOKEN);
      const progressEvent = makeStreamUpdate(StreamEventType.PROGRESS);

      expect(isWorkflowEvent(nodeEvent)).toBe(false);
      expect(isWorkflowEvent(tokenEvent)).toBe(false);
      expect(isWorkflowEvent(progressEvent)).toBe(false);
    });
  });

  describe('isNodeEvent', () => {
    it('should return true for NODE_START', () => {
      expect(isNodeEvent(makeStreamUpdate(StreamEventType.NODE_START))).toBe(
        true
      );
    });

    it('should return true for NODE_END', () => {
      expect(isNodeEvent(makeStreamUpdate(StreamEventType.NODE_END))).toBe(
        true
      );
    });

    it('should return true for NODE_ERROR', () => {
      expect(isNodeEvent(makeStreamUpdate(StreamEventType.NODE_ERROR))).toBe(
        true
      );
    });

    it('should return true for NODE_COMPLETE', () => {
      expect(isNodeEvent(makeStreamUpdate(StreamEventType.NODE_COMPLETE))).toBe(
        true
      );
    });

    it('should return false for non-node events', () => {
      expect(
        isNodeEvent(makeStreamUpdate(StreamEventType.WORKFLOW_START))
      ).toBe(false);
      expect(isNodeEvent(makeStreamUpdate(StreamEventType.TOKEN))).toBe(false);
    });
  });

  describe('isProgressEvent', () => {
    it('should return true for PROGRESS', () => {
      expect(isProgressEvent(makeStreamUpdate(StreamEventType.PROGRESS))).toBe(
        true
      );
    });

    it('should return true for MILESTONE', () => {
      expect(isProgressEvent(makeStreamUpdate(StreamEventType.MILESTONE))).toBe(
        true
      );
    });

    it('should return false for non-progress events', () => {
      expect(isProgressEvent(makeStreamUpdate(StreamEventType.TOKEN))).toBe(
        false
      );
      expect(
        isProgressEvent(makeStreamUpdate(StreamEventType.NODE_START))
      ).toBe(false);
    });
  });

  describe('isTokenEvent', () => {
    it('should return true for TOKEN type', () => {
      expect(isTokenEvent(makeStreamUpdate(StreamEventType.TOKEN))).toBe(true);
    });

    it('should return false for non-token events', () => {
      expect(
        isTokenEvent(makeStreamUpdate(StreamEventType.WORKFLOW_START))
      ).toBe(false);
      expect(
        isTokenEvent(makeStreamUpdate(StreamEventType.MESSAGE_STREAM))
      ).toBe(false);
    });
  });

  describe('isErrorEvent', () => {
    it('should return true for ERROR', () => {
      expect(isErrorEvent(makeStreamUpdate(StreamEventType.ERROR))).toBe(true);
    });

    it('should return true for NODE_ERROR', () => {
      expect(isErrorEvent(makeStreamUpdate(StreamEventType.NODE_ERROR))).toBe(
        true
      );
    });

    it('should return true for WORKFLOW_ERROR', () => {
      expect(
        isErrorEvent(makeStreamUpdate(StreamEventType.WORKFLOW_ERROR))
      ).toBe(true);
    });

    it('should return false for non-error events', () => {
      expect(isErrorEvent(makeStreamUpdate(StreamEventType.TOKEN))).toBe(false);
      expect(isErrorEvent(makeStreamUpdate(StreamEventType.NODE_START))).toBe(
        false
      );
    });
  });

  describe('isStreamDataEvent', () => {
    const streamDataTypes = [
      StreamEventType.VALUES,
      StreamEventType.UPDATES,
      StreamEventType.MESSAGES,
      StreamEventType.EVENTS,
      StreamEventType.DEBUG,
      StreamEventType.FINAL,
    ] as const;

    it.each(streamDataTypes)('should return true for %s', (eventType) => {
      expect(isStreamDataEvent(makeStreamUpdate(eventType))).toBe(true);
    });

    it('should return false for non-stream-data events', () => {
      expect(isStreamDataEvent(makeStreamUpdate(StreamEventType.TOKEN))).toBe(
        false
      );
      expect(
        isStreamDataEvent(makeStreamUpdate(StreamEventType.NODE_START))
      ).toBe(false);
    });
  });

  describe('isAgentEvent', () => {
    it('should return true when metadata has agentType', () => {
      const event = makeStreamUpdate(
        StreamEventType.NODE_START,
        {},
        {
          agentType: 'researcher',
        }
      );
      expect(isAgentEvent(event)).toBe(true);
    });

    it('should return false when metadata has no agentType', () => {
      const event = makeStreamUpdate(StreamEventType.NODE_START, {}, {});
      expect(isAgentEvent(event)).toBe(false);
    });

    it('should return false when no metadata', () => {
      const event = makeStreamUpdate(StreamEventType.NODE_START);
      expect(isAgentEvent(event)).toBe(false);
    });
  });

  describe('isAgentTypeEvent', () => {
    it('should return true when agentType matches', () => {
      const event = makeStreamUpdate(
        StreamEventType.NODE_START,
        {},
        {
          agentType: 'researcher',
        }
      );
      expect(isAgentTypeEvent(event, 'researcher')).toBe(true);
    });

    it('should return false when agentType does not match', () => {
      const event = makeStreamUpdate(
        StreamEventType.NODE_START,
        {},
        {
          agentType: 'researcher',
        }
      );
      expect(isAgentTypeEvent(event, 'developer')).toBe(false);
    });

    it('should return false when no metadata', () => {
      const event = makeStreamUpdate(StreamEventType.NODE_START);
      expect(isAgentTypeEvent(event, 'researcher')).toBe(false);
    });
  });

  describe('hasNodeId', () => {
    it('should return true when metadata has nodeId', () => {
      const event = makeStreamUpdate(
        StreamEventType.NODE_START,
        {},
        {
          nodeId: 'app/phase/activity/detail',
        }
      );
      expect(hasNodeId(event)).toBe(true);
    });

    it('should return false when metadata has no nodeId', () => {
      const event = makeStreamUpdate(StreamEventType.NODE_START, {}, {});
      expect(hasNodeId(event)).toBe(false);
    });

    it('should return false when no metadata', () => {
      const event = makeStreamUpdate(StreamEventType.NODE_START);
      expect(hasNodeId(event)).toBe(false);
    });
  });

  describe('isMessageStreamEvent', () => {
    it('should return true for message-stream event object', () => {
      const event = {
        type: 'message-stream' as const,
        executionId: 'exec-1',
        nodeName: 'agent',
        step: 1,
        content: 'hello',
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(isMessageStreamEvent(event)).toBe(true);
    });

    it('should return false for custom-stream event', () => {
      const event = {
        type: 'custom-stream' as const,
        executionId: 'exec-1',
        data: {},
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(isMessageStreamEvent(event)).toBe(false);
    });

    it('should return false for StreamUpdate with different type', () => {
      const event = makeStreamUpdate(StreamEventType.TOKEN);
      expect(isMessageStreamEvent(event)).toBe(false);
    });
  });

  describe('isCustomStreamEvent', () => {
    it('should return true for custom-stream event object', () => {
      const event = {
        type: 'custom-stream' as const,
        executionId: 'exec-1',
        data: { agent: 'researcher' },
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(isCustomStreamEvent(event)).toBe(true);
    });

    it('should return false for message-stream event', () => {
      const event = {
        type: 'message-stream' as const,
        executionId: 'exec-1',
        nodeName: 'agent',
        step: 1,
        content: 'hello',
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(isCustomStreamEvent(event)).toBe(false);
    });
  });

  describe('isDebugStreamEvent', () => {
    it('should return true for debug-stream event object', () => {
      const event = {
        type: 'debug-stream' as const,
        executionId: 'exec-1',
        eventType: 'task' as const,
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(isDebugStreamEvent(event)).toBe(true);
    });

    it('should return false for custom-stream event', () => {
      const event = {
        type: 'custom-stream' as const,
        executionId: 'exec-1',
        data: {},
        timestamp: '2025-01-01T00:00:00Z',
      };
      expect(isDebugStreamEvent(event)).toBe(false);
    });
  });
});

// =============================================================================
// Zod Schemas
// =============================================================================

describe('Zod Schemas', () => {
  describe('StreamMetadataSchema', () => {
    it('should parse valid metadata', () => {
      const result = StreamMetadataSchema.safeParse({
        timestamp: '2025-01-01T00:00:00Z',
        sequenceNumber: 1,
        executionId: 'exec-123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBeInstanceOf(Date);
        expect(result.data.sequenceNumber).toBe(1);
        expect(result.data.executionId).toBe('exec-123');
      }
    });

    it('should coerce timestamp string to Date', () => {
      const result = StreamMetadataSchema.safeParse({
        timestamp: '2025-06-15T12:30:00Z',
        sequenceNumber: 5,
        executionId: 'exec-456',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBeInstanceOf(Date);
        expect(result.data.timestamp.getFullYear()).toBe(2025);
      }
    });

    it('should accept optional fields', () => {
      const result = StreamMetadataSchema.safeParse({
        timestamp: '2025-01-01T00:00:00Z',
        sequenceNumber: 1,
        executionId: 'exec-123',
        nodeId: 'app/phase/activity/detail',
        agentType: 'researcher',
        domain: 'app',
        phase: 'phase',
        activity: 'activity',
        detail: 'detail',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodeId).toBe('app/phase/activity/detail');
        expect(result.data.agentType).toBe('researcher');
      }
    });

    it('should allow passthrough of extra fields', () => {
      const result = StreamMetadataSchema.safeParse({
        timestamp: '2025-01-01T00:00:00Z',
        sequenceNumber: 1,
        executionId: 'exec-123',
        customField: 'custom-value',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['customField']).toBe('custom-value');
      }
    });

    it('should reject missing required fields', () => {
      const result = StreamMetadataSchema.safeParse({
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sequenceNumber type', () => {
      const result = StreamMetadataSchema.safeParse({
        timestamp: '2025-01-01T00:00:00Z',
        sequenceNumber: 'not-a-number',
        executionId: 'exec-123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('StreamUpdateSchema', () => {
    it('should parse valid stream update', () => {
      const result = StreamUpdateSchema.safeParse({
        type: StreamEventType.WORKFLOW_START,
        data: { status: 'running' },
      });
      expect(result.success).toBe(true);
    });

    it('should parse with metadata', () => {
      const result = StreamUpdateSchema.safeParse({
        type: StreamEventType.NODE_START,
        data: { nodeId: 'test-node' },
        metadata: {
          timestamp: '2025-01-01T00:00:00Z',
          sequenceNumber: 1,
          executionId: 'exec-1',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid event type', () => {
      const result = StreamUpdateSchema.safeParse({
        type: 'invalid-event-type',
        data: {},
      });
      expect(result.success).toBe(false);
    });

    it('should accept unknown data payload', () => {
      const result = StreamUpdateSchema.safeParse({
        type: StreamEventType.CUSTOM,
        data: [1, 2, 3],
      });
      expect(result.success).toBe(true);
    });

    it('should accept null data', () => {
      const result = StreamUpdateSchema.safeParse({
        type: StreamEventType.WORKFLOW_END,
        data: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TokenUpdateSchema', () => {
    it('should parse valid token update', () => {
      const result = TokenUpdateSchema.safeParse({
        token: 'Hello',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe('Hello');
      }
    });

    it('should parse with optional fields', () => {
      const result = TokenUpdateSchema.safeParse({
        token: 'World',
        executionId: 'exec-1',
        nodeId: 'agent-node',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.executionId).toBe('exec-1');
        expect(result.data.nodeId).toBe('agent-node');
      }
    });

    it('should reject missing token', () => {
      const result = TokenUpdateSchema.safeParse({
        executionId: 'exec-1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string token', () => {
      const result = TokenUpdateSchema.safeParse({
        token: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('StreamErrorSchema', () => {
    it('should parse valid sse_error', () => {
      const result = StreamErrorSchema.safeParse({
        type: 'sse_error',
        message: 'Connection lost',
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('sse_error');
        expect(result.data.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should parse validation_error type', () => {
      const result = StreamErrorSchema.safeParse({
        type: 'validation_error',
        message: 'Invalid schema',
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should parse connection_error type', () => {
      const result = StreamErrorSchema.safeParse({
        type: 'connection_error',
        message: 'Timeout',
        timestamp: '2025-01-01T00:00:00Z',
        details: { code: 408 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.details).toEqual({ code: 408 });
      }
    });

    it('should reject invalid error type', () => {
      const result = StreamErrorSchema.safeParse({
        type: 'unknown_error',
        message: 'Something',
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing message', () => {
      const result = StreamErrorSchema.safeParse({
        type: 'sse_error',
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('MessageStreamEventSchema', () => {
    const validMessageStream = {
      type: 'message-stream',
      executionId: 'exec-1',
      nodeName: 'research-agent',
      step: 3,
      content: 'Hello world',
      timestamp: '2025-01-01T00:00:00Z',
    };

    it('should parse valid message stream event', () => {
      const result = MessageStreamEventSchema.safeParse(validMessageStream);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Hello world');
        expect(result.data.step).toBe(3);
      }
    });

    it('should parse with optional messageChunk', () => {
      const result = MessageStreamEventSchema.safeParse({
        ...validMessageStream,
        messageChunk: {
          id: 'chunk-1',
          type: 'AIMessageChunk',
          content: 'Hello',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should parse with optional metadata', () => {
      const result = MessageStreamEventSchema.safeParse({
        ...validMessageStream,
        metadata: {
          langgraph_node: 'agent',
          langgraph_step: 3,
          langgraph_triggers: ['start:agent'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type literal', () => {
      const result = MessageStreamEventSchema.safeParse({
        ...validMessageStream,
        type: 'custom-stream',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing required content', () => {
      const { content: _, ...withoutContent } = validMessageStream;
      const result = MessageStreamEventSchema.safeParse(withoutContent);
      expect(result.success).toBe(false);
    });

    it('should reject missing nodeName', () => {
      const { nodeName: _, ...withoutNodeName } = validMessageStream;
      const result = MessageStreamEventSchema.safeParse(withoutNodeName);
      expect(result.success).toBe(false);
    });
  });

  describe('CustomStreamEventSchema', () => {
    const validCustomStream = {
      type: 'custom-stream',
      executionId: 'exec-1',
      data: { agent: 'researcher', percentage: 50 },
      timestamp: '2025-01-01T00:00:00Z',
    };

    it('should parse valid custom stream event', () => {
      const result = CustomStreamEventSchema.safeParse(validCustomStream);
      expect(result.success).toBe(true);
    });

    it('should accept empty data object', () => {
      const result = CustomStreamEventSchema.safeParse({
        ...validCustomStream,
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it('should allow passthrough on data', () => {
      const result = CustomStreamEventSchema.safeParse({
        ...validCustomStream,
        data: { agent: 'test', customKey: 'customValue' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data['customKey']).toBe('customValue');
      }
    });

    it('should reject percentage > 100', () => {
      const result = CustomStreamEventSchema.safeParse({
        ...validCustomStream,
        data: { percentage: 150 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject percentage < 0', () => {
      const result = CustomStreamEventSchema.safeParse({
        ...validCustomStream,
        data: { percentage: -10 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject wrong type literal', () => {
      const result = CustomStreamEventSchema.safeParse({
        ...validCustomStream,
        type: 'message-stream',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DebugStreamEventSchema', () => {
    const validDebugStream = {
      type: 'debug-stream',
      executionId: 'exec-1',
      eventType: 'task',
      timestamp: '2025-01-01T00:00:00Z',
    };

    it('should parse valid debug stream event', () => {
      const result = DebugStreamEventSchema.safeParse(validDebugStream);
      expect(result.success).toBe(true);
    });

    it('should accept task_result eventType', () => {
      const result = DebugStreamEventSchema.safeParse({
        ...validDebugStream,
        eventType: 'task_result',
      });
      expect(result.success).toBe(true);
    });

    it('should accept checkpoint eventType', () => {
      const result = DebugStreamEventSchema.safeParse({
        ...validDebugStream,
        eventType: 'checkpoint',
      });
      expect(result.success).toBe(true);
    });

    it('should parse with optional payload', () => {
      const result = DebugStreamEventSchema.safeParse({
        ...validDebugStream,
        payload: {
          id: 'task-1',
          name: 'research',
          input: { query: 'test' },
          output: { result: 'done' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should parse with optional step and taskId', () => {
      const result = DebugStreamEventSchema.safeParse({
        ...validDebugStream,
        step: 5,
        taskId: 'task-abc',
        taskName: 'Research Phase',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.step).toBe(5);
        expect(result.data.taskId).toBe('task-abc');
      }
    });

    it('should reject invalid eventType', () => {
      const result = DebugStreamEventSchema.safeParse({
        ...validDebugStream,
        eventType: 'invalid-type',
      });
      expect(result.success).toBe(false);
    });

    it('should reject wrong type literal', () => {
      const result = DebugStreamEventSchema.safeParse({
        ...validDebugStream,
        type: 'message-stream',
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// parseNodeId Utility
// =============================================================================

describe('parseNodeId', () => {
  it('should parse a full 4-part node ID', () => {
    const result = parseNodeId('myapp/data-processing/transformer/validate');
    expect(result).toEqual({
      domain: 'myapp',
      phase: 'data-processing',
      activity: 'transformer',
      detail: 'validate',
    });
  });

  it('should parse a 3-part node ID', () => {
    const result = parseNodeId('myapp/research/analyze');
    expect(result).toEqual({
      domain: 'myapp',
      phase: 'research',
      activity: 'analyze',
      detail: undefined,
    });
  });

  it('should parse a 2-part node ID', () => {
    const result = parseNodeId('myapp/research');
    expect(result).toEqual({
      domain: 'myapp',
      phase: 'research',
      activity: undefined,
      detail: undefined,
    });
  });

  it('should parse a 1-part node ID', () => {
    const result = parseNodeId('myapp');
    expect(result).toEqual({
      domain: 'myapp',
      phase: undefined,
      activity: undefined,
      detail: undefined,
    });
  });

  it('should handle empty string', () => {
    const result = parseNodeId('');
    expect(result).toEqual({
      domain: undefined,
      phase: undefined,
      activity: undefined,
      detail: undefined,
    });
  });

  it('should handle node ID with extra parts (only takes first 4)', () => {
    const result = parseNodeId('a/b/c/d/e/f');
    expect(result).toEqual({
      domain: 'a',
      phase: 'b',
      activity: 'c',
      detail: 'd',
    });
  });

  it('should handle node ID with trailing slash', () => {
    const result = parseNodeId('myapp/research/');
    expect(result).toEqual({
      domain: 'myapp',
      phase: 'research',
      activity: undefined,
      detail: undefined,
    });
  });

  it('should handle node ID with leading slash', () => {
    const result = parseNodeId('/myapp/research');
    expect(result).toEqual({
      domain: undefined,
      phase: 'myapp',
      activity: 'research',
      detail: undefined,
    });
  });
});

// =============================================================================
// StreamEventType enum values
// =============================================================================

describe('StreamEventType', () => {
  it('should have correct workflow event values', () => {
    expect(StreamEventType.WORKFLOW_START).toBe('workflow:start');
    expect(StreamEventType.WORKFLOW_END).toBe('workflow:end');
    expect(StreamEventType.WORKFLOW_ERROR).toBe('workflow:error');
  });

  it('should have correct node event values', () => {
    expect(StreamEventType.NODE_START).toBe('node:start');
    expect(StreamEventType.NODE_END).toBe('node:end');
    expect(StreamEventType.NODE_ERROR).toBe('node:error');
    expect(StreamEventType.NODE_COMPLETE).toBe('node:complete');
  });

  it('should have correct stream mode values', () => {
    expect(StreamEventType.MESSAGE_STREAM).toBe('message-stream');
    expect(StreamEventType.CUSTOM_STREAM).toBe('custom-stream');
    expect(StreamEventType.DEBUG_STREAM).toBe('debug-stream');
  });
});
