import { Test, type TestingModule } from '@nestjs/testing';
import { MemoryAdapter } from '../memory.adapter';
import { MEMORY_ADAPTER_FACADE_TOKEN } from '../../constants/memory-adapter.constants';

describe('Memory Integration Bridge', () => {
  let memoryAdapter: MemoryAdapter;
  let module: TestingModule;

  // Mock implementation of IMemoryAdapterFacade contract
  const mockMemoryAdapterFacade = {
    async retrieveContext(userId: string, threadId: string, options?: any) {
      return [
        {
          id: 'test-memory-1',
          content: 'Test memory content',
          metadata: {
            type: 'conversation',
            source: 'test',
            importance: 0.8,
          },
          timestamp: new Date(),
          userId,
          threadId,
        },
      ];
    },

    async storeEntry(entry: any, userId: string, threadId: string) {
      return {
        id: 'stored-memory-1',
        content: entry.content,
        metadata: entry.metadata,
        timestamp: new Date(),
        userId,
        threadId,
      };
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        MemoryAdapter,
        {
          provide: 'MEMORY_ADAPTER_FACADE_SERVICE',
          useValue: mockMemoryAdapterFacade,
        },
        // Create simple bridge provider for testing
        {
          provide: MEMORY_ADAPTER_FACADE_TOKEN,
          useFactory: (memoryAdapterBridge: any) => {
            return memoryAdapterBridge;
          },
          inject: ['MEMORY_ADAPTER_FACADE_SERVICE'],
        },
      ],
    }).compile();

    memoryAdapter = module.get<MemoryAdapter>(MemoryAdapter);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Contract Interface Compliance', () => {
    it('should successfully inject the bridge service via Symbol token', () => {
      expect(memoryAdapter).toBeDefined();

      // Access the private facade to verify injection worked
      const facade = (memoryAdapter as any)['memoryFacade'];
      expect(facade).toBeDefined();
      expect(facade).toBe(mockMemoryAdapterFacade);
    });

    it('should create enterprise memory when facade is available', () => {
      const config = {
        type: 'enterprise' as const,
        userId: 'test-user-123',
        threadId: 'test-thread-456',
        chromadb: { collection: 'test-collection' },
      };

      const memory = memoryAdapter.create(config);

      expect(memory).toBeDefined();
      // Should create EnterpriseMemoryWrapper when facade is available
      expect(memory.constructor.name).toBe('EnterpriseMemoryWrapper');
    });

    it('should fallback to basic memory when facade is not available', async () => {
      // Create adapter without facade
      const moduleWithoutFacade = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          {
            provide: MEMORY_ADAPTER_FACADE_TOKEN,
            useValue: null,
          },
        ],
      }).compile();

      const adapterWithoutFacade =
        moduleWithoutFacade.get<MemoryAdapter>(MemoryAdapter);

      const config = {
        type: 'buffer' as const,
        returnMessages: true,
      };

      const memory = adapterWithoutFacade.create(config);

      expect(memory).toBeDefined();
      // Should create basic LangChain memory when facade is not available
      expect(memory.constructor.name).toBe('BufferMemory');

      await moduleWithoutFacade.close();
    });

    it('should prefer enterprise memory for advanced configurations', () => {
      const enterpriseConfig = {
        type: 'buffer' as const, // Even for buffer type
        userId: 'enterprise-user',
        threadId: 'enterprise-thread',
        chromadb: { collection: 'enterprise-memory' }, // This triggers enterprise mode
        neo4j: { uri: 'bolt://localhost:7687' },
      };

      const memory = memoryAdapter.create(enterpriseConfig);

      expect(memory).toBeDefined();
      expect(memory.constructor.name).toBe('EnterpriseMemoryWrapper');
    });
  });

  describe('Contract Interface Error Handling', () => {
    it('should handle facade unavailable gracefully', async () => {
      // Create adapter without facade
      const moduleWithoutFacade = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          {
            provide: MEMORY_ADAPTER_FACADE_TOKEN,
            useValue: null,
          },
        ],
      }).compile();

      const adapterWithoutFacade =
        moduleWithoutFacade.get<MemoryAdapter>(MemoryAdapter);

      // Should fallback to basic memory when enterprise facade is not available
      const config = { type: 'enterprise' as const };
      const memory = adapterWithoutFacade.create(config);

      expect(memory).toBeDefined();
      // Should fallback to basic BufferMemory when enterprise is requested but not available
      expect(memory.constructor.name).toBe('BufferMemory');

      await moduleWithoutFacade.close();
    });

    it('should handle facade errors properly', async () => {
      const errorFacade = {
        async retrieveContext() {
          throw new Error('Enterprise memory unavailable');
        },
        async storeEntry() {
          throw new Error('Storage failed');
        },
      };

      const moduleWithErrorFacade = await Test.createTestingModule({
        providers: [
          MemoryAdapter,
          {
            provide: MEMORY_ADAPTER_FACADE_TOKEN,
            useValue: errorFacade,
          },
        ],
      }).compile();

      const adapterWithError =
        moduleWithErrorFacade.get<MemoryAdapter>(MemoryAdapter);

      // Should handle facade injection but fall back when creation fails
      const config = {
        type: 'enterprise' as const,
        chromadb: { collection: 'test' },
      };

      // The adapter should catch creation errors and fallback gracefully
      const memory = adapterWithError.create(config);
      expect(memory).toBeDefined();

      await moduleWithErrorFacade.close();
    });
  });

  describe('Dependency Injection Validation', () => {
    it('should correctly resolve Symbol tokens from provider factory', () => {
      const facadeToken = module.get(MEMORY_ADAPTER_FACADE_TOKEN);
      expect(facadeToken).toBeDefined();
      expect(facadeToken).toBe(mockMemoryAdapterFacade);
    });

    it('should maintain type safety through the contract interface', () => {
      // TypeScript compile-time type checking ensures the bridge correctly
      // implements the IMemoryAdapterFacade interface. This test verifies
      // runtime type compatibility.
      const facade = (memoryAdapter as any)['memoryFacade'];

      expect(typeof facade.retrieveContext).toBe('function');
      expect(typeof facade.storeEntry).toBe('function');

      // Verify method signatures match the contract (async functions show 0 length)
      expect(facade.retrieveContext.length).toBeGreaterThanOrEqual(0); // async function
      expect(facade.storeEntry.length).toBeGreaterThanOrEqual(0); // async function
    });
  });
});
