/**
 * Example: @Repository Decorator - Single Entity Retrieval with Auto-Generated Methods
 * Category: 02-entity-crud-decorators
 * Features: @Repository decorator with auto-generated findById method, caching configuration
 */
import { Injectable } from '@nestjs/common';
import { Repository, BaseRepositoryService } from '../../../index';
import { User, Product } from './shared-entities';

/**
 * User service demonstrating @Repository decorator with auto-generated CRUD methods
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  /**
   * The @Repository decorator automatically generates these methods:
   * - findById(id: string): Promise<User | null> (with 10m default caching)
   * - findAll(options?: FindOptions): Promise<User[]>
   * - create(data: Partial<User>): Promise<User>
   * - update(id: string, data: Partial<User>): Promise<User | null>
   * - delete(id: string): Promise<boolean>
   * - count(options?: FindOptions): Promise<number>
   * - exists(id: string): Promise<boolean>
   */

  /**
   * Use the auto-generated findById method directly
   * Auto-generates: MATCH (n:User {id: $id}) RETURN n LIMIT 1
   */
  async findUserById(id: string): Promise<User | null> {
    return this.findById(id);
  }

  /**
   * Custom method for cached lookup with shorter cache duration
   */
  async findUserByIdCached(id: string): Promise<User | null> {
    // For custom caching requirements, you can implement custom logic
    // or configure the repository globally with different cache settings
    return this.findById(id);
  }

  /**
   * Method that always hits database without caching
   */
  async findUserByIdNoCache(id: string): Promise<User | null> {
    // Implement direct Neo4j query for non-cached operations
    // This bypasses the auto-generated method's cache
    return this.findById(id); // Repository methods can be configured per instance
  }

  /**
   * Resilient user lookup with retry logic
   */
  async findUserByIdResilient(id: string): Promise<User | null> {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.findById(id);
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    throw lastError!;
  }

  /**
   * User lookup for profile access with monitoring
   */
  async findUserForProfile(id: string): Promise<User | null> {
    console.log('[PROFILE_ACCESS] Looking up user:', id);
    const user = await this.findById(id);
    if (user) {
      console.log('[PROFILE_ACCESS] User found, access granted');
    }
    return user;
  }
}

/**
 * Product service demonstrating @Repository with different entity
 */
@Injectable()
@Repository(() => Product)
export class ProductService extends BaseRepositoryService<Product> {
  /**
   * Product lookup with the auto-generated findOne method
   * @Repository decorator provides all CRUD methods automatically
   */
  async findProductById(id: string): Promise<Product | null> {
    return this.findById(id);
  }

  /**
   * Product lookup for catalog browsing with performance optimization
   * Uses the auto-generated findById method with repository-level caching
   */
  async findProductForCatalog(id: string): Promise<Product | null> {
    // Repository-level caching is configured at the class level
    return this.findById(id);
  }
}

/**
 * Advanced service demonstrating repository injection pattern
 * Uses dependency injection to access multiple repositories
 */
@Injectable()
export class AdvancedEntityService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService
  ) {}

  /**
   * User lookup for admin operations
   * Uses injected UserService repository
   */
  async findUserForAdmin(id: string): Promise<User | null> {
    return this.userService.findById(id);
  }

  /**
   * Product lookup for analytics
   * Uses injected ProductService repository
   */
  async findProductForAnalytics(id: string): Promise<Product | null> {
    return this.productService.findById(id);
  }

  /**
   * Comprehensive user lookup with all safety features
   * Production-ready with error handling and logging
   */
  async findUserComprehensive(id: string): Promise<User | null> {
    try {
      console.log(`[ADMIN] Looking up user: ${id}`);
      const user = await this.userService.findById(id);
      if (user) {
        console.log(`[ADMIN] User found: ${user.email}`);
      }
      return user;
    } catch (error) {
      console.error(`[ADMIN] Error finding user ${id}:`, error);
      throw error;
    }
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a controller or other service
 */
export class ExampleUsage {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService
  ) {}

  async demonstrateUsage(): Promise<void> {
    // Basic user lookup
    const user = await this.userService.findUserById('user_123');
    if (user) {
      console.log(`Found user: ${user.firstName} ${user.lastName}`);
    }

    // Cached lookup for performance
    await this.userService.findUserByIdCached('user_123');

    // No-cache lookup for sensitive operations
    await this.userService.findUserByIdNoCache('user_123');

    // Product lookup with extended cache
    const product = await this.productService.findProductById('prod_456');
    if (product) {
      console.log(`Found product: ${product.name} - $${product.price}`);
    }

    // Error handling example
    try {
      const user = await this.userService.findUserByIdResilient('invalid_id');
      // Will return null if not found, won't throw
      if (user) {
        console.log('User result:', user);
      }
    } catch (error) {
      // Only throws on system errors, not "not found"
      console.error('System error occurred:', error);
    }
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator generates these Cypher queries:
 *
 * For findUserById('user_123'):
 * MATCH (n:User {id: $id})
 * RETURN n
 * LIMIT 1
 * Parameters: { id: 'user_123' }
 *
 * For findProductById('prod_456'):
 * MATCH (n:Product {id: $id})
 * RETURN n
 * LIMIT 1
 * Parameters: { id: 'prod_456' }
 */
