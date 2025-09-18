import { Inject } from '@nestjs/common';
import { CHROMADB_CLIENT } from '../constants';
import {
  getChromaDBConfig,
  getChromaDBConfigWithDefaults,
} from '../utils/chromadb-config.accessor';

/**
 * Decorator to inject ChromaDB service into a class property or constructor parameter
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @InjectChromaDB() private readonly chromaDBService: ChromaDBService,
 *   ) {}
 * }
 * ```
 */
export const InjectChromaDB = (): ParameterDecorator =>
  Inject('ChromaDBService');

/**
 * Decorator to inject ChromaDB client directly
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @InjectChromaDBClient() private readonly chromaClient: ChromaApi,
 *   ) {}
 * }
 * ```
 */
export const InjectChromaDBClient = (): ParameterDecorator =>
  Inject(CHROMADB_CLIENT);
