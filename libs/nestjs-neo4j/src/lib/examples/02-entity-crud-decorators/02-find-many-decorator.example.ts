/**
 * Example: @Repository Decorator - Multiple Entity Retrieval with Auto-Generated Methods
 * Category: 02-entity-crud-decorators  
 * Features: @Repository decorator with auto-generated findMany method, filtering, pagination, sorting
 */
import { Injectable } from '@nestjs/common';
import { Repository, BaseRepositoryService, type FindOptions } from '../../../index';
import { User, Post, Company } from './shared-entities';

/**
 * User service demonstrating @Repository decorator with auto-generated CRUD methods
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  /**
   * The @Repository decorator automatically generates:
   * - findAll(options?: FindOptions): Promise<User[]> (with filtering, pagination, sorting)
   * - All other CRUD methods (findById, create, update, delete, count, exists)
   */

  /**
   * Basic usage - returns all users using auto-generated method
   * Auto-generates: MATCH (n:User) RETURN n
   */
  async findAllUsers(options?: FindOptions<User>): Promise<User[]> {
    return this.findAll(options);
  }

  /**
   * Real-time user data with shorter cache requirements
   */
  async findUsersRealTime(options?: FindOptions<User>): Promise<User[]> {
    // Use the auto-generated findAll method
    return this.findAll(options);
  }

  /**
   * Production-ready user lookup with error handling
   */
  async findUsersForAdmin(options?: FindOptions<User>): Promise<User[]> {
    try {
      return await this.findAll(options);
    } catch (error) {
      console.error('[ADMIN] Error finding users:', error);
      throw error;
    }
  }

  /**
   * Specialized method for active users only (demonstrating common pattern)
   */
  async findActiveUsers(): Promise<User[]> {
    return this.findAllUsers({
      where: { isActive: true },
      orderBy: [{ property: 'lastName', direction: 'ASC' }]
    });
  }

  /**
   * Find users by department with pagination
   */
  async findUsersByDepartment(department: string, page = 1, limit = 20): Promise<User[]> {
    return this.findAllUsers({
      where: { department },
      orderBy: [
        { property: 'lastName', direction: 'ASC' },
        { property: 'firstName', direction: 'ASC' }
      ],
      skip: (page - 1) * limit,
      limit
    });
  }

  /**
   * Find users by role with sorting
   */
  async findUsersByRole(role: 'admin' | 'user' | 'moderator'): Promise<User[]> {
    return this.findAllUsers({
      where: { role },
      orderBy: [{ property: 'createdAt', direction: 'DESC' }]
    });
  }
}

/**
 * Post service demonstrating @Repository with different entity
 */
@Injectable()
@Repository(() => Post)
export class PostService extends BaseRepositoryService<Post> {
  /**
   * Find posts with extended cache (content changes less frequently)
   * Uses the auto-generated findAll method with repository-level caching
   */
  async findAllPosts(options?: FindOptions<Post>): Promise<Post[]> {
    return this.findAll(options);
  }

  /**
   * Find published posts with sorting by popularity
   */
  async findPublishedPosts(limit = 50): Promise<Post[]> {
    return this.findAllPosts({
      where: { status: 'published' },
      orderBy: [
        { property: 'likes', direction: 'DESC' },
        { property: 'views', direction: 'DESC' }
      ],
      limit
    });
  }

  /**
   * Find posts by author with pagination
   */
  async findPostsByAuthor(authorId: string, page = 1): Promise<Post[]> {
    return this.findAllPosts({
      where: { authorId, status: 'published' },
      orderBy: [{ property: 'publishedAt', direction: 'DESC' }],
      skip: (page - 1) * 10,
      limit: 10
    });
  }

  /**
   * Find recent posts (last 30 items)
   */
  async findRecentPosts(): Promise<Post[]> {
    return this.findAllPosts({
      orderBy: [{ property: 'createdAt', direction: 'DESC' }],
      limit: 30
    });
  }

  /**
   * Find draft posts for editing
   */
  async findDraftPostsByAuthor(authorId: string): Promise<Post[]> {
    return this.findAllPosts({
      where: { authorId, status: 'draft' },
      orderBy: [{ property: 'updatedAt', direction: 'DESC' }]
    });
  }
}

/**
 * Company service demonstrating advanced filtering
 */
@Injectable()
@Repository(() => Company)
export class CompanyService extends BaseRepositoryService<Company> {
  /**
   * Find companies with minimal cache (business data changes frequently)
   * Uses the auto-generated findAll method with repository-level caching
   */
  async findAllCompanies(options?: FindOptions<Company>): Promise<Company[]> {
    return this.findAll(options);
  }

  /**
   * Find companies by industry with size sorting
   */
  async findCompaniesByIndustry(industry: string): Promise<Company[]> {
    return this.findAllCompanies({
      where: { industry },
      orderBy: [{ property: 'revenue', direction: 'DESC' }]
    });
  }

  /**
   * Find companies by size category
   */
  async findCompaniesBySize(size: Company['size']): Promise<Company[]> {
    return this.findAllCompanies({
      where: { size },
      orderBy: [
        { property: 'foundedYear', direction: 'ASC' },
        { property: 'name', direction: 'ASC' }
      ]
    });
  }

  /**
   * Find public companies sorted by revenue
   */
  async findPublicCompanies(): Promise<Company[]> {
    return this.findAllCompanies({
      where: { isPublic: true },
      orderBy: [{ property: 'revenue', direction: 'DESC' }]
    });
  }
}

/**
 * Advanced service demonstrating complex filtering patterns
 */
@Injectable()
export class AdvancedSearchService {
  constructor(
    private readonly userService: UserService
  ) {}

  /**
   * Complex user search with multiple criteria
   */
  async searchUsers(filters: {
    department?: string;
    role?: User['role'];
    isActive?: boolean;
    minSalary?: number;
  }): Promise<User[]> {
    // Note: This demonstrates the pattern, but @FindMany with complex where conditions
    // would need the actual implementation to handle multiple where clauses properly
    const whereClause: Partial<User> = {};

    if (filters.department) whereClause.department = filters.department;
    if (filters.role) whereClause.role = filters.role;
    if (filters.isActive !== undefined) whereClause.isActive = filters.isActive;

    return this.userService.findAllUsers({
      where: whereClause,
      orderBy: [{ property: 'lastName', direction: 'ASC' }]
    });
  }

  /**
   * Paginated search with comprehensive options
   */
  async paginatedUserSearch(
    page = 1,
    pageSize = 20,
    sortBy: keyof User = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<User[]> {
    return this.userService.findAllUsers({
      orderBy: [{ property: sortBy, direction: sortOrder }],
      skip: (page - 1) * pageSize,
      limit: pageSize
    });
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a controller
 */
export class ExampleController {
  constructor(private readonly userService: UserService) {}

  async getUsersPaginated(page = 1): Promise<User[]> {
    // Get 20 users per page, sorted by creation date
    return this.userService.findAllUsers({
      orderBy: [{ property: 'createdAt', direction: 'DESC' }],
      skip: (page - 1) * 20,
      limit: 20
    });
  }

  async getActiveUsersInDepartment(department: string): Promise<User[]> {
    // Find active users in specific department
    return this.userService.findAllUsers({
      where: { department, isActive: true },
      orderBy: [
        { property: 'lastName', direction: 'ASC' },
        { property: 'firstName', direction: 'ASC' }
      ]
    });
  }

  async getTopEarners(limit = 10): Promise<User[]> {
    // Find top earning users
    return this.userService.findAllUsers({
      orderBy: [{ property: 'salary', direction: 'DESC' }],
      limit
    });
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator generates these Cypher queries:
 *
 * Basic findAllUsers():
 * MATCH (n:User) RETURN n
 *
 * With where clause findAllUsers({where: {role: 'admin'}}):
 * MATCH (n:User) WHERE n.role = $whereParam0 RETURN n
 * Parameters: { whereParam0: 'admin' }
 *
 * With sorting and pagination:
 * MATCH (n:User) WHERE n.isActive = $whereParam0
 * RETURN n ORDER BY n.lastName ASC, n.firstName ASC
 * SKIP $param1 LIMIT $param2
 * Parameters: { whereParam0: true, param1: 20, param2: 10 }
 *
 * Multiple where conditions:
 * MATCH (n:User) WHERE n.department = $whereParam0 AND n.isActive = $whereParam1
 * RETURN n ORDER BY n.createdAt DESC
 * Parameters: { whereParam0: 'engineering', whereParam1: true }
 */
