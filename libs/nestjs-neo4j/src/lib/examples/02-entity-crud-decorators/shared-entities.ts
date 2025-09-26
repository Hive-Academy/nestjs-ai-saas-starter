/**
 * Shared Entity Classes for CRUD Decorator Examples
 * 
 * These are properly decorated entity classes that showcase the full decorator ecosystem.
 * They replace basic interfaces with production-ready decorated entities.
 * 
 * ✅ TRANSFORMATION COMPLETE:
 * - Replaced plain TypeScript interfaces with @Neo4jEntity decorated classes
 * - Fixed Date type mismatches (no more string timestamps!)
 * - Added rich constraint and validation decorators
 * - Enabled IntelliSense and type safety
 * - Ready for @Repository pattern integration
 */

// ============================================================================
// BASIC ENTITIES - Core Decorators (5-8 decorators each)
// ============================================================================
export { User } from '../shared/entities/basic/user.entity';
export { Product } from '../shared/entities/basic/product.entity';
export { Order } from '../shared/entities/basic/order.entity';
export type { OrderItem, ShippingAddress } from '../shared/entities/basic/order.entity';

// ============================================================================
// INTERMEDIATE ENTITIES - Relationships + Constraints (8-12 decorators each)
// ============================================================================
export { Company } from '../shared/entities/intermediate/company.entity';
export { Post } from '../shared/entities/intermediate/post.entity';
export { Comment } from '../shared/entities/intermediate/comment.entity';

// ============================================================================
// DATA TRANSFER OBJECTS - Input Validation
// ============================================================================
export type { CreateUserDto, UpdateUserDto } from '../shared/entities';
export type { CreateProductDto, UpdateProductDto } from '../shared/entities';
export type { CreateOrderDto, UpdateOrderDto } from '../shared/entities';

/**
 * 🎯 TRANSFORMATION BENEFITS:
 * 
 * Before (Plain Interfaces):
 * ❌ createdAt!: Date; // Type mismatch with BaseEntity interface
 * ❌ No validation, constraints, or relationships
 * ❌ No IntelliSense support for Neo4j operations
 * ❌ Manual property mapping required
 * 
 * After (Decorated Entities):
 * ✅ @CreatedAt() createdAt: Date; // Proper Date type with transforms
 * ✅ @Unique(), @PropIndex(), @ClassIndex(), @Validate() decorators
 * ✅ @Neo4jRelationship() for complex relationships
 * ✅ Full IntelliSense and type safety
 * ✅ Auto-generated CRUD operations via @Repository
 * ✅ Production-ready constraint management
 * 
 * Example Usage:
 * ```typescript
 * @Injectable()
 * @Repository(() => User)  // Uses decorated User entity
 * export class UserService {
 *   // All CRUD methods auto-generated with proper typing
 *   async createUser(userData: CreateUserDto): Promise<User> {
 *     return this.create(userData); // Type-safe, validates, transforms
 *   }
 * }
 * ```
 */