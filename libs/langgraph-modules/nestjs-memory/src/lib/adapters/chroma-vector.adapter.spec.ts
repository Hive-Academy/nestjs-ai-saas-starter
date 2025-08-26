import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ChromaDBService } from '@hive-academy/nestjs-chromadb';
import { ChromaVectorAdapter } from './chroma-vector.adapter';
import { MEMORY_CONFIG } from '../constants/memory.constants';
import {
  VectorStoreData,
  VectorSearchQuery,
  VectorOperationError,
  InvalidCollectionError,
  InvalidInputError,
} from '../interfaces/vector-service.interface';

describe('ChromaVectorAdapter - Requirement 2: Adapter Implementation', () => {
  let adapter: ChromaVectorAdapter;
  let mockChromaDB: jest.Mocked<ChromaDBService>;

  const mockConfig = {
    chromadb: { host: 'localhost', port: 8000 },
    neo4j: { database: 'neo4j' }
  };

  beforeEach(async () => {
    // Create mock ChromaDBService
    const mockChromaDBMethods = {
      addDocuments: jest.fn(),
      searchDocuments: jest.fn(),
      deleteDocuments: jest.fn(),
      getDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChromaVectorAdapter,
        {
          provide: ChromaDBService,
          useValue: mockChromaDBMethods,
        },
        {
          provide: MEMORY_CONFIG,
          useValue: mockConfig,
        },
      ],
    }).compile();

    adapter = module.get<ChromaVectorAdapter>(ChromaVectorAdapter);
    mockChromaDB = module.get(ChromaDBService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 2.1: ChromaDB Adapter Interface Implementation', () => {
    it('should implement all IVectorService methods', () => {
      expect(typeof adapter.store).toBe('function');
      expect(typeof adapter.storeBatch).toBe('function');
      expect(typeof adapter.search).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.deleteByFilter).toBe('function');
      expect(typeof adapter.getStats).toBe('function');
      expect(typeof adapter.getDocuments).toBe('function');
    });

    it('should extend IVectorService abstract class', () => {
      expect(adapter).toBeInstanceOf(require('../interfaces/vector-service.interface').IVectorService);
    });
  });

  describe('Requirement 2.2: Store Operation - 100% Backward Compatibility', () => {
    it('should store a document successfully', async () => {
      const testData: VectorStoreData = {
        id: 'test-123',
        document: 'This is a test document',
        metadata: { category: 'test' },
        embedding: [0.1, 0.2, 0.3]
      };

      mockChromaDB.addDocuments.mockResolvedValue(undefined);

      const result = await adapter.store('test-collection', testData);

      expect(result).toBe('test-123');
      expect(mockChromaDB.addDocuments).toHaveBeenCalledWith(
        'test-collection',
        [{
          id: 'test-123',
          document: 'This is a test document',
          metadata: { category: 'test' },
          embedding: [0.1, 0.2, 0.3]
        }]
      );
    });

    it('should generate ID when not provided', async () => {
      const testData: VectorStoreData = {
        document: 'Document without ID'
      };

      mockChromaDB.addDocuments.mockResolvedValue(undefined);

      const result = await adapter.store('test-collection', testData);

      expect(result).toMatch(/^doc_\d+_[a-z0-9]+$/);
      expect(mockChromaDB.addDocuments).toHaveBeenCalledWith(
        'test-collection',
        expect.arrayContaining([
          expect.objectContaining({
            id: result,
            document: 'Document without ID',
            metadata: {},
            embedding: undefined
          })
        ])
      );
    });

    it('should validate input and throw appropriate errors', async () => {
      await expect(adapter.store('', { document: 'test' }))
        .rejects.toThrow(InvalidCollectionError);

      await expect(adapter.store('valid', { document: '' }))
        .rejects.toThrow(InvalidInputError);
    });

    it('should wrap ChromaDB errors in VectorOperationError', async () => {
      const testData: VectorStoreData = { document: 'test' };
      const chromaError = new Error('ChromaDB connection failed');
      
      mockChromaDB.addDocuments.mockRejectedValue(chromaError);

      await expect(adapter.store('test', testData))
        .rejects.toThrow(VectorOperationError);

      try {
        await adapter.store('test', testData);
      } catch (error) {
        expect(error).toBeInstanceOf(VectorOperationError);
        expect((error as VectorOperationError).operation).toBe('store');
        expect((error as VectorOperationError).context).toMatchObject({
          collection: 'test',
          error: expect.objectContaining({
            name: 'Error',
            message: 'ChromaDB connection failed'
          })
        });
      }
    });
  });

  describe('Requirement 2.3: Batch Operations - Performance & Compatibility', () => {
    it('should store multiple documents in batch', async () => {
      const testData: VectorStoreData[] = [
        { id: 'doc1', document: 'First document' },
        { id: 'doc2', document: 'Second document' },
        { document: 'Third document without ID' }
      ];

      mockChromaDB.addDocuments.mockResolvedValue(undefined);

      const result = await adapter.storeBatch('test-collection', testData);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('doc1');
      expect(result[1]).toBe('doc2');
      expect(result[2]).toMatch(/^doc_\d+_[a-z0-9]+$/);

      expect(mockChromaDB.addDocuments).toHaveBeenCalledWith(
        'test-collection',
        expect.arrayContaining([
          expect.objectContaining({ id: 'doc1', document: 'First document' }),
          expect.objectContaining({ id: 'doc2', document: 'Second document' }),
          expect.objectContaining({ document: 'Third document without ID' })
        ])
      );
    });

    it('should return empty array for empty batch', async () => {
      const result = await adapter.storeBatch('test-collection', []);
      expect(result).toEqual([]);
      expect(mockChromaDB.addDocuments).not.toHaveBeenCalled();
    });

    it('should validate all items before processing', async () => {
      const invalidBatch = [
        { document: 'Valid document' },
        { document: '' }, // Invalid
        { document: 'Another valid document' }
      ];

      await expect(adapter.storeBatch('test', invalidBatch))
        .rejects.toThrow(InvalidInputError);

      expect(mockChromaDB.addDocuments).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 2.4: Search Operations - Semantic Compatibility', () => {
    it('should search by text query', async () => {
      const query: VectorSearchQuery = {
        queryText: 'search term',
        limit: 5,
        filter: { category: 'test' }
      };

      const mockSearchResult = {
        ids: [['doc1', 'doc2']],
        documents: [['First doc', 'Second doc']],
        metadatas: [[{ category: 'test' }, { category: 'test' }]],
        distances: [[0.1, 0.3]]
      };

      mockChromaDB.searchDocuments.mockResolvedValue(mockSearchResult);

      const results = await adapter.search('test-collection', query);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'doc1',
        document: 'First doc',
        metadata: { category: 'test' },
        distance: 0.1,
        relevanceScore: 0.9
      });

      expect(mockChromaDB.searchDocuments).toHaveBeenCalledWith(
        'test-collection',
        ['search term'],
        undefined,
        {
          nResults: 5,
          where: { category: 'test' },
          includeMetadata: true,
          includeDocuments: true,
          includeDistances: true
        }
      );
    });

    it('should search by embedding vector', async () => {
      const query: VectorSearchQuery = {
        queryEmbedding: [0.1, 0.2, 0.3],
        limit: 10
      };

      const mockSearchResult = {
        ids: [['doc1']],
        documents: [['Document content']],
        metadatas: [[{}]],
        distances: [[0.2]]
      };

      mockChromaDB.searchDocuments.mockResolvedValue(mockSearchResult);

      const results = await adapter.search('test-collection', query);

      expect(mockChromaDB.searchDocuments).toHaveBeenCalledWith(
        'test-collection',
        undefined,
        [[0.1, 0.2, 0.3]],
        expect.objectContaining({ nResults: 10 })
      );

      expect(results).toHaveLength(1);
    });

    it('should filter results by minimum score', async () => {
      const query: VectorSearchQuery = {
        queryText: 'test',
        minScore: 0.7
      };

      const mockSearchResult = {
        ids: [['doc1', 'doc2', 'doc3']],
        documents: [['High score', 'Medium score', 'Low score']],
        metadatas: [[{}, {}, {}]],
        distances: [[0.1, 0.4, 0.8]] // Relevance: 0.9, 0.6, 0.2
      };

      mockChromaDB.searchDocuments.mockResolvedValue(mockSearchResult);

      const results = await adapter.search('test-collection', query);

      // Only doc1 with relevance 0.9 should pass minScore 0.7
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc1');
      expect(results[0].relevanceScore).toBe(0.9);
    });

    it('should require either queryText or queryEmbedding', async () => {
      await expect(adapter.search('test', {}))
        .rejects.toThrow(InvalidInputError);

      await expect(adapter.search('test', { limit: 5 }))
        .rejects.toThrow(InvalidInputError);
    });

    it('should handle empty search results', async () => {
      const query: VectorSearchQuery = { queryText: 'no matches' };
      
      mockChromaDB.searchDocuments.mockResolvedValue({
        ids: [[]],
        documents: undefined,
        metadatas: undefined,
        distances: undefined
      });

      const results = await adapter.search('test', query);
      expect(results).toEqual([]);
    });
  });

  describe('Requirement 2.5: Delete Operations - Data Management', () => {
    it('should delete documents by IDs', async () => {
      const ids = ['doc1', 'doc2', 'doc3'];
      mockChromaDB.deleteDocuments.mockResolvedValue(undefined);

      await adapter.delete('test-collection', ids);

      expect(mockChromaDB.deleteDocuments).toHaveBeenCalledWith(
        'test-collection',
        ['doc1', 'doc2', 'doc3']
      );
    });

    it('should delete documents by filter', async () => {
      const filter = { category: 'obsolete' };

      mockChromaDB.getDocuments.mockResolvedValue({
        ids: ['doc1', 'doc2'],
        documents: [],
        metadatas: []
      });
      mockChromaDB.deleteDocuments.mockResolvedValue(undefined);

      const deletedCount = await adapter.deleteByFilter('test-collection', filter);

      expect(deletedCount).toBe(2);
      expect(mockChromaDB.getDocuments).toHaveBeenCalledWith(
        'test-collection',
        {
          where: filter,
          includeDocuments: false,
          includeMetadata: false
        }
      );
      expect(mockChromaDB.deleteDocuments).toHaveBeenCalledWith(
        'test-collection',
        ['doc1', 'doc2']
      );
    });

    it('should return 0 when no documents match filter', async () => {
      mockChromaDB.getDocuments.mockResolvedValue({
        ids: [],
        documents: [],
        metadatas: []
      });

      const deletedCount = await adapter.deleteByFilter('test', { category: 'none' });
      expect(deletedCount).toBe(0);
      expect(mockChromaDB.deleteDocuments).not.toHaveBeenCalled();
    });

    it('should validate delete inputs', async () => {
      await expect(adapter.delete('', ['id1']))
        .rejects.toThrow(InvalidCollectionError);

      await expect(adapter.delete('test', []))
        .rejects.toThrow(InvalidInputError);

      await expect(adapter.deleteByFilter('test', {}))
        .rejects.toThrow(InvalidInputError);
    });
  });

  describe('Requirement 2.6: Statistics & Metadata Operations', () => {
    it('should get collection statistics', async () => {
      mockChromaDB.getDocuments.mockResolvedValue({
        ids: ['doc1'],
        documents: [],
        metadatas: []
      });

      const stats = await adapter.getStats('test-collection');

      expect(stats).toMatchObject({
        documentCount: 1,
        collectionSize: 0,
        lastUpdated: expect.any(Date),
        dimensions: undefined
      });
    });

    it('should get documents with options', async () => {
      const options = {
        ids: ['doc1', 'doc2'],
        where: { category: 'test' },
        limit: 10,
        offset: 5,
        includeDocuments: true,
        includeMetadata: false
      };

      mockChromaDB.getDocuments.mockResolvedValue({
        ids: ['doc1', 'doc2'],
        documents: ['Content 1', 'Content 2'],
        metadatas: [{}, {}]
      });

      const result = await adapter.getDocuments('test-collection', options);

      expect(mockChromaDB.getDocuments).toHaveBeenCalledWith(
        'test-collection',
        {
          ids: ['doc1', 'doc2'],
          where: { category: 'test' },
          limit: 10,
          offset: 5,
          includeDocuments: true,
          includeMetadata: false
        }
      );

      expect(result).toMatchObject({
        ids: ['doc1', 'doc2'],
        documents: ['Content 1', 'Content 2'],
        metadatas: undefined, // Because includeMetadata was false
        embeddings: undefined // Not supported by ChromaDB
      });
    });
  });

  describe('Requirement 2.7: Error Handling & Standardization', () => {
    it('should standardize all ChromaDB errors', async () => {
      const chromaErrors = [
        new Error('Connection timeout'),
        new TypeError('Invalid parameter'),
        new RangeError('Index out of bounds'),
        { message: 'Non-standard error object' }
      ];

      mockChromaDB.addDocuments.mockRejectedValueOnce(chromaErrors[0]);
      mockChromaDB.searchDocuments.mockRejectedValueOnce(chromaErrors[1]);
      mockChromaDB.deleteDocuments.mockRejectedValueOnce(chromaErrors[2]);
      mockChromaDB.getDocuments.mockRejectedValueOnce(chromaErrors[3]);

      const operations = [
        () => adapter.store('test', { document: 'test' }),
        () => adapter.search('test', { queryText: 'test' }),
        () => adapter.delete('test', ['id1']),
        () => adapter.getStats('test')
      ];

      for (const operation of operations) {
        await expect(operation()).rejects.toThrow(VectorOperationError);
      }
    });

    it('should preserve error context in wrapped errors', async () => {
      const originalError = new Error('Specific ChromaDB error');
      mockChromaDB.addDocuments.mockRejectedValue(originalError);

      try {
        await adapter.store('test-collection', { document: 'test' });
      } catch (error) {
        expect(error).toBeInstanceOf(VectorOperationError);
        const wrappedError = error as VectorOperationError;
        
        expect(wrappedError.operation).toBe('store');
        expect(wrappedError.context).toMatchObject({
          collection: 'test-collection',
          error: {
            name: 'Error',
            message: 'Specific ChromaDB error',
            stack: expect.any(String)
          }
        });
      }
    });

    it('should log errors appropriately', async () => {
      const mockLogError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      
      mockChromaDB.addDocuments.mockRejectedValue(new Error('Test error'));

      try {
        await adapter.store('test', { document: 'test' });
      } catch {
        // Error expected
      }

      expect(mockLogError).toHaveBeenCalledWith(
        'Failed to store document in collection test',
        expect.any(Error)
      );
    });
  });

  describe('Performance & Efficiency Requirements', () => {
    it('should efficiently handle large batch operations', async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        document: `Document ${i}`,
        metadata: { index: i }
      }));

      mockChromaDB.addDocuments.mockResolvedValue(undefined);

      const start = performance.now();
      const results = await adapter.storeBatch('test', largeBatch);
      const end = performance.now();

      expect(results).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should complete quickly
      expect(mockChromaDB.addDocuments).toHaveBeenCalledTimes(1); // Single batch call
    });

    it('should minimize ChromaDB API calls', async () => {
      const query: VectorSearchQuery = { queryText: 'test', limit: 5 };
      
      mockChromaDB.searchDocuments.mockResolvedValue({
        ids: [['doc1']],
        documents: [['content']],
        metadatas: [[{}]],
        distances: [[0.1]]
      });

      await adapter.search('test', query);

      expect(mockChromaDB.searchDocuments).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dependency Injection Compatibility', () => {
    it('should accept ChromaDBService via constructor injection', () => {
      expect(adapter).toBeDefined();
      expect(mockChromaDB).toBeDefined();
    });

    it('should accept configuration via injection token', () => {
      // This test passes if the adapter was constructed successfully
      // with the injected configuration
      expect(adapter).toBeInstanceOf(ChromaVectorAdapter);
    });

    it('should initialize logger correctly', () => {
      // Logger should be accessible and functional
      const mockLogDebug = jest.spyOn(Logger.prototype, 'debug');
      
      // Logger is called during initialization
      expect(mockLogDebug).toHaveBeenCalled();
    });
  });
});