import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';

import { MemoryModule } from './memory.module';
import { MemoryService } from './services/memory.service';
import { MemoryStorageService } from './services/memory-storage.service';
import { MemoryGraphService } from './services/memory-graph.service';
import { IVectorService, VectorStoreData, VectorSearchQuery } from './interfaces/vector-service.interface';
import { IGraphService, GraphNodeData, GraphRelationshipData } from './interfaces/graph-service.interface';
import { MEMORY_CONFIG } from './constants/memory.constants';

/**
 * Requirement 4: Extensibility Framework Testing
 * 
 * This test suite verifies that custom adapters can be created and integrated
 * seamlessly with the memory module, demonstrating the extensibility framework.
 */

// ============================================================================
// CUSTOM ADAPTER IMPLEMENTATIONS FOR TESTING
// ============================================================================

/**
 * In-Memory Vector Adapter for Testing
 * Demonstrates how to create a custom adapter for testing scenarios
 */
@Injectable()
class InMemoryVectorAdapter extends IVectorService {
  private storage = new Map<string, Map<string, VectorStoreData & { id: string }>>();

  async store(collection: string, data: VectorStoreData): Promise<string> {
    this.validateCollection(collection);
    this.validateStoreData(data);

    if (!this.storage.has(collection)) {
      this.storage.set(collection, new Map());
    }

    const id = data.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.storage.get(collection)!.set(id, { ...data, id });

    return id;
  }

  async storeBatch(collection: string, data: readonly VectorStoreData[]): Promise<readonly string[]> {
    const ids: string[] = [];
    for (const item of data) {
      ids.push(await this.store(collection, item));
    }
    return ids;
  }

  async search(collection: string, query: VectorSearchQuery): Promise<readonly any[]> {
    this.validateCollection(collection);

    if (!query.queryText && !query.queryEmbedding) {
      throw new Error('Either queryText or queryEmbedding must be provided');
    }

    const docs = this.storage.get(collection);
    if (!docs) return [];

    // Simple text matching for demo (real implementation would use embeddings)
    const results: any[] = [];
    const queryText = query.queryText?.toLowerCase() || '';

    for (const [id, doc] of docs) {
      const content = doc.document.toLowerCase();
      let score = 0;

      if (queryText && content.includes(queryText)) {
        score = 1 - (content.indexOf(queryText) / content.length);
      }

      if (query.minScore && score < query.minScore) continue;

      if (query.filter) {
        const matchesFilter = Object.entries(query.filter).every(([key, value]) =>
          doc.metadata?.[key] === value
        );
        if (!matchesFilter) continue;
      }

      results.push({
        id,
        document: doc.document,
        metadata: doc.metadata,
        distance: 1 - score,
        relevanceScore: score
      });
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.limit || 10);
  }

  async delete(collection: string, ids: readonly string[]): Promise<void> {
    this.validateCollection(collection);
    this.validateIds(ids);

    const docs = this.storage.get(collection);
    if (!docs) return;

    for (const id of ids) {
      docs.delete(id);
    }
  }

  async deleteByFilter(collection: string, filter: Record<string, unknown>): Promise<number> {
    this.validateCollection(collection);

    const docs = this.storage.get(collection);
    if (!docs) return 0;

    let deletedCount = 0;
    for (const [id, doc] of docs) {
      const matchesFilter = Object.entries(filter).every(([key, value]) =>
        doc.metadata?.[key] === value
      );

      if (matchesFilter) {
        docs.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async getStats(collection: string): Promise<any> {
    this.validateCollection(collection);

    const docs = this.storage.get(collection);
    const documentCount = docs?.size || 0;

    return {
      documentCount,
      collectionSize: documentCount * 100, // Rough estimate
      lastUpdated: new Date(),
      dimensions: 384 // Mock embedding dimension
    };
  }

  async getDocuments(collection: string, options: any = {}): Promise<any> {
    this.validateCollection(collection);

    const docs = this.storage.get(collection);
    if (!docs) {
      return { ids: [], documents: [], metadatas: [] };
    }

    let entries = Array.from(docs.entries());

    // Apply filters
    if (options.ids) {
      entries = entries.filter(([id]) => options.ids.includes(id));
    }

    if (options.where) {
      entries = entries.filter(([, doc]) =>
        Object.entries(options.where).every(([key, value]) =>
          doc.metadata?.[key] === value
        )
      );
    }

    // Apply pagination
    if (options.offset) {
      entries = entries.slice(options.offset);
    }

    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    const ids = entries.map(([id]) => id);
    const documents = options.includeDocuments !== false 
      ? entries.map(([, doc]) => doc.document)
      : undefined;
    const metadatas = options.includeMetadata !== false
      ? entries.map(([, doc]) => doc.metadata || {})
      : undefined;

    return { ids, documents, metadatas };
  }
}

/**
 * In-Memory Graph Adapter for Testing
 * Demonstrates how to create a custom adapter for graph operations
 */
@Injectable()
class InMemoryGraphAdapter extends IGraphService {
  private nodes = new Map<string, any>();
  private relationships = new Map<string, any>();

  async createNode(data: GraphNodeData): Promise<string> {
    this.validateNodeData(data);

    const id = data.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.nodes.set(id, {
      id,
      labels: data.labels,
      properties: data.properties
    });

    return id;
  }

  async createRelationship(
    fromNodeId: string,
    toNodeId: string,
    data: GraphRelationshipData
  ): Promise<string> {
    this.validateNodeId(fromNodeId, 'fromNodeId');
    this.validateNodeId(toNodeId, 'toNodeId');
    this.validateRelationshipData(data);

    if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) {
      throw new Error('Both nodes must exist before creating relationship');
    }

    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.relationships.set(id, {
      id,
      type: data.type,
      startNodeId: fromNodeId,
      endNodeId: toNodeId,
      properties: data.properties || {}
    });

    return id;
  }

  async traverse(startNodeId: string, spec: any): Promise<any> {
    this.validateNodeId(startNodeId);

    if (!this.nodes.has(startNodeId)) {
      return { nodes: [], relationships: [], paths: [] };
    }

    const visited = new Set<string>();
    const foundNodes: any[] = [];
    const foundRelationships: any[] = [];
    const paths: any[] = [];

    const traverse = (currentId: string, depth: number, path: any[]) => {
      if (depth > (spec.depth || 1) || visited.has(currentId)) return;

      visited.add(currentId);
      const node = this.nodes.get(currentId);
      if (node) foundNodes.push(node);

      // Find relationships
      for (const [relId, rel] of this.relationships) {
        let nextNodeId: string | null = null;

        if (rel.startNodeId === currentId && (spec.direction !== 'IN')) {
          nextNodeId = rel.endNodeId;
        } else if (rel.endNodeId === currentId && (spec.direction !== 'OUT')) {
          nextNodeId = rel.startNodeId;
        }

        if (nextNodeId && !visited.has(nextNodeId)) {
          // Apply filters
          if (spec.relationshipTypes && !spec.relationshipTypes.includes(rel.type)) {
            continue;
          }

          const nextNode = this.nodes.get(nextNodeId);
          if (spec.nodeLabels && nextNode) {
            const hasMatchingLabel = spec.nodeLabels.some((label: string) => 
              nextNode.labels.includes(label)
            );
            if (!hasMatchingLabel) continue;
          }

          foundRelationships.push(rel);
          const newPath = [...path, rel, nextNode];
          paths.push({ nodes: newPath.filter(item => item.id?.startsWith('node_')), relationships: newPath.filter(item => item.id?.startsWith('rel_')), length: newPath.filter(item => item.id?.startsWith('rel_')).length });

          if (depth < (spec.depth || 1)) {
            traverse(nextNodeId, depth + 1, newPath);
          }
        }
      }
    };

    traverse(startNodeId, 0, [this.nodes.get(startNodeId)]);

    return {
      nodes: [...new Map(foundNodes.map(n => [n.id, n])).values()],
      relationships: [...new Map(foundRelationships.map(r => [r.id, r])).values()],
      paths: paths.slice(0, spec.limit || 100)
    };
  }

  async executeCypher(query: string, params?: Record<string, unknown>): Promise<any> {
    this.validateCypherQuery(query);

    // Mock Cypher execution - in real implementation, parse and execute query
    if (query.toLowerCase().includes('match (n) return n')) {
      return {
        records: Array.from(this.nodes.values()).map(node => ({ n: node })),
        summary: {
          counters: {
            nodesCreated: 0,
            nodesDeleted: 0,
            relationshipsCreated: 0,
            relationshipsDeleted: 0,
            propertiesSet: 0
          }
        }
      };
    }

    return { records: [] };
  }

  async getStats(): Promise<any> {
    const nodesByLabel: Record<string, number> = {};
    const relsByType: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      for (const label of node.labels) {
        nodesByLabel[label] = (nodesByLabel[label] || 0) + 1;
      }
    }

    for (const rel of this.relationships.values()) {
      relsByType[rel.type] = (relsByType[rel.type] || 0) + 1;
    }

    return {
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      indexCount: 0,
      lastUpdated: new Date(),
      nodeCountsByLabel: nodesByLabel,
      relationshipCountsByType: relsByType
    };
  }

  async batchExecute(operations: readonly any[]): Promise<any> {
    const results: Record<string, unknown> = {};
    const errors: Record<string, Error> = {};
    let successCount = 0;
    let errorCount = 0;

    for (const op of operations) {
      const opId = op.operationId || `op_${successCount + errorCount}`;
      
      try {
        let result: unknown;
        
        switch (op.type) {
          case 'CREATE_NODE':
            result = await this.createNode(op.data);
            break;
          case 'CREATE_RELATIONSHIP':
            result = await this.createRelationship(op.data.from, op.data.to, op.data.relationship);
            break;
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
        
        results[opId] = result;
        successCount++;
      } catch (error) {
        errors[opId] = error as Error;
        errorCount++;
      }
    }

    return { successCount, errorCount, results, errors };
  }

  async findNodes(criteria: any): Promise<readonly any[]> {
    let nodes = Array.from(this.nodes.values());

    if (criteria.labels) {
      nodes = nodes.filter(node =>
        criteria.labels.some((label: string) => node.labels.includes(label))
      );
    }

    if (criteria.properties) {
      nodes = nodes.filter(node =>
        Object.entries(criteria.properties).every(([key, value]) =>
          node.properties[key] === value
        )
      );
    }

    if (criteria.skip) {
      nodes = nodes.slice(criteria.skip);
    }

    if (criteria.limit) {
      nodes = nodes.slice(0, criteria.limit);
    }

    return nodes;
  }

  async deleteNodes(nodeIds: readonly string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const id of nodeIds) {
      if (this.nodes.has(id)) {
        this.nodes.delete(id);
        deletedCount++;
        
        // Also delete relationships involving this node
        for (const [relId, rel] of this.relationships) {
          if (rel.startNodeId === id || rel.endNodeId === id) {
            this.relationships.delete(relId);
          }
        }
      }
    }

    return deletedCount;
  }

  async deleteRelationships(relationshipIds: readonly string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const id of relationshipIds) {
      if (this.relationships.has(id)) {
        this.relationships.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async runTransaction<T>(operations: (service: IGraphService) => Promise<T>): Promise<T> {
    // In-memory implementation doesn't need actual transaction handling
    return operations(this);
  }
}

// ============================================================================
// EXTENSIBILITY TESTS
// ============================================================================

describe('Extensibility Framework - Requirement 4', () => {
  describe('Requirement 4.1: Custom Adapter Development', () => {
    it('should allow developers to implement IVectorService interface', () => {
      const adapter = new InMemoryVectorAdapter();

      // Verify it implements the interface correctly
      expect(adapter).toBeInstanceOf(IVectorService);
      expect(typeof adapter.store).toBe('function');
      expect(typeof adapter.storeBatch).toBe('function');
      expect(typeof adapter.search).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.getStats).toBe('function');
    });

    it('should allow developers to implement IGraphService interface', () => {
      const adapter = new InMemoryGraphAdapter();

      // Verify it implements the interface correctly
      expect(adapter).toBeInstanceOf(IGraphService);
      expect(typeof adapter.createNode).toBe('function');
      expect(typeof adapter.createRelationship).toBe('function');
      expect(typeof adapter.traverse).toBe('function');
      expect(typeof adapter.executeCypher).toBe('function');
      expect(typeof adapter.getStats).toBe('function');
    });

    it('should inherit validation methods from abstract base classes', async () => {
      const vectorAdapter = new InMemoryVectorAdapter();
      const graphAdapter = new InMemoryGraphAdapter();

      // Vector adapter validation
      await expect(vectorAdapter.store('', { document: 'test' }))
        .rejects.toThrow('Collection name is required');

      await expect(vectorAdapter.store('valid', { document: '' }))
        .rejects.toThrow('Document content is required');

      // Graph adapter validation
      await expect(graphAdapter.createNode({ labels: [], properties: {} }))
        .rejects.toThrow('Node must have at least one label');

      await expect(graphAdapter.createRelationship('', 'node2', { type: 'KNOWS' }))
        .rejects.toThrow('fromNodeId is required');
    });
  });

  describe('Requirement 4.2: Seamless Integration with Memory Services', () => {
    let moduleRef: TestingModule;
    let memoryService: MemoryService;
    let storageService: MemoryStorageService;
    let graphService: MemoryGraphService;

    beforeEach(async () => {
      // Mock external dependencies that the adapters might need
      const mockChromaDB = {};
      const mockNeo4j = {};

      const testModule = await Test.createTestingModule({
        imports: [
          MemoryModule.forRoot({
            adapters: {
              vector: InMemoryVectorAdapter,
              graph: InMemoryGraphAdapter
            }
          })
        ],
      })
        .overrideProvider('ChromaDBService')
        .useValue(mockChromaDB)
        .overrideProvider('Neo4jService')
        .useValue(mockNeo4j)
        .compile();

      moduleRef = testModule;
      memoryService = testModule.get<MemoryService>(MemoryService);
      storageService = testModule.get<MemoryStorageService>(MemoryStorageService);
      graphService = testModule.get<MemoryGraphService>(MemoryGraphService);
    });

    afterEach(async () => {
      if (moduleRef) {
        await moduleRef.close();
      }
    });

    it('should inject custom adapters into memory services', () => {
      expect(memoryService).toBeDefined();
      expect(storageService).toBeDefined();
      expect(graphService).toBeDefined();

      // Services should be properly instantiated
      expect(memoryService).toBeInstanceOf(MemoryService);
      expect(storageService).toBeInstanceOf(MemoryStorageService);
      expect(graphService).toBeInstanceOf(MemoryGraphService);
    });

    it('should use custom vector adapter for storage operations', async () => {
      // Test that storage service uses our custom in-memory adapter
      const testData = {
        document: 'This is a test document for custom adapter',
        metadata: { category: 'test', custom: true }
      };

      // This should use InMemoryVectorAdapter.store()
      const result = await storageService.storeMemoryEntry('test-collection', testData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^mem_\d+_[a-z0-9]+$/); // Our custom ID format

      // Verify we can retrieve it
      const stats = await storageService.getCollectionStats('test-collection');
      expect(stats.documentCount).toBe(1);
    });

    it('should use custom graph adapter for relationship operations', async () => {
      // Test that graph service uses our custom in-memory adapter
      const nodeData = {
        labels: ['TestNode', 'CustomAdapter'],
        properties: { name: 'Custom Node', test: true }
      };

      // This should use InMemoryGraphAdapter.createNode()
      const nodeId = await graphService.trackMemoryEntry('user123', nodeData);

      expect(nodeId).toBeDefined();
      expect(typeof nodeId).toBe('string');
      expect(nodeId).toMatch(/^node_\d+_[a-z0-9]+$/); // Our custom ID format

      // Verify stats
      const stats = await graphService.getGraphStats();
      expect(stats.nodeCount).toBe(1);
      expect(stats.nodeCountsByLabel?.['TestNode']).toBe(1);
    });

    it('should maintain functional compatibility with existing API', async () => {
      // Test that all existing memory service operations still work
      // but now use custom adapters

      // Vector operations
      const vectorData = { document: 'Test document', metadata: { type: 'test' } };
      const vectorId = await storageService.storeMemoryEntry('test', vectorData);
      
      const searchResults = await storageService.searchSimilar('test', 'Test');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].id).toBe(vectorId);

      // Graph operations  
      const graphData = { labels: ['Memory'], properties: { content: 'test' } };
      const graphId = await graphService.trackMemoryEntry('user1', graphData);
      
      const connections = await graphService.getConnections(graphId, { depth: 1 });
      expect(connections).toBeDefined();
    });
  });

  describe('Requirement 4.3: Adapter Selection Strategies', () => {
    it('should support environment-based adapter selection', () => {
      // Simulate different environments
      const testEnvOptions = {
        adapters: {
          vector: InMemoryVectorAdapter, // Fast for testing
          graph: InMemoryGraphAdapter
        }
      };

      const productionEnvOptions = {
        // Would use default ChromaDB/Neo4j adapters
      };

      // Both configurations should be valid
      expect(() => MemoryModule.forRoot(testEnvOptions)).not.toThrow();
      expect(() => MemoryModule.forRoot(productionEnvOptions)).not.toThrow();
    });

    it('should support feature-based adapter selection', () => {
      // Different adapters for different features
      class AdvancedVectorAdapter extends IVectorService {
        // Implement with advanced features like hybrid search
        async store() { return 'advanced-id'; }
        async storeBatch() { return []; }
        async search() { return []; }
        async delete() { }
        async deleteByFilter() { return 0; }
        async getStats() { return { documentCount: 0, collectionSize: 0, lastUpdated: new Date() }; }
        async getDocuments() { return { ids: [] }; }
      }

      const advancedOptions = {
        adapters: {
          vector: AdvancedVectorAdapter
        }
      };

      expect(() => MemoryModule.forRoot(advancedOptions)).not.toThrow();
    });

    it('should support mixed adapter strategies', () => {
      // Use custom vector adapter but default graph adapter
      const mixedOptions = {
        adapters: {
          vector: InMemoryVectorAdapter
          // graph: default Neo4j adapter
        }
      };

      expect(() => MemoryModule.forRoot(mixedOptions)).not.toThrow();

      // Use custom graph adapter but default vector adapter  
      const mixedOptions2 = {
        adapters: {
          // vector: default ChromaDB adapter
          graph: InMemoryGraphAdapter
        }
      };

      expect(() => MemoryModule.forRoot(mixedOptions2)).not.toThrow();
    });
  });

  describe('Requirement 4.4: Performance and Scalability', () => {
    let customVectorAdapter: InMemoryVectorAdapter;
    let customGraphAdapter: InMemoryGraphAdapter;

    beforeEach(() => {
      customVectorAdapter = new InMemoryVectorAdapter();
      customGraphAdapter = new InMemoryGraphAdapter();
    });

    it('should handle large volumes of data efficiently', async () => {
      const batchSize = 1000;
      const documents = Array.from({ length: batchSize }, (_, i) => ({
        document: `Document ${i} with content for testing batch operations`,
        metadata: { index: i, batch: 'test' }
      }));

      const start = performance.now();
      const ids = await customVectorAdapter.storeBatch('performance-test', documents);
      const end = performance.now();

      expect(ids).toHaveLength(batchSize);
      expect(end - start).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should support concurrent operations', async () => {
      const concurrentOps = Array.from({ length: 100 }, (_, i) =>
        customVectorAdapter.store('concurrent-test', {
          document: `Concurrent document ${i}`,
          metadata: { thread: i }
        })
      );

      const results = await Promise.all(concurrentOps);
      expect(results).toHaveLength(100);
      expect(new Set(results).size).toBe(100); // All IDs should be unique
    });

    it('should optimize graph traversal operations', async () => {
      // Create a connected graph
      const nodeIds: string[] = [];
      
      // Create nodes
      for (let i = 0; i < 50; i++) {
        const id = await customGraphAdapter.createNode({
          labels: ['TestNode'],
          properties: { index: i }
        });
        nodeIds.push(id);
      }

      // Create relationships (chain)
      for (let i = 0; i < nodeIds.length - 1; i++) {
        await customGraphAdapter.createRelationship(nodeIds[i], nodeIds[i + 1], {
          type: 'CONNECTS_TO',
          properties: { order: i }
        });
      }

      // Test traversal performance
      const start = performance.now();
      const result = await customGraphAdapter.traverse(nodeIds[0], {
        depth: 10,
        direction: 'OUT'
      });
      const end = performance.now();

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.relationships.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should be fast for small graph
    });
  });

  describe('Requirement 4.5: Error Handling and Resilience', () => {
    it('should handle adapter-specific errors gracefully', async () => {
      const faultyAdapter = new InMemoryVectorAdapter();
      
      // Override a method to simulate failures
      jest.spyOn(faultyAdapter, 'store').mockRejectedValue(
        new Error('Simulated adapter failure')
      );

      await expect(faultyAdapter.store('test', { document: 'test' }))
        .rejects.toThrow('Simulated adapter failure');
    });

    it('should provide meaningful error messages', async () => {
      const adapter = new InMemoryVectorAdapter();

      // Test various error conditions
      await expect(adapter.store('', { document: 'test' }))
        .rejects.toThrow(/Collection name is required/);

      await expect(adapter.store('test', { document: '' }))
        .rejects.toThrow(/Document content is required/);

      await expect(adapter.delete('test', []))
        .rejects.toThrow(/Document IDs array is required/);
    });

    it('should handle resource cleanup properly', async () => {
      const adapter = new InMemoryVectorAdapter();
      
      // Store some data
      await adapter.store('cleanup-test', { document: 'test data' });
      
      // Delete by filter should clean up properly
      const deleted = await adapter.deleteByFilter('cleanup-test', {});
      expect(deleted).toBe(1);

      // Verify cleanup
      const stats = await adapter.getStats('cleanup-test');
      expect(stats.documentCount).toBe(0);
    });
  });

  describe('Requirement 4.6: Documentation and Examples', () => {
    it('should provide clear interface contracts', () => {
      // These tests serve as examples of how to implement custom adapters

      class ExampleVectorAdapter extends IVectorService {
        async store(collection: string, data: VectorStoreData): Promise<string> {
          // Step 1: Validate inputs using inherited methods
          this.validateCollection(collection);
          this.validateStoreData(data);

          // Step 2: Implement your storage logic
          const id = data.id || 'custom-id';
          // ... custom storage implementation
          
          return id;
        }

        async storeBatch(collection: string, data: readonly VectorStoreData[]): Promise<readonly string[]> {
          // Implement batch storage
          return [];
        }

        async search(collection: string, query: VectorSearchQuery): Promise<readonly any[]> {
          // Implement search logic
          return [];
        }

        async delete(collection: string, ids: readonly string[]): Promise<void> {
          // Implement deletion
        }

        async deleteByFilter(collection: string, filter: Record<string, unknown>): Promise<number> {
          return 0;
        }

        async getStats(collection: string): Promise<any> {
          return { documentCount: 0, collectionSize: 0, lastUpdated: new Date() };
        }

        async getDocuments(collection: string, options?: any): Promise<any> {
          return { ids: [] };
        }
      }

      const example = new ExampleVectorAdapter();
      expect(example).toBeInstanceOf(IVectorService);
    });

    it('should demonstrate module registration patterns', () => {
      // Example 1: Using custom adapter class
      const classBasedConfig = {
        adapters: {
          vector: InMemoryVectorAdapter,
          graph: InMemoryGraphAdapter
        }
      };

      // Example 2: Using custom adapter instance
      const instanceBasedConfig = {
        adapters: {
          vector: new InMemoryVectorAdapter(),
          graph: new InMemoryGraphAdapter()
        }
      };

      // Both should work
      expect(() => MemoryModule.forRoot(classBasedConfig)).not.toThrow();
      expect(() => MemoryModule.forRoot(instanceBasedConfig)).not.toThrow();
    });
  });
});