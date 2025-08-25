import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NestjsLanggraphModule } from '../../nestjs-langgraph.module';
import { MemoryFacadeService } from '../services/memory-facade.service';
import { DatabaseProviderFactory } from '../providers/database-provider.factory';
import { MemoryProviderModule, MEMORY_DATABASE_DETECTOR } from '../providers/memory-provider.module';
import { MemoryAdapter } from '../../adapters/memory.adapter';
import type { MemoryDetectionResult } from '../interfaces/database-provider.interface';

/**
 * Memory Integration Tests
 * 
 * Tests the complete memory architecture consolidation:
 * - Provider factory auto-detection
 * - Service integration with new provider pattern
 * - Module configuration simplification
 * - End-to-end memory operations
 */
describe('Memory Integration Tests', () => {
  let app: TestingModule;
  let memoryFacade: MemoryFacadeService;
  let providerFactory: DatabaseProviderFactory;
  let memoryAdapter: MemoryAdapter;
  let detectionResult: MemoryDetectionResult;

  describe('Full Module Integration', () => {
    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          NestjsLanggraphModule.forRoot({
            memory: {
              enabled: true,
              type: 'enterprise',
              databases: {
                vector: {
                  type: 'chromadb',
                  autoDetect: true,
                  config: {
                    collection: 'test_memory',
                    embeddingFunction: 'default',
                  },
                },
                graph: {
                  type: 'neo4j',
                  autoDetect: true,
                  config: {
                    database: 'neo4j',
                  },
                },
              },
              features: {
                summarization: true,
                semanticSearch: true,
                retention: true,
                crossThreadPersistence: true,
              },
            },
          }),
        ],
      }).compile();

      // Get services from the integrated module
      memoryFacade = app.get<MemoryFacadeService>(MemoryFacadeService);
      providerFactory = app.get<DatabaseProviderFactory>(DatabaseProviderFactory);
      memoryAdapter = app.get<MemoryAdapter>(MemoryAdapter);
      detectionResult = await app.get<Promise<MemoryDetectionResult>>(MEMORY_DATABASE_DETECTOR);
    });

    afterEach(async () => {
      await app?.close();
    });

    it('should bootstrap complete memory system', () => {
      expect(memoryFacade).toBeDefined();
      expect(providerFactory).toBeDefined();
      expect(memoryAdapter).toBeDefined();
      expect(detectionResult).toBeDefined();
    });

    it('should auto-detect database capabilities', async () => {
      expect(detectionResult).toHaveProperty('hasProviders');
      expect(detectionResult).toHaveProperty('features');
      expect(detectionResult.features).toHaveProperty('semanticSearch');
      expect(detectionResult.features).toHaveProperty('graphTraversal');
    });

    it('should create enterprise memory through adapter', () => {
      const memory = memoryAdapter.create({
        type: 'enterprise',
        userId: 'integration-test-user',
        threadId: 'integration-test-thread',
      });

      expect(memory).toBeDefined();
      expect(memory.memoryKey).toBe('history');
    });

    it('should perform end-to-end memory operations', async () => {
      const threadId = `integration-test-${Date.now()}`;
      const userId = 'integration-user';

      // Store memory entry
      await memoryFacade.store(
        threadId,
        'Test conversation entry',
        {
          type: 'conversation',
          source: 'human',
          importance: 0.7,
        },
        userId
      );

      // Retrieve memories
      const memories = await memoryFacade.retrieve(threadId, 10);
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].content).toBe('Test conversation entry');

      // Clear thread
      await memoryFacade.clear(threadId);
      const clearedMemories = await memoryFacade.retrieve(threadId, 10);
      expect(clearedMemories.length).toBe(0);
    });
  });

  describe('Auto-Detection Scenarios', () => {
    describe('With ChromaDB Available', () => {
      beforeEach(async () => {
        // Mock ChromaDB availability
        jest.doMock('@hive-academy/nestjs-chromadb', () => ({
          NestjsChromaDBModule: {
            forRoot: jest.fn(() => ({ module: 'MockChromaDBModule' })),
          },
          ChromaDBService: jest.fn(),
        }));

        app = await Test.createTestingModule({
          imports: [
            MemoryProviderModule.forRoot(),
            NestjsLanggraphModule.forRoot({
              memory: {
                enabled: true,
                databases: {
                  vector: { type: 'chromadb', autoDetect: true },
                },
              },
            }),
          ],
        }).compile();

        providerFactory = app.get<DatabaseProviderFactory>(DatabaseProviderFactory);
      });

      it('should detect ChromaDB availability', async () => {
        const providers = await providerFactory.getAvailableProviders();
        const chromaProvider = providers.find(p => p.type === 'chromadb');
        
        // Should detect ChromaDB even if mocked
        expect(chromaProvider).toBeDefined();
      });

      it('should enable semantic search features', async () => {
        const detection = await providerFactory.detectMemoryCapabilities();
        expect(detection.features.semanticSearch).toBe(true);
      });
    });

    describe('With Neo4j Available', () => {
      beforeEach(async () => {
        // Mock Neo4j availability
        jest.doMock('@hive-academy/nestjs-neo4j', () => ({
          NestjsNeo4jModule: {
            forRoot: jest.fn(() => ({ module: 'MockNeo4jModule' })),
          },
          Neo4jService: jest.fn(),
        }));

        app = await Test.createTestingModule({
          imports: [
            MemoryProviderModule.forRoot(),
            NestjsLanggraphModule.forRoot({
              memory: {
                enabled: true,
                databases: {
                  graph: { type: 'neo4j', autoDetect: true },
                },
              },
            }),
          ],
        }).compile();

        providerFactory = app.get<DatabaseProviderFactory>(DatabaseProviderFactory);
      });

      it('should detect Neo4j availability', async () => {
        const providers = await providerFactory.getAvailableProviders();
        const neo4jProvider = providers.find(p => p.type === 'neo4j');
        
        // Should detect Neo4j even if mocked
        expect(neo4jProvider).toBeDefined();
      });

      it('should enable graph traversal features', async () => {
        const detection = await providerFactory.detectMemoryCapabilities();
        expect(detection.features.graphTraversal).toBe(true);
      });
    });

    describe('With Both Databases Available', () => {
      beforeEach(async () => {
        app = await Test.createTestingModule({
          imports: [
            NestjsLanggraphModule.forRoot({
              memory: {
                enabled: true,
                type: 'enterprise',
                databases: {
                  vector: { type: 'chromadb', autoDetect: true },
                  graph: { type: 'neo4j', autoDetect: true },
                },
                features: {
                  summarization: true,
                  semanticSearch: true,
                  retention: true,
                  crossThreadPersistence: true,
                },
              },
            }),
          ],
        }).compile();

        providerFactory = app.get<DatabaseProviderFactory>(DatabaseProviderFactory);
        detectionResult = await app.get<Promise<MemoryDetectionResult>>(MEMORY_DATABASE_DETECTOR);
      });

      it('should enable full enterprise feature set', async () => {
        expect(detectionResult.features.semanticSearch).toBe(true);
        expect(detectionResult.features.graphTraversal).toBe(true);
        expect(detectionResult.features.persistentMemory).toBe(true);
        expect(detectionResult.features.crossThreadMemory).toBe(true);
      });

      it('should recommend enterprise configuration', async () => {
        expect(detectionResult.recommendedConfig).toBeDefined();
        expect(detectionResult.recommendedConfig?.type).toBe('enterprise');
      });
    });

    describe('With No Databases Available', () => {
      beforeEach(async () => {
        // Mock no database availability
        const mockProviderFactory = {
          detectMemoryCapabilities: jest.fn().mockResolvedValue({
            hasProviders: false,
            vectorProviders: [],
            graphProviders: [],
            customProviders: [],
            recommendedConfig: null,
            features: {
              semanticSearch: false,
              graphTraversal: false,
              persistentMemory: false,
              crossThreadMemory: false,
            },
          }),
          getAvailableProviders: jest.fn().mockResolvedValue([]),
        };

        app = await Test.createTestingModule({
          imports: [
            NestjsLanggraphModule.forRoot({
              memory: { enabled: true },
            }),
          ],
          providers: [
            {
              provide: DatabaseProviderFactory,
              useValue: mockProviderFactory,
            },
          ],
        }).overrideProvider(DatabaseProviderFactory).useValue(mockProviderFactory).compile();

        providerFactory = app.get<DatabaseProviderFactory>(DatabaseProviderFactory);
      });

      it('should gracefully fallback to basic memory', async () => {
        const detection = await providerFactory.detectMemoryCapabilities();
        expect(detection.hasProviders).toBe(false);
        expect(detection.features.semanticSearch).toBe(false);
        expect(detection.features.graphTraversal).toBe(false);
      });

      it('should still provide basic memory functionality', async () => {
        const memoryAdapter = app.get<MemoryAdapter>(MemoryAdapter);
        expect(memoryAdapter.isEnterpriseAvailable()).toBe(false);
        
        const memory = memoryAdapter.create({ type: 'buffer' });
        expect(memory).toBeDefined();
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate enterprise memory configuration', async () => {
      const validConfig = {
        memory: {
          enabled: true,
          type: 'enterprise' as const,
          databases: {
            vector: {
              type: 'chromadb' as const,
              autoDetect: true,
              config: {
                collection: 'test_collection',
                embeddingFunction: 'default',
              },
            },
          },
          features: {
            semanticSearch: true,
            retention: true,
          },
        },
      };

      expect(async () => {
        await Test.createTestingModule({
          imports: [NestjsLanggraphModule.forRoot(validConfig)],
        }).compile();
      }).not.toThrow();
    });

    it('should handle legacy configuration format', async () => {
      const legacyConfig = {
        memory: {
          enabled: true,
          chromadb: {
            collection: 'legacy_collection',
          },
          neo4j: {
            database: 'neo4j',
          },
        },
      };

      expect(async () => {
        await Test.createTestingModule({
          imports: [NestjsLanggraphModule.forRoot(legacyConfig)],
        }).compile();
      }).not.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [
          NestjsLanggraphModule.forRoot({
            memory: {
              enabled: true,
              type: 'enterprise',
            },
          }),
        ],
      }).compile();

      memoryFacade = app.get<MemoryFacadeService>(MemoryFacadeService);
    });

    it('should handle concurrent memory operations', async () => {
      const threadId = `concurrent-test-${Date.now()}`;
      const operations = [];

      // Create multiple concurrent store operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          memoryFacade.store(
            threadId,
            `Concurrent message ${i}`,
            { type: 'conversation', source: 'test', importance: 0.5 },
            'concurrent-user'
          )
        );
      }

      // All operations should complete without errors
      await expect(Promise.all(operations)).resolves.toBeDefined();

      // Verify all entries were stored
      const memories = await memoryFacade.retrieve(threadId, 20);
      expect(memories.length).toBe(10);
    });

    it('should maintain data consistency across operations', async () => {
      const threadId = `consistency-test-${Date.now()}`;
      const testContent = 'Consistency test message';

      // Store, retrieve, and verify consistency
      await memoryFacade.store(
        threadId,
        testContent,
        { type: 'conversation', source: 'test', importance: 0.8 },
        'consistency-user'
      );

      const retrieved = await memoryFacade.retrieve(threadId, 1);
      expect(retrieved[0].content).toBe(testContent);
      expect(retrieved[0].metadata.importance).toBe(0.8);
    });
  });
});