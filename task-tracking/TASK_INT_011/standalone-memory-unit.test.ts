/**
 * COMPREHENSIVE UNIT TESTS: Standalone Memory Module
 * 
 * Tests the USER'S CORE QUESTION: "would we still need this library?"
 * Answer: NO - Memory module works completely standalone
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MemoryModule } from '@hive-academy/nestjs-memory';
import { MemoryService } from '@hive-academy/nestjs-memory';
import { MemoryStorageService } from '@hive-academy/nestjs-memory';
import { MemoryGraphService } from '@hive-academy/nestjs-memory';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { MEMORY_CONFIG } from '@hive-academy/nestjs-memory';
import type { MemoryEntry, MemoryModuleOptions } from '@hive-academy/nestjs-memory';

describe('Standalone Memory Module - User Requirements Validation', () => {
  describe('📋 USER REQUIREMENT 1: Memory module works standalone (no nestjs-langgraph needed)', () => {
    let memoryService: MemoryService;
    let storageService: MemoryStorageService;
    let graphService: MemoryGraphService;
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          // CRITICAL TEST: Import ONLY standalone memory module
          // NO nestjs-langgraph dependency required
          MemoryModule.forRoot({
            chromadb: {
              collection: 'test-standalone-memory',
              embeddingFunction: 'default'
            },
            neo4j: {
              database: 'test-memory'
            },
            retention: {
              maxEntries: 1000,
              ttlDays: 7
            }
          })
        ]
      }).compile();

      memoryService = module.get<MemoryService>(MemoryService);
      storageService = module.get<MemoryStorageService>(MemoryStorageService);
      graphService = module.get<MemoryGraphService>(MemoryGraphService);
    });

    afterEach(async () => {
      await module.close();
    });

    describe('✅ Service Instantiation - Independent of nestjs-langgraph', () => {
      it('should instantiate all memory services without nestjs-langgraph', async () => {
        expect(memoryService).toBeDefined();
        expect(memoryService).toBeInstanceOf(MemoryService);
        expect(storageService).toBeDefined();
        expect(storageService).toBeInstanceOf(MemoryStorageService);
        expect(graphService).toBeDefined();
        expect(graphService).toBeInstanceOf(MemoryGraphService);
      });

      it('should provide configuration without adapter complexity', async () => {
        const config = module.get(MEMORY_CONFIG);
        expect(config).toBeDefined();
        expect(config.chromadb?.collection).toBe('test-standalone-memory');
        expect(config.neo4j?.database).toBe('test-memory');
      });

      it('should have direct database connections (no adapters)', async () => {
        // Verify storage service has direct ChromaDB access
        expect(storageService['chromaService']).toBeDefined();
        
        // Verify graph service has direct Neo4j access  
        expect(graphService['neo4jService']).toBeDefined();

        // CRITICAL: No adapter layer complexity
        expect(storageService['adapter']).toBeUndefined();
        expect(graphService['adapter']).toBeUndefined();
      });
    });

    describe('✅ Core Memory Operations - Full Functionality', () => {
      const testThreadId = 'test-thread-standalone';
      const testUserId = 'test-user-123';

      it('should store memory entries', async () => {
        const result = await memoryService.store(
          testThreadId,
          'Test memory content',
          { type: 'user-message', importance: 'high' },
          testUserId
        );

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.threadId).toBe(testThreadId);
        expect(result.content).toBe('Test memory content');
        expect(result.metadata.type).toBe('user-message');
        expect(result.userId).toBe(testUserId);
        expect(result.createdAt).toBeInstanceOf(Date);
      });

      it('should store batch memory entries', async () => {
        const entries = [
          { content: 'Message 1', metadata: { type: 'user-message' } },
          { content: 'Message 2', metadata: { type: 'assistant-message' } },
          { content: 'Message 3', metadata: { type: 'system-message' } }
        ];

        const results = await memoryService.storeBatch(testThreadId, entries, testUserId);

        expect(results).toHaveLength(3);
        results.forEach((result, index) => {
          expect(result.id).toBeDefined();
          expect(result.threadId).toBe(testThreadId);
          expect(result.content).toBe(entries[index].content);
          expect(result.metadata.type).toBe(entries[index].metadata.type);
        });
      });

      it('should retrieve memories by thread', async () => {
        // Store test memories first
        await memoryService.storeBatch(testThreadId, [
          { content: 'Retrievable message 1', metadata: { type: 'user-message' } },
          { content: 'Retrievable message 2', metadata: { type: 'assistant-message' } }
        ], testUserId);

        const results = await memoryService.retrieve(testThreadId, 10);

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        results.forEach(memory => {
          expect(memory.threadId).toBe(testThreadId);
        });
      });

      it('should search memories with filters', async () => {
        // Store searchable content
        await memoryService.store(
          testThreadId,
          'Searchable content about artificial intelligence',
          { type: 'user-message', tags: '["ai", "search"]' },
          testUserId
        );

        const results = await memoryService.search({
          query: 'artificial intelligence',
          threadId: testThreadId,
          userId: testUserId,
          type: 'user-message',
          limit: 5
        });

        expect(Array.isArray(results)).toBe(true);
        results.forEach(memory => {
          expect(memory.threadId).toBe(testThreadId);
          expect(memory.metadata.type).toBe('user-message');
        });
      });

      it('should search for context with user patterns', async () => {
        // Store varied content for pattern analysis
        await memoryService.storeBatch(testThreadId, [
          { content: 'AI discussion', metadata: { type: 'user-message', tags: '["ai"]' } },
          { content: 'Machine learning topic', metadata: { type: 'user-message', tags: '["ml"]' } },
          { content: 'Deep learning concepts', metadata: { type: 'assistant-message', tags: '["dl"]' } }
        ], testUserId);

        const result = await memoryService.searchForContext(
          'artificial intelligence',
          testThreadId,
          testUserId
        );

        expect(result).toBeDefined();
        expect(result.relevantMemories).toBeDefined();
        expect(Array.isArray(result.relevantMemories)).toBe(true);
        expect(result.userPatterns).toBeDefined();
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it('should summarize conversations', async () => {
        const mockMessages = [
          { content: 'Hello, I need help with AI', type: 'user' },
          { content: 'I can help you with AI concepts', type: 'assistant' },
          { content: 'What is machine learning?', type: 'user' },
          { content: 'Machine learning is a subset of AI', type: 'assistant' }
        ] as any[];

        const summary = await memoryService.summarize(testThreadId, mockMessages, {
          strategy: 'balanced',
          maxLength: 150
        });

        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        expect(summary.length).toBeLessThanOrEqual(150);
      });

      it('should delete specific memories', async () => {
        // Store memories to delete
        const stored = await memoryService.storeBatch(testThreadId, [
          { content: 'To be deleted 1', metadata: { type: 'user-message' } },
          { content: 'To be deleted 2', metadata: { type: 'user-message' } }
        ], testUserId);

        const deletedCount = await memoryService.delete(
          testThreadId, 
          stored.map(m => m.id)
        );

        expect(deletedCount).toBe(2);
      });

      it('should clear all memories for a thread', async () => {
        const clearThreadId = 'clear-test-thread';
        
        // Store memories to clear
        await memoryService.storeBatch(clearThreadId, [
          { content: 'Clear me 1', metadata: { type: 'user-message' } },
          { content: 'Clear me 2', metadata: { type: 'assistant-message' } }
        ], testUserId);

        await memoryService.clear(clearThreadId);

        const remaining = await memoryService.retrieve(clearThreadId);
        expect(remaining).toHaveLength(0);
      });
    });

    describe('✅ Advanced Features - No Feature Loss', () => {
      it('should get memory statistics', async () => {
        const stats = await memoryService.getStats();

        expect(stats).toBeDefined();
        expect(typeof stats.totalMemories).toBe('number');
        expect(typeof stats.activeThreads).toBe('number');
        expect(typeof stats.averageMemorySize).toBe('number');
        expect(typeof stats.totalStorageUsed).toBe('number');
        expect(typeof stats.cacheHitRate).toBe('number');
        expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
        expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
      });

      it('should get user patterns', async () => {
        const testUserId = 'pattern-test-user';
        
        // Create diverse memory patterns
        await memoryService.storeBatch('pattern-thread', [
          { content: 'AI topic 1', metadata: { type: 'user-message', tags: '["ai", "chat"]' } },
          { content: 'ML discussion', metadata: { type: 'user-message', tags: '["ml"]' } },
          { content: 'Code help', metadata: { type: 'code-request', tags: '["programming"]' } },
          { content: 'Assistant response', metadata: { type: 'assistant-message', tags: '["helpful"]' } }
        ], testUserId);

        const patterns = await memoryService.getUserPatterns(testUserId);

        expect(patterns).toBeDefined();
        expect(patterns.userId).toBe(testUserId);
        expect(Array.isArray(patterns.commonTopics)).toBe(true);
        expect(typeof patterns.interactionFrequency).toBe('object');
        expect(Array.isArray(patterns.preferredMemoryTypes)).toBe(true);
        expect(typeof patterns.averageSessionLength).toBe('number');
        expect(typeof patterns.totalSessions).toBe('number');
      });

      it('should get conversation flow', async () => {
        const flowThreadId = 'flow-test-thread';
        
        await memoryService.storeBatch(flowThreadId, [
          { content: 'Start conversation', metadata: { type: 'user-message' } },
          { content: 'Middle response', metadata: { type: 'assistant-message' } },
          { content: 'End message', metadata: { type: 'user-message' } }
        ], 'flow-user');

        const flow = await memoryService.getConversationFlow(flowThreadId);

        expect(Array.isArray(flow)).toBe(true);
        flow.forEach(item => {
          expect(item.memoryId).toBeDefined();
          expect(item.content).toBeDefined();
          expect(item.type).toBeDefined();
          expect(item.createdAt).toBeDefined();
          expect(Array.isArray(item.connections)).toBe(true);
        });
      });

      it('should build semantic relationships', async () => {
        // This should not throw and complete successfully
        await expect(memoryService.buildSemanticRelationships()).resolves.not.toThrow();
      });

      it('should perform cleanup operations', async () => {
        const cleanedCount = await memoryService.cleanup();
        expect(typeof cleanedCount).toBe('number');
        expect(cleanedCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('📋 USER REQUIREMENT 2: Standard NestJS Module Patterns', () => {
    it('should support forRoot configuration', async () => {
      const options: MemoryModuleOptions = {
        chromadb: {
          collection: 'forroot-test',
          embeddingFunction: 'openai'
        },
        neo4j: {
          database: 'forroot-db'
        },
        retention: {
          maxEntries: 500,
          ttlDays: 3
        }
      };

      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          MemoryModule.forRoot(options)
        ]
      }).compile();

      const config = module.get(MEMORY_CONFIG);
      expect(config.chromadb.collection).toBe('forroot-test');
      expect(config.chromadb.embeddingFunction).toBe('openai');
      expect(config.neo4j.database).toBe('forroot-db');
      expect(config.retention.maxEntries).toBe(500);
      expect(config.retention.ttlDays).toBe(3);

      await module.close();
    });

    it('should support forRootAsync with useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          MemoryModule.forRootAsync({
            useFactory: async () => ({
              chromadb: {
                collection: 'async-factory-test',
                embeddingFunction: 'default'
              },
              neo4j: {
                database: 'async-db'
              }
            })
          })
        ]
      }).compile();

      const config = module.get(MEMORY_CONFIG);
      expect(config.chromadb.collection).toBe('async-factory-test');
      expect(config.neo4j.database).toBe('async-db');

      await module.close();
    });

    it('should support forRootAsync with useClass', async () => {
      class TestConfigService {
        createMemoryOptions() {
          return {
            chromadb: {
              collection: 'async-class-test',
              embeddingFunction: 'cohere'
            },
            neo4j: {
              database: 'async-class-db'
            }
          };
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          MemoryModule.forRootAsync({
            useClass: TestConfigService
          })
        ]
      }).compile();

      const config = module.get(MEMORY_CONFIG);
      expect(config.chromadb.collection).toBe('async-class-test');
      expect(config.chromadb.embeddingFunction).toBe('cohere');
      expect(config.neo4j.database).toBe('async-class-db');

      await module.close();
    });
  });

  describe('📋 USER REQUIREMENT 3: Direct Database Integration (No Adapters)', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          MemoryModule.forRoot({
            chromadb: { collection: 'direct-test' },
            neo4j: { database: 'direct-db' }
          })
        ]
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should have direct ChromaDB integration', async () => {
      const storageService = module.get<MemoryStorageService>(MemoryStorageService);
      
      // Check that it has direct access to ChromaDB service
      expect(storageService['chromaService']).toBeDefined();
      
      // Verify no adapter complexity
      expect(storageService['vectorAdapter']).toBeUndefined();
      expect(storageService['databaseProvider']).toBeUndefined();
    });

    it('should have direct Neo4j integration', async () => {
      const graphService = module.get<MemoryGraphService>(MemoryGraphService);
      
      // Check that it has direct access to Neo4j service
      expect(graphService['neo4jService']).toBeDefined();
      
      // Verify no adapter complexity
      expect(graphService['graphAdapter']).toBeUndefined();
      expect(graphService['databaseProvider']).toBeUndefined();
    });

    it('should import required database modules automatically', async () => {
      // Verify ChromaDB module is available
      const chromaService = module.get('ChromaDBService');
      expect(chromaService).toBeDefined();

      // Verify Neo4j module is available  
      const neo4jService = module.get('Neo4jService');
      expect(neo4jService).toBeDefined();
    });
  });

  describe('📋 USER REQUIREMENT 4: Bundle Size & Performance', () => {
    it('should have minimal dependencies', () => {
      // The standalone memory module should only depend on:
      // - @nestjs/common, @nestjs/core (NestJS core)
      // - @hive-academy/nestjs-chromadb (vector database)
      // - @hive-academy/nestjs-neo4j (graph database)
      // - @langchain/core (types only)
      
      // No nestjs-langgraph dependency needed
      expect(() => require('@hive-academy/nestjs-langgraph')).toThrow();
    });

    it('should initialize quickly without complex adapter loading', async () => {
      const startTime = performance.now();
      
      const module = await Test.createTestingModule({
        imports: [
          MemoryModule.forRoot({
            chromadb: { collection: 'perf-test' },
            neo4j: { database: 'perf-db' }
          })
        ]
      }).compile();

      const endTime = performance.now();
      const initTime = endTime - startTime;

      // Should initialize in under 100ms (much faster than complex adapter system)
      expect(initTime).toBeLessThan(100);
      
      await module.close();
    });

    it('should have efficient memory operations', async () => {
      const module = await Test.createTestingModule({
        imports: [
          MemoryModule.forRoot({
            chromadb: { collection: 'efficiency-test' },
            neo4j: { database: 'efficiency-db' }
          })
        ]
      }).compile();

      const memoryService = module.get<MemoryService>(MemoryService);
      const threadId = 'efficiency-thread';

      // Measure store operation
      const storeStart = performance.now();
      await memoryService.store(threadId, 'Performance test content');
      const storeEnd = performance.now();

      // Measure retrieve operation
      const retrieveStart = performance.now();
      await memoryService.retrieve(threadId);
      const retrieveEnd = performance.now();

      // Operations should be fast without adapter overhead
      expect(storeEnd - storeStart).toBeLessThan(50); // Under 50ms
      expect(retrieveEnd - retrieveStart).toBeLessThan(50); // Under 50ms

      await module.close();
    });
  });
});