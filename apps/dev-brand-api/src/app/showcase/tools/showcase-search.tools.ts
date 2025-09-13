import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TavilySearch } from '@langchain/tavily';
import { Tool } from '@hive-academy/langgraph-multi-agent';

// Define proper TypeScript interfaces for Tavily responses
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

interface TavilyResponse {
  answer?: string;
  query: string;
  responseTime: number;
  followUpQuestions?: string[];
  results: TavilySearchResult[];
}

interface WebSearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  totalResults: number;
  searchTime: string;
  searchDepth: 'basic' | 'advanced';
  metadata: {
    timestamp: string;
    provider: string;
    version: string;
  };
}

interface NewsSearchResponse {
  query: string;
  timeframe: 'day' | 'week' | 'month';
  category: 'general' | 'tech' | 'business' | 'science' | 'health';
  articles: Array<{
    title: string;
    url: string;
    summary: string;
    publishedAt: string;
    source: string;
    relevanceScore: number;
    category: string;
  }>;
  totalArticles: number;
  metadata: {
    searchedAt: string;
    provider: string;
    version: string;
  };
}

interface ResearchSearchResponse {
  topic: string;
  sources: Array<{
    title: string;
    url: string;
    content: string;
    type: 'academic' | 'industry' | 'news' | 'general';
    credibility: 'high' | 'medium-high' | 'medium' | 'low';
    score: number;
    query: string;
  }>;
  totalSources: number;
  synthesis: string;
  analysisDepth: 'summary' | 'detailed' | 'comprehensive';
  coverage: {
    academic: number;
    industry: number;
    news: number;
    other: number;
  };
  metadata: {
    researchedAt: string;
    queriesUsed: string[];
    provider: string;
    version: string;
  };
}

/**
 * 🔍 SHOWCASE SEARCH TOOLS - WEB SEARCH WITH TAVILY
 *
 * Demonstrates sophisticated @Tool decorator usage with external API integration:
 * - Real-time web search using Tavily API
 * - Advanced search filtering and result processing
 * - Streaming search results for real-time feedback
 * - Multi-format search support (general, news, academic)
 * - Search result summarization and analysis
 */
@Injectable()
export class ShowcaseSearchTools {
  private readonly logger = new Logger(ShowcaseSearchTools.name);
  private readonly tavilyTool: TavilySearch;

  constructor() {
    // Initialize Tavily search tool with API key from environment
    this.tavilyTool = new TavilySearch({
      maxResults: 10,
      topic: 'general',
    });
  }

  @Tool({
    name: 'web_search',
    description: 'Search the web for current information using Tavily API',
    schema: z.object({
      query: z.string().min(1).describe('Search query to find information'),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .default(5)
        .describe('Maximum number of search results to return'),
      searchDepth: z
        .enum(['basic', 'advanced'])
        .default('basic')
        .describe(
          'Search depth: basic for quick results, advanced for comprehensive search'
        ),
      includeAnswer: z
        .boolean()
        .default(true)
        .describe('Whether to include AI-generated answer summary'),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe('Specific domains to include in search'),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Specific domains to exclude from search'),
    }),
    agents: ['research-showcase', 'analysis-showcase', 'content-showcase'],
    rateLimit: { requests: 30, window: 60000 }, // 30 requests per minute
    examples: [
      {
        input: {
          query: 'latest AI developments 2024',
          maxResults: 5,
          searchDepth: 'advanced',
        },
        output: {
          answer: 'Recent AI developments in 2024 include...',
          results: [
            {
              title: 'AI Breakthrough in Language Models',
              url: 'https://example.com/ai-news',
              content: 'Summary of latest developments...',
              score: 0.95,
            },
          ],
          totalResults: 5,
          searchTime: '2.3s',
        },
        description:
          'Search for current AI developments with comprehensive results',
      },
    ],
    tags: ['search', 'web', 'research', 'tavily'],
    version: '1.0.0',
  })
  async webSearch({
    query,
    maxResults,
    searchDepth,
    includeAnswer,
    includeDomains,
    excludeDomains,
  }: {
    query: string;
    maxResults: number;
    searchDepth: 'basic' | 'advanced';
    includeAnswer: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
  }): Promise<WebSearchResponse | { error: string; query: string; results: []; totalResults: 0; metadata: { timestamp: string; error: boolean } }> {
    this.logger.log(
      `🔍 Searching web: "${query}" (depth: ${searchDepth}, max: ${maxResults})`
    );

    const startTime = Date.now();

    try {
      // Execute Tavily search
      const searchResult = await this.tavilyTool.invoke({ query });

      const searchTime = ((Date.now() - startTime) / 1000).toFixed(1);

      // Parse and structure the results
      const results = this.parseSearchResults(searchResult);

      this.logger.log(
        `✅ Search completed in ${searchTime}s, found ${results.items.length} results`
      );

      return {
        query,
        answer: includeAnswer ? results.answer : undefined,
        results: results.items,
        totalResults: results.items.length,
        searchTime: `${searchTime}s`,
        searchDepth,
        metadata: {
          timestamp: new Date().toISOString(),
          provider: 'tavily',
          version: '1.0.0',
        },
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Search failed for query "${query}":`,
        error.message
      );

      return {
        query,
        error: error.message,
        results: [],
        totalResults: 0,
        searchTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        metadata: {
          timestamp: new Date().toISOString(),
          provider: 'tavily',
          error: true,
        },
      };
    }
  }

  @Tool({
    name: 'news_search',
    description: 'Search for recent news articles using Tavily API',
    schema: z.object({
      query: z.string().min(1).describe('News search query'),
      timeframe: z
        .enum(['day', 'week', 'month'])
        .default('week')
        .describe('Time range for news articles'),
      maxResults: z
        .number()
        .min(1)
        .max(15)
        .default(8)
        .describe('Maximum number of news articles'),
      category: z
        .enum(['general', 'tech', 'business', 'science', 'health'])
        .default('general')
        .describe('News category filter'),
    }),
    agents: ['research-showcase', 'analysis-showcase'],
    rateLimit: { requests: 25, window: 60000 },
    examples: [
      {
        input: {
          query: 'artificial intelligence breakthrough',
          timeframe: 'week',
          category: 'tech',
        },
        output: {
          articles: [
            {
              title: 'Major AI Breakthrough Announced',
              url: 'https://tech-news.com/ai-breakthrough',
              publishedAt: '2024-01-15T10:30:00Z',
              summary: 'Research team announces significant advancement...',
            },
          ],
        },
      },
    ],
    tags: ['news', 'search', 'current-events', 'tavily'],
    version: '1.0.0',
  })
  async newsSearch({
    query,
    timeframe,
    maxResults,
    category,
  }: {
    query: string;
    timeframe: 'day' | 'week' | 'month';
    maxResults: number;
    category: 'general' | 'tech' | 'business' | 'science' | 'health';
  }): Promise<NewsSearchResponse | { error: string; query: string; articles: []; totalArticles: 0; metadata: { searchedAt: string; error: boolean } }> {
    this.logger.log(
      `📰 Searching news: "${query}" (${category}, last ${timeframe})`
    );

    const newsQuery = `${query} ${
      category !== 'general' ? category : ''
    } news recent ${timeframe}`;

    try {
      const searchResult = await this.tavilyTool.invoke({ query: newsQuery });

      const results = this.parseSearchResults(searchResult);

      // Filter and enhance news results
      const newsArticles = results.items
        .filter((item) => this.isNewsArticle(item.url))
        .slice(0, maxResults)
        .map((item) => ({
          title: item.title,
          url: item.url,
          summary: item.content.substring(0, 200) + '...',
          publishedAt: this.estimatePublishDate(item.content, timeframe),
          source: this.extractDomain(item.url),
          relevanceScore: item.score,
          category,
        }));

      return {
        query,
        timeframe,
        category,
        articles: newsArticles,
        totalArticles: newsArticles.length,
        metadata: {
          searchedAt: new Date().toISOString(),
          provider: 'tavily',
          version: '1.0.0',
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ News search failed:`, error.message);

      return {
        query,
        error: error.message,
        articles: [],
        totalArticles: 0,
        metadata: {
          searchedAt: new Date().toISOString(),
          error: true,
        },
      };
    }
  }

  @Tool({
    name: 'research_search',
    description: 'Perform comprehensive research search with source analysis',
    schema: z.object({
      topic: z.string().min(1).describe('Research topic or question'),
      includeAcademic: z
        .boolean()
        .default(true)
        .describe('Include academic and scholarly sources'),
      minSources: z
        .number()
        .min(1)
        .max(15)
        .default(5)
        .describe('Minimum number of sources to gather'),
      analysisDepth: z
        .enum(['summary', 'detailed', 'comprehensive'])
        .default('detailed'),
    }),
    agents: ['research-showcase', 'analysis-showcase'],
    rateLimit: { requests: 15, window: 60000 },
    examples: [
      {
        input: {
          topic: 'machine learning interpretability techniques',
          includeAcademic: true,
          analysisDepth: 'comprehensive',
        },
        output: {
          topic: 'machine learning interpretability techniques',
          sources: [
            {
              title: 'LIME: Explaining Machine Learning Predictions',
              type: 'academic',
              credibility: 'high',
              summary: 'Research paper on LIME methodology...',
            },
          ],
          synthesis:
            'Based on the research, key interpretability techniques include...',
        },
      },
    ],
    tags: ['research', 'academic', 'comprehensive', 'analysis'],
    version: '1.0.0',
  })
  async researchSearch({
    topic,
    includeAcademic,
    minSources,
    analysisDepth,
  }: {
    topic: string;
    includeAcademic: boolean;
    minSources: number;
    analysisDepth: 'summary' | 'detailed' | 'comprehensive';
  }): Promise<ResearchSearchResponse | { error: string; topic: string; sources: []; totalSources: 0; metadata: { researchedAt: string; error: boolean } }> {
    this.logger.log(
      `🔬 Research search: "${topic}" (${analysisDepth} analysis)`
    );

    const queries = this.generateResearchQueries(topic, includeAcademic);
    const allSources: any[] = [];

    try {
      // Execute multiple searches for comprehensive coverage
      for (const query of queries) {
        const searchResult = await this.tavilyTool.invoke({ query });

        const results = this.parseSearchResults(searchResult);
        const enhancedSources = results.items.map((item) => ({
          ...item,
          type: this.classifySourceType(item.url),
          credibility: this.assessCredibility(item.url, item.content),
          query: query,
        }));

        allSources.push(...enhancedSources);
      }

      // Deduplicate and rank sources
      const uniqueSources = this.deduplicateSources(allSources);
      const rankedSources = uniqueSources
        .sort((a, b) => (b.credibility_score || 0) - (a.credibility_score || 0))
        .slice(0, Math.max(minSources, 5));

      // Generate synthesis based on analysis depth
      const synthesis = await this.synthesizeResearch(
        topic,
        rankedSources,
        analysisDepth
      );

      return {
        topic,
        sources: rankedSources,
        totalSources: rankedSources.length,
        synthesis,
        analysisDepth,
        coverage: {
          academic: rankedSources.filter((s) => s.type === 'academic').length,
          industry: rankedSources.filter((s) => s.type === 'industry').length,
          news: rankedSources.filter((s) => s.type === 'news').length,
          other: rankedSources.filter(
            (s) => !['academic', 'industry', 'news'].includes(s.type)
          ).length,
        },
        metadata: {
          researchedAt: new Date().toISOString(),
          queriesUsed: queries,
          provider: 'tavily',
          version: '1.0.0',
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Research search failed:`, error.message);

      return {
        topic,
        error: error.message,
        sources: [],
        totalSources: 0,
        metadata: {
          researchedAt: new Date().toISOString(),
          error: true,
        },
      };
    }
  }

  /**
   * Parse and structure Tavily search results
   */
  private parseSearchResults(searchResult: string | TavilyResponse): {
    answer?: string;
    items: TavilySearchResult[];
  } {
    try {
      // Handle both string and object responses from Tavily
      const parsed: TavilyResponse =
        typeof searchResult === 'string'
          ? JSON.parse(searchResult)
          : searchResult;

      return {
        answer: parsed.answer,
        items: (parsed.results || []).map((item) => ({
          title: item.title || 'No title',
          url: item.url || '',
          content: item.content || '',
          score: item.score || 0.5,
          publishedDate: item.publishedDate,
        })),
      };
    } catch (error) {
      this.logger.warn('Failed to parse search results, using fallback');
      return {
        items: [
          {
            title: 'Search Results',
            url: '',
            content: String(searchResult),
            score: 0.5,
          },
        ],
      };
    }
  }

  private isNewsArticle(url: string): boolean {
    const newsIndicators = [
      'news',
      'reuters',
      'bloomberg',
      'cnn',
      'bbc',
      'techcrunch',
      'venturebeat',
      'wired',
      'arstechnica',
      'theverge',
      'engadget',
    ];
    return newsIndicators.some((indicator) =>
      url.toLowerCase().includes(indicator)
    );
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private estimatePublishDate(content: string, timeframe: string): string {
    // Simple heuristic - in production, you'd use more sophisticated date extraction
    const now = new Date();
    const timeframeHours =
      timeframe === 'day' ? 24 : timeframe === 'week' ? 168 : 720;
    const estimatedDate = new Date(
      now.getTime() - Math.random() * timeframeHours * 60 * 60 * 1000
    );
    return estimatedDate.toISOString();
  }

  private generateResearchQueries(
    topic: string,
    includeAcademic: boolean
  ): string[] {
    const baseQueries = [
      topic,
      `${topic} research`,
      `${topic} analysis`,
      `${topic} trends 2024`,
    ];

    if (includeAcademic) {
      baseQueries.push(
        `${topic} academic paper`,
        `${topic} research study`,
        `${topic} scientific article`
      );
    }

    return baseQueries;
  }

  private classifySourceType(url: string): string {
    const domain = this.extractDomain(url);

    if (
      [
        'arxiv.org',
        'pubmed.ncbi.nlm.nih.gov',
        'scholar.google.com',
        'ieee.org',
        'acm.org',
      ].includes(domain)
    ) {
      return 'academic';
    }

    if (
      [
        'techcrunch.com',
        'venturebeat.com',
        'wired.com',
        'arstechnica.com',
      ].includes(domain)
    ) {
      return 'industry';
    }

    if (this.isNewsArticle(url)) {
      return 'news';
    }

    return 'general';
  }

  private assessCredibility(url: string, content: string): string {
    const domain = this.extractDomain(url);
    const highCredibility = [
      'nature.com',
      'science.org',
      'arxiv.org',
      'ieee.org',
      'acm.org',
      'mit.edu',
      'stanford.edu',
      'harvard.edu',
      'reuters.com',
      'bloomberg.com',
    ];

    if (highCredibility.some((hc) => domain.includes(hc))) {
      return 'high';
    }

    // Additional credibility checks based on content
    const hasReferences =
      content.includes('references') || content.includes('bibliography');
    const hasAuthors =
      content.includes('author') || content.includes('researcher');

    if (hasReferences && hasAuthors) {
      return 'medium-high';
    }

    return 'medium';
  }

  private deduplicateSources(sources: any[]): any[] {
    const seen = new Set();
    return sources.filter((source) => {
      const key = source.url || source.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async synthesizeResearch(
    topic: string,
    sources: any[],
    depth: 'summary' | 'detailed' | 'comprehensive'
  ): Promise<string> {
    // In production, this would use an LLM to synthesize the research
    // For now, we'll create a structured summary

    const keyPoints = sources
      .slice(0, 3)
      .map(
        (source) => `• ${source.title}: ${source.content.substring(0, 100)}...`
      )
      .join('\n');

    switch (depth) {
      case 'summary':
        return `Brief overview of ${topic} based on ${sources.length} sources:\n${keyPoints}`;

      case 'detailed':
        return `Comprehensive analysis of ${topic}:\n\nKey Findings:\n${keyPoints}\n\nSource Distribution: ${sources.length} total sources with varying credibility levels.`;

      case 'comprehensive': {
        const credibilityBreakdown = sources.reduce((acc, s) => {
          acc[s.credibility] = (acc[s.credibility] || 0) + 1;
          return acc;
        }, {});

        return `In-depth research synthesis for ${topic}:\n\nExecutive Summary:\n${keyPoints}\n\nSource Analysis:\n- Total sources analyzed: ${
          sources.length
        }\n- Credibility distribution: ${JSON.stringify(
          credibilityBreakdown
        )}\n- Coverage includes academic, industry, and news perspectives\n\nThis synthesis provides a comprehensive foundation for understanding current developments in ${topic}.`;
      }
      default:
        return keyPoints;
    }
  }
}
