/**
 * @fileoverview Repository Injection Decorators - TypeORM-Style DI Pattern
 *
 * Provides TypeORM-compatible decorators for repository dependency injection:
 * - getCollectionName(entity): Extract collection name from @ChromaEntity metadata
 * - getRepositoryToken(entity): Generate injection token for entity repository
 * - @InjectRepository(entity): Inject repository for entity
 *
 * These decorators enable zero-boilerplate repository injection following
 * the same pattern as TypeORM's @InjectRepository and Neo4j's pattern from TASK_2025_004.
 *
 * @example
 * ```typescript
 * // Service with repository injection
 * @Injectable()
 * export class MemoryService {
 *   constructor(
 *     @InjectRepository(MemoryDocument)
 *     private memoryRepo: ChromaDBRepository<MemoryDocument>
 *   ) {}
 *
 *   async getMemory(id: string) {
 *     return this.memoryRepo.findById(id);
 *   }
 * }
 *
 * // Custom repository injection
 * @Injectable()
 * export class MemoryService {
 *   constructor(
 *     @InjectRepository(MemoryDocument)
 *     private memoryRepo: MemoryRepository  // Custom repository class
 *   ) {}
 * }
 * ```
 *
 * @author backend-developer (ChromaDB TypeORM Migration)
 * @since 1.0.0 - Phase 1 TypeORM-style pattern implementation
 */

import { Inject, type Type } from '@nestjs/common';
import { CHROMA_ENTITY_METADATA_KEY } from './entity/entity.decorator';

/**
 * Extract collection name from @ChromaEntity decorator metadata
 *
 * This function reads the metadata stored by @ChromaEntity decorator
 * to retrieve the ChromaDB collection name for the entity.
 *
 * Mirrors getEntityLabel() from Neo4j pattern (TASK_2025_004)
 *
 * @param entity - Entity class decorated with @ChromaEntity
 * @returns Collection name string
 * @throws Error if entity does not have @ChromaEntity decorator
 *
 * @example
 * ```typescript
 * @ChromaEntity({ collection: 'memories' })
 * class MemoryDocument {}
 *
 * const collection = getCollectionName(MemoryDocument);  // 'memories'
 * ```
 */
export function getCollectionName(entity: Type<unknown>): string {
  // Try to get metadata from the entity
  let metadata: { collection?: string } | undefined;

  try {
    metadata = Reflect.getMetadata(CHROMA_ENTITY_METADATA_KEY, entity);
  } catch (error) {
    // Metadata not available
    metadata = undefined;
  }

  if (!metadata || !metadata.collection) {
    throw new Error(
      `Entity ${entity.name} does not have @ChromaEntity decorator. ` +
        `Please add @ChromaEntity decorator to the entity class.`
    );
  }

  return metadata.collection;
}

/**
 * Generate repository injection token for an entity
 *
 * Creates a consistent token format: `${collection}Repository`
 * This token is used by NestJS DI to identify the repository provider.
 *
 * Token Format:
 * - Entity with collection 'memories' → 'memoriesRepository'
 * - Entity with collection 'documents' → 'documentsRepository'
 *
 * Mirrors getRepositoryToken() from Neo4j pattern (TASK_2025_004)
 *
 * @param entity - Entity class decorated with @ChromaEntity
 * @returns Injection token string
 * @throws Error if entity does not have @ChromaEntity decorator
 *
 * @example
 * ```typescript
 * @ChromaEntity({ collection: 'memories' })
 * class MemoryDocument {}
 *
 * const token = getRepositoryToken(MemoryDocument);  // 'memoriesRepository'
 *
 * // Used internally by ChromaDBModule.forFeature()
 * providers: [
 *   {
 *     provide: getRepositoryToken(MemoryDocument),  // 'memoriesRepository'
 *     useFactory: (chromaDB) => new ChromaDBRepository(MemoryDocument, 'memories', chromaDB),
 *     inject: [ChromaDBService]
 *   }
 * ]
 * ```
 */
export function getRepositoryToken(entity: Type<unknown>): string {
  const collection = getCollectionName(entity);
  return `${collection}Repository`;
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
 * - Consistent with TypeORM/Mongoose/Neo4j patterns
 * - Full TypeScript type inference
 *
 * Mirrors InjectRepository() from Neo4j pattern (TASK_2025_004)
 *
 * @param entity - Entity class decorated with @ChromaEntity
 * @returns Parameter decorator for constructor injection
 *
 * @example
 * ```typescript
 * // Auto-generated repository (simple CRUD)
 * @Injectable()
 * export class MemoryService {
 *   constructor(
 *     @InjectRepository(MemoryDocument)
 *     private memoryRepo: ChromaDBRepository<MemoryDocument>
 *   ) {}
 *
 *   async getMemory(id: string) {
 *     return this.memoryRepo.findById(id);  // All CRUD methods available
 *   }
 * }
 *
 * // Custom repository (extends ChromaDBRepository<T>)
 * @Injectable()
 * export class MemoryRepository extends ChromaDBRepository<MemoryDocument> {
 *   constructor(chromaDB: ChromaDBService) {
 *     super(MemoryDocument, 'memories', chromaDB);
 *   }
 *
 *   async findByAgent(agentId: string) {
 *     // Custom method
 *     return this.findAll({ where: { agentId } as any });
 *   }
 * }
 *
 * @Injectable()
 * export class MemoryService {
 *   constructor(
 *     @InjectRepository(MemoryDocument)
 *     private memoryRepo: MemoryRepository  // Custom repository class
 *   ) {}
 *
 *   async getMemoriesByAgent(agentId: string) {
 *     return this.memoryRepo.findByAgent(agentId);  // Custom + CRUD methods
 *   }
 * }
 * ```
 */
export function InjectRepository(entity: Type<unknown>): ParameterDecorator {
  const token = getRepositoryToken(entity);
  return Inject(token);
}
