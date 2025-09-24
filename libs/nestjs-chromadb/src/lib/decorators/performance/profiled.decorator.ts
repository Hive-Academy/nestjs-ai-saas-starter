/**
 * @fileoverview Profiled Decorator - Re-export from modular implementation
 *
 * This file maintains backward compatibility while delegating to the new
 * modular profiling system that follows Single Responsibility Principle.
 */

// Re-export everything from the modular profiling implementation
export * from './profiling';

// Maintain backward compatibility for existing imports
export { Profiled as default, GlobalPerformanceMonitor } from './profiling';
