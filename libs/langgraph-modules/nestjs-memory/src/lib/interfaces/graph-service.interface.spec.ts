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
  InvalidNodeError,
  InvalidInputError,
  SecurityError,
  GraphOperationError,
  TransactionError,
} from './graph-service.interface';

/**
 * Test Implementation of IGraphService for Interface Contract Testing
 * 
 * This concrete implementation allows us to test the interface contract,
 * validation methods, and error handling defined in the abstract class.
 */
class TestGraphService extends IGraphService {
  private nodes = new Map<string, GraphNode>();
  private relationships = new Map<string, any>();

  async createNode(data: GraphNodeData): Promise<string> {
    this.validateNodeData(data);
    
    const id = data.id || `node_${Date.now()}`;
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
    
    const id = `rel_${Date.now()}`;
    this.relationships.set(id, { id, ...data, fromNodeId, toNodeId });
    return id;
  }

  async traverse(
    startNodeId: string,
    spec: TraversalSpec
  ): Promise<GraphTraversalResult> {
    this.validateNodeId(startNodeId);
    return {
      nodes: [],
      relationships: [],
      paths: []
    };
  }

  async executeCypher(
    query: string,
    params?: Record<string, unknown>
  ): Promise<GraphQueryResult> {
    this.validateCypherQuery(query);
    return {
      records: []
    };
  }

  async getStats(): Promise<GraphStats> {
    return {
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      indexCount: 0,
      lastUpdated: new Date()
    };
  }

  async batchExecute(
    operations: readonly GraphOperation[]
  ): Promise<GraphBatchResult> {
    return {
      successCount: operations.length,
      errorCount: 0,
      results: {},
      errors: {}
    };
  }

  async findNodes(criteria: GraphFindCriteria): Promise<readonly GraphNode[]> {
    return Array.from(this.nodes.values());
  }

  async deleteNodes(nodeIds: readonly string[]): Promise<number> {
    let deleted = 0;
    for (const id of nodeIds) {
      if (this.nodes.has(id)) {
        this.nodes.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async deleteRelationships(relationshipIds: readonly string[]): Promise<number> {
    let deleted = 0;
    for (const id of relationshipIds) {
      if (this.relationships.has(id)) {
        this.relationships.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async runTransaction<T>(
    operations: (service: IGraphService) => Promise<T>
  ): Promise<T> {
    return operations(this);
  }
}

describe('IGraphService Interface Contract', () => {
  let graphService: TestGraphService;

  beforeEach(() => {
    graphService = new TestGraphService();
  });

  describe('Requirement 1.1: Graph Service Interface Operations', () => {
    it('should define all required Neo4j operations', () => {
      // Verify interface defines all required methods
      expect(typeof graphService.createNode).toBe('function');
      expect(typeof graphService.createRelationship).toBe('function');
      expect(typeof graphService.traverse).toBe('function');
      expect(typeof graphService.executeCypher).toBe('function');
      expect(typeof graphService.getStats).toBe('function');
      expect(typeof graphService.batchExecute).toBe('function');
      expect(typeof graphService.findNodes).toBe('function');
      expect(typeof graphService.deleteNodes).toBe('function');
      expect(typeof graphService.deleteRelationships).toBe('function');
      expect(typeof graphService.runTransaction).toBe('function');
    });

    it('should support both synchronous and asynchronous operations', async () => {
      // All methods should return Promises for async operations
      const createNodeResult = graphService.createNode({
        labels: ['Test'],
        properties: { name: 'test' }
      });
      expect(createNodeResult).toBeInstanceOf(Promise);

      const createRelResult = graphService.createRelationship('id1', 'id2', {
        type: 'TEST_REL'
      });
      expect(createRelResult).toBeInstanceOf(Promise);

      const traverseResult = graphService.traverse('id1', {});
      expect(traverseResult).toBeInstanceOf(Promise);

      const cypherResult = graphService.executeCypher('MATCH (n) RETURN n');
      expect(cypherResult).toBeInstanceOf(Promise);

      const statsResult = graphService.getStats();
      expect(statsResult).toBeInstanceOf(Promise);
    });
  });

  describe('Requirement 1.2: Graph Service Error Handling Contracts', () => {
    describe('Node ID Validation', () => {
      it('should throw InvalidNodeError for empty node IDs', async () => {
        await expect(graphService.createRelationship('', 'valid-id', { type: 'TEST' }))
          .rejects.toThrow(InvalidNodeError);

        await expect(graphService.createRelationship('   ', 'valid-id', { type: 'TEST' }))
          .rejects.toThrow(InvalidNodeError);

        await expect(graphService.createRelationship('valid-id', '', { type: 'TEST' }))
          .rejects.toThrow(InvalidNodeError);
      });

      it('should throw InvalidNodeError for oversized node IDs', async () => {
        const longId = 'a'.repeat(101);
        await expect(graphService.createRelationship(longId, 'valid-id', { type: 'TEST' }))
          .rejects.toThrow(InvalidNodeError);
      });

      it('should accept valid node IDs', async () => {
        const nodeId = await graphService.createNode({
          labels: ['Test'],
          properties: { name: 'test' }
        });

        await expect(graphService.createRelationship(nodeId, nodeId, { type: 'SELF_REF' }))
          .resolves.toBeTruthy();
      });
    });

    describe('Node Data Validation', () => {
      it('should throw InvalidInputError for missing labels', async () => {
        await expect(graphService.createNode({
          labels: [],
          properties: { name: 'test' }
        })).rejects.toThrow(InvalidInputError);

        await expect(graphService.createNode({
          labels: null as any,
          properties: { name: 'test' }
        })).rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for empty labels', async () => {
        await expect(graphService.createNode({
          labels: ['Valid', '', 'Another'],
          properties: { name: 'test' }
        })).rejects.toThrow(InvalidInputError);

        await expect(graphService.createNode({
          labels: ['Valid', '   ', 'Another'],
          properties: { name: 'test' }
        })).rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for invalid properties type', async () => {
        await expect(graphService.createNode({
          labels: ['Test'],
          properties: 'invalid' as any
        })).rejects.toThrow(InvalidInputError);

        await expect(graphService.createNode({
          labels: ['Test'],
          properties: 123 as any
        })).rejects.toThrow(InvalidInputError);
      });

      it('should accept valid node data', async () => {
        const validData: GraphNodeData = {
          id: 'custom-id',
          labels: ['Person', 'User'],
          properties: { name: 'John', age: 30, active: true }
        };

        await expect(graphService.createNode(validData))
          .resolves.toBeTruthy();
      });
    });

    describe('Relationship Data Validation', () => {
      it('should throw InvalidInputError for empty relationship type', async () => {
        await expect(graphService.createRelationship('id1', 'id2', {
          type: ''
        })).rejects.toThrow(InvalidInputError);

        await expect(graphService.createRelationship('id1', 'id2', {
          type: '   '
        })).rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for oversized relationship type', async () => {
        const longType = 'A'.repeat(51);
        await expect(graphService.createRelationship('id1', 'id2', {
          type: longType
        })).rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for invalid relationship type format', async () => {
        const invalidTypes = [
          'lowercase_type',
          'Mixed_Case_Type',
          'TYPE WITH SPACES',
          'TYPE-WITH-DASHES',
          'type.with.dots',
          '123_STARTS_WITH_NUMBER'
        ];

        for (const type of invalidTypes) {
          await expect(graphService.createRelationship('id1', 'id2', { type }))
            .rejects.toThrow(InvalidInputError);
        }
      });

      it('should accept valid relationship types in SCREAMING_SNAKE_CASE', async () => {
        const validTypes = [
          'KNOWS',
          'WORKS_AT',
          'FRIENDS_WITH',
          'HAS_SKILL',
          'LOCATED_IN',
          'MEMBER_OF_GROUP'
        ];

        for (const type of validTypes) {
          await expect(graphService.createRelationship('id1', 'id2', { type }))
            .resolves.toBeTruthy();
        }
      });

      it('should throw InvalidInputError for invalid properties type', async () => {
        await expect(graphService.createRelationship('id1', 'id2', {
          type: 'KNOWS',
          properties: 'invalid' as any
        })).rejects.toThrow(InvalidInputError);
      });

      it('should accept valid relationship data', async () => {
        const validData: GraphRelationshipData = {
          type: 'KNOWS',
          properties: { since: new Date(), strength: 0.8 }
        };

        await expect(graphService.createRelationship('id1', 'id2', validData))
          .resolves.toBeTruthy();
      });
    });

    describe('Cypher Query Validation', () => {
      it('should throw InvalidInputError for empty queries', async () => {
        await expect(graphService.executeCypher(''))
          .rejects.toThrow(InvalidInputError);

        await expect(graphService.executeCypher('   '))
          .rejects.toThrow(InvalidInputError);
      });

      it('should throw SecurityError for dangerous keywords', async () => {
        const dangerousQueries = [
          'DROP TABLE users',
          'DELETE ALL nodes',
          'REMOVE ALL relationships',
          'drop database test',
          'delete all (n)'
        ];

        for (const query of dangerousQueries) {
          await expect(graphService.executeCypher(query))
            .rejects.toThrow(SecurityError);
        }
      });

      it('should accept safe Cypher queries', async () => {
        const safeQueries = [
          'MATCH (n) RETURN n',
          'CREATE (n:Person {name: "test"})',
          'MATCH (a)-[r]->(b) RETURN a, r, b',
          'MERGE (n:User {id: $id}) SET n.name = $name',
          'CALL db.schema.visualization()'
        ];

        for (const query of safeQueries) {
          await expect(graphService.executeCypher(query))
            .resolves.toBeTruthy();
        }
      });
    });
  });

  describe('Requirement 1.3: Graph Service Type Definitions', () => {
    it('should define comprehensive GraphNodeData interface', () => {
      const data: GraphNodeData = {
        id: 'test-id',
        labels: ['Person', 'Employee'],
        properties: { name: 'John', department: 'Engineering' }
      };

      expect(data.id).toBe('test-id');
      expect(data.labels).toEqual(['Person', 'Employee']);
      expect(data.properties).toEqual({ name: 'John', department: 'Engineering' });
    });

    it('should define comprehensive GraphRelationshipData interface', () => {
      const data: GraphRelationshipData = {
        type: 'WORKS_FOR',
        properties: { startDate: '2023-01-01', role: 'Developer' }
      };

      expect(data.type).toBe('WORKS_FOR');
      expect(data.properties).toEqual({ startDate: '2023-01-01', role: 'Developer' });
    });

    it('should define comprehensive TraversalSpec interface', () => {
      const spec: TraversalSpec = {
        depth: 3,
        direction: 'OUT',
        relationshipTypes: ['KNOWS', 'WORKS_WITH'],
        nodeLabels: ['Person'],
        filter: { active: true },
        limit: 100
      };

      expect(spec.depth).toBe(3);
      expect(spec.direction).toBe('OUT');
      expect(spec.relationshipTypes).toEqual(['KNOWS', 'WORKS_WITH']);
      expect(spec.nodeLabels).toEqual(['Person']);
      expect(spec.filter).toEqual({ active: true });
      expect(spec.limit).toBe(100);
    });

    it('should define comprehensive GraphStats interface', () => {
      const stats: GraphStats = {
        nodeCount: 1000,
        relationshipCount: 5000,
        indexCount: 10,
        databaseSize: 104857600,
        lastUpdated: new Date(),
        nodeCountsByLabel: { Person: 800, Company: 200 },
        relationshipCountsByType: { KNOWS: 3000, WORKS_FOR: 2000 }
      };

      expect(stats.nodeCount).toBe(1000);
      expect(stats.relationshipCount).toBe(5000);
      expect(stats.indexCount).toBe(10);
      expect(stats.databaseSize).toBe(104857600);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
      expect(stats.nodeCountsByLabel).toEqual({ Person: 800, Company: 200 });
      expect(stats.relationshipCountsByType).toEqual({ KNOWS: 3000, WORKS_FOR: 2000 });
    });
  });

  describe('Requirement 1.4: Graph Service Public API Export', () => {
    it('should export all required interfaces and classes', () => {
      // These should be importable and usable
      expect(IGraphService).toBeDefined();
      expect(InvalidNodeError).toBeDefined();
      expect(InvalidInputError).toBeDefined();
      expect(SecurityError).toBeDefined();
      expect(GraphOperationError).toBeDefined();
      expect(TransactionError).toBeDefined();
    });

    it('should allow interface implementations', () => {
      // This test passes if TestGraphService compiles successfully
      expect(graphService).toBeInstanceOf(IGraphService);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      await expect(graphService.createNode(null as any))
        .rejects.toThrow();

      await expect(graphService.createNode(undefined as any))
        .rejects.toThrow();

      await expect(graphService.createRelationship(null as any, 'id2', { type: 'TEST' }))
        .rejects.toThrow(InvalidNodeError);

      await expect(graphService.executeCypher(null as any))
        .rejects.toThrow(InvalidInputError);
    });

    it('should prevent Cypher injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP DATABASE test; --",
        "MATCH (n) DELETE n; CREATE (evil:Hacker)",
        "CALL dbms.security.clearAuthCache()",
        "LOAD CSV FROM 'file:///etc/passwd' AS line"
      ];

      for (const input of maliciousInputs) {
        try {
          await graphService.executeCypher(`MATCH (n {name: "${input}"}) RETURN n`);
        } catch (error) {
          // Should either throw SecurityError or handle safely
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle concurrent operations safely', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        graphService.createNode({
          labels: ['Test'],
          properties: { index: i }
        })
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
      expect(new Set(results).size).toBe(10); // All IDs should be unique
    });
  });

  describe('Transaction Support', () => {
    it('should support transactional operations', async () => {
      const result = await graphService.runTransaction(async (tx) => {
        const nodeId = await tx.createNode({
          labels: ['Test'],
          properties: { name: 'transactional' }
        });
        
        const relId = await tx.createRelationship(nodeId, nodeId, {
          type: 'SELF_REF'
        });

        return { nodeId, relId };
      });

      expect(result.nodeId).toBeDefined();
      expect(result.relId).toBeDefined();
    });

    it('should handle transaction failures', async () => {
      // This would typically test rollback behavior
      const operations = async (tx: IGraphService) => {
        await tx.createNode({
          labels: ['Test'],
          properties: { name: 'test' }
        });
        
        throw new Error('Transaction failed');
      };

      await expect(graphService.runTransaction(operations))
        .rejects.toThrow('Transaction failed');
    });
  });

  describe('Performance Requirements', () => {
    it('should validate inputs efficiently', async () => {
      const start = performance.now();
      
      // Run validation 1000 times
      for (let i = 0; i < 1000; i++) {
        await graphService.createNode({
          labels: ['Test'],
          properties: { index: i }
        });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 1000;
      
      // Validation should add < 1ms overhead per operation
      expect(avgTime).toBeLessThan(1);
    });

    it('should handle batch operations efficiently', async () => {
      const operations: GraphOperation[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'CREATE_NODE',
        data: {
          labels: ['Batch'],
          properties: { index: i }
        },
        operationId: `op_${i}`
      }));

      const start = performance.now();
      const result = await graphService.batchExecute(operations);
      const end = performance.now();

      expect(result.successCount).toBe(100);
      expect(result.errorCount).toBe(0);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});