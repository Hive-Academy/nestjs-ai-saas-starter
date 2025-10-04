/**
 * @fileoverview Advanced Query Patterns Example
 *
 * Demonstrates:
 * - Complex QueryBuilder usage
 * - Graph algorithms and traversals
 * - Performance optimization techniques
 * - Batch operations
 * - Custom Cypher queries with @CypherQuery
 * - Aggregations and analytics
 */

import { Injectable } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  NotNull,
  PropIndex,
  Neo4jRepository,
  InjectNeogma,
  NeogmaService,
  Safe,
  Authorize,
  CypherQuery,
  Transactional,
  GraphRepository,
  Neo4jCrudService,
  FindOptions,
} from '../index';
import type { Neo4jPrimitive, Neo4jProperties, Neo4jRecord } from '../index';

// ============================================================================
// 1. COMPLEX ENTITY MODEL FOR KNOWLEDGE GRAPH
// ============================================================================

@Neo4jEntity('Document')
export class Document {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ type: 'TEXT', name: 'document_title_index' })
  title: string;

  @Neo4jProp()
  @PropIndex({ type: 'TEXT', name: 'document_content_fulltext' })
  content: string;

  @Neo4jProp()
  @PropIndex({ name: 'document_type_index' })
  type: 'article' | 'paper' | 'book' | 'report' | 'presentation';

  @Neo4jProp()
  @PropIndex({ name: 'document_category_index' })
  category: string;

  @Neo4jProp()
  @PropIndex({ name: 'document_status_index' })
  status: 'draft' | 'review' | 'published' | 'archived';

  @Neo4jProp()
  tags: string[];

  @Neo4jProp()
  @PropIndex({ name: 'document_author_index' })
  authorId: string;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'document_score_index' })
  relevanceScore: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'document_views_index' })
  viewCount: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'document_rating_index' })
  averageRating: number;

  @Neo4jProp()
  metadata: {
    wordCount: number;
    readingTime: number;
    language: string;
    sourceUrl?: string;
    doi?: string;
  };

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'document_published_index' })
  publishedAt?: Date;

  // Index signature for compatibility with Neo4j types
  [key: string]: Neo4jPrimitive | Neo4jProperties | undefined;
}

@Neo4jEntity('Topic')
export class Topic {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'topic_name_index' })
  name: string;

  @Neo4jProp()
  description: string;

  @Neo4jProp()
  @PropIndex({ name: 'topic_category_index' })
  category: string;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'topic_importance_index' })
  importance: number;

  @Neo4jProp()
  keywords: string[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Index signature for compatibility with Neo4j types
  [key: string]: unknown;
}

@Neo4jEntity('Author')
export class Author {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'author_name_index' })
  name: string;

  @Neo4jProp()
  @PropIndex({ name: 'author_email_index' })
  email: string;

  @Neo4jProp()
  affiliation: string;

  @Neo4jProp()
  @PropIndex({ name: 'author_expertise_index' })
  expertise: string[];

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'author_hindex_index' })
  hIndex: number;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'author_citations_index' })
  totalCitations: number;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Index signature for compatibility with Neo4j types
  [key: string]: unknown;
}

// ============================================================================
// 2. RELATIONSHIP INTERFACES
// ============================================================================

export interface CitesRelationship {
  id: string;
  type: 'CITES';
  citationType: 'direct' | 'indirect' | 'comparative' | 'critical';
  relevance: number;
  pageNumber?: number;
  excerpt?: string;
  createdAt: Date;
}

export interface CoversTopicRelationship {
  id: string;
  type: 'COVERS_TOPIC';
  relevance: number;
  depth: 'mention' | 'overview' | 'detailed' | 'comprehensive';
  sections: string[];
  createdAt: Date;
}

export interface CollaboratesWithRelationship {
  id: string;
  type: 'COLLABORATES_WITH';
  projectCount: number;
  startDate: Date;
  endDate?: Date;
  collaborationType: 'co-author' | 'reviewer' | 'advisor' | 'colleague';
  strength: number;
}

// ============================================================================
// 3. ADVANCED ANALYTICS INTERFACES
// ============================================================================

export interface DocumentAnalytics {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  documentsByCategory: Record<string, number>;
  documentsByStatus: Record<string, number>;
  averageRating: number;
  totalViews: number;
  topAuthors: Array<{
    author: Author;
    documentCount: number;
    averageRating: number;
    totalViews: number;
  }>;
  topTopics: Array<{
    topic: Topic;
    documentCount: number;
    averageRelevance: number;
  }>;
  citationNetwork: {
    totalCitations: number;
    averageCitationsPerDocument: number;
    mostCitedDocuments: Array<{
      document: Document;
      citationCount: number;
    }>;
  };
  collaborationNetwork: {
    totalCollaborations: number;
    averageCollaborationsPerAuthor: number;
    strongestCollaborations: Array<{
      author1: Author;
      author2: Author;
      strength: number;
      projectCount: number;
    }>;
  };
}

export interface GraphInsights {
  communityStructure: Array<{
    communityId: string;
    memberCount: number;
    topicFocus: string[];
    influentialAuthors: Author[];
  }>;
  centralNodes: {
    documents: Array<{ node: Document; centrality: number }>;
    authors: Array<{ node: Author; centrality: number }>;
    topics: Array<{ node: Topic; centrality: number }>;
  };
  pathAnalysis: {
    averagePathLength: number;
    diameter: number;
    clustering: number;
  };
}

// ============================================================================
// 4. REPOSITORY WITH ADVANCED PATTERNS
// ============================================================================

/**
 * DocumentRepository - demonstrates @Repository decorator with auto-generated CRUD methods
 * Auto-generated methods: findById, findAll, create, update, delete, count, exists
 */
@Repository(() => Document)
@Injectable()
export class DocumentRepository extends BaseRepositoryService<Document> {
  constructor(neogmaService: NeogmaService) {
    super(neogmaService);
  }

  /**
   * Advanced full-text search with relevance scoring
   */
  @Safe({ strict: true })
  async fullTextSearch(
    query: string,
    filters?: {
      type?: Document['type'];
      category?: string;
      status?: Document['status'];
      minRating?: number;
      publishedAfter?: Date;
    },
    limit = 20
  ): Promise<Document[]> {
    const queryBuilder = this.neogmaService.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const searchQueryParam = bindParam.add(`${query}*`); // Add wildcard for partial matches

    // Use fulltext index for content search
    queryBuilder
      .raw(
        `CALL db.index.fulltext.queryNodes('document_content_fulltext', $${searchQueryParam})`
      )
      .raw('YIELD node, score')
      .with('node as doc, score');

    // Add filters
    const whereConditions: string[] = [];

    if (filters?.type) {
      const typeParam = bindParam.add(filters.type);
      whereConditions.push(`doc.type = $${typeParam}`);
    }

    if (filters?.category) {
      const categoryParam = bindParam.add(filters.category);
      whereConditions.push(`doc.category = $${categoryParam}`);
    }

    if (filters?.status) {
      const statusParam = bindParam.add(filters.status);
      whereConditions.push(`doc.status = $${statusParam}`);
    }

    if (filters?.minRating) {
      const minRatingParam = bindParam.add(filters.minRating);
      whereConditions.push(`doc.averageRating >= $${minRatingParam}`);
    }

    if (filters?.publishedAfter) {
      const publishedAfterParam = bindParam.add(filters.publishedAfter);
      whereConditions.push(`doc.publishedAt >= $${publishedAfterParam}`);
    }

    if (whereConditions.length > 0) {
      queryBuilder.where(whereConditions.join(' AND '));
    }

    queryBuilder.return('doc, score').orderBy('score DESC').limit(limit);

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogmaService.run(cypher, params);
    return result.records.map(
      (record: Neo4jRecord) => record.get('doc').properties as Document
    );
  }

  /**
   * Find similar documents using graph traversal
   */
  @Safe({ strict: true })
  async findSimilarDocuments(
    documentId: string,
    algorithm: 'citation' | 'topic' | 'author' | 'content' = 'topic',
    limit = 10
  ): Promise<Array<{ document: Document; similarity: number }>> {
    const queryBuilder = this.neogmaService.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const documentIdParam = bindParam.add(documentId);
    const limitNum = limit;

    switch (algorithm) {
      case 'citation':
        queryBuilder
          .match('(d:Document)')
          .where(`d.id = $${documentIdParam}`)
          .match('(d)-[:CITES*1..2]-(similar:Document)')
          .where(`similar.id <> $${documentIdParam}`)
          .return('similar, count(*) as similarity')
          .orderBy('similarity DESC')
          .limit(limitNum);
        break;

      case 'topic':
        queryBuilder
          .match(
            '(d:Document)-[r1:COVERS_TOPIC]->(topic:Topic)<-[r2:COVERS_TOPIC]-(similar:Document)'
          )
          .where(
            `d.id = $${documentIdParam} AND similar.id <> $${documentIdParam}`
          )
          .return('similar, avg(r1.relevance * r2.relevance) as similarity')
          .orderBy('similarity DESC')
          .limit(limitNum);
        break;

      case 'author':
        queryBuilder
          .match(
            '(d:Document)<-[:AUTHORED]-(author:Author)-[:AUTHORED]->(similar:Document)'
          )
          .where(
            `d.id = $${documentIdParam} AND similar.id <> $${documentIdParam}`
          )
          .return('similar, count(DISTINCT author) as similarity')
          .orderBy('similarity DESC')
          .limit(limitNum);
        break;

      case 'content':
        // Use Jaccard similarity on tags
        queryBuilder
          .match('(d:Document), (similar:Document)')
          .where(
            `d.id = $${documentIdParam} AND similar.id <> $${documentIdParam}`
          )
          .with(
            `
            d, similar,
            size([tag IN d.tags WHERE tag IN similar.tags]) as intersection,
            size(d.tags + [tag IN similar.tags WHERE NOT tag IN d.tags]) as union
          `
          )
          .where('union > 0')
          .return('similar, toFloat(intersection) / union as similarity')
          .orderBy('similarity DESC')
          .limit(limitNum);
        break;
    }

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogmaService.run(cypher, params);
    return result.records.map((record: Neo4jRecord) => ({
      document: record.get('similar').properties as Document,
      similarity: record.get('similarity').toNumber(),
    }));
  }

  /**
   * Batch update operation with transaction
   */
  @Transactional()
  @Safe({ strict: true })
  async batchUpdateRelevanceScores(
    updates: Array<{ documentId: string; newScore: number }>
  ): Promise<number> {
    const queryBuilder = this.neogmaService.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const updatesParam = bindParam.add(updates);
    const nowParam = bindParam.add(new Date());

    queryBuilder
      .unwind(`$${updatesParam} as update`)
      .match('(d:Document)')
      .where('d.id = update.documentId')
      .set('d.relevanceScore = update.newScore, d.updatedAt = $' + nowParam)
      .return('count(d) as updatedCount');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogmaService.run(cypher, params);
    return result.records[0]?.get('updatedCount').toNumber() || 0;
  }
}

// ============================================================================
// 5. ADVANCED ANALYTICS SERVICE
// ============================================================================

@Injectable()
export class KnowledgeGraphAnalyticsService {
  constructor(
    private readonly graphRepo: GraphRepository<Document>,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {
    // No model registration needed - @Repository decorator handles it
  }

  /**
   * Comprehensive document analytics with complex aggregations
   */
  @Safe({ strict: true })
  @Authorize({ roles: ['admin', 'analyst'] })
  @CypherQuery({
    cache: '5m', // 5 minutes cache
    retry: 2,
    mode: 'READ',
  })
  async getDocumentAnalytics(): Promise<DocumentAnalytics> {
    // Basic document statistics
    const basicStatsBuilder = this.neogmaService.createQueryBuilder();
    const basicBindParam = basicStatsBuilder.getBindParam();

    basicStatsBuilder.match('(d:Document)').return(`
        count(d) as totalDocuments,
        avg(d.averageRating) as averageRating,
        sum(d.viewCount) as totalViews
      `);

    const basicStatsCypher = basicStatsBuilder.getStatement();
    const basicStatsParams = basicBindParam.get();
    const basicStats = await this.neogmaService.run(
      basicStatsCypher,
      basicStatsParams
    );
    const basicRecord = basicStats.records[0];

    // Documents by type/category/status
    const distributionBuilder = this.neogmaService.createQueryBuilder();
    const distributionBindParam = distributionBuilder.getBindParam();

    distributionBuilder.match('(d:Document)').return(`
        collect(DISTINCT {type: d.type, count: count(*)}) as byType,
        collect(DISTINCT {category: d.category, count: count(*)}) as byCategory,
        collect(DISTINCT {status: d.status, count: count(*)}) as byStatus
      `);

    const distributionCypher = distributionBuilder.getStatement();
    const distributionParams = distributionBindParam.get();
    const distributionResult = await this.neogmaService.run(
      distributionCypher,
      distributionParams
    );

    // Top authors with comprehensive stats
    const topAuthorsBuilder = this.neogmaService.createQueryBuilder();
    const topAuthorsBindParam = topAuthorsBuilder.getBindParam();

    topAuthorsBuilder
      .match('(a:Author)-[:AUTHORED]->(d:Document)')
      .return(
        `
        a,
        count(d) as documentCount,
        avg(d.averageRating) as averageRating,
        sum(d.viewCount) as totalViews
      `
      )
      .orderBy('documentCount DESC')
      .limit(10);

    const topAuthorsCypher = topAuthorsBuilder.getStatement();
    const topAuthorsParams = topAuthorsBindParam.get();
    const topAuthorsResult = await this.neogmaService.run(
      topAuthorsCypher,
      topAuthorsParams
    );

    // Citation network analysis
    const citationBuilder = this.neogmaService.createQueryBuilder();
    const citationBindParam = citationBuilder.getBindParam();

    citationBuilder.match('(d1:Document)-[c:CITES]->(d2:Document)').return(`
        count(c) as totalCitations,
        avg(count(c)) as averageCitationsPerDocument
      `);

    const citationCypher = citationBuilder.getStatement();
    const citationParams = citationBindParam.get();
    const citationResult = await this.neogmaService.run(
      citationCypher,
      citationParams
    );

    // Most cited documents
    const mostCitedBuilder = this.neogmaService.createQueryBuilder();
    const mostCitedBindParam = mostCitedBuilder.getBindParam();

    mostCitedBuilder
      .match('(d:Document)<-[c:CITES]-()')
      .return('d, count(c) as citationCount')
      .orderBy('citationCount DESC')
      .limit(10);

    const mostCitedCypher = mostCitedBuilder.getStatement();
    const mostCitedParams = mostCitedBindParam.get();
    const mostCitedResult = await this.neogmaService.run(
      mostCitedCypher,
      mostCitedParams
    );

    // Compile results
    return {
      totalDocuments: basicRecord.get('totalDocuments').toNumber(),
      documentsByType: this.parseDistribution(
        distributionResult.records[0].get('byType')
      ),
      documentsByCategory: this.parseDistribution(
        distributionResult.records[0].get('byCategory')
      ),
      documentsByStatus: this.parseDistribution(
        distributionResult.records[0].get('byStatus')
      ),
      averageRating: basicRecord.get('averageRating').toNumber(),
      totalViews: basicRecord.get('totalViews').toNumber(),
      topAuthors: topAuthorsResult.records.map((record) => ({
        author: record.get('a').properties as Author,
        documentCount: record.get('documentCount').toNumber(),
        averageRating: record.get('averageRating').toNumber(),
        totalViews: record.get('totalViews').toNumber(),
      })),
      topTopics: [], // Would need similar query for topics
      citationNetwork: {
        totalCitations:
          citationResult.records[0]?.get('totalCitations').toNumber() || 0,
        averageCitationsPerDocument:
          citationResult.records[0]
            ?.get('averageCitationsPerDocument')
            .toNumber() || 0,
        mostCitedDocuments: mostCitedResult.records.map((record) => ({
          document: record.get('d').properties as Document,
          citationCount: record.get('citationCount').toNumber(),
        })),
      },
      collaborationNetwork: {
        totalCollaborations: 0,
        averageCollaborationsPerAuthor: 0,
        strongestCollaborations: [],
      },
    };
  }

  /**
   * Advanced graph insights using centrality algorithms
   */
  @Safe({ strict: true })
  @Authorize({ roles: ['admin', 'analyst'] })
  async getGraphInsights(): Promise<GraphInsights> {
    // Get central nodes using different centrality measures
    const centralDocuments = await this.graphRepo.findCentralNodes(
      'betweenness'
    );
    const centralAuthors = await this.graphRepo.findCentralNodes('degree');

    // Detect communities
    const communities = await this.graphRepo.detectCommunities({
      algorithm: 'louvain',
    });

    // Calculate graph statistics
    const graphStats = await this.graphRepo.getGraphStatistics();

    return {
      communityStructure: communities.map((community: any) => ({
        communityId: community.id,
        memberCount: community.members.length,
        topicFocus: community.topTopics || [],
        influentialAuthors: community.influentialMembers || [],
      })),
      centralNodes: {
        documents: centralDocuments.map((node: any) => ({
          node: node as Document,
          centrality: node.centrality || 0,
        })),
        authors: centralAuthors.map((node: any) => ({
          node: node as Author,
          centrality: node.centrality || 0,
        })),
        topics: [],
      },
      pathAnalysis: {
        averagePathLength: graphStats.averageDegree || 0,
        diameter: graphStats.diameter || 0,
        clustering: graphStats.clusteringCoefficient || 0,
      },
    };
  }

  /**
   * Advanced recommendation engine using collaborative filtering
   */
  @Safe({ strict: true })
  async getDocumentRecommendations(
    userId: string,
    preferences: {
      topics?: string[];
      authors?: string[];
      types?: Document['type'][];
      minRating?: number;
    } = {},
    limit = 10
  ): Promise<Array<{ document: Document; score: number; reason: string }>> {
    const queryBuilder = this.neogmaService.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Add parameters
    const userIdParam = bindParam.add(userId);
    const publishedStatusParam = bindParam.add('published');
    const limitNum = limit;

    // Build base query
    queryBuilder
      .match('(user:User)')
      .where(`user.id = $${userIdParam}`)
      .raw('OPTIONAL MATCH (user)-[:READ]->(readDoc:Document)')
      .raw('OPTIONAL MATCH (readDoc)-[:COVERS_TOPIC]->(topic:Topic)')
      .raw('OPTIONAL MATCH (readDoc)<-[:AUTHORED]-(author:Author)')
      .match('(recommendation:Document)')
      .where(`recommendation.status = $${publishedStatusParam}`);

    const scoreComponents: string[] = [];

    // Topic similarity scoring
    if (preferences.topics?.length) {
      const preferredTopicsParam = bindParam.add(preferences.topics);
      queryBuilder.raw(
        'OPTIONAL MATCH (recommendation)-[topicRel:COVERS_TOPIC]->(prefTopic:Topic)'
      );
      queryBuilder.where(`prefTopic.name IN $${preferredTopicsParam}`);
      scoreComponents.push('sum(topicRel.relevance) * 2');
    }

    // Author preference scoring
    if (preferences.authors?.length) {
      const preferredAuthorsParam = bindParam.add(preferences.authors);
      queryBuilder.raw(
        'OPTIONAL MATCH (recommendation)<-[:AUTHORED]-(prefAuthor:Author)'
      );
      queryBuilder.where(`prefAuthor.name IN $${preferredAuthorsParam}`);
      scoreComponents.push('count(DISTINCT prefAuthor) * 3');
    }

    // Type preference
    if (preferences.types?.length) {
      const preferredTypesParam = bindParam.add(preferences.types);
      queryBuilder.where(`recommendation.type IN $${preferredTypesParam}`);
    }

    // Rating filter
    if (preferences.minRating) {
      const minRatingParam = bindParam.add(preferences.minRating);
      queryBuilder.where(`recommendation.averageRating >= $${minRatingParam}`);
    }

    // Exclude already read documents
    queryBuilder.where('NOT (user)-[:READ]->(recommendation)');

    // Calculate composite score
    const scoreFormula =
      scoreComponents.length > 0
        ? scoreComponents.join(' + ') +
          ' + recommendation.averageRating + log(recommendation.viewCount + 1)'
        : 'recommendation.averageRating + log(recommendation.viewCount + 1)';

    queryBuilder
      .return(
        `
        recommendation,
        ${scoreFormula} as score,
        'Based on your reading history and preferences' as reason
      `
      )
      .orderBy('score DESC')
      .limit(limitNum);

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogmaService.run(cypher, params);

    return result.records.map((record: Neo4jRecord) => ({
      document: record.get('recommendation').properties as Document,
      score: record.get('score').toNumber(),
      reason: record.get('reason'),
    }));
  }

  /**
   * Real-time citation impact analysis
   */
  @Safe({ strict: true })
  async analyzeCitationImpact(documentId: string): Promise<{
    directCitations: number;
    indirectCitations: number;
    impactScore: number;
    citationGrowthRate: number;
    influentialCiters: Array<{ document: Document; influence: number }>;
  }> {
    // Direct citations
    const directBuilder = this.neogmaService.createQueryBuilder();
    const directBindParam = directBuilder.getBindParam();
    const docIdParam1 = directBindParam.add(documentId);

    directBuilder
      .match('(d:Document)<-[:CITES]-(citing:Document)')
      .where(`d.id = $${docIdParam1}`)
      .return('count(citing) as directCitations');

    const directCypher = directBuilder.getStatement();
    const directParams = directBindParam.get();

    // Indirect citations (2-hop)
    const indirectBuilder = this.neogmaService.createQueryBuilder();
    const indirectBindParam = indirectBuilder.getBindParam();
    const docIdParam2 = indirectBindParam.add(documentId);

    indirectBuilder
      .match(
        '(d:Document)<-[:CITES]-(intermediate:Document)<-[:CITES]-(citing:Document)'
      )
      .where(`d.id = $${docIdParam2}`)
      .return('count(DISTINCT citing) as indirectCitations');

    const indirectCypher = indirectBuilder.getStatement();
    const indirectParams = indirectBindParam.get();

    // Citation growth analysis
    const recentDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const growthBuilder = this.neogmaService.createQueryBuilder();
    const growthBindParam = growthBuilder.getBindParam();
    const docIdParam3 = growthBindParam.add(documentId);
    const recentDateParam = growthBindParam.add(recentDate);

    growthBuilder
      .match('(d:Document)<-[c:CITES]-(citing:Document)')
      .where(`d.id = $${docIdParam3}`).return(`
        count(CASE WHEN citing.publishedAt >= $${recentDateParam} THEN 1 END) as recentCitations,
        count(CASE WHEN citing.publishedAt < $${recentDateParam} THEN 1 END) as olderCitations
      `);

    const growthCypher = growthBuilder.getStatement();
    const growthParams = growthBindParam.get();

    const [directResult, indirectResult, growthResult] = await Promise.all([
      this.neogmaService.run(directCypher, directParams),
      this.neogmaService.run(indirectCypher, indirectParams),
      this.neogmaService.run(growthCypher, growthParams),
    ]);

    const directCitations =
      directResult.records[0]?.get('directCitations').toNumber() || 0;
    const indirectCitations =
      indirectResult.records[0]?.get('indirectCitations').toNumber() || 0;
    const recentCitations =
      growthResult.records[0]?.get('recentCitations').toNumber() || 0;
    const olderCitations =
      growthResult.records[0]?.get('olderCitations').toNumber() || 0;

    // Calculate impact score (weighted combination)
    const impactScore = directCitations * 1.0 + indirectCitations * 0.5;

    // Calculate growth rate
    const citationGrowthRate =
      olderCitations > 0 ? recentCitations / olderCitations : recentCitations;

    return {
      directCitations,
      indirectCitations,
      impactScore,
      citationGrowthRate,
      influentialCiters: [], // Would need additional query for influential citers
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private parseDistribution(data: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    data.forEach((item) => {
      const key = item.type || item.category || item.status;
      if (key) result[key] = item.count;
    });
    return result;
  }
}

// ============================================================================
// 6. USAGE EXAMPLE
// ============================================================================

export class AdvancedQueryPatternsExample {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly analyticsService: KnowledgeGraphAnalyticsService
  ) {}

  async demonstrateUsage(): Promise<void> {
    // Create sample documents using auto-generated create method
    const document1 = await this.documentRepo.create({
      title: 'Advanced Graph Algorithms',
      content:
        'This paper discusses advanced graph algorithms for large-scale networks...',
      type: 'paper',
      category: 'Computer Science',
      status: 'published',
      tags: ['algorithms', 'graphs', 'networks'],
      authorId: 'author-1',
      relevanceScore: 0.95,
      viewCount: 1250,
      averageRating: 4.7,
      metadata: {
        wordCount: 8500,
        readingTime: 25,
        language: 'en',
        doi: '10.1000/xyz123',
      },
      publishedAt: new Date('2024-01-15'),
    });

    // Advanced full-text search with filters
    const searchResults = await this.documentRepo.fullTextSearch(
      'graph algorithms machine learning',
      {
        type: 'paper',
        category: 'Computer Science',
        status: 'published',
        minRating: 4.0,
        publishedAfter: new Date('2023-01-01'),
      },
      10
    );
    console.log('Search results:', searchResults);

    // Find similar documents using different algorithms
    const topicSimilar = await this.documentRepo.findSimilarDocuments(
      document1.id,
      'topic',
      5
    );
    console.log('Topic-similar documents:', topicSimilar);

    const citationSimilar = await this.documentRepo.findSimilarDocuments(
      document1.id,
      'citation',
      5
    );
    console.log('Citation-similar documents:', citationSimilar);

    // Batch update relevance scores
    const updateCount = await this.documentRepo.batchUpdateRelevanceScores([
      { documentId: document1.id, newScore: 0.98 },
      // ... more updates
    ]);
    console.log(`Updated ${updateCount} documents`);

    // Get comprehensive analytics
    const analytics = await this.analyticsService.getDocumentAnalytics();
    console.log('Document analytics:', analytics);

    // Get graph insights
    const insights = await this.analyticsService.getGraphInsights();
    console.log('Graph insights:', insights);

    // Get personalized recommendations
    const recommendations =
      await this.analyticsService.getDocumentRecommendations(
        'user-123',
        {
          topics: ['machine learning', 'algorithms'],
          types: ['paper', 'article'],
          minRating: 4.0,
        },
        10
      );
    console.log('Recommendations:', recommendations);

    // Analyze citation impact
    const citationImpact = await this.analyticsService.analyzeCitationImpact(
      document1.id
    );
    console.log('Citation impact:', citationImpact);
  }
}
