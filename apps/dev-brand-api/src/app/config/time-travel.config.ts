import type { TimeTravelConfig } from '@hive-academy/langgraph-time-travel';

/**
 * Time Travel Module Configuration for dev-brand-api
 * Enables workflow debugging and state history replay
 * Uses injected checkpoint adapter for checkpoint operations
 */
export function getTimeTravelConfig(): TimeTravelConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  return {
    // Whether to enable branch management (dev/staging by default)
    enableBranching:
      !isProduction && process.env.TIME_TRAVEL_ENABLE_BRANCHING !== 'false',

    // Maximum number of branches per thread (reduced in production)
    maxBranchesPerThread: parseInt(
      process.env.TIME_TRAVEL_MAX_BRANCHES_PER_THREAD ||
        (isProduction ? '3' : '10')
    ),

    // Performance configuration
    performance: {
      lazyLoading: process.env.TIME_TRAVEL_LAZY_LOADING !== 'false',
      cacheSize: parseInt(
        process.env.TIME_TRAVEL_CACHE_SIZE || (isProduction ? '500' : '1000')
      ),
      indexOptimization: process.env.TIME_TRAVEL_INDEX_OPTIMIZATION !== 'false',
    },

    // Security configuration
    security: {
      sanitizeStates: process.env.TIME_TRAVEL_SANITIZE_STATES !== 'false',
      auditLogging:
        isProduction || process.env.TIME_TRAVEL_AUDIT_LOGGING === 'true',
      encryptionEnabled:
        isProduction && process.env.TIME_TRAVEL_ENCRYPTION === 'true',
    },
  };
}
