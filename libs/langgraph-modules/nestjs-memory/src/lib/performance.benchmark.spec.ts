import { Test, TestingModule } from '@nestjs/testing';
import { performance } from 'perf_hooks';

import { ChromaVectorAdapter } from './adapters/chroma-vector.adapter';
import { Neo4jGraphAdapter } from './adapters/neo4j-graph.adapter';
import { IVectorService, VectorStoreData } from './interfaces/vector-service.interface';
import { IGraphService, GraphNodeData } from './interfaces/graph-service.interface';
import { MEMORY_CONFIG } from './constants/memory.constants';

/**
 * Performance Benchmark Tests
 * 
 * These tests verify that the new adapter pattern implementation maintains
 * performance characteristics and adds minimal overhead compared to direct
 * database service usage.
 * 
 * User Requirement: "< 5% performance overhead requirement"
 */

describe('Performance Benchmarks - Adapter Pattern vs Direct Usage', () => {
  let vectorAdapter: ChromaVectorAdapter;
  let graphAdapter: Neo4jGraphAdapter;
  let mockChromaDB: any;
  let mockNeo4j: any;

  const mockConfig = {
    chromadb: { host: 'localhost', port: 8000 },
    neo4j: { database: 'neo4j' }
  };

  beforeEach(async () => {
    // Create optimized mocks that simulate real database operations
    mockChromaDB = {
      addDocuments: jest.fn().mockImplementation(() => {
        // Simulate ChromaDB processing time
        return new Promise(resolve => setTimeout(resolve, 1));
      }),
      searchDocuments: jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve({
          ids: [['doc1']],
          documents: [['content']],
          metadatas: [[{}]],
          distances: [[0.1]]
        }), 2));
      }),
      deleteDocuments: jest.fn().mockResolvedValue(undefined),
      getDocuments: jest.fn().mockResolvedValue({
        ids: ['doc1'],
        documents: ['content'],
        metadatas: [{}]
      })
    };

    mockNeo4j = {
      run: jest.fn().mockImplementation((query: string) => {
        // Simulate Neo4j processing time based on query complexity
        const delay = query.length > 100 ? 5 : 2;
        return new Promise(resolve => setTimeout(() => resolve({
          records: [{ get: jest.fn().mockReturnValue('test-id') }],
          summary: {}
        }), delay));
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChromaVectorAdapter,
        Neo4jGraphAdapter,
        { provide: 'ChromaDBService', useValue: mockChromaDB },
        { provide: 'Neo4jService', useValue: mockNeo4j },
        { provide: MEMORY_CONFIG, useValue: mockConfig },
      ],
    }).compile();

    vectorAdapter = module.get<ChromaVectorAdapter>(ChromaVectorAdapter);
    graphAdapter = module.get<Neo4jGraphAdapter>(Neo4jGraphAdapter);

    // Suppress logging for benchmarks
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });

  describe('Vector Operations Performance', () => {
    const testData: VectorStoreData = {
      document: 'This is a test document for performance benchmarking',
      metadata: { category: 'benchmark', iteration: 1 }
    };

    it('should add minimal overhead to single store operations', async () => {
      const iterations = 1000;
      
      // Benchmark direct mock usage (baseline)
      const directStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await mockChromaDB.addDocuments('test', [{ ...testData, id: `direct_${i}` }]);
      }
      const directEnd = performance.now();
      const directTime = directEnd - directStart;

      // Benchmark adapter usage
      const adapterStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await vectorAdapter.store('test', { ...testData, id: `adapter_${i}` });
      }
      const adapterEnd = performance.now();
      const adapterTime = adapterEnd - adapterStart;

      // Calculate overhead
      const overhead = ((adapterTime - directTime) / directTime) * 100;
      
      console.log(`Vector Store Performance:
        Direct: ${directTime.toFixed(2)}ms (${(directTime/iterations).toFixed(3)}ms per op)
        Adapter: ${adapterTime.toFixed(2)}ms (${(adapterTime/iterations).toFixed(3)}ms per op)
        Overhead: ${overhead.toFixed(2)}%
      `);

      // Requirement: < 5% overhead
      expect(overhead).toBeLessThan(5);
    });

    it('should maintain batch operation efficiency', async () => {
      const batchSize = 100;
      const batchData = Array.from({ length: batchSize }, (_, i) => ({
        ...testData,
        id: `batch_${i}`,
        document: `Batch document ${i} for performance testing`
      }));

      // Direct batch operation
      const directStart = performance.now();
      await mockChromaDB.addDocuments('test', batchData);
      const directEnd = performance.now();
      const directTime = directEnd - directStart;

      // Adapter batch operation
      const adapterStart = performance.now();
      await vectorAdapter.storeBatch('test', batchData);
      const adapterEnd = performance.now();
      const adapterTime = adapterEnd - adapterStart;

      const overhead = ((adapterTime - directTime) / directTime) * 100;
      
      console.log(`Vector Batch Performance:
        Direct: ${directTime.toFixed(2)}ms
        Adapter: ${adapterTime.toFixed(2)}ms  
        Overhead: ${overhead.toFixed(2)}%
      `);

      expect(overhead).toBeLessThan(5);
    });

    it('should maintain search operation performance', async () => {
      const iterations = 500;
      const searchQuery = { queryText: 'performance test query' };

      // Direct search operations
      const directStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await mockChromaDB.searchDocuments('test', [searchQuery.queryText], undefined, {});
      }
      const directEnd = performance.now();
      const directTime = directEnd - directStart;

      // Adapter search operations
      const adapterStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await vectorAdapter.search('test', searchQuery);
      }
      const adapterEnd = performance.now();
      const adapterTime = adapterEnd - adapterStart;

      const overhead = ((adapterTime - directTime) / directTime) * 100;
      
      console.log(`Vector Search Performance:
        Direct: ${directTime.toFixed(2)}ms (${(directTime/iterations).toFixed(3)}ms per op)
        Adapter: ${adapterTime.toFixed(2)}ms (${(adapterTime/iterations).toFixed(3)}ms per op)
        Overhead: ${overhead.toFixed(2)}%
      `);

      expect(overhead).toBeLessThan(5);
    });
  });

  describe('Graph Operations Performance', () => {
    const testNodeData: GraphNodeData = {
      labels: ['BenchmarkNode'],
      properties: { 
        name: 'Performance Test Node',
        created: new Date().toISOString(),
        index: 1
      }
    };

    it('should add minimal overhead to node creation', async () => {
      const iterations = 500;
      
      // Direct Cypher execution (baseline)
      const directStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await mockNeo4j.run(
          'CREATE (n:BenchmarkNode {id: $id}) SET n += $properties RETURN n.id',
          { id: `direct_${i}`, properties: testNodeData.properties }
        );
      }
      const directEnd = performance.now();
      const directTime = directEnd - directStart;

      // Adapter node creation
      const adapterStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await graphAdapter.createNode({
          ...testNodeData,
          id: `adapter_${i}`
        });
      }
      const adapterEnd = performance.now();
      const adapterTime = adapterEnd - adapterStart;

      const overhead = ((adapterTime - directTime) / directTime) * 100;
      
      console.log(`Graph Node Creation Performance:
        Direct: ${directTime.toFixed(2)}ms (${(directTime/iterations).toFixed(3)}ms per op)
        Adapter: ${adapterTime.toFixed(2)}ms (${(adapterTime/iterations).toFixed(3)}ms per op)
        Overhead: ${overhead.toFixed(2)}%
      `);

      expect(overhead).toBeLessThan(5);
    });

    it('should maintain relationship creation efficiency', async () => {
      const iterations = 300;
      
      // Direct relationship creation
      const directStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await mockNeo4j.run(
          'MATCH (from {id: $fromId}), (to {id: $toId}) CREATE (from)-[r:CONNECTS_TO {id: $relId}]->(to) RETURN r.id',
          { fromId: 'node1', toId: 'node2', relId: `direct_rel_${i}` }
        );
      }
      const directEnd = performance.now();
      const directTime = directEnd - directStart;

      // Adapter relationship creation
      const adapterStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await graphAdapter.createRelationship('node1', 'node2', {
          type: 'CONNECTS_TO',
          properties: { created: new Date().toISOString(), index: i }
        });
      }
      const adapterEnd = performance.now();
      const adapterTime = adapterEnd - adapterStart;

      const overhead = ((adapterTime - directTime) / directTime) * 100;
      
      console.log(`Graph Relationship Creation Performance:
        Direct: ${directTime.toFixed(2)}ms (${(directTime/iterations).toFixed(3)}ms per op)
        Adapter: ${adapterTime.toFixed(2)}ms (${(adapterTime/iterations).toFixed(3)}ms per op)
        Overhead: ${overhead.toFixed(2)}%
      `);

      expect(overhead).toBeLessThan(5);
    });

    it('should maintain Cypher query execution performance', async () => {
      const iterations = 200;
      const complexQuery = `
        MATCH (n:BenchmarkNode)-[r:CONNECTS_TO]->(m:BenchmarkNode)
        WHERE n.index > 100 AND m.active = true
        RETURN n, r, m
        ORDER BY n.created DESC
        LIMIT 50
      `;

      // Direct Cypher execution
      const directStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await mockNeo4j.run(complexQuery, { threshold: i });
      }
      const directEnd = performance.now();
      const directTime = directEnd - directStart;

      // Adapter Cypher execution
      const adapterStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await graphAdapter.executeCypher(complexQuery, { threshold: i });
      }
      const adapterEnd = performance.now();
      const adapterTime = adapterEnd - adapterStart;

      const overhead = ((adapterTime - directTime) / directTime) * 100;
      
      console.log(`Graph Cypher Execution Performance:
        Direct: ${directTime.toFixed(2)}ms (${(directTime/iterations).toFixed(3)}ms per op)
        Adapter: ${adapterTime.toFixed(2)}ms (${(adapterTime/iterations).toFixed(3)}ms per op)
        Overhead: ${overhead.toFixed(2)}%
      `);

      expect(overhead).toBeLessThan(5);
    });
  });

  describe('Memory Usage Analysis', () => {
    it('should not significantly increase memory footprint', async () => {
      const getMemoryUsage = () => {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          return process.memoryUsage().heapUsed;
        }
        return 0; // Fallback for browser environments
      };

      // Baseline memory usage
      const baselineMemory = getMemoryUsage();
      
      // Create many adapter instances to test memory impact
      const adapters: (IVectorService | IGraphService)[] = [];
      for (let i = 0; i < 100; i++) {
        const module = await Test.createTestingModule({
          providers: [
            ChromaVectorAdapter,
            Neo4jGraphAdapter,
            { provide: 'ChromaDBService', useValue: mockChromaDB },
            { provide: 'Neo4jService', useValue: mockNeo4j },
            { provide: MEMORY_CONFIG, useValue: mockConfig },
          ],
        }).compile();

        adapters.push(module.get<ChromaVectorAdapter>(ChromaVectorAdapter));
        adapters.push(module.get<Neo4jGraphAdapter>(Neo4jGraphAdapter));
      }

      // Measure memory after adapter creation
      const adapterMemory = getMemoryUsage();
      const memoryIncrease = ((adapterMemory - baselineMemory) / baselineMemory) * 100;

      console.log(`Memory Usage Analysis:
        Baseline: ${(baselineMemory / 1024 / 1024).toFixed(2)} MB
        With Adapters: ${(adapterMemory / 1024 / 1024).toFixed(2)} MB
        Increase: ${memoryIncrease.toFixed(2)}%
      `);

      // Should not increase memory by more than 5%
      expect(memoryIncrease).toBeLessThan(5);

      // Cleanup
      adapters.length = 0;
    });

    it('should handle garbage collection efficiently', async () => {
      const performOperationsAndCleanup = async () => {
        const tempAdapters = [];
        
        for (let i = 0; i < 50; i++) {
          const module = await Test.createTestingModule({
            providers: [
              ChromaVectorAdapter,
              { provide: 'ChromaDBService', useValue: mockChromaDB },
              { provide: MEMORY_CONFIG, useValue: mockConfig },
            ],
          }).compile();

          const adapter = module.get<ChromaVectorAdapter>(ChromaVectorAdapter);
          tempAdapters.push(adapter);

          // Perform operations
          await adapter.store('gc-test', {
            document: `GC test document ${i}`,
            metadata: { iteration: i }
          });
        }

        return tempAdapters;
      };

      const getMemoryUsage = () => {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          return process.memoryUsage().heapUsed;
        }
        return 0;
      };

      const initialMemory = getMemoryUsage();

      // Create and use many adapters
      let adapters = await performOperationsAndCleanup();
      const peakMemory = getMemoryUsage();

      // Release references
      adapters.length = 0;
      adapters = [];

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for GC
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = getMemoryUsage();

      const memoryLeakPercentage = ((finalMemory - initialMemory) / initialMemory) * 100;

      console.log(`Garbage Collection Analysis:
        Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB
        Peak: ${(peakMemory / 1024 / 1024).toFixed(2)} MB
        Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
        Potential Leak: ${memoryLeakPercentage.toFixed(2)}%
      `);

      // Should not have significant memory leaks (< 2%)
      expect(memoryLeakPercentage).toBeLessThan(2);
    });
  });

  describe('Concurrency Performance', () => {
    it('should handle concurrent vector operations efficiently', async () => {
      const concurrency = 50;
      const operationsPerWorker = 20;

      const vectorOperations = Array.from({ length: concurrency }, async (_, workerIndex) => {
        const operations = [];
        
        for (let i = 0; i < operationsPerWorker; i++) {
          operations.push(
            vectorAdapter.store('concurrent-test', {
              document: `Concurrent document worker-${workerIndex} operation-${i}`,
              metadata: { worker: workerIndex, operation: i }
            })
          );
        }

        return Promise.all(operations);
      });

      const start = performance.now();
      const results = await Promise.all(vectorOperations);
      const end = performance.now();

      const totalOperations = concurrency * operationsPerWorker;
      const totalTime = end - start;
      const opsPerSecond = (totalOperations / totalTime) * 1000;

      console.log(`Concurrent Vector Performance:
        Total Operations: ${totalOperations}
        Total Time: ${totalTime.toFixed(2)}ms
        Operations/Second: ${opsPerSecond.toFixed(0)}
        Average per Operation: ${(totalTime / totalOperations).toFixed(3)}ms
      `);

      // Verify all operations completed
      expect(results).toHaveLength(concurrency);
      results.forEach(workerResults => {
        expect(workerResults).toHaveLength(operationsPerWorker);
      });

      // Should handle reasonable throughput
      expect(opsPerSecond).toBeGreaterThan(1000);
    });

    it('should handle concurrent graph operations efficiently', async () => {
      const concurrency = 30;
      const operationsPerWorker = 10;

      const graphOperations = Array.from({ length: concurrency }, async (_, workerIndex) => {
        const operations = [];
        
        for (let i = 0; i < operationsPerWorker; i++) {
          operations.push(
            graphAdapter.createNode({
              labels: ['ConcurrentTest'],
              properties: { worker: workerIndex, operation: i, timestamp: Date.now() }
            })
          );
        }

        return Promise.all(operations);
      });

      const start = performance.now();
      const results = await Promise.all(graphOperations);
      const end = performance.now();

      const totalOperations = concurrency * operationsPerWorker;
      const totalTime = end - start;
      const opsPerSecond = (totalOperations / totalTime) * 1000;

      console.log(`Concurrent Graph Performance:
        Total Operations: ${totalOperations}
        Total Time: ${totalTime.toFixed(2)}ms
        Operations/Second: ${opsPerSecond.toFixed(0)}
        Average per Operation: ${(totalTime / totalOperations).toFixed(3)}ms
      `);

      // Verify all operations completed
      expect(results).toHaveLength(concurrency);
      results.forEach(workerResults => {
        expect(workerResults).toHaveLength(operationsPerWorker);
      });

      // Should handle reasonable throughput
      expect(opsPerSecond).toBeGreaterThan(500);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle validation errors efficiently', async () => {
      const iterations = 1000;
      
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        try {
          await vectorAdapter.store('', { document: 'test' }); // Invalid collection
        } catch (error) {
          // Expected error
        }
        
        try {
          await graphAdapter.createNode({ labels: [], properties: {} }); // Invalid labels
        } catch (error) {
          // Expected error  
        }
      }
      
      const end = performance.now();
      const totalTime = end - start;
      const avgErrorTime = totalTime / (iterations * 2);

      console.log(`Error Handling Performance:
        Total Validation Errors: ${iterations * 2}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Error: ${avgErrorTime.toFixed(3)}ms
      `);

      // Error handling should be fast (< 0.1ms per error)
      expect(avgErrorTime).toBeLessThan(0.1);
    });

    it('should handle database errors efficiently', async () => {
      // Mock database errors
      mockChromaDB.addDocuments.mockRejectedValue(new Error('Database connection failed'));
      mockNeo4j.run.mockRejectedValue(new Error('Neo4j unavailable'));

      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        try {
          await vectorAdapter.store('test', { document: `test ${i}` });
        } catch (error) {
          // Expected database error
        }
        
        try {
          await graphAdapter.createNode({ labels: ['Test'], properties: { index: i } });
        } catch (error) {
          // Expected database error
        }
      }
      
      const end = performance.now();
      const totalTime = end - start;
      const avgErrorTime = totalTime / (iterations * 2);

      console.log(`Database Error Handling Performance:
        Total Database Errors: ${iterations * 2}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Error: ${avgErrorTime.toFixed(3)}ms
      `);

      // Database error wrapping should be efficient
      expect(avgErrorTime).toBeLessThan(1);
    });
  });
});