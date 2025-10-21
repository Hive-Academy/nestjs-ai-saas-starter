# ChromaDB Module - Enterprise Integration Guide

## Overview

The **@hive-academy/nestjs-chromadb** module provides **enterprise-grade ChromaDB integration** for NestJS applications with **declarative decorators**, **multi-tenancy**, and **production-ready monitoring**. This module transforms vector database operations into zero-boilerplate, type-safe, and highly performant experiences.

## 🚀 **Enhanced Key Features**

### **🏗️ TypeORM-Style Repository Pattern (UPDATED 2025)**

- **ChromaDBRepository<T>** - Type-safe CRUD operations with explicit constructor DI
- **Generic Type Propagation** - Full TypeScript inference with zero `any` types
- **15+ Inherited Methods** - Complete CRUD without boilerplate (90% less code)
- **Clean Architecture** - Composition pattern mirroring Neo4j implementation
- **Extensible** - Add custom business methods while keeping all CRUD functionality

### **🎯 Declarative Decorator Ecosystem (Service Methods)**

- **@VectorQuery** - Zero-boilerplate vector search with auto-embedding
- **@Cached** - Vector-aware intelligent caching with collection invalidation
- **@Profiled** - Real-time performance monitoring and slow query detection
- **@Retry** - Resilient operations with circuit breaker patterns
- **@TenantAware** - Automatic tenant isolation for multi-tenant applications

### **🏢 Enterprise Multi-Tenancy**

- **@TenantAware** - Automatic tenant isolation with flexible naming strategies
- **@CrossTenant** - Secure cross-tenant administrative operations
- **Security Policies** - GDPR, HIPAA, SOC2 compliance support
- **Resource Limits** - Per-tenant quotas and monitoring
- **Audit Logging** - Comprehensive operation tracking

### **⚡ Performance & Reliability**

- **Vector-Optimized Caching** - Embedding-aware cache strategies
- **Smart Query Optimization** - Collection-aware cache invalidation
- **Circuit Breaker** - Automatic failure handling and recovery
- **Performance Metrics** - Sub-100ms operation tracking
- **Health Monitoring** - Production-ready observability

### **🔒 Type Safety & Security**

- **Zero `any` Types** - Comprehensive TypeScript safety with runtime validation
- **Type Guards** - Runtime validation for all external data
- **Secure Multi-Tenancy** - Data isolation and access control
- **Embedding Security** - Provider-agnostic security policies

### **🛠️ Traditional Features (Enhanced)**

- **Multi-Provider Embeddings** (OpenAI, HuggingFace, Cohere, Custom)
- **Deterministic Chunking** with parent/child relationship tracking
- **Strict Error Propagation** (embedding helpers throw; no silent skips)
- **Startup Config Validation** (host, port, provider requirements)
- **Metadata Relationship Docs** (stored without embeddings to save cost)
- **Health Monitoring & Diagnostics**
- **Batch-Oriented Operations** (encouraged over single-item API)
- **Enhanced Type Safety** (zero `any` types, comprehensive validation)

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/nestjs-chromadb
```

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: 'localhost',
        port: 8000,
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: 'text-embedding-3-small',
        },
      },
    }),
  ],
})
export class AppModule {}
```

## 🏗️ **TypeORM-Style Repository Pattern (Recommended - UPDATED 2025)**

The module provides a **TypeORM-style repository pattern** with explicit constructor-based dependency injection, mirroring the Neo4j implementation from TASK_2025_004.

### **Why Use This Pattern?**

✅ **Explicit Constructor DI** - Clear, predictable dependency injection (no decorator magic)
✅ **Type-Safe CRUD** - Full generic type propagation with zero `any` types
✅ **Clean Architecture** - Composition pattern with ChromaDBService
✅ **Zero Boilerplate** - Inherit 15+ CRUD methods automatically
✅ **Extensible** - Add custom business methods while keeping CRUD
✅ **Enterprise-Ready** - Production-tested, type-sound implementation

### **Complete Example: Entity + Repository (TypeORM-Style)**

```typescript
import { Injectable } from '@nestjs/common';
import {
  BaseDocument,
  BaseChromaEntity,
  ChromaEntity,
  ChromaId,
  ChromaProp,
  ChromaDBRepository,
  ChromaDBService,
} from '@hive-academy/nestjs-chromadb';

// ============================================
// Step 1: Define Entity (Decorator-Based Class)
// ============================================

interface UserMetadata {
  name: string;
  email: string;
  department: string;
  skills: string[];
}

@ChromaEntity({
  collection: 'users',
  autoEmbed: true,
  autoTimestamp: true,
})
export class UserEntity extends BaseChromaEntity<UserMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  metadata!: UserMetadata;
  embedding?: readonly number[];
}

// ============================================
// Step 2: Create Repository with Explicit Constructor
// ============================================

@Injectable()
export class UserRepository extends ChromaDBRepository<UserEntity> {
  /**
   * Explicit 3-parameter constructor (TypeORM-style)
   *
   * @param chromaDB - ChromaDBService injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(
      UserEntity, // Entity class (NOT interface - use actual class)
      'users', // Collection name
      chromaDB // ChromaDB service instance
    );
  }

  // ✅ ALL 15+ CRUD methods inherited automatically from ChromaDBRepository<T>:
  //
  // READ Operations:
  // - findById(id): Find single document by ID
  // - findByIds(ids): Find multiple documents by IDs
  // - findAll(options): Find with filtering, limits
  // - count(where?, whereDocument?): Count documents
  // - exists(id): Check if document exists
  // - peek(limit?): Get first N documents
  // - getCollectionInfo(): Get collection metadata
  //
  // WRITE Operations:
  // - create(data): Create single document
  // - createMany(data[]): Batch create
  // - update(id, updates): Update existing document
  // - updateMany(updates[]): Batch update
  // - upsert(data): Create or update (requires id)
  // - upsertMany(data[]): Batch upsert
  //
  // DELETE Operations:
  // - delete(id): Delete by ID
  // - deleteMany(ids[]): Batch delete
  // - deleteByFilter(where?, whereDocument?): Delete by filter
  // - clear(): Clear all documents
  //
  // SEARCH Operations:
  // - search(query, options?): Semantic search
  // - searchWithScores(query, options?): Search with similarity scores
  // - searchSimilar(embedding, options?): Search by embedding vector

  // ============================================
  // Custom Business Methods
  // ============================================

  /**
   * Find user by email (custom business logic)
   * NOTE: ChromaDB's where clause filters metadata, so we filter in application layer
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const allUsers = await this.findAll({ limit: 100 });
    return allUsers.find((user) => user.metadata.email === email) || null;
  }

  /**
   * Find all users in a department
   * Uses application-level filtering for simple metadata queries
   */
  async findByDepartment(department: string): Promise<UserEntity[]> {
    const allUsers = await this.findAll({ limit: 1000 });
    return allUsers.filter((user) => user.metadata.department === department);
  }

  /**
   * Semantic search by skills
   * Combines vector search with post-filtering for complex queries
   */
  async searchBySkills(skills: string[]): Promise<UserEntity[]> {
    const results = await this.search(skills.join(' '), { limit: 50 });
    return results.filter((user) => user.metadata.skills.some((skill) => skills.includes(skill)));
  }
}
```

### **Module Registration (TypeORM-Style)**

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
    // Option 1: Auto-generate repository (simple use case)
    ChromaDBModule.forFeature([UserEntity]),

    // Option 2: Use custom repository (recommended)
    ChromaDBModule.forRoot({
      connection: { host: 'localhost', port: 8000 },
      embedding: { provider: 'openai', config: { apiKey: '...' } },
    }),
  ],
  providers: [
    UserRepository, // Register your custom repository
  ],
  exports: [UserRepository],
})
export class UserModule {}
```

### **Service Usage**

```typescript
import { Injectable } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async createUser(name: string, email: string) {
    return this.userRepo.create({
      content: `User profile for ${name}`,
      metadata: { name, email, department: 'Engineering', skills: [] },
    });
  }

  async searchUsers(query: string) {
    return this.userRepo.search(query, { limit: 10 });
  }

  async findUserByEmail(email: string) {
    return this.userRepo.findByEmail(email);
  }
}
```

### **Complete CRUD Method Reference**

When you extend `ChromaDBRepository<T>`, you inherit all these type-safe methods:

#### **CREATE Operations**

```typescript
// Create single document
async create(
  document: CreateDocumentInput<T>,
  options?: RepositoryOperationOptions
): Promise<T>

// Example
const user = await userRepo.create({
  content: 'User profile...',
  metadata: { name: 'John', email: 'john@example.com' }
});

// Create multiple documents (batch)
async createMany(
  documents: CreateDocumentInput<T>[],
  options?: RepositoryOperationOptions
): Promise<RepositoryOperationResult<T>>

// Example
const result = await userRepo.createMany([
  { content: 'User 1', metadata: { name: 'John' } },
  { content: 'User 2', metadata: { name: 'Jane' } }
]);
console.log(`Created ${result.successCount} users`);
```

#### **READ Operations**

```typescript
// Find by ID
async findById(id: string, options?): Promise<T | null>

// Find multiple by IDs
async findByIds(ids: string[], options?): Promise<T[]>

// Find all with filtering
async findAll(options?: {
  where?: Where;
  whereDocument?: WhereDocument;
  limit?: number;
}): Promise<T[]>

// Count documents
async count(where?: Where, whereDocument?: WhereDocument): Promise<number>

// Check if exists
async exists(id: string): Promise<boolean>

// Peek first N documents
async peek(limit = 10): Promise<T[]>

// Get collection info
async getCollectionInfo(): Promise<{
  name: string;
  count: number;
  metadata?: Record<string, unknown>;
}>

// Examples
const user = await userRepo.findById('user-123');
const activeUsers = await userRepo.findAll({ where: { status: 'active' } });
const count = await userRepo.count({ department: 'Engineering' });
```

#### **UPDATE Operations**

```typescript
// Update single document
async update(
  id: string,
  updates: Partial<T>,
  options?: RepositoryOperationOptions
): Promise<T | null>

// Update multiple documents
async updateMany(
  updates: Array<{ id: string; data: Partial<T> }>,
  options?: RepositoryOperationOptions
): Promise<RepositoryOperationResult<T>>

// Upsert (create or update)
async upsert(
  document: UpsertDocumentInput<T>,
  options?: RepositoryOperationOptions
): Promise<T>

// Upsert multiple
async upsertMany(
  documents: UpsertDocumentInput<T>[],
  options?: RepositoryOperationOptions
): Promise<RepositoryOperationResult<T>>

// Examples
const updated = await userRepo.update('user-123', {
  content: 'Updated profile...'
});

const upserted = await userRepo.upsert({
  id: 'user-123',
  content: 'New or updated content',
  metadata: { name: 'John' }
});
```

#### **DELETE Operations**

```typescript
// Delete by ID
async delete(id: string, options?): Promise<boolean>

// Delete multiple by IDs
async deleteMany(
  ids: string[],
  options?: RepositoryOperationOptions
): Promise<RepositoryOperationResult<never>>

// Delete by filter
async deleteByFilter(
  where?: Where,
  whereDocument?: WhereDocument,
  options?: RepositoryOperationOptions
): Promise<RepositoryOperationResult<never>>

// Clear all documents
async clear(): Promise<void>

// Examples
await userRepo.delete('user-123');
await userRepo.deleteMany(['user-1', 'user-2']);
await userRepo.deleteByFilter({ status: 'inactive' });
```

#### **SEARCH Operations (Vector/Semantic)**

```typescript
// Semantic search
async search(
  query: string,
  options?: RepositorySearchOptions
): Promise<T[]>

// Search with similarity scores
async searchWithScores(
  query: string,
  options?: RepositorySearchOptions
): Promise<Array<{
  document: T;
  score: number;
  distance?: number;
}>>

// Search by embedding vector
async searchSimilar(
  embedding: number[],
  options?: RepositorySearchOptions
): Promise<T[]>

// Examples
const results = await userRepo.search('machine learning expert', {
  limit: 10,
  where: { department: 'Engineering' }
});

const scoredResults = await userRepo.searchWithScores('AI researcher');
scoredResults.forEach(r => {
  console.log(`${r.document.id}: ${r.score}`);
});
```

#### **Input Types**

```typescript
// Create input (id optional, auto-generated if not provided)
type CreateDocumentInput<T extends BaseDocument> = {
  content: string;
  metadata: T extends BaseDocument<infer TMetadata> ? TMetadata : never;
  embedding?: readonly number[];
  id?: string;
};

// Upsert input (id required)
type UpsertDocumentInput<T extends BaseDocument> = CreateDocumentInput<T> & {
  id: string;
};

// Repository options
interface RepositoryOperationOptions {
  includeEmbeddings?: boolean;
  includeMetadata?: boolean;
  includeDocuments?: boolean;
  metadata?: Record<string, unknown>;
  timeout?: number;
}

interface RepositorySearchOptions extends RepositoryOperationOptions {
  limit?: number;
  minScore?: number;
  where?: Where;
  whereDocument?: WhereDocument;
}
```

### **Migration from Old Pattern**

**Before (❌ Manual Service-Based Pattern):**

```typescript
@Injectable()
export class UserService {
  constructor(private chromaDB: ChromaDBService) {}

  async createUser(content: string, metadata: any) {
    const doc = {
      id: uuid(),
      document: content,
      metadata,
    };
    await this.chromaDB.addDocuments('users', [doc]);
    return doc;
  }

  async findUser(id: string) {
    const results = await this.chromaDB.getDocuments('users', { ids: [id] });
    return results.documents?.[0];
  }

  async searchUsers(query: string) {
    return this.chromaDB.searchDocuments('users', [query]);
  }

  // ❌ Need to implement all CRUD methods manually
  // ❌ No type safety for metadata
  // ❌ Repetitive boilerplate code
}
```

**After (✅ TypeORM-Style Repository Pattern):**

```typescript
@ChromaEntity({ collection: 'users', autoEmbed: true })
export class UserEntity extends BaseChromaEntity<UserMetadata> {
  @ChromaId() id!: string;
  @ChromaProp() content!: string;
  metadata!: UserMetadata;
}

@Injectable()
export class UserRepository extends ChromaDBRepository<UserEntity> {
  constructor(chromaDB: ChromaDBService) {
    super(UserEntity, 'users', chromaDB); // ✅ NO CAST NEEDED
  }

  // ✅ All 15+ CRUD methods inherited automatically
  // ✅ Full type safety with generic constraints
  // ✅ Zero boilerplate - just extend and inject

  // Add custom business methods as needed
  async findByEmail(email: string): Promise<UserEntity | null> {
    const users = await this.findAll({ limit: 100 });
    return users.find((u) => u.metadata.email === email) || null;
  }
}
```

**Benefits:**

- **90% Less Code**: CRUD methods inherited automatically
- **Type Safety**: Full generic type propagation with zero `any` types
- **Clean Architecture**: Explicit constructor DI (TypeORM-style)
- **Extensible**: Add custom methods while keeping all CRUD functionality

## 🎯 **Declarative Development Patterns**

### **Declarative Vector Operations**

Replace manual vector operations with decorators:

```typescript
import { Injectable } from '@nestjs/common';
import { VectorQuery, Cached, Profiled, Retry } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class KnowledgeService {
  /**
   * Complete vector search with caching, monitoring, and resilience
   */
  @VectorQuery<KnowledgeDocument>({
    collection: 'knowledge',
    autoEmbed: true, // Auto-generate embeddings from query
    defaultLimit: 10, // Default result limit
    includeMetadata: true, // Include document metadata
    includeDistances: true, // Include similarity scores
    enableCaching: true, // Enable intelligent caching
  })
  @Cached({
    ttl: 300000, // 5 minutes cache
    keyStrategy: 'collection_aware',
    collectionAware: true, // Collection-specific cache invalidation
    invalidateOnMutation: true,
  })
  @Profiled({
    slowQueryThreshold: 100, // Log queries > 100ms
    logLevel: 'slow', // Only log slow queries
    includeParameters: false, // Don't log query parameters in production
  })
  @Retry({
    maxAttempts: 3,
    strategy: 'exponential',
    circuitBreaker: { enabled: true, failureThreshold: 5 },
  })
  async searchKnowledge(params: VectorQueryParams): Promise<KnowledgeDocument[]> {
    // Implementation handled entirely by decorators
    // Auto-generates embeddings, caches results, monitors performance
    // Includes automatic retry with circuit breaker
  }

  /**
   * RAG context retrieval with background cache refresh
   */
  @VectorQuery<KnowledgeDocument>({
    collection: 'knowledge',
    autoEmbed: true,
    defaultLimit: 15,
  })
  @Cached({
    ttl: 600000, // 10 minutes for RAG context
    refreshStrategy: 'background',
    refreshThreshold: 0.8, // Refresh when 80% of TTL reached
  })
  async getRAGContext(query: string, maxTokens = 4000): Promise<string> {
    const results = await this.searchKnowledge({ query });
    return this.truncateToTokenLimit(results, maxTokens);
  }
}
```

### **Enterprise Multi-Tenancy**

Automatic tenant isolation with security policies:

```typescript
import { Injectable } from '@nestjs/common';
import { TenantAware, CrossTenant } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(private readonly chromaService: ChromaDBService) {}

  /**
   * Automatic tenant isolation
   * Collection automatically becomes: 'tenant_{tenantId}_documents'
   * Tenant extracted from JWT token, headers, or custom logic
   */
  @TenantAware({
    namingStrategy: 'prefix', // 'prefix' | 'suffix' | 'separate' | 'custom'
    tenantExtraction: 'jwt', // 'header' | 'query' | 'jwt' | 'context' | 'custom'
    enableTenantCaching: true, // Tenant-specific cache isolation
    enableAuditLog: true, // Comprehensive audit logging
    strictValidation: true, // Validate tenant exists and is active
  })
  async searchDocuments(query: string): Promise<DocumentMetadata[]> {
    // No tenant logic needed - completely handled by decorator
    return this.chromaService.searchDocuments('documents', [query], undefined, {
      nResults: 10,
      includeMetadata: true,
    });
  }

  /**
   * Cross-tenant admin operations with permission validation
   */
  @CrossTenant({
    requiredPermissions: ['admin', 'cross-tenant-read'],
    auditLevel: 'detailed', // Enhanced audit logging for compliance
    maxTenants: 50, // Safety limit for cross-tenant operations
  })
  async globalSearch(query: string): Promise<Array<{ tenantId: string; results: any[] }>> {
    // Search across all tenant collections with comprehensive audit logging
    const tenants = await this.getTenantList();
    return this.searchAcrossTenants(query, tenants);
  }
}
```

## Core Services

### ChromaDBService - Enhanced Core Service

```typescript
listCollections(): Promise<ChromaCollectionInfo[]>
createCollection(...): Promise<Collection>
getCollection(...): Promise<Collection>
deleteCollection(name: string): Promise<void>
collectionExists(name: string): Promise<boolean>
addDocuments(collectionName: string, docs: ChromaDocument[], options?: ChromaBulkOptions): Promise<void>
updateDocuments(...): Promise<void>
upsertDocuments(...): Promise<void>
deleteDocuments(...): Promise<void>
getDocuments(...): Promise<GetResult>
countDocuments(...): Promise<number>
peekDocuments(...): Promise<GetResult>
getCollectionMetadata(name: string): Promise<Record<string, any> | null>
updateCollectionMetadata(...): Promise<void>
searchDocuments(...): Promise<ChromaSearchResult>
similaritySearch(...): Promise<{ ids: string[]; documents: (string | null)[]; metadatas: (Record<string, unknown> | null)[]; distances: number[] }>
```

Removed legacy single-item or semantic convenience methods from docs to reduce ambiguity.

### CollectionService - Collection Management

```typescript
// Collection lifecycle
createCollection(name: string, metadata?: ChromaMetadata): Promise<void>
deleteCollection(name: string): Promise<void>
collectionExists(name: string): Promise<boolean>
listCollections(): Promise<readonly string[]>

// Collection information
getCollectionInfo(name: string): Promise<CollectionInfo>
getCollectionCount(name: string): Promise<number>
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaDBService, ChromaDocument, ChromaBulkOptions } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class KnowledgeService {
  constructor(private readonly chromaDB: ChromaDBService) {}

  async indexKnowledgeBase(documents: Array<{ content: string; source: string }>) {
    const chromaDocs: ChromaDocument[] = documents.map((doc, idx) => ({
      id: `kb-${idx}`,
      document: doc.content,
      metadata: {
        source: doc.source,
        indexed_at: new Date().toISOString(),
        type: 'knowledge',
      },
    }));

    const bulkOptions: ChromaBulkOptions = {
      batchSize: 100,
      autoChunk: true,
      chunkingStrategy: 'smart',
      extractMetadata: true,
      preserveChunkRelationships: true,
    };

    return this.chromaDB.addDocuments('knowledge', chromaDocs, bulkOptions);
  }

  async searchKnowledge(query: string, filters?: any) {
    return this.chromaDB.searchDocuments('knowledge', [query], undefined, {
      nResults: 10,
      where: filters,
      includeMetadata: true,
      includeDistances: true,
    });
  }

  async getRAGContext(query: string, maxTokens: number = 4000) {
    const results = await this.chromaDB.similaritySearch('knowledge', query, {
      limit: 15,
    });

    // Truncate to token limit for RAG context
    return this.truncateToTokenLimit(results, maxTokens);
  }
}
```

## 🔧 **Enhanced Configuration**

### **Multi-Tenant Configuration**

Enterprise-grade multi-tenancy with compliance support:

```typescript
import { TENANT_CONSTANTS, DEFAULT_TENANT_CONFIG } from '@hive-academy/nestjs-chromadb';

// Basic Multi-Tenancy
ChromaDBModule.forRoot({
  connection: {
    host: 'localhost',
    port: 8000,
    ssl: false,
  },
  embedding: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    },
  },
  multiTenant: {
    isolation: TENANT_CONSTANTS.ISOLATION_CONFIGS.STANDARD,
    enableRegistry: true,
    enableResourceLimits: true,
    defaultResourceLimits: TENANT_CONSTANTS.RESOURCE_LIMITS.pro,
  },
});

// Enterprise Multi-Tenancy with Compliance
ChromaDBModule.forRoot({
  // ... connection and embedding config
  multiTenant: {
    isolation: TENANT_CONSTANTS.ISOLATION_CONFIGS.ENTERPRISE,
    enableRegistry: true,
    enableResourceLimits: true,
    enableCrossTenantAdmin: true,
    securityPolicies: [
      TENANT_CONSTANTS.SECURITY_POLICIES.GDPR_COMPLIANCE,
      TENANT_CONSTANTS.SECURITY_POLICIES.SOC2_COMPLIANCE,
      TENANT_CONSTANTS.SECURITY_POLICIES.DATA_ENCRYPTION,
    ],
    lifecycleHooks: {
      onTenantCreate: async (tenant) => {
        console.log(`New tenant created: ${tenant.tenantId}`);
      },
      onTenantDelete: async (tenantId) => {
        console.log(`Tenant deleted: ${tenantId}`);
      },
    },
  },
});
```

### **Decorator Configuration Presets**

Use optimized decorator combinations for different environments:

```typescript
import { DecoratorPresets, applyDecoratorPreset } from '@hive-academy/nestjs-chromadb';

// Production-optimized configuration
const productionConfig = DecoratorPresets.production;

// Development-friendly configuration with detailed logging
const devConfig = DecoratorPresets.development;

// High-performance configuration with aggressive caching
const performanceConfig = DecoratorPresets.performanceOptimized;

// Custom preset with overrides
const customConfig = applyDecoratorPreset('production', {
  caching: { ttl: 1800000 }, // 30 minutes
  profiling: { samplingRate: 0.1 }, // 10% sampling
  tenantAware: {
    namingStrategy: 'separate',
    enableAuditLog: true,
  },
});
```

### **Comprehensive Async Configuration**

Full async configuration with validation:

```typescript
ChromaDBModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const config = {
      connection: {
        host: configService.get('CHROMA_HOST', 'localhost'),
        port: configService.get('CHROMA_PORT', 8000),
        ssl: configService.get('CHROMA_SSL', false),
        timeout: configService.get('CHROMA_TIMEOUT', 30000),
      },
      embedding: {
        provider: configService.get('EMBEDDING_PROVIDER', 'openai'),
        config: {
          apiKey: configService.get('OPENAI_API_KEY'),
          model: configService.get('EMBEDDING_MODEL', 'text-embedding-3-small'),
        },
      },
      multiTenant: configService.get('ENABLE_MULTI_TENANT', false)
        ? {
            isolation: {
              namingStrategy: configService.get('TENANT_NAMING_STRATEGY', 'separate'),
              tenantExtraction: configService.get('TENANT_EXTRACTION', 'jwt'),
              strictValidation: true,
              enableTenantCaching: true,
              enableAuditLog: configService.get('ENABLE_AUDIT_LOG', true),
            },
            enableRegistry: true,
            enableResourceLimits: true,
            defaultResourceLimits:
              TENANT_CONSTANTS.RESOURCE_LIMITS[configService.get('DEFAULT_TENANT_TIER', 'pro')],
          }
        : undefined,
      defaultCollection: 'documents',
      batchSize: configService.get('CHROMA_BATCH_SIZE', 100),
    };

    // Configuration validation runs automatically at startup
    return config;
  },
  inject: [ConfigService],
});
```

### Basic Configuration

```typescript
ChromaDBModule.forRoot({
  connection: {
    host: 'http://localhost',
    port: 8000,
    ssl: false,
  },
  embedding: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    },
  },
  defaultCollection: 'documents',
  batchSize: 100,
});
```

### Async Configuration

```typescript
ChromaDBModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    connection: {
      host: configService.get('CHROMA_HOST', 'localhost'),
      port: configService.get('CHROMA_PORT', 8000),
    },
    embedding: {
      provider: configService.get('EMBEDDING_PROVIDER', 'openai'),
      config: {
        apiKey: configService.get('OPENAI_API_KEY'),
        model: configService.get('EMBEDDING_MODEL', 'text-embedding-3-small'),
      },
    },
  }),
  inject: [ConfigService],
});
```

### Embedding Provider Configurations

```typescript
// OpenAI Configuration
embedding: {
  provider: 'openai',
  config: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
    dimensions: 1536
  }
}

// HuggingFace Configuration
embedding: {
  provider: 'huggingface',
  config: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: 'sentence-transformers/all-MiniLM-L6-v2'
  }
}

// Cohere Configuration
embedding: {
  provider: 'cohere',
  config: {
    apiKey: process.env.COHERE_API_KEY,
    model: 'embed-english-v3.0'
  }
}
```

## Advanced Features

### Intelligent Document Chunking (embedding-safe)

```typescript
// Smart chunking with relationship preservation
const options: ChromaBulkOptions = {
  autoChunk: true,
  chunkingStrategy: 'smart', // 'recursive' | 'token' | 'semantic' | 'smart'
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveChunkRelationships: true,
  extractMetadata: true,
};

await this.chromaDB.addDocuments('documents', docs, options);

// Notes:
// - Each chunk gets its own embedding (no parent reuse)
// - Relationship summary docs are stored without embeddings
// - autoChunk without TextSplitterService logs a warning
```

### Advanced Search Operations

```typescript
// Hybrid search with multiple filters
const results = await this.chromaDB.searchDocuments('documents', ['AI development'], undefined, {
  nResults: 20,
  where: {
    category: 'technical',
    status: 'published',
    author: { $in: ['john', 'jane'] },
  },
  whereDocument: {
    $and: [{ $contains: 'NestJS' }, { $not_contains: 'deprecated' }],
  },
  includeMetadata: true,
  includeDistances: true,
});

// Semantic similarity with threshold filtering
const similarDocs = await this.chromaDB.findSimilarDocuments('documents', 'doc-123', 10);
const filteredResults = similarDocs.documents?.filter(
  (_, idx) => (similarDocs.distances?.[0][idx] || 0) < 0.8 // similarity threshold
);
```

### Embedding Error Handling

Embedding utilities throw on failure; wrap bulk operations in try/catch when graceful degradation is desired.

### Metadata Management

```typescript
import {
  sanitizeMetadata,
  validateMetadata,
  validateMetadataSchema,
} from '@hive-academy/nestjs-chromadb';

// Sanitize metadata for ChromaDB compatibility
const sanitized = sanitizeMetadata({
  tags: ['ai', 'ml'],
  score: 0.95,
  nested: { invalid: 'object' }, // Will be JSON stringified
});

// Validate with schema
const schema = {
  category: { type: 'string', required: true, enum: ['tech', 'business'] },
  score: { type: 'number', min: 0, max: 1 },
};
const validation = validateMetadataSchema(metadata, schema);
```

## Dependency Injection

```typescript
import {
  InjectChromaDB,
  InjectChromaDBClient,
  InjectCollection,
} from '@hive-academy/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(
    @InjectChromaDB() private chromaDB: ChromaDBService,
    @InjectChromaDBClient() private client: ChromaApi,
    @InjectCollection('documents') private collection: Collection
  ) {}
}
```

## Core Interfaces

### ChromaDocument Structure

```typescript
interface ChromaDocument {
  readonly id: string;
  readonly document?: string;
  readonly metadata?: ChromaMetadata;
  readonly embedding?: readonly number[];
}

interface ChromaMetadata {
  [key: string]: string | number | boolean;
}
```

### Search Options

```typescript
interface ChromaSearchOptions {
  nResults?: number;
  where?: Where;
  whereDocument?: WhereDocument;
  includeMetadata?: boolean;
  includeDocuments?: boolean;
  includeDistances?: boolean;
}

interface ChromaBulkOptions {
  batchSize?: number;
  upsert?: boolean;
  validateIds?: boolean;
  autoChunk?: boolean;
  chunkingStrategy?: 'recursive' | 'token' | 'character' | 'markdown' | 'semantic' | 'smart';
  chunkSize?: number;
  chunkOverlap?: number;
  preserveChunkRelationships?: boolean;
  extractMetadata?: boolean;
  extractTopics?: boolean;
  extractKeywords?: boolean;
  analyzeComplexity?: boolean;
  calculateReadingTime?: boolean;
  detectCrossReferences?: boolean;
  extractCodeMetadata?: boolean;
}
```

## Health Monitoring

```typescript
import { ChromaDBHealthIndicator } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class HealthService {
  constructor(private chromaHealth: ChromaDBHealthIndicator) {}

  async checkHealth() {
    const basic = await this.chromaHealth.isHealthy('chromadb');
    const detailed = await this.chromaHealth.isHealthyDetailed('chromadb');

    return {
      basic,
      detailed: {
        connection: detailed.connection,
        collections: detailed.collections,
        embedding: detailed.embedding,
      },
    };
  }
}
```

## Error Handling

```typescript
import {
  ChromaDBConnectionError,
  ChromaDBCollectionNotFoundError,
  ChromaDBEmbeddingNotConfiguredError,
} from '@hive-academy/nestjs-chromadb';

try {
  await this.chromaDB.addDocuments('collection', [document]);
} catch (error) {
  if (error instanceof ChromaDBConnectionError) {
    // Handle connection issues
    this.logger.error('ChromaDB connection failed', error.message);
  } else if (error instanceof ChromaDBCollectionNotFoundError) {
    this.logger.error('Collection not found', error.message);
  } else if (error instanceof ChromaDBEmbeddingNotConfiguredError) {
    // Handle missing embedding configuration
    this.logger.error('Embedding provider not configured', error.message);
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { ChromaDBModule, ChromaDBService } from '@hive-academy/nestjs-chromadb';

describe('DocumentService', () => {
  let service: DocumentService;
  let chromaDB: ChromaDBService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ChromaDBModule.forRoot({
          connection: { host: 'localhost', port: 8000 },
          embedding: { provider: 'openai', config: { apiKey: 'test-key' } },
        }),
      ],
      providers: [DocumentService],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    chromaDB = module.get<ChromaDBService>(ChromaDBService);
  });

  it('should index documents with metadata', async () => {
    const documents = [{ content: 'Test document', source: 'test' }];

    await service.indexKnowledgeBase(documents);
    const results = await chromaDB.getCollectionCount('knowledge');

    expect(results).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeouts

```typescript
// Solution: Increase timeout values
connection: {
  host: 'localhost',
  port: 8000,
  timeout: 60000, // Increase timeout
  retries: 5      // Increase retries
}
```

#### 2. Embedding Rate Limits

```typescript
// Solution: Implement batch processing with delays
const options: ChromaBulkOptions = {
  batchSize: 50, // Reduce batch size
  delayBetweenBatches: 1000, // Add delay between batches
};
```

#### 3. Memory Usage

```typescript
// Solution: Process documents in smaller chunks
const chunkSize = 100;
for (let i = 0; i < documents.length; i += chunkSize) {
  const chunk = documents.slice(i, i + chunkSize);
  await this.chromaDB.addDocuments('collection', chunk);
}
```

## 📊 **Performance Monitoring & Observability**

### **Real-Time Performance Metrics**

Monitor vector operations with comprehensive metrics:

```typescript
import {
  getPerformanceStatistics,
  getCacheStatistics,
  getRetryStatistics,
} from '@hive-academy/nestjs-chromadb';

// Performance monitoring
const perfStats = await getPerformanceStatistics();
console.log({
  slowQueries: perfStats.slowQueries,
  avgExecutionTime: perfStats.avgExecutionTime,
  operationsPerSecond: perfStats.operationsPerSecond,
  percentiles: {
    p50: perfStats.percentiles.p50,
    p95: perfStats.percentiles.p95,
    p99: perfStats.percentiles.p99,
  },
});

// Cache performance
const cacheStats = await getCacheStatistics();
console.log({
  hitRate: cacheStats.hitRate,
  missRate: cacheStats.missRate,
  evictionRate: cacheStats.evictionRate,
  avgResponseTime: cacheStats.avgResponseTime,
  totalOperations: cacheStats.totalOperations,
});

// Retry and circuit breaker stats
const retryStats = await getRetryStatistics();
console.log({
  totalRetries: retryStats.totalRetries,
  successfulRetries: retryStats.successfulRetries,
  circuitBreakerTrips: retryStats.circuitBreakerTrips,
  avgRetryDelay: retryStats.avgRetryDelay,
});
```

### **Health Monitoring & Diagnostics**

Comprehensive health checking for production environments:

```typescript
import { ChromaDBHealthIndicator } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class HealthService {
  constructor(private chromaHealth: ChromaDBHealthIndicator) {}

  async getDetailedHealth() {
    const health = await this.chromaHealth.isHealthyDetailed('chromadb');

    return {
      connection: health.connection,
      collections: health.collections,
      embedding: health.embedding,
      cache: health.cache,
      multiTenant: health.multiTenant,
      performance: {
        avgResponseTime: health.performance.avgResponseTime,
        operationsPerSecond: health.performance.operationsPerSecond,
        errorRate: health.performance.errorRate,
        slowQueryCount: health.performance.slowQueryCount,
      },
      resourceUsage: {
        memoryUsage: health.resourceUsage.memoryUsage,
        diskUsage: health.resourceUsage.diskUsage,
        networkLatency: health.resourceUsage.networkLatency,
      },
    };
  }
}
```

### **Tenant-Specific Monitoring**

Track performance and usage per tenant:

```typescript
import { MultiTenantChromaService } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class TenantMonitoringService {
  constructor(private multiTenantService: MultiTenantChromaService) {}

  async getTenantMetrics(tenantId: string) {
    const metrics = await this.multiTenantService.getTenantMetrics(tenantId, {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date(),
    });

    return {
      tenant: tenantId,
      usage: {
        totalOperations: metrics.metrics.totalOperations,
        totalDocuments: metrics.metrics.totalDocuments,
        storageUsed: metrics.metrics.storageUsed,
        embeddingOperations: metrics.metrics.embeddingOperations,
      },
      performance: {
        avgOperationTime: metrics.metrics.avgOperationTime,
        errorRate: metrics.metrics.errorRate,
      },
      compliance: {
        auditLogCount: metrics.auditLogCount,
        securityViolations: metrics.securityViolations,
      },
    };
  }
}
```

## 🚀 **Migration Guide from Legacy ChromaDB Usage**

### **Step 1: Identify Current Usage Patterns**

Use the provided scanner to identify all ChromaDB usage in your application:

```bash
# Scan for ChromaDB usage patterns
npx @hive-academy/nestjs-chromadb scan ./src --output=chromadb-usage-report.json
```

### **Step 2: Basic to Decorator Migration**

**Before (Legacy Service Pattern):**

```typescript
@Injectable()
export class DocumentService {
  constructor(private chromaDB: ChromaDBService) {}

  async searchDocuments(query: string, collection: string) {
    try {
      const results = await this.chromaDB.searchDocuments(collection, [query]);
      return results;
    } catch (error) {
      this.logger.error('Search failed', error);
      throw error;
    }
  }

  async createDocument(data: any) {
    const doc = { id: uuid(), document: JSON.stringify(data), metadata: data };
    await this.chromaDB.addDocuments('documents', [doc]);
    return doc;
  }
}
```

**After (Decorator Pattern):**

```typescript
@Injectable()
export class DocumentService {
  @VectorQuery<DocumentResult>({
    collection: 'documents',
    autoEmbed: true,
    defaultLimit: 10,
  })
  @Cached({ ttl: 300000, keyStrategy: 'collection_aware' })
  @Profiled({ slowQueryThreshold: 100 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async searchDocuments(params: VectorQueryParams): Promise<DocumentResult[]> {
    // All functionality handled by decorators
  }

  @ChromaRepository<DocumentData>({
    collection: 'documents',
    autoEmbed: true,
    enableValidation: true,
  })
  // Create method auto-generated by decorator
}
```

### **Step 3: Repository Pattern Migration**

**Before (Manual CRUD):**

```typescript
@Injectable()
export class UserService {
  constructor(private chromaDB: ChromaDBService) {}

  async createUser(userData: any) {
    const doc = { id: uuid(), document: JSON.stringify(userData), metadata: userData };
    await this.chromaDB.addDocuments('users', [doc]);
    return doc;
  }

  async findUser(id: string) {
    const results = await this.chromaDB.getDocuments('users', { ids: [id] });
    return results.documents[0];
  }

  async updateUser(id: string, updates: any) {
    const existing = await this.findUser(id);
    const updated = { ...existing, ...updates };
    await this.chromaDB.updateDocuments('users', [updated]);
    return updated;
  }
}
```

**After (TypeORM-Style Repository):**

```typescript
interface UserDocumentMetadata {
  name: string;
  email: string;
  department: string;
}

@ChromaEntity({ collection: 'users', autoEmbed: true })
export class UserDocument extends BaseChromaEntity<UserDocumentMetadata> {
  @ChromaId() id!: string;
  @ChromaProp() content!: string;
  metadata!: UserDocumentMetadata;
}

@Injectable()
export class UserRepository extends ChromaDBRepository<UserDocument> {
  constructor(chromaDB: ChromaDBService) {
    super(UserDocument, 'users', chromaDB); // ✅ NO CAST - class reference
  }

  // ✅ All CRUD methods inherited: create, findById, update, delete, search, etc.

  // Add custom business methods
  async findByEmail(email: string): Promise<UserDocument | null> {
    const users = await this.findAll({ limit: 100 });
    return users.find((u) => u.metadata.email === email) || null;
  }
}
```

### **Step 4: Multi-Tenant Migration**

**Before (Manual Tenant Handling):**

```typescript
async searchUserDocuments(userId: string, query: string) {
  const collection = `user_${userId}_documents`;

  // Manual tenant validation
  if (!await this.validateUserAccess(userId)) {
    throw new Error('Access denied');
  }

  // Manual audit logging
  await this.logUserOperation(userId, 'search', query);

  return this.chromaDB.searchDocuments(collection, [query]);
}
```

**After (Tenant Decorator):**

```typescript
@TenantAware({
  namingStrategy: 'prefix',
  tenantExtraction: 'jwt',
  enableAuditLog: true,
  strictValidation: true,
})
async searchDocuments(query: string): Promise<Document[]> {
  // Collection automatically becomes 'tenant_{tenantId}_documents'
  // Tenant extracted from JWT automatically
  // Validation and audit logging handled automatically
  return this.chromaDB.searchDocuments('documents', [query]);
}
```

### **Step 5: Performance Enhancement Migration**

**Before (Manual Caching and Retry):**

```typescript
async searchWithCache(query: string) {
  const cacheKey = `search:${hash(query)}`;

  // Manual cache check
  let result = await this.cache.get(cacheKey);
  if (result) return result;

  // Manual retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await this.chromaDB.searchDocuments('docs', [query]);
      await this.cache.set(cacheKey, result, 300000);
      return result;
    } catch (error) {
      if (attempt === 3) throw error;
      await this.delay(1000 * attempt);
    }
  }
}
```

**After (Performance Decorators):**

```typescript
@VectorQuery({ collection: 'docs' })
@Cached({ ttl: 300000, keyStrategy: 'collection_aware' })
@Retry({ maxAttempts: 3, strategy: 'exponential' })
@Profiled({ slowQueryThreshold: 100 })
async searchDocuments(params: VectorQueryParams): Promise<Document[]> {
  // All caching, retry, and monitoring handled automatically
}
```

## 🔧 **Development Best Practices**

### **Type Safety Guidelines**

```typescript
// ✅ CORRECT: Use proper type definitions
interface UserDocument
  extends BaseDocument<{
    name: string;
    email: string;
    role: 'admin' | 'user';
  }> {}

// ❌ AVOID: Using any types
const userData: any = { name: 'John' };

// ✅ CORRECT: Use type guards for validation
import { TypeSafeConverter, assertValidDocument } from '@hive-academy/nestjs-chromadb';

const document = TypeSafeConverter.toDocument<UserDocument>(unknownData);
assertValidDocument(document, 'Expected valid user document');
```

### **Performance Optimization**

```typescript
// ✅ CORRECT: Use appropriate cache strategies
@Cached({
  ttl: 300000,                    // 5 minutes for frequently accessed data
  keyStrategy: 'collection_aware', // Collection-specific cache keys
  refreshStrategy: 'background',   // Background refresh for hot data
  collectionAware: true,          // Collection-specific invalidation
})

// ✅ CORRECT: Use appropriate batch sizes
@ChromaRepository({
  defaultBatchSize: 100,          // Optimal for most use cases
  enableBatch: true,              // Enable batch operations
})

// ✅ CORRECT: Use sampling for high-frequency operations
@Profiled({
  samplingRate: 0.1,              // 10% sampling for production
  slowQueryThreshold: 100,        // Log queries > 100ms
})
```

### **Security Best Practices**

```typescript
// ✅ CORRECT: Enable comprehensive audit logging
@TenantAware({
  enableAuditLog: true,
  strictValidation: true,
  enableTenantCaching: true,
})

// ✅ CORRECT: Use appropriate security policies
multiTenant: {
  securityPolicies: [
    TENANT_CONSTANTS.SECURITY_POLICIES.GDPR_COMPLIANCE,
    TENANT_CONSTANTS.SECURITY_POLICIES.DATA_ENCRYPTION,
    TENANT_CONSTANTS.SECURITY_POLICIES.ACCESS_CONTROL,
  ],
}

// ✅ CORRECT: Validate cross-tenant operations
@CrossTenant({
  requiredPermissions: ['admin', 'cross-tenant-read'],
  auditLevel: 'detailed',
  maxTenants: 50,                 // Safety limit
})
```

This comprehensive enterprise-grade module provides declarative, type-safe, and highly performant ChromaDB integration with advanced features for building sophisticated AI-powered applications with zero boilerplate code.
