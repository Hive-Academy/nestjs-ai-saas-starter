/**
 * Example: @Repository Decorator - Entity Counting with Auto-Generated Methods
 * Category: 02-entity-crud-decorators
 * Features: @Repository decorator with auto-generated count methods, conditional counting, analytics
 */
import { Injectable } from '@nestjs/common';
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
   * - count(where?: Record<string, any>): Promise<number>
   * Plus other CRUD methods: findById, findAll, create, update, delete, exists
   */

  /**
   * Basic user counting using auto-generated count method
   * Auto-generates: MATCH (n:User) RETURN count(n) as count
   */
  async countAllUsers(where?: Partial<User>): Promise<number> {
    return this.count(where as Record<string, any>);
  }

  /**
   * Real-time user counting (simulating short cache behavior)
   * In production, you might implement custom caching logic
   */
  async countUsersRealTime(where?: Partial<User>): Promise<number> {
    // For real-time requirements, you might implement custom caching
    // or use the base count method directly for always-fresh data
    return this.countAllUsers(where);
  }

  /**
   * User counting for analytics (longer cache tolerance)
   * Analytics can tolerate slightly stale data for better performance
   */
  async countUsersForAnalytics(where?: Partial<User>): Promise<number> {
    // For analytics, you might cache results at the application level
    // or implement a service-level cache
    console.log('[ANALYTICS] Counting users for analytics dashboard');
    return this.countAllUsers(where);
  }

  /**
   * Safe user counting for admin operations with validation
   */
  async countUsersForAdmin(where?: Partial<User>): Promise<number> {
    // Add admin-specific validation if needed
    console.log('[ADMIN] Admin requesting user count');
    
    try {
      const count = await this.countAllUsers(where);
      console.log('[ADMIN] User count retrieved:', count);
      return count;
    } catch (error) {
      console.error('[ADMIN] Failed to get user count:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Specialized counting methods using the base decorator
   */
  async countActiveUsers(): Promise<number> {
    return this.countAllUsers({ isActive: true });
  }

  async countInactiveUsers(): Promise<number> {
    return this.countAllUsers({ isActive: false });
  }

  async countUsersByRole(role: 'admin' | 'user' | 'moderator'): Promise<number> {
    return this.countAllUsers({ role });
  }

  async countUsersByDepartment(department: string): Promise<number> {
    return this.countAllUsers({ department });
  }

  async countAdmins(): Promise<number> {
    return this.countUsersByRole('admin');
  }

  async countModerators(): Promise<number> {
    return this.countUsersByRole('moderator');
  }

  /**
   * Complex counting scenarios (demonstrating common patterns)
   */
  async getUserStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    moderators: number;
    regularUsers: number;
  }> {
    // Execute multiple counts - decorator handles caching
    const [total, active, inactive, admins, moderators, regularUsers] = await Promise.all([
      this.countAllUsers(),
      this.countActiveUsers(),
      this.countInactiveUsers(),
      this.countUsersByRole('admin'),
      this.countUsersByRole('moderator'),
      this.countUsersByRole('user')
    ]);

    return {
      total,
      active,
      inactive,
      admins,
      moderators,
      regularUsers
    };
  }
}

/**
 * Product service demonstrating inventory counting with @Repository
 */
@Injectable()
@Repository(() => Product)
export class ProductService extends BaseRepositoryService<Product> {
  /**
   * Product counting for inventory management
   */
  async countProducts(where?: Partial<Product>): Promise<number> {
    console.log('[INVENTORY] Counting products for inventory management');
    return this.count(where as Record<string, any>);
  }

  /**
   * Real-time product counting for stock monitoring
   */
  async countProductsRealTime(where?: Partial<Product>): Promise<number> {
    console.log('[STOCK] Real-time product count requested');
    return this.countProducts(where);
  }

  /**
   * Inventory counting methods
   */
  async countInStockProducts(): Promise<number> {
    return this.countProducts({ inStock: true });
  }

  async countOutOfStockProducts(): Promise<number> {
    return this.countProducts({ inStock: false });
  }

  async countProductsByCategory(category: string): Promise<number> {
    return this.countProducts({ category });
  }

  async countFeaturedProducts(): Promise<number> {
    return this.countProducts({ featured: true });
  }

  /**
   * Comprehensive product statistics
   */
  async getProductStatistics(): Promise<{
    total: number;
    inStock: number;
    outOfStock: number;
    featured: number;
    categoryCounts: Record<string, number>;
  }> {
    const total = await this.countProducts();
    const inStock = await this.countInStockProducts();
    const outOfStock = await this.countOutOfStockProducts();
    const featured = await this.countFeaturedProducts();

    // This would typically fetch categories dynamically
    const categories = ['electronics', 'clothing', 'books', 'home'];
    const categoryCounts: Record<string, number> = {};

    for (const category of categories) {
      categoryCounts[category] = await this.countProductsByCategory(category);
    }

    return {
      total,
      inStock,
      outOfStock,
      featured,
      categoryCounts
    };
  }

  /**
   * Performance monitoring for stock levels
   */
  async getStockLevelSummary(): Promise<{
    totalProducts: number;
    inStockPercentage: number;
    outOfStockPercentage: number;
    criticalStockAlert: boolean;
  }> {
    const total = await this.countProducts();
    const inStock = await this.countInStockProducts();
    const outOfStock = await this.countOutOfStockProducts();

    const inStockPercentage = total > 0 ? (inStock / total) * 100 : 0;
    const outOfStockPercentage = total > 0 ? (outOfStock / total) * 100 : 0;
    const criticalStockAlert = outOfStockPercentage > 20; // Alert if >20% out of stock

    return {
      totalProducts: total,
      inStockPercentage: Math.round(inStockPercentage * 100) / 100,
      outOfStockPercentage: Math.round(outOfStockPercentage * 100) / 100,
      criticalStockAlert
    };
  }
}

/**
 * Order service demonstrating business metrics counting with @Repository
 */
@Injectable()
@Repository(() => Order)
export class OrderService extends BaseRepositoryService<Order> {
  /**
   * Order counting for business analytics
   */
  async countOrders(where?: Partial<Order>): Promise<number> {
    console.log('[BUSINESS_METRICS] Counting orders for analytics');
    return this.count(where as Record<string, any>);
  }

  /**
   * Order counting for financial reporting (always accurate)
   * Financial data should always be accurate - no caching
   */
  async countOrdersForFinancials(where?: Partial<Order>): Promise<number> {
    console.log('[FINANCIAL] Counting orders for financial reporting (fresh data)');
    
    try {
      const count = await this.countOrders(where);
      console.log('[FINANCIAL] Order count for financial report:', count);
      return count;
    } catch (error) {
      console.error('[FINANCIAL] Failed to get order count for financials:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Order status counting
   */
  async countOrdersByStatus(status: Order['status']): Promise<number> {
    return this.countOrders({ status });
  }

  async countPendingOrders(): Promise<number> {
    return this.countOrdersByStatus('pending');
  }

  async countCompletedOrders(): Promise<number> {
    return this.countOrdersByStatus('delivered');
  }

  async countCancelledOrders(): Promise<number> {
    return this.countOrdersByStatus('cancelled');
  }

  async countActiveOrders(): Promise<number> {
    // Count orders that are not cancelled or delivered
    const pending = await this.countOrdersByStatus('pending');
    const confirmed = await this.countOrdersByStatus('confirmed');
    const processing = await this.countOrdersByStatus('processing');
    const shipped = await this.countOrdersByStatus('shipped');

    return pending + confirmed + processing + shipped;
  }

  /**
   * Business metrics and KPIs
   */
  async getOrderMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    pending: number;
    completionRate: number;
    cancellationRate: number;
  }> {
    const [total, active, completed, cancelled, pending] = await Promise.all([
      this.countOrders(),
      this.countActiveOrders(),
      this.countCompletedOrders(),
      this.countCancelledOrders(),
      this.countPendingOrders()
    ]);

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;

    return {
      total,
      active,
      completed,
      cancelled,
      pending,
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100
    };
  }
}

/**
 * Post service demonstrating content management counting with @Repository
 */
@Injectable()
@Repository(() => Post)
export class PostService extends BaseRepositoryService<Post> {
  /**
   * Post counting for content management
   */
  async countPosts(where?: Partial<Post>): Promise<number> {
    console.log('[CONTENT] Counting posts for content management');
    return this.count(where as Record<string, any>);
  }

  /**
   * Content status counting
   */
  async countPostsByStatus(status: 'draft' | 'published' | 'archived'): Promise<number> {
    return this.countPosts({ status });
  }

  async countPublishedPosts(): Promise<number> {
    return this.countPostsByStatus('published');
  }

  async countDraftPosts(): Promise<number> {
    return this.countPostsByStatus('draft');
  }

  async countArchivedPosts(): Promise<number> {
    return this.countPostsByStatus('archived');
  }

  async countFeaturedPosts(): Promise<number> {
    return this.countPosts({ featured: true });
  }

  /**
   * Editorial dashboard metrics
   */
  async getEditorialMetrics(): Promise<{
    totalPosts: number;
    published: number;
    drafts: number;
    archived: number;
    featured: number;
    publishRate: number;
  }> {
    const [totalPosts, published, drafts, archived, featured] = await Promise.all([
      this.countPosts(),
      this.countPublishedPosts(),
      this.countDraftPosts(),
      this.countArchivedPosts(),
      this.countFeaturedPosts()
    ]);

    const publishRate = totalPosts > 0 ? (published / totalPosts) * 100 : 0;

    return {
      totalPosts,
      published,
      drafts,
      archived,
      featured,
      publishRate: Math.round(publishRate * 100) / 100
    };
  }
}

/**
 * Advanced analytics service demonstrating complex counting scenarios
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly postService: PostService
  ) {}

  /**
   * Comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<{
    users: any;
    products: any;
    orders: any;
    posts: any;
    timestamp: string;
  }> {
    // Execute all metrics in parallel for better performance
    const [users, products, orders, posts] = await Promise.all([
      this.userService.getUserStatistics(),
      this.productService.getProductStatistics(),
      this.orderService.getOrderMetrics(),
      this.postService.getEditorialMetrics()
    ]);

    return {
      users,
      products,
      orders,
      posts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Performance monitoring counts
   */
  async getSystemHealthCounts(): Promise<{
    activeUsers: number;
    availableProducts: number;
    activeOrders: number;
    publishedContent: number;
    healthScore: number;
  }> {
    const [activeUsers, availableProducts, activeOrders, publishedContent] = await Promise.all([
      this.userService.countActiveUsers(),
      this.productService.countInStockProducts(),
      this.orderService.countActiveOrders(),
      this.postService.countPublishedPosts()
    ]);

    // Simple health score calculation
    const healthScore = Math.min(100, (activeUsers + availableProducts + publishedContent) / 10);

    return {
      activeUsers,
      availableProducts,
      activeOrders,
      publishedContent,
      healthScore: Math.round(healthScore)
    };
  }

  /**
   * Batch counting with error handling
   */
  async getBatchCounts(entities: Array<{
    type: 'user' | 'product' | 'order' | 'post';
    filter?: any;
  }>): Promise<Array<{
    type: string;
    count: number;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      entities.map(async (entity) => {
        let count: number;

        switch (entity.type) {
          case 'user':
            count = await this.userService.countAllUsers(entity.filter);
            break;
          case 'product':
            count = await this.productService.countProducts(entity.filter);
            break;
          case 'order':
            count = await this.orderService.countOrders(entity.filter);
            break;
          case 'post':
            count = await this.postService.countPosts(entity.filter);
            break;
          default:
            throw new Error(`Unknown entity type: ${entity.type}`);
        }

        return { type: entity.type, count };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          type: entities[index].type,
          count: 0,
          error: result.reason.message
        };
      }
    });
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a dashboard controller
 */
export class DashboardController {
  constructor(
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async getDashboardCounts(): Promise<{
    totalUsers: number;
    activeUsers: number;
    userGrowthRate: string;
  }> {
    const totalUsers = await this.userService.countAllUsers();
    const activeUsers = await this.userService.countActiveUsers();
    const growthRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0';

    return {
      totalUsers,
      activeUsers,
      userGrowthRate: `${growthRate}%`
    };
  }

  async getQuickStats(): Promise<{
    stats: any;
    lastUpdated: string;
  }> {
    const stats = await this.analyticsService.getDashboardMetrics();

    return {
      stats,
      lastUpdated: new Date().toISOString()
    };
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator auto-generates count method that produces these Cypher queries:
 *
 * For this.count():
 * MATCH (n:User) RETURN count(n) as count
 *
 * For this.count({isActive: true}):
 * MATCH (n:User) WHERE n.isActive = $whereParam0 RETURN count(n) as count
 * Parameters: { whereParam0: true }
 *
 * For countUsersByRole('admin') -> this.count({role: 'admin'}):
 * MATCH (n:User) WHERE n.role = $whereParam0 RETURN count(n) as count
 * Parameters: { whereParam0: 'admin' }
 *
 * For countProducts({inStock: true, featured: true}):
 * MATCH (n:Product) WHERE n.inStock = $whereParam0 AND n.featured = $whereParam1 RETURN count(n) as count
 * Parameters: { whereParam0: true, whereParam1: true }
 *
 * For countOrdersByStatus('pending') -> this.count({status: 'pending'}):
 * MATCH (n:Order) WHERE n.status = $whereParam0 RETURN count(n) as count
 * Parameters: { whereParam0: 'pending' }
 */
