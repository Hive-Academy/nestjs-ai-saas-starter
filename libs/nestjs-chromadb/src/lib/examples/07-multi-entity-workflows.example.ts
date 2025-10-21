/**
 * @fileoverview Multi-Entity Workflows Example
 *
 * Demonstrates:
 * - Multiple entities working together in business workflows
 * - Cross-repository operations and data consistency
 * - User → Document → Comment relationship patterns
 * - Aggregating data from multiple collections
 * - Real-world RAG (Retrieval-Augmented Generation) workflows
 * - Transaction-like operations across entities
 * - Complex business process automation
 *
 * Key Concepts:
 * - Entity relationship modeling in vector databases
 * - Cross-collection data flows
 * - Business process orchestration
 * - Data consistency across multiple entities
 * - RAG implementation patterns
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBRepository,
  BaseDocument,
  ChromaDBModule,
  ChromaDBService,
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  UpdatedAt,
} from '../../index';

// ============================================================================
// 1. MULTI-ENTITY SYSTEM DESIGN
// ============================================================================

@ChromaEntity({
  collection: 'users',
  description: 'User profiles and preferences',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
})
export class UserEntity
  implements
    BaseDocument<{
      name: string;
      email: string;
      role: 'admin' | 'editor' | 'viewer';
      preferences: {
        interests: string[];
        expertise: string[];
        contentTypes: string[];
      };
      activity: {
        documentsCreated: number;
        commentsPosted: number;
        lastActive: string;
      };
    }>
{
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  metadata!: {
    name: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    preferences: {
      interests: string[];
      expertise: string[];
      contentTypes: string[];
    };
    activity: {
      documentsCreated: number;
      commentsPosted: number;
      lastActive: string;
    };
  };

  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}

@ChromaEntity({
  collection: 'documents',
  description: 'Knowledge base documents',
  autoEmbed: true,
  embeddingFields: ['content', 'title', 'summary'],
  autoTimestamp: true,
})
export class DocumentEntity
  implements
    BaseDocument<{
      title: string;
      summary: string;
      authorId: string;
      authorName: string;
      category: string;
      tags: string[];
      status: 'draft' | 'published' | 'archived';
      version: number;
      metadata: {
        wordCount: number;
        readingTime: number;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        lastReviewDate?: string;
        reviewerId?: string;
      };
      engagement: {
        views: number;
        likes: number;
        shares: number;
        avgRating: number;
        commentCount: number;
      };
    }>
{
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  @ChromaProp()
  title!: string;

  @ChromaProp()
  summary!: string;

  metadata!: {
    title: string;
    summary: string;
    authorId: string;
    authorName: string;
    category: string;
    tags: string[];
    status: 'draft' | 'published' | 'archived';
    version: number;
    metadata: {
      wordCount: number;
      readingTime: number;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      lastReviewDate?: string;
      reviewerId?: string;
    };
    engagement: {
      views: number;
      likes: number;
      shares: number;
      avgRating: number;
      commentCount: number;
    };
  };

  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}

@ChromaEntity({
  collection: 'comments',
  description: 'User comments on documents',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
})
export class CommentEntity
  implements
    BaseDocument<{
      documentId: string;
      documentTitle: string;
      authorId: string;
      authorName: string;
      parentCommentId?: string;
      threadLevel: number;
      status: 'active' | 'hidden' | 'deleted';
      sentiment: 'positive' | 'neutral' | 'negative';
      engagement: {
        likes: number;
        replies: number;
        flags: number;
      };
    }>
{
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  metadata!: {
    documentId: string;
    documentTitle: string;
    authorId: string;
    authorName: string;
    parentCommentId?: string;
    threadLevel: number;
    status: 'active' | 'hidden' | 'deleted';
    sentiment: 'positive' | 'neutral' | 'negative';
    engagement: {
      likes: number;
      replies: number;
      flags: number;
    };
  };

  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}

@ChromaEntity({
  collection: 'knowledge_chunks',
  description: 'Processed knowledge chunks for RAG',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
})
export class KnowledgeChunkEntity
  implements
    BaseDocument<{
      documentId: string;
      documentTitle: string;
      chunkIndex: number;
      chunkType: 'paragraph' | 'section' | 'code' | 'table' | 'list';
      metadata: {
        wordCount: number;
        hasCode: boolean;
        hasImages: boolean;
        complexity: number;
        topics: string[];
      };
      relationships: {
        previousChunkId?: string;
        nextChunkId?: string;
        relatedChunkIds: string[];
      };
    }>
{
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;

  metadata!: {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    chunkType: 'paragraph' | 'section' | 'code' | 'table' | 'list';
    metadata: {
      wordCount: number;
      hasCode: boolean;
      hasImages: boolean;
      complexity: number;
      topics: string[];
    };
    relationships: {
      previousChunkId?: string;
      nextChunkId?: string;
      relatedChunkIds: string[];
    };
  };

  embedding?: readonly number[];

  @CreatedAt()
  createdAt?: string;

  @UpdatedAt()
  updatedAt?: string;

  version?: number;
}

// ============================================================================
// 2. REPOSITORY IMPLEMENTATIONS
// ============================================================================

@Injectable()
export class UserRepository extends ChromaDBRepository<UserEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(UserEntity, 'users', chromaDB);
  }

  async findByRole(role: string): Promise<UserEntity[]> {
    return this.findAll({ where: { role } });
  }

  async findByInterests(interests: string[]): Promise<UserEntity[]> {
    return this.findAll({
      where: {
        'preferences.interests': { $in: interests },
      },
    });
  }

  async updateActivity(
    userId: string,
    activityUpdate: Partial<UserEntity['metadata']['activity']>
  ): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    return this.update(userId, {
      metadata: {
        ...user.metadata,
        activity: {
          ...user.metadata.activity,
          ...activityUpdate,
          lastActive: new Date().toISOString(),
        },
      },
    });
  }
}

@Injectable()
export class DocumentRepository extends ChromaDBRepository<DocumentEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(DocumentEntity, 'documents', chromaDB);
  }

  async findByAuthor(authorId: string): Promise<DocumentEntity[]> {
    return this.findAll({ where: { authorId } });
  }

  async findPublished(): Promise<DocumentEntity[]> {
    return this.findAll({ where: { status: 'published' } });
  }

  async updateEngagement(
    documentId: string,
    engagementUpdate: Partial<DocumentEntity['metadata']['engagement']>
  ): Promise<DocumentEntity | null> {
    const doc = await this.findById(documentId);
    if (!doc) return null;

    return this.update(documentId, {
      metadata: {
        ...doc.metadata,
        engagement: {
          ...doc.metadata.engagement,
          ...engagementUpdate,
        },
      },
    });
  }
}

@Injectable()
export class CommentRepository extends ChromaDBRepository<CommentEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(CommentEntity, 'comments', chromaDB);
  }

  async findByDocument(documentId: string): Promise<CommentEntity[]> {
    return this.findAll({
      where: { documentId },
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    });
  }

  async findByAuthor(authorId: string): Promise<CommentEntity[]> {
    return this.findAll({ where: { authorId } });
  }

  async findReplies(parentCommentId: string): Promise<CommentEntity[]> {
    return this.findAll({ where: { parentCommentId } });
  }
}

@Injectable()
export class KnowledgeChunkRepository extends ChromaDBRepository<KnowledgeChunkEntity> {
  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(KnowledgeChunkEntity, 'knowledge_chunks', chromaDB);
  }

  async findByDocument(documentId: string): Promise<KnowledgeChunkEntity[]> {
    return this.findAll({
      where: { documentId },
      orderBy: [{ field: 'chunkIndex', direction: 'asc' }],
    });
  }

  async findByTopics(topics: string[]): Promise<KnowledgeChunkEntity[]> {
    return this.findAll({
      where: {
        'metadata.topics': { $in: topics },
      },
    });
  }

  async searchRelevantChunks(
    query: string,
    limit = 10
  ): Promise<KnowledgeChunkEntity[]> {
    return this.search(query, { limit });
  }
}

// ============================================================================
// 3. MULTI-ENTITY WORKFLOW SERVICE
// ============================================================================

/**
 * Orchestrates complex workflows across multiple entities
 */
@Injectable()
export class MultiEntityWorkflowService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly documentRepo: DocumentRepository,
    private readonly commentRepo: CommentRepository,
    private readonly knowledgeChunkRepo: KnowledgeChunkRepository
  ) {}

  // ============================================================================
  // CONTENT CREATION WORKFLOW
  // ============================================================================

  /**
   * Complete document creation workflow with chunking and user activity tracking
   */
  async createDocumentWorkflow(
    authorId: string,
    documentData: {
      title: string;
      content: string;
      summary: string;
      category: string;
      tags: string[];
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<{
    document: DocumentEntity;
    chunks: KnowledgeChunkEntity[];
    authorUpdated: boolean;
  }> {
    // 1. Validate author exists
    const author = await this.userRepo.findById(authorId);
    if (!author) {
      throw new Error(`Author with ID ${authorId} not found`);
    }

    // 2. Create document
    const document = await this.documentRepo.create({
      content: documentData.content,
      metadata: {
        title: documentData.title,
        summary: documentData.summary,
        authorId: authorId,
        authorName: author.metadata.name,
        category: documentData.category,
        tags: documentData.tags,
        status: 'draft',
        version: 1,
        metadata: {
          wordCount: documentData.content.split(' ').length,
          readingTime: Math.ceil(documentData.content.split(' ').length / 200),
          difficulty: documentData.difficulty,
        },
        engagement: {
          views: 0,
          likes: 0,
          shares: 0,
          avgRating: 0,
          commentCount: 0,
        },
      },
    });

    // 3. Process content into chunks
    const chunks = await this.processDocumentIntoChunks(document);

    // 4. Update author activity
    const authorUpdated = await this.userRepo.updateActivity(authorId, {
      documentsCreated: author.metadata.activity.documentsCreated + 1,
    });

    return {
      document,
      chunks,
      authorUpdated: !!authorUpdated,
    };
  }

  /**
   * Document publishing workflow with validation and notifications
   */
  async publishDocumentWorkflow(
    documentId: string,
    reviewerId?: string
  ): Promise<{
    document: DocumentEntity;
    notificationsSent: string[];
  }> {
    // 1. Get document and validate
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    if (document.metadata.status !== 'draft') {
      throw new Error(
        `Document must be in draft status to publish. Current: ${document.metadata.status}`
      );
    }

    // 2. Validate content requirements
    this.validateDocumentForPublication(document);

    // 3. Update document status
    const updateData: any = {
      metadata: {
        ...document.metadata,
        status: 'published',
      },
    };

    if (reviewerId) {
      updateData.metadata.metadata.reviewerId = reviewerId;
      updateData.metadata.metadata.lastReviewDate = new Date().toISOString();
    }

    const publishedDoc = await this.documentRepo.update(documentId, updateData);
    if (!publishedDoc) {
      throw new Error('Failed to publish document');
    }

    // 4. Send notifications (simulated)
    const notificationsSent = await this.sendPublicationNotifications(
      publishedDoc
    );

    return {
      document: publishedDoc,
      notificationsSent,
    };
  }

  // ============================================================================
  // COMMENT AND ENGAGEMENT WORKFLOW
  // ============================================================================

  /**
   * Comment creation workflow with threading and notifications
   */
  async createCommentWorkflow(
    authorId: string,
    documentId: string,
    content: string,
    parentCommentId?: string
  ): Promise<{
    comment: CommentEntity;
    documentUpdated: boolean;
    authorUpdated: boolean;
    parentUpdated: boolean;
  }> {
    // 1. Validate author and document
    const [author, document] = await Promise.all([
      this.userRepo.findById(authorId),
      this.documentRepo.findById(documentId),
    ]);

    if (!author) throw new Error(`Author with ID ${authorId} not found`);
    if (!document) throw new Error(`Document with ID ${documentId} not found`);

    // 2. Handle parent comment if specified
    let parentComment: CommentEntity | null = null;
    let threadLevel = 0;

    if (parentCommentId) {
      parentComment = await this.commentRepo.findById(parentCommentId);
      if (!parentComment) {
        throw new Error(`Parent comment with ID ${parentCommentId} not found`);
      }
      threadLevel = parentComment.metadata.threadLevel + 1;
    }

    // 3. Analyze sentiment (simplified)
    const sentiment = this.analyzeSentiment(content);

    // 4. Create comment
    const comment = await this.commentRepo.create({
      content,
      metadata: {
        documentId,
        documentTitle: document.metadata.title,
        authorId,
        authorName: author.metadata.name,
        parentCommentId,
        threadLevel,
        status: 'active',
        sentiment,
        engagement: {
          likes: 0,
          replies: 0,
          flags: 0,
        },
      },
    });

    // 5. Update document comment count
    const documentUpdated = await this.documentRepo.updateEngagement(
      documentId,
      {
        commentCount: document.metadata.engagement.commentCount + 1,
      }
    );

    // 6. Update author activity
    const authorUpdated = await this.userRepo.updateActivity(authorId, {
      commentsPosted: author.metadata.activity.commentsPosted + 1,
    });

    // 7. Update parent comment reply count
    let parentUpdated = false;
    if (parentComment) {
      const parentUpdateResult = await this.commentRepo.update(
        parentCommentId!,
        {
          metadata: {
            ...parentComment.metadata,
            engagement: {
              ...parentComment.metadata.engagement,
              replies: parentComment.metadata.engagement.replies + 1,
            },
          },
        }
      );
      parentUpdated = !!parentUpdateResult;
    }

    return {
      comment,
      documentUpdated: !!documentUpdated,
      authorUpdated: !!authorUpdated,
      parentUpdated,
    };
  }

  // ============================================================================
  // RAG (RETRIEVAL-AUGMENTED GENERATION) WORKFLOW
  // ============================================================================

  /**
   * RAG context retrieval workflow for AI applications
   */
  async retrieveRAGContext(
    query: string,
    options: {
      maxChunks?: number;
      userContext?: {
        userId?: string;
        interests?: string[];
        expertise?: string[];
      };
      documentFilters?: {
        categories?: string[];
        difficulty?: string[];
        minRating?: number;
      };
    } = {}
  ): Promise<{
    relevantChunks: Array<{
      chunk: KnowledgeChunkEntity;
      score: number;
      context: {
        documentTitle: string;
        chunkIndex: number;
        previousContent?: string;
        nextContent?: string;
      };
    }>;
    userContext?: {
      preferredTopics: string[];
      expertiseLevel: string[];
      recentInteractions: string[];
    };
    metadata: {
      totalChunks: number;
      averageScore: number;
      topCategories: string[];
      complexityRange: string[];
    };
  }> {
    const maxChunks = options.maxChunks || 10;

    // 1. Get user context if provided
    let userContext;
    if (options.userContext?.userId) {
      const user = await this.userRepo.findById(options.userContext.userId);
      if (user) {
        userContext = {
          preferredTopics: user.metadata.preferences.interests,
          expertiseLevel: user.metadata.preferences.expertise,
          recentInteractions: [], // Would come from activity tracking
        };
      }
    }

    // 2. Perform semantic search on knowledge chunks
    const searchResults = await this.knowledgeChunkRepo.searchWithScores(
      query,
      {
        limit: maxChunks * 2, // Get more to filter
      }
    );

    // 3. Filter by document criteria if specified
    let filteredResults = searchResults;
    if (options.documentFilters) {
      // Get unique document IDs from chunks
      const documentIds = [
        ...new Set(searchResults.map((r) => r.document.metadata.documentId)),
      ];

      // Get documents to apply filters
      const documents = await this.documentRepo.findByIds(documentIds);
      const filteredDocIds = documents
        .filter((doc) =>
          this.matchesDocumentFilters(doc, options.documentFilters!)
        )
        .map((doc) => doc.id);

      filteredResults = searchResults.filter((r) =>
        filteredDocIds.includes(r.document.metadata.documentId)
      );
    }

    // 4. Enhance chunks with context
    const enhancedChunks = await Promise.all(
      filteredResults.slice(0, maxChunks).map(async (result) => {
        const chunk = result.document;
        const context = await this.getChunkContext(chunk);

        return {
          chunk,
          score: result.score,
          context,
        };
      })
    );

    // 5. Calculate metadata
    const scores = enhancedChunks.map((r) => r.score);
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Get categories from associated documents
    const documentIds = [
      ...new Set(enhancedChunks.map((r) => r.chunk.metadata.documentId)),
    ];
    const associatedDocs = await this.documentRepo.findByIds(documentIds);
    const categories = associatedDocs.map((doc) => doc.metadata.category);
    const topCategories = [...new Set(categories)];

    const complexityLevels = associatedDocs.map(
      (doc) => doc.metadata.metadata.difficulty
    );
    const complexityRange = [...new Set(complexityLevels)];

    return {
      relevantChunks: enhancedChunks,
      userContext,
      metadata: {
        totalChunks: enhancedChunks.length,
        averageScore,
        topCategories,
        complexityRange,
      },
    };
  }

  // ============================================================================
  // USER PERSONALIZATION WORKFLOW
  // ============================================================================

  /**
   * Generate personalized content recommendations
   */
  async generatePersonalizedRecommendations(
    userId: string,
    options: {
      maxRecommendations?: number;
      includeReadContent?: boolean;
      diversityFactor?: number;
    } = {}
  ): Promise<{
    recommendations: Array<{
      document: DocumentEntity;
      score: number;
      reason: string;
    }>;
    userProfile: {
      interests: string[];
      readingHistory: string[];
      preferredDifficulty: string;
      activeTopics: string[];
    };
  }> {
    const maxRecs = options.maxRecommendations || 10;

    // 1. Get user profile and activity
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 2. Get user's reading history (comments as proxy)
    const userComments = await this.commentRepo.findByAuthor(userId);
    const readDocumentIds = [
      ...new Set(userComments.map((c) => c.metadata.documentId)),
    ];
    const readDocuments = await this.documentRepo.findByIds(readDocumentIds);

    // 3. Build user profile
    const userProfile = {
      interests: user.metadata.preferences.interests,
      readingHistory: readDocumentIds,
      preferredDifficulty: this.inferPreferredDifficulty(readDocuments),
      activeTopics: this.extractActiveTopics(readDocuments, userComments),
    };

    // 4. Find similar users for collaborative filtering
    const similarUsers = await this.findSimilarUsers(
      userId,
      user.metadata.preferences.interests
    );

    // 5. Generate recommendations
    const recommendations = await this.generateRecommendations(
      user,
      userProfile,
      similarUsers,
      options
    );

    return {
      recommendations: recommendations.slice(0, maxRecs),
      userProfile,
    };
  }

  // ============================================================================
  // ANALYTICS AND REPORTING WORKFLOW
  // ============================================================================

  /**
   * Generate comprehensive content analytics across all entities
   */
  async generateContentAnalytics(
    timeframe: { start: string; end: string },
    filters?: {
      authorIds?: string[];
      categories?: string[];
      documentIds?: string[];
    }
  ): Promise<{
    overview: {
      totalDocuments: number;
      totalComments: number;
      totalUsers: number;
      totalChunks: number;
    };
    engagement: {
      averageViewsPerDocument: number;
      averageCommentsPerDocument: number;
      mostEngagedUsers: Array<{ user: UserEntity; engagementScore: number }>;
      topDocuments: Array<{ document: DocumentEntity; score: number }>;
    };
    content: {
      categoryDistribution: Record<string, number>;
      difficultyDistribution: Record<string, number>;
      tagPopularity: Record<string, number>;
      averageDocumentLength: number;
    };
    trends: {
      publishingTrend: Array<{ date: string; count: number }>;
      commentTrend: Array<{ date: string; count: number }>;
      engagementTrend: Array<{ date: string; avgScore: number }>;
    };
  }> {
    // Build filters
    const docWhere: any = {
      createdAt: { $gte: timeframe.start, $lte: timeframe.end },
    };

    if (filters?.authorIds) docWhere.authorId = { $in: filters.authorIds };
    if (filters?.categories) docWhere.category = { $in: filters.categories };

    // Get all relevant data
    const [documents, comments, users, chunks] = await Promise.all([
      this.documentRepo.findAll({ where: docWhere }),
      this.commentRepo.findAll({
        where: {
          createdAt: { $gte: timeframe.start, $lte: timeframe.end },
        },
      }),
      this.userRepo.findAll(),
      this.knowledgeChunkRepo.findAll(),
    ]);

    // Filter data if needed
    const filteredDocuments = filters?.documentIds
      ? documents.filter((d) => filters.documentIds!.includes(d.id))
      : documents;

    // Calculate analytics
    const overview = {
      totalDocuments: filteredDocuments.length,
      totalComments: comments.length,
      totalUsers: users.length,
      totalChunks: chunks.length,
    };

    const engagement = this.calculateEngagementMetrics(
      filteredDocuments,
      comments,
      users
    );
    const content = this.calculateContentMetrics(filteredDocuments);
    const trends = this.calculateTrends(filteredDocuments, comments, timeframe);

    return {
      overview,
      engagement,
      content,
      trends,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async processDocumentIntoChunks(
    document: DocumentEntity
  ): Promise<KnowledgeChunkEntity[]> {
    // Simple chunking by paragraphs (in production, use more sophisticated chunking)
    const paragraphs = document.content
      .split('\n\n')
      .filter((p) => p.trim().length > 0);
    const chunks: KnowledgeChunkEntity[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const chunk = await this.knowledgeChunkRepo.create({
        content: paragraphs[i],
        metadata: {
          documentId: document.id,
          documentTitle: document.metadata.title,
          chunkIndex: i,
          chunkType: this.detectChunkType(paragraphs[i]),
          metadata: {
            wordCount: paragraphs[i].split(' ').length,
            hasCode:
              paragraphs[i].includes('```') || paragraphs[i].includes('`'),
            hasImages: paragraphs[i].includes('!['),
            complexity: this.calculateComplexity(paragraphs[i]),
            topics: this.extractTopics(paragraphs[i]),
          },
          relationships: {
            previousChunkId: i > 0 ? chunks[i - 1]?.id : undefined,
            nextChunkId: undefined, // Will be set for previous chunk
            relatedChunkIds: [],
          },
        },
      });

      // Update previous chunk's next pointer
      if (i > 0 && chunks[i - 1]) {
        await this.knowledgeChunkRepo.update(chunks[i - 1].id, {
          metadata: {
            ...chunks[i - 1].metadata,
            relationships: {
              ...chunks[i - 1].metadata.relationships,
              nextChunkId: chunk.id,
            },
          },
        });
      }

      chunks.push(chunk);
    }

    return chunks;
  }

  private validateDocumentForPublication(document: DocumentEntity): void {
    if (
      !document.metadata.title ||
      document.metadata.title.trim().length === 0
    ) {
      throw new Error('Document title is required for publication');
    }

    if (!document.content || document.content.trim().length < 100) {
      throw new Error(
        'Document content must be at least 100 characters for publication'
      );
    }

    if (
      !document.metadata.summary ||
      document.metadata.summary.trim().length === 0
    ) {
      throw new Error('Document summary is required for publication');
    }

    if (
      !document.metadata.category ||
      document.metadata.category.trim().length === 0
    ) {
      throw new Error('Document category is required for publication');
    }
  }

  private async sendPublicationNotifications(
    document: DocumentEntity
  ): Promise<string[]> {
    // Simulate sending notifications to interested users
    const interestedUsers = await this.userRepo.findByInterests(
      document.metadata.tags
    );
    const notifications: string[] = [];

    for (const user of interestedUsers) {
      if (user.id !== document.metadata.authorId) {
        notifications.push(
          `Notified ${user.metadata.name} about new document: ${document.metadata.title}`
        );
      }
    }

    return notifications;
  }

  private analyzeSentiment(
    content: string
  ): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'helpful',
      'useful',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'useless',
      'wrong',
      'confusing',
    ];

    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter((w) => positiveWords.includes(w)).length;
    const negativeCount = words.filter((w) => negativeWords.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private async getChunkContext(chunk: KnowledgeChunkEntity): Promise<{
    documentTitle: string;
    chunkIndex: number;
    previousContent?: string;
    nextContent?: string;
  }> {
    const context: any = {
      documentTitle: chunk.metadata.documentTitle,
      chunkIndex: chunk.metadata.chunkIndex,
    };

    // Get previous and next chunks for context
    if (chunk.metadata.relationships.previousChunkId) {
      try {
        const prevChunk = await this.knowledgeChunkRepo.findById(
          chunk.metadata.relationships.previousChunkId
        );
        if (prevChunk) {
          context.previousContent = prevChunk.content.substring(0, 200) + '...';
        }
      } catch (error) {
        console.error(
          'Error fetching previous chunk:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    if (chunk.metadata.relationships.nextChunkId) {
      try {
        const nextChunk = await this.knowledgeChunkRepo.findById(
          chunk.metadata.relationships.nextChunkId
        );
        if (nextChunk) {
          context.nextContent = nextChunk.content.substring(0, 200) + '...';
        }
      } catch (error) {
        console.error(
          'Error fetching next chunk:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return context;
  }

  private matchesDocumentFilters(
    document: DocumentEntity,
    filters: any
  ): boolean {
    if (
      filters.categories &&
      !filters.categories.includes(document.metadata.category)
    ) {
      return false;
    }

    if (
      filters.difficulty &&
      !filters.difficulty.includes(document.metadata.metadata.difficulty)
    ) {
      return false;
    }

    if (
      filters.minRating &&
      document.metadata.engagement.avgRating < filters.minRating
    ) {
      return false;
    }

    return true;
  }

  private detectChunkType(
    content: string
  ): 'paragraph' | 'section' | 'code' | 'table' | 'list' {
    if (content.includes('```')) return 'code';
    if (content.includes('|') && content.includes('-')) return 'table';
    if (content.match(/^\s*[-*+]\s/m)) return 'list';
    if (content.startsWith('#')) return 'section';
    return 'paragraph';
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on various factors
    const words = content.split(/\s+/);
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgSentenceLength = words.length / sentenceCount;

    return Math.min(10, Math.round((avgWordLength + avgSentenceLength) / 4));
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction (in production, use NLP libraries)
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word));

    const wordFreq = new Map<string, number>();
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private inferPreferredDifficulty(documents: DocumentEntity[]): string {
    if (documents.length === 0) return 'beginner';

    const difficulties = documents.map((d) => d.metadata.metadata.difficulty);
    const counts = {
      beginner: difficulties.filter((d) => d === 'beginner').length,
      intermediate: difficulties.filter((d) => d === 'intermediate').length,
      advanced: difficulties.filter((d) => d === 'advanced').length,
    };

    type Difficulty = 'beginner' | 'intermediate' | 'advanced';
    return Object.entries(counts).reduce((a, b) =>
      counts[a[0] as Difficulty] > counts[b[0] as Difficulty] ? a : b
    )[0];
  }

  private extractActiveTopics(
    documents: DocumentEntity[],
    comments: CommentEntity[]
  ): string[] {
    const allTags = documents.flatMap((d) => d.metadata.tags);
    const recentDocTags = documents
      .filter(
        (d) =>
          new Date(d.createdAt!) >
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .flatMap((d) => d.metadata.tags);

    return [...new Set([...allTags, ...recentDocTags])].slice(0, 10);
  }

  private async findSimilarUsers(
    userId: string,
    interests: string[]
  ): Promise<UserEntity[]> {
    return this.userRepo.findByInterests(interests);
  }

  private async generateRecommendations(
    user: UserEntity,
    profile: any,
    similarUsers: UserEntity[],
    options: any
  ): Promise<
    Array<{ document: DocumentEntity; score: number; reason: string }>
  > {
    // Get documents by user interests
    const documents = await this.documentRepo.findAll({
      where: { status: 'published' },
    });

    const recommendations = documents
      .filter((doc) =>
        !options.includeReadContent
          ? !profile.readingHistory.includes(doc.id)
          : true
      )
      .map((doc) => ({
        document: doc,
        score: this.calculateRecommendationScore(doc, user, profile),
        reason: this.getRecommendationReason(doc, user, profile),
      }))
      .sort((a, b) => b.score - a.score);

    return recommendations;
  }

  private calculateRecommendationScore(
    document: DocumentEntity,
    user: UserEntity,
    profile: any
  ): number {
    let score = 0;

    // Interest match
    const matchingTags = document.metadata.tags.filter((tag) =>
      user.metadata.preferences.interests.includes(tag)
    ).length;
    score += matchingTags * 2;

    // Engagement score
    score += document.metadata.engagement.avgRating;

    // Recency boost
    const daysSincePublished =
      (Date.now() - new Date(document.createdAt!).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSincePublished < 7) score += 1;

    return score;
  }

  private getRecommendationReason(
    document: DocumentEntity,
    user: UserEntity,
    profile: any
  ): string {
    const matchingInterests = document.metadata.tags.filter((tag) =>
      user.metadata.preferences.interests.includes(tag)
    );

    if (matchingInterests.length > 0) {
      return `Matches your interests: ${matchingInterests.join(', ')}`;
    }

    if (document.metadata.engagement.avgRating > 4) {
      return 'Highly rated by community';
    }

    return 'Popular in your preferred category';
  }

  private calculateEngagementMetrics(
    documents: DocumentEntity[],
    comments: CommentEntity[],
    users: UserEntity[]
  ): any {
    const avgViews =
      documents.length > 0
        ? documents.reduce((sum, d) => sum + d.metadata.engagement.views, 0) /
          documents.length
        : 0;

    const avgComments =
      documents.length > 0
        ? documents.reduce(
            (sum, d) => sum + d.metadata.engagement.commentCount,
            0
          ) / documents.length
        : 0;

    // Calculate user engagement scores
    const userEngagement = users
      .map((user) => ({
        user,
        engagementScore:
          user.metadata.activity.documentsCreated * 2 +
          user.metadata.activity.commentsPosted,
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore);

    // Top documents by engagement
    const topDocuments = documents
      .map((doc) => ({
        document: doc,
        score:
          doc.metadata.engagement.views * 0.1 +
          doc.metadata.engagement.likes * 2 +
          doc.metadata.engagement.commentCount * 3,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      averageViewsPerDocument: avgViews,
      averageCommentsPerDocument: avgComments,
      mostEngagedUsers: userEngagement.slice(0, 10),
      topDocuments: topDocuments.slice(0, 10),
    };
  }

  private calculateContentMetrics(documents: DocumentEntity[]): any {
    const categories = documents.map((d) => d.metadata.category);
    const difficulties = documents.map((d) => d.metadata.metadata.difficulty);
    const allTags = documents.flatMap((d) => d.metadata.tags);
    const avgLength =
      documents.length > 0
        ? documents.reduce((sum, d) => sum + d.metadata.metadata.wordCount, 0) /
          documents.length
        : 0;

    const categoryDist = this.countOccurrences(categories);
    const difficultyDist = this.countOccurrences(difficulties);
    const tagPopularity = this.countOccurrences(allTags);

    return {
      categoryDistribution: categoryDist,
      difficultyDistribution: difficultyDist,
      tagPopularity: tagPopularity,
      averageDocumentLength: avgLength,
    };
  }

  private calculateTrends(
    documents: DocumentEntity[],
    comments: CommentEntity[],
    timeframe: any
  ): any {
    // Simplified trend calculation
    const docsByDate = this.groupByDate(documents, 'createdAt');
    const commentsByDate = this.groupByDate(comments, 'createdAt');

    const publishingTrend = Object.entries(docsByDate).map(([date, docs]) => ({
      date,
      count: docs.length,
    }));

    const commentTrend = Object.entries(commentsByDate).map(
      ([date, comments]) => ({
        date,
        count: comments.length,
      })
    );

    const engagementTrend = Object.entries(docsByDate).map(([date, docs]) => ({
      date,
      avgScore:
        docs.length > 0
          ? docs.reduce((sum, d) => sum + d.metadata.engagement.avgRating, 0) /
            docs.length
          : 0,
    }));

    return {
      publishingTrend,
      commentTrend,
      engagementTrend,
    };
  }

  private countOccurrences<T>(items: T[]): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = String(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByDate<T extends { createdAt?: string }>(
    items: T[],
    dateField: keyof T
  ): Record<string, T[]> {
    return items.reduce((acc, item) => {
      const date = item[dateField] as string;
      if (date) {
        const dateKey = date.split('T')[0]; // Get just the date part
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
      }
      return acc;
    }, {} as Record<string, T[]>);
  }
}

// ============================================================================
// 4. DEMONSTRATION SERVICE
// ============================================================================

@Injectable()
export class MultiEntityWorkflowDemoService implements OnModuleInit {
  constructor(private readonly workflowService: MultiEntityWorkflowService) {}

  async onModuleInit() {
    console.log('\n🎯 Multi-Entity Workflows Demo\n');
    await this.demonstrateContentCreationWorkflow();
    await this.demonstrateCommentWorkflow();
    await this.demonstrateRAGWorkflow();
    await this.demonstratePersonalizationWorkflow();
    console.log('✅ Multi-entity workflow demo completed\n');
  }

  private async demonstrateContentCreationWorkflow(): Promise<void> {
    console.log('📝 Content Creation Workflow Demo:');

    try {
      // Create a user first
      const userRepo = this.workflowService['userRepo'];
      const user = await userRepo.create({
        content: 'Dr. Jane Smith - AI researcher and technical writer',
        metadata: {
          name: 'Dr. Jane Smith',
          email: 'jane.smith@example.com',
          role: 'editor',
          preferences: {
            interests: ['ai', 'machine-learning', 'vector-databases'],
            expertise: ['artificial-intelligence', 'data-science'],
            contentTypes: ['technical', 'research'],
          },
          activity: {
            documentsCreated: 0,
            commentsPosted: 0,
            lastActive: new Date().toISOString(),
          },
        },
      });

      console.log(`  👤 Created user: ${user.metadata.name}`);

      // Create document with workflow
      const result = await this.workflowService.createDocumentWorkflow(
        user.id,
        {
          title: 'Introduction to Vector Embeddings',
          content:
            'Vector embeddings are dense numerical representations of data that capture semantic meaning in high-dimensional space.\n\nThese representations enable machines to understand and process complex relationships between different pieces of information.\n\nVector databases store and index these embeddings for efficient similarity search operations.',
          summary:
            'Learn the fundamentals of vector embeddings and their role in modern AI applications',
          category: 'AI/ML',
          tags: ['vectors', 'embeddings', 'ai', 'machine-learning'],
          difficulty: 'beginner',
        }
      );

      console.log(`  📄 Created document: "${result.document.metadata.title}"`);
      console.log(`  📦 Generated ${result.chunks.length} knowledge chunks`);
      console.log(`  👤 Author activity updated: ${result.authorUpdated}`);

      // Publish the document
      const publishResult = await this.workflowService.publishDocumentWorkflow(
        result.document.id
      );
      console.log(
        `  📢 Published document: "${publishResult.document.metadata.title}"`
      );
      console.log(
        `  📨 Notifications sent: ${publishResult.notificationsSent.length}`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in content creation workflow:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  private async demonstrateCommentWorkflow(): Promise<void> {
    console.log('💬 Comment Workflow Demo:');

    try {
      // Get existing user and document
      const userRepo = this.workflowService['userRepo'];
      const documentRepo = this.workflowService['documentRepo'];

      const users = await userRepo.findAll({ limit: 1 });
      const documents = await documentRepo.findPublished();

      if (users.length > 0 && documents.length > 0) {
        const user = users[0];
        const document = documents[0];

        // Create a comment
        const commentResult = await this.workflowService.createCommentWorkflow(
          user.id,
          document.id,
          'Great explanation of vector embeddings! This really helped me understand the concepts better.'
        );

        console.log(
          `  💬 Created comment by ${commentResult.comment.metadata.authorName}`
        );
        console.log(`  📄 Document updated: ${commentResult.documentUpdated}`);
        console.log(
          `  👤 Author activity updated: ${commentResult.authorUpdated}`
        );
        console.log(
          `  🧵 Sentiment: ${commentResult.comment.metadata.sentiment}`
        );

        // Create a reply
        const replyResult = await this.workflowService.createCommentWorkflow(
          user.id,
          document.id,
          'Thanks for the feedback! I plan to write more on this topic.',
          commentResult.comment.id
        );

        console.log(
          `  💬 Created reply at level ${replyResult.comment.metadata.threadLevel}`
        );
        console.log(
          `  🔗 Parent comment updated: ${replyResult.parentUpdated}`
        );
      } else {
        console.log('  ⚠️  No users or documents available for comment demo');
      }
    } catch (error) {
      console.error(
        '  ❌ Error in comment workflow:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  private async demonstrateRAGWorkflow(): Promise<void> {
    console.log('🧠 RAG Workflow Demo:');

    try {
      const query = 'How do vector embeddings work in machine learning?';

      const ragResult = await this.workflowService.retrieveRAGContext(query, {
        maxChunks: 5,
        documentFilters: {
          categories: ['AI/ML'],
          difficulty: ['beginner', 'intermediate'],
        },
      });

      console.log(`  🔍 Query: "${query}"`);
      console.log(
        `  📊 Retrieved ${ragResult.relevantChunks.length} relevant chunks`
      );
      console.log(
        `  📈 Average relevance score: ${ragResult.metadata.averageScore.toFixed(
          3
        )}`
      );
      console.log(
        `  📂 Categories: ${ragResult.metadata.topCategories.join(', ')}`
      );
      console.log(
        `  📚 Complexity levels: ${ragResult.metadata.complexityRange.join(
          ', '
        )}`
      );

      console.log('  🎯 Top relevant chunks:');
      ragResult.relevantChunks.slice(0, 3).forEach((chunk, index) => {
        console.log(`    ${index + 1}. Score: ${chunk.score.toFixed(3)}`);
        console.log(`       Document: "${chunk.context.documentTitle}"`);
        console.log(
          `       Chunk ${
            chunk.context.chunkIndex
          }: ${chunk.chunk.content.substring(0, 100)}...`
        );
      });
    } catch (error) {
      console.error(
        '  ❌ Error in RAG workflow:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  private async demonstratePersonalizationWorkflow(): Promise<void> {
    console.log('🎯 Personalization Workflow Demo:');

    try {
      const userRepo = this.workflowService['userRepo'];
      const users = await userRepo.findAll({ limit: 1 });

      if (users.length > 0) {
        const user = users[0];

        const recommendations =
          await this.workflowService.generatePersonalizedRecommendations(
            user.id,
            {
              maxRecommendations: 5,
              includeReadContent: false,
            }
          );

        console.log(
          `  👤 Generating recommendations for: ${user.metadata.name}`
        );
        console.log(
          `  🎨 User interests: ${recommendations.userProfile.interests.join(
            ', '
          )}`
        );
        console.log(
          `  📖 Reading history: ${recommendations.userProfile.readingHistory.length} documents`
        );
        console.log(
          `  📊 Preferred difficulty: ${recommendations.userProfile.preferredDifficulty}`
        );

        console.log('  💡 Top recommendations:');
        recommendations.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`    ${index + 1}. "${rec.document.metadata.title}"`);
          console.log(
            `       Score: ${rec.score.toFixed(2)} | Reason: ${rec.reason}`
          );
          console.log(`       Category: ${rec.document.metadata.category}`);
        });
      } else {
        console.log('  ⚠️  No users available for personalization demo');
      }
    } catch (error) {
      console.error(
        '  ❌ Error in personalization workflow:',
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
  providers: [
    UserRepository,
    DocumentRepository,
    CommentRepository,
    KnowledgeChunkRepository,
    MultiEntityWorkflowService,
    MultiEntityWorkflowDemoService,
  ],
  exports: [
    UserRepository,
    DocumentRepository,
    CommentRepository,
    KnowledgeChunkRepository,
    MultiEntityWorkflowService,
  ],
})
export class MultiEntityWorkflowsExampleModule {}

/**
 * Multi-Entity Workflow Best Practices:
 *
 * 1. **Entity Relationships**: Model relationships explicitly in metadata
 * 2. **Data Consistency**: Maintain consistency across entity updates
 * 3. **Workflow Orchestration**: Use service layer for complex workflows
 * 4. **Error Handling**: Implement rollback strategies for failed workflows
 * 5. **Performance**: Optimize cross-collection queries and data fetching
 * 6. **Scalability**: Design workflows to handle large datasets efficiently
 * 7. **Monitoring**: Track workflow performance and success rates
 * 8. **Testing**: Test complete workflows, not just individual operations
 */
