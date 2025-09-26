# @hive-academy/nestjs-neo4j

[![npm version](https://badge.fury.io/js/%40hive-academy%2Fnestjs-neo4j.svg)](https://badge.fury.io/js/%40hive-academy%2Fnestjs-neo4j)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0+-red.svg)](https://nestjs.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.0+-green.svg)](https://neo4j.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Enterprise-grade Neo4j integration for NestJS with revolutionary Entity CRUD decorators, advanced security, and multi-tenancy.**

A comprehensive, production-ready Neo4j library for NestJS applications that provides:

- ✨ **Entity CRUD Decorators** - Revolutionary 7-decorator system (@FindOne, @FindMany, @CreateEntity, @UpdateEntity, @DeleteEntity, @CountEntities, @ExistsEntity) 
- 🏗️ **Type-Safe Query Builder** - Enterprise Neo4jQueryBuilder with full TypeScript support and fluent API
- 🔧 **Specialized Repositories** - GraphRepository for graph operations, RelationshipRepository for relationship management
- 🔒 **Enterprise Security** - 5-decorator security layer with authorization, validation, audit logging, rate limiting, and encryption
- 🏢 **Multi-Tenancy** - Complete tenant isolation with 6 specialized decorators and automatic database routing
- 🚀 **Performance** - Smart caching strategies, connection pooling, query optimization, and configurable retry mechanisms
- 🎯 **Developer Experience** - Zero-config defaults, intuitive decorators, comprehensive examples

## Table of Contents

- [Quick Start](#quick-start)
- [Core Features](#core-features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Security & Validation](#security--validation)
- [Multi-Tenancy](#multi-tenancy)
- [Repository Patterns](#repository-patterns)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## Quick Start

### 1. Install

```bash
npm install @hive-academy/nestjs-neo4j
```

### 2. Configure Module

```typescript
import { Module } from '@nestjs/common';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'your-password'
    })
  ]
})
export class AppModule {}
```

### 3. Create Your First Service with Entity CRUD Decorators

```typescript
import { Injectable } from '@nestjs/common';
import { 
  InjectNeo4j, Neo4jService, 
  FindOne, FindMany, CreateEntity, UpdateEntity, DeleteEntity, CountEntities, ExistsEntity,
  FindOptions 
} from '@hive-academy/nestjs-neo4j';

@Injectable()
export class UserService {
  constructor(@InjectNeo4j() private readonly neo4j: Neo4jService) {}

  // @Repository decorator eliminates repository boilerplate!
  // Auto-generates: findOne, findMany, create, update, delete, count, exists
  
  async findUserById(id: string): Promise<User | null> {
    // Uses auto-generated this.findOne() method
    // Auto-generated: MATCH (n:User {id: $id}) RETURN n LIMIT 1
    // Includes: 10m caching, parameter validation, type safety
    return this.findOne(id);
  }

  async findUsers(options?: FindOptions<User>): Promise<User[]> {
    // Uses auto-generated this.findMany() method
    // Auto-generated with filtering, ordering, pagination
    // Supports: WHERE clauses, ORDER BY, LIMIT/SKIP
    return this.findMany(options);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // Uses auto-generated this.create() method with business logic
    // Auto-generated: CREATE (n:User $data) RETURN n
    // Includes: Auto ID, timestamps, validation, 3 retries
    return this.create({
      ...userData,
      isActive: true
    });
  }

  async updateUser(id: string, updates: UpdateUserDto): Promise<User> {
    // Uses auto-generated this.update() method
    // Auto-generated: MATCH (n:User {id: $id}) SET n += $updates RETURN n
    // Includes: Auto updatedAt timestamp, parameter validation
    return this.update(id, updates);
  }

  async deleteUser(id: string): Promise<boolean> {
    // Uses auto-generated this.delete() method
    // Auto-generated: MATCH (n:User {id: $id}) DETACH DELETE n
    return this.delete(id);
  }
    // Includes: Relationship cleanup, boolean success result
  }

  @CountEntities(() => User, { cache: '2m' })
  async countUsers(where?: Partial<User>): Promise<number> {
    // Auto-generated: MATCH (n:User) WHERE ... RETURN count(n)
    // Includes: Filtering support, performance caching
  }

  @ExistsEntity(() => User, { cache: '5m' })
  async userExists(id: string): Promise<boolean> {
    // Auto-generated: MATCH (n:User {id: $id}) RETURN count(n) > 0
    // Includes: Optimized existence check, caching
  }
}
```

### 4. Define Entities with Decorators

```typescript
import { 
  Neo4jEntity, 
  Neo4jProp, 
  Neo4jRelationship,
  Id, 
  CreatedAt,
  Unique,
  Index 
} from '@hive-academy/nestjs-neo4j';

@Neo4jEntity({
  label: 'User',
  constraints: {
    unique: [['email']],
    index: ['name', 'createdAt']
  }
})
export class User {
  @Id()
  id: string;

  @Neo4jProp()
  @Unique()
  email: string;

  @Neo4jProp()
  @Index()
  name: string;

  @Neo4jRelationship({
    type: 'CREATED',
    direction: 'OUT',
    target: () => Post,
    isArray: true
  })
  posts: Post[];

  @CreatedAt()
  createdAt: Date;
}
```

## Core Features

### ✨ Entity CRUD Decorators (REVOLUTIONARY FEATURE)

- **@FindOne(() => Entity)** - Find single entity by ID with intelligent 10m caching and type safety
- **@FindMany(() => Entity)** - Find multiple entities with filtering, ordering, pagination, and 5m caching
- **@CreateEntity(() => Entity)** - Create entity with auto-timestamps, ID generation, and 3 retry attempts
- **@UpdateEntity(() => Entity)** - Update entity with automatic updatedAt timestamps and parameter validation
- **@DeleteEntity(() => Entity)** - Delete entity with optional DETACH DELETE and relationship cleanup
- **@CountEntities(() => Entity)** - Count entities with filtering and 2m performance caching
- **@ExistsEntity(() => Entity)** - Check entity existence with 5m caching and count-based optimization

### 🏗️ Type-Safe Query Builder

- **Neo4jQueryBuilder<T>** - Enterprise-grade query builder with full TypeScript support
- **Fluent API** - Complete Cypher command coverage with IntelliSense support
- **Type Safety** - Property validation, return type preservation, entity type inference
- **Performance** - Automatic parameter binding, query optimization, parameter collision avoidance
- **Integration** - Seamless integration with all Entity CRUD decorators

### 🔧 Specialized Repository Architecture

- **GraphRepository<T>** - Graph algorithms, path finding, centrality analysis, community detection
- **RelationshipRepository<TRel, TSource, TTarget>** - Relationship CRUD, bulk operations, advanced querying
- **Custom Composition** - Combine repositories for complex domain-specific operations
- **BaseRepository ELIMINATED** - Modern architecture eliminates generic base repositories

### 🔒 Enterprise Security (5-Decorator System)

- **@Safe()** - Unified parameter validation, sanitization, and injection prevention
- **@Authorize()** - Role-based access control with resource permissions and tenant isolation
- **@ValidateInput()** - Schema validation with custom sanitization and injection prevention
- **@AuditLog()** - Comprehensive audit trails with 7-year retention and compliance support
- **@RateLimit()** - API protection with multiple strategies (fixed-window, sliding-window, token-bucket)
- **@EncryptSensitive()** - Field-level encryption with AES-256-GCM and automatic key rotation

### 🏢 Multi-Tenancy (6-Decorator Enterprise System)

- **@TenantIsolated()** - Automatic tenant routing and complete data isolation
- **@RequireTenantFeatures()** - Feature-based access control per tenant subscription
- **@ValidateTenantLimits()** - Subscription limit enforcement and resource quotas
- **@MultiTenantQuery()** - Complete query execution with tenant context management
- **@TenantAdminOperation()** - Admin operations with tenant bypass capabilities
- **@CollectTenantMetrics()** - Automatic per-tenant usage analytics and monitoring

### 🚀 Performance & Enterprise Features

- **Smart Caching** - Intelligent caching strategies with automatic cache invalidation
- **Connection Pooling** - Optimized per-tenant connection pool management
- **Health Monitoring** - Comprehensive health checks and metrics collection
- **Transaction Management** - Declarative transaction handling with rollback support
- **Database-per-Tenant** - Complete tenant isolation with automatic database creation
- **Prometheus Integration** - Enterprise monitoring and alerting capabilities

## Installation

```bash
# npm
npm install @hive-academy/nestjs-neo4j

# yarn
yarn add @hive-academy/nestjs-neo4j

# pnpm
pnpm add @hive-academy/nestjs-neo4j
```

### Peer Dependencies

```bash
npm install neo4j-driver @nestjs/common @nestjs/core reflect-metadata
```

## Basic Usage

### Module Configuration

#### Simple Configuration

```typescript
@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password'
    })
  ]
})
export class AppModule {}
```

#### Advanced Configuration

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
        database: config.get('NEO4J_DATABASE'),
        config: {
          maxConnectionPoolSize: 100,
          connectionAcquisitionTimeout: 30000,
          encrypted: true
        },
        health: { enabled: true, timeout: 5000 },
        metrics: { enabled: true, prometheusEnabled: true }
      })
    })
  ]
})
export class AppModule {}
```

### Service Injection

```typescript
import { Injectable } from '@nestjs/common';
import { InjectNeo4j, Neo4jService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class MyService {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService,
    // Named connection
    @InjectNeo4j('analytics') private readonly analyticsNeo4j: Neo4jService
  ) {}
}
```

## Advanced Features

### @CypherQuery Decorator

The `@CypherQuery` decorator provides intelligent query management with zero configuration:

```typescript
@Injectable()
export class UserService {
  // Auto-detected as READ operation, cached for 5 minutes
  @CypherQuery()
  async findActiveUsers(): Promise<User[]> {
    return 'MATCH (u:User {active: true}) RETURN u';
  }

  // Auto-detected as WRITE operation, no caching, retry on failure
  @CypherQuery()
  async createUser(userData: CreateUserDto): Promise<User> {
    return {
      query: 'CREATE (u:User $userData) RETURN u',
      params: { userData },
      description: 'Create new user',
      tags: ['user', 'creation']
    };
  }

  // Explicit configuration
  @CypherQuery({
    cache: '30m',         // Cache for 30 minutes
    retry: 5,             // Retry up to 5 times
    mode: 'READ',         // Explicit read mode
    safe: true            // Enable additional safety checks
  })
  async getExpensiveAnalytics(): Promise<AnalyticsData> {
    return 'MATCH (u:User) WITH count(u) as total RETURN {total: total}';
  }
}
```

### Entity Definitions

Define type-safe entities with comprehensive mapping:

```typescript
@Neo4jEntity({
  label: 'User',
  additionalLabels: ['Person'],
  idStrategy: 'uuid',
  constraints: {
    unique: [['email'], ['username']],
    index: ['name', 'createdAt'],
    key: ['id']
  }
})
export class User {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp({ 
    validate: (email: string) => /^[^@]+@[^@]+\.[^@]+$/.test(email) 
  })
  @Unique()
  @Index()
  email: string;

  @Neo4jProp({
    transform: {
      toNeo4j: (name: string) => name.toLowerCase(),
      fromNeo4j: (name: string) => name.charAt(0).toUpperCase() + name.slice(1)
    }
  })
  name: string;

  @JsonProperty({ optional: true })
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };

  @Neo4jRelationship({
    type: 'FOLLOWS',
    direction: 'OUT',
    target: () => User,
    isArray: true,
    propertiesType: () => FollowRelationship
  })
  following: User[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt({ optional: true })
  updatedAt?: Date;
}
```

### Transaction Management

```typescript
@Injectable()
export class UserService {
  @Transactional()
  @Safe()
  async transferUserData(fromId: string, toId: string): Promise<void> {
    // All operations run in a single transaction
    await this.neo4j.run('MATCH (from:User {id: $fromId}) SET from.active = false', { fromId });
    await this.neo4j.run('MATCH (to:User {id: $toId}) SET to.lastTransfer = datetime()', { toId });
    // Transaction commits automatically, or rolls back on error
  }
}
```

## Security & Validation

### Authorization

```typescript
@Injectable()
export class AdminService {
  // Role-based access control
  @Authorize({ roles: ['ADMIN', 'SUPER_ADMIN'] })
  @CypherQuery()
  async getAllUsers(): Promise<User[]> {
    return 'MATCH (u:User) RETURN u';
  }

  // Resource-based permissions
  @Authorize({
    resourceAccess: {
      resourceType: 'User',
      actions: ['read', 'write'],
      ownershipCheck: {
        ownerProperty: 'id',
        allowOwnerAccess: true
      }
    }
  })
  async updateUserProfile(userId: string, updates: any): Promise<User> {
    // User can only update their own profile unless they're an admin
  }

  // Custom authorization logic
  @Authorize({
    customAuthorizer: async (context, metadata) => {
      const user = context.user;
      const isBusinessHours = new Date().getHours() >= 9 && new Date().getHours() <= 17;
      return user.role === 'ADMIN' || isBusinessHours;
    }
  })
  async sensitiveOperation(): Promise<void> {
    // Only admins or during business hours
  }
}
```

### Input Validation

```typescript
@Injectable()
export class UserService {
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 13, maximum: 120 }
        },
        required: ['email']
      }
    },
    sanitization: {
      stripHtml: true,
      escapeSpecialChars: true,
      maxStringLength: 1000
    },
    injectionPrevention: {
      enabled: true,
      onDetection: 'throw'
    }
  })
  async createUser(userData: any): Promise<User> {
    // Input is validated and sanitized automatically
  }
}
```

### Audit Logging

```typescript
@Injectable()
export class UserService {
  @AuditLog({
    enabled: true,
    logLevel: 'detailed',
    includeSensitiveData: false,
    customFields: {
      action: 'user_deletion',
      criticality: 'high'
    },
    retentionPeriod: '7y'
  })
  @Authorize({ roles: ['ADMIN'] })
  async deleteUser(userId: string): Promise<void> {
    // All access logged for compliance
  }
}
```

### Rate Limiting

```typescript
@Injectable()
export class ApiService {
  @RateLimit({
    windowMs: 60000,        // 1 minute window
    maxRequests: 100,       // 100 requests per minute
    keyGenerator: (ctx) => `user:${ctx.user.id}`,
    skipSuccessfulRequests: false
  })
  async searchUsers(term: string): Promise<User[]> {
    // Rate limited per user
  }

  // Dynamic rate limits based on user role
  @RateLimit({
    windowMs: 3600000, // 1 hour
    maxRequests: (ctx) => ctx.user.role === 'PREMIUM' ? 1000 : 100
  })
  async bulkOperation(data: any[]): Promise<void> {
    // Higher limits for premium users
  }
}
```

### Data Encryption

```typescript
@Injectable()
export class SensitiveDataService {
  @EncryptSensitive({
    fields: ['ssn', 'creditCard', 'bankAccount'],
    algorithm: 'aes-256-gcm',
    keyRotation: { enabled: true, rotationIntervalDays: 90 },
    auditAccess: true
  })
  @Authorize({ permissions: ['sensitive-data:write'] })
  async storeSensitiveData(data: SensitiveData): Promise<void> {
    // Sensitive fields encrypted automatically
  }

  @EncryptSensitive({
    fields: ['ssn', 'creditCard'],
    decryptOnRead: true,
    maskPartially: {
      ssn: '***-**-####',
      creditCard: '****-****-****-####'
    }
  })
  @AuditLog({ enabled: true, logLevel: 'full' })
  async getSensitiveData(userId: string): Promise<SensitiveData> {
    // Data decrypted and partially masked
  }
}
```

## Multi-Tenancy

### Tenant Isolation

```typescript
@Injectable()
export class TenantUserService {
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    trackAnalytics: true,
    validateLimits: true
  })
  @CypherQuery({ cache: '10m' })
  async getTenantUsers(): Promise<User[]> {
    // Automatically filtered by tenant context
    return 'MATCH (u:User) RETURN u';
  }

  @TenantIsolated({ enabled: true })
  @Authorize({
    tenantIsolation: {
      enabled: true,
      tenantProperty: 'tenantId',
      autoInject: true // Automatically add WHERE u.tenantId = $tenantId
    }
  })
  async createTenantUser(userData: CreateUserDto): Promise<User> {
    // Tenant ID automatically injected
  }
}
```

### Cross-Tenant Operations

```typescript
@Injectable()
export class SuperAdminService {
  @Authorize({
    roles: ['SUPER_ADMIN'],
    permissions: ['cross-tenant:read']
  })
  @AuditLog({
    enabled: true,
    customFields: { crossTenant: true, riskLevel: 'high' }
  })
  async getCrossTenantAnalytics(): Promise<TenantAnalytics[]> {
    return this.neo4j.run(`
      MATCH (u:User)
      WITH u.tenantId as tenant, count(u) as userCount
      RETURN tenant, userCount
    `);
  }
}
```

## Repository Patterns

### Base Repository

```typescript
@Repository()
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService, 'User');
  }

  // Inherits: findById, findMany, create, update, delete, etc.

  @Safe()
  async findByEmail(email: string): Promise<User | null> {
    const users = await this.query(
      'MATCH (u:User {email: $email}) RETURN u',
      { email }
    );
    return users[0] || null;
  }

  @CypherQuery({ cache: '15m' })
  async findActiveUsers(limit: number = 50): Promise<User[]> {
    return this.query(
      'MATCH (u:User {active: true}) RETURN u ORDER BY u.createdAt DESC LIMIT $limit',
      { limit }
    );
  }
}
```

### Graph Repository

```typescript
@Repository()
@Injectable()
export class SocialGraphRepository extends GraphRepository {
  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService);
  }

  @Transactional()
  async followUser(followerId: string, followeeId: string): Promise<boolean> {
    const result = await this.query(`
      MATCH (follower:User {id: $followerId})
      MATCH (followee:User {id: $followeeId})
      WHERE NOT (follower)-[:FOLLOWS]->(followee)
      CREATE (follower)-[r:FOLLOWS {followedAt: datetime()}]->(followee)
      RETURN count(r) > 0 as success
    `, { followerId, followeeId });

    return result[0]?.success || false;
  }

  @CypherQuery({ cache: '30m' })
  async getFollowRecommendations(userId: string): Promise<User[]> {
    return this.query(`
      MATCH (u:User {id: $userId})-[:FOLLOWS]->()-[:FOLLOWS]->(rec:User)
      WHERE NOT (u)-[:FOLLOWS]->(rec) AND u <> rec
      RETURN rec, count(*) as score
      ORDER BY score DESC
      LIMIT 10
    `, { userId });
  }
}
```

### Custom Repository Composition

```typescript
@Injectable()
export class UserSocialService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly socialRepo: SocialGraphRepository
  ) {}

  async getCompleteUserProfile(userId: string): Promise<CompleteProfile> {
    const [user, followers, following, recommendations] = await Promise.all([
      this.userRepo.findById(userId),
      this.socialRepo.getFollowers(userId),
      this.socialRepo.getFollowing(userId),
      this.socialRepo.getFollowRecommendations(userId)
    ]);

    return { user, followers, following, recommendations };
  }
}
```

## Examples

The library includes comprehensive examples in the `/examples` directory:

- **[01-basic-usage](./src/lib/examples/01-basic-usage/)** - Simple service setup and basic queries
- **[02-entities-and-relationships](./src/lib/examples/02-entities-and-relationships/)** - Complete entity modeling
- **[03-advanced-decorators](./src/lib/examples/03-advanced-decorators/)** - @CypherQuery advanced features
- **[04-security-and-validation](./src/lib/examples/04-security-and-validation/)** - All security decorators
- **[05-repository-patterns](./src/lib/examples/05-repository-patterns/)** - Repository implementations
- **[06-multi-tenancy](./src/lib/examples/06-multi-tenancy/)** - Tenant isolation patterns
- **[07-constraints-and-schema](./src/lib/examples/07-constraints-and-schema/)** - Schema management
- **[08-real-world-scenarios](./src/lib/examples/08-real-world-scenarios/)** - Production use cases

## API Reference

### Core Decorators

#### @Safe(config?: SafeConfig)

Unified safety decorator for parameter validation, sanitization, and injection prevention.

```typescript
interface SafeConfig {
  strict?: boolean;              // Enable strict validation (default: true)
  log?: boolean;                 // Debug logging (default: false)
  rules?: SafeValidationRules;   // Validation rules
  transforms?: SafeTransforms;   // Neo4j transformations
  customValidators?: CustomValidator[];
}
```

#### @CypherQuery(config?: CypherQueryConfig)

Intelligent query decorator with smart defaults and caching.

```typescript
interface CypherQueryConfig {
  cache?: string | boolean;      // Cache duration ('5m', '1h') or boolean
  retry?: number;               // Retry attempts (auto-detected)
  mode?: 'READ' | 'WRITE';      // Access mode (auto-detected)
  safe?: boolean;               // Enable safety validation
  advanced?: AdvancedOptions;   // Advanced configuration
}
```

#### @Authorize(config: AuthorizeConfig)

Role-based access control and resource permissions.

#### @ValidateInput(config: ValidateInputConfig)

Schema validation and input sanitization.

#### @AuditLog(config: AuditLogConfig)

Comprehensive audit logging for compliance.

#### @RateLimit(config: RateLimitConfig)

API rate limiting and throttling.

#### @EncryptSensitive(config: EncryptSensitiveConfig)

Automatic data encryption for sensitive fields.

#### @TenantIsolated(config: TenantIsolationConfig)

Multi-tenant data isolation and routing.

### Entity Decorators

#### @Neo4jEntity(config: Neo4jEntityConfig)

Define Neo4j entities with labels and constraints.

#### @Neo4jProp(config?: Neo4jPropertyConfig)

Map properties with validation and transformation.

#### @Neo4jRelationship(config: Neo4jRelationshipConfig)

Define typed relationships between entities.

#### Constraint Decorators

- `@Index()` - Create database index
- `@Unique()` - Unique constraint
- `@NotNull()` - Not null constraint
- `@NodeKey()` - Node key constraint

### Repository Classes (MODERNIZED ARCHITECTURE)

#### GraphRepository<T>

Specialized for graph operations including:
- Graph traversals (findNeighbors, findWithinDistance)
- Path finding (findShortestPath, findAllPaths)
- Centrality analysis (calculateDegreeCentrality)
- Community detection (findConnectedComponents)
- Advanced pattern matching (matchPattern)

#### RelationshipRepository<TRel, TSource, TTarget>

Focused on relationship management including:
- Relationship CRUD operations
- Bulk relationship operations
- Advanced relationship querying
- Type-safe relationship handling

**Note:** BaseRepository has been eliminated in favor of Entity CRUD decorators and specialized repositories.

## Best Practices

### Security

1. **Always use @Safe**: Apply to all methods that accept parameters
2. **Principle of Least Privilege**: Grant minimal required permissions
3. **Audit Critical Operations**: Log all admin and sensitive actions
4. **Rate Limit Public APIs**: Protect against abuse
5. **Encrypt Sensitive Data**: Use @EncryptSensitive for PII

### Performance

1. **Use Caching Wisely**: Cache read operations, avoid for writes
2. **Optimize Queries**: Use indexes, limit results, avoid cartesian products
3. **Batch Operations**: Use bulk operations for large datasets
4. **Connection Pooling**: Configure appropriate pool sizes
5. **Monitor Metrics**: Track query performance and connection health

### Code Organization

1. **Entity CRUD Decorators**: Use decorators for basic CRUD operations instead of repositories
2. **Specialized Repositories**: Use GraphRepository and RelationshipRepository for complex operations
3. **Service Layer**: Combine Entity CRUD decorators with business logic
4. **Entity Definitions**: Define clear entity boundaries with schema decorators
5. **Error Handling**: Use structured error handling with type safety
6. **Testing**: Write integration tests with real Neo4j instances

### Multi-Tenancy

1. **Tenant Isolation**: Always use @TenantIsolated for tenant data
2. **Validate Access**: Check tenant permissions before operations
3. **Resource Limits**: Implement per-tenant quotas
4. **Analytics**: Track per-tenant usage patterns
5. **Data Segregation**: Ensure complete data isolation

## Migration Guide

### From Version 1.x to 2.x (MAJOR ARCHITECTURAL CHANGES)

The library has undergone a complete architectural modernization with revolutionary Entity CRUD decorators:

#### Revolutionary New Features

- **Entity CRUD Decorators**: 7-decorator system (@FindOne, @FindMany, @CreateEntity, @UpdateEntity, @DeleteEntity, @CountEntities, @ExistsEntity)
- **Type-Safe Query Builder**: Enterprise Neo4jQueryBuilder with full TypeScript support
- **Specialized Repositories**: GraphRepository and RelationshipRepository replace generic BaseRepository
- **Enhanced Security**: 5-decorator security system with enterprise features
- **Multi-Tenancy**: 6-decorator tenant isolation system with database-per-tenant architecture

#### Breaking Changes

- **BaseRepository ELIMINATED** - Use Entity CRUD decorators instead
- **Repository Pattern Modernized** - Specialized repositories for graph and relationship operations
- Module configuration API updated with multi-tenant support
- Security decorator API enhanced with enterprise features

#### Migration Steps

1. **Update Dependencies**

   ```bash
   npm install @hive-academy/nestjs-neo4j@latest
   ```

2. **Replace BaseRepository with Entity CRUD Decorators**

   ```typescript
   // ❌ Old: BaseRepository pattern
   export class UserRepository extends BaseRepository<User> {
     async findById(id: string): Promise<User> {
       return this.query('MATCH (u:User {id: $id}) RETURN u', { id });
     }
   }
   
   // ✅ New: Entity CRUD decorators  
   @Injectable()
   export class UserService {
     @FindOne(() => User, { cache: '10m', safe: true })
     async findUserById(id: string): Promise<User | null> {
       // Auto-generated with caching and validation
     }

     @CreateEntity(() => User, { safe: true, retry: 3 })
     async createUser(userData: CreateUserDto): Promise<User> {
       // Auto-generated with timestamps and retries
     }
   }
   ```

3. **Update to Specialized Repositories for Complex Operations**

   ```typescript
   // ✅ New: Use GraphRepository for graph operations
   @Injectable()
   export class UserGraphService extends GraphRepository<User> {
     constructor(@InjectNeo4j() neo4jService: Neo4jService) {
       super(neo4jService, 'User');
     }

     async findUserNetwork(userId: string): Promise<User[]> {
       return this.findNeighbors(userId, { relationshipTypes: ['FOLLOWS'] });
     }
   }
   ```

4. **Update Module Configuration**

   ```typescript
   // Old
   Neo4jModule.forRoot({ uri, username, password })
   
   // ✅ New: Enhanced configuration with multi-tenancy
   Neo4jModule.forRoot({
     uri: 'bolt://localhost:7687',
     username: 'neo4j', 
     password: 'password',
     config: {
       maxConnectionPoolSize: 50,
       connectionAcquisitionTimeout: 30000
     },
     health: { enabled: true, timeout: 5000 },
     metrics: { enabled: true, prometheusEnabled: true },
     multiTenant: {
       enabled: true,
       databasePerTenant: true,
       tenantResolution: ['header', 'subdomain']
     }
   })
   ```

5. **Migrate to Modern Security Patterns**

   ```typescript
   // ❌ Old: Basic safety
   @Neo4jSafe()
   async oldMethod() {}
   
   // ✅ New: Comprehensive security
   @Authorize({ roles: ['USER'], permissions: ['data:read'] })
   @ValidateInput({ schema: { /* validation schema */ } })
   @AuditLog({ enabled: true, logLevel: 'standard' })
   @FindMany(() => User, { cache: '5m', safe: true })
   async secureMethod() {}
   ```

#### Quick Migration Checklist

- [ ] Replace all BaseRepository usage with Entity CRUD decorators
- [ ] Update complex graph operations to use GraphRepository
- [ ] Update relationship operations to use RelationshipRepository
- [ ] Enhance security with new decorator system
- [ ] Configure multi-tenancy if needed
- [ ] Update module configuration with new options
- [ ] Test all operations with new decorator system
   ```

## Support & Contributing

### Getting Help

- 📚 **Documentation**: [Full documentation](./CLAUDE.md)
- 💬 **Issues**: [GitHub Issues](https://github.com/hive-academy/nestjs-neo4j/issues)
- 🤝 **Discussions**: [GitHub Discussions](https://github.com/hive-academy/nestjs-neo4j/discussions)

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/hive-academy/nestjs-neo4j.git
cd nestjs-neo4j

# Install dependencies
npm install

# Start Neo4j for testing
docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/test neo4j:latest

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the Hive Academy Team**

[Website](https://hive-academy.com) • [GitHub](https://github.com/hive-academy) • [Twitter](https://twitter.com/hive_academy)

</div>
