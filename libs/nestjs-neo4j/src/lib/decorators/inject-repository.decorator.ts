/**
 * @fileoverview Repository Injection Decorators - TypeORM-Style DI Pattern
 *
 * Provides TypeORM-compatible decorators for repository dependency injection:
 * - getRepositoryToken(entity): Generate injection token for entity repository
 * - @InjectRepository(entity): Inject repository for entity
 *
 * These decorators enable zero-boilerplate repository injection following
 * the same pattern as TypeORM's @InjectRepository.
 *
 * @example
 * ```typescript
 * // Service with repository injection
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepository<User>
 *   ) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findById(id);
 *   }
 * }
 *
 * // Custom repository injection
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: UserRepository  // Custom repository class
 *   ) {}
 * }
 * ```
 *
 * @author backend-developer (TASK_2025_004)
 * @since 2.0.0 - Phase 1 TypeORM-style pattern implementation
 */

import { Inject, type Type } from '@nestjs/common';
import { DECORATOR_METADATA_KEYS } from '../interfaces/decorator-metadata.interface';

/**
 * Extract entity label from @Neo4jEntity decorator metadata
 *
 * This function reads the metadata stored by @Neo4jEntity decorator
 * to retrieve the Neo4j label for the entity.
 *
 * @param entity - Entity class decorated with @Neo4jEntity
 * @returns Neo4j label string
 * @throws Error if entity does not have @Neo4jEntity decorator
 *
 * @example
 * ```typescript
 * @Neo4jEntity('User')
 * class User {}
 *
 * const label = getEntityLabel(User);  // 'User'
 * ```
 */
export function getEntityLabel(entity: Type<unknown>): string {
  // Try to get metadata from the entity
  let metadata: { label?: string } | undefined;

  try {
    metadata = Reflect.getMetadata(DECORATOR_METADATA_KEYS.ENTITY, entity);
  } catch (error) {
    // Metadata not available
    metadata = undefined;
  }

  if (!metadata || !metadata.label) {
    throw new Error(
      `Entity ${entity.name} does not have @Neo4jEntity decorator. ` +
        `Please add @Neo4jEntity decorator to the entity class.`
    );
  }

  return metadata.label;
}

/**
 * Generate repository injection token for an entity
 *
 * Creates a consistent token format: `${label}Repository`
 * This token is used by NestJS DI to identify the repository provider.
 *
 * Token Format:
 * - Entity with label 'User' → 'UserRepository'
 * - Entity with label 'Post' → 'PostRepository'
 *
 * @param entity - Entity class decorated with @Neo4jEntity
 * @returns Injection token string
 * @throws Error if entity does not have @Neo4jEntity decorator
 *
 * @example
 * ```typescript
 * @Neo4jEntity('User')
 * class User {}
 *
 * const token = getRepositoryToken(User);  // 'UserRepository'
 *
 * // Used internally by Neo4jModule.forFeature()
 * providers: [
 *   {
 *     provide: getRepositoryToken(User),  // 'UserRepository'
 *     useFactory: (neogma, crud) => new Neo4jRepository(User, 'User', neogma, crud),
 *     inject: [NeogmaService, Neo4jCrudService]
 *   }
 * ]
 * ```
 */
export function getRepositoryToken(entity: Type<unknown>): string {
  const label = getEntityLabel(entity);
  return `${label}Repository`;
}

/**
 * TypeORM-style repository injection decorator
 *
 * Injects the repository for the specified entity into a constructor parameter.
 * Works with both auto-generated repositories and custom repository classes.
 *
 * Features:
 * - Type-safe repository injection
 * - Works with auto-generated and custom repositories
 * - Consistent with TypeORM/Mongoose patterns
 * - Full TypeScript type inference
 *
 * @param entity - Entity class decorated with @Neo4jEntity
 * @returns Parameter decorator for constructor injection
 *
 * @example
 * ```typescript
 * // Auto-generated repository (simple CRUD)
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepository<User>
 *   ) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findById(id);  // All CRUD methods available
 *   }
 * }
 *
 * // Custom repository (extends Neo4jRepository<T>)
 * @Injectable()
 * export class UserRepository extends Neo4jRepository<User> {
 *   async findByEmail(email: string) {
 *     // Custom method
 *   }
 * }
 *
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: UserRepository  // Custom repository class
 *   ) {}
 *
 *   async getUserByEmail(email: string) {
 *     return this.userRepo.findByEmail(email);  // Custom + CRUD methods
 *   }
 * }
 * ```
 */
export function InjectRepository(entity: Type<unknown>): ParameterDecorator {
  const token = getRepositoryToken(entity);
  return Inject(token);
}
