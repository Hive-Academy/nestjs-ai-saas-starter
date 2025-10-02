/**
 * @fileoverview Performance Decorators Index - All performance-related decorators
 *
 * This module exports all performance decorators with their focused implementations.
 */

// Caching decorators
export * from './cached.decorator';

// Retry decorators
export * from './retry';

// Profiling decorators (modular implementation)
export * from './profiling';

// Legacy exports (for backward compatibility during transition)
export { Cached } from './cached.decorator';
export { Retry } from './retry.decorator';
