/**
 * @fileoverview Semantic Search Patterns Example
 *
 * Demonstrates:
 * - Vector similarity search with embeddings
 * - Hybrid search (vector + metadata filters)
 * - Search with score thresholds and relevance filtering
 * - Finding similar documents by content
 * - Search result ranking and scoring strategies
 * - Multi-field semantic search
 * - Search optimization and performance patterns
 *
 * Key Concepts:
 * - Embedding-based similarity search
 * - Semantic vs. keyword search
 * - Relevance scoring and thresholds
 * - Search result post-processing
 * - Performance optimization for search
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBRepository,
  ChromaDBService,
  ChromaEntity,
  ChromaProp,
  ChromaId,
  ChromaEmbedding,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
  CreateDocumentInput,
  SearchResultWithScore,
} from '../../index';

// ============================================================================
// 1. METADATA INTERFACES
// ============================================================================

/**
 * Article metadata interface
 */
export interface ArticleMetadata {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  author: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTime: number;
  publishedDate: string;
  views: number;
  rating: number;
}

/**
 * Product metadata interface
 */
export interface ProductMetadata {
  name: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  inStock: boolean;
  features: string[];
  specifications: Record<string, any>;
  rating: number;
  reviewCount: number;
}

// ============================================================================
// 2. ENTITIES FOR SEMANTIC SEARCH DEMONSTRATIONS
// ============================================================================

/**
 * Article entity optimized for semantic search
 * Contains multiple embeddable fields for comprehensive search
 */
@ChromaEntity({
  collection: 'articles',
  description: 'Knowledge base articles with semantic search optimization',
  autoEmbed: true,
  embeddingFields: ['content', 'title', 'summary'], // Multiple fields for rich embeddings
  autoTimestamp: true,
  autoGenerateIds: true,
})
export class ArticleEntity extends BaseChromaEntity<ArticleMetadata> {
  @ChromaId()
  declare id: string;

  /**
   * Main article content - primary field for embedding
   */
  @ChromaProp({
    description: 'Full article content for semantic search',
  })
  declare content: string;

  /**
   * Article title - secondary embeddable field
   */
  @ChromaProp({
    description: 'Article title for search relevance',
  })
  declare title: string;

  /**
   * Article summary - tertiary embeddable field
   */
  @ChromaProp({
    description: 'Brief article summary',
  })
  declare summary: string;

  /**
   * Structured metadata for filtering and faceted search
   */
  declare metadata: ArticleMetadata;

  /**
   * Embedding vector for semantic similarity
   */
  @ChromaEmbedding({
    dimension: 1536, // OpenAI text-embedding-3-small dimension
    normalize: true,
  })
  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

/**
 * Product entity for e-commerce semantic search
 */
@ChromaEntity({
  collection: 'products',
  description: 'Product catalog with semantic search capabilities',
  autoEmbed: true,
  embeddingFields: ['content', 'description'],
  autoTimestamp: true,
  autoGenerateIds: true,
})
export class ProductEntity extends BaseChromaEntity<ProductMetadata> {
  @ChromaId()
  declare id: string;

  /**
   * Combined product information for embedding
   */
  @ChromaProp()
  declare content: string;

  /**
   * Detailed product description
   */
  @ChromaProp()
  declare description: string;

  declare metadata: ProductMetadata;

  @ChromaEmbedding()
  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

// ============================================================================
// 3. REPOSITORY IMPLEMENTATIONS WITH SEARCH OPTIMIZATION
// ============================================================================

/**
 * Article repository with advanced semantic search methods
 */
/**
 * Article repository with semantic search capabilities
 * Uses TypeORM-style pattern with explicit constructor
 */
@Injectable()
export class ArticleRepository extends ChromaDBRepository<ArticleEntity> {
  /**
   * Explicit constructor with ChromaDBService injection
   * @param chromaDB - ChromaDBService instance
   */
  constructor(chromaDB: ChromaDBService) {
    super(ArticleEntity, 'articles', chromaDB);
  }

  /**
   * Semantic search with relevance threshold
   */
  async semanticSearch(
    query: string,
    options: {
      minScore?: number;
      maxResults?: number;
      category?: string;
      difficulty?: string;
      author?: string;
    } = {}
  ): Promise<SearchResultWithScore<ArticleEntity>[]> {
    const searchOptions: any = {
      limit: options.maxResults || 10,
      includeMetadata: true,
      includeDistances: true,
    };

    // Add metadata filters if provided
    const whereClause: any = {};
    if (options.category) whereClause.category = options.category;
    if (options.difficulty) whereClause.difficulty = options.difficulty;
    if (options.author) whereClause.author = options.author;

    if (Object.keys(whereClause).length > 0) {
      searchOptions.where = whereClause;
    }

    const results = await this.searchWithScores(query, searchOptions);

    // Filter by minimum score if specified
    if (options.minScore) {
      return results.filter((result) => result.score >= options.minScore!);
    }

    return results;
  }

  /**
   * Find similar articles by content similarity
   */
  async findSimilarArticles(
    articleId: string,
    options: {
      maxResults?: number;
      minScore?: number;
      excludeCategories?: string[];
    } = {}
  ): Promise<SearchResultWithScore<ArticleEntity>[]> {
    const searchOptions: any = {
      limit: options.maxResults || 5,
    };

    // Exclude certain categories if specified
    if (options.excludeCategories && options.excludeCategories.length > 0) {
      searchOptions.where = {
        category: { $nin: options.excludeCategories },
      };
    }

    const results = await this.searchSimilar([1, 2, 3], searchOptions); // Use embedding vector instead of articleId

    // Convert to scored results (similarity search returns articles without scores)
    // In a real implementation, you would get the scores from ChromaDB
    return results.map((document) => ({
      document,
      score: 0.8, // Placeholder score - in real implementation, get from ChromaDB
      distance: 0.2,
    }));
  }

  /**
   * Multi-category search with faceted results
   */
  async searchWithFacets(
    query: string,
    options: { maxResults?: number } = {}
  ): Promise<{
    results: SearchResultWithScore<ArticleEntity>[];
    facets: {
      categories: Record<string, number>;
      difficulties: Record<string, number>;
      authors: Record<string, number>;
    };
  }> {
    // Get search results
    const searchResults = await this.semanticSearch(query, options);

    // Calculate facets from results
    const facets = {
      categories: {} as Record<string, number>,
      difficulties: {} as Record<string, number>,
      authors: {} as Record<string, number>,
    };

    searchResults.forEach(({ document }) => {
      // Count categories
      const category = document.metadata.category;
      facets.categories[category] = (facets.categories[category] || 0) + 1;

      // Count difficulties
      const difficulty = document.metadata.difficulty;
      facets.difficulties[difficulty] =
        (facets.difficulties[difficulty] || 0) + 1;

      // Count authors
      const author = document.metadata.author;
      facets.authors[author] = (facets.authors[author] || 0) + 1;
    });

    return {
      results: searchResults,
      facets,
    };
  }

  /**
   * Search with tag-based expansion
   */
  async searchWithTagExpansion(
    query: string,
    options: { expandTags?: boolean; maxResults?: number } = {}
  ): Promise<
    Array<{ article: ArticleEntity; score: number; matchedTags?: string[] }>
  > {
    const results = await this.semanticSearch(query, options);

    if (!options.expandTags) {
      return results.map(({ document, score }) => ({
        article: document,
        score,
      }));
    }

    // Add tag matching information
    const queryLower = query.toLowerCase();
    return results.map(({ document, score }) => {
      const matchedTags = document.metadata.tags.filter(
        (tag) =>
          tag.toLowerCase().includes(queryLower) ||
          queryLower.includes(tag.toLowerCase())
      );

      return {
        article: document,
        score: matchedTags.length > 0 ? score * 1.1 : score, // Boost score for tag matches
        matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
      };
    });
  }
}

/**
 * Product repository with e-commerce search patterns
 */
/**
 * Product repository with e-commerce search patterns
 * Uses TypeORM-style pattern with explicit constructor
 */
@Injectable()
export class ProductRepository extends ChromaDBRepository<ProductEntity> {
  /**
   * Explicit constructor with ChromaDBService injection
   * @param chromaDB - ChromaDBService instance
   */
  constructor(chromaDB: ChromaDBService) {
    super(ProductEntity, 'products', chromaDB);
  }

  /**
   * Product search with price and availability filters
   */
  async searchProducts(
    query: string,
    options: {
      minPrice?: number;
      maxPrice?: number;
      inStockOnly?: boolean;
      brand?: string;
      category?: string;
      minRating?: number;
      maxResults?: number;
    } = {}
  ): Promise<SearchResultWithScore<ProductEntity>[]> {
    const whereClause: any = {};

    // Price range filter
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      whereClause.price = {};
      if (options.minPrice !== undefined)
        whereClause.price.$gte = options.minPrice;
      if (options.maxPrice !== undefined)
        whereClause.price.$lte = options.maxPrice;
    }

    // Stock filter
    if (options.inStockOnly) {
      whereClause.inStock = true;
    }

    // Brand filter
    if (options.brand) {
      whereClause.brand = options.brand;
    }

    // Category filter
    if (options.category) {
      whereClause.category = options.category;
    }

    // Rating filter
    if (options.minRating) {
      whereClause.rating = { $gte: options.minRating };
    }

    const searchOptions: any = {
      limit: options.maxResults || 20,
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    };

    return this.searchWithScores(query, searchOptions);
  }

  /**
   * Find products by feature similarity
   */
  async findByFeatures(
    features: string[],
    options: {
      matchThreshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<ProductEntity[]> {
    const query = features.join(' ');
    const results = await this.search(query, {
      limit: options.maxResults || 10,
    });

    // Filter by feature overlap if threshold specified
    if (options.matchThreshold) {
      return results.filter((product) => {
        const productFeatures = product.metadata.features || [];
        const overlap = features.filter((f) =>
          productFeatures.some(
            (pf) =>
              pf.toLowerCase().includes(f.toLowerCase()) ||
              f.toLowerCase().includes(pf.toLowerCase())
          )
        ).length;

        return overlap / features.length >= options.matchThreshold!;
      });
    }

    return results;
  }

  /**
   * Recommendation based on similar products
   */
  async getRecommendations(
    productId: string,
    options: {
      maxResults?: number;
      sameBrand?: boolean;
      sameCategory?: boolean;
      priceRange?: { min: number; max: number };
    } = {}
  ): Promise<ProductEntity[]> {
    const searchOptions: any = {
      limit: (options.maxResults || 5) + 1, // +1 to exclude the original product
    };

    const product = await this.findById(productId);
    if (!product) return [];

    // Build filters for recommendations
    const whereClause: any = {};

    if (options.sameBrand) {
      whereClause.brand = product.metadata.brand;
    }

    if (options.sameCategory) {
      whereClause.category = product.metadata.category;
    }

    if (options.priceRange) {
      whereClause.price = {
        $gte: options.priceRange.min,
        $lte: options.priceRange.max,
      };
    }

    if (Object.keys(whereClause).length > 0) {
      searchOptions.where = whereClause;
    }

    const similar = await this.searchSimilar([1, 2, 3], searchOptions); // Use embedding vector instead of productId

    // Exclude the original product and limit results
    return similar
      .filter((p) => p.id !== productId)
      .slice(0, options.maxResults || 5);
  }
}

// ============================================================================
// 4. SEMANTIC SEARCH DEMONSTRATION SERVICE
// ============================================================================

/**
 * Service demonstrating various semantic search patterns
 */
@Injectable()
export class SemanticSearchDemoService implements OnModuleInit {
  constructor(
    private readonly articleRepo: ArticleRepository,
    private readonly productRepo: ProductRepository
  ) {}

  async onModuleInit() {
    console.log('\n🎯 Semantic Search Patterns Demo\n');
    await this.setupTestData();
    await this.demonstrateBasicSemanticSearch();
    await this.demonstrateHybridSearch();
    await this.demonstrateScoreThresholding();
    await this.demonstrateSimilaritySearch();
    await this.demonstrateMultiFieldSearch();
    await this.demonstrateEcommerceSearch();
    await this.demonstrateSearchOptimization();
    await this.cleanup();
  }

  /**
   * Setup test data for demonstrations
   */
  private async setupTestData(): Promise<void> {
    console.log('📚 Setting up test data for semantic search...');

    try {
      // Create test articles
      const articles: CreateDocumentInput<ArticleEntity>[] = [
        {
          content:
            'Introduction to Machine Learning - Learn the basics of ML algorithms and their applications. Machine learning is a subset of artificial intelligence that focuses on developing algorithms that can learn and make decisions from data. This comprehensive guide covers supervised learning, unsupervised learning, and reinforcement learning techniques. We explore popular algorithms like linear regression, decision trees, neural networks, and support vector machines.',
          metadata: {
            title: 'Introduction to Machine Learning',
            summary: 'Learn the basics of ML algorithms and their applications',
            category: 'AI/ML',
            tags: ['machine-learning', 'ai', 'algorithms', 'data-science'],
            author: 'Dr. Sarah Chen',
            difficulty: 'beginner',
            readingTime: 15,
            publishedDate: '2024-01-15',
            views: 1250,
            rating: 4.5,
          },
        },
        {
          content:
            'Deep Learning with Neural Networks - Advanced guide to deep learning architectures and training. Deep learning represents a powerful subset of machine learning that uses artificial neural networks with multiple layers to model and understand complex patterns in data. This article delves into convolutional neural networks (CNNs), recurrent neural networks (RNNs), transformers, and modern architectures like BERT and GPT. We cover training techniques, optimization methods, and practical applications in computer vision and natural language processing.',
          metadata: {
            title: 'Deep Learning with Neural Networks',
            summary:
              'Advanced guide to deep learning architectures and training',
            category: 'AI/ML',
            tags: [
              'deep-learning',
              'neural-networks',
              'cnn',
              'rnn',
              'transformers',
            ],
            author: 'Prof. Michael Rodriguez',
            difficulty: 'advanced',
            readingTime: 25,
            publishedDate: '2024-02-01',
            views: 890,
            rating: 4.7,
          },
        },
        {
          content:
            'Vector Databases and Semantic Search - Understanding vector databases for AI applications. Vector databases are specialized database systems designed to store, index, and query high-dimensional vector data efficiently. They are essential for applications involving machine learning, artificial intelligence, and semantic search. This guide covers vector embeddings, similarity search algorithms, indexing strategies like HNSW and IVF, and popular vector database solutions including Chroma, Pinecone, and Weaviate.',
          metadata: {
            title: 'Vector Databases and Semantic Search',
            summary: 'Understanding vector databases for AI applications',
            category: 'Database',
            tags: [
              'vector-database',
              'embeddings',
              'semantic-search',
              'chroma',
              'similarity',
            ],
            author: 'Dr. Sarah Chen',
            difficulty: 'intermediate',
            readingTime: 20,
            publishedDate: '2024-02-15',
            views: 567,
            rating: 4.3,
          },
        },
        {
          content:
            'Building REST APIs with NestJS - Complete guide to creating scalable APIs with NestJS framework. NestJS is a progressive Node.js framework for building efficient and scalable server-side applications. It uses modern JavaScript, is built with TypeScript, and combines elements of OOP, FP, and FRP. This tutorial covers setting up a NestJS project, creating controllers and services, implementing authentication and authorization, working with databases using TypeORM, validation, testing, and deployment strategies.',
          metadata: {
            title: 'Building REST APIs with NestJS',
            summary:
              'Complete guide to creating scalable APIs with NestJS framework',
            category: 'Web Development',
            tags: ['nestjs', 'nodejs', 'typescript', 'rest-api', 'backend'],
            author: 'John Developer',
            difficulty: 'intermediate',
            readingTime: 30,
            publishedDate: '2024-01-20',
            views: 2100,
            rating: 4.6,
          },
        },
        {
          content:
            'Introduction to TypeScript - Getting started with TypeScript for JavaScript developers. TypeScript is a strongly typed programming language that builds on JavaScript by adding static type definitions. This beginner-friendly guide covers TypeScript basics including types, interfaces, classes, generics, and modules. Learn how to set up a TypeScript project, configure the compiler, and migrate from JavaScript. We also explore advanced features like decorators, utility types, and integration with popular frameworks.',
          metadata: {
            title: 'Introduction to TypeScript',
            summary:
              'Getting started with TypeScript for JavaScript developers',
            category: 'Programming',
            tags: [
              'typescript',
              'javascript',
              'types',
              'programming',
              'frontend',
            ],
            author: 'Jane Smith',
            difficulty: 'beginner',
            readingTime: 18,
            publishedDate: '2024-01-10',
            views: 3200,
            rating: 4.4,
          },
        },
      ];

      const createdArticles = await this.articleRepo.createMany(articles);
      console.log(
        `  ✅ Created ${createdArticles.success.length} test articles`
      );

      // Create test products
      const products: CreateDocumentInput<ProductEntity>[] = [
        {
          content:
            'Apple MacBook Pro 16-inch with M2 Pro chip - Ultimate laptop for professionals. The most powerful MacBook Pro ever built for professionals who demand the best performance',
          metadata: {
            name: 'MacBook Pro 16-inch M2 Pro',
            description:
              'Professional laptop with M2 Pro chip, 16GB RAM, 512GB SSD',
            brand: 'Apple',
            category: 'Laptops',
            price: 2499.99,
            currency: 'USD',
            inStock: true,
            features: [
              'M2 Pro chip',
              '16GB RAM',
              '512GB SSD',
              'Retina Display',
              'Touch Bar',
            ],
            specifications: {
              processor: 'Apple M2 Pro',
              memory: '16GB',
              storage: '512GB SSD',
              display: '16.2-inch Retina',
              weight: '2.15 kg',
            },
            rating: 4.8,
            reviewCount: 245,
          },
        },
        {
          content:
            'Dell XPS 13 ultrabook - Compact and powerful laptop for productivity. Ultra-portable laptop with Intel Core i7 processor and stunning InfinityEdge display',
          metadata: {
            name: 'Dell XPS 13',
            description: 'Ultrabook with Intel Core i7, 16GB RAM, 256GB SSD',
            brand: 'Dell',
            category: 'Laptops',
            price: 1299.99,
            currency: 'USD',
            inStock: true,
            features: [
              'Intel Core i7',
              '16GB RAM',
              '256GB SSD',
              'InfinityEdge Display',
              'Thunderbolt',
            ],
            specifications: {
              processor: 'Intel Core i7-1165G7',
              memory: '16GB LPDDR4x',
              storage: '256GB SSD',
              display: '13.4-inch FHD+',
              weight: '1.27 kg',
            },
            rating: 4.5,
            reviewCount: 189,
          },
        },
        {
          content:
            'Wireless Bluetooth Gaming Headset with noise cancellation and RGB lighting. Premium gaming headset with superior audio quality and comfort',
          metadata: {
            name: 'Gaming Headset Pro',
            description: 'Wireless gaming headset with noise cancellation',
            brand: 'SteelSeries',
            category: 'Gaming Accessories',
            price: 199.99,
            currency: 'USD',
            inStock: true,
            features: [
              'Wireless Bluetooth',
              'Noise Cancellation',
              'RGB Lighting',
              '50mm Drivers',
            ],
            specifications: {
              connectivity: 'Bluetooth 5.0',
              battery: '20 hours',
              drivers: '50mm neodymium',
              weight: '350g',
            },
            rating: 4.3,
            reviewCount: 67,
          },
        },
        {
          content:
            'Professional webcam for streaming and video conferencing with 4K resolution. High-quality webcam perfect for content creators and remote work',
          metadata: {
            name: 'HD Webcam 4K',
            description: '4K webcam with auto-focus and noise reduction',
            brand: 'Logitech',
            category: 'Computer Accessories',
            price: 129.99,
            currency: 'USD',
            inStock: false,
            features: [
              '4K Resolution',
              'Auto-focus',
              'Noise Reduction',
              'USB-C',
            ],
            specifications: {
              resolution: '4K 30fps',
              fieldOfView: '90 degrees',
              focus: 'Auto-focus',
              connection: 'USB-C',
            },
            rating: 4.2,
            reviewCount: 156,
          },
        },
      ];

      const createdProducts = await this.productRepo.createMany(products);
      console.log(
        `  ✅ Created ${createdProducts.success.length} test products`
      );
    } catch (error) {
      console.error(
        '  ❌ Error setting up test data:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates basic semantic search functionality
   */
  private async demonstrateBasicSemanticSearch(): Promise<void> {
    console.log('🔍 Basic Semantic Search Demo:');

    try {
      const queries = [
        'artificial intelligence and machine learning',
        'building web applications with TypeScript',
        'database systems for AI applications',
      ];

      for (const query of queries) {
        console.log(`  🔍 Query: "${query}"`);

        const results = await this.articleRepo.semanticSearch(query, {
          maxResults: 3,
        });

        console.log(`    📚 Found ${results.length} relevant articles:`);

        results.forEach((result, index) => {
          console.log(
            `      ${index + 1}. "${result.document.metadata.title}"`
          );
          console.log(`         📊 Score: ${result.score.toFixed(3)}`);
          console.log(
            `         🏷️  Category: ${result.document.metadata.category}`
          );
          console.log(`         👤 Author: ${result.document.metadata.author}`);
        });

        console.log('    ---');
      }
    } catch (error) {
      console.error(
        '  ❌ Error in basic semantic search:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates hybrid search combining vector similarity with metadata filters
   */
  private async demonstrateHybridSearch(): Promise<void> {
    console.log('🔀 Hybrid Search Demo (Vector + Metadata):');

    try {
      const query = 'machine learning algorithms';

      console.log(`  🔍 Query: "${query}"`);
      console.log('  📊 Search variations:');

      // Search 1: Basic semantic search
      const basicResults = await this.articleRepo.semanticSearch(query, {
        maxResults: 5,
      });
      console.log(`    1️⃣  Basic search: ${basicResults.length} results`);

      // Search 2: Filter by category
      const categoryResults = await this.articleRepo.semanticSearch(query, {
        maxResults: 5,
        category: 'AI/ML',
      });
      console.log(
        `    2️⃣  AI/ML category only: ${categoryResults.length} results`
      );

      // Search 3: Filter by difficulty
      const beginnerResults = await this.articleRepo.semanticSearch(query, {
        maxResults: 5,
        difficulty: 'beginner',
      });
      console.log(
        `    3️⃣  Beginner level only: ${beginnerResults.length} results`
      );

      // Search 4: Filter by author
      const authorResults = await this.articleRepo.semanticSearch(query, {
        maxResults: 5,
        author: 'Dr. Sarah Chen',
      });
      console.log(`    4️⃣  By Dr. Sarah Chen: ${authorResults.length} results`);

      // Show detailed results for category-filtered search
      if (categoryResults.length > 0) {
        console.log('  📖 Category-filtered results:');
        categoryResults.forEach((result, index) => {
          console.log(`    ${index + 1}. "${result.document.metadata.title}"`);
          console.log(`       📊 Score: ${result.score.toFixed(3)}`);
          console.log(
            `       📅 Difficulty: ${result.document.metadata.difficulty}`
          );
        });
      }
    } catch (error) {
      console.error(
        '  ❌ Error in hybrid search:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates search with score thresholding and relevance filtering
   */
  private async demonstrateScoreThresholding(): Promise<void> {
    console.log('📊 Score Thresholding Demo:');

    try {
      const query = 'programming languages';
      const thresholds = [0.0, 0.5, 0.7, 0.9];

      console.log(`  🔍 Query: "${query}"`);
      console.log('  📊 Results by score threshold:');

      for (const threshold of thresholds) {
        const results = await this.articleRepo.semanticSearch(query, {
          minScore: threshold,
          maxResults: 10,
        });

        console.log(
          `    🎯 Threshold ≥ ${threshold}: ${results.length} results`
        );

        if (results.length > 0 && threshold >= 0.5) {
          results.slice(0, 2).forEach((result) => {
            console.log(
              `      📚 "${
                result.document.metadata.title
              }" (${result.score.toFixed(3)})`
            );
          });
        }
      }

      // Demonstrate quality vs. quantity trade-off
      console.log('  ⚖️  Quality vs. Quantity Analysis:');
      const lowThreshold = await this.articleRepo.semanticSearch(query, {
        minScore: 0.3,
      });
      const highThreshold = await this.articleRepo.semanticSearch(query, {
        minScore: 0.7,
      });

      console.log(
        `    📈 Low threshold (0.3): ${lowThreshold.length} results (more quantity)`
      );
      console.log(
        `    📉 High threshold (0.7): ${highThreshold.length} results (higher quality)`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in score thresholding:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates finding similar documents by content
   */
  private async demonstrateSimilaritySearch(): Promise<void> {
    console.log('🔗 Similarity Search Demo:');

    try {
      // Find all articles first
      const allArticles = await this.articleRepo.findAll({ limit: 5 });

      if (allArticles.length === 0) {
        console.log('  ⚠️  No articles found for similarity search');
        return;
      }

      const sourceArticle = allArticles[0];
      console.log(`  📖 Source article: "${sourceArticle.metadata.title}"`);
      console.log(`    🏷️  Category: ${sourceArticle.metadata.category}`);
      console.log(`    📅 Difficulty: ${sourceArticle.metadata.difficulty}`);

      // Find similar articles
      const similarResults = await this.articleRepo.findSimilarArticles(
        sourceArticle.id,
        {
          maxResults: 3,
          minScore: 0.3,
        }
      );

      console.log(`  🔗 Similar articles (${similarResults.length} found):`);

      similarResults.forEach((result, index) => {
        console.log(`    ${index + 1}. "${result.document.metadata.title}"`);
        console.log(`       📊 Similarity: ${result.score.toFixed(3)}`);
        console.log(
          `       🏷️  Category: ${result.document.metadata.category}`
        );
        console.log(`       👤 Author: ${result.document.metadata.author}`);
      });

      // Find similar but exclude same category
      const crossCategoryResults = await this.articleRepo.findSimilarArticles(
        sourceArticle.id,
        {
          maxResults: 3,
          excludeCategories: [sourceArticle.metadata.category],
        }
      );

      console.log(
        `  🔀 Cross-category similar articles (${crossCategoryResults.length} found):`
      );
      crossCategoryResults.forEach((result, index) => {
        console.log(
          `    ${index + 1}. "${result.document.metadata.title}" (${
            result.document.metadata.category
          })`
        );
      });
    } catch (error) {
      console.error(
        '  ❌ Error in similarity search:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates multi-field search with faceted results
   */
  private async demonstrateMultiFieldSearch(): Promise<void> {
    console.log('🎭 Multi-field Search with Facets Demo:');

    try {
      const query = 'web development frameworks';

      console.log(`  🔍 Query: "${query}"`);

      const facetedResults = await this.articleRepo.searchWithFacets(query, {
        maxResults: 10,
      });

      console.log(`  📚 Found ${facetedResults.results.length} articles`);
      console.log('  📊 Search Facets:');

      // Display category facets
      console.log('    📂 Categories:');
      Object.entries(facetedResults.facets.categories).forEach(
        ([category, count]) => {
          console.log(`      - ${category}: ${count} articles`);
        }
      );

      // Display difficulty facets
      console.log('    📈 Difficulty Levels:');
      Object.entries(facetedResults.facets.difficulties).forEach(
        ([difficulty, count]) => {
          console.log(`      - ${difficulty}: ${count} articles`);
        }
      );

      // Display author facets
      console.log('    👥 Authors:');
      Object.entries(facetedResults.facets.authors).forEach(
        ([author, count]) => {
          console.log(`      - ${author}: ${count} articles`);
        }
      );

      // Tag expansion search
      console.log('  🏷️  Tag Expansion Search:');
      const expandedResults = await this.articleRepo.searchWithTagExpansion(
        query,
        {
          expandTags: true,
          maxResults: 5,
        }
      );

      expandedResults.forEach((result, index) => {
        console.log(`    ${index + 1}. "${result.article.metadata.title}"`);
        console.log(`       📊 Score: ${result.score.toFixed(3)}`);
        if (result.matchedTags) {
          console.log(
            `       🏷️  Matched tags: ${result.matchedTags.join(', ')}`
          );
        }
      });
    } catch (error) {
      console.error(
        '  ❌ Error in multi-field search:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates e-commerce specific search patterns
   */
  private async demonstrateEcommerceSearch(): Promise<void> {
    console.log('🛒 E-commerce Search Patterns Demo:');

    try {
      // Product search with various filters
      console.log('  💻 Product Search Examples:');

      // Search 1: Basic product search
      const laptopResults = await this.productRepo.searchProducts(
        'laptop computer',
        {
          maxResults: 5,
        }
      );
      console.log(
        `    🔍 "laptop computer": ${laptopResults.length} products found`
      );

      // Search 2: Search with price filter
      const budgetLaptops = await this.productRepo.searchProducts('laptop', {
        maxPrice: 1500,
        inStockOnly: true,
        maxResults: 5,
      });
      console.log(
        `    💰 Budget laptops (≤$1500, in stock): ${budgetLaptops.length} products`
      );

      // Search 3: Brand-specific search
      const appleProducts = await this.productRepo.searchProducts(
        'professional laptop',
        {
          brand: 'Apple',
          maxResults: 5,
        }
      );
      console.log(
        `    🍎 Apple professional laptops: ${appleProducts.length} products`
      );

      // Search 4: High-rated products
      const highRated = await this.productRepo.searchProducts(
        'gaming accessories',
        {
          minRating: 4.0,
          inStockOnly: true,
          maxResults: 5,
        }
      );
      console.log(
        `    ⭐ High-rated gaming accessories (≥4.0): ${highRated.length} products`
      );

      // Feature-based search
      console.log('  🔧 Feature-based Search:');
      const features = ['wireless', 'bluetooth', 'noise cancellation'];
      const featureResults = await this.productRepo.findByFeatures(features, {
        matchThreshold: 0.5,
        maxResults: 3,
      });

      console.log(
        `    🎧 Products with features [${features.join(', ')}]: ${
          featureResults.length
        } found`
      );
      featureResults.forEach((product, index) => {
        console.log(`      ${index + 1}. ${product.metadata.name}`);
        console.log(`         💰 $${product.metadata.price}`);
        console.log(
          `         🔧 Features: ${product.metadata.features
            .slice(0, 3)
            .join(', ')}`
        );
      });

      // Product recommendations
      if (laptopResults.length > 0) {
        const sourceProduct = laptopResults[0];
        console.log(
          `  💡 Recommendations for "${sourceProduct.document.metadata.name}":`
        );

        const recommendations = await this.productRepo.getRecommendations(
          sourceProduct.document.id,
          {
            maxResults: 3,
            sameCategory: true,
          }
        );

        recommendations.forEach((product, index) => {
          console.log(`    ${index + 1}. ${product.metadata.name}`);
          console.log(`       💰 $${product.metadata.price}`);
          console.log(`       🏷️  ${product.metadata.category}`);
        });
      }
    } catch (error) {
      console.error(
        '  ❌ Error in e-commerce search:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates search optimization and performance patterns
   */
  private async demonstrateSearchOptimization(): Promise<void> {
    console.log('⚡ Search Optimization Demo:');

    try {
      const query = 'artificial intelligence';

      console.log(`  🔍 Query: "${query}"`);
      console.log('  📊 Performance Comparisons:');

      // Measure search with different result limits
      const limits = [5, 10, 20];

      for (const limit of limits) {
        const startTime = Date.now();
        const results = await this.articleRepo.semanticSearch(query, {
          maxResults: limit,
        });
        const endTime = Date.now();

        console.log(
          `    📈 Limit ${limit}: ${results.length} results in ${
            endTime - startTime
          }ms`
        );
      }

      // Compare filtered vs unfiltered search
      console.log('  🔀 Filtered vs Unfiltered Performance:');

      const unfilteredStart = Date.now();
      const unfilteredResults = await this.articleRepo.semanticSearch(query, {
        maxResults: 10,
      });
      const unfilteredTime = Date.now() - unfilteredStart;

      const filteredStart = Date.now();
      const filteredResults = await this.articleRepo.semanticSearch(query, {
        maxResults: 10,
        category: 'AI/ML',
        difficulty: 'intermediate',
      });
      const filteredTime = Date.now() - filteredStart;

      console.log(
        `    🔍 Unfiltered: ${unfilteredResults.length} results in ${unfilteredTime}ms`
      );
      console.log(
        `    🎯 Filtered: ${filteredResults.length} results in ${filteredTime}ms`
      );

      // Caching demonstration (simulated)
      console.log('  💾 Search Caching Benefits:');
      console.log(
        '    📝 Note: Repository caching is enabled in @ChromaRepository configuration'
      );
      console.log(
        '    🚀 Subsequent identical queries should be faster due to caching'
      );

      // Repeat the same search to demonstrate potential caching
      const cachedStart = Date.now();
      await this.articleRepo.semanticSearch(query, { maxResults: 10 });
      const cachedTime = Date.now() - cachedStart;

      console.log(
        `    💨 Repeated search: ${cachedTime}ms (potentially cached)`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in search optimization demo:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Cleanup test data
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      // Clear articles collection
      await this.articleRepo.clear();
      console.log('  ✅ Cleared articles collection');

      // Clear products collection
      await this.productRepo.clear();
      console.log('  ✅ Cleared products collection');
    } catch (error) {
      console.error(
        '  ❌ Error during cleanup:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }
}

// ============================================================================
// 5. MODULE DEFINITION
// ============================================================================

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false,
    }),
  ],
  providers: [ArticleRepository, ProductRepository, SemanticSearchDemoService],
  exports: [ArticleRepository, ProductRepository],
})
export class SemanticSearchPatternsExampleModule {}

// ============================================================================
// 6. SEMANTIC SEARCH BEST PRACTICES
// ============================================================================

/**
 * Semantic Search Best Practices:
 *
 * 1. **Embedding Quality**: Use multiple fields for rich embeddings (title + content + summary)
 * 2. **Score Thresholding**: Set appropriate relevance thresholds for quality control
 * 3. **Hybrid Search**: Combine semantic search with metadata filters for precision
 * 4. **Performance**: Use result limits and caching for optimal performance
 * 5. **User Experience**: Provide faceted search and recommendations
 * 6. **Content Strategy**: Structure content with semantic search in mind
 * 7. **Monitoring**: Track search performance and relevance metrics
 * 8. **Iteration**: Continuously improve based on user feedback and analytics
 *
 * Common Patterns:
 *
 * ```typescript
 * // ✅ Comprehensive search with multiple strategies
 * async comprehensiveSearch(query: string) {
 *   return Promise.all([
 *     this.basicSemanticSearch(query),
 *     this.hybridSearch(query, filters),
 *     this.relatedContent(query),
 *   ]);
 * }
 *
 * // ✅ Progressive search refinement
 * async adaptiveSearch(query: string, userFeedback: SearchFeedback) {
 *   const threshold = calculateThreshold(userFeedback);
 *   return this.searchWithScore(query, { minScore: threshold });
 * }
 *
 * // ✅ Multi-modal search combining different approaches
 * async multiModalSearch(query: string, context: SearchContext) {
 *   const semanticResults = await this.semanticSearch(query);
 *   const keywordResults = await this.keywordSearch(query);
 *   return this.combineAndRank(semanticResults, keywordResults);
 * }
 * ```
 */
