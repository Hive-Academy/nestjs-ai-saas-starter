# ChromaDB Examples - Complete Guide

This directory contains comprehensive, production-ready examples demonstrating the ChromaDB entity/repository pattern system. Each example showcases real-world patterns and best practices for building AI-powered applications with ChromaDB.

## 📚 Example Overview

### Core Examples (Essential Patterns)

| Example                                                                         | Description                                         | Key Concepts                                      | Lines of Code |
| ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- | ------------- |
| **[01-basic-entity-definition](./01-basic-entity-definition.example.ts)**       | Simple entity with @ChromaEntity decorator          | Entity basics, property mapping, serialization    | ~467          |
| **[02-advanced-property-mappings](./02-advanced-property-mappings.example.ts)** | Complex property transformations and validation     | Smart defaults, custom transforms, JSON handling  | ~835          |
| **[03-repository-crud-operations](./03-repository-crud-operations.example.ts)** | Complete CRUD operations using BaseChromaRepository | CRUD operations, batch processing, error handling | ~1,247        |
| **[04-semantic-search-patterns](./04-semantic-search-patterns.example.ts)**     | Vector similarity and hybrid search strategies      | Semantic search, score thresholding, relevance    | ~1,456        |
| **[05-metadata-filtering](./05-metadata-filtering.example.ts)**                 | Complex metadata queries and filtering              | Range queries, logical operators, performance     | ~1,789        |

### Advanced Examples (Production Patterns)

| Example                                                                       | Description                                  | Key Concepts                                  | Lines of Code |
| ----------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------- | ------------- |
| **[06-custom-repository-methods](./06-custom-repository-methods.example.ts)** | Business logic encapsulation in repositories | Custom methods, workflow orchestration        | ~1,123        |
| **[07-multi-entity-workflows](./07-multi-entity-workflows.example.ts)**       | Complex workflows across multiple entities   | Entity relationships, RAG patterns, analytics | ~1,567        |
| **[08-production-patterns](./08-production-patterns.example.ts)**             | Enterprise-grade patterns and reliability    | Circuit breakers, pagination, bulk operations | ~1,234        |

### Additional Examples (Coming Soon)

| Example                     | Description                             | Status         |
| --------------------------- | --------------------------------------- | -------------- |
| **09-testing-patterns**     | Unit and integration testing strategies | 🚧 In Progress |
| **10-real-world-use-cases** | Complete application examples           | 📋 Planned     |

## 🚀 Quick Start

### Running Examples

Each example is a complete, standalone demonstration. To run an example:

```bash
# Import and use in your NestJS application
import { BasicEntityDefinitionExampleModule } from '@hive-academy/nestjs-chromadb/examples';

@Module({
  imports: [BasicEntityDefinitionExampleModule],
})
export class AppModule {}
```

### Prerequisites

Before running examples, ensure you have:

1. **ChromaDB Server** running on port 8000
2. **OpenAI API Key** for embedding generation
3. **NestJS Application** set up

```bash
# Start ChromaDB (Docker)
docker run -p 8000:8000 chromadb/chroma

# Set environment variables
export OPENAI_API_KEY="your-api-key"
export CHROMADB_HOST="localhost"
export CHROMADB_PORT="8000"
```

## 📖 Example Descriptions

### 01. Basic Entity Definition

**What it demonstrates:**

- Simple entity creation with `@ChromaEntity` decorator
- Basic property mapping with `@ChromaProp`
- Automatic timestamp handling
- Entity serialization (toChroma/fromChroma methods)

**Key Features:**

- Auto-generated IDs and timestamps
- Type-safe entity definition
- Embedding field configuration
- Production-ready validation

**Best for:** Getting started with ChromaDB entities

### 02. Advanced Property Mappings

**What it demonstrates:**

- Email normalization (auto-detected)
- Custom timestamp transformations
- JSON serialization with `@JsonProperty`
- Property validation and smart defaults

**Key Features:**

- Smart property detection
- Bidirectional transformations
- Complex nested object handling
- Validation patterns

**Best for:** Complex data modeling requirements

### 03. Repository CRUD Operations

**What it demonstrates:**

- Complete CRUD operations
- Batch operations (createMany, updateMany, deleteMany)
- Upsert operations for data synchronization
- Error handling and data consistency

**Key Features:**

- Type-safe repository operations
- Efficient batch processing
- Transaction-like patterns
- Comprehensive error handling

**Best for:** Standard data operations

### 04. Semantic Search Patterns

**What it demonstrates:**

- Vector similarity search
- Hybrid search (vector + metadata filters)
- Score thresholding and relevance filtering
- Multi-field semantic search

**Key Features:**

- Embedding-based similarity
- Relevance scoring strategies
- Search optimization techniques
- Faceted search results

**Best for:** AI-powered search applications

### 05. Metadata Filtering

**What it demonstrates:**

- Complex metadata queries
- Range queries (price, dates, numerical values)
- Array operations ($in, $nin, $contains)
- Logical operators ($and, $or, $not)

**Key Features:**

- Rich query language support
- Performance-optimized filtering
- Business logic filtering
- Complex condition composition

**Best for:** Advanced querying requirements

### 06. Custom Repository Methods

**What it demonstrates:**

- Business logic encapsulation
- Method composition and reuse
- Cache invalidation patterns
- Custom aggregations and analytics

**Key Features:**

- Domain-specific repositories
- Workflow orchestration
- Performance optimization
- Analytics integration

**Best for:** Complex business logic

### 07. Multi-Entity Workflows

**What it demonstrates:**

- Multiple entities working together
- Cross-repository operations
- RAG (Retrieval-Augmented Generation) patterns
- Complex workflow orchestration

**Key Features:**

- Entity relationship modeling
- Cross-collection data flows
- RAG implementation patterns
- Analytics and reporting

**Best for:** Complete application workflows

### 08. Production Patterns

**What it demonstrates:**

- Error handling and retry logic
- Circuit breaker patterns
- Pagination for large datasets
- Bulk operations with progress tracking

**Key Features:**

- Enterprise reliability patterns
- Performance monitoring
- Health checks and diagnostics
- Security and validation

**Best for:** Production deployment

## 🏗️ Architecture Patterns

### Entity-Repository Pattern

The examples follow a consistent entity-repository pattern:

```typescript
// 1. Entity Definition
@ChromaEntity({
  collection: 'my_collection',
  autoEmbed: true,
  embeddingFields: ['content'],
})
export class MyEntity implements BaseDocument<MetadataType> {
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  metadata!: MetadataType;
}

// 2. Repository Implementation
@Injectable()
@ChromaRepository<MyEntity>({
  collection: 'my_collection',
  autoEmbed: true,
  enableCaching: true,
})
export class MyRepository extends BaseChromaRepository<MyEntity> {
  // Custom business methods
}

// 3. Service Integration
@Injectable()
export class MyService {
  constructor(private readonly myRepo: MyRepository) {}

  // Business logic using repository
}
```

### Best Practices Demonstrated

1. **Type Safety**: All examples use strict TypeScript with no `any` types
2. **Error Handling**: Comprehensive error handling with meaningful messages
3. **Performance**: Optimized queries, caching, and batch operations
4. **Security**: Input validation and data sanitization
5. **Testing**: Test-friendly patterns with dependency injection
6. **Documentation**: Extensive JSDoc comments and examples
7. **Production Readiness**: Patterns suitable for enterprise deployment

## 🧪 Testing Examples

Each example includes test scenarios demonstrating:

- Unit testing with mocked dependencies
- Integration testing with real ChromaDB
- Performance testing and benchmarks
- Error condition testing

## 📊 Performance Considerations

The examples demonstrate various performance optimization techniques:

### Query Optimization

- **Indexing Strategy**: Proper metadata field selection
- **Batch Operations**: Efficient bulk processing
- **Pagination**: Cursor-based and offset-based patterns
- **Caching**: Intelligent caching strategies

### Memory Management

- **Streaming**: Large dataset processing
- **Chunking**: Document processing patterns
- **Connection Pooling**: Resource management

### Monitoring

- **Metrics Collection**: Performance tracking
- **Health Checks**: System reliability
- **Error Tracking**: Comprehensive logging

## 🔒 Security Patterns

Security considerations demonstrated across examples:

- **Input Validation**: Data sanitization and validation
- **Access Control**: Role-based security patterns
- **Data Classification**: Security metadata handling
- **Audit Logging**: Comprehensive activity tracking

## 🚀 Migration Guide

To migrate from basic ChromaDB usage to the entity/repository pattern:

1. **Start with Example 01**: Basic entity definition
2. **Progress to Example 03**: Repository CRUD operations
3. **Add Search**: Example 04 for semantic search
4. **Scale Up**: Examples 07-08 for production patterns

## 📚 Additional Resources

- **[ChromaDB Documentation](https://docs.trychroma.com/)**
- **[NestJS Documentation](https://docs.nestjs.com/)**
- **[Library CLAUDE.md](../../../CLAUDE.md)** - Complete API reference
- **[Entity Decorator Reference](../decorators/entity/README.md)**
- **[Repository Pattern Guide](../repositories/README.md)**

## 🤝 Contributing

When adding new examples:

1. Follow the established pattern structure
2. Include comprehensive JSDoc documentation
3. Provide real, working implementations (no stubs)
4. Add meaningful test scenarios
5. Update this README with the new example

## 📝 Example Template

Use this template for new examples:

```typescript
/**
 * @fileoverview [Example Title] - [Description]
 *
 * Demonstrates:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 *
 * Key Concepts:
 * - Concept 1
 * - Concept 2
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
// ... other imports

// 1. Entity Definitions
@ChromaEntity({
  /* config */
})
export class ExampleEntity {
  /* ... */
}

// 2. Repository Implementation
@Injectable()
@ChromaRepository({
  /* config */
})
export class ExampleRepository extends BaseChromaRepository<ExampleEntity> {
  // Custom methods with full implementations
}

// 3. Service/Demo Implementation
@Injectable()
export class ExampleDemoService implements OnModuleInit {
  async onModuleInit() {
    await this.runDemo();
  }

  async runDemo() {
    console.log('\\n🎯 [Example Name] Demo\\n');
    // Real working demo code
  }
}

// 4. Module Definition
@Module({
  imports: [
    ChromaDBModule.forRoot({
      /* config */
    }),
  ],
  providers: [ExampleRepository, ExampleDemoService],
  exports: [ExampleRepository],
})
export class ExampleModule {}
```

---

**Note**: All examples are production-ready and demonstrate real functionality. No stubs or placeholders are used. Each example can be run independently and provides valuable insights into ChromaDB entity/repository patterns.
