/**
 * @fileoverview Comprehensive examples of the Neo4j Constraint System
 * 
 * This file demonstrates all the constraint decorators and their usage patterns,
 * including the hybrid approach (class-level and property-level decorators).
 */

import { Injectable } from '@nestjs/common';
import {
  // Constraint decorators
  NodeKey,
  Unique,
  NotNull,
  Index,
  Validate,
  
  // Entity decorators
  Neo4jEntity,
  Neo4jProperty,
  Neo4jRelationship,
  
  // Repository framework
  BaseRepository,
  Neo4jRepository,
  
  // Constraint service
  ConstraintService,
  
  // Model services
  Neo4jNodeModelService,
} from '@hive-academy/nestjs-neo4j';

// =============================================================================
// EXAMPLE 1: Basic Entity with Hybrid Constraints
// =============================================================================

/**
 * User entity demonstrating hybrid constraint approach
 * - Class-level constraints for compound properties
 * - Property-level constraints for individual properties
 */
@Neo4jEntity({ label: 'User' })
@NodeKey(['email', 'tenantId'])  // Compound node key (class-level)
@Unique(['username', 'domain'])  // Compound unique constraint (class-level)
@Index(['status', 'createdAt'])  // Compound index for queries (class-level)
export class User {
  // Single property constraints (property-level)
  @NotNull({ errorMessage: 'ID is required' })
  @Index({ name: 'user_id_index' })
  id: string;

  @NotNull({ errorMessage: 'Email is required' })
  @Unique({ errorMessage: 'Email must be unique' })  // Single property unique (property-level)
  @Index({ name: 'user_email_index' })   // Single property index (property-level)
  @Validate({
    format: 'email',
    errorMessage: 'Invalid email format'
  })
  email: string;

  @NotNull()
  tenantId: string;

  @NotNull()
  @Validate({
    length: { min: 3, max: 50 },
    format: { pattern: /^[a-zA-Z0-9_-]+$/ }
  })
  username: string;

  @NotNull()
  domain: string;

  @NotNull()
  @Validate({
    length: { min: 2, max: 100 }
  })
  name: string;

  @Index()
  @Validate({
    custom: {
      validator: (value: string) => ['active', 'inactive', 'suspended'].includes(value),
      message: 'Status must be active, inactive, or suspended'
    }
  })
  status: 'active' | 'inactive' | 'suspended';

  @Index()
  createdAt: Date;

  @Validate({
    custom: {
      validator: (value: number) => value >= 0 && value <= 150,
      message: 'Age must be between 0 and 150'
    }
  })
  age?: number;

  // Relationships
  @Neo4jRelationship({ type: 'BELONGS_TO', direction: 'OUT', target: () => Organization })
  organization: Organization;

  @Neo4jRelationship({ type: 'MANAGES', direction: 'OUT', target: () => User })
  directReports: User[];
}

// =============================================================================
// EXAMPLE 2: Organization with Complex Constraints
// =============================================================================

@Neo4jEntity({ label: 'Organization' })
@NodeKey(['code'], { 
  name: 'org_code_key',
  errorMessage: 'Organization code must be unique',
  provider: 'btree-1.0'
})
@Unique(['name', 'country'], {
  name: 'org_name_country_unique',
  nullsDistinct: true
})
@Index(['industry', 'size', 'country'])  // Compound index for analytics
export class Organization {
  @NotNull()
  @Validate({
    format: { pattern: /^[A-Z]{2,10}$/ },
    errorMessage: 'Organization code must be 2-10 uppercase letters'
  })
  code: string;

  @NotNull()
  @Unique()
  @Index()
  @Validate({
    length: { min: 2, max: 200 }
  })
  name: string;

  @NotNull()
  @Index()
  @Validate({
    format: { pattern: /^[A-Z]{2}$/ },
    errorMessage: 'Country must be a 2-letter ISO code'
  })
  country: string;

  @Index()
  @Validate({
    custom: {
      validator: (value: string) => ['tech', 'finance', 'healthcare', 'education', 'other'].includes(value),
      message: 'Invalid industry type'
    }
  })
  industry: string;

  @Index()
  @Validate({
    custom: {
      validator: (value: string) => ['startup', 'small', 'medium', 'large', 'enterprise'].includes(value),
      message: 'Invalid organization size'
    }
  })
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  @Validate({
    format: 'url',
    errorMessage: 'Website must be a valid URL'
  })
  website?: string;

  @Index()
  createdAt: Date;
}

// =============================================================================
// EXAMPLE 3: Product with Multi-Tenancy Constraints
// =============================================================================

@Neo4jEntity({ label: 'Product' })
@NodeKey(['sku', 'tenantId'])  // Ensure SKU uniqueness per tenant
@Unique(['name', 'category', 'tenantId'])  // Unique name per category per tenant
@Index(['category', 'price', 'status'])  // Query optimization
@Index(['tenantId', 'status'])  // Tenant isolation queries
export class Product {
  @NotNull()
  @Index()
  id: string;

  @NotNull()
  @Index()
  tenantId: string;

  @NotNull()
  @Validate({
    format: { pattern: /^[A-Z0-9-]{6,20}$/ },
    errorMessage: 'SKU must be 6-20 characters, uppercase letters, numbers, and hyphens only'
  })
  sku: string;

  @NotNull()
  @Validate({
    length: { min: 2, max: 200 }
  })
  name: string;

  @NotNull()
  @Index()
  category: string;

  @NotNull()
  @Index()
  @Validate({
    range: { min: 0, exclusive: true },
    errorMessage: 'Price must be greater than 0'
  })
  price: number;

  @NotNull()
  @Index()
  @Validate({
    custom: {
      validator: (value: string) => ['available', 'unavailable', 'discontinued'].includes(value),
      message: 'Invalid product status'
    }
  })
  status: 'available' | 'unavailable' | 'discontinued';

  @Validate({
    length: { max: 1000 }
  })
  description?: string;

  @Validate({
    range: { min: 0 },
    errorMessage: 'Stock quantity cannot be negative'
  })
  stockQuantity?: number;

  @Index()
  createdAt: Date;

  updatedAt: Date;
}

// =============================================================================
// EXAMPLE 4: Repository with Constraint Integration
// =============================================================================

@Neo4jRepository({ entityType: () => User })
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    private readonly constraintService: ConstraintService
  ) {
    super();
  }

  /**
   * Create user with automatic constraint validation
   */
  async createUser(userData: Partial<User>): Promise<User> {
    // Validate constraints before creation
    const validationResult = await this.constraintService.validateEntity(userData, User);
    
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Use base repository create method
    return this.create(userData as Omit<User, 'id' | 'createdAt' | 'updatedAt'>);
  }

  /**
   * Find users by tenant with optimized query (uses index)
   */
  async findByTenant(tenantId: string): Promise<User[]> {
    return this.findMany({
      where: { tenantId },
      orderBy: [{ property: 'createdAt', direction: 'DESC' }]
    });
  }

  /**
   * Find user by email and tenant (uses node key)
   */
  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    return this.findOne({ email, tenantId });
  }

  /**
   * Update user with validation
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // Validate updates
    const validationResult = await this.constraintService.validateEntity(updates, User);
    
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    return this.update(id, updates);
  }
}

// =============================================================================
// EXAMPLE 5: Model Service with Constraint Integration
// =============================================================================

@Injectable()
export class UserModelService extends Neo4jNodeModelService<User> {
  protected metadata = {
    label: 'User',
    indexedProperties: ['email', 'tenantId', 'status', 'createdAt'],
    uniqueConstraints: ['email'],
    validation: {
      required: ['email', 'tenantId', 'username', 'name'],
      format: {
        email: 'email',
        username: /^[a-zA-Z0-9_-]+$/
      },
      range: {
        age: { min: 0, max: 150 }
      }
    }
  };

  constructor(
    neo4j: any,
    private readonly constraintService: ConstraintService
  ) {
    super(neo4j);
    
    // Register entity constraints
    this.constraintService.registerEntity(User);
  }

  /**
   * Create user with comprehensive validation
   */
  async createValidatedUser(userData: Partial<User>): Promise<User> {
    // 1. Constraint validation
    const constraintValidation = await this.constraintService.validateEntity(userData, User);
    if (!constraintValidation.valid) {
      throw new Error(`Constraint validation failed: ${constraintValidation.errors.map(e => e.message).join(', ')}`);
    }

    // 2. Business logic validation
    if (userData.email) {
      const existing = await this.findByEmailAndTenant(userData.email, userData.tenantId!);
      if (existing) {
        throw new Error('User with this email already exists in tenant');
      }
    }

    // 3. Create user
    return this.create(userData as Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'version'>);
  }

  /**
   * Find user by email and tenant (leverages node key constraint)
   */
  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    return this.findOne({ email, tenantId });
  }

  /**
   * Get user statistics by tenant (leverages indexes)
   */
  async getUserStatsByTenant(tenantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    averageAge: number;
  }> {
    // This query will be optimized by the tenantId + status index
    const users = await this.findMany({
      where: { tenantId },
      include: ['status', 'age']
    });

    const byStatus = users.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageAge = users
      .filter(user => user.age != null)
      .reduce((sum, user) => sum + user.age!, 0) / users.length;

    return {
      total: users.length,
      byStatus,
      averageAge
    };
  }
}

// =============================================================================
// EXAMPLE 6: Constraint Service Usage
// =============================================================================

@Injectable()
export class ApplicationConstraintManager {
  constructor(private readonly constraintService: ConstraintService) {}

  /**
   * Initialize all application constraints
   */
  async initializeConstraints(): Promise<void> {
    // Register all entities
    this.constraintService.registerEntity(User);
    this.constraintService.registerEntity(Organization);
    this.constraintService.registerEntity(Product);

    // Create all constraints
    const result = await this.constraintService.createAllConstraints();
    
    console.log(`Created ${result.created} constraints, ${result.failed} failed`);
    
    if (result.failed > 0) {
      console.error('Failed constraints:', result.results.filter(r => !r.success));
    }

    // Display statistics
    const stats = this.constraintService.getStatistics();
    console.log('Constraint statistics:', stats);
  }

  /**
   * Validate entity before saving
   */
  async validateBeforeSave<T>(entity: T, entityClass: any): Promise<void> {
    const result = await this.constraintService.validateEntity(entity, entityClass);
    
    if (!result.valid) {
      const errorMessages = result.errors.map(error => 
        `${error.property}: ${error.message}`
      ).join(', ');
      
      throw new Error(`Validation failed: ${errorMessages}`);
    }
  }

  /**
   * Get constraint report for debugging
   */
  getConstraintReport(): any {
    const entities = this.constraintService.getRegisteredEntities();
    const stats = this.constraintService.getStatistics();

    return {
      statistics: stats,
      entities: entities.map(entity => ({
        label: entity.label,
        constraintCount: entity.constraints.length,
        constraintTypes: entity.constraintsByType,
      })),
    };
  }
}

// =============================================================================
// EXAMPLE 7: Usage in Application Module
// =============================================================================

export class ExampleUsageInModule {
  static examples = {
    // Example 1: Basic entity creation with validation
    async createUserExample(): Promise<User> {
      const userRepo = new UserRepository(new ConstraintService(null as any, null as any));
      
      return userRepo.createUser({
        email: 'john.doe@example.com',
        tenantId: 'tenant_123',
        username: 'johndoe',
        domain: 'example.com',
        name: 'John Doe',
        status: 'active',
        age: 30,
      });
    },

    // Example 2: Bulk operations with constraint validation
    async bulkCreateExample(): Promise<User[]> {
      const userService = new UserModelService(null as any, new ConstraintService(null as any, null as any));
      
      const usersData = [
        { email: 'user1@example.com', tenantId: 'tenant_123', username: 'user1', name: 'User One', status: 'active' as const },
        { email: 'user2@example.com', tenantId: 'tenant_123', username: 'user2', name: 'User Two', status: 'active' as const },
      ];

      const results: User[] = [];
      for (const userData of usersData) {
        try {
          const user = await userService.createValidatedUser(userData);
          results.push(user);
        } catch (error) {
          console.error(`Failed to create user ${userData.email}:`, error);
        }
      }

      return results;
    },

    // Example 3: Constraint management
    async constraintManagementExample(): Promise<void> {
      const constraintManager = new ApplicationConstraintManager(new ConstraintService(null as any, null as any));
      
      // Initialize all constraints
      await constraintManager.initializeConstraints();
      
      // Get constraint report
      const report = constraintManager.getConstraintReport();
      console.log('Constraint Report:', JSON.stringify(report, null, 2));
    },
  };
}

/**
 * Key benefits of this constraint system:
 * 
 * 1. **Hybrid Approach**: Class-level for compound constraints, property-level for individual
 * 2. **Type Safety**: Full TypeScript support with compile-time validation
 * 3. **Runtime Validation**: Automatic validation before database operations
 * 4. **Performance**: Automatic index creation for optimized queries
 * 5. **Multi-Tenancy**: Built-in support for tenant isolation
 * 6. **Flexibility**: Supports all Neo4j constraint types with custom options
 * 7. **Integration**: Seamless integration with repository and model service patterns
 * 8. **Error Handling**: Comprehensive error messages and validation feedback
 * 9. **Statistics**: Built-in monitoring and reporting of constraint usage
 * 10. **Production Ready**: Automatic constraint creation and conflict resolution
 */