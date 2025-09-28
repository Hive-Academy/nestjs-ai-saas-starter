# CLAUDE.md - @hive-academy/nestjs-neo4j

This comprehensive guide provides detailed information for AI assistants working with the `@hive-academy/nestjs-neo4j` library. This document is based on actual code analysis and reflects the current implementation.

## 🎯 Library Overview

### Core Purpose

The `@hive-academy/nestjs-neo4j` library is an enterprise-grade Neo4j integration for NestJS applications that provides:

- **Neogma OGM Integration**: Type-safe Neo4j operations through Neogma (NOT raw driver) with model management
- **Specialized Repositories**: GraphRepository for graph algorithms and traversal, RelationshipRepository for relationship management
- **Decorator-Based Operations**: Rich set of decorators for entities, queries, repositories, security, and constraints
- **Multi-Tenant Architecture**: Complete database-per-tenant isolation with automatic routing
- **Enterprise Security**: Comprehensive security layer with @Safe, @Authorize, @ValidateInput, @AuditLog, @RateLimit, @EncryptSensitive
- **Query Builder**: Type-safe query construction with fluent API
- **Constraint Management**: Database constraints via decorators (@Index, @Unique, @NotNull, @NodeKey)
- **Performance Optimization**: Metrics service, connection pooling, parameter serialization

## 🏗️ Core Architecture Components

### 1. Core Services

#### NeogmaService

The primary service for Neo4j operations using Neogma OGM:

```typescript
@Injectable()
export class NeogmaService {
  // Model Management
  registerModel<T>(name: string, model: TypedNeogmaModel<T>): void;
  getModel<T>(modelName: string): TypedNeogmaModel<T>;

  // CRUD Operations
  findById<T>(modelName: string, id: string): Promise<T | null>;
  findMany<T>(modelName: string, options?: FindOptions<T>): Promise<T[]>;
  create<T>(modelName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update<T>(modelName: string, id: string, updates: Partial<T>): Promise<T | null>;
  delete<T>(modelName: string, id: string, detach?: boolean): Promise<boolean>;
  count<T>(modelName: string, where?: Partial<T>): Promise<number>;
  exists<T>(modelName: string, id: string): Promise<boolean>;

  // Query Execution
  run(cypher: string, params?: Record<string, any>): Promise<QueryResult>;
  createQueryBuilder(): NeogmaQueryBuilder;

  // Metrics
  getMetrics(): NeogmaMetrics;
}
```

#### NeogmaConnectionService

Manages database connections and sessions:

```typescript
@Injectable()
export class NeogmaConnectionService {
  getDriver(): Driver;
  getSession(options?: SessionConfig): Session;
  verifyConnectivity(): Promise<void>;
  close(): Promise<void>;
}
```

#### NeogmaMetricsService

Tracks performance and usage metrics:

```typescript
@Injectable()
export class NeogmaMetricsService {
  recordQuery(duration: number, success: boolean): void;
  getMetrics(): NeogmaMetrics;
  resetMetrics(): void;
}
```

### 2. Decorators

#### Entity Decorators

```typescript
// Entity definition with smart defaults
@Neo4jEntity('User') // String shorthand supported
class User {
  @Id() id: string; // Auto-generated UUID
  @Neo4jProp() name: string; // Property mapping
  @CreatedAt() createdAt: Date; // Auto-managed
  @UpdatedAt() updatedAt: Date; // Auto-managed
  @JsonProperty() metadata: any; // JSON serialization
  @Neo4jRelationship() friends: User[]; // Relationship mapping
}
```

#### Query Decorator

```typescript
@Injectable()
export class UserService {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {}

  @CypherQuery({
    cacheTTL: 600000, // 10 minutes
    retries: 3,
    timeout: 5000,
  })
  async findUserById(id: string): Promise<User> {
    const queryBuilder = this.neogma.createQueryBuilder();

    const query = queryBuilder.match('(u:User)').where('u.id = $id', { id }).return('u').build();

    const result = await this.neogma.run(query.cypher, query.params);
    return result.records[0]?.get('u').properties;
  }
}
```

#### Repository Decorator

```typescript
@Repository('User') // Or @Neo4jRepository('User')
export class UserRepository {
  // Auto-generates: findOne, findMany, create, update, delete, count, exists
  // All methods are automatically injected
}
```

#### Security Decorators

```typescript
@Injectable()
export class SecureService {
  @Safe({
    validateInput: true,
    sanitizeOutput: true,
    logErrors: true,
  })
  @Authorize({ roles: ['admin'] })
  @ValidateInput({ schema: UserSchema })
  @AuditLog({ level: 'info' })
  @RateLimit({ maxRequests: 100, window: 60000 })
  @EncryptSensitive({ fields: ['ssn', 'creditCard'] })
  async sensitiveOperation(data: any): Promise<any> {
    // Multi-layer security protection
  }
}
```

#### Constraint Decorators

```typescript
@Neo4jEntity('Product')
class Product {
  @Id()
  @NodeKey() // Unique constraint
  id: string;

  @Neo4jProp()
  @NotNull()
  @Unique()
  sku: string;

  @Neo4jProp()
  @Index() // Regular index
  category: string;

  @Neo4jProp()
  @TextIndex() // Full-text search index
  description: string;

  @Neo4jProp()
  @RangeIndex() // Range queries
  price: number;

  @Neo4jProp()
  @Validate((value) => value > 0) // Custom validation
  quantity: number;
}
```

#### Transaction Decorator

```typescript
@Injectable()
export class TransactionalService {
  @Transactional()
  async transferFunds(fromId: string, toId: string, amount: number): Promise<void> {
    // All operations run in a single transaction
    // Automatic rollback on error
  }
}
```

### 3. Specialized Repositories

#### GraphRepository

For graph-specific operations:

```typescript
@Injectable()
export class GraphRepository<T> {
  // Graph Traversal
  findNeighbors(nodeId: string, options?: GraphTraversalOptions): Promise<T[]>;
  findShortestPath(startId: string, endId: string, options?: PathOptions): Promise<Path>;
  findAllPaths(startId: string, endId: string, options?: PathOptions): Promise<Path[]>;

  // Graph Algorithms
  calculatePageRank(options?: PageRankOptions): Promise<Map<string, number>>;
  detectCommunities(algorithm: 'louvain' | 'label-propagation'): Promise<Community[]>;
  findCentralNodes(metric: 'degree' | 'betweenness' | 'closeness'): Promise<Node[]>;

  // Subgraph Operations
  getSubgraph(nodeIds: string[], options?: SubgraphOptions): Promise<Graph>;
  expandGraph(nodeId: string, depth: number): Promise<Graph>;

  // Analysis
  getGraphStatistics(): Promise<GraphStats>;
  findCycles(maxLength?: number): Promise<Cycle[]>;
}
```

#### RelationshipRepository

For relationship management:

```typescript
@Injectable()
export class RelationshipRepository {
  // CRUD Operations
  createRelationship(data: CreateRelationshipData): Promise<RelationshipResult>;
  updateRelationship(id: string, updates: Partial<Relationship>): Promise<RelationshipResult>;
  deleteRelationship(id: string): Promise<boolean>;

  // Query Operations
  findRelationships(options: RelationshipQueryOptions): Promise<RelationshipResult[]>;
  findByNodes(sourceId: string, targetId?: string): Promise<RelationshipResult[]>;
  findByType(type: string, options?: QueryOptions): Promise<RelationshipResult[]>;

  // Batch Operations
  batchCreate(operations: BatchRelationshipOperation[]): Promise<RelationshipResult[]>;
  batchUpdate(operations: BatchRelationshipOperation[]): Promise<RelationshipResult[]>;
  batchDelete(ids: string[]): Promise<boolean>;

  // Analysis
  getRelationshipTypes(): Promise<string[]>;
  countByType(type?: string): Promise<number>;
}
```

### 4. Query Builder

Type-safe query construction:

```typescript
const queryBuilder = neogmaService.createQueryBuilder();

const query = queryBuilder.match('(u:User)').where('u.age > $minAge', { minAge: 18 }).andWhere('u.city = $city', { city: 'New York' }).with('u').match('(u)-[:FRIEND]->(friend:User)').return('u, collect(friend) as friends').orderBy('u.name', 'ASC').limit(10).build();

const result = await neogmaService.run(query.cypher, query.params);
```

### 5. Multi-Tenancy Support

Complete tenant isolation:

```typescript
// Module Configuration
@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot({
      tenantResolver: (context) => context.tenantId,
      connectionFactory: (tenantId) => ({
        uri: `bolt://tenant-${tenantId}.neo4j.local:7687`,
        username: 'neo4j',
        password: getTenantPassword(tenantId),
      }),
    }),
  ],
})
export class AppModule {}

// Service Usage
@Injectable()
export class TenantAwareService {
  constructor(private readonly multiTenantService: MultiTenantNeo4jService, private readonly tenantContext: TenantContextService) {}

  async getUsersForTenant(): Promise<User[]> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const session = await this.multiTenantService.getSession(tenantId);
    // Queries automatically routed to tenant database
  }
}
```

## 📁 Module Configuration

### Basic Configuration

```typescript
@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
      database: 'neo4j', // Optional: specific database

      // Neogma Configuration
      neogma: {
        logger: console.log, // Optional: logging
      },

      // Connection Pool
      maxConnectionPoolSize: 100,
      connectionAcquisitionTimeout: 60000,

      // Performance
      disableLosslessIntegers: true, // Better performance for regular numbers

      // Security
      encrypted: true,
      trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES',
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
@Module({
  imports: [
    Neo4jModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('NEO4J_URI'),
        username: config.get('NEO4J_USERNAME'),
        password: config.get('NEO4J_PASSWORD'),
        database: config.get('NEO4J_DATABASE', 'neo4j'),
      }),
    }),
  ],
})
export class AppModule {}
```

## 🔧 Dependency Injection

### Service Injection

```typescript
@Injectable()
export class MyService {
  constructor(
    // Inject Neogma Service (Recommended)
    @InjectNeogma() private readonly neogmaService: NeogmaService,

    // Alternative injection tokens
    @InjectNeo4jDriver() private readonly driver: Driver,
    @InjectNeo4jSession() private readonly session: Session,
    @InjectNeo4jConnection() private readonly connection: NeogmaConnectionService
  ) {}
}
```

## 📊 Type Definitions

### Core Types

```typescript
// From types/neogma-types.ts
interface NeogmaEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

interface FindOptions<T> {
  where?: Partial<T>;
  orderBy?: Array<{ [K in keyof T]?: 'ASC' | 'DESC' }>;
  limit?: number;
  skip?: number;
}

interface QueryResult {
  records: Neo4jRecord[];
  summary: ResultSummary;
  metrics?: QueryMetrics;
}

interface NeogmaMetrics {
  totalQueries: number;
  averageQueryTime: number;
  activeConnections: number;
  errorRate: number;
}
```

## 🚀 Usage Examples

### Basic CRUD Operations

```typescript
@Injectable()
export class UserService {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {
    // Register Neogma model
    this.neogma.registerModel('User', UserModel);
  }

  // Create
  async createUser(data: CreateUserDto): Promise<User> {
    return this.neogma.create('User', data);
  }

  // Read
  async getUser(id: string): Promise<User | null> {
    return this.neogma.findById('User', id);
  }

  // Update
  async updateUser(id: string, updates: UpdateUserDto): Promise<User | null> {
    return this.neogma.update('User', id, updates);
  }

  // Delete
  async deleteUser(id: string): Promise<boolean> {
    return this.neogma.delete('User', id, true); // detach relationships
  }

  // List with filters
  async listUsers(filters?: UserFilters): Promise<User[]> {
    return this.neogma.findMany('User', {
      where: filters,
      orderBy: [{ createdAt: 'DESC' }],
      limit: 20,
    });
  }
}
```

### Repository Pattern (RECOMMENDED)

```typescript
@Repository(() => User)
@Injectable()
export class UserRepository extends BaseRepositoryService<User> {
  constructor(@InjectNeogma() neogmaService: NeogmaService) {
    super();
  }

  // Methods auto-generated by @Repository decorator:
  // findById, findAll, create, update, delete, count, exists

  // Add custom methods
  async findActiveUsers(): Promise<User[]> {
    return this.findAll({ where: { isActive: true } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll({ where: { email } });
    return users[0] || null;
  }
}
```

### Advanced QueryBuilder Usage (RECOMMENDED)

```typescript
@Injectable()
export class AnalyticsService {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {}

  async getMostConnectedUsers(limit = 10): Promise<any[]> {
    const queryBuilder = this.neogma.createQueryBuilder();

    const query = queryBuilder.match('(u:User)').optionalMatch('(u)-[r:FRIEND]->()').return('u, count(r) as friendCount').orderBy('friendCount', 'DESC').limit(limit).build();

    const result = await this.neogma.run(query.cypher, query.params);
    return result.records.map((record) => ({
      user: record.get('u').properties,
      friendCount: record.get('friendCount').toInt(),
    }));
  }

  async getRecommendations(userId: string): Promise<User[]> {
    const queryBuilder = this.neogma.createQueryBuilder();

    const query = queryBuilder.match('(u:User)').where('u.id = $userId', { userId }).match('(u)-[:FRIEND]->(friend)-[:FRIEND]->(recommendation:User)').where('NOT (u)-[:FRIEND]->(recommendation)').andWhere('recommendation.id <> $userId', { userId }).return('DISTINCT recommendation').limit(10).build();

    const result = await this.neogma.run(query.cypher, query.params);
    return result.records.map((r) => r.get('recommendation').properties);
  }
}
```

### Graph Operations

```typescript
@Injectable()
export class GraphAnalysisService {
  constructor(private readonly graphRepo: GraphRepository<User>) {}

  async findInfluencers(): Promise<User[]> {
    // Find users with high centrality
    return this.graphRepo.findCentralNodes('betweenness');
  }

  async findCommunities(): Promise<Community[]> {
    // Detect communities using Louvain algorithm
    return this.graphRepo.detectCommunities('louvain');
  }

  async findConnectionPath(userId1: string, userId2: string): Promise<Path> {
    // Find shortest path between two users
    return this.graphRepo.findShortestPath(userId1, userId2, {
      relationshipType: 'FRIEND',
      maxDepth: 6,
    });
  }
}
```

## 🛡️ Security Best Practices

### Parameter Sanitization

Always use QueryBuilder with parameters (RECOMMENDED):

```typescript
// ✅ EXCELLENT - Using QueryBuilder (RECOMMENDED)
const queryBuilder = neogma.createQueryBuilder();
const query = queryBuilder.match('(u:User)').where('u.email = $email', { email: userInput }).return('u').build();
await neogma.run(query.cypher, query.params);

// ✅ ACCEPTABLE - Using raw Cypher with parameters
const query = 'MATCH (u:User {email: $email}) RETURN u';
await neogma.run(query, { email: userInput });

// ❌ BAD - String interpolation (Cypher injection risk)
const query = `MATCH (u:User {email: '${userInput}'}) RETURN u`;
```

### Use Security Decorators

```typescript
@Injectable()
export class SecureUserService {
  @Safe({ validateInput: true, sanitizeOutput: true })
  @Authorize({ roles: ['admin', 'user'] })
  @ValidateInput({ schema: UpdateUserSchema })
  @AuditLog({ level: 'info', includeResult: false })
  async updateUserProfile(userId: string, data: UpdateUserDto): Promise<User> {
    // Automatically protected with multiple security layers
    return this.neogma.update('User', userId, data);
  }
}
```

### Transaction Management

```typescript
@Injectable()
export class BankingService {
  @Transactional() // Ensures atomicity
  async transferMoney(fromId: string, toId: string, amount: number): Promise<void> {
    // All operations in single transaction
    const from = await this.neogma.findById('Account', fromId);
    const to = await this.neogma.findById('Account', toId);

    if (from.balance < amount) {
      throw new Error('Insufficient funds');
    }

    await this.neogma.update('Account', fromId, {
      balance: from.balance - amount,
    });
    await this.neogma.update('Account', toId, {
      balance: to.balance + amount,
    });
    // Automatic commit on success, rollback on error
  }
}
```

## 🏢 Multi-Tenancy Patterns

### Database-per-Tenant

```typescript
@Module({
  imports: [
    MultiTenantNeo4jModule.forRoot({
      tenantResolver: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return request.headers['x-tenant-id'];
      },
      connectionFactory: (tenantId: string) => ({
        uri: `bolt://neo4j-${tenantId}.internal:7687`,
        username: 'neo4j',
        password: getSecretForTenant(tenantId),
      }),
      connectionPoolSize: 50,
      cacheTTL: 3600000, // 1 hour
    }),
  ],
})
export class AppModule {}
```

### Schema-per-Tenant

```typescript
@Injectable()
export class TenantAwareRepository {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService, private readonly tenantContext: TenantContextService) {}

  async findUsers(): Promise<User[]> {
    const tenantId = this.tenantContext.getCurrentTenant();
    const query = `
      MATCH (u:User:${tenantId})  // Tenant label
      RETURN u
    `;
    return this.neogma.run(query);
  }
}
```

## 📈 Performance Optimization

### Connection Pooling

```typescript
Neo4jModule.forRoot({
  // Connection pool settings
  maxConnectionPoolSize: 100,
  connectionAcquisitionTimeout: 60000,
  maxTransactionRetryTime: 30000,

  // Performance optimizations
  disableLosslessIntegers: true, // Use native JS numbers
  logging: {
    level: 'warn', // Reduce logging overhead
    logger: (level, message) => {
      if (level === 'error') console.error(message);
    },
  },
});
```

### Query Optimization

```typescript
@Injectable()
export class OptimizedService {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {}

  // Use indexes with QueryBuilder
  @CypherQuery({
    cacheTTL: 3600000, // Cache for 1 hour
  })
  async findByEmail(email: string) {
    const queryBuilder = this.neogma.createQueryBuilder();

    const query = queryBuilder.match('(u:User)').where('u.email = $email', { email }).return('u').build();

    return this.neogma.run(query.cypher, query.params);
  }

  // Batch operations with QueryBuilder
  async batchCreateUsers(users: CreateUserDto[]): Promise<void> {
    const queryBuilder = this.neogma.createQueryBuilder();

    const query = queryBuilder.unwind('$users as userData').create('(u:User)').set('u = userData').build();

    await this.neogma.run(query.cypher, { users });
  }

  // Complex queries with QueryBuilder (RECOMMENDED)
  async complexQuery() {
    const queryBuilder = this.neogma.createQueryBuilder();

    return queryBuilder
      .match('(u:User)')
      .where('u.age > $minAge', { minAge: 18 })
      .with('u')
      .limit(100) // Always limit results
      .build();
  }
}
```

### Metrics Monitoring

```typescript
@Injectable()
export class MonitoringService {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService, private readonly metrics: NeogmaMetricsService) {}

  async getHealthStatus() {
    const metrics = this.metrics.getMetrics();

    return {
      healthy: metrics.errorRate < 0.01,
      metrics: {
        queries: metrics.totalQueries,
        avgQueryTime: metrics.averageQueryTime,
        activeConnections: metrics.activeConnections,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
      },
    };
  }
}
```

## 🧪 Testing

### Unit Testing

```typescript
describe('UserService', () => {
  let service: UserService;
  let neogmaService: jest.Mocked<NeogmaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: NEOGMA_TOKEN,
          useValue: createMockNeogmaService(),
        },
      ],
    }).compile();

    service = module.get(UserService);
    neogmaService = module.get(NEOGMA_TOKEN);
  });

  it('should create user', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    const expectedUser = { id: '123', ...userData };

    neogmaService.create.mockResolvedValue(expectedUser);

    const result = await service.createUser(userData);

    expect(result).toEqual(expectedUser);
    expect(neogmaService.create).toHaveBeenCalledWith('User', userData);
  });
});
```

### Integration Testing

```typescript
describe('UserService (Integration)', () => {
  let app: INestApplication;
  let neogmaService: NeogmaService;

  beforeAll(async () => {
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

    app = module.createNestApplication();
    await app.init();

    neogmaService = module.get(NeogmaService);
  });

  afterAll(async () => {
    // Clean up test data
    await neogmaService.run('MATCH (n:TestUser) DETACH DELETE n');
    await app.close();
  });

  it('should perform CRUD operations', async () => {
    // Test with real database
  });
});
```

## 🚨 Common Issues and Solutions

### Issue: Connection Pool Exhaustion

```typescript
// Solution: Increase pool size and add timeout
Neo4jModule.forRoot({
  maxConnectionPoolSize: 200,
  connectionAcquisitionTimeout: 120000,
});
```

### Issue: Integer Overflow

```typescript
// Solution: Use disableLosslessIntegers for regular numbers
Neo4jModule.forRoot({
  disableLosslessIntegers: true,
});
```

### Issue: Transaction Deadlocks

```typescript
// Solution: Use proper transaction management
@Transactional({
  maxRetries: 3,
  retryDelay: 1000
})
async complexOperation() {}
```

### Issue: Slow Queries

```typescript
// Solution: Add indexes and use query optimization
@Neo4jEntity('User')
class User {
  @Neo4jProp()
  @Index() // Add index
  email: string;
}
```

## 📚 Additional Resources

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Neogma Documentation](https://github.com/danstarns/neogma)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/)

## 🔄 Migration Guide

### From Raw Neo4j Driver to QueryBuilder

```typescript
// Before (Raw Driver)
const session = driver.session();
const result = await session.run('MATCH (u:User) RETURN u');
await session.close();

// After (QueryBuilder - RECOMMENDED)
const queryBuilder = neogmaService.createQueryBuilder();
const query = queryBuilder.match('(u:User)').return('u').build();
const result = await neogmaService.run(query.cypher, query.params);

// Or (Neogma Service for simple CRUD)
const users = await neogmaService.findMany('User');
```

### From Manual Repositories to @Repository

```typescript
// Before (Manual)
@Injectable()
export class UserRepository {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  async findOne(id: string) {
    const result = await this.neo4j.run('MATCH (u:User {id: $id}) RETURN u', { id });
    return result.records[0]?.get('u').properties;
  }
}

// After (@Repository) - RECOMMENDED PATTERN
@Repository(() => User)
@Injectable()
export class UserRepository extends BaseRepositoryService<User> {
  constructor(@InjectNeogma() neogmaService: NeogmaService) {
    super();
  }
  // findById, findAll, create, update, delete, count, exists auto-generated
}
```

## 📋 Checklist for Implementation

- [ ] Install @hive-academy/nestjs-neo4j package
- [ ] Configure Neo4jModule in AppModule
- [ ] Create entity classes with decorators
- [ ] Register Neogma models in services
- [ ] Implement repositories with @Repository
- [ ] Add security decorators where needed
- [ ] Set up constraint decorators on entities
- [ ] Configure multi-tenancy if required
- [ ] Add transaction decorators for critical operations
- [ ] Implement metrics monitoring
- [ ] Write unit and integration tests
- [ ] Set up proper indexes for performance

## 🎯 Best Practices Summary

1. **ALWAYS use @Repository decorator** - This is the RECOMMENDED pattern for all repository services
2. **Extend BaseRepositoryService<T>** - Provides TypeScript support for auto-generated methods
3. **PREFER QueryBuilder over raw Cypher** - Use `neogmaService.createQueryBuilder()` for type-safe queries
4. **Use parameters in queries** - Never concatenate user input into Cypher (QueryBuilder handles this automatically)
5. **Apply security decorators** - Layer security with @Safe, @Authorize, etc.
6. **Use transactions** - Apply @Transactional for multi-step operations
7. **Index frequently queried properties** - Use constraint decorators
8. **Monitor metrics** - Track performance with NeogmaMetricsService
9. **Test thoroughly** - Both unit and integration tests
10. **Handle errors gracefully** - Use try-catch and proper error messages

### 🎯 RECOMMENDED REPOSITORY PATTERN:

```typescript
@Repository(() => EntityType)
@Injectable()
export class EntityRepository extends BaseRepositoryService<EntityType> {
  constructor(@InjectNeogma() neogmaService: NeogmaService) {
    super();
  }
  // Auto-generated: findById, findAll, create, update, delete, count, exists

  // Add custom business methods here
}
```
