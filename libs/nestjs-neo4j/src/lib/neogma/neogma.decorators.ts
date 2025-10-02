/**
 * @fileoverview Neogma dependency injection decorators
 */

import { Inject } from '@nestjs/common';
import { NEOGMA_TOKEN } from './neogma.constants';

/**
 * Decorator to inject Neogma instance
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(@InjectNeogma() private readonly neogma: Neogma) {}
 * }
 * ```
 */
export const InjectNeogma = () => Inject(NEOGMA_TOKEN);

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
