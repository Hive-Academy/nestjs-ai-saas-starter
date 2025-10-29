import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  CoordinationLearningService,
  type CoordinationPattern,
  CompatibilityPattern,
} from './coordination-learning.service';
import type { IMemoryAdapter, Store } from '@hive-academy/langgraph-core';
import type { MultiAgentResult } from '../interfaces/multi-agent.interface';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

describe('CoordinationLearningService', () => {
  let service: CoordinationLearningService;
  let mockMemoryAdapter: jest.Mocked<IMemoryAdapter>;
  let mockStore: jest.Mocked<Store>;

  // Helper to create mock execution result
  const createMockExecution = (
    overrides?: Partial<MultiAgentResult>
  ): MultiAgentResult => ({
    finalState: {
      messages: [new HumanMessage('test'), new AIMessage('response')],
      executionId: 'exec_123',
      status: 'completed',
      currentNode: 'agent3',
      completedNodes: ['agent1', 'agent2', 'agent3'],
      confidence: 0.9,
      retryCount: 0,
      timestamps: {
        started: new Date('2025-01-01T00:00:00Z'),
        updated: new Date('2025-01-01T00:00:05Z'),
        completed: new Date('2025-01-01T00:00:10Z'),
      },
      startedAt: new Date('2025-01-01T00:00:00Z'),
      completedAt: new Date('2025-01-01T00:00:10Z'),
      current: 'test-network',
      metadata: {
        networkId: 'test-network',
        contextType: 'test-context',
      },
    },
    executionPath: ['agent1', 'agent2', 'agent3'],
    executionTime: 10000,
    success: true,
    ...overrides,
  });

  beforeEach(async () => {
    // Create mock Store
    mockStore = {
      search: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    };

    // Create mock IMemoryAdapter
    mockMemoryAdapter = {
      getAgentContext: jest.fn().mockResolvedValue({
        threadMemories: [],
        userMemories: [],
        agentMemories: [],
        userPatterns: {
          userId: 'test-user',
          commonTopics: [],
          interactionFrequency: {},
          preferredMemoryTypes: [],
          averageSessionLength: 0,
          totalSessions: 0,
        },
        relevanceScore: 0,
        contextWindow: 0,
      }),
      storeAgentExecution: jest.fn().mockResolvedValue(undefined),
      storeConversationTurn: jest.fn().mockResolvedValue(undefined),
      getStore: jest.fn().mockReturnValue(mockStore),
      search: jest.fn().mockResolvedValue([]),
      store: jest.fn().mockResolvedValue('mem_123'),
      storeBatch: jest.fn().mockResolvedValue(['mem_123', 'mem_124']),
      getUserPatterns: jest.fn().mockResolvedValue({
        userId: 'test-user',
        commonTopics: [],
        interactionFrequency: {},
        preferredMemoryTypes: [],
        averageSessionLength: 0,
        totalSessions: 0,
      }),
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoordinationLearningService,
        {
          provide: 'IMemoryAdapter',
          useValue: mockMemoryAdapter,
        },
      ],
    }).compile();

    service = module.get<CoordinationLearningService>(
      CoordinationLearningService
    );

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with memory adapter', () => {
      expect(service).toBeDefined();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('initialized with memory adapter')
      );
    });

    it('should initialize without memory adapter', async () => {
      const module = await Test.createTestingModule({
        providers: [CoordinationLearningService],
      }).compile();

      const serviceWithoutMemory = module.get<CoordinationLearningService>(
        CoordinationLearningService
      );

      expect(serviceWithoutMemory).toBeDefined();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('without memory adapter')
      );
    });
  });

  describe('learnFromExecution', () => {
    it('should learn from successful execution', async () => {
      const execution = createMockExecution();

      await service.learnFromExecution(execution);

      // Verify store was called
      expect(mockMemoryAdapter.getStore).toHaveBeenCalled();
      expect(mockStore.put).toHaveBeenCalledTimes(2); // Coordination + Compatibility patterns
    });

    it('should learn from failed execution', async () => {
      const execution = createMockExecution({
        success: false,
        error: new Error('Test failure'),
      });

      await service.learnFromExecution(execution);

      expect(mockStore.put).toHaveBeenCalledTimes(2);
    });

    it('should handle execution without network ID gracefully', async () => {
      const execution = createMockExecution({
        finalState: {
          ...createMockExecution().finalState,
          metadata: {}, // No networkId
          current: undefined, // No current
        },
      });

      await service.learnFromExecution(execution);

      // Should log warning but not throw
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('networkId not found')
      );
      expect(mockStore.put).not.toHaveBeenCalled();
    });

    it('should handle learning errors gracefully (fire-and-forget)', async () => {
      mockStore.put.mockRejectedValueOnce(new Error('Storage failure'));

      const execution = createMockExecution();

      // Should not throw
      await expect(
        service.learnFromExecution(execution)
      ).resolves.toBeUndefined();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Learning failed (non-blocking)')
      );
    });

    it('should return immediately when no memory adapter', async () => {
      const module = await Test.createTestingModule({
        providers: [CoordinationLearningService],
      }).compile();

      const serviceWithoutMemory = module.get<CoordinationLearningService>(
        CoordinationLearningService
      );

      const execution = createMockExecution();

      await serviceWithoutMemory.learnFromExecution(execution);

      // No store operations should occur
      expect(mockStore.put).not.toHaveBeenCalled();
    });

    it('should update existing coordination pattern', async () => {
      const execution = createMockExecution();

      // Mock existing pattern
      const existingPattern: CoordinationPattern = {
        networkId: 'test-network',
        agentPath: ['agent1', 'agent2', 'agent3'],
        successRate: 0.8,
        averageExecutionTime: 8000,
        occurrences: 5,
        contextType: 'test-context',
        performanceScore: 0.75,
        lastObserved: '2025-01-01T00:00:00Z',
        firstObserved: '2025-01-01T00:00:00Z',
      };

      mockStore.get.mockResolvedValueOnce({
        type: 'coordination',
        data: existingPattern,
        metadata: {
          version: 1,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          executionCount: 5,
        },
      });

      await service.learnFromExecution(execution);

      // Verify pattern was updated
      expect(mockStore.put).toHaveBeenCalledWith(
        ['coordination', 'patterns', 'test-network'],
        'path_agent1_agent2_agent3',
        expect.objectContaining({
          type: 'coordination',
          data: expect.objectContaining({
            occurrences: 6, // 5 + 1
            successRate: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('getLearnedPatterns', () => {
    it('should retrieve learned patterns for network and context', async () => {
      const mockPatterns = [
        {
          type: 'coordination',
          data: {
            networkId: 'test-network',
            agentPath: ['agent1', 'agent2'],
            successRate: 0.9,
            averageExecutionTime: 5000,
            occurrences: 10,
            contextType: 'test-context',
            performanceScore: 0.85,
            lastObserved: '2025-01-01T00:00:00Z',
            firstObserved: '2025-01-01T00:00:00Z',
          },
          metadata: {
            version: 1,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            executionCount: 10,
          },
        },
        {
          type: 'coordination',
          data: {
            networkId: 'test-network',
            agentPath: ['agent1', 'agent3'],
            successRate: 0.7,
            averageExecutionTime: 8000,
            occurrences: 5,
            contextType: 'test-context',
            performanceScore: 0.65,
            lastObserved: '2025-01-01T00:00:00Z',
            firstObserved: '2025-01-01T00:00:00Z',
          },
          metadata: {
            version: 1,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            executionCount: 5,
          },
        },
      ];

      mockStore.list.mockResolvedValueOnce(mockPatterns);

      const patterns = await service.getLearnedPatterns(
        'test-network',
        'test-context'
      );

      expect(patterns).toHaveLength(2);
      expect(patterns[0].performanceScore).toBeGreaterThanOrEqual(
        patterns[1].performanceScore
      );
    });

    it('should filter patterns by context type', async () => {
      const mockPatterns = [
        {
          type: 'coordination',
          data: {
            networkId: 'test-network',
            agentPath: ['agent1', 'agent2'],
            successRate: 0.9,
            averageExecutionTime: 5000,
            occurrences: 10,
            contextType: 'context-a',
            performanceScore: 0.85,
            lastObserved: '2025-01-01T00:00:00Z',
            firstObserved: '2025-01-01T00:00:00Z',
          },
          metadata: {
            version: 1,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            executionCount: 10,
          },
        },
        {
          type: 'coordination',
          data: {
            networkId: 'test-network',
            agentPath: ['agent1', 'agent3'],
            successRate: 0.7,
            averageExecutionTime: 8000,
            occurrences: 5,
            contextType: 'context-b',
            performanceScore: 0.65,
            lastObserved: '2025-01-01T00:00:00Z',
            firstObserved: '2025-01-01T00:00:00Z',
          },
          metadata: {
            version: 1,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            executionCount: 5,
          },
        },
      ];

      mockStore.list.mockResolvedValueOnce(mockPatterns);

      const patterns = await service.getLearnedPatterns(
        'test-network',
        'context-a'
      );

      expect(patterns).toHaveLength(1);
      expect(patterns[0].contextType).toBe('context-a');
    });

    it('should return empty array when no memory adapter', async () => {
      const module = await Test.createTestingModule({
        providers: [CoordinationLearningService],
      }).compile();

      const serviceWithoutMemory = module.get<CoordinationLearningService>(
        CoordinationLearningService
      );

      const patterns = await serviceWithoutMemory.getLearnedPatterns(
        'test-network',
        'test-context'
      );

      expect(patterns).toEqual([]);
    });

    it('should handle retrieval errors gracefully', async () => {
      mockStore.list.mockRejectedValueOnce(new Error('Retrieval failure'));

      const patterns = await service.getLearnedPatterns(
        'test-network',
        'test-context'
      );

      expect(patterns).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get learned patterns')
      );
    });

    it('should skip invalid patterns in storage', async () => {
      const mockPatterns = [
        {
          type: 'coordination',
          data: {
            networkId: 'test-network',
            agentPath: ['agent1', 'agent2'],
            successRate: 0.9,
            averageExecutionTime: 5000,
            occurrences: 10,
            contextType: 'test-context',
            performanceScore: 0.85,
            lastObserved: '2025-01-01T00:00:00Z',
            firstObserved: '2025-01-01T00:00:00Z',
          },
          metadata: {
            version: 1,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            executionCount: 10,
          },
        },
        null, // Invalid pattern
        { invalid: 'data' }, // Invalid structure
      ];

      mockStore.list.mockResolvedValueOnce(mockPatterns);

      const patterns = await service.getLearnedPatterns(
        'test-network',
        'test-context'
      );

      expect(patterns).toHaveLength(1);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid pattern in storage')
      );
    });
  });

  describe('analyzeAgentCompatibility', () => {
    it('should analyze compatibility for successful execution', () => {
      const execution = createMockExecution({
        executionPath: ['agent1', 'agent2', 'agent3'],
        success: true,
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      expect(compatibility.agentId).toBe('agent3'); // Last agent in successful execution
      expect(compatibility.compatibleWith.length).toBeGreaterThan(0);
      expect(compatibility.compatibilityScores).toBeDefined();
      expect(compatibility.context).toBe('test-context');
    });

    it('should analyze compatibility for failed execution', () => {
      const execution = createMockExecution({
        executionPath: ['agent1', 'agent2'],
        success: false,
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      expect(compatibility.agentId).toBe('agent1'); // First agent in failed execution
      expect(compatibility.incompatibleWith.length).toBeGreaterThan(0);
    });

    it('should categorize agents by compatibility score', () => {
      const execution = createMockExecution({
        executionPath: ['agent1', 'agent2', 'agent3', 'agent4'],
        success: true,
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      // Verify agents are categorized correctly
      const allAgents = [
        ...compatibility.compatibleWith,
        ...compatibility.incompatibleWith,
      ];
      expect(allAgents.length).toBeGreaterThan(0);

      // Verify compatibility scores are in valid range
      Object.values(compatibility.compatibilityScores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should extract context type from execution', () => {
      const execution = createMockExecution({
        finalState: {
          ...createMockExecution().finalState,
          metadata: {
            contextType: 'custom-context',
          },
        },
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      expect(compatibility.context).toBe('custom-context');
    });

    it('should default context for single-agent execution', () => {
      const execution = createMockExecution({
        executionPath: ['agent1'],
        finalState: {
          ...createMockExecution().finalState,
          metadata: {},
        },
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      expect(compatibility.context).toBe('single-agent');
    });

    it('should default context for simple coordination', () => {
      const execution = createMockExecution({
        executionPath: ['agent1', 'agent2'],
        finalState: {
          ...createMockExecution().finalState,
          metadata: {},
        },
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      expect(compatibility.context).toBe('simple-coordination');
    });

    it('should default context for complex coordination', () => {
      const execution = createMockExecution({
        executionPath: ['agent1', 'agent2', 'agent3', 'agent4'],
        finalState: {
          ...createMockExecution().finalState,
          metadata: {},
        },
      });

      const compatibility = service.analyzeAgentCompatibility(execution);

      expect(compatibility.context).toBe('complex-coordination');
    });
  });

  describe('Pattern Storage Integration', () => {
    it('should store coordination pattern with correct namespace', async () => {
      const execution = createMockExecution();

      await service.learnFromExecution(execution);

      expect(mockStore.put).toHaveBeenCalledWith(
        ['coordination', 'patterns', 'test-network'],
        expect.stringContaining('path_'),
        expect.any(Object)
      );
    });

    it('should store compatibility pattern with correct namespace', async () => {
      const execution = createMockExecution();

      await service.learnFromExecution(execution);

      expect(mockStore.put).toHaveBeenCalledWith(
        ['coordination', 'patterns', 'test-network'],
        expect.stringContaining('compatibility_'),
        expect.any(Object)
      );
    });

    it('should calculate performance score correctly', async () => {
      const execution = createMockExecution({
        success: true,
        executionTime: 5000,
      });

      await service.learnFromExecution(execution);

      const putCall = mockStore.put.mock.calls.find((call) =>
        call[1].startsWith('path_')
      );
      expect(putCall).toBeDefined();

      const storedPattern = putCall![2] as any;
      expect(storedPattern.data.performanceScore).toBeGreaterThan(0);
      expect(storedPattern.data.performanceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Resilience', () => {
    it('should not throw on store.get failure', async () => {
      mockStore.get.mockRejectedValueOnce(new Error('Get failure'));

      const execution = createMockExecution();

      await expect(
        service.learnFromExecution(execution)
      ).resolves.toBeUndefined();
    });

    it('should not throw on store.put failure', async () => {
      mockStore.put.mockRejectedValueOnce(new Error('Put failure'));

      const execution = createMockExecution();

      await expect(
        service.learnFromExecution(execution)
      ).resolves.toBeUndefined();
    });

    it('should not throw on store.list failure', async () => {
      mockStore.list.mockRejectedValueOnce(new Error('List failure'));

      await expect(
        service.getLearnedPatterns('test-network', 'test-context')
      ).resolves.toEqual([]);
    });

    it('should handle missing execution data gracefully', async () => {
      const execution = {
        finalState: {} as any,
        executionPath: [],
        executionTime: 0,
        success: false,
      };

      await expect(
        service.learnFromExecution(execution)
      ).resolves.toBeUndefined();
    });
  });
});
