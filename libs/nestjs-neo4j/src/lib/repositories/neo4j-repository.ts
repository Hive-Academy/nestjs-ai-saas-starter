/**
 * @fileoverview Neo4jRepository<T> - TypeORM-Style Auto-Generated Repository
 *
 * This is the base repository class that provides automatic CRUD operations for any Neo4j entity.
 * It follows the TypeORM/Mongoose pattern with zero-boilerplate CRUD for simple repositories
 * and extension support for custom business logic.
 *
 * Features:
 * - 9 CRUD operations (findById, findAll, findOne, create, update, delete, count, exists, save)
 * - 7 helper methods for custom repositories (createQueryBuilder, executeQuery, etc.)
 * - Full TypeScript type safety with generic type parameter
 * - Composition pattern with Neo4jCrudService
 * - Protected properties for subclass access
 * - Zero 'any' types (strict TypeScript compliance)
 *
 * @example
 * ```typescript
 * // Simple CRUD (no custom repository needed)
 * @Module({
 *   imports: [Neo4jModule.forFeature([User])]
 * })
 * export class UserModule {}
 *
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectRepository(User)
 *     private userRepo: Neo4jRepository<User>
 *   ) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findById(id);  // Works immediately
 *   }
 * }
 *
 * // Custom repository (extends base class)
 * @Injectable()
 * export class UserRepository extends Neo4jRepository<User> {
 *   constructor(
 *     neogma: NeogmaService,
 *     crud: Neo4jCrudService
 *   ) {
 *     super(User, 'User', neogma, crud);
 *   }
 *
 *   // Inherits all CRUD methods + add custom methods
 *   async findByEmail(email: string): Promise<User | null> {
 *     const qb = this.createQueryBuilder();  // Helper from base class
 *     // ... custom query logic
 *   }
 * }
 * ```
 *
 * @author backend-developer (TASK_2025_004)
 * @since 2.0.0 - Phase 1 TypeORM-style pattern implementation
 */

import type { Type } from '@nestjs/common';
import type { NeogmaService } from '../services/neogma.service';
import type {
  Neo4jCrudService,
  FindOptions,
} from '../services/neo4j-crud.service';
import type { NeogmaEntity } from '../types/neogma-types';
import type { QueryBuilder } from 'neogma';
import type { QueryResult } from '../types/neogma-types';

/**
 * TypeORM-style base repository for Neo4j entities
 *
 * Provides automatic CRUD operations via composition with Neo4jCrudService
 * and helper methods for custom repository implementations.
 *
 * Design Principles:
 * - Composition over Inheritance (uses Neo4jCrudService)
 * - SOLID principles (Single Responsibility, Open/Closed, Dependency Inversion)
 * - DRY (Don't Repeat Yourself) - CRUD logic centralized
 * - Type Safety - Full generic type propagation
 *
 * @template T Entity type extending NeogmaEntity
 */
export class Neo4jRepository<T extends NeogmaEntity> {
  /**
   * Constructor for Neo4jRepository
   *
   * @param entity - Entity class (Type<T>)
   * @param label - Neo4j node label
   * @param neogma - NeogmaService instance for raw queries
   * @param crud - Neo4jCrudService instance for CRUD operations
   */
  constructor(
    protected readonly entity: Type<T>,
    protected readonly label: string,
    protected readonly neogma: NeogmaService,
    protected readonly crud: Neo4jCrudService
  ) {}

  // ==================== CRUD OPERATIONS (9 methods) ====================

  /**
   * Find a single entity by ID
   *
   * @param id - Entity ID
   * @returns Entity if found, null otherwise
   *
   * @example
   * ```typescript
   * const user = await userRepo.findById('user-123');
   * if (user) {
   *   console.log(user.name);
   * }
   * ```
   */
  async findById(id: string): Promise<T | null> {
    return this.crud.findById<T>(this.label, id);
  }

  /**
   * Find multiple entities with optional filtering, sorting, and pagination
   *
   * @param options - Query options (where, orderBy, limit, skip)
   * @returns Array of entities matching the criteria
   *
   * @example
   * ```typescript
   * // Find all active users, ordered by name, limit 10
   * const users = await userRepo.findAll({
   *   where: { isActive: true },
   *   orderBy: [{ name: 'ASC' }],
   *   limit: 10
   * });
   * ```
   */
  async findAll(options?: FindOptions<T>): Promise<T[]> {
    return this.crud.findAll<T>(this.label, options);
  }

  /**
   * Find a single entity matching the criteria
   *
   * @param options - Query options (where, orderBy)
   * @returns First entity matching criteria, or null
   *
   * @example
   * ```typescript
   * const user = await userRepo.findOne({
   *   where: { email: 'user@example.com' }
   * });
   * ```
   */
  async findOne(options: FindOptions<T>): Promise<T | null> {
    const results = await this.findAll({ ...options, limit: 1 });
    return results[0] || null;
  }

  /**
   * Create a new entity
   *
   * Note: id, createdAt, and updatedAt are automatically generated
   *
   * @param data - Entity data (without id, createdAt, updatedAt)
   * @returns Created entity with generated fields
   *
   * @example
   * ```typescript
   * const newUser = await userRepo.create({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * console.log(newUser.id);  // Auto-generated UUID
   * ```
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return this.crud.create<T>(this.label, data);
  }

  /**
   * Update an existing entity
   *
   * Note: updatedAt is automatically updated
   *
   * @param id - Entity ID
   * @param data - Partial entity data to update
   * @returns Updated entity if found, null otherwise
   *
   * @example
   * ```typescript
   * const updated = await userRepo.update('user-123', {
   *   name: 'Jane Doe'
   * });
   * ```
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.crud.update<T>(this.label, id, data);
  }

  /**
   * Delete an entity by ID
   *
   * @param id - Entity ID
   * @param detach - If true, detach relationships before deletion (default: true)
   * @returns True if deleted, false if not found
   *
   * @example
   * ```typescript
   * // Delete user and detach all relationships
   * const deleted = await userRepo.delete('user-123');
   *
   * // Delete user without detaching relationships (will fail if relationships exist)
   * const deleted = await userRepo.delete('user-123', false);
   * ```
   */
  async delete(id: string, detach = true): Promise<boolean> {
    return this.crud.delete(this.label, id, detach);
  }

  /**
   * Count entities with optional filtering
   *
   * @param where - Optional filter conditions
   * @returns Number of entities matching the criteria
   *
   * @example
   * ```typescript
   * // Count all users
   * const total = await userRepo.count();
   *
   * // Count active users
   * const activeCount = await userRepo.count({ isActive: true });
   * ```
   */
  async count(where?: Partial<T>): Promise<number> {
    return this.crud.count<T>(this.label, where);
  }

  /**
   * Check if an entity exists by ID
   *
   * @param id - Entity ID
   * @returns True if entity exists, false otherwise
   *
   * @example
   * ```typescript
   * if (await userRepo.exists('user-123')) {
   *   console.log('User exists');
   * }
   * ```
   */
  async exists(id: string): Promise<boolean> {
    return this.crud.exists(this.label, id);
  }

  /**
   * Save an entity (create if new, update if exists)
   *
   * Determines operation based on presence of 'id' field
   *
   * @param data - Partial entity data
   * @returns Saved entity
   *
   * @example
   * ```typescript
   * // Create new entity (no id field)
   * const newUser = await userRepo.save({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   *
   * // Update existing entity (has id field)
   * const updated = await userRepo.save({
   *   id: 'user-123',
   *   name: 'Jane Doe'
   * });
   * ```
   */
  async save(data: Partial<T>): Promise<T> {
    if ('id' in data && data.id) {
      const existing = await this.findById(data.id as string);
      if (existing) {
        return (await this.update(data.id as string, data)) as T;
      }
    }
    return this.create(data as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
  }

  // ==================== HELPER METHODS FOR CUSTOM REPOSITORIES (7 methods) ====================

  /**
   * Create a Neogma QueryBuilder instance for custom queries
   *
   * @returns QueryBuilder instance
   *
   * @example
   * ```typescript
   * async findByEmail(email: string): Promise<User | null> {
   *   const qb = this.createQueryBuilder();
   *   const bindParam = qb.getBindParam();
   *   const emailParam = bindParam.add(email);
   *
   *   qb.match(`(u:${this.label})`)
   *     .where(`u.email = $${emailParam}`)
   *     .return('u');
   *
   *   const result = await this.executeQuery(qb.getStatement(), bindParam.get());
   *   return result.records[0]?.get('u').properties || null;
   * }
   * ```
   */
  createQueryBuilder(): QueryBuilder {
    return this.neogma.createQueryBuilder();
  }

  /**
   * Execute a raw Cypher query
   *
   * IMPORTANT: Always use parameterized queries to prevent Cypher injection
   *
   * @param cypher - Cypher query string
   * @param params - Query parameters (default: {})
   * @returns Query result with records and summary
   *
   * @example
   * ```typescript
   * async findActiveUsers(): Promise<User[]> {
   *   const result = await this.executeQuery<User[]>(
   *     `MATCH (u:User {isActive: $isActive}) RETURN u`,
   *     { isActive: true }
   *   );
   *   return result.records.map(r => r.get('u').properties);
   * }
   * ```
   */
  async executeQuery<R = QueryResult>(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<R> {
    return this.neogma.run(cypher, params) as Promise<R>;
  }

  /**
   * Create a relationship between two nodes
   *
   * @param fromId - Source node ID
   * @param toId - Target node ID
   * @param type - Relationship type (e.g., 'FRIEND', 'FOLLOWS')
   * @param properties - Optional relationship properties
   *
   * @example
   * ```typescript
   * // Create FRIEND relationship
   * await userRepo.createRelationship('user-1', 'user-2', 'FRIEND', {
   *   since: new Date(),
   *   strength: 0.8
   * });
   * ```
   */
  async createRelationship(
    fromId: string,
    toId: string,
    type: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const qb = this.createQueryBuilder();
    const bindParam = qb.getBindParam();
    const fromIdParam = bindParam.add(fromId);
    const toIdParam = bindParam.add(toId);
    const propsParam = properties ? bindParam.add(properties) : null;

    qb.match(`(from:${this.label})`)
      .where(`from.id = $${fromIdParam}`)
      .match(`(to)`)
      .where(`to.id = $${toIdParam}`)
      .create(`(from)-[r:${type}${propsParam ? ` $${propsParam}` : ''}]->(to)`)
      .return('r');

    await this.executeQuery(qb.getStatement(), bindParam.get());
  }

  /**
   * Find related nodes via a specific relationship type
   *
   * @param id - Source node ID
   * @param relationshipType - Relationship type (e.g., 'FRIEND', 'FOLLOWS')
   * @param direction - Relationship direction (OUT, IN, or BOTH)
   * @returns Array of related nodes
   *
   * @example
   * ```typescript
   * // Find all friends (outgoing FRIEND relationships)
   * const friends = await userRepo.findRelated<User>('user-123', 'FRIEND', 'OUT');
   *
   * // Find all followers (incoming FOLLOWS relationships)
   * const followers = await userRepo.findRelated<User>('user-123', 'FOLLOWS', 'IN');
   *
   * // Find all connected users (both directions)
   * const connected = await userRepo.findRelated<User>('user-123', 'CONNECTED', 'BOTH');
   * ```
   */
  async findRelated<R = T>(
    id: string,
    relationshipType: string,
    direction: 'OUT' | 'IN' | 'BOTH' = 'OUT'
  ): Promise<R[]> {
    const qb = this.createQueryBuilder();
    const bindParam = qb.getBindParam();
    const idParam = bindParam.add(id);

    const pattern =
      direction === 'OUT'
        ? `(from:${this.label})-[:${relationshipType}]->(related)`
        : direction === 'IN'
        ? `(from:${this.label})<-[:${relationshipType}]-(related)`
        : `(from:${this.label})-[:${relationshipType}]-(related)`;

    qb.match(pattern).where(`from.id = $${idParam}`).return('related');

    const result = await this.executeQuery<QueryResult>(
      qb.getStatement(),
      bindParam.get()
    );
    return result.records.map((r) => r.get('related').properties as R);
  }

  /**
   * Get the Neo4j label for this repository's entity
   *
   * @returns Neo4j node label
   *
   * @example
   * ```typescript
   * console.log(userRepo.getLabel());  // 'User'
   * ```
   */
  getLabel(): string {
    return this.label;
  }

  /**
   * Get the entity class (Type<T>)
   *
   * Useful for reflection and metadata operations
   *
   * @returns Entity class constructor
   *
   * @example
   * ```typescript
   * const EntityClass = userRepo.getEntity();
   * const instance = new EntityClass();
   * ```
   */
  getEntity(): Type<T> {
    return this.entity;
  }

  /**
   * Get the NeogmaService instance
   *
   * Provides direct access to low-level Neogma operations
   * Use with caution - prefer repository methods for common operations
   *
   * @returns NeogmaService instance
   *
   * @example
   * ```typescript
   * // Access NeogmaService for advanced operations
   * const neogma = userRepo.getNeogmaService();
   * const metrics = neogma.getMetrics();
   * ```
   */
  getNeogmaService(): NeogmaService {
    return this.neogma;
  }
}
