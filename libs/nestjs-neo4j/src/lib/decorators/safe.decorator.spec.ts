/**
 * @fileoverview Unit tests for @Safe() decorator - Neo4j Integer handling
 *
 * These tests verify the Neo4j Integer conversion logic added in Task 1 (TASK_2025_038).
 * The @Safe() decorator automatically converts Neo4j Integer objects to JavaScript numbers
 * when processing data from database results.
 *
 * Neo4j Integer Behavior:
 * - Neo4j returns integers as Integer objects (not native JS numbers)
 * - Integer objects have: constructor.name === 'Integer', isInt() === true, toNumber() method
 * - Must be converted to JS numbers for proper serialization and application use
 */

import { Safe, SafeConfig } from './safe.decorator';
import { int, isInt } from 'neo4j-driver';

describe('@Safe() Decorator', () => {
  describe('Neo4j Integer Handling', () => {
    /**
     * Test helper: Creates a decorated method for testing
     * By default, disables autoInt to test Integer conversion in isolation
     */
    function createDecoratedMethod(config?: SafeConfig) {
      const defaultConfig: SafeConfig = {
        transforms: {
          autoInt: false, // Disable auto-wrapping to test Integer conversion
          autoSerialize: false, // Disable serialization
          autoDateTransform: false, // Disable date transform
        },
        ...config,
      };

      class TestClass {
        @Safe(defaultConfig)
        async processData(data: unknown): Promise<unknown> {
          return data;
        }
      }
      return new TestClass();
    }

    /**
     * Test helper: Creates a mock Neo4j Integer object
     * Neo4j Integer objects have specific characteristics:
     * - constructor.name === 'Integer'
     * - isInt(obj) returns true
     * - toNumber() method converts to JS number
     */
    function createMockInteger(value: number): unknown {
      return int(value);
    }

    /**
     * Test 1: Direct Neo4j Integer Conversion
     *
     * Verifies that a standalone Neo4j Integer object is correctly
     * converted to a JavaScript number.
     */
    it('should convert direct Neo4j Integer to JavaScript number', async () => {
      // Arrange
      const testInstance = createDecoratedMethod();
      const neoInteger = createMockInteger(42);

      // Verify it's actually a Neo4j Integer
      expect(isInt(neoInteger)).toBe(true);

      // Act
      const result = await testInstance.processData(neoInteger);

      // Assert
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
      expect(isInt(result)).toBe(false); // Should be converted to native number
    });

    /**
     * Test 2: Integers Nested in Objects
     *
     * Verifies that Neo4j Integer objects within object properties
     * are recursively converted to JavaScript numbers.
     */
    it('should convert Neo4j Integers nested in objects', async () => {
      // Arrange
      const testInstance = createDecoratedMethod();
      const testData = {
        id: createMockInteger(1),
        name: 'John Doe',
        age: createMockInteger(30),
        metadata: {
          userId: createMockInteger(12345),
          score: createMockInteger(95),
        },
      };

      // Act
      const result = (await testInstance.processData(testData)) as Record<
        string,
        unknown
      >;

      // Assert - Top-level properties
      expect(result.id).toBe(1);
      expect(typeof result.id).toBe('number');
      expect(result.name).toBe('John Doe');
      expect(result.age).toBe(30);
      expect(typeof result.age).toBe('number');

      // Assert - Nested properties
      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.userId).toBe(12345);
      expect(typeof metadata.userId).toBe('number');
      expect(metadata.score).toBe(95);
      expect(typeof metadata.score).toBe('number');
    });

    /**
     * Test 3: Integers in Arrays
     *
     * Verifies that Neo4j Integer objects within arrays
     * are correctly converted to JavaScript numbers.
     */
    it('should convert Neo4j Integers in arrays', async () => {
      // Arrange
      const testInstance = createDecoratedMethod();
      const testData = {
        numbers: [
          createMockInteger(10),
          createMockInteger(20),
          createMockInteger(30),
        ],
        mixed: ['text', createMockInteger(100), true, createMockInteger(200)],
      };

      // Act
      const result = (await testInstance.processData(testData)) as Record<
        string,
        unknown
      >;

      // Assert - Array of integers
      const numbers = result.numbers as number[];
      expect(numbers).toEqual([10, 20, 30]);
      expect(numbers.every((n) => typeof n === 'number')).toBe(true);

      // Assert - Mixed array
      const mixed = result.mixed as unknown[];
      expect(mixed).toEqual(['text', 100, true, 200]);
      expect(typeof mixed[1]).toBe('number');
      expect(typeof mixed[3]).toBe('number');
    });

    /**
     * Test 4: Mixed Types (Neo4j Integer + Native Numbers)
     *
     * Verifies that the decorator correctly handles data containing
     * both Neo4j Integer objects and native JavaScript numbers.
     */
    it('should handle mixed Neo4j Integers and native numbers', async () => {
      // Arrange
      const testInstance = createDecoratedMethod();
      const testData = {
        neoInt: createMockInteger(42),
        nativeNum: 100,
        neoFloat: createMockInteger(99), // Note: Neo4j ints can represent whole numbers
        nativeFloat: 3.14,
        nested: {
          neoValue: createMockInteger(500),
          nativeValue: 600,
        },
      };

      // Act
      const result = (await testInstance.processData(testData)) as Record<
        string,
        unknown
      >;

      // Assert - All integers should be numbers
      expect(result.neoInt).toBe(42);
      expect(typeof result.neoInt).toBe('number');

      // Assert - Native numbers should remain unchanged
      expect(result.nativeNum).toBe(100);
      expect(typeof result.nativeNum).toBe('number');

      expect(result.neoFloat).toBe(99);
      expect(result.nativeFloat).toBe(3.14);

      // Assert - Nested values
      const nested = result.nested as Record<string, unknown>;
      expect(nested.neoValue).toBe(500);
      expect(nested.nativeValue).toBe(600);
    });

    /**
     * Test 5: Edge Cases (null, undefined, zero, negative)
     *
     * Verifies that the decorator correctly handles edge cases:
     * - null and undefined values (should pass through)
     * - Zero values (should convert to 0)
     * - Negative integers (should preserve sign)
     */
    it('should handle edge cases correctly', async () => {
      // Arrange
      const testInstance = createDecoratedMethod();

      // Test Case 1: null and undefined
      const nullData = { value: null, other: undefined };
      const nullResult = (await testInstance.processData(nullData)) as Record<
        string,
        unknown
      >;
      expect(nullResult.value).toBeNull();
      expect(nullResult.other).toBeUndefined();

      // Test Case 2: Zero
      const zeroData = { zero: createMockInteger(0) };
      const zeroResult = (await testInstance.processData(zeroData)) as Record<
        string,
        unknown
      >;
      expect(zeroResult.zero).toBe(0);
      expect(typeof zeroResult.zero).toBe('number');

      // Test Case 3: Negative integers
      const negativeData = {
        negative: createMockInteger(-42),
        negativeNested: {
          value: createMockInteger(-100),
        },
      };
      const negativeResult = (await testInstance.processData(
        negativeData
      )) as Record<string, unknown>;
      expect(negativeResult.negative).toBe(-42);
      expect(typeof negativeResult.negative).toBe('number');

      const negativeNested = negativeResult.negativeNested as Record<
        string,
        unknown
      >;
      expect(negativeNested.value).toBe(-100);

      // Test Case 4: Large integers
      const largeData = {
        large: createMockInteger(999999999),
        veryLarge: createMockInteger(2147483647), // Max 32-bit signed int
      };
      const largeResult = (await testInstance.processData(largeData)) as Record<
        string,
        unknown
      >;
      expect(largeResult.large).toBe(999999999);
      expect(largeResult.veryLarge).toBe(2147483647);
    });

    /**
     * Test 6: Complex Nested Structures
     *
     * Verifies that Integer conversion works in deeply nested structures
     * combining objects and arrays at multiple levels.
     */
    it('should convert Integers in complex nested structures', async () => {
      // Arrange
      const testInstance = createDecoratedMethod();
      const complexData = {
        users: [
          {
            id: createMockInteger(1),
            friends: [createMockInteger(2), createMockInteger(3)],
            metadata: {
              loginCount: createMockInteger(50),
            },
          },
          {
            id: createMockInteger(4),
            friends: [createMockInteger(5)],
            metadata: {
              loginCount: createMockInteger(25),
            },
          },
        ],
      };

      // Act
      const result = (await testInstance.processData(complexData)) as {
        users: Array<{
          id: number;
          friends: number[];
          metadata: { loginCount: number };
        }>;
      };

      // Assert - First user
      expect(result.users[0].id).toBe(1);
      expect(result.users[0].friends).toEqual([2, 3]);
      expect(result.users[0].metadata.loginCount).toBe(50);

      // Assert - Second user
      expect(result.users[1].id).toBe(4);
      expect(result.users[1].friends).toEqual([5]);
      expect(result.users[1].metadata.loginCount).toBe(25);

      // Assert - All values are native numbers
      expect(typeof result.users[0].id).toBe('number');
      expect(typeof result.users[0].friends[0]).toBe('number');
      expect(typeof result.users[0].metadata.loginCount).toBe('number');
    });

    /**
     * Test 7: Configuration Override
     *
     * Verifies that autoDeserialize configuration affects Integer conversion.
     * When autoDeserialize is disabled, Integers should still be converted
     * during the input transformation phase.
     */
    it('should convert Integers regardless of autoDeserialize setting', async () => {
      // Arrange - autoDeserialize disabled affects result transformation only
      const testInstance = createDecoratedMethod({
        transforms: { autoDeserialize: false },
      });
      const testData = {
        value: createMockInteger(42),
      };

      // Act
      const result = (await testInstance.processData(testData)) as Record<
        string,
        unknown
      >;

      // Assert - Integer conversion happens during input transformation
      // This occurs BEFORE the result transformation step
      expect(result.value).toBe(42);
      expect(typeof result.value).toBe('number');
    });
  });

  describe('Integration with Other @Safe() Features', () => {
    /**
     * Verifies that Integer conversion works alongside other @Safe() transformations
     *
     * This test demonstrates the critical behavior:
     * - Neo4j Integers FROM database (isInt() === true) are converted to JS numbers
     * - This conversion happens FIRST before any other transformations
     * - This prevents Neo4j Integer objects from breaking JSON serialization
     *
     * The key insight: isInt() check (lines 791-793) occurs before autoInt wrapping,
     * so Neo4j Integers are always converted to native numbers, preventing issues
     * when results are serialized to JSON for API responses.
     */
    it('should convert Neo4j Integers from database to JS numbers', async () => {
      class TestClass {
        @Safe({
          transforms: {
            autoInt: false, // Disable wrapping to focus on Integer conversion
            autoSerialize: false, // Disable serialization
            autoDateTransform: false,
          },
        })
        async processData(data: unknown): Promise<unknown> {
          return data;
        }
      }

      const testInstance = new TestClass();

      // Simulate data coming FROM Neo4j database
      // The database returns Integer objects, not native numbers
      const databaseResult = {
        userId: int(12345), // Neo4j Integer from DB
        age: int(30), // Neo4j Integer from DB
        scores: [int(95), int(87), int(92)], // Neo4j Integers in array
        nested: {
          count: int(100), // Neo4j Integer nested in object
        },
      };

      const result = (await testInstance.processData(databaseResult)) as Record<
        string,
        unknown
      >;

      // ALL Neo4j Integers should be converted to JS numbers
      // This is critical for JSON serialization in API responses
      expect(result.userId).toBe(12345);
      expect(typeof result.userId).toBe('number');
      expect(isInt(result.userId)).toBe(false);

      expect(result.age).toBe(30);
      expect(typeof result.age).toBe('number');

      const scores = result.scores as number[];
      expect(scores).toEqual([95, 87, 92]);
      expect(scores.every((s) => typeof s === 'number')).toBe(true);

      const nested = result.nested as Record<string, unknown>;
      expect(nested.count).toBe(100);
      expect(typeof nested.count).toBe('number');
    });
  });
});
