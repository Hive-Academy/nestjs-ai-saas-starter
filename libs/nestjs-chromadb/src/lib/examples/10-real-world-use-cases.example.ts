/**
 * @fileoverview Real-World Use Cases Example - Complete Application Examples
 *
 * Demonstrates:
 * - E-commerce product search and recommendation engine
 * - Knowledge base with semantic search and RAG
 * - User profile matching and personalization
 * - Document classification and content analysis
 * - Content recommendation systems
 * - Multi-modal search (text + metadata + embeddings)
 * - Real-time analytics and insights
 * - AI-powered customer support
 *
 * Key Concepts:
 * - Production-ready business applications
 * - Complex multi-entity workflows
 * - AI-driven user experiences
 * - Performance optimization at scale
 * - Real-time data processing
 * - Advanced recommendation algorithms
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  BaseDocument,
  ChromaDBModule,
  ChromaDBRepository,
  ChromaDBService,
  ChromaEmbedding,
  ChromaEntity,
  ChromaId,
  ChromaMetadata,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
} from '../../index';

// =============================================================================
// E-commerce Product Entities
// =============================================================================

interface ProductMetadata {
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  attributes: Record<string, any>;
  seoKeywords: string[];
  releaseDate: string;
  lastUpdated: string;
}

interface UserInteraction {
  userId: string;
  action: 'view' | 'like' | 'purchase' | 'cart_add' | 'review';
  timestamp: string;
  sessionId: string;
  rating?: number;
}

/**
 * E-commerce product entity for recommendation system
 */
@ChromaEntity({
  collection: 'ecommerce_products',
  description:
    'E-commerce products with rich metadata for recommendation engine',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class EcommerceProductEntity implements BaseDocument<ProductMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Rich product description for semantic search',
    validate: (content: string) => content.length > 10 && content.length < 5000,
  })
  content!: string;

  @ChromaMetadata()
  metadata!: ProductMetadata;

  @ChromaEmbedding()
  embedding?: number[];

  interactions: UserInteraction[] = [];

  @CreatedAt()
  createdAt!: string;

  @UpdatedAt()
  updatedAt!: string;

  // Business logic methods
  toChroma() {
    return {
      ids: [this.id],
      documents: [this.content],
      metadatas: [{ ...this.metadata, interactions: this.interactions }],
      embeddings: this.embedding ? [this.embedding] : undefined,
    };
  }

  static fromChroma(data: any, index: number): EcommerceProductEntity {
    const entity = new EcommerceProductEntity();
    entity.id = data.ids[index];
    entity.content = data.documents[index];
    const metadata = data.metadatas[index];
    entity.interactions = metadata.interactions || [];
    delete metadata.interactions;
    entity.metadata = metadata;
    entity.embedding = data.embeddings?.[index];
    entity.createdAt = metadata.createdAt || new Date().toISOString();
    entity.updatedAt = metadata.updatedAt || new Date().toISOString();
    return entity;
  }

  addInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);
  }

  getPopularityScore(): number {
    const viewWeight = 1;
    const likeWeight = 2;
    const cartWeight = 3;
    const purchaseWeight = 5;
    const reviewWeight = 4;

    return this.interactions.reduce((score, interaction) => {
      switch (interaction.action) {
        case 'view':
          return score + viewWeight;
        case 'like':
          return score + likeWeight;
        case 'cart_add':
          return score + cartWeight;
        case 'purchase':
          return score + purchaseWeight;
        case 'review':
          return score + reviewWeight;
        default:
          return score;
      }
    }, 0);
  }

  getAverageRating(): number {
    const ratings = this.interactions
      .filter((i) => i.action === 'review' && i.rating)
      .map((i) => i.rating!);

    if (ratings.length === 0) return this.metadata.rating;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }
}

// =============================================================================
// Knowledge Base Entities
// =============================================================================

interface KnowledgeDocumentMetadata {
  title: string;
  category: string;
  topics: string[];
  author: string;
  department: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  lastReviewed: string;
  version: string;
  tags: string[];
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
}

/**
 * Knowledge base document for RAG applications
 */
@ChromaEntity({
  collection: 'knowledge_documents',
  description: 'Knowledge base documents for RAG and semantic search',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class KnowledgeDocumentEntity
  implements BaseDocument<KnowledgeDocumentMetadata>
{
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'Document content for semantic search and RAG',
    validate: (content: string) => content.length > 50,
  })
  content!: string;

  @ChromaMetadata()
  metadata!: KnowledgeDocumentMetadata;

  @ChromaEmbedding()
  embedding?: number[];

  chunks: Array<{
    chunkId: string;
    content: string;
    startIndex: number;
    endIndex: number;
    embedding?: number[];
  }>;

  @CreatedAt()
  createdAt!: string;

  @UpdatedAt()
  updatedAt!: string;

  toChroma() {
    return {
      ids: [this.id],
      documents: [this.content],
      metadatas: [{ ...this.metadata, chunks: this.chunks }],
      embeddings: this.embedding ? [this.embedding] : undefined,
    };
  }

  static fromChroma(data: any, index: number): KnowledgeDocumentEntity {
    const entity = new KnowledgeDocumentEntity();
    entity.id = data.ids[index];
    entity.content = data.documents[index];
    const metadata = data.metadatas[index];
    entity.chunks = metadata.chunks || [];
    delete metadata.chunks;
    entity.metadata = metadata;
    entity.embedding = data.embeddings?.[index];
    entity.createdAt = metadata.createdAt || new Date().toISOString();
    entity.updatedAt = metadata.updatedAt || new Date().toISOString();
    return entity;
  }

  createChunks(maxChunkSize = 500): void {
    const words = this.content.split(' ');
    const chunks: typeof this.chunks = [];

    for (let i = 0; i < words.length; i += maxChunkSize) {
      const chunkWords = words.slice(i, i + maxChunkSize);
      const chunkContent = chunkWords.join(' ');

      chunks.push({
        chunkId: `${this.id}-chunk-${Math.floor(i / maxChunkSize)}`,
        content: chunkContent,
        startIndex: i,
        endIndex: i + chunkWords.length - 1,
      });
    }

    this.chunks = chunks;
  }

  getRelevantChunks(query: string, maxChunks = 3): typeof this.chunks {
    const queryLower = query.toLowerCase();

    return this.chunks
      .map((chunk) => ({
        ...chunk,
        relevanceScore: this.calculateChunkRelevance(chunk.content, queryLower),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxChunks);
  }

  private calculateChunkRelevance(chunkContent: string, query: string): number {
    const chunkLower = chunkContent.toLowerCase();
    const queryWords = query.split(' ');

    let relevanceScore = 0;
    queryWords.forEach((word) => {
      if (chunkLower.includes(word)) {
        relevanceScore += 1;
      }
    });

    return relevanceScore / queryWords.length;
  }
}

// =============================================================================
// User Profile Entities
// =============================================================================

interface UserProfileMetadata {
  userId: string;
  email: string;
  demographics: {
    ageRange: string;
    location: string;
    occupation?: string;
  };
  preferences: {
    categories: string[];
    brands: string[];
    priceRange: { min: number; max: number };
    features: string[];
  };
  behavior: {
    browsingPatterns: string[];
    purchaseHistory: string[];
    interactionFrequency: 'low' | 'medium' | 'high';
  };
  segments: string[];
}

/**
 * User profile entity for personalization
 */
@ChromaEntity({
  collection: 'user_profiles',
  description: 'User profiles for personalization and recommendation',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class UserProfileEntity implements BaseDocument<UserProfileMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp({
    description: 'User profile summary for similarity matching',
  })
  content!: string;

  @ChromaMetadata()
  metadata!: UserProfileMetadata;

  @ChromaEmbedding()
  embedding?: number[];

  @CreatedAt()
  createdAt!: string;

  @UpdatedAt()
  updatedAt!: string;

  toChroma() {
    return {
      ids: [this.id],
      documents: [this.content],
      metadatas: [this.metadata],
      embeddings: this.embedding ? [this.embedding] : undefined,
    };
  }

  static fromChroma(data: any, index: number): UserProfileEntity {
    const entity = new UserProfileEntity();
    entity.id = data.ids[index];
    entity.content = data.documents[index];
    entity.metadata = data.metadatas[index];
    entity.embedding = data.embeddings?.[index];
    entity.createdAt =
      (entity.metadata as any).createdAt || new Date().toISOString();
    entity.updatedAt =
      (entity.metadata as any).updatedAt || new Date().toISOString();
    return entity;
  }

  generateProfileSummary(): string {
    const { demographics, preferences, behavior, segments } = this.metadata;

    return [
      `${demographics.ageRange} user from ${demographics.location}`,
      demographics.occupation ? `working as ${demographics.occupation}` : '',
      `interested in ${preferences.categories.join(', ')}`,
      `prefers brands like ${preferences.brands.join(', ')}`,
      `budget range $${preferences.priceRange.min}-${preferences.priceRange.max}`,
      `${behavior.interactionFrequency} engagement level`,
      `segments: ${segments.join(', ')}`,
    ]
      .filter(Boolean)
      .join('. ');
  }

  updatePreferences(
    newPreferences: Partial<UserProfileMetadata['preferences']>
  ): void {
    this.metadata.preferences = {
      ...this.metadata.preferences,
      ...newPreferences,
    };
    this.content = this.generateProfileSummary();
  }
}

// =============================================================================
// Repository Implementations
// =============================================================================

/**
 * E-commerce product repository with recommendation features
 * Extends ChromaDBRepository<T> with TypeORM-style pattern
 */
@Injectable()
export class EcommerceProductRepository extends ChromaDBRepository<EcommerceProductEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(EcommerceProductEntity, 'ecommerce_products', chromaDB);
  }
  /**
   * Find similar products based on semantic similarity
   */
  async findSimilarProducts(
    productId: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
      excludeOutOfStock?: boolean;
      priceRange?: { min: number; max: number };
    } = {}
  ): Promise<Array<{ product: EcommerceProductEntity; similarity: number }>> {
    const sourceProduct = await this.findById(productId);
    if (!sourceProduct) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const searchResults = await this.searchWithScores(sourceProduct.content, {
      limit: (options.maxResults || 10) + 1,
    });

    return searchResults
      .filter((result) => result.document.id !== productId) // Exclude source product
      .filter((result) => {
        const product = result.document;

        // Apply filters
        if (options.excludeOutOfStock && !product.metadata.inStock)
          return false;
        if (options.priceRange) {
          const price = product.metadata.price;
          if (price < options.priceRange.min || price > options.priceRange.max)
            return false;
        }
        if (options.minSimilarity && result.score < options.minSimilarity)
          return false;

        return true;
      })
      .slice(0, options.maxResults || 10)
      .map((result) => ({
        product: result.document,
        similarity: result.score,
      }));
  }

  /**
   * Get personalized product recommendations
   */
  async getPersonalizedRecommendations(
    userProfile: UserProfileEntity,
    options: {
      maxResults?: number;
      includeNewProducts?: boolean;
      boostPopular?: boolean;
    } = {}
  ): Promise<
    Array<{
      product: EcommerceProductEntity;
      relevanceScore: number;
      reasons: string[];
    }>
  > {
    const userPreferences = userProfile.metadata.preferences;

    // Search based on user's category preferences
    const categorySearches = await Promise.all(
      userPreferences.categories.map((category) =>
        this.findAll({
          where: { category },
          limit: 20,
        })
      )
    );

    // Search based on user's brand preferences
    const brandSearches = await Promise.all(
      userPreferences.brands.map((brand) =>
        this.findAll({
          where: { brand },
          limit: 20,
        })
      )
    );

    const semanticResults = await this.search(userProfile.content, {
      limit: 30,
    });

    // Combine and score all results
    const allProducts = new Map<
      string,
      {
        product: EcommerceProductEntity;
        categoryMatch: boolean;
        brandMatch: boolean;
        semanticScore: number;
        reasons: string[];
      }
    >();

    // Process category matches
    categorySearches.flat().forEach((product) => {
      if (!allProducts.has(product.id)) {
        allProducts.set(product.id, {
          product,
          categoryMatch: true,
          brandMatch: false,
          semanticScore: 0,
          reasons: [`Matches your interest in ${product.metadata.category}`],
        });
      } else {
        allProducts.get(product.id)!.categoryMatch = true;
        allProducts
          .get(product.id)!
          .reasons.push(
            `Matches your interest in ${product.metadata.category}`
          );
      }
    });

    // Process brand matches
    brandSearches.flat().forEach((product) => {
      if (!allProducts.has(product.id)) {
        allProducts.set(product.id, {
          product,
          categoryMatch: false,
          brandMatch: true,
          semanticScore: 0,
          reasons: [`From your preferred brand: ${product.metadata.brand}`],
        });
      } else {
        allProducts.get(product.id)!.brandMatch = true;
        allProducts
          .get(product.id)!
          .reasons.push(`From your preferred brand: ${product.metadata.brand}`);
      }
    });

    // Process semantic matches
    semanticResults.forEach((product) => {
      if (!allProducts.has(product.id)) {
        allProducts.set(product.id, {
          product,
          categoryMatch: false,
          brandMatch: false,
          semanticScore: 0.7, // Default semantic score
          reasons: ['Matches your overall preferences'],
        });
      } else {
        allProducts.get(product.id)!.semanticScore = 0.7;
        allProducts
          .get(product.id)!
          .reasons.push('Matches your overall preferences');
      }
    });

    // Calculate relevance scores and filter
    const recommendations = Array.from(allProducts.values())
      .filter((item) => {
        const price = item.product.metadata.price;
        return (
          price >= userPreferences.priceRange.min &&
          price <= userPreferences.priceRange.max
        );
      })
      .map((item) => {
        let relevanceScore = 0;

        // Category match bonus
        if (item.categoryMatch) relevanceScore += 0.4;

        // Brand match bonus
        if (item.brandMatch) relevanceScore += 0.3;

        // Semantic similarity bonus
        relevanceScore += item.semanticScore * 0.3;

        // Popularity bonus (if enabled)
        if (options.boostPopular) {
          const popularityScore = item.product.getPopularityScore();
          relevanceScore += Math.min(popularityScore / 100, 0.2); // Cap at 0.2
        }

        // New product bonus (if enabled)
        if (options.includeNewProducts) {
          const daysSinceRelease =
            (Date.now() -
              new Date(item.product.metadata.releaseDate).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSinceRelease <= 30) {
            relevanceScore += 0.1;
            item.reasons.push('New product');
          }
        }

        return {
          product: item.product,
          relevanceScore,
          reasons: item.reasons,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 10);

    return recommendations;
  }

  /**
   * Get trending products based on recent interactions
   */
  async getTrendingProducts(
    timeframe: 'hour' | 'day' | 'week' = 'day',
    options: {
      maxResults?: number;
      category?: string;
    } = {}
  ): Promise<
    Array<{
      product: EcommerceProductEntity;
      trendScore: number;
      recentInteractions: number;
    }>
  > {
    const now = new Date();
    let cutoffTime: Date;

    switch (timeframe) {
      case 'hour':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const whereClause: any = {};
    if (options.category) {
      whereClause.category = options.category;
    }

    const allProducts = await this.findAll({ where: whereClause });

    const trendingProducts = allProducts
      .map((product) => {
        const recentInteractions = product.interactions.filter(
          (interaction) => new Date(interaction.timestamp) >= cutoffTime
        );

        const trendScore = recentInteractions.reduce((score, interaction) => {
          switch (interaction.action) {
            case 'view':
              return score + 1;
            case 'like':
              return score + 2;
            case 'cart_add':
              return score + 3;
            case 'purchase':
              return score + 5;
            case 'review':
              return score + 4;
            default:
              return score;
          }
        }, 0);

        return {
          product,
          trendScore,
          recentInteractions: recentInteractions.length,
        };
      })
      .filter((item) => item.trendScore > 0)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, options.maxResults || 20);

    return trendingProducts;
  }
}

/**
 * Knowledge document repository with RAG capabilities
 * Extends ChromaDBRepository<T> with TypeORM-style pattern
 */
@Injectable()
export class KnowledgeDocumentRepository extends ChromaDBRepository<KnowledgeDocumentEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(KnowledgeDocumentEntity, 'knowledge_documents', chromaDB);
  }
  /**
   * Retrieve relevant context for RAG applications
   */
  async retrieveRAGContext(
    query: string,
    options: {
      maxDocuments?: number;
      maxChunksPerDocument?: number;
      minRelevanceScore?: number;
      categories?: string[];
      difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    } = {}
  ): Promise<{
    documents: Array<{
      document: KnowledgeDocumentEntity;
      relevanceScore: number;
      relevantChunks: Array<{
        content: string;
        chunkId: string;
        relevanceScore: number;
      }>;
    }>;
    context: string;
    sources: string[];
    metadata: {
      totalDocuments: number;
      totalChunks: number;
      avgRelevanceScore: number;
    };
  }> {
    const whereClause: any = {};
    if (options.categories) {
      whereClause.category = { $in: options.categories };
    }
    if (options.difficultyLevel) {
      whereClause.difficulty = options.difficultyLevel;
    }

    const searchResults = await this.searchWithScores(query, {
      limit: options.maxDocuments || 10,
      where: whereClause,
    });

    const relevantDocuments = searchResults
      .filter((result) => {
        const minScore = options.minRelevanceScore || 0.3;
        return result.score >= minScore;
      })
      .map((result) => {
        const document = result.document;
        const relevantChunks = document
          .getRelevantChunks(query, options.maxChunksPerDocument || 3)
          .map((chunk: any) => ({
            content: chunk.content,
            chunkId: chunk.chunkId,
            relevanceScore: chunk.relevanceScore || 0,
          }));

        return {
          document,
          relevanceScore: result.score,
          relevantChunks,
        };
      });

    // Build context from relevant chunks
    const contextParts: string[] = [];
    const sources: string[] = [];
    let totalChunks = 0;

    relevantDocuments.forEach((item) => {
      item.relevantChunks.forEach((chunk) => {
        contextParts.push(`[${item.document.metadata.title}] ${chunk.content}`);
        totalChunks++;
      });
      sources.push(item.document.metadata.title);
    });

    const context = contextParts.join('\n\n');
    const avgRelevanceScore =
      relevantDocuments.length > 0
        ? relevantDocuments.reduce(
            (sum, item) => sum + item.relevanceScore,
            0
          ) / relevantDocuments.length
        : 0;

    return {
      documents: relevantDocuments,
      context,
      sources: [...new Set(sources)], // Remove duplicates
      metadata: {
        totalDocuments: relevantDocuments.length,
        totalChunks,
        avgRelevanceScore,
      },
    };
  }

  /**
   * Find documents by topic with semantic expansion
   */
  async findByTopicWithExpansion(
    topic: string,
    options: {
      maxResults?: number;
      includeRelated?: boolean;
      expandSemantics?: boolean;
    } = {}
  ): Promise<
    Array<{
      document: KnowledgeDocumentEntity;
      matchType: 'exact' | 'related' | 'semantic';
      relevanceScore: number;
    }>
  > {
    const results: Array<{
      document: KnowledgeDocumentEntity;
      matchType: 'exact' | 'related' | 'semantic';
      relevanceScore: number;
    }> = [];

    const exactMatches = await this.findAll({
      where: { topics: { $in: [topic] } },
      limit: options.maxResults || 20,
    });

    exactMatches.forEach((doc) => {
      results.push({
        document: doc,
        matchType: 'exact',
        relevanceScore: 1.0,
      });
    });

    // Related topic matches (if enabled)
    if (options.includeRelated) {
      const relatedTopics = this.getRelatedTopics(topic);
      for (const relatedTopic of relatedTopics) {
        const relatedMatches = await this.findAll({
          where: { topics: { $in: [relatedTopic] } },
          limit: 10,
        });

        relatedMatches.forEach((doc) => {
          if (!results.some((r) => r.document.id === doc.id)) {
            results.push({
              document: doc,
              matchType: 'related',
              relevanceScore: 0.8,
            });
          }
        });
      }
    }

    if (options.expandSemantics) {
      const semanticMatches = await this.search(topic, { limit: 15 });

      semanticMatches.forEach((doc) => {
        if (!results.some((r) => r.document.id === doc.id)) {
          results.push({
            document: doc,
            matchType: 'semantic',
            relevanceScore: 0.6,
          });
        }
      });
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 20);
  }

  private getRelatedTopics(topic: string): string[] {
    // Simple related topic mapping (in practice, this could use a knowledge graph or NLP model)
    const topicMap: Record<string, string[]> = {
      javascript: ['nodejs', 'typescript', 'react', 'frontend'],
      python: ['django', 'flask', 'data-science', 'machine-learning'],
      database: ['sql', 'nosql', 'mongodb', 'postgresql'],
      security: [
        'authentication',
        'authorization',
        'encryption',
        'cybersecurity',
      ],
      deployment: ['docker', 'kubernetes', 'ci-cd', 'devops'],
    };

    return topicMap[topic.toLowerCase()] || [];
  }
}

/**
 * User profile repository for personalization
 * Extends ChromaDBRepository<T> with TypeORM-style pattern
 */
@Injectable()
export class UserProfileRepository extends ChromaDBRepository<UserProfileEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(UserProfileEntity, 'user_profiles', chromaDB);
  }
  /**
   * Find similar users for collaborative filtering
   */
  async findSimilarUsers(
    userId: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
      sameSegmentOnly?: boolean;
    } = {}
  ): Promise<
    Array<{
      user: UserProfileEntity;
      similarity: number;
      sharedInterests: string[];
    }>
  > {
    const users = await this.findAll({ where: { userId }, limit: 1 });
    const sourceUser = users[0];
    if (!sourceUser) {
      throw new Error(`User profile with ID ${userId} not found`);
    }

    const whereClause: any = { userId: { $ne: userId } }; // Exclude source user
    if (options.sameSegmentOnly) {
      whereClause.segments = { $in: sourceUser.metadata.segments };
    }

    const similarUsers = await this.searchWithScores(sourceUser.content, {
      limit: options.maxResults || 20,
      where: whereClause,
    });

    return similarUsers
      .filter((result) => {
        const minSimilarity = options.minSimilarity || 0.5;
        return result.score >= minSimilarity;
      })
      .map((result) => {
        const user = result.document;
        const sharedInterests = this.findSharedInterests(
          sourceUser.metadata.preferences,
          user.metadata.preferences
        );

        return {
          user,
          similarity: result.score,
          sharedInterests,
        };
      });
  }

  /**
   * Get user segments for analytics
   */
  async getUserSegmentAnalytics(): Promise<{
    segments: Array<{
      name: string;
      userCount: number;
      avgAge: string;
      topCategories: string[];
      avgBudget: number;
    }>;
    totalUsers: number;
  }> {
    const allUsers = await this.findAll();
    const segmentMap = new Map<string, UserProfileEntity[]>();

    // Group users by segments
    allUsers.forEach((user) => {
      user.metadata.segments.forEach((segment) => {
        if (!segmentMap.has(segment)) {
          segmentMap.set(segment, []);
        }
        segmentMap.get(segment)!.push(user);
      });
    });

    const segments = Array.from(segmentMap.entries()).map(
      ([segmentName, users]) => {
        const categories = users.flatMap(
          (u) => u.metadata.preferences.categories
        );
        const categoryCount = categories.reduce((acc, cat) => {
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topCategories = Object.entries(categoryCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([cat]) => cat);

        const avgBudget =
          users.reduce((sum, user) => {
            return (
              sum +
              (user.metadata.preferences.priceRange.min +
                user.metadata.preferences.priceRange.max) /
                2
            );
          }, 0) / users.length;

        // Most common age range
        const ageRanges = users.map((u) => u.metadata.demographics.ageRange);
        const avgAge = this.getMostCommon(ageRanges);

        return {
          name: segmentName,
          userCount: users.length,
          avgAge,
          topCategories,
          avgBudget: Math.round(avgBudget),
        };
      }
    );

    return {
      segments: segments.sort((a, b) => b.userCount - a.userCount),
      totalUsers: allUsers.length,
    };
  }

  private findSharedInterests(
    prefs1: UserProfileMetadata['preferences'],
    prefs2: UserProfileMetadata['preferences']
  ): string[] {
    const sharedCategories = prefs1.categories.filter((cat) =>
      prefs2.categories.includes(cat)
    );
    const sharedBrands = prefs1.brands.filter((brand) =>
      prefs2.brands.includes(brand)
    );
    const sharedFeatures = prefs1.features.filter((feature) =>
      prefs2.features.includes(feature)
    );

    return [...sharedCategories, ...sharedBrands, ...sharedFeatures];
  }

  private getMostCommon<T>(array: T[]): T {
    const counts = array.reduce((acc, item) => {
      acc[String(item)] = (acc[String(item)] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0] as T;
  }
}

// =============================================================================
// Real-World Application Services
// =============================================================================

/**
 * E-commerce recommendation engine
 */
@Injectable()
export class EcommerceRecommendationService {
  constructor(
    private readonly productRepo: EcommerceProductRepository,
    private readonly userRepo: UserProfileRepository
  ) {}

  /**
   * Get comprehensive product recommendations
   */
  async getRecommendations(
    userId: string,
    options: {
      includePersonalized?: boolean;
      includeTrending?: boolean;
      includeSimilar?: boolean;
      productId?: string; // For similar products
      maxResults?: number;
    } = {}
  ): Promise<{
    personalized: Array<{
      product: EcommerceProductEntity;
      score: number;
      reasons: string[];
    }>;
    trending: Array<{ product: EcommerceProductEntity; trendScore: number }>;
    similar: Array<{ product: EcommerceProductEntity; similarity: number }>;
    metadata: {
      userId: string;
      generatedAt: string;
      totalRecommendations: number;
    };
  }> {
    const results = {
      personalized: [] as any[],
      trending: [] as any[],
      similar: [] as any[],
      metadata: {
        userId,
        generatedAt: new Date().toISOString(),
        totalRecommendations: 0,
      },
    };

    // Get user profile for personalized recommendations
    if (options.includePersonalized !== false) {
      const users = await this.userRepo.findAll({
        where: { userId },
        limit: 1,
      });
      const userProfile = users[0];
      if (userProfile) {
        const personalizedRecs =
          await this.productRepo.getPersonalizedRecommendations(userProfile, {
            maxResults: Math.floor((options.maxResults || 20) * 0.6),
            boostPopular: true,
            includeNewProducts: true,
          });

        results.personalized = personalizedRecs.map((rec) => ({
          product: rec.product,
          score: rec.relevanceScore,
          reasons: rec.reasons,
        }));
      }
    }

    // Get trending products
    if (options.includeTrending !== false) {
      const trendingProducts = await this.productRepo.getTrendingProducts(
        'day',
        {
          maxResults: Math.floor((options.maxResults || 20) * 0.3),
        }
      );

      results.trending = trendingProducts.map((item) => ({
        product: item.product,
        trendScore: item.trendScore,
      }));
    }

    // Get similar products (if productId provided)
    if (options.includeSimilar !== false && options.productId) {
      const similarProducts = await this.productRepo.findSimilarProducts(
        options.productId,
        {
          maxResults: Math.floor((options.maxResults || 20) * 0.4),
          excludeOutOfStock: true,
          minSimilarity: 0.5,
        }
      );

      results.similar = similarProducts.map((item) => ({
        product: item.product,
        similarity: item.similarity,
      }));
    }

    results.metadata.totalRecommendations =
      results.personalized.length +
      results.trending.length +
      results.similar.length;

    return results;
  }

  /**
   * Track user interaction for improving recommendations
   */
  async trackInteraction(
    productId: string,
    interaction: UserInteraction
  ): Promise<void> {
    const product = await this.productRepo.findById(productId);
    if (product) {
      product.addInteraction(interaction);
      await this.productRepo.update(productId, product);
    }
  }
}

/**
 * AI-powered customer support service
 */
@Injectable()
export class AICustomerSupportService {
  constructor(private readonly knowledgeRepo: KnowledgeDocumentRepository) {}

  /**
   * Answer customer questions using RAG
   */
  async answerQuestion(
    question: string,
    options: {
      maxContext?: number;
      includeSources?: boolean;
      difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    } = {}
  ): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
    context: string;
    metadata: {
      relevantDocuments: number;
      avgRelevance: number;
      responseTime: number;
    };
  }> {
    const startTime = Date.now();

    // Retrieve relevant context
    const ragContext = await this.knowledgeRepo.retrieveRAGContext(question, {
      maxDocuments: options.maxContext || 5,
      maxChunksPerDocument: 2,
      minRelevanceScore: 0.3,
      difficultyLevel: options.difficultyLevel,
    });

    // Generate answer based on context
    // In a real implementation, this would use an LLM like OpenAI GPT
    const answer = this.generateAnswerFromContext(question, ragContext.context);
    const confidence = this.calculateConfidence(
      ragContext.metadata.avgRelevanceScore
    );

    const responseTime = Date.now() - startTime;

    return {
      answer,
      confidence,
      sources: options.includeSources !== false ? ragContext.sources : [],
      context: ragContext.context,
      metadata: {
        relevantDocuments: ragContext.metadata.totalDocuments,
        avgRelevance: ragContext.metadata.avgRelevanceScore,
        responseTime,
      },
    };
  }

  private generateAnswerFromContext(question: string, context: string): string {
    // Simplified answer generation (in practice, use OpenAI API)
    if (context.length === 0) {
      return "I don't have enough information to answer that question. Please contact our support team for assistance.";
    }

    const questionWords = question.toLowerCase().split(' ');
    const contextSentences = context
      .split('.')
      .filter((s) => s.trim().length > 0);

    // Find most relevant sentences
    const relevantSentences = contextSentences
      .map((sentence) => ({
        sentence: sentence.trim(),
        relevance: this.calculateSentenceRelevance(sentence, questionWords),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3)
      .map((item) => item.sentence);

    return `Based on our knowledge base: ${relevantSentences.join('. ')}.`;
  }

  private calculateSentenceRelevance(
    sentence: string,
    questionWords: string[]
  ): number {
    const sentenceWords = sentence.toLowerCase().split(' ');
    let matches = 0;

    questionWords.forEach((word) => {
      if (sentenceWords.some((sw) => sw.includes(word))) {
        matches++;
      }
    });

    return matches / questionWords.length;
  }

  private calculateConfidence(avgRelevance: number): number {
    // Convert relevance score to confidence percentage
    return Math.min(avgRelevance * 100, 95); // Cap at 95%
  }
}

/**
 * Content analytics and insights service
 */
@Injectable()
export class ContentAnalyticsService {
  constructor(
    private readonly productRepo: EcommerceProductRepository,
    private readonly knowledgeRepo: KnowledgeDocumentRepository,
    private readonly userRepo: UserProfileRepository
  ) {}

  /**
   * Generate comprehensive business insights
   */
  async generateInsights(): Promise<{
    productInsights: {
      totalProducts: number;
      categoryCounts: Record<string, number>;
      averageRating: number;
      topBrands: Array<{ brand: string; productCount: number }>;
      priceDistribution: { min: number; max: number; avg: number };
    };
    userInsights: {
      totalUsers: number;
      segmentAnalytics: any;
      preferencesTrends: Record<string, number>;
    };
    contentInsights: {
      totalDocuments: number;
      topicDistribution: Record<string, number>;
      contentGaps: string[];
    };
    recommendations: {
      productOptimizations: string[];
      contentSuggestions: string[];
      userEngagementTips: string[];
    };
  }> {
    console.log('🔍 Generating comprehensive business insights...');

    // Product insights
    const allProducts = await this.productRepo.findAll();
    const productInsights = this.analyzeProducts(allProducts);

    // User insights
    const userSegmentAnalytics = await this.userRepo.getUserSegmentAnalytics();
    const allUsers = await this.userRepo.findAll();
    const userInsights = {
      totalUsers: userSegmentAnalytics.totalUsers,
      segmentAnalytics: userSegmentAnalytics,
      preferencesTrends: this.analyzeUserPreferences(allUsers),
    };

    // Content insights
    const allDocuments = await this.knowledgeRepo.findAll();
    const contentInsights = this.analyzeContent(allDocuments);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      productInsights,
      userInsights,
      contentInsights
    );

    return {
      productInsights,
      userInsights,
      contentInsights,
      recommendations,
    };
  }

  private analyzeProducts(products: EcommerceProductEntity[]) {
    const categoryCounts = products.reduce((acc, product) => {
      acc[product.metadata.category] =
        (acc[product.metadata.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const brandCounts = products.reduce((acc, product) => {
      acc[product.metadata.brand] = (acc[product.metadata.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([brand, productCount]) => ({ brand, productCount }));

    const prices = products.map((p) => p.metadata.price);
    const priceDistribution = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    };

    const averageRating =
      products.reduce((sum, p) => sum + p.getAverageRating(), 0) /
      products.length;

    return {
      totalProducts: products.length,
      categoryCounts,
      averageRating,
      topBrands,
      priceDistribution,
    };
  }

  private analyzeUserPreferences(users: UserProfileEntity[]) {
    const allCategories = users.flatMap(
      (u) => u.metadata.preferences.categories
    );
    return allCategories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private analyzeContent(documents: KnowledgeDocumentEntity[]) {
    const topicDistribution = documents.reduce((acc, doc) => {
      doc.metadata.topics.forEach((topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Identify content gaps (topics with fewer than 3 documents)
    const contentGaps = Object.entries(topicDistribution)
      .filter(([, count]) => count < 3)
      .map(([topic]) => topic);

    return {
      totalDocuments: documents.length,
      topicDistribution,
      contentGaps,
    };
  }

  private generateRecommendations(
    productInsights: any,
    userInsights: any,
    contentInsights: any
  ) {
    const productOptimizations: string[] = [];
    const contentSuggestions: string[] = [];
    const userEngagementTips: string[] = [];

    // Product optimization recommendations
    if (productInsights.averageRating < 4.0) {
      productOptimizations.push(
        'Focus on improving product quality to increase average rating'
      );
    }

    const lowStockCategories = Object.entries(productInsights.categoryCounts)
      .filter(([, count]) => (count as number) < 5)
      .map(([category]) => category);

    if (lowStockCategories.length > 0) {
      productOptimizations.push(
        `Expand inventory in low-stock categories: ${lowStockCategories.join(
          ', '
        )}`
      );
    }

    // Content suggestions
    if (contentInsights.contentGaps.length > 0) {
      contentSuggestions.push(
        `Create more content for under-represented topics: ${contentInsights.contentGaps.join(
          ', '
        )}`
      );
    }

    // User engagement tips
    const topPreferences = Object.entries(userInsights.preferencesTrends)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([category]) => category);

    userEngagementTips.push(
      `Focus marketing on popular categories: ${topPreferences.join(', ')}`
    );

    return {
      productOptimizations,
      contentSuggestions,
      userEngagementTips,
    };
  }
}

// =============================================================================
// Comprehensive Demo Service
// =============================================================================

/**
 * Service demonstrating all real-world use cases
 */
@Injectable()
export class RealWorldUseCasesDemoService implements OnModuleInit {
  constructor(
    private readonly productRepo: EcommerceProductRepository,
    private readonly knowledgeRepo: KnowledgeDocumentRepository,
    private readonly userRepo: UserProfileRepository,
    private readonly recommendationService: EcommerceRecommendationService,
    private readonly supportService: AICustomerSupportService,
    private readonly analyticsService: ContentAnalyticsService
  ) {}

  async onModuleInit() {
    console.log('\n🌍 Real-World Use Cases Demo\n');
    console.log(
      'This example demonstrates complete, production-ready applications built with ChromaDB.\n'
    );

    await this.seedSampleData();
    await this.demonstrateEcommerceRecommendations();
    await this.demonstrateKnowledgeBaseRAG();
    await this.demonstratePersonalization();
    await this.demonstrateAnalytics();
  }

  /**
   * Seed sample data for demonstrations
   */
  private async seedSampleData(): Promise<void> {
    console.log('🌱 Seeding sample data...');

    try {
      // Clear existing data
      await this.productRepo.clear();
      await this.knowledgeRepo.clear();
      await this.userRepo.clear();

      // Seed products
      const sampleProducts = this.createSampleProducts();
      await this.productRepo.createMany(sampleProducts);
      console.log(`  ✅ Created ${sampleProducts.length} sample products`);

      // Seed knowledge documents
      const sampleDocuments = this.createSampleKnowledgeDocuments();
      await this.knowledgeRepo.createMany(sampleDocuments);
      console.log(`  ✅ Created ${sampleDocuments.length} knowledge documents`);

      // Seed user profiles
      const sampleUsers = this.createSampleUserProfiles();
      await this.userRepo.createMany(sampleUsers);
      console.log(`  ✅ Created ${sampleUsers.length} user profiles`);
    } catch (error) {
      console.error('  ❌ Failed to seed sample data:', error);
    }

    console.log('');
  }

  /**
   * Demonstrate e-commerce recommendation engine
   */
  private async demonstrateEcommerceRecommendations(): Promise<void> {
    console.log('🛒 E-commerce Recommendation Engine:');

    try {
      // Get recommendations for a sample user
      const recommendations =
        await this.recommendationService.getRecommendations('user-001', {
          includePersonalized: true,
          includeTrending: true,
          maxResults: 10,
        });

      console.log(
        `  📋 Generated ${recommendations.metadata.totalRecommendations} recommendations:`
      );

      if (recommendations.personalized.length > 0) {
        console.log(
          `    🎯 Personalized (${recommendations.personalized.length}):`
        );
        recommendations.personalized.slice(0, 3).forEach((rec) => {
          console.log(
            `      • ${rec.product.metadata.name} (Score: ${rec.score.toFixed(
              2
            )}) - ${rec.reasons[0]}`
          );
        });
      }

      if (recommendations.trending.length > 0) {
        console.log(`    🔥 Trending (${recommendations.trending.length}):`);
        recommendations.trending.slice(0, 3).forEach((trend) => {
          console.log(
            `      • ${trend.product.metadata.name} (Trend Score: ${trend.trendScore})`
          );
        });
      }

      // Demonstrate similar products
      const allProducts = await this.productRepo.findAll({ limit: 5 });
      if (allProducts.length > 0) {
        const similarProducts = await this.productRepo.findSimilarProducts(
          allProducts[0].id,
          {
            maxResults: 3,
            minSimilarity: 0.3,
          }
        );

        console.log(
          `    🔗 Similar to "${allProducts[0].metadata.name}" (${similarProducts.length}):`
        );
        similarProducts.forEach((similar) => {
          console.log(
            `      • ${
              similar.product.metadata.name
            } (Similarity: ${similar.similarity.toFixed(2)})`
          );
        });
      }
    } catch (error) {
      console.error('  ❌ Recommendation demo failed:', error);
    }

    console.log('');
  }

  /**
   * Demonstrate knowledge base and RAG
   */
  private async demonstrateKnowledgeBaseRAG(): Promise<void> {
    console.log('🧠 Knowledge Base & RAG System:');

    try {
      // Answer a customer support question
      const customerQuestion = 'How do I reset my password?';
      const supportAnswer = await this.supportService.answerQuestion(
        customerQuestion,
        {
          includeSources: true,
          difficultyLevel: 'beginner',
        }
      );

      console.log(`  ❓ Question: "${customerQuestion}"`);
      console.log(`  💬 Answer: ${supportAnswer.answer}`);
      console.log(`  📊 Confidence: ${supportAnswer.confidence.toFixed(1)}%`);
      console.log(`  📚 Sources: ${supportAnswer.sources.join(', ')}`);

      // Demonstrate topic-based search
      const topicResults = await this.knowledgeRepo.findByTopicWithExpansion(
        'security',
        {
          maxResults: 5,
          includeRelated: true,
          expandSemantics: true,
        }
      );

      console.log(
        `  🏷️ Topic search for "security" found ${topicResults.length} documents:`
      );
      topicResults.slice(0, 3).forEach((result) => {
        console.log(
          `    • ${result.document.metadata.title} (${
            result.matchType
          }, ${result.relevanceScore.toFixed(2)})`
        );
      });
    } catch (error) {
      console.error('  ❌ Knowledge base demo failed:', error);
    }

    console.log('');
  }

  /**
   * Demonstrate user personalization
   */
  private async demonstratePersonalization(): Promise<void> {
    console.log('👤 User Personalization & Matching:');

    try {
      // Find similar users
      const similarUsers = await this.userRepo.findSimilarUsers('user-001', {
        maxResults: 3,
        minSimilarity: 0.4,
        sameSegmentOnly: false,
      });

      console.log(
        `  🔍 Found ${similarUsers.length} similar users to user-001:`
      );
      similarUsers.forEach((similar) => {
        console.log(
          `    • User ${
            similar.user.metadata.userId
          } (Similarity: ${similar.similarity.toFixed(2)})`
        );
        console.log(
          `      Shared interests: ${similar.sharedInterests
            .slice(0, 3)
            .join(', ')}`
        );
      });

      // User segment analytics
      const segmentAnalytics = await this.userRepo.getUserSegmentAnalytics();
      console.log(
        `  📊 User segments analysis (${segmentAnalytics.totalUsers} total users):`
      );
      segmentAnalytics.segments.slice(0, 3).forEach((segment) => {
        console.log(
          `    • ${segment.name}: ${segment.userCount} users, avg budget $${segment.avgBudget}`
        );
        console.log(
          `      Top categories: ${segment.topCategories
            .slice(0, 3)
            .join(', ')}`
        );
      });
    } catch (error) {
      console.error('  ❌ Personalization demo failed:', error);
    }

    console.log('');
  }

  /**
   * Demonstrate analytics and insights
   */
  private async demonstrateAnalytics(): Promise<void> {
    console.log('📈 Analytics & Business Insights:');

    try {
      const insights = await this.analyticsService.generateInsights();

      console.log('  🛍️ Product Insights:');
      console.log(
        `    • Total products: ${insights.productInsights.totalProducts}`
      );
      console.log(
        `    • Average rating: ${insights.productInsights.averageRating.toFixed(
          2
        )}`
      );
      console.log(
        `    • Price range: $${insights.productInsights.priceDistribution.min.toFixed(
          2
        )} - $${insights.productInsights.priceDistribution.max.toFixed(2)}`
      );

      const topCategories = Object.entries(
        insights.productInsights.categoryCounts
      )
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3);
      console.log(
        `    • Top categories: ${topCategories
          .map(([cat, count]) => `${cat} (${count})`)
          .join(', ')}`
      );

      console.log('  👥 User Insights:');
      console.log(`    • Total users: ${insights.userInsights.totalUsers}`);
      console.log(
        `    • Active segments: ${insights.userInsights.segmentAnalytics.segments.length}`
      );

      console.log('  📚 Content Insights:');
      console.log(
        `    • Total documents: ${insights.contentInsights.totalDocuments}`
      );
      if (insights.contentInsights.contentGaps.length > 0) {
        console.log(
          `    • Content gaps: ${insights.contentInsights.contentGaps
            .slice(0, 3)
            .join(', ')}`
        );
      }

      console.log('  💡 Recommendations:');
      insights.recommendations.productOptimizations
        .slice(0, 2)
        .forEach((rec) => {
          console.log(`    • Product: ${rec}`);
        });
      insights.recommendations.contentSuggestions.slice(0, 2).forEach((rec) => {
        console.log(`    • Content: ${rec}`);
      });
    } catch (error) {
      console.error('  ❌ Analytics demo failed:', error);
    }

    console.log('');
  }

  // Helper methods to create sample data
  private createSampleProducts(): EcommerceProductEntity[] {
    const products: EcommerceProductEntity[] = [];
    const categories = ['electronics', 'clothing', 'home', 'books', 'sports'];
    const brands = [
      'Apple',
      'Samsung',
      'Nike',
      'Adidas',
      'Sony',
      'Amazon',
      'Microsoft',
    ];

    for (let i = 1; i <= 50; i++) {
      const product = new EcommerceProductEntity();
      product.id = `product-${i.toString().padStart(3, '0')}`;
      product.content = `High-quality product ${i} with advanced features and excellent performance. Perfect for modern consumers who value quality and innovation.`;

      const category =
        categories[Math.floor(Math.random() * categories.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];

      product.metadata = {
        name: `${brand} Product ${i}`,
        brand,
        category,
        subcategory: `${category}-sub`,
        price: Math.round((Math.random() * 1000 + 50) * 100) / 100,
        currency: 'USD',
        inStock: Math.random() > 0.2,
        stockQuantity: Math.floor(Math.random() * 100),
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 500),
        tags: [category, brand.toLowerCase(), 'quality'],
        attributes: { color: 'black', size: 'medium' },
        seoKeywords: [category, brand, 'product'],
        releaseDate: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      // Add some sample interactions
      product.interactions = Array.from(
        { length: Math.floor(Math.random() * 10) },
        (_, j) => ({
          userId: `user-${Math.floor(Math.random() * 20)
            .toString()
            .padStart(3, '0')}`,
          action: ['view', 'like', 'cart_add', 'purchase', 'review'][
            Math.floor(Math.random() * 5)
          ] as any,
          timestamp: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          sessionId: `session-${j}`,
          rating:
            Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : undefined,
        })
      );

      product.createdAt = new Date().toISOString();
      product.updatedAt = new Date().toISOString();

      products.push(product);
    }

    return products;
  }

  private createSampleKnowledgeDocuments(): KnowledgeDocumentEntity[] {
    const documents: KnowledgeDocumentEntity[] = [];
    const categories = [
      'security',
      'development',
      'support',
      'policy',
      'tutorial',
    ];
    const topics = [
      'authentication',
      'password-reset',
      'api-integration',
      'troubleshooting',
      'best-practices',
    ];

    const sampleContents = [
      "To reset your password, navigate to the login page and click 'Forgot Password'. Enter your email address and check your inbox for reset instructions. The reset link expires after 24 hours for security purposes.",
      "API authentication requires a valid API key in the request headers. Include the key as 'Authorization: Bearer YOUR_API_KEY'. Ensure your key has the necessary permissions for the requested operation.",
      'Our security policy requires strong passwords with at least 8 characters, including uppercase, lowercase, numbers, and special characters. Two-factor authentication is mandatory for admin accounts.',
      'For troubleshooting connection issues, first check your network connectivity. Ensure firewall settings allow outbound connections on the required ports. Contact support if issues persist.',
      'Best practices for API integration include proper error handling, rate limiting compliance, and secure credential storage. Use environment variables for sensitive configuration data.',
    ];

    for (let i = 1; i <= 20; i++) {
      const document = new KnowledgeDocumentEntity();
      document.id = `doc-${i.toString().padStart(3, '0')}`;
      document.content =
        sampleContents[Math.floor(Math.random() * sampleContents.length)] +
        ` Additional detailed information for document ${i} with comprehensive coverage of the topic.`;

      const category =
        categories[Math.floor(Math.random() * categories.length)];

      document.metadata = {
        title: `Knowledge Document ${i}: ${
          category.charAt(0).toUpperCase() + category.slice(1)
        } Guide`,
        category,
        topics: topics.slice(
          Math.floor(Math.random() * 3),
          Math.floor(Math.random() * 3) + 2
        ),
        author: `Author ${Math.floor(Math.random() * 5) + 1}`,
        department: ['Engineering', 'Support', 'Security', 'Product'][
          Math.floor(Math.random() * 4)
        ],
        confidenceLevel: ['low', 'medium', 'high'][
          Math.floor(Math.random() * 3)
        ] as any,
        lastReviewed: new Date(
          Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
        version: `1.${Math.floor(Math.random() * 10)}`,
        tags: [category, 'documentation', 'guide'],
        language: 'en',
        difficulty: ['beginner', 'intermediate', 'advanced'][
          Math.floor(Math.random() * 3)
        ] as any,
        estimatedReadTime: Math.floor(Math.random() * 15) + 5,
      };

      document.chunks = [];
      document.createdAt = new Date().toISOString();
      document.updatedAt = new Date().toISOString();

      // Create chunks for the document
      document.createChunks(100);

      documents.push(document);
    }

    return documents;
  }

  private createSampleUserProfiles(): UserProfileEntity[] {
    const profiles: UserProfileEntity[] = [];
    const locations = [
      'New York',
      'London',
      'Tokyo',
      'San Francisco',
      'Berlin',
    ];
    const occupations = [
      'Developer',
      'Designer',
      'Manager',
      'Analyst',
      'Consultant',
    ];
    const categories = ['electronics', 'clothing', 'home', 'books', 'sports'];
    const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony'];

    for (let i = 1; i <= 20; i++) {
      const profile = new UserProfileEntity();
      profile.id = `profile-${i.toString().padStart(3, '0')}`;

      const ageRange = ['18-25', '26-35', '36-45', '46-55', '55+'][
        Math.floor(Math.random() * 5)
      ];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const occupation =
        occupations[Math.floor(Math.random() * occupations.length)];

      profile.metadata = {
        userId: `user-${i.toString().padStart(3, '0')}`,
        email: `user${i}@example.com`,
        demographics: {
          ageRange,
          location,
          occupation,
        },
        preferences: {
          categories: categories.slice(0, Math.floor(Math.random() * 3) + 2),
          brands: brands.slice(0, Math.floor(Math.random() * 3) + 1),
          priceRange: {
            min: Math.floor(Math.random() * 100),
            max: Math.floor(Math.random() * 1000) + 200,
          },
          features: ['quality', 'design', 'price', 'brand'].slice(
            0,
            Math.floor(Math.random() * 3) + 1
          ),
        },
        behavior: {
          browsingPatterns: ['mobile', 'desktop', 'tablet'].slice(
            0,
            Math.floor(Math.random() * 2) + 1
          ),
          purchaseHistory: [`category-${Math.floor(Math.random() * 5)}`],
          interactionFrequency: ['low', 'medium', 'high'][
            Math.floor(Math.random() * 3)
          ] as any,
        },
        segments: ['premium', 'budget', 'frequent', 'new'].slice(
          0,
          Math.floor(Math.random() * 2) + 1
        ),
      };

      profile.content = profile.generateProfileSummary();
      profile.createdAt = new Date().toISOString();
      profile.updatedAt = new Date().toISOString();

      profiles.push(profile);
    }

    return profiles;
  }
}

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
  providers: [
    EcommerceProductRepository,
    KnowledgeDocumentRepository,
    UserProfileRepository,
    EcommerceRecommendationService,
    AICustomerSupportService,
    ContentAnalyticsService,
    RealWorldUseCasesDemoService,
  ],
  exports: [
    EcommerceProductRepository,
    KnowledgeDocumentRepository,
    UserProfileRepository,
    EcommerceRecommendationService,
    AICustomerSupportService,
    ContentAnalyticsService,
    RealWorldUseCasesDemoService,
  ],
})
export class RealWorldUseCasesExampleModule {}
