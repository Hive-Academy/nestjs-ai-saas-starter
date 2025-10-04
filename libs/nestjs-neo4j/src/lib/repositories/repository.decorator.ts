/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { Injectable, SetMetadata } from '@nestjs/common';
import 'reflect-metadata';
import {
  DECORATOR_METADATA_KEYS,
  type RepositoryConfig,
} from '../interfaces/decorator-metadata.interface';
import type { NeogmaEntity } from '../types/neogma-types';

/**
 * @Neo4jRepository decorator for repository pattern implementation
 *
 * Simplified metadata-only decorator using composition pattern.
 * Repositories use Neo4jCrudService for CRUD operations via dependency injection.
 *
 * Features:
 * - Stores entity metadata for introspection
 * - Applies @Injectable decorator for NestJS DI
 * - NO constructor wrapping or method auto-generation
 * - Clean composition via Neo4jCrudService
 *
 * @example
 * ```typescript
 * @Neo4jRepository(() => User)
 * @Injectable()
 * export class UserRepository {
 *   private readonly label = 'User';
 *
 *   constructor(
 *     private readonly crud: Neo4jCrudService,
 *     @InjectNeogma() private readonly neogma: NeogmaService
 *   ) {}
 *
 *   // Delegate CRUD to helper
 *   findById(id: string) {
 *     return this.crud.findById<User>(this.label, id);
 *   }
 *
 *   // Custom business logic
 *   async findByEmail(email: string) {
 *     const qb = this.neogma.createQueryBuilder();
 *     // ... custom query
 *   }
 * }
 * ```
 */
export function Neo4jRepository<TEntity extends NeogmaEntity = NeogmaEntity>(
  entityType: () => new () => TEntity
): ClassDecorator {
  return (constructor: Function) => {
    // Extract entity information
    const EntityClass = entityType();
    const label = getEntityLabel(EntityClass);

    // Create repository metadata
    const metadata: RepositoryConfig = {
      id: `Repository:${constructor.name}`,
      entityType,
      label,
      description: `Repository for ${label} entities`,
      tags: ['repository', label.toLowerCase()],
      enabled: true,
    };

    // Store metadata for introspection
    Reflect.defineMetadata(
      DECORATOR_METADATA_KEYS.REPOSITORY,
      metadata,
      constructor
    );

    // Also use SetMetadata for NestJS compatibility
    SetMetadata(DECORATOR_METADATA_KEYS.REPOSITORY, metadata)(constructor);

    // Apply @Injectable decorator for dependency injection
    Injectable()(constructor);
  };
}

/**
 * Extract entity label from entity class
 * Looks for @Neo4jEntity decorator metadata or falls back to class name
 */
function getEntityLabel(EntityClass: Function): string {
  // Try to get label from @Neo4jEntity decorator metadata
  const entityMetadata = Reflect.getMetadata('neo4j:entity:label', EntityClass);
  if (entityMetadata) {
    return entityMetadata;
  }

  // Fallback to class name
  return EntityClass.name;
}

/**
 * Simplified @Repository decorator (shorthand for @Neo4jRepository)
 */
export function Repository(
  entityType: () => new () => NeogmaEntity
): ClassDecorator {
  return Neo4jRepository(entityType);
}
