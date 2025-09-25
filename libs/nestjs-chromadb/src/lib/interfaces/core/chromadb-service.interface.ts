/**
 * Main ChromaDB Service Interface - composition of focused interfaces
 * Following Interface Segregation Principle by combining specialized contracts
 */

import type { ChromaDBConnectionServiceInterface } from './connection-service.interface';
import type { ChromaDBCollectionServiceInterface } from './collection-service.interface';
import type { ChromaDBDocumentServiceInterface } from './document-service.interface';
import type { ChromaDBSearchServiceInterface } from './search-service.interface';

// Re-export types for consumers
export type {
  BaseDocument,
  ChromaWireDocument,
  ChromaSearchOptions,
  ChromaSearchResult,
  ChromaBulkOptions,
  ChromaCollectionInfo,
  GetDocumentsOptions,
} from '../../types/documents';

/**
 * Main ChromaDB service interface - composition of focused interfaces
 * Clients can depend on specific interfaces or the complete interface
 */
export interface ChromaDBServiceInterface
  extends ChromaDBConnectionServiceInterface,
    ChromaDBCollectionServiceInterface,
    ChromaDBDocumentServiceInterface,
    ChromaDBSearchServiceInterface {
  // This interface combines all focused interfaces following ISP
  // Clients can depend on the specific interface they need
}

// Re-export focused interfaces for granular usage
export type {
  ChromaDBConnectionServiceInterface,
  ChromaDBCollectionServiceInterface,
  ChromaDBDocumentServiceInterface,
  ChromaDBSearchServiceInterface,
};
