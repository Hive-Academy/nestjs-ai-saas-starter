/**
 * Example: Complete Entity Service - @Repository Decorator with Auto-Generated CRUD Methods
 * Category: 02-entity-crud-decorators
 * Features: Complete CRUD operations using @Repository pattern, business logic patterns
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Repository,
  BaseRepositoryService,
  type FindOptions
} from '../../../index';
import { User } from './shared-entities';

// DTOs for different operations
interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user' | 'moderator';
  department: string;
  salary?: number;
  preferences?: Partial<User['preferences']>;
}

interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  department?: string;
  salary?: number;
  isActive?: boolean;
  profileImage?: string;
  preferences?: User['preferences'];
  lastLoginAt?: Date;
}

/**
 * Complete User Service using @Repository decorator with auto-generated CRUD methods
 * This service showcases how @Repository pattern provides all CRUD operations
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  private readonly logger = new Logger(UserService.name);

  // ===== READ OPERATIONS =====
  // The @Repository decorator automatically generates:
  // - findById(id: string): Promise<User | null>
  // - findAll(options?: FindOptions): Promise<User[]>
  // - create(data: Partial<User>): Promise<User>
  // - update(id: string, data: Partial<User>): Promise<User | null>
  // - delete(id: string): Promise<boolean>
  // - count(where?: Record<string, any>): Promise<number>
  // - exists(id: string): Promise<boolean>

  /**
   * Find single user by ID using auto-generated method
   * For caching, consider implementing application-level cache
   */
  async findUserById(id: string): Promise<User | null> {
    return this.findById(id);
  }

  /**
   * Find multiple users with filtering and pagination
   */
  async findUsers(options?: FindOptions<User>): Promise<User[]> {
    return this.findAll(options);
  }

  /**
   * Count users with optional filtering
   */
  async countUsers(where?: Partial<User>): Promise<number> {
    return this.count(where as Record<string, any>);
  }

  /**
   * Check if user exists using auto-generated method
   */
  async userExists(id: string): Promise<boolean> {
    return this.exists(id);
  }

  // ===== WRITE OPERATIONS =====

  /**
   * Create new user with validation and retry logic
   */
  async createUser(data: CreateUserDto): Promise<User> {
    const maxRetries = 3;
    let lastError: Error;
    
    // Add validation
    if (!data.email || data.email.trim().length === 0) {
      throw new BadRequestException('Email is required');
    }
    if (!data.firstName || data.firstName.trim().length === 0) {
      throw new BadRequestException('First name is required');
    }
    if (!data.lastName || data.lastName.trim().length === 0) {
      throw new BadRequestException('Last name is required');
    }
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const userData = {
          ...data,
          id: this.generateId(),
          role: data.role || 'user',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          preferences: {
            theme: 'light',
            notifications: true,
            language: 'en',
            ...data.preferences
          }
        };
        
        const result = await this.create(userData as Partial<User>);
        this.logger.log(`User created successfully: ${result.id}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to create user after ${maxRetries} retries: ${lastError!.message}`);
  }
  
  private generateId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Update existing user with validation and retry logic
   */
  async updateUser(id: string, updates: UpdateUserDto): Promise<User> {
    const maxRetries = 3;
    let lastError: Error;
    
    // Add validation
    if (updates.firstName !== undefined && updates.firstName.trim().length === 0) {
      throw new BadRequestException('First name cannot be empty');
    }
    if (updates.lastName !== undefined && updates.lastName.trim().length === 0) {
      throw new BadRequestException('Last name cannot be empty');
    }
    if (updates.salary !== undefined && updates.salary < 0) {
      throw new BadRequestException('Salary cannot be negative');
    }
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.update(id, {
          ...updates,
          updatedAt: new Date()
        });
        
        if (!result) {
          throw new NotFoundException(`User with id ${id} not found`);
        }
        
        this.logger.log(`User updated successfully: ${id}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to update user after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Delete user with relationships using DETACH DELETE
   * Highest retry count and safety validation
   */
  async deleteUser(id: string): Promise<boolean> {
    const maxRetries = 5;
    let lastError: Error;
    
    // Safety validation
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('User ID cannot be empty');
    }
    
    const exists = await this.userExists(id);
    if (!exists) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Use DETACH DELETE for users with relationships
        const neo4jService = (this as any).getNeo4jService();
        const result = await neo4jService.run(
          `MATCH (n:User {id: $id}) DETACH DELETE n RETURN count(n) > 0 as deleted`,
          { id }
        );
        
        const deleted = result.records[0]?.get('deleted') || false;
        
        if (deleted) {
          this.logger.log(`User deleted successfully: ${id}`);
        }
        
        return deleted;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to delete user after ${maxRetries} retries: ${lastError!.message}`);
  }

  // ===== BUSINESS LOGIC METHODS =====

  /**
   * Complete user registration workflow
   * Demonstrates multiple decorators working together
   */
  async registerUser(registrationData: CreateUserDto): Promise<{
    user: User;
    success: boolean;
    message: string;
  }> {
    try {
      // 1. Check if user already exists (by email - in real implementation)
      const existingUserCount = await this.countUsers({ email: registrationData.email });
      if (existingUserCount > 0) {
        return {
          user: null as any,
          success: false,
          message: 'User with this email already exists'
        };
      }

      // 2. Create the user with default preferences
      const userData: CreateUserDto = {
        ...registrationData,
        role: registrationData.role || 'user',
        salary: registrationData.salary || 50000,
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
          ...registrationData.preferences
        }
      };

      const user = await this.createUser(userData);

      this.logger.log(`User registered successfully: ${user.id}`);

      return {
        user,
        success: true,
        message: 'User registered successfully'
      };

    } catch (error) {
      this.logger.error(`User registration failed: ${(error as Error).message}`, (error as Error).stack);
      return {
        user: null as any,
        success: false,
        message: `Registration failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update user profile with validation
   * Shows how existence check protects update operations
   */
  async updateUserProfile(id: string, profileData: UpdateUserDto): Promise<{
    user: User | null;
    success: boolean;
    message: string;
  }> {
    try {
      // 1. Verify user exists before updating
      const exists = await this.userExists(id);
      if (!exists) {
        return {
          user: null,
          success: false,
          message: 'User not found'
        };
      }

      // 2. Update the user
      const user = await this.updateUser(id, profileData);

      this.logger.log(`User profile updated: ${id}`);

      return {
        user,
        success: true,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      this.logger.error(`Profile update failed for user ${id}: ${(error as Error).message}`, (error as Error).stack);
      return {
        user: null,
        success: false,
        message: `Update failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get paginated user list with metadata
   * Demonstrates FindMany and CountEntities together
   */
  async getUserList(
    page = 1,
    limit = 20,
    filters?: Partial<User>
  ): Promise<{
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    // Execute both operations in parallel
    const [users, total] = await Promise.all([
      this.findUsers({
        where: filters,
        orderBy: [{ property: 'createdAt', direction: 'DESC' }],
        skip: (page - 1) * limit,
        limit
      }),
      this.countUsers(filters)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  /**
   * User statistics dashboard
   * Shows all read operations working together
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: Record<string, number>;
    usersByDepartment: Record<string, number>;
    recentUsers: User[];
  }> {
    // Execute multiple operations in parallel for performance
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      moderatorUsers,
      regularUsers,
      recentUsers
    ] = await Promise.all([
      this.countUsers(),
      this.countUsers({ isActive: true }),
      this.countUsers({ isActive: false }),
      this.countUsers({ role: 'admin' }),
      this.countUsers({ role: 'moderator' }),
      this.countUsers({ role: 'user' }),
      this.findUsers({
        orderBy: [{ property: 'createdAt', direction: 'DESC' }],
        limit: 10
      })
    ]);

    // In a real implementation, departments would be fetched dynamically
    const departments = ['engineering', 'marketing', 'sales', 'hr'];
    const usersByDepartment: Record<string, number> = {};

    for (const dept of departments) {
      usersByDepartment[dept] = await this.countUsers({ department: dept });
    }

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: {
        admin: adminUsers,
        moderator: moderatorUsers,
        user: regularUsers
      },
      usersByDepartment,
      recentUsers
    };
  }

  /**
   * Bulk user operations
   * Demonstrates batch processing with all decorators
   */
  async bulkCreateUsers(usersData: CreateUserDto[]): Promise<{
    successful: User[];
    failed: Array<{ data: CreateUserDto; error: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const successful: User[] = [];
    const failed: Array<{ data: CreateUserDto; error: string }> = [];

    for (const userData of usersData) {
      try {
        // Check if user already exists
        const existingCount = await this.countUsers({ email: userData.email });
        if (existingCount > 0) {
          failed.push({
            data: userData,
            error: 'User already exists'
          });
          continue;
        }

        const user = await this.createUser(userData);
        successful.push(user);
      } catch (error) {
        failed.push({
          data: userData,
          error: (error as Error).message
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: usersData.length,
        successful: successful.length,
        failed: failed.length
      }
    };
  }

  /**
   * Complete user lifecycle management
   * From creation to deletion with full validation
   */
  async manageUserLifecycle(
    operation: 'create' | 'update' | 'deactivate' | 'delete',
    userId?: string,
    userData?: CreateUserDto | UpdateUserDto
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      switch (operation) {
        case 'create':
          if (!userData) {
            return { success: false, message: 'User data required for creation' };
          }
          const result = await this.registerUser(userData as CreateUserDto);
          return {
            success: result.success,
            message: result.message,
            data: result.user
          };

        case 'update':
          if (!userId || !userData) {
            return { success: false, message: 'User ID and data required for update' };
          }
          const updateResult = await this.updateUserProfile(userId, userData as UpdateUserDto);
          return {
            success: updateResult.success,
            message: updateResult.message,
            data: updateResult.user
          };

        case 'deactivate':
          if (!userId) {
            return { success: false, message: 'User ID required for deactivation' };
          }

          const exists = await this.userExists(userId);
          if (!exists) {
            return { success: false, message: 'User not found' };
          }

          const deactivatedUser = await this.updateUser(userId, { isActive: false });
          return {
            success: true,
            message: 'User deactivated successfully',
            data: deactivatedUser
          };

        case 'delete':
          if (!userId) {
            return { success: false, message: 'User ID required for deletion' };
          }

          const userExists = await this.userExists(userId);
          if (!userExists) {
            return { success: false, message: 'User not found' };
          }

          const deleted = await this.deleteUser(userId);
          return {
            success: deleted,
            message: deleted ? 'User deleted successfully' : 'Failed to delete user'
          };

        default:
          return { success: false, message: 'Invalid operation' };
      }
    } catch (error) {
      this.logger.error(`Lifecycle management failed: ${(error as Error).message}`, (error as Error).stack);
      return {
        success: false,
        message: `Operation failed: ${(error as Error).message}`
      };
    }
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Quick user lookup with existence validation
   */
  async getUserSafely(id: string): Promise<User> {
    const user = await this.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Update user's last login timestamp
   */
  async recordUserLogin(id: string): Promise<User> {
    return this.updateUser(id, {
      lastLoginAt: new Date()
    });
  }

  /**
   * Get active users for specific role
   */
  async getActiveUsersByRole(role: 'admin' | 'user' | 'moderator'): Promise<User[]> {
    return this.findUsers({
      where: { role, isActive: true },
      orderBy: [{ property: 'lastName', direction: 'ASC' }]
    });
  }

  /**
   * Search users by name (partial matching would require different implementation)
   */
  async searchUsersByName(firstName?: string, lastName?: string): Promise<User[]> {
    const where: Partial<User> = {};
    if (firstName) where.firstName = firstName;
    if (lastName) where.lastName = lastName;

    return this.findUsers({
      where,
      orderBy: [
        { property: 'lastName', direction: 'ASC' },
        { property: 'firstName', direction: 'ASC' }
      ]
    });
  }
}

// ===== Usage Example - Complete Controller =====

/**
 * Complete REST controller demonstrating all operations
 */
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET /users/:id
  async getUser(id: string): Promise<User> {
    return this.userService.getUserSafely(id);
  }

  // GET /users
  async getUsers(
    page = 1,
    limit = 20,
    role?: string,
    department?: string,
    isActive?: boolean
  ) {
    const filters: Partial<User> = {};
    if (role) filters.role = role as any;
    if (department) filters.department = department;
    if (isActive !== undefined) filters.isActive = isActive;

    return this.userService.getUserList(page, limit, filters);
  }

  // POST /users
  async createUser(userData: CreateUserDto) {
    return this.userService.registerUser(userData);
  }

  // PUT /users/:id
  async updateUser(id: string, userData: UpdateUserDto) {
    return this.userService.updateUserProfile(id, userData);
  }

  // DELETE /users/:id
  async deleteUser(id: string) {
    return this.userService.manageUserLifecycle('delete', id);
  }

  // GET /users/statistics
  async getUserStatistics() {
    return this.userService.getUserStatistics();
  }

  // POST /users/bulk
  async bulkCreateUsers(usersData: CreateUserDto[]) {
    return this.userService.bulkCreateUsers(usersData);
  }

  // POST /users/:id/login
  async recordLogin(id: string) {
    const user = await this.userService.recordUserLogin(id);
    return { success: true, user };
  }
}

// ===== Generated Cypher Queries Summary =====

/**
 * This complete service using @Repository pattern generates these types of queries:
 *
 * this.findById(id): MATCH (n:User {id: $param0}) RETURN n LIMIT 1
 * this.findAll(options): MATCH (n:User) WHERE conditions RETURN n ORDER BY ... SKIP ... LIMIT ...
 * this.create(data): CREATE (n:User $data) RETURN n
 * this.update(id, data): MATCH (n:User {id: $param0}) SET n += $updates, n.updatedAt = $timestamp RETURN n
 * this.delete(id): MATCH (n:User {id: $param0}) DELETE n RETURN count(n) > 0 as deleted
 * this.count(where): MATCH (n:User) WHERE conditions RETURN count(n) as count
 * this.exists(id): MATCH (n:User {id: $param0}) RETURN count(n) > 0 as exists
 *
 * The @Repository decorator provides all CRUD operations with:
 * - Auto-generated basic operations
 * - Type safety
 * - Custom business logic on top of auto-generated methods
 * - Manual retry logic and validation where needed
 * - Custom queries for complex operations (like DETACH DELETE)
 */
