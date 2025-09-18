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

## 🚀 User Interruption WebSocket Handlers

**NEW FEATURE**: The streaming module now includes comprehensive WebSocket message handlers for real-time user interruption during workflow execution.

### Available WebSocket Message Types

The `StreamingWebSocketGateway` supports the following interruption-related message types:

#### 1. Agent Interruption

```typescript
// Client → Server: Interrupt agent with question
socket.send(JSON.stringify({
  type: 'interrupt_agent',
  payload: {
    executionId: 'exec-123',
    nodeId: 'current',        // optional, defaults to 'current'
    question: 'Can you include pricing data?',
    userId: 'user-456',       // optional
    metadata: {               // optional
      urgency: 'high',
      source: 'chat_interface'
    }
  }
}));

// Server → Client: Acknowledgment
{
  type: 'interrupt_agent_ack',
  success: true,
  executionId: 'exec-123',
  message: 'Interruption request sent to agent',
  timestamp: '2025-01-15T10:30:00Z'
}
```

#### 2. User Input Injection

```typescript
// Client → Server: Inject user input during execution
socket.send(JSON.stringify({
  type: 'inject_input',
  payload: {
    executionId: 'exec-123',
    input: 'Focus on enterprise customers only',
    continueExecution: true,  // optional, defaults to true
    metadata: {              // optional
      inputType: 'clarification',
      priority: 'high'
    }
  }
}));

// Server → Client: Acknowledgment
{
  type: 'inject_input_ack',
  success: true,
  executionId: 'exec-123',
  message: 'User input injected successfully',
  timestamp: '2025-01-15T10:30:00Z'
}
```

#### 3. Interruption Response

```typescript
// Client → Server: Respond to interruption request
socket.send(JSON.stringify({
  type: 'respond_to_interruption',
  payload: {
    interruptionId: 'interrupt-789',
    response: 'Yes, include pricing for premium plans',
    continueExecution: true,
    metadata: {              // optional
      responseTime: 45000,   // ms
      confidence: 0.9
    }
  }
}));

// Server → Client: Acknowledgment
{
  type: 'respond_to_interruption_ack',
  success: true,
  interruptionId: 'interrupt-789',
  message: 'Response processed successfully',
  timestamp: '2025-01-15T10:30:00Z'
}
```

#### 4. Workflow Control

```typescript
// Pause workflow
socket.send(
  JSON.stringify({
    type: 'pause_workflow',
    payload: {
      executionId: 'exec-123',
      reason: 'User needs to provide additional context', // optional
    },
  })
);

// Resume workflow
socket.send(
  JSON.stringify({
    type: 'resume_workflow',
    payload: {
      executionId: 'exec-123',
      userInput: 'Additional context provided', // optional
    },
  })
);

// Cancel interruption
socket.send(
  JSON.stringify({
    type: 'cancel_interruption',
    payload: {
      interruptionId: 'interrupt-789',
      reason: 'No longer needed', // optional
    },
  })
);
```

### Real-Time Notifications

The gateway broadcasts interruption events to subscribed clients:

```typescript
// Client receives interruption request from agent/system
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'interruption_request':
      // Agent is requesting user input
      console.log('Interruption requested:', message.data);
      /*
      message.data = {
        interruptionId: 'interrupt-789',
        executionId: 'exec-123',
        type: 'question',
        message: 'Need clarification on data format',
        timeout: 300000  // 5 minutes
      }
      */
      break;

    case 'interruption_resolved':
      // User response was processed
      console.log('Interruption resolved:', message.data);
      /*
      message.data = {
        interruptionId: 'interrupt-789',
        executionId: 'exec-123',
        response: 'Use ISO format for dates',
        continueExecution: true
      }
      */
      break;
  }
};
```

### Complete Frontend Integration Example

```typescript
class InterruptionManager {
  private socket: WebSocket;
  private activeInterruptions = new Map<string, any>();

  constructor(wsUrl: string) {
    this.socket = new WebSocket(wsUrl);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'interruption_request':
          this.handleInterruptionRequest(message.data);
          break;

        case 'interruption_resolved':
          this.handleInterruptionResolved(message.data);
          break;

        case 'user_interruption_requested':
          this.showUserInterruptionDialog(message.data);
          break;

        case 'user_interruption_resolved':
          this.hideInterruptionDialog(message.data);
          break;
      }
    };
  }

  // User initiates interruption
  async interruptAgent(executionId: string, question: string): Promise<void> {
    this.socket.send(
      JSON.stringify({
        type: 'interrupt_agent',
        payload: {
          executionId,
          question,
          userId: this.getCurrentUserId(),
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'user_interface',
          },
        },
      })
    );
  }

  // User responds to interruption
  async respondToInterruption(interruptionId: string, response: string, continueExecution = true): Promise<void> {
    this.socket.send(
      JSON.stringify({
        type: 'respond_to_interruption',
        payload: {
          interruptionId,
          response,
          continueExecution,
          metadata: {
            responseTime: Date.now() - this.activeInterruptions.get(interruptionId)?.startTime,
          },
        },
      })
    );

    // Remove from active interruptions
    this.activeInterruptions.delete(interruptionId);
  }

  // Pause/Resume workflow
  async pauseWorkflow(executionId: string, reason?: string): Promise<void> {
    this.socket.send(
      JSON.stringify({
        type: 'pause_workflow',
        payload: { executionId, reason },
      })
    );
  }

  async resumeWorkflow(executionId: string, userInput?: string): Promise<void> {
    this.socket.send(
      JSON.stringify({
        type: 'resume_workflow',
        payload: { executionId, userInput },
      })
    );
  }

  private handleInterruptionRequest(data: any): void {
    // Store interruption for tracking
    this.activeInterruptions.set(data.interruptionId, {
      ...data,
      startTime: Date.now(),
    });

    // Show UI for user to respond
    this.showInterruptionDialog(data);
  }

  private handleInterruptionResolved(data: any): void {
    // Update UI to show workflow continuing
    this.showNotification(`Interruption resolved: ${data.response}`);
    this.activeInterruptions.delete(data.interruptionId);
  }

  private showInterruptionDialog(data: any): void {
    // Implementation depends on your UI framework
    console.log('Show interruption dialog:', data);
  }

  private showNotification(message: string): void {
    // Show user notification
    console.log('Notification:', message);
  }

  private getCurrentUserId(): string {
    // Return current user ID
    return 'user-123';
  }
}

// Usage
const interruptionManager = new InterruptionManager('ws://localhost:8080');

// Subscribe to execution updates
interruptionManager.socket.onopen = () => {
  interruptionManager.socket.send(
    JSON.stringify({
      type: 'subscribe_execution',
      payload: { executionId: 'exec-123' },
    })
  );
};
```

### Event-Driven Integration

The WebSocket gateway emits events that can be consumed by other services:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HumanApprovalService } from '@hive-academy/langgraph-hitl';
import { WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';

@Injectable()
export class InterruptionEventHandler {
  constructor(private readonly hitlService: HumanApprovalService, private readonly workflowManager: WorkflowManagerService) {}

  @OnEvent('user.interruption.requested')
  async handleUserInterruptionRequested(data: any): Promise<void> {
    // Create HITL interruption request
    const interruptionId = await this.hitlService.requestUserInterruption({
      executionId: data.executionId,
      nodeId: data.nodeId,
      type: data.type,
      message: data.message,
      metadata: data.metadata,
    });

    console.log(`Created interruption ${interruptionId} for execution ${data.executionId}`);
  }

  @OnEvent('user.input.injected')
  async handleUserInputInjected(data: any): Promise<void> {
    // Inject input into workflow
    const success = await this.workflowManager.addUserInput(data.executionId, data.input, data.continueExecution, data.metadata);

    console.log(`Input injection ${success ? 'successful' : 'failed'} for execution ${data.executionId}`);
  }

  @OnEvent('workflow.pause.requested')
  async handleWorkflowPauseRequested(data: any): Promise<void> {
    // Pause workflow
    const paused = await this.workflowManager.pauseWorkflow(data.executionId, data.reason);
    console.log(`Workflow ${data.executionId} pause ${paused ? 'successful' : 'failed'}`);
  }

  @OnEvent('workflow.resume.requested')
  async handleWorkflowResumeRequested(data: any): Promise<void> {
    // Resume workflow
    const resumed = await this.workflowManager.resumeWorkflow(data.executionId, data.userInput);
    console.log(`Workflow ${data.executionId} resume ${resumed ? 'successful' : 'failed'}`);
  }
}
```

### Broadcasting Methods

The gateway provides methods for broadcasting interruption events:

```typescript
// From your service, broadcast interruption request to clients
await webSocketGateway.broadcastInterruptionRequest({
  interruptionId: 'interrupt-789',
  executionId: 'exec-123',
  type: 'question',
  message: 'Need user clarification',
  timeout: 300000,
});

// Broadcast interruption resolution to clients
await webSocketGateway.broadcastInterruptionResolution({
  interruptionId: 'interrupt-789',
  executionId: 'exec-123',
  response: 'User provided clarification',
  continueExecution: true,
});
```

This comprehensive WebSocket integration enables real-time bidirectional communication for dynamic user interruption, making your AI workflows truly interactive and responsive to user needs.

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
