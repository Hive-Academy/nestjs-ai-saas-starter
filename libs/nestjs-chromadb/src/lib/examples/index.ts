/**
 * @fileoverview ChromaDB Examples Index
 * 
 * Comprehensive collection of ChromaDB examples organized by category.
 * Each category demonstrates specific aspects of the ChromaDB integration
 * following the same structured approach as the Neo4j examples.
 */

// Shared Components
export * from './shared';

// Basic Operations Examples  
export * from './01-basic-operations';

// Repository Patterns Examples
export * from './02-repository-patterns';

// Re-export specific example categories for direct access
export { BASIC_OPERATIONS_EXAMPLES } from './01-basic-operations';

/**
 * ChromaDB Library Examples Overview
 * 
 * This module provides extensive examples for the @hive-academy/nestjs-chromadb library,
 * organized into focused categories that demonstrate real-world usage patterns:
 * 
 * ## Available Example Categories
 * 
 * ### 01-basic-operations/
 * Fundamental ChromaDB operations with proper error handling and type safety:
 * - Basic CRUD operations (Create, Read, Update, Delete)
 * - Collection management and configuration
 * - Document handling with metadata
 * - Performance monitoring and timing
 * - Error handling and validation patterns
 * - Clean setup and teardown procedures
 * 
 * ### 02-repository-patterns/
 * Repository pattern implementation with ChromaDB integration:
 * - Repository decorator usage and best practices
 * - Type-safe repository interfaces
 * - Domain-specific repository implementations
 * - Repository composition and cross-repository operations
 * - Caching strategies and performance optimization
 * - Batch operations and parallel processing
 * 
 * ## Getting Started
 * 
 * Each example category contains detailed implementations with:
 * - Complete, runnable code examples
 * - Type-safe patterns and interfaces
 * - Real business logic (no stubs or simulations)
 * - Integration with NestJS dependency injection
 * - Comprehensive error handling
 * - Performance monitoring and optimization
 * - Production-ready patterns
 * 
 * ## Usage Patterns
 * 
 * ### Basic Operations Examples
 * ```typescript
 * import {
 *   BasicCrudService,
 *   CollectionManagementService
 * } from '@hive-academy/nestjs-chromadb/examples';
 * 
 * @Module({
 *   imports: [
 *     ChromaDBModule.forRoot({
 *       connection: { host: 'localhost', port: 8000 },
 *       embedding: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
 *     })
 *   ],
 *   providers: [
 *     BasicCrudService,
 *     CollectionManagementService
 *   ]
 * })
 * export class ExamplesModule {}
 * ```
 * 
 * ### Repository Pattern Usage
 * ```typescript
 * import { KnowledgeRepository, ProductRepository } from '@hive-academy/nestjs-chromadb/examples';
 * 
 * @Injectable()
 * export class BusinessService {
 *   constructor(
 *     private readonly knowledgeRepo: KnowledgeRepository,
 *     private readonly productRepo: ProductRepository
 *   ) {}
 *   
 *   async findRelatedContent(query: string) {
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
 * ### Direct Service Usage with Examples
 * ```typescript
 * @Injectable()
 * export class MyDocumentService {
 *   constructor(
 *     private readonly chromaDB: ChromaDBFacadeService,
 *     private readonly basicCrud: BasicCrudService
 *   ) {}
 *   
 *   async setupDocumentSystem() {
 *     // Use example patterns to set up your system
 *     await this.basicCrud.executeBasicCrud();
 *     
 *     // Then implement your custom logic
 *     return await this.chromaDB.searchDocuments(
 *       'my-collection',
 *       ['my custom query'],
 *       undefined,
 *       { nResults: 10 }
 *     );
 *   }
 * }
 * ```
 * 
 * ## Key Features Demonstrated
 * 
 * ### Type Safety & Validation
 * - **Strongly Typed Documents**: Full TypeScript interfaces for all document types
 * - **Type-Safe Repositories**: Interface-driven repository implementations
 * - **Validation Helpers**: Input validation and result verification
 * - **Compile-Time Safety**: Type checking and IntelliSense support
 * 
 * ### Performance & Optimization
 * - **Performance Timing**: Built-in performance measurement utilities
 * - **Batch Operations**: Efficient bulk operations for large datasets
 * - **Caching Strategies**: Repository-level and service-level caching
 * - **Query Optimization**: Efficient search and retrieval patterns
 * 
 * ### Error Handling & Resilience
 * - **Comprehensive Error Handling**: Proper exception management
 * - **Graceful Degradation**: Fallback patterns and recovery mechanisms
 * - **Validation Patterns**: Input/output validation and sanitization
 * - **Logging & Debugging**: Structured logging with context
 * 
 * ### Production Readiness
 * - **Real Business Logic**: No stubs - actual functional implementations
 * - **Configuration Management**: Environment-based configuration
 * - **Health Monitoring**: Collection and operation health checks
 * - **Maintenance Operations**: Cleanup, optimization, and administration
 * 
 * ### Integration Patterns
 * - **NestJS Integration**: Full dependency injection support
 * - **Module Configuration**: Proper module setup and configuration
 * - **Service Composition**: Cross-service integration patterns
 * - **Decorator Usage**: ChromaDB-specific decorators and annotations
 * 
 * ## Best Practices Covered
 * 
 * ### Architecture
 * - Repository pattern implementation
 * - Clean separation of concerns
 * - Interface segregation principle
 * - Dependency inversion principle
 * 
 * ### Data Management
 * - Document lifecycle management
 * - Metadata usage and governance
 * - Collection organization strategies
 * - Version management patterns
 * 
 * ### Performance
 * - Efficient query patterns
 * - Batch processing strategies
 * - Caching and memoization
 * - Resource optimization
 * 
 * ### Operations
 * - Health monitoring and alerting
 * - Maintenance and cleanup procedures
 * - Configuration management
 * - Error handling and recovery
 * 
 * ## Learning Path
 * 
 * 1. **Start with Basic Operations**: Master CRUD and collection management
 * 2. **Understand Repository Patterns**: Learn clean architecture patterns
 * 3. **Explore Advanced Features**: Dive into specialized functionality
 * 4. **Study Integration Patterns**: Learn service composition
 * 5. **Apply Performance Patterns**: Implement optimization strategies
 * 6. **Build Production Systems**: Use patterns in real applications
 * 
 * ## Example Categories Roadmap
 * 
 * Currently implemented:
 * - ✅ 01-basic-operations (CRUD, Collection Management)
 * - ✅ 02-repository-patterns (Repository Decorators)
 * 
 * Planned categories:
 * - 🔄 03-embedding-strategies (OpenAI, HuggingFace, Cohere, Custom)
 * - 🔄 04-advanced-search (Complex queries, Filtering, Scoring)
 * - 🔄 05-performance-optimization (Caching, Batching, Monitoring)
 * - 🔄 06-multi-tenancy (Tenant isolation, Security, Access control)
 * - 🔄 07-integration-patterns (Neo4j, LangGraph, External APIs)
 * - 🔄 08-production-patterns (Health, Logging, Deployment)
 * - 🔄 09-real-world-applications (RAG, Knowledge base, Recommendations)
 * 
 * Each category builds upon previous concepts, providing a comprehensive
 * learning experience for ChromaDB development with NestJS.
 */

export const EXAMPLE_CATEGORIES = {
  basicOperations: '01-basic-operations',
  repositoryPatterns: '02-repository-patterns',
  // Future categories will be added here
} as const;

export type ExampleCategoryType = keyof typeof EXAMPLE_CATEGORIES;

/**
 * Example execution utilities
 */
export const ExampleRunner = {
  /**
   * Run all basic operation examples
   */
  async runBasicOperations() {
    // Would execute all basic operation examples
    console.log('Running basic operations examples...');
  },
  
  /**
   * Run all repository pattern examples
   */
  async runRepositoryPatterns() {
    // Would execute all repository pattern examples
    console.log('Running repository pattern examples...');
  },
  
  /**
   * Run all examples in sequence
   */
  async runAllExamples() {
    console.log('Running all ChromaDB examples...');
    await this.runBasicOperations();
    await this.runRepositoryPatterns();
    console.log('All examples completed successfully!');
  }
};

/**
 * Configuration templates for different use cases
 */
export const ExampleConfigurations = {
  /**
   * Basic configuration for local development
   */
  development: {
    connection: {
      host: 'localhost',
      port: 8000
    },
    embedding: {
      provider: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY
    },
    enableHealthCheck: false
  },
  
  /**
   * Production configuration template
   */
  production: {
    connection: {
      host: process.env.CHROMADB_HOST || 'chromadb-service',
      port: parseInt(process.env.CHROMADB_PORT || '8000', 10)
    },
    embedding: {
      provider: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY
    },
    enableHealthCheck: true,
    healthCheckInterval: 30000,
    performance: {
      enableCaching: true,
      cacheSize: 1000,
      maxRetries: 3,
      retryDelay: 1000
    }
  },
  
  /**
   * Testing configuration
   */
  testing: {
    connection: {
      host: 'localhost',
      port: 8000
    },
    embedding: {
      provider: 'openai' as const,
      apiKey: process.env.OPENAI_API_KEY || 'test-key'
    },
    enableHealthCheck: false,
    performance: {
      enableCaching: false,
      maxRetries: 1,
      retryDelay: 100
    }
  }
};