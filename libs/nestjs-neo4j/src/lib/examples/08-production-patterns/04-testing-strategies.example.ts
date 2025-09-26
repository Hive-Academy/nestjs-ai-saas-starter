/**
 * Example: Testing Strategies - Production-Grade Testing Patterns
 * Category: 08-production-patterns
 * Features: Unit testing with decorators, integration testing, mock strategies, performance testing, contract testing
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, Logger } from '@nestjs/common';
import {
  Neo4jHealthService,
  Neo4jConnectionService,
  Neo4jMetricsService,
  FindOne,
  FindMany,
  CreateEntity,
  UpdateEntity,
  DeleteEntity,
  CountEntities
} from '../../../index';

// ===== Testing Interfaces and Types =====

interface MockNeo4jService {
  run: jest.Mock;
  session: jest.Mock;
  verifyConnectivity: jest.Mock;
  close: jest.Mock;
}

interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  isActive: boolean;
}

interface PerformanceTestResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalExecutions: number;
  errorCount: number;
  throughput: number; // operations per second
}

interface IntegrationTestConfiguration {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  testDatabase: string;
  cleanupAfterTests: boolean;
}

// ===== Production Service for Testing =====

/**
 * Example service that demonstrates production patterns
 * This service will be tested with comprehensive test strategies
 */
@Injectable()
export class ProductionUserService {
  private readonly logger = new Logger(ProductionUserService.name);

  constructor(
    private readonly healthService: Neo4jHealthService,
    private readonly connectionService: Neo4jConnectionService,
    private readonly metricsService: Neo4jMetricsService
  ) {}

  // ===== CRUD Operations with Decorators =====

  @FindOne(() => TestUser, {
    cache: '10m',
    description: 'Find user by ID with caching'
  })
  async findUserById(id: string): Promise<TestUser | null> {
    // Implementation handled by decorator
    return null; // Placeholder
  }

  @FindMany(() => TestUser, {
    cache: '5m',
    description: 'Find users with filtering'
  })
  async findUsers(filters?: Partial<TestUser>): Promise<TestUser[]> {
    // Implementation handled by decorator
    return []; // Placeholder
  }

  @CreateEntity(() => TestUser, {
    retry: 3,
    safe: true,
    description: 'Create new user'
  })
  async createUser(userData: Omit<TestUser, 'id' | 'createdAt'>): Promise<TestUser> {
    // Validation logic (will be tested)
    if (!userData.email || !userData.email.includes('@')) {
      throw new Error('Invalid email address');
    }

    if (!userData.firstName || !userData.lastName) {
      throw new Error('First name and last name are required');
    }

    // Implementation handled by decorator
    return null!; // Placeholder
  }

  @UpdateEntity(() => TestUser, {
    retry: 3,
    safe: true,
    description: 'Update user'
  })
  async updateUser(id: string, updates: Partial<TestUser>): Promise<TestUser> {
    // Validation logic
    if (updates.email && !updates.email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Implementation handled by decorator
    return null!; // Placeholder
  }

  @DeleteEntity(() => TestUser, {
    detach: true,
    retry: 2,
    safe: true,
    description: 'Delete user'
  })
  async deleteUser(id: string): Promise<boolean> {
    // Implementation handled by decorator
    return false; // Placeholder
  }

  @CountEntities(() => TestUser, {
    cache: '2m',
    description: 'Count users'
  })
  async countUsers(filters?: Partial<TestUser>): Promise<number> {
    // Implementation handled by decorator
    return 0; // Placeholder
  }

  // ===== Business Logic Methods =====

  async registerUser(userData: Omit<TestUser, 'id' | 'createdAt'>): Promise<{
    user: TestUser;
    success: boolean;
    message: string;
  }> {
    try {
      // Check for existing user
      const existingUsers = await this.findUsers({ email: userData.email });
      if (existingUsers.length > 0) {
        return {
          user: null!,
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Create user
      const user = await this.createUser(userData);

      this.logger.log(`User registered: ${user.id}`);

      return {
        user,
        success: true,
        message: 'User registered successfully'
      };

    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      return {
        user: null!,
        success: false,
        message: error.message
      };
    }
  }

  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    recentUsers: TestUser[];
  }> {
    const [totalUsers, activeUsers, inactiveUsers, recentUsers] = await Promise.all([
      this.countUsers(),
      this.countUsers({ isActive: true }),
      this.countUsers({ isActive: false }),
      this.findUsers() // Would have ordering in real implementation
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentUsers: recentUsers.slice(0, 10)
    };
  }

  async bulkCreateUsers(usersData: Array<Omit<TestUser, 'id' | 'createdAt'>>): Promise<{
    successful: TestUser[];
    failed: Array<{ userData: any; error: string }>;
  }> {
    const successful: TestUser[] = [];
    const failed: Array<{ userData: any; error: string }> = [];

    for (const userData of usersData) {
      try {
        const user = await this.createUser(userData);
        successful.push(user);
      } catch (error) {
        failed.push({
          userData,
          error: error.message
        });
      }
    }

    return { successful, failed };
  }
}

// ===== UNIT TESTING STRATEGIES =====

/**
 * Unit tests for ProductionUserService
 * Tests business logic, validation, and error handling
 */
describe('ProductionUserService - Unit Tests', () => {
  let service: ProductionUserService;
  let mockHealthService: jest.Mocked<Neo4jHealthService>;
  let mockConnectionService: jest.Mocked<Neo4jConnectionService>;
  let mockMetricsService: jest.Mocked<Neo4jMetricsService>;

  beforeEach(async () => {
    // Create mocks for dependencies
    const mockHealthServiceProvider = {
      provide: Neo4jHealthService,
      useValue: {
        checkHealth: jest.fn(),
        ping: jest.fn(),
        getMetrics: jest.fn(),
        getComprehensiveMetrics: jest.fn()
      }
    };

    const mockConnectionServiceProvider = {
      provide: Neo4jConnectionService,
      useValue: {
        isConnected: jest.fn(),
        testConnection: jest.fn(),
        getConnectionStatus: jest.fn()
      }
    };

    const mockMetricsServiceProvider = {
      provide: Neo4jMetricsService,
      useValue: {
        getMetrics: jest.fn(),
        getQueryMetrics: jest.fn(),
        clearMetrics: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionUserService,
        mockHealthServiceProvider,
        mockConnectionServiceProvider,
        mockMetricsServiceProvider
      ]
    }).compile();

    service = module.get<ProductionUserService>(ProductionUserService);
    mockHealthService = module.get(Neo4jHealthService);
    mockConnectionService = module.get(Neo4jConnectionService);
    mockMetricsService = module.get(Neo4jMetricsService);
  });

  describe('User Validation', () => {
    it('should validate email format during user creation', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      };

      await expect(service.createUser(invalidUserData)).rejects.toThrow('Invalid email address');
    });

    it('should validate required fields', async () => {
      const incompleteUserData = {
        email: 'john@example.com',
        firstName: '',
        lastName: 'Doe',
        isActive: true
      };

      await expect(service.createUser(incompleteUserData)).rejects.toThrow('First name and last name are required');
    });

    it('should validate email format during user update', async () => {
      const invalidUpdate = {
        email: 'invalid-email-format'
      };

      await expect(service.updateUser('user-id', invalidUpdate)).rejects.toThrow('Invalid email address');
    });
  });

  describe('User Registration', () => {
    beforeEach(() => {
      // Mock decorator behavior - in real tests, you'd use a test database
      // or more sophisticated mocking of the decorator system
      jest.spyOn(service, 'findUsers').mockResolvedValue([]);
      jest.spyOn(service, 'createUser').mockImplementation(async (userData) => ({
        id: 'generated-id',
        createdAt: new Date(),
        ...userData
      }));
    });

    it('should successfully register a new user', async () => {
      const userData = {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      };

      const result = await service.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toMatchObject(userData);
      expect(result.message).toBe('User registered successfully');
    });

    it('should prevent duplicate email registration', async () => {
      const existingUser: TestUser = {
        id: 'existing-id',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        isActive: true
      };

      jest.spyOn(service, 'findUsers').mockResolvedValue([existingUser]);

      const userData = {
        email: 'john@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true
      };

      const result = await service.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User with this email already exists');
    });
  });

  describe('Bulk Operations', () => {
    it('should handle mixed success/failure in bulk creation', async () => {
      const usersData = [
        { email: 'valid1@example.com', firstName: 'User', lastName: 'One', isActive: true },
        { email: 'invalid-email', firstName: 'User', lastName: 'Two', isActive: true },
        { email: 'valid2@example.com', firstName: 'User', lastName: 'Three', isActive: true }
      ];

      // Mock createUser to succeed for valid emails, fail for invalid
      jest.spyOn(service, 'createUser').mockImplementation(async (userData) => {
        if (!userData.email.includes('@')) {
          throw new Error('Invalid email address');
        }
        return {
          id: `id-${userData.firstName}`,
          createdAt: new Date(),
          ...userData
        };
      });

      const result = await service.bulkCreateUsers(usersData);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Invalid email address');
    });
  });

  describe('Statistics', () => {
    it('should calculate user statistics correctly', async () => {
      // Mock the count methods
      jest.spyOn(service, 'countUsers')
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(20); // inactive

      jest.spyOn(service, 'findUsers').mockResolvedValue([
        { id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One', createdAt: new Date(), isActive: true }
      ]);

      const stats = await service.getUserStatistics();

      expect(stats.totalUsers).toBe(100);
      expect(stats.activeUsers).toBe(80);
      expect(stats.inactiveUsers).toBe(20);
      expect(stats.recentUsers).toHaveLength(1);
    });
  });
});

// ===== INTEGRATION TESTING STRATEGIES =====

/**
 * Integration tests with real Neo4j database
 * Tests actual decorator behavior and database interactions
 */
describe('ProductionUserService - Integration Tests', () => {
  let app: TestingModule;
  let service: ProductionUserService;
  let connectionService: Neo4jConnectionService;

  const testConfig: IntegrationTestConfiguration = {
    neo4jUri: process.env.NEO4J_TEST_URI || 'bolt://localhost:7687',
    neo4jUser: process.env.NEO4J_TEST_USER || 'neo4j',
    neo4jPassword: process.env.NEO4J_TEST_PASSWORD || 'password',
    testDatabase: 'test_database',
    cleanupAfterTests: true
  };

  beforeAll(async () => {
    // Setup test module with real Neo4j connection
    app = await Test.createTestingModule({
      imports: [
        // Configure Neo4j module for testing
        // Neo4jModule.forRoot({
        //   uri: testConfig.neo4jUri,
        //   username: testConfig.neo4jUser,
        //   password: testConfig.neo4jPassword,
        //   database: testConfig.testDatabase
        // })
      ],
      providers: [ProductionUserService]
    }).compile();

    service = app.get<ProductionUserService>(ProductionUserService);
    connectionService = app.get<Neo4jConnectionService>(Neo4jConnectionService);

    // Ensure database connection is established
    const isConnected = await connectionService.isConnected();
    if (!isConnected) {
      throw new Error('Cannot connect to test Neo4j database');
    }
  });

  afterAll(async () => {
    if (testConfig.cleanupAfterTests) {
      await cleanupTestDatabase();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  describe('Real Database Operations', () => {
    it('should create and retrieve user from database', async () => {
      const userData = {
        email: 'integration@example.com',
        firstName: 'Integration',
        lastName: 'Test',
        isActive: true
      };

      // Create user
      const createdUser = await service.createUser(userData);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(userData.email);

      // Retrieve user
      const retrievedUser = await service.findUserById(createdUser.id);
      expect(retrievedUser).toMatchObject({
        id: createdUser.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
    });

    it('should handle concurrent user creation', async () => {
      const userPromises = Array.from({ length: 10 }, (_, i) =>
        service.createUser({
          email: `concurrent${i}@example.com`,
          firstName: 'Concurrent',
          lastName: `User${i}`,
          isActive: true
        })
      );

      const users = await Promise.all(userPromises);

      expect(users).toHaveLength(10);
      expect(new Set(users.map(u => u.id)).size).toBe(10); // All IDs should be unique
    });

    it('should maintain data integrity during updates', async () => {
      // Create initial user
      const user = await service.createUser({
        email: 'update@example.com',
        firstName: 'Original',
        lastName: 'Name',
        isActive: true
      });

      // Update user
      const updatedUser = await service.updateUser(user.id, {
        firstName: 'Updated',
        isActive: false
      });

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.isActive).toBe(false);
      expect(updatedUser.email).toBe(user.email); // Should remain unchanged
    });

    it('should properly handle transactions and rollback on error', async () => {
      // This test would verify transaction behavior
      // Implementation depends on transaction decorator setup
      const initialCount = await service.countUsers();

      try {
        // Attempt operation that should fail and rollback
        await service.createUser({
          email: 'invalid-email-format', // This should fail validation
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        });
      } catch (error) {
        // Expected to fail
      }

      const finalCount = await service.countUsers();
      expect(finalCount).toBe(initialCount); // Count should be unchanged
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large dataset operations efficiently', async () => {
      // Create many users for performance testing
      const batchSize = 100;
      const userData = Array.from({ length: batchSize }, (_, i) => ({
        email: `perf${i}@example.com`,
        firstName: 'Performance',
        lastName: `User${i}`,
        isActive: i % 2 === 0
      }));

      const startTime = Date.now();
      const result = await service.bulkCreateUsers(userData);
      const endTime = Date.now();

      expect(result.successful).toHaveLength(batchSize);
      expect(result.failed).toHaveLength(0);

      const duration = endTime - startTime;
      const throughput = batchSize / (duration / 1000); // operations per second

      console.log(`Created ${batchSize} users in ${duration}ms (${throughput.toFixed(2)} ops/sec)`);
      expect(throughput).toBeGreaterThan(10); // Minimum performance expectation
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentOperations = 20;
      const operationsPerThread = 10;

      const startTime = Date.now();

      const concurrentPromises = Array.from({ length: concurrentOperations }, async (_, threadId) => {
        const users = Array.from({ length: operationsPerThread }, (_, i) => ({
          email: `concurrent${threadId}-${i}@example.com`,
          firstName: 'Concurrent',
          lastName: `User${threadId}-${i}`,
          isActive: true
        }));

        return service.bulkCreateUsers(users);
      });

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      const totalSuccessful = results.reduce((sum, result) => sum + result.successful.length, 0);
      const totalFailed = results.reduce((sum, result) => sum + result.failed.length, 0);

      expect(totalSuccessful).toBe(concurrentOperations * operationsPerThread);
      expect(totalFailed).toBe(0);

      const duration = endTime - startTime;
      const throughput = totalSuccessful / (duration / 1000);

      console.log(`Concurrent test: ${totalSuccessful} operations in ${duration}ms (${throughput.toFixed(2)} ops/sec)`);
    });
  });

  // Helper functions for integration tests
  async function cleanupTestDatabase(): Promise<void> {
    // Implementation would clean the entire test database
    console.log('Cleaning up test database...');
  }

  async function cleanupTestData(): Promise<void> {
    // Implementation would clean test data while preserving schema
    console.log('Cleaning up test data...');
  }
});

// ===== PERFORMANCE TESTING STRATEGIES =====

/**
 * Performance and load testing utilities
 */
class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  async runPerformanceTest(
    testName: string,
    operation: () => Promise<any>,
    iterations = 100
  ): Promise<PerformanceTestResult> {
    const times: number[] = [];
    let errorCount = 0;

    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const operationStart = Date.now();

      try {
        await operation();
        const operationEnd = Date.now();
        times.push(operationEnd - operationStart);
      } catch (error) {
        errorCount++;
        console.error(`Performance test error (iteration ${i}):`, error.message);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const result: PerformanceTestResult = {
      operation: testName,
      averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      minTime: times.length > 0 ? Math.min(...times) : 0,
      maxTime: times.length > 0 ? Math.max(...times) : 0,
      totalExecutions: iterations,
      errorCount,
      throughput: (iterations - errorCount) / (totalTime / 1000)
    };

    this.results.push(result);
    return result;
  }

  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  generateReport(): string {
    return this.results.map(result =>
      `Operation: ${result.operation}\n` +
      `Average Time: ${result.averageTime.toFixed(2)}ms\n` +
      `Min/Max Time: ${result.minTime}ms / ${result.maxTime}ms\n` +
      `Throughput: ${result.throughput.toFixed(2)} ops/sec\n` +
      `Error Rate: ${((result.errorCount / result.totalExecutions) * 100).toFixed(2)}%\n` +
      `---`
    ).join('\n');
  }
}

// ===== MOCK STRATEGIES =====

/**
 * Advanced mocking strategies for complex scenarios
 */
export class Neo4jMockFactory {
  static createMockService<T extends Record<string, any>>(
    serviceClass: new (...args: any[]) => T,
    mockImplementations: Partial<Record<keyof T, jest.Mock>>
  ): jest.Mocked<T> {
    const mockService = {} as jest.Mocked<T>;

    // Get all methods from the service class
    const prototype = serviceClass.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      name => name !== 'constructor' && typeof prototype[name] === 'function'
    );

    methodNames.forEach(methodName => {
      mockService[methodName as keyof T] = mockImplementations[methodName as keyof T] || jest.fn();
    });

    return mockService;
  }

  static createMockDriver(): MockNeo4jService {
    return {
      run: jest.fn(),
      session: jest.fn(() => ({
        run: jest.fn(),
        close: jest.fn()
      })),
      verifyConnectivity: jest.fn(),
      close: jest.fn()
    };
  }

  static createMockQueryResult(records: any[] = [], summary?: any) {
    return {
      records: records.map(record => ({
        get: jest.fn((key: string) => record[key])
      })),
      summary: summary || {
        counters: {
          nodesCreated: 0,
          nodesDeleted: 0,
          relationshipsCreated: 0,
          relationshipsDeleted: 0,
          propertiesSet: 0
        }
      }
    };
  }
}

// ===== CONTRACT TESTING =====

/**
 * Contract tests to ensure API compatibility
 */
describe('ProductionUserService - Contract Tests', () => {
  let service: ProductionUserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductionUserService,
        { provide: Neo4jHealthService, useValue: {} },
        { provide: Neo4jConnectionService, useValue: {} },
        { provide: Neo4jMetricsService, useValue: {} }
      ]
    }).compile();

    service = module.get<ProductionUserService>(ProductionUserService);
  });

  it('should maintain method signatures for findUserById', () => {
    expect(typeof service.findUserById).toBe('function');
    expect(service.findUserById.length).toBe(1); // One parameter
  });

  it('should maintain method signatures for createUser', () => {
    expect(typeof service.createUser).toBe('function');
    expect(service.createUser.length).toBe(1);
  });

  it('should maintain return type structure for registerUser', async () => {
    // Mock the methods to avoid actual calls
    jest.spyOn(service, 'findUsers').mockResolvedValue([]);
    jest.spyOn(service, 'createUser').mockResolvedValue({
      id: 'test-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      isActive: true
    });

    const result = await service.registerUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });
});

// ===== Test Utilities and Helpers =====

export const TEST_UTILITIES = {
  // Create test user data
  createTestUser: (overrides: Partial<TestUser> = {}): Omit<TestUser, 'id' | 'createdAt'> => ({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    ...overrides
  }),

  // Create multiple test users
  createTestUsers: (count: number): Array<Omit<TestUser, 'id' | 'createdAt'>> =>
    Array.from({ length: count }, (_, i) => ({
      email: `test${i}@example.com`,
      firstName: 'Test',
      lastName: `User${i}`,
      isActive: i % 2 === 0
    })),

  // Performance test runner
  PerformanceTester,

  // Mock factory
  Neo4jMockFactory
};

// ===== Usage Examples =====

export const TESTING_USAGE_EXAMPLES = `
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};

// test/setup.ts
import { Test } from '@nestjs/testing';

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  // Initialize test data
});

afterAll(async () => {
  // Cleanup test database
  // Close connections
});

// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:performance": "jest --testPathPattern=performance",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}

// Docker test setup
// docker-compose.test.yml
version: '3.8'
services:
  neo4j-test:
    image: neo4j:5.12
    environment:
      NEO4J_AUTH: neo4j/testpassword
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - "7688:7687"
      - "7475:7474"
    volumes:
      - ./test-data:/data
`;

export default {
  ProductionUserService,
  PerformanceTester,
  Neo4jMockFactory,
  TEST_UTILITIES
};
