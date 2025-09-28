# Streaming Module - Real-time Processing with RxJS and WebSockets

## 🚀 LangGraph Real-time Processing

**Evidence-Based API Documentation** (verified through source code inspection)

The Streaming Module provides production-ready real-time processing using RxJS observables and WebSocket integration, with comprehensive decorator system for streaming workflows.

### ✅ Verified Architecture Patterns

**RxJS-Based Streaming**: Real streaming implementation with reactive programming

```typescript
// VERIFIED EXPORT: Core streaming services using RxJS
import {
  TokenStreamingService, // Token buffering & emission with RxJS
  EventStreamProcessorService, // Event processing with observables
  WebSocketBridgeService, // WebSocket integration
  StreamingWebSocketService, // WebSocket gateway
} from '@hive-academy/langgraph-streaming';

// Real implementation: RxJS Subject/Observable usage
class TokenStreamingService {
  private readonly tokenSubject = new BehaviorSubject<TokenData | null>(null);
  private readonly batchedTokens = new Subject<TokenData[]>();

  // Real streaming with configurable buffer/batch thresholds
}
```

**WebSocket Integration**: Production WebSocket gateway with type-safe messaging

```typescript
// VERIFIED EXPORTS: WebSocket types and configuration
import type { WebSocketGatewayConfig, WebSocketConnection, WebSocketMessage, WebSocketGatewayEvents } from '@hive-academy/langgraph-streaming';

// Real WebSocket message types
enum WebSocketMessageType {
  SUBSCRIBE_EXECUTION = 'subscribe_execution',
  SUBSCRIBE_EVENTS = 'subscribe_events',
  JOIN_ROOM = 'join_room',
  STREAM_UPDATE = 'stream_update',
  // ... comprehensive message system
}
```

**Streaming Decorators**: Real decorator system for streaming functionality

```typescript
// VERIFIED EXPORTS: Streaming decorators with metadata
import {
  StreamToken,      // Token streaming decorator
  StreamEvent,      // Event streaming decorator
  StreamProgress,   // Progress streaming decorator
} from '@hive-academy/langgraph-streaming';

// Usage patterns verified in source
@StreamToken({ bufferSize: 10, flushInterval: 100 })
@StreamEvent({ eventType: 'progress', realTime: true })
@StreamProgress({ trackProgress: true, updateInterval: 1000 })
```

## I. Foundation Layer

### ✅ Complete Verified API

**All Exports** (verified from src/index.ts):

```typescript
// VERIFIED EXPORTS: NestJS Module
import { StreamingModule } from '@hive-academy/langgraph-streaming';

// VERIFIED EXPORTS: Core Streaming Services
import {
  TokenStreamingService, // Token buffering & emission (RxJS)
  WebSocketBridgeService, // WebSocket integration
  EventStreamProcessorService, // Event processing (RxJS observables)
  StreamingWebSocketService, // WebSocket gateway service
} from '@hive-academy/langgraph-streaming';

// VERIFIED EXPORTS: Core Interface Adapter
import { StreamingServiceAdapter } from '@hive-academy/langgraph-streaming';

// VERIFIED EXPORTS: Streaming Decorators
import {
  StreamToken, // Token streaming decorator
  StreamEvent, // Event streaming decorator
  StreamProgress, // Progress streaming decorator
  getStreamTokenMetadata, // Metadata helpers
  getStreamEventMetadata,
  getStreamProgressMetadata,
} from '@hive-academy/langgraph-streaming';

// VERIFIED EXPORTS: Interfaces and Types
import type {
  StreamUpdate, // Stream update data structure
  StreamMetadata, // Stream metadata
  TokenData, // Token data structure
  WebSocketGatewayConfig, // WebSocket configuration
  WebSocketMessage, // WebSocket messaging
  StreamTokenOptions, // Decorator options
  StreamEventOptions,
  StreamProgressOptions,
} from '@hive-academy/langgraph-streaming';

// VERIFIED EXPORTS: Constants and Enums
import {
  StreamEventType, // Stream event types
  WebSocketMessageType, // WebSocket message types
} from '@hive-academy/langgraph-streaming';
```

### Quick Start & Installation

```bash
npm install @hive-academy/langgraph-streaming
```

```typescript
import { Module } from '@nestjs/common';
import { StreamingModule } from '@hive-academy/langgraph-streaming';

@Module({
  imports: [
    StreamingModule.forRoot({
      // Token streaming configuration
      tokenStreaming: {
        bufferSize: 100,
        flushInterval: 50, // milliseconds
        batchTimeout: 1000,
      },

      // WebSocket configuration
      websocket: {
        port: 3001,
        cors: { origin: '*' },
        maxConnections: 1000,
      },

      // Event processing
      eventProcessing: {
        maxConcurrent: 10,
        queueSize: 1000,
      },
    }),
  ],
})
export class AppModule {}
```

### 🏗️ Core Architecture Components

**RxJS Streaming Architecture**: Real reactive programming patterns

```typescript
@Injectable()
export class MyStreamingService {
  constructor(private readonly tokenStreaming: TokenStreamingService, private readonly eventProcessor: EventStreamProcessorService, private readonly websocketBridge: WebSocketBridgeService) {}

  async setupRealtimeWorkflow() {
    // Token streaming with RxJS observables
    const tokenStream = this.tokenStreaming.createTokenStream({
      bufferSize: 50,
      flushInterval: 100,
    });

    // Event processing with reactive patterns
    const eventStream = this.eventProcessor.processEvents(
      tokenStream.pipe(
        map((token) => ({ type: 'token', data: token })),
        filter((event) => event.data.confidence > 0.5),
        debounceTime(50)
      )
    );

    // WebSocket real-time broadcasting
    await this.websocketBridge.broadcastStream(eventStream, {
      room: 'workflow-updates',
      compression: true,
    });

    return { tokenStream, eventStream };
  }
}
```

### Core Concepts

**Primary Purpose**: Provides real-time streaming capabilities, WebSocket integration, and event-driven workflows for LangGraph applications.

**Key Features:**

- **Token Streaming** - Real-time streaming of AI model tokens and partial responses
- **WebSocket Bridge** - Full-duplex communication with client applications
- **Event Stream Processing** - Event-driven workflow execution with real-time updates
- **Streaming Decorators** - Simple decorators to enable streaming on any workflow node
- **Enhanced Agent Architecture** - Support for both simple-agent and workflow-agent patterns with streaming capabilities
- **Production Ready** - Enterprise-grade streaming with connection management, error handling, and scalability

### Core Interfaces & Types

**Primary Interfaces:**

```typescript
// Core streaming service interface that handles token-by-token streaming
interface IStreamingService {
  streamTokens(options: TokenStreamOptions): AsyncIterable<StreamUpdate>;
  createStream(streamId: string, metadata?: StreamMetadata): Promise<void>;
  closeStream(streamId: string): Promise<void>;
}

// Configuration interface for streaming module
interface StreamingModuleConfig {
  enabled: boolean;
  websocket: WebSocketConfig;
  tokenStreaming: TokenStreamingConfig;
  eventProcessing?: EventProcessingConfig;
}

// Enhanced agent support types
interface StreamingAgentConfig {
  type?: 'simple-agent' | 'workflow-agent';
  workflowConfig?: {
    enableTokenStreaming: boolean;
    enableEventStreaming: boolean;
    enableWebSocketBridge: boolean;
  };
}
```

### Basic Usage Patterns

**Simple Agent Integration:**

```typescript
@Agent({
  id: 'simple-streaming-agent',
  type: 'simple-agent',
  capabilities: ['token-streaming'],
})
export class SimpleStreamingAgent {
  @StreamToken()
  async nodeFunction(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Basic token streaming usage
    return {
      streamingData: 'Processing tokens...',
      status: 'streaming',
    };
  }
}
```

**Basic Service Usage:**

```typescript
@Injectable()
export class BasicStreamingService {
  constructor(private readonly streamingService: IStreamingService) {}

  async performBasicStreaming(): Promise<void> {
    // Demonstrate core streaming functionality
    const stream = this.streamingService.streamTokens({
      streamId: 'example-stream',
      source: 'ai-model',
    });

    for await (const update of stream) {
      console.log('Streamed token:', update.token);
    }
  }
}
```

## II. Integration Layer

### Enhanced Agent Architecture Usage

**Workflow Agent with Internal Steps:**

```typescript
@Agent({
  id: 'workflow-streaming-agent',
  type: 'workflow-agent',
  capabilities: ['advanced-streaming-operations'],
  workflowConfig: {
    enableTokenStreaming: true,
    enableInternalCheckpointing: true,
    enableStepProgress: true,
    maxInternalRetries: 3,
  },
})
export class WorkflowStreamingAgent {
  @Entrypoint()
  async initialize(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Entry point with streaming initialization
    return {
      status: 'initialized',
      streamingContext: await this.setupStreamingContext(),
    };
  }

  @Task({ dependsOn: ['initialize'] })
  @StreamToken({ bufferSize: 50 })
  async processTokenStreaming(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Core token streaming step
    const stream = await this.streamingService.createTokenStream({
      streamId: context.executionId,
      model: 'gpt-4',
    });

    return {
      streamResult: await this.processStreamedTokens(stream),
      confidence: stream.metadata.confidence,
    };
  }

  @Node({ type: 'condition' })
  async evaluateStreamCondition(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Decision node using streaming-specific logic
    const shouldContinueStreaming = await this.checkStreamHealth(context.state);
    return {
      shouldContinueStreaming,
      evaluationReason: 'Stream health check',
    };
  }

  @Edge('evaluateStreamCondition', 'finalize', {
    condition: (state) => state.shouldContinueStreaming,
  })
  routeToFinalize() {}

  @Task({ dependsOn: ['evaluateStreamCondition'] })
  @StreamEvent({ eventType: 'completion' })
  async finalize(context: TaskExecutionContext): Promise<Partial<WorkflowState>> {
    // Final streaming processing step
    return {
      status: 'completed',
      streamOutput: await this.generateStreamOutput(context.state),
    };
  }
}
```

### Cross-Module Integration Examples

**Integration with Core Module:**

```typescript
@Injectable()
export class StreamingWorkflowService {
  async createIntegratedWorkflow(): Promise<WorkflowDefinition<StreamingWorkflowState>> {
    return {
      name: 'streaming-integrated-workflow',
      description: 'Workflow combining streaming with core LangGraph state management',
      channels: StreamingWorkflowStateAnnotation,

      nodes: [
        {
          id: 'streaming-processing',
          handler: async (state) => {
            // Integration with core workflow state management
            return await this.streamingService.processWithWorkflowState(state);
          },
        },
      ],

      edges: [
        // Define edges with streaming-specific conditions
      ],
    };
  }
}
```

**Integration with Other LangGraph Modules:**

```typescript
// Example: Integration with Memory Module
@Injectable()
export class StreamingMemoryService {
  constructor(private readonly streamingService: IStreamingService, private readonly memoryService: MemoryService) {}

  async processWithMemory(input: StreamInput): Promise<StreamOutput> {
    // Retrieve relevant memories
    const memories = await this.memoryService.retrieveRelevant(input);

    // Process using streaming with memory context
    const stream = this.streamingService.streamTokens({
      input,
      memories,
      streamId: `memory-stream-${Date.now()}`,
    });

    let result = '';
    for await (const update of stream) {
      result += update.token;
    }

    // Store result in memory for future use
    await this.memoryService.storeEntry({
      content: result,
      metadata: { module: 'streaming', timestamp: new Date() },
    });

    return { output: result, streamId: stream.id };
  }
}
```

## III. Advanced Layer

### Production Configuration

```typescript
StreamingModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    // Production-grade configuration
    websocket: {
      enabled: configService.get('STREAMING_WEBSOCKET_ENABLED', true),
      port: configService.get('STREAMING_WS_PORT', 3001),
      cors: { origin: configService.get('STREAMING_CORS_ORIGIN', '*') },
    },

    // Performance configuration
    performance: {
      bufferSize: configService.get('STREAMING_BUFFER_SIZE', 100),
      flushInterval: configService.get('STREAMING_FLUSH_INTERVAL', 50),
      maxConnections: configService.get('STREAMING_MAX_CONNECTIONS', 1000),
    },

    // Error handling configuration
    errorHandling: {
      enableRecovery: configService.get('STREAMING_ERROR_RECOVERY', true),
      maxRetries: configService.get('STREAMING_MAX_RETRIES', 3),
      backoffStrategy: configService.get('STREAMING_BACKOFF', 'exponential'),
    },

    // Enhanced agent configuration
    agentDefaults: {
      workflowConfig: {
        enableTokenStreaming: true,
        enableEventStreaming: true,
        enableWebSocketBridge: true,
      },
    },
  }),
  inject: [ConfigService],
});
```

### Advanced Usage Patterns

**Enterprise Streaming Integration:**

```typescript
@Injectable()
export class EnterpriseStreamingService {
  async createEnterpriseWorkflow(): Promise<WorkflowDefinition<EnterpriseStreamingState>> {
    return {
      name: 'enterprise-streaming-workflow',
      description: 'Production-grade streaming workflow with full enterprise features',
      channels: EnterpriseStreamingStateAnnotation,

      nodes: [
        {
          id: 'validate-enterprise-stream',
          handler: async (state) => {
            // Enterprise validation with compliance checks
            return await this.validateEnterpriseStream(state);
          },
          config: {
            timeout: 30000,
            retry: { maxAttempts: 3, delay: 2000 },
            streamValidation: true,
          },
        },

        {
          id: 'streaming-enterprise-processing',
          handler: async (state) => {
            // Advanced streaming with enterprise features
            return await this.processEnterpriseStream(state);
          },
          config: {
            streaming: true,
            requiresApproval: true,
            approval: {
              threshold: 0.8,
              condition: (state) => state.streamRisk > 0.7,
            },
          },
        },
      ],

      edges: [
        {
          from: 'validate-enterprise-stream',
          to: {
            condition: (state) => {
              // Enterprise routing logic using stream validation
              return state.streamValidated ? 'approved-path' : 'review-path';
            },
            routes: {
              'approved-path': 'streaming-enterprise-processing',
              'review-path': 'human-review',
            },
          },
        },
      ],
    };
  }
}
```

### Performance Optimization Patterns

```typescript
@Injectable()
export class OptimizedStreamingService {
  async optimizedTokenProcessing(streams: StreamInput[]): Promise<StreamOutput[]> {
    // Batch streaming for optimal performance
    const batches = this.createBatches(streams, this.optimalBatchSize);

    const results = await Promise.allSettled(
      batches.map((batch) =>
        this.streamingService.processBatch(batch, {
          // Performance optimization options
          enableCaching: true,
          enableParallelStreaming: true,
          enableConnectionPooling: true,
        })
      )
    );

    return this.consolidateResults(results);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    // Intelligent batching logic for streaming
    return items.reduce((batches, item, index) => {
      const batchIndex = Math.floor(index / batchSize);
      if (!batches[batchIndex]) batches[batchIndex] = [];
      batches[batchIndex].push(item);
      return batches;
    }, [] as T[][]);
  }
}
```

## IV. Consumer Journey

### Learning Path Progression

**Beginner (0-30 minutes)**

1. ✅ Complete Quick Start installation
2. ✅ Run basic token streaming example
3. ✅ Understand core streaming interfaces and WebSocket integration
4. 🎯 **Success Milestone**: Successfully implement token streaming in existing application

**Intermediate (30 minutes - 2 hours)**

1. ✅ Implement enhanced agent architecture (workflow agent with streaming)
2. ✅ Configure production streaming settings
3. ✅ Integrate with other LangGraph modules (memory, multi-agent)
4. 🎯 **Success Milestone**: Build multi-step workflow using streaming features

**Advanced (2+ hours)**

1. ✅ Implement enterprise patterns and error handling
2. ✅ Optimize streaming performance for production workloads
3. ✅ Create custom streaming decorators and advanced integrations
4. 🎯 **Success Milestone**: Deploy production-ready system with full streaming capabilities

### Feature Discovery Guide

**Essential Features (Start Here)**

- Token streaming with IStreamingService
- Basic WebSocket integration
- Simple streaming decorators (@StreamToken)
- Event stream processing

**Productivity Features (Next Step)**

- Enhanced agent architecture with workflow agents
- Advanced stream management and buffering
- Integration with memory and checkpoint modules
- Production configuration patterns

**Advanced Features (Power Users)**

- Custom streaming decorators
- Enterprise compliance and stream validation
- Advanced error recovery mechanisms
- Multi-stream coordination

**Enterprise Features (Production)**

- High-availability streaming infrastructure
- Advanced security and audit logging
- Performance monitoring and optimization
- Scalable WebSocket connection management

### Next Steps & Related Modules

**Recommended Learning Path:**

1. Master core streaming concepts and token processing
2. Explore integration with Workflow Engine for complete orchestration
3. Add Memory module for context-aware streaming
4. Consider Multi-Agent module for coordinated streaming

**Common Integration Patterns:**

- **Streaming + Core**: Real-time state updates and event-driven workflows
- **Streaming + Memory**: Context-aware streaming with memory retrieval
- **Streaming + Multi-Agent**: Coordinated streaming across multiple agents

## V. Reference & Troubleshooting

### Complete Interface Reference

```typescript
// Comprehensive interface documentation
interface IStreamingService {
  streamTokens(options: TokenStreamOptions): AsyncIterable<StreamUpdate>;
  createStream(streamId: string, metadata?: StreamMetadata): Promise<void>;
  closeStream(streamId: string): Promise<void>;
  getActiveStreams(): Promise<string[]>;
}

interface TokenStreamOptions {
  streamId: string;
  source?: string;
  model?: string;
  bufferSize?: number;
  flushInterval?: number;
}

interface StreamingModuleConfig {
  enabled: boolean;
  websocket: WebSocketConfig;
  tokenStreaming: TokenStreamingConfig;
  eventProcessing?: EventProcessingConfig;
  performance?: PerformanceConfig;
}

// Enhanced agent architecture interfaces
interface StreamingAgentConfig extends AgentConfig {
  workflowConfig?: {
    enableTokenStreaming: boolean;
    enableEventStreaming: boolean;
    enableWebSocketBridge: boolean;
    enableStepProgress: boolean;
  };
}
```

### Testing Examples

```typescript
describe('StreamingService', () => {
  let service: IStreamingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        StreamingModule.forRoot({
          // Test configuration
          websocket: { port: 3002 },
          tokenStreaming: { bufferSize: 10 },
        }),
      ],
    }).compile();

    service = module.get<IStreamingService>(IStreamingService);
  });

  describe('basic functionality', () => {
    it('should handle basic token streaming', async () => {
      // Test basic functionality
      const stream = service.streamTokens({
        streamId: 'test-stream',
        source: 'test-model',
      });

      const tokens = [];
      for await (const update of stream) {
        tokens.push(update.token);
        if (tokens.length >= 3) break;
      }

      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('enhanced agent integration', () => {
    it('should support workflow agents', async () => {
      // Test workflow agent integration
      const agent = new WorkflowStreamingAgent();
      const result = await agent.initialize({
        // Test context
      });

      expect(result.status).toBe('initialized');
    });
  });
});
```

### Common Issues & Solutions

#### Issue 1: WebSocket Connection Issues

```typescript
// Problem: WebSocket connections failing or disconnecting
// Solution: Configure proper CORS and connection settings
StreamingModule.forRoot({
  websocket: {
    port: 3001,
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingInterval: 30000,
    pingTimeout: 60000,
  },
});
```

#### Issue 2: Token Streaming Performance Issues

```typescript
// Problem: Slow token streaming or buffering issues
// Solution: Optimize buffer size and flush intervals
StreamingModule.forRoot({
  tokenStreaming: {
    bufferSize: 50, // Smaller buffer for faster response
    flushInterval: 25, // More frequent flushes
    enableCompression: true,
  },
});
```

#### Issue 3: Integration Issues with Core Module

```typescript
// Problem: Streaming module not receiving proper state updates
// Solution: Ensure proper module import order and state integration
@Module({
  imports: [
    CoreModule.forRoot({
      /* config */
    }), // Import core first
    StreamingModule.forRoot({
      /* config */
    }), // Then streaming
  ],
})
export class CorrectStreamingIntegration {}
```

### Environment Variables Reference

```bash
# Essential configuration
STREAMING_WEBSOCKET_ENABLED=true
STREAMING_WS_PORT=3001

# Performance tuning
STREAMING_BUFFER_SIZE=100
STREAMING_FLUSH_INTERVAL=50
STREAMING_MAX_CONNECTIONS=1000

# Error handling
STREAMING_ERROR_RECOVERY=true
STREAMING_MAX_RETRIES=3
STREAMING_BACKOFF=exponential

# Enhanced agent defaults
STREAMING_ENABLE_TOKEN_STREAMING=true
STREAMING_ENABLE_EVENT_STREAMING=true
```
