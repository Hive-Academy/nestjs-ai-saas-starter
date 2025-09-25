/**
 * @file CypherQuery Decorator: Modern Pattern Examples
 *
 * This file demonstrates the new CypherQuery decorator following the ChromaDB pattern,
 * with proper type safety and method replacement implementation.
 */

import { Injectable } from '@nestjs/common';
import { CypherQuery, Safe } from '../..';

interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: Date;
}

interface CreateUserInput {
  name: string;
  email: string;
}

/**
 * ✅ NEW: CypherQuery with Method Implementation Pattern
 *
 * Following the ChromaDB VectorQuery pattern:
 * - Method implementation returns the query
 * - Decorator completely replaces method execution
 * - Proper TypeScript type safety
 * - No return type mismatches
 */
@Injectable()
export class UserServiceModern {
  /**
   * Simple query with proper return types
   * The decorator replaces this method entirely
   */
  @CypherQuery<User[]>({
    returnType: () => [
      {
        id: '',
        name: '',
        email: '',
        active: false,
        createdAt: new Date(),
      },
    ],
    compiletimeValidation: {
      strictParams: false,
    },
  })
  @Safe()
  async findActiveUsers(): Promise<User[]> {
    // Method returns query - decorator handles execution
    return 'MATCH (u:User {active: true}) RETURN u ORDER BY u.createdAt DESC';
  }

  /**
   * Query with parameters
   */
  @CypherQuery<User | null>({
    returnType: () => ({
      id: '',
      name: '',
      email: '',
      active: false,
      createdAt: new Date(),
    }),
    compiletimeValidation: {
      strictParams: true,
    },
  })
  async findUserById(params: { userId: string }): Promise<User | null> {
    return 'MATCH (u:User {id: $userId}) RETURN u LIMIT 1';
  }

  /**
   * Using object format for complex queries with metadata
   */
  @CypherQuery<User[]>({
    returnType: () => [
      {
        id: '',
        name: '',
        email: '',
        active: false,
        createdAt: new Date(),
      },
    ],
    dev: {
      showQueryInfo: true,
    },
  })
  async findUsersByDepartment(params: {
    department: string;
    limit: number;
  }): Promise<User[]> {
    return {
      query: `
        MATCH (u:User {department: $department, active: true})
        RETURN u
        ORDER BY u.createdAt DESC
        LIMIT $limit
      `,
      params,
      description: 'Find active users by department with pagination',
      tags: ['user', 'department', 'pagination'],
    };
  }

  /**
   * Write operation with proper transaction mode
   */
  @CypherQuery()
  async createUser(input: CreateUserInput): Promise<User> {
    return {
      query: `
        CREATE (u:User {
          id: randomUUID(),
          name: $name,
          email: $email,
          active: true,
          createdAt: datetime()
        })
        RETURN u
      `,
      params: input,
      description: 'Create new user with generated ID',
    };
  }

  /**
   * Update operation
   */
  @CypherQuery<{ updated: number }>({
    returnType: () => ({ updated: 0 }),
    runtime: {
      transactionMode: 'WRITE',
    },
    compiletimeValidation: {
      strictParams: true,
    },
  })
  async updateUser(params: {
    userId: string;
    updates: Partial<User>;
  }): Promise<{ updated: number }> {
    const { userId, updates } = params;
    const setClause = Object.keys(updates)
      .map((key) => `u.${key} = $${key}`)
      .join(', ');

    return {
      query: `
        MATCH (u:User {id: $userId})
        SET ${setClause}
        RETURN count(u) as updated
      `,
      params: { userId, ...updates },
      description: 'Update user properties',
    };
  }

  /**
   * Complex aggregation query
   */
  @CypherQuery<Array<{ department: string; count: number; avgAge: number }>>({
    returnType: () => [{ department: '', count: 0, avgAge: 0 }],
  })
  async getUserStatsByDepartment(): Promise<
    Array<{ department: string; count: number; avgAge: number }>
  > {
    return `
      MATCH (u:User {active: true})
      WITH u.department as department, u.age as age
      RETURN
        department,
        count(*) as count,
        avg(age) as avgAge
      ORDER BY count DESC
    `;
  }

  /**
   * Relationship query
   */
  @CypherQuery<Array<{ user: User; friends: User[] }>>({
    returnType: () => [
      {
        user: {
          id: '',
          name: '',
          email: '',
          active: false,
          createdAt: new Date(),
        },
        friends: [],
      },
    ],
  })
  async getUserWithFriends(params: {
    userId: string;
  }): Promise<Array<{ user: User; friends: User[] }>> {
    return `
      MATCH (u:User {id: $userId})-[:FRIENDS_WITH]->(friend:User)
      RETURN u as user, collect(friend) as friends
    `;
  }
}

/**
 * Example using simplified decorators
 */
@Injectable()
export class UserServiceSimplified {
  /**
   * Using TypedQuery shorthand for simple cases
   */
  @CypherQuery<User[]>({
    returnType: () => [],
  })
  async getAllUsers(): Promise<User[]> {
    return 'MATCH (u:User) RETURN u';
  }

  /**
   * Using Safe decorator with CypherQuery
   */
  @CypherQuery<User[]>({
    returnType: () => [],
  })
  @Safe({
    autoSerialize: true,
    autoInt: true,
    logTransformations: true,
  })
  async findUsersByAge(params: {
    minAge: number;
    maxAge: number;
  }): Promise<User[]> {
    return `
      MATCH (u:User)
      WHERE u.age >= $minAge AND u.age <= $maxAge
      RETURN u
      ORDER BY u.age
    `;
  }
}

/**
 * Example demonstrating error handling and validation
 */
@Injectable()
export class UserServiceRobust {
  @CypherQuery<User[]>({
    returnType: () => [],
    compiletimeValidation: {
      strictParams: true,
      validatePropertyPaths: true,
    },
    dev: {
      showQueryInfo: true,
      validateSchema: false,
    },
  })
  async searchUsers(params: {
    searchTerm: string;
    department?: string;
    limit?: number;
  }): Promise<User[]> {
    const { searchTerm, department, limit = 20 } = params;

    // Validate required parameters
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error('Search term must be at least 2 characters');
    }

    // Build dynamic query
    let whereClause =
      'u.name CONTAINS $searchTerm OR u.email CONTAINS $searchTerm';
    const queryParams: Record<string, any> = { searchTerm, limit };

    if (department) {
      whereClause += ' AND u.department = $department';
      queryParams.department = department;
    }

    return {
      query: `
        MATCH (u:User {active: true})
        WHERE ${whereClause}
        RETURN u
        ORDER BY u.name
        LIMIT $limit
      `,
      params: queryParams,
      description: `Search users by term: ${searchTerm}`,
      tags: ['search', 'user'],
    };
  }

  /**
   * Batch operation example
   */
  @CypherQuery<{ created: number }>({
    returnType: () => ({ created: 0 }),
    runtime: {
      transactionMode: 'WRITE',
    },
  })
  async createMultipleUsers(
    users: CreateUserInput[]
  ): Promise<{ created: number }> {
    return {
      query: `
        UNWIND $users as userData
        CREATE (u:User {
          id: randomUUID(),
          name: userData.name,
          email: userData.email,
          active: true,
          createdAt: datetime()
        })
        RETURN count(u) as created
      `,
      params: { users },
      description: 'Batch create multiple users',
    };
  }
}

/**
 * Example showing advanced features
 */
@Injectable()
export class UserServiceAdvanced {
  @CypherQuery<any>({
    runtime: {
      cache: { ttl: 300, key: 'user-analytics' },
      retry: { attempts: 3, delay: 1000 },
    },
  })
  async getUserAnalytics(): Promise<any> {
    return `
      MATCH (u:User)
      OPTIONAL MATCH (u)-[r:FRIENDS_WITH]->(friend)
      RETURN {
        totalUsers: count(DISTINCT u),
        activeUsers: count(DISTINCT CASE WHEN u.active THEN u END),
        totalFriendships: count(r),
        avgFriendsPerUser: count(r) / count(DISTINCT u)
      } as analytics
    `;
  }
}
