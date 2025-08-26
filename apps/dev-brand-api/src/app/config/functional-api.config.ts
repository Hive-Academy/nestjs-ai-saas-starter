/**
 * Functional API Module Configuration for dev-brand-api
 * Enables functional programming patterns for LangGraph workflows
 */
export function getFunctionalApiConfig() {
  return {
    // Pure function execution settings
    purity: {
      enforceImmutability: process.env.FUNCTIONAL_ENFORCE_IMMUTABILITY !== 'false',
      validateSideEffects: process.env.FUNCTIONAL_VALIDATE_SIDE_EFFECTS === 'true',
    },
    
    // Pipeline composition settings
    pipelines: {
      maxDepth: parseInt(process.env.FUNCTIONAL_MAX_PIPELINE_DEPTH || '10'),
      parallelExecution: process.env.FUNCTIONAL_PARALLEL_EXECUTION !== 'false',
      errorHandling: process.env.FUNCTIONAL_ERROR_HANDLING || 'propagate',
    },
    
    // Memoization settings
    memoization: {
      enabled: process.env.FUNCTIONAL_MEMOIZATION_ENABLED !== 'false',
      maxCacheSize: parseInt(process.env.FUNCTIONAL_CACHE_SIZE || '1000'),
      ttlSeconds: parseInt(process.env.FUNCTIONAL_CACHE_TTL || '300'),
    },
    
    // Development features for demo
    debug: {
      traceExecution: process.env.NODE_ENV === 'development',
      logPipelineSteps: process.env.NODE_ENV === 'development',
      validateFunctionSignatures: true,
    },
  };
}