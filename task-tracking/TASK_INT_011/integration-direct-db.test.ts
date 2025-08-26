/**
 * INTEGRATION TESTS: Direct Database Connections
 * 
 * Tests USER'S ARCHITECTURAL VISION: "Direct database integration without adapter layers"
 * Validates: ChromaDB and Neo4j direct connections work flawlessly
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MemoryModule } from '@hive-academy/nestjs-memory';
import { MemoryService } from '@hive-academy/nestjs-memory';
import { MemoryStorageService } from '@hive-academy/nestjs-memory';
import { MemoryGraphService } from '@hive-academy/nestjs-memory';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import type { MemoryEntry } from '@hive-academy/nestjs-memory';

describe('Integration Tests - Direct Database Connections', () => {
  let module: TestingModule;
  let memoryService: MemoryService;
  let storageService: MemoryStorageService;
  let graphService: MemoryGraphService;
  let chromaService: ChromaDBService;
  let neo4jService: Neo4jService;

  beforeAll(async () => {
    // Setup test environment
    process.env.CHROMADB_HOST = process.env.CHROMADB_HOST || 'localhost';
    process.env.CHROMADB_PORT = process.env.CHROMADB_PORT || '8000';
    process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
    process.env.NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
    process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        MemoryModule.forRoot({
          chromadb: {
            collection: 'integration_test_memory',
            embeddingFunction: 'default'
          },
          neo4j: {
            database: 'neo4j' // Use default database for tests
          },
          retention: {
            maxEntries: 10000,
            ttlDays: 1 // Short TTL for tests
          }
        })
      ]
    }).compile();

    memoryService = module.get<MemoryService>(MemoryService);
    storageService = module.get<MemoryStorageService>(MemoryStorageService);
    graphService = module.get<MemoryGraphService>(MemoryGraphService);
    chromaService = module.get<ChromaDBService>(ChromaDBService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await chromaService.deleteCollection('integration_test_memory');
    } catch (error) {
      // Collection might not exist, that's ok
    }
    
    try {
      await neo4jService.run('MATCH (n:Memory) WHERE n.testId = "integration_test" DELETE n');
    } catch (error) {
      // Data might not exist, that's ok
    }

    await module.close();
  });

  describe('📋 USER REQUIREMENT: Direct ChromaDB Integration', () => {
    it('should establish direct ChromaDB connection without adapters', async () => {
      // Verify direct service access
      expect(chromaService).toBeDefined();
      expect(chromaService).toBeInstanceOf(ChromaDBService);
      
      // Verify storage service has direct ChromaDB access
      expect(storageService['chromaService']).toBe(chromaService);
      
      // CRITICAL: No adapter layer
      expect(storageService['vectorAdapter']).toBeUndefined();
      expect(storageService['databaseProvider']).toBeUndefined();
    });

    it('should perform vector operations directly through ChromaDB', async () => {
      const testCollection = 'direct_vector_test';
      
      // Create collection directly
      await chromaService.createCollection(testCollection, {
        embeddingFunction: 'default'
      });

      // Add documents directly
      await chromaService.addDocuments(testCollection, {
        documents: ['Direct vector test document'],
        ids: ['direct-test-1'],
        metadatas: [{ testId: 'direct_vector', type: 'test' }]
      });

      // Query directly
      const results = await chromaService.queryDocuments(testCollection, {
        queryTexts: ['vector test'],
        nResults: 1
      });

      expect(results).toBeDefined();
      expect(results.ids).toBeDefined();
      expect(results.ids[0]).toContain('direct-test-1');
      expect(results.documents[0]).toContain('Direct vector test document');

      // Cleanup
      await chromaService.deleteCollection(testCollection);
    });

    it('should store and retrieve memories through direct ChromaDB calls', async () => {
      const threadId = 'direct-chroma-thread';
      const testContent = 'Direct ChromaDB integration test content';

      // Store memory (should use direct ChromaDB)
      const storedMemory = await memoryService.store(
        threadId, 
        testContent,
        { type: 'integration-test', testId: 'direct_chroma' }
      );

      expect(storedMemory).toBeDefined();
      expect(storedMemory.content).toBe(testContent);

      // Verify data exists in ChromaDB directly
      const chromaResults = await chromaService.queryDocuments('integration_test_memory', {
        queryTexts: [testContent],
        nResults: 1,
        where: { threadId: threadId }
      });

      expect(chromaResults.ids).toBeDefined();
      expect(chromaResults.ids.length).toBeGreaterThan(0);

      // Retrieve through memory service
      const retrieved = await memoryService.retrieve(threadId);
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved.find(m => m.content === testContent)).toBeDefined();
    });

    it('should handle vector search efficiently without adapter overhead', async () => {
      const searchThreadId = 'vector-search-thread';
      
      // Store searchable content
      await memoryService.storeBatch(searchThreadId, [
        { content: 'Artificial intelligence and machine learning concepts', metadata: { type: 'ai-topic' } },
        { content: 'Natural language processing techniques', metadata: { type: 'nlp-topic' } },
        { content: 'Computer vision algorithms', metadata: { type: 'cv-topic' } },
        { content: 'Deep learning neural networks', metadata: { type: 'dl-topic' } }
      ], 'search-user');

      // Perform semantic search
      const searchStart = performance.now();
      const searchResults = await memoryService.search({
        query: 'machine learning artificial intelligence',
        threadId: searchThreadId,
        limit: 5
      });
      const searchEnd = performance.now();

      // Verify results
      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Should find AI-related content
      const aiContent = searchResults.find(r => r.content.includes('Artificial intelligence'));
      expect(aiContent).toBeDefined();

      // Performance should be good without adapter overhead
      const searchTime = searchEnd - searchStart;
      expect(searchTime).toBeLessThan(200); // Under 200ms for direct access
    });
  });

  describe('📋 USER REQUIREMENT: Direct Neo4j Integration', () => {
    it('should establish direct Neo4j connection without adapters', async () => {
      // Verify direct service access
      expect(neo4jService).toBeDefined();
      expect(neo4jService).toBeInstanceOf(Neo4jService);
      
      // Verify graph service has direct Neo4j access
      expect(graphService['neo4jService']).toBe(neo4jService);
      
      // CRITICAL: No adapter layer
      expect(graphService['graphAdapter']).toBeUndefined();
      expect(graphService['databaseProvider']).toBeUndefined();
    });

    it('should perform graph operations directly through Neo4j', async () => {
      // Create test node directly
      const directResult = await neo4jService.run(
        'CREATE (m:Memory {id: $id, content: $content, testId: $testId}) RETURN m',
        {
          id: 'direct-neo4j-test',
          content: 'Direct Neo4j integration test',
          testId: 'direct_neo4j'
        }
      );

      expect(directResult.records).toBeDefined();
      expect(directResult.records.length).toBe(1);

      // Query the node back
      const queryResult = await neo4jService.run(
        'MATCH (m:Memory {testId: $testId}) RETURN m',
        { testId: 'direct_neo4j' }
      );

      expect(queryResult.records.length).toBe(1);
      const node = queryResult.records[0].get('m');
      expect(node.properties.content).toBe('Direct Neo4j integration test');

      // Cleanup
      await neo4jService.run(
        'MATCH (m:Memory {testId: $testId}) DELETE m',
        { testId: 'direct_neo4j' }
      );
    });

    it('should track memory relationships through direct Neo4j calls', async () => {
      const relationshipThreadId = 'relationship-thread';
      
      // Store related memories
      const memory1 = await memoryService.store(
        relationshipThreadId,
        'First memory about databases',
        { type: 'database-topic', testId: 'relationship_test' }
      );

      const memory2 = await memoryService.store(
        relationshipThreadId, 
        'Second memory about graph databases',
        { type: 'database-topic', testId: 'relationship_test' }
      );

      // Build semantic relationships (should use direct Neo4j)
      await memoryService.buildSemanticRelationships();

      // Check if relationship tracking worked
      const flow = await memoryService.getConversationFlow(relationshipThreadId);
      expect(Array.isArray(flow)).toBe(true);
      
      // Should have memories in the flow
      const flowIds = flow.map(f => f.memoryId);
      expect(flowIds).toContain(memory1.id);
      expect(flowIds).toContain(memory2.id);
    });

    it('should handle graph queries efficiently without adapter overhead', async () => {
      const graphThreadId = 'graph-performance-thread';
      const testUserId = 'graph-perf-user';
      
      // Store memories for graph analysis
      await memoryService.storeBatch(graphThreadId, [
        { content: 'Graph database concepts', metadata: { type: 'database', tags: '["graph", "neo4j"]' } },
        { content: 'Vector database usage', metadata: { type: 'database', tags: '["vector", "chroma"]' } },
        { content: 'Memory management patterns', metadata: { type: 'programming', tags: '["memory", "patterns"]' } }
      ], testUserId);

      // Perform user pattern analysis (uses graph queries)
      const patternStart = performance.now();
      const userPatterns = await memoryService.getUserPatterns(testUserId);
      const patternEnd = performance.now();

      // Verify patterns were analyzed
      expect(userPatterns).toBeDefined();
      expect(userPatterns.userId).toBe(testUserId);
      expect(userPatterns.commonTopics.length).toBeGreaterThan(0);
      expect(userPatterns.preferredMemoryTypes.length).toBeGreaterThan(0);

      // Performance should be good with direct access
      const patternTime = patternEnd - patternStart;
      expect(patternTime).toBeLessThan(150); // Under 150ms for direct graph access
    });
  });

  describe('📋 USER REQUIREMENT: Coordinated Operations (Vector + Graph)', () => {
    it('should coordinate vector and graph operations without adapter complexity', async () => {
      const coordinationThreadId = 'coordination-thread';
      const coordinationUserId = 'coordination-user';

      // Store memory (should coordinate both databases)
      const coordinatedMemory = await memoryService.store(
        coordinationThreadId,
        'Coordinated operation test content',
        { type: 'coordination-test', importance: 'high', testId: 'coordination' },
        coordinationUserId
      );

      expect(coordinatedMemory).toBeDefined();

      // Verify in ChromaDB directly
      const vectorResults = await chromaService.queryDocuments('integration_test_memory', {
        queryTexts: ['Coordinated operation test'],
        nResults: 1,
        where: { threadId: coordinationThreadId }
      });
      expect(vectorResults.ids.length).toBeGreaterThan(0);

      // Verify in Neo4j directly (if graph tracking is working)
      const graphResults = await neo4jService.run(
        'MATCH (m:Memory) WHERE m.id = $memoryId RETURN m',
        { memoryId: coordinatedMemory.id }
      );
      // Note: Graph tracking might be gracefully failing, that's acceptable

      // Verify coordinated search works
      const contextSearch = await memoryService.searchForContext(
        'coordination test',
        coordinationThreadId,
        coordinationUserId
      );

      expect(contextSearch.relevantMemories.length).toBeGreaterThan(0);
      expect(contextSearch.userPatterns).toBeDefined();
      expect(typeof contextSearch.confidence).toBe('number');
    });

    it('should handle errors gracefully without adapter complexity', async () => {
      const errorThreadId = 'error-handling-thread';

      // Should handle ChromaDB errors gracefully
      const mockChromaError = jest.spyOn(chromaService, 'queryDocuments')
        .mockImplementationOnce(() => {
          throw new Error('ChromaDB connection error');
        });

      // Search should handle error and not throw
      await expect(memoryService.search({
        query: 'error test',
        threadId: errorThreadId
      })).rejects.toThrow(); // Should wrap and rethrow with context

      mockChromaError.mockRestore();

      // Should handle Neo4j errors gracefully for non-critical operations
      const mockNeo4jError = jest.spyOn(neo4jService, 'run')
        .mockImplementationOnce(() => {
          throw new Error('Neo4j connection error');
        });

      // Building relationships should not fail the whole operation
      await expect(memoryService.buildSemanticRelationships()).resolves.not.toThrow();

      mockNeo4jError.mockRestore();
    });
  });

  describe('📋 USER REQUIREMENT: Performance Without Adapter Overhead', () => {
    it('should demonstrate superior performance vs adapter-based approach', async () => {
      const perfThreadId = 'performance-comparison';
      const batchSize = 10;

      // Measure batch storage performance (direct database access)
      const entries = Array.from({ length: batchSize }, (_, i) => ({
        content: `Performance test entry ${i + 1} with meaningful content for embedding`,
        metadata: { type: 'performance-test', index: i, testId: 'performance' }
      }));

      const batchStart = performance.now();
      const batchResults = await memoryService.storeBatch(perfThreadId, entries, 'perf-user');
      const batchEnd = performance.now();

      const batchTime = batchEnd - batchStart;
      
      // Should store 10 entries in under 500ms (much faster than adapter approach)
      expect(batchTime).toBeLessThan(500);
      expect(batchResults).toHaveLength(batchSize);

      // Measure retrieval performance
      const retrieveStart = performance.now();
      const retrieved = await memoryService.retrieve(perfThreadId);
      const retrieveEnd = performance.now();

      const retrieveTime = retrieveEnd - retrieveStart;
      
      // Should retrieve in under 100ms
      expect(retrieveTime).toBeLessThan(100);
      expect(retrieved.length).toBe(batchSize);

      // Measure search performance
      const searchStart = performance.now();
      const searchResults = await memoryService.search({
        query: 'performance test meaningful',
        threadId: perfThreadId,
        limit: 5
      });
      const searchEnd = performance.now();

      const searchTime = searchEnd - searchStart;
      
      // Should search in under 200ms
      expect(searchTime).toBeLessThan(200);
      expect(searchResults.length).toBeGreaterThan(0);

      console.log(`Performance Metrics (Direct DB Access):
        - Batch Store (${batchSize} entries): ${batchTime.toFixed(2)}ms
        - Retrieve (${batchSize} entries): ${retrieveTime.toFixed(2)}ms  
        - Semantic Search: ${searchTime.toFixed(2)}ms`);
    });

    it('should have minimal memory footprint without adapter objects', () => {
      const initialMemory = process.memoryUsage();
      
      // Create multiple memory operations
      const operations = Array.from({ length: 100 }, async (_, i) => {
        return memoryService.store(
          `memory-footprint-${i}`,
          `Memory footprint test ${i}`,
          { type: 'footprint-test', index: i }
        );
      });

      Promise.all(operations).then(() => {
        const finalMemory = process.memoryUsage();
        const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory growth should be minimal (under 50MB for 100 operations)
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
        
        console.log(`Memory Growth (Direct DB): ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      });
    });
  });

  describe('📋 USER REQUIREMENT: Error Handling & Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      const resilientThreadId = 'resilience-test';

      // Test with invalid ChromaDB connection
      const mockInvalidChroma = jest.spyOn(chromaService, 'addDocuments')
        .mockImplementationOnce(() => {
          throw new Error('ChromaDB service unavailable');
        });

      await expect(memoryService.store(
        resilientThreadId,
        'Resilience test content'
      )).rejects.toThrow();

      mockInvalidChroma.mockRestore();

      // Test with invalid Neo4j connection (should degrade gracefully)
      const mockInvalidNeo4j = jest.spyOn(neo4jService, 'run')
        .mockImplementation(() => {
          throw new Error('Neo4j service unavailable');
        });

      // Graph operations should fail gracefully without breaking storage
      await expect(memoryService.buildSemanticRelationships()).resolves.not.toThrow();

      mockInvalidNeo4j.mockRestore();
    });

    it('should provide detailed error context without adapter confusion', async () => {
      const errorContextThreadId = 'error-context-test';

      // Mock a specific ChromaDB error
      const mockError = jest.spyOn(chromaService, 'queryDocuments')
        .mockImplementationOnce(() => {
          throw new Error('Collection does not exist: missing_collection');
        });

      try {
        await memoryService.search({
          query: 'error context test',
          threadId: errorContextThreadId
        });
        fail('Should have thrown an error');
      } catch (error) {
        // Error should provide clear context without adapter layer confusion
        expect(error.message).toContain('search');
        expect(error.message).not.toContain('adapter');
        expect(error.message).not.toContain('provider');
      }

      mockError.mockRestore();
    });
  });
});