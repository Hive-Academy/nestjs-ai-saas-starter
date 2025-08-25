# Integration Guide: Libraries, Modules, and Applications

## Architecture Overview

This monorepo follows a clear separation of concerns for configuration and integration:

```
┌─────────────────────────────────────────────────────────────┐
│                     Root .env.example                        │
│            (Single source of truth for all env vars)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         .env                                 │
│                  (Actual environment file)                   │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
               ▼                       ▼
┌──────────────────────┐   ┌──────────────────────┐
│   Main Application   │   │   Other Applications  │
│  (reads env & config)│   │  (reads env & config) │
└──────────┬───────────┘   └──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│         Configures Core Services Once           │
│  • ChromaDBModule.forRoot(config)              │
│  • Neo4jModule.forRoot(config)                 │
└──────────┬────────────────┬─────────────────────┘
           │                │
           ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│ Feature Module 1 │  │ Feature Module 2 │
│ (uses services)  │  │ (uses services)  │
└──────────────────┘  └──────────────────┘
```

## Key Principles

### 1. Publishable Libraries Are Environment-Agnostic

Libraries like `@hive-academy/nestjs-chromadb` and `@hive-academy/nestjs-neo4j`:
- **NEVER** read `process.env` directly
- Accept configuration via `forRoot()` or `forRootAsync()`
- Can be published to NPM and used in any project
- Don't know or care about your specific environment variables

### 2. Applications Configure Services

Applications are responsible for:
- Reading environment variables
- Configuring library modules
- Managing the dependency injection container

### 3. Feature Modules Share Services

Feature modules like `SupervisorAgentModule`:
- Import into the main application
- Use existing database connections
- Create their own collections/nodes within shared databases
- Don't duplicate database connections

## Integration Examples

### Example 1: Main Application Setup

```typescript
// apps/demo/src/app/app.module.ts
@Module({
  imports: [
    // Configure databases ONCE
    ChromaDBModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        host: config.get('CHROMADB_HOST'),
        port: config.get('CHROMADB_PORT'),
        // ... configuration
      }),
      inject: [ConfigService],
    }),
    
    Neo4jModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get('NEO4J_URI'),
        username: config.get('NEO4J_USERNAME'),
        // ... configuration
      }),
      inject: [ConfigService],
    }),
    
    // Import feature modules that use these services
    DocumentsModule,
    SupervisorAgentModule,
  ],
})
export class AppModule {}
```

### Example 2: Feature Module Using Shared Services

```typescript
// libs/demo/supervisor-agent/src/lib/supervisor-agent.module.ts
@Module({
  imports: [
    // Configure LangGraph-specific settings
    NestjsLanggraphModule.forRoot({
      memory: {
        enabled: true,
        chromadb: {
          // Just specify collection name, not connection
          collection: 'supervisor_memory',
        },
        neo4j: {
          // Use same database as main app
          database: 'neo4j',
        },
      },
    }),
  ],
})
export class SupervisorAgentModule {}
```

### Example 3: Service Injection

```typescript
// In a service within SupervisorAgentModule
@Injectable()
export class SupervisorMemoryService {
  constructor(
    // These services are already configured by the main app
    @InjectChromaDB() private chromadb: ChromaDBService,
    @InjectNeo4j() private neo4j: Neo4jService,
  ) {}
  
  async storeMemory(content: string) {
    // Uses the 'supervisor_memory' collection
    // within the existing ChromaDB instance
    await this.chromadb.addDocuments('supervisor_memory', {
      documents: [content],
    });
  }
}
```

## Environment Variables

### Shared Database Connections

These are configured once in the main app and used by all modules:

```bash
# Neo4j (Graph Database)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# ChromaDB (Vector Database)
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
CHROMADB_SSL=false
CHROMADB_TENANT=default_tenant
CHROMADB_DATABASE=default_database
```

### Module-Specific Namespaces

Different modules can use different collections/databases within the shared services:

```bash
# Main app document storage
CHROMADB_DEFAULT_COLLECTION=documents

# Supervisor agent memory storage
MEMORY_CHROMADB_COLLECTION=supervisor_memory

# Analytics module storage (example)
ANALYTICS_CHROMADB_COLLECTION=analytics_vectors
```

## Benefits of This Approach

1. **Resource Efficiency**: Single database connections shared across modules
2. **No Conflicts**: Each module uses its own namespace (collections/nodes)
3. **Simplicity**: One `.env` file to manage
4. **Flexibility**: Easy to add new modules that reuse existing services
5. **Production Ready**: Avoids connection pool exhaustion
6. **Clear Boundaries**: Libraries stay publishable and reusable

## Common Pitfalls to Avoid

### ❌ Don't: Create Multiple Database Connections

```typescript
// BAD: Each module creates its own connection
@Module({
  imports: [
    ChromaDBModule.forRoot({ /* connection config */ }),
  ],
})
export class ModuleA {}

@Module({
  imports: [
    ChromaDBModule.forRoot({ /* same connection config */ }),
  ],
})
export class ModuleB {}
```

### ✅ Do: Configure Once, Use Everywhere

```typescript
// GOOD: Configure in main app
@Module({
  imports: [
    ChromaDBModule.forRoot({ /* connection config */ }),
    ModuleA, // Uses existing ChromaDB
    ModuleB, // Uses existing ChromaDB
  ],
})
export class AppModule {}
```

### ❌ Don't: Read Environment in Libraries

```typescript
// BAD: Library coupled to environment
export class ChromaDBService {
  constructor() {
    this.host = process.env.CHROMADB_HOST; // Don't do this!
  }
}
```

### ✅ Do: Accept Configuration

```typescript
// GOOD: Library accepts configuration
export class ChromaDBService {
  constructor(private config: ChromaDBConfig) {
    this.host = config.host; // Config from app
  }
}
```

## Migration Checklist

If you're integrating a new module:

- [ ] Remove any `.env.example` files from the module
- [ ] Update module to not read `process.env` directly
- [ ] Import the module into main app
- [ ] Use `@InjectChromaDB()` or `@InjectNeo4j()` for database access
- [ ] Create module-specific collections/nodes as needed
- [ ] Document any new environment variables in root `.env.example`

## Summary

- **One `.env.example`** at the root
- **Libraries** are environment-agnostic
- **Applications** configure services once
- **Modules** share database connections
- **Collections/Databases** provide namespace separation