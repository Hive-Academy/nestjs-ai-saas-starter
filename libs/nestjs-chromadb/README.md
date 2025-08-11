# @anubis/nestjs-chromadb

[![npm version](https://badge.fury.io/js/@anubis%2Fnestjs-chromadb.svg)](https://badge.fury.io/js/@anubis%2Fnestjs-chromadb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A comprehensive NestJS integration for ChromaDB vector database with full TypeScript support, designed for building AI-powered applications with semantic search capabilities.

## Features

- 🚀 **Easy Integration**: Seamless NestJS module integration with dependency injection
- 🔧 **Configuration Flexibility**: Support for both synchronous and asynchronous configuration
- 📊 **Multiple Embedding Providers**: Built-in support for OpenAI, Cohere, and HuggingFace embeddings
- 🎯 **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🏥 **Health Checks**: Built-in health indicators for monitoring
- 🔄 **Connection Management**: Automatic connection handling and retry logic
- 📝 **Rich Querying**: Advanced querying capabilities with metadata filtering
- 🧪 **Testing Support**: Comprehensive testing utilities and mocks

## Installation

```bash
npm install @anubis/nestjs-chromadb chromadb
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@anubis/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: 'localhost',
        port: 8000,
      },
      embedding: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Use the Service

```typescript
import { Injectable } from '@nestjs/common';
import { ChromaDBService } from '@anubis/nestjs-chromadb';

@Injectable()
export class DocumentService {
  constructor(private readonly chromaDB: ChromaDBService) {}

  async addDocuments(documents: string[]) {
    return this.chromaDB.addDocuments(
      'my-collection',
      documents.map((doc, i) => ({
        id: `doc-${i}`,
        document: doc,
        metadata: { source: 'api' },
      }))
    );
  }

  async searchSimilar(query: string, limit = 5) {
    return this.chromaDB.queryDocuments('my-collection', {
      queryTexts: [query],
      nResults: limit,
    });
  }
}
```

## Configuration

### Basic Configuration

```typescript
ChromaDBModule.forRoot({
  connection: {
    host: 'localhost',
    port: 8000,
    ssl: false,
  },
  embedding: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-ada-002',
  },
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
});
```

### Async Configuration

```typescript
ChromaDBModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    connection: {
      host: configService.get('CHROMA_HOST'),
      port: configService.get('CHROMA_PORT'),
    },
    embedding: {
      provider: 'openai',
      apiKey: configService.get('OPENAI_API_KEY'),
    },
  }),
  inject: [ConfigService],
});
```

### Feature Collections

```typescript
ChromaDBModule.forFeature([
  {
    name: 'documents',
    metadata: { description: 'Document embeddings' },
  },
  {
    name: 'images',
    metadata: { description: 'Image embeddings' },
  },
]);
```

## Embedding Providers

### OpenAI

```typescript
{
  embedding: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-ada-002', // or 'text-embedding-3-small', 'text-embedding-3-large'
  }
}
```

### Cohere

```typescript
{
  embedding: {
    provider: 'cohere',
    apiKey: process.env.COHERE_API_KEY,
    model: 'embed-english-v3.0',
  }
}
```

### HuggingFace

```typescript
{
  embedding: {
    provider: 'huggingface',
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: 'sentence-transformers/all-MiniLM-L6-v2',
  }
}
```

### Custom Embedding Function

```typescript
{
  embedding: {
    provider: 'custom',
    embeddingFunction: async (texts: string[]) => {
      // Your custom embedding logic
      return texts.map(text => Array.from({length: 384}, () => Math.random()));
    },
  }
}
```

## API Reference

### ChromaDBService

#### Collection Management

```typescript
// Create or get collection
await chromaDB.getOrCreateCollection('my-collection');

// Delete collection
await chromaDB.deleteCollection('my-collection');

// List collections
const collections = await chromaDB.listCollections();
```

#### Document Operations

```typescript
// Add documents
await chromaDB.addDocuments('collection', [{ id: '1', document: 'Hello world', metadata: { type: 'greeting' } }]);

// Update documents
await chromaDB.updateDocuments('collection', [{ id: '1', document: 'Updated content', metadata: { updated: true } }]);

// Delete documents
await chromaDB.deleteDocuments('collection', ['1', '2']);

// Get documents
const docs = await chromaDB.getDocuments('collection', ['1', '2']);
```

#### Querying

```typescript
// Query by text
const results = await chromaDB.queryDocuments('collection', {
  queryTexts: ['search query'],
  nResults: 10,
  where: { type: 'article' },
  whereDocument: { $contains: 'keyword' },
});

// Query by embeddings
const results = await chromaDB.queryDocuments('collection', {
  queryEmbeddings: [[0.1, 0.2, 0.3, ...]],
  nResults: 5,
});
```

### CollectionService

```typescript
import { CollectionService } from '@anubis/nestjs-chromadb';

@Injectable()
export class MyService {
  constructor(private readonly collectionService: CollectionService) {}

  async searchInCollection(collectionName: string, query: string) {
    const collection = await this.collectionService.getCollection(collectionName);
    return collection.query({
      queryTexts: [query],
      nResults: 10,
    });
  }
}
```

## Advanced Usage

### Metadata Filtering

```typescript
// Complex metadata queries
const results = await chromaDB.queryDocuments('collection', {
  queryTexts: ['AI and machine learning'],
  where: {
    $and: [{ category: 'technology' }, { year: { $gte: 2020 } }, { tags: { $in: ['ai', 'ml'] } }],
  },
  nResults: 20,
});
```

### Batch Operations

```typescript
// Process large datasets in batches
const documents = Array.from({ length: 10000 }, (_, i) => ({
  id: `doc-${i}`,
  document: `Document content ${i}`,
  metadata: { batch: Math.floor(i / 100) },
}));

await chromaDB.addDocuments('large-collection', documents);
```

### Custom Collection Configuration

```typescript
const collection = await chromaDB.getOrCreateCollection('custom-collection', {
  metadata: {
    description: 'Custom collection with specific settings',
    indexing: 'hnsw',
    distance: 'cosine',
  },
  embeddingFunction: customEmbeddingFunction,
});
```

## Health Checks

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ChromaDBHealthIndicator } from '@anubis/nestjs-chromadb';

@Module({
  imports: [TerminusModule],
  providers: [ChromaDBHealthIndicator],
})
export class HealthModule {}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { ChromaDBService } from '@anubis/nestjs-chromadb';

describe('DocumentService', () => {
  let service: DocumentService;
  let chromaDB: ChromaDBService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: ChromaDBService,
          useValue: {
            addDocuments: jest.fn(),
            queryDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    chromaDB = module.get<ChromaDBService>(ChromaDBService);
  });

  it('should add documents', async () => {
    const documents = ['doc1', 'doc2'];
    await service.addDocuments(documents);

    expect(chromaDB.addDocuments).toHaveBeenCalledWith('my-collection', expect.arrayContaining([expect.objectContaining({ document: 'doc1' }), expect.objectContaining({ document: 'doc2' })]));
  });
});
```

### Integration Testing

```typescript
import { Test } from '@nestjs/testing';
import { ChromaDBModule } from '@anubis/nestjs-chromadb';

describe('ChromaDB Integration', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ChromaDBModule.forRoot({
          connection: { host: 'localhost', port: 8000 },
          embedding: { provider: 'custom', embeddingFunction: mockEmbedding },
        }),
      ],
    }).compile();
  });

  // Integration tests...
});
```

## Error Handling

```typescript
import { ChromaDBConnectionError, ChromaDBQueryError } from '@anubis/nestjs-chromadb';

try {
  await chromaDB.queryDocuments('collection', { queryTexts: ['test'] });
} catch (error) {
  if (error instanceof ChromaDBConnectionError) {
    console.error('Connection failed:', error.message);
  } else if (error instanceof ChromaDBQueryError) {
    console.error('Query failed:', error.message);
  }
}
```

## Performance Tips

1. **Batch Operations**: Use batch operations for large datasets
2. **Connection Pooling**: Configure appropriate connection settings
3. **Embedding Caching**: Cache embeddings for frequently queried content
4. **Metadata Indexing**: Use metadata for efficient filtering
5. **Collection Partitioning**: Split large datasets across multiple collections

## Migration Guide

### From v0.x to v1.x

```typescript
// Old way (v0.x)
ChromaDBModule.forRoot({
  host: 'localhost',
  port: 8000,
});

// New way (v1.x)
ChromaDBModule.forRoot({
  connection: {
    host: 'localhost',
    port: 8000,
  },
  embedding: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
  },
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

- 📖 [Documentation](https://anubis.github.io/nestjs-ai-saas-starter/nestjs-chromadb)
- 🐛 [Issue Tracker](https://github.com/anubis/nestjs-ai-saas-starter/issues)
- 💬 [Discussions](https://github.com/anubis/nestjs-ai-saas-starter/discussions)

## Related Packages

- [@anubis/nestjs-neo4j](https://www.npmjs.com/package/@anubis/nestjs-neo4j) - Neo4j integration
- [@anubis/nestjs-langgraph](https://www.npmjs.com/package/@anubis/nestjs-langgraph) - LangGraph workflows
- [@anubis/shared](https://www.npmjs.com/package/@anubis/shared) - Shared utilities
