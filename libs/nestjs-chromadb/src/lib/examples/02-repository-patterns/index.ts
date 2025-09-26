/**
 * @fileoverview Repository Patterns Examples Index
 * 
 * Comprehensive collection of repository pattern examples demonstrating:
 * - Repository decorator usage and implementation
 * - Type-safe repository interfaces
 * - Domain-specific repository patterns
 * - Repository composition and cross-repository operations
 * - Caching strategies and performance optimization
 * - Batch operations and parallel processing
 */

// Repository Decorator Examples
export * from './01-repository-decorators.example';

/**
 * Repository Patterns Example Categories
 * 
 * This module provides comprehensive examples for implementing repository patterns
 * with ChromaDB integration, organized by complexity and use case:
 * 
 * 1. **Repository Decorators** (`01-repository-decorators.example.ts`)
 *    - Interface-based repository design
 *    - Type-safe repository implementations
 *    - Domain-specific repository patterns (Knowledge, Product)
 *    - Repository composition and cross-repository operations
 *    - Caching strategies at the repository level
 *    - Batch operations and performance optimization
 * 
 * ## Usage Examples
 * 
 * ### Repository Interface Implementation
 * ```typescript
 * import { KnowledgeRepository, ProductRepository } from './01-repository-decorators.example';
 * 
 * @Injectable()
 * export class BusinessService {
 *   constructor(
 *     private readonly knowledgeRepo: KnowledgeRepository,
 *     private readonly productRepo: ProductRepository
 *   ) {}
 *   
 *   async searchContent(query: string) {
 *     const [knowledge, products] = await Promise.all([
 *       this.knowledgeRepo.search(query, 5),
 *       this.productRepo.searchProducts(query)
 *     ]);
 *     
 *     return { knowledge, products };
 *   }
 * }
 * ```
 * 
 * ### Repository Service Usage
 * ```typescript
 * import { RepositoryExampleService } from './01-repository-decorators.example';
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly repoExamples: RepositoryExampleService) {}
 *   
 *   async demonstratePatterns() {
 *     await this.repoExamples.executeRepositoryExample();
 *     const stats = await this.repoExamples.getRepositoryStats();
 *     console.log('Repository patterns demonstrated:', stats);
 *   }
 * }
 * ```
 * 
 * ### Module Integration
 * ```typescript
 * import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
 * import { KnowledgeRepository, ProductRepository, RepositoryExampleService } from './02-repository-patterns';
 * 
 * @Module({
 *   imports: [
 *     ChromaDBModule.forRoot({
 *       connection: { host: 'localhost', port: 8000 },
 *       embedding: { provider: 'openai', config: { apiKey: process.env.OPENAI_API_KEY } }
 *     })
 *   ],
 *   providers: [
 *     KnowledgeRepository,
 *     ProductRepository,
 *     RepositoryExampleService
 *   ]
 * })
 * export class RepositoryPatternsModule {}
 * ```
 * 
 * ## Key Concepts Demonstrated
 * 
 * ### Repository Interface Design
 * - **Domain-Specific Interfaces**: Separate interfaces for different entity types
 * - **Method Naming Conventions**: Clear, descriptive method names
 * - **Type Safety**: Full TypeScript integration with proper typing
 * - **Return Type Consistency**: Consistent return types across methods
 * 
 * ### Repository Implementation Patterns
 * - **Dependency Injection**: Proper constructor injection patterns
 * - **Error Handling**: Consistent error handling across repository methods
 * - **Logging**: Structured logging for debugging and monitoring
 * - **Performance Monitoring**: Built-in timing and metrics collection
 * 
 * ### Repository Composition
 * - **Cross-Repository Operations**: Coordinated operations across repositories
 * - **Batch Processing**: Efficient bulk operations
 * - **Parallel Execution**: Concurrent repository operations
 * - **Transaction Patterns**: Coordinated multi-repository transactions
 * 
 * ### Caching Strategies
 * - **Repository-Level Caching**: Cache at the repository abstraction level
 * - **Query Result Caching**: Cache search and query results
 * - **Cache Invalidation**: Strategies for maintaining cache consistency
 * - **Performance Optimization**: Cache-aware query optimization
 * 
 * ## Best Practices Covered
 * 
 * ### Architecture
 * - Interface segregation principle
 * - Dependency inversion principle
 * - Single responsibility principle
 * - Clean separation of concerns
 * 
 * ### Performance
 * - Efficient query patterns
 * - Batch operation strategies
 * - Caching and memoization
 * - Resource optimization
 * 
 * ### Type Safety
 * - Strongly typed interfaces
 * - Runtime type validation
 * - Generic type patterns
 * - Error type safety
 * 
 * ### Testing
 * - Mockable repository interfaces
 * - Testable business logic
 * - Integration test patterns
 * - Performance test strategies
 * 
 * ## Learning Path
 * 
 * 1. **Understand Repository Pattern**: Learn the basic repository abstraction
 * 2. **Implement Type-Safe Interfaces**: Create strongly typed repository interfaces
 * 3. **Build Domain Repositories**: Implement domain-specific repositories
 * 4. **Compose Repository Operations**: Learn cross-repository coordination
 * 5. **Apply Caching Strategies**: Implement repository-level optimization
 * 6. **Monitor Performance**: Add metrics and performance monitoring
 * 
 * These patterns provide a solid foundation for building maintainable,
 * testable, and performant data access layers with ChromaDB.
 */

export const REPOSITORY_PATTERNS_EXAMPLES = {
  repositoryDecorators: '01-repository-decorators.example'
} as const;

export type RepositoryPatternsExampleType = keyof typeof REPOSITORY_PATTERNS_EXAMPLES;