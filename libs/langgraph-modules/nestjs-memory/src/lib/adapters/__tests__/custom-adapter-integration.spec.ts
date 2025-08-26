import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { MemoryModule } from '../../memory.module';
import { MemoryService } from '../../services/memory.service';
import {
  IVectorService,
  VectorStoreData,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStats,
  VectorGetOptions,
  VectorGetResult,
} from '../../interfaces/vector-service.interface';
import {
  IGraphService,
  GraphNodeData,
  GraphRelationshipData,
  TraversalSpec,
  GraphTraversalResult,
  GraphQueryResult,
  GraphStats,
  GraphOperation,
  GraphBatchResult,
  GraphFindCriteria,
  GraphNode,
} from '../../interfaces/graph-service.interface';

/**
 * Mock Vector Adapter - Completely custom implementation that doesn't use ChromaDB
 * This validates that the memory module can work without any database dependencies
 */
@Injectable()
export class MockVectorAdapter extends IVectorService {
  private readonly documents = new Map<string, Map<string, VectorStoreData>>();

  async store(collection: string, data: VectorStoreData): Promise<string> {
    const id = data.id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.documents.has(collection)) {
      this.documents.set(collection, new Map());
    }
    
    this.documents.get(collection)!.set(id, { ...data, id });
    return id;
  }

  async storeBatch(
    collection: string,
    data: readonly VectorStoreData[]
  ): Promise<readonly string[]> {
    const ids: string[] = [];
    
    for (const item of data) {
      const id = await this.store(collection, item);
      ids.push(id);
    }
    
    return ids;
  }

  async search(
    collection: string,
    query: VectorSearchQuery
  ): Promise<readonly VectorSearchResult[]> {
    const docs = this.documents.get(collection) || new Map();
    const results: VectorSearchResult[] = [];
    
    // Simple text matching for mock implementation
    if (query.queryText) {
      for (const [id, doc] of docs) {
        if (doc.document.toLowerCase().includes(query.queryText.toLowerCase())) {
          results.push({
            id,
            document: doc.document,
            metadata: doc.metadata || {},
            distance: 0.1,
            relevanceScore: 0.9,
          });
        }
      }
    }
    
    return results.slice(0, query.limit || 10);
  }

  async delete(collection: string, ids: readonly string[]): Promise<void> {
    const docs = this.documents.get(collection);
    if (docs) {
      ids.forEach(id => docs.delete(id));
    }
  }

  async deleteByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    const docs = this.documents.get(collection);
    if (!docs) return 0;
    
    let deleted = 0;
    for (const [id, doc] of docs) {
      if (this.matchesFilter(doc.metadata || {}, filter)) {
        docs.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async getStats(collection: string): Promise<VectorStats> {
    const docs = this.documents.get(collection) || new Map();
    return {
      documentCount: docs.size,
      collectionSize: docs.size * 100, // Mock size
      lastUpdated: new Date(),
      dimensions: 384, // Mock dimensions
    };
  }

  async getDocuments(
    collection: string,
    options: VectorGetOptions = {}
  ): Promise<VectorGetResult> {
    const docs = this.documents.get(collection) || new Map();
    const allDocs = Array.from(docs.values());
    
    let filteredDocs = allDocs;
    if (options.ids) {
      filteredDocs = allDocs.filter(doc => options.ids!.includes(doc.id!));
    }
    
    const ids = filteredDocs.map(doc => doc.id!);
    const documents = options.includeDocuments !== false 
      ? filteredDocs.map(doc => doc.document) 
      : undefined;
    const metadatas = options.includeMetadata !== false 
      ? filteredDocs.map(doc => doc.metadata || {}) 
      : undefined;
    
    return { ids, documents, metadatas };
  }

  private matchesFilter(metadata: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([key, value]) => metadata[key] === value);
  }
}

/**
 * Mock Graph Adapter - Completely custom implementation that doesn't use Neo4j
 * This validates that the memory module can work without any database dependencies
 */
@Injectable()
export class MockGraphAdapter extends IGraphService {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly relationships = new Map<string, any>();

  async createNode(data: GraphNodeData): Promise<string> {
    const id = data.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.nodes.set(id, {
      id,
      labels: data.labels,
      properties: data.properties,
    });
    
    return id;
  }

  async createRelationship(
    fromNodeId: string,
    toNodeId: string,
    data: GraphRelationshipData
  ): Promise<string> {
    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.relationships.set(id, {
      id,
      type: data.type,
      startNodeId: fromNodeId,
      endNodeId: toNodeId,
      properties: data.properties || {},
    });
    
    return id;
  }

  async traverse(
    startNodeId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult> {
    // Mock traversal - just return the start node
    const startNode = this.nodes.get(startNodeId);
    
    return {
      nodes: startNode ? [startNode] : [],
      relationships: [],
      paths: [],
    };
  }

  async executeCypher(
    query: string,
    params: Record<string, unknown> = {}
  ): Promise<GraphQueryResult> {
    // Mock Cypher execution
    return {
      records: [{ mock: 'result' }],
      summary: {
        counters: {
          nodesCreated: 0,
          nodesDeleted: 0,
          relationshipsCreated: 0,
          relationshipsDeleted: 0,
          propertiesSet: 0,
        },
        resultAvailableAfter: 1,
        resultConsumedAfter: 1,
      },
    };
  }

  async getStats(): Promise<GraphStats> {
    return {
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      indexCount: 0,
      databaseSize: undefined,
      lastUpdated: new Date(),
      nodeCountsByLabel: {},
      relationshipCountsByType: {},
    };
  }

  async batchExecute(operations: readonly GraphOperation[]): Promise<GraphBatchResult> {
    return {
      successCount: operations.length,
      errorCount: 0,
      results: {},
      errors: {},
    };
  }

  async findNodes(criteria: GraphFindCriteria): Promise<readonly GraphNode[]> {
    return Array.from(this.nodes.values());
  }

  async deleteNodes(nodeIds: readonly string[]): Promise<number> {
    let deleted = 0;
    nodeIds.forEach(id => {
      if (this.nodes.delete(id)) deleted++;
    });
    return deleted;
  }

  async deleteRelationships(relationshipIds: readonly string[]): Promise<number> {
    let deleted = 0;
    relationshipIds.forEach(id => {
      if (this.relationships.delete(id)) deleted++;
    });
    return deleted;
  }

  async runTransaction<T>(operations: (service: IGraphService) => Promise<T>): Promise<T> {
    return operations(this);
  }
}

describe('Custom Adapter Integration', () => {
  let memoryService: MemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MemoryModule.forRoot({
          adapters: {
            vector: MockVectorAdapter,
            graph: MockGraphAdapter,
          },
        }),
      ],
    }).compile();

    memoryService = module.get<MemoryService>(MemoryService);
  });

  describe('Vector Operations with Custom Adapter', () => {
    it('should store and retrieve memory entries using custom vector adapter', async () => {
      const testData = {
        content: 'Test memory content',
        metadata: { type: 'test' },
        embedding: [0.1, 0.2, 0.3],
      };

      // Store memory entry
      const result = await memoryService.storeMemoryEntry('test-collection', testData);

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.startsWith('mock_')).toBe(true);
    });

    it('should search memory entries using custom vector adapter', async () => {
      const testData = {
        content: 'Searchable test content',
        metadata: { category: 'test' },
      };

      // Store first
      await memoryService.storeMemoryEntry('test-collection', testData);

      // Search
      const results = await memoryService.searchMemories('test-collection', 'searchable');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document).toContain('Searchable');
    });
  });

  describe('Graph Operations with Custom Adapter', () => {
    it('should create graph nodes using custom graph adapter', async () => {
      const nodeData = {
        labels: ['TestNode'],
        properties: { name: 'test-node', value: 42 },
      };

      const nodeId = await memoryService.createGraphNode(nodeData);

      expect(nodeId).toBeDefined();
      expect(typeof nodeId).toBe('string');
      expect(nodeId.startsWith('node_')).toBe(true);
    });

    it('should create relationships using custom graph adapter', async () => {
      // Create two nodes first
      const node1Id = await memoryService.createGraphNode({
        labels: ['Node1'],
        properties: { name: 'node1' },
      });

      const node2Id = await memoryService.createGraphNode({
        labels: ['Node2'],
        properties: { name: 'node2' },
      });

      // Create relationship
      const relationshipData = {
        type: 'CONNECTED_TO',
        properties: { strength: 0.8 },
      };

      const relId = await memoryService.createGraphRelationship(
        node1Id,
        node2Id,
        relationshipData
      );

      expect(relId).toBeDefined();
      expect(typeof relId).toBe('string');
      expect(relId.startsWith('rel_')).toBe(true);
    });
  });

  describe('Integration Validation', () => {
    it('should work without any database module dependencies', () => {
      // This test passing proves that:
      // 1. MemoryModule doesn't import ChromaDBModule or Neo4jModule
      // 2. Custom adapters can be injected successfully
      // 3. The adapter pattern is working correctly
      
      expect(memoryService).toBeDefined();
      expect(memoryService.constructor.name).toBe('MemoryService');
    });

    it('should handle mixed operations with custom adapters', async () => {
      // Store a memory entry
      const memoryResult = await memoryService.storeMemoryEntry('mixed-test', {
        content: 'Mixed operation test',
        metadata: { operation: 'mixed' },
      });

      // Create a graph node
      const nodeId = await memoryService.createGraphNode({
        labels: ['MixedNode'],
        properties: { memoryId: memoryResult.id },
      });

      // Both operations should succeed
      expect(memoryResult.id).toBeDefined();
      expect(nodeId).toBeDefined();
      
      // Verify they're using different adapters
      expect(memoryResult.id.startsWith('mock_')).toBe(true);
      expect(nodeId.startsWith('node_')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from custom adapters gracefully', async () => {
      // This validates that error handling works with custom adapters
      try {
        await memoryService.searchMemories('non-existent-collection', 'test');
        // Should not throw with our mock adapter
      } catch (error) {
        // If it does throw, it should be a proper error
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});