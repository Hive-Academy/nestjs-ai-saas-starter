/**
 * @fileoverview Repository Decorators Example
 *
 * Demonstrates the use of ChromaDB repository decorators for clean,
 * type-safe repository pattern implementation with proper abstraction.
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { ChromaDBModule } from '../../../index';
import {
  KnowledgeDocument,
  ProductDocument,
  TEST_DATA_COLLECTIONS,
  DemoLogger,
  PerformanceTimer
} from '../shared';

// Repository interface for knowledge documents
interface IKnowledgeRepository {
  create(document: KnowledgeDocument): Promise<void>;
  findById(id: string): Promise<KnowledgeDocument | null>;
  findByCategory(category: string): Promise<KnowledgeDocument[]>;
  search(query: string, limit?: number): Promise<KnowledgeDocument[]>;
  update(document: KnowledgeDocument): Promise<void>;
  delete(id: string): Promise<void>;
  findByTags(tags: string[]): Promise<KnowledgeDocument[]>;
  getPopularDocuments(limit?: number): Promise<KnowledgeDocument[]>;
}

@Injectable()
export class KnowledgeRepository implements IKnowledgeRepository {
  private readonly logger = new DemoLogger();


  async create(document: KnowledgeDocument): Promise<void> {
    this.logger.logInfo(`Creating document: ${document.id}`);
    // Implementation would use injected ChromaDB service
    // await this.chromaDB.addDocuments(this.collectionName, [document]);
  }

  async findById(id: string): Promise<KnowledgeDocument | null> {
    this.logger.logInfo(`Finding document by ID: ${id}`);
    // Implementation would query ChromaDB
    // const result = await this.chromaDB.getDocuments(this.collectionName, { ids: [id] });
    // return this.mapToKnowledgeDocument(result);
    return null;
  }

  async findByCategory(category: string): Promise<KnowledgeDocument[]> {
    this.logger.logInfo(`Finding documents by category: ${category}`);
    // Implementation would use metadata filtering
    // const result = await this.chromaDB.searchDocuments(
    //   this.collectionName,
    //   [''], // Empty query, filter by metadata
    //   undefined,
    //   {
    //     where: { category: category },
    //     nResults: 100
    //   }
    // );
    // return this.mapToKnowledgeDocuments(result);
    return [];
  }

  async search(query: string, limit = 10): Promise<KnowledgeDocument[]> {
    this.logger.logInfo(`Searching documents with query: "${query}"`);
    // Implementation would perform semantic search
    // const result = await this.chromaDB.searchDocuments(
    //   this.collectionName,
    //   [query],
    //   undefined,
    //   { nResults: limit, includeDistances: true }
    // );
    // return this.mapToKnowledgeDocuments(result);
    return [];
  }

  async update(document: KnowledgeDocument): Promise<void> {
    this.logger.logInfo(`Updating document: ${document.id}`);
    // Implementation would use upsert
    // await this.chromaDB.upsertDocuments(this.collectionName, [document]);
  }

  async delete(id: string): Promise<void> {
    this.logger.logInfo(`Deleting document: ${id}`);
    // Implementation would delete from ChromaDB
    // await this.chromaDB.deleteDocuments(this.collectionName, [id]);
  }

  async findByTags(tags: string[]): Promise<KnowledgeDocument[]> {
    this.logger.logInfo(`Finding documents by tags: ${tags.join(', ')}`);
    // Implementation would filter by tags in metadata
    return [];
  }

  async getPopularDocuments(limit = 10): Promise<KnowledgeDocument[]> {
    this.logger.logInfo(`Getting popular documents (limit: ${limit})`);
    // Implementation would sort by popularity metrics in metadata
    return [];
  }

  // Helper methods to map ChromaDB results to typed documents
  // private mapToKnowledgeDocument(result: any): KnowledgeDocument | null {
  //   // Implementation would map ChromaDB wire format to domain objects
  //   return null;
  // }

  // private mapToKnowledgeDocuments(result: any): KnowledgeDocument[] {
  //   // Implementation would map ChromaDB wire format to domain objects
  //   return [];
  // }
}

// Product repository with different patterns
interface IProductRepository {
  create(product: ProductDocument): Promise<void>;
  findById(id: string): Promise<ProductDocument | null>;
  findByBrand(brand: string): Promise<ProductDocument[]>;
  findInPriceRange(minPrice: number, maxPrice: number): Promise<ProductDocument[]>;
  searchProducts(query: string): Promise<ProductDocument[]>;
  findSimilarProducts(productId: string): Promise<ProductDocument[]>;
  updateInventory(id: string, inStock: boolean): Promise<void>;
  getFeaturedProducts(): Promise<ProductDocument[]>;
}

@Injectable()
export class ProductRepository implements IProductRepository {
  private readonly logger = new DemoLogger();


  async create(product: ProductDocument): Promise<void> {
    this.logger.logInfo(`Creating product: ${product.id} - ${product.title}`);
    // Repository implementation
  }

  async findById(id: string): Promise<ProductDocument | null> {
    this.logger.logInfo(`Finding product by ID: ${id}`);
    return null;
  }

  async findByBrand(brand: string): Promise<ProductDocument[]> {
    this.logger.logInfo(`Finding products by brand: ${brand}`);
    return [];
  }

  async findInPriceRange(minPrice: number, maxPrice: number): Promise<ProductDocument[]> {
    this.logger.logInfo(`Finding products in price range: $${minPrice} - $${maxPrice}`);
    // Would filter by price metadata
    return [];
  }

  async searchProducts(query: string): Promise<ProductDocument[]> {
    this.logger.logInfo(`Searching products: "${query}"`);
    // Semantic search implementation
    return [];
  }

  async findSimilarProducts(productId: string): Promise<ProductDocument[]> {
    this.logger.logInfo(`Finding similar products to: ${productId}`);
    // Would find similar products using vector similarity
    return [];
  }

  async updateInventory(id: string, inStock: boolean): Promise<void> {
    this.logger.logInfo(`Updating inventory for ${id}: ${inStock ? 'in stock' : 'out of stock'}`);
    // Would update product metadata
  }

  async getFeaturedProducts(): Promise<ProductDocument[]> {
    this.logger.logInfo('Getting featured products');
    // Would filter by featured flag in metadata
    return [];
  }
}

// Service that demonstrates repository usage
@Injectable()
export class RepositoryExampleService implements OnModuleInit {
  private readonly logger = new DemoLogger();
  private readonly timer = new PerformanceTimer();

  constructor(
    private readonly knowledgeRepo: KnowledgeRepository,
    private readonly productRepo: ProductRepository
  ) {}

  async onModuleInit() {
    await this.runRepositoryExample();
  }

  /**
   * Demonstrate repository pattern usage
   */
  async runRepositoryExample(): Promise<void> {
    this.logger.logSeparator('Repository Patterns Example');

    try {
      await this.demonstrateKnowledgeRepository();
      await this.demonstrateProductRepository();
      await this.demonstrateRepositoryComposition();

    } catch (error) {
      this.logger.logError('Repository Pattern Example', error as Error);
      throw error;
    }
  }

  /**
   * Demonstrate knowledge repository operations
   */
  private async demonstrateKnowledgeRepository(): Promise<void> {
    this.logger.logStep(1, 'Knowledge Repository Operations');

    const sampleKnowledge = TEST_DATA_COLLECTIONS.knowledgeBase[0];

    // Create operation
    const { duration: createTime } = await this.timer.measure('knowledge-create', async () => {
      await this.knowledgeRepo.create(sampleKnowledge);
    });

    this.logger.logResults('Knowledge document created', { id: sampleKnowledge.id }, createTime);

    // Search operation
    const { duration: searchTime } = await this.timer.measure('knowledge-search', async () => {
      return await this.knowledgeRepo.search('vector databases', 5);
    });

    this.logger.logResults('Knowledge search completed', { query: 'vector databases' }, searchTime);

    // Category-based retrieval
    const { duration: categoryTime } = await this.timer.measure('knowledge-category', async () => {
      return await this.knowledgeRepo.findByCategory('database');
    });

    this.logger.logResults('Category search completed', { category: 'database' }, categoryTime);

    // Tag-based search
    const { duration: tagTime } = await this.timer.measure('knowledge-tags', async () => {
      return await this.knowledgeRepo.findByTags(['vector-database', 'ai']);
    });

    this.logger.logResults('Tag search completed', { tags: ['vector-database', 'ai'] }, tagTime);

    // Popular documents
    const { duration: popularTime } = await this.timer.measure('knowledge-popular', async () => {
      return await this.knowledgeRepo.getPopularDocuments(10);
    });

    this.logger.logResults('Popular documents retrieved', { limit: 10 }, popularTime);
  }

  /**
   * Demonstrate product repository operations
   */
  private async demonstrateProductRepository(): Promise<void> {
    this.logger.logStep(2, 'Product Repository Operations');

    const sampleProduct = TEST_DATA_COLLECTIONS.productCatalog[0];

    // Create operation
    const { duration: createTime } = await this.timer.measure('product-create', async () => {
      await this.productRepo.create(sampleProduct);
    });

    this.logger.logResults('Product created', {
      id: sampleProduct.id,
      title: sampleProduct.title,
      price: sampleProduct.price
    }, createTime);

    // Brand-based search
    const { duration: brandTime } = await this.timer.measure('product-brand', async () => {
      return await this.productRepo.findByBrand(sampleProduct.brand);
    });

    this.logger.logResults('Brand search completed', { brand: sampleProduct.brand }, brandTime);

    // Price range search
    const { duration: priceTime } = await this.timer.measure('product-price-range', async () => {
      return await this.productRepo.findInPriceRange(100, 300);
    });

    this.logger.logResults('Price range search completed', {
      minPrice: 100,
      maxPrice: 300
    }, priceTime);

    // Product search
    const { duration: searchTime } = await this.timer.measure('product-search', async () => {
      return await this.productRepo.searchProducts('wireless headphones');
    });

    this.logger.logResults('Product search completed', { query: 'wireless headphones' }, searchTime);

    // Similar products
    const { duration: similarTime } = await this.timer.measure('product-similar', async () => {
      return await this.productRepo.findSimilarProducts(sampleProduct.id);
    });

    this.logger.logResults('Similar products search completed', {
      baseProduct: sampleProduct.id
    }, similarTime);

    // Inventory update
    const { duration: inventoryTime } = await this.timer.measure('product-inventory', async () => {
      await this.productRepo.updateInventory(sampleProduct.id, false);
    });

    this.logger.logResults('Inventory updated', {
      productId: sampleProduct.id,
      inStock: false
    }, inventoryTime);

    // Featured products
    const { duration: featuredTime } = await this.timer.measure('product-featured', async () => {
      return await this.productRepo.getFeaturedProducts();
    });

    this.logger.logResults('Featured products retrieved', {}, featuredTime);
  }

  /**
   * Demonstrate repository composition and advanced patterns
   */
  private async demonstrateRepositoryComposition(): Promise<void> {
    this.logger.logStep(3, 'Repository Composition Patterns');

    // Cross-repository operations
    this.logger.logInfo('Demonstrating cross-repository operations...');

    // Simulated workflow: Find knowledge articles related to products
    const { duration: compositeTime } = await this.timer.measure('composite-operation', async () => {
      // 1. Search for product-related knowledge
      const productKnowledge = await this.knowledgeRepo.findByCategory('product-info');

      // 2. For each knowledge article, find related products
      const relatedOperations = productKnowledge.slice(0, 3).map(async (knowledge) => {
        // Extract product keywords from knowledge article
        const keywords = knowledge.tags.filter(tag => !['tutorial', 'guide'].includes(tag));

        // Search for related products
        const searchPromises = keywords.map(keyword =>
          this.productRepo.searchProducts(keyword)
        );

        return Promise.all(searchPromises);
      });

      return Promise.all(relatedOperations);
    });

    this.logger.logResults('Composite repository operation completed', {
      operationType: 'knowledge-product-correlation'
    }, compositeTime);

    // Repository caching pattern demonstration
    this.logger.logInfo('Demonstrating repository caching patterns...');

    const { duration: cachedTime } = await this.timer.measure('cached-operation', async () => {
      // First call - would hit database
      await this.knowledgeRepo.getPopularDocuments(10);

      // Second call - would hit cache (in real implementation)
      await this.knowledgeRepo.getPopularDocuments(10);
    });

    this.logger.logResults('Cached operation pattern demonstrated', {
      cacheStrategy: 'repository-level-caching'
    }, cachedTime);

    // Batch operation pattern
    this.logger.logInfo('Demonstrating batch operation patterns...');

    const { duration: batchTime } = await this.timer.measure('batch-operation', async () => {
      const batchOperations = [
        this.knowledgeRepo.findByCategory('database'),
        this.knowledgeRepo.findByCategory('ai'),
        this.knowledgeRepo.findByCategory('best-practices'),
        this.productRepo.findByBrand('AudioPro'),
        this.productRepo.findByBrand('FitTech'),
      ];

      return Promise.all(batchOperations);
    });

    this.logger.logResults('Batch operation completed', {
      operations: 5,
      parallelExecution: true
    }, batchTime);
  }

  /**
   * Public method for manual execution
   */
  async executeRepositoryExample(): Promise<void> {
    await this.runRepositoryExample();
  }

  /**
   * Get repository usage statistics
   */
  async getRepositoryStats(): Promise<any> {
    return {
      knowledgeRepository: {
        collectionName: 'knowledge-repository',
        supportedOperations: [
          'create', 'findById', 'findByCategory', 'search',
          'update', 'delete', 'findByTags', 'getPopular'
        ]
      },
      productRepository: {
        collectionName: 'products-repository',
        supportedOperations: [
          'create', 'findById', 'findByBrand', 'findInPriceRange',
          'searchProducts', 'findSimilar', 'updateInventory', 'getFeatured'
        ]
      },
      patterns: [
        'interface-segregation',
        'dependency-injection',
        'repository-composition',
        'caching-strategies',
        'batch-operations'
      ]
    };
  }
}

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
        },
      },
      enableHealthCheck: false,
    }),
  ],
  providers: [
    KnowledgeRepository,
    ProductRepository,
    RepositoryExampleService,
  ],
  exports: [
    KnowledgeRepository,
    ProductRepository,
    RepositoryExampleService,
  ],
})
export class RepositoryDecoratorsExampleModule {}
