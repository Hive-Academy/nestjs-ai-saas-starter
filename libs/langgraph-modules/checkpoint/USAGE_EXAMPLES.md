# Checkpoint Module Usage Examples

This document shows how to use the checkpoint module with your own checkpoint saver implementations.

## Overview

The checkpoint module no longer provides built-in checkpoint implementations. Instead, you bring your own checkpoint savers from the official LangGraph packages and register them with our module.

## Basic Setup

### 1. Install LangGraph Checkpoint Packages

Choose the checkpoint packages you need:

```bash
# Core package (includes MemorySaver)
npm install @langchain/langgraph-checkpoint

# Optional: SQLite support
npm install @langchain/langgraph-checkpoint-sqlite

# Optional: Redis support
npm install @langchain/langgraph-checkpoint-redis

# Optional: PostgreSQL support
npm install @langchain/langgraph-checkpoint-postgres
```

### 2. Create Your Checkpoint Savers

```typescript
// checkpoint-config.ts
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { CheckpointSaverConfig } from '@hive-academy/langgraph-checkpoint';

export async function createCheckpointSavers(
  // Configuration parameters - these should come from your app's config service
  options: {
    nodeEnv?: string;
    sqliteEnabled?: boolean;
    sqlitePath?: string;
    redisEnabled?: boolean;
    redisUrl?: string;
    redisKeyPrefix?: string;
    defaultStorage?: string;
  } = {}
): Promise<CheckpointSaverConfig[]> {
  const savers: CheckpointSaverConfig[] = [];
  const {
    nodeEnv = 'production',
    sqliteEnabled = false,
    sqlitePath = './data/checkpoints.db',
    redisEnabled = false,
    redisUrl,
    redisKeyPrefix = 'checkpoints:',
    defaultStorage = 'memory',
  } = options;

  // Memory saver (always available)
  savers.push({
    name: 'memory',
    saver: new MemorySaver(),
    default: nodeEnv === 'development' || defaultStorage === 'memory',
    metadata: {
      type: 'memory',
      description: 'In-memory checkpoint storage',
      persistent: false,
      supportsStreaming: true,
    },
  });

  // SQLite saver (for development/testing)
  if (sqliteEnabled) {
    const sqliteSaver = SqliteSaver.fromConnString(sqlitePath);
    await sqliteSaver.setup(); // Initialize database

    savers.push({
      name: 'sqlite',
      saver: sqliteSaver,
      default: defaultStorage === 'sqlite',
      metadata: {
        type: 'sqlite',
        description: 'SQLite-based checkpoint storage',
        persistent: true,
        supportsStreaming: true,
        supportsTransactions: true,
      },
    });
  }

  // Redis saver (for production)
  if (redisEnabled && redisUrl) {
    const redisSaver = new RedisSaver({
      url: redisUrl,
      keyPrefix: redisKeyPrefix,
      ttl: 86400, // 24 hours
    });

    savers.push({
      name: 'redis',
      saver: redisSaver,
      default: defaultStorage === 'redis',
      metadata: {
        type: 'redis',
        description: 'Redis-based checkpoint storage',
        persistent: true,
        supportsStreaming: true,
        requiresCleanup: true,
      },
    });
  }

  return savers;
}
```

### 3. Configure Your Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { LanggraphModulesCheckpointModule } from '@hive-academy/langgraph-checkpoint';
import { createCheckpointSavers } from './checkpoint-config';

@Module({
  imports: [
    LanggraphModulesCheckpointModule.forRootAsync({
      useFactory: async () => {
        const savers = await createCheckpointSavers();

        return {
          savers,
          cleanup: {
            enabled: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxPerThread: 100,
            interval: 60 * 60 * 1000, // 1 hour
          },
          health: {
            enabled: true,
            checkInterval: 30 * 1000, // 30 seconds
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

## Advanced Usage Examples

### Multiple Environment Configuration

```typescript
// checkpoint-factory.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

@Injectable()
export class CheckpointFactory {
  constructor(private configService: ConfigService) {}

  async createSavers() {
    const environment = this.configService.get('NODE_ENV');

    switch (environment) {
      case 'development':
        return this.createDevelopmentSavers();
      case 'test':
        return this.createTestSavers();
      case 'production':
        return this.createProductionSavers();
      default:
        return this.createDefaultSavers();
    }
  }

  private async createDevelopmentSavers() {
    const sqliteSaver = SqliteSaver.fromConnString('./dev-checkpoints.db');
    await sqliteSaver.setup();

    return [
      {
        name: 'sqlite',
        saver: sqliteSaver,
        default: true,
        metadata: { type: 'sqlite', persistent: true },
      },
      {
        name: 'memory',
        saver: new MemorySaver(),
        metadata: { type: 'memory', persistent: false },
      },
    ];
  }

  private createTestSavers() {
    return [
      {
        name: 'memory',
        saver: new MemorySaver(),
        default: true,
        metadata: { type: 'memory', persistent: false },
      },
    ];
  }

  private async createProductionSavers() {
    const primaryDb = new PostgresSaver({
      connectionString: this.configService.get('DATABASE_URL'),
    });
    await primaryDb.setup();

    const backupDb = new PostgresSaver({
      connectionString: this.configService.get('BACKUP_DATABASE_URL'),
    });
    await backupDb.setup();

    return [
      {
        name: 'primary',
        saver: primaryDb,
        default: true,
        metadata: {
          type: 'postgres',
          persistent: true,
          supportsTransactions: true,
        },
      },
      {
        name: 'backup',
        saver: backupDb,
        metadata: {
          type: 'postgres',
          persistent: true,
          supportsTransactions: true,
        },
      },
    ];
  }

  private createDefaultSavers() {
    return [
      {
        name: 'memory',
        saver: new MemorySaver(),
        default: true,
        metadata: { type: 'memory', persistent: false },
      },
    ];
  }
}
```

### Custom Checkpoint Saver

You can also create your own checkpoint saver by extending BaseCheckpointSaver:

```typescript
// custom-checkpoint.saver.ts
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

export class CustomCheckpointSaver extends BaseCheckpointSaver {
  // Implement your custom checkpoint logic
  async put(config, checkpoint, metadata, newVersions) {
    // Your implementation
  }

  async get(config) {
    // Your implementation
  }

  async list(config, options) {
    // Your implementation
  }

  // Add other required methods...
}

// Usage
const customSaver = new CustomCheckpointSaver(/* your config */);

const saverConfig = {
  name: 'custom',
  saver: customSaver,
  default: true,
  metadata: {
    type: 'custom',
    description: 'My custom checkpoint implementation',
    persistent: true,
  },
};
```

## Using the Service

```typescript
// workflow.service.ts
import { Injectable } from '@nestjs/common';
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';

@Injectable()
export class WorkflowService {
  constructor(private readonly checkpointManager: CheckpointManagerService) {}

  async saveWorkflowState(threadId: string, state: any) {
    const checkpoint = {
      id: `checkpoint-${Date.now()}`,
      channel_values: state,
      v: 1,
      ts: new Date().toISOString(),
    };

    // Uses default saver
    await this.checkpointManager.saveCheckpoint(threadId, checkpoint);
  }

  async saveToSpecificSaver(threadId: string, state: any, saverName: string) {
    const checkpoint = {
      id: `checkpoint-${Date.now()}`,
      channel_values: state,
      v: 1,
      ts: new Date().toISOString(),
    };

    // Uses specific saver
    await this.checkpointManager.saveCheckpoint(threadId, checkpoint, undefined, saverName);
  }

  async getAvailableSavers() {
    return this.checkpointManager.getAvailableSavers();
  }
}
```

## Benefits of This Approach

1. **No Dependencies**: Our library doesn't bundle checkpoint implementations
2. **User Control**: You choose exactly which checkpoint packages to install
3. **Flexibility**: Easy to switch between different storage backends
4. **Testing**: Can use different savers for different environments
5. **Custom Implementations**: Easy to provide your own checkpoint logic
6. **Multiple Savers**: Can register multiple savers and choose between them

## Migration from Old Pattern

If you were using the old pattern with type-based configuration, update your code:

```typescript
// OLD - Don't do this anymore
{
  checkpoint: {
    storage: 'redis',
    storageConfig: { url: 'redis://localhost:6379' }
  }
}

// NEW - Do this instead
{
  savers: [
    {
      name: 'redis',
      saver: new RedisSaver({ url: 'redis://localhost:6379' }),
      default: true,
    }
  ]
}
```
