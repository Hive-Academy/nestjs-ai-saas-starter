/**
 * @fileoverview Basic Entity Definition Example
 *
 * Demonstrates:
 * - Simple entity with @ChromaEntity decorator
 * - Basic properties with @ChromaProp
 * - Essential decorators: @ChromaId, @CreatedAt, @UpdatedAt
 * - TypeORM-style repository injection with @InjectRepository
 * - Auto-generated repository CRUD operations
 * - Production-ready entity configuration
 *
 * Key Concepts:
 * - ChromaDB entity creation and configuration
 * - Property mapping and transformation
 * - Automatic timestamp handling
 * - Type-safe entity definition
 * - Zero-boilerplate CRUD with repositories
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBRepository,
  ChromaEntity,
  ChromaProp,
  ChromaId,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
  InjectRepository,
} from '../../index';

// ============================================================================
// 1. BASIC ENTITY DEFINITION
// ============================================================================

/**
 * Metadata type for Product entity - strongly typed for type safety
 */
interface ProductMetadata {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

/**
 * Simple Product entity demonstrating basic ChromaDB entity patterns
 *
 * This entity shows:
 * - Collection naming and configuration
 * - Basic property mapping
 * - Automatic timestamp handling
 * - Auto-embedding configuration
 * - Strongly-typed metadata via generics
 */
@ChromaEntity({
  collection: 'products',
  description: 'Basic product catalog entity',
  autoEmbed: true, // Automatically generate embeddings
  embeddingFields: ['content'], // Fields to include in embedding
  autoTimestamp: true, // Auto-manage createdAt/updatedAt
  autoGenerateIds: true, // Auto-generate IDs if not provided
  idStrategy: 'uuid', // Use UUID for ID generation
})
export class BasicProductEntity extends BaseChromaEntity<ProductMetadata> {
  /**
   * Primary identifier - automatically managed
   * Uses UUID generation when not provided
   */
  @ChromaId()
  declare id: string;

  /**
   * Main content field used for embeddings and search
   * This is the primary text content that gets embedded
   */
  @ChromaProp({
    description: 'Product description for semantic search',
    optional: false,
  })
  declare content: string;

  /**
   * Structured metadata for filtering and business logic
   * Stored as ChromaDB metadata for efficient querying
   * Strongly-typed via ProductMetadata interface
   */
  declare metadata: ProductMetadata;

  /**
   * Embedding vector (auto-generated when autoEmbed: true)
   * Contains the numerical representation for semantic search
   */
  declare embedding?: readonly number[];

  /**
   * Automatic timestamp - creation time
   * Managed by autoTimestamp: true in entity config
   */
  @CreatedAt({
    description: 'Product creation timestamp',
  })
  declare createdAt?: string;

  /**
   * Automatic timestamp - last update time
   * Updated automatically on any entity changes
   */
  @UpdatedAt({
    description: 'Last product update timestamp',
  })
  declare updatedAt?: string;

  /**
   * Version tracking (optional)
   * Useful for optimistic locking and change tracking
   */
  declare version?: number;
}

// ============================================================================
// 2. DEMONSTRATION SERVICE
// ============================================================================

/**
 * Service demonstrating basic entity usage patterns with TypeORM-style repositories
 * Shows zero-boilerplate CRUD operations using auto-generated repository
 */
@Injectable()
export class BasicEntityDemoService implements OnModuleInit {
  constructor(
    @InjectRepository(BasicProductEntity)
    private readonly productRepo: ChromaDBRepository<BasicProductEntity>
  ) {}

  async onModuleInit() {
    console.log('\n🎯 Basic Entity Definition Demo (TypeORM-Style)\n');
    await this.demonstrateEntityCreation();
    await this.demonstrateEntityRetrieval();
    await this.demonstrateEntityUpdate();
  }

  /**
   * Demonstrates creating and storing basic entities using repository
   */
  private async demonstrateEntityCreation(): Promise<void> {
    console.log('📝 Creating Basic Entities with Repository:');

    try {
      // Create a basic product entity using repository.create()
      const product = await this.productRepo.create({
        content:
          'High-quality wireless Bluetooth headphones with noise cancellation technology. Perfect for music lovers and professionals who need crystal-clear audio quality.',
        metadata: {
          name: 'Wireless Bluetooth Headphones',
          price: 199.99,
          category: 'Electronics',
          inStock: true,
        },
      });

      console.log('  ✅ Entity created and stored in ChromaDB');
      console.log(`  🔑 ID: ${product.id}`);
      console.log(`  📊 Content length: ${product.content.length} characters`);
      console.log(`  🏷️  Category: ${product.metadata.category}`);
      console.log(`  💰 Price: $${product.metadata.price}`);
      console.log(`  📅 Created: ${product.createdAt}`);
      console.log(`  🕒 Updated: ${product.updatedAt}`);

      // Create multiple products using batch operation
      const batchProducts = await this.productRepo.createMany([
        {
          content:
            'Premium coffee beans sourced from Ethiopian highlands. Rich, full-bodied flavor with notes of chocolate and berries.',
          metadata: {
            name: 'Ethiopian Coffee Beans',
            price: 24.99,
            category: 'Food & Beverage',
            inStock: true,
          },
        },
        {
          content:
            'Professional-grade yoga mat with superior grip and cushioning. Made from eco-friendly materials for sustainable practice.',
          metadata: {
            name: 'Eco Yoga Mat',
            price: 39.99,
            category: 'Fitness',
            inStock: true,
          },
        },
      ]);

      console.log(
        `\n  ✅ Batch created ${batchProducts.successCount} products`
      );
      batchProducts.success.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p.metadata.name} - $${p.metadata.price}`);
      });
    } catch (error) {
      console.error(
        '  ❌ Error creating entity:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates retrieving and working with stored entities
   */
  private async demonstrateEntityRetrieval(): Promise<void> {
    console.log('🔍 Entity Retrieval with Repository:');

    try {
      // Get total count
      const count = await this.productRepo.count();
      console.log(`  📊 Total products in collection: ${count}`);

      // Retrieve all products
      const allProducts = await this.productRepo.findAll({ limit: 10 });
      console.log(`  📄 Retrieved ${allProducts.length} products`);

      // Display product details
      if (allProducts.length > 0) {
        console.log('\n  📦 Product Catalog:');
        allProducts.forEach((product, index) => {
          console.log(`    ${index + 1}. ${product.metadata.name}`);
          console.log(`       💰 Price: $${product.metadata.price}`);
          console.log(`       🏷️  Category: ${product.metadata.category}`);
          console.log(
            `       📦 In Stock: ${product.metadata.inStock ? 'Yes' : 'No'}`
          );
          console.log(`       🔑 ID: ${product.id}`);
          console.log(`       📅 Created: ${product.createdAt}`);
          console.log('       ---');
        });

        // Demonstrate findById
        const firstProduct = allProducts[0];
        const retrievedById = await this.productRepo.findById(firstProduct.id);
        console.log(
          `\n  ✅ Retrieved by ID: ${
            retrievedById?.metadata.name || 'Not found'
          }`
        );

        // Demonstrate peek (get first N documents)
        const preview = await this.productRepo.peek(3);
        console.log(`\n  👀 Preview (first 3 products):`);
        preview.forEach((p, i) => {
          console.log(
            `    ${i + 1}. ${p.metadata.name} - $${p.metadata.price}`
          );
        });
      }
    } catch (error) {
      console.error(
        '  ❌ Error retrieving entities:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates updating entities using repository
   */
  private async demonstrateEntityUpdate(): Promise<void> {
    console.log('✏️  Entity Update with Repository:');

    try {
      // Get first product
      const products = await this.productRepo.peek(1);
      if (products.length === 0) {
        console.log('  ⚠️  No products found to update');
        return;
      }

      const product = products[0];
      console.log(`  📝 Updating product: ${product.metadata.name}`);
      console.log(`  💰 Original price: $${product.metadata.price}`);

      // Update using repository.update()
      const updated = await this.productRepo.update(product.id, {
        metadata: {
          ...product.metadata,
          price: product.metadata.price * 0.9, // 10% discount
          inStock: false,
        },
      });

      if (updated) {
        console.log(`  ✅ Product updated successfully`);
        console.log(`  💰 New price: $${updated.metadata.price.toFixed(2)}`);
        console.log(
          `  📦 In Stock: ${updated.metadata.inStock ? 'Yes' : 'No'}`
        );
        console.log(`  🕒 Updated: ${updated.updatedAt}`);
      }

      // Demonstrate upsert (create or update)
      const upserted = await this.productRepo.upsert({
        id: 'demo-product-001',
        content:
          'Smart fitness tracker with heart rate monitoring, sleep tracking, and activity tracking. Water-resistant design for all-day wear.',
        metadata: {
          name: 'Smart Fitness Tracker',
          price: 79.99,
          category: 'Fitness',
          inStock: true,
        },
      });

      console.log(`\n  ✅ Upserted product: ${upserted.metadata.name}`);
      console.log(`  🔑 ID: ${upserted.id}`);
    } catch (error) {
      console.error(
        '  ❌ Error updating entity:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }
}

// ============================================================================
// 3. MODULE DEFINITION
// ============================================================================

/**
 * Example module showing TypeORM-style repository pattern
 *
 * Key Changes from Old Pattern:
 * - Uses ChromaDBModule.forFeature([Entity]) to auto-generate repositories
 * - Repositories are injected with @InjectRepository(Entity)
 * - Zero boilerplate - no manual repository class creation needed
 * - Full CRUD operations available immediately
 */
@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false, // Disabled for example
    }),
    // NEW: Auto-generate repository for BasicProductEntity
    ChromaDBModule.forFeature([BasicProductEntity]),
  ],
  providers: [BasicEntityDemoService],
  exports: [BasicEntityDemoService],
})
export class BasicEntityDefinitionExampleModule {}

// ============================================================================
// 4. USAGE EXAMPLES AND BEST PRACTICES
// ============================================================================

/**
 * Best Practices for Basic Entity Definition:
 *
 * 1. **Collection Naming**: Use descriptive, lowercase names with hyphens
 * 2. **Content Field**: Always include meaningful text for embedding generation
 * 3. **Metadata Structure**: Keep metadata flat and simple for basic entities
 * 4. **ID Strategy**: Use UUID for production systems for uniqueness
 * 5. **Timestamps**: Enable autoTimestamp for audit trails
 * 6. **Type Safety**: Extend BaseChromaEntity for compile-time checks
 * 7. **Documentation**: Add JSDoc comments for all entity properties
 * 8. **Repository Injection**: Use @InjectRepository for type-safe injection
 *
 * TypeORM-Style Repository Pattern:
 *
 * ```typescript
 * // ✅ NEW PATTERN: Auto-generated repository
 * @Module({
 *   imports: [
 *     ChromaDBModule.forRoot({ ... }),
 *     ChromaDBModule.forFeature([UserProfile])  // Auto-generates repository
 *   ]
 * })
 * export class UserModule {}
 *
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(UserProfile)  // TypeORM-style injection
 *     private userRepo: ChromaDBRepository<UserProfile>
 *   ) {}
 *
 *   async createUser(data: any) {
 *     return this.userRepo.create(data);  // Zero boilerplate
 *   }
 * }
 *
 * // ❌ OLD PATTERN: Manual repository creation (deprecated)
 * @Injectable()
 * @ChromaRepository<UserProfile>({ ... })
 * export class UserRepository extends BaseChromaRepository<UserProfile> {
 *   // Manual implementation required
 * }
 * ```
 *
 * Common Entity Patterns:
 *
 * ```typescript
 * // ✅ Good: Clear, descriptive entity
 * @ChromaEntity({
 *   collection: 'user-profiles',
 *   autoEmbed: true,
 *   embeddingFields: ['content'],
 *   autoTimestamp: true,
 *   autoGenerateIds: true,
 * })
 * class UserProfile extends BaseChromaEntity<UserMetadata> {
 *   @ChromaId()
 *   declare id: string;
 *
 *   @ChromaProp()
 *   declare content: string; // Bio, description, etc.
 *
 *   declare metadata: UserMetadata;
 *
 *   @CreatedAt()
 *   declare createdAt?: string;
 *
 *   @UpdatedAt()
 *   declare updatedAt?: string;
 * }
 *
 * // ❌ Avoid: Overly complex metadata in basic entities
 * interface OverlyComplexMetadata {
 *   user: {
 *     personal: {
 *       name: { first: string; last: string; };
 *       addresses: Array<{ type: string; address: any; }>;
 *     };
 *   };
 * }
 * ```
 */
