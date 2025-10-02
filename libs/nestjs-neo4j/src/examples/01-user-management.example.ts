/**
 * @fileoverview User Management Example
 *
 * Demonstrates:
 * - Entity decorators with constraints
 * - Repository pattern with type safety
 * - QueryBuilder for complex queries
 * - Security decorators
 * - Transaction management
 */

import { Injectable } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  NodeKey,
  Unique,
  NotNull,
  Repository,
  InjectNeogma,
  NeogmaService,
  Safe,
  Authorize,
  ValidateInput,
  AuditLog,
  Transactional,
  PropIndex,
  BaseRepositoryService,
} from '../index';

// ============================================================================
// 1. ENTITY DEFINITION WITH CONSTRAINTS
// ============================================================================

@Neo4jEntity('User')
@NodeKey(['email'], {
  name: 'user_email_key',
  description: 'Ensures unique email addresses across users',
})
export class User {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ type: 'TEXT', name: 'user_name_index' })
  name: string;

  @Neo4jProp()
  @NotNull()
  @Unique({ name: 'user_email_unique' })
  email: string;

  @Neo4jProp()
  @PropIndex({ type: 'RANGE', name: 'user_age_index' })
  age?: number;

  @Neo4jProp()
  @PropIndex({ name: 'user_department_index' })
  department: string;

  @Neo4jProp()
  isActive: boolean;

  @Neo4jProp()
  role: 'admin' | 'user' | 'manager';

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProp()
  metadata?: Record<string, any>;

  [key: string]: any;
}

// ============================================================================
// 2. DTO TYPES FOR TYPE SAFETY
// ============================================================================

export interface CreateUserDto {
  name: string;
  email: string;
  age?: number;
  department: string;
  role: 'admin' | 'user' | 'manager';
  metadata?: Record<string, any>;
}

export interface UpdateUserDto {
  name?: string;
  age?: number;
  department?: string;
  role?: 'admin' | 'user' | 'manager';
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UserSearchFilters {
  department?: string;
  role?: 'admin' | 'user' | 'manager';
  isActive?: boolean;
  ageMin?: number;
  ageMax?: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  usersByDepartment: Record<string, number>;
  usersByRole: Record<string, number>;
  averageAge: number;
}

// ============================================================================
// 3. REPOSITORY WITH AUTO-GENERATED METHODS
// ============================================================================

/**
 * UserRepository - demonstrates @Repository decorator usage
 *
 * The @Repository decorator auto-generates these methods:
 * - findById(id: string): Promise<User | null>
 * - findAll(options?: FindOptions<User>): Promise<User[]>
 * - create(data: Partial<User>): Promise<User>
 * - update(id: string, updates: Partial<User>): Promise<User | null>
 * - delete(id: string): Promise<boolean>
 * - count(where?: Partial<User>): Promise<number>
 * - exists(id: string): Promise<boolean>
 *
 * No need to extend BaseRepositoryService - the decorator handles everything!
 */
@Repository(() => User)
@Injectable()
export class UserRepository extends BaseRepositoryService<User> {
  constructor() {
    super();
  }

  /**
   * Find users by department with type safety
   * Uses auto-generated findAll() method
   */
  @Safe()
  async findByDepartment(department: string): Promise<User[]> {
    return this.findAll({
      where: { department, isActive: true },
      orderBy: [{ property: 'name', direction: 'ASC' }],
    });
  }

  /**
   * Find user by email (unique constraint ensures single result)
   * Uses auto-generated findAll() method
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll({ where: { email } });
    return users[0] || null;
  }

  /**
   * Soft delete user (set inactive instead of deleting)
   * Uses auto-generated update() method
   */
  @AuditLog({ logLevel: 'full', enabled: true })
  async deactivateUser(userId: string): Promise<User | null> {
    return this.update(userId, { isActive: false });
  }
}

// ============================================================================
// 4. SERVICE WITH COMPLEX QUERIES AND SECURITY
// ============================================================================

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectNeogma() private readonly neogma: NeogmaService
  ) {
    // No model registration needed - @Repository decorator handles it
  }

  /**
   * Create user with validation and audit logging
   */
  @Safe()
  @Authorize({ roles: ['admin', 'manager'] })
  @ValidateInput({
    schema: {
      parameterSchema: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        department: { type: 'string', minLength: 2 },
      },
    },
  })
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async createUser(data: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error(`User with email ${data.email} already exists`);
    }

    // Use auto-generated create() method from repository
    return this.userRepository.create({
      ...data,
      isActive: true,
    });
  }

  /**
   * Advanced search with QueryBuilder and type safety
   * Demonstrates correct QueryBuilder usage with BindParam
   */
  @Safe()
  async searchUsers(filters: UserSearchFilters): Promise<User[]> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Start with base match
    queryBuilder.match('(u:User)');

    // Build dynamic WHERE conditions using BindParam for type safety
    const conditions: string[] = [];

    if (filters.department) {
      const paramName = bindParam.add(filters.department);
      conditions.push(`u.department = $${paramName}`);
    }

    if (filters.role) {
      const paramName = bindParam.add(filters.role);
      conditions.push(`u.role = $${paramName}`);
    }

    if (filters.isActive !== undefined) {
      const paramName = bindParam.add(filters.isActive);
      conditions.push(`u.isActive = $${paramName}`);
    }

    if (filters.ageMin) {
      const paramName = bindParam.add(filters.ageMin);
      conditions.push(`u.age >= $${paramName}`);
    }

    if (filters.ageMax) {
      const paramName = bindParam.add(filters.ageMax);
      conditions.push(`u.age <= $${paramName}`);
    }

    // Apply WHERE conditions if any
    if (conditions.length > 0) {
      queryBuilder.where(conditions.join(' AND '));
    }

    // Order and return
    queryBuilder.return('u').orderBy('u.name').limit(100);

    // Execute query with proper statement and params
    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records.map((record) => record.get('u').properties as User);
  }

  /**
   * Bulk operations with transaction management
   * Demonstrates correct QueryBuilder parameter binding and SET operations
   */
  @Transactional()
  @Authorize({ roles: ['admin'] })
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async bulkUpdateDepartment(
    fromDepartment: string,
    toDepartment: string
  ): Promise<number> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Add parameters using BindParam
    const fromDeptParam = bindParam.add(fromDepartment);
    const toDeptParam = bindParam.add(toDepartment);
    const isActiveParam = bindParam.add(true);
    const nowParam = bindParam.add(new Date());

    // Build query with proper parameter references
    queryBuilder
      .match('(u:User)')
      .where(
        `u.department = $${fromDeptParam} AND u.isActive = $${isActiveParam}`
      )
      .set(`u.department = $${toDeptParam}, u.updatedAt = $${nowParam}`)
      .return('count(u) as updatedCount');

    // Execute query
    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records[0]?.get('updatedCount').toNumber() || 0;
  }

  /**
   * Analytics with complex aggregations
   * Demonstrates multiple QueryBuilder queries with proper execution
   */
  @Safe()
  @Authorize({ roles: ['admin', 'manager'] })
  async getUserAnalytics(): Promise<UserAnalytics> {
    // Query 1: Overall statistics
    const statsBuilder = this.neogma.createQueryBuilder();
    statsBuilder.match('(u:User)').return(`
        count(u) as totalUsers,
        sum(CASE WHEN u.isActive THEN 1 ELSE 0 END) as activeUsers,
        avg(u.age) as averageAge
      `);

    const statsCypher = statsBuilder.getStatement();
    const statsParams = statsBuilder.getBindParam().get();
    const statsResult = await this.neogma.run(statsCypher, statsParams);
    const statsRecord = statsResult.records[0];

    // Query 2: Department counts
    const deptBuilder = this.neogma.createQueryBuilder();
    const deptBindParam = deptBuilder.getBindParam();
    const isActiveParam = deptBindParam.add(true);

    deptBuilder
      .match('(u:User)')
      .where(`u.isActive = $${isActiveParam}`)
      .return('u.department as dept, count(u) as count');

    const deptCypher = deptBuilder.getStatement();
    const deptParams = deptBindParam.get();
    const deptResult = await this.neogma.run(deptCypher, deptParams);

    const usersByDepartment: Record<string, number> = {};
    deptResult.records.forEach((r) => {
      usersByDepartment[r.get('dept')] = r.get('count').toNumber();
    });

    // Query 3: Role counts
    const roleBuilder = this.neogma.createQueryBuilder();
    const roleBindParam = roleBuilder.getBindParam();
    const roleActiveParam = roleBindParam.add(true);

    roleBuilder
      .match('(u:User)')
      .where(`u.isActive = $${roleActiveParam}`)
      .return('u.role as role, count(u) as count');

    const roleCypher = roleBuilder.getStatement();
    const roleParams = roleBindParam.get();
    const roleResult = await this.neogma.run(roleCypher, roleParams);

    const usersByRole: Record<string, number> = {};
    roleResult.records.forEach((r) => {
      usersByRole[r.get('role')] = r.get('count').toNumber();
    });

    return {
      totalUsers: statsRecord.get('totalUsers').toNumber(),
      activeUsers: statsRecord.get('activeUsers').toNumber(),
      usersByDepartment,
      usersByRole,
      averageAge: statsRecord.get('averageAge').toNumber() || 0,
    };
  }

  /**
   * Find team members using graph traversal
   * Demonstrates relationship patterns with QueryBuilder
   */
  @Safe()
  async findTeamMembers(managerId: string): Promise<User[]> {
    const queryBuilder = this.neogma.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    // Add parameters
    const managerIdParam = bindParam.add(managerId);
    const isActiveParam = bindParam.add(true);

    // Build query with relationship traversal
    queryBuilder
      .match('(manager:User)')
      .where(`manager.id = $${managerIdParam}`)
      .match('(manager)-[:MANAGES]->(team:User)')
      .where(`team.isActive = $${isActiveParam}`)
      .return('team')
      .orderBy('team.name');

    // Execute query
    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogma.run(cypher, params);

    return result.records.map(
      (record) => record.get('team').properties as User
    );
  }
}

// ============================================================================
// 5. USAGE EXAMPLE
// ============================================================================

export class UserManagementExample {
  constructor(private readonly userService: UserService) {}

  async demonstrateUsage(): Promise<void> {
    // Create users with validation
    const user1 = await this.userService.createUser({
      name: 'John Doe',
      email: 'john.doe@company.com',
      age: 30,
      department: 'Engineering',
      role: 'user',
      metadata: { skills: ['TypeScript', 'Neo4j'] },
    });

    console.log('Created User:', user1);

    const user2 = await this.userService.createUser({
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      age: 28,
      department: 'Engineering',
      role: 'manager',
      metadata: { skills: ['Leadership', 'Architecture'] },
    });

    // Search with filters
    const engineeringUsers = await this.userService.searchUsers({
      department: 'Engineering',
      isActive: true,
      ageMin: 25,
    });

    console.log('Engineering Users:', engineeringUsers);

    // Get analytics
    const analytics = await this.userService.getUserAnalytics();
    console.log('User Analytics:', analytics);

    // Bulk operations
    const updatedCount = await this.userService.bulkUpdateDepartment(
      'Engineering',
      'Technology'
    );
    console.log(`Updated ${updatedCount} users`);

    // Find team members
    const teamMembers = await this.userService.findTeamMembers(user2.id);
    console.log('Team members:', teamMembers);
  }
}
