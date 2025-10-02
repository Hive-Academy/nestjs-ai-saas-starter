# @ChromaRepository Decorator - Complete Implementation

## Overview

The `@ChromaRepository` decorator is a powerful class-level decorator that automatically generates comprehensive CRUD operations for ChromaDB collections with full TypeScript type safety, performance optimization, and enterprise-grade features.

## Key Features

### ✅ Auto-Generated Methods

- **CRUD Operations**: create, createMany, findById, findByIds, findAll, update, updateMany, upsert, upsertMany, delete, deleteMany, deleteByFilter
- **Search Operations**: search, searchWithScores, searchSimilar
- **Aggregation Operations**: count, exists, peek
- **Collection Operations**: clear, getCollectionInfo

### ✅ Type Safety

- Full TypeScript generics support
- Typed document interfaces with custom metadata
- Type-safe search options and filters
- Compile-time validation of document structures

### ✅ Performance Features

- Intelligent caching with collection-aware strategies
- Batch processing for bulk operations
- Auto-embedding with configurable models
- Performance profiling and metrics
- Retry logic with circuit breaker patterns

### ✅ Data Management

- Automatic timestamp generation
- Auto-generated IDs
- Soft delete support
- Document validation
- Metadata sanitization for ChromaDB compatibility

### ✅ Integration

- Seamless integration with existing ChromaDBService
- Compatible with performance decorators (@Cached, @Profiled, @Retry)
- Works with @VectorQuery decorator
- Metadata system for decorator composition

## Usage Examples

### Basic Repository

```typescript
interface UserDocument
  extends BaseDocument<{
    name: string;
    email: string;
    age: number;
  }> {}

@Injectable()
@ChromaRepository({
  collection: 'users',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
})
export class UserRepository {
  constructor(private chromaService: ChromaDBService) {}

  // All CRUD methods are auto-generated!

  // Add custom business methods
  async findByEmail(email: string): Promise<UserDocument | null> {
    const users = await this.findAll({ where: { email } });
    return users[0] || null;
  }
}
```

### Advanced Repository with Performance Decorators

```typescript
@Injectable()
@ChromaRepository({
  collection: 'products',
  autoEmbed: true,
  enableCaching: true,
  enableBatch: true,
  enableSoftDelete: true,
})
export class ProductRepository {
  constructor(private chromaService: ChromaDBService) {}

  @VectorQuery({
    collection: 'products',
    autoEmbed: true,
    defaultLimit: 50,
  })
  @Cached({ ttl: 600000 })
  @Profiled({ slowQueryThreshold: 150 })
  @Retry(RetryPresets.vectorSearch)
  async searchProducts(query: string, filters?: ProductFilters) {
    return this.searchWithScores(query, {
      where: this.buildWhereClause(filters),
      limit: 50,
    });
  }
}
```

## Configuration Options

```typescript
interface ChromaRepositoryConfig {
  // Required
  collection: string;

  // Embedding & AI
  autoEmbed?: boolean;
  defaultEmbeddingModel?: string;

  // Performance
  enableCaching?: boolean;
  enableBatch?: boolean;
  defaultBatchSize?: number;

  // Data Management
  enableValidation?: boolean;
  autoTimestamp?: boolean;
  autoGenerateIds?: boolean;
  enableSoftDelete?: boolean;

  // Error Handling
  errorHandling?: 'throw' | 'log_and_continue' | 'silent';
}
```

## Auto-Generated Method Signatures

### CRUD Operations

```typescript
create(document: Omit<TDocument, 'id'>, options?: RepositoryOperationOptions): Promise<TDocument>
createMany(documents: Omit<TDocument, 'id'>[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>>
findById(id: string, options?: RepositoryOperationOptions): Promise<TDocument | null>
findByIds(ids: string[], options?: RepositoryOperationOptions): Promise<TDocument[]>
findAll(options?: RepositoryOperationOptions): Promise<TDocument[]>
update(id: string, updates: Partial<TDocument>, options?: RepositoryOperationOptions): Promise<TDocument | null>
updateMany(updates: Array<{ id: string; data: Partial<TDocument> }>, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>>
upsert(document: TDocument, options?: RepositoryOperationOptions): Promise<TDocument>
upsertMany(documents: TDocument[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult<TDocument>>
delete(id: string, options?: RepositoryOperationOptions): Promise<boolean>
deleteMany(ids: string[], options?: RepositoryOperationOptions): Promise<RepositoryOperationResult>
deleteByFilter(where?: Where, whereDocument?: WhereDocument, options?: RepositoryOperationOptions): Promise<RepositoryOperationResult>
```

### Search Operations

```typescript
search(query: string, options?: RepositorySearchOptions): Promise<TDocument[]>
searchWithScores(query: string, options?: RepositorySearchOptions): Promise<Array<{ document: TDocument; score: number }>>
searchSimilar(embedding: number[], options?: RepositorySearchOptions): Promise<TDocument[]>
```

### Aggregation Operations

```typescript
count(where?: Where, whereDocument?: WhereDocument): Promise<number>
exists(id: string): Promise<boolean>
peek(limit?: number): Promise<TDocument[]>
```

### Collection Operations

```typescript
clear(): Promise<void>
getCollectionInfo(): Promise<{ name: string; count: number; metadata?: Record<string, unknown> }>
```

## Operation Options

### Repository Operation Options

```typescript
interface RepositoryOperationOptions {
  skipValidation?: boolean;
  skipCache?: boolean;
  batchSize?: number;
  embeddingModel?: string;
  metadata?: Record<string, unknown>;
}
```

### Repository Search Options

```typescript
interface RepositorySearchOptions extends RepositoryOperationOptions {
  limit?: number;
  threshold?: number;
  where?: Where;
  whereDocument?: WhereDocument;
  include?: {
    metadata?: boolean;
    documents?: boolean;
    distances?: boolean;
    embeddings?: boolean;
  };
}
```

## Advanced Features

### Automatic Document Enrichment

- Auto-generated IDs using timestamp + random string
- Automatic timestamp management (createdAt, updatedAt)
- Version tracking for document updates
- Custom metadata injection

### Intelligent Caching

- Collection-aware cache keys
- Automatic cache invalidation on mutations
- Background refresh strategies
- Configurable TTL and refresh thresholds

### Batch Processing

- Configurable batch sizes for bulk operations
- Automatic chunking for large datasets
- Progress tracking and error handling
- Memory-efficient processing

### Soft Delete Support

- Mark documents as deleted instead of removing
- Automatic deletedAt timestamps
- Option to force hard delete
- Filter out soft-deleted documents in queries

### Error Handling Strategies

- **throw**: Propagate all errors (default)
- **log_and_continue**: Log errors but continue operation
- **silent**: Suppress non-critical errors

### Metadata Sanitization

- Automatic conversion of complex types to ChromaDB-compatible format
- JSON serialization for objects and arrays
- Type safety for metadata values
- Error handling for non-serializable data

## Integration with Performance Decorators

### Caching Integration

```typescript
@ChromaRepository({ enableCaching: true })
class MyRepository {
  @Cached({ ttl: 300000, keyStrategy: 'collection_aware' })
  async customMethod() {
    // Caching works seamlessly with auto-generated methods
  }
}
```

### Profiling Integration

```typescript
@ChromaRepository({ collection: 'items' })
class MyRepository {
  @Profiled({ slowQueryThreshold: 100, logLevel: 'slow' })
  async expensiveOperation() {
    // Performance metrics collected automatically
  }
}
```

### Retry Integration

```typescript
@ChromaRepository({ collection: 'items' })
class MyRepository {
  @Retry(RetryPresets.vectorSearch)
  async reliableOperation() {
    // Automatic retry with exponential backoff
  }
}
```

## Error Handling

The decorator provides comprehensive error handling with context:

```typescript
// Error types
class ChromaRepositoryError extends Error {
  constructor(message: string, public operation: string, public collection: string, public context?: Record<string, unknown>) {
    super(message);
  }
}

// Error handling in operations
try {
  await repository.create(document);
} catch (error) {
  if (error instanceof ChromaRepositoryError) {
    console.log(`Operation ${error.operation} failed on collection ${error.collection}`);
    console.log('Context:', error.context);
  }
}
```

## Testing

### Unit Testing

```typescript
describe('UserRepository', () => {
  let repository: UserRepository;
  let mockChromaService: jest.Mocked<ChromaDBService>;

  beforeEach(() => {
    mockChromaService = createMockChromaService();
    repository = new UserRepository(mockChromaService);
  });

  it('should create a user with auto-generated ID', async () => {
    const userData = {
      content: 'User profile',
      metadata: { name: 'John', email: 'john@example.com' },
    };

    const result = await repository.create(userData);

    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(mockChromaService.addDocuments).toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
describe('UserRepository Integration', () => {
  let repository: UserRepository;
  let chromaService: ChromaDBService;

  beforeEach(async () => {
    chromaService = await setupTestChromaService();
    repository = new UserRepository(chromaService);
  });

  it('should perform full CRUD operations', async () => {
    // Test create
    const user = await repository.create({
      content: 'Test user',
      metadata: { name: 'Test', email: 'test@example.com' },
    });

    // Test read
    const found = await repository.findById(user.id);
    expect(found?.metadata.name).toBe('Test');

    // Test update
    const updated = await repository.update(user.id, {
      metadata: { name: 'Updated' },
    });
    expect(updated?.metadata.name).toBe('Updated');

    // Test delete
    const deleted = await repository.delete(user.id);
    expect(deleted).toBe(true);
  });
});
```

## Performance Considerations

### Memory Management

- Use batch processing for large datasets
- Implement pagination for large result sets
- Configure appropriate cache TTL values
- Monitor memory usage with profiling decorators

### Query Optimization

- Use specific filters to reduce result sets
- Leverage embedding similarity for semantic search
- Implement proper indexing strategies
- Cache frequently accessed data

### Scalability

- Configure batch sizes based on system capacity
- Use background refresh for cache strategies
- Implement circuit breaker patterns for reliability
- Monitor performance metrics and adjust accordingly

## Migration and Upgrading

When upgrading from existing ChromaDB implementations:

1. **Type Migration**: Update document interfaces to extend BaseDocument
2. **Method Migration**: Replace manual CRUD implementations with auto-generated methods
3. **Configuration Migration**: Move settings to ChromaRepositoryConfig
4. **Testing Migration**: Update tests to work with new method signatures

## Best Practices

1. **Type Safety**: Always use strongly typed document interfaces
2. **Error Handling**: Implement proper error boundaries in your application
3. **Performance**: Use appropriate caching and batching strategies
4. **Testing**: Write comprehensive tests for custom business methods
5. **Documentation**: Document your custom methods and business logic
6. **Monitoring**: Use profiling decorators to monitor performance
7. **Validation**: Implement custom validation for domain-specific rules

## Troubleshooting

### Common Issues

1. **Type Errors**: Ensure document interfaces extend BaseDocument correctly
2. **Service Injection**: Verify ChromaDBService is properly injected
3. **Collection Not Found**: Ensure collection exists or enable auto-creation
4. **Performance Issues**: Check batch sizes and caching configuration
5. **Memory Issues**: Monitor memory usage with large datasets

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
@ChromaRepository({
  collection: 'debug-collection',
  errorHandling: 'log_and_continue', // Enable error logging
})
export class DebugRepository {
  // Repository implementation
}
```

## Contributing

When contributing to the @ChromaRepository decorator:

1. Maintain backward compatibility
2. Add comprehensive tests for new features
3. Update TypeScript type definitions
4. Document new configuration options
5. Follow the established patterns for error handling
6. Ensure integration with existing decorators

## Conclusion

The `@ChromaRepository` decorator provides a complete, type-safe, and performant solution for ChromaDB operations in NestJS applications. It eliminates boilerplate code while providing enterprise-grade features like caching, profiling, retry logic, and comprehensive error handling.

The decorator follows the anti-backward compatibility principle by providing a single, authoritative implementation that replaces manual CRUD operations with auto-generated, type-safe methods that integrate seamlessly with the ChromaDB ecosystem.
