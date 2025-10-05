// Module
export * from './lib/nestjs-chromadb.module';

// Facade Services (new specialized services)
export { ChromaDBService as ChromaDBFacadeService } from './lib/services/chromadb.service';
// Removed duplicate PerformanceConfig import - using only line 49
export { ChromaDBPerformanceService } from './lib/services/facade/chromadb-performance.service';
export type { EmbeddingProcessingOptions } from './lib/services/facade/chromadb-embedding-processor.service';
export { ChromaDBEmbeddingProcessorService } from './lib/services/facade/chromadb-embedding-processor.service';

// Repository Operations (new split components)
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
  EntityData,
  Where,
  WhereDocument,
  toChromaWireDocument,
  fromChromaWireDocument,
  toChromaWireDocuments,
  fromChromaWireDocuments,
} from './lib/types/core.interface';

// Decorators - Core Ecosystem
export * from './lib/decorators';

// TypeORM-Style Repository Pattern (NEW - TASK_2025_005)
export { ChromaDBRepository } from './lib/repositories/chromadb-repository';
export {
  InjectRepository,
  getRepositoryToken,
  getCollectionName,
} from './lib/decorators/inject-repository.decorator';
export type {
  RepositoryOperationOptions,
  RepositorySearchOptions,
  RepositoryOperationResult,
  CreateDocumentInput,
  UpsertDocumentInput,
  SearchResultWithScore,
  RepositoryConstructor,
} from './lib/repositories/repository-types';
export { isBaseChromaRepository } from './lib/repositories/repository-types';

// Entity & Repository Pattern (Neo4j-inspired)
export { BaseChromaEntity } from './lib/entities/base-chroma.entity';
export {
  ChromaEntity,
  ChromaProp,
  ChromaId,
  ChromaMetadata,
  ChromaEmbedding,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
  type ChromaEntityConfig,
  type ChromaPropertyConfig,
  type ChromaMetadataConfig,
  type ChromaEmbeddingConfig,
  type EntityMetadata,
  type PropertyMetadata,
} from './lib/decorators/entity/entity.decorator';

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
export * from './lib/utils/data/vector.utils';
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
} from './lib/utils/data/metadata.utils';
export {
  handleUnknownError,
  logUnknownError,
  getErrorMessage,
  getErrorStack,
  createTypedError,
  type ErrorContext,
} from './lib/utils/errors/error-handling.utils';

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
} from './lib/utils/config/chromadb-config.accessor';

export * from './lib/services/chromadb.service';
