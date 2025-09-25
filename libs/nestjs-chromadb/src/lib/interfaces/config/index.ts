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
