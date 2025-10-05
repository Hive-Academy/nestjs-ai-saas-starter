/**
 * @fileoverview Testing Patterns Example - Unit and Integration Testing Strategies
 *
 * Demonstrates:
 * - Unit testing repositories with mocked dependencies
 * - Integration testing with real ChromaDB
 * - Test data factories and builders
 * - Assertion helpers and custom matchers
 * - Testing async operations and error scenarios
 * - Performance testing and benchmarks
 * - Testing embedding generation and vector search
 * - Mocking external services (OpenAI, etc.)
 *
 * Key Concepts:
 * - Test-driven development with ChromaDB
 * - Mocking strategies for vector databases
 * - Testing semantic search functionality
 * - Data consistency validation
 * - Performance benchmarking
 * - Error condition testing
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBRepository,
  BaseChromaEntity,
  ChromaDBModule,
  ChromaDBService,
  ChromaEmbedding,
  ChromaEntity,
  ChromaId,
  ChromaMetadata,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
  CreateDocumentInput,
} from '../../index';

// =============================================================================
// Test Entity Definitions
// =============================================================================

interface TestProductMetadata {
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  tags: string[];
  manufacturer: string;
  createdBy: string;
}

/**
 * Test entity for demonstrating testing patterns
 */
@ChromaEntity({
  collection: 'test_products',
  description: 'Test product entity for testing patterns demonstration',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class TestProductEntity extends BaseChromaEntity<TestProductMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Product description for embedding',
    validate: (content: string) => {
      if (!content || content.trim().length === 0) {
        return 'Content cannot be empty';
      }
      if (content.length > 2000) {
        return 'Content cannot exceed 2000 characters';
      }
      return true;
    },
  })
  content!: string;

  @ChromaMetadata()
  metadata!: TestProductMetadata;

  @ChromaEmbedding()
  embedding?: readonly number[];

  @CreatedAt()
  createdAt!: string;

  @UpdatedAt()
  updatedAt!: string;

  getSearchableContent(): string {
    const { name, category, manufacturer } = this.metadata;
    return `${name} ${category} ${manufacturer} ${this.content}`;
  }

  calculateRelevanceScore(query: string): number {
    const searchableContent = this.getSearchableContent().toLowerCase();
    const queryWords = query.toLowerCase().split(' ');

    let matchCount = 0;
    queryWords.forEach((word) => {
      if (searchableContent.includes(word)) {
        matchCount++;
      }
    });

    return matchCount / queryWords.length;
  }
}

// =============================================================================
// Test Repository Implementation
// =============================================================================

/**
 * Test repository for demonstrating testing patterns
 */
@Injectable()
export class TestProductRepository extends ChromaDBRepository<TestProductEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(TestProductEntity, 'test_products', chromaDB);
  }

  /**
   * Find products by category with custom business logic
   */
  async findByCategory(category: string): Promise<TestProductEntity[]> {
    try {
      return await this.findAll({
        where: { category },
        orderBy: [{ field: 'price', direction: 'asc' }],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find products by category: ${errorMessage}`);
    }
  }

  /**
   * Search products with minimum price
   */
  async searchWithMinPrice(
    query: string,
    minPrice: number
  ): Promise<TestProductEntity[]> {
    const results = await this.search(query, {
      limit: 20,
    });
    return results.filter((product) => product.metadata.price >= minPrice);
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<{
    totalProducts: number;
    averagePrice: number;
    categoryDistribution: Record<string, number>;
    inStockCount: number;
  }> {
    const allProducts = await this.findAll();

    const stats = {
      totalProducts: allProducts.length,
      averagePrice: 0,
      categoryDistribution: {} as Record<string, number>,
      inStockCount: 0,
    };

    let totalPrice = 0;
    allProducts.forEach((product) => {
      totalPrice += product.metadata.price;

      const category = product.metadata.category;
      stats.categoryDistribution[category] =
        (stats.categoryDistribution[category] || 0) + 1;

      if (product.metadata.inStock) {
        stats.inStockCount++;
      }
    });

    stats.averagePrice =
      allProducts.length > 0 ? totalPrice / allProducts.length : 0;

    return stats;
  }

  /**
   * Bulk update prices with validation
   */
  async bulkUpdatePrices(
    priceUpdates: Array<{ productId: string; newPrice: number }>
  ): Promise<{
    updated: number;
    failed: Array<{ productId: string; error: string }>;
  }> {
    const results = {
      updated: 0,
      failed: [] as Array<{ productId: string; error: string }>,
    };

    for (const update of priceUpdates) {
      try {
        if (update.newPrice < 0) {
          throw new Error('Price cannot be negative');
        }

        const product = await this.findById(update.productId);
        if (!product) {
          throw new Error('Product not found');
        }

        await this.update(update.productId, {
          metadata: {
            ...product.metadata,
            price: update.newPrice,
          },
        });

        results.updated++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.failed.push({
          productId: update.productId,
          error: errorMessage,
        });
      }
    }

    return results;
  }
}

// =============================================================================
// Test Data Factory
// =============================================================================

/**
 * Factory for creating test data
 */
export class TestDataFactory {
  private static productIdCounter = 1;

  /**
   * Create a test product entity data for repository operations
   */
  static createProduct(
    overrides: Partial<CreateDocumentInput<TestProductEntity>> = {}
  ): CreateDocumentInput<TestProductEntity> {
    const id = this.productIdCounter++;

    const defaultProduct: CreateDocumentInput<TestProductEntity> = {
      id: `test-product-${id}`,
      content: `This is a test product description for product ${id}`,
      metadata: {
        name: `Test Product ${id}`,
        category: 'electronics',
        price: 99.99,
        inStock: true,
        tags: ['test', 'sample'],
        manufacturer: 'Test Corp',
        createdBy: 'test-user',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Apply overrides
    return {
      ...defaultProduct,
      ...overrides,
      metadata: {
        ...defaultProduct.metadata,
        ...(overrides.metadata || {}),
      },
    };
  }

  /**
   * Create multiple test products
   */
  static createProducts(
    count: number,
    overrides: Partial<CreateDocumentInput<TestProductEntity>> = {}
  ): CreateDocumentInput<TestProductEntity>[] {
    return Array.from({ length: count }, () => this.createProduct(overrides));
  }

  /**
   * Create products with specific categories
   */
  static createProductsByCategory(
    categories: string[]
  ): CreateDocumentInput<TestProductEntity>[] {
    return categories.map((category) =>
      this.createProduct({
        metadata: {
          name: `${category} Product`,
          category,
          price: Math.random() * 1000,
          inStock: Math.random() > 0.2,
          tags: [category, 'test'],
          manufacturer: `${category} Corp`,
          createdBy: 'test-user',
        },
      })
    );
  }

  /**
   * Reset the counter for predictable testing
   */
  static resetCounter(): void {
    this.productIdCounter = 1;
  }
}

// =============================================================================
// Test Assertion Helpers
// =============================================================================

/**
 * Custom assertion helpers for ChromaDB testing
 */
export class ChromaTestAssertions {
  /**
   * Assert that an entity has required fields
   */
  static assertValidEntity(entity: TestProductEntity): void {
    expect(entity).toBeDefined();
    expect(entity.id).toBeDefined();
    expect(typeof entity.id).toBe('string');
    expect(entity.content).toBeDefined();
    expect(typeof entity.content).toBe('string');
    expect(entity.metadata).toBeDefined();
    expect(typeof entity.metadata).toBe('object');
    expect(entity.createdAt).toBeDefined();
    expect(entity.updatedAt).toBeDefined();
  }

  /**
   * Assert that search results are properly ordered by score
   */
  static assertSearchResultsOrdered(
    results: Array<{ document: TestProductEntity; score: number }>
  ): void {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  }

  /**
   * Assert that metadata matches expected structure
   */
  static assertValidMetadata(metadata: TestProductMetadata): void {
    expect(metadata.name).toBeDefined();
    expect(typeof metadata.name).toBe('string');
    expect(metadata.category).toBeDefined();
    expect(typeof metadata.category).toBe('string');
    expect(metadata.price).toBeDefined();
    expect(typeof metadata.price).toBe('number');
    expect(metadata.price).toBeGreaterThanOrEqual(0);
    expect(typeof metadata.inStock).toBe('boolean');
    expect(Array.isArray(metadata.tags)).toBe(true);
  }

  /**
   * Assert that embedding has correct dimensions
   */
  static assertValidEmbedding(
    embedding: number[],
    expectedDimension = 1536
  ): void {
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(expectedDimension);
    embedding.forEach((value) => {
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });
  }

  /**
   * Assert that two entities are semantically similar
   */
  static assertSemanticallyRelated(
    entity1: TestProductEntity,
    entity2: TestProductEntity,
    threshold = 0.8
  ): void {
    if (entity1.embedding && entity2.embedding) {
      const similarity = this.calculateCosineSimilarity(
        Array.from(entity1.embedding),
        Array.from(entity2.embedding)
      );
      expect(similarity).toBeGreaterThan(threshold);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private static calculateCosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// =============================================================================
// Mock Services
// =============================================================================

/**
 * Mock ChromaDB service for unit testing
 */
export class MockChromaDBService {
  private collections = new Map<string, Array<any>>();

  async createCollection(name: string): Promise<void> {
    this.collections.set(name, []);
  }

  async add(collection: string, data: any): Promise<void> {
    const docs = this.collections.get(collection) || [];
    docs.push(data);
    this.collections.set(collection, docs);
  }

  async query(
    collection: string,
    queryTexts: string[],
    nResults = 10
  ): Promise<any> {
    const docs = this.collections.get(collection) || [];

    // Simple mock search - return first n documents
    const results = docs.slice(0, nResults);

    return {
      ids: [results.map((_, i) => `mock-id-${i}`)],
      documents: [results.map((doc) => doc.documents[0])],
      metadatas: [results.map((doc) => doc.metadatas[0])],
      distances: [results.map((_, i) => Math.random())],
    };
  }

  async get(collection: string, ids?: string[]): Promise<any> {
    const docs = this.collections.get(collection) || [];

    if (ids) {
      const filtered = docs.filter((doc) => ids.includes(doc.ids[0]));
      return {
        ids: filtered.map((doc) => doc.ids[0]),
        documents: filtered.map((doc) => doc.documents[0]),
        metadatas: filtered.map((doc) => doc.metadatas[0]),
      };
    }

    return {
      ids: docs.map((doc) => doc.ids[0]),
      documents: docs.map((doc) => doc.documents[0]),
      metadatas: docs.map((doc) => doc.metadatas[0]),
    };
  }

  async update(collection: string, ids: string[], data: any): Promise<void> {
    const docs = this.collections.get(collection) || [];

    ids.forEach((id, index) => {
      const docIndex = docs.findIndex((doc) => doc.ids[0] === id);
      if (docIndex >= 0) {
        docs[docIndex] = {
          ids: [id],
          documents: [data.documents[index]],
          metadatas: [data.metadatas[index]],
        };
      }
    });

    this.collections.set(collection, docs);
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    const docs = this.collections.get(collection) || [];
    const filtered = docs.filter((doc) => !ids.includes(doc.ids[0]));
    this.collections.set(collection, filtered);
  }

  clear(): void {
    this.collections.clear();
  }
}

// =============================================================================
// Performance Testing Utilities
// =============================================================================

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of an async function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    const result = await fn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    return { result, duration };
  }

  /**
   * Run performance benchmark
   */
  static async runBenchmark(
    name: string,
    fn: () => Promise<any>,
    iterations = 10
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  }> {
    console.log(`🏃‍♂️ Running benchmark: ${name} (${iterations} iterations)`);

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureExecutionTime(fn);
      times.push(duration);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const results = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
    };

    console.log(
      `  ✅ ${name}: avg ${averageTime.toFixed(2)}ms, min ${minTime.toFixed(
        2
      )}ms, max ${maxTime.toFixed(2)}ms`
    );

    return results;
  }

  /**
   * Assert performance within acceptable bounds
   */
  static assertPerformance(
    actualTime: number,
    maxExpectedTime: number,
    operation: string
  ): void {
    if (actualTime > maxExpectedTime) {
      throw new Error(
        `Performance assertion failed: ${operation} took ${actualTime}ms, expected < ${maxExpectedTime}ms`
      );
    }
  }
}

// =============================================================================
// Integration Test Helpers
// =============================================================================

/**
 * Integration test setup and teardown helpers
 */
export class IntegrationTestHelpers {
  /**
   * Setup test database with clean collections
   */
  static async setupTestDatabase(
    repository: TestProductRepository
  ): Promise<void> {
    try {
      // Clear existing data
      await repository.clear();

      // Ensure collection exists and is properly configured
      const collectionInfo = await repository.getCollectionInfo();
      expect(collectionInfo).toBeDefined();

      console.log('✅ Test database setup completed');
    } catch (error) {
      console.error('❌ Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Cleanup test database
   */
  static async cleanupTestDatabase(
    repository: TestProductRepository
  ): Promise<void> {
    try {
      await repository.clear();
      console.log('✅ Test database cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error);
    }
  }

  /**
   * Seed test data
   */
  static async seedTestData(
    repository: TestProductRepository
  ): Promise<TestProductEntity[]> {
    const testProducts: CreateDocumentInput<TestProductEntity>[] = [
      TestDataFactory.createProduct({
        metadata: {
          name: 'iPhone 15',
          category: 'electronics',
          price: 999.99,
          inStock: true,
          tags: ['phone', 'apple', 'mobile'],
          manufacturer: 'Apple',
          createdBy: 'seed-user',
        },
        content: 'Latest iPhone with advanced camera system and A17 Pro chip',
      }),
      TestDataFactory.createProduct({
        metadata: {
          name: 'MacBook Pro',
          category: 'electronics',
          price: 2399.99,
          inStock: false,
          tags: ['laptop', 'apple', 'computer'],
          manufacturer: 'Apple',
          createdBy: 'seed-user',
        },
        content: 'Professional laptop with M3 Pro chip and Retina display',
      }),
      TestDataFactory.createProduct({
        metadata: {
          name: 'Ergonomic Office Chair',
          category: 'furniture',
          price: 299.99,
          inStock: true,
          tags: ['chair', 'office', 'ergonomic'],
          manufacturer: 'Office Pro',
          createdBy: 'seed-user',
        },
        content:
          'Comfortable office chair with lumbar support and adjustable height',
      }),
    ];

    const result = await repository.createMany(testProducts);
    console.log(`✅ Seeded ${result.successCount} test products`);

    return result.success;
  }
}

// =============================================================================
// Test Examples and Demonstrations
// =============================================================================

/**
 * Service demonstrating testing patterns
 */
@Injectable()
export class TestingPatternsDemoService implements OnModuleInit {
  constructor(private readonly productRepo: TestProductRepository) {}

  async onModuleInit() {
    console.log('\n🧪 Testing Patterns Demo\n');
    console.log(
      'This example demonstrates comprehensive testing strategies for ChromaDB entities and repositories.'
    );
    console.log(
      'In a real application, these would be separate test files using Jest or similar testing frameworks.\n'
    );

    await this.demonstrateUnitTesting();
    await this.demonstrateIntegrationTesting();
    await this.demonstratePerformanceTesting();
    await this.demonstrateTestDataManagement();
  }

  /**
   * Demonstrate unit testing patterns
   */
  private async demonstrateUnitTesting(): Promise<void> {
    console.log('🔬 Unit Testing Patterns:');

    // Test data creation and validation
    console.log('  📋 Testing data creation and validation...');
    const productData = TestDataFactory.createProduct();
    expect(productData.content).toBeDefined();
    expect(productData.metadata).toBeDefined();
    ChromaTestAssertions.assertValidMetadata(productData.metadata);
    console.log(
      `    ✅ Created valid product data: ${productData.metadata.name}`
    );

    // Test creating actual entity via repository
    console.log('  📋 Testing entity creation via repository...');
    await IntegrationTestHelpers.setupTestDatabase(this.productRepo);
    const createdProduct = await this.productRepo.create(productData);
    ChromaTestAssertions.assertValidEntity(createdProduct);
    console.log('    ✅ Entity creation works correctly');

    // Test business logic methods
    console.log('  📋 Testing business logic methods...');
    const searchableContent = createdProduct.getSearchableContent();
    expect(searchableContent).toContain(createdProduct.metadata.name);
    expect(searchableContent).toContain(createdProduct.metadata.category);

    const relevanceScore =
      createdProduct.calculateRelevanceScore('electronics test');
    expect(relevanceScore).toBeGreaterThan(0);
    console.log(
      `    ✅ Relevance score calculated: ${relevanceScore.toFixed(2)}`
    );

    // Cleanup after unit testing
    await IntegrationTestHelpers.cleanupTestDatabase(this.productRepo);

    console.log('  ✅ Unit testing patterns completed\n');
  }

  /**
   * Demonstrate integration testing patterns
   */
  private async demonstrateIntegrationTesting(): Promise<void> {
    console.log('🔗 Integration Testing Patterns:');

    try {
      // Setup test environment
      console.log('  📋 Setting up test environment...');
      await IntegrationTestHelpers.setupTestDatabase(this.productRepo);

      // Seed test data
      console.log('  📋 Seeding test data...');
      const seededProducts = await IntegrationTestHelpers.seedTestData(
        this.productRepo
      );

      // Test basic CRUD operations
      console.log('  📋 Testing CRUD operations...');
      const count = await this.productRepo.count();
      expect(count).toBe(seededProducts.length);
      console.log(`    ✅ Found ${count} products in database`);

      // Test custom repository methods
      console.log('  📋 Testing custom repository methods...');
      const electronicsProducts = await this.productRepo.findByCategory(
        'electronics'
      );
      expect(electronicsProducts.length).toBeGreaterThan(0);
      console.log(
        `    ✅ Found ${electronicsProducts.length} electronics products`
      );

      // Test search functionality
      console.log('  📋 Testing search functionality...');
      const searchResults = await this.productRepo.search('apple laptop', {
        limit: 5,
      });
      expect(searchResults.length).toBeGreaterThan(0);
      console.log(`    ✅ Search returned ${searchResults.length} results`);

      // Test statistical methods
      console.log('  📋 Testing statistical methods...');
      const stats = await this.productRepo.getProductStats();
      expect(stats.totalProducts).toBe(seededProducts.length);
      expect(stats.averagePrice).toBeGreaterThan(0);
      console.log(
        `    ✅ Statistics: ${
          stats.totalProducts
        } products, avg price $${stats.averagePrice.toFixed(2)}`
      );

      // Test bulk operations
      console.log('  📋 Testing bulk operations...');
      const priceUpdates = seededProducts.slice(0, 2).map((product) => ({
        productId: product.id,
        newPrice: product.metadata.price * 1.1,
      }));

      const updateResults = await this.productRepo.bulkUpdatePrices(
        priceUpdates
      );
      expect(updateResults.updated).toBe(2);
      expect(updateResults.failed).toHaveLength(0);
      console.log(
        `    ✅ Bulk price update: ${updateResults.updated} updated, ${updateResults.failed.length} failed`
      );

      // Cleanup
      await IntegrationTestHelpers.cleanupTestDatabase(this.productRepo);
    } catch (error) {
      console.error('    ❌ Integration test failed:', error);
      throw error;
    }

    console.log('  ✅ Integration testing patterns completed\n');
  }

  /**
   * Demonstrate performance testing patterns
   */
  private async demonstratePerformanceTesting(): Promise<void> {
    console.log('🏎️ Performance Testing Patterns:');

    try {
      // Setup test data
      await IntegrationTestHelpers.setupTestDatabase(this.productRepo);
      const testProducts = TestDataFactory.createProducts(50);
      const createResult = await this.productRepo.createMany(testProducts);
      console.log(
        `  📊 Created ${createResult.successCount} test products for benchmarking`
      );

      // Benchmark single document creation
      await PerformanceTestUtils.runBenchmark(
        'Single Document Creation',
        async () => {
          const productData = TestDataFactory.createProduct();
          await this.productRepo.create(productData);
        },
        5
      );

      // Benchmark batch document creation
      await PerformanceTestUtils.runBenchmark(
        'Batch Document Creation (10 docs)',
        async () => {
          const productsData = TestDataFactory.createProducts(10);
          await this.productRepo.createMany(productsData);
        },
        3
      );

      // Benchmark search operations
      await PerformanceTestUtils.runBenchmark(
        'Semantic Search',
        async () => {
          await this.productRepo.search('electronics', { limit: 10 });
        },
        10
      );

      // Benchmark complex queries
      await PerformanceTestUtils.runBenchmark(
        'Category Filtering',
        async () => {
          await this.productRepo.findByCategory('electronics');
        },
        10
      );

      // Test search performance with timing assertion
      console.log('  📋 Testing search performance bounds...');
      const { duration } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          return await this.productRepo.search('test query', { limit: 5 });
        }
      );

      // Assert that search completes within reasonable time (5 seconds)
      PerformanceTestUtils.assertPerformance(duration, 5000, 'Semantic search');
      console.log(
        `    ✅ Search completed in ${duration.toFixed(
          2
        )}ms (within acceptable bounds)`
      );

      // Cleanup
      await IntegrationTestHelpers.cleanupTestDatabase(this.productRepo);
    } catch (error) {
      console.error('    ❌ Performance test failed:', error);
      throw error;
    }

    console.log('  ✅ Performance testing patterns completed\n');
  }

  /**
   * Demonstrate test data management patterns
   */
  private async demonstrateTestDataManagement(): Promise<void> {
    console.log('📊 Test Data Management Patterns:');

    // Reset factory counter for predictable testing
    TestDataFactory.resetCounter();

    // Create test data with factory
    console.log('  📋 Testing data factory patterns...');
    const productData1 = TestDataFactory.createProduct();
    const productData2 = TestDataFactory.createProduct();
    expect(productData1.id).toBe('test-product-1');
    expect(productData2.id).toBe('test-product-2');
    console.log(
      `    ✅ Factory created predictable IDs: ${productData1.id}, ${productData2.id}`
    );

    // Create category-specific products
    console.log('  📋 Testing category-specific data creation...');
    const categoryProductsData = TestDataFactory.createProductsByCategory([
      'electronics',
      'furniture',
      'clothing',
    ]);
    expect(categoryProductsData).toHaveLength(3);
    expect(categoryProductsData[0].metadata.category).toBe('electronics');
    expect(categoryProductsData[1].metadata.category).toBe('furniture');
    expect(categoryProductsData[2].metadata.category).toBe('clothing');
    console.log(
      `    ✅ Created ${categoryProductsData.length} category-specific products`
    );

    // Test data with custom overrides
    console.log('  📋 Testing data overrides...');
    const customProductData = TestDataFactory.createProduct({
      metadata: {
        name: 'Custom Product',
        category: 'custom',
        price: 123.45,
        inStock: false,
        tags: ['custom', 'test'],
        manufacturer: 'Custom Corp',
        createdBy: 'custom-user',
      },
    });
    expect(customProductData.metadata.name).toBe('Custom Product');
    expect(customProductData.metadata.price).toBe(123.45);
    expect(customProductData.metadata.inStock).toBe(false);
    console.log(
      `    ✅ Custom overrides applied: ${customProductData.metadata.name} - $${customProductData.metadata.price}`
    );

    // Test bulk data creation
    console.log('  📋 Testing bulk data creation...');
    const bulkProductsData = TestDataFactory.createProducts(100);
    expect(bulkProductsData).toHaveLength(100);

    // Verify all products have unique IDs
    const ids = bulkProductsData.map((p) => p.id!);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(bulkProductsData.length);
    console.log(
      `    ✅ Created ${bulkProductsData.length} products with unique IDs`
    );

    console.log('  ✅ Test data management patterns completed\n');
  }
}

// =============================================================================
// Example Test Suite Structures
// =============================================================================

/**
 * Example Jest test suite structure for reference
 * (This would normally be in separate .spec.ts files)
 */
export const ExampleTestSuites = {
  /**
   * Unit test suite example
   */
  unitTestExample: `
    describe('TestProductEntity', () => {
      let entity: TestProductEntity;

      beforeEach(() => {
        TestDataFactory.resetCounter();
        entity = TestDataFactory.createProduct();
      });

      describe('constructor', () => {
        it('should create a valid entity', () => {
          ChromaTestAssertions.assertValidEntity(entity);
        });

        it('should have valid metadata', () => {
          ChromaTestAssertions.assertValidMetadata(entity.metadata);
        });
      });

      describe('serialization', () => {
        it('should serialize to ChromaDB format', () => {
          const chromaData = entity.toChroma();
          expect(chromaData.ids).toHaveLength(1);
          expect(chromaData.documents).toHaveLength(1);
          expect(chromaData.metadatas).toHaveLength(1);
        });

        it('should deserialize from ChromaDB format', () => {
          const chromaData = entity.toChroma();
          const deserialized = TestProductEntity.fromChroma(chromaData, 0);
          expect(deserialized.id).toBe(entity.id);
          expect(deserialized.content).toBe(entity.content);
        });
      });

      describe('business logic', () => {
        it('should calculate relevance score correctly', () => {
          const score = entity.calculateRelevanceScore('electronics test');
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        });
      });
    });
  `,

  /**
   * Integration test suite example
   */
  integrationTestExample: `
    describe('TestProductRepository', () => {
      let module: TestingModule;
      let repository: TestProductRepository;

      beforeAll(async () => {
        module = await Test.createTestingModule({
          imports: [
            ChromaDBModule.forRoot({
              connection: { host: 'localhost', port: 8000 },
              embedding: {
                provider: 'openai',
                config: {
                  apiKey: process.env.OPENAI_API_KEY
                }
              }
            })
          ],
          providers: [TestProductRepository],
        }).compile();

        repository = module.get<TestProductRepository>(TestProductRepository);
      });

      beforeEach(async () => {
        await IntegrationTestHelpers.setupTestDatabase(repository);
      });

      afterEach(async () => {
        await IntegrationTestHelpers.cleanupTestDatabase(repository);
      });

      afterAll(async () => {
        await module.close();
      });

      describe('CRUD operations', () => {
        it('should create and retrieve a product', async () => {
          const product = TestDataFactory.createProduct();
          await repository.create(product);

          const retrieved = await repository.findById(product.id);
          expect(retrieved).toBeDefined();
          expect(retrieved!.id).toBe(product.id);
        });

        it('should update a product', async () => {
          const product = TestDataFactory.createProduct();
          await repository.create(product);

          const updatedProduct = await repository.update(product.id, {
            metadata: { ...product.metadata, price: 199.99 }
          });

          expect(updatedProduct!.metadata.price).toBe(199.99);
        });
      });

      describe('search operations', () => {
        beforeEach(async () => {
          await IntegrationTestHelpers.seedTestData(repository);
        });

        it('should find products by category', async () => {
          const electronics = await repository.findByCategory('electronics');
          expect(electronics.length).toBeGreaterThan(0);
          electronics.forEach(product => {
            expect(product.metadata.category).toBe('electronics');
          });
        });

        it('should perform semantic search', async () => {
          const results = await repository.search('apple laptop', 5);
          expect(results.length).toBeGreaterThan(0);
        });
      });
    });
  `,

  /**
   * Performance test suite example
   */
  performanceTestExample: `
    describe('Performance Tests', () => {
      let repository: TestProductRepository;

      beforeAll(async () => {
        // Setup repository...
      });

      describe('search performance', () => {
        it('should complete search within acceptable time', async () => {
          const { duration } = await PerformanceTestUtils.measureExecutionTime(
            () => repository.search('test query', 10)
          );

          PerformanceTestUtils.assertPerformance(duration, 5000, 'Search operation');
        });

        it('should handle batch operations efficiently', async () => {
          const products = TestDataFactory.createProducts(100);

          const { duration } = await PerformanceTestUtils.measureExecutionTime(
            () => repository.createMany(products)
          );

          PerformanceTestUtils.assertPerformance(duration, 10000, 'Batch creation');
        });
      });
    });
  `,
};

// =============================================================================
// Module Definition
// =============================================================================

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: true,
    }),
  ],
  providers: [TestProductRepository, TestingPatternsDemoService],
  exports: [
    TestProductRepository,
    TestingPatternsDemoService,
    // Export testing utilities for use in other modules
  ],
})
export class TestingPatternsExampleModule {}
