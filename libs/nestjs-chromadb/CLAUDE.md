# ChromaDB Module - Enterprise Integration Guide

## Overview

The **@hive-academy/nestjs-chromadb** module provides **enterprise-grade ChromaDB integration** for NestJS applications with **declarative decorators**, **multi-tenancy**, and **production-ready monitoring**. This module transforms vector database operations into zero-boilerplate, type-safe, and highly performant experiences.

## 🚀 **Enhanced Key Features**

### **🏗️ Entity & Repository Pattern (NEW)**

- **@ChromaEntity** - Declarative entity definitions with smart defaults
- **@ChromaProp / @ChromaId / @ChromaMetadata** - Property decorators with validation
- **@CreatedAt / @UpdatedAt** - Automatic timestamp management
- **BaseChromaRepository<T>** - Compile-time type-safe CRUD operations (70% less code)
- **Zero Boilerplate** - No `!` assertions needed, full TypeScript autocomplete

### **🎯 Declarative Decorator Ecosystem**

- **@VectorQuery** - Zero-boilerplate vector search with auto-embedding
- **@ChromaRepository** - Complete CRUD auto-generation with type safety
- **@Cached** - Vector-aware intelligent caching with collection invalidation
- **@Profiled** - Real-time performance monitoring and slow query detection
- **@Retry** - Resilient operations with circuit breaker patterns

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

## 🏗️ **Entity & Repository Pattern (Recommended)**

The module provides a comprehensive **Entity/Repository pattern** inspired by Neo4j's architecture, offering compile-time type safety and zero boilerplate code.

### **Why Use This Pattern?**

✅ **Compile-Time Type Safety** - Full TypeScript autocomplete and error detection  
✅ **Zero Boilerplate** - No need for `!` assertion operators  
✅ **Clean Code** - 70% less code compared to traditional patterns  
✅ **Declarative Entities** - Define schema once, use everywhere  
✅ **Familiar Pattern** - Consistent with Neo4j/TypeORM patterns

### **Complete Example: Entity + Repository**

```typescript
import { Injectable } from '@nestjs/common';
import { BaseChromaEntity, BaseChromaRepository, ChromaEntity, ChromaId, ChromaProp, ChromaMetadata, ChromaEmbedding, CreatedAt, UpdatedAt, ChromaRepository, BaseDocument } from '@hive-academy/nestjs-chromadb';

// ============================================
// Step 1: Define Entity with Decorators
// ============================================

interface UserMetadata {
  name: string;
  email: string;
  department: string;
  skills: string[];
}

@ChromaEntity({
  collection: 'users',
  description: 'User entity with profile information',
  autoEmbed: true, // Auto-generate embeddings
  embeddingFields: ['content'],
  autoTimestamp: true, // Auto-manage createdAt/updatedAt
  autoGenerateIds: true, // Auto-generate UUIDs
  idStrategy: 'uuid',
})
export class UserEntity extends BaseChromaEntity<UserMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'User profile description for semantic search',
    validate: (content: string) => content.length > 0 && content.length < 5000,
  })
  content!: string;

  @ChromaMetadata()
  metadata!: UserMetadata;

  @ChromaEmbedding()
  embedding?: number[];

  @CreatedAt()
  createdAt!: string;

  @UpdatedAt()
  updatedAt!: string;
}

// ============================================
// Step 2: Create Repository Extending Base
// ============================================

@Injectable()
@ChromaRepository({
  collection: 'users',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
})
export class UserRepository extends BaseChromaRepository<UserEntity> {
  constructor(private readonly chromaService: ChromaDBService) {
    super();
  }

  // ✅ ALL CRUD methods available automatically:
  // - create(data)
  // - createMany(data[])
  // - findById(id)
  // - findByIds(ids[])
  // - findAll(options)
  // - update(id, data)
  // - updateMany(updates[])
  // - upsert(data)
  // - upsertMany(data[])
  // - delete(id)
  // - deleteMany(ids[])
  // - deleteByFilter(where)
  // - search(query, options)
  // - searchWithScores(query, options)
  // - searchSimilar(embedding, options)
  // - count(where)
  // - exists(id)
  // - peek(limit)
  // - clear()
  // - getCollectionInfo()

  // Add custom business methods
  async findByEmail(email: string): Promise<UserEntity | null> {
    const users = await this.findAll({ where: { email }, limit: 1 });
    return users[0] || null;
  }

  async findByDepartment(department: string): Promise<UserEntity[]> {
    return this.findAll({ where: { department } });
  }

  async searchBySkills(skills: string[]): Promise<UserEntity[]> {
    return this.search(skills.join(' '), {
      where: { skills: { $in: skills } },
      limit: 20,
    });
  }
}
```

### **Available Entity Decorators**

#### **@ChromaEntity(config)** - Entity Definition

Defines the entity schema and collection configuration.

```typescript
@ChromaEntity({
  collection: 'users', // Collection name
  description: 'User entities', // Optional description
  autoEmbed: true, // Auto-generate embeddings
  embeddingFields: ['content'], // Fields to embed
  autoTimestamp: true, // Auto-manage timestamps
  autoGenerateIds: true, // Auto-generate IDs
  idStrategy: 'uuid', // ID generation strategy
})
export class UserEntity extends BaseChromaEntity<UserMetadata> {}
```

#### **@ChromaId()** - ID Property

Marks the ID property (auto-generated if configured).

```typescript
@ChromaId()
id!: string;
```

#### **@ChromaProp(config?)** - Content Property

Marks the main content property for embeddings and search.

```typescript
@ChromaProp({
  description: 'Main searchable content',
  validate: (content: string) => content.length > 0,
  transform: (content: string) => content.trim(),
})
content!: string;
```

#### **@ChromaMetadata()** - Metadata Property

Marks the strongly-typed metadata object.

```typescript
@ChromaMetadata()
metadata!: UserMetadata;
```

#### **@ChromaEmbedding()** - Embedding Vector

Marks the embedding vector property.

```typescript
@ChromaEmbedding()
embedding?: number[];
```

#### **@CreatedAt() / @UpdatedAt()** - Timestamps

Auto-managed timestamp properties.

```typescript
@CreatedAt()
createdAt!: string;

@UpdatedAt()
updatedAt!: string;
```

#### **@JsonProperty(config?)** - JSON Properties

For additional JSON-serializable properties.

```typescript
@JsonProperty({
  description: 'Additional user preferences',
  defaultValue: {},
})
preferences!: Record<string, any>;
```

### **BaseChromaRepository Methods**

When you extend `BaseChromaRepository<T>`, you get all these methods with full type safety:

```typescript
// Create Operations
create(data: CreateDocumentInput<T>): Promise<T>
createMany(data: CreateDocumentInput<T>[]): Promise<RepositoryOperationResult<T>>

// Read Operations
findById(id: string): Promise<T | null>
findByIds(ids: string[]): Promise<T[]>
findAll(options?: { where?, limit?, orderBy? }): Promise<T[]>
count(where?, whereDocument?): Promise<number>
exists(id: string): Promise<boolean>
peek(limit?: number): Promise<T[]>
getCollectionInfo(): Promise<{ name, count, metadata }>

// Update Operations
update(id: string, updates: Partial<T>): Promise<T | null>
updateMany(updates: Array<{ id, data }>): Promise<RepositoryOperationResult<T>>
upsert(data: UpsertDocumentInput<T>): Promise<T>
upsertMany(data: UpsertDocumentInput<T>[]): Promise<RepositoryOperationResult<T>>

// Delete Operations
delete(id: string): Promise<boolean>
deleteMany(ids: string[]): Promise<RepositoryOperationResult>
deleteByFilter(where?, whereDocument?): Promise<RepositoryOperationResult>
clear(): Promise<void>

// Search Operations
search(query: string, options?): Promise<T[]>
searchWithScores(query: string, options?): Promise<Array<{ document: T, score: number }>>
searchSimilar(embedding: number[], options?): Promise<T[]>
```

### **Migration from Old Pattern**

**Before (❌ Old Pattern with Boilerplate):**

```typescript
@Injectable()
@ChromaRepository<UserDocument>({ collection: 'users' })
export class UserRepository implements ChromaRepository<UserDocument> {
  constructor(private chromaService: ChromaDBService) {}

  // ❌ Need 20+ lines of assertions
  create!: ChromaRepository<UserDocument>['create'];
  findById!: ChromaRepository<UserDocument>['findById'];
  findAll!: ChromaRepository<UserDocument>['findAll'];
  update!: ChromaRepository<UserDocument>['update'];
  delete!: ChromaRepository<UserDocument>['delete'];
  search!: ChromaRepository<UserDocument>['search'];
  // ... 15 more lines ...
}
```

**After (✅ New Pattern - Clean & Type-Safe):**

```typescript
@Injectable()
@ChromaRepository({ collection: 'users' })
export class UserRepository extends BaseChromaRepository<UserEntity> {
  constructor(private readonly chromaService: ChromaDBService) {
    super();
  }

  // ✅ All methods available - zero boilerplate!
}
```

**Code Reduction:** ~70% less boilerplate  
**Type Safety:** Compile-time + runtime  
**Developer Experience:** Full autocomplete and error detection

## 🎯 **Declarative Development Patterns**

### **Zero-Config Repository Pattern**

Transform traditional service-based development into declarative repositories:

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaRepository, BaseDocument } from '@hive-academy/nestjs-chromadb';

interface UserDocument
  extends BaseDocument<{
    name: string;
    email: string;
    department: string;
    skills: string[];
  }> {}

@Injectable()
@ChromaRepository<UserDocument>({
  collection: 'users',
  autoEmbed: true, // Automatic embedding generation
  enableCaching: true, // Vector-aware caching
  enableValidation: true, // Runtime type validation
  autoTimestamp: true, // Automatic createdAt/updatedAt
  autoGenerateIds: true, // UUID generation
})
export class UserRepository {
  constructor(private readonly chromaService: ChromaDBService) {}

  // ✅ ALL CRUD methods auto-generated:
  // create, createMany, findById, findByIds, findAll, update, updateMany,
  // upsert, upsertMany, delete, deleteMany, deleteByFilter,
  // search, searchWithScores, searchSimilar, count, exists, peek,
  // clear, getCollectionInfo

  // Add custom business logic
  async findByDepartment(department: string): Promise<UserDocument[]> {
    return this.findAll({ where: { department } });
  }

  async searchBySkills(skills: string[]): Promise<UserDocument[]> {
    const query = skills.join(' ');
    return this.search(query, {
      where: { skills: { $in: skills } },
      limit: 20,
    });
  }
}
```

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
    securityPolicies: [TENANT_CONSTANTS.SECURITY_POLICIES.GDPR_COMPLIANCE, TENANT_CONSTANTS.SECURITY_POLICIES.SOC2_COMPLIANCE, TENANT_CONSTANTS.SECURITY_POLICIES.DATA_ENCRYPTION],
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
            defaultResourceLimits: TENANT_CONSTANTS.RESOURCE_LIMITS[configService.get('DEFAULT_TENANT_TIER', 'pro')],
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
import { sanitizeMetadata, validateMetadata, validateMetadataSchema } from '@hive-academy/nestjs-chromadb';

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
import { InjectChromaDB, InjectChromaDBClient, InjectCollection } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(@InjectChromaDB() private chromaDB: ChromaDBService, @InjectChromaDBClient() private client: ChromaApi, @InjectCollection('documents') private collection: Collection) {}
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
import { ChromaDBConnectionError, ChromaDBCollectionNotFoundError, ChromaDBEmbeddingNotConfiguredError } from '@hive-academy/nestjs-chromadb';

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
import { getPerformanceStatistics, getCacheStatistics, getRetryStatistics } from '@hive-academy/nestjs-chromadb';

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

**After (Repository Decorator):**

```typescript
interface UserDocument
  extends BaseDocument<{
    name: string;
    email: string;
    department: string;
  }> {}

@Injectable()
@ChromaRepository<UserDocument>({
  collection: 'users',
  autoEmbed: true,
  enableValidation: true,
  autoTimestamp: true,
})
export class UserRepository {
  constructor(private readonly chromaService: ChromaDBService) {}

  // All CRUD methods auto-generated: create, findById, update, delete, etc.

  // Add custom business methods
  async findByEmail(email: string): Promise<UserDocument | null> {
    const users = await this.findAll({ where: { email } });
    return users[0] || null;
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
