# LangGraph Checkpoint Providers

This directory contains providers that integrate official LangGraph checkpoint packages with NestJS dependency injection.

## LangGraphCheckpointProvider

The `LangGraphCheckpointProvider` integrates official LangGraph checkpoint packages:

- `@langchain/langgraph-checkpoint` - Base checkpoint interfaces
- `@langchain/langgraph-checkpoint-sqlite` - SQLite checkpoint saver
- `@langchain/langgraph-checkpoint-redis` - Redis checkpoint saver (dynamic import)
- `@langchain/langgraph-checkpoint-postgres` - PostgreSQL checkpoint saver (dynamic import)

### Key Features

1. **Official LangGraph Integration**: Uses the official checkpoint packages instead of custom implementations
2. **Dynamic Imports**: Redis and PostgreSQL packages are loaded dynamically to avoid hard dependencies
3. **NestJS Integration**: Proper dependency injection and logging
4. **Fallback Strategy**: Falls back to SQLite in-memory mode if other savers fail
5. **Error Handling**: Comprehensive error handling with proper logging

### Usage

```typescript
import { LangGraphCheckpointProvider } from '@langgraph-modules/checkpoint';

@Injectable()
export class MyService {
  constructor(
    @Inject('ILangGraphCheckpointProvider') 
    private langGraphProvider: LangGraphCheckpointProvider
  ) {}

  async createCheckpointer() {
    const config = {
      enabled: true,
      storage: 'redis' as const,
      storageConfig: {
        url: 'redis://localhost:6379',
        keyPrefix: 'checkpoints:'
      }
    };

    return await this.langGraphProvider.create(config);
  }
}
```

### Difference from Custom Savers

The custom checkpoint savers in `../core/checkpoint-savers/` provide additional enterprise features like:
- Enhanced metrics and monitoring
- Custom compression strategies
- Advanced health checking
- Custom retry logic

The `LangGraphCheckpointProvider` focuses on providing a clean integration with official LangGraph packages, ensuring compatibility and following LangGraph patterns exactly.

### When to Use Which

**Use LangGraphCheckpointProvider when:**
- You want official LangGraph compatibility
- You're migrating from pure LangGraph to NestJS
- You need guaranteed LangGraph package compatibility
- You want minimal custom logic

**Use Custom Checkpoint Savers when:**
- You need enterprise monitoring features
- You want custom compression or optimization
- You need specific health checking logic
- You want full control over the implementation

### Configuration

The provider accepts the same `CheckpointConfig` interface but uses official LangGraph packages internally:

```typescript
const config: CheckpointConfig = {
  enabled: true,
  storage: 'postgres',
  storageConfig: {
    connectionString: 'postgresql://user:pass@localhost:5432/db',
    pool: { max: 10, min: 2 }
  }
};
```

### Installation Requirements

Make sure to install the required LangGraph packages:

```bash
npm install @langchain/langgraph-checkpoint @langchain/langgraph-checkpoint-sqlite

# Optional for Redis support
npm install @langchain/langgraph-checkpoint-redis

# Optional for PostgreSQL support  
npm install @langchain/langgraph-checkpoint-postgres
```

The provider will gracefully handle missing optional packages and fall back to SQLite.