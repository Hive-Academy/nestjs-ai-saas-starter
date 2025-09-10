# Functional API Checkpoint Migration

This document describes the migration to the new optional checkpoint DI pattern.

## Changes Made

### 1. Updated Module Options

- Added `checkpointAdapter?: ICheckpointAdapter` to `FunctionalApiModuleOptions`
- Import from `@hive-academy/langgraph-core`

### 2. Updated Module Configuration

- Removed direct dependency on `@hive-academy/langgraph-checkpoint`
- Added checkpoint adapter provider using DI token
- Uses `NoOpCheckpointAdapter` when no adapter is provided

### 3. Updated Service Implementation

- Replaced `CheckpointManagerService` injection with `@Inject(CHECKPOINT_ADAPTER_TOKEN)`
- Updated checkpoint method calls to use minimal `ICheckpointAdapter` interface
- Uses `BaseCheckpoint`, `BaseCheckpointMetadata`, and `BaseCheckpointTuple` types

## Usage Examples

### Without Checkpoint (Default)

```typescript
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';

@Module({
  imports: [
    FunctionalApiModule.forRoot({
      defaultTimeout: 30000,
      enableStreaming: true,
      // No checkpointAdapter - uses NoOpCheckpointAdapter
    }),
  ],
})
export class AppModule {}
```

### With Checkpoint Adapter

```typescript
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { CheckpointManagerAdapter } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    FunctionalApiModule.forRoot({
      defaultTimeout: 30000,
      enableStreaming: true,
      checkpointAdapter: new CheckpointManagerAdapter({
        // checkpoint configuration
      }),
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { CheckpointManagerAdapter } from '@hive-academy/langgraph-checkpoint';

@Module({
  imports: [
    FunctionalApiModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        defaultTimeout: configService.get('WORKFLOW_TIMEOUT'),
        checkpointAdapter: configService.get('ENABLE_CHECKPOINTS')
          ? new CheckpointManagerAdapter({
              // checkpoint configuration from config service
            })
          : undefined,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Breaking Changes

None - this is a backward-compatible change. Existing code without checkpoint configuration will continue to work with checkpointing disabled.

## Benefits

1. **Optional Dependency**: No longer requires checkpoint library when not needed
2. **Clean Architecture**: Follows dependency inversion principle
3. **Type Safety**: Uses minimal interfaces from core library
4. **Zero Breaking Changes**: Existing code continues to work
5. **Future Proof**: Can easily support different checkpoint implementations

## Technical Details

The migration implements the same pattern used in the multi-agent library:

- Core abstractions in `@hive-academy/langgraph-core`
- Dependency injection using `CHECKPOINT_ADAPTER_TOKEN`
- No-op implementation when checkpointing is disabled
- Minimal interface to avoid tight coupling
