# @hive-academy/nestjs-neo4j

A comprehensive Neo4j integration module for NestJS applications, providing enterprise-grade features for graph database operations with full TypeScript support, advanced query builder, and transaction management.

## Features

- 🚀 **Dynamic Module Configuration** - Support for both synchronous and asynchronous module configuration with factory pattern
- 💉 **Dependency Injection** - Seamless integration with NestJS DI container using custom decorators
- 🔄 **Transaction Management** - Decorator-based transaction support with `@Transactional()` for atomic operations
- 🎯 **Connection Pooling** - Efficient connection management with configurable pool settings
- 🔁 **Retry Logic** - Built-in retry mechanism for transient failures with configurable attempts
- 📊 **Health Checks** - Comprehensive health indicators with metrics and performance monitoring
- 🎪 **Multi-Database Support** - Connect to multiple Neo4j databases using `forFeature()`
- 🔒 **Type Safety** - Full TypeScript support with comprehensive type definitions and interfaces
- ⚡ **Performance Optimized** - Bulk operations, parallel query execution, and session management
- 🛠️ **Query Builder** - Fluent Cypher query builder for type-safe query construction
- 📈 **Enhanced Metrics & Monitoring** - Advanced metrics with APOC integration and comprehensive health checks
- 🔐 **Advanced Authentication** - Support for various authentication methods and SSL/TLS
- 🛡️ **Type-Safe Query Results** - Enhanced notification handling and robust summary processing
- ⚡ **Improved Performance** - Better connection pooling and query result optimization

## Installation

```bash
npm install @hive-academy/nestjs-neo4j neo4j-driver
# or
yarn add @hive-academy/nestjs-neo4j neo4j-driver
# or
pnpm add @hive-academy/nestjs-neo4j neo4j-driver
```

## Quick Start

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
      database: 'neo4j',
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

@Module({
  imports: [
    ConfigModule.forRoot(),
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('NEO4J_URI'),
        username: configService.get('NEO4J_USERNAME'),
        password: configService.get('NEO4J_PASSWORD'),
        database: configService.get('NEO4J_DATABASE'),
        config: {
          maxConnectionPoolSize: 100,
          connectionAcquisitionTimeout: 60000,
        },
        healthCheck: true,
        retryAttempts: 5,
        retryDelay: 5000,
      }),
    }),
  ],
})
export class AppModule {}
```

## Core Service Usage

### Injecting Neo4jService

```typescript
import { Injectable } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class UserService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async createUser(name: string, email: string) {
    return this.neo4jService.write(async (session) => {
      const result = await session.run('CREATE (u:User {name: $name, email: $email}) RETURN u', { name, email });
      return result.records[0].get('u').properties;
    });
  }

  async findUser(email: string) {
    return this.neo4jService.read(async (session) => {
      const result = await session.run('MATCH (u:User {email: $email}) RETURN u', { email });
      return result.records[0]?.get('u')?.properties;
    });
  }
}
```

## Query Builder

The module includes a powerful Cypher query builder for constructing type-safe queries programmatically:

### Basic Usage

```typescript
import { cypher, CypherQueryBuilder } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class GraphService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async findUserFriends(userId: string) {
    const query = cypher().match('(user:User {id: $userId})').match('(user)-[:FRIEND_OF]-(friend:User)').where('friend.active = true').return('friend').orderBy('friend.name', 'ASC').limit(10).build();

    return this.neo4jService.read(async (session) => {
      const result = await session.run(query.cypher, {
        ...query.parameters,
        userId,
      });
      return result.records.map((r) => r.get('friend'));
    });
  }
}
```

### Advanced Query Building

```typescript
async createComplexQuery() {
  const builder = new CypherQueryBuilder()
    .match('(u:User)')
    .where('u.age > $minAge', { minAge: 18 })
    .andWhere('u.status = $status', { status: 'active' })
    .optionalMatch('(u)-[:OWNS]->(p:Product)')
    .with(['u', 'collect(p) as products'])
    .match('(u)-[:LIVES_IN]->(c:City)')
    .where('c.population > $minPopulation')
    .return('u, products, c')
    .orderBy('u.created_at', 'DESC')
    .skip(10)
    .limit(20);

  const { cypher, parameters } = builder.build();

  return this.neo4jService.read(async (session) => {
    const result = await session.run(cypher, {
      ...parameters,
      minPopulation: 100000,
    });
    return result.records;
  });
}
```

### Query Builder Methods

| Method                         | Description         | Example                                          |
| ------------------------------ | ------------------- | ------------------------------------------------ |
| `match(pattern)`               | Add MATCH clause    | `.match('(n:Node)')`                             |
| `optionalMatch(pattern)`       | Add OPTIONAL MATCH  | `.optionalMatch('(n)-[r]->(m)')`                 |
| `where(condition, params?)`    | Add WHERE clause    | `.where('n.age > $age', { age: 18 })`            |
| `andWhere(condition, params?)` | Add AND condition   | `.andWhere('n.status = $status')`                |
| `orWhere(condition, params?)`  | Add OR condition    | `.orWhere('n.type = $type')`                     |
| `create(pattern, params?)`     | Add CREATE clause   | `.create('(n:Node $props)', { props })`          |
| `merge(pattern, params?)`      | Add MERGE clause    | `.merge('(n:Node {id: $id})')`                   |
| `set(expression, params?)`     | Add SET clause      | `.set('n.updated = $now')`                       |
| `delete(variables)`            | Add DELETE clause   | `.delete(['n', 'r'])`                            |
| `detachDelete(variables)`      | Add DETACH DELETE   | `.detachDelete('n')`                             |
| `with(variables)`              | Add WITH clause     | `.with(['n', 'count(r) as cnt'])`                |
| `orderBy(expr, direction?)`    | Add ORDER BY        | `.orderBy('n.name', 'DESC')`                     |
| `skip(count)`                  | Add SKIP            | `.skip(10)`                                      |
| `limit(count)`                 | Add LIMIT           | `.limit(20)`                                     |
| `return(expression)`           | Add RETURN          | `.return('n, r, m')`                             |
| `returnDistinct(expression)`   | Add RETURN DISTINCT | `.returnDistinct('n.category')`                  |
| `call(procedure, params?)`     | Add CALL clause     | `.call('db.labels()')`                           |
| `yield(variables)`             | Add YIELD           | `.yield(['label', 'count'])`                     |
| `unwind(expr, as)`             | Add UNWIND          | `.unwind('$items', 'item')`                      |
| `foreach(var, list, update)`   | Add FOREACH         | `.foreach('x', 'nodes', 'SET x.visited = true')` |
| `raw(cypher, params?)`         | Add raw Cypher      | `.raw('// Custom Cypher')`                       |

### Complex Pattern Matching

```typescript
async findConnectedComponents(nodeType: string, maxDepth: number) {
  const query = cypher()
    .match(`(start:${nodeType})`)
    .call(`apoc.path.subgraphAll(start, {
      maxLevel: $maxDepth,
      relationshipFilter: 'CONNECTED_TO'
    })`, { maxDepth })
    .yield(['nodes', 'relationships'])
    .unwind('nodes', 'node')
    .returnDistinct('node')
    .orderBy('size(node.connections)', 'DESC')
    .build();

  return this.neo4jService.read(async (session) => {
    const result = await session.run(query.cypher, query.parameters);
    return result.records.map(r => r.get('node'));
  });
}
```

## Advanced Features

### Transaction Decorators

Use the `@Transactional()` decorator for automatic transaction management:

```typescript
import { Injectable } from '@nestjs/common';
import { Neo4jService, Transactional } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class OrderService {
  constructor(private readonly neo4jService: Neo4jService) {}

  @Transactional()
  async createOrderWithItems(order: Order, items: Item[]) {
    // All operations within this method will run in a single transaction
    const session = this.neo4jService.getSession();

    // Create order
    const orderResult = await session.run('CREATE (o:Order {id: $id, total: $total}) RETURN o', order);

    // Create items and relationships
    for (const item of items) {
      await session.run(
        `MATCH (o:Order {id: $orderId})
         CREATE (i:Item {id: $id, name: $name, price: $price})
         CREATE (o)-[:CONTAINS]->(i)`,
        { orderId: order.id, ...item }
      );
    }

    return orderResult.records[0].get('o').properties;
  }
}
```

### Bulk Operations

Optimize performance with bulk operations:

```typescript
async bulkCreateUsers(users: User[]) {
  return this.neo4jService.bulk(async (session) => {
    const results = [];

    for (const user of users) {
      const result = await session.run(
        'CREATE (u:User {id: $id, name: $name}) RETURN u',
        user
      );
      results.push(result.records[0].get('u').properties);
    }

    return results;
  });
}
```

### Custom Transaction Management

For complex scenarios, use `runInTransaction`:

```typescript
async transferFunds(fromId: string, toId: string, amount: number) {
  return this.neo4jService.runInTransaction(async (session) => {
    // Deduct from source account
    await session.run(
      'MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount',
      { id: fromId, amount }
    );

    // Add to destination account
    await session.run(
      'MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount',
      { id: toId, amount }
    );

    // Create transfer record
    const result = await session.run(
      `MATCH (from:Account {id: $fromId}), (to:Account {id: $toId})
       CREATE (t:Transfer {amount: $amount, timestamp: datetime()})
       CREATE (from)-[:SENT]->(t)-[:RECEIVED]->(to)
       RETURN t`,
      { fromId, toId, amount }
    );

    return result.records[0].get('t').properties;
  });
}
```

### Health Checks

When health checks are enabled, the module automatically provides health indicators:

```typescript
// In your health module
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Neo4jHealthIndicator } from '@hive-academy/nestjs-neo4j';

@Module({
  imports: [TerminusModule],
  providers: [Neo4jHealthIndicator],
})
export class HealthModule {}
```

### Multi-Database Support

Connect to multiple databases using `forFeature`:

```typescript
// In your root module
@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
      database: 'primary',
    }),
  ],
})
export class AppModule {}

// In feature modules
@Module({
  imports: [Neo4jModule.forFeature(['analytics', 'reporting'])],
})
export class AnalyticsModule {}
```

Then inject specific database connections:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectNeo4j } from '@hive-academy/nestjs-neo4j';
import { Driver } from 'neo4j-driver';

@Injectable()
export class AnalyticsService {
  constructor(@InjectNeo4j('analytics') private analyticsDb: Driver, @InjectNeo4j('reporting') private reportingDb: Driver) {}
}
```

## Configuration Options

### Full Configuration Interface

```typescript
interface Neo4jModuleOptions {
  // Connection
  uri: string; // Neo4j connection URI
  username: string; // Database username
  password: string; // Database password
  database?: string; // Target database (default: 'neo4j')

  // Advanced Configuration
  config?: {
    maxConnectionPoolSize?: number; // Max pool size (default: 100)
    connectionAcquisitionTimeout?: number; // Timeout in ms (default: 60000)
    maxTransactionRetryTime?: number; // Max retry time in ms
    disableLosslessIntegers?: boolean; // Use native JS numbers
    logging?: {
      level?: 'error' | 'warn' | 'info' | 'debug';
      logger?: (level: string, message: string) => void;
    };
    encrypted?: boolean | 'ENCRYPTION_ON' | 'ENCRYPTION_OFF';
    trust?: 'TRUST_ALL_CERTIFICATES' | 'TRUST_CUSTOM_CA_SIGNED_CERTIFICATES' | 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';
    trustedCertificates?: string[];
  };

  // Module Features
  healthCheck?: boolean; // Enable health checks (default: false)
  retryAttempts?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
}
```

## Best Practices

### 1. Connection Management

Always use the provided service methods instead of creating sessions manually:

```typescript
// ✅ Good
async getUser(id: string) {
  return this.neo4jService.read(async (session) => {
    // Session is automatically managed
    const result = await session.run('MATCH (u:User {id: $id}) RETURN u', { id });
    return result.records[0]?.get('u');
  });
}

// ❌ Bad
async getUser(id: string) {
  const session = this.driver.session();
  try {
    const result = await session.run('MATCH (u:User {id: $id}) RETURN u', { id });
    return result.records[0]?.get('u');
  } finally {
    await session.close(); // Manual session management
  }
}
```

### 2. Use Appropriate Read/Write Methods

```typescript
// Use read() for read operations
async getUsers() {
  return this.neo4jService.read(async (session) => {
    // Read operations
  });
}

// Use write() for write operations
async createUser(data: UserDto) {
  return this.neo4jService.write(async (session) => {
    // Write operations
  });
}
```

### 3. Error Handling

The module automatically handles common Neo4j errors. You can extend this with custom error handling:

```typescript
async createUser(email: string) {
  try {
    return await this.neo4jService.write(async (session) => {
      // Your logic
    });
  } catch (error) {
    if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
      throw new ConflictException('User with this email already exists');
    }
    throw error;
  }
}
```

### 4. Performance Optimization

Use bulk operations for multiple related operations:

```typescript
// ✅ Good - Single transaction
async createProjectWithTasks(project: Project, tasks: Task[]) {
  return this.neo4jService.runInTransaction(async (session) => {
    // All operations in one transaction
  });
}

// ❌ Bad - Multiple transactions
async createProjectWithTasks(project: Project, tasks: Task[]) {
  await this.createProject(project);
  for (const task of tasks) {
    await this.createTask(task); // Each creates a new transaction
  }
}
```

## Testing

### Unit Testing

Mock the Neo4jService in your tests:

```typescript
import { Test } from '@nestjs/testing';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';

describe('UserService', () => {
  let service: UserService;
  let neo4jService: jest.Mocked<Neo4jService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: Neo4jService,
          useValue: {
            read: jest.fn(),
            write: jest.fn(),
            runInTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    neo4jService = module.get(Neo4jService);
  });

  it('should create a user', async () => {
    const mockUser = { id: '1', name: 'John' };
    neo4jService.write.mockResolvedValue(mockUser);

    const result = await service.createUser('John');

    expect(result).toEqual(mockUser);
    expect(neo4jService.write).toHaveBeenCalled();
  });
});
```

### Integration Testing

Use a test database for integration tests:

```typescript
import { Test } from '@nestjs/testing';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

describe('UserService (Integration)', () => {
  let service: UserService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        Neo4jModule.forRoot({
          uri: 'bolt://localhost:7687',
          username: 'neo4j',
          password: 'test',
          database: 'test',
        }),
      ],
      providers: [UserService],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(async () => {
    // Clean up test data
    await service.deleteAllUsers();
  });

  it('should create and retrieve a user', async () => {
    const user = await service.createUser('John', 'john@example.com');
    const retrieved = await service.findUser('john@example.com');

    expect(retrieved).toEqual(user);
  });
});
```

## Migration from Direct Driver Usage

If you're migrating from direct neo4j-driver usage, here's a comparison:

### Before (Direct Driver)

```typescript
import neo4j from 'neo4j-driver';

@Injectable()
export class UserService {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
  }

  async createUser(name: string) {
    const session = this.driver.session();
    try {
      const result = await session.run('CREATE (u:User {name: $name}) RETURN u', { name });
      return result.records[0].get('u');
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    await this.driver.close();
  }
}
```

### After (Using @hive-academy/nestjs-neo4j)

```typescript
import { Injectable } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class UserService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async createUser(name: string) {
    return this.neo4jService.write(async (session) => {
      const result = await session.run('CREATE (u:User {name: $name}) RETURN u', { name });
      return result.records[0].get('u');
    });
  }
  // No cleanup needed - handled by the module
}
```

## Latest Enhancements (v2024.12)

### 🚀 Enhanced Type Safety & Query Processing

The library now includes several important improvements for better reliability and developer experience:

#### 1. **Improved Notification Handling**

- **Type-Safe Notifications**: Proper TypeScript definitions for Neo4j query notifications
- **Position Information**: Safe extraction of position data with runtime type checking
- **Severity Mapping**: Standardized severity levels (`WARNING`, `INFORMATION`, `UNKNOWN`)

```typescript
// Enhanced notification processing with type safety
const result = await neo4jService.run(query, params);
result.summary.notifications.forEach((notification) => {
  console.log(`${notification.severity}: ${notification.title}`);
  if (notification.position) {
    console.log(`At line ${notification.position.line}, column ${notification.position.column}`);
  }
});
```

#### 2. **Robust Summary Processing**

- **Null Safety**: Graceful handling of undefined plan/profile data
- **Enhanced Error Context**: Better error reporting with notification details
- **Type-Safe Summary**: All summary properties now have proper TypeScript definitions

```typescript
const queryResult = await neo4jService.run(complexQuery, params);
const summary = queryResult.summary;

// Safe access to potentially undefined properties
console.log('Execution plan:', summary.plan || 'No plan available');
console.log('Profile data:', summary.profile || 'No profile data');
```

#### 3. **Advanced Health Monitoring**

- **Extended Metrics Types**: Support for `Record<string, number | string | object>`
- **APOC Integration**: Automatic detection and utilization of APOC procedures
- **Better Error Handling**: Graceful fallback when APOC is not available

```typescript
const metrics = await neo4jHealthService.getMetrics();
// Now supports complex metric data including APOC statistics
console.log('Database metrics:', {
  nodes: metrics.nodes,
  relationships: metrics.relationships,
  apocFeatures: metrics.apocStats || 'APOC not available',
});
```

#### 4. **Enhanced Module Configuration**

- **Stricter Type Definitions**: Improved `Neo4jModuleAsyncOptions` interface
- **Dependency Injection**: Enhanced type safety for injection tokens
- **Better Configuration Validation**: Runtime validation of configuration options

#### 5. **Advanced Parameter Safety & Validation**

- **@Neo4jSafe Decorator**: Automatic parameter serialization for Neo4j compatibility
- **@ValidateNeo4jParams Decorator**: Input validation to prevent injection attacks
- **Enhanced Query Builder**: Built-in parameter processing and type safety
- **Centralized Serialization**: Advanced parameter serializer with circular reference protection

```typescript
@Injectable()
export class UserRepository {
  // Automatic parameter serialization and validation
  @Neo4jSafe({ autoSerialize: true, autoInt: true })
  @ValidateNeo4jParams({ preventInjection: true })
  async createUser(userData: ComplexUserData) {
    // userData.metadata automatically JSON.stringify'd
    // userData.id automatically wrapped with int() if number
    // All parameters validated for injection patterns
    return this.neo4j.write(async (session) => {
      const result = await session.run('CREATE (u:User $props) RETURN u', { props: userData });
      return result.records[0]?.get('u');
    });
  }
}
```

#### 6. **Enhanced Query Builder Features**

- **Safe Parameter Processing**: Automatic Neo4j-compatible parameter transformation
- **Template Queries**: Pre-built query templates for common operations
- **Complex Object Handling**: Intelligent serialization of nested objects
- **Circular Reference Protection**: Safe handling of complex object structures

```typescript
// Enhanced query builder with automatic safety
const query = cypher()
  .createNode(
    'User',
    {
      id: 123, // Automatically wrapped with int()
      metadata: complexObject, // Automatically JSON.stringify'd
      createdAt: new Date(), // Automatically converted to ISO string
    },
    'u'
  )
  .return('u')
  .buildSafe(); // Enhanced build with safety checks

// Or use safe mode by default
const safeQuery = safeCypher()
  .match('(u:User)')
  .where('u.active = $active')
  .addParameter('active', true) // All parameters automatically processed
  .return('u')
  .build();
```

### 🔧 Migration Notes

These enhancements are backward compatible, but you may want to update your code to take advantage of the new type safety:

```typescript
// Old approach (still works)
const notifications = result.summary.notifications;

// New approach (recommended for better type safety)
const notifications: EnhancedNotification[] = result.summary.notifications;
notifications.forEach((n) => {
  // TypeScript now knows the exact shape of notifications
  console.log(`${n.severity}: ${n.description}`);
});
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeout

```typescript
// Increase timeout in configuration
Neo4jModule.forRoot({
  // ...
  config: {
    connectionAcquisitionTimeout: 120000, // 2 minutes
  },
});
```

#### 2. Transaction Rollback

Transactions are automatically rolled back on error. Ensure proper error handling:

```typescript
@Transactional()
async riskyOperation() {
  try {
    // Your logic
  } catch (error) {
    // Transaction will be rolled back
    logger.error('Operation failed', error);
    throw error; // Re-throw to trigger rollback
  }
}
```

#### 3. Memory Issues with Large Results

Use streaming for large datasets:

```typescript
async streamLargeDataset() {
  return this.neo4jService.read(async (session) => {
    const result = session.run('MATCH (n) RETURN n');

    result.subscribe({
      onNext: (record) => {
        // Process each record
        console.log(record.get('n'));
      },
      onCompleted: () => {
        console.log('Stream completed');
      },
      onError: (error) => {
        console.error('Stream error', error);
      },
    });
  });
}
```

## API Reference

### Neo4jService

| Method                                      | Description                                   | Return Type               |
| ------------------------------------------- | --------------------------------------------- | ------------------------- |
| `read<T>(operation, database?)`             | Execute read operation with session callback  | `Promise<T>`              |
| `write<T>(operation, database?)`            | Execute write operation with session callback | `Promise<T>`              |
| `readQuery<T>(cypher, params?, database?)`  | Execute read query (legacy)                   | `Promise<T[]>`            |
| `writeQuery<T>(cypher, params?, database?)` | Execute write query (legacy)                  | `Promise<T[]>`            |
| `run<T>(cypher, params?, options?)`         | Execute query with full result details        | `Promise<QueryResult<T>>` |
| `runInTransaction<T>(work, database?)`      | Run operations in transaction                 | `Promise<T>`              |
| `runInReadTransaction<T>(work, database?)`  | Run in read transaction                       | `Promise<T>`              |
| `bulk<T>(operation, database?)`             | Execute bulk operation                        | `Promise<T>`              |
| `bulkOperations(operations)`                | Execute multiple operations in transaction    | `Promise<BulkResult>`     |
| `getSession(options?)`                      | Get a session with options                    | `Session`                 |
| `getDriver()`                               | Get the driver instance                       | `Driver`                  |
| `verifyConnectivity()`                      | Check connection                              | `Promise<boolean>`        |
| `close()`                                   | Close driver connection                       | `Promise<void>`           |

### Session Options

```typescript
interface SessionOptions {
  database?: string;
  defaultAccessMode?: 'READ' | 'WRITE';
  bookmarks?: string[];
  fetchSize?: number;
}
```

### Query Result Interface

```typescript
interface QueryResult<T = any> {
  records: T[];
  summary: {
    query: {
      text: string;
      parameters: Record<string, any>;
    };
    counters: any;
    updateStatistics: {
      containsUpdates: boolean;
      containsSystemUpdates: boolean;
    };
    plan?: any; // Enhanced with null safety
    profile?: any; // Enhanced with null safety
    notifications: EnhancedNotification[]; // Enhanced with type safety
    server: {
      address: string;
      version: string;
    };
    resultConsumedAfter: number;
    resultAvailableAfter: number;
    database?: {
      name: string;
    };
  };
}

// Enhanced notification interface with type-safe position information
interface EnhancedNotification {
  code: string;
  title: string;
  description: string;
  severity: 'WARNING' | 'INFORMATION' | 'UNKNOWN';
  position?: {
    offset: number;
    line: number;
    column: number;
  };
}
```

### Decorators

| Decorator                        | Description                                        | Usage                |
| -------------------------------- | -------------------------------------------------- | -------------------- |
| `@InjectNeo4j(name?)`            | Inject Neo4j driver or named session               | Property/Constructor |
| `@Transactional(options?)`       | Mark method as transactional with options          | Method               |
| `@Neo4jSafe(options?)`           | Automatic parameter serialization for Neo4j safety | Method               |
| `@ValidateNeo4jParams(options?)` | Validate parameters to prevent injection attacks   | Method               |

#### New Decorator Options

```typescript
// Neo4jSafe decorator options
interface Neo4jSafeOptions {
  autoSerialize?: boolean; // Auto-serialize complex objects (default: true)
  autoInt?: boolean; // Auto-wrap integers with int() (default: true)
  validateParams?: boolean; // Validate parameters (default: true)
  logTransformations?: boolean; // Log transformations for debugging (default: false)
}

// ValidateNeo4jParams decorator options
interface Neo4jParamValidationOptions {
  preventInjection?: boolean; // Check for Cypher injection patterns (default: true)
  validateStructure?: boolean; // Validate parameter structure (default: true)
  maxDepth?: number; // Max nesting depth (default: 10)
  throwOnValidationError?: boolean; // Throw vs warn on errors (default: true)
}
```

### Neo4jHealthService

The module provides comprehensive health checking capabilities with enhanced metrics:

```typescript
import { Neo4jHealthService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class HealthService {
  constructor(private readonly neo4jHealth: Neo4jHealthService) {}

  async checkHealth() {
    const health = await this.neo4jHealth.checkHealth();
    // Returns: {
    //   name: 'neo4j',
    //   status: 'up' | 'down',
    //   message: string,
    //   details: {
    //     database: string,
    //     version: string,
    //     edition: string,
    //     responseTime: number
    //   }
    // }
    return health;
  }

  async getMetrics() {
    const metrics = await this.neo4jHealth.getMetrics();
    // Enhanced metrics now support complex data types and APOC integration:
    // Returns: {
    //   nodes: number,
    //   relationships: number,
    //   propertyKeys: number,
    //   labels: number,
    //   relationshipTypes: number,
    //   apocStats: object // APOC metadata if available
    // }
    return metrics;
  }

  async ping() {
    const isAlive = await this.neo4jHealth.ping();
    return { alive: isAlive };
  }
}
```

### Parameter Serialization Utilities

New utilities for handling complex parameter serialization:

```typescript
import { serializeNeo4jParams, serializeUpdateParams, createParameterSerializer } from '@hive-academy/nestjs-neo4j';

// Basic parameter serialization
const params = serializeNeo4jParams({
  userId: 123, // Auto-wrapped with int()
  metadata: complexObject, // Auto-serialized to JSON
  createdAt: new Date(), // Auto-converted to ISO string
  tags: ['tag1', 'tag2'], // Arrays preserved
});

// Custom serializer for specific use cases
const userSerializer = createParameterSerializer({
  dateFields: ['createdAt', 'updatedAt', 'lastLogin'],
  jsonFields: ['preferences', 'settings', 'metadata'],
  intFields: ['id', 'age', 'score'],
});

// Use the custom serializer
const serialized = userSerializer(userData);

// Generate SET clauses for updates
const { setClause, params: updateParams } = serializeUpdateParams(
  {
    name: 'John Doe',
    metadata: { role: 'admin' },
    updatedAt: new Date(),
  },
  {
    excludeFields: ['id'],
    prefix: 'user',
  }
);
// Results in: "user.name = $name, user.metadata = $metadata, user.updatedAt = datetime($updatedAt)"
```

### Enhanced Query Builder API

The query builder now includes advanced parameter handling:

```typescript
import { cypher, safeCypher, Neo4jQueryTemplates } from '@hive-academy/nestjs-neo4j';

// Enhanced query builder methods
const builder = cypher()
  .createNode('User', userData, 'u') // Auto-safe parameter handling
  .createRelationship('u', 'OWNS', 'p', relationshipData) // Auto-safe relationships
  .mergeNode('Product', matchProps, createProps, 'p') // Auto-safe merge operations
  .addSafeParameter('customParam', complexValue) // Explicit safe parameters
  .paginate(0, 20) // Safe pagination with int()
  .buildSafe(); // Enhanced build with validation

// Pre-built query templates
const createUserQuery = Neo4jQueryTemplates.createUser(userData);
const findQuery = Neo4jQueryTemplates.findByProperties('User', searchCriteria, 10);
const updateQuery = Neo4jQueryTemplates.updateNode('User', userId, updateData);
const relationshipQuery = Neo4jQueryTemplates.createRelationship('User', userId, 'FOLLOWS', 'User', targetUserId, { since: new Date() });
```

### Neo4jConnectionService

Manages connection lifecycle and provides connection utilities:

````typescript
interface Neo4jConnectionService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionInfo(): ConnectionInfo;
  executeWithRetry<T>(operation: () => Promise<T>, maxAttempts?: number): Promise<T>;
}

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/nestjs-neo4j.git

# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build
````

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@anubis.dev
- 💬 Discord: [Join our community](https://discord.gg/anubis)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/nestjs-neo4j/issues)
- 📖 Docs: [Full Documentation](https://docs.anubis.dev/nestjs-neo4j)

## Acknowledgments

Built with ❤️ by the Anubis team. Special thanks to:

- The NestJS team for the amazing framework
- Neo4j for the powerful graph database
- Our contributors and community

---

Made with Neo4j and NestJS
