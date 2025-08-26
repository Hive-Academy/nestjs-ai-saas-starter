import {
  IVectorService,
  VectorStoreData,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStats,
  VectorGetOptions,
  VectorGetResult,
  InvalidCollectionError,
  InvalidInputError,
  VectorOperationError,
} from './vector-service.interface';

/**
 * Test Implementation of IVectorService for Interface Contract Testing
 * 
 * This concrete implementation allows us to test the interface contract,
 * validation methods, and error handling defined in the abstract class.
 */
class TestVectorService extends IVectorService {
  private storage = new Map<string, Map<string, VectorStoreData & { id: string }>>();

  async store(collection: string, data: VectorStoreData): Promise<string> {
    this.validateCollection(collection);
    this.validateStoreData(data);
    
    if (!this.storage.has(collection)) {
      this.storage.set(collection, new Map());
    }
    
    const id = data.id || `test_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.storage.get(collection)!.set(id, { ...data, id });
    return id;
  }

  async storeBatch(
    collection: string,
    data: readonly VectorStoreData[]
  ): Promise<readonly string[]> {
    const ids: string[] = [];
    for (const item of data) {
      ids.push(await this.store(collection, item));
    }
    return ids;
  }

  async search(
    collection: string,
    query: VectorSearchQuery
  ): Promise<readonly VectorSearchResult[]> {
    this.validateCollection(collection);
    return [];
  }

  async delete(collection: string, ids: readonly string[]): Promise<void> {
    this.validateCollection(collection);
    this.validateIds(ids);
    // Implementation not needed for interface testing
  }

  async deleteByFilter(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    this.validateCollection(collection);
    return 0;
  }

  async getStats(collection: string): Promise<VectorStats> {
    this.validateCollection(collection);
    return {
      documentCount: 0,
      collectionSize: 0,
      lastUpdated: new Date(),
    };
  }

  async getDocuments(
    collection: string,
    options?: VectorGetOptions
  ): Promise<VectorGetResult> {
    this.validateCollection(collection);
    return {
      ids: [],
      documents: [],
      metadatas: [],
    };
  }
}

describe('IVectorService Interface Contract', () => {
  let vectorService: TestVectorService;

  beforeEach(() => {
    vectorService = new TestVectorService();
  });

  describe('Requirement 1.1: Vector Service Interface Operations', () => {
    it('should define all required ChromaDB operations', () => {
      // Verify interface defines all required methods
      expect(typeof vectorService.store).toBe('function');
      expect(typeof vectorService.storeBatch).toBe('function');
      expect(typeof vectorService.search).toBe('function');
      expect(typeof vectorService.delete).toBe('function');
      expect(typeof vectorService.deleteByFilter).toBe('function');
      expect(typeof vectorService.getStats).toBe('function');
      expect(typeof vectorService.getDocuments).toBe('function');
    });

    it('should support both synchronous and asynchronous operations', async () => {
      // All methods should return Promises for async operations
      const storeResult = vectorService.store('test', { document: 'test' });
      expect(storeResult).toBeInstanceOf(Promise);

      const batchResult = vectorService.storeBatch('test', [{ document: 'test' }]);
      expect(batchResult).toBeInstanceOf(Promise);

      const searchResult = vectorService.search('test', { queryText: 'test' });
      expect(searchResult).toBeInstanceOf(Promise);

      const deleteResult = vectorService.delete('test', ['id1']);
      expect(deleteResult).toBeInstanceOf(Promise);

      const statsResult = vectorService.getStats('test');
      expect(statsResult).toBeInstanceOf(Promise);

      const getResult = vectorService.getDocuments('test');
      expect(getResult).toBeInstanceOf(Promise);
    });
  });

  describe('Requirement 1.2: Interface Error Handling Contracts', () => {
    describe('Collection Validation', () => {
      it('should throw InvalidCollectionError for empty collection name', async () => {
        await expect(vectorService.store('', { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);

        await expect(vectorService.store('   ', { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);
      });

      it('should throw InvalidCollectionError for collection name exceeding 100 characters', async () => {
        const longName = 'a'.repeat(101);
        await expect(vectorService.store(longName, { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);
      });

      it('should throw InvalidCollectionError for invalid collection name characters', async () => {
        await expect(vectorService.store('test collection', { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);

        await expect(vectorService.store('test@collection', { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);

        await expect(vectorService.store('test.collection', { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);
      });

      it('should accept valid collection names', async () => {
        const validNames = ['test', 'test_collection', 'test-collection', 'TestCollection123'];
        
        for (const name of validNames) {
          await expect(vectorService.store(name, { document: 'test' }))
            .resolves.toBeTruthy();
        }
      });
    });

    describe('Document Data Validation', () => {
      it('should throw InvalidInputError for empty document content', async () => {
        await expect(vectorService.store('test', { document: '' }))
          .rejects.toThrow(InvalidInputError);

        await expect(vectorService.store('test', { document: '   ' }))
          .rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for oversized document content', async () => {
        const largeDocument = 'x'.repeat(100001);
        await expect(vectorService.store('test', { document: largeDocument }))
          .rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for invalid metadata type', async () => {
        await expect(vectorService.store('test', {
          document: 'test',
          metadata: 'invalid' as any
        })).rejects.toThrow(InvalidInputError);

        await expect(vectorService.store('test', {
          document: 'test',
          metadata: 123 as any
        })).rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for invalid embedding type', async () => {
        await expect(vectorService.store('test', {
          document: 'test',
          embedding: 'invalid' as any
        })).rejects.toThrow(InvalidInputError);

        await expect(vectorService.store('test', {
          document: 'test',
          embedding: { invalid: true } as any
        })).rejects.toThrow(InvalidInputError);
      });

      it('should accept valid document data', async () => {
        const validData: VectorStoreData = {
          id: 'test-id',
          document: 'This is a valid document',
          metadata: { category: 'test', tags: ['valid'] },
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        };

        await expect(vectorService.store('test', validData))
          .resolves.toBeTruthy();
      });
    });

    describe('ID Validation', () => {
      it('should throw InvalidInputError for empty ID arrays', async () => {
        await expect(vectorService.delete('test', []))
          .rejects.toThrow(InvalidInputError);
      });

      it('should throw InvalidInputError for arrays with empty IDs', async () => {
        await expect(vectorService.delete('test', ['valid-id', '', 'another-id']))
          .rejects.toThrow(InvalidInputError);

        await expect(vectorService.delete('test', ['valid-id', '   ', 'another-id']))
          .rejects.toThrow(InvalidInputError);
      });

      it('should accept valid ID arrays', async () => {
        await expect(vectorService.delete('test', ['id1', 'id2', 'id3']))
          .resolves.toBeUndefined();
      });
    });
  });

  describe('Requirement 1.3: Interface Type Definitions', () => {
    it('should define comprehensive VectorStoreData interface', () => {
      const data: VectorStoreData = {
        id: 'test-id',
        document: 'Test document',
        metadata: { key: 'value' },
        embedding: [1, 2, 3]
      };

      // TypeScript compilation ensures interface is correct
      expect(data.id).toBe('test-id');
      expect(data.document).toBe('Test document');
      expect(data.metadata).toEqual({ key: 'value' });
      expect(data.embedding).toEqual([1, 2, 3]);
    });

    it('should define comprehensive VectorSearchQuery interface', () => {
      const query: VectorSearchQuery = {
        queryText: 'search text',
        queryEmbedding: [0.1, 0.2, 0.3],
        filter: { category: 'test' },
        limit: 10,
        minScore: 0.5
      };

      expect(query.queryText).toBe('search text');
      expect(query.queryEmbedding).toEqual([0.1, 0.2, 0.3]);
      expect(query.filter).toEqual({ category: 'test' });
      expect(query.limit).toBe(10);
      expect(query.minScore).toBe(0.5);
    });

    it('should define comprehensive VectorSearchResult interface', () => {
      const result: VectorSearchResult = {
        id: 'result-id',
        document: 'Result document',
        metadata: { key: 'value' },
        distance: 0.3,
        relevanceScore: 0.7
      };

      expect(result.id).toBe('result-id');
      expect(result.document).toBe('Result document');
      expect(result.metadata).toEqual({ key: 'value' });
      expect(result.distance).toBe(0.3);
      expect(result.relevanceScore).toBe(0.7);
    });

    it('should define comprehensive VectorStats interface', () => {
      const stats: VectorStats = {
        documentCount: 100,
        collectionSize: 1024000,
        lastUpdated: new Date(),
        dimensions: 384
      };

      expect(stats.documentCount).toBe(100);
      expect(stats.collectionSize).toBe(1024000);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
      expect(stats.dimensions).toBe(384);
    });

    it('should define comprehensive VectorGetOptions interface', () => {
      const options: VectorGetOptions = {
        ids: ['id1', 'id2'],
        where: { category: 'test' },
        limit: 50,
        offset: 10,
        includeDocuments: true,
        includeMetadata: true,
        includeEmbeddings: false
      };

      expect(options.ids).toEqual(['id1', 'id2']);
      expect(options.where).toEqual({ category: 'test' });
      expect(options.limit).toBe(50);
      expect(options.offset).toBe(10);
      expect(options.includeDocuments).toBe(true);
      expect(options.includeMetadata).toBe(true);
      expect(options.includeEmbeddings).toBe(false);
    });
  });

  describe('Requirement 1.4: Interface Public API Export', () => {
    it('should export all required interfaces and classes', () => {
      // These should be importable and usable
      expect(IVectorService).toBeDefined();
      expect(InvalidCollectionError).toBeDefined();
      expect(InvalidInputError).toBeDefined();
      expect(VectorOperationError).toBeDefined();
    });

    it('should allow interface implementations', () => {
      // This test passes if TestVectorService compiles successfully
      expect(vectorService).toBeInstanceOf(IVectorService);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      await expect(vectorService.store(null as any, { document: 'test' }))
        .rejects.toThrow(InvalidCollectionError);

      await expect(vectorService.store(undefined as any, { document: 'test' }))
        .rejects.toThrow(InvalidCollectionError);

      await expect(vectorService.store('test', null as any))
        .rejects.toThrow();

      await expect(vectorService.store('test', undefined as any))
        .rejects.toThrow();
    });

    it('should sanitize collection names to prevent injection attacks', async () => {
      const maliciousNames = [
        'test; DROP TABLE collections; --',
        'test\nDROP',
        'test\x00malicious',
        '../../../etc/passwd'
      ];

      for (const name of maliciousNames) {
        await expect(vectorService.store(name, { document: 'test' }))
          .rejects.toThrow(InvalidCollectionError);
      }
    });

    it('should handle concurrent operations safely', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        vectorService.store('test', { document: `Document ${i}` })
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
      expect(new Set(results).size).toBe(10); // All IDs should be unique
    });
  });

  describe('Performance Requirements', () => {
    it('should validate inputs efficiently', async () => {
      const start = performance.now();
      
      // Run validation 1000 times
      for (let i = 0; i < 1000; i++) {
        await vectorService.store('test', {
          document: `Test document ${i}`,
          metadata: { index: i }
        });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 1000;
      
      // Validation should add < 1ms overhead per operation
      expect(avgTime).toBeLessThan(1);
    });
  });
});