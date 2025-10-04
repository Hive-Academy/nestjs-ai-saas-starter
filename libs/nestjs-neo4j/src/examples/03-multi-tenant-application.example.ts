/**
 * @fileoverview Multi-Tenant Application Example
 *
 * Demonstrates:
 * - Database-per-tenant isolation
 * - Tenant context management
 * - Multi-tenant decorators
 * - Tenant-aware repositories
 * - Cross-tenant analytics (admin)
 */

import { Body, Controller, Get, Injectable, Param, Post } from '@nestjs/common';
import type { Neo4jRecord } from '../index';
import {
  AuditLog,
  Authorize,
  Neo4jCrudService,
  FindOptions,
  CreatedAt,
  Id,
  InjectNeogma,
  MultiTenantNeo4jService,
  Neo4jEntity,
  Neo4jProp,
  NeogmaService,
  NotNull,
  PropIndex,
  Neo4jRepository,
  RequireTenantFeatures,
  Safe,
  TenantContextService,
  Unique,
  UpdatedAt,
  ValidateInput,
} from '../index';

// Use RequireTenantFeatures as RequireTenant for readability
const RequireTenant = RequireTenantFeatures;

// ============================================================================
// 1. TENANT-AWARE ENTITIES
// ============================================================================

@Neo4jEntity('Order')
export class Order {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'order_number_index' })
  orderNumber: string;

  @Neo4jProp()
  @NotNull()
  customerId: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'order_status_index' })
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

  @Neo4jProp()
  @NotNull()
  totalAmount: number;

  @Neo4jProp()
  currency: string;

  @Neo4jProp()
  @PropIndex({ name: 'order_date_index' })
  orderDate: Date;

  @Neo4jProp()
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @Neo4jProp()
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  [key: string]: any;
}

@Neo4jEntity('Customer')
export class Customer {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'customer_name_index' })
  name: string;

  @Neo4jProp()
  @NotNull()
  @Unique({ name: 'customer_email_unique' })
  email: string;

  @Neo4jProp()
  phone?: string;

  @Neo4jProp()
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';

  @Neo4jProp()
  @PropIndex({ name: 'customer_active_index' })
  isActive: boolean;

  @Neo4jProp()
  totalSpent: number;

  @Neo4jProp()
  lastOrderDate?: Date;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  [key: string]: any;
}

@Neo4jEntity('Product')
export class Product {
  @Id()
  @NotNull()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'product_name_index' })
  name: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'product_sku_index' })
  sku: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex({ name: 'product_category_index' })
  category: string;

  @Neo4jProp()
  @NotNull()
  price: number;

  @Neo4jProp()
  @NotNull()
  stockQuantity: number;

  @Neo4jProp()
  @PropIndex({ name: 'product_active_index' })
  isActive: boolean;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  [key: string]: any;
}

// ============================================================================
// 2. TENANT-AWARE DATA TRANSFER OBJECTS
// ============================================================================

export interface CreateOrderDto {
  orderNumber: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  currency?: string;
}

export interface UpdateOrderStatusDto {
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export interface CreateCustomerDto {
  name: string;
  email: string;
  phone?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  topCustomers: Array<{
    customer: Customer;
    orderCount: number;
    totalSpent: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orderCount: number;
  }>;
}

export interface TenantHealthMetrics {
  tenantId: string;
  databaseName: string;
  totalCustomers: number;
  activeCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  lastActivity: Date;
  databaseSize: number;
}

// ============================================================================
// 3. TENANT-AWARE REPOSITORIES
// ============================================================================

/**
 * OrderRepository - demonstrates @Repository decorator with auto-generated CRUD methods
 * Auto-generated methods: findById, findAll, create, update, delete, count, exists
 */
@Repository(() => Order)
@Injectable()
export class OrderRepository extends BaseRepositoryService<Order> {
  constructor(neogmaService: NeogmaService) {
    super(neogmaService);
    // The @Repository decorator auto-injects NeogmaService and creates CRUD methods
  }

  /**
   * Find orders by customer with tenant isolation
   * Note: In production, implement tenant scoping via middleware or guards
   */
  @Safe()
  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.findAll({
      where: { customerId },
      orderBy: [{ property: 'orderDate', direction: 'DESC' }],
    });
  }

  /**
   * Find orders by status
   */
  // Tenant scoping: Implement via middleware or query filters
  async findByStatus(status: Order['status']): Promise<Order[]> {
    return this.findAll({
      where: { status },
      orderBy: [{ property: 'orderDate', direction: 'DESC' }],
    });
  }

  /**
   * Find recent orders
   */
  // Tenant scoping: Implement via middleware or query filters
  async findRecent(limit = 20): Promise<Order[]> {
    return this.findAll({
      orderBy: [{ property: 'orderDate', direction: 'DESC' }],
      limit,
    });
  }
}

/**
 * CustomerRepository - demonstrates @Repository decorator with auto-generated CRUD methods
 * Auto-generated methods: findById, findAll, create, update, delete, count, exists
 */
@Repository(() => Customer)
@Injectable()
export class CustomerRepository extends BaseRepositoryService<Customer> {
  constructor(neogmaService: NeogmaService) {
    super(neogmaService);
  }

  /**
   * Find customer by email (tenant-scoped)
   */
  // Tenant scoping: Implement via middleware or query filters
  async findByEmail(email: string): Promise<Customer | null> {
    const customers = await this.findAll({ where: { email } });
    return customers[0] || null;
  }

  /**
   * Find customers by tier
   */
  // Tenant scoping: Implement via middleware or query filters
  async findByTier(tier: Customer['tier']): Promise<Customer[]> {
    return this.findAll({
      where: { tier, isActive: true },
      orderBy: [{ property: 'totalSpent', direction: 'DESC' }],
    });
  }

  /**
   * Find top customers by spending
   */
  // Tenant scoping: Implement via middleware or query filters
  async findTopCustomers(limit = 10): Promise<Customer[]> {
    return this.findAll({
      where: { isActive: true },
      orderBy: [{ property: 'totalSpent', direction: 'DESC' }],
      limit,
    });
  }
}

/**
 * ProductRepository - demonstrates @Repository decorator with auto-generated CRUD methods
 * Auto-generated methods: findById, findAll, create, update, delete, count, exists
 */
@Repository(() => Product)
@Injectable()
export class ProductRepository extends BaseRepositoryService<Product> {
  constructor(neogmaService: NeogmaService) {
    super(neogmaService);
  }

  /**
   * Find products by category
   */
  // Tenant scoping: Implement via middleware or query filters
  async findByCategory(category: string): Promise<Product[]> {
    return this.findAll({
      where: { category, isActive: true },
      orderBy: [{ property: 'name', direction: 'ASC' }],
    });
  }

  /**
   * Find low stock products using QueryBuilder
   */
  // Tenant scoping: Implement via middleware or query filters
  async findLowStock(threshold = 10): Promise<Product[]> {
    const queryBuilder = this.neogmaService.createQueryBuilder();
    const bindParam = queryBuilder.getBindParam();

    const thresholdParam = bindParam.add(threshold);
    const isActiveParam = bindParam.add(true);

    queryBuilder
      .match('(p:Product)')
      .where(
        `p.stockQuantity <= $${thresholdParam} AND p.isActive = $${isActiveParam}`
      )
      .return('p')
      .orderBy('p.stockQuantity');

    const cypher = queryBuilder.getStatement();
    const params = bindParam.get();
    const result = await this.neogmaService.run(cypher, params);
    return result.records.map(
      (record: Neo4jRecord) => record.get('p').properties as Product
    );
  }
}

// ============================================================================
// 4. MULTI-TENANT SERVICE LAYER
// ============================================================================

@Injectable()
export class ECommerceService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly productRepo: ProductRepository,
    private readonly multiTenantService: MultiTenantNeo4jService,
    @InjectNeogma() private readonly neogmaService: NeogmaService
  ) {
    // No model registration needed - @Repository decorator handles it
  }

  /**
   * Create order with automatic tenant isolation
   */
  @RequireTenant()
  @Safe({ strict: true })
  @ValidateInput({
    schema: {
      parameterSchema: {
        orderNumber: { type: 'string', minLength: 3 },
        customerId: { type: 'string', minLength: 1 },
        items: { type: 'array', minItems: 1 },
      },
    },
  })
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async createOrder(orderData: CreateOrderDto): Promise<Order> {
    // Verify customer exists in this tenant
    const customer = await this.customerRepo.findById(orderData.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate order total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of orderData.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
      });

      // Update stock
      await this.productRepo.update(product.id, {
        stockQuantity: product.stockQuantity - item.quantity,
      });
    }

    // Create order
    const order = await this.orderRepo.create({
      orderNumber: orderData.orderNumber,
      customerId: orderData.customerId,
      status: 'pending',
      totalAmount,
      currency: orderData.currency || 'USD',
      orderDate: new Date(),
      shippingAddress: orderData.shippingAddress,
      items: orderItems,
    });

    // Update customer stats
    await this.customerRepo.update(customer.id, {
      totalSpent: customer.totalSpent + totalAmount,
      lastOrderDate: new Date(),
    });

    return order;
  }

  /**
   * Update order status with tenant isolation
   */
  @RequireTenant()
  @Safe({ strict: true })
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async updateOrderStatus(
    orderId: string,
    statusData: UpdateOrderStatusDto
  ): Promise<Order | null> {
    return this.orderRepo.update(orderId, {
      status: statusData.status,
    });
  }

  /**
   * Get comprehensive order analytics for tenant
   */
  @RequireTenant()
  @Safe({ strict: true })
  @Authorize({ roles: ['admin', 'manager'] })
  async getOrderAnalytics(): Promise<OrderAnalytics> {
    // Get basic order statistics
    const basicStatsBuilder = this.neogmaService.createQueryBuilder();
    const basicBindParam = basicStatsBuilder.getBindParam();

    basicStatsBuilder.match('(o:Order)').return(`
        count(o) as totalOrders,
        sum(o.totalAmount) as totalRevenue,
        avg(o.totalAmount) as averageOrderValue
      `);

    const basicStatsCypher = basicStatsBuilder.getStatement();
    const basicStatsParams = basicBindParam.get();
    const session = await this.multiTenantService.getSession();
    const basicStatsResult = await session.run(
      basicStatsCypher,
      basicStatsParams
    );

    const basicStats = basicStatsResult.records[0];

    // Get orders by status
    const statusBuilder = this.neogmaService.createQueryBuilder();
    const statusBindParam = statusBuilder.getBindParam();

    statusBuilder
      .match('(o:Order)')
      .return('o.status as status, count(o) as count');

    const statusCypher = statusBuilder.getStatement();
    const statusParams = statusBindParam.get();
    const statusResult = await session.run(statusCypher, statusParams);

    const ordersByStatus: Record<string, number> = {};
    statusResult.records.forEach((record) => {
      ordersByStatus[record.get('status')] = record.get('count').toNumber();
    });

    // Get top customers
    const topCustomersBuilder = this.neogmaService.createQueryBuilder();
    const topCustomersBindParam = topCustomersBuilder.getBindParam();

    topCustomersBuilder
      .match('(c:Customer)<-[:PLACED_BY]-(o:Order)')
      .return(
        `
        c,
        count(o) as orderCount,
        sum(o.totalAmount) as totalSpent
      `
      )
      .orderBy('totalSpent')
      .limit(10);

    const topCustomersCypher = topCustomersBuilder.getStatement();
    const topCustomersParams = topCustomersBindParam.get();
    const topCustomersResult = await session.run(
      topCustomersCypher,
      topCustomersParams
    );

    const topCustomers = topCustomersResult.records.map((record) => ({
      customer: record.get('c').properties as Customer,
      orderCount: record.get('orderCount').toNumber(),
      totalSpent: record.get('totalSpent').toNumber(),
    }));

    await session.close();

    // Get revenue by month (last 12 months)
    const revenueBuilder = this.neogmaService.createQueryBuilder();
    const revenueBindParam = revenueBuilder.getBindParam();

    const startDateParam = revenueBindParam.add(
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    );

    revenueBuilder
      .match('(o:Order)')
      .where(`o.orderDate >= $${startDateParam}`)
      .return(
        `
        date.truncate('month', o.orderDate) as month,
        sum(o.totalAmount) as revenue,
        count(o) as orderCount
      `
      )
      .orderBy({
        identifier: 'month',
        direction: 'ASC',
      });

    const revenueCypher = revenueBuilder.getStatement();
    const revenueParams = revenueBindParam.get();
    const revenueResult = await session.run(revenueCypher, revenueParams);
    await session.close();

    const revenueByMonth = revenueResult.records.map((record: Neo4jRecord) => ({
      month: record.get('month').toString(),
      revenue: record.get('revenue').toNumber(),
      orderCount: record.get('orderCount').toNumber(),
    }));

    return {
      totalOrders: basicStats.get('totalOrders').toNumber(),
      totalRevenue: basicStats.get('totalRevenue').toNumber(),
      averageOrderValue: basicStats.get('averageOrderValue').toNumber(),
      ordersByStatus,
      topCustomers,
      revenueByMonth,
    };
  }

  /**
   * Create customer with tenant isolation
   */
  @RequireTenant()
  @Safe({ strict: true })
  @ValidateInput({
    schema: {
      parameterSchema: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async createCustomer(customerData: CreateCustomerDto): Promise<Customer> {
    // Check if customer already exists
    const existing = await this.customerRepo.findByEmail(customerData.email);
    if (existing) {
      throw new Error(
        `Customer with email ${customerData.email} already exists`
      );
    }

    return this.customerRepo.create({
      ...customerData,
      tier: customerData.tier || 'bronze',
      isActive: true,
      totalSpent: 0,
    });
  }

  /**
   * Get customer order history
   */
  @RequireTenant()
  @Safe({ strict: true })
  async getCustomerOrderHistory(customerId: string): Promise<Order[]> {
    return this.orderRepo.findByCustomer(customerId);
  }
}

// ============================================================================
// 5. ADMIN SERVICE FOR CROSS-TENANT OPERATIONS
// ============================================================================

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly multiTenantService: MultiTenantNeo4jService,
    private readonly tenantContext: TenantContextService
  ) {}

  /**
   * Get health metrics for all tenants (admin only)
   */
  @Authorize({ roles: ['admin'] })
  @AuditLog({ logLevel: 'detailed', enabled: true })
  async getAllTenantMetrics(): Promise<TenantHealthMetrics[]> {
    const tenants = await this.tenantContext.getAllTenants();
    const metrics: TenantHealthMetrics[] = [];

    for (const tenant of tenants) {
      try {
        const tenantMetrics = await this.getTenantMetrics(tenant.tenantId);
        metrics.push(tenantMetrics);
      } catch (error) {
        console.error(
          `Failed to get metrics for tenant ${tenant.tenantId}:`,
          error
        );
      }
    }

    return metrics;
  }

  /**
   * Get metrics for specific tenant
   */
  @Authorize({ roles: ['admin'] })
  private async getTenantMetrics(
    tenantId: string
  ): Promise<TenantHealthMetrics> {
    const metricsQuery = `
      MATCH (c:Customer)
      OPTIONAL MATCH (o:Order)
      RETURN
        count(DISTINCT c) as totalCustomers,
        sum(CASE WHEN c.isActive THEN 1 ELSE 0 END) as activeCustomers,
        count(DISTINCT o) as totalOrders,
        sum(o.totalAmount) as totalRevenue,
        max(o.orderDate) as lastActivity
    `;

    const result = await this.multiTenantService.query(tenantId, metricsQuery);
    const record = result.records[0];

    return {
      tenantId,
      databaseName: `tenant_${tenantId}`,
      totalCustomers: record.get('totalCustomers').toNumber(),
      activeCustomers: record.get('activeCustomers').toNumber(),
      totalOrders: record.get('totalOrders').toNumber(),
      totalRevenue: record.get('totalRevenue').toNumber() || 0,
      lastActivity: record.get('lastActivity') || new Date(0),
      databaseSize: 0, // Would need system query
    };
  }
}

// ============================================================================
// 6. CONTROLLER WITH TENANT ROUTING
// ============================================================================

@Controller('ecommerce')
export class ECommerceController {
  constructor(
    private readonly ecommerceService: ECommerceService,
    private readonly adminService: AdminAnalyticsService
  ) {}

  @Post('orders')
  @RequireTenant()
  async createOrder(@Body() orderData: CreateOrderDto) {
    return this.ecommerceService.createOrder(orderData);
  }

  @Post('orders/:id/status')
  @RequireTenant()
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() statusData: UpdateOrderStatusDto
  ) {
    return this.ecommerceService.updateOrderStatus(orderId, statusData);
  }

  @Get('analytics')
  @RequireTenant()
  async getAnalytics() {
    return this.ecommerceService.getOrderAnalytics();
  }

  @Post('customers')
  @RequireTenant()
  async createCustomer(@Body() customerData: CreateCustomerDto) {
    return this.ecommerceService.createCustomer(customerData);
  }

  @Get('customers/:id/orders')
  @RequireTenant()
  async getCustomerOrders(@Param('id') customerId: string) {
    return this.ecommerceService.getCustomerOrderHistory(customerId);
  }

  @Get('admin/tenant-metrics')
  async getAllTenantMetrics() {
    return this.adminService.getAllTenantMetrics();
  }
}

// ============================================================================
// 7. USAGE EXAMPLE
// ============================================================================

export class MultiTenantExample {
  constructor(
    private readonly ecommerceService: ECommerceService,
    private readonly productRepo: ProductRepository
  ) {}

  async demonstrateUsage(): Promise<void> {
    // Note: In real usage, tenant context would be set by middleware
    // based on request headers, domain, or authentication

    // Create customer for tenant
    const customer = await this.ecommerceService.createCustomer({
      name: 'John Smith',
      email: 'john@tenant1.com',
      phone: '+1-555-0123',
      tier: 'silver',
    });

    // Create products for tenant
    const product1 = await this.productRepo.create({
      name: 'Premium Widget',
      sku: 'WIDGET-001',
      category: 'Electronics',
      price: 99.99,
      stockQuantity: 50,
      isActive: true,
    });

    const product2 = await this.productRepo.create({
      name: 'Deluxe Gadget',
      sku: 'GADGET-001',
      category: 'Electronics',
      price: 199.99,
      stockQuantity: 25,
      isActive: true,
    });

    // Create order (automatically tenant-scoped)
    const order = await this.ecommerceService.createOrder({
      orderNumber: 'ORD-2024-001',
      customerId: customer.id,
      items: [
        { productId: product1.id, quantity: 2 },
        { productId: product2.id, quantity: 1 },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
      },
    });

    // Update order status
    await this.ecommerceService.updateOrderStatus(order.id, {
      status: 'processing',
    });

    // Get analytics for this tenant only
    const analytics = await this.ecommerceService.getOrderAnalytics();
    console.log('Tenant analytics:', analytics);

    // Get customer order history (tenant-isolated)
    const orderHistory = await this.ecommerceService.getCustomerOrderHistory(
      customer.id
    );
    console.log('Customer order history:', orderHistory);
  }
}
