/**
 * Example: @Repository Decorator - Entity Deletion with Auto-Generated Methods
 * Category: 02-entity-crud-decorators
 * Features: @Repository decorator with auto-generated delete methods, soft/hard deletion, cascade operations
 */
import { Injectable } from '@nestjs/common';
import { Repository, BaseRepositoryService } from '../../../index';
import { User, Product, Order, Comment } from './shared-entities';

/**
 * User service demonstrating @Repository decorator usage
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  /**
   * The @Repository decorator automatically generates:
   * - delete(id: string): Promise<boolean>
   * Plus other CRUD methods: findById, findAll, create, update, count, exists
   */

  /**
   * Basic user deletion using auto-generated delete method
   * Auto-generates: MATCH (n:User {id: $id}) DELETE n RETURN count(n) > 0 as deleted
   * WARNING: This permanently removes the user from database
   */
  async deleteUser(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Delete user with relationships using DETACH DELETE
   * This manually implements DETACH DELETE for cases with relationships
   * This is safer when user has relationships (orders, posts, etc.)
   */
  async deleteUserWithRelationships(id: string): Promise<boolean> {
    // For DETACH DELETE, we need to execute a custom query
    // since the auto-generated delete method doesn't support detach
    const neo4jService = (this as any).getNeo4jService();
    const result = await neo4jService.run(
      `MATCH (n:User {id: $id}) DETACH DELETE n RETURN count(n) > 0 as deleted`,
      { id }
    );
    return result.records[0]?.get('deleted') || false;
  }

  /**
   * Resilient user deletion with enhanced retry logic
   * Higher retry count for important deletion operations
   */
  async deleteUserResilient(id: string): Promise<boolean> {
    const maxRetries = 5;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.deleteUserWithRelationships(id);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to delete user after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Safe user deletion with validation
   * Validates deletion and ensures data integrity
   */
  async deleteUserSafe(id: string): Promise<boolean> {
    // Validate before deletion
    const userExists = await this.exists(id);
    if (!userExists) {
      throw new Error(`User with id ${id} not found`);
    }
    
    // Additional business validation could go here
    // e.g., check if user has pending orders, is admin, etc.
    
    return this.deleteUserWithRelationships(id);
  }

  /**
   * Admin user deletion with comprehensive logging and audit trail
   */
  async deleteUserByAdmin(id: string): Promise<boolean> {
    console.log('[AUDIT] Admin deleting user:', id);
    
    try {
      const result = await this.deleteUserResilient(id);
      
      if (result) {
        console.log('[AUDIT] Admin successfully deleted user:', id);
      } else {
        console.log('[AUDIT] Admin deletion failed - user not found:', id);
      }
      
      return result;
    } catch (error) {
      console.error('[AUDIT] Admin deletion failed for user:', id, (error as Error).message);
      throw error;
    }
  }

  /**
   * Soft delete implementation using update method
   * This doesn't actually delete, but marks as deleted
   */
  async softDeleteUser(id: string): Promise<boolean> {
    // This uses the auto-generated update method to set deletedAt
    try {
      const result = await this.update(id, {
        deletedAt: new Date(),
        isActive: false
      });
      return result !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Business logic methods using the deletion decorators
   */
  async deactivateAndDeleteUser(id: string): Promise<{
    deactivated: boolean;
    deleted: boolean;
  }> {
    try {
      // First deactivate (this would use @UpdateEntity in real implementation)
      // Then delete
      const deleted = await this.deleteUserSafe(id);
      return { deactivated: true, deleted };
    } catch (error) {
      return { deactivated: false, deleted: false };
    }
  }
}

/**
 * Product service demonstrating @Repository for catalog management
 */
@Injectable()
@Repository(() => Product)
export class ProductService extends BaseRepositoryService<Product> {
  /**
   * Product deletion with detach (products may have orders)
   * Includes retry logic for reliability
   */
  async deleteProduct(id: string): Promise<boolean> {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Use DETACH DELETE for products with relationships
        const neo4jService = (this as any).getNeo4jService();
        const result = await neo4jService.run(
          `MATCH (n:Product {id: $id}) DETACH DELETE n RETURN count(n) > 0 as deleted`,
          { id }
        );
        const deleted = result.records[0]?.get('deleted') || false;
        
        if (deleted) {
          console.log('[INVENTORY] Product deleted:', id);
        }
        
        return deleted;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to delete product after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Delete discontinued products with safety validation
   * Enhanced retry logic and validation checks
   */
  async deleteDiscontinuedProduct(id: string): Promise<boolean> {
    // Validate product exists
    const productExists = await this.exists(id);
    if (!productExists) {
      throw new Error(`Product with id ${id} not found`);
    }
    
    // Additional business validation
    // In real implementation, check if product is actually discontinued
    // Check for pending orders, etc.
    
    const maxRetries = 4;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.deleteProduct(id);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to delete discontinued product after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Business methods for product lifecycle management
   */
  async discontinueProduct(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const deleted = await this.deleteDiscontinuedProduct(id);
      if (deleted) {
        return {
          success: true,
          message: 'Product successfully discontinued and removed'
        };
      } else {
        return {
          success: false,
          message: 'Product not found or could not be deleted'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to discontinue product: ${(error as Error).message}`
      };
    }
  }

  async removeOutOfStockProducts(): Promise<{
    attempted: number;
    successful: number;
    failed: number;
  }> {
    // This would typically find out-of-stock products first
    // Then delete them in batch
    const outOfStockIds = ['prod1', 'prod2']; // Placeholder

    let successful = 0;
    let failed = 0;

    for (const id of outOfStockIds) {
      try {
        const deleted = await this.deleteProduct(id);
        if (deleted) successful++;
        else failed++;
      } catch (error) {
        failed++;
      }
    }

    return {
      attempted: outOfStockIds.length,
      successful,
      failed
    };
  }
}

/**
 * Order service demonstrating careful deletion patterns with @Repository
 */
@Injectable()
@Repository(() => Order)
export class OrderService extends BaseRepositoryService<Order> {
  /**
   * Order deletion - very careful with business data
   * Orders typically should not be hard deleted in production
   * Maximum safety with validation and retry logic
   */
  async deleteOrder(id: string): Promise<boolean> {
    // Validate order exists
    const orderExists = await this.exists(id);
    if (!orderExists) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    // Additional business validation
    // In real implementation, check order status, permissions, etc.
    console.log('[WARNING] Deleting business-critical order data:', id);
    
    const maxRetries = 4;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Use DETACH DELETE for orders with relationships
        const neo4jService = (this as any).getNeo4jService();
        const result = await neo4jService.run(
          `MATCH (n:Order {id: $id}) DETACH DELETE n RETURN count(n) > 0 as deleted`,
          { id }
        );
        return result.records[0]?.get('deleted') || false;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to delete order after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Specialized deletion for cancelled orders only
   */
  async deleteCancelledOrder(id: string): Promise<{
    deleted: boolean;
    message: string;
  }> {
    try {
      // In real implementation, would first check if order is cancelled
      // This is a simplified example
      const deleted = await this.deleteOrder(id);

      if (deleted) {
        return {
          deleted: true,
          message: 'Cancelled order successfully deleted'
        };
      } else {
        return {
          deleted: false,
          message: 'Order not found or could not be deleted'
        };
      }
    } catch (error) {
      return {
        deleted: false,
        message: `Failed to delete order: ${(error as Error).message}`
      };
    }
  }
}

/**
 * Comment service demonstrating cascade deletion patterns with @Repository
 */
@Injectable()
@Repository(() => Comment)
export class CommentService extends BaseRepositoryService<Comment> {
  /**
   * Comment deletion - simple entities, using auto-generated delete method
   */
  async deleteComment(id: string): Promise<boolean> {
    const maxRetries = 2;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const deleted = await this.delete(id);
        if (deleted) {
          console.log('[MODERATION] Comment deleted:', id);
        }
        return deleted;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    
    throw new Error(`Failed to delete comment after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Safe comment deletion with validation
   */
  async deleteCommentSafe(id: string): Promise<boolean> {
    // Validate comment exists
    const commentExists = await this.exists(id);
    if (!commentExists) {
      return false; // Comment doesn't exist, consider it "deleted"
    }
    
    const maxRetries = 3;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.deleteComment(id);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Failed to safely delete comment after ${maxRetries} retries: ${lastError!.message}`);
  }

  /**
   * Batch delete comments by post ID
   * This demonstrates the pattern - in real implementation you'd use
   * a different approach like raw Cypher for bulk operations
   */
  async deleteCommentsByPost(postId: string): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    // This is a simplified example - in production you'd use bulk operations
    const commentIds = ['comment1', 'comment2']; // Would fetch these first

    let deletedCount = 0;
    const errors: string[] = [];

    for (const commentId of commentIds) {
      try {
        const deleted = await this.deleteCommentSafe(commentId);
        if (deleted) deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete comment ${commentId}: ${(error as Error).message}`);
      }
    }

    return { deletedCount, errors };
  }
}

/**
 * Advanced service demonstrating complex deletion scenarios
 */
@Injectable()
export class AdvancedDeletionService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly commentService: CommentService
  ) {}

  /**
   * Cascade user deletion - remove user and all related data
   */
  async cascadeDeleteUser(userId: string): Promise<{
    userDeleted: boolean;
    commentsDeleted: number;
    ordersHandled: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let commentsDeleted = 0;
    let ordersHandled = 0;

    try {
      // Delete user's comments
      const commentResult = await this.deleteUserComments(userId);
      commentsDeleted = commentResult.deletedCount;
      errors.push(...commentResult.errors);

      // Handle user's orders (mark as anonymous rather than delete)
      const orderResult = await this.anonymizeUserOrders(userId);
      ordersHandled = orderResult.handled;

      // Finally delete the user
      const userDeleted = await this.userService.deleteUserByAdmin(userId);

      return {
        userDeleted,
        commentsDeleted,
        ordersHandled,
        errors
      };
    } catch (error) {
      errors.push(`Failed to delete user: ${(error as Error).message}`);
      return {
        userDeleted: false,
        commentsDeleted,
        ordersHandled,
        errors
      };
    }
  }

  /**
   * Conditional deletion with validation
   */
  async deleteWithValidation(entityType: 'user' | 'product', id: string): Promise<{
    canDelete: boolean;
    deleted: boolean;
    reason?: string;
  }> {
    // Business rules validation
    const validation = await this.validateDeletion(entityType, id);

    if (!validation.canDelete) {
      return {
        canDelete: false,
        deleted: false,
        reason: validation.reason
      };
    }

    try {
      let deleted = false;

      if (entityType === 'user') {
        deleted = await this.userService.deleteUserSafe(id);
      } else if (entityType === 'product') {
        deleted = await this.productService.deleteDiscontinuedProduct(id);
      }

      return { canDelete: true, deleted };
    } catch (error) {
      return {
        canDelete: true,
        deleted: false,
        reason: (error as Error).message
      };
    }
  }

  /**
   * Bulk deletion with error handling
   */
  async bulkDelete(entityType: 'user' | 'product', ids: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; reason: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        const result = await this.deleteWithValidation(entityType, id);

        if (result.deleted) {
          successful.push(id);
        } else {
          failed.push({
            id,
            reason: result.reason || 'Unknown deletion failure'
          });
        }
      } catch (error) {
        failed.push({ id, reason: (error as Error).message });
      }
    }

    return { successful, failed };
  }

  // Helper methods (simplified implementations)
  private async deleteUserComments(userId: string): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    // Implementation would find and delete user's comments
    return { deletedCount: 0, errors: [] };
  }

  private async anonymizeUserOrders(userId: string): Promise<{
    handled: number;
  }> {
    // Implementation would anonymize orders rather than delete them
    return { handled: 0 };
  }

  private async validateDeletion(entityType: string, id: string): Promise<{
    canDelete: boolean;
    reason?: string;
  }> {
    // Business rules validation
    if (entityType === 'user') {
      // Check if user has active orders, is admin, etc.
      return { canDelete: true };
    } else if (entityType === 'product') {
      // Check if product has active orders, etc.
      return { canDelete: true };
    }

    return { canDelete: false, reason: 'Invalid entity type' };
  }

  /**
   * Delete order safely
   */
  async deleteOrderSafely(id: string): Promise<boolean> {
    return await this.orderService.deleteOrder(id);
  }

  /**
   * Delete comment safely
   */
  async deleteCommentSafely(id: string): Promise<boolean> {
    return await this.commentService.deleteComment(id);
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a REST controller with proper error handling
 */
export class AdminController {
  constructor(
    private readonly userService: UserService,
    private readonly advancedDeletionService: AdvancedDeletionService
  ) {}

  async deleteUser(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const deleted = await this.userService.deleteUserByAdmin(userId);

      if (deleted) {
        return {
          success: true,
          message: 'User successfully deleted'
        };
      } else {
        return {
          success: false,
          message: 'User not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete user: ${(error as Error).message}`
      };
    }
  }

  async cascadeDeleteUser(userId: string): Promise<{
    success: boolean;
    details: any;
    message: string;
  }> {
    try {
      const result = await this.advancedDeletionService.cascadeDeleteUser(userId);

      return {
        success: result.userDeleted,
        details: result,
        message: result.userDeleted
          ? 'User and related data successfully deleted'
          : 'Failed to delete user completely'
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        message: `Cascade deletion failed: ${(error as Error).message}`
      };
    }
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator auto-generates delete method that produces these Cypher queries:
 *
 * For this.delete(id) - basic deletion:
 * MATCH (n:User {id: $param0})
 * DELETE n
 * RETURN count(n) > 0 as deleted
 * Parameters: { param0: 'user_123' }
 *
 * For custom DETACH DELETE queries (manual implementation):
 * MATCH (n:User {id: $param0})
 * DETACH DELETE n
 * RETURN count(n) > 0 as deleted
 * Parameters: { param0: 'user_123' }
 *
 * For product deletion with relationships:
 * MATCH (n:Product {id: $param0})
 * DETACH DELETE n
 * RETURN count(n) > 0 as deleted
 * Parameters: { param0: 'prod_456' }
 *
 * For comment deletion - simple entity:
 * MATCH (n:Comment {id: $param0})
 * DELETE n
 * RETURN count(n) > 0 as deleted
 * Parameters: { param0: 'comment_789' }
 */
