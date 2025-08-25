import { Test, TestingModule } from '@nestjs/testing';
import { MemoryAdapter, MemoryConfig } from '../memory.adapter';
import { MemoryFacadeService } from '../../memory/services/memory-facade.service';
import { DatabaseProviderFactory } from '../../memory/providers/database-provider.factory';
import { BaseMemory } from '@langchain/core/memory';
import { BufferMemory } from 'langchain/memory';

/**
 * Memory Adapter Integration Tests
 * 
 * Tests the enhanced memory adapter with provider factory pattern:
 * - Auto-detection of ChromaDB and Neo4j services
 * - Graceful fallback when databases not available
 * - EnterpriseMemoryWrapper compatibility with new services
 * - Configuration simplification
 */
describe('MemoryAdapter Integration Tests', () => {
  let adapter: MemoryAdapter;
  let memoryFacade: MemoryFacadeService;
  let providerFactory: DatabaseProviderFactory;

  describe('With Enterprise Services Available', () => {
    beforeEach(async () => {
      // Mock provider factory with available services
      const mockProviderFactory = {
        detectMemoryCapabilities: jest.fn().mockResolvedValue({
          hasProviders: true,
          vectorProviders: [{ type: 'chromadb', available: true }],
          graphProviders: [{ type: 'neo4j', available: true }],
          customProviders: [],
          recommendedConfig: {
            type: 'enterprise',
            databases: {
              vector: { type: 'chromadb', autoDetect: true },
              graph: { type: 'neo4j', autoDetect: true }
            }
          },
          features: {
            semanticSearch: true,
            graphTraversal: true,
            persistentMemory: true,
            crossThreadMemory: true,
          }
        }),
        getAvailableProviders: jest.fn().mockResolvedValue([
          { type: 'chromadb', available: true },
          { type: 'neo4j', available: true }
        ]),
        createProvider: jest.fn(),
        hasProvider: jest.fn().mockReturnValue(true),
      } as any;

      // Mock memory facade with essential methods
      const mockMemoryFacade = {
        store: jest.fn().mockResolvedValue(undefined),
        retrieve: jest.fn().mockResolvedValue([
          { 
            content: 'Previous conversation',
            metadata: { type: 'conversation', source: 'human' }
          }
        ]),
        clear: jest.fn().mockResolvedValue(undefined),
        search: jest.fn().mockResolvedValue([]),
        summarize: jest.fn().mockResolvedValue('Summary'),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          {
            provide: MemoryFacadeService,
            useValue: mockMemoryFacade,
          },
          {
            provide: DatabaseProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      adapter = module.get<MemoryAdapter>(MemoryAdapter);
      memoryFacade = module.get<MemoryFacadeService>(MemoryFacadeService);
      providerFactory = module.get<DatabaseProviderFactory>(DatabaseProviderFactory);
    });

    it('should be defined with enterprise services', () => {
      expect(adapter).toBeDefined();
      expect(adapter.isEnterpriseAvailable()).toBe(true);
    });

    it('should create enterprise memory for enterprise type', () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory).toBeDefined();
      expect(memory.memoryKey).toBe('history');
      expect(memory.returnMessages).toBe(true);
    });

    it('should create enterprise memory for chromadb config', () => {
      const config: MemoryConfig = {
        type: 'buffer',
        chromadb: {
          collection: 'test-collection',
        },
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory).toBeDefined();
      expect(memory.memoryKey).toBe('history');
    });

    it('should create enterprise memory for neo4j config', () => {
      const config: MemoryConfig = {
        type: 'buffer',
        neo4j: {
          uri: 'bolt://localhost:7687',
          user: 'neo4j',
          password: 'test',
        },
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory).toBeDefined();
      expect(memory.memoryKey).toBe('history');
    });

    it('should load memory variables from enterprise service', async () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      const variables = await memory.loadMemoryVariables({});
      
      expect(variables).toHaveProperty('history');
      expect(Array.isArray(variables.history)).toBe(true);
      expect(memoryFacade.retrieve).toHaveBeenCalledWith('test-thread', 50);
    });

    it('should save context to enterprise service', async () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
        inputKey: 'input',
        outputKey: 'output',
      };

      const memory = adapter.create(config);
      await memory.saveContext(
        { input: 'Hello' },
        { output: 'Hi there!' }
      );
      
      expect(memoryFacade.store).toHaveBeenCalledTimes(2);
      expect(memoryFacade.store).toHaveBeenCalledWith(
        'test-thread',
        'Hello',
        { type: 'conversation', source: 'human', importance: 0.5 },
        'test-user'
      );
      expect(memoryFacade.store).toHaveBeenCalledWith(
        'test-thread',
        'Hi there!',
        { type: 'conversation', source: 'ai', importance: 0.5 },
        'test-user'
      );
    });

    it('should clear enterprise memory', async () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      await memory.clear();
      
      expect(memoryFacade.clear).toHaveBeenCalledWith('test-thread');
    });

    it('should return comprehensive adapter status', () => {
      const status = adapter.getAdapterStatus();
      
      expect(status.enterpriseAvailable).toBe(true);
      expect(status.fallbackMode).toBe(false);
      expect(status.capabilities).toContain('enterprise');
      expect(status.capabilities).toContain('semantic_search');
      expect(status.capabilities).toContain('chromadb_storage');
      expect(status.capabilities).toContain('neo4j_storage');
    });
  });

  describe('Without Enterprise Services (Fallback Mode)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          // No enterprise services provided - should trigger fallback
        ],
      }).compile();

      adapter = module.get<MemoryAdapter>(MemoryAdapter);
    });

    it('should be defined without enterprise services', () => {
      expect(adapter).toBeDefined();
      expect(adapter.isEnterpriseAvailable()).toBe(false);
    });

    it('should create basic buffer memory as fallback', () => {
      const config: MemoryConfig = {
        type: 'buffer',
        returnMessages: true,
        memoryKey: 'chat_history',
      };

      const memory = adapter.create(config);
      expect(memory).toBeInstanceOf(BufferMemory);
      expect(memory.memoryKey).toBe('chat_history');
      expect(memory.returnMessages).toBe(true);
    });

    it('should fallback to basic memory even for enterprise config', () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory).toBeInstanceOf(BufferMemory);
      expect(memory.memoryKey).toBe('history');
    });

    it('should return fallback adapter status', () => {
      const status = adapter.getAdapterStatus();
      
      expect(status.enterpriseAvailable).toBe(false);
      expect(status.fallbackMode).toBe(true);
      expect(status.capabilities).toContain('buffer');
      expect(status.capabilities).toContain('summary');
      expect(status.capabilities).not.toContain('enterprise');
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    beforeEach(async () => {
      // Mock provider factory that fails detection
      const mockProviderFactory = {
        detectMemoryCapabilities: jest.fn().mockRejectedValue(new Error('Detection failed')),
        getAvailableProviders: jest.fn().mockRejectedValue(new Error('Provider listing failed')),
      } as any;

      // Mock memory facade that fails operations
      const mockMemoryFacade = {
        store: jest.fn().mockRejectedValue(new Error('Store failed')),
        retrieve: jest.fn().mockRejectedValue(new Error('Retrieve failed')),
        clear: jest.fn().mockRejectedValue(new Error('Clear failed')),
      } as any;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          {
            provide: MemoryFacadeService,
            useValue: mockMemoryFacade,
          },
          {
            provide: DatabaseProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      adapter = module.get<MemoryAdapter>(MemoryAdapter);
    });

    it('should gracefully handle enterprise service failures', () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      // Should not throw, should fallback to basic memory
      const memory = adapter.create(config);
      expect(memory).toBeInstanceOf(BufferMemory);
    });

    it('should handle memory loading failures gracefully', async () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      // Should fallback to basic memory, so this should work
      const variables = await memory.loadMemoryVariables({});
      expect(variables).toHaveProperty('history');
    });
  });

  describe('Configuration Options', () => {
    let mockMemoryFacade: any;
    let mockProviderFactory: any;

    beforeEach(async () => {
      mockProviderFactory = {
        detectMemoryCapabilities: jest.fn().mockResolvedValue({
          hasProviders: true,
          features: { semanticSearch: true, graphTraversal: true }
        }),
      };

      mockMemoryFacade = {
        store: jest.fn().mockResolvedValue(undefined),
        retrieve: jest.fn().mockResolvedValue([]),
        clear: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          { provide: MemoryFacadeService, useValue: mockMemoryFacade },
          { provide: DatabaseProviderFactory, useValue: mockProviderFactory },
        ],
      }).compile();

      adapter = module.get<MemoryAdapter>(MemoryAdapter);
    });

    it('should respect custom memory keys', () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        memoryKey: 'chat_context',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory.memoryKey).toBe('chat_context');
    });

    it('should respect custom input/output keys', () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        inputKey: 'question',
        outputKey: 'answer',
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory.inputKey).toBe('question');
      expect(memory.outputKey).toBe('answer');
    });

    it('should handle returnMessages configuration', () => {
      const config: MemoryConfig = {
        type: 'enterprise',
        returnMessages: false,
        userId: 'test-user',
        threadId: 'test-thread',
      };

      const memory = adapter.create(config);
      expect(memory.returnMessages).toBe(false);
    });
  });
});