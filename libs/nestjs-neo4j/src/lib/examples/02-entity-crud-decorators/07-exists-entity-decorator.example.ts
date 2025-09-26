/**
 * Example: @Repository Decorator - Entity Existence Validation with Auto-Generated Methods
 * Category: 02-entity-crud-decorators
 * Features: @Repository decorator with auto-generated exists methods, validation, guard patterns, business logic
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, BaseRepositoryService } from '../../../index';
import { User, Product, Order, Post } from './shared-entities';

/**
 * User service demonstrating @Repository decorator usage
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  /**
   * The @Repository decorator automatically generates:
   * - exists(id: string): Promise<boolean>
   * Plus other CRUD methods: findById, findAll, create, update, delete, count
   */

  /**
   * Basic user existence check using auto-generated exists method
   * Auto-generates: MATCH (n:User {id: $id}) RETURN count(n) > 0 as exists
   */
  async userExists(id: string): Promise<boolean> {
    return this.exists(id);
  }

  /**
   * User existence check with conceptual extended cache
   * User existence doesn't change often, so could benefit from caching
   */
  async userExistsLongCache(id: string): Promise<boolean> {
    // In production, you might implement application-level caching here
    // For now, use the base exists method
    return this.userExists(id);
  }

  /**
   * Real-time user existence check without cache
   * For critical operations that need fresh data
   */
  async userExistsRealTime(id: string): Promise<boolean> {
    // For real-time requirements, directly use the base exists method
    // which always queries the database
    console.log('[REAL_TIME] Checking user existence for real-time validation:', id);
    return this.userExists(id);
  }

  /**
   * Safe user existence check with validation
   */
  async userExistsSafe(id: string): Promise<boolean> {
    // Add input validation
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('User ID cannot be empty');
    }
    
    try {
      return await this.userExists(id);
    } catch (error) {
      console.error('[SAFE_CHECK] Error checking user existence:', id, (error as Error).message);
      throw error;
    }
  }

  /**
   * Admin user existence check with audit trail
   */
  async userExistsForAdmin(id: string): Promise<boolean> {
    console.log('[ADMIN] Admin checking user existence:', id);
    
    try {
      const exists = await this.userExistsSafe(id);
      console.log('[ADMIN] User existence check result:', id, exists);
      return exists;
    } catch (error) {
      console.error('[ADMIN] Admin user existence check failed:', id, (error as Error).message);
      throw error;
    }
  }

  /**
   * Validation methods using existence checks
   */
  async validateUserExists(id: string): Promise<void> {
    const exists = await this.userExists(id);
    if (!exists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async validateUserExistsForOperation(id: string, operation: string): Promise<void> {
    const exists = await this.userExistsSafe(id);
    if (!exists) {
      throw new NotFoundException(`User ${id} not found for operation: ${operation}`);
    }
  }

  /**
   * Guard pattern - check before proceeding
   */
  async ensureUserExists(id: string): Promise<string> {
    await this.validateUserExists(id);
    return id;
  }

  /**
   * Batch existence checks
   */
  async checkMultipleUsersExist(userIds: string[]): Promise<{
    existing: string[];
    missing: string[];
  }> {
    const existing: string[] = [];
    const missing: string[] = [];

    // Execute checks in parallel for better performance
    const results = await Promise.allSettled(
      userIds.map(id => this.userExists(id))
    );

    userIds.forEach((id, index) => {
      const result = results[index];
      if (result.status === 'fulfilled' && result.value) {
        existing.push(id);
      } else {
        missing.push(id);
      }
    });

    return { existing, missing };
  }
}

/**
 * Product service demonstrating inventory validation with @Repository
 */
@Injectable()
@Repository(() => Product)
export class ProductService extends BaseRepositoryService<Product> {
  /**
   * Product existence check for inventory validation
   */
  async productExists(id: string): Promise<boolean> {
    console.log('[INVENTORY] Checking product existence:', id);
    return this.exists(id);
  }

  /**
   * Product existence check for stock operations
   * Stock-related operations need fresher data
   */
  async productExistsForStock(id: string): Promise<boolean> {
    console.log('[STOCK] Checking product existence for stock operations:', id);
    return this.productExists(id);
  }

  /**
   * Product validation methods
   */
  async validateProductExists(id: string): Promise<void> {
    const exists = await this.productExists(id);
    if (!exists) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  async validateProductForPurchase(id: string): Promise<void> {
    const exists = await this.productExistsForStock(id);
    if (!exists) {
      throw new BadRequestException(`Product ${id} is not available for purchase`);
    }
  }

  /**
   * Business logic with existence validation
   */
  async canPurchaseProduct(productId: string): Promise<{
    canPurchase: boolean;
    reason?: string;
  }> {
    try {
      const exists = await this.productExistsForStock(productId);

      if (!exists) {
        return {
          canPurchase: false,
          reason: 'Product not found'
        };
      }

      // Additional business rules would go here
      // (stock levels, active status, etc.)

      return { canPurchase: true };
    } catch (error) {
      return {
        canPurchase: false,
        reason: 'Error checking product availability'
      };
    }
  }

  /**
   * Validate multiple products for order
   */
  async validateProductsForOrder(productIds: string[]): Promise<{
    valid: boolean;
    availableProducts: string[];
    unavailableProducts: string[];
  }> {
    const availableProducts: string[] = [];
    const unavailableProducts: string[] = [];

    const results = await Promise.allSettled(
      productIds.map(id => this.productExistsForStock(id))
    );

    productIds.forEach((id, index) => {
      const result = results[index];
      if (result.status === 'fulfilled' && result.value) {
        availableProducts.push(id);
      } else {
        unavailableProducts.push(id);
      }
    });

    return {
      valid: unavailableProducts.length === 0,
      availableProducts,
      unavailableProducts
    };
  }
}

/**
 * Order service demonstrating relationship validation with @Repository
 */
@Injectable()
@Repository(() => Order)
export class OrderService extends BaseRepositoryService<Order> {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService
  ) {
    super();
  }

  /**
   * Order existence check for business operations
   */
  async orderExists(id: string): Promise<boolean> {
    console.log('[ORDER] Checking order existence for business operations:', id);
    return this.exists(id);
  }

  /**
   * Order existence check for financial operations (no cache, always fresh)
   */
  async orderExistsForFinancial(id: string): Promise<boolean> {
    console.log('[FINANCIAL] Checking order existence for financial operations (fresh data):', id);
    
    // Add validation for financial operations
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Order ID cannot be empty for financial operations');
    }
    
    try {
      const exists = await this.orderExists(id);
      console.log('[FINANCIAL] Order existence result for financial ops:', id, exists);
      return exists;
    } catch (error) {
      console.error('[FINANCIAL] Order existence check failed:', id, (error as Error).message);
      throw error;
    }
  }

  /**
   * Complex validation using multiple existence checks
   */
  async validateOrderCreation(orderData: {
    userId: string;
    productIds: string[];
  }): Promise<{
    valid: boolean;
    errors: string[];
    userValid: boolean;
    productsValid: boolean;
  }> {
    const errors: string[] = [];

    // Check if user exists
    const userValid = await this.userService.userExists(orderData.userId);
    if (!userValid) {
      errors.push(`User ${orderData.userId} does not exist`);
    }

    // Check if all products exist
    const productValidation = await this.productService.validateProductsForOrder(orderData.productIds);
    const productsValid = productValidation.valid;

    if (!productsValid) {
      errors.push(`Products not found: ${productValidation.unavailableProducts.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      userValid,
      productsValid
    };
  }

  async validateOrderUpdate(orderId: string): Promise<void> {
    const exists = await this.orderExists(orderId);
    if (!exists) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
  }

  async validateOrderForPayment(orderId: string): Promise<void> {
    const exists = await this.orderExistsForFinancial(orderId);
    if (!exists) {
      throw new NotFoundException(`Order ${orderId} not found for payment processing`);
    }
  }
}

/**
 * Post service demonstrating content validation with @Repository
 */
@Injectable()
@Repository(() => Post)
export class PostService extends BaseRepositoryService<Post> {
  constructor(private readonly userService: UserService) {
    super();
  }

  /**
   * Post existence check for content operations
   */
  async postExists(id: string): Promise<boolean> {
    console.log('[CONTENT] Checking post existence:', id);
    return this.exists(id);
  }

  /**
   * Content validation with author verification
   */
  async validatePostAndAuthor(postId: string, authorId: string): Promise<{
    postExists: boolean;
    authorExists: boolean;
    valid: boolean;
    message: string;
  }> {
    const [postExists, authorExists] = await Promise.all([
      this.postExists(postId),
      this.userService.userExists(authorId)
    ]);

    const valid = postExists && authorExists;

    let message = 'Valid';
    if (!postExists && !authorExists) {
      message = 'Post and author not found';
    } else if (!postExists) {
      message = 'Post not found';
    } else if (!authorExists) {
      message = 'Author not found';
    }

    return {
      postExists,
      authorExists,
      valid,
      message
    };
  }

  async validatePostForEdit(postId: string, editorId: string): Promise<void> {
    const postExists = await this.postExists(postId);
    if (!postExists) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    const editorExists = await this.userService.userExists(editorId);
    if (!editorExists) {
      throw new BadRequestException(`Editor ${editorId} not found`);
    }
  }
}

/**
 * Advanced validation service demonstrating complex scenarios
 */
@Injectable()
export class ValidationService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly postService: PostService
  ) {}

  /**
   * Comprehensive entity validation
   */
  async validateEntityExists(
    entityType: 'user' | 'product' | 'order' | 'post',
    id: string
  ): Promise<{ exists: boolean; entityType: string; id: string }> {
    let exists = false;

    switch (entityType) {
      case 'user':
        exists = await this.userService.userExists(id);
        break;
      case 'product':
        exists = await this.productService.productExists(id);
        break;
      case 'order':
        exists = await this.orderService.orderExists(id);
        break;
      case 'post':
        exists = await this.postService.postExists(id);
        break;
      default:
        throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    return { exists, entityType, id };
  }

  /**
   * Batch validation across different entity types
   */
  async validateMultipleEntities(entities: Array<{
    type: 'user' | 'product' | 'order' | 'post';
    id: string;
  }>): Promise<{
    allValid: boolean;
    results: Array<{
      type: string;
      id: string;
      exists: boolean;
      error?: string;
    }>;
  }> {
    const results = await Promise.allSettled(
      entities.map(entity => this.validateEntityExists(entity.type, entity.id))
    );

    const validationResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          type: result.value.entityType,
          id: result.value.id,
          exists: result.value.exists
        };
      } else {
        return {
          type: entities[index].type,
          id: entities[index].id,
          exists: false,
          error: result.reason.message
        };
      }
    });

    const allValid = validationResults.every(result => result.exists && !result.error);

    return {
      allValid,
      results: validationResults
    };
  }

  /**
   * Hierarchical validation (check dependencies)
   */
  async validateWithDependencies(
    mainEntity: { type: 'order' | 'post'; id: string },
    dependencies: Array<{ type: 'user' | 'product'; id: string }>
  ): Promise<{
    mainEntityValid: boolean;
    dependenciesValid: boolean;
    allValid: boolean;
    details: any;
  }> {
    // Validate main entity
    const mainResult = await this.validateEntityExists(mainEntity.type, mainEntity.id);

    // Validate dependencies
    const dependencyResults = await this.validateMultipleEntities(dependencies);

    return {
      mainEntityValid: mainResult.exists,
      dependenciesValid: dependencyResults.allValid,
      allValid: mainResult.exists && dependencyResults.allValid,
      details: {
        main: mainResult,
        dependencies: dependencyResults.results
      }
    };
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a controller with proper error handling
 */
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly validationService: ValidationService
  ) {}

  async getUserProfile(userId: string): Promise<{ message: string; exists: boolean }> {
    const exists = await this.userService.userExists(userId);

    if (exists) {
      return {
        message: 'User found, fetching profile...',
        exists: true
      };
    } else {
      return {
        message: 'User not found',
        exists: false
      };
    }
  }

  async validateUserBeforeOperation(userId: string): Promise<{
    canProceed: boolean;
    message: string;
  }> {
    try {
      await this.userService.validateUserExists(userId);
      return {
        canProceed: true,
        message: 'User validation successful'
      };
    } catch (error) {
      return {
        canProceed: false,
        message: (error as Error).message
      };
    }
  }
}

/**
 * Example usage in a guard or middleware
 */
@Injectable()
export class EntityExistsGuard {
  constructor(private readonly validationService: ValidationService) {}

  async canActivate(
    entityType: 'user' | 'product' | 'order' | 'post',
    entityId: string
  ): Promise<boolean> {
    try {
      const result = await this.validationService.validateEntityExists(entityType, entityId);
      return result.exists;
    } catch (error) {
      return false;
    }
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator auto-generates exists method that produces these Cypher queries:
 *
 * For this.exists('user_123'):
 * MATCH (n:User {id: $param0}) RETURN count(n) > 0 as exists
 * Parameters: { param0: 'user_123' }
 *
 * For productExists('prod_456') -> this.exists('prod_456'):
 * MATCH (n:Product {id: $param0}) RETURN count(n) > 0 as exists
 * Parameters: { param0: 'prod_456' }
 *
 * For orderExists('order_789') -> this.exists('order_789'):
 * MATCH (n:Order {id: $param0}) RETURN count(n) > 0 as exists
 * Parameters: { param0: 'order_789' }
 *
 * For postExists('post_101') -> this.exists('post_101'):
 * MATCH (n:Post {id: $param0}) RETURN count(n) > 0 as exists
 * Parameters: { param0: 'post_101' }
 */
