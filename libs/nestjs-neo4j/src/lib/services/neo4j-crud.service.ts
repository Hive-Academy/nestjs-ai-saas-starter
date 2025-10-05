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
 * Neo4jCrudService - Internal CRUD Helper for Neo4jRepositoryBase
 *
 * Provides reusable CRUD operations used by Neo4jRepositoryBase.
 * This service is automatically injected and used internally by the base repository class.
 *
 * **Note**: You should NOT use this service directly in your code. Instead:
 * - For simple CRUD: Use auto-generated repositories via Neo4jModule.forFeature()
 * - For custom logic: Extend Neo4jRepositoryBase<T> and add custom methods
 *
 * @example TypeORM-Style Repository (RECOMMENDED)
 * ```typescript
 * // 1. Auto-generated repository (zero code needed)
 * @Module({
 *   imports: [Neo4jModule.forFeature([User])]
 * })
 * export class UserModule {}
 *
 * // 2. Inject and use immediately
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepositoryBase<User>
 *   ) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findById(id); // Works immediately!
 *   }
 * }
 *
 * // 3. Custom repository (if needed)
 * @Injectable()
 * export class UserRepository extends Neo4jRepositoryBase<User> {
 *   // Inherits all CRUD methods
 *
 *   // Add custom business logic
 *   async findByEmail(email: string) {
 *     return this.findAll({ where: { email } });
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
