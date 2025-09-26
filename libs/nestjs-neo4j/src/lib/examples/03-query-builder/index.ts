/**
 * @fileoverview Query Builder Examples Index
 * 
 * Comprehensive collection of Neo4j Query Builder examples demonstrating:
 * - Basic and typed query construction
 * - Advanced query patterns and graph operations
 * - Dynamic and conditional query building
 * - Decorator integration patterns
 * - Production-grade business logic queries
 * - Performance optimization techniques
 */

// Basic Query Builder Examples
export * from './01-basic-query-builder.example';

// Typed Query Builder Examples
export * from './02-typed-query-builder.example';

// Advanced Query Patterns
export * from './03-advanced-queries.example';

// Dynamic Query Construction
export * from './04-dynamic-queries.example';

// Decorator Integration
export * from './05-decorator-integration.example';

// Production Query Patterns
export * from './06-production-queries.example';

/**
 * Query Builder Example Categories
 * 
 * This module provides comprehensive examples for the Neo4j Query Builder,
 * organized by complexity and use case:
 * 
 * 1. **Basic Query Builder** (`01-basic-query-builder.example.ts`)
 *    - Fundamental MATCH, WHERE, RETURN operations
 *    - Parameter handling and type safety
 *    - Basic filtering, sorting, and pagination
 *    - Error handling patterns
 * 
 * 2. **Typed Query Builder** (`02-typed-query-builder.example.ts`)
 *    - Entity-specific query building with TypeScript
 *    - Compile-time type validation
 *    - Multi-entity type-safe queries
 *    - Advanced filtering with type constraints
 * 
 * 3. **Advanced Query Patterns** (`03-advanced-queries.example.ts`)
 *    - Complex JOIN patterns and relationships
 *    - Graph traversals and path finding
 *    - Advanced aggregations and analytics
 *    - Graph algorithms integration
 *    - Performance optimization patterns
 * 
 * 4. **Dynamic Query Construction** (`04-dynamic-queries.example.ts`)
 *    - Runtime query building based on conditions
 *    - Search interfaces and filtering systems
 *    - Faceted search with dynamic aggregations
 *    - User-driven query construction
 *    - Saved searches and query templates
 * 
 * 5. **Decorator Integration** (`05-decorator-integration.example.ts`)
 *    - @CypherQuery decorator with query builder
 *    - CRUD operations with decorators
 *    - Transaction patterns and error handling
 *    - Repository pattern integration
 *    - Service layer best practices
 * 
 * 6. **Production Query Patterns** (`06-production-queries.example.ts`)
 *    - Enterprise business logic queries
 *    - Revenue and subscription analytics
 *    - Customer health and churn prediction
 *    - Compliance and security reporting
 *    - Performance monitoring integration
 * 
 * ## Usage Examples
 * 
 * ### Basic Query Construction
 * ```typescript
 * import { BasicQueryBuilderService } from './01-basic-query-builder.example';
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly basicQueryService: BasicQueryBuilderService) {}
 *   
 *   async findUsers() {
 *     return await this.basicQueryService.findActiveUsers();
 *   }
 * }
 * ```
 * 
 * ### Typed Query Building
 * ```typescript
 * import { TypedQueryBuilderService } from './02-typed-query-builder.example';
 * 
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly typedQueryService: TypedQueryBuilderService) {}
 *   
 *   async searchUsers(filters: UserSearchFilters) {
 *     return await this.typedQueryService.advancedUserFiltering(filters);
 *   }
 * }
 * ```
 * 
 * ### Dynamic Search Implementation
 * ```typescript
 * import { DynamicQueryService } from './04-dynamic-queries.example';
 * 
 * @Controller('search')
 * export class SearchController {
 *   constructor(private readonly dynamicService: DynamicQueryService) {}
 *   
 *   @Get('users')
 *   async searchUsers(@Query() params: UserSearchFilters) {
 *     return await this.dynamicService.searchUsers(params);
 *   }
 * }
 * ```
 * 
 * ### Production Analytics
 * ```typescript
 * import { ProductionQueryService } from './06-production-queries.example';
 * 
 * @Injectable()
 * export class AnalyticsService {
 *   constructor(private readonly productionService: ProductionQueryService) {}
 *   
 *   async getBusinessMetrics() {
 *     return await this.productionService.generateExecutiveDashboard();
 *   }
 * }
 * ```
 * 
 * ## Key Features Demonstrated
 * 
 * - **Type Safety**: Full TypeScript integration with compile-time validation
 * - **Fluent API**: Chainable query construction with IntelliSense support
 * - **Performance**: Optimized query patterns and caching strategies
 * - **Business Logic**: Real-world enterprise query patterns
 * - **Integration**: Seamless decorator and repository pattern support
 * - **Production Ready**: Error handling, monitoring, and optimization
 * 
 * ## Best Practices Covered
 * 
 * - Query optimization and performance monitoring
 * - Type-safe parameter handling and injection prevention
 * - Proper error handling and validation patterns
 * - Caching strategies for different query types
 * - Transaction management and atomic operations
 * - Security patterns and access control
 * - Business logic separation and clean architecture
 */

export const QUERY_BUILDER_EXAMPLES = {
  basic: '01-basic-query-builder.example',
  typed: '02-typed-query-builder.example',
  advanced: '03-advanced-queries.example',
  dynamic: '04-dynamic-queries.example',
  decorators: '05-decorator-integration.example',
  production: '06-production-queries.example'
} as const;

export type QueryBuilderExampleType = keyof typeof QUERY_BUILDER_EXAMPLES;