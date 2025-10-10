/**
 * Store Module - LangGraph 2025 Store Pattern
 *
 * Exports for namespace-based hierarchical storage implementation.
 * Provides cross-thread memory sharing with vector and graph coordination.
 */

// ============================================================================
// Service Interfaces
// ============================================================================
export type {
  IStoreService,
  StoreItem,
  StoreSearchOptions,
} from './services/interfaces/store-service.interface';

// ============================================================================
// Services
// ============================================================================
export { StoreService } from './services/store.service';
export { StoreStorageService } from './services/store-storage.service';
export { StoreGraphService } from './services/store-graph.service';

// ============================================================================
// Module
// ============================================================================
export { StoreModule } from './store.module';
