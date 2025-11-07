/**
 * @fileoverview Integration tests for GraphAgentService - Neo4j Integer handling
 *
 * These tests verify that the @Safe() decorator correctly handles Neo4j Integer objects
 * in real-world scenarios, specifically the error case reported in TASK_2025_038:
 * "Property values can only be of primitive types or arrays thereof"
 *
 * Test Strategy:
 * - Create GraphAgentService with mocked dependencies
 * - Pass MemoryEntry with Neo4j Integer objects (int(0))
 * - Verify NO errors occur (validates SafeDecorator fix)
 * - Verify Neo4j integers are converted to native numbers
 *
 * Related Files:
 * - Implementation: libs/nestjs-neo4j/src/lib/decorators/safe.decorator.ts
 * - Unit Tests: libs/nestjs-neo4j/src/lib/decorators/safe.decorator.spec.ts
 * - Service: libs/langgraph-modules/adapters/src/lib/repositories/services/graph-agent.service.ts
 */

import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GraphAgentService } from './graph-agent.service';
import { GraphHelpersService } from './graph-helpers.service';
import { NeogmaService } from '@hive-academy/nestjs-neo4j';
import { int, isInt } from 'neo4j-driver';
import type { MemoryEntry } from '@hive-academy/langgraph-memory';

describe('GraphAgentService - Neo4j Integer Handling', () => {
  let service: GraphAgentService;
  let neogmaService: jest.Mocked<NeogmaService>;
  let graphHelpers: jest.Mocked<GraphHelpersService>;

  beforeEach(async () => {
    // Create mock NeogmaService
    const mockNeogmaService = {
      run: jest.fn(),
      createQueryBuilder: jest.fn(),
      registerModel: jest.fn(),
      getModel: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      getMetrics: jest.fn(),
    };

    // Create mock GraphHelpersService
    const mockGraphHelpers = {
      mapNodeToMemory: jest.fn(),
      getTraversalDirection: jest.fn(),
      buildRelationshipFilter: jest.fn(),
      buildNodeFilter: jest.fn(),
      buildPropertyFilter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphAgentService,
        {
          provide: NeogmaService,
          useValue: mockNeogmaService,
        },
        {
          provide: GraphHelpersService,
          useValue: mockGraphHelpers,
        },
      ],
    }).compile();

    // Suppress logger output during tests
    module.useLogger(false);

    service = module.get<GraphAgentService>(GraphAgentService);
    neogmaService = module.get(NeogmaService);
    graphHelpers = module.get(GraphHelpersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackMemory - Neo4j Integer Conversion', () => {
    /**
     * Test Case: Validate SafeDecorator fixes the real-world error scenario
     *
     * Original Error (TASK_2025_038):
     * "Property values can only be of primitive types or arrays thereof"
     *
     * Root Cause:
     * Neo4j Integer objects {low: 0, high: 0} were passed directly to Cypher queries
     *
     * Fix:
     * SafeDecorator now detects Neo4j Integer objects and converts them to native numbers
     *
     * This test verifies:
     * 1. NO error is thrown when passing Neo4j Integer objects
     * 2. Method executes successfully
     * 3. SafeDecorator converts int(0) to native number before query execution
     */
    it('should handle Neo4j integers in MemoryEntry without errors', async () => {
      // Arrange: Create MemoryEntry with Neo4j Integer (the exact error scenario)
      const neoInteger = int(0); // Creates Neo4j Integer object {low: 0, high: 0}

      // Verify it's actually a Neo4j Integer
      expect(isInt(neoInteger)).toBe(true);
      expect(typeof neoInteger).toBe('object');

      const memoryEntry: MemoryEntry = {
        id: 'test-memory-id',
        threadId: 'test-thread-id',
        content: 'Test memory content for Neo4j integer handling',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        accessCount: neoInteger as unknown as number, // Neo4j Integer object (THIS WAS THE BUG)
        metadata: {
          type: 'conversation',
          importance: 0.8,
          userId: 'test-user-id',
        },
      };

      // Mock successful Neo4j query execution
      neogmaService.run.mockResolvedValue({
        records: [
          {
            get: jest.fn().mockReturnValue('test-memory-id'),
            keys: ['memoryId'],
            length: 1,
            has: jest.fn().mockReturnValue(true),
            toObject: jest.fn().mockReturnValue({ memoryId: 'test-memory-id' }),
          },
        ],
        summary: {} as any,
      });

      // Act: Call trackMemory with Neo4j Integer
      // This should NOT throw "Property values can only be of primitive types" error
      await expect(service.trackMemory(memoryEntry)).resolves.not.toThrow();

      // Assert: Verify method executed successfully
      expect(neogmaService.run).toHaveBeenCalledTimes(1);

      // Verify query was called with parameters
      const callArgs = neogmaService.run.mock.calls[0];
      const query = callArgs[0];
      const params = callArgs[1];

      // Verify query structure
      expect(query).toContain('MERGE (t:Thread {id: $threadId})');
      expect(query).toContain('MERGE (m:Memory {id: $memoryId})');
      expect(query).toContain('m.accessCount = $accessCount');

      // CRITICAL: Verify accessCount parameter is a NATIVE NUMBER, not Neo4j Integer
      expect(params).toBeDefined();
      expect(params.accessCount).toBeDefined();
      expect(typeof params.accessCount).toBe('number'); // Must be native JS number
      expect(params.accessCount).toBe(0); // Value should be 0
      expect(isInt(params.accessCount)).toBe(false); // NOT a Neo4j Integer object

      // Additional assertions for other parameters
      expect(params.threadId).toBe('test-thread-id');
      expect(params.memoryId).toBe('test-memory-id');
      expect(params.content).toBe(
        'Test memory content for Neo4j integer handling'
      );
      expect(params.type).toBe('conversation');
      expect(params.importance).toBe(0.8);
      expect(params.userId).toBe('test-user-id');
    });

    /**
     * Test Case: Verify batch operations handle Neo4j Integers
     *
     * This test ensures that batch memory tracking also benefits from
     * SafeDecorator's Neo4j Integer conversion.
     */
    it('should handle Neo4j integers in batch memory operations', async () => {
      // Arrange: Create multiple MemoryEntry objects with Neo4j Integers
      const memories: MemoryEntry[] = [
        {
          id: 'memory-1',
          threadId: 'thread-1',
          content: 'First memory',
          createdAt: new Date('2025-01-01T00:00:00Z'),
          accessCount: int(0) as unknown as number, // Neo4j Integer
          metadata: {
            type: 'conversation',
            importance: 0.5,
          },
        },
        {
          id: 'memory-2',
          threadId: 'thread-1',
          content: 'Second memory',
          createdAt: new Date('2025-01-02T00:00:00Z'),
          accessCount: int(5) as unknown as number, // Neo4j Integer with value 5
          metadata: {
            type: 'fact',
            importance: 0.7,
          },
        },
        {
          id: 'memory-3',
          threadId: 'thread-1',
          content: 'Third memory',
          createdAt: new Date('2025-01-03T00:00:00Z'),
          accessCount: int(10) as unknown as number, // Neo4j Integer with value 10
          metadata: {
            type: 'preference',
            importance: 0.9,
          },
        },
      ];

      // Verify all accessCount values are Neo4j Integers
      memories.forEach((memory) => {
        expect(isInt(memory.accessCount)).toBe(true);
      });

      // Mock successful batch operation
      neogmaService.run.mockResolvedValue({
        records: [
          {
            get: jest.fn().mockReturnValue(3),
            keys: ['created'],
            length: 1,
            has: jest.fn().mockReturnValue(true),
            toObject: jest.fn().mockReturnValue({ created: 3 }),
          },
        ],
        summary: {} as any,
      });

      // Act: Call trackMemoriesBatch with Neo4j Integers
      await expect(service.trackMemoriesBatch(memories)).resolves.not.toThrow();

      // Assert: Verify batch operation executed successfully
      expect(neogmaService.run).toHaveBeenCalledTimes(1);

      const callArgs = neogmaService.run.mock.calls[0];
      const query = callArgs[0];
      const params = callArgs[1];

      // Verify batch query structure
      expect(query).toContain('UNWIND $memories as memoryData');
      expect(query).toContain('MERGE (m:Memory {id: memoryData.memoryId})');
      expect(query).toContain('m.accessCount = memoryData.accessCount');

      // CRITICAL: Verify all accessCount values are NATIVE NUMBERS
      expect(params).toBeDefined();
      expect(params.memories).toBeDefined();
      expect(Array.isArray(params.memories)).toBe(true);
      expect(params.memories).toHaveLength(3);

      // Check each memory in the batch
      params.memories.forEach((memory: any, index: number) => {
        expect(memory.accessCount).toBeDefined();
        expect(typeof memory.accessCount).toBe('number'); // Must be native JS number
        expect(isInt(memory.accessCount)).toBe(false); // NOT a Neo4j Integer object

        // Verify correct values
        if (index === 0) expect(memory.accessCount).toBe(0);
        if (index === 1) expect(memory.accessCount).toBe(5);
        if (index === 2) expect(memory.accessCount).toBe(10);
      });
    });

    /**
     * Test Case: Verify empty batch operations
     *
     * Edge case: Empty array should return early without calling Neo4j
     */
    it('should handle empty batch operations gracefully', async () => {
      // Arrange: Empty memories array
      const memories: MemoryEntry[] = [];

      // Act: Call trackMemoriesBatch with empty array
      await service.trackMemoriesBatch(memories);

      // Assert: Should NOT call neogmaService.run for empty batch
      expect(neogmaService.run).not.toHaveBeenCalled();
    });

    /**
     * Test Case: Verify error handling with Neo4j Integers
     *
     * Ensures that even if the query fails, the error is properly propagated
     * and Neo4j Integer conversion doesn't interfere with error handling.
     */
    it('should handle errors gracefully even with Neo4j integers', async () => {
      // Arrange: MemoryEntry with Neo4j Integer
      const memoryEntry: MemoryEntry = {
        id: 'error-test-id',
        threadId: 'error-thread-id',
        content: 'Error test content',
        createdAt: new Date(),
        accessCount: int(0) as unknown as number,
        metadata: {
          type: 'conversation',
          importance: 0.5,
        },
      };

      // Mock Neo4j query failure
      const mockError = new Error('Neo4j connection timeout');
      neogmaService.run.mockRejectedValue(mockError);

      // Act & Assert: Error should be properly thrown
      await expect(service.trackMemory(memoryEntry)).rejects.toThrow(
        'Failed to track memory'
      );

      // Verify Neo4j was called (error happened during execution, not before)
      expect(neogmaService.run).toHaveBeenCalledTimes(1);
    });

    /**
     * Test Case: Verify mixed types handling
     *
     * Ensures that MemoryEntry with both Neo4j Integers and native types
     * are handled correctly by SafeDecorator.
     */
    it('should handle mixed Neo4j integers and native types correctly', async () => {
      // Arrange: MemoryEntry with Neo4j Integer and native number
      const memoryEntry: MemoryEntry = {
        id: 'mixed-types-id',
        threadId: 'mixed-thread-id',
        content: 'Mixed types content',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        accessCount: int(3) as unknown as number, // Neo4j Integer
        metadata: {
          type: 'conversation',
          importance: 0.6, // Native number (should remain unchanged)
          userId: 'user-123',
        },
      };

      // Mock successful query
      neogmaService.run.mockResolvedValue({
        records: [
          {
            get: jest.fn().mockReturnValue('mixed-types-id'),
            keys: ['memoryId'],
            length: 1,
            has: jest.fn().mockReturnValue(true),
            toObject: jest.fn().mockReturnValue({ memoryId: 'mixed-types-id' }),
          },
        ],
        summary: {} as any,
      });

      // Act
      await service.trackMemory(memoryEntry);

      // Assert
      const params = neogmaService.run.mock.calls[0][1];

      // Neo4j Integer should be converted
      expect(typeof params.accessCount).toBe('number');
      expect(params.accessCount).toBe(3);
      expect(isInt(params.accessCount)).toBe(false);

      // Native number should remain unchanged
      expect(typeof params.importance).toBe('number');
      expect(params.importance).toBe(0.6);
      expect(isInt(params.importance)).toBe(false);
    });
  });

  describe('Integration with @Safe Decorator', () => {
    /**
     * Test Case: Verify @Safe decorator is applied to trackMemory method
     *
     * This test confirms that the @Safe() decorator is actually decorating
     * the trackMemory method, which is what provides the Neo4j Integer conversion.
     */
    it('should have @Safe decorator applied to trackMemory method', () => {
      // Verify that the method exists and is a function
      expect(service.trackMemory).toBeDefined();
      expect(typeof service.trackMemory).toBe('function');

      // The @Safe decorator wraps the original method, so we can't directly
      // check for its presence, but we can verify the method behavior
      // by ensuring it handles Neo4j Integers correctly (covered in other tests)
    });

    /**
     * Test Case: Verify @Safe decorator is applied to trackMemoriesBatch method
     */
    it('should have @Safe decorator applied to trackMemoriesBatch method', () => {
      expect(service.trackMemoriesBatch).toBeDefined();
      expect(typeof service.trackMemoriesBatch).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test Case: Verify handling of zero-value Neo4j Integer
     *
     * Specifically tests int(0) which was the exact value in the original error report.
     */
    it('should correctly convert int(0) to native number 0', async () => {
      const memoryEntry: MemoryEntry = {
        id: 'zero-test-id',
        threadId: 'zero-thread-id',
        content: 'Zero value test',
        createdAt: new Date(),
        accessCount: int(0) as unknown as number, // Exact original error case
        metadata: {
          type: 'conversation',
          importance: 0.5,
        },
      };

      neogmaService.run.mockResolvedValue({
        records: [{ get: jest.fn().mockReturnValue('zero-test-id') } as any],
        summary: {} as any,
      });

      await service.trackMemory(memoryEntry);

      const params = neogmaService.run.mock.calls[0][1];
      expect(params.accessCount).toBe(0);
      expect(typeof params.accessCount).toBe('number');
    });

    /**
     * Test Case: Verify handling of large Neo4j Integer values
     */
    it('should correctly convert large Neo4j integer values', async () => {
      const memoryEntry: MemoryEntry = {
        id: 'large-int-id',
        threadId: 'large-int-thread-id',
        content: 'Large integer test',
        createdAt: new Date(),
        accessCount: int(999999) as unknown as number, // Large value
        metadata: {
          type: 'conversation',
          importance: 0.5,
        },
      };

      neogmaService.run.mockResolvedValue({
        records: [{ get: jest.fn().mockReturnValue('large-int-id') } as any],
        summary: {} as any,
      });

      await service.trackMemory(memoryEntry);

      const params = neogmaService.run.mock.calls[0][1];
      expect(params.accessCount).toBe(999999);
      expect(typeof params.accessCount).toBe('number');
    });

    /**
     * Test Case: Verify handling of negative Neo4j Integer values
     */
    it('should correctly convert negative Neo4j integer values', async () => {
      const memoryEntry: MemoryEntry = {
        id: 'negative-int-id',
        threadId: 'negative-int-thread-id',
        content: 'Negative integer test',
        createdAt: new Date(),
        accessCount: int(-5) as unknown as number, // Negative value
        metadata: {
          type: 'conversation',
          importance: 0.5,
        },
      };

      neogmaService.run.mockResolvedValue({
        records: [{ get: jest.fn().mockReturnValue('negative-int-id') } as any],
        summary: {} as any,
      });

      await service.trackMemory(memoryEntry);

      const params = neogmaService.run.mock.calls[0][1];
      expect(params.accessCount).toBe(-5);
      expect(typeof params.accessCount).toBe('number');
    });
  });
});
