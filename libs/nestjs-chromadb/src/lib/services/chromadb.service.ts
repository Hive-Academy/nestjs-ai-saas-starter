/**
 * @fileoverview ChromaDB Service (Backward Compatibility Export)
 *
 * Reduced from 597 LOC to 15 LOC by extracting specialized services
 * Re-exports the facade service for backward compatibility
 */

import { Injectable } from '@nestjs/common';
import { ChromaDBService as ChromaDBFacadeService } from './chromadb-facade.service';

/**
 * ChromaDB Service - Backward Compatibility Export
 *
 * This service now delegates to ChromaDBFacadeService which orchestrates:
 * - ChromaDBPerformanceService (monitoring, caching, metrics)
 * - ChromaDBEmbeddingProcessorService (embedding processing)
 * - ChromaDBConnectionService (connection management)
 * - ChromaDBOperationsService (core operations)
 * - ChromaDBValidationService (validation)
 */
@Injectable()
export class ChromaDBService extends ChromaDBFacadeService {
  // All functionality is inherited from ChromaDBFacadeService
  // This class exists purely for backward compatibility
}

// Re-export types that were previously defined in this file
export type {
  PerformanceConfig,
  OperationMetrics,
} from './facade/chromadb-performance.service';
export type { EmbeddingProcessingOptions } from './facade/chromadb-embedding-processor.service';
