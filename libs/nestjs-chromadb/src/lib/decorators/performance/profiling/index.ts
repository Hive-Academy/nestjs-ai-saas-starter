/**
 * @fileoverview Profiling Module Index - Exports for the profiling performance feature
 *
 * This module provides a complete profiling solution split into focused components
 * following the Single Responsibility Principle.
 */

// Core profiling decorator
export {
  Profiled,
  getPerformanceStatistics,
  getExecutionTimes,
  clearPerformanceStatistics,
} from './profiled.decorator';

// Configuration and interfaces
export type {
  ProfiledConfig,
  PerformanceMetrics,
  PerformanceStatistics,
} from './profile-config';
export { ProfileConfigProcessor, DataSanitizer } from './profile-config';

// Metrics collection
export { MetricsCollector } from './metrics-collector';

// Performance reporting
export type {
  PerformanceReport,
  OperationReport,
  PerformanceAlert,
} from './performance-reporter';
export {
  PerformanceReporter,
  GlobalPerformanceMonitor,
} from './performance-reporter';
