import { Injectable } from '@nestjs/common';
import { InjectNeogma } from '../neogma/neogma.decorators';
import type { NeogmaService } from './neogma.service';
import type { NeogmaEntity } from '../types/neogma-types';

/**
 * FindOptions for querying entities with filters, sorting, and pagination
 */
export interface FindOptions<T = NeogmaEntity> {
  where?: Partial<T>;
  orderBy?: Array<{ [K in keyof T]?: 'ASC' | 'DESC' }>;
  limit?: number;
  skip?: number;
}

/**
 * Neo4jCrudService - Composition Helper for Repository Pattern
 *
 * Provides reusable CRUD operations via dependency injection and composition.
 * Replaces inheritance-based BaseRepositoryService with clean composition pattern.
 *
 * This service is injected into repositories and delegated to for common operations,
 * allowing repositories to focus on custom business logic while reusing CRUD functionality.
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
 *   // Custom business logic using neogma directly
 *   async findByEmail(email: string) {
 *     const qb = this.neogma.createQueryBuilder();
 *     // ... custom query
 *   }
 * }
 * ```
 */
@Injectable()
export class Neo4jCrudService {
  constructor(@InjectNeogma() private readonly neogma: NeogmaService) {}

  /**
   * Find a single entity by ID
   *
   * @param label - Neo4j node label (e.g., 'User', 'Product')
   * @param id - Entity ID
   * @returns Entity if found, null otherwise
   */
  async findById<T extends NeogmaEntity>(
    label: string,
    id: string
  ): Promise<T | null> {
    return this.neogma.findById<T>(label, id);
  }

  /**
   * Find multiple entities with optional filtering, sorting, and pagination
   *
   * @param label - Neo4j node label
   * @param options - Query options (where, orderBy, limit, skip)
   * @returns Array of entities matching the criteria
   */
  async findAll<T extends NeogmaEntity>(
    label: string,
    options?: FindOptions<T>
  ): Promise<T[]> {
    return this.neogma.findMany<T>(label, options);
  }

  /**
   * Create a new entity
   *
   * @param label - Neo4j node label
   * @param data - Entity data (id, createdAt, updatedAt auto-generated)
   * @returns Created entity with generated fields
   */
  async create<T extends NeogmaEntity>(
    label: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    return this.neogma.create<T>(label, data);
  }

  /**
   * Update an existing entity
   *
   * @param label - Neo4j node label
   * @param id - Entity ID
   * @param data - Partial entity data to update
   * @returns Updated entity if found, null otherwise
   */
  async update<T extends NeogmaEntity>(
    label: string,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    return this.neogma.update<T>(label, id, data);
  }

  /**
   * Delete an entity by ID
   *
   * @param label - Neo4j node label
   * @param id - Entity ID
   * @param detach - If true, detach relationships before deletion (default: true)
   * @returns True if deleted, false if not found
   */
  async delete(label: string, id: string, detach = true): Promise<boolean> {
    return this.neogma.delete(label, id, detach);
  }

  /**
   * Count entities with optional filtering
   *
   * @param label - Neo4j node label
   * @param where - Optional filter conditions
   * @returns Number of entities matching the criteria
   */
  async count<T extends NeogmaEntity>(
    label: string,
    where?: Partial<T>
  ): Promise<number> {
    return this.neogma.count<T>(label, where);
  }

  /**
   * Check if an entity exists by ID
   *
   * @param label - Neo4j node label
   * @param id - Entity ID
   * @returns True if entity exists, false otherwise
   */
  async exists(label: string, id: string): Promise<boolean> {
    return this.neogma.exists(label, id);
  }
}
