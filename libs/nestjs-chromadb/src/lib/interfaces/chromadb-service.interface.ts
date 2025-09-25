/**
 * @fileoverview ChromaDB Service Interface - Re-export from segregated interfaces
 *
 * This file provides backward compatibility by re-exporting from the new
 * Interface Segregation Principle compliant interfaces in ./core/
 */

// Re-export the main service interface and focused interfaces
export type {
  ChromaDBServiceInterface,
  ChromaDBConnectionServiceInterface,
  ChromaDBCollectionServiceInterface,
  ChromaDBDocumentServiceInterface,
  ChromaDBSearchServiceInterface,
  BaseDocument,
  ChromaWireDocument,
  ChromaSearchOptions,
  ChromaSearchResult,
  ChromaBulkOptions,
  ChromaCollectionInfo,
  GetDocumentsOptions,
} from './core';

// Legacy alias for backward compatibility
export type { ChromaWireDocument as ChromaDocument } from './core';
