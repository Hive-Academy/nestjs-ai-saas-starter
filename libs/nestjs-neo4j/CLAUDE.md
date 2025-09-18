# Neo4j Module - User Manual

## Overview

The **@hive-academy/nestjs-neo4j** module provides seamless Neo4j graph database integration for NestJS applications, enabling sophisticated relationship modeling, graph analytics, and AI-powered knowledge graphs.

**Key Features:**

- **Advanced Transaction Management** - Declarative `@Transactional` decorator with automatic rollback
- **Multiple Session Modes** - Read, write, and transaction-aware operations
- **Query Builder Integration** - Type-safe Cypher query construction
- **Health Monitoring** - Comprehensive connection and performance monitoring
- **Enhanced Error Handling** - Detailed error boundaries with recovery strategies
- **Type Safety** - Full TypeScript support with Neo4j driver integration

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/nestjs-neo4j
```

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
      config: {
        maxConnectionPoolSize: 100,
        connectionTimeout: 30000,
        encrypted: true,
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### Neo4jService - Main Operations

**Primary interface** for all graph database operations:

```typescript
// Session-based operations with automatic cleanup
read<T>(operation: (session: Session) => Promise<T>, database?: string): Promise<T>
write<T>(operation: (session: Session) => Promise<T>, database?: string): Promise<T>

// Query methods for simple operations
readQuery<T>(cypher: string, params?: Record<string, unknown>, database?: string): Promise<T[]>
writeQuery<T>(cypher: string, params?: Record<string, unknown>, database?: string): Promise<T[]>

// Full-featured query execution
run<T>(cypher: string, params?: Record<string, unknown>, options?: SessionOptions): Promise<QueryResult<T>>

// Transaction management
runInTransaction<T>(work: (session: Session) => Promise<T>, database?: string): Promise<T>
runInReadTransaction<T>(work: (tx: Transaction) => Promise<T>, database?: string): Promise<T>

// Utility methods
verifyConnectivity(): Promise<boolean>
getSession(options?: SessionOptions): Session
getDriver(): Driver
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { Neo4jService, Transactional, InjectNeo4j } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class SocialNetworkService {
  constructor(@InjectNeo4j() private readonly neo4j: Neo4jService) {}

  async createUserProfile(userData: CreateUserDto): Promise<User> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(
        `
        CREATE (u:User {
          id: $id,
          name: $name,
          email: $email,
          createdAt: timestamp()
        })
        RETURN u
      `,
        userData
      );

      return result.records[0].get('u').properties;
    });
  }

  @Transactional()
  async followUser(followerId: string, followeeId: string): Promise<void> {
    await this.neo4j.write(async (session) => {
      await session.run(
        `
        MATCH (follower:User {id: $followerId})
        MATCH (followee:User {id: $followeeId})
        CREATE (follower)-[:FOLLOWS {
          since: timestamp(),
          notificationsEnabled: true
        }]->(followee)
      `,
        { followerId, followeeId }
      );
    });
  }

  async getRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
    return this.neo4j.readQuery(
      `
      MATCH (u:User {id: $userId})-[:LIKES]->(item)
      MATCH (item)<-[:LIKES]-(other:User)-[:LIKES]->(rec)
      WHERE NOT (u)-[:LIKES]->(rec)
      RETURN rec {
        .*,
        score: count(*) * 1.0 / 100
      } as recommendation
      ORDER BY recommendation.score DESC
      LIMIT $limit
    `,
      { userId, limit }
    );
  }
}
```

## Configuration

### Basic Configuration

```typescript
Neo4jModule.forRoot({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j',
  config: {
    maxConnectionPoolSize: 100,
    connectionAcquisitionTimeout: 60000,
    maxConnectionLifetime: 3600000,
    connectionTimeout: 30000,
    encrypted: true,
  },
});
```

### Async Configuration

```typescript
Neo4jModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    uri: configService.get('NEO4J_URI'),
    username: configService.get('NEO4J_USERNAME'),
    password: configService.get('NEO4J_PASSWORD'),
    database: configService.get('NEO4J_DATABASE'),
    config: {
      maxConnectionPoolSize: configService.get('NEO4J_POOL_SIZE', 100),
      encrypted: configService.get('NEO4J_ENCRYPTED', true),
    },
  }),
  inject: [ConfigService],
});
```

### Feature Module Registration

```typescript
// Register feature-specific databases
Neo4jModule.forFeature(['users', 'analytics', 'social']);

@Injectable()
export class UserService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService, @InjectNeo4jSession('users') private userSession: Session) {}
}
```

## Advanced Features

### @Transactional Decorator

**Declarative transaction management** with automatic rollback:

```typescript
@Injectable()
export class OrderService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  @Transactional({ database: 'orders', timeout: 30000 })
  async processOrder(orderData: CreateOrderDto): Promise<Order> {
    // All operations within this method run in a single transaction
    const order = await this.createOrder(orderData);
    await this.reserveInventory(orderData.items);
    await this.processPayment(orderData.payment);
    await this.updateCustomerStats(orderData.customerId);

    // Automatic commit on success, rollback on error
    return order;
  }

  @Transactional() // Nested transactions reuse parent transaction
  private async reserveInventory(items: OrderItem[]): Promise<void> {
    for (const item of items) {
      await this.neo4j.write(async (session) => {
        await session.run(
          `
          MATCH (p:Product {id: $productId})
          WHERE p.inventory >= $quantity
          SET p.inventory = p.inventory - $quantity
        `,
          { productId: item.productId, quantity: item.quantity }
        );
      });
    }
  }
}
```

### Query Builder Integration

```typescript
import { cypher } from '@hive-academy/nestjs-neo4j';

async getInfluentialUsers(minFollowers: number): Promise<User[]> {
  const query = cypher()
    .match('(u:User {active: true})')
    .optionalMatch('(u)<-[:FOLLOWS]-(follower:User)')
    .where('u.verified = true')
    .with('u, count(follower) as followerCount')
    .where('followerCount >= $minFollowers', { minFollowers })
    .orderBy('followerCount', 'DESC')
    .limit(50)
    .return('u, followerCount')
    .build();

  return this.neo4j.readQuery(query.cypher, query.parameters);
}
```

### Advanced Session Management

```typescript
// Manual session control for complex operations
async performComplexAnalysis(): Promise<AnalysisResult> {
  const session = this.neo4j.getSession({
    database: 'analytics',
    defaultAccessMode: 'READ'
  });

  try {
    const result = await session.run(`
      MATCH (u:User)-[r:INTERACTED]->(content:Content)
      WHERE r.timestamp > $startDate
      RETURN u.segment, collect(content.category) as preferences
    `, { startDate: Date.now() - 86400000 });

    return this.processAnalysisResults(result);
  } finally {
    await session.close();
  }
}
```

## Health Monitoring

### Health Service Integration

```typescript
import { Neo4jHealthService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class SystemHealthService {
  constructor(private neo4jHealth: Neo4jHealthService) {}

  async checkNeo4jHealth() {
    const health = await this.neo4jHealth.checkHealth();
    const metrics = await this.neo4jHealth.getMetrics();

    return {
      status: health.status,
      database: health.details?.database,
      version: health.details?.version,
      responseTime: health.details?.responseTime,
      metrics: {
        nodes: metrics.nodes,
        relationships: metrics.relationships,
        labels: metrics.labels,
        propertyKeys: metrics.propertyKeys,
      },
    };
  }
}
```

### Connection Monitoring

```typescript
import { Neo4jConnectionService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class ConnectionMonitorService {
  constructor(private connectionService: Neo4jConnectionService) {}

  async monitorConnection(): Promise<ConnectionStatus> {
    const isConnected = await this.connectionService.isConnected();
    const connectionInfo = this.connectionService.getConnectionInfo();

    if (!isConnected) {
      // Handle connection failure
      this.logger.error('Neo4j connection lost', connectionInfo);
      await this.attemptReconnection();
    }

    return {
      connected: isConnected,
      uri: connectionInfo.uri,
      database: connectionInfo.database,
      retryCount: connectionInfo.retryCount,
    };
  }
}
```

## Core Interfaces

### Query Result Types

```typescript
interface QueryResult<T = Record<string, unknown>> {
  records: T[];
  summary?: {
    query: { text: string; parameters: Record<string, unknown> };
    counters: QueryCounters;
    updateStatistics: { containsUpdates: boolean };
    plan?: QueryPlanStep;
    profile?: QueryProfile;
    notifications: QueryNotification[];
    server: { address: string; version: string };
    database?: { name: string };
  };
}
```

### Configuration Options

```typescript
interface Neo4jModuleOptions {
  uri: string;
  username: string;
  password: string;
  database?: string;
  config?: Config;
  healthCheck?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}
```

## Dependency Injection

```typescript
import { InjectNeo4j, InjectNeo4jDriver, InjectNeo4jSession } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class GraphService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService, @InjectNeo4jDriver() private driver: Driver, @InjectNeo4jSession('analytics') private analyticsSession: Session) {}
}
```

## Use Case Examples

### Knowledge Graph Implementation

```typescript
@Injectable()
export class KnowledgeGraphService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  @Transactional()
  async createConcept(concept: ConceptDto): Promise<Concept> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(
        `
        CREATE (c:Concept {
          id: $id,
          name: $name,
          definition: $definition,
          domain: $domain,
          confidence: $confidence,
          createdAt: timestamp()
        })
        RETURN c
      `,
        concept
      );

      return result.records[0].get('c').properties;
    });
  }

  async findRelatedConcepts(conceptId: string, maxDepth = 3): Promise<ConceptPath[]> {
    return this.neo4j.readQuery(
      `
      MATCH path = (start:Concept {id: $conceptId})-[*1..${maxDepth}]-(related:Concept)
      WHERE start <> related
      WITH related, 
           [rel in relationships(path) | rel.strength] as strengths,
           length(path) as distance
      RETURN {
        concept: related,
        distance: distance,
        pathStrength: reduce(s = 1.0, strength in strengths | s * strength)
      } as conceptPath
      ORDER BY conceptPath.pathStrength DESC
      LIMIT 50
    `,
      { conceptId }
    );
  }
}
```

### Social Network Analytics

```typescript
@Injectable()
export class SocialAnalyticsService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  async calculateInfluenceScore(userId: string): Promise<number> {
    const result = await this.neo4j.readQuery(
      `
      MATCH (u:User {id: $userId})<-[:FOLLOWS]-(direct:User)
      OPTIONAL MATCH (direct)<-[:FOLLOWS]-(indirect:User)
      RETURN count(DISTINCT direct) + count(DISTINCT indirect) * 0.1 as score
    `,
      { userId }
    );

    return result[0]?.score || 0;
  }

  async findCommunities(): Promise<Community[]> {
    return this.neo4j.readQuery(`
      CALL algo.louvain.stream('User', 'FOLLOWS', {direction: 'BOTH'})
      YIELD nodeId, community
      MATCH (u:User) WHERE id(u) = nodeId
      RETURN community, collect(u.name) as members
      ORDER BY size(members) DESC
    `);
  }
}
```

## Error Handling

```typescript
import { Neo4jConnectionError, Neo4jTransactionError, Neo4jQueryError } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class RobustGraphService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  async safeOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Neo4jConnectionError) {
        this.logger.error('Neo4j connection failed', error.message);
        throw new ServiceUnavailableException('Database temporarily unavailable');
      } else if (error instanceof Neo4jTransactionError) {
        this.logger.error('Transaction failed', error.message);
        throw new ConflictException('Operation could not be completed');
      } else if (error instanceof Neo4jQueryError) {
        this.logger.error('Query execution failed', error.message);
        throw new BadRequestException('Invalid query parameters');
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
import { Neo4jModule, Neo4jService } from '@hive-academy/nestjs-neo4j';

describe('UserService', () => {
  let service: UserService;
  let neo4jService: Neo4jService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        Neo4jModule.forRoot({
          uri: 'bolt://localhost:7687',
          username: 'neo4j',
          password: 'test',
        }),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  it('should create user with relationships', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    const user = await service.createUserProfile(userData);

    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.createdAt).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeouts

```typescript
// Solution: Increase timeout values
Neo4jModule.forRoot({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  config: {
    connectionAcquisitionTimeout: 120000, // 2 minutes
    connectionTimeout: 60000, // 1 minute
    maxTransactionRetryTime: 60000, // 1 minute
  },
});
```

#### 2. Transaction Deadlocks

```typescript
// Solution: Implement retry logic
async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error.message?.includes('DeadlockDetected')) {
        const delay = Math.pow(2, attempt) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
```

#### 3. Memory Issues with Large Results

```typescript
// Solution: Use pagination
async getLargeDataset(offset: number, limit: number): Promise<any[]> {
  return this.neo4j.readQuery(`
    MATCH (n:Node)
    RETURN n
    ORDER BY n.createdAt
    SKIP $offset
    LIMIT $limit
  `, { offset, limit });
}
```

This comprehensive module provides production-ready Neo4j integration with advanced transaction management, health monitoring, and sophisticated graph operations for building intelligent applications.
