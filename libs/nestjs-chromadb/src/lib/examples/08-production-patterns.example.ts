/**
 * @fileoverview Production Patterns Example
 *
 * Demonstrates:
 * - Error handling and retry logic with circuit breakers
 * - Pagination patterns for large datasets
 * - Bulk import/export operations
 * - Data migration patterns and version management
 * - Performance optimization strategies
 * - Monitoring and observability integration
 * - Health checks and graceful degradation
 * - Security and data validation patterns
 *
 * Key Concepts:
 * - Production-ready error handling
 * - Scalable data operations
 * - Performance monitoring
 * - Reliability patterns
 * - Security best practices
 */

import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import {
  ChromaDBRepository,
  BaseChromaEntity,
  ChromaDBModule,
  ChromaDBService,
  ChromaEntity,
  CreateDocumentInput,
  Where,
} from '../../index';

// ============================================================================
// 1. PRODUCTION-READY ENTITIES WITH COMPREHENSIVE METADATA
// ============================================================================

interface ProductionDocumentMetadata {
  title: string;
  category: string;
  status: 'active' | 'inactive' | 'archived';
  version: string;
  checksum: string;
  sourceSystem: string;
  lastSyncedAt: string;
  metadata: {
    size: number;
    format: string;
    encoding: string;
    language: string;
  };
  security: {
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    owner: string;
    accessLevel: number;
  };
  audit: {
    createdBy: string;
    modifiedBy: string;
    modificationCount: number;
    lastAccessedAt?: string;
  };
  performance: {
    indexingTime?: number;
    embeddingTime?: number;
    lastQueryTime?: number;
    queryCount: number;
  };
}

@ChromaEntity({
  collection: 'production_documents',
  description: 'Production document entity with comprehensive metadata',
})
export class ProductionDocumentEntity extends BaseChromaEntity<ProductionDocumentMetadata> {
  declare id: string;
  declare content: string;
  declare metadata: ProductionDocumentMetadata;
  declare embedding?: readonly number[];
}

// ============================================================================
// 2. PRODUCTION REPOSITORY WITH ENTERPRISE PATTERNS
// ============================================================================

/**
 * Production-grade repository with comprehensive error handling,
 * performance optimization, and monitoring
 */
@Injectable()
export class ProductionDocumentRepository extends ChromaDBRepository<ProductionDocumentEntity> {
  private readonly productionLogger = new Logger(ProductionDocumentRepository.name);
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000;
  private circuitBreakerFailures = 0;
  private readonly circuitBreakerThreshold = 5;
  private circuitBreakerOpenUntil = 0;

  /**
   * Explicit constructor with ChromaDBService injection (TypeORM-style)
   * @param chromaDB - ChromaDBService instance injected by NestJS
   */
  constructor(chromaDB: ChromaDBService) {
    super(ProductionDocumentEntity, 'production_documents', chromaDB);
  }

  // ============================================================================
  // CIRCUIT BREAKER AND RETRY PATTERNS
  // ============================================================================

  /**
   * Execute operation with circuit breaker pattern
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check if circuit breaker is open
    if (this.isCircuitBreakerOpen()) {
      const error = new Error(`Circuit breaker is open for ${operationName}`);
      this.productionLogger.warn(`Circuit breaker blocked operation: ${operationName}`);
      throw error;
    }

    try {
      const result = await this.executeWithRetry(operation, operationName);
      this.onOperationSuccess();
      return result;
    } catch (error) {
      this.onOperationFailure(operationName, error);
      throw error;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        this.productionLogger.debug(
          `${operationName} completed in ${duration}ms (attempt ${attempt})`
        );
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.retryAttempts) {
          this.productionLogger.error(
            `${operationName} failed after ${attempt} attempts: ${lastError.message}`
          );
          break;
        }

        const delay = this.calculateRetryDelay(attempt);
        this.productionLogger.warn(
          `${operationName} failed on attempt ${attempt}, retrying in ${delay}ms: ${lastError.message}`
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isCircuitBreakerOpen(): boolean {
    return Date.now() < this.circuitBreakerOpenUntil;
  }

  private onOperationSuccess(): void {
    this.circuitBreakerFailures = 0;
  }

  private onOperationFailure(operationName: string, error: unknown): void {
    this.circuitBreakerFailures++;

    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.circuitBreakerOpenUntil = Date.now() + 60000; // Open for 1 minute
      this.productionLogger.error(
        `Circuit breaker opened for ${operationName} after ${this.circuitBreakerFailures} failures`
      );
    }
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * baseDelay;
    return Math.min(baseDelay + jitter, 10000); // Max 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // PAGINATION PATTERNS
  // ============================================================================

  /**
   * Cursor-based pagination for large datasets
   */
  async findWithCursorPagination(options: {
    cursor?: string;
    limit?: number;
    where?: Where;
    orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  }): Promise<{
    documents: ProductionDocumentEntity[];
    nextCursor?: string;
    hasMore: boolean;
    totalEstimate?: number;
  }> {
    return this.executeWithCircuitBreaker(async () => {
      const limit = Math.min(options.limit || 20, 100);
      const where: any = { ...options.where };

      // Add cursor condition if provided
      if (options.cursor) {
        where.createdAt = { $gt: options.cursor };
      }

      // Add active status filter by default
      if (!where.status) {
        where.status = 'active';
      }

      const documents = await this.findAll({
        where,
        limit: limit + 1,
      });

      const hasMore = documents.length > limit;
      const result = hasMore ? documents.slice(0, limit) : documents;
      const nextCursor =
        hasMore && result.length > 0
          ? new Date().toISOString() // Simplified for demo
          : undefined;

      // Estimate total count (expensive operation, use sparingly)
      let totalEstimate;
      if (!options.cursor) {
        try {
          totalEstimate = await this.count(where as Where);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.productionLogger.warn('Failed to get total count estimate:', errorMessage);
        }
      }

      return {
        documents: result,
        nextCursor,
        hasMore,
        totalEstimate,
      };
    }, 'findWithCursorPagination');
  }

  /**
   * Offset-based pagination (use with caution for large datasets)
   */
  async findWithOffsetPagination(options: {
    page?: number;
    limit?: number;
    where?: Record<string, unknown>;
  }): Promise<{
    documents: ProductionDocumentEntity[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    return this.executeWithCircuitBreaker(async () => {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(options.limit || 20, 100);
      const where = { ...options.where, status: 'active' };

      // Get total count first
      const totalCount = await this.count(where as Where);
      const totalPages = Math.ceil(totalCount / limit);

      // Calculate offset
      const offset = (page - 1) * limit;

      const allDocuments = await this.findAll({
        where: where as Where,
        limit: 1000,
      });

      const documents = allDocuments.slice(offset, offset + limit);

      return {
        documents,
        pagination: {
          page,
          limit,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    }, 'findWithOffsetPagination');
  }

  // ============================================================================
  // BULK OPERATIONS WITH PERFORMANCE OPTIMIZATION
  // ============================================================================

  /**
   * Bulk import with progress tracking and error handling
   */
  async bulkImport(
    documents: Array<CreateDocumentInput<ProductionDocumentEntity>>,
    options: {
      batchSize?: number;
      continueOnError?: boolean;
      onProgress?: (processed: number, total: number, errors: number) => void;
      validate?: boolean;
    } = {}
  ): Promise<{
    imported: number;
    failed: number;
    errors: Array<{
      index: number;
      error: string;
      document: CreateDocumentInput<ProductionDocumentEntity>;
    }>;
    duration: number;
  }> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    const errors: Array<{
      index: number;
      error: string;
      document: CreateDocumentInput<ProductionDocumentEntity>;
    }> = [];
    let imported = 0;
    let failed = 0;

    this.productionLogger.log(`Starting bulk import of ${documents.length} documents`);

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        // Validate documents if requested
        if (options.validate) {
          for (const [batchIndex, doc] of batch.entries()) {
            const globalIndex = i + batchIndex;
            try {
              this.validateDocument(doc);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              errors.push({
                index: globalIndex,
                error: errorMessage,
                document: doc,
              });
              failed++;

              if (!options.continueOnError) {
                throw error;
              }
              continue;
            }
          }
        }

        // Add production metadata
        const enhancedBatch = batch.map((doc) => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            audit: {
              ...doc.metadata.audit,
              modificationCount: 0,
            },
            performance: {
              ...doc.metadata.performance,
              queryCount: 0,
            },
          },
        }));

        // Import batch
        await this.executeWithCircuitBreaker(async () => {
          const result = await this.createMany(enhancedBatch);
          return result;
        }, 'bulkImportBatch');

        imported += batch.length - (batch.length - enhancedBatch.length);

        // Report progress
        if (options.onProgress) {
          options.onProgress(
            Math.min(i + batchSize, documents.length),
            documents.length,
            errors.length
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const batchErrors = batch.map((doc, batchIndex) => ({
          index: i + batchIndex,
          error: errorMessage,
          document: doc,
        }));

        errors.push(...batchErrors);
        failed += batch.length;

        if (!options.continueOnError) {
          break;
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < documents.length) {
        await this.sleep(100);
      }
    }

    const duration = Date.now() - startTime;

    this.productionLogger.log(
      `Bulk import completed: ${imported} imported, ${failed} failed in ${duration}ms`
    );

    return {
      imported,
      failed,
      errors,
      duration,
    };
  }

  /**
   * Bulk export with streaming for large datasets
   */
  async bulkExport(
    options: {
      where?: Record<string, unknown>;
      batchSize?: number;
      format?: 'json' | 'csv';
      onBatch?: (
        batch: ProductionDocumentEntity[],
        batchNumber: number
      ) => Promise<void>;
    } = {}
  ): Promise<{
    exported: number;
    duration: number;
    batches: number;
  }> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let exported = 0;
    let batches = 0;
    let cursor: string | undefined;

    this.productionLogger.log('Starting bulk export');

    do {
      const result = await this.findWithCursorPagination({
        cursor,
        limit: batchSize,
        where: options.where as Where,
      });

      if (result.documents.length > 0) {
        batches++;

        if (options.onBatch) {
          await options.onBatch(result.documents, batches);
        }

        exported += result.documents.length;
        cursor = result.nextCursor;

        this.productionLogger.debug(
          `Exported batch ${batches}: ${result.documents.length} documents`
        );
      } else {
        break;
      }
    } while (cursor);

    const duration = Date.now() - startTime;

    this.productionLogger.log(
      `Bulk export completed: ${exported} documents in ${batches} batches, ${duration}ms`
    );

    return {
      exported,
      duration,
      batches,
    };
  }

  // ============================================================================
  // DATA MIGRATION AND VERSIONING
  // ============================================================================

  /**
   * Migrate documents from one version to another
   */
  async migrateToVersion(
    targetVersion: string,
    migrationFunction: (
      doc: ProductionDocumentEntity
    ) => Partial<ProductionDocumentEntity>,
    options: {
      batchSize?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<{
    processed: number;
    migrated: number;
    skipped: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const batchSize = options.batchSize || 50;
    const errors: Array<{ id: string; error: string }> = [];
    let processed = 0;
    let migrated = 0;
    let skipped = 0;

    this.productionLogger.log(
      `Starting migration to version ${targetVersion} (dry run: ${options.dryRun})`
    );

    let cursor: string | undefined;

    do {
      const result = await this.findWithCursorPagination({
        cursor,
        limit: batchSize,
        where: {
          version: { $ne: targetVersion },
          status: 'active',
        },
      });

      for (const document of result.documents) {
        processed++;

        try {
          // Apply migration
          const migrationData = migrationFunction(document);

          if (Object.keys(migrationData).length === 0) {
            skipped++;
            continue;
          }

          if (!options.dryRun) {
            const updateData: CreateDocumentInput<ProductionDocumentEntity> = {
              id: document.id,
              content: migrationData.content || document.content,
              metadata: {
                ...document.metadata,
                ...migrationData.metadata,
                version: targetVersion,
                audit: {
                  ...document.metadata.audit,
                  modificationCount:
                    document.metadata.audit.modificationCount + 1,
                  modifiedBy: 'migration-system',
                },
              },
            };
            await this.update(updateData.id!, updateData);
          }

          migrated++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({
            id: document.id,
            error: errorMessage,
          });
        }
      }

      cursor = result.nextCursor;

      this.productionLogger.debug(
        `Migration progress: ${processed} processed, ${migrated} migrated, ${skipped} skipped`
      );
    } while (cursor);

    this.productionLogger.log(
      `Migration completed: ${processed} processed, ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`
    );

    return {
      processed,
      migrated,
      skipped,
      errors,
    };
  }

  // ============================================================================
  // PERFORMANCE MONITORING AND OPTIMIZATION
  // ============================================================================

  /**
   * Search with performance monitoring
   */
  async searchWithMonitoring(
    query: string,
    options: Record<string, unknown> = {},
    userId?: string
  ): Promise<{
    results: ProductionDocumentEntity[];
    performance: {
      searchTime: number;
      resultCount: number;
      cacheHit: boolean;
    };
  }> {
    const startTime = Date.now();

    try {
      const results = await this.executeWithCircuitBreaker(async () => {
        return this.search(query, {
          limit: 10,
          where: {
            status: 'active',
          } as any,
        });
      }, 'searchWithMonitoring');

      const searchTime = Date.now() - startTime;

      if (results.length > 0) {
        await this.updateQueryMetrics(
          results.map((r: ProductionDocumentEntity) => r.id),
          searchTime
        );
      }

      // Log slow queries
      if (searchTime > 1000) {
        this.productionLogger.warn(
          `Slow query detected: ${searchTime}ms for query "${query}" (${results.length} results)`
        );
      }

      return {
        results,
        performance: {
          searchTime,
          resultCount: results.length,
          cacheHit: false, // Would be determined by actual cache implementation
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.productionLogger.error(`Search failed for query "${query}": ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Health check for the repository
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: boolean;
      circuitBreaker: boolean;
      performance: boolean;
    };
    metrics: {
      circuitBreakerFailures: number;
      averageResponseTime?: number;
      errorRate?: number;
    };
  }> {
    const checks = {
      database: false,
      circuitBreaker: true,
      performance: true,
    };

    try {
      // Test database connectivity
      await this.executeWithCircuitBreaker(async () => {
        await this.count({ status: 'active' });
      }, 'healthCheck');

      checks.database = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.productionLogger.error('Database health check failed:', errorMessage);
    }

    // Check circuit breaker status
    checks.circuitBreaker = !this.isCircuitBreakerOpen();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (checks.database && checks.circuitBreaker && checks.performance) {
      status = 'healthy';
    } else if (checks.database) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: {
        circuitBreakerFailures: this.circuitBreakerFailures,
        // In production, these would come from actual monitoring
        averageResponseTime: undefined,
        errorRate: undefined,
      },
    };
  }

  // ============================================================================
  // SECURITY AND VALIDATION
  // ============================================================================

  /**
   * Validate document before operations
   */
  private validateDocument(
    document: CreateDocumentInput<ProductionDocumentEntity>
  ): void {
    // Required fields validation
    if (
      !document.metadata?.title ||
      typeof document.metadata.title !== 'string'
    ) {
      throw new Error('Document title is required and must be a string');
    }

    if (!document.content || typeof document.content !== 'string') {
      throw new Error('Document content is required and must be a string');
    }

    if (!document.metadata?.security?.classification) {
      throw new Error('Security classification is required');
    }

    // Size validation
    const contentSize = Buffer.byteLength(document.content, 'utf8');
    if (contentSize > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error('Document content exceeds maximum size limit (10MB)');
    }

    // Security validation
    const allowedClassifications = [
      'public',
      'internal',
      'confidential',
      'restricted',
    ];
    if (
      !allowedClassifications.includes(
        document.metadata.security.classification
      )
    ) {
      throw new Error('Invalid security classification');
    }

    // Content validation (basic)
    if (document.content.includes('<script')) {
      throw new Error(
        'Document content contains potentially malicious scripts'
      );
    }
  }

  /**
   * Sanitize document data
   */

  private async updateQueryMetrics(
    documentIds: string[],
    queryTime: number
  ): Promise<void> {
    // In production, this would batch update performance metrics
    // For demo purposes, we'll just log it
    this.productionLogger.debug(
      `Updated query metrics for ${documentIds.length} documents (${queryTime}ms)`
    );
  }
}

// ============================================================================
// 3. PRODUCTION PATTERNS DEMONSTRATION SERVICE
// ============================================================================

@Injectable()
export class ProductionPatternsDemoService implements OnModuleInit {
  constructor(private readonly productionRepo: ProductionDocumentRepository) {}

  async onModuleInit() {
    console.log('\n🎯 Production Patterns Demo\n');
    await this.demonstrateErrorHandling();
    await this.demonstratePagination();
    await this.demonstrateBulkOperations();
    await this.demonstratePerformanceMonitoring();
    await this.demonstrateHealthChecks();
    console.log('✅ Production patterns demo completed\n');
  }

  private async demonstrateErrorHandling(): Promise<void> {
    console.log('🔧 Error Handling and Circuit Breaker Demo:');

    try {
      // Create sample documents for testing
      const sampleDoc: CreateDocumentInput<ProductionDocumentEntity> = {
        content:
          'This is a test document for production patterns demonstration',
        metadata: {
          title: 'Production Test Document',
          category: 'test',
          status: 'active',
          version: '1.0',
          checksum: 'abc123',
          sourceSystem: 'demo',
          lastSyncedAt: new Date().toISOString(),
          metadata: {
            size: 1024,
            format: 'text',
            encoding: 'utf-8',
            language: 'en',
          },
          security: {
            classification: 'public',
            owner: 'demo-user',
            accessLevel: 1,
          },
          audit: {
            createdBy: 'demo-system',
            modifiedBy: 'demo-system',
            modificationCount: 0,
          },
          performance: {
            queryCount: 0,
          },
        },
      };

      // Test retry mechanism with a valid operation
      const document = await this.productionRepo.create(sampleDoc);
      console.log(
        `  ✅ Created document with retry protection: ${document.id}`
      );

      // Test search with monitoring
      const searchResult = await this.productionRepo.searchWithMonitoring(
        'production test',
        { limit: 5 }
      );

      console.log(
        `  🔍 Search completed: ${searchResult.results.length} results in ${searchResult.performance.searchTime}ms`
      );

      // Test health check
      const health = await this.productionRepo.healthCheck();
      console.log(`  🏥 System health: ${health.status}`);
      console.log(
        `  📊 Circuit breaker failures: ${health.metrics.circuitBreakerFailures}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('  ❌ Error in error handling demo:', errorMessage);
    }

    console.log('');
  }

  private async demonstratePagination(): Promise<void> {
    console.log('📄 Pagination Patterns Demo:');

    try {
      // Create test documents
      const testDocs = Array.from({ length: 25 }, (_, i) => ({
        title: `Test Document ${i + 1}`,
        content: `Content for test document number ${i + 1}`,
        metadata: {
          title: `Test Document ${i + 1}`,
          category: 'pagination-test',
          status: 'active' as const,
          version: '1.0',
          checksum: `checksum-${i}`,
          sourceSystem: 'pagination-demo',
          lastSyncedAt: new Date().toISOString(),
          metadata: {
            size: 512,
            format: 'text',
            encoding: 'utf-8',
            language: 'en',
          },
          security: {
            classification: 'public' as const,
            owner: 'demo-user',
            accessLevel: 1,
          },
          audit: {
            createdBy: 'pagination-demo',
            modifiedBy: 'pagination-demo',
            modificationCount: 0,
          },
          performance: {
            queryCount: 0,
          },
        },
      }));

      const createResult = await this.productionRepo.createMany(testDocs);
      console.log(`  📚 Created ${createResult.successCount} test documents`);

      // Demonstrate cursor-based pagination
      console.log('  🔄 Cursor-based pagination:');
      let cursor: string | undefined;
      let pageNum = 1;
      let totalFetched = 0;

      do {
        const result = await this.productionRepo.findWithCursorPagination({
          cursor,
          limit: 10,
          where: { category: 'pagination-test' },
        });

        console.log(
          `    Page ${pageNum}: ${result.documents.length} documents`
        );
        console.log(`    Has more: ${result.hasMore}`);
        if (pageNum === 1 && result.totalEstimate) {
          console.log(`    Total estimate: ${result.totalEstimate}`);
        }

        totalFetched += result.documents.length;
        cursor = result.nextCursor;
        pageNum++;

        // Limit demo to 3 pages
        if (pageNum > 3) break;
      } while (cursor);

      console.log(`  📊 Total fetched with cursor pagination: ${totalFetched}`);

      // Demonstrate offset-based pagination
      console.log('  📄 Offset-based pagination:');
      const offsetResult = await this.productionRepo.findWithOffsetPagination({
        page: 1,
        limit: 10,
        where: { category: 'pagination-test' },
      });

      console.log(`    Page 1: ${offsetResult.documents.length} documents`);
      console.log(`    Total pages: ${offsetResult.pagination.totalPages}`);
      console.log(`    Total count: ${offsetResult.pagination.totalCount}`);
      console.log(`    Has next: ${offsetResult.pagination.hasNext}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('  ❌ Error in pagination demo:', errorMessage);
    }

    console.log('');
  }

  private async demonstrateBulkOperations(): Promise<void> {
    console.log('📦 Bulk Operations Demo:');

    try {
      // Prepare bulk import data
      const bulkDocs = Array.from({ length: 100 }, (_, i) => ({
        title: `Bulk Document ${i + 1}`,
        content: `This is bulk document number ${
          i + 1
        } with some content for testing bulk import functionality`,
        metadata: {
          title: `Bulk Document ${i + 1}`,
          category: 'bulk-test',
          status: 'active' as const,
          version: '1.0',
          checksum: `bulk-checksum-${i}`,
          sourceSystem: 'bulk-demo',
          lastSyncedAt: new Date().toISOString(),
          metadata: {
            size: 1024,
            format: 'text',
            encoding: 'utf-8',
            language: 'en',
          },
          security: {
            classification: 'public' as const,
            owner: 'bulk-demo-user',
            accessLevel: 1,
          },
          audit: {
            createdBy: 'bulk-demo',
            modifiedBy: 'bulk-demo',
            modificationCount: 0,
          },
          performance: {
            queryCount: 0,
          },
        },
      }));

      // Bulk import with progress tracking
      console.log(`  📥 Starting bulk import of ${bulkDocs.length} documents`);

      const importResult = await this.productionRepo.bulkImport(bulkDocs, {
        batchSize: 20,
        continueOnError: true,
        validate: true,
        onProgress: (processed, total, errors) => {
          const percentage = Math.round((processed / total) * 100);
          if (processed % 40 === 0 || processed === total) {
            console.log(
              `    📊 Progress: ${processed}/${total} (${percentage}%) - Errors: ${errors}`
            );
          }
        },
      });

      console.log(`  ✅ Bulk import completed:`);
      console.log(`    📥 Imported: ${importResult.imported}`);
      console.log(`    ❌ Failed: ${importResult.failed}`);
      console.log(`    ⏱️  Duration: ${importResult.duration}ms`);

      // Bulk export demo
      console.log('  📤 Starting bulk export');

      let exportedBatches = 0;
      const exportResult = await this.productionRepo.bulkExport({
        where: { category: 'bulk-test' },
        batchSize: 25,
        onBatch: async (batch, batchNumber) => {
          exportedBatches++;
          console.log(
            `    📦 Exported batch ${batchNumber}: ${batch.length} documents`
          );
        },
      });

      console.log(`  ✅ Bulk export completed:`);
      console.log(`    📤 Exported: ${exportResult.exported} documents`);
      console.log(`    📦 Batches: ${exportResult.batches}`);
      console.log(`    ⏱️  Duration: ${exportResult.duration}ms`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('  ❌ Error in bulk operations demo:', errorMessage);
    }

    console.log('');
  }

  private async demonstratePerformanceMonitoring(): Promise<void> {
    console.log('📊 Performance Monitoring Demo:');

    try {
      // Test search with performance monitoring
      const queries = [
        'bulk document testing',
        'production patterns',
        'pagination test',
      ];

      for (const query of queries) {
        const result = await this.productionRepo.searchWithMonitoring(query, {
          limit: 10,
        });

        console.log(`  🔍 Query: "${query}"`);
        console.log(`    📊 Results: ${result.performance.resultCount}`);
        console.log(`    ⏱️  Time: ${result.performance.searchTime}ms`);
        console.log(`    💾 Cache hit: ${result.performance.cacheHit}`);
      }

      // Monitor circuit breaker status
      const health = await this.productionRepo.healthCheck();
      console.log(
        `  🔧 Circuit breaker status: ${
          health.checks.circuitBreaker ? 'Closed' : 'Open'
        }`
      );
      console.log(
        `  📈 Performance status: ${
          health.checks.performance ? 'Good' : 'Degraded'
        }`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('  ❌ Error in performance monitoring demo:', errorMessage);
    }

    console.log('');
  }

  private async demonstrateHealthChecks(): Promise<void> {
    console.log('🏥 Health Check Demo:');

    try {
      const health = await this.productionRepo.healthCheck();

      console.log(`  🔍 Overall status: ${health.status}`);
      console.log(`  📊 Health checks:`);
      console.log(`    💾 Database: ${health.checks.database ? '✅' : '❌'}`);
      console.log(
        `    🔧 Circuit breaker: ${health.checks.circuitBreaker ? '✅' : '❌'}`
      );
      console.log(
        `    📈 Performance: ${health.checks.performance ? '✅' : '❌'}`
      );

      console.log(`  📈 Metrics:`);
      console.log(
        `    🔧 Circuit breaker failures: ${health.metrics.circuitBreakerFailures}`
      );

      if (health.metrics.averageResponseTime) {
        console.log(
          `    ⏱️  Average response time: ${health.metrics.averageResponseTime}ms`
        );
      }

      if (health.metrics.errorRate) {
        console.log(
          `    ❌ Error rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('  ❌ Error in health check demo:', errorMessage);
    }

    console.log('');
  }
}

// ============================================================================
// 4. MODULE DEFINITION
// ============================================================================

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
      enableHealthCheck: false,
    }),
  ],
  providers: [ProductionDocumentRepository, ProductionPatternsDemoService],
  exports: [ProductionDocumentRepository],
})
export class ProductionPatternsExampleModule {}

/**
 * Production Patterns Best Practices:
 *
 * 1. **Error Handling**: Implement circuit breakers and retry logic
 * 2. **Pagination**: Use cursor-based pagination for large datasets
 * 3. **Bulk Operations**: Process data in batches with progress tracking
 * 4. **Performance**: Monitor query times and implement timeouts
 * 5. **Health Checks**: Provide comprehensive system health monitoring
 * 6. **Security**: Validate and sanitize all input data
 * 7. **Logging**: Use structured logging for debugging and monitoring
 * 8. **Graceful Degradation**: Handle failures gracefully with fallbacks
 */
