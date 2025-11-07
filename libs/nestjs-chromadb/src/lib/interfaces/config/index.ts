/**
 * Export all focused interface contracts following Interface Segregation Principle
 */

// Main composition interface
export type * from './module-options.interface';

// Focused interface contracts
export type * from './connection-options.interface';
export type * from './embedding-options.interface';
export type * from './performance-options.interface';
export type * from './multi-tenant-options.interface';
export type * from './collection-strategy-options.interface';

// Export preset constants
export {
  DEFAULT_COLLECTION_STRATEGY,
  PRODUCTION_COLLECTION_STRATEGY,
  DEVELOPMENT_COLLECTION_STRATEGY,
  HIGHPERF_COLLECTION_STRATEGY,
} from './collection-strategy-options.interface';
