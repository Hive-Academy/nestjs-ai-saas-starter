/**
 * @fileoverview Decorator Usage Examples and Documentation
 *
 * This module provides comprehensive examples and usage patterns for the
 * ChromaDB decorator ecosystem, demonstrating best practices and common patterns.
 */

/**
 * Example usage patterns for ChromaDB decorators
 *
 * @example Using individual decorators
 * ```typescript
 * @Injectable()
 * export class DocumentSearchService {
 *   @VectorQuery({
 *     collection: 'documents',
 *     autoEmbed: true,
 *     defaultLimit: 10,
 *   })
 *   @Cached({
 *     ttl: 300000,
 *     keyStrategy: 'collection_aware',
 *   })
 *   @Profiled({
 *     slowQueryThreshold: 100,
 *     logLevel: 'slow',
 *   })
 *   @Retry({
 *     maxAttempts: 3,
 *     strategy: 'exponential',
 *     retryableErrors: [/timeout/i, /connection/i],
 *   })
 *   async searchDocuments(params: VectorQueryParams) {
 *     // All functionality handled by decorators
 *   }
 * }
 * ```
 *
 * @example Using repository pattern
 * ```typescript
 * @Injectable()
 * @ChromaRepository({
 *   collection: 'users',
 *   autoEmbed: true,
 *   enableCaching: true,
 *   enableValidation: true,
 * })
 * export class UserRepository implements ChromaRepository<UserDocument> {
 *   // All CRUD methods auto-generated
 *
 *   @VectorQuery({
 *     collection: 'users',
 *     autoEmbed: true,
 *   })
 *   @Cached({ ttl: 600000 })
 *   async findSimilarUsers(params: VectorQueryParams) {
 *     // Custom search method with decorators
 *   }
 * }
 * ```
 *
 * @example Using presets
 * ```typescript
 * import { applyDecoratorPreset, DecoratorPresets } from './utils/decorator-presets';
 *
 * const config = applyDecoratorPreset('production', {
 *   vectorQuery: { defaultLimit: 20 },
 *   caching: { ttl: 1800000 }, // 30 minutes
 * });
 *
 * // Apply config to your decorators...
 * ```
 *
 * @example Multi-tenant usage
 * ```typescript
 * @Injectable()
 * @TenantAware({
 *   namingStrategy: 'prefix',
 *   tenantExtraction: 'header',
 *   strictValidation: true,
 * })
 * export class TenantAwareDocumentService {
 *   @VectorQuery({
 *     collection: 'documents', // Will be prefixed with tenant ID
 *     autoEmbed: true,
 *   })
 *   @CrossTenant({ requireAuth: true })
 *   async searchAcrossTenants(params: VectorQueryParams) {
 *     // Cross-tenant search with proper authorization
 *   }
 * }
 * ```
 *
 * @example Performance monitoring
 * ```typescript
 * @Injectable()
 * export class HighPerformanceService {
 *   @VectorQuery({
 *     collection: 'embeddings',
 *     autoEmbed: true,
 *   })
 *   @Cached({
 *     ttl: 600000,
 *     keyStrategy: 'collection_aware',
 *     refreshStrategy: 'background',
 *   })
 *   @Profiled({
 *     slowQueryThreshold: 50,
 *     samplingRate: 0.1, // 10% sampling
 *     enablePercentiles: true,
 *   })
 *   @Retry({
 *     maxAttempts: 5,
 *     strategy: 'exponential',
 *     circuitBreaker: {
 *       enabled: true,
 *       failureThreshold: 10,
 *       resetTimeout: 30000,
 *     },
 *   })
 *   async performCriticalSearch(query: string) {
 *     // High-performance search with comprehensive monitoring
 *   }
 * }
 * ```
 */
export const DECORATOR_USAGE_EXAMPLES = {
  INDIVIDUAL_DECORATORS: 'See @example tags above',
  REPOSITORY_PATTERN: 'See @example tags above',
  PRESET_USAGE: 'See @example tags above',
  MULTI_TENANT: 'See @example tags above',
  PERFORMANCE_MONITORING: 'See @example tags above',
} as const;

/**
 * Best practices for decorator usage
 */
export const DECORATOR_BEST_PRACTICES = {
  /**
   * Order decorators by execution priority
   * 1. @TenantAware (first - handles tenant context)
   * 2. @VectorQuery / @ChromaRepository (core functionality)
   * 3. @Cached (caching layer)
   * 4. @Profiled (monitoring)
   * 5. @Retry (error handling - last)
   */
  DECORATOR_ORDER: [
    'TenantAware',
    'VectorQuery',
    'ChromaRepository',
    'Cached',
    'Profiled',
    'Retry',
  ],

  /**
   * Performance recommendations
   */
  PERFORMANCE: {
    USE_SAMPLING: 'Use samplingRate < 1.0 for high-frequency operations',
    CACHE_STRATEGY: 'Use collection_aware caching for vector operations',
    BATCH_OPERATIONS: 'Enable batch operations for bulk processing',
    CIRCUIT_BREAKER: 'Use circuit breaker for external dependencies',
  },

  /**
   * Error handling recommendations
   */
  ERROR_HANDLING: {
    RETRY_STRATEGY: 'Use exponential backoff for network operations',
    FALLBACK: 'Provide fallback functions for critical operations',
    LOGGING: 'Log retries and circuit breaker state changes',
    VALIDATION: 'Enable parameter validation in development',
  },

  /**
   * Multi-tenancy recommendations
   */
  MULTI_TENANCY: {
    TENANT_EXTRACTION: 'Use JWT-based tenant extraction for security',
    NAMING_STRATEGY: 'Use separate collections for strict isolation',
    AUDIT_LOGGING: 'Enable audit logging for compliance',
    CROSS_TENANT: 'Require authentication for cross-tenant operations',
  },
} as const;
