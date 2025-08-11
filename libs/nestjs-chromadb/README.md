# @anubis/nestjs-chromadb

A comprehensive ChromaDB integration module for NestJS applications, providing enterprise-grade features for vector database operations with full TypeScript support, intelligent embedding provider selection, and advanced decorator patterns.

## Features

- 🚀 **Dynamic Module Configuration** - Support for both synchronous and asynchronous module configuration
- 💉 **Dependency Injection** - Seamless integration with NestJS DI container
- 🤖 **Intelligent Embedding Provider Selection** - Automatic fallback between OpenAI, HuggingFace, Cohere, and Custom providers
- 🎯 **Collection Management** - Dedicated service for collection operations with caching
- 🔄 **Batch Operations** - Optimized bulk document operations with automatic chunking
- 📊 **Health Checks** - Built-in health indicators for monitoring connection and collection health
- 🎪 **Multi-Collection Support** - Connect to multiple ChromaDB collections using `forFeature()`
- 🔒 **Type Safety** - Full TypeScript support with comprehensive type definitions
- ⚡ **Performance Optimized** - Vector operations, metadata utilities, and connection pooling
- 🛠️ **Developer Friendly** - Intuitive API with advanced decorators and utility functions
- 🔍 **Semantic Search** - Built-in similarity search with automatic embedding generation
- 📈 **Administrative Tools** - Database statistics, cleanup, and backup operations
- 🎨 **Decorator Pattern Support** - Easy injection of services and collections using decorators
- 🔌 **Modular Architecture** - Split into focused services for maintainability

## Installation

```bash
npm install @anubis/nestjs-chromadb chromadb
# or
yarn add @anubis/nestjs-chromadb chromadb
# or
pnpm add @anubis/nestjs-chromadb chromadb
```

### Peer Dependencies

```bash
# For OpenAI embeddings
npm install openai

# For HuggingFace embeddings
npm install @huggingface/inference

# For Cohere embeddings  
npm install cohere-ai

# For health checks
npm install @nestjs/terminus
```

## Quick Start

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@anubis/nestjs-chromadb';

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
          apiKey: 'your-openai-api-key',
          model: 'text-embedding-3-small',
          dimensions: 1536,
        },
      },
      healthCheck: true,
    }),
  ],
})
export class AppModule {}
```

### Async Configuration with Intelligent Provider Selection

The module supports intelligent embedding provider selection based on available API keys, automatically falling back to alternative providers when needed.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChromaDBModule } from '@anubis/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Intelligent embedding provider selection
        const openaiKey = configService.get('OPENAI_API_KEY');
        const cohereKey = configService.get('COHERE_API_KEY');
        const huggingfaceKey = configService.get('HUGGINGFACE_API_KEY');
        
        let embeddingConfig;
        
        // Priority order: OpenAI -> Cohere -> HuggingFace (local)
        if (openaiKey) {
          embeddingConfig = {
            provider: 'openai',
            config: {
              apiKey: openaiKey,
              model: configService.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
              dimensions: configService.get('EMBEDDING_DIMENSIONS', 1536),
              user: configService.get('APP_NAME', 'my-app'),
            },
          };
        } else if (cohereKey) {
          embeddingConfig = {
            provider: 'cohere',
            config: {
              apiKey: cohereKey,
              model: configService.get('COHERE_MODEL', 'embed-english-v3.0'),
              inputType: 'search_document',
            },
          };
        } else {
          // Fallback to local HuggingFace model (no API key required)
          embeddingConfig = {
            provider: 'huggingface',
            config: {
              apiKey: huggingfaceKey, // Optional for local models
              model: configService.get('HF_MODEL', 'sentence-transformers/all-MiniLM-L6-v2'),
              timeout: 30000,
            },
          };
        }
        
        return {
          connection: {
            host: configService.get('CHROMA_HOST', 'localhost'),
            port: configService.get('CHROMA_PORT', 8000),
            ssl: configService.get('CHROMA_SSL', false),
            tenant: configService.get('CHROMA_TENANT'),
            database: configService.get('CHROMA_DATABASE'),
          },
          embedding: embeddingConfig,
          enableHealthCheck: true,
          healthCheckInterval: configService.get('HEALTH_CHECK_INTERVAL', 30000),
          defaultCollection: configService.get('CHROMA_COLLECTION_NAME', 'documents'),
          batchSize: configService.get('CHROMA_BATCH_SIZE', 100),
          maxRetries: configService.get('CHROMA_MAX_RETRIES', 3),
          retryDelay: configService.get('CHROMA_RETRY_DELAY', 1000),
          logConnection: configService.get('LOG_CHROMA_CONNECTION', true),
        };
      },
    }),
  ],
})
export class AppModule {}
```

## Core Service Usage

### Injecting ChromaDBService

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaDBService } from '@anubis/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(private readonly chromaService: ChromaDBService) {}

  async addDocument(text: string, metadata: Record<string, any>) {
    return this.chromaService.addDocuments('my-collection', [{
      id: `doc-${Date.now()}`,
      document: text,
      metadata,
    }]);
  }

  async searchSimilar(query: string, limit = 10) {
    return this.chromaService.similaritySearch('my-collection', query, { limit });
  }
}
```

## Embedding Providers

### OpenAI Embeddings

```typescript
ChromaDBModule.forRoot({
  connection: { host: 'localhost', port: 8000 },
  embedding: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small', // or text-embedding-3-large
      dimensions: 1536,
      user: 'your-app-name',
    },
  },
})
```

### HuggingFace Embeddings

```typescript
ChromaDBModule.forRoot({
  connection: { host: 'localhost', port: 8000 },
  embedding: {
    provider: 'huggingface',
    config: {
      apiKey: process.env.HUGGINGFACE_API_KEY, // optional for local models
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      timeout: 30000,
    },
  },
})
```

### Cohere Embeddings

```typescript
ChromaDBModule.forRoot({
  connection: { host: 'localhost', port: 8000 },
  embedding: {
    provider: 'cohere',
    config: {
      apiKey: process.env.COHERE_API_KEY,
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    },
  },
})
```

### Custom Embedding Provider

```typescript
import { CustomEmbeddingProvider } from '@anubis/nestjs-chromadb';

class MyEmbeddingProvider extends CustomEmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    // Your custom embedding logic
    return texts.map(text => this.textToVector(text));
  }

  async embedSingle(text: string): Promise<number[]> {
    return this.textToVector(text);
  }

  private textToVector(text: string): number[] {
    // Your embedding implementation
    return new Array(384).fill(0).map(() => Math.random());
  }
}

// In your module
ChromaDBModule.forRoot({
  connection: { host: 'localhost', port: 8000 },
  embedding: {
    provider: 'custom',
    config: {
      embeddingProvider: MyEmbeddingProvider,
      dimensions: 384,
    },
  },
})
```

## Decorator Usage Patterns

### Service and Client Injection

The module provides specialized decorators for injecting ChromaDB services and clients:

```typescript
import { Injectable } from '@nestjs/common';
import { 
  InjectChromaDB, 
  InjectChromaDBClient,
  InjectCollection 
} from '@anubis/nestjs-chromadb';
import { ChromaDBService, CollectionService } from '@anubis/nestjs-chromadb';

@Injectable()
export class MyService {
  constructor(
    // Inject the main ChromaDB service
    @InjectChromaDB() private readonly chromaDB: ChromaDBService,
    
    // Inject the raw ChromaDB client for advanced operations
    @InjectChromaDBClient() private readonly chromaClient: any,
    
    // Inject a specific collection (must be registered with forFeature)
    @InjectCollection('products') private readonly productsCollection: any,
  ) {}
}
```

### Collection Registration with forFeature

Register specific collections for dependency injection:

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@anubis/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forFeature([
      {
        name: 'products',
        metadata: {
          'hnsw:space': 'cosine',
          'description': 'Product catalog embeddings',
        },
      },
      {
        name: 'documents',
        metadata: {
          'hnsw:space': 'ip',
          'description': 'Document library embeddings',
        },
      },
    ]),
  ],
})
export class FeatureModule {}
```

### Collection Helper Utilities

Use the collection helper for type-safe operations:

```typescript
import { Injectable } from '@nestjs/common';
import { CollectionService, withCollection } from '@anubis/nestjs-chromadb';

@Injectable()
export class DocumentProcessor {
  constructor(private readonly collectionService: CollectionService) {}

  async processDocument(doc: any) {
    // Type-safe collection operation with error handling
    return withCollection(
      this.collectionService,
      'documents',
      async (collection) => {
        // Your collection operations here
        await collection.add({
          ids: [doc.id],
          documents: [doc.content],
          metadatas: [doc.metadata],
        });
        
        return { success: true, id: doc.id };
      }
    );
  }
}
```

## Advanced Features

### Collection Management

```typescript
import { Injectable } from '@nestjs/common';
import { CollectionService } from '@anubis/nestjs-chromadb';

@Injectable()
export class CollectionManager {
  constructor(private readonly collectionService: CollectionService) {}

  async setupCollections() {
    // Create collections with specific metadata
    await this.collectionService.createCollection('products', {
      metadata: { 
        'hnsw:space': 'cosine',
        'description': 'Product catalog',
      },
      getOrCreate: true,
    });

    await this.collectionService.createCollection('documents', {
      metadata: { 
        'hnsw:space': 'ip',
        'description': 'Document library',
      },
    });
  }

  async getCollectionInfo() {
    const collections = await this.collectionService.listCollections();
    const stats = await Promise.all(
      collections.map(async (col) => ({
        name: col.name,
        count: await this.collectionService.getCollectionCount(col.name),
      }))
    );
    return stats;
  }
}
```

### Batch Operations with Embeddings

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaDBService, withBatchEmbeddings } from '@anubis/nestjs-chromadb';

@Injectable()
export class BulkDocumentService {
  constructor(private readonly chromaService: ChromaDBService) {}

  async indexProducts(products: Array<{id: string, description: string, category: string}>) {
    const documents = products.map(product => ({
      id: product.id,
      document: product.description,
      metadata: { 
        category: product.category,
        type: 'product',
        indexed_at: new Date().toISOString(),
      },
    }));

    // Batch add with automatic embedding generation
    await this.chromaService.addDocuments('products', documents, {
      batchSize: 100, // Process in chunks of 100
    });

    console.log(`Indexed ${products.length} products`);
  }

  async searchProducts(query: string, category?: string) {
    const options = category ? {
      limit: 20,
      filter: { category },
      includeMetadata: true,
      includeDistances: true,
    } : { limit: 20 };

    return this.chromaService.similaritySearch('products', query, options);
  }
}
```

## Health Checks and Monitoring

### Basic Health Check

```typescript
import { Controller, Get } from '@nestjs/common';
import { ChromaDBHealthIndicator } from '@anubis/nestjs-chromadb';

@Controller('health')
export class HealthController {
  constructor(private readonly chromaHealth: ChromaDBHealthIndicator) {}

  @Get()
  async check() {
    return this.chromaHealth.isHealthy('chromadb');
  }

  @Get('detailed')
  async checkDetailed() {
    return this.chromaHealth.isHealthyDetailed('chromadb');
  }

  @Get('collection/:name')
  async checkCollection(@Param('name') name: string) {
    return this.chromaHealth.isCollectionHealthy('collection', name);
  }
}
```

### Integration with NestJS Terminus

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ChromaDBHealthIndicator } from '@anubis/nestjs-chromadb';

@Module({
  imports: [TerminusModule],
  providers: [ChromaDBHealthIndicator],
  controllers: [HealthController],
})
export class HealthModule {}
```

### Health Check Response Example

```json
{
  "chromadb": {
    "status": "up",
    "heartbeat": 1234567890,
    "version": "0.4.0",
    "collections": {
      "count": 3,
      "names": ["products", "documents", "embeddings"]
    }
  }
}
```

## Service Architecture

The module is architected with separation of concerns, providing focused services for different aspects of ChromaDB operations:

### Core Services

1. **ChromaDBService** - Main service orchestrating all operations
2. **CollectionService** - Dedicated collection management
3. **EmbeddingService** - Embedding provider management and selection
4. **ChromaAdminService** - Administrative operations and maintenance

### Service Injection Examples

```typescript
import { Injectable } from '@nestjs/common';
import { 
  ChromaDBService,
  CollectionService,
  EmbeddingService,
  ChromaAdminService 
} from '@anubis/nestjs-chromadb';

@Injectable()
export class AdvancedService {
  constructor(
    private readonly chromaDB: ChromaDBService,
    private readonly collections: CollectionService,
    private readonly embeddings: EmbeddingService,
    private readonly admin: ChromaAdminService,
  ) {}

  async getSystemInfo() {
    const embeddingInfo = this.embeddings.getProviderInfo();
    const collections = await this.collections.listCollections();
    const stats = await this.admin.getDatabaseStats();
    
    return {
      embedding: embeddingInfo,
      collections: collections.length,
      stats,
    };
  }
}
```

## API Reference

### ChromaDBService

| Method | Description | Return Type |
|--------|-------------|-------------|
| `addDocuments(collection, docs, options?)` | Add documents to collection | `Promise<void>` |
| `getDocuments(collection, ids?, where?, limit?)` | Get documents by criteria | `Promise<GetResult>` |
| `updateDocuments(collection, docs, options?)` | Update existing documents | `Promise<void>` |
| `deleteDocuments(collection, ids?, where?)` | Delete documents | `Promise<void>` |
| `similaritySearch(collection, query, options?)` | Semantic similarity search | `Promise<SearchResult>` |
| `createCollection(name, metadata?, embeddingFunction?, getOrCreate?)` | Create new collection | `Promise<Collection>` |
| `getCollection(name, embeddingFunction?)` | Get existing collection | `Promise<Collection>` |
| `listCollections()` | List all collections | `Promise<CollectionInfo[]>` |
| `countDocuments(collection)` | Count documents in collection | `Promise<number>` |

### EmbeddingService

| Method | Description | Return Type |
|--------|-------------|-------------|
| `embed(texts)` | Generate embeddings for multiple texts | `Promise<number[][]>` |
| `embedSingle(text)` | Generate embedding for single text | `Promise<number[]>` |
| `isConfigured()` | Check if embedding provider is configured | `boolean` |
| `getDimensions()` | Get embedding vector dimensions | `number` |

## Best Practices and Recommendations

### Error Handling

The module provides comprehensive error handling with contextual information:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService } from '@anubis/nestjs-chromadb';

@Injectable()
export class SafeDocumentService {
  private readonly logger = new Logger(SafeDocumentService.name);

  constructor(private readonly chromaDB: ChromaDBService) {}

  async addDocumentSafely(document: any) {
    try {
      const result = await this.chromaDB.addDocuments('my-collection', [document]);
      return { success: true, result };
    } catch (error) {
      this.logger.error('Failed to add document', error);
      
      // Check for specific error types
      if (error.message.includes('collection does not exist')) {
        // Create collection and retry
        await this.chromaDB.createCollection('my-collection');
        return this.addDocumentSafely(document);
      }
      
      throw error;
    }
  }
}
```

### Performance Optimization

1. **Batch Operations** - Always use batch operations for multiple documents
2. **Connection Pooling** - The module handles connection pooling automatically
3. **Embedding Caching** - Consider caching frequently used embeddings
4. **Metadata Indexing** - Use appropriate metadata for efficient filtering

```typescript
// Optimized batch processing
async processBulkDocuments(documents: Document[]) {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    await this.chromaDB.addDocuments('collection', batch, {
      batchSize: BATCH_SIZE,
    });
  }
}
```

### Security Considerations

1. **API Key Management** - Store API keys in environment variables
2. **Connection Security** - Use SSL for production deployments
3. **Data Sanitization** - Sanitize user input before storing
4. **Access Control** - Implement proper access control for collections

```typescript
// Secure configuration
ChromaDBModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    connection: {
      host: configService.get('CHROMA_HOST'),
      port: configService.get('CHROMA_PORT'),
      ssl: configService.get('NODE_ENV') === 'production',
      auth: {
        provider: 'token',
        credentials: configService.get('CHROMA_AUTH_TOKEN'),
      },
    },
    // ... other config
  }),
})
```

## Development

### Building

Run `nx build nestjs-chromadb` to build the library.

### Running unit tests

Run `nx test nestjs-chromadb` to execute the unit tests via [Jest](https://jestjs.io).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@anubis.dev
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/nestjs-chromadb/issues)
- 📖 Docs: [Full Documentation](https://docs.anubis.dev/nestjs-chromadb)

## Acknowledgments

Built with ❤️ by the Anubis team. Special thanks to:
- The NestJS team for the amazing framework
- ChromaDB for the powerful vector database
- OpenAI, HuggingFace, and Cohere for embedding APIs
- Our contributors and community

---

Made with ChromaDB and NestJS
