// Module
export * from './lib/nestjs-chromadb.module';

// Services
export type {
  PerformanceConfig as ChromaDBPerformanceConfig,
  OperationMetrics as ChromaDBOperationMetrics,
} from './lib/services/chromadb.service';
export { ChromaDBService } from './lib/services/chromadb.service';

// Facade Services (new specialized services)
export { ChromaDBService as ChromaDBFacadeService } from './lib/services/chromadb-facade.service';
// Removed duplicate PerformanceConfig import - using only line 49
export { ChromaDBPerformanceService } from './lib/services/facade/chromadb-performance.service';
export type { EmbeddingProcessingOptions } from './lib/services/facade/chromadb-embedding-processor.service';
export { ChromaDBEmbeddingProcessorService } from './lib/services/facade/chromadb-embedding-processor.service';

// Repository Operations (new split components)
export { CrudOperations } from './lib/decorators/repository/operations/crud-operations';
export { SearchOperations } from './lib/decorators/repository/operations/search-operations';
export { AggregationOperations } from './lib/decorators/repository/operations/aggregation-operations';
export { RepositoryHelpers } from './lib/decorators/repository/operations/repository-helpers';
export * from './lib/services/core/collection.service';
export * from './lib/services/embedding.service';
export * from './lib/services/chroma-admin.service';
export * from './lib/services/text-splitter.service';
export * from './lib/services/metadata-extractor.service';

//  Services
export type { AggregatedMetrics } from './lib/services/chroma-metrics.service';
export { ChromaMetricsService } from './lib/services/chroma-metrics.service';
// Caching services - separate exports for services and types
export {
  ChromaCacheService,
  CacheOperationsService,
  CacheStatisticsService,
  CacheCleanupService,
  VectorCacheService,
  CacheKeyGeneratorService,
  TtlCalculatorService,
  SizeEstimatorService,
} from './lib/services/caching';

export type {
  ICacheOperations,
  ICacheStatistics,
  ICacheCleanup,
  IVectorCacheOperations,
  ICacheKeyGenerator,
  ITtlCalculator,
  CacheStatistics,
  VectorStatistics,
  HealthStatus,
  CacheEntry,
  CacheConfig,
  MutableCacheStats,
} from './lib/services/caching';

// Service Interfaces - following Interface Segregation Principle
export type {
  ChromaDBServiceInterface,
  ChromaDBConnectionServiceInterface,
  ChromaDBCollectionServiceInterface,
  ChromaDBDocumentServiceInterface,
  ChromaDBSearchServiceInterface,
} from './lib/interfaces/core';
export type * from './lib/interfaces/embedding-function.interface';
export type * from './lib/interfaces/embedding-service.interface';

// Module Options Interfaces - segregated and focused
export type {
  ChromaDBModuleOptions,
  ChromaDBModuleAsyncOptions,
  ChromaDBOptionsFactory,
  ChromaDBConnectionOptions,
  ChromaDBEmbeddingOptions,
  ChromaDBPerformanceOptions,
  ChromaDBMultiTenantOptions,
  ChromaDBClientOptions,
  EmbeddingConfig,
  CollectionConfig,
  TextProcessingConfig,
  DecoratorConfig,
  PerformanceConfig,
  HttpClientOptions,
  OpenAIEmbeddingConfig,
  HuggingFaceEmbeddingConfig,
  CohereEmbeddingConfig,
  CustomEmbeddingConfig,
  InputValidationConfig,
  EmbeddingProviderType,
} from './lib/interfaces/config';

// Consolidated Type System (SINGLE SOURCE OF TRUTH)
export type {
  BaseDocument,
  ChromaWireDocument,
  ChromaSearchOptions,
  ChromaSearchResult,
  ChromaBulkOptions,
  ChromaCollectionInfo,
  GetDocumentsOptions,
  ValidationResult,
  DocumentValidationSchema,
  CollectionDocumentMap,
  DocumentTypeForCollection,
  MetadataTypeForCollection,
  toChromaWireDocument,
  fromChromaWireDocument,
  toChromaWireDocuments,
  fromChromaWireDocuments,
} from './lib/types/core.interface';

// Decorators - Core Ecosystem
export * from './lib/decorators';

// Legacy Decorators (backward compatibility)
export * from './lib/decorators/inject-chromadb.decorator';
export * from './lib/decorators/inject-collection.decorator';
export * from './lib/decorators/embed.decorator';

// Health Indicators
export * from './lib/services/core/health.service';

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
export {
  handleUnknownError,
  logUnknownError,
  getErrorMessage,
  getErrorStack,
  createTypedError,
  type ErrorContext,
} from './lib/utils/error-handling.utils';

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

// Core type guards (centralized in core.interface.ts)
export {
  isValidCollectionName,
  isDocumentArray,
  isBaseDocument,
  isChromaWireDocument,
} from './lib/types/core.interface';

// Constants
export * from './lib/constants';

// Config Utilities
export {
  getChromaDBConfig,
  getChromaDBConfigWithDefaults,
  setChromaDBConfig,
  isChromaDBConfigured,
} from './lib/utils/chromadb-config.accessor';
