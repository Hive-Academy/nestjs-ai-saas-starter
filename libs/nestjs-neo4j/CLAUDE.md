# CLAUDE.md - @hive-academy/nestjs-neo4j

This comprehensive guide provides detailed information for AI assistants working with the `@hive-academy/nestjs-neo4j` library. It covers modern architectural patterns, Entity CRUD decorators, implementation strategies, best practices, and troubleshooting guidance.

## 🎯 Library Overview

### Core Purpose

The `@hive-academy/nestjs-neo4j` library is an enterprise-grade Neo4j integration for NestJS applications that provides:

- **@Repository Decorator**: Revolutionary decorator system that auto-generates all CRUD operations (findOne, findMany, create, update, delete, count, exists) for effortless database operations
- **Type-Safe Query Builder**: Enterprise-grade Neo4jQueryBuilder with full TypeScript support and fluent API
- **Specialized Repositories**: GraphRepository for graph operations, RelationshipRepository for relationship management
- **Enterprise Security**: Comprehensive 5-decorator security layer with authorization, validation, audit logging, rate limiting, and encryption
- **Multi-Tenant Architecture**: Complete tenant isolation with 6 specialized decorators and automatic database routing
- **Performance Optimization**: Smart caching strategies, connection pooling, query optimization, and configurable retry mechanisms
- **Developer Experience**: Zero-config defaults, intuitive decorators, and comprehensive error handling

### Architecture Revolution

This library has undergone a complete architectural modernization, moving from generic base repositories to specialized, decorator-driven development:

1. **@Repository Decorator**: Replace traditional repository CRUD with intelligent @Repository decorator that auto-generates all type-safe CRUD operations
2. **Specialized Repositories**: GraphRepository for graph algorithms, RelationshipRepository for relationship management  
3. **Query Builder Integration**: All decorators leverage the powerful Neo4jQueryBuilder for optimal query generation
4. **Security by Design**: Enterprise security decorators provide production-ready protection
5. **Multi-Tenant First**: Built-in tenant isolation with automatic routing and database management
6. **Type Safety Throughout**: Full TypeScript support from decorators to query results
7. **Performance Conscious**: Intelligent caching, retry policies, and connection optimization

## 🏗️ Core Architecture Patterns

### 1. @Repository Decorator System (REVOLUTIONARY FEATURE)

The library's flagship feature is the @Repository decorator that auto-generates complete CRUD operations, eliminating traditional repository boilerplate:

#### Auto-Generated CRUD Methods

The `@Repository(() => Entity)` decorator automatically provides these methods:

- `findById(id: string): Promise<Entity | null>` - Find single entity by ID with 10m caching, type-safe BaseEntity constraint
- `findAll(options?: FindOptions): Promise<Entity[]>` - Find multiple entities with filtering, ordering, pagination, 5m caching  
- `create(data: Partial<Entity>): Promise<Entity>` - Create entity with auto-timestamps, ID generation, 3 retry attempts
- `update(id: string, data: Partial<Entity>): Promise<Entity | null>` - Update entity with automatic updatedAt timestamps, 3 retry attempts
- `delete(id: string): Promise<boolean>` - Delete entity with optional DETACH DELETE, soft delete support
- `count(options?: FindOptions): Promise<number>` - Count entities with filtering, 2m caching for performance
- `exists(id: string): Promise<boolean>` - Check entity existence with 5m caching, count-based optimization

#### Repository Usage Pattern

```typescript
@Injectable()
@Repository(() => User)  // Auto-generates all CRUD methods
export class UserService {
  // All CRUD methods available as this.findById(), this.findAll(), etc.
  
  async getUserById(id: string): Promise<User | null> {
    return this.findById(id);
  }
  
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.create({
      ...userData,
      isActive: true
    });
  }
}

interface FindOptions<T> {
  where?: Partial<T>;                    // Filtering conditions
  orderBy?: Array<{                      // Multi-property ordering
    property: keyof T;
    direction: 'ASC' | 'DESC';
  }>;
  limit?: number;                        // Result limit
  skip?: number;                         // Pagination offset
}
```

### 2. Specialized Repository Architecture (BASEREPOSITORY ELIMINATED)

The library has completely eliminated BaseRepository in favor of specialized repositories:

#### GraphRepository<T> - Graph Operations Specialist

```typescript
@Injectable()
export class GraphRepository<T extends Record<string, any> = Record<string, any>> {
  // Graph Traversal Operations
  findNeighbors(nodeId, options?): Promise<T[]>
  findWithinDistance(nodeId, distance, options?): Promise<Array<{node: T, distance: number}>>
  findCommonNeighbors(nodeId1, nodeId2, options?): Promise<T[]>
  
  // Path Finding with GDS Integration  
  findShortestPath(fromId, toId, options?): Promise<{path, length, weight} | null>
  findAllPaths(fromId, toId, options?): Promise<Array<{path, length}>>
  
  // Centrality and Community Detection
  calculateDegreeCentrality(nodeId, options?): Promise<number>
  findConnectedComponents(options?): Promise<Array<{componentId, nodes}>>
  
  // Advanced Pattern Matching
  matchPattern(pattern: GraphPattern, options?): Promise<Array<Record<string, T>>>
}
```

#### RelationshipRepository<TRel, TSource, TTarget> - Relationship Specialist

```typescript
@Injectable()
export class RelationshipRepository<TRel, TSource, TTarget> {
  // Relationship CRUD Operations
  createRelationship(sourceId, targetId, data?): Promise<TRel>
  findBySource(sourceId, options?): Promise<TRel[]> 
  findByTarget(targetId, options?): Promise<TRel[]>
  findBetween(sourceId, targetId, options?): Promise<TRel[]>
  updateRelationship(id, updates): Promise<TRel>
  deleteRelationship(id, options?): Promise<boolean>
  
  // Advanced Operations
  relationshipExists(sourceId, targetId): Promise<boolean>
  bulkCreateRelationships(relationships): Promise<TRel[]>
  findWithProperties(properties, options?): Promise<TRel[]>
}
```

### 3. Enterprise Security Decorator Ecosystem

#### Security Validation Decorators

- `@Safe()` - Unified parameter validation, sanitization, and injection prevention (PRIMARY)
- `@ValidateInput()` - Schema-based input validation with custom sanitization and injection prevention  
- `@Authorize()` - Role-based access control with resource permissions and tenant isolation
- `@AuditLog()` - Comprehensive audit trails with 7-year retention and compliance support
- `@RateLimit()` - API protection with multiple strategies (fixed-window, sliding-window, token-bucket)
- `@EncryptSensitive()` - Field-level encryption with AES-256-GCM and automatic key rotation

#### Multi-Tenancy Decorators (6 Specialized Decorators)

- `@TenantIsolated()` - Automatic tenant routing and data isolation
- `@RequireTenantFeatures()` - Feature-based access control per tenant
- `@ValidateTenantLimits()` - Subscription limit enforcement
- `@MultiTenantQuery()` - Complete query execution with tenant context
- `@TenantAdminOperation()` - Admin operations with tenant bypass
- `@CollectTenantMetrics()` - Automatic per-tenant usage analytics

#### Query Management Decorators

- `@CypherQuery()` - Intelligent query decorator with auto-detection (READ/WRITE), smart caching, and retry logic
- `@Transactional()` - Declarative transaction management with rollback support

#### Entity Definition Decorators (For Schema Management)

- `@Neo4jEntity()` - Entity mapping with labels, constraints, and index management
- `@Neo4jProp()` - Property mapping with validation, transformation, and type conversion
- `@Neo4jRelationship()` - Typed relationship definitions with bidirectional support
- `@Id()`, `@CreatedAt()`, `@UpdatedAt()` - Special property types with auto-management

#### Constraint Management Decorators

- `@Index()` - Database index creation with performance optimization
- `@Unique()` - Unique constraints with conflict handling
- `@NotNull()` - Not null constraints with validation
- `@NodeKey()` - Node key constraints for entity identification
- `@Validate()` - Custom validation rules with error handling

### 4. Neo4j Query Builder Integration (ENTERPRISE FEATURE)

The Neo4jQueryBuilder provides enterprise-grade, type-safe query construction:

#### Core Query Builder Features

```typescript
// Type-Safe Query Builder with Full TypeScript Support
class Neo4jQueryBuilder<T = Record<string, any>> {
  // Entity-Aware Operations
  match(variable: string, entityType: () => T, properties?: Partial<T>): this
  optionalMatch(variable: string, entityType: () => T, properties?: Partial<T>): this
  
  // Type-Safe Filtering
  where<K extends keyof T>(property: K, operator: string, value: T[K]): this
  and<K extends keyof T>(property: K, operator: string, value: T[K]): this
  or<K extends keyof T>(property: K, operator: string, value: T[K]): this
  whereRaw(condition: string, params?: Record<string, any>): this
  
  // Relationship Operations
  relationship(from: string, type: string, direction: 'IN' | 'OUT' | 'BOTH', 
              to: string, targetType: () => any, properties?: any): this
  
  // Data Modifications
  create(pattern: string, data?: Record<string, any>): this
  merge(pattern: string, data?: Record<string, any>): this
  set(properties: Partial<T>, variable?: string): this
  delete(variables: string[]): this
  detachDelete(variables: string[]): this
  
  // Result Management
  return(expressions: string[]): this
  returnDistinct(expressions: string[]): this
  orderBy<K extends keyof T>(property: K | string, direction?: 'ASC' | 'DESC'): this
  limit(count: number): this
  skip(count: number): this
  
  // Query Building
  build(): { query: string; params: Record<string, any> }
  toString(): string
  clone(): Neo4jQueryBuilder<T>
  reset(): this
}
```

#### Integration with Entity CRUD Decorators

All Entity CRUD decorators leverage the Query Builder for optimal performance and type safety:

```typescript
// Example: @FindMany decorator internal implementation
@FindMany(() => User)
async findUsers(options?: FindOptions<User>): Promise<User[]> {
  // Auto-generated by decorator using Neo4jQueryBuilder
  const builder = new Neo4jQueryBuilder<User>()
    .match('n', () => User)
    .where('n.active', '=', true)  // Type-safe property access
    .orderBy('createdAt', 'DESC')  // IntelliSense support
    .limit(50);
    
  return builder.build(); // Secure parameterized query
}
```

### 5. Service Layer Architecture (MODERNIZED)

#### Core Service Layer

```typescript
// Neo4jService - Core query execution and connection management
export class Neo4jService {
  // Enhanced Query Execution
  run<T>(query: string, params?: Record<string, any>, options?: QueryOptions): Promise<QueryResult<T>>
  runQuery<T>(queryBuilder: Neo4jQueryBuilder<T>, options?: QueryOptions): Promise<QueryResult<T>>
  
  // Transaction Management
  beginTransaction(): Promise<Transaction>
  runInTransaction<T>(operations: TransactionOperation<T>[]): Promise<T[]>
  
  // Connection Health
  getConnectionStatus(): Promise<ConnectionStatus>
  testConnection(): Promise<boolean>
}

// MultiTenantNeo4jService - Enterprise tenant isolation  
export class MultiTenantNeo4jService {
  // Tenant-Aware Query Execution
  executeInTenantContext<T>(tenantId: string, operation: TenantOperation<T>): Promise<T>
  
  // Database Management
  createTenantDatabase(tenantId: string, config?: DatabaseConfig): Promise<void>
  getTenantConnectionPool(tenantId: string): ConnectionPool
  
  // Resource Management
  enforceResourceLimits(tenantId: string, operation: string): Promise<void>
  collectTenantMetrics(tenantId: string): Promise<TenantMetrics>
}

// TenantContextService - Request-scoped tenant resolution
export class TenantContextService {
  // Tenant Resolution
  getCurrentTenantId(): string
  resolveTenantFromRequest(request: Request): Promise<TenantContext>
  
  // Access Validation
  validateTenantAccess(tenantId: string, userId: string): Promise<boolean>
  checkTenantFeatures(tenantId: string, features: string[]): Promise<boolean>
}
```

### 6. Multi-Tenancy Enterprise Architecture

The library provides complete tenant isolation with database-per-tenant architecture:

#### Database-per-Tenant Implementation

```typescript
// Multi-Tenant Service with Complete Isolation
@Injectable()
export class MultiTenantNeo4jService {
  // Tenant Database Management
  async createTenantDatabase(tenantId: string): Promise<void>
  async getTenantDatabase(tenantId: string): Promise<Database>
  async deleteTenantDatabase(tenantId: string): Promise<void>
  
  // Tenant-Scoped Query Execution
  async executeInTenantContext<T>(
    tenantId: string, 
    operation: (neo4j: Neo4jService) => Promise<T>
  ): Promise<T>
  
  // Resource Management
  async enforceResourceLimits(tenantId: string, operationType: string): Promise<void>
  async collectTenantMetrics(tenantId: string): Promise<TenantMetrics>
}

// Tenant Context Resolution
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  // Multi-Strategy Tenant Resolution
  async resolveTenantFromRequest(request: Request): Promise<TenantContext> {
    // Support: header, subdomain, JWT, path, query parameter
  }
  
  // Access Validation
  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean>
  async checkSubscriptionLimits(tenantId: string, operation: string): Promise<boolean>
  async validateTenantFeatures(tenantId: string, features: string[]): Promise<boolean>
}
```

#### Tenant Isolation Decorator Usage

```typescript
@Injectable()
export class TenantUserService {
  // Automatic tenant isolation and validation
  @TenantIsolated({ 
    enabled: true, 
    validateAccess: true, 
    trackAnalytics: true 
  })
  @FindMany(() => User)
  async getTenantUsers(options?: FindOptions<User>): Promise<User[]> {
    // Query automatically scoped to current tenant database
  }
  
  // Multi-tenant entity creation
  @TenantIsolated({ enabled: true })
  @CreateEntity(() => User, { safe: true, retry: 3 })
  async createTenantUser(userData: CreateUserDto): Promise<User> {
    // User automatically assigned to current tenant
  }
  
  // Cross-tenant operations (admin only)
  @Authorize({ roles: ['SUPER_ADMIN'], permissions: ['cross-tenant:read'] })
  @AuditLog({ enabled: true, customFields: { crossTenant: true } })
  async getCrossTenantAnalytics(): Promise<CrossTenantAnalytics> {
    // Bypass tenant isolation for admin operations
  }
}
```

## 🔧 Modern Implementation Patterns

### 1. @Repository Service Pattern (RECOMMENDED APPROACH)

The modern approach uses @Repository decorator with auto-generated CRUD methods:

```typescript
@Injectable()
@Repository(() => User)  // Auto-generates all CRUD methods
export class UserService {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  // PATTERN: Use auto-generated methods with custom business logic
  async findUserById(id: string): Promise<User | null> {
    // Uses auto-generated this.findOne() method
    // Auto-generated: MATCH (n:User {id: $id}) RETURN n LIMIT 1
    // Includes: 10m caching, parameter validation, type safety
    return this.findById(id);
  }

  async findUsers(options?: FindOptions<User>): Promise<User[]> {
    // Uses auto-generated this.findMany() method
    // Auto-generated with filtering, ordering, pagination
    // Includes: WHERE clauses, ORDER BY, LIMIT/SKIP
    return this.findAll(options);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // Uses auto-generated this.create() method with custom logic
    // Auto-generated: CREATE (n:User $data) RETURN n
    // Includes: Auto ID, timestamps, validation, 3 retries
    return this.create({
      ...userData,
      isActive: true,
      role: userData.role || 'user'
    });
  }

  async updateUser(id: string, updates: UpdateUserDto): Promise<User | null> {
    // Uses auto-generated this.update() method
    // Auto-generated: MATCH (n:User {id: $id}) SET n += $updates RETURN n
    // Includes: Auto updatedAt timestamp, validation
    return this.update(id, updates);
  }

  async deleteUser(id: string): Promise<boolean> {
    // Uses auto-generated this.delete() method
    // Auto-generated: MATCH (n:User {id: $id}) DETACH DELETE n
    // Includes: Relationship cleanup, boolean result
    return this.delete(id);
  }

  async countUsers(where?: Partial<User>): Promise<number> {
    // Uses auto-generated this.count() method
    // Auto-generated: MATCH (n:User) WHERE ... RETURN count(n)
    // Includes: Filtering support, performance caching
    return this.count({ where });
  }

  async userExists(id: string): Promise<boolean> {
    // Uses auto-generated this.exists() method
    // Auto-generated: MATCH (n:User {id: $id}) RETURN count(n) > 0
    // Includes: Optimized existence check, caching
    return this.exists(id);
  }

  // PATTERN: Combine auto-generated methods with security decorators
  @Authorize({ roles: ['ADMIN'] })
  @AuditLog({ enabled: true, logLevel: 'detailed' })
  async getAllUsersForAdmin(options?: FindOptions<User>): Promise<User[]> {
    // Secured admin operation with audit trail using auto-generated method
    return this.findAll(options);
  }
}
  
  // PATTERN: Custom queries when auto-generated methods aren't sufficient
  @Safe()
  @CypherQuery({ cache: '15m', mode: 'READ' })
  async findUsersByDomain(domain: string): Promise<User[]> {
    // Custom query using Neo4jQueryBuilder for complex operations
    const builder = new Neo4jQueryBuilder<User>()
      .match('u', () => User)
      .where('u.email', 'ENDS WITH', `@${domain}`)
      .where('u.active', '=', true)
      .return(['u'])
      .orderBy('u.createdAt', 'DESC');
    
    return builder.build();
  }
}
```

### 2. Entity Definition Pattern

```typescript
@Neo4jEntity({
  label: 'PrimaryLabel',
  additionalLabels: ['SecondaryLabel'],
  idStrategy: 'uuid',
  constraints: {
    unique: [['email'], ['username']],
    index: ['name', 'createdAt'],
    key: ['id']
  }
})
export class ExampleEntity {
  // PATTERN: Always use @Id() for primary identifiers
  @Id()
  @NotNull()
  id: string;

  // PATTERN: Add validation to properties
  @Neo4jProp({
    validate: (value: string) => /^[^@]+@[^@]+\.[^@]+$/.test(value) || 'Invalid email'
  })
  @Unique()
  @Index()
  email: string;

  // PATTERN: Use transformations for data consistency
  @Neo4jProp({
    transform: {
      toNeo4j: (value: string) => value.toLowerCase(),
      fromNeo4j: (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
    }
  })
  name: string;

  // PATTERN: Use JsonProperty for complex objects
  @JsonProperty({ optional: true })
  metadata: {
    preferences: Record<string, any>;
    settings: Record<string, any>;
  };

  // PATTERN: Define typed relationships
  @Neo4jRelationship({
    type: 'RELATED_TO',
    direction: 'OUT',
    target: () => RelatedEntity,
    isArray: true,
    optional: true,
    propertiesType: () => RelationshipProperties
  })
  relatedEntities: RelatedEntity[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt({ optional: true })
  updatedAt?: Date;
}
```

### 3. Specialized Repository Pattern (BASEREPOSITORY ELIMINATED)

The modern approach uses specialized repositories for graph operations and relationships:

#### GraphRepository Pattern - Graph Operations

```typescript
@Injectable()
export class UserGraphRepository extends GraphRepository<User> {
  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService, 'User');
  }

  // PATTERN: Use specialized graph operations
  @Safe()
  async findUserNetwork(userId: string, depth: number = 2): Promise<NetworkAnalysis> {
    // Find user's network within specified depth
    const neighbors = await this.findWithinDistance(userId, depth, {
      relationshipTypes: ['FOLLOWS', 'FRIENDS_WITH'],
      nodeFilter: { active: true },
      includeSoftDeleted: false
    });

    // Calculate network metrics
    const centrality = await this.calculateDegreeCentrality(userId, {
      relationshipTypes: ['FOLLOWS'],
      direction: 'BOTH'
    });

    return { neighbors, centrality, networkSize: neighbors.length };
  }

  // PATTERN: Complex graph pattern matching
  @CypherQuery({ cache: '15m' })
  async findInfluencers(): Promise<User[]> {
    const pattern: GraphPattern = {
      nodes: [
        { variable: 'user', labels: ['User'], properties: { active: true } },
        { variable: 'follower', labels: ['User'] }
      ],
      relationships: [
        {
          type: 'FOLLOWS',
          direction: 'IN',
          source: 'follower',
          target: 'user'
        }
      ]
    };

    // Find users with high follower count
    const results = await this.matchPattern(pattern);
    return results.map(result => result.user);
  }
}
```

#### RelationshipRepository Pattern - Relationship Management

```typescript
@Injectable()
export class UserFollowRepository extends RelationshipRepository<FollowRelationship, User, User> {
  constructor(@InjectNeo4j() neo4jService: Neo4jService) {
    super(neo4jService, 'FOLLOWS', 'User', 'User');
  }

  // PATTERN: Domain-specific relationship operations
  @Safe()
  @Transactional()
  async followUser(followerId: string, followeeId: string): Promise<FollowRelationship> {
    // Check if relationship already exists
    const exists = await this.relationshipExists(followerId, followeeId);
    if (exists) {
      throw new ConflictError('User already follows this user');
    }

    // Create follow relationship with metadata
    return this.createRelationship(followerId, followeeId, {
      followedAt: new Date(),
      notificationsEnabled: true
    });
  }

  // PATTERN: Bulk operations for performance
  @Safe({ rules: { maxArrayLength: 100 } })
  @Transactional()
  async bulkFollow(followerId: string, followeeIds: string[]): Promise<FollowRelationship[]> {
    const relationships = followeeIds.map(followeeId => ({
      sourceId: followerId,
      targetId: followeeId,
      properties: { followedAt: new Date(), bulk: true }
    }));

    return this.bulkCreateRelationships(relationships);
  }

  // PATTERN: Advanced relationship queries
  @CypherQuery({ cache: '5m' })
  async getMutualFollows(userId1: string, userId2: string): Promise<User[]> {
    return this.findCommonTargets(userId1, userId2, {
      includeTargetData: true
    });
  }
}
```

#### Custom Repository Composition Pattern

```typescript
@Injectable()
export class UserSocialService {
  constructor(
    private readonly userGraph: UserGraphRepository,
    private readonly userFollows: UserFollowRepository
  ) {}

  // PATTERN: Compose specialized repositories for complex operations
  @Safe()
  async getCompleteUserProfile(userId: string): Promise<CompleteUserProfile> {
    // Use Entity CRUD decorators for basic data
    const user = await this.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Use specialized repositories for graph operations
    const [networkAnalysis, followers, following] = await Promise.all([
      this.userGraph.findUserNetwork(userId, 2),
      this.userFollows.findByTarget(userId, { limit: 100 }),
      this.userFollows.findBySource(userId, { limit: 100 })
    ]);

    return {
      user,
      network: networkAnalysis,
      followers: followers.length,
      following: following.length,
      influence: networkAnalysis.centrality
    };
  }

  @FindOne(() => User, { cache: '10m' })
  async findUserById(id: string): Promise<User | null> {
    // Entity CRUD decorator handles this automatically
  }
}
```

### 4. Multi-Tenant Service Pattern (ENHANCED ENTERPRISE FEATURES)

```typescript
@Injectable()
export class TenantAwareService {
  constructor(
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService
  ) {}

  // PATTERN: Use @TenantIsolated for automatic tenant filtering
  @TenantIsolated({
    enabled: true,
    validateAccess: true,
    trackAnalytics: true
  })
  @CypherQuery({ cache: '10m' })
  async getTenantData(): Promise<any[]> {
    // Query automatically filtered by tenant
    return 'MATCH (n:Node) RETURN n';
  }

  // PATTERN: Explicit tenant validation for sensitive operations
  @Authorize({
    tenantIsolation: {
      enabled: true,
      tenantProperty: 'tenantId',
      autoInject: true
    }
  })
  @AuditLog({ 
    enabled: true,
    customFields: { operation: 'tenant-sensitive' }
  })
  async sensitiveOperation(data: any): Promise<void> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    
    // Perform operation with explicit tenant awareness
    await this.multiTenantNeo4j.executeInTenantContext(tenantId, async (neo4j) => {
      // Neo4j operations automatically scoped to tenant
      return neo4j.run('CREATE (n:Node $data)', { data });
    });
  }
}
```

## 🛡️ Security Implementation Patterns

### 1. Comprehensive Security Layer

```typescript
@Injectable()
export class SecureService {
  // PATTERN: Layer security decorators for defense in depth
  @Authorize({
    roles: ['ADMIN'],
    permissions: ['data:write', 'sensitive:access'],
    resourceAccess: {
      resourceType: 'SensitiveData',
      actions: ['create', 'update'],
      ownershipCheck: {
        ownerProperty: 'ownerId',
        allowOwnerAccess: false // Only admins, not owners
      }
    }
  })
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          targetId: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' }
        },
        required: ['data', 'targetId']
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
  @AuditLog({
    enabled: true,
    logLevel: 'full',
    includeSensitiveData: false,
    customFields: {
      operation: 'high-risk-data-modification',
      complianceRequired: true
    }
  })
  @RateLimit({
    windowMs: 3600000, // 1 hour
    maxRequests: 10,   // Very restrictive
    keyGenerator: (context) => `admin-action:${context.user.id}`
  })
  @EncryptSensitive({
    fields: ['sensitiveData', 'personalInfo'],
    algorithm: 'aes-256-gcm',
    auditAccess: true
  })
  @TenantIsolated({ 
    enabled: true, 
    validateAccess: true 
  })
  @Transactional()
  @CypherQuery({ mode: 'WRITE', cache: false, retry: 1 })
  async performHighSecurityOperation(
    targetId: string, 
    data: any
  ): Promise<boolean> {
    // Implementation with maximum security
  }
}
```

### 2. Multi-Tenant Security Patterns (ENTERPRISE)

Advanced security patterns for multi-tenant environments:

```typescript
@Injectable()
export class MultiTenantSecureService {
  constructor(
    private readonly multiTenantNeo4j: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService
  ) {}

  // PATTERN: Tenant-isolated entity operations
  @TenantIsolated({ enabled: true, validateAccess: true, trackAnalytics: true })
  @RequireTenantFeatures(['advanced-user-management'])
  @ValidateTenantLimits({ operation: 'user-creation', checkSubscription: true })
  @FindMany(() => User, { cache: '5m' })
  async getTenantUsers(options?: FindOptions<User>): Promise<User[]> {
    // Automatically scoped to current tenant with feature validation
  }

  // PATTERN: Cross-tenant admin operations with enhanced security
  @Authorize({
    roles: ['SUPER_ADMIN'],
    permissions: ['cross-tenant:read'],
    customAuthorizer: async (context) => {
      // Additional business hours restriction for cross-tenant access
      const currentHour = new Date().getHours();
      return context.user.role === 'SUPER_ADMIN' && currentHour >= 9 && currentHour <= 17;
    }
  })
  @AuditLog({
    enabled: true,
    logLevel: 'full',
    customFields: { crossTenant: true, riskLevel: 'maximum' },
    alerting: { enabled: true, channels: ['security-team'] }
  })
  @RateLimit({ windowMs: 3600000, maxRequests: 3 }) // Very restrictive
  @CollectTenantMetrics({ includeCrossTenantWarning: true })
  async getCrossTenantAnalytics(): Promise<CrossTenantReport> {
    // High-security cross-tenant operation with full audit trail
    return this.multiTenantNeo4j.executeCrossTenantQuery(
      'MATCH (u:User) WITH u.tenantId as tenant, count(u) as userCount RETURN tenant, userCount'
    );
  }

  // PATTERN: Tenant admin operations with resource limits
  @TenantIsolated({ enabled: true })
  @Authorize({ roles: ['TENANT_ADMIN'], permissions: ['tenant:configure'] })
  @ValidateTenantLimits({ 
    operation: 'configuration-update',
    checkQuotas: ['storage', 'api-calls'],
    enforceSubscriptionLimits: true 
  })
  @AuditLog({ enabled: true, logLevel: 'detailed' })
  @TenantAdminOperation({ bypassIsolation: false, validateOwnership: true })
  async updateTenantConfiguration(config: TenantConfigDto): Promise<TenantConfig> {
    // Tenant admin operation with resource validation
    const tenantId = this.tenantContext.getCurrentTenantId();
    return this.multiTenantNeo4j.executeInTenantContext(tenantId, async (neo4j) => {
      return neo4j.run(
        'MATCH (t:Tenant {id: $tenantId}) SET t.config = $config RETURN t.config as config',
        { tenantId, config }
      );
    });
  }
}
```

## 🚀 Performance Optimization Patterns

### 1. Caching Strategies

```typescript
@Injectable()
export class OptimizedService {
  // PATTERN: Cache frequently accessed read-only data
  @CypherQuery({ 
    cache: '1h',        // Long cache for static data
    mode: 'READ' 
  })
  async getStaticConfiguration(): Promise<Config> {
    return 'MATCH (c:Configuration) RETURN c';
  }

  // PATTERN: Short cache for dynamic but frequently accessed data
  @CypherQuery({ 
    cache: '5m',        // Short cache for dynamic data
    mode: 'READ' 
  })
  async getUserDashboard(userId: string): Promise<Dashboard> {
    return {
      query: 'MATCH (u:User {id: $userId}) RETURN u /* complex dashboard query */',
      params: { userId }
    };
  }

  // PATTERN: No caching for real-time data
  @CypherQuery({ 
    cache: false,       // No cache for real-time data
    mode: 'READ' 
  })
  async getLiveMetrics(): Promise<Metrics> {
    return 'MATCH (m:Metrics) WHERE m.timestamp >= datetime() - duration("PT5M") RETURN m';
  }

  // PATTERN: Never cache write operations
  @CypherQuery({ 
    mode: 'WRITE',
    cache: false,       // Write operations never cached
    retry: 3            // Retry failed writes
  })
  async updateUserData(userId: string, data: any): Promise<void> {
    // Write operation implementation
  }
}
```

### 2. Query Optimization Patterns

```typescript
@Injectable()
export class QueryOptimizedService {
  // PATTERN: Use indexes and constraints
  @CypherQuery({ cache: '10m' })
  async findUserByEmail(email: string): Promise<User | null> {
    // Utilizes unique constraint on email for fast lookup
    return this.neo4j.run(
      'MATCH (u:User {email: $email}) RETURN u',
      { email }
    );
  }

  // PATTERN: Limit results and use pagination
  @CypherQuery({ cache: '2m' })
  async getRecentPosts(page: number = 1, limit: number = 20): Promise<Post[]> {
    const skip = (page - 1) * limit;
    return {
      query: `
        MATCH (p:Post)
        WHERE p.published = true
        RETURN p
        ORDER BY p.createdAt DESC
        SKIP $skip LIMIT $limit
      `,
      params: { skip, limit }
    };
  }

  // PATTERN: Use OPTIONAL MATCH to avoid cartesian products
  @CypherQuery({ cache: '15m' })
  async getUserWithRelationships(userId: string): Promise<UserWithRelations> {
    return {
      query: `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:CREATED]->(posts:Post)
        OPTIONAL MATCH (u)<-[:FOLLOWS]-(followers:User)
        OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
        RETURN 
          u as user,
          collect(DISTINCT posts) as posts,
          collect(DISTINCT followers) as followers,
          collect(DISTINCT following) as following
      `,
      params: { userId }
    };
  }

  // PATTERN: Batch operations for bulk processing
  @Transactional()
  @CypherQuery({ mode: 'WRITE', cache: false })
  async bulkCreateUsers(users: CreateUserDto[]): Promise<User[]> {
    // Process in batches to avoid memory issues
    const batchSize = 100;
    const results: User[] = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchResult = await this.neo4j.run(`
        UNWIND $users as userData
        CREATE (u:User {
          id: randomUUID(),
          email: userData.email,
          name: userData.name,
          createdAt: datetime()
        })
        RETURN collect(u) as users
      `, { users: batch });
      
      results.push(...batchResult.records[0].get('users'));
    }
    
    return results;
  }
}
```

### 3. Connection Management Patterns

```typescript
// PATTERN: Configure connection pooling
@Module({
  imports: [
    Neo4jModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('NEO4J_URI'),
        username: configService.get('NEO4J_USERNAME'),
        password: configService.get('NEO4J_PASSWORD'),
        config: {
          // Optimize connection pool
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 30000,
          connectionTimeout: 5000,
          maxTransactionRetryTime: 30000,
          
          // Enable connection validation
          connectionLivenessCheckTimeout: 30000,
          
          // Optimize for performance
          fetchSize: 1000,
          disableLosslessIntegers: true
        },
        
        // Enable health monitoring
        health: {
          enabled: true,
          timeout: 5000,
          retries: 3
        },
        
        // Enable metrics collection
        metrics: {
          enabled: true,
          prometheusEnabled: true
        }
      }),
      inject: [ConfigService]
    })
  ]
})
export class OptimizedNeo4jModule {}
```

## 🐛 Error Handling Patterns

### 1. Comprehensive Error Handling

```typescript
@Injectable()
export class RobustService {
  constructor(@InjectNeo4j() private readonly neo4j: Neo4jService) {}

  @Safe()
  @CypherQuery({ retry: 3 })
  async robustOperation(data: any): Promise<Result> {
    try {
      // Primary operation
      const result = await this.neo4j.run(
        'MATCH (n:Node) WHERE n.id = $id RETURN n',
        { id: data.id }
      );

      if (result.records.length === 0) {
        throw new NotFoundError(`Node with id ${data.id} not found`);
      }

      return this.transformResult(result.records[0]);
    } catch (error) {
      // Log error with context
      console.error('Operation failed:', {
        operation: 'robustOperation',
        data,
        error: error.message,
        stack: error.stack
      });

      // Handle specific error types
      if (error instanceof Neo4jError) {
        throw new DatabaseError(`Database operation failed: ${error.message}`);
      }

      if (error instanceof ValidationError) {
        throw new BadRequestError(`Invalid input: ${error.message}`);
      }

      // Re-throw unknown errors
      throw error;
    }
  }

  // PATTERN: Graceful degradation
  @Safe()
  @CypherQuery({ cache: '1m', retry: 2 })
  async getDataWithFallback(id: string): Promise<Data> {
    try {
      // Try primary data source
      return await this.getPrimaryData(id);
    } catch (error) {
      console.warn('Primary data source failed, using fallback:', error.message);
      
      try {
        // Try secondary data source
        return await this.getSecondaryData(id);
      } catch (fallbackError) {
        console.error('All data sources failed:', {
          primary: error.message,
          secondary: fallbackError.message
        });
        
        // Return default data
        return this.getDefaultData(id);
      }
    }
  }
}
```

### 2. Validation Error Patterns

```typescript
@Injectable()
export class ValidatedService {
  @ValidateInput({
    schema: {
      parameterSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 0, maximum: 150 }
        },
        required: ['email']
      }
    },
    customValidators: [
      {
        name: 'uniqueEmail',
        validator: async (data, context) => {
          const exists = await this.checkEmailExists(data.email);
          return !exists;
        },
        message: 'Email already exists'
      }
    ]
  })
  @Safe()
  async createUserWithValidation(userData: CreateUserDto): Promise<User> {
    // Validation happens automatically before this method executes
    // If validation fails, appropriate error is thrown
    
    try {
      return await this.neo4j.run(
        'CREATE (u:User $userData) RETURN u',
        { userData }
      );
    } catch (error) {
      // Handle database-specific errors
      if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new ConflictError('User creation failed due to constraint violation');
      }
      throw error;
    }
  }
}
```

## 🧪 Testing Patterns

### 1. Unit Testing with Mocking

```typescript
describe('UserService', () => {
  let service: UserService;
  let neo4jService: jest.Mocked<Neo4jService>;

  beforeEach(async () => {
    const mockNeo4jService = {
      run: jest.fn(),
      query: jest.fn(),
      // Mock other methods as needed
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: Neo4jService,
          useValue: mockNeo4jService
        }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
    neo4jService = module.get(Neo4jService);
  });

  describe('findUserByEmail', () => {
    it('should return user when found', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser = { id: '1', email, name: 'Test User' };
      
      neo4jService.run.mockResolvedValue({
        records: [{ get: () => ({ properties: expectedUser }) }]
      } as any);

      // Act
      const result = await service.findUserByEmail(email);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(neo4jService.run).toHaveBeenCalledWith(
        'MATCH (u:User {email: $email}) RETURN u',
        { email }
      );
    });
  });
});
```

### 2. Integration Testing

```typescript
describe('UserService Integration', () => {
  let app: INestApplication;
  let userService: UserService;
  let neo4jService: Neo4jService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        Neo4jModule.forRoot({
          uri: 'bolt://localhost:7687',
          username: 'neo4j',
          password: 'test',
          database: 'test'
        }),
        // Other modules
      ],
      providers: [UserService]
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserService>(UserService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  beforeEach(async () => {
    // Clean database before each test
    await neo4jService.run('MATCH (n) DETACH DELETE n');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createUser', () => {
    it('should create user with relationships', async () => {
      // Arrange
      const userData = {
        name: 'Integration Test User',
        email: 'integration@test.com'
      };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);

      // Verify in database
      const result = await neo4jService.run(
        'MATCH (u:User {id: $id}) RETURN u',
        { id: user.id }
      );
      expect(result.records).toHaveLength(1);
    });
  });
});
```

## 📋 Best Practices Checklist

### ✅ Security Checklist

- [ ] All service methods use `@Safe()` decorator for parameter validation
- [ ] Sensitive operations have `@Authorize()` with appropriate roles/permissions
- [ ] Input validation uses `@ValidateInput()` with comprehensive schemas
- [ ] Critical operations have `@AuditLog()` enabled for compliance
- [ ] Public APIs have `@RateLimit()` to prevent abuse
- [ ] Sensitive data uses `@EncryptSensitive()` for protection
- [ ] Multi-tenant operations use `@TenantIsolated()` for data isolation

### ✅ Performance Checklist

- [ ] Read operations use appropriate caching with `@CypherQuery({ cache: 'duration' })`
- [ ] Write operations explicitly disable caching
- [ ] Queries use indexes and constraints for fast lookups
- [ ] Bulk operations are batched to prevent memory issues
- [ ] Connection pool is configured for expected load
- [ ] Health checks and metrics are enabled for monitoring

### ✅ Code Quality Checklist

- [ ] Entities are properly decorated with `@Neo4jEntity()` and constraints
- [ ] Properties have validation and transformation where needed
- [ ] Relationships are typed with `@Neo4jRelationship()`
- [ ] Repository pattern is used for data access logic
- [ ] Services focus on business logic, not data access
- [ ] Error handling is comprehensive with proper error types
- [ ] Tests cover both unit and integration scenarios

### ✅ Architecture Checklist

- [ ] Module configuration uses async factory for environment variables
- [ ] Services are properly injected with `@InjectNeo4j()`
- [ ] Multi-database setups use named connections
- [ ] Transaction boundaries are clearly defined with `@Transactional()`
- [ ] Security layers are applied consistently across the application

## 🚨 Common Pitfalls & Solutions

### 1. Performance Issues

**Problem**: Slow query performance
**Solution**:

- Add indexes to frequently queried properties
- Use `LIMIT` clauses to restrict result sets
- Avoid cartesian products with `OPTIONAL MATCH`
- Profile queries with `PROFILE` or `EXPLAIN`

**Problem**: Memory issues with large datasets
**Solution**:

- Process data in batches
- Use streaming for large result sets
- Configure appropriate `fetchSize`
- Implement pagination for user-facing results

### 2. Security Issues

**Problem**: Cypher injection vulnerabilities
**Solution**:

- Always use `@Safe()` decorator
- Never concatenate user input into queries
- Use parameterized queries exclusively
- Enable injection detection in `@ValidateInput()`

**Problem**: Unauthorized data access
**Solution**:

- Implement proper `@Authorize()` decorators
- Use resource-based access control
- Enable audit logging for sensitive operations
- Implement tenant isolation for multi-tenant apps

### 3. Development Issues

**Problem**: Complex entity relationships
**Solution**:

- Start with simple relationships and evolve
- Use relationship properties for metadata
- Consider bidirectional relationships carefully
- Test relationship constraints thoroughly

**Problem**: Testing difficulties
**Solution**:

- Use test databases for integration tests
- Mock Neo4j service for unit tests
- Clean database state between tests
- Use database transactions for test isolation

## 📚 Advanced Topics

### 1. Custom Decorator Creation

```typescript
// Create custom decorators that combine multiple decorators
export function SecureAdminOperation(options?: {
  auditLevel?: 'minimal' | 'detailed' | 'full';
  rateLimit?: number;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Apply multiple decorators
    Authorize({ roles: ['ADMIN'] })(target, propertyKey, descriptor);
    AuditLog({ 
      enabled: true, 
      logLevel: options?.auditLevel || 'detailed' 
    })(target, propertyKey, descriptor);
    RateLimit({ 
      windowMs: 3600000, 
      maxRequests: options?.rateLimit || 10 
    })(target, propertyKey, descriptor);
    Safe()(target, propertyKey, descriptor);
  };
}

// Usage
@SecureAdminOperation({ auditLevel: 'full', rateLimit: 5 })
async deleteAllUserData(): Promise<void> {
  // Implementation
}
```

### 2. Dynamic Query Building

```typescript
@Injectable()
export class DynamicQueryService {
  @Safe()
  @CypherQuery({ cache: false }) // Don't cache dynamic queries
  async dynamicSearch(criteria: SearchCriteria): Promise<any[]> {
    const queryBuilder = new CypherQueryBuilder();
    
    queryBuilder
      .match('(n:Node)')
      .where(criteria.filters)
      .orderBy(criteria.sortBy, criteria.sortOrder)
      .skip(criteria.offset)
      .limit(criteria.limit);
    
    const { query, params } = queryBuilder.build();
    
    return {
      query,
      params,
      description: `Dynamic search with ${Object.keys(criteria.filters).length} filters`
    };
  }
}
```

### 3. Event-Driven Architecture

```typescript
@Injectable()
export class EventDrivenService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Transactional()
  @AuditLog({ enabled: true })
  async createUserWithEvents(userData: CreateUserDto): Promise<User> {
    const user = await this.createUser(userData);
    
    // Emit events for other services to handle
    this.eventEmitter.emit('user.created', {
      userId: user.id,
      userData,
      timestamp: new Date()
    });
    
    return user;
  }

  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Handle user creation side effects
    await this.initializeUserProfile(event.userId);
    await this.sendWelcomeEmail(event.userId);
    await this.updateAnalytics(event);
  }
}
```

This comprehensive guide provides the foundation for working effectively with the `@hive-academy/nestjs-neo4j` library. Always refer to the examples in the `/examples` directory for practical implementation patterns and use cases.
