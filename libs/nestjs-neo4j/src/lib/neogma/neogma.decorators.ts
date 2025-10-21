/**
 * @fileoverview Neogma dependency injection decorators
 */

import { Inject } from '@nestjs/common';
import { NeogmaService } from '../services/neogma.service';

/**
 * Decorator to inject NeogmaService (RECOMMENDED)
 *
 * Provides access to the complete Neogma API through NeogmaService including:
 * - neogma.getDriver() - Access to Neo4j driver
 * - neogma.getNeogmaInstance() - Access to raw Neogma instance
 * - neogma.run() - Execute Cypher queries
 * - neogma.createQueryBuilder() - Type-safe query building
 * - Model management, CRUD operations, transactions, and more
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(@InjectNeogma() private readonly neogma: NeogmaService) {
 *     // Access driver: this.neogma.getDriver()
 *     // Access raw Neogma: this.neogma.getNeogmaInstance()
 *   }
 * }
 * ```
 */
export const InjectNeogma = () => Inject(NeogmaService);

/**
 * Token for model injection
 */
export function getModelToken(modelName: string): string {
  return `NEOGMA_MODEL_${modelName}`;
}

/**
 * Decorator to inject Neogma model instance
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(@InjectModel('User') private readonly userModel: NeogmaModel) {}
 * }
 * ```
 */
export const InjectModel = (modelName: string) =>
  Inject(getModelToken(modelName));
