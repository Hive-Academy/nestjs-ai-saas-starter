/**
 * Example: @Repository Decorator - Entity Creation with Auto-Generated Methods
 * Category: 02-entity-crud-decorators
 * Features: @Repository decorator, automatic ID generation, timestamps, data validation
 */
import { Injectable } from '@nestjs/common';
import { Repository, BaseRepositoryService } from '../../../index';
import { User, Product, Order } from './shared-entities';

// Import DTOs and types from entities (use proper types)
import type { OrderItem, ShippingAddress } from './shared-entities';
import type { CreateUserDto, CreateProductDto } from './shared-entities';

// Extended CreateOrderDto for examples that need full OrderItem data
interface CreateOrderDtoExtended {
  customerId: string; // Changed from userId to match entity
  items: OrderItem[]; // Use proper OrderItem interface
  totalAmount?: number; // Add this property since it's used in the method
  currency?: string;
  shippingAddress?: ShippingAddress;
  notes?: string;
}

/**
 * User service demonstrating @Repository decorator usage
 */
@Injectable()
@Repository(() => User)
export class UserService extends BaseRepositoryService<User> {
  /**
   * Basic user creation using auto-generated create method
   * Auto-generates: CREATE (n:User $data) RETURN n
   * Automatically adds: id, createdAt, updatedAt
   */
  async createUser(data: CreateUserDto): Promise<User> {
    const userWithDefaults = {
      ...data,
      role: data.role || 'user',
      isActive: true
    };
    return this.create(userWithDefaults);
  }

  /**
   * Create user with enhanced retry for production reliability
   * Uses the auto-generated create method with error handling
   */
  async createUserResilient(data: CreateUserDto): Promise<User> {
    const maxRetries = 5;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.createUser(data);
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
   * Create user with safety validation
   * Validates input and ensures data integrity
   */
  async createUserSafe(data: CreateUserDto): Promise<User> {
    // Basic validation
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (!data.firstName || !data.lastName) {
      throw new Error('First name and last name are required');
    }
    
    console.log('[VALIDATION] Creating user with safety validation:', data.email);
    return this.createUser(data);
  }

  /**
   * Create admin user with full validation and audit
   * Tagged for audit and monitoring
   */
  async createAdminUser(data: CreateUserDto): Promise<User> {
    console.log('[ADMIN] Creating admin user:', data.email);
    
    const adminData = {
      ...data,
      role: 'admin' as const,
      isActive: true
    };
    
    const user = await this.createUserSafe(adminData);
    console.log('[ADMIN] Admin user created:', user.id);
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
   * Product creation with inventory tracking
   * Uses the auto-generated create method with business logic
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    console.log('[INVENTORY] Creating product:', data.name);
    
    const productWithDefaults = {
      ...data,
      inStock: data.inStock ?? true
    };
    
    const product = await this.create(productWithDefaults);
    console.log('[INVENTORY] Product created:', product.id);
    return product;
  }

  /**
   * Create product for bulk import operations
   * Optimized for batch operations with simplified error handling
   */
  async createProductForImport(data: CreateProductDto): Promise<Product> {
    try {
      return await this.createProduct(data);
    } catch (error) {
      console.error('[BULK_IMPORT] Failed to create product:', data.name, error);
      throw error;
    }
  }

  /**
   * Example of creating product with calculated fields
   */
  async createProductWithSku(productData: Omit<CreateProductDto, 'sku'>): Promise<Product> {
    // Generate SKU based on category and name
    const sku = this.generateSku(productData.category, productData.name);

    return this.createProduct({
      ...productData,
      sku
    });
  }

  private generateSku(category: string, name: string): string {
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const nameCode = name.replace(/\s+/g, '').substring(0, 5).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${categoryPrefix}-${nameCode}-${timestamp}`;
  }
}

/**
 * Order service demonstrating complex entity creation
 */
@Injectable()
@Repository(() => Order)
export class OrderService extends BaseRepositoryService<Order> {
  /**
   * Order creation with financial transaction safety
   * Uses the auto-generated create method with comprehensive validation
   */
  async createOrder(data: CreateOrderDtoExtended): Promise<Order> {
    console.log('[ORDER] Creating order for customer:', data.customerId);
    
    // Calculate total amount from properly structured items
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    
    const orderData = {
      ...data,
      status: 'pending' as const,
      totalAmount,
      currency: data.currency || 'USD',
      orderNumber: this.generateOrderNumber(),
      orderDate: new Date()
    };
    
    const order = await this.create(orderData);
    console.log('[ORDER] Order created:', order.id, 'Total:', totalAmount);
    return order;
  }

  /**
   * Example of creating order with calculated total
   */
  async createOrderWithTotal(orderData: CreateOrderDtoExtended): Promise<Order> {
    // Items already have calculated totalPrice from OrderItem interface
    const totalAmount = orderData.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    return this.createOrder({
      ...orderData,
      totalAmount,
      currency: orderData.currency || 'USD'
    });
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}${month}-${timestamp}`;
  }
}

/**
 * Advanced service demonstrating batch creation patterns
 */
@Injectable()
export class BatchCreationService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService
  ) {}

  /**
   * Create multiple users in sequence
   * Each creation uses the @CreateEntity decorator
   */
  async createMultipleUsers(userDataList: CreateUserDto[]): Promise<User[]> {
    const createdUsers: User[] = [];

    for (const userData of userDataList) {
      try {
        const user = await this.userService.createUserSafe(userData);
        createdUsers.push(user);
      } catch (error) {
        console.error(`Failed to create user ${userData.email}:`, error);
        // Continue with next user
      }
    }

    return createdUsers;
  }

  /**
   * Create user with default values
   */
  async createDefaultUser(partialData: Partial<CreateUserDto>): Promise<User> {
    const defaultUserData: CreateUserDto = {
      email: partialData.email || '',
      firstName: partialData.firstName || 'Unknown',
      lastName: partialData.lastName || 'User',
      role: partialData.role || 'user',
      department: partialData.department || 'general'
    };

    return this.userService.createUser(defaultUserData);
  }

  /**
   * Create product with validation
   */
  async createValidatedProduct(productData: CreateProductDto): Promise<Product | null> {
    // Basic validation before creation
    if (!productData.name || productData.price <= 0) {
      console.error('Invalid product data:', productData);
      return null;
    }

    try {
      return await this.productService.createProduct(productData);
    } catch (error) {
      console.error('Failed to create product:', error);
      return null;
    }
  }
}

// ===== Usage Examples =====

/**
 * Example usage in a controller or service
 */
export class ExampleUsage {
  constructor(private readonly userService: UserService) {}

  async demonstrateUserCreation(): Promise<void> {
    // Basic user creation
    const newUser = await this.userService.createUser({
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      department: 'engineering'
    });
    console.log('Created user:', newUser.id, newUser.createdAt);

    // Admin user creation with safety
    const adminUser = await this.userService.createAdminUser({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      department: 'administration'
    });
    console.log('Created admin:', adminUser.id);

    // Error handling example
    try {
      const user = await this.userService.createUserSafe({
        email: 'invalid-email', // Will be caught by safety validation
        firstName: 'Test',
        lastName: 'User',
        department: 'test'
      });
      console.log('User created:', user.id);
    } catch (error) {
      console.error('User creation failed:', (error as Error).message);
    }
  }
}

/**
 * Integration example with validation
 */
@Injectable()
export class UserRegistrationService {
  constructor(private readonly userService: UserService) {}

  async registerUser(registrationData: {
    email: string;
    firstName: string;
    lastName: string;
    department: string;
  }): Promise<{ user: User; success: boolean; message: string }> {
    try {
      // Create user with safety validation
      const user = await this.userService.createUserSafe({
        ...registrationData,
        role: 'user' // Default role
      });

      return {
        user,
        success: true,
        message: 'User registered successfully'
      };

    } catch (error) {
      return {
        user: null as any,
        success: false,
        message: `Registration failed: ${(error as Error).message}`
      };
    }
  }
}

// ===== Generated Cypher Examples =====

/**
 * The @Repository decorator generates these Cypher queries:
 *
 * For createUser(data):
 * CREATE (n:User $data) RETURN n
 * Parameters: {
 *   data: {
 *     email: 'john.doe@example.com',
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     department: 'engineering',
 *     role: 'user',
 *     isActive: true,
 *     id: 'user_1639123456789_abc123def',
 *     createdAt: '2023-12-10T15:30:00.000Z',
 *     updatedAt: '2023-12-10T15:30:00.000Z'
 *   }
 * }
 *
 * For createProduct(data):
 * CREATE (n:Product $data) RETURN n
 * Parameters: {
 *   data: {
 *     name: 'Laptop Pro',
 *     description: 'High-performance laptop',
 *     price: 1299.99,
 *     category: 'electronics',
 *     sku: 'LAP-001',
 *     inStock: true,
 *     id: 'product_1639123456789_def456ghi',
 *     createdAt: '2023-12-10T15:30:00.000Z',
 *     updatedAt: '2023-12-10T15:30:00.000Z'
 *   }
 * }
 */
