# Streaming Module - User Manual

## Overview

The **@hive-academy/langgraph-streaming** module provides real-time streaming capabilities for LangGraph workflows, enabling live token streaming, event broadcasting, progress tracking, and WebSocket integration for dynamic user interfaces and responsive AI applications.

**Key Features:**

- **Token-Level Streaming** - Real-time token streaming with buffering and batching
- **Event Broadcasting** - Comprehensive workflow event streaming and processing
- **Progress Tracking** - Granular progress monitoring with ETA and performance metrics
- **WebSocket Integration** - Built-in WebSocket gateway for real-time client updates
- **METHOD-LEVEL Decorators** - `@StreamToken`, `@StreamEvent`, `@StreamProgress` for fine-grained control
- **Advanced Processing** - Event filtering, transformation, aggregation, and batching

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-streaming
```

```typescript
import { Module } from '@nestjs/common';
import { StreamingModule } from '@hive-academy/langgraph-streaming';

@Module({
  imports: [
    StreamingModule.forRoot({
      websocket: {
        enabled: true,
        port: 8080,
      },
      defaultBufferSize: 50,
      gateway: {
        enabled: true,
        cors: true,
        authentication: {
          enabled: true,
          strategy: 'jwt',
        },
        rateLimit: {
          windowMs: 60000,
          maxConnections: 100,
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### TokenStreamingService - Token-Level Streaming

**Primary service** for real-time token streaming with advanced buffering:

```typescript
// Core token operations
initializeTokenStream(options: { executionId: string; nodeId: string; config: StreamTokenDecoratorMetadata }): Promise<void>
streamToken(executionId: string, nodeId: string, token: string, metadata?: Record<string, unknown>): void
flushTokens(executionId: string, nodeId: string): Promise<void>

// Stream observables
getTokenStream(executionId: string, nodeId?: string): Observable<StreamUpdate>
getGlobalTokenStream(): Observable<StreamUpdate>
getTokenStats(): Observable<TokenStatistics>

// Lifecycle management
closeTokenStream(executionId: string, nodeId: string): void
closeExecutionTokenStreams(executionId: string): void
```

### EventStreamProcessorService - Event Processing

**Comprehensive event** processing with batching and aggregation:

```typescript
// Event processing
processBatch(events: StreamUpdate[], batchSize?: number, debounceMs?: number): Observable<StreamUpdate[]>
groupEventsByType(events: Observable<StreamUpdate>): Observable<Observable<StreamUpdate>>
aggregateByExecution(executionId: string, events: StreamUpdate[]): Map<StreamEventType, StreamUpdate[]>

// Event filtering and transformation
filterEvents(events: StreamUpdate[], criteria: FilterCriteria): StreamUpdate[]
transformEvents(events: StreamUpdate[], transformer: EventTransformer): StreamUpdate[]
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { Workflow, Node, DeclarativeWorkflowBase } from '@hive-academy/nestjs-langgraph';
import { StreamToken, StreamEvent, StreamProgress, StreamEventType } from '@hive-academy/langgraph-streaming';

interface AIWritingState {
  prompt: string;
  content?: string;
  tokens?: string[];
  progress?: number;
  completed?: boolean;
}

@Workflow({
  name: 'ai-content-generation',
  streaming: true,
  channels: {
    prompt: null,
    content: null,
    tokens: null,
    progress: null,
    completed: null,
  },
})
@Injectable()
export class AIContentGenerationWorkflow extends DeclarativeWorkflowBase<AIWritingState> {
  @Node({ type: 'llm' })
  @StreamToken({
    enabled: true,
    bufferSize: 50,
    format: 'text',
    filter: { minLength: 1, excludeWhitespace: true },
    flushInterval: 100,
  })
  @StreamProgress({
    enabled: true,
    interval: 500,
    granularity: 'fine',
    includeETA: true,
  })
  async generateContent(state: AIWritingState): Promise<Partial<AIWritingState>> {
    const llmResponse = await this.llm.invoke(state.prompt, {
      streaming: true, // Enable LLM token streaming
      onToken: (token: string, metadata?: any) => {
        // Tokens are automatically streamed via @StreamToken decorator
        this.logger.debug(`Token received: ${token}`);
      },
    });

    return {
      content: llmResponse.content,
      completed: true,
    };
  }

  @Node({ type: 'tool' })
  @StreamEvent({
    events: [StreamEventType.TOOL_START, StreamEventType.TOOL_COMPLETE, StreamEventType.PROGRESS],
    bufferSize: 100,
    delivery: 'at-least-once',
    transformer: (event) => ({ ...event, enriched: true }),
  })
  async processTokens(state: AIWritingState): Promise<Partial<AIWritingState>> {
    if (!state.content) return state;

    // Process content with detailed event streaming
    const tokens = state.content.split(' ');
    const processedTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const processed = await this.processToken(tokens[i]);
      processedTokens.push(processed);

      // Progress is automatically tracked via @StreamProgress decorator
      const progress = ((i + 1) / tokens.length) * 100;
      await this.updateProgress(progress);
    }

    return { tokens: processedTokens };
  }

  @Node({ type: 'condition' })
  @StreamEvent({
    events: [StreamEventType.VALUES, StreamEventType.UPDATES],
    filter: { includeDebug: false, minPriority: 'medium' },
  })
  async qualityCheck(state: AIWritingState): Promise<Partial<AIWritingState>> {
    if (!state.content) return state;

    const qualityScore = await this.assessQuality(state.content);

    // Conditional routing with event streaming
    const passesQuality = qualityScore > 0.7;

    return {
      completed: passesQuality,
      qualityScore,
    };
  }

  private async processToken(token: string): Promise<string> {
    // Token processing logic
    return token.toLowerCase().trim();
  }

  private async updateProgress(progress: number): Promise<void> {
    // Progress update logic (automatically streamed via decorator)
    this.logger.debug(`Progress: ${progress}%`);
  }

  private async assessQuality(content: string): Promise<number> {
    // Quality assessment logic
    return Math.random(); // Placeholder
  }
}
```

## Configuration

### Basic Configuration

```typescript
StreamingModule.forRoot({
  websocket: {
    enabled: true,
    port: 8080,
  },
  defaultBufferSize: 50,
  gateway: {
    enabled: true,
    cors: {
      origin: ['http://localhost:3000', 'https://app.example.com'],
      credentials: true,
    },
    authentication: {
      enabled: false, // Disable for development
    },
  },
});
```

### Advanced Configuration

```typescript
StreamingModule.forRoot({
  websocket: {
    enabled: true,
    port: 8080,
  },
  defaultBufferSize: 100,
  gateway: {
    enabled: true,
    cors: true,
    authentication: {
      enabled: true,
      strategy: 'jwt',
      secretKey: process.env.JWT_SECRET,
      expiresIn: '1h',
    },
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxConnections: 100, // per window
      maxRequestsPerConnection: 1000,
    },
    compression: {
      enabled: true,
      algorithm: 'gzip',
      threshold: 1024,
    },
    heartbeat: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
    },
  },
});
```

## Streaming Decorators

### @StreamToken - METHOD-LEVEL Token Streaming

```typescript
@Node({ type: 'llm' })
@StreamToken({
  enabled: true,
  bufferSize: 50,              // Tokens per buffer
  batchSize: 10,               // Tokens per batch
  flushInterval: 100,          // Milliseconds
  format: 'text',              // 'text' | 'json' | 'structured'
  includeMetadata: true,
  processor: (token, metadata) => `[${new Date().toISOString()}] ${token}`,
  filter: {
    minLength: 1,
    maxLength: 1000,
    excludeWhitespace: true,
    pattern: /^[a-zA-Z0-9\s]+$/
  }
})
async generateText(state: WorkflowState): Promise<Partial<WorkflowState>> {
  // LLM generation with automatic token streaming
  return await this.llm.invoke(state.prompt);
}
```

### @StreamEvent - METHOD-LEVEL Event Broadcasting

```typescript
@Node({ type: 'tool' })
@StreamEvent({
  events: [
    StreamEventType.TOOL_START,
    StreamEventType.TOOL_COMPLETE,
    StreamEventType.PROGRESS,
    StreamEventType.VALUES
  ],
  bufferSize: 100,
  batchSize: 10,
  delivery: 'at-least-once',    // 'at-most-once' | 'at-least-once' | 'exactly-once'
  transformer: (event) => ({
    ...event,
    timestamp: new Date().toISOString(),
    enriched: true
  }),
  filter: {
    eventTypes: [StreamEventType.PROGRESS],
    minPriority: 'medium',
    includeDebug: false,
    excludeTypes: [StreamEventType.DEBUG]
  }
})
async processData(state: WorkflowState): Promise<Partial<WorkflowState>> {
  // Tool execution with comprehensive event streaming
  return await this.dataProcessor.process(state.data);
}
```

### @StreamProgress - METHOD-LEVEL Progress Tracking

```typescript
@Node({ type: 'task' })
@StreamProgress({
  enabled: true,
  interval: 1000,              // Progress report interval (ms)
  granularity: 'fine',         // 'coarse' | 'fine' | 'detailed'
  includeETA: true,
  includeMetrics: true,
  milestones: [25, 50, 75, 90, 95],
  calculator: (current, total, metadata) => {
    // Custom progress calculation
    const baseProgress = (current / total) * 100;
    const complexity = metadata?.complexity || 1;
    return Math.min(baseProgress * complexity, 100);
  },
  format: {
    showPercentage: true,
    showCurrent: true,
    showTotal: true,
    showRate: true,
    precision: 1
  }
})
async processLargeDataset(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const items = state.dataset;
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const result = await this.processItem(items[i]);
    results.push(result);

    // Progress automatically calculated and streamed
    // Manual progress update (optional)
    if (this.progressTracker) {
      await this.progressTracker.update(i + 1, items.length, {
        complexity: items[i].complexity
      });
    }
  }

  return { processedData: results };
}
```

## WebSocket Integration

### Client-Side Connection

```typescript
// Frontend WebSocket client
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
  // Subscribe to workflow execution
  socket.send(
    JSON.stringify({
      type: 'subscribe_execution',
      payload: {
        executionId: 'execution-123',
        events: ['token', 'event', 'progress', 'status'],
      },
    })
  );
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'token':
      // Handle token streaming
      console.log('Token:', message.payload.content);
      break;

    case 'progress':
      // Handle progress updates
      console.log('Progress:', message.payload.progress + '%');
      break;

    case 'event':
      // Handle workflow events
      console.log('Event:', message.payload);
      break;
  }
};
```

### Server-Side Broadcasting

```typescript
import { Injectable } from '@nestjs/common';
import { StreamingWebSocketGateway, WebSocketBridgeService } from '@hive-academy/langgraph-streaming';

@Injectable()
export class WorkflowStreamingService {
  constructor(private readonly webSocketGateway: StreamingWebSocketGateway, private readonly bridgeService: WebSocketBridgeService) {}

  async broadcastToClients(executionId: string, data: any): Promise<void> {
    // Broadcast to all subscribed clients
    await this.webSocketGateway.broadcastToExecution(executionId, {
      type: 'workflow_update',
      payload: data,
      timestamp: new Date().toISOString(),
    });
  }

  async sendToSpecificClient(clientId: string, message: any): Promise<void> {
    // Send to specific client
    await this.webSocketGateway.sendToClient(clientId, message);
  }
}
```

## Core Interfaces

### Stream Types

```typescript
interface StreamUpdate<T = any> {
  type: StreamEventType;
  data: T;
  metadata?: StreamMetadata;
}

interface StreamMetadata {
  timestamp: Date;
  sequenceNumber: number;
  executionId: string;
  nodeId?: string;
  agentType?: string;
  [key: string]: any;
}

interface TokenData {
  content: string;
  role?: string;
  index?: number;
  totalTokens?: number;
}

enum StreamEventType {
  TOKEN = 'token',
  VALUES = 'values',
  UPDATES = 'updates',
  EVENTS = 'events',
  PROGRESS = 'progress',
  NODE_START = 'node_start',
  NODE_COMPLETE = 'node_complete',
  TOOL_START = 'tool_start',
  TOOL_COMPLETE = 'tool_complete',
  ERROR = 'error',
  DEBUG = 'debug',
}
```

### Configuration Types

```typescript
interface StreamingModuleOptions {
  websocket?: {
    enabled: boolean;
    port?: number;
  };
  defaultBufferSize?: number;
  gateway?: WebSocketGatewayConfig;
}

interface WebSocketGatewayConfig {
  enabled: boolean;
  cors?: boolean | CorsOptions;
  authentication?: AuthenticationConfig;
  rateLimit?: RateLimitConfig;
  compression?: CompressionConfig;
  heartbeat?: HeartbeatConfig;
}
```

## Error Handling

```typescript
import { StreamingError, TokenStreamingError, WebSocketError } from '@hive-academy/langgraph-streaming';

@Injectable()
export class RobustStreamingService {
  constructor(private readonly tokenStreaming: TokenStreamingService, private readonly eventProcessor: EventStreamProcessorService) {}

  async safeStreamOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof TokenStreamingError) {
        this.logger.error('Token streaming failed', error.message);
        // Continue without streaming
        return null;
      } else if (error instanceof WebSocketError) {
        this.logger.warn('WebSocket operation failed', error.message);
        // Fallback to event emitter
        return null;
      } else if (error instanceof StreamingError) {
        this.logger.error('General streaming error', error.message);
        throw new ServiceUnavailableException('Streaming temporarily unavailable');
      }
      throw error;
    }
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { StreamingModule, TokenStreamingService } from '@hive-academy/langgraph-streaming';

describe('TokenStreamingService', () => {
  let service: TokenStreamingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        StreamingModule.forRoot({
          websocket: { enabled: false },
          defaultBufferSize: 10,
        }),
      ],
    }).compile();

    service = module.get<TokenStreamingService>(TokenStreamingService);
  });

  it('should initialize token stream', async () => {
    const config = {
      enabled: true,
      bufferSize: 50,
      methodName: 'testMethod',
    };

    await service.initializeTokenStream({
      executionId: 'test-exec',
      nodeId: 'test-node',
      config,
    });

    const streams = service.getActiveTokenStreams();
    expect(streams).toHaveLength(1);
    expect(streams[0].config.bufferSize).toBe(50);
  });

  it('should stream tokens with buffering', async () => {
    await service.initializeTokenStream({
      executionId: 'test-exec',
      nodeId: 'test-node',
      config: { enabled: true, bufferSize: 3, methodName: 'test' },
    });

    const tokenStream = service.getTokenStream('test-exec', 'test-node');
    const tokens: any[] = [];

    tokenStream.subscribe((token) => tokens.push(token));

    service.streamToken('test-exec', 'test-node', 'Hello');
    service.streamToken('test-exec', 'test-node', 'World');

    await service.flushTokens('test-exec', 'test-node');

    expect(tokens.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Token Streaming Performance

```typescript
// Solution: Optimize buffer configuration
@StreamToken({
  bufferSize: 100,        // Increase buffer size
  flushInterval: 50,      // Decrease flush interval
  batchSize: 5,           // Optimize batch size
  filter: {
    excludeWhitespace: true,  // Reduce noise
    minLength: 2
  }
})
```

#### 2. WebSocket Connection Issues

```typescript
// Solution: Configure connection resilience
gateway: {
  heartbeat: {
    enabled: true,
    interval: 30000,      // More frequent heartbeats
    timeout: 5000
  },
  rateLimit: {
    windowMs: 60000,
    maxConnections: 200   // Increase connection limit
  }
}
```

#### 3. Memory Usage from Streaming

```typescript
// Solution: Implement cleanup policies
async performStreamingMaintenance(): Promise<void> {
  // Close stale token streams
  const activeStreams = this.tokenStreaming.getActiveTokenStreams();
  const now = Date.now();

  activeStreams.forEach(stream => {
    const lastActivity = stream.lastFlush.getTime();
    if (now - lastActivity > 300000) { // 5 minutes
      const [executionId, nodeId] = stream.streamKey.split(':');
      this.tokenStreaming.closeTokenStream(executionId, nodeId);
    }
  });
}
```

This comprehensive streaming module provides real-time capabilities for LangGraph workflows with advanced token streaming, event processing, and WebSocket integration for building responsive AI applications with live user feedback.
