/**
 * @fileoverview Basic Entity Definition Example
 *
 * Demonstrates:
 * - Simple entity with @ChromaEntity decorator
 * - Basic properties with @ChromaProp
 * - Essential decorators: @ChromaId, @CreatedAt, @UpdatedAt
 * - Entity serialization methods (toChroma/fromChroma)
 * - Production-ready entity configuration
 *
 * Key Concepts:
 * - ChromaDB entity creation and configuration
 * - Property mapping and transformation
 * - Automatic timestamp handling
 * - Type-safe entity definition
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBModule,
  ChromaDBService,
  ChromaEntity,
  ChromaProp,
  ChromaId,
  CreatedAt,
  UpdatedAt,
  BaseChromaEntity,
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
 * Service demonstrating basic entity usage patterns
 * Shows how to work with entities directly using ChromaDBService
 */
@Injectable()
export class BasicEntityDemoService implements OnModuleInit {
  constructor(private readonly chromaService: ChromaDBService) {}

  async onModuleInit() {
    console.log('\n🎯 Basic Entity Definition Demo\n');
    await this.demonstrateEntityCreation();
    await this.demonstrateEntitySerialization();
    await this.demonstrateEntityRetrieval();
  }

  /**
   * Demonstrates creating and storing basic entities
   */
  private async demonstrateEntityCreation(): Promise<void> {
    console.log('📝 Creating Basic Entities:');

    try {
      // Create a basic product entity
      const product = new BasicProductEntity();
      product.content =
        'High-quality wireless Bluetooth headphones with noise cancellation technology. Perfect for music lovers and professionals who need crystal-clear audio quality.';
      product.metadata = {
        name: 'Wireless Bluetooth Headphones',
        price: 199.99,
        category: 'Electronics',
        inStock: true,
      };

      console.log('  ✅ Entity created in memory');
      console.log(`  📊 Content length: ${product.content.length} characters`);
      console.log(`  🏷️  Category: ${product.metadata.category}`);
      console.log(`  💰 Price: $${product.metadata.price}`);

      // Store entity in ChromaDB
      const chromaDoc = product.toChroma();
      await this.chromaService.addDocuments(product.getCollectionName(), [
        chromaDoc as any,
      ]);
      console.log('  ✅ Entity stored in ChromaDB collection');
    } catch (error) {
      console.error(
        '  ❌ Error creating entity:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates entity serialization and deserialization
   */
  private async demonstrateEntitySerialization(): Promise<void> {
    console.log('🔄 Entity Serialization Demo:');

    try {
      // Create test data as it would come from ChromaDB
      const rawChromaData = {
        id: 'prod-123',
        document:
          'Premium coffee beans sourced from Ethiopian highlands. Rich, full-bodied flavor with notes of chocolate and berries.',
        metadata: {
          name: 'Ethiopian Coffee Beans',
          price: 24.99,
          category: 'Food & Beverage',
          inStock: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        },
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Simplified embedding
      };

      console.log('  📥 Raw ChromaDB data received');
      console.log(`  🔑 ID: ${rawChromaData.id}`);

      // Deserialize from ChromaDB format
      const entity = BasicProductEntity.fromChroma(rawChromaData);
      console.log('  ✅ Entity deserialized from ChromaDB data');
      console.log(`  📝 Product name: ${entity.metadata.name}`);
      console.log(`  💰 Price: $${entity.metadata.price}`);
      console.log(`  📅 Created: ${entity.createdAt}`);

      // Serialize back to ChromaDB format
      const serialized = entity.toChroma();
      console.log('  ✅ Entity serialized back to ChromaDB format');
      console.log(
        `  🔍 Metadata fields: ${Object.keys(serialized.metadata || {}).join(
          ', '
        )}`
      );

      // Verify round-trip integrity
      const isDataIntact =
        serialized.id === rawChromaData.id &&
        serialized.metadata?.name === rawChromaData.metadata.name &&
        serialized.metadata?.price === rawChromaData.metadata.price;

      console.log(
        `  ✅ Round-trip integrity: ${isDataIntact ? 'PASSED' : 'FAILED'}`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in serialization demo:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates retrieving and working with stored entities
   */
  private async demonstrateEntityRetrieval(): Promise<void> {
    console.log('🔍 Entity Retrieval Demo:');

    try {
      // Get collection info
      const collectionExists = await this.chromaService.collectionExists(
        'products'
      );
      console.log(`  📊 Collection 'products' exists: ${collectionExists}`);

      if (collectionExists) {
        // Retrieve documents from ChromaDB
        const results = await this.chromaService.getDocuments('products', {
          limit: 5,
        });

        console.log(`  📄 Retrieved ${results.ids.length} documents`);

        // Convert ChromaDB results to entities
        if (results.ids.length > 0) {
          for (let i = 0; i < results.ids.length; i++) {
            const rawData = {
              id: results.ids[i],
              document: results.documents?.[i] || '',
              metadata: results.metadatas?.[i] || {},
              embedding: results.embeddings?.[i],
            };

            const entity = BasicProductEntity.fromChroma(rawData);
            console.log(`    📦 Product: ${entity.metadata.name}`);
            console.log(`    💰 Price: $${entity.metadata.price}`);
            console.log(`    🏷️  Category: ${entity.metadata.category}`);
            console.log(`    📅 Created: ${entity.createdAt}`);
            console.log('    ---');
          }
        }

        // Demonstrate count functionality
        const count = await this.chromaService.countDocuments('products');
        console.log(`  🔢 Total products in collection: ${count}`);
      }
    } catch (error) {
      console.error(
        '  ❌ Error retrieving entities:',
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
 * Example module showing how to configure ChromaDB for basic entity usage
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
      defaultCollection: 'products',
      enableHealthCheck: false, // Disabled for example
    }),
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
 * 1. **Collection Naming**: Use descriptive, lowercase names with underscores
 * 2. **Content Field**: Always include meaningful text for embedding generation
 * 3. **Metadata Structure**: Keep metadata flat and simple for basic entities
 * 4. **ID Strategy**: Use UUID for production systems for uniqueness
 * 5. **Timestamps**: Enable autoTimestamp for audit trails
 * 6. **Type Safety**: Implement BaseDocument interface for compile-time checks
 * 7. **Documentation**: Add JSDoc comments for all entity properties
 * 8. **Validation**: Consider adding validation decorators for critical fields
 *
 * Common Patterns:
 *
 * ```typescript
 * // ✅ Good: Clear, descriptive entity
 * @ChromaEntity({
 *   collection: 'user_profiles',
 *   autoEmbed: true,
 *   embeddingFields: ['content'],
 *   autoTimestamp: true,
 * })
 * class UserProfile {
 *   @ChromaId()
 *   id!: string;
 *
 *   @ChromaProp()
 *   content!: string; // Bio, description, etc.
 *
 *   metadata!: {
 *     name: string;
 *     email: string;
 *     role: string;
 *   };
 * }
 *
 * // ❌ Avoid: Overly complex metadata in basic entities
 * metadata!: {
 *   user: {
 *     personal: {
 *       name: { first: string; last: string; };
 *       addresses: Array<{ type: string; address: any; }>;
 *     };
 *   };
 * };
 * ```
 */
