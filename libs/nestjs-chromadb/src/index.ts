// Core module and services
export * from './lib/nestjs-chromadb.module';
export * from './lib/services/chromadb.service';
export * from './lib/services/collection.service';
export * from './lib/services/embedding.service';
export * from './lib/services/chroma-admin.service';

// Decorators
export * from './lib/decorators/inject-chromadb.decorator';
export * from './lib/decorators/inject-collection.decorator';
export * from './lib/decorators/embed.decorator';

// Interfaces and types
export * from './lib/interfaces/chromadb-module-options.interface';
export * from './lib/interfaces/chromadb-service.interface';
export * from './lib/interfaces/embedding-service.interface';

// Health checking
export * from './lib/health/chromadb.health';

// Constants
export * from './lib/constants';

// Embedding providers
export * from './lib/embeddings/base.embedding';
export * from './lib/embeddings/openai.embedding';
export * from './lib/embeddings/cohere.embedding';
export * from './lib/embeddings/huggingface.embedding';
export * from './lib/embeddings/custom.embedding';

// Error handling and validation
export * from './lib/errors/chromadb.errors';
export * from './lib/validation/type-guards';

// Utilities
export * from './lib/utils/error.utils';
export * from './lib/utils/vector.utils';

// Metadata utilities (explicit exports to avoid conflicts)
export {
  sanitizeMetadata,
  validateMetadata as validateMetadataSchema,
  mergeMetadata,
  filterMetadata,
  extractMetadataFields,
  metadataToWhereClause,
  addDefaultMetadata,
  formatMetadataForDisplay,
  type MetadataSchema,
} from './lib/utils/metadata.utils';
