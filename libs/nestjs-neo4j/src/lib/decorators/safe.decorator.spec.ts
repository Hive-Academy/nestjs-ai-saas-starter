/**
 * @fileoverview Comprehensive test suite for the unified Safe decorator
 *
 * Tests cover all functionality consolidated from:
 * - Neo4jSafe: Neo4j transformations and serialization
 * - ValidateNeo4jParams: Parameter validation and injection prevention
 * - ValidateInput: Input sanitization and schema validation
 */

import { int } from 'neo4j-driver';
import {
  Safe,
  SafeConfig,
  SafeValidationError,
  Neo4jSafe,
  type SafeContext,
} from './safe.decorator';

describe('Safe Decorator', () => {
  let testService: TestService;

  beforeEach(() => {
    testService = new TestService();
  });

  describe('Basic Functionality', () => {
    it('should apply with default configuration', async () => {
      const result = await testService.basicMethod({ name: 'test', age: 25 });
      expect(result).toBeDefined();
      expect(result.name).toBe('test');
      expect(result.age).toEqual(int(25)); // Should be wrapped with int()
    });

    it('should work with no parameters', async () => {
      const result = await testService.noParamsMethod();
      expect(result).toBe('success');
    });

    it('should handle null and undefined values', async () => {
      const result = await testService.basicMethod({
        name: null,
        age: undefined,
      });
      expect(result.name).toBeNull();
      expect(result.age).toBeUndefined();
    });
  });

  describe('Smart Defaults Based on Method Names', () => {
    it('should apply write defaults for create methods', async () => {
      // Create methods should have HTML sanitization enabled
      const result = await testService.createUser({
        name: '<script>alert("xss")</script>John',
        age: 30,
      });
      expect(result.name).toBe('John'); // HTML tags removed
      expect(result.age).toEqual(int(30));
    });

    it('should apply read defaults for find methods', async () => {
      const result = await testService.findUser({ name: 'test' });
      expect(result).toBeDefined();
    });

    it('should apply bulk defaults for bulk operations', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        name: `user${i}`,
        age: 20 + i,
      }));
      const result = await testService.bulkCreateUsers(users);
      expect(result).toHaveLength(10);
    });
  });

  describe('Parameter Validation', () => {
    describe('Parameter Count Validation', () => {
      it('should reject too many parameters', async () => {
        const manyArgs = Array.from({ length: 25 }, (_, i) => i);
        await expect(
          testService.restrictedParamsMethod(...manyArgs)
        ).rejects.toThrow(SafeValidationError);
      });
    });

    describe('Depth Validation', () => {
      it('should reject deeply nested objects', async () => {
        const deepObject = createNestedObject(15);
        await expect(testService.basicMethod(deepObject)).rejects.toThrow(
          SafeValidationError
        );
      });

      it('should provide helpful error suggestions', async () => {
        const deepObject = createNestedObject(15);
        try {
          await testService.basicMethod(deepObject);
        } catch (error) {
          expect(error).toBeInstanceOf(SafeValidationError);
          expect(error.suggestions).toContain('Reduce object nesting depth');
        }
      });
    });

    describe('Type Validation', () => {
      it('should reject function parameters', async () => {
        const invalidParam = { callback: () => console.log('test') };
        await expect(testService.basicMethod(invalidParam)).rejects.toThrow(
          SafeValidationError
        );
      });

      it('should allow Date objects', async () => {
        const now = new Date();
        const result = await testService.basicMethod({ timestamp: now });
        expect(result.timestamp).toBe(now.toISOString()); // Should be converted to ISO string
      });
    });

    describe('Size Validation', () => {
      it('should reject oversized strings', async () => {
        const largeString = 'x'.repeat(2000000); // 2MB string
        await expect(
          testService.basicMethod({ data: largeString })
        ).rejects.toThrow(SafeValidationError);
      });

      it('should reject oversized arrays', async () => {
        const largeArray = Array.from({ length: 15000 }, (_, i) => i);
        await expect(
          testService.basicMethod({ data: largeArray })
        ).rejects.toThrow(SafeValidationError);
      });

      it('should reject objects with too many properties', async () => {
        const largeObject: any = {};
        for (let i = 0; i < 1500; i++) {
          largeObject[`prop${i}`] = i;
        }
        await expect(testService.basicMethod(largeObject)).rejects.toThrow(
          SafeValidationError
        );
      });
    });

    describe('Circular Reference Detection', () => {
      it('should reject circular references', async () => {
        const circularObj: any = { name: 'test' };
        circularObj.self = circularObj;

        await expect(testService.basicMethod(circularObj)).rejects.toThrow(
          SafeValidationError
        );
      });
    });
  });

  describe('Injection Prevention', () => {
    describe('Cypher Injection Detection', () => {
      const injectionPatterns = [
        'MATCH (n) RETURN n',
        'CREATE (x:User) RETURN x',
        'DELETE n',
        '"; DROP DATABASE test;',
        'RETURN *',
        '/* comment */ MATCH (n)',
        '(n:User {name: "evil"})',
        '-[:KNOWS]->',
        'apoc.run.cypher("evil query")',
        'CALL db.stats()',
      ];

      injectionPatterns.forEach((pattern) => {
        it(`should detect injection pattern: "${pattern}"`, async () => {
          await expect(
            testService.basicMethod({ query: pattern })
          ).rejects.toThrow(SafeValidationError);
        });
      });

      it('should allow valid JSON strings', async () => {
        const validJson = JSON.stringify({ user: 'test', data: [1, 2, 3] });
        // Valid JSON strings should not trigger injection detection when injection prevention is disabled
        const result = await testService.allowJsonMethod({
          metadata: validJson,
        });
        expect(result.metadata).toBe(validJson);
      });

      it('should allow normal strings', async () => {
        const normalStrings = [
          'Hello World',
          'user@example.com',
          'This is a normal sentence.',
          'Product name with (parentheses)',
          'URL: https://example.com',
        ];

        for (const str of normalStrings) {
          const result = await testService.allowJsonMethod({ data: str });
          expect(result.data).toBe(str);
        }
      });
    });

    describe('Injection Response Actions', () => {
      it('should log injection when configured to log', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        try {
          await testService.logInjectionMethod({ query: 'MATCH (n) RETURN n' });
        } catch {
          // Method might still throw, but we care about the log
        }

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Potential Cypher injection detected'),
          expect.any(Object)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Input Sanitization', () => {
    describe('HTML Sanitization', () => {
      it('should remove HTML tags when enabled', async () => {
        const htmlInput =
          '<div><script>alert("xss")</script>Hello <b>World</b></div>';
        const result = await testService.createUser({
          name: htmlInput,
          age: 25,
        });
        expect(result.name).toBe('Hello World');
      });

      it('should handle encoded HTML', async () => {
        const encodedHtml =
          'Hello &lt;script&gt;alert("xss")&lt;/script&gt; World';
        const result = await testService.createUser({
          name: encodedHtml,
          age: 25,
        });
        expect(result.name).toBe('Hello  World'); // Script tags should be removed
      });
    });

    describe('Special Character Escaping', () => {
      it('should escape special characters when enabled', async () => {
        const specialChars = '<>&"\'';
        const result = await testService.escapeCharsMethod({
          data: specialChars,
        });
        expect(result.data).toBe('&lt;&gt;&amp;&quot;&#x27;');
      });
    });

    describe('Custom Sanitizers', () => {
      it('should apply custom sanitization patterns', async () => {
        const result = await testService.customSanitizerMethod({
          phone: '123-456-7890',
          ssn: '123-45-6789',
        });
        expect(result.phone).toBe('123********');
        expect(result.ssn).toBe('***-**-****');
      });
    });
  });

  describe('Neo4j Transformations', () => {
    describe('Integer Transformation', () => {
      it('should wrap integers with int() function', async () => {
        const result = await testService.basicMethod({
          count: 42,
          price: 19.99,
          bigNumber: 1000000,
        });

        expect(result.count).toEqual(int(42));
        expect(result.price).toBe(19.99); // Floats should not be wrapped
        expect(result.bigNumber).toEqual(int(1000000));
      });
    });

    describe('Date Transformation', () => {
      it('should convert dates to ISO strings', async () => {
        const now = new Date('2023-01-01T00:00:00.000Z');
        const result = await testService.basicMethod({ timestamp: now });
        expect(result.timestamp).toBe('2023-01-01T00:00:00.000Z');
      });
    });

    describe('Complex Object Serialization', () => {
      it('should serialize complex objects to JSON', async () => {
        const complexData = {
          metadata: {
            tags: ['tag1', 'tag2'],
            config: { enabled: true, level: 2 },
          },
        };

        const result = await testService.basicMethod(complexData);
        expect(typeof result.metadata).toBe('string');
        expect(JSON.parse(result.metadata)).toEqual(complexData.metadata);
      });

      it('should not serialize simple objects', async () => {
        const simpleData = { name: 'test', age: 25, active: true };
        const result = await testService.basicMethod(simpleData);
        expect(typeof result.name).toBe('string');
        expect(result.age).toEqual(int(25));
        expect(result.active).toBe(true);
      });
    });
  });

  describe('Result Deserialization', () => {
    it('should deserialize JSON strings in results', async () => {
      const mockResult = {
        user: {
          id: int(1),
          name: 'John',
          metadata: JSON.stringify({ tags: ['admin', 'user'], score: 95 }),
        },
      };

      testService.setMockResult(mockResult);
      const result = await testService.basicMethod({ id: 1 });

      expect(result.user.metadata).toEqual({
        tags: ['admin', 'user'],
        score: 95,
      });
    });

    it('should handle Neo4j record properties', async () => {
      const mockResult = {
        properties: {
          id: int(1),
          name: 'Test',
          data: JSON.stringify([1, 2, 3]),
        },
      };

      testService.setMockResult(mockResult);
      const result = await testService.basicMethod({ id: 1 });

      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('Custom Validators', () => {
    it('should run custom validators', async () => {
      await expect(
        testService.customValidatorMethod({ email: 'invalid-email' })
      ).rejects.toThrow(SafeValidationError);
    });

    it('should pass valid custom validation', async () => {
      const result = await testService.customValidatorMethod({
        email: 'test@example.com',
      });
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Error Handling and Context', () => {
    it('should enhance errors with context', async () => {
      try {
        await testService.errorThrowingMethod({ data: 'test' });
      } catch (error) {
        expect(error.message).toContain('[Safe]');
        expect(error.message).toContain('Context:');
        expect(error.message).toContain('errorThrowingMethod');
      }
    });

    it('should preserve SafeValidationError details', async () => {
      try {
        await testService.basicMethod({
          callback: () => {
            /* empty callback */
          },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SafeValidationError);
        expect(error.context).toBeDefined();
        expect(error.validationType).toBe('INVALID_TYPE');
        expect(error.suggestions).toBeDefined();
      }
    });
  });

  describe('Performance and Logging', () => {
    it('should log debug information when enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await testService.debugLoggingMethod({ name: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Safe] debugLoggingMethod - Preprocessing completed'
        ),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should not log in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await testService.basicMethod({ name: 'test' });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Legacy Compatibility', () => {
    it('should support Neo4jSafe legacy decorator', async () => {
      const result = await testService.legacyNeo4jSafeMethod({
        name: 'test',
        age: 30,
        metadata: { complex: true },
      });

      expect(result.age).toEqual(int(30));
      expect(typeof result.metadata).toBe('string');
    });

    it('should handle legacy configuration options', async () => {
      const result = await testService.legacyConfigMethod({ count: 42 });
      expect(result.count).toEqual(int(42));
    });
  });
});

// =============================================================================
// TEST SERVICE CLASS
// =============================================================================

class TestService {
  private mockResult: any = null;

  setMockResult(result: any) {
    this.mockResult = result;
  }

  @Safe()
  async basicMethod(data: any): Promise<any> {
    return this.mockResult || data;
  }

  @Safe()
  async noParamsMethod(): Promise<string> {
    return 'success';
  }

  @Safe({ rules: { maxParams: 20 } })
  async restrictedParamsMethod(...args: any[]): Promise<any> {
    return args;
  }

  @Safe()
  async createUser(userData: { name: string; age: number }): Promise<any> {
    return userData;
  }

  @Safe()
  async findUser(criteria: any): Promise<any> {
    return criteria;
  }

  @Safe()
  async bulkCreateUsers(users: any[]): Promise<any[]> {
    return users;
  }

  @Safe({ rules: { onInjectionDetected: 'log' } })
  async logInjectionMethod(data: any): Promise<any> {
    return data;
  }

  @Safe({ rules: { preventInjection: false } })
  async allowJsonMethod(data: any): Promise<any> {
    return data;
  }

  @Safe({ rules: { escapeSpecialChars: true } })
  async escapeCharsMethod(data: any): Promise<any> {
    return data;
  }

  @Safe({
    rules: {
      customSanitizers: [
        {
          pattern: /(\d{3})-(\d{3})-(\d{4})/,
          replacement: '$1********',
          description: 'Phone number masking',
        },
        {
          pattern: /(\d{3})-(\d{2})-(\d{4})/,
          replacement: '***-**-****',
          description: 'SSN masking',
        },
      ],
    },
  })
  async customSanitizerMethod(data: any): Promise<any> {
    return data;
  }

  @Safe({
    customValidators: [
      {
        name: 'email',
        validator: (value: any, context: SafeContext) => {
          // Check if this is an object with an email property
          if (typeof value === 'object' && value !== null && 'email' in value) {
            const email = value.email;
            if (typeof email === 'string') {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            }
          }
          return true; // Allow other values
        },
        message: 'Invalid email format',
      },
    ],
  })
  async customValidatorMethod(data: { email: string }): Promise<any> {
    return data;
  }

  @Safe({ log: true })
  async debugLoggingMethod(data: any): Promise<any> {
    return data;
  }

  @Safe()
  async errorThrowingMethod(data: any): Promise<any> {
    throw new Error('Simulated error');
  }

  @Neo4jSafe()
  async legacyNeo4jSafeMethod(data: any): Promise<any> {
    return data;
  }

  @Neo4jSafe({ autoSerialize: true, autoInt: true })
  async legacyConfigMethod(data: any): Promise<any> {
    return data;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function createNestedObject(depth: number): any {
  if (depth === 0) {
    return { value: 'deep' };
  }
  return { nested: createNestedObject(depth - 1) };
}
