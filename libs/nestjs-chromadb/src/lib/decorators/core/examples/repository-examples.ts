/**
 * @fileoverview @ChromaRepository Decorator - Complete Usage Examples
 * 
 * This file demonstrates comprehensive usage patterns for the @ChromaRepository decorator,
 * showcasing auto-generated CRUD operations, custom business methods, type safety,
 * and integration with performance decorators.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ChromaRepository } from '../chroma-repository.decorator';
import { VectorQuery } from '../vector-query.decorator';
import { Cached } from '../../performance/cached.decorator';
import { Profiled } from '../../performance/profiled.decorator';
import { Retry, RetryPresets } from '../../performance/retry.decorator';
import { BaseDocument } from '../../../types/core.interface';
import { ChromaDBService } from '../../../services/chromadb.service';

// =====================================================================
// Document Type Definitions
// =====================================================================

/**
 * User document with typed metadata
 */
interface UserDocument extends BaseDocument<{
  name: string;
  email: string;
  age: number;
  department: string;
  skills: string[];
  isActive: boolean;
  lastLogin?: string;
  profileCompleteness: number;
}> {}

/**
 * Product document with rich metadata
 */
interface ProductDocument extends BaseDocument<{
  title: string;
  description: string;
  category: string;
  price: number;
  inStock: boolean;
  tags: string[];
  rating: number;
  reviews: number;
  brand: string;
  features: string[];
}> {}

/**
 * Knowledge article document
 */
interface KnowledgeDocument extends BaseDocument<{
  title: string;
  author: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTime: number;
  topics: string[];
  isPublished: boolean;
  lastUpdated: string;
}> {}

// =====================================================================
// Basic Repository Example
// =====================================================================

/**
 * Basic user repository with auto-generated CRUD operations
 */
@Injectable()
@ChromaRepository({
  collection: 'users',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
  autoTimestamp: true,
  autoGenerateIds: true,
  defaultBatchSize: 50,
  enableSoftDelete: false,
  errorHandling: 'throw',
})
export class UserRepository implements ChromaRepository<UserDocument> {
  constructor(private chromaService: ChromaDBService) {}

  // All CRUD methods are auto-generated:
  // - create(document, options?)
  // - createMany(documents, options?)
  // - findById(id, options?)
  // - findByIds(ids, options?)
  // - findAll(options?)
  // - update(id, updates, options?)
  // - updateMany(updates, options?)
  // - upsert(document, options?)
  // - upsertMany(documents, options?)
  // - delete(id, options?)
  // - deleteMany(ids, options?)
  // - deleteByFilter(where?, whereDocument?, options?)
  // - search(query, options?)
  // - searchWithScores(query, options?)
  // - searchSimilar(embedding, options?)
  // - count(where?, whereDocument?)
  // - exists(id)
  // - peek(limit?)
  // - clear()
  // - getCollectionInfo()

  /**
   * Custom business method: Find user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    const users = await (this as any).findAll({ 
      where: { email: { $eq: email } } 
    });
    return users[0] || null;
  }

  /**
   * Custom business method: Find active users in a department
   */
  async findActiveUsersByDepartment(department: string): Promise<UserDocument[]> {
    return (this as any).findAll({
      where: {
        department: { $eq: department },
        isActive: { $eq: true }
      }
    });
  }

  /**
   * Custom business method: Search users by skills with semantic search
   */
  @VectorQuery({
    collection: 'users',
    autoEmbed: true,
    defaultLimit: 20,
  })
  @Cached({ 
    ttl: 300000, // 5 minutes
    keyStrategy: 'collection_aware' 
  })
  async searchBySkills(skillQuery: string, department?: string) {
    const searchOptions = department 
      ? { where: { department: { $eq: department } }, limit: 20 }
      : { limit: 20 };
    
    return (this as any).search(skillQuery, searchOptions);
  }

  /**
   * Custom business method: Get user analytics
   */
  @Profiled({
    slowQueryThreshold: 200,
    logLevel: 'slow',
  })
  async getUserAnalytics() {
    const totalUsers = await (this as any).count();
    const activeUsers = await (this as any).count({ isActive: { $eq: true } });
    const departmentCounts = await this.getDepartmentCounts();
    
    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      departmentBreakdown: departmentCounts,
    };
  }

  private async getDepartmentCounts() {
    // This would typically be done with aggregation, but we'll simulate it
    const allUsers = await (this as any).findAll();
    const departments = new Map<string, number>();
    
    for (const user of allUsers) {
      const dept = user.metadata.department;
      departments.set(dept, (departments.get(dept) || 0) + 1);
    }
    
    return Object.fromEntries(departments);
  }
}

// =====================================================================
// Advanced Repository with Performance Decorators
// =====================================================================

/**
 * Advanced product repository with comprehensive performance optimization
 */
@Injectable()
@ChromaRepository({
  collection: 'products',
  autoEmbed: true,
  enableCaching: true,
  enableBatch: true,
  defaultBatchSize: 100,
  enableValidation: true,
  autoTimestamp: true,
  enableSoftDelete: true, // Enable soft delete for products
  errorHandling: 'log_and_continue',
})
export class ProductRepository {
  private readonly logger = new Logger(ProductRepository.name);

  constructor(private chromaService: ChromaDBService) {}

  /**
   * High-performance product search with caching and retry logic
   */
  @VectorQuery({
    collection: 'products',
    autoEmbed: true,
    defaultLimit: 50,
    includeDistances: true,
  })
  @Cached({
    ttl: 600000, // 10 minutes
    keyStrategy: 'collection_aware',
    refreshStrategy: 'background',
    refreshThreshold: 0.8,
  })
  @Profiled({
    slowQueryThreshold: 150,
    logLevel: 'slow',
    enablePercentiles: true,
  })
  @Retry(RetryPresets.vectorSearch)
  async searchProducts(query: string, filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    minRating?: number;
  }) {
    const where: any = {};
    
    if (filters?.category) where.category = { $eq: filters.category };
    if (filters?.minPrice) where.price = { ...where.price, $gte: filters.minPrice };
    if (filters?.maxPrice) where.price = { ...where.price, $lte: filters.maxPrice };
    if (filters?.inStock !== undefined) where.inStock = { $eq: filters.inStock };
    if (filters?.minRating) where.rating = { $gte: filters.minRating };

    return (this as any).searchWithScores(query, {
      where: Object.keys(where).length > 0 ? where : undefined,
      limit: 50,
      threshold: 0.7, // Similarity threshold
    });
  }

  /**
   * Bulk product import with batch processing
   */
  @Profiled({
    logLevel: 'all',
    includeMemoryMetrics: true,
  })
  @Retry({
    maxAttempts: 3,
    baseDelay: 2000,
    strategy: 'exponential',
  })
  async bulkImportProducts(products: Omit<ProductDocument, 'id'>[]) {
    this.logger.log(`Starting bulk import of ${products.length} products`);
    
    try {
      const result = await (this as any).createMany(products, {
        batchSize: 100, // Process in batches of 100
        metadata: {
          importedAt: new Date().toISOString(),
          importBatch: Date.now().toString(),
        }
      });

      this.logger.log(`Successfully imported ${result.documentsProcessed} products`);
      return result;
    } catch (error) {
      this.logger.error('Bulk import failed', error);
      throw error;
    }
  }

  /**
   * Smart product recommendations using semantic similarity
   */
  @Cached({
    ttl: 1800000, // 30 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  async getProductRecommendations(
    productId: string, 
    limit: number = 10
  ): Promise<Array<{ product: ProductDocument; similarity: number }>> {
    // Get the source product
    const sourceProduct = await (this as any).findById(productId);
    if (!sourceProduct) {
      throw new Error(`Product ${productId} not found`);
    }

    // Find similar products using embedding similarity
    if (sourceProduct.embedding) {
      const similarProducts = await (this as any).searchSimilar(
        sourceProduct.embedding,
        {
          limit: limit + 1, // +1 to exclude self
          where: { id: { $ne: productId } }, // Exclude the source product
        }
      );

      return similarProducts.map((product: ProductDocument, index: number) => ({
        product,
        similarity: 1 - (index * 0.1), // Simulate similarity scores
      }));
    }

    // Fallback to category-based recommendations
    return this.getCategoryBasedRecommendations(sourceProduct.metadata.category, limit);
  }

  private async getCategoryBasedRecommendations(
    category: string, 
    limit: number
  ): Promise<Array<{ product: ProductDocument; similarity: number }>> {
    const categoryProducts = await (this as any).findAll({
      where: { 
        category: { $eq: category },
        inStock: { $eq: true }
      }
    });

    // Sort by rating and return top products
    const sorted = categoryProducts
      .sort((a: ProductDocument, b: ProductDocument) => 
        b.metadata.rating - a.metadata.rating
      )
      .slice(0, limit);

    return sorted.map((product: ProductDocument, index: number) => ({
      product,
      similarity: 0.8 - (index * 0.05), // Decreasing similarity
    }));
  }

  /**
   * Get trending products based on recent activity
   */
  async getTrendingProducts(timeWindow: string = '24h'): Promise<ProductDocument[]> {
    // This would typically use time-based queries
    // For demo, we'll return highest rated products
    const allProducts = await (this as any).findAll({
      where: { inStock: { $eq: true } }
    });

    return allProducts
      .sort((a: ProductDocument, b: ProductDocument) => {
        // Sort by rating * reviews for trending score
        const scoreA = a.metadata.rating * Math.log(a.metadata.reviews + 1);
        const scoreB = b.metadata.rating * Math.log(b.metadata.reviews + 1);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }
}

// =====================================================================
// Knowledge Base Repository with Advanced Features
// =====================================================================

/**
 * Knowledge base repository with semantic search and content analysis
 */
@Injectable()
@ChromaRepository({
  collection: 'knowledge',
  autoEmbed: true,
  enableCaching: true,
  enableValidation: true,
  autoTimestamp: true,
  defaultEmbeddingModel: 'text-embedding-ada-002',
  errorHandling: 'throw',
})
export class KnowledgeRepository {
  constructor(private chromaService: ChromaDBService) {}

  /**
   * Intelligent content search with contextual ranking
   */
  @VectorQuery({
    collection: 'knowledge',
    autoEmbed: true,
    defaultLimit: 15,
    includeDistances: true,
    includeMetadata: true,
  })
  @Cached({
    ttl: 300000,
    keyStrategy: 'collection_aware',
    invalidateOnMutation: true,
  })
  async searchKnowledge(
    query: string,
    filters?: {
      category?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      author?: string;
      topics?: string[];
      publishedOnly?: boolean;
    }
  ) {
    const where: any = {};
    
    if (filters?.category) where.category = { $eq: filters.category };
    if (filters?.difficulty) where.difficulty = { $eq: filters.difficulty };
    if (filters?.author) where.author = { $eq: filters.author };
    if (filters?.publishedOnly) where.isPublished = { $eq: true };
    if (filters?.topics?.length) {
      where.topics = { $in: filters.topics };
    }

    return (this as any).searchWithScores(query, {
      where: Object.keys(where).length > 0 ? where : undefined,
      limit: 15,
      threshold: 0.6,
    });
  }

  /**
   * Get related articles using semantic similarity
   */
  async getRelatedArticles(
    articleId: string,
    limit: number = 5
  ): Promise<KnowledgeDocument[]> {
    const article = await (this as any).findById(articleId);
    if (!article) return [];

    if (article.embedding) {
      return (this as any).searchSimilar(article.embedding, {
        limit: limit + 1,
        where: { 
          id: { $ne: articleId },
          isPublished: { $eq: true }
        }
      });
    }

    // Fallback to topic-based similarity
    const relatedByTopics = await (this as any).findAll({
      where: {
        topics: { $in: article.metadata.topics },
        id: { $ne: articleId },
        isPublished: { $eq: true }
      }
    });

    return relatedByTopics.slice(0, limit);
  }

  /**
   * Get learning path suggestions
   */
  async getLearningPath(
    topic: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<KnowledgeDocument[]> {
    const difficulties: Array<'beginner' | 'intermediate' | 'advanced'> = 
      userLevel === 'beginner' ? ['beginner', 'intermediate'] :
      userLevel === 'intermediate' ? ['intermediate', 'advanced'] :
      ['advanced'];

    const articles = await (this as any).findAll({
      where: {
        topics: { $in: [topic] },
        difficulty: { $in: difficulties },
        isPublished: { $eq: true }
      }
    });

    // Sort by difficulty and reading time for a progressive learning path
    return articles.sort((a: KnowledgeDocument, b: KnowledgeDocument) => {
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      const aDiff = difficultyOrder[a.metadata.difficulty];
      const bDiff = difficultyOrder[b.metadata.difficulty];
      
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.metadata.readingTime - b.metadata.readingTime;
    });
  }

  /**
   * Content analytics and insights
   */
  @Profiled({
    logLevel: 'slow',
    slowQueryThreshold: 300,
  })
  async getContentAnalytics() {
    const allArticles = await (this as any).findAll({
      where: { isPublished: { $eq: true } }
    });

    const analytics = {
      totalArticles: allArticles.length,
      byCategory: new Map<string, number>(),
      byDifficulty: new Map<string, number>(),
      byAuthor: new Map<string, number>(),
      avgReadingTime: 0,
      topTopics: new Map<string, number>(),
    };

    let totalReadingTime = 0;

    for (const article of allArticles) {
      const { category, difficulty, author, readingTime, topics } = article.metadata;
      
      analytics.byCategory.set(category, (analytics.byCategory.get(category) || 0) + 1);
      analytics.byDifficulty.set(difficulty, (analytics.byDifficulty.get(difficulty) || 0) + 1);
      analytics.byAuthor.set(author, (analytics.byAuthor.get(author) || 0) + 1);
      
      totalReadingTime += readingTime;
      
      for (const topic of topics) {
        analytics.topTopics.set(topic, (analytics.topTopics.get(topic) || 0) + 1);
      }
    }

    analytics.avgReadingTime = totalReadingTime / allArticles.length;

    return {
      ...analytics,
      byCategory: Object.fromEntries(analytics.byCategory),
      byDifficulty: Object.fromEntries(analytics.byDifficulty),
      byAuthor: Object.fromEntries(analytics.byAuthor),
      topTopics: Object.fromEntries(
        Array.from(analytics.topTopics.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
      ),
    };
  }
}

// =====================================================================
// Repository Factory Pattern
// =====================================================================

/**
 * Factory for creating type-safe repositories
 */
export class RepositoryFactory {
  constructor(private chromaService: ChromaDBService) {}

  createUserRepository(): UserRepository {
    return new UserRepository(this.chromaService);
  }

  createProductRepository(): ProductRepository {
    return new ProductRepository(this.chromaService);
  }

  createKnowledgeRepository(): KnowledgeRepository {
    return new KnowledgeRepository(this.chromaService);
  }
}

// =====================================================================
// Example Usage in Service Layer
// =====================================================================

/**
 * Service that uses multiple repositories
 */
@Injectable()
export class ApplicationService {
  constructor(
    private userRepo: UserRepository,
    private productRepo: ProductRepository,
    private knowledgeRepo: KnowledgeRepository
  ) {}

  /**
   * Comprehensive search across all content types
   */
  async globalSearch(query: string) {
    const [users, products, articles] = await Promise.all([
      this.userRepo.searchBySkills(query).catch(() => []),
      this.productRepo.searchProducts(query).catch(() => []),
      this.knowledgeRepo.searchKnowledge(query).catch(() => []),
    ]);

    return {
      users: users.slice(0, 5),
      products: products.slice(0, 10),
      articles: articles.slice(0, 8),
      totalResults: users.length + products.length + articles.length,
    };
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const userSkills = user.metadata.skills;
    const userDepartment = user.metadata.department;

    const [relatedUsers, recommendedProducts, learningContent] = await Promise.all([
      this.userRepo.findActiveUsersByDepartment(userDepartment),
      this.getRecommendedProducts(userSkills),
      this.getRecommendedLearning(userSkills),
    ]);

    return {
      relatedUsers: relatedUsers.filter(u => u.id !== userId).slice(0, 5),
      recommendedProducts: recommendedProducts.slice(0, 8),
      learningContent: learningContent.slice(0, 6),
    };
  }

  private async getRecommendedProducts(skills: string[]) {
    const skillQuery = skills.join(' ');
    return this.productRepo.searchProducts(skillQuery);
  }

  private async getRecommendedLearning(skills: string[]) {
    const learningContent = [];
    
    for (const skill of skills.slice(0, 3)) { // Limit to top 3 skills
      const articles = await this.knowledgeRepo.searchKnowledge(skill);
      learningContent.push(...articles.slice(0, 2));
    }
    
    return learningContent;
  }
}

/**
 * Example of how to configure and use the repositories in a module
 */
export const ExampleUsage = {
  async demonstrateBasicUsage(userRepo: UserRepository) {
    // Create a new user
    const newUser = await userRepo.create({
      content: 'Software engineer with expertise in TypeScript and AI',
      metadata: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        department: 'Engineering',
        skills: ['TypeScript', 'AI', 'Vector Databases'],
        isActive: true,
        profileCompleteness: 85,
      },
    });

    console.log('Created user:', newUser.id);

    // Search for users with similar skills
    const similarUsers = await userRepo.searchBySkills('AI TypeScript');
    console.log('Found similar users:', similarUsers.length);

    // Get user analytics
    const analytics = await userRepo.getUserAnalytics();
    console.log('User analytics:', analytics);

    // Update user
    const updatedUser = await userRepo.update(newUser.id, {
      metadata: { ...newUser.metadata, lastLogin: new Date().toISOString() }
    });

    console.log('Updated user login time');

    return { newUser, similarUsers, analytics, updatedUser };
  },

  async demonstrateAdvancedUsage(productRepo: ProductRepository) {
    // Bulk import products
    const products = [
      {
        content: 'High-performance laptop with AI acceleration',
        metadata: {
          title: 'AI Laptop Pro',
          description: 'Professional laptop for AI development',
          category: 'Electronics',
          price: 2499.99,
          inStock: true,
          tags: ['laptop', 'AI', 'professional'],
          rating: 4.8,
          reviews: 127,
          brand: 'TechCorp',
          features: ['16GB RAM', 'RTX 4080', 'M.2 SSD'],
        },
      },
      // ... more products
    ];

    const importResult = await productRepo.bulkImportProducts(products);
    console.log('Import result:', importResult);

    // Search with filters
    const searchResults = await productRepo.searchProducts('AI laptop', {
      category: 'Electronics',
      minPrice: 1000,
      maxPrice: 3000,
      inStock: true,
      minRating: 4.5,
    });

    console.log('Search results:', searchResults.length);

    // Get recommendations
    if (searchResults.length > 0) {
      const recommendations = await productRepo.getProductRecommendations(
        searchResults[0].product.id
      );
      console.log('Recommendations:', recommendations.length);
    }

    return { importResult, searchResults };
  },
};