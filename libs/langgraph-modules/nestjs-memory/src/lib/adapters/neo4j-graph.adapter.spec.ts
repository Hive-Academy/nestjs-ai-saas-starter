import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Neo4jService } from '@hive-academy/nestjs-neo4j';
import { Neo4jGraphAdapter } from './neo4j-graph.adapter';
import { MEMORY_CONFIG } from '../constants/memory.constants';
import {
  GraphNodeData,
  GraphRelationshipData,
  TraversalSpec,
  GraphOperation,
  GraphFindCriteria,
  GraphOperationError,
  InvalidNodeError,
  InvalidInputError,
  SecurityError,
  TransactionError,
} from '../interfaces/graph-service.interface';

describe('Neo4jGraphAdapter - Requirement 2: Adapter Implementation', () => {
  let adapter: Neo4jGraphAdapter;
  let mockNeo4j: jest.Mocked<Neo4jService>;

  const mockConfig = {
    chromadb: { host: 'localhost', port: 8000 },
    neo4j: { database: 'neo4j' }
  };

  beforeEach(async () => {
    // Create mock Neo4jService
    const mockNeo4jMethods = {
      run: jest.fn(),
      runTransaction: jest.fn(),
      close: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Neo4jGraphAdapter,
        {
          provide: Neo4jService,
          useValue: mockNeo4jMethods,
        },
        {
          provide: MEMORY_CONFIG,
          useValue: mockConfig,
        },
      ],
    }).compile();

    adapter = module.get<Neo4jGraphAdapter>(Neo4jGraphAdapter);
    mockNeo4j = module.get(Neo4jService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 2.1: Neo4j Adapter Interface Implementation', () => {
    it('should implement all IGraphService methods', () => {
      expect(typeof adapter.createNode).toBe('function');
      expect(typeof adapter.createRelationship).toBe('function');
      expect(typeof adapter.traverse).toBe('function');
      expect(typeof adapter.executeCypher).toBe('function');
      expect(typeof adapter.getStats).toBe('function');
      expect(typeof adapter.batchExecute).toBe('function');
      expect(typeof adapter.findNodes).toBe('function');
      expect(typeof adapter.deleteNodes).toBe('function');
      expect(typeof adapter.deleteRelationships).toBe('function');
      expect(typeof adapter.runTransaction).toBe('function');
    });

    it('should extend IGraphService abstract class', () => {
      expect(adapter).toBeInstanceOf(require('../interfaces/graph-service.interface').IGraphService);
    });
  });

  describe('Requirement 2.2: Node Creation - 100% Backward Compatibility', () => {
    it('should create a node successfully', async () => {
      const nodeData: GraphNodeData = {
        id: 'user-123',
        labels: ['Person', 'User'],
        properties: { name: 'John Doe', age: 30 }
      };

      const mockResult = {
        records: [{ get: jest.fn().mockReturnValue('user-123') }],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const result = await adapter.createNode(nodeData);

      expect(result).toBe('user-123');
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (n:Person:User {id: $nodeId})'),
        {
          nodeId: 'user-123',
          properties: { name: 'John Doe', age: 30 }
        }
      );
    });

    it('should generate ID when not provided', async () => {
      const nodeData: GraphNodeData = {
        labels: ['Test'],
        properties: { name: 'Test Node' }
      };

      const mockResult = {
        records: [{ get: jest.fn().mockReturnValue('generated-id') }],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const result = await adapter.createNode(nodeData);

      expect(result).toBe('generated-id');
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (n:Test {id: $nodeId})'),
        expect.objectContaining({
          nodeId: expect.stringMatching(/^\d+_[a-z0-9]+$/),
          properties: { name: 'Test Node' }
        })
      );
    });

    it('should validate node data and throw appropriate errors', async () => {
      await expect(adapter.createNode({
        labels: [],
        properties: { name: 'test' }
      })).rejects.toThrow(InvalidInputError);

      await expect(adapter.createNode({
        labels: ['Valid', ''],
        properties: { name: 'test' }
      })).rejects.toThrow(InvalidInputError);

      await expect(adapter.createNode({
        labels: ['Test'],
        properties: 'invalid' as any
      })).rejects.toThrow(InvalidInputError);
    });

    it('should wrap Neo4j errors in GraphOperationError', async () => {
      const nodeData: GraphNodeData = {
        labels: ['Test'],
        properties: { name: 'test' }
      };

      const neo4jError = new Error('Neo4j connection failed');
      mockNeo4j.run.mockRejectedValue(neo4jError);

      await expect(adapter.createNode(nodeData))
        .rejects.toThrow(GraphOperationError);

      try {
        await adapter.createNode(nodeData);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphOperationError);
        expect((error as GraphOperationError).operation).toBe('createNode');
        expect((error as GraphOperationError).context).toMatchObject({
          data: nodeData,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Neo4j connection failed'
          })
        });
      }
    });
  });

  describe('Requirement 2.3: Relationship Creation - Graph Connectivity', () => {
    it('should create a relationship successfully', async () => {
      const relationshipData: GraphRelationshipData = {
        type: 'KNOWS',
        properties: { since: '2023-01-01', strength: 0.8 }
      };

      const mockResult = {
        records: [{ get: jest.fn().mockReturnValue('rel-123') }],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const result = await adapter.createRelationship('user1', 'user2', relationshipData);

      expect(result).toBe('rel-123');
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (from)-[r:KNOWS {id: $relationshipId}]->(to)'),
        {
          fromNodeId: 'user1',
          toNodeId: 'user2',
          relationshipId: expect.stringMatching(/^\d+_[a-z0-9]+$/),
          properties: { since: '2023-01-01', strength: 0.8 }
        }
      );
    });

    it('should validate relationship data', async () => {
      await expect(adapter.createRelationship('', 'user2', { type: 'KNOWS' }))
        .rejects.toThrow(InvalidNodeError);

      await expect(adapter.createRelationship('user1', '', { type: 'KNOWS' }))
        .rejects.toThrow(InvalidNodeError);

      await expect(adapter.createRelationship('user1', 'user2', { type: '' }))
        .rejects.toThrow(InvalidInputError);

      await expect(adapter.createRelationship('user1', 'user2', { type: 'invalid_type' }))
        .rejects.toThrow(InvalidInputError);
    });

    it('should accept valid relationship types in SCREAMING_SNAKE_CASE', async () => {
      const validTypes = ['KNOWS', 'WORKS_AT', 'FRIENDS_WITH', 'HAS_SKILL'];

      const mockResult = {
        records: [{ get: jest.fn().mockReturnValue('rel-id') }],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      for (const type of validTypes) {
        await expect(adapter.createRelationship('user1', 'user2', { type }))
          .resolves.toBe('rel-id');
      }
    });
  });

  describe('Requirement 2.4: Graph Traversal - Complex Queries', () => {
    it('should traverse graph with basic specification', async () => {
      const spec: TraversalSpec = {
        depth: 2,
        direction: 'OUT',
        relationshipTypes: ['KNOWS', 'WORKS_WITH'],
        nodeLabels: ['Person'],
        limit: 10
      };

      const mockResult = {
        records: [
          {
            get: jest.fn()
              .mockReturnValueOnce([{ properties: { id: 'node1' }, labels: ['Person'] }])
              .mockReturnValueOnce([{ properties: { id: 'rel1' }, type: 'KNOWS' }])
              .mockReturnValueOnce({ segments: [] })
          }
        ],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const result = await adapter.traverse('start-node', spec);

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('relationships');
      expect(result).toHaveProperty('paths');
      
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH path = (start {id: $startNodeId})-[r:KNOWS|WORKS_WITH*1..2]->(end:Person)'),
        { startNodeId: 'start-node' }
      );
    });

    it('should handle different traversal directions', async () => {
      const mockResult = {
        records: [],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const directions: Array<'IN' | 'OUT' | 'BOTH'> = ['IN', 'OUT', 'BOTH'];

      for (const direction of directions) {
        await adapter.traverse('node1', { direction });

        const expectedDirection = direction === 'IN' ? '<-' : '-';
        expect(mockNeo4j.run).toHaveBeenCalledWith(
          expect.stringContaining(`(start {id: $startNodeId})${expectedDirection}[r*1..1]${expectedDirection}(end`),
          { startNodeId: 'node1' }
        );
      }
    });

    it('should apply filters and limits correctly', async () => {
      const spec: TraversalSpec = {
        depth: 3,
        filter: { active: true, type: 'employee' },
        limit: 50
      };

      const mockResult = { records: [], summary: {} };
      mockNeo4j.run.mockResolvedValue(mockResult);

      await adapter.traverse('start-node', spec);

      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.active = true AND n.type = "employee"'),
        { startNodeId: 'start-node' }
      );

      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        { startNodeId: 'start-node' }
      );
    });

    it('should validate start node ID', async () => {
      await expect(adapter.traverse('', {}))
        .rejects.toThrow(InvalidNodeError);

      await expect(adapter.traverse('   ', {}))
        .rejects.toThrow(InvalidNodeError);
    });
  });

  describe('Requirement 2.5: Cypher Query Execution - Security & Flexibility', () => {
    it('should execute Cypher queries successfully', async () => {
      const query = 'MATCH (n:Person) WHERE n.age > $minAge RETURN n.name as name';
      const params = { minAge: 25 };

      const mockResult = {
        records: [
          { keys: ['name'], get: jest.fn().mockReturnValue('John') },
          { keys: ['name'], get: jest.fn().mockReturnValue('Jane') }
        ],
        summary: {
          counters: {
            nodesCreated: 0,
            nodesDeleted: 0,
            relationshipsCreated: 0,
            relationshipsDeleted: 0,
            propertiesSet: 0
          },
          resultAvailableAfter: { toNumber: () => 5 },
          resultConsumedAfter: { toNumber: () => 10 }
        }
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const result = await adapter.executeCypher(query, params);

      expect(result.records).toHaveLength(2);
      expect(result.records[0]).toEqual({ name: 'John' });
      expect(result.records[1]).toEqual({ name: 'Jane' });
      expect(result.summary).toBeDefined();
      expect(result.summary?.counters).toBeDefined();

      expect(mockNeo4j.run).toHaveBeenCalledWith(query, params);
    });

    it('should prevent dangerous Cypher queries', async () => {
      const dangerousQueries = [
        'DROP TABLE users',
        'DELETE ALL nodes',
        'REMOVE ALL relationships',
        'drop database test'
      ];

      for (const query of dangerousQueries) {
        await expect(adapter.executeCypher(query))
          .rejects.toThrow(SecurityError);
      }

      expect(mockNeo4j.run).not.toHaveBeenCalled();
    });

    it('should validate query input', async () => {
      await expect(adapter.executeCypher(''))
        .rejects.toThrow(InvalidInputError);

      await expect(adapter.executeCypher('   '))
        .rejects.toThrow(InvalidInputError);
    });

    it('should handle query execution errors', async () => {
      const query = 'INVALID CYPHER QUERY';
      const neo4jError = new Error('Syntax error');
      
      mockNeo4j.run.mockRejectedValue(neo4jError);

      await expect(adapter.executeCypher(query))
        .rejects.toThrow(GraphOperationError);

      try {
        await adapter.executeCypher(query);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphOperationError);
        expect((error as GraphOperationError).operation).toBe('executeCypher');
        expect((error as GraphOperationError).context).toMatchObject({
          query,
          params: {},
          error: expect.objectContaining({ message: 'Syntax error' })
        });
      }
    });
  });

  describe('Requirement 2.6: Statistics & Management Operations', () => {
    it('should get comprehensive graph statistics', async () => {
      const mockStatsResult = {
        records: [{ 
          get: jest.fn()
            .mockReturnValueOnce({ toNumber: () => 1000 }) // nodeCount
            .mockReturnValueOnce({ toNumber: () => 5000 }) // relationshipCount
            .mockReturnValueOnce(10) // labelCount
        }],
        summary: {}
      };

      const mockLabelsResult = {
        records: [
          { get: jest.fn().mockReturnValueOnce('Person').mockReturnValueOnce({ toNumber: () => 800 }) },
          { get: jest.fn().mockReturnValueOnce('Company').mockReturnValueOnce({ toNumber: () => 200 }) }
        ],
        summary: {}
      };

      const mockRelsResult = {
        records: [
          { get: jest.fn().mockReturnValueOnce('KNOWS').mockReturnValueOnce({ toNumber: () => 3000 }) },
          { get: jest.fn().mockReturnValueOnce('WORKS_FOR').mockReturnValueOnce({ toNumber: () => 2000 }) }
        ],
        summary: {}
      };

      mockNeo4j.run
        .mockResolvedValueOnce(mockStatsResult)
        .mockResolvedValueOnce(mockLabelsResult)
        .mockResolvedValueOnce(mockRelsResult);

      const stats = await adapter.getStats();

      expect(stats).toMatchObject({
        nodeCount: 1000,
        relationshipCount: 5000,
        indexCount: 0,
        lastUpdated: expect.any(Date),
        nodeCountsByLabel: { Person: 800, Company: 200 },
        relationshipCountsByType: { KNOWS: 3000, WORKS_FOR: 2000 }
      });
    });

    it('should find nodes by criteria', async () => {
      const criteria: GraphFindCriteria = {
        labels: ['Person'],
        properties: { active: true },
        limit: 10,
        skip: 5,
        orderBy: [{ property: 'name', direction: 'ASC' }]
      };

      const mockResult = {
        records: [
          { get: jest.fn().mockReturnValue({ properties: { id: 'person1', name: 'Alice' }, labels: ['Person'] }) },
          { get: jest.fn().mockReturnValue({ properties: { id: 'person2', name: 'Bob' }, labels: ['Person'] }) }
        ],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const nodes = await adapter.findNodes(criteria);

      expect(nodes).toHaveLength(2);
      expect(nodes[0]).toMatchObject({
        id: 'person1',
        labels: ['Person'],
        properties: { id: 'person1', name: 'Alice' }
      });

      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (n:Person)'),
        expect.anything()
      );
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.active = true'),
        expect.anything()
      );
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY n.name ASC'),
        expect.anything()
      );
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('SKIP 5'),
        expect.anything()
      );
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        expect.anything()
      );
    });

    it('should delete nodes by IDs', async () => {
      const nodeIds = ['node1', 'node2', 'node3'];
      const mockResult = {
        records: [{ get: jest.fn().mockReturnValue({ toNumber: () => 3 }) }],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const deletedCount = await adapter.deleteNodes(nodeIds);

      expect(deletedCount).toBe(3);
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.id IN $nodeIds'),
        { nodeIds }
      );
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE n'),
        expect.anything()
      );
    });

    it('should delete relationships by IDs', async () => {
      const relIds = ['rel1', 'rel2'];
      const mockResult = {
        records: [{ get: jest.fn().mockReturnValue({ toNumber: () => 2 }) }],
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const deletedCount = await adapter.deleteRelationships(relIds);

      expect(deletedCount).toBe(2);
      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('WHERE r.id IN $relationshipIds'),
        { relationshipIds: relIds }
      );
    });
  });

  describe('Requirement 2.7: Batch Operations - Performance Optimization', () => {
    it('should execute batch operations successfully', async () => {
      const operations: GraphOperation[] = [
        {
          type: 'CREATE_NODE',
          data: { labels: ['Test'], properties: { name: 'Node 1' } },
          operationId: 'op1'
        },
        {
          type: 'CREATE_NODE',
          data: { labels: ['Test'], properties: { name: 'Node 2' } },
          operationId: 'op2'
        },
        {
          type: 'CYPHER',
          data: { query: 'MATCH (n) RETURN count(n)', params: {} },
          operationId: 'op3'
        }
      ];

      const mockCreateResult = {
        records: [{ get: jest.fn().mockReturnValue('created-id') }],
        summary: {}
      };

      const mockCypherResult = {
        records: [{ keys: ['count'], get: jest.fn().mockReturnValue(2) }],
        summary: {}
      };

      mockNeo4j.run
        .mockResolvedValueOnce(mockCreateResult)
        .mockResolvedValueOnce(mockCreateResult)
        .mockResolvedValueOnce(mockCypherResult);

      const result = await adapter.batchExecute(operations);

      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
      expect(result.results).toHaveProperty('op1');
      expect(result.results).toHaveProperty('op2');
      expect(result.results).toHaveProperty('op3');
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should handle partial failures in batch operations', async () => {
      const operations: GraphOperation[] = [
        {
          type: 'CREATE_NODE',
          data: { labels: ['Test'], properties: { name: 'Valid Node' } },
          operationId: 'success'
        },
        {
          type: 'CYPHER',
          data: { query: 'INVALID QUERY', params: {} },
          operationId: 'failure'
        }
      ];

      const mockSuccessResult = {
        records: [{ get: jest.fn().mockReturnValue('created-id') }],
        summary: {}
      };

      mockNeo4j.run
        .mockResolvedValueOnce(mockSuccessResult)
        .mockRejectedValueOnce(new Error('Syntax error'));

      const result = await adapter.batchExecute(operations);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.results).toHaveProperty('success');
      expect(result.errors).toHaveProperty('failure');
      expect(result.errors.failure.message).toBe('Syntax error');
    });

    it('should return empty result for empty batch', async () => {
      const result = await adapter.batchExecute([]);

      expect(result).toEqual({
        successCount: 0,
        errorCount: 0,
        results: {},
        errors: {}
      });

      expect(mockNeo4j.run).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 2.8: Transaction Support', () => {
    it('should execute transactional operations', async () => {
      const transactionOps = async (service: typeof adapter) => {
        const nodeId = await service.createNode({
          labels: ['Test'],
          properties: { name: 'transactional' }
        });

        const relId = await service.createRelationship(nodeId, nodeId, {
          type: 'SELF_REF'
        });

        return { nodeId, relId };
      };

      const mockNodeResult = {
        records: [{ get: jest.fn().mockReturnValue('node-id') }],
        summary: {}
      };

      const mockRelResult = {
        records: [{ get: jest.fn().mockReturnValue('rel-id') }],
        summary: {}
      };

      mockNeo4j.run
        .mockResolvedValueOnce(mockNodeResult)
        .mockResolvedValueOnce(mockRelResult);

      const result = await adapter.runTransaction(transactionOps);

      expect(result.nodeId).toBe('node-id');
      expect(result.relId).toBe('rel-id');
    });

    it('should handle transaction failures', async () => {
      const failingTransaction = async () => {
        throw new Error('Operation failed');
      };

      await expect(adapter.runTransaction(failingTransaction))
        .rejects.toThrow(TransactionError);

      try {
        await adapter.runTransaction(failingTransaction);
      } catch (error) {
        expect(error).toBeInstanceOf(TransactionError);
        expect((error as TransactionError).cause?.message).toBe('Operation failed');
      }
    });
  });

  describe('Performance & Efficiency Requirements', () => {
    it('should efficiently handle large result sets', async () => {
      const largeResultSet = Array.from({ length: 10000 }, (_, i) => ({
        get: jest.fn().mockReturnValue({ 
          properties: { id: `node${i}`, index: i }, 
          labels: ['Test'] 
        })
      }));

      const mockResult = {
        records: largeResultSet,
        summary: {}
      };

      mockNeo4j.run.mockResolvedValue(mockResult);

      const start = performance.now();
      const nodes = await adapter.findNodes({ labels: ['Test'] });
      const end = performance.now();

      expect(nodes).toHaveLength(10000);
      expect(end - start).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should optimize Cypher query construction', async () => {
      const spec: TraversalSpec = {
        depth: 2,
        direction: 'OUT',
        relationshipTypes: ['KNOWS', 'WORKS_WITH'],
        nodeLabels: ['Person'],
        filter: { active: true },
        limit: 50
      };

      const mockResult = { records: [], summary: {} };
      mockNeo4j.run.mockResolvedValue(mockResult);

      await adapter.traverse('start', spec);

      expect(mockNeo4j.run).toHaveBeenCalledTimes(1);
      
      const calledQuery = mockNeo4j.run.mock.calls[0][0] as string;
      expect(calledQuery).toContain(':KNOWS|WORKS_WITH');
      expect(calledQuery).toContain(':Person');
      expect(calledQuery).toContain('*1..2');
      expect(calledQuery).toContain('LIMIT 50');
    });
  });

  describe('Dependency Injection Compatibility', () => {
    it('should accept Neo4jService via constructor injection', () => {
      expect(adapter).toBeDefined();
      expect(mockNeo4j).toBeDefined();
    });

    it('should accept configuration via injection token', () => {
      expect(adapter).toBeInstanceOf(Neo4jGraphAdapter);
    });

    it('should initialize logger correctly', () => {
      const mockLogDebug = jest.spyOn(Logger.prototype, 'debug');
      expect(mockLogDebug).toHaveBeenCalled();
    });
  });
});