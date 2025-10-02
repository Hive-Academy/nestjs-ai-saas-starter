/**
 * @fileoverview @ChromaRepository Decorator - Main Decorator Implementation
 *
 * This decorator automatically generates CRUD operations with type safety,
 * eliminating boilerplate code for standard vector database operations.
 *
 * Uses composition pattern instead of mixins to avoid TypeScript constructor issues.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ChromaDBService } from '../../services/chromadb.service';
import type { BaseDocument } from '../../types/core.interface';
import {
  DecoratorMetadataBuilder,
  DecoratorMetadataRegistry,
} from '../core/decorator-metadata';
import { RepositoryImplementation } from './repository-implementation';
import type {
  ChromaRepository,
  ChromaRepositoryConfig,
} from './repository-metadata';
import { isChromaDBService } from './repository-metadata';

// ========================================
// Decorator Factory
// ========================================

/**
 * @ChromaRepository decorator for auto-generating repository methods
 *
 * @example
 * ```typescript
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 *   age: number;
 * }> {}
 *
 * @Injectable()
 * @ChromaRepository({
 *   collection: 'users',
 *   autoEmbed: true,
 *   enableCaching: true,
 *   enableValidation: true,
 *   autoTimestamp: true,
 * })
 * export class UserRepository extends BaseChromaRepository<UserDocument> {
 *   constructor(private readonly chromaService: ChromaDBService) {
 *     super();
 *   }
 *
 *   // All CRUD methods inherited from BaseChromaRepository with full type safety
 *   // No need for `!` assertions
 *
 *   // You can add custom methods with full access to base functionality
 *   async findByEmail(email: string): Promise<UserDocument | null> {
 *     const results = await this.findAll({ where: { email } });
 *     return results[0] || null;
 *   }
 *
 *   async findAdults(): Promise<UserDocument[]> {
 *     return this.findAll({ where: { age: { $gte: 18 } } });
 *   }
 * }
 * ```
 */
export function ChromaRepository<TDocument extends BaseDocument = BaseDocument>(
  config: ChromaRepositoryConfig
) {
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    // Store decorator metadata
    const metadata = DecoratorMetadataBuilder.createCoreMetadata(
      'ChromaRepository',
      'class',
      config as unknown as Record<string, unknown>
    );

    DecoratorMetadataRegistry.setMetadata(
      constructor,
      'ChromaRepository',
      metadata
    );

    // Create enhanced class that implements the repository pattern
    // Uses composition instead of complex mixins to avoid constructor issues
    class RepositoryEnhanced extends constructor {
      private readonly logger = new Logger(constructor.name);
      private repositoryImpl: RepositoryImplementation<TDocument> | null = null;

      constructor(...args: any[]) {
        // Call parent constructor with all arguments
        super(...args);

        // Initialize repository implementation after construction
        this.initializeRepository(args);
      }

      private initializeRepository(args: any[]): void {
        try {
          // Find ChromaDBService in constructor arguments
          const chromaService = this.findChromaService(args);

          // Create repository implementation instance
          this.repositoryImpl = new RepositoryImplementation<TDocument>(
            config,
            chromaService
          );

          // Bind all repository methods to this instance
          this.bindRepositoryMethods();
        } catch (error) {
          this.logger.error(
            'Failed to initialize repository implementation',
            error
          );
          throw error;
        }
      }

      private findChromaService(args: any[]): ChromaDBService {
        // Look for ChromaDBService in constructor arguments
        for (const arg of args) {
          if (isChromaDBService(arg)) {
            return arg;
          }
        }

        throw new Error(
          `ChromaDBService not found in constructor arguments for ${constructor.name}. ` +
            'Please inject ChromaDBService as one of the constructor parameters.'
        );
      }

      private bindRepositoryMethods(): void {
        if (!this.repositoryImpl) {
          throw new Error('Repository implementation not initialized');
        }

        const methods: (keyof ChromaRepository<TDocument>)[] = [
          'create',
          'createMany',
          'findById',
          'findByIds',
          'findAll',
          'update',
          'updateMany',
          'upsert',
          'upsertMany',
          'delete',
          'deleteMany',
          'deleteByFilter',
          'search',
          'searchWithScores',
          'searchSimilar',
          'count',
          'exists',
          'peek',
          'clear',
          'getCollectionInfo',
        ];

        for (const methodName of methods) {
          const originalMethod = this.repositoryImpl[methodName] as any;
          if (typeof originalMethod === 'function') {
            (this as any)[methodName] = originalMethod.bind(
              this.repositoryImpl
            );
          }
        }
      }

      protected getRepositoryImpl(): RepositoryImplementation<TDocument> {
        if (!this.repositoryImpl) {
          throw new Error('Repository implementation not initialized');
        }
        return this.repositoryImpl;
      }

      protected getChromaService(): ChromaDBService {
        return this.getRepositoryImpl()['chromaService'];
      }

      protected chromaService: ChromaDBService = this.getChromaService();
    }

    return RepositoryEnhanced as T;
  };
}

// ========================================
// Factory Function
// ========================================

/**
 * Type-safe repository factory function for programmatic creation
 */
export function createRepository<TDocument extends BaseDocument>(
  config: ChromaRepositoryConfig,
  chromaService: ChromaDBService
): ChromaRepository<TDocument> {
  @Injectable()
  @ChromaRepository<TDocument>(config)
  class RepositoryImpl implements ChromaRepository<TDocument> {
    constructor(public readonly chromaService: ChromaDBService) {}

    // Type placeholders - these will be implemented by the decorator
    create!: ChromaRepository<TDocument>['create'];
    createMany!: ChromaRepository<TDocument>['createMany'];
    findById!: ChromaRepository<TDocument>['findById'];
    findByIds!: ChromaRepository<TDocument>['findByIds'];
    findAll!: ChromaRepository<TDocument>['findAll'];
    update!: ChromaRepository<TDocument>['update'];
    updateMany!: ChromaRepository<TDocument>['updateMany'];
    upsert!: ChromaRepository<TDocument>['upsert'];
    upsertMany!: ChromaRepository<TDocument>['upsertMany'];
    delete!: ChromaRepository<TDocument>['delete'];
    deleteMany!: ChromaRepository<TDocument>['deleteMany'];
    deleteByFilter!: ChromaRepository<TDocument>['deleteByFilter'];
    search!: ChromaRepository<TDocument>['search'];
    searchWithScores!: ChromaRepository<TDocument>['searchWithScores'];
    searchSimilar!: ChromaRepository<TDocument>['searchSimilar'];
    count!: ChromaRepository<TDocument>['count'];
    exists!: ChromaRepository<TDocument>['exists'];
    peek!: ChromaRepository<TDocument>['peek'];
    clear!: ChromaRepository<TDocument>['clear'];
    getCollectionInfo!: ChromaRepository<TDocument>['getCollectionInfo'];
  }

  return new RepositoryImpl(chromaService);
}

// ========================================
// Usage Examples
// ========================================

/**
 * Example usage:
 *
 * @example Complete repository with custom methods
 * ```typescript
 * interface UserDocument extends BaseDocument<{
 *   name: string;
 *   email: string;
 *   age: number;
 *   role: 'user' | 'admin';
 * }> {}
 *
 * @Injectable()
 * @ChromaRepository({
 *   collection: 'users',
 *   autoEmbed: true,
 *   enableCaching: true,
 *   enableValidation: true,
 *   autoTimestamp: true,
 *   autoGenerateIds: true,
 * })
 * export class UserRepository implements ChromaRepository<UserDocument> {
 *   constructor(private chromaService: ChromaDBService) {}
 *
 *   // Custom business logic methods
 *   async findByEmail(email: string): Promise<UserDocument | null> {
 *     const users = await this.findAll({ where: { email } });
 *     return users[0] || null;
 *   }
 *
 *   async findAdults(): Promise<UserDocument[]> {
 *     return this.findAll({ where: { age: { $gte: 18 } } });
 *   }
 *
 *   async searchByRole(query: string, role: 'user' | 'admin'): Promise<UserDocument[]> {
 *     return this.search(query, { where: { role }, limit: 20 });
 *   }
 *
 *   // Access to underlying services for advanced operations
 *   async customOperation(): Promise<void> {
 *     const chromaService = this.getChromaService();
 *     // Use chromaService directly for complex operations
 *   }
 * }
 * ```
 */
