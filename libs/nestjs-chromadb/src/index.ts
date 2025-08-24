// Module
export * from './lib/nestjs-chromadb.module';

// Services
export * from './lib/services/chromadb.service';
export * from './lib/services/collection.service';
export * from './lib/services/embedding.service';
export * from './lib/services/chroma-admin.service';
export * from './lib/services/text-splitter.service';
export * from './lib/services/metadata-extractor.service';

// Interfaces
export type * from './lib/interfaces/chromadb-module-options.interface';
export type * from './lib/interfaces/chromadb-service.interface';
export type * from './lib/interfaces/embedding-function.interface';

// Decorators
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
export * from './lib/utils/metadata.utils';
// Error utils now consolidated in @anubis/shared

// Constants
export * from './lib/constants';
