/**
 * Business Workflows Core Module Exports
 *
 * Comprehensive exports of all enhanced core functionality:
 * - Enterprise error hierarchy
 * - Advanced validation decorators
 * - Performance optimization decorators
 * - Memory and tools services
 */

// ============================================================================
// ERROR HIERARCHY EXPORTS
// ============================================================================

export {
  // Base error class
  BusinessWorkflowError,

  // Agent-specific errors
  AgentInitializationError,
  AgentExecutionError,
  AgentTimeoutError,

  // Workflow-specific errors
  WorkflowConfigurationError,
  WorkflowStateError,
  WorkflowTransitionError,

  // Integration-specific errors
  ExternalServiceError,
  GitHubIntegrationError,
  MemoryServiceError,
  LLMProviderError,

  // Validation errors
  InputValidationError,
  StateValidationError,

  // Configuration errors
  MissingConfigurationError,
  InvalidConfigurationError,

  // Error factory
  BusinessWorkflowErrorFactory,
} from './errors/business-workflow.errors';

// ============================================================================
// VALIDATION DECORATORS EXPORTS
// ============================================================================

export {
  // Core validation decorators
  Required,
  StringLength,
  IsType,
  IsEmail,
  IsUrl,
  Matches,
  Range,
  IsArray,
  IsEnum,

  // Business-specific validators
  IsGitHubUsername,
  IsPlatform,
  IsContentType,
  IsAgentId,
  IsWorkflowState,

  // Method-level validation decorators
  ValidateParameters,
  ValidateState,
  Validate,

  // Validation utilities
  validateValue,
  validateObject,
  validateValueWithRules,
} from './validation/workflow.validators';

export type {
  // Types
  ValidationRule,
  ParameterValidation,
  StateValidation,
} from './validation/workflow.validators';

// ============================================================================
// PERFORMANCE OPTIMIZATION EXPORTS
// ============================================================================

export {
  // Caching decorators
  Cache,
  InvalidateCache,

  // Batch processing
  Batch,

  // Circuit breaker
  CircuitBreakerDecorator,

  // Metrics and monitoring
  Metrics,

  // Timeout management
  Timeout,

  // Concurrency control
  ConcurrencyLimit,

  // Combined optimization
  Optimize,

  // Utility functions
  getMethodMetrics,
  getAllMetrics,
  clearMetrics,
  getCircuitBreakerState,
  getCacheStats,
  clearCache,

  // Enums
  CircuitState,
} from './performance/optimization.decorators';

export type {
  // Types
  CacheConfig,
  BatchConfig,
  CircuitBreakerConfig,
  MetricsConfig,
  MethodMetrics,
} from './performance/optimization.decorators';

// ============================================================================
// MEMORY AND TOOLS EXPORTS
// ============================================================================

export { PersonalBrandMemoryService } from './memory/personal-brand-memory.service';
export { WebResearchTools } from './tools/web-research.tools';
export { GitHubIntegrationTools } from './tools/github-integration.tools';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

/**
 * Common validation patterns for quick access
 */
export const CommonValidators = {
  Required,
  IsGitHubUsername,
  IsPlatform,
  IsContentType,
  IsWorkflowState,
  Validate,
} as const;

/**
 * Common performance patterns for quick access
 */
export const CommonOptimizations = {
  // Quick cache with 5 minute TTL
  QuickCache: (ttl = 300000) => Cache({ ttl, maxSize: 100 }),

  // Standard circuit breaker
  StandardCircuitBreaker: () =>
    CircuitBreakerDecorator({
      failureThreshold: 3,
      resetTimeout: 30000,
    }),

  // Basic metrics tracking
  BasicMetrics: () =>
    Metrics({
      trackExecutionTime: true,
      trackErrorRate: true,
    }),

  // Combined optimization for external services
  ExternalServiceOptimization: () =>
    Optimize({
      cache: { ttl: 600000, maxSize: 50 },
      circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
      metrics: { trackExecutionTime: true, trackErrorRate: true },
      timeout: 30000,
    }),
} as const;

/**
 * Common error patterns for quick access
 */
export const CommonErrors = {
  GitHubIntegrationError,
  LLMProviderError,
  MemoryServiceError,
  AgentExecutionError,
  InputValidationError,
  BusinessWorkflowErrorFactory,
} as const;
