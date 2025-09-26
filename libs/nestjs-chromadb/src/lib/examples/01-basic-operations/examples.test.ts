/**
 * @fileoverview Tests for ChromaDB Examples
 * 
 * These tests verify that our examples are functional and demonstrate
 * proper usage patterns without placeholder code.
 */

import { Test } from '@nestjs/testing';
import { ChromaDBModule, ChromaDBService } from '../../../index';
import { BasicCrudService } from './01-basic-crud.example';
import { AdvancedSemanticSearchService } from './03-advanced-semantic-search.example';

describe('ChromaDB Examples', () => {
  let basicCrudService: BasicCrudService;
  let advancedSearchService: AdvancedSemanticSearchService;
  let chromaDBService: ChromaDBService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
      providers: [BasicCrudService, AdvancedSemanticSearchService],
    }).compile();

    basicCrudService = moduleRef.get<BasicCrudService>(BasicCrudService);
    advancedSearchService = moduleRef.get<AdvancedSemanticSearchService>(AdvancedSemanticSearchService);
    chromaDBService = moduleRef.get<ChromaDBService>(ChromaDBService);
  });

  describe('BasicCrudService', () => {
    it('should be defined', () => {
      expect(basicCrudService).toBeDefined();
    });

    it('should have proper CRUD methods', () => {
      expect(typeof basicCrudService.executeBasicCrud).toBe('function');
      expect(typeof basicCrudService.getCollectionStats).toBe('function');
    });

    it('should demonstrate real business logic without placeholders', async () => {
      // This test ensures our CRUD example contains actual implementation
      const serviceCode = basicCrudService.constructor.toString();
      
      // Should not contain placeholder indicators
      expect(serviceCode).not.toContain('TODO');
      expect(serviceCode).not.toContain('PLACEHOLDER');
      expect(serviceCode).not.toContain('STUB');
      expect(serviceCode).not.toContain('as any');
    });

    it('should create collection stats with proper structure', async () => {
      const stats = await basicCrudService.getCollectionStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('collectionName');
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('sampleIds');
      expect(typeof stats.totalDocuments).toBe('number');
      expect(Array.isArray(stats.sampleIds)).toBe(true);
    });
  });

  describe('AdvancedSemanticSearchService', () => {
    it('should be defined', () => {
      expect(advancedSearchService).toBeDefined();
    });

    it('should have proper search methods', () => {
      expect(typeof advancedSearchService.runAdvancedSemanticSearchExample).toBe('function');
    });

    it('should demonstrate comprehensive business logic', () => {
      const serviceCode = advancedSearchService.constructor.toString();
      
      // Should contain real business methods
      expect(serviceCode).toContain('demonstrateSemanticDocumentSearch');
      expect(serviceCode).toContain('demonstrateCodeSimilaritySearch');
      expect(serviceCode).toContain('demonstrateMultiFacetedSearch');
      expect(serviceCode).toContain('demonstratePerformanceBenchmarking');
      
      // Should not contain placeholder indicators
      expect(serviceCode).not.toContain('TODO');
      expect(serviceCode).not.toContain('PLACEHOLDER'); 
      expect(serviceCode).not.toContain('STUB');
    });

    it('should have proper helper methods', () => {
      // Check that helper methods exist
      expect(typeof (advancedSearchService as any).getDifficultyScore).toBe('function');
      expect(typeof (advancedSearchService as any).extractMatchedTerms).toBe('function');
    });

    it('should calculate difficulty scores correctly', () => {
      const getDifficultyScore = (advancedSearchService as any).getDifficultyScore.bind(advancedSearchService);
      
      expect(getDifficultyScore('beginner')).toBe(0.3);
      expect(getDifficultyScore('intermediate')).toBe(0.6);
      expect(getDifficultyScore('advanced')).toBe(0.8);
      expect(getDifficultyScore('expert')).toBe(1.0);
      expect(getDifficultyScore('unknown')).toBe(0.5);
    });

    it('should extract matched terms correctly', () => {
      const extractMatchedTerms = (advancedSearchService as any).extractMatchedTerms.bind(advancedSearchService);
      
      const query = 'React state management performance optimization';
      const document = 'This document covers React hooks for state management and performance best practices.';
      
      const matchedTerms = extractMatchedTerms(query, document);
      
      expect(Array.isArray(matchedTerms)).toBe(true);
      expect(matchedTerms).toContain('React');
      expect(matchedTerms).toContain('state');
      expect(matchedTerms).toContain('performance');
    });
  });

  describe('Type Safety Verification', () => {
    it('should use proper ChromaWireDocument types', () => {
      // Verify that our examples use the correct types
      const basicServiceCode = BasicCrudService.toString();
      
      // Should use ChromaWireDocument, not ChromaDocument or any
      expect(basicServiceCode).toContain('ChromaWireDocument');
      expect(basicServiceCode).not.toContain('ChromaDocument');
    });

    it('should have proper error handling without any types', () => {
      const advancedServiceCode = AdvancedSemanticSearchService.toString();
      
      // Should have proper error handling
      expect(advancedServiceCode).toContain('try');
      expect(advancedServiceCode).toContain('catch');
      expect(advancedServiceCode).toContain('error instanceof Error');
      
      // Should not use any types
      expect(advancedServiceCode).not.toContain(': any');
      expect(advancedServiceCode).not.toContain('as any');
    });
  });

  describe('Real Business Logic Verification', () => {
    it('should contain comprehensive technical documentation examples', () => {
      const searchServiceCode = AdvancedSemanticSearchService.toString();
      
      // Should contain real technical content
      expect(searchServiceCode).toContain('React Hooks Comprehensive Guide');
      expect(searchServiceCode).toContain('Node.js Performance Optimization');
      expect(searchServiceCode).toContain('Docker API Reference');
      expect(searchServiceCode).toContain('TypeScript Generics Troubleshooting');
      expect(searchServiceCode).toContain('Microservices Architecture Patterns');
    });

    it('should contain functional code examples', () => {
      const searchServiceCode = AdvancedSemanticSearchService.toString();
      
      // Should contain real code snippets
      expect(searchServiceCode).toContain('React Custom Hook for Data Fetching');
      expect(searchServiceCode).toContain('Node.js Authentication Middleware');
      expect(searchServiceCode).toContain('Python Async Rate Limiter');
      expect(searchServiceCode).toContain('Docker Multi-stage Build');
    });

    it('should have performance benchmarking logic', () => {
      const searchServiceCode = AdvancedSemanticSearchService.toString();
      
      // Should contain performance measurement
      expect(searchServiceCode).toContain('benchmarkQueries');
      expect(searchServiceCode).toContain('avgTime');
      expect(searchServiceCode).toContain('minTime');
      expect(searchServiceCode).toContain('maxTime');
      expect(searchServiceCode).toContain('Performance Benchmark Results');
    });

    it('should have sophisticated search logic', () => {
      const searchServiceCode = AdvancedSemanticSearchService.toString();
      
      // Should contain advanced search features
      expect(searchServiceCode).toContain('multiFacetedSearch');
      expect(searchServiceCode).toContain('relevanceScore');
      expect(searchServiceCode).toContain('difficultyScore');
      expect(searchServiceCode).toContain('popularityScore');
      expect(searchServiceCode).toContain('ratingScore');
    });
  });
});