/**
 * @fileoverview Advanced Semantic Search Example
 * 
 * Demonstrates real-world semantic search scenarios with comprehensive business logic:
 * - Technical documentation search with metadata filtering
 * - Code snippet similarity matching
 * - Multi-faceted search with relevance scoring
 * - Performance benchmarking and optimization
 * 
 * This example shows actual production-ready patterns for building intelligent search systems.
 */

import { Injectable, Module, OnModuleInit, Logger } from '@nestjs/common';
import { ChromaDBModule, ChromaDBFacadeService, ChromaWireDocument } from '../../../index';

// Note: Using generic document structure for this example

@Injectable()
export class AdvancedSemanticSearchService implements OnModuleInit {
  private readonly logger = new Logger(AdvancedSemanticSearchService.name);
  private readonly techDocsCollection = 'technical-documentation';
  private readonly codeSnippetsCollection = 'code-snippets';

  constructor(private readonly chromaDB: ChromaDBFacadeService) {}

  async onModuleInit() {
    await this.runAdvancedSemanticSearchExample();
  }

  /**
   * Complete demonstration of advanced semantic search patterns
   */
  async runAdvancedSemanticSearchExample(): Promise<void> {
    this.logger.log('🔍 Starting Advanced Semantic Search Example');
    
    try {
      // Setup collections with real data
      await this.setupTechnicalDocumentation();
      await this.setupCodeSnippets();

      // Demonstrate various search patterns
      await this.demonstrateSemanticDocumentSearch();
      await this.demonstrateCodeSimilaritySearch();
      await this.demonstrateMultiFacetedSearch();
      await this.demonstratePerformanceBenchmarking();
      
    } catch (error) {
      this.logger.error('Advanced semantic search example failed', error);
      throw error;
    }
  }

  /**
   * Setup technical documentation with real, comprehensive content
   */
  private async setupTechnicalDocumentation(): Promise<void> {
    this.logger.log('📚 Setting up technical documentation collection...');

    // Create collection
    try {
      await this.chromaDB.createCollection(this.techDocsCollection, {
        name: this.techDocsCollection,
        metadata: { 
          description: 'Technical documentation with semantic search capabilities',
          version: '1.0',
          created: new Date().toISOString()
        }
      });
    } catch (error) {
      // Collection might already exist
      this.logger.log('Collection already exists, continuing...');
    }

    const technicalDocs: ChromaWireDocument[] = [
      {
        id: 'react-hooks-guide',
        document: 'React Hooks Comprehensive Guide: React Hooks revolutionized functional components by allowing state management and lifecycle methods. useState manages local state, useEffect handles side effects and cleanup, useContext provides context consumption, useMemo optimizes expensive calculations, useCallback prevents unnecessary re-renders, and custom hooks enable logic reuse across components.',
        metadata: {
          title: 'React Hooks Comprehensive Guide',
          documentType: 'tutorial',
          technology: 'react,javascript,typescript',
          difficulty: 'intermediate',
          author: 'React Team',
          lastUpdated: new Date().toISOString(),
          views: 15432,
          rating: 4.8,
          tags: 'hooks,state-management,functional-components,usestate,useeffect',
          wordCount: 67,
        }
      },
      {
        id: 'nodejs-performance-optimization',
        document: 'Node.js Performance Optimization Best Practices: Optimize Node.js applications through event loop understanding, non-blocking I/O operations, memory leak prevention, CPU profiling, clustering for multi-core usage, connection pooling for databases, response compression, caching strategies with Redis, and monitoring with APM tools for production environments.',
        metadata: {
          title: 'Node.js Performance Optimization',
          documentType: 'best-practices',
          technology: 'nodejs,javascript,performance',
          difficulty: 'advanced',
          author: 'Performance Team',
          lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          views: 8976,
          rating: 4.9,
          tags: 'performance,optimization,clustering,memory,profiling',
          wordCount: 54,
        }
      },
      {
        id: 'docker-containerization-api',
        document: 'Docker API Reference for Container Management: Docker API endpoints for container lifecycle management including POST /containers/create for container creation, GET /containers/json for listing, POST /containers/{id}/start for starting, POST /containers/{id}/stop for stopping, DELETE /containers/{id} for removal, and GET /containers/{id}/stats for monitoring resource usage.',
        metadata: {
          title: 'Docker API Reference',
          documentType: 'api-reference',
          technology: 'docker,containers,devops',
          difficulty: 'intermediate',
          author: 'DevOps Team',
          lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          views: 5643,
          rating: 4.6,
          tags: 'docker,api,containers,devops,lifecycle',
          wordCount: 62,
        }
      },
      {
        id: 'typescript-generics-troubleshooting',
        document: 'TypeScript Generics Troubleshooting Guide: Common TypeScript generics issues include constraint satisfaction errors, type inference failures, complex conditional types, mapped type problems, and utility type misuse. Solutions involve proper constraint definition, explicit type annotations, intermediate type aliases, and understanding variance in generic parameters.',
        metadata: {
          title: 'TypeScript Generics Troubleshooting',
          documentType: 'troubleshooting',
          technology: 'typescript,generics,types',
          difficulty: 'expert',
          author: 'TypeScript Experts',
          lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          views: 3421,
          rating: 4.7,
          tags: 'typescript,generics,troubleshooting,types,constraints',
          wordCount: 58,
        }
      },
      {
        id: 'microservices-architecture-patterns',
        document: 'Microservices Architecture Patterns and Implementation: Design microservices using domain-driven design, implement service communication via REST APIs and message queues, manage distributed data with event sourcing, handle service discovery and load balancing, implement circuit breaker patterns for resilience, and monitor distributed systems with distributed tracing.',
        metadata: {
          title: 'Microservices Architecture Patterns',
          documentType: 'tutorial',
          technology: 'microservices,architecture,distributed-systems',
          difficulty: 'expert',
          author: 'Architecture Team',
          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          views: 12876,
          rating: 4.9,
          tags: 'microservices,architecture,ddd,event-sourcing,resilience',
          wordCount: 63,
        }
      }
    ];

    await this.chromaDB.addDocuments(this.techDocsCollection, technicalDocs);
    this.logger.log(`✅ Added ${technicalDocs.length} technical documents`);
  }

  /**
   * Setup code snippets collection with real, functional code examples
   */
  private async setupCodeSnippets(): Promise<void> {
    this.logger.log('💻 Setting up code snippets collection...');

    try {
      await this.chromaDB.createCollection(this.codeSnippetsCollection, {
        name: this.codeSnippetsCollection,
        metadata: { 
          description: 'Code snippets with semantic similarity search',
          version: '1.0',
          created: new Date().toISOString()
        }
      });
    } catch (error) {
      this.logger.log('Collection already exists, continuing...');
    }

    const codeSnippets: ChromaWireDocument[] = [
      {
        id: 'react-custom-hook-fetch',
        document: `React Custom Hook for Data Fetching: 
import { useState, useEffect } from 'react';

function useFetch<T>(url: string): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}`,
        metadata: {
          language: 'typescript',
          framework: 'react,hooks',
          description: 'Custom hook for data fetching with loading and error states',
          useCase: 'API data fetching in React components',
          complexity: 4,
          performance: 'medium',
          testCoverage: 85,
          tags: 'custom-hook,data-fetching,react,typescript',
          linesOfCode: 18,
        }
      },
      {
        id: 'nodejs-middleware-auth',
        document: `Node.js Authentication Middleware:
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};`,
        metadata: {
          language: 'typescript',
          framework: 'nodejs,express,jwt',
          description: 'JWT authentication middleware for Express applications',
          useCase: 'API route protection and user authentication',
          complexity: 6,
          performance: 'high',
          testCoverage: 92,
          tags: 'authentication,middleware,jwt,express,security',
          linesOfCode: 19,
        }
      },
      {
        id: 'python-async-rate-limiter',
        document: `Python Async Rate Limiter Implementation:
import asyncio
import time
from collections import defaultdict, deque
from typing import Dict, Deque

class AsyncRateLimiter:
    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
    
    async def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.time_window
        
        # Remove old requests
        while self.requests[key] and self.requests[key][0] <= window_start:
            self.requests[key].popleft()
        
        if len(self.requests[key]) >= self.max_requests:
            return False
        
        self.requests[key].append(now)
        return True`,
        metadata: {
          language: 'python',
          framework: 'asyncio,typing',
          description: 'Async rate limiter with sliding window algorithm',
          useCase: 'API rate limiting and traffic control',
          complexity: 7,
          performance: 'high',
          testCoverage: 88,
          tags: 'rate-limiting,async,python,sliding-window,api',
          linesOfCode: 24,
        }
      },
      {
        id: 'docker-multi-stage-build',
        document: `Docker Multi-stage Build for Node.js:
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies
FROM builder AS dev-deps
RUN npm ci
COPY . .
RUN npm run build && npm run test

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/node_modules ./node_modules
COPY --from=dev-deps /app/dist ./dist
COPY package*.json ./
USER nextjs
EXPOSE 3000
CMD ["node", "dist/index.js"]`,
        metadata: {
          language: 'dockerfile',
          framework: 'docker,nodejs',
          description: 'Multi-stage Docker build for optimized Node.js production images',
          useCase: 'Container deployment with minimal image size',
          complexity: 5,
          performance: 'high',
          testCoverage: 0,
          tags: 'docker,multi-stage,nodejs,production,optimization',
          linesOfCode: 18,
        }
      }
    ];

    await this.chromaDB.addDocuments(this.codeSnippetsCollection, codeSnippets);
    this.logger.log(`✅ Added ${codeSnippets.length} code snippets`);
  }

  /**
   * Demonstrate semantic document search with advanced filtering and relevance scoring
   */
  private async demonstrateSemanticDocumentSearch(): Promise<void> {
    this.logger.log('\n🔍 Demonstrating Semantic Document Search...');

    const searchQueries = [
      {
        query: 'React state management and component lifecycle',
        expectedTech: ['react'],
        description: 'React-specific functionality search'
      },
      {
        query: 'application performance optimization techniques',
        expectedTypes: ['best-practices'],
        description: 'Performance optimization guidance'
      },
      {
        query: 'troubleshooting type system errors',
        expectedDifficulty: ['expert'],
        description: 'Expert-level troubleshooting content'
      }
    ];

    for (const searchCase of searchQueries) {
      this.logger.log(`\n📝 Searching: "${searchCase.query}"`);
      
      const startTime = Date.now();
      const searchResults = await this.chromaDB.searchDocuments(
        this.techDocsCollection,
        [searchCase.query],
        undefined,
        {
          nResults: 3,
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true
        }
      );
      const searchTime = Date.now() - startTime;

      if (searchResults.ids?.[0] && searchResults.ids[0].length > 0) {
        this.logger.log(`⚡ Search completed in ${searchTime}ms`);
        
        for (let i = 0; i < searchResults.ids[0].length; i++) {
          const similarity = searchResults.distances?.[0]?.[i] ? 
            (1 - searchResults.distances[0][i]).toFixed(3) : 'N/A';
          const metadata = searchResults.metadatas?.[0]?.[i];
          const document = searchResults.documents?.[0]?.[i];
          
          this.logger.log(`
📄 Result ${i + 1}: ${metadata?.title || 'Unknown'}
   📊 Similarity: ${similarity}
   🔧 Technology: ${metadata?.technology}
   🎯 Difficulty: ${metadata?.difficulty}
   👤 Author: ${metadata?.author}
   📈 Views: ${metadata?.views}
   ⭐ Rating: ${metadata?.rating}
   📝 Preview: "${document?.substring(0, 120)}..."
          `);
        }
      } else {
        this.logger.log('❌ No results found');
      }
    }
  }

  /**
   * Demonstrate code similarity search with framework-specific filtering
   */
  private async demonstrateCodeSimilaritySearch(): Promise<void> {
    this.logger.log('\n💻 Demonstrating Code Similarity Search...');

    const codeSearchQueries = [
      {
        query: 'authentication middleware for API protection',
        expectedFrameworks: ['express', 'nodejs'],
        description: 'Security middleware search'
      },
      {
        query: 'async data fetching with error handling',
        expectedLanguages: ['typescript', 'javascript'],
        description: 'Async patterns search'
      },
      {
        query: 'container deployment optimization',
        expectedFrameworks: ['docker'],
        description: 'DevOps optimization search'
      }
    ];

    for (const searchCase of codeSearchQueries) {
      this.logger.log(`\n🔎 Code Search: "${searchCase.query}"`);
      
      const startTime = Date.now();
      const codeResults = await this.chromaDB.searchDocuments(
        this.codeSnippetsCollection,
        [searchCase.query],
        undefined,
        {
          nResults: 2,
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true
        }
      );
      const searchTime = Date.now() - startTime;

      if (codeResults.ids?.[0] && codeResults.ids[0].length > 0) {
        this.logger.log(`⚡ Code search completed in ${searchTime}ms`);
        
        for (let i = 0; i < codeResults.ids[0].length; i++) {
          const similarity = codeResults.distances?.[0]?.[i] ? 
            (1 - codeResults.distances[0][i]).toFixed(3) : 'N/A';
          const metadata = codeResults.metadatas?.[0]?.[i];
          const code = codeResults.documents?.[0]?.[i];
          
          this.logger.log(`
💻 Code Result ${i + 1}:
   🎯 Similarity: ${similarity}
   🔧 Language: ${metadata?.language}
   📚 Framework: ${metadata?.framework}
   📊 Complexity: ${metadata?.complexity}/10
   ⚡ Performance: ${metadata?.performance}
   🧪 Test Coverage: ${metadata?.testCoverage}%
   📋 Use Case: ${metadata?.useCase}
   📄 Code Preview: "${code?.substring(0, 200).replace(/\n/g, ' ')}..."
          `);
        }
      } else {
        this.logger.log('❌ No code results found');
      }
    }
  }

  /**
   * Demonstrate multi-faceted search combining semantic similarity with metadata filtering
   */
  private async demonstrateMultiFacetedSearch(): Promise<void> {
    this.logger.log('\n🎯 Demonstrating Multi-faceted Search...');

    // Complex search scenario: Find intermediate to advanced React or Node.js content
    const complexQuery = 'component state management and lifecycle optimization';
    
    this.logger.log(`🔍 Complex Query: "${complexQuery}"`);
    this.logger.log('🎯 Filters: difficulty >= intermediate, technology = react OR nodejs');
    
    const startTime = Date.now();
    const filteredResults = await this.chromaDB.searchDocuments(
      this.techDocsCollection,
      [complexQuery],
      undefined,
      {
        nResults: 5,
        includeMetadata: true,
        includeDocuments: true,
        includeDistances: true,
        where: {
          $or: [
            { technology: { $contains: 'react' } },
            { technology: { $contains: 'nodejs' } }
          ]
        }
      }
    );
    const searchTime = Date.now() - startTime;

    if (filteredResults.ids?.[0] && filteredResults.ids[0].length > 0) {
      this.logger.log(`⚡ Multi-faceted search completed in ${searchTime}ms`);
      
      // Calculate relevance scores based on multiple factors
      const scoredResults = filteredResults.ids[0].map((id: string, i: number) => {
        const similarity = filteredResults.distances?.[0]?.[i] ? 
          1 - filteredResults.distances[0][i] : 0;
        const metadata = filteredResults.metadatas?.[0]?.[i];
        const document = filteredResults.documents?.[0]?.[i];
        
        // Calculate composite relevance score
        const difficultyScore = this.getDifficultyScore(metadata?.difficulty as string);
        const popularityScore = Math.min((metadata?.views as number || 0) / 10000, 1);
        const ratingScore = (metadata?.rating as number || 0) / 5;
        
        const relevanceScore = (
          similarity * 0.4 + 
          difficultyScore * 0.2 + 
          popularityScore * 0.2 + 
          ratingScore * 0.2
        );
        
        return {
          id,
          document,
          metadata,
          similarity: parseFloat(similarity.toFixed(3)),
          relevanceScore: parseFloat(relevanceScore.toFixed(3)),
          matchedTerms: this.extractMatchedTerms(complexQuery, document ?? ''),
        };
      });

      // Sort by relevance score
      scoredResults.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      
      scoredResults.forEach((result: any, i: number) => {
        this.logger.log(`
📊 Multi-faceted Result ${i + 1}: ${result.metadata?.title}
   🎯 Relevance Score: ${result.relevanceScore}
   📈 Similarity: ${result.similarity}
   🔧 Technology: ${result.metadata?.technology}
   📊 Difficulty: ${result.metadata?.difficulty}
   👁️ Views: ${result.metadata?.views?.toLocaleString()}
   ⭐ Rating: ${result.metadata?.rating}
   🏷️ Matched Terms: ${result.matchedTerms.join(', ')}
   📝 Content: "${result.document?.substring(0, 150)}..."
        `);
      });
    } else {
      this.logger.log('❌ No filtered results found');
    }
  }

  /**
   * Demonstrate performance benchmarking and optimization techniques
   */
  private async demonstratePerformanceBenchmarking(): Promise<void> {
    this.logger.log('\n⚡ Demonstrating Performance Benchmarking...');

    const benchmarkQueries = [
      'React performance optimization',
      'Node.js scalability patterns',
      'Docker container efficiency',
      'TypeScript type performance'
    ];

    const benchmarkResults: { query: string; avgTime: number; minTime: number; maxTime: number }[] = [];

    for (const query of benchmarkQueries) {
      const times: number[] = [];
      
      // Run each query multiple times for statistical analysis
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await this.chromaDB.searchDocuments(
          this.techDocsCollection,
          [query],
          undefined,
          { nResults: 3, includeMetadata: true, includeDocuments: true }
        );
        
        const endTime = Date.now();
        times.push(endTime - startTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      benchmarkResults.push({ query, avgTime, minTime, maxTime });
    }

    this.logger.log('\n📊 Performance Benchmark Results:');
    benchmarkResults.forEach((result, i) => {
      this.logger.log(`
⚡ Query ${i + 1}: "${result.query}"
   📈 Average Time: ${result.avgTime.toFixed(2)}ms
   🚀 Best Time: ${result.minTime}ms
   🐌 Worst Time: ${result.maxTime}ms
   📊 Variability: ${(result.maxTime - result.minTime).toFixed(2)}ms
      `);
    });

    // Overall statistics
    const overallAvg = benchmarkResults.reduce((sum, r) => sum + r.avgTime, 0) / benchmarkResults.length;
    const bestOverall = Math.min(...benchmarkResults.map(r => r.minTime));
    const worstOverall = Math.max(...benchmarkResults.map(r => r.maxTime));
    
    this.logger.log(`
🎯 Overall Performance Summary:
   📊 Average Query Time: ${overallAvg.toFixed(2)}ms
   🚀 Best Query Time: ${bestOverall}ms
   🐌 Worst Query Time: ${worstOverall}ms
   💡 Performance Rating: ${overallAvg < 50 ? '🟢 Excellent' : overallAvg < 100 ? '🟡 Good' : '🔴 Needs Optimization'}
    `);
  }

  /**
   * Helper method to calculate difficulty score for relevance ranking
   */
  private getDifficultyScore(difficulty: string): number {
    const scores = { beginner: 0.3, intermediate: 0.6, advanced: 0.8, expert: 1.0 };
    return scores[difficulty as keyof typeof scores] || 0.5;
  }

  /**
   * Helper method to extract matched terms between query and document
   */
  private extractMatchedTerms(query: string, document: string): string[] {
    const queryWords = query.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    const documentWords = document.toLowerCase().split(/\W+/);
    
    return queryWords.filter(queryWord => 
      documentWords.some(docWord => 
        docWord.includes(queryWord) || queryWord.includes(docWord)
      )
    );
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
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false, // Disable for examples
    }),
  ],
  providers: [AdvancedSemanticSearchService],
  exports: [AdvancedSemanticSearchService],
})
export class AdvancedSemanticSearchExampleModule {}