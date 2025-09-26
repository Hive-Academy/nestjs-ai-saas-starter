/**
 * Example: @Repository Decorator - Entity Updates with Auto-Generated Methods
 * Category: 02-entity-crud-decorators
 * Features: @Repository decorator with auto-generated update methods, partial updates, automatic timestamps
 */
import { Injectable } from '@nestjs/common';
import { Repository, BaseRepositoryService } from '../../../index';
import { User, Product, Order } from './shared-entities';
import type { ShippingAddress } from './shared-entities';

// DTOs for updates (only updatable fields)
interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  department?: string;
  salary?: number;
  isActive?: boolean;
  profileImage?: string;
  lastLoginAt?: Date;
  role?: 'admin' | 'user' | 'moderator';
}

interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  inStock?: boolean;
  stockQuantity?: number;
  tags?: string[];
}

interface UpdateOrderDto {
  status?: Order['status'];
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  notes?: string;
}

/**
 * User service demonstrating @Repository decorator usage
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  /**
   * The @Repository decorator automatically generates:
   * - findById(id: string): Promise<User | null>
   * - findAll(options?: FindOptions): Promise<User[]>
   * - create(data: Partial<User>): Promise<User>
   * - update(id: string, data: Partial<User>): Promise<User | null>
   * - delete(id: string): Promise<boolean>
   * - count(options?: FindOptions): Promise<number>
   * - exists(id: string): Promise<boolean>
   */

  /**
   * Basic user update using auto-generated update method
   * Auto-generates: MATCH (n:User {id: $id}) SET n += $updates, n.updatedAt = $timestamp RETURN n
   */
  async updateUser(id: string, updates: UpdateUserDto): Promise<User> {
    const result = await this.update(id, {
      ...updates,
      updatedAt: new Date()
    });
    if (!result) {
      throw new Error(`User with id ${id} not found`);
    }
    return result;
  }

  /**
   * Critical user update with enhanced retry logic
   * Higher retry count for important user data changes
   */
  async updateUserCritical(id: string, updates: UpdateUserDto): Promise<User> {
    const maxRetries = 5;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.updateUser(id, updates);
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
   * Safe user update with validation
   * Validates updates and ensures data integrity
   */
  async updateUserSafe(id: string, updates: UpdateUserDto): Promise<User> {
    // Validate input data
    if (updates.salary !== undefined && updates.salary < 0) {
      throw new Error('Salary cannot be negative');
    }
    if (updates.firstName !== undefined && updates.firstName.trim().length === 0) {
      throw new Error('First name cannot be empty');
    }
    if (updates.lastName !== undefined && updates.lastName.trim().length === 0) {
      throw new Error('Last name cannot be empty');
    }
    
    return this.updateUser(id, updates);
  }

  /**
   * Admin user update with audit trail
   * Includes retry logic and safety validation
   */
  async updateUserByAdmin(id: string, updates: UpdateUserDto): Promise<User> {
    console.log('[AUDIT] Admin updating user:', id, 'changes:', Object.keys(updates));
    
    try {
      const result = await this.updateUserCritical(id, {
        ...updates,
        updatedBy: 'admin', // Add admin context
        lastModified: new Date()
      } as any);
      
      console.log('[AUDIT] Admin update successful for user:', id);
      return result;
    } catch (error) {
      console.error('[AUDIT] Admin update failed for user:', id, (error as Error).message);
      throw error;
    }
  }

  /**
   * Specialized update methods using the base decorator
   */
  async updateUserProfile(id: string, profileData: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  }): Promise<User> {
    return this.updateUserSafe(id, profileData);
  }

  async updateUserRole(id: string, role: User['role']): Promise<User> {
    return this.updateUserByAdmin(id, { role } as UpdateUserDto);
  }

  async deactivateUser(id: string): Promise<User> {
    return this.updateUserSafe(id, { isActive: false });
  }

  async activateUser(id: string): Promise<User> {
    return this.updateUserSafe(id, { isActive: true });
  }

  async updateLastLogin(id: string): Promise<User> {
    return this.updateUser(id, {
      lastLoginAt: new Date()
    });
  }
}

/**
 * Product service demonstrating @Repository with inventory management
 */
@Injectable()
@Repository(() => Product)
export class ProductService extends BaseRepositoryService<Product> {
  /**
   * Product update with inventory tracking and retry logic
   */
  async updateProduct(id: string, updates: UpdateProductDto): Promise<Product> {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.update(id, {
          ...updates,
          updatedAt: new Date()
        });
        
        if (!result) {
          throw new Error(`Product with id ${id} not found`);
        }
        
        console.log('[INVENTORY] Product updated:', id, 'changes:', Object.keys(updates));
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to update product after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Price update with safety validation and enhanced retry
   * Price changes are critical and need validation
   */
  async updateProductPrice(id: string, updates: UpdateProductDto): Promise<Product> {
    // Validate price changes
    if (updates.price !== undefined) {
      if (updates.price < 0) {
        throw new Error('Price cannot be negative');
      }
      if (updates.price > 999999) {
        throw new Error('Price exceeds maximum allowed value');
      }
    }
    
    const maxRetries = 4;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.updateProduct(id, updates);
        console.log('[PRICE_UPDATE] Price updated for product:', id, 'new price:', updates.price);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to update product price after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Specialized product update methods
   */
  async updateStock(id: string, stockQuantity: number, inStock?: boolean): Promise<Product> {
    return this.updateProduct(id, {
      stockQuantity,
      inStock: inStock ?? stockQuantity > 0
    });
  }

  async updateProductDetails(id: string, details: {
    name?: string;
    description?: string;
    category?: string;
  }): Promise<Product> {
    return this.updateProduct(id, details);
  }

  async addProductTags(id: string, newTags: string[]): Promise<Product> {
    // Note: In a real implementation, you might want to fetch current tags first
    // This is a simplified example
    return this.updateProduct(id, { tags: newTags });
  }

  async markOutOfStock(id: string): Promise<Product> {
    return this.updateProduct(id, {
      inStock: false,
      stockQuantity: 0
    });
  }

  async restockProduct(id: string, quantity: number): Promise<Product> {
    return this.updateProduct(id, {
      stockQuantity: quantity,
      inStock: true
    });
  }
}

/**
 * Order service demonstrating complex status updates with @Repository
 */
@Injectable()
@Repository(() => Order)
export class OrderService extends BaseRepositoryService<Order> {
  /**
   * Order update with comprehensive validation and retry logic
   */
  async updateOrder(id: string, updates: UpdateOrderDto): Promise<Order> {
    // Validate status transitions
    if (updates.status) {
      this.validateStatusTransition(updates.status);
    }
    
    // Validate shipping address
    if (updates.shippingAddress !== undefined && 
        (!updates.shippingAddress.street || updates.shippingAddress.street.trim().length === 0)) {
      throw new Error('Shipping address street cannot be empty');
    }
    
    const maxRetries = 4;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await this.update(id, {
          ...updates,
          updatedAt: new Date()
        });
        
        if (!result) {
          throw new Error(`Order with id ${id} not found`);
        }
        
        console.log('[ORDER_UPDATE] Order updated:', id, 'changes:', Object.keys(updates));
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to update order after ${maxRetries} retries: ${lastError!.message}`);
  }
  
  private validateStatusTransition(status: Order['status']): void {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }
  }

  /**
   * Order status progression methods
   */
  async confirmOrder(id: string): Promise<Order> {
    return this.updateOrder(id, { status: 'confirmed' });
  }

  async startProcessingOrder(id: string): Promise<Order> {
    return this.updateOrder(id, { status: 'processing' });
  }

  async shipOrder(id: string, trackingNumber: string): Promise<Order> {
    return this.updateOrder(id, {
      status: 'shipped',
      trackingNumber
    });
  }

  async deliverOrder(id: string): Promise<Order> {
    return this.updateOrder(id, { status: 'delivered' });
  }

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    return this.updateOrder(id, {
      status: 'cancelled',
      notes: reason
    });
  }

  async updateShippingAddress(id: string, address: ShippingAddress): Promise<Order> {
    return this.updateOrder(id, { shippingAddress: address });
  }

  async addOrderNotes(id: string, notes: string): Promise<Order> {
    return this.updateOrder(id, { notes });
  }
}

/**
 * Advanced service demonstrating conditional and batch updates
 */
@Injectable()
export class AdvancedUpdateService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService
  ) {}

  /**
   * Conditional user update with validation
   */
  async updateUserIfExists(id: string, updates: UpdateUserDto): Promise<User | null> {
    try {
      const updatedUser = await this.userService.updateUserSafe(id, updates);
      return updatedUser;
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update multiple users with same changes
   */
  async updateMultipleUsers(userIds: string[], updates: UpdateUserDto): Promise<{
    successful: User[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: User[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of userIds) {
      try {
        const updatedUser = await this.userService.updateUserSafe(id, updates);
        successful.push(updatedUser);
      } catch (error) {
        failed.push({ id, error: (error as Error).message });
      }
    }

    return { successful, failed };
  }

  /**
   * Update with optimistic locking simulation
   */
  async updateWithVersionCheck(
    id: string,
    updates: UpdateUserDto,
    expectedVersion: string
  ): Promise<User | null> {
    // This would typically include a version check in the actual Cypher query
    // For demonstration, we'll show the pattern
    try {
      const updatedUser = await this.userService.updateUserSafe(id, updates);
      return updatedUser;
    } catch (error) {
      if ((error as Error).message.includes('version conflict')) {
        // Handle optimistic lock failure
        return null;
      }
      throw error;
    }
  }

  /**
   * Complex product update with business rules
   */
  async updateProductWithRules(id: string, updates: UpdateProductDto): Promise<{
    product: Product;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Business rule: If price is being reduced significantly, add warning
    if (updates.price !== undefined) {
      // In a real implementation, you'd fetch current price first
      warnings.push('Price change detected - review pricing strategy');
    }

    // Business rule: If marking out of stock, check for pending orders
    if (updates.inStock === false) {
      warnings.push('Product marked out of stock - check pending orders');
    }

    const product = await this.productService.updateProduct(id, updates);
    return { product, warnings };
  }

  /**
   * Update order status with validation
   */
  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    const updates = { status };
    return await this.orderService.updateOrder(id, updates);
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a REST controller
 */
export class UserController {
  constructor(private readonly userService: UserService) {}

  async updateUserProfile(userId: string, profileData: {
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const user = await this.userService.updateUserProfile(userId, profileData);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async deactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.userService.deactivateUser(userId);
      return {
        success: true,
        message: 'User deactivated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to deactivate user: ${(error as Error).message}`
      };
    }
  }
}

/**
 * Example usage with error handling and validation
 */
@Injectable()
export class UserManagementService {
  constructor(private readonly userService: UserService) {}

  async promoteUserToModerator(userId: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Update user role with admin privileges
      const user = await this.userService.updateUserByAdmin(userId, {
        role: 'moderator'
      });

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: `Failed to promote user: ${(error as Error).message}`
      };
    }
  }

  async updateUserSalary(userId: string, newSalary: number): Promise<User> {
    // Validate salary before update
    if (newSalary < 0) {
      throw new Error('Salary cannot be negative');
    }

    return this.userService.updateUserByAdmin(userId, { salary: newSalary });
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator auto-generates update method that produces these Cypher queries:
 *
 * For this.update(id, updates):
 * MATCH (n:User {id: $param0})
 * SET n += $param1, n.updatedAt = $param2
 * RETURN n
 * Parameters: {
 *   param0: 'user_123',
 *   param1: { firstName: 'John', lastName: 'Smith' },
 *   param2: Date object
 * }
 *
 * For Product updates:
 * MATCH (n:Product {id: $param0})
 * SET n += $param1, n.updatedAt = $param2
 * RETURN n
 * Parameters: {
 *   param0: 'prod_456',
 *   param1: { price: 899.99, inStock: true },
 *   param2: Date object
 * }
 *
 * For Order status updates:
 * MATCH (n:Order {id: $param0})
 * SET n += $param1, n.updatedAt = $param2
 * RETURN n
 * Parameters: {
 *   param0: 'order_789',
 *   param1: { status: 'shipped', trackingNumber: 'TRACK123' },
 *   param2: Date object
 * }
 */
