# ChromaDB Module - Enterprise Vector Database Integration

## Overview

The **@hive-academy/nestjs-chromadb** module provides **enterprise-grade ChromaDB integration** for NestJS applications, featuring **declarative decorators**, **multi-tenancy**, **intelligent caching**, and **production-ready monitoring** for building sophisticated AI-powered applications.

## 🚀 **Key Features**

### **🏗️ Entity & Repository Pattern (Recommended)**

- **@ChromaEntity** - Declarative entity definitions with automatic schema generation
- **BaseChromaRepository<T>** - Compile-time type-safe CRUD with zero boilerplate (70% less code)
- **Property Decorators** - @ChromaId, @ChromaProp, @ChromaMetadata, @CreatedAt, @UpdatedAt
- **Smart Defaults** - Auto-embedding, auto-timestamps, auto-ID generation
- **Full Type Safety** - No `!` assertions, complete TypeScript autocomplete

### **🎯 Declarative Decorator Ecosystem**

- **@VectorQuery** - Zero-boilerplate vector search operations
- **@ChromaRepository** - Auto-generated CRUD operations with type safety
- **@Cached** - Intelligent vector-aware caching with collection invalidation
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

- **Zero `any` Types** - Comprehensive TypeScript safety
- **Runtime Validation** - Type guards for all external data
- **Secure Multi-Tenancy** - Data isolation and access control
- **Embedding Security** - Provider-agnostic security policies

## 🎯 **Quick Start**

### **Installation**

```bash
npm install @hive-academy/nestjs-chromadb
```

### **Basic Setup**

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

### **Entity & Repository Pattern (Recommended)**

```typescript
import { Injectable } from '@nestjs/common';
import {
  BaseChromaEntity,
  BaseChromaRepository,
  ChromaEntity,
  ChromaId,
  ChromaProp,
  ChromaMetadata,
  CreatedAt,
  UpdatedAt,
  ChromaRepository,
} from '@hive-academy/nestjs-chromadb';

// Step 1: Define Entity
interface UserMetadata {
  name: string;
  email: string;
  department: string;
}

@ChromaEntity({
  collection: 'users',
  autoEmbed: true,
  autoTimestamp: true,
  autoGenerateIds: true,
})
export class UserEntity extends BaseChromaEntity<UserMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  @ChromaMetadata()
  metadata!: UserMetadata;

  @CreatedAt()
  createdAt!: string;

  @UpdatedAt()
  updatedAt!: string;
}

// Step 2: Create Repository
@Injectable()
@ChromaRepository({ collection: 'users' })
export class UserRepository extends BaseChromaRepository<UserEntity> {
  constructor(private readonly chromaService: ChromaDBService) {
    super();
  }

  // ✅ All CRUD methods available with full type safety - zero boilerplate!
  // create, findById, findAll, update, delete, search, searchWithScores, etc.

  // Add custom business methods
  async findByDepartment(department: string): Promise<UserEntity[]> {
    return this.findAll({ where: { department } });
  }

  async searchSimilarUsers(user: UserDocument): Promise<UserDocument[]> {
    const query = `${user.metadata.name} ${user.metadata.department}`;
    return this.search(query, { limit: 5 });
  }
}
```

### **Enterprise Multi-Tenancy**

```typescript
import { Injectable } from '@nestjs/common';
import { TenantAware, CrossTenant } from '@hive-academy/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(private readonly chromaService: ChromaDBService) {}

  /**
   * Automatic tenant isolation - collection becomes: 'tenant_{tenantId}_documents'
   * Tenant extracted from JWT token or headers
   */
  @TenantAware({
    namingStrategy: 'prefix',
    tenantExtraction: 'jwt',
    enableTenantCaching: true,
    enableAuditLog: true,
  })
  async searchDocuments(query: string): Promise<DocumentMetadata[]> {
    return this.chromaService.searchDocuments('documents', [query], undefined, {
      nResults: 10,
      includeMetadata: true,
    });
  }

  /**
   * Cross-tenant admin operation with permission validation
   */
  @CrossTenant({
    requiredPermissions: ['admin', 'cross-tenant-read'],
    auditLevel: 'detailed',
  })
  async globalSearch(query: string): Promise<Array<{ tenantId: string; results: any[] }>> {
    // Search across all tenant collections with comprehensive audit logging
    const tenants = await this.getTenantList();
    return this.searchAcrossTenants(query, tenants);
  }
}
```

### **Declarative Vector Operations**

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
    autoEmbed: true,
    defaultLimit: 10,
    includeMetadata: true,
    includeDistances: true,
  })
  @Cached({
    ttl: 300000, // 5 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
    invalidateOnMutation: true,
  })
  @Profiled({
    slowQueryThreshold: 100,
    logLevel: 'slow',
    includeParameters: false,
  })
  @Retry({
    maxAttempts: 3,
    strategy: 'exponential',
    circuitBreaker: { enabled: true, failureThreshold: 5 },
  })
  async searchKnowledge(params: VectorQueryParams): Promise<KnowledgeDocument[]> {
    // Implementation handled entirely by decorators
    // Returns type-safe results with automatic caching, monitoring, and retry logic
  }

  /**
   * RAG context retrieval with intelligent caching
   */
  @VectorQuery<KnowledgeDocument>({
    collection: 'knowledge',
    autoEmbed: true,
    defaultLimit: 15,
  })
  @Cached({
    ttl: 600000, // 10 minutes for RAG context
    refreshStrategy: 'background',
    refreshThreshold: 0.8,
  })
  async getRAGContext(query: string, maxTokens = 4000): Promise<string> {
    const results = await this.searchKnowledge({ query });
    return this.truncateToTokenLimit(results, maxTokens);
  }
}
```

## 🏗️ **Architecture & Components**

### **Core Services**

#### **ChromaDBService** - Enhanced Core Service

```typescript
// Collection Management
listCollections(): Promise<ChromaCollectionInfo[]>
createCollection(name: string, metadata?: Record<string, unknown>): Promise<Collection>
deleteCollection(name: string): Promise<void>
collectionExists(name: string): Promise<boolean>

// Document Operations with Enhanced Monitoring
addDocuments(collectionName: string, docs: ChromaDocument[], options?: ChromaBulkOptions): Promise<void>
updateDocuments(collectionName: string, docs: ChromaDocument[], options?: ChromaBulkOptions): Promise<void>
upsertDocuments(collectionName: string, docs: ChromaDocument[], options?: ChromaBulkOptions): Promise<void>
deleteDocuments(collectionName: string, ids?: string[], where?: Where, whereDocument?: WhereDocument): Promise<void>

// Advanced Search Operations
searchDocuments(collectionName: string, queryTexts?: string[], queryEmbeddings?: number[][], options?: ChromaSearchOptions): Promise<ChromaSearchResult>
similaritySearch(collectionName: string, query: string | number[], options?: SimilaritySearchOptions): Promise<SimilaritySearchResult>

// Metadata and Analytics
getDocuments(collectionName: string, options?: GetDocumentsOptions): Promise<GetResult>
countDocuments(collectionName: string): Promise<number>
peekDocuments(collectionName: string, limit?: number): Promise<GetResult>
getCollectionMetadata(collectionName: string): Promise<Record<string, unknown> | null>
updateCollectionMetadata(collectionName: string, metadata: Record<string, unknown>): Promise<void>
```

#### **MultiTenantChromaService** - Enterprise Multi-Tenancy

```typescript
// Tenant-Aware Operations
executeForTenant<T>(tenantContext: TenantContext, operation: Operation<T>, collection: string): Promise<T>
searchAcrossTenants(adminContext: TenantContext, query: string, collection: string, tenantIds: string[]): Promise<CrossTenantResults[]>

// Tenant Management
createTenantCollection(tenantContext: TenantContext, collection: string, metadata?: Record<string, unknown>): Promise<void>
deleteTenant(adminContext: TenantContext, tenantId: string): Promise<void>
getTenantMetrics(tenantId: string, timeRange: TimeRange): Promise<TenantOperationMetrics>
```

#### **ChromaCacheService** - Vector-Optimized Caching

```typescript
// Vector-Specific Caching
cacheVectorSearch(key: string, results: VectorSearchResult[], ttl?: number): Promise<void>
getCachedVectorSearch(key: string): Promise<VectorSearchResult[] | null>
getCachedEmbedding(content: string, model?: string): Promise<number[] | null>
cacheEmbedding(content: string, embedding: number[], model?: string, ttl?: number): Promise<void>

// Collection-Aware Invalidation
invalidateCollection(collectionName: string): Promise<void>
invalidatePattern(pattern: string): Promise<void>
getVectorStatistics(): Promise<CacheStatistics>
```

## 🎨 **Decorator Ecosystem**

### **@VectorQuery** - Declarative Vector Search

```typescript
interface VectorQueryConfig<TResult, TParams = {}> {
  collection: string | ((params: TParams) => string);
  autoEmbed?: boolean;
  defaultLimit?: number;
  similarity?: 'cosine' | 'euclidean' | 'dot_product';
  filters?: (params: TParams) => VectorFilters;
  postProcess?: (results: RawVectorResult[]) => TResult[];
  includeMetadata?: boolean;
  includeDocuments?: boolean;
  includeDistances?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  validateParams?: boolean;
  errorHandling?: 'throw' | 'log_and_continue' | 'silent';
}

@VectorQuery<DocumentResult>({
  collection: 'documents',
  autoEmbed: true,
  defaultLimit: 10,
  filters: (params) => ({ category: params.category }),
})
async searchDocuments(params: SearchParams): Promise<DocumentResult[]> {
  // Implementation automatically generated
}
```

### **@ChromaRepository** - Auto-Generated Repositories

```typescript
interface ChromaRepositoryConfig {
  collection: string;
  autoEmbed?: boolean;
  enableCaching?: boolean;
  enableBatch?: boolean;
  defaultBatchSize?: number;
  enableValidation?: boolean;
  autoTimestamp?: boolean;
  autoGenerateIds?: boolean;
  enableSoftDelete?: boolean;
  errorHandling?: 'throw' | 'log_and_continue' | 'silent';
}

@ChromaRepository<UserDocument>({
  collection: 'users',
  autoEmbed: true,
  enableValidation: true,
  autoTimestamp: true,
})
export class UserRepository {
  // Auto-generated methods:
  // create, createMany, findById, findByIds, findAll, update, updateMany,
  // upsert, upsertMany, delete, deleteMany, deleteByFilter,
  // search, searchWithScores, searchSimilar, count, exists, peek,
  // clear, getCollectionInfo
}
```

### **@TenantAware** - Multi-Tenancy Support

```typescript
interface TenantIsolationConfig {
  namingStrategy: 'prefix' | 'suffix' | 'separate' | 'custom';
  customNaming?: (collection: string, tenantId: string) => string;
  tenantExtraction: 'header' | 'query' | 'jwt' | 'context' | 'custom';
  customExtraction?: (context: ExecutionContext) => Promise<string> | string;
  strictValidation?: boolean;
  enableTenantCaching?: boolean;
  cacheTtl?: number;
  enableAuditLog?: boolean;
  allowCrossTenant?: boolean;
}

@TenantAware({
  namingStrategy: 'separate', // Collection: '{tenantId}:documents'
  tenantExtraction: 'jwt',
  enableTenantCaching: true,
  enableAuditLog: true,
})
async searchDocuments(query: string): Promise<Document[]> {
  // Automatic tenant isolation and audit logging
}
```

### **Performance Decorators**

```typescript
// Intelligent Caching
@Cached({
  ttl: 300000,
  keyStrategy: 'collection_aware',
  collectionAware: true,
  invalidateOnMutation: true,
  refreshStrategy: 'background',
})

// Performance Monitoring
@Profiled({
  slowQueryThreshold: 100,
  logLevel: 'slow',
  includeParameters: false,
  enablePercentiles: true,
  samplingRate: 1.0,
})

// Resilient Operations
@Retry({
  maxAttempts: 3,
  strategy: 'exponential',
  backoffMultiplier: 2,
  jitter: true,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
  },
})
```

## 🔧 **Configuration**

### **Multi-Provider Embedding Support**

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

// Custom Provider
embedding: {
  provider: 'custom',
  config: {
    endpoint: 'https://custom-embedding-api.com',
    apiKey: process.env.CUSTOM_API_KEY,
    model: 'custom-model-v1'
  }
}
```

### **Multi-Tenant Configuration**

```typescript
import { TENANT_CONSTANTS, DEFAULT_TENANT_CONFIG } from '@hive-academy/nestjs-chromadb';

// Basic Multi-Tenancy
ChromaDBModule.forRoot({
  // ... connection config
  multiTenant: {
    isolation: TENANT_CONSTANTS.ISOLATION_CONFIGS.STANDARD,
    enableRegistry: true,
    enableResourceLimits: true,
    defaultResourceLimits: TENANT_CONSTANTS.RESOURCE_LIMITS.pro,
  },
});

// Enterprise Multi-Tenancy with Compliance
ChromaDBModule.forRoot({
  // ... connection config
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
  },
});
```

### **Async Configuration with Validation**

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
              namingStrategy: 'separate',
              tenantExtraction: 'jwt',
              strictValidation: true,
              enableTenantCaching: true,
              enableAuditLog: true,
            },
            enableRegistry: true,
            enableResourceLimits: true,
          }
        : undefined,
      defaultCollection: 'documents',
      batchSize: configService.get('CHROMA_BATCH_SIZE', 100),
    };

    // Configuration validation runs automatically
    return config;
  },
  inject: [ConfigService],
});
```

## 🧩 **Advanced Features**

### **Intelligent Document Chunking**

```typescript
const bulkOptions: ChromaBulkOptions = {
  batchSize: 100,
  autoChunk: true,
  chunkingStrategy: 'smart', // 'recursive' | 'token' | 'semantic' | 'smart'
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveChunkRelationships: true,
  extractMetadata: true,
  extractTopics: true,
  extractKeywords: true,
  analyzeComplexity: true,
  calculateReadingTime: true,
  detectCrossReferences: true,
  extractCodeMetadata: true,
};

await this.chromaDB.addDocuments('documents', docs, bulkOptions);
```

### **Type-Safe Metadata Management**

```typescript
import {
  sanitizeMetadata,
  validateMetadata,
  validateMetadataSchema,
  TypeSafeConverter,
} from '@hive-academy/nestjs-chromadb';

// Runtime type validation
const document = TypeSafeConverter.toDocument<UserDocument>(unknownData);

// Schema validation
const schema = {
  category: { type: 'string', required: true, enum: ['tech', 'business'] },
  score: { type: 'number', min: 0, max: 1 },
  tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
};

const validation = validateMetadataSchema(metadata, schema);
if (!validation.valid) {
  throw new Error(`Invalid metadata: ${validation.errors.join(', ')}`);
}
```

### **Health Monitoring & Observability**

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
      },
    };
  }
}
```

## 🚀 **Migration Guide**

### **From Basic ChromaDB Usage**

**Before:**

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
}
```

**After (with decorators):**

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
}
```

### **To Repository Pattern**

**Before:**

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
}
```

**After (with repository):**

```typescript
@Injectable()
@ChromaRepository<UserDocument>({
  collection: 'users',
  autoEmbed: true,
  enableValidation: true,
  autoTimestamp: true,
})
export class UserRepository {
  constructor(private readonly chromaService: ChromaDBService) {}

  // All CRUD methods auto-generated: create, findById, findAll, update, delete, etc.

  async findByEmail(email: string): Promise<UserDocument | null> {
    const users = await this.findAll({ where: { email } });
    return users[0] || null;
  }
}
```

### **To Multi-Tenant Architecture**

**Before:**

```typescript
async searchUserDocuments(userId: string, query: string) {
  const collection = `user_${userId}_documents`;
  return this.chromaDB.searchDocuments(collection, [query]);
}
```

**After (with multi-tenancy):**

```typescript
@TenantAware({
  namingStrategy: 'prefix',
  tenantExtraction: 'jwt',
  enableAuditLog: true,
})
async searchDocuments(query: string): Promise<Document[]> {
  // Collection automatically becomes 'tenant_{tenantId}_documents'
  // Tenant extracted from JWT automatically
  // Audit logging enabled automatically
  return this.chromaDB.searchDocuments('documents', [query]);
}
```

## 📊 **Performance & Monitoring**

### **Cache Statistics**

```typescript
import { getCacheStatistics } from '@hive-academy/nestjs-chromadb';

const stats = await getCacheStatistics();
console.log({
  hitRate: stats.hitRate,
  missRate: stats.missRate,
  evictionRate: stats.evictionRate,
  avgResponseTime: stats.avgResponseTime,
  totalOperations: stats.totalOperations,
});
```

### **Performance Metrics**

```typescript
import { getPerformanceStatistics } from '@hive-academy/nestjs-chromadb';

const perfStats = await getPerformanceStatistics();
console.log({
  slowQueries: perfStats.slowQueries,
  avgExecutionTime: perfStats.avgExecutionTime,
  operationsPerSecond: perfStats.operationsPerSecond,
  percentiles: perfStats.percentiles,
});
```

### **Tenant Metrics**

```typescript
const tenantMetrics = await multiTenantService.getTenantMetrics('tenant-123', {
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  end: new Date(),
});

console.log({
  totalOperations: tenantMetrics.metrics.totalOperations,
  storageUsed: tenantMetrics.metrics.storageUsed,
  embeddingOperations: tenantMetrics.metrics.embeddingOperations,
  errorRate: tenantMetrics.metrics.errorRate,
});
```

## 🔐 **Security & Compliance**

### **Built-in Compliance Support**

```typescript
import { TENANT_CONSTANTS } from '@hive-academy/nestjs-chromadb';

// GDPR Compliance
const gdprPolicy = TENANT_CONSTANTS.SECURITY_POLICIES.GDPR_COMPLIANCE;

// HIPAA Compliance
const hipaaPolicy = TENANT_CONSTANTS.SECURITY_POLICIES.HIPAA_COMPLIANCE;

// SOC 2 Compliance
const soc2Policy = TENANT_CONSTANTS.SECURITY_POLICIES.SOC2_COMPLIANCE;

// Apply to tenant
await tenantSecurityService.applySecurityPolicies('tenant-123', [
  gdprPolicy.policyId,
  hipaaPolicy.policyId,
  soc2Policy.policyId,
]);
```

### **Data Encryption**

```typescript
// Automatic encryption at rest and in transit
const encryptionPolicy = TENANT_CONSTANTS.SECURITY_POLICIES.DATA_ENCRYPTION;

// Configuration
multiTenant: {
  securityPolicies: [encryptionPolicy],
  isolation: {
    namingStrategy: 'separate',
    strictValidation: true,
    enableAuditLog: true,
  },
}
```

## 🧪 **Testing**

### **Unit Testing with Decorators**

```typescript
import { Test } from '@nestjs/testing';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ChromaDBModule.forRoot({
          connection: { host: 'localhost', port: 8000 },
          embedding: { provider: 'openai', config: { apiKey: 'test-key' } },
        }),
      ],
      providers: [UserRepository],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
  });

  it('should auto-generate CRUD operations', async () => {
    const user = await repository.create({
      content: 'Test user',
      metadata: { name: 'John', email: 'john@example.com' },
    });

    expect(user.id).toBeDefined();
    expect(user.metadata.name).toBe('John');

    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });
});
```

### **Multi-Tenant Testing**

```typescript
describe('Multi-Tenant Operations', () => {
  it('should isolate tenant data', async () => {
    // Set tenant context
    const tenantARepo = new UserRepository(chromaService);
    tenantARepo.setTenantContext({ tenantId: 'tenant-a' });

    const tenantBRepo = new UserRepository(chromaService);
    tenantBRepo.setTenantContext({ tenantId: 'tenant-b' });

    // Create users in different tenants
    await tenantARepo.create({ content: 'User A', metadata: { name: 'Alice' } });
    await tenantBRepo.create({ content: 'User B', metadata: { name: 'Bob' } });

    // Verify isolation
    const tenantAUsers = await tenantARepo.findAll();
    const tenantBUsers = await tenantBRepo.findAll();

    expect(tenantAUsers).toHaveLength(1);
    expect(tenantBUsers).toHaveLength(1);
    expect(tenantAUsers[0].metadata.name).toBe('Alice');
    expect(tenantBUsers[0].metadata.name).toBe('Bob');
  });
});
```

## 🎯 **Decorator Presets**

```typescript
import { DecoratorPresets, applyDecoratorPreset } from '@hive-academy/nestjs-chromadb';

// Production-optimized configuration
const productionConfig = DecoratorPresets.production;

// Development-friendly configuration
const devConfig = DecoratorPresets.development;

// High-performance configuration
const performanceConfig = DecoratorPresets.performanceOptimized;

// Custom preset with overrides
const customConfig = applyDecoratorPreset('production', {
  caching: { ttl: 1800000 }, // 30 minutes
  profiling: { samplingRate: 0.1 }, // 10% sampling
});
```

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Multi-Tenant Configuration**

```typescript
// Issue: Tenant not found in context
// Solution: Ensure proper tenant extraction configuration
@TenantAware({
  tenantExtraction: 'header', // or 'jwt', 'query', 'custom'
  defaultTenant: 'default', // Fallback for development
})
```

#### **2. Cache Performance**

```typescript
// Issue: Poor cache hit rates
// Solution: Use collection-aware caching
@Cached({
  keyStrategy: 'collection_aware',
  collectionAware: true,
  refreshStrategy: 'background',
})
```

#### **3. Type Safety Issues**

```typescript
// Issue: Type errors with documents
// Solution: Use proper type guards and converters
import { TypeSafeConverter, assertValidDocument } from '@hive-academy/nestjs-chromadb';

const document = TypeSafeConverter.toDocument<MyDocument>(unknownData);
assertValidDocument(document, 'Expected valid document');
```

## 📚 **API Reference**

### **Core Interfaces**

```typescript
interface BaseDocument<TMetadata = Record<string, unknown>> {
  id: string;
  content: string;
  metadata: TMetadata;
  embedding?: number[];
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

interface VectorQueryParams {
  query?: string;
  embedding?: number[];
  filters?: Record<string, unknown>;
  limit?: number;
  threshold?: number;
}

interface TenantContext {
  tenantId: string;
  organizationId?: string;
  userId?: string;
  permissions?: string[];
  tier?: 'free' | 'pro' | 'enterprise';
  metadata?: Record<string, unknown>;
}
```

---

## 🚀 **Ready for Production**

The **@hive-academy/nestjs-chromadb** module provides enterprise-grade vector database integration with:

- ✅ **Zero-config decorators** for rapid development
- ✅ **Enterprise multi-tenancy** with automatic isolation
- ✅ **Intelligent caching** for optimal performance
- ✅ **Comprehensive monitoring** and observability
- ✅ **Production-ready security** and compliance
- ✅ **Type-safe operations** with runtime validation

**Start building sophisticated AI applications today!** 🎯
