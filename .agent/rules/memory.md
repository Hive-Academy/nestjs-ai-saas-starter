---
trigger: always_on
---

# @hive-academy/langgraph-memory

## Overview

Provides persistent memory storage for LangGraph workflows using ChromaDB as the backing store.

---

## Module Setup

```typescript
@Module({
  imports: [
    MemoryModule.forRoot({
      chromadb: { url: process.env.CHROMADB_URL },
      threadRegistry: { type: 'chromadb' },
    }),
  ],
})
export class AppModule {}
```

---

## Using Store in Workflows

### Injection

```typescript
import { Inject } from '@nestjs/common';
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';

@Injectable()
export class MyWorkflow {
  constructor(@Inject(BASE_STORE_TOKEN) private store: BaseStore) {}
}
```

### Access in Nodes

```typescript
import { RunnableConfigStoreHelpers } from '@hive-academy/langgraph-memory';

async function myNode(state: State, config: RunnableConfig) {
  const store = RunnableConfigStoreHelpers.getStore(config);

  if (store) {
    // Store data
    await store.put(['memories', userId], 'key', { value: 'data' });

    // Retrieve data
    const item = await store.get(['memories', userId], 'key');
  }
}
```

---

## Best Practices

1. Use `BASE_STORE_TOKEN` for DI injection
2. Access store via `RunnableConfigStoreHelpers.getStore(config)`
3. Use namespaced keys: `['namespace', userId]`
