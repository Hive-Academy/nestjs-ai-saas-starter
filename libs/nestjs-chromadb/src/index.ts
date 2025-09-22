// Module
export * from './lib/nestjs-chromadb.module';

// Services
export type {
  PerformanceConfig,
  OperationMetrics as ChromaDBOperationMetrics,
} from './lib/services/chromadb.service';
export { ChromaDBService } from './lib/services/chromadb.service';
export * from './lib/services/collection.service';
export * from './lib/services/embedding.service';
export * from './lib/services/chroma-admin.service';
export * from './lib/services/text-splitter.service';
export * from './lib/services/metadata-extractor.service';

//  Services
export type { AggregatedMetrics } from './lib/services/chroma-metrics.service';
export { ChromaMetricsService } from './lib/services/chroma-metrics.service';
export { ChromaCacheService } from './lib/services/chroma-cache.service';

// Interfaces
export type * from './lib/interfaces/chromadb-module-options.interface';
export type * from './lib/interfaces/chromadb-service.interface';
export type * from './lib/interfaces/embedding-function.interface';
export type * from './lib/interfaces/embedding-service.interface';

// Type Safety Foundation
export type {
  CollectionConfig as CollectionNamesConfig,
  CollectionRegistry,
} from './lib/types/collection-names.type';
export * from './lib/types/document-types.interface';

// Decorators - Core Ecosystem
export * from './lib/decorators';

// Legacy Decorators (backward compatibility)
export * from './lib/decorators/inject-chromadb.decorator';
export * from './lib/decorators/inject-collection.decorator';
export * from './lib/decorators/embed.decorator';

// Health Indicators
export * from './lib/health/chromadb.health';

// Embedding Providers
export * from './lib/embeddings/base.embedding';
export * from './lib/embeddings/openai.embedding';
export * from './lib/embeddings/huggingface.embedding';
export * from './lib/embeddings/cohere.embedding';
export * from './lib/embeddings/custom.embedding';

// Utilities
export * from './lib/utils/vector.utils';
export {
  sanitizeMetadata,
  validateMetadata as validateMetadataFormat,
  mergeMetadata,
  filterMetadata,
  extractMetadataFields,
  metadataToWhereClause,
  addDefaultMetadata,
  formatMetadataForDisplay,
  validateMetadataSchema,
  type MetadataSchema,
} from './lib/utils/metadata.utils';

// Errors
export * from './lib/errors/chromadb.errors';

// Validation
export {
  isEmbeddingVector,
  isValidDocumentId,
  isValidMetadata,
  isMetadataFilterOperator,
  isMetadataFilterCondition,
  isValidMetadataFilter,
  isValidDocumentFilter,
  isValidChromaDocument,
  isValidChromaDocumentArray,
  isValidSearchOptions,
  isValidBulkOptions,
  isValidCollectionName,
  isValidEmbeddingConfig,
  isValidCollectionConfig,
  validateChromaDocument,
  validateChromaDocumentArray,
  validateCollectionName,
  validateEmbeddingVector,
  validateMetadata,
  validateSearchOptions,
  validateBulkOptions,
  validateModuleOptions,
  createTypeChecker,
} from './lib/validation/type-guards';

// Constants
export * from './lib/constants';

// Config Utilities
export {
  getChromaDBConfig,
  getChromaDBConfigWithDefaults,
  setChromaDBConfig,
  isChromaDBConfigured,
} from './lib/utils/chromadb-config.accessor';
