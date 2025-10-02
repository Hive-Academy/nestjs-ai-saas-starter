/**
 * @fileoverview Repository Module Exports
 *
 * Provides clean exports for all repository-related functionality.
 */

// Main decorator and factory
export { ChromaRepository, createRepository } from './repository-decorator';

// Type definitions and interfaces
export type {
  ChromaRepositoryConfig,
  RepositoryOperationOptions,
  RepositorySearchOptions,
  RepositoryOperationResult,
  RepositorySearchResultWithScore,
  ChromaRepository as ChromaRepositoryInterface,
  RepositoryConstructor,
  RepositoryInstance,
  RepositoryFactory,
  ExtractDocumentType,
  ExtractMetadataType,
} from './repository-metadata';

// Type guards
export { isChromaRepository, isChromaDBService } from './repository-metadata';

// Base repository interface (for compatibility)
export {
  BaseChromaRepository,
  isBaseChromaRepository,
  type RepositoryConstructor as BaseRepositoryConstructor,
  type RepositoryOperationOptions as BaseRepositoryOperationOptions,
  type RepositorySearchOptions as BaseRepositorySearchOptions,
  type RepositoryOperationResult as BaseRepositoryOperationResult,
  type SearchResultWithScore,
  type CreateDocumentInput,
} from './base-repository.interface';

// Validation and error handling utilities
export {
  RepositoryValidator,
  RepositoryErrorHandler,
  RepositoryTypeSafety,
  repositoryValidator,
  repositoryErrorHandler,
  repositoryTypeSafety,
} from './repository-validator';

// Implementation class (for advanced usage)
export { RepositoryImplementation } from './repository-implementation';
