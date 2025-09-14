import { Injectable } from '@nestjs/common';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import type {
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  SimilarTicket,
} from '../types';

/**
 * Knowledge Base Service
 * Manages the customer support knowledge base using ChromaDB for semantic search
 * and Neo4j for relationship tracking and analytics
 */
@Injectable()
export class KnowledgeBaseService {
  private readonly KNOWLEDGE_COLLECTION = 'support_knowledge_base';
  private readonly TICKETS_COLLECTION = 'support_tickets';

  constructor(
    private readonly chromaService: ChromaDBService,
    private readonly neo4jService: Neo4jService
  ) {}

  /**
   * Initialize the knowledge base collections
   */
  async initializeCollections(): Promise<void> {
    try {
      // Ensure knowledge base collection exists
      await this.chromaService.createCollection(this.KNOWLEDGE_COLLECTION, {
        description: 'Customer support knowledge base for semantic search',
        version: '1.0',
      });

      // Ensure tickets collection exists
      await this.chromaService.createCollection(this.TICKETS_COLLECTION, {
        description: 'Historical support tickets for similarity matching',
        version: '1.0',
      });

      console.log('Knowledge base collections initialized successfully');
    } catch (error) {
      console.error('Error initializing knowledge base collections:', error);
    }
  }

  /**
   * Search the knowledge base for relevant articles
   */
  async searchKnowledgeBase(
    query: KnowledgeSearchQuery
  ): Promise<KnowledgeSearchResult[]> {
    try {
      const queryResult = await this.chromaService.similaritySearch(
        this.KNOWLEDGE_COLLECTION,
        query.query,
        {
          limit: query.maxResults || 5,
          filter: this.buildSearchFilter(query),
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      const results: KnowledgeSearchResult[] = [];

      if (
        queryResult.ids &&
        queryResult.documents &&
        queryResult.metadatas &&
        Array.isArray(queryResult.ids)
      ) {
        for (let i = 0; i < queryResult.ids.length; i++) {
          const id = queryResult.ids[i];
          const metadata = Array.isArray(queryResult.metadatas)
            ? queryResult.metadatas[i]
            : null;
          const document = Array.isArray(queryResult.documents)
            ? queryResult.documents[i]
            : '';
          const distance = Array.isArray(queryResult.distances)
            ? queryResult.distances[i]
            : null;

          const knowledgeResult: KnowledgeSearchResult = {
            id: String(id),
            title: (metadata?.title as string) || 'Unknown Article',
            content: document || '',
            category: (metadata?.category as string) || 'general',
            similarity: distance !== null ? 1 - distance : 0,
            lastUpdated: metadata?.lastUpdated
              ? new Date(metadata.lastUpdated as string)
              : new Date(),
            useCount: (metadata?.useCount as number) || 0,
            effectiveness: (metadata?.effectiveness as number) || 0.5,
          };

          results.push(knowledgeResult);

          // Track knowledge article usage
          await this.trackKnowledgeUsage(String(id), query);
        }
      }

      return results.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Find similar historical tickets
   */
  async findSimilarTickets(
    description: string,
    category?: string,
    customerTier?: string,
    limit = 5
  ): Promise<SimilarTicket[]> {
    try {
      const filter: any = {};
      if (category) filter.category = category;
      if (customerTier) filter.customerTier = customerTier;

      const queryResult = await this.chromaService.similaritySearch(
        this.TICKETS_COLLECTION,
        description,
        {
          limit,
          filter,
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true,
        }
      );

      const results: SimilarTicket[] = [];
      if (
        queryResult.ids &&
        queryResult.documents &&
        queryResult.metadatas &&
        Array.isArray(queryResult.ids)
      ) {
        for (let i = 0; i < queryResult.ids.length; i++) {
          const id = queryResult.ids[i];
          const metadata = Array.isArray(queryResult.metadatas)
            ? queryResult.metadatas[i]
            : null;
          const document = Array.isArray(queryResult.documents)
            ? queryResult.documents[i]
            : '';
          const distance = Array.isArray(queryResult.distances)
            ? queryResult.distances[i]
            : null;
          // Note: embeddings not available in similaritySearch result

          results.push({
            id: String(id),
            title: (metadata?.title as string) || 'Historical Ticket',
            description: document || '',
            resolution: (metadata?.resolution as string) || '',
            similarity: distance !== null ? 1 - distance : 0,
            resolutionTime: (metadata?.resolutionTime as number) || 0,
            satisfactionScore: (metadata?.satisfactionScore as number) || 0,
            category: (metadata?.category as string) || category || 'general',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error finding similar tickets:', error);
      return [];
    }
  }

  /**
   * Add a new article to the knowledge base
   */
  async addKnowledgeArticle(article: {
    id: string;
    title: string;
    content: string;
    category: string;
    tags?: string[];
    author?: string;
  }): Promise<void> {
    try {
      // Add to ChromaDB for semantic search
      await this.chromaService.addDocuments(this.KNOWLEDGE_COLLECTION, [
        {
          id: article.id,
          document: `${article.title}\n\n${article.content}`,
          metadata: {
            title: article.title,
            category: article.category,
            tags: JSON.stringify(article.tags || []), // ChromaDB metadata must be string, number, boolean, or null
            author: article.author || 'unknown',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            useCount: 0,
            effectiveness: 0.5,
          },
        },
      ]);

      // Add to Neo4j for relationship tracking
      await this.neo4jService.run(
        `
        CREATE (a:Article {
          id: $id,
          title: $title,
          category: $category,
          author: $author,
          createdAt: datetime(),
          lastUpdated: datetime(),
          useCount: 0,
          effectiveness: 0.5
        })
        
        MERGE (cat:Category {name: $category})
        CREATE (a)-[:BELONGS_TO]->(cat)
        
        WITH a
        UNWIND $tags as tag
        MERGE (t:Tag {name: tag})
        CREATE (a)-[:TAGGED_WITH]->(t)
      `,
        {
          id: article.id,
          title: article.title,
          category: article.category,
          author: article.author || 'System',
          tags: article.tags || [],
        }
      );

      console.log(`Knowledge article ${article.id} added successfully`);
    } catch (error) {
      console.error('Error adding knowledge article:', error);
      throw error;
    }
  }

  /**
   * Add a resolved ticket to the knowledge base for future similarity matching
   */
  async addResolvedTicket(ticket: {
    id: string;
    title: string;
    description: string;
    resolution: string;
    category: string;
    customerTier: string;
    resolutionTime: number;
    satisfactionScore: number;
  }): Promise<void> {
    try {
      // Add to ChromaDB for similarity search
      await this.chromaService.addDocuments(
        this.TICKETS_COLLECTION,
        [`${ticket.title}\n\n${ticket.description}`],
        {
          ids: [ticket.id],
          metadatas: [
            {
              title: ticket.title,
              resolution: ticket.resolution,
              category: ticket.category,
              customerTier: ticket.customerTier,
              resolutionTime: ticket.resolutionTime,
              satisfactionScore: ticket.satisfactionScore,
              resolvedAt: new Date().toISOString(),
            },
          ],
        }
      );

      // Update Neo4j with resolution information
      await this.neo4jService.run(
        `
        MATCH (t:Ticket {id: $id})
        SET t.resolved = true,
            t.resolution = $resolution,
            t.resolvedAt = datetime(),
            t.resolutionTime = $resolutionTime,
            t.satisfactionScore = $satisfactionScore
            
        WITH t
        MERGE (cat:Category {name: $category})
        MERGE (t)-[:RESOLVED_IN_CATEGORY]->(cat)
      `,
        {
          id: ticket.id,
          resolution: ticket.resolution,
          category: ticket.category,
          resolutionTime: ticket.resolutionTime,
          satisfactionScore: ticket.satisfactionScore,
        }
      );

      console.log(`Resolved ticket ${ticket.id} added to knowledge base`);
    } catch (error) {
      console.error('Error adding resolved ticket:', error);
      throw error;
    }
  }

  /**
   * Get knowledge base analytics
   */
  async getKnowledgeBaseAnalytics(): Promise<{
    totalArticles: number;
    totalTickets: number;
    topCategories: Array<{
      category: string;
      count: number;
      effectiveness: number;
    }>;
    mostUsedArticles: Array<{
      id: string;
      title: string;
      useCount: number;
      effectiveness: number;
    }>;
    resolutionPatterns: Array<{
      pattern: string;
      frequency: number;
      avgSatisfaction: number;
    }>;
  }> {
    try {
      // Get analytics from Neo4j
      const results = await this.neo4jService.run(`
        // Total counts
        MATCH (a:Article) WITH count(a) as totalArticles
        MATCH (t:Ticket {resolved: true}) WITH totalArticles, count(t) as totalTickets
        
        // Top categories by effectiveness
        MATCH (a:Article)-[:BELONGS_TO]->(cat:Category)
        WITH totalArticles, totalTickets, cat.name as category, 
             count(a) as articleCount, avg(a.effectiveness) as avgEffectiveness
        ORDER BY avgEffectiveness DESC, articleCount DESC
        WITH totalArticles, totalTickets, 
             collect({category: category, count: articleCount, effectiveness: avgEffectiveness})[0..5] as topCategories
        
        // Most used articles
        MATCH (a:Article)
        WHERE a.useCount > 0
        WITH totalArticles, totalTickets, topCategories,
             a.id as articleId, a.title as articleTitle, a.useCount as useCount, a.effectiveness as effectiveness
        ORDER BY useCount DESC, effectiveness DESC
        WITH totalArticles, totalTickets, topCategories,
             collect({id: articleId, title: articleTitle, useCount: useCount, effectiveness: effectiveness})[0..5] as mostUsed
        
        // Resolution patterns (simplified)
        MATCH (t:Ticket {resolved: true})-[:RESOLVED_IN_CATEGORY]->(cat:Category)
        WITH totalArticles, totalTickets, topCategories, mostUsed,
             cat.name as pattern, count(t) as frequency, avg(t.satisfactionScore) as avgSatisfaction
        ORDER BY frequency DESC
        WITH totalArticles, totalTickets, topCategories, mostUsed,
             collect({pattern: pattern, frequency: frequency, avgSatisfaction: avgSatisfaction})[0..5] as patterns
        
        RETURN {
          totalArticles: totalArticles,
          totalTickets: totalTickets,
          topCategories: topCategories,
          mostUsedArticles: mostUsed,
          resolutionPatterns: patterns
        } as analytics
      `);

      if (results && results.records.length > 0) {
        return results.records[0].get('analytics') as {
          totalArticles: number;
          totalTickets: number;
          topCategories: Array<{
            category: string;
            count: number;
            effectiveness: number;
          }>;
          mostUsedArticles: Array<{
            id: string;
            title: string;
            useCount: number;
            effectiveness: number;
          }>;
          resolutionPatterns: Array<{
            pattern: string;
            frequency: number;
            avgSatisfaction: number;
          }>;
        };
      }

      // Return default analytics if no data
      return {
        totalArticles: 0,
        totalTickets: 0,
        topCategories: [],
        mostUsedArticles: [],
        resolutionPatterns: [],
      };
    } catch (error) {
      console.error('Error getting knowledge base analytics:', error);
      return {
        totalArticles: 0,
        totalTickets: 0,
        topCategories: [],
        mostUsedArticles: [],
        resolutionPatterns: [],
      };
    }
  }

  /**
   * Update article effectiveness based on feedback
   */
  async updateArticleEffectiveness(
    articleId: string,
    wasHelpful: boolean
  ): Promise<void> {
    try {
      // Update in Neo4j
      await this.neo4jService.run(
        `
        MATCH (a:Article {id: $articleId})
        SET a.feedbackCount = COALESCE(a.feedbackCount, 0) + 1,
            a.helpfulCount = COALESCE(a.helpfulCount, 0) + CASE WHEN $wasHelpful THEN 1 ELSE 0 END,
            a.effectiveness = COALESCE(a.helpfulCount, 0) / COALESCE(a.feedbackCount, 1),
            a.lastUpdated = datetime()
      `,
        { articleId, wasHelpful }
      );

      console.log(
        `Updated effectiveness for article ${articleId}: ${
          wasHelpful ? 'helpful' : 'not helpful'
        }`
      );
    } catch (error) {
      console.error('Error updating article effectiveness:', error);
    }
  }

  /**
   * Seed the knowledge base with sample articles
   */
  async seedKnowledgeBase(): Promise<void> {
    const sampleArticles = [
      {
        id: 'kb-001',
        title: 'How to Reset Your Password',
        content:
          'To reset your password: 1. Go to the login page 2. Click "Forgot Password" 3. Enter your email 4. Check your email for reset instructions 5. Follow the link and create a new password',
        category: 'account',
        tags: ['password', 'login', 'reset', 'account'],
      },
      {
        id: 'kb-002',
        title: 'Billing and Payment Issues',
        content:
          'Common billing issues and solutions: 1. Payment declined - check with your bank 2. Incorrect charges - contact support with details 3. Refund requests - processed within 5-7 business days 4. Subscription changes - can be made in account settings',
        category: 'billing',
        tags: ['billing', 'payment', 'refund', 'subscription'],
      },
      {
        id: 'kb-003',
        title: 'API Integration Guide',
        content:
          'Getting started with our API: 1. Generate API key in dashboard 2. Review API documentation 3. Test endpoints in sandbox 4. Implement authentication 5. Handle rate limits and errors',
        category: 'technical',
        tags: ['api', 'integration', 'development', 'authentication'],
      },
      {
        id: 'kb-004',
        title: 'Performance Optimization Tips',
        content:
          'Improve your application performance: 1. Use caching where appropriate 2. Optimize database queries 3. Compress images and assets 4. Use CDN for static files 5. Monitor and analyze performance metrics',
        category: 'technical',
        tags: ['performance', 'optimization', 'caching', 'cdn'],
      },
    ];

    for (const article of sampleArticles) {
      try {
        await this.addKnowledgeArticle(article);
      } catch (error) {
        console.error(`Error seeding article ${article.id}:`, error);
      }
    }

    console.log('Knowledge base seeded with sample articles');
  }

  // Private helper methods

  private buildSearchFilter(query: KnowledgeSearchQuery): any {
    const filter: any = {};

    if (query.category) {
      filter.category = query.category;
    }

    if (query.customerTier === 'enterprise') {
      // For enterprise customers, include premium content
      filter.tier = { $in: ['basic', 'premium', 'enterprise'] };
    } else if (query.customerTier === 'premium') {
      filter.tier = { $in: ['basic', 'premium'] };
    } else {
      filter.tier = 'basic';
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private async trackKnowledgeUsage(
    articleId: string,
    query: KnowledgeSearchQuery
  ): Promise<void> {
    try {
      // Update usage count in Neo4j
      await this.neo4jService.run(
        `
        MATCH (a:Article {id: $articleId})
        SET a.useCount = COALESCE(a.useCount, 0) + 1,
            a.lastUsed = datetime()
        
        // Track the query for analytics
        CREATE (u:Usage {
          query: $query,
          timestamp: datetime(),
          category: $category
        })
        CREATE (a)-[:USED_FOR]->(u)
      `,
        {
          articleId,
          query: query.query,
          category: query.category || 'general',
        }
      );
    } catch (error) {
      console.error('Error tracking knowledge usage:', error);
    }
  }
}
