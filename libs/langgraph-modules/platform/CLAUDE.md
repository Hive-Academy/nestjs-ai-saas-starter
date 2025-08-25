# CLAUDE.md - LangGraph Platform Module

This file provides guidance to Claude Code when working with the LangGraph Platform module, which provides NestJS integration for the LangGraph Platform API.

## Business Domain

### Core Purpose
The LangGraph Platform module provides a comprehensive NestJS wrapper for interacting with the LangGraph Platform API, enabling:

- **Hosted Assistant Management**: Create, configure, and manage AI assistants running on LangGraph Platform
- **Thread Lifecycle Management**: Handle conversation threads with persistent state and history
- **Run Execution & Monitoring**: Execute assistant runs with real-time streaming and status tracking
- **Webhook Integration**: Receive real-time notifications for platform events
- **State Management**: Manage thread state, checkpoints, and conversation history

### Key Business Concepts
- **Assistant**: A configured AI agent with specific graph, settings, and metadata
- **Thread**: A conversation context with persistent state and history
- **Run**: An execution of an assistant within a thread context
- **Webhook**: Real-time event notifications for platform activities
- **Checkpoint**: State snapshots for thread history and rollback capabilities

## High-Level Architecture

### Module Structure
```
platform/
├── src/lib/
│   ├── platform.module.ts           # Main NestJS module
│   ├── constants/
│   │   └── platform.constants.ts    # Configuration constants
│   ├── interfaces/                  # TypeScript interfaces
│   │   ├── platform.interface.ts    # Core module interfaces
│   │   ├── assistant.interface.ts   # Assistant domain types
│   │   ├── thread.interface.ts      # Thread domain types
│   │   ├── run.interface.ts         # Run execution types
│   │   └── webhook.interface.ts     # Webhook event types
│   └── services/                    # Business logic services
│       ├── platform-client.service.ts  # HTTP API client
│       ├── assistant.service.ts        # Assistant management
│       ├── thread.service.ts           # Thread operations
│       ├── run.service.ts              # Run execution
│       └── webhook.service.ts          # Webhook management
```

### Service Architecture
- **PlatformClientService**: Base HTTP client with authentication, error handling, and retry logic
- **AssistantService**: High-level operations for assistant lifecycle management
- **ThreadService**: Thread creation, state management, and history operations
- **RunService**: Run execution, streaming, and monitoring
- **WebhookService**: Webhook registration and management

## Platform Integration Patterns

### Assistant Lifecycle Management
```typescript
// Create assistant with graph configuration
const assistant = await assistantService.create({
  graph_id: 'my-workflow-graph',
  name: 'Customer Support Agent',
  config: {
    configurable: {
      model: 'gpt-4',
      temperature: 0.1
    },
    recursion_limit: 50,
    tags: ['customer-support', 'production']
  },
  metadata: {
    created_by: 'admin',
    version: '1.0.0',
    description: 'AI assistant for customer support workflows'
  }
});

// Update assistant configuration
await assistantService.update(assistant.assistant_id, {
  config: {
    configurable: {
      temperature: 0.2  // Adjust creativity level
    }
  }
});

// Search assistants by graph
const assistants = await assistantService.getByGraphId('customer-support-graph');
```

### Thread State Management
```typescript
// Create thread with metadata
const thread = await threadService.create('user-session-123', {
  metadata: {
    user_id: 'user123',
    session_type: 'support',
    priority: 'high'
  }
});

// Get current thread state
const state = await threadService.getState(thread.thread_id);
console.log('Current values:', state.values);
console.log('Next steps:', state.next);

// Update thread state manually
await threadService.updateState(
  thread.thread_id,
  { user_context: { name: 'John', issue: 'billing' } },
  'input_node'
);

// Get thread history with pagination
const history = await threadService.getHistory(
  thread.thread_id,
  10,  // limit
  undefined,  // before checkpoint
  { user_id: 'user123' }  // metadata filter
);
```

### Run Execution Monitoring
```typescript
// Create and execute run
const run = await runService.create(thread.thread_id, {
  assistant_id: assistant.assistant_id,
  input: { message: 'Help me with my billing issue' },
  config: {
    tags: ['support-ticket'],
    metadata: { priority: 'high' }
  },
  interrupt_before: ['human_approval'],
  webhook: 'https://myapp.com/webhooks/langgraph'
});

// Stream run execution with real-time updates
const stream$ = runService.stream(thread.thread_id, {
  assistant_id: assistant.assistant_id,
  input: { message: 'Process this request' }
}, 'values');

stream$.subscribe({
  next: (event) => {
    console.log('Stream event:', event.event, event.data);
  },
  error: (error) => {
    console.error('Stream error:', error);
  },
  complete: () => {
    console.log('Run completed');
  }
});

// Wait for run completion with timeout
const completedRun = await runService.waitForCompletion(
  thread.thread_id,
  run.run_id,
  300000,  // 5 minute timeout
  1000     // 1 second poll interval
);
```

### Webhook Event Processing
```typescript
// Register webhook for run events
const webhook = await webhookService.create({
  url: 'https://myapp.com/webhooks/langgraph',
  events: [
    WebhookEvent.RUN_START,
    WebhookEvent.RUN_END,
    WebhookEvent.RUN_ERROR,
    WebhookEvent.RUN_INTERRUPT
  ],
  secret: process.env.WEBHOOK_SECRET
});

// Webhook payload handler
@Controller('webhooks')
export class WebhookController {
  @Post('langgraph')
  async handleWebhook(@Body() payload: WebhookPayload) {
    switch (payload.event) {
      case WebhookEvent.RUN_START:
        await this.onRunStart(payload.data);
        break;
      case WebhookEvent.RUN_END:
        await this.onRunComplete(payload.data);
        break;
      case WebhookEvent.RUN_ERROR:
        await this.onRunError(payload.data);
        break;
      case WebhookEvent.RUN_INTERRUPT:
        await this.onRunInterrupt(payload.data);
        break;
    }
  }
}
```

## Best Practices for Platform Integration

### 1. Configuration Management
```typescript
// Environment-based configuration
PlatformModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    baseUrl: configService.get('LANGGRAPH_PLATFORM_URL'),
    apiKey: configService.get('LANGGRAPH_API_KEY'),
    timeout: configService.get('PLATFORM_TIMEOUT', 30000),
    retryPolicy: {
      maxRetries: 3,
      backoffFactor: 2,
      maxBackoffTime: 30000
    },
    webhook: {
      enabled: configService.get('WEBHOOKS_ENABLED', true),
      secret: configService.get('WEBHOOK_SECRET'),
      retryPolicy: {
        maxRetries: 3,
        backoffFactor: 2,
        maxBackoffTime: 30000
      }
    }
  }),
  inject: [ConfigService]
})
```

### 2. Error Handling Patterns
```typescript
@Injectable()
export class SafeAssistantService {
  constructor(private assistantService: AssistantService) {}

  async safeExecute<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (error.message.includes('404')) {
        this.logger.warn('Resource not found');
        return null;
      }
      if (error.message.includes('429')) {
        this.logger.warn('Rate limited, implementing backoff');
        await this.backoff();
        return this.safeExecute(operation);
      }
      throw error;
    }
  }

  private async backoff(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 3. State Synchronization
```typescript
@Injectable()
export class StateSyncService {
  async syncThreadState(threadId: string, localState: any): Promise<void> {
    const platformState = await this.threadService.getState(threadId);
    
    // Compare states and update if needed
    if (!this.statesEqual(platformState.values, localState)) {
      await this.threadService.updateState(
        threadId,
        { ...platformState.values, ...localState }
      );
    }
  }

  private statesEqual(state1: any, state2: any): boolean {
    return JSON.stringify(state1) === JSON.stringify(state2);
  }
}
```

## Performance Considerations

### API Rate Limiting
```typescript
@Injectable()
export class RateLimitedPlatformService {
  private readonly rateLimiter = new Map<string, number>();
  private readonly RATE_LIMIT = 100; // requests per minute
  private readonly WINDOW_SIZE = 60000; // 1 minute

  async executeWithRateLimit<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE;
    
    // Clean old entries
    for (const [k, timestamp] of this.rateLimiter.entries()) {
      if (timestamp < windowStart) {
        this.rateLimiter.delete(k);
      }
    }

    // Check rate limit
    const requests = Array.from(this.rateLimiter.values())
      .filter(timestamp => timestamp > windowStart).length;

    if (requests >= this.RATE_LIMIT) {
      throw new Error('Rate limit exceeded');
    }

    this.rateLimiter.set(`${key}-${now}`, now);
    return operation();
  }
}
```

### Caching Strategies
```typescript
@Injectable()
export class CachedAssistantService {
  private readonly cache = new Map<string, { data: Assistant; expiry: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  async getCached(assistantId: string): Promise<Assistant> {
    const cached = this.cache.get(assistantId);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const assistant = await this.assistantService.get(assistantId);
    this.cache.set(assistantId, {
      data: assistant,
      expiry: Date.now() + this.CACHE_TTL
    });

    return assistant;
  }

  invalidateCache(assistantId: string): void {
    this.cache.delete(assistantId);
  }
}
```

## Common Use Cases

### 1. Hosted Assistant Deployment
```typescript
@Injectable()
export class AssistantDeploymentService {
  async deployAssistant(config: AssistantDeploymentConfig): Promise<Assistant> {
    // Create assistant with production configuration
    const assistant = await this.assistantService.create({
      graph_id: config.graphId,
      name: config.name,
      config: {
        configurable: config.variables,
        recursion_limit: config.maxSteps || 100,
        tags: ['production', ...config.tags]
      },
      metadata: {
        deployed_by: config.deployedBy,
        environment: 'production',
        version: config.version
      }
    });

    // Set up webhooks for monitoring
    await this.webhookService.create({
      url: config.webhookUrl,
      events: [
        WebhookEvent.RUN_START,
        WebhookEvent.RUN_END,
        WebhookEvent.RUN_ERROR
      ],
      secret: config.webhookSecret
    });

    return assistant;
  }
}
```

### 2. Multi-Turn Conversation Management
```typescript
@Injectable()
export class ConversationService {
  async startConversation(userId: string, assistantId: string): Promise<string> {
    const thread = await this.threadService.create(undefined, {
      metadata: {
        user_id: userId,
        conversation_type: 'support',
        started_at: new Date().toISOString()
      }
    });

    return thread.thread_id;
  }

  async sendMessage(
    threadId: string,
    assistantId: string,
    message: string
  ): Promise<Observable<StreamEvent>> {
    return this.runService.stream(threadId, {
      assistant_id: assistantId,
      input: { message },
      config: {
        tags: ['user-message'],
        metadata: { timestamp: new Date().toISOString() }
      }
    });
  }

  async getConversationHistory(threadId: string): Promise<any[]> {
    const history = await this.threadService.getHistory(threadId, 50);
    return history.states.map(state => ({
      timestamp: state.created_at,
      step: state.metadata.step,
      values: state.values
    }));
  }
}
```

### 3. Workflow Integration Patterns
```typescript
@Injectable()
export class WorkflowIntegrationService {
  async executeWorkflowStep(
    workflowId: string,
    stepData: any,
    context: any
  ): Promise<any> {
    // Get or create thread for workflow
    const threadId = `workflow-${workflowId}`;
    let thread: Thread;
    
    try {
      thread = await this.threadService.get(threadId);
    } catch {
      thread = await this.threadService.create(threadId, {
        metadata: {
          workflow_id: workflowId,
          type: 'workflow-execution'
        }
      });
    }

    // Execute step with context
    const run = await this.runService.create(thread.thread_id, {
      assistant_id: context.assistantId,
      input: stepData,
      config: {
        configurable: context.variables,
        metadata: {
          workflow_step: context.stepName,
          step_index: context.stepIndex
        }
      }
    });

    // Wait for completion and return result
    const completedRun = await this.runService.waitForCompletion(
      thread.thread_id,
      run.run_id
    );

    // Get final state
    const finalState = await this.threadService.getState(thread.thread_id);
    return finalState.values;
  }
}
```

## Authentication and Security

### API Key Management
```typescript
// Secure API key configuration
export class PlatformConfigService {
  static getSecureConfig(): PlatformModuleOptions {
    const apiKey = process.env.LANGGRAPH_API_KEY;
    if (!apiKey) {
      throw new Error('LANGGRAPH_API_KEY environment variable is required');
    }

    return {
      baseUrl: process.env.LANGGRAPH_PLATFORM_URL || 'https://api.langgraph.com',
      apiKey,
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffFactor: 2,
        maxBackoffTime: 30000
      }
    };
  }
}
```

### Webhook Security
```typescript
@Injectable()
export class SecureWebhookService {
  private readonly crypto = require('crypto');

  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return this.crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  @Post('webhook')
  async handleSecureWebhook(
    @Body() payload: any,
    @Headers('x-langgraph-signature') signature: string
  ) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!this.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
      secret
    )) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process verified webhook
    await this.processWebhook(payload);
  }
}
```

## Environment Variables

### Required Configuration
```bash
# LangGraph Platform API
LANGGRAPH_PLATFORM_URL=https://api.langgraph.com
LANGGRAPH_API_KEY=your_api_key_here

# Optional Configuration
PLATFORM_TIMEOUT=30000
WEBHOOKS_ENABLED=true
WEBHOOK_SECRET=your_webhook_secret_here

# Rate Limiting
PLATFORM_RATE_LIMIT=100
PLATFORM_RATE_WINDOW=60000
```

## Module Integration Examples

### Basic Setup
```typescript
@Module({
  imports: [
    PlatformModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        baseUrl: config.get('LANGGRAPH_PLATFORM_URL'),
        apiKey: config.get('LANGGRAPH_API_KEY'),
        timeout: config.get('PLATFORM_TIMEOUT', 30000)
      }),
      inject: [ConfigService]
    })
  ],
  providers: [MyPlatformService],
  controllers: [PlatformController]
})
export class AppModule {}
```

### Advanced Integration
```typescript
@Injectable()
export class EnterpriseAssistantService {
  constructor(
    private assistantService: AssistantService,
    private threadService: ThreadService,
    private runService: RunService,
    private webhookService: WebhookService
  ) {}

  async createEnterpriseAssistant(config: EnterpriseConfig): Promise<Assistant> {
    // Implementation with full platform integration
    const assistant = await this.assistantService.create({
      graph_id: config.graphId,
      name: config.name,
      config: {
        configurable: config.enterpriseSettings,
        recursion_limit: config.maxComplexity,
        tags: ['enterprise', 'production']
      }
    });

    // Set up monitoring and webhooks
    await this.setupEnterpriseMonitoring(assistant.assistant_id);
    
    return assistant;
  }
}