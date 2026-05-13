# @hive-academy/langgraph-memory

## Overview

Provides persistent memory storage for LangGraph workflows using ChromaDB as the backing store. Implements LangGraph's `BaseStore` interface for seamless integration.

**Key Features:**

- Persistent memory across workflow executions
- Thread-based conversation tracking
- ChromaDB-backed storage
- NestJS DI integration

---

## Module Setup

### Basic Configuration

```typescript
import { MemoryModule } from '@hive-academy/langgraph-memory';

@Module({
  imports: [
    MemoryModule.forRoot({
      chromadb: {
        url: process.env.CHROMADB_URL || 'http://localhost:8000',
      },
      threadRegistry: {
        type: 'chromadb', // or 'redis', 'postgres'
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
MemoryModule.forRootAsync({
  useFactory: (chromaDBService: ChromaDBService) => ({
    chromadb: { url: process.env.CHROMADB_URL },
    threadRegistry: { type: 'chromadb' },
    storeOptions: {
      embeddingFunction: chromaDBService.getEmbeddingFunction(),
    },
  }),
  inject: [ChromaDBService],
});
```

---

## Using Store in Workflows

### Injection

Inject the store using the `BASE_STORE_TOKEN`:

```typescript
import { Inject } from '@nestjs/common';
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';
import type { BaseStore } from '@langchain/langgraph';

@Injectable()
export class MyWorkflow {
  constructor(@Inject(BASE_STORE_TOKEN) private store: BaseStore) {}
}
```

### Access in Workflow Nodes

Use `RunnableConfigStoreHelpers` to access the store within nodes:

```typescript
import { RunnableConfigStoreHelpers } from '@hive-academy/langgraph-memory';
import type { RunnableConfig } from '@langchain/core/runnables';

@Node()
async myNode(state: WorkflowState, config: RunnableConfig) {
  const store = RunnableConfigStoreHelpers.getStore(config);

  if (store) {
    // Store conversation context
    await store.put(
      ['memories', state.userId],
      'current-conversation',
      {
        messages: state.messages,
        timestamp: new Date().toISOString(),
      }
    );

    // Retrieve previous context
    const previousContext = await store.get(
      ['memories', state.userId],
      'current-conversation'
    );
  }

  return { ...state };
}
```

---

## Store API

### put(namespace, key, value)

Store data with hierarchical namespace:

```typescript
await store.put(
  ['memories', userId],  // Namespace (array of strings)
  'conversation-123',     // Key
  {                       // Value (any JSON-serializable data)
    messages: [...],
    metadata: {...}
  }
);
```

### get(namespace, key)

Retrieve stored data:

```typescript
const data = await store.get(['memories', userId], 'conversation-123');

console.log(data.messages);
```

### search(namespace, query?)

Search within a namespace:

```typescript
const results = await store.search(['memories', userId], { limit: 10 });

for (const item of results) {
  console.log(item.key, item.value);
}
```

### delete(namespace, key)

Remove stored data:

```typescript
await store.delete(['memories', userId], 'conversation-123');
```

---

## Common Patterns

### Conversation History

```typescript
@Node()
async processMessage(state: ChatState, config: RunnableConfig) {
  const store = RunnableConfigStoreHelpers.getStore(config);

  // Get conversation history
  const history = await store.get(
    ['conversations', state.userId],
    state.conversationId
  ) || { messages: [] };

  // Add new message
  history.messages.push({
    role: 'user',
    content: state.userMessage,
    timestamp: new Date().toISOString(),
  });

  // Process with LLM
  const response = await this.llm.invoke(history.messages);

  // Store updated history
  history.messages.push({
    role: 'assistant',
    content: response.content,
    timestamp: new Date().toISOString(),
  });

  await store.put(
    ['conversations', state.userId],
    state.conversationId,
    history
  );

  return { ...state, response: response.content };
}
```

### User Preferences

```typescript
// Store preferences
await store.put(['preferences', userId], 'settings', {
  theme: 'dark',
  language: 'en',
  notifications: true,
});

// Retrieve preferences
const prefs = await store.get(['preferences', userId], 'settings');
```

### Session Data

```typescript
// Store session
await store.put(
  ['sessions', sessionId],
  'data',
  {
    userId,
    startedAt: new Date().toISOString(),
    metadata: {...},
  }
);
```

---

## Best Practices

### 1. Use Hierarchical Namespaces

```typescript
// ✅ CORRECT: Organized namespaces
await store.put(['memories', userId, 'conversations'], conversationId, data);
await store.put(['preferences', userId], 'theme', 'dark');

// ❌ WRONG: Flat namespaces
await store.put([userId], `memory_${conversationId}`, data);
```

### 2. Check Store Availability

```typescript
const store = RunnableConfigStoreHelpers.getStore(config);
if (store) {
  // Use store
} else {
  // Fallback behavior
  console.warn('Store not available');
}
```

### 3. Namespace by User/Tenant

```typescript
// ✅ CORRECT: Isolated by user
await store.put(['memories', userId], key, value);

// ❌ WRONG: Shared namespace (potential data leakage)
await store.put(['memories'], key, value);
```

---

## Thread Registry

The thread registry tracks workflow execution threads:

```typescript
import { THREAD_REGISTRY_TOKEN } from '@hive-academy/langgraph-memory';

@Injectable()
export class MyService {
  constructor(@Inject(THREAD_REGISTRY_TOKEN) private threadRegistry: ThreadRegistry) {}

  async getThread(threadId: string) {
    return this.threadRegistry.get(threadId);
  }
}
```

---

## Reference

### Key Exports

```typescript
import {
  // Module
  MemoryModule,

  // Tokens
  BASE_STORE_TOKEN,
  THREAD_REGISTRY_TOKEN,

  // Helpers
  RunnableConfigStoreHelpers,

  // Types (from @langchain/langgraph)
  BaseStore,
} from '@hive-academy/langgraph-memory';
```
