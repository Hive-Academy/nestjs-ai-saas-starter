/**
 * @fileoverview Basic Operations Examples Index
 * 
 * Comprehensive collection of basic ChromaDB operation examples demonstrating:
 * - Fundamental CRUD operations with proper error handling
 * - Collection creation, configuration, and management
 * - Basic search and retrieval patterns
 * - Configuration and setup best practices
 * - Performance monitoring and optimization basics
 */

// Basic CRUD Operations Examples
export * from './01-basic-crud.example';

// Collection Management Examples
export * from './02-collection-management.example';

/**
 * Basic Operations Example Categories
 * 
 * This module provides foundational examples for ChromaDB operations,
 * organized by operational complexity:
 * 
 * 1. **Basic CRUD Operations** (`01-basic-crud.example.ts`)
 *    - Create: Single and batch document insertion
 *    - Read: Document retrieval by ID and search operations
 *    - Update: Document modification and version management
 *    - Delete: Document removal and cleanup operations
 *    - Performance timing and result validation
 *    - Error handling patterns
 * 
 * 2. **Collection Management** (`02-collection-management.example.ts`)
 *    - Collection creation with various metadata patterns
 *    - Configuration management and validation
 *    - Rich metadata usage for governance and operations
 *    - Collection inspection and health monitoring
 *    - Maintenance operations and cleanup procedures
 *    - Administrative operations and best practices
 * 
 * ## Usage Examples
 * 
 * ### Basic CRUD Operations
 * ```typescript
 * import { BasicCrudService } from './01-basic-crud.example';
 * 
 * @Injectable()
 * export class MyDocumentService {
 *   constructor(private readonly basicCrud: BasicCrudService) {}
 *   
 *   async manageDocuments() {
 *     // Run complete CRUD demonstration
 *     await this.basicCrud.executeBasicCrud();
 *     
 *     // Get collection statistics
 *     const stats = await this.basicCrud.getCollectionStats();
 *     console.log('Collection stats:', stats);
 *   }
 * }
 * ```
 * 
 * ### Collection Management
 * ```typescript
 * import { CollectionManagementService } from './02-collection-management.example';
 * 
 * @Injectable()
 * export class CollectionAdminService {
 *   constructor(private readonly collectionMgmt: CollectionManagementService) {}
 *   
 *   async administerCollections() {
 *     // Run complete collection management demo
 *     await this.collectionMgmt.executeCollectionManagement();
 *     
 *     // Get collections summary
 *     const summary = await this.collectionMgmt.getCollectionsSummary();
 *     console.log('Collections summary:', summary);
 *   }
 * }
 * ```
 * 
 * ### Direct Service Integration
 * ```typescript
 * import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
 * import { BasicCrudService, CollectionManagementService } from './01-basic-operations';
 * 
 * @Module({
 *   imports: [
 *     ChromaDBModule.forRoot({
 *       connection: {
 *         host: 'localhost',
 *         port: 8000
 *       },
 *       embedding: {
 *         provider: 'openai',
 *         apiKey: process.env.OPENAI_API_KEY
 *       }
 *     })
 *   ],
 *   providers: [
 *     BasicCrudService,
 *     CollectionManagementService
 *   ]
 * })
 * export class ExamplesModule {}
 * ```
 * 
 * ## Key Concepts Demonstrated
 * 
 * ### CRUD Operations Patterns
 * - **Create**: Single document insertion with proper metadata
 * - **Create Batch**: Efficient bulk document insertion
 * - **Read by ID**: Specific document retrieval
 * - **Read All**: Collection scanning with limits
 * - **Search**: Semantic similarity search with scoring
 * - **Update**: Document modification using upsert patterns
 * - **Update Batch**: Efficient bulk updates
 * - **Delete**: Selective document removal
 * - **Verify**: Post-operation validation and verification
 * 
 * ### Collection Management Patterns
 * - **Basic Creation**: Simple collection creation with minimal metadata
 * - **Advanced Creation**: Collections with comprehensive metadata
 * - **Specialized Collections**: Domain-specific collection configurations
 * - **Configuration Management**: Collection settings and validation
 * - **Rich Metadata**: Comprehensive governance and operational metadata
 * - **Health Monitoring**: Collection inspection and performance checks
 * - **Maintenance**: Cleanup and optimization operations
 * 
 * ## Best Practices Covered
 * 
 * ### Performance
 * - Operation timing and performance measurement
 * - Batch operations for efficiency
 * - Result pagination and limiting
 * - Memory-efficient document processing
 * 
 * ### Error Handling
 * - Proper exception handling and recovery
 * - Validation of inputs and results
 * - Graceful degradation patterns
 * - Comprehensive error logging
 * 
 * ### Type Safety
 * - Strongly typed document interfaces
 * - Type-safe metadata structures
 * - Validation helpers and type guards
 * - Compile-time safety patterns
 * 
 * ### Operational Excellence
 * - Structured logging with context
 * - Performance metrics collection
 * - Health check implementations
 * - Cleanup and maintenance procedures
 * 
 * ## Learning Path
 * 
 * 1. **Start with Basic CRUD**: Master fundamental operations
 * 2. **Understand Collections**: Learn collection lifecycle management
 * 3. **Practice Error Handling**: Implement robust error patterns
 * 4. **Explore Metadata**: Utilize rich metadata for governance
 * 5. **Monitor Performance**: Implement timing and health checks
 * 6. **Apply Best Practices**: Use patterns in real applications
 * 
 * These examples form the foundation for all other ChromaDB operations
 * and should be understood before moving to advanced examples.
 */

export const BASIC_OPERATIONS_EXAMPLES = {
  basicCrud: '01-basic-crud.example',
  collectionManagement: '02-collection-management.example'
} as const;

export type BasicOperationsExampleType = keyof typeof BASIC_OPERATIONS_EXAMPLES;