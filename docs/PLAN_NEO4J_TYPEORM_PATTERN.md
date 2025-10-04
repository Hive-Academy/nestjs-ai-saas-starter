# Neo4j Repository Pattern - TypeORM-Style Implementation Plan

**Status**: 🎯 PLANNED
**Priority**: 🔥 CRITICAL
**Effort**: 3-5 days
**Breaking Change**: ✅ YES (Major version bump required)

---

## 🎯 Objective

Refactor `@hive-academy/nestjs-neo4j` to follow **TypeORM/Mongoose-style repository patterns** with auto-generated repositories, eliminating manual boilerplate and matching NestJS ecosystem standards.

---

## 🚨 Current Problems

### Problem 1: Manual Repository Creation

**Current broken approach:**

```typescript
// ❌ User writes ENTIRE 750-line repository class
@Neo4jRepository(() => ApprovalRequest) // Decorator does nothing useful
@Injectable()
export class ApprovalRequestRepository {
  constructor(
    private readonly crud: Neo4jCrudService, // ❌ Manual injection
    @InjectNeogma() private readonly neogma: NeogmaService // ❌ Manual injection
  ) {}

  // ❌ 49 lines of manual CRUD delegation boilerplate
  findById(id: string) {
    return this.crud.findById<ApprovalRequest>(this.label, id);
  }
  findAll(options?) {
    return this.crud.findAll<ApprovalRequest>(this.label, options);
  }
  create(data) {
    return this.crud.create<ApprovalRequest>(this.label, data);
  }
  update(id, data) {
    return this.crud.update<ApprovalRequest>(this.label, id, data);
  }
  delete(id) {
    return this.crud.delete(this.label, id);
  }
  count(where?) {
    return this.crud.count<ApprovalRequest>(this.label, where);
  }
  exists(id) {
    return this.crud.exists(this.label, id);
  }

  // ❌ Still writing 700 lines of raw Cypher
  async storeApprovalRequest() {
    /* complex query */
  }
  async getApprovalRequest() {
    /* complex query */
  }
  async getPendingApprovals() {
    /* complex query */
  }
  // ... 20+ more custom methods
}

// ❌ Manual registration in every module
@Module({
  providers: [
    Neo4jCrudService, // ❌ Why is application providing this?
    ApprovalRequestRepository, // ❌ Manual registration
  ],
})
export class HitlModule {}
```

### Problem 2: Neo4jCrudService Not Exported from Neo4jModule

```typescript
// ❌ Current: Applications must manually provide Neo4jCrudService
@Module({
  imports: [Neo4jModule.forRoot(config)],
  providers: [
    Neo4jCrudService,  // ❌ Should be provided by Neo4jModule!
    MyRepository
  ]
})
```

### Problem 3: Decorator Provides No Value

```typescript
@Neo4jRepository(() => Entity)  // ❌ Just stores metadata nobody uses
```

### Problem 4: No Auto-Injection

```typescript
// ❌ Can't inject repositories automatically
constructor(
  @InjectRepository(ApprovalRequest)  // ❌ This doesn't exist!
  private approvalRepo: Neo4jRepository<ApprovalRequest>
) {}
```

---

## ✅ Target Solution (TypeORM-Style)

### Example 1: Simple CRUD Usage (Zero Boilerplate)

```typescript
// 1. Entity definition (already exists - no changes)
@Neo4jEntity('User')
export class User extends Neo4jBaseEntity {
  @Id() id: string;
  @Neo4jProp() @NotNull() email: string;
  @Neo4jProp() name: string;
}

// 2. Register entities in module (like TypeORM)
@Module({
  imports: [
    Neo4jModule.forFeature([User, Post, Comment]), // ✅ Auto-generates repositories!
  ],
  providers: [UserService],
})
export class UserModule {}

// 3. Inject and use repository (WORKS IMMEDIATELY)
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) // ✅ Auto-injection!
    private userRepo: Neo4jRepository<User> // ✅ Fully functional
  ) {}

  async getUser(id: string) {
    // ✅ Works immediately - NO manual code needed
    return this.userRepo.findById(id);
  }

  async getAllUsers() {
    return this.userRepo.findAll();
  }

  async createUser(data: Partial<User>) {
    return this.userRepo.create(data);
  }

  async searchUsers(criteria: Partial<User>) {
    return this.userRepo.findAll({ where: criteria });
  }
}
```

### Example 2: Custom Business Logic (Extend Base)

```typescript
// 1. Define custom repository (extends base)
@Injectable()
export class ApprovalRequestCustomRepository extends Neo4jRepository<ApprovalRequest> {
  // ✅ Inherits ALL CRUD methods from base (7 methods)

  // ✅ Add ONLY custom business logic
  async storeApprovalRequest(request: ApprovalStorageData): Promise<string> {
    const qb = this.createQueryBuilder(); // ✅ Helper from base
    const bindParam = qb.getBindParam();

    // Custom Cypher query for complex operation
    const idParam = bindParam.add(request.id);
    const statusParam = bindParam.add(request.status);

    qb.create(
      `(a:ApprovalRequest {
      id: $${idParam},
      status: $${statusParam},
      createdAt: datetime()
    })`
    ).return('a.id as id');

    const result = await this.executeQuery(qb.getStatement(), bindParam.get());
    return result.records[0].get('id');
  }

  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    const qb = this.createQueryBuilder();
    const bindParam = qb.getBindParam();

    const statusParam = bindParam.add('pending');

    qb.match('(a:ApprovalRequest)').where(`a.status = $${statusParam}`).return('a').orderBy('a.requestedAt ASC');

    const result = await this.executeQuery(qb.getStatement(), bindParam.get());
    return result.records.map((r) => r.get('a').properties);
  }
}

// 2. Register custom repository (replaces default)
@Module({
  imports: [Neo4jModule.forFeature([ApprovalRequest])],
  providers: [
    {
      provide: getRepositoryToken(ApprovalRequest), // ✅ Replace default
      useClass: ApprovalRequestCustomRepository,
    },
    HitlService,
  ],
  exports: [getRepositoryToken(ApprovalRequest)],
})
export class HitlModule {}

// 3. Inject custom repository (same injection pattern)
@Injectable()
export class HitlService {
  constructor(
    @InjectRepository(ApprovalRequest) // ✅ Injects custom repository
    private approvalRepo: ApprovalRequestCustomRepository
  ) {}

  async getPending() {
    // ✅ Uses custom method
    return this.approvalRepo.getPendingApprovals();
  }

  async create(data: ApprovalStorageData) {
    // ✅ Uses custom method
    return this.approvalRepo.storeApprovalRequest(data);
  }

  async findById(id: string) {
    // ✅ Uses inherited CRUD method
    return this.approvalRepo.findById(id);
  }
}
```

---

## 📋 Implementation Plan

### Phase 1: Core Infrastructure (2 days)

#### Step 1.1: Create Base Repository Class

**File**: `libs/nestjs-neo4j/src/lib/repositories/neo4j-repository.ts`

````typescript
import { Type } from '@nestjs/common';
import { NeogmaService } from '../services/neogma.service';
import { Neo4jCrudService } from '../services/neo4j-crud.service';
import { Neo4jCompatibleEntity } from '../interfaces/entity.interface';
import { FindOptions } from '../interfaces/find-options.interface';

/**
 * Base Neo4j Repository
 *
 * Provides ALL CRUD operations automatically for any Neo4j entity.
 * Extend this class to add custom business logic.
 *
 * @example Simple Usage (Auto-injected)
 * ```typescript
 * @Module({
 *   imports: [Neo4jModule.forFeature([User])]
 * })
 * class UserModule {}
 *
 * @Injectable()
 * class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepository<User>
 *   ) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findById(id);  // ✅ Works immediately
 *   }
 * }
 * ```
 *
 * @example Custom Repository (Extend Base)
 * ```typescript
 * @Injectable()
 * class UserCustomRepository extends Neo4jRepository<User> {
 *   async findByEmail(email: string): Promise<User | null> {
 *     const qb = this.createQueryBuilder();
 *     // ... custom Cypher query
 *   }
 * }
 * ```
 */
export class Neo4jRepository<T extends Neo4jCompatibleEntity> {
  constructor(protected readonly entity: Type<T>, protected readonly label: string, protected readonly neogma: NeogmaService, protected readonly crud: Neo4jCrudService) {}

  // ============================================================================
  // CRUD OPERATIONS (Available immediately on all repositories)
  // ============================================================================

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.crud.findById<T>(this.label, id);
  }

  /**
   * Find all entities matching criteria
   */
  async findAll(options?: FindOptions<T>): Promise<T[]> {
    return this.crud.findAll<T>(this.label, options);
  }

  /**
   * Find one entity matching criteria
   */
  async findOne(options: FindOptions<T>): Promise<T | null> {
    const results = await this.findAll({ ...options, limit: 1 });
    return results[0] || null;
  }

  /**
   * Create new entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return this.crud.create<T>(this.label, data);
  }

  /**
   * Update existing entity
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.crud.update<T>(this.label, id, data);
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string, detach = true): Promise<boolean> {
    return this.crud.delete(this.label, id, detach);
  }

  /**
   * Count entities matching criteria
   */
  async count(where?: Partial<T>): Promise<number> {
    return this.crud.count<T>(this.label, where);
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  /**
   * Save entity (create or update)
   */
  async save(data: Partial<T>): Promise<T> {
    if ('id' in data && data.id) {
      const existing = await this.findById(data.id as string);
      if (existing) {
        return (await this.update(data.id as string, data)) as T;
      }
    }
    return this.create(data as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
  }

  // ============================================================================
  // RELATIONSHIP HELPERS (For custom repositories)
  // ============================================================================

  /**
   * Create relationship between two entities
   *
   * @example
   * ```typescript
   * await userRepo.createRelationship(
   *   userId,
   *   postId,
   *   'AUTHORED',
   *   { createdAt: new Date() }
   * );
   * ```
   */
  async createRelationship(fromId: string, toId: string, type: string, properties?: Record<string, unknown>): Promise<void> {
    const qb = this.createQueryBuilder();
    const bindParam = qb.getBindParam();

    const fromIdParam = bindParam.add(fromId);
    const toIdParam = bindParam.add(toId);
    const propsParam = properties ? bindParam.add(properties) : null;

    qb.match(`(from:${this.label})`)
      .where(`from.id = $${fromIdParam}`)
      .match(`(to)`)
      .where(`to.id = $${toIdParam}`)
      .create(`(from)-[r:${type}${propsParam ? ` $${propsParam}` : ''}]->(to)`)
      .return('r');

    await this.executeQuery(qb.getStatement(), bindParam.get());
  }

  /**
   * Find related entities via relationship
   */
  async findRelated<R = any>(id: string, relationshipType: string, direction: 'OUT' | 'IN' | 'BOTH' = 'OUT'): Promise<R[]> {
    const qb = this.createQueryBuilder();
    const bindParam = qb.getBindParam();

    const idParam = bindParam.add(id);
    const pattern = direction === 'OUT' ? `(from:${this.label})-[:${relationshipType}]->(related)` : direction === 'IN' ? `(from:${this.label})<-[:${relationshipType}]-(related)` : `(from:${this.label})-[:${relationshipType}]-(related)`;

    qb.match(pattern).where(`from.id = $${idParam}`).return('related');

    const result = await this.executeQuery(qb.getStatement(), bindParam.get());
    return result.records.map((r) => r.get('related').properties);
  }

  // ============================================================================
  // QUERY BUILDER HELPERS (For custom repositories)
  // ============================================================================

  /**
   * Create QueryBuilder instance
   *
   * @example
   * ```typescript
   * const qb = this.createQueryBuilder();
   * qb.match('(u:User)').where('u.age > 18').return('u');
   * const result = await this.executeQuery(qb.getStatement(), qb.getBindParam().get());
   * ```
   */
  createQueryBuilder() {
    return this.neogma.createQueryBuilder();
  }

  /**
   * Execute raw Cypher query
   */
  async executeQuery<R = any>(cypher: string, params: Record<string, any> = {}): Promise<R> {
    return this.neogma.run(cypher, params) as Promise<R>;
  }

  /**
   * Get the entity label
   */
  getLabel(): string {
    return this.label;
  }

  /**
   * Get the entity class
   */
  getEntity(): Type<T> {
    return this.entity;
  }

  /**
   * Get direct access to NeogmaService (for advanced queries)
   */
  getNeogmaService(): NeogmaService {
    return this.neogma;
  }
}
````

#### Step 1.2: Create Injection Decorators and Tokens

**File**: `libs/nestjs-neo4j/src/lib/decorators/inject-repository.decorator.ts`

````typescript
import { Inject, Type } from '@nestjs/common';
import { getEntityLabel } from '../utils/entity-utils';

/**
 * Get repository injection token for entity
 *
 * @example
 * ```typescript
 * const token = getRepositoryToken(User);  // 'UserRepository'
 * ```
 */
export function getRepositoryToken(entity: Type<any>): string {
  const label = getEntityLabel(entity);
  return `${label}Repository`;
}

/**
 * Inject Neo4j repository for entity
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepository<User>
 *   ) {}
 * }
 * ```
 */
export function InjectRepository(entity: Type<any>): ParameterDecorator {
  return Inject(getRepositoryToken(entity));
}
````

#### Step 1.3: Update Neo4jModule with forFeature()

**File**: `libs/nestjs-neo4j/src/lib/neo4j.module.ts`

````typescript
import { DynamicModule, Module, Type, Provider } from '@nestjs/common';
import { NeogmaService } from './services/neogma.service';
import { Neo4jCrudService } from './services/neo4j-crud.service';
import { Neo4jRepository } from './repositories/neo4j-repository';
import { getRepositoryToken } from './decorators/inject-repository.decorator';
import { getEntityLabel } from './utils/entity-utils';
import { Neo4jModuleOptions, Neo4jModuleAsyncOptions } from './interfaces';

@Module({})
export class Neo4jModule {
  /**
   * Register Neo4j module globally with configuration
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     Neo4jModule.forRoot({
   *       uri: 'bolt://localhost:7687',
   *       username: 'neo4j',
   *       password: 'password'
   *     })
   *   ]
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: Neo4jModuleOptions): DynamicModule {
    return {
      module: Neo4jModule,
      global: true,
      providers: [
        {
          provide: 'NEO4J_OPTIONS',
          useValue: options,
        },
        NeogmaService,
        Neo4jCrudService, // ✅ Provided globally
      ],
      exports: [NeogmaService, Neo4jCrudService],
    };
  }

  /**
   * Register Neo4j module with async configuration
   */
  static forRootAsync(options: Neo4jModuleAsyncOptions): DynamicModule {
    return {
      module: Neo4jModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: 'NEO4J_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        NeogmaService,
        Neo4jCrudService, // ✅ Provided globally
      ],
      exports: [NeogmaService, Neo4jCrudService],
    };
  }

  /**
   * Register repositories for entities (TypeORM-style)
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     Neo4jModule.forFeature([User, Post, Comment])  // ✅ Auto-generates repositories
   *   ]
   * })
   * export class UserModule {}
   * ```
   */
  static forFeature(entities: Type<any>[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => {
      const label = getEntityLabel(entity);
      const repositoryToken = getRepositoryToken(entity);

      return {
        provide: repositoryToken,
        useFactory: (neogma: NeogmaService, crud: Neo4jCrudService) => {
          // ✅ Auto-generate repository instance
          return new Neo4jRepository(entity, label, neogma, crud);
        },
        inject: [NeogmaService, Neo4jCrudService],
      };
    });

    return {
      module: Neo4jModule,
      providers,
      exports: providers,
    };
  }
}
````

### Phase 2: Migration Utilities (1 day)

#### Step 2.1: Create Migration Guide

**File**: `libs/nestjs-neo4j/MIGRATION_V2.md`

````markdown
# Migration Guide: v1.x → v2.x (TypeORM-Style Repositories)

## Breaking Changes

### 1. Manual Repository Classes → Auto-Generated Repositories

**Before (v1.x):**

```typescript
@Neo4jRepository(() => User)
@Injectable()
export class UserRepository {
  constructor(private readonly crud: Neo4jCrudService, @InjectNeogma() private readonly neogma: NeogmaService) {}

  // Manual CRUD delegation
  findById(id: string) {
    return this.crud.findById('User', id);
  }
  findAll(options?) {
    return this.crud.findAll('User', options);
  }
  create(data) {
    return this.crud.create('User', data);
  }
  update(id, data) {
    return this.crud.update('User', id, data);
  }
  delete(id) {
    return this.crud.delete('User', id);
  }
  count(where?) {
    return this.crud.count('User', where);
  }
  exists(id) {
    return this.crud.exists('User', id);
  }
}

@Module({
  providers: [Neo4jCrudService, UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
```
````

**After (v2.x):**

```typescript
// ✅ No manual repository class needed for simple CRUD!

@Module({
  imports: [Neo4jModule.forFeature([User])], // ✅ Auto-generates repository
  providers: [UserService],
})
export class UserModule {}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) // ✅ Auto-injection
    private userRepo: Neo4jRepository<User>
  ) {}

  async getUser(id: string) {
    return this.userRepo.findById(id); // ✅ Works immediately
  }
}
```

### 2. Custom Repositories → Extend Base Class

**Before (v1.x):**

```typescript
@Neo4jRepository(() => User)
@Injectable()
export class UserRepository {
  constructor(private readonly crud: Neo4jCrudService, @InjectNeogma() private readonly neogma: NeogmaService) {}

  // 49 lines of manual CRUD delegation...

  async findByEmail(email: string): Promise<User | null> {
    const qb = this.neogma.createQueryBuilder();
    // ... custom query
  }
}
```

**After (v2.x):**

```typescript
@Injectable()
export class UserCustomRepository extends Neo4jRepository<User> {
  // ✅ Inherits ALL CRUD methods automatically

  // ✅ Add ONLY custom business logic
  async findByEmail(email: string): Promise<User | null> {
    const qb = this.createQueryBuilder(); // ✅ Helper from base
    // ... custom query
  }
}

@Module({
  imports: [Neo4jModule.forFeature([User])],
  providers: [
    {
      provide: getRepositoryToken(User),
      useClass: UserCustomRepository, // ✅ Replace default
    },
  ],
})
export class UserModule {}
```

## Automated Migration Script

Run this script to automatically convert repositories:

```bash
npx @hive-academy/nestjs-neo4j migrate-to-v2
```

This will:

1. Detect all `@Neo4jRepository` decorated classes
2. Remove manual CRUD delegation methods
3. Convert to custom repository pattern if custom methods exist
4. Update module providers
5. Generate backup files

## Manual Migration Steps

### Step 1: Update Neo4jModule Registration

```typescript
// Before
@Module({
  imports: [Neo4jModule.forRoot(config)],
  providers: [Neo4jCrudService, UserRepository]  // ❌ Manual
})

// After
@Module({
  imports: [
    Neo4jModule.forRoot(config),
    Neo4jModule.forFeature([User, Post, Comment])  // ✅ Auto-generates
  ]
})
```

### Step 2: For Simple CRUD - Delete Repository Class

If your repository only has CRUD methods (findById, findAll, create, update, delete, count, exists), **delete the entire class** and use auto-injection:

```typescript
// ✅ Just inject and use
constructor(
  @InjectRepository(User)
  private userRepo: Neo4jRepository<User>
) {}
```

### Step 3: For Custom Repositories - Extend Base

```typescript
// Before: Manual repository with 750 lines
@Neo4jRepository(() => User)
@Injectable()
export class UserRepository {
  constructor(private crud: Neo4jCrudService, @InjectNeogma() private neogma: NeogmaService) {}
  findById(id) {
    return this.crud.findById('User', id);
  } // Delete
  findAll(opts) {
    return this.crud.findAll('User', opts);
  } // Delete
  create(data) {
    return this.crud.create('User', data);
  } // Delete
  update(id, data) {
    return this.crud.update('User', id, data);
  } // Delete
  delete(id) {
    return this.crud.delete('User', id);
  } // Delete
  count(where) {
    return this.crud.count('User', where);
  } // Delete
  exists(id) {
    return this.crud.exists('User', id);
  } // Delete

  async findByEmail(email: string) {
    /* KEEP */
  }
  async searchUsers(query: string) {
    /* KEEP */
  }
}

// After: Custom repository with only custom logic
@Injectable()
export class UserCustomRepository extends Neo4jRepository<User> {
  // ✅ CRUD methods inherited automatically

  async findByEmail(email: string) {
    /* KEEP */
  }
  async searchUsers(query: string) {
    /* KEEP */
  }
}
```

### Step 4: Update Imports

```typescript
// Before
import { Neo4jCrudService, InjectNeogma, NeogmaService } from '@hive-academy/nestjs-neo4j';

// After
import { Neo4jRepository, InjectRepository } from '@hive-academy/nestjs-neo4j';
```

````

### Phase 3: Update Existing Repositories (1-2 days)

#### Step 3.1: Convert 8 Application Repositories

**Files to update:**
1. `apps/dev-brand-api/src/app/repositories/neo4j/approval-request.repository.ts` (750 lines → ~700 lines)
2. `apps/dev-brand-api/src/app/repositories/neo4j/approval-chain.repository.ts` (655 lines → ~610 lines)
3. `apps/dev-brand-api/src/app/repositories/neo4j/interruption.repository.ts` (533 lines → ~490 lines)
4. `apps/dev-brand-api/src/app/repositories/neo4j/confidence-pattern.repository.ts`
5. `apps/dev-brand-api/src/app/repositories/neo4j/feedback.repository.ts`
6. `apps/dev-brand-api/src/app/repositories/neo4j/memory-graph.repository.ts`
7. `apps/dev-brand-api/src/app/repositories/neo4j/developer.repository.ts`
8. `apps/dev-brand-api/src/app/repositories/neo4j/achievement.repository.ts`

**Migration pattern:**
```typescript
// BEFORE (current broken approach)
@Neo4jRepository(() => ApprovalRequest)
@Injectable()
export class ApprovalRequestRepository {
  private readonly label = 'ApprovalRequest';

  constructor(
    private readonly crud: Neo4jCrudService,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {}

  findById(id: string) { return this.crud.findById<ApprovalRequest>(this.label, id); }
  findAll(options?) { return this.crud.findAll<ApprovalRequest>(this.label, options); }
  create(data) { return this.crud.create<ApprovalRequest>(this.label, data); }
  update(id, data) { return this.crud.update<ApprovalRequest>(this.label, id, data); }
  delete(id) { return this.crud.delete(this.label, id); }
  count(where?) { return this.crud.count<ApprovalRequest>(this.label, where); }
  exists(id) { return this.crud.exists(this.label, id); }

  // Custom methods...
  async storeApprovalRequest() { /* 700 lines of custom logic */ }
}

// AFTER (TypeORM-style)
@Injectable()
export class ApprovalRequestRepository extends Neo4jRepository<ApprovalRequest> {
  // ✅ Inherits ALL CRUD methods (49 lines deleted!)

  // ✅ ONLY custom business logic
  async storeApprovalRequest() { /* 700 lines of custom logic */ }
}
````

#### Step 3.2: Update Module Registrations

**File**: `apps/dev-brand-api/src/app/repositories/repository.module.ts`

```typescript
// BEFORE
@Module({
  imports: [ChromaDBModule, Neo4jModule],
  providers: [GraphTraversalService, GraphAgentService, GraphCrudService, GraphHelpersService, MemoryGraphRepository, VectorMemoryRepository, ApprovalRequestRepository, ApprovalChainRepository, InterruptionRepository, ConfidencePatternRepository, FeedbackRepository, DeveloperRepository, AchievementRepository],
  exports: [
    /* all repositories */
  ],
})
export class RepositoryModule {}

// AFTER
@Module({
  imports: [ChromaDBModule, Neo4jModule, Neo4jModule.forFeature([Memory, ApprovalRequest, Developer, Achievement, InterruptionPoint, ConfidencePattern, FeedbackEntry])],
  providers: [
    GraphTraversalService,
    GraphAgentService,
    GraphCrudService,
    GraphHelpersService,
    // ✅ Override defaults with custom repositories
    {
      provide: getRepositoryToken(Memory),
      useClass: MemoryGraphRepository,
    },
    {
      provide: getRepositoryToken(ApprovalRequest),
      useClass: ApprovalRequestRepository,
    },
    {
      provide: getRepositoryToken(InterruptionPoint),
      useClass: InterruptionRepository,
    },
    {
      provide: getRepositoryToken(ConfidencePattern),
      useClass: ConfidencePatternRepository,
    },
    {
      provide: getRepositoryToken(FeedbackEntry),
      useClass: FeedbackRepository,
    },
    {
      provide: getRepositoryToken(Developer),
      useClass: DeveloperRepository,
    },
    {
      provide: getRepositoryToken(Achievement),
      useClass: AchievementRepository,
    },
  ],
  exports: [getRepositoryToken(Memory), getRepositoryToken(ApprovalRequest), getRepositoryToken(Developer), getRepositoryToken(Achievement), getRepositoryToken(InterruptionPoint), getRepositoryToken(ConfidencePattern), getRepositoryToken(FeedbackEntry)],
})
export class RepositoryModule {}
```

### Phase 4: Update Library Examples (0.5 days)

#### Step 4.1: Update 6 Example Files

**Files to update:**

1. `libs/nestjs-neo4j/src/examples/01-user-management.example.ts`
2. `libs/nestjs-neo4j/src/examples/02-relationship-management.example.ts`
3. `libs/nestjs-neo4j/src/examples/03-multi-tenant-application.example.ts`
4. `libs/nestjs-neo4j/src/examples/04-advanced-query-patterns.example.ts`
5. `libs/nestjs-neo4j/src/examples/05-security-monitoring.example.ts`
6. `libs/nestjs-neo4j/src/examples/06-real-time-analytics.example.ts`

**Example migration:**

```typescript
// BEFORE: Example 01 - User Management
@Neo4jRepository(() => User)
@Injectable()
export class UserRepository extends BaseRepositoryService<User> {
  constructor(neogmaService: NeogmaService) {
    super(neogmaService);
  }
}

@Module({
  imports: [Neo4jModule.forRoot(config)],
  providers: [UserRepository, UserService],
})
export class UserModule {}

// AFTER: Example 01 - User Management
@Module({
  imports: [Neo4jModule.forRoot(config), Neo4jModule.forFeature([User, UserProfile, UserPreferences])],
  providers: [UserService],
})
export class UserModule {}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Neo4jRepository<User>
  ) {}

  async createUser(data: Partial<User>) {
    return this.userRepo.create(data);
  }

  async getUser(id: string) {
    return this.userRepo.findById(id);
  }
}

// For custom queries, extend base
@Injectable()
export class UserCustomRepository extends Neo4jRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    const qb = this.createQueryBuilder();
    const bindParam = qb.getBindParam();

    const emailParam = bindParam.add(email);

    qb.match('(u:User)').where(`u.email = $${emailParam}`).return('u').limit(1);

    const result = await this.executeQuery(qb.getStatement(), bindParam.get());
    return result.records[0]?.get('u').properties || null;
  }
}
```

### Phase 5: Documentation & Testing (1 day)

#### Step 5.1: Update CLAUDE.md

**File**: `libs/nestjs-neo4j/CLAUDE.md`

Add section:

```markdown
## Repository Pattern (TypeORM-Style)

### Auto-Generated Repositories

For simple CRUD operations, use auto-generated repositories:

\`\`\`typescript
@Module({
imports: [Neo4jModule.forFeature([User, Post, Comment])]
})
export class UserModule {}

@Injectable()
export class UserService {
constructor(
@InjectRepository(User)
private userRepo: Neo4jRepository<User>
) {}

// ✅ All CRUD methods work immediately
async getUser(id: string) { return this.userRepo.findById(id); }
async getAllUsers() { return this.userRepo.findAll(); }
async createUser(data) { return this.userRepo.create(data); }
async updateUser(id, data) { return this.userRepo.update(id, data); }
async deleteUser(id) { return this.userRepo.delete(id); }
}
\`\`\`

### Custom Repositories

For custom business logic, extend the base repository:

\`\`\`typescript
@Injectable()
export class UserCustomRepository extends Neo4jRepository<User> {
async findByEmail(email: string): Promise<User | null> {
const qb = this.createQueryBuilder();
// ... custom Cypher query
}

async findUserWithPosts(userId: string) {
return this.findRelated(userId, 'AUTHORED', 'OUT');
}
}

@Module({
imports: [Neo4jModule.forFeature([User])],
providers: [
{
provide: getRepositoryToken(User),
useClass: UserCustomRepository
}
]
})
\`\`\`
```

#### Step 5.2: Add Integration Tests

**File**: `libs/nestjs-neo4j/src/lib/repositories/neo4j-repository.spec.ts`

```typescript
describe('Neo4jRepository (TypeORM-Style)', () => {
  describe('Auto-Generated Repository', () => {
    it('should auto-inject repository for entity', async () => {
      const module = await Test.createTestingModule({
        imports: [Neo4jModule.forRoot(testConfig), Neo4jModule.forFeature([User])],
        providers: [UserService],
      }).compile();

      const userService = module.get(UserService);
      expect(userService).toBeDefined();
      expect(userService.userRepo).toBeDefined();
    });

    it('should provide all CRUD methods', async () => {
      const repo = module.get(getRepositoryToken(User));

      expect(repo.findById).toBeDefined();
      expect(repo.findAll).toBeDefined();
      expect(repo.create).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(repo.count).toBeDefined();
      expect(repo.exists).toBeDefined();
    });
  });

  describe('Custom Repository', () => {
    it('should allow extending base repository', async () => {
      @Injectable()
      class UserCustomRepository extends Neo4jRepository<User> {
        async customMethod() {
          return 'custom';
        }
      }

      const module = await Test.createTestingModule({
        imports: [Neo4jModule.forRoot(testConfig), Neo4jModule.forFeature([User])],
        providers: [
          {
            provide: getRepositoryToken(User),
            useClass: UserCustomRepository,
          },
        ],
      }).compile();

      const repo = module.get(getRepositoryToken(User));
      expect(repo.customMethod).toBeDefined();
      expect(await repo.customMethod()).toBe('custom');
    });
  });
});
```

---

## 📊 Success Metrics

### Code Reduction

- **Before**: 750 lines per repository (49 CRUD + 700 custom)
- **After**: 700 lines per repository (0 CRUD + 700 custom)
- **Savings**: 49 lines × 8 repositories = **392 lines deleted**

### Developer Experience

- ✅ Zero boilerplate for simple CRUD
- ✅ Matches TypeORM/Mongoose patterns (familiar)
- ✅ Auto-injection with `@InjectRepository()`
- ✅ Extend base class only when needed
- ✅ Full TypeScript type safety

### Maintainability

- ✅ Single source of truth for CRUD logic
- ✅ Easier to update/enhance base repository
- ✅ Clear separation: base CRUD vs custom queries
- ✅ Follows NestJS ecosystem standards

---

## 🚀 Rollout Plan

### Week 1: Core Implementation

- Days 1-2: Phase 1 (Core Infrastructure)
- Day 3: Phase 2 (Migration Utilities)

### Week 2: Migration & Testing

- Days 4-5: Phase 3 (Update Existing Repositories)
- Day 6: Phase 4 (Update Examples)
- Day 7: Phase 5 (Documentation & Testing)

### Week 3: Release

- Days 8-9: Beta testing
- Day 10: v2.0.0 release

---

## ⚠️ Breaking Changes Checklist

- [ ] Major version bump: v1.x → v2.0.0
- [ ] Migration guide published
- [ ] Automated migration script tested
- [ ] Deprecation warnings in v1.x
- [ ] Community notification (if public package)
- [ ] Example applications updated
- [ ] Documentation reflects new patterns

---

## 🎯 Next Steps

1. **User Approval**: Get sign-off on TypeORM-style approach
2. **Create Feature Branch**: `feature/neo4j-typeorm-pattern`
3. **Implement Phase 1**: Core infrastructure
4. **Test with One Repository**: Validate approach
5. **Migrate All Repositories**: Apply pattern across codebase
6. **Release v2.0.0**: Publish with migration guide
